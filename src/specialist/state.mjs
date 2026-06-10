/**
 * Specialist runtime state — quota window + shadow-probe counter + halt state.
 *
 * Hides one secret family (Parnas): the persistence of routing counters. Callers see
 * `get/inc/setHalt/getHalt`; they never touch the on-disk format. The on-disk format is a
 * single JSON file, intentionally simple so an operator can hand-edit it in a pinch.
 *
 * State default path: `<repo>/.role-os/specialist-state.json`. Override with
 * `ROLEOS_SPECIALIST_STATE_PATH`.
 *
 * Quota (v2): a sliding window over the last `windowSize` dispatches of EITHER route. Every
 * dispatch is recorded as `{ t, route }` with route "specialist" | "claude"; the specialist
 * share is count(route === "specialist") over the last `windowSize` entries. Recording BOTH
 * routes is what makes the window actually roll — Claude-routed traffic pushes old specialist
 * entries out, so the specialist keeps receiving its quota share indefinitely. (v1 recorded
 * only specialist dispatches and never aged them out, so every role locked out permanently
 * after `windowSize × quota` dispatches — the opposite of the policy's "sliding" promise.)
 * The window counts dispatches, not seconds, so it is a true rolling window not aligned to
 * wall clock (a wall-clock window can be timed against the edge, which the workload-quota
 * anti-collapse argument is meant to prevent).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const STATE_SCHEMA = "roleos-specialist-state/v2";
const STATE_SCHEMA_V1 = "roleos-specialist-state/v1";

/** Default quota window (dispatches), matching the dispatcher's DEFAULT_WINDOW. */
export const DEFAULT_WINDOW = 200;

/**
 * @typedef {object} DispatchRecord
 * @property {number} t                        unix-ms timestamp
 * @property {"specialist"|"claude"} route     where the dispatch was actually served
 */

/**
 * @typedef {object} RoleState
 * @property {number} probe_counter            count of dispatches since the last shadow probe
 * @property {object|null} halt                { reason, since } or null when not halted
 */

/**
 * @typedef {object} StateFile
 * @property {string} schema
 * @property {DispatchRecord[]} dispatches     sliding window of recent dispatches (both routes)
 * @property {Object<string, RoleState>} roles
 */

export function emptyState() {
  return { schema: STATE_SCHEMA, dispatches: [], roles: {} };
}

export function loadState(path) {
  if (!existsSync(path)) return emptyState();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    // Tolerant v1 migration: a v1 file loads as v2 (old bare timestamps -> route "specialist")
    // instead of erroring; the migrated shape is persisted on the next saveState.
    if (raw && raw.schema === STATE_SCHEMA_V1 && typeof raw.roles === "object") {
      return migrateV1(raw);
    }
    if (!raw || raw.schema !== STATE_SCHEMA || typeof raw.roles !== "object") {
      // Refuse to silently accept a mis-shaped state file. Caller decides what to do.
      const err = new Error(`state file schema mismatch: got "${raw && raw.schema}", expected "${STATE_SCHEMA}"`);
      err.code = "STATE_SCHEMA_MISMATCH";
      throw err;
    }
    raw.dispatches = (Array.isArray(raw.dispatches) ? raw.dispatches : [])
      .map(normalizeDispatchRecord)
      .filter(Boolean);
    return raw;
  } catch (err) {
    if (err.code === "STATE_SCHEMA_MISMATCH") throw err;
    const wrapped = new Error(`state file parse error: ${err.message}`);
    wrapped.code = "STATE_PARSE_ERROR";
    throw wrapped;
  }
}

/**
 * v1 -> v2 migration. v1 recorded only specialist dispatches, as bare unix-ms numbers in a
 * per-role `dispatch_timestamps` array. Each becomes `{ t, route: "specialist" }` in the
 * shared v2 window (sorted oldest-first); role slots keep probe_counter/halt.
 */
function migrateV1(raw) {
  const dispatches = [];
  const roles = {};
  for (const [role, slot] of Object.entries(raw.roles || {})) {
    if (!slot || typeof slot !== "object") continue;
    for (const t of Array.isArray(slot.dispatch_timestamps) ? slot.dispatch_timestamps : []) {
      if (typeof t === "number" && Number.isFinite(t)) dispatches.push({ t, route: "specialist" });
    }
    roles[role] = {
      probe_counter: typeof slot.probe_counter === "number" ? slot.probe_counter : 0,
      halt: slot.halt ? { reason: slot.halt.reason, since: slot.halt.since } : null,
    };
  }
  dispatches.sort((a, b) => a.t - b.t);
  return { schema: STATE_SCHEMA, dispatches, roles };
}

/** Tolerate hand-edited windows: bare numbers read as v1-style specialist timestamps. */
function normalizeDispatchRecord(r) {
  if (typeof r === "number" && Number.isFinite(r)) return { t: r, route: "specialist" };
  if (!r || typeof r !== "object" || typeof r.t !== "number" || !Number.isFinite(r.t)) return null;
  return { t: r.t, route: r.route === "claude" ? "claude" : "specialist" };
}

export function saveState(path, state) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n", "utf8");
}

/** Get or create a role's slot in the state object. Mutates and returns the slot. */
export function ensureRole(state, role) {
  if (!state.roles[role]) {
    state.roles[role] = { probe_counter: 0, halt: null };
  }
  return state.roles[role];
}

/**
 * Record a dispatch in the sliding window — EVERY dispatch, both routes. Pure — returns
 * updated state. The window only rolls if Claude-routed traffic is recorded too; that is what
 * lets the specialist share recover after quota pressure instead of locking out permanently.
 *
 * Signature (cross-agent contract): `recordDispatch(state, route)` with route "specialist" |
 * "claude". Trailing params are optional: `windowSize` trims the stored window (dispatches,
 * not seconds; default 200) and `nowMs` injects the timestamp (testability — defaults to
 * Date.now()). Any route value that is not "claude" counts as "specialist" — the conservative
 * direction (legacy callers only ever recorded specialist dispatches, and over-counting
 * tightens the quota, which fails open to Claude).
 */
export function recordDispatch(state, route, windowSize = DEFAULT_WINDOW, nowMs = Date.now()) {
  if (!Array.isArray(state.dispatches)) state.dispatches = [];
  state.dispatches.push({ t: nowMs, route: route === "claude" ? "claude" : "specialist" });
  const max = Math.max(1, windowSize);
  if (state.dispatches.length > max) {
    state.dispatches.splice(0, state.dispatches.length - max);
  }
  return state;
}

/**
 * Build a QuotaState view for the gate. `used` is "how many of the last `windowSize`
 * dispatches (both routes) went to the specialist"; `window` is the fixed denominator —
 * the gate computes share-if-added.
 *
 * Important: with fewer than `windowSize` dispatches recorded, the quota check is generous
 * (a small numerator over a full-size denominator). That is intentional — the quota cap is
 * meant to prevent collapse at scale, not to gate a cold start.
 *
 * `role` is kept for call-site/API stability; the v2 window is shared across roles (the state
 * file is the repo's dispatch ledger). The 2-arg form `quotaStateFor(state, windowSize)` is
 * tolerated.
 */
export function quotaStateFor(state, role, windowSize) {
  if (typeof role === "number" && windowSize === undefined) {
    windowSize = role;
  }
  const size = Math.max(1, typeof windowSize === "number" && Number.isFinite(windowSize) ? windowSize : DEFAULT_WINDOW);
  const entries = Array.isArray(state.dispatches) ? state.dispatches.slice(-size) : [];
  const used = entries.filter((d) => d && d.route === "specialist").length;
  return { used, window: size };
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
