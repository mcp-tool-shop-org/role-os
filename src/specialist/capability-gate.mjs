/**
 * Capability gate — deterministic least-privilege (POLA) on IRREVERSIBLE tool calls. The one
 * security primitive worth owning internally (memory: oversight-specialist-mint-strategy.md,
 * 2026-06-08 posture): it bounds what any agent action can DO, so a WRONG verdict — an honest crew
 * mistake OR (later) an adversarial flip — can never trigger an unauthorized irreversible action.
 * The PREVENTIVE complement to NAMED_COMPENSATORS (which undoes an irreversible action; this stops
 * the unauthorized one before it happens). Same action set, two halves.
 *
 * Grounded in the object-capability model / POLA and CaMeL (Debenedetti et al. 2025,
 * arXiv:2503.18813: control/data-flow separation + capabilities, model UNMODIFIED). Deterministic,
 * NO model — least-privilege, not an arms race.
 *
 * Safe by construction:
 *   - OPT-IN, default OFF (ROLEOS_CAPABILITY_GATE). Disabled => never denies (pure no-op), so it can
 *     never disrupt an existing flow until the director turns it on.
 *   - Scoped to a SMALL gated set (the NAMED_COMPENSATORS irreversible-action list). Every non-gated
 *     tool and every read-only tool is untouched.
 *   - FAIL-CLOSED for the gated set: a gated action with NO matching capability grant is denied, with
 *     a reason telling the director how to grant it. (Distinct from the conformance floor, which is
 *     advisory / fail-open — a missed nonconformance is cheap; an unauthorized irreversible action is
 *     not, so its asymmetry runs the other way.)
 *
 * The grant manifest (`.claude/role-os/capabilities.json`, director-authored) maps an action id to a
 * grant, e.g.: { "npm:publish": { "granted": true, "expires": "2026-07-01" } }. The gate enforces
 * `granted` and `expires` ONLY — any other field (e.g. a "scope" annotation) is informational/audit
 * metadata and does NOT narrow the grant: a granted action id authorizes ALL matching invocations.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CAPABILITIES_FILE = ".claude/role-os/capabilities.json";

/** Opt-in flag, mirroring conformanceConsultEnabled(). Default OFF. */
export function capabilityGateEnabled() {
  const v = process.env.ROLEOS_CAPABILITY_GATE;
  return v === "1" || v === "true";
}

const _bash = (re) => (toolName, call) =>
  toolName === "Bash" && typeof call?.command === "string" && re.test(call.command);

/**
 * The GATED SET — the irreversible / world-touching actions from the NAMED_COMPENSATORS standard.
 * Each entry: { id, label, test(toolName, call) -> boolean }. Detection is deterministic + pattern-
 * based and errs toward FLAGGING (a benign match just needs a one-line grant). The patterns allow
 * flags between the command word and its verb — `git -C <dir> push`, `npm --workspace <pkg> publish`,
 * `gh release -R <repo> create` all match — without crossing a shell separator (| ; & or newline).
 * KNOWN LIMIT: script indirection (`npm run release` wrapping a publish, a shell script invoking
 * git push) is NOT detected — the gate bounds direct invocations; it is opt-in defense-in-depth,
 * not an evasion-proof sandbox.
 */
export const GATED_ACTIONS = [
  { id: "npm:publish", label: "npm/pnpm/yarn publish", test: _bash(/\b(?:npm|pnpm|yarn)\b[^|;&\n]*\bpublish\b/) },
  { id: "pypi:publish", label: "PyPI publish (twine/uv)", test: _bash(/\btwine\b[^|;&\n]*\bupload\b|\buv\b[^|;&\n]*\bpublish\b/) },
  { id: "gh:release", label: "gh release create", test: _bash(/\bgh\b[^|;&\n]*\brelease\b[^|;&\n]*\bcreate\b/) },
  { id: "gh:pr-create", label: "gh pr create", test: _bash(/\bgh\b[^|;&\n]*\bpr\b[^|;&\n]*\bcreate\b/) },
  { id: "gh:repo-edit", label: "gh repo edit/delete", test: _bash(/\bgh\b[^|;&\n]*\brepo\b[^|;&\n]*\b(?:edit|delete)\b/) },
  { id: "git:push", label: "git push", test: _bash(/\bgit\b[^|;&\n]*\bpush\b/) },
  { id: "pages:deploy", label: "GitHub Pages / gh-pages deploy", test: _bash(/\bgh-pages\b|\bpages\b[^|;&\n]*\bdeploy\b/) },
];

/** Read the director's capability manifest, or {} if absent/malformed (=> nothing granted). */
export function loadCapabilities(cwd) {
  try {
    const p = join(cwd, CAPABILITIES_FILE);
    if (!existsSync(p)) return {};
    const data = JSON.parse(readFileSync(p, "utf-8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

/**
 * Evaluate `actionId`'s grant. Returns null when granted and valid; otherwise a short problem
 * string for the deny reason. An unparseable `expires` is treated as INVALID (deny) — a
 * fail-closed gate must never turn a typo'd date into a permanent grant.
 */
function _grantProblem(manifest, actionId, now) {
  const g = manifest && manifest[actionId];
  if (!g || typeof g !== "object" || g.granted !== true) {
    return `No capability "${actionId}" is granted in ${CAPABILITIES_FILE}`;
  }
  if (typeof g.expires === "string") {
    const t = Date.parse(g.expires);
    if (Number.isNaN(t)) {
      return `The grant for "${actionId}" has an unparseable "expires" value ("${g.expires}") — an invalid expiry DENIES (fail-closed), it never extends the grant; fix the date`;
    }
    if (t < now) return `The grant for "${actionId}" expired at ${g.expires}`;
  }
  return null;
}

/**
 * Capability gate for a proposed tool call.
 *
 * OPT-IN: when disabled it ALWAYS returns { denied:false } (pure no-op). When enabled, a gated
 * irreversible action is allowed ONLY if the manifest grants its capability id; otherwise it is
 * DENIED (fail-closed) with a reason telling the director how to grant it.
 *
 * @param {string} cwd
 * @param {string} toolName
 * @param {object} toolInput
 * @param {object} [opts] - { force } run the gate regardless of the env flag (tests);
 *   { capabilities } inject a manifest (tests); { now } epoch ms for expiry (tests)
 * @returns {{ denied: boolean, action?: string, reason?: string }}
 */
export function capabilityGate(cwd, toolName, toolInput, opts = {}) {
  if (!opts.force && !capabilityGateEnabled()) return { denied: false };
  let action;
  try {
    const call = toolInput && typeof toolInput === "object" ? toolInput : {};
    action = GATED_ACTIONS.find((a) => a.test(toolName, call));
    if (!action) return { denied: false }; // not an irreversible action -> allow
    const manifest = opts.capabilities || loadCapabilities(cwd);
    const now = typeof opts.now === "number" ? opts.now : Date.now();
    const problem = _grantProblem(manifest, action.id, now);
    if (!problem) return { denied: false };
    return {
      denied: true,
      action: action.id,
      reason:
        `Capability gate: "${action.label}" is an irreversible action requiring an explicit grant. ` +
        `${problem}. To authorize it, the director adds {"${action.id}": {"granted": true}}, ` +
        `optionally with an "expires" date. (Note: the gate enforces only "granted"/"expires" — ` +
        `a grant authorizes ALL matching ${action.label} calls; a "scope" field is informational only.)`,
    };
  } catch {
    // A gate that errors must not silently allow an irreversible action: if a gated action matched
    // but the grant cannot be evaluated, fail CLOSED (deny). If nothing matched, allow.
    if (action) {
      return {
        denied: true,
        action: action.id,
        reason: `Capability gate errored evaluating the grant for "${action.id}"; failing closed on an irreversible action.`,
      };
    }
    return { denied: false };
  }
}
