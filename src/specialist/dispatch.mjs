/**
 * Specialist dispatch — the consumer-facing entry point. Wires registry → gate → (specialist
 * | Claude) → shadow probe → halt check, and returns a receipt the caller can attach to its
 * own audit trail.
 *
 * The consumer supplies the Claude path (`claudeFn`) and the domain-aware agreement
 * comparator (`agreeFn`). This keeps the tier consumer-agnostic — `verify-citations` will
 * supply prism-aware functions; the future Token Budget Analyst will supply budget-aware
 * ones; an external consumer can supply anything.
 *
 * The dispatch is fail-open in three places:
 *   1. The gate fails open (registry/gate-level rejects → Claude).
 *   2. The specialist call fails open (transport/parse/adapter-mismatch errors → Claude).
 *   3. A consumer-side reject of the specialist's verdict (its own guards, e.g. prism's
 *      submodularity check) is reported back through `consumerReject` and the caller can
 *      retry against Claude. The dispatcher itself doesn't see consumer guards — it just
 *      surfaces the specialist's verdict and lets the caller apply them.
 *
 * Shadow probes happen on the Kth specialist dispatch (the gate routed to a specialist).
 * They never fire when the gate routed to Claude — there is nothing to compare. After a
 * probe, the halt check runs and may flip the role into a halted state.
 */

import { loadRegistry } from "./registry.mjs";
import { gate, defaultClassifier } from "./gate.mjs";
import { callSpecialist } from "./client.mjs";
import {
  loadState,
  saveState,
  emptyState,
  quotaStateFor,
  recordDispatch,
  incrementProbeCounter,
  resetProbeCounter,
  getHalt,
  setHalt,
} from "./state.mjs";
import {
  shouldShadowProbe,
  recordProbe,
  checkHalt,
  contrastiveHaltMessage,
  appendHaltEvent,
  SHADOW_DEFAULTS,
} from "./shadow.mjs";

const DEFAULT_REGISTRY_PATH = ".role-os/specialists.json";
const DEFAULT_STATE_PATH = ".role-os/specialist-state.json";
const DEFAULT_EVENTS_PATH = ".role-os/specialist-events.jsonl";
const DEFAULT_WINDOW = 200;

/**
 * @typedef {object} DispatchReceipt
 * @property {string} schema
 * @property {string} role
 * @property {string} ts                       ISO-8601
 * @property {string} trace_id
 * @property {"specialist"|"claude"} route     gate's decision
 * @property {"specialist"|"claude"} source    where `result` actually came from
 * @property {object} decision                 from gate.mjs
 * @property {object} [specialist_call]
 * @property {object} [shadow]
 */

/**
 * Run a dispatch through the specialist tier.
 *
 * @param {object} params
 * @param {string} params.role
 * @param {*}      params.input
 * @param {(input:any) => Promise<*>} params.claudeFn  the role's Claude-backed path
 * @param {(specialistVerdict:any, claudeVerdict:any) => boolean} [params.agreeFn]
 *        domain comparator for shadow probes; defaults to strict deep-equal
 * @param {string} params.traceId
 * @param {string} params.nowIso              ISO-8601; injected for testability
 * @param {object} [params.paths]             { registry, state, events } file paths
 * @param {object} [params.classifier]        gate classifier (scoreFn + oodFn)
 * @param {Function} [params.httpFn]          injectable HTTP for the specialist call
 * @param {object} [params.shadow]            { K, N, tau } overrides
 * @param {number} [params.windowSize]        quota window size; default 200
 * @param {number} [params.timeoutMs]         specialist call timeout
 * @returns {Promise<{ result: *, receipt: DispatchReceipt }>}
 */
export async function dispatchSpecialist({
  role,
  input,
  claudeFn,
  agreeFn = strictEqualVerdicts,
  traceId,
  nowIso,
  paths = {},
  classifier = defaultClassifier,
  httpFn,
  shadow: shadowCfg = {},
  windowSize = DEFAULT_WINDOW,
  timeoutMs,
}) {
  if (typeof claudeFn !== "function") {
    throw new Error("dispatchSpecialist: claudeFn (the Claude-backed path) is required");
  }
  if (typeof traceId !== "string" || !traceId) {
    throw new Error("dispatchSpecialist: traceId is required");
  }
  if (typeof nowIso !== "string" || !nowIso) {
    throw new Error("dispatchSpecialist: nowIso is required");
  }

  const registryPath = paths.registry || process.env.ROLEOS_SPECIALISTS_PATH || DEFAULT_REGISTRY_PATH;
  const statePath = paths.state || process.env.ROLEOS_SPECIALIST_STATE_PATH || DEFAULT_STATE_PATH;
  const eventsPath = paths.events || process.env.ROLEOS_SPECIALIST_EVENTS_PATH || DEFAULT_EVENTS_PATH;

  const K = shadowCfg.K ?? SHADOW_DEFAULTS.K;
  const N = shadowCfg.N ?? SHADOW_DEFAULTS.N;
  const tau = shadowCfg.tau ?? SHADOW_DEFAULTS.TAU;

  // ── Load registry + state ────────────────────────────────────────────────────────────────
  const { byRole, errors: regErrors } = loadRegistry(registryPath);
  let state;
  try { state = loadState(statePath); }
  catch { state = emptyState(); } // a corrupt state file resets; we re-record on the next dispatch
  const entry = byRole.get(role) || null;
  const haltState = entry ? getHalt(state, role) : { halted: false };

  // ── Gate decision ────────────────────────────────────────────────────────────────────────
  const quotaState = quotaStateFor(state, role, windowSize);
  const decision = entry
    ? gate({ role, input, registryEntry: entry, quotaState, haltState, classifier })
    : { route: "claude", reason: "no_registry_entry", score: 0, ood: false, quotaOk: true, detail: regErrors.length ? `registry errors: ${regErrors.join("; ")}` : "no registry entry for role" };

  // ── Route to specialist or Claude ────────────────────────────────────────────────────────
  let specialistCall = null;
  let result;
  let source;
  if (decision.route === "specialist" && entry) {
    const active = entry.versions.find((v) => v.id === entry.active_version);
    specialistCall = await callSpecialist({
      backendUrl: entry.backend_url,
      adapterId: active.adapter_id,
      role,
      input,
      traceId,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      ...(httpFn ? { httpFn } : {}),
    });
    if (specialistCall.ok) {
      result = specialistCall.verdict;
      source = "specialist";
      recordDispatch(state, role, windowSize, parseIsoMs(nowIso));
    } else {
      // Specialist call failed → fail open to Claude. The gate's "route" was specialist, but
      // the realized source is Claude. Both are recorded in the receipt.
      result = await claudeFn(input);
      source = "claude";
    }
  } else {
    result = await claudeFn(input);
    source = "claude";
  }

  // ── Shadow probe ─────────────────────────────────────────────────────────────────────────
  // Probes only fire when the dispatch actually went to a specialist (source === "specialist").
  // A failed-open dispatch already ran Claude; there is nothing left to probe.
  let shadow = null;
  if (source === "specialist") {
    const c = incrementProbeCounter(state, role);
    if (shouldShadowProbe(c, K)) {
      const claudeVerdict = await claudeFn(input);
      const agreed = !!safeAgree(agreeFn, result, claudeVerdict);
      recordProbe(eventsPath, {
        role,
        ts: nowIso,
        trace_id: traceId,
        agreed,
        specialist_summary: summarize(result),
        claude_summary: summarize(claudeVerdict),
      });
      resetProbeCounter(state, role);
      const { probes, rate, shouldHalt } = checkHalt(eventsPath, role, N, tau);
      shadow = { fired: true, agreed, probes, rate, halt_triggered: shouldHalt };
      if (shouldHalt && !getHalt(state, role).halted) {
        const reason = contrastiveHaltMessage({ role, probes, rate, tau });
        setHalt(state, role, { reason, since: nowIso });
        appendHaltEvent(eventsPath, { role, ts: nowIso, reason, probes, agreed: probes - Math.round(probes * (1 - rate)), rate, tau });
      }
    } else {
      shadow = { fired: false, counter: c };
    }
  }

  // ── Persist state ────────────────────────────────────────────────────────────────────────
  try { saveState(statePath, state); } catch { /* best-effort */ }

  // ── Receipt ──────────────────────────────────────────────────────────────────────────────
  const receipt = {
    schema: "roleos-specialist-receipt/v1",
    role,
    ts: nowIso,
    trace_id: traceId,
    route: decision.route,
    source,
    decision,
    ...(specialistCall ? { specialist_call: stripVerdictFromCall(specialistCall) } : {}),
    ...(shadow ? { shadow } : {}),
  };

  return { result, receipt };
}

/** Default verdict comparator — strict deep-equal on JSON-stringifiable verdicts. */
function strictEqualVerdicts(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch { return false; }
}

function safeAgree(fn, a, b) {
  try { return fn(a, b); }
  catch { return false; }
}

function parseIsoMs(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Operator-facing one-liner for the shadow-probe log. */
function summarize(v) {
  if (v === null || v === undefined) return "(none)";
  if (typeof v === "string") return v.slice(0, 80);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v).slice(0, 120); } catch { return "(unserializable)"; }
}

/** Don't repeat the verdict in `specialist_call`; it's already in `result`/receipt source. */
function stripVerdictFromCall(call) {
  const { verdict, ...rest } = call;
  return rest;
}
