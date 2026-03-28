/**
 * Shared State Machine — valid transitions for run steps.
 *
 * Both run.mjs (persistent runner) and mission-run.mjs (mission runner)
 * use the same step lifecycle. This module defines the canonical transitions
 * so they cannot diverge.
 */

/**
 * Valid step status transitions.
 * Key: current status. Value: array of allowed next statuses.
 */
export const STEP_TRANSITIONS = {
  pending:   ["active"],
  active:    ["completed", "partial", "failed", "blocked"],
  completed: ["pending"],          // re-opened by escalation
  partial:   ["pending"],          // retried
  failed:    ["pending"],          // retried
  blocked:   ["pending"],          // unblocked
  skipped:   [],                   // terminal
};

/**
 * Valid run status transitions.
 */
export const RUN_TRANSITIONS = {
  planning:  ["running"],
  running:   ["paused", "completed", "partial", "failed"],
  paused:    ["running"],
  completed: ["paused"],           // re-opened by escalation/reopen
  partial:   ["paused"],           // retried
  failed:    ["paused"],           // retried
};

/**
 * Check if a step transition is valid.
 * @param {string} from - Current status
 * @param {string} to - Desired status
 * @returns {boolean}
 */
export function isValidStepTransition(from, to) {
  const allowed = STEP_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Check if a run transition is valid.
 * @param {string} from - Current status
 * @param {string} to - Desired status
 * @returns {boolean}
 */
export function isValidRunTransition(from, to) {
  const allowed = RUN_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Assert a step transition is valid, or throw.
 * @param {string} from
 * @param {string} to
 * @param {string} [context] - Description for error message
 */
export function assertStepTransition(from, to, context = "") {
  if (!isValidStepTransition(from, to)) {
    const prefix = context ? `${context}: ` : "";
    throw new Error(`${prefix}Invalid step transition "${from}" → "${to}"`);
  }
}
