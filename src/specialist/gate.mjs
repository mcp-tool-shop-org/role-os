/**
 * Gate — the per-dispatch routing decision: specialist or Claude.
 *
 * Hides one secret family (Parnas): the routing math. Callers pass in registry state and
 * runtime signals; the gate is a pure function. Fail-open is the default — any uncertainty,
 * any malformed signal, any out-of-band condition routes to Claude.
 *
 * The OvA score is computed per-specialist (Verma & Nalisnick ICML 2022, arXiv:2202.03673);
 * there is NO joint softmax across roles. The default v0.1 classifier is deterministic +
 * embedding-similarity (cosine of input embedding to the version's exam_centroid). A trained
 * classifier is an additive upgrade — drop in a different `scoreFn`.
 *
 * The reject conditions enforced here are R-tier policy gates from
 * `starter-pack/policy/specialist-tier.md`:
 *   - shadow_probe_halt           — sticky halt dominates everything
 *   - no_active_version            — registry has no active pointer
 *   - uncertified_active_version  — Reject 2 safety net (load-time also catches this)
 *   - quota_exhausted              — Reject 3
 *   - ood                          — Reject 5
 *   - score_below_threshold        — Reject 4
 *   - score_invalid                — fail-open on a malformed classifier output
 */

import { resolveActiveVersion } from "./registry.mjs";

/**
 * @typedef {object} GateDecision
 * @property {"specialist"|"claude"} route   where the dispatch goes
 * @property {string} reason                  machine-readable reason
 * @property {number} score                   OvA score (0 when not computed)
 * @property {boolean} ood                    OOD check result
 * @property {boolean} quotaOk                quota check result
 * @property {string} [detail]                operator-facing explanation
 */

/**
 * @typedef {object} QuotaState
 * @property {number} used        dispatches taken by this specialist in the current window
 * @property {number} window      window size (dispatches)
 */

/**
 * @typedef {object} HaltState
 * @property {boolean} halted
 * @property {string} [reason]
 */

/**
 * @typedef {object} Classifier
 * @property {(input:any, version:object, entry:object) => number} scoreFn   returns OvA score in [0, 1]
 * @property {(input:any, version:object, entry:object) => boolean} oodFn    true if input is OOD for this specialist
 */

/**
 * Decide where this dispatch goes. Pure function; all state is in `params`.
 *
 * @param {object} params
 * @param {string} params.role
 * @param {*}      params.input
 * @param {object} params.registryEntry           the specialist registry entry for `role`
 * @param {QuotaState} params.quotaState
 * @param {HaltState}  params.haltState
 * @param {Classifier} [params.classifier]        v0.1 default = deterministic + embedding-similarity
 * @returns {GateDecision}
 */
export function gate({ role, input, registryEntry, quotaState, haltState, classifier = defaultClassifier }) {
  if (!registryEntry) {
    return failOpen("no_registry_entry", `role "${role}" has no specialist registry entry`);
  }
  if (haltState && haltState.halted) {
    return failOpen("shadow_probe_halt", haltState.reason || "specialist dispatch halted by shadow-probe disagreement");
  }
  let active;
  try {
    active = resolveActiveVersion(registryEntry);
  } catch (err) {
    return failOpen("registry_dangling_pointer", err.message);
  }
  if (!active) {
    return failOpen("no_active_version", `role "${role}" has no active specialist version`);
  }
  if (active.certified_level === "L0") {
    return failOpen("uncertified_active_version", `active version "${active.id}" is L0 (uncertified)`);
  }

  // Quota check (R3 in the policy): if accepting this dispatch would exceed the workload
  // quota, fail open. We compute share-if-added — the cap is "share AFTER this dispatch",
  // so the gate's decision itself is what enforces the cap (no race with later increments).
  const window = Math.max(1, quotaState?.window ?? 0);
  const used = Math.max(0, quotaState?.used ?? 0);
  const shareIfAdd = (used + 1) / window;
  const quotaOk = shareIfAdd <= registryEntry.workload_quota;
  if (!quotaOk) {
    return failOpen(
      "quota_exhausted",
      `would push specialist share to ${shareIfAdd.toFixed(3)} > quota ${registryEntry.workload_quota}`,
      { quotaOk: false },
    );
  }

  // OOD check (R5).
  let ood = false;
  try {
    ood = !!classifier.oodFn(input, active, registryEntry);
  } catch (err) {
    return failOpen("ood_check_threw", `oodFn threw: ${err.message}`);
  }
  if (ood) {
    return failOpen("ood", "input is out-of-distribution for the active specialist", { ood: true });
  }

  // OvA score (R4).
  let score;
  try {
    score = classifier.scoreFn(input, active, registryEntry);
  } catch (err) {
    return failOpen("score_fn_threw", `scoreFn threw: ${err.message}`);
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) {
    return failOpen("score_invalid", `scoreFn returned ${score} (must be a finite number in [0, 1])`);
  }
  if (score < active.gate_threshold) {
    return failOpen(
      "score_below_threshold",
      `OvA score ${score.toFixed(3)} < gate_threshold ${active.gate_threshold}`,
      { score },
    );
  }

  return {
    route: "specialist",
    reason: "ok",
    score,
    ood: false,
    quotaOk: true,
    detail: `routed to specialist (score=${score.toFixed(3)}, threshold=${active.gate_threshold})`,
  };
}

function failOpen(reason, detail, overrides = {}) {
  return {
    route: "claude",
    reason,
    score: overrides.score ?? 0,
    ood: overrides.ood ?? false,
    quotaOk: overrides.quotaOk ?? true,
    detail,
  };
}

// ── Default classifier — deterministic + embedding-similarity ─────────────────────────────────

/**
 * Default OvA score: cosine similarity of `input.embedding` to `version.exam_centroid`,
 * mapped from [-1, 1] to [0, 1]. If either is missing, returns 0 (which is below any
 * positive gate_threshold and so fails open).
 *
 * v0.1 inputs that do not carry an embedding will always score 0 → always fail open. That is
 * the correct default until either:
 *   (a) inputs are pre-embedded by the consumer (e.g. prism for the Verifier specialist), or
 *   (b) a trained classifier replaces this default scoreFn.
 */
export function defaultScoreFn(input, version /*, entry */) {
  const emb = input && Array.isArray(input.embedding) ? input.embedding : null;
  const centroid = Array.isArray(version.exam_centroid) ? version.exam_centroid : null;
  if (!emb || !centroid || emb.length === 0 || emb.length !== centroid.length) return 0;
  const sim = cosineSimilarity(emb, centroid);
  return (sim + 1) / 2;
}

/**
 * Default OOD: when there's no centroid or no embedding to measure against, the v0.1 gate
 * cannot judge in-distribution and so calls the input OOD (fail-open). Once a centroid +
 * input embedding are both present, OOD is true iff cosine similarity is below `ood_floor`
 * (default 0.4). A trained OOD detector is an additive upgrade.
 *
 * Read together with `defaultScoreFn`: with no embedding, `ood = true` AND `score = 0` —
 * both reject paths are taken, both fail open. The redundancy is intentional (defense in
 * depth — neither rejection depends on the other working).
 */
export function defaultOodFn(input, version /*, entry */) {
  const emb = input && Array.isArray(input.embedding) ? input.embedding : null;
  const centroid = Array.isArray(version.exam_centroid) ? version.exam_centroid : null;
  if (!emb || !centroid || emb.length === 0 || emb.length !== centroid.length) return true;
  const floor = typeof version.ood_floor === "number" ? version.ood_floor : 0.4;
  return cosineSimilarity(emb, centroid) < floor;
}

export const defaultClassifier = { scoreFn: defaultScoreFn, oodFn: defaultOodFn };

/** Cosine similarity in [-1, 1]. Returns 0 for zero-norm vectors. */
export function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}
