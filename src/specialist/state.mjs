/**
 * Specialist runtime state — quota counters + shadow-probe counter + halt state, per role.
 *
 * Hides one secret family (Parnas): the persistence of routing counters. Callers see
 * `get/inc/setHalt/getHalt`; they never touch the on-disk format. The on-disk format is a
 * single JSON file, intentionally simple so an operator can hand-edit it in a pinch.
 *
 * State default path: `<repo>/.role-os/specialist-state.json`. Override with
 * `ROLEOS_SPECIALIST_STATE_PATH`.
 *
 * Quota: a sliding-window counter. We store the last `window` dispatch timestamps so the
 * window is a true rolling window, not aligned to wall clock. (A wall-clock window can be
 * timed against the edge, which the workload-quota anti-collapse argument is meant to
 * prevent.)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const STATE_SCHEMA = "roleos-specialist-state/v1";

/**
 * @typedef {object} RoleState
 * @property {number[]} dispatch_timestamps   sliding window of dispatch unix-ms
 * @property {number} probe_counter            count of dispatches since the last shadow probe
 * @property {object|null} halt                { reason, since } or null when not halted
 */

/**
 * @typedef {object} StateFile
 * @property {string} schema
 * @property {Object<string, RoleState>} roles
 */

export function emptyState() {
  return { schema: STATE_SCHEMA, roles: {} };
}

export function loadState(path) {
  if (!existsSync(path)) return emptyState();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (!raw || raw.schema !== STATE_SCHEMA || typeof raw.roles !== "object") {
      // Refuse to silently accept a mis-shaped state file. Caller decides what to do.
      const err = new Error(`state file schema mismatch: got "${raw && raw.schema}", expected "${STATE_SCHEMA}"`);
      err.code = "STATE_SCHEMA_MISMATCH";
      throw err;
    }
    return raw;
  } catch (err) {
    if (err.code === "STATE_SCHEMA_MISMATCH") throw err;
    const wrapped = new Error(`state file parse error: ${err.message}`);
    wrapped.code = "STATE_PARSE_ERROR";
    throw wrapped;
  }
}

export function saveState(path, state) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n", "utf8");
}

/** Get or create a role's slot in the state object. Mutates and returns the slot. */
export function ensureRole(state, role) {
  if (!state.roles[role]) {
    state.roles[role] = { dispatch_timestamps: [], probe_counter: 0, halt: null };
  }
  return state.roles[role];
}

/**
 * Record a specialist dispatch in the sliding window. Pure — returns updated state.
 * `windowSize` is in dispatches, not seconds; we keep the last `windowSize` timestamps.
 * `nowMs` must be supplied (no Date.now() inside this function for testability).
 */
export function recordDispatch(state, role, windowSize, nowMs) {
  const slot = ensureRole(state, role);
  slot.dispatch_timestamps.push(nowMs);
  if (slot.dispatch_timestamps.length > windowSize) {
    slot.dispatch_timestamps.splice(0, slot.dispatch_timestamps.length - windowSize);
  }
  return state;
}

/**
 * Build a QuotaState view for the gate. `used` is "how many of the last `windowSize`
 * dispatches went to the specialist" — but here EVERY tracked timestamp is a specialist
 * dispatch (Claude calls are not tracked), so `used = dispatch_timestamps.length` and
 * `window` accounts for both — the gate computes share-if-added.
 *
 * Important: this caps `window` at `windowSize`. With fewer than `windowSize` dispatches,
 * the quota check is generous (a small denominator means small share). That is intentional
 * — the quota cap is meant to prevent collapse at scale, not to gate a cold start.
 */
export function quotaStateFor(state, role, windowSize) {
  const slot = state.roles[role];
  const used = slot ? slot.dispatch_timestamps.length : 0;
  return { used, window: windowSize };
}

export function incrementProbeCounter(state, role) {
  const slot = ensureRole(state, role);
  slot.probe_counter += 1;
  return slot.probe_counter;
}

export function resetProbeCounter(state, role) {
  const slot = ensureRole(state, role);
  slot.probe_counter = 0;
}

export function getHalt(state, role) {
  const slot = state.roles[role];
  if (!slot || !slot.halt) return { halted: false };
  return { halted: true, reason: slot.halt.reason, since: slot.halt.since };
}

export function setHalt(state, role, halt) {
  const slot = ensureRole(state, role);
  if (halt) {
    slot.halt = { reason: halt.reason, since: halt.since };
  } else {
    slot.halt = null;
  }
}
