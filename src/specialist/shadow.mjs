/**
 * Shadow-probe — every Kth specialist dispatch also runs the Claude path; the two verdicts
 * are compared and logged. Over a rolling window of N probes, if agreement falls below
 * `1 - τ`, the role is halted (andon).
 *
 * Hides one secret family: the probe schedule + halt math. Callers see `shouldShadowProbe`,
 * `recordProbe`, and `checkHalt`; they don't compute K-th or read JSONL by hand.
 *
 * Defaults (per `policy/specialist-tier.md`):
 *   - K (probe-every-N) = 20
 *   - N (rolling window) = 50
 *   - τ (disagreement threshold) = 0.15  →  halt when agreement rate < 0.85
 *
 * These defaults are configurable per-role via the registry entry (future) or globally via
 * env (`ROLEOS_SHADOW_K`, `ROLEOS_SHADOW_N`, `ROLEOS_SHADOW_TAU`).
 */

import { readEvents, appendEvent } from "./events.mjs";

export const SHADOW_DEFAULTS = {
  K: 20,
  N: 50,
  TAU: 0.15,
};

/**
 * Decide whether the dispatch we're about to make should also fire a shadow probe.
 * Probe fires on the Kth dispatch (counter === K). Caller increments the counter elsewhere
 * (see state.mjs/incrementProbeCounter); this is pure.
 */
export function shouldShadowProbe(counter, K = SHADOW_DEFAULTS.K) {
  return counter >= K;
}

/**
 * Record a shadow probe outcome. `agreed` is the consumer-domain agreement (the caller
 * supplied a domain-aware comparator). Optional summary fields are kept short and
 * operator-facing — full verdicts go in the dispatch receipt, not in the event log.
 *
 * @param {string} eventsPath
 * @param {object} probe
 * @param {string} probe.role
 * @param {string} probe.trace_id
 * @param {boolean} probe.agreed
 * @param {string} [probe.specialist_summary]
 * @param {string} [probe.claude_summary]
 * @param {string} probe.ts                   ISO-8601 (caller-supplied; no Date.now() here)
 */
export function recordProbe(eventsPath, probe) {
  appendEvent(eventsPath, {
    kind: "shadow-probe",
    role: probe.role,
    ts: probe.ts,
    data: {
      trace_id: probe.trace_id,
      agreed: !!probe.agreed,
      ...(probe.specialist_summary ? { specialist_summary: probe.specialist_summary } : {}),
      ...(probe.claude_summary ? { claude_summary: probe.claude_summary } : {}),
    },
  });
}

/**
 * Check the last N shadow-probe events for `role` and compute agreement rate. Returns
 * `{ probes, agreed, rate, shouldHalt }`. If fewer than N probes exist, `shouldHalt` is
 * always false — we don't halt off a thin sample (Snell 2024 phase-transition argument:
 * narrow fine-tunes show step changes, so an early halt on a small sample would be a noise
 * trigger, not a real disagreement signal).
 *
 * Only probes recorded AFTER the role's most recent clear-halt event count. A clear-halt is
 * an operator decision that the disagreement evidence before it is adjudicated; without this
 * boundary the stale disagreeing probes keep dominating the window and the role re-halts on
 * the very next probe — the documented recovery command could never actually recover a role.
 * The fresh-start window also restarts the ≥N thin-sample guard, so a cleared role gets a
 * full new sample before it can halt again.
 *
 * @param {string} eventsPath
 * @param {string} role
 * @param {number} [N]
 * @param {number} [tau]
 * @returns {{ probes: number, agreed: number, rate: number, shouldHalt: boolean }}
 */
export function checkHalt(eventsPath, role, N = SHADOW_DEFAULTS.N, tau = SHADOW_DEFAULTS.TAU) {
  const events = readEvents(eventsPath, { role, kind: ["shadow-probe", "clear-halt"] });
  const lastClear = events.map((e) => e.kind).lastIndexOf("clear-halt");
  const probesSinceClear = events.slice(lastClear + 1).filter((e) => e.kind === "shadow-probe");
  const window = probesSinceClear.slice(-N);
  const probes = window.length;
  const agreed = window.filter((e) => e.data && e.data.agreed === true).length;
  const rate = probes === 0 ? 1 : agreed / probes;
  const shouldHalt = probes >= N && rate < 1 - tau;
  return { probes, agreed, rate, shouldHalt };
}

/**
 * Compose a contrastive halt message — workflow-standard #5 (Buçinca CHI 2025
 * arXiv:2410.04253). Names what the specialist did, what Claude did, and why we halted.
 * Caller writes this into the halt event AND into the state file's halt slot.
 */
export function contrastiveHaltMessage({ role, probes, rate, tau }) {
  const pct = (rate * 100).toFixed(1);
  const required = ((1 - tau) * 100).toFixed(1);
  return (
    `specialist for role "${role}" halted: shadow-probe agreement ${pct}% over the last ` +
    `${probes} probes < required ${required}% (τ=${tau}). The specialist's verdicts have ` +
    // Role names contain spaces ("Token Budget Analyst") — the copy-pasteable command must quote.
    `drifted from Claude's on the same inputs. Clear with: roleos specialist clear-halt "${role}"`
  );
}

/**
 * Append a halt event AND set the state's halt slot. The caller saves the state file; this
 * function only appends to the events log so the operations remain composable (events.jsonl
 * is shared; state.json is per-call).
 */
export function appendHaltEvent(eventsPath, { role, ts, reason, probes, agreed, rate, tau }) {
  appendEvent(eventsPath, {
    kind: "halt",
    role,
    ts,
    data: { reason, probes, agreed, rate, tau },
  });
}

export function appendClearHaltEvent(eventsPath, { role, ts, operator, reason }) {
  appendEvent(eventsPath, {
    kind: "clear-halt",
    role,
    ts,
    data: { operator, reason: reason || "" },
  });
}
