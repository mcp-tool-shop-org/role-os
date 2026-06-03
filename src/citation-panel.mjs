/**
 * Local-panel seat — a SECOND, family-different verifier seat for the citation gate, layered on
 * prism. Where prism RETRIEVES (the deterministic existence floor + the source title/abstract) and
 * runs its own groundedness lens, this seat re-judges each citation prism vouched for with an
 * independent grounded-entailment PANEL running entirely on local models (Qwen + Mistral via
 * llama-swap, the `offload` CLI). It is decorrelated from the Claude generator by construction
 * (no Anthropic model in the panel) and from prism's single groundedness model (3 seats, ≥2
 * families, conservative majority).
 *
 * Why it can only TIGHTEN: the panel's measured property (tensor-engine-knowledge wave-5 #156) is
 * ZERO false-confirms — a 3-seat conservative-majority panel never stamps a false claim
 * "supported". So a panel DISAGREEMENT on a citation prism marked `supported` is a real
 * false-confirm signal: we downgrade that citation's gate accept -> escalate (a human checkpoint
 * with a contrastive message). The panel NEVER turns a non-accept into an accept, and the
 * deterministic existence floor (`fabricated` -> blocking) always dominates. EXTERNAL_VERIFIER
 * (workflow-standard #6), now runnable locally for free.
 *
 * Read-only (shells the read-only `offload verify`); no compensator. Mirrors the inject-`exec`,
 * closed-gate-on-unreachable discipline of verify-citations.mjs. See
 * design/citation-verification-runner.md (Local-panel seat).
 */

import { execFileSync } from "node:child_process";

/** The offload command, overridable for non-default rigs (defaults match offload.py's README). */
export const DEFAULT_OFFLOAD_PYTHON = process.env.OFFLOAD_PYTHON || "python";
export const DEFAULT_OFFLOAD_SCRIPT =
  process.env.OFFLOAD_SCRIPT || "E:/AI-Models/studio-local/offload.py";

/**
 * Build the evidence string the panel judges the claim against: prism's retrieved source title +
 * the single supporting span prism surfaced. Thin by design — if even prism's OWN best span does
 * not entail the claim under a strict panel, that is exactly the false-confirm worth catching.
 * (Surfacing prism's full retrieved abstract would strengthen this — tracked as a prism follow-up.)
 * @returns {string} evidence, or "" when prism surfaced nothing to judge against.
 */
export function buildEvidence({ source_title, span } = {}) {
  const title = (source_title || "").trim();
  const s = (span || "").trim();
  if (!title && !s) return "";
  return [title ? `Title: ${title}` : "", s].filter(Boolean).join("\n\n");
}

/** Default exec — execFileSync, capturing stdout even on a non-zero exit, no shell (args verbatim). */
function defaultOffloadExec(cmd, args, { timeout, cwd, env }) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd,
      timeout,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    if (err.code === "ENOENT") throw err; // missing python/script -> caller escalates
    return {
      status: err.status ?? 1,
      stdout: (err.stdout || "").toString(),
      stderr: (err.stderr || "").toString(),
    };
  }
}

function tryParseJson(text) {
  const s = (text || "").trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a !== -1 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * @typedef {object} PanelCitation
 * @property {string|null} id
 * @property {string|null} identifier
 * @property {string} claim
 * @property {string} evidence
 */

/**
 * @typedef {object} PanelResult
 * @property {boolean} requested      always true when this ran
 * @property {boolean} reachable      false iff offload/llama-swap could not be reached at all
 * @property {string[]} seats         the actual model tags the panel used (PIN_PER_STEP)
 * @property {number} checked         citations the panel actually adjudicated
 * @property {object[]} perCitation   { id, identifier, panel_verdict, seats }
 * @property {object[]} disagreements { id, identifier, prism, panel } where prism=supported, panel≠supported
 * @property {string} [detail]
 */

/**
 * Run the offload entailment panel over the citations prism marked `supported` (the only ones whose
 * acceptance the panel can challenge). Each call is `offload verify --panel --json`; the actual seat
 * models come back in the panel JSON and are recorded for the receipt (PIN_PER_STEP).
 *
 * @param {PanelCitation[]} supported  citations prism vouched for, with evidence already built
 * @param {object} [options]
 * @param {Function} [options.exec]    injectable (cmd,args,{timeout,cwd,env}) -> {status,stdout,stderr}
 * @param {string} [options.python]    default DEFAULT_OFFLOAD_PYTHON
 * @param {string} [options.script]    default DEFAULT_OFFLOAD_SCRIPT
 * @param {string} [options.base]      LLAMASWAP_BASE passed to the child (default offload's own)
 * @param {number} [options.timeout]   per-call ms (default 300000 — first call may swap 3 models)
 * @param {string} [options.cwd]
 * @returns {PanelResult}
 */
export function runOffloadPanel(supported, options = {}) {
  const {
    exec = defaultOffloadExec,
    python = DEFAULT_OFFLOAD_PYTHON,
    script = DEFAULT_OFFLOAD_SCRIPT,
    base = process.env.LLAMASWAP_BASE || "",
    timeout = 300_000,
    cwd = process.cwd(),
  } = options;

  const env = {
    ...process.env,
    PYTHONIOENCODING: "utf-8",
    PYTHONUTF8: "1",
    ...(base ? { LLAMASWAP_BASE: base } : {}),
  };

  const perCitation = [];
  const disagreements = [];
  const seatModels = new Set();
  let reachable = false;
  let anyError = false;
  let detail = "";

  for (const c of supported) {
    if (!c.evidence) {
      // prism marked it supported but surfaced no span/title to re-judge — note, do not downgrade
      // (absence of evidence is not a contradiction); surfaced in the report.
      perCitation.push({ id: c.id, identifier: c.identifier, panel_verdict: "no_evidence", seats: [] });
      continue;
    }
    const args = [
      script, "verify", "--panel", "--json",
      "--claim", c.claim,
      "--evidence", c.evidence,
    ];
    let res;
    try {
      res = exec(python, args, { timeout, cwd, env });
    } catch (err) {
      // ENOENT (no python / no script) or spawn failure -> the panel is unreachable as a whole.
      detail = `offload not runnable: ${err.code || err.message}`;
      anyError = true;
      perCitation.push({ id: c.id, identifier: c.identifier, panel_verdict: "error", seats: [] });
      if (err.code === "ENOENT") break; // no point retrying the rest with a missing binary
      continue;
    }
    const parsed = tryParseJson((res.stdout || "").toString());
    if (!parsed || typeof parsed.verdict !== "string") {
      anyError = true;
      detail = detail || `offload produced no parseable panel JSON (exit ${res.status}): ${(res.stderr || res.stdout || "").toString().slice(0, 200)}`;
      perCitation.push({ id: c.id, identifier: c.identifier, panel_verdict: "error", seats: [] });
      continue;
    }
    reachable = true;
    const seats = Array.isArray(parsed.seats) ? parsed.seats.map((s) => s.model).filter(Boolean) : [];
    seats.forEach((m) => seatModels.add(m));
    const verdict = String(parsed.verdict).toLowerCase();
    perCitation.push({ id: c.id, identifier: c.identifier, panel_verdict: verdict, seats });
    if (verdict !== "supported") {
      disagreements.push({ id: c.id, identifier: c.identifier, prism: "supported", panel: verdict });
    }
  }

  const checked = perCitation.filter((p) => p.panel_verdict === "supported" || disagreements.some((d) => d.id === p.id)).length;
  return {
    requested: true,
    reachable,
    seats: [...seatModels],
    checked,
    perCitation,
    disagreements,
    ...(detail ? { detail } : {}),
    // unreachable iff we never got a single parseable verdict AND something errored
    ...(anyError && !reachable ? { unreachable: true } : {}),
  };
}

/**
 * Contrastive escalation message (workflow-standard #5 / Buçinca 2024): name what the dispatch
 * assumed, then what the independent panel found — so the human reviews the disagreement, not a
 * bare "uncertain".
 */
function contrastiveDetail(disagreements) {
  const lead = disagreements
    .slice(0, 3)
    .map((d) => `${d.identifier || d.id}: prism read the source as SUPPORTING the claim; the local Qwen+Mistral panel found "${d.panel}" on prism's own span`)
    .join("; ");
  const more = disagreements.length > 3 ? ` (+${disagreements.length - 3} more)` : "";
  return `local entailment panel disagrees with prism on ${disagreements.length} citation(s) — review before accepting. ${lead}${more}`;
}

/**
 * Apply the panel to a gate result — MONOTONE-TIGHTENING. Only ever downgrades accept -> escalate;
 * never loosens, never overrides the existence floor (blocking).
 *
 *   - gate passing + panel DISAGREES on ≥1 supported citation -> escalate (local_panel_disagreement)
 *   - gate passing + panel UNREACHABLE (and it was requested) -> escalate (local_panel_unreachable)
 *     ("an unreachable gate is a closed gate" — same invariant prism uses)
 *   - gate already blocking/advisory                          -> unchanged (panel adds notes only)
 *
 * @param {object} gate    GateResult from gateCitations / runCitationGate
 * @param {PanelResult} panel
 * @returns {object} gate (possibly downgraded), with `local_panel` attached
 */
export function applyLocalPanel(gate, panel) {
  const annotated = { ...gate, local_panel: panel };
  if (gate.blocking || !gate.pass) return annotated; // floor + non-pass dominate; panel only annotates

  if (panel.unreachable) {
    return {
      ...annotated,
      verdict: "escalate",
      pass: false,
      advisory: true,
      reason: "local_panel_unreachable",
      detail: panel.detail || "the local verifier panel could not be reached (offload/llama-swap down)",
    };
  }
  if (panel.disagreements.length > 0) {
    return {
      ...annotated,
      verdict: "escalate",
      pass: false,
      advisory: true,
      reason: "local_panel_disagreement",
      detail: contrastiveDetail(panel.disagreements),
    };
  }
  return annotated; // panel agrees (or had nothing to challenge) -> pass stands
}
