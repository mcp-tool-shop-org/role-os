/**
 * Budget consult — the production seam that consults the Token Budget Analyst specialist for each step
 * of a dispatch manifest, attaching an ADVISORY budget forecast + receipt.
 *
 * This is the B-DEFAULT wiring: it puts the proven dispatchSpecialist pattern (wire_test.mjs) on the
 * production dispatch-assembly path. Three properties make it safe to land before the default-on flip:
 *
 *   - OPT-IN, default OFF (ROLEOS_BUDGET_CONSULT). With the flag off, buildDispatchManifestWithBudget
 *     returns EXACTLY what buildDispatchManifest returns — the production dispatch is byte-identical
 *     until the flip (a Mike-gated release decision).
 *   - FAIL-OPEN to the DETERMINISTIC baseline max(ctx*1.5, 50000) — NOT Claude (the budgeter's
 *     contracted fallback). dispatchSpecialist is itself fail-open in three places (gate, specialist
 *     call, consumer reject); on top of that, this consult swallows any error into an error-receipt so
 *     a budget consult can NEVER break manifest assembly.
 *   - ADVISORY. The forecast/receipt is attached to each step for the audit trail; it never blocks or
 *     gates the dispatch. The budgeter forecasts spend; it does not stop work.
 *
 * Reject conditions (lockdown doctrine): the flag turns it off; fail-open means it can't halt a
 * dispatch; the shadow-probe halt + `roleos specialist rollback <role> <version>` revert a bad adapter.
 */

import { buildDispatchManifest } from "../dispatch.mjs";
import { dispatchSpecialist } from "./dispatch.mjs";

export const BUDGET_ROLE = "Token Budget Analyst";
const CHARS_PER_TOKEN = 3.5;
const OUTPUT_TOKENS_PER_TURN = 300;

/** The budgeter's contracted DETERMINISTIC fail-open baseline (not Claude): max(ctx*1.5, 50000). */
export function deterministicBudget(input) {
  return {
    spend_weighted: Math.max(Math.round((input?.context_tokens || 0) * 1.5), 50000),
    source: "deterministic-baseline",
  };
}

/** Shadow-probe agreement: the specialist forecast is within 25% of the deterministic baseline. */
export function budgetAgree(specialistVerdict, baselineVerdict) {
  const s = specialistVerdict?.spend_weighted ?? specialistVerdict?.verdict?.spend_weighted ?? 0;
  const b = baselineVerdict?.spend_weighted ?? 0;
  return Math.abs(s - b) <= 0.25 * (b || 1);
}

/** Derive the {context_tokens, steps, output_estimate} the budgeter expects from a manifest step. */
export function budgetInputForStep(step, totalSteps) {
  const ctxChars = typeof step?.systemPrompt === "string" ? step.systemPrompt.length : 0;
  return {
    context_tokens: Math.round(ctxChars / CHARS_PER_TOKEN),
    steps: totalSteps,
    output_estimate: Math.round((step?.maxTurns || 1) * OUTPUT_TOKENS_PER_TURN),
  };
}

/** Read the wiring flag. Default OFF — flipping it on is a Mike-gated release decision. */
export function budgetConsultEnabled() {
  const v = process.env.ROLEOS_BUDGET_CONSULT;
  return v === "1" || v === "true";
}

/**
 * Consult the Token Budget Analyst for every step of a built manifest, mutating each step with
 * `budgetForecast` (the spend estimate) + `budgetReceipt` (the roleos-specialist-receipt/v1 audit
 * record). No-op when not enabled. NEVER throws.
 *
 * @param {object} manifest  a DispatchManifest from buildDispatchManifest
 * @param {object} [opts]
 * @param {boolean} [opts.enabled]   default: budgetConsultEnabled()
 * @param {object}  [opts.paths]     { registry, state, events } for dispatchSpecialist
 * @param {string}  [opts.nowIso]
 * @param {Function}[opts.httpFn]    injectable HTTP for the specialist call (tests)
 * @param {object}  [opts.classifier]
 * @param {object}  [opts.shadow]
 * @returns {Promise<object>} the same manifest, enriched
 */
export async function consultBudgetForManifest(manifest, opts = {}) {
  const { enabled = budgetConsultEnabled(), paths, nowIso, httpFn, classifier, shadow } = opts;
  if (!enabled || !manifest?.steps?.length) return manifest;

  for (const step of manifest.steps) {
    try {
      const { result, receipt } = await dispatchSpecialist({
        role: BUDGET_ROLE,
        input: budgetInputForStep(step, manifest.steps.length),
        claudeFn: async (i) => deterministicBudget(i),
        agreeFn: budgetAgree,
        traceId: `${manifest.runId || "run"}-${step.packetId ?? step.stepIndex}-budget`,
        nowIso: nowIso || new Date().toISOString(),
        ...(paths ? { paths } : {}),
        ...(httpFn ? { httpFn } : {}),
        ...(classifier ? { classifier } : {}),
        ...(shadow ? { shadow } : {}),
      });
      step.budgetForecast = result;
      step.budgetReceipt = receipt;
    } catch (err) {
      // A budget consult must never break manifest assembly — record the error and move on.
      step.budgetReceipt = {
        schema: "roleos-specialist-receipt/v1",
        role: BUDGET_ROLE,
        source: "consult-error",
        error: String(err && err.message ? err.message : err),
      };
    }
  }
  return manifest;
}

/**
 * Budget-aware dispatch assembly. Build the manifest, then (when the consult is enabled) attach a
 * per-step budget forecast. This is the single production entry point to call in place of
 * buildDispatchManifest once the consult is turned on; with the flag OFF (default) it returns exactly
 * what buildDispatchManifest returns.
 *
 * @param {object} options       buildDispatchManifest options
 * @param {object} [consultOpts] consultBudgetForManifest options
 */
export async function buildDispatchManifestWithBudget(options, consultOpts = {}) {
  const manifest = buildDispatchManifest(options);
  return consultBudgetForManifest(manifest, consultOpts);
}
