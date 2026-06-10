/**
 * Retrieve knowledge for a dispatch step.
 *
 * This is the integration seam between Role OS dispatch and knowledge-core.
 * Phase 2: wired to the real retrieval pipeline.
 *
 * When a corpus store is available, runs the full pipeline:
 *   task + overlay + corpus → candidates → filter → rerank → bundle
 *
 * When no corpus is available, returns a governed stub (graceful degradation).
 */

import { resolveOverlay } from "./resolve-overlay.mjs";
import { applyFallbackPolicy } from "./fallback-policy.mjs";

// ── Corpus Store Singleton ──────────────────────────────────────────
// Lazy-loaded. Role OS sets this via configureKnowledge().
let _store = null;
let _retrieveFn = null;

/**
 * Configure the knowledge subsystem with a live corpus store.
 * Call once at startup (e.g., in session init or dispatch init).
 *
 * @param {Object} options
 * @param {Object} options.store - CorpusStore instance from knowledge-core
 * @param {Function} options.retrieve - retrieve() function from knowledge-core
 */
export function configureKnowledge({ store, retrieve }) {
  _store = store;
  _retrieveFn = retrieve;
}

/**
 * Check if knowledge subsystem is configured with a live corpus.
 */
export function isKnowledgeConfigured() {
  return _store !== null && _retrieveFn !== null;
}

/**
 * @typedef {Object} RetrieveOptions
 * @property {string} roleId - Role identifier
 * @property {string} taskText - Task description from packet
 * @property {string} [packetContextSummary] - Optional packet context
 * @property {Object} [routeSignals] - Route scoring signals
 */

/**
 * Retrieve knowledge for a role's dispatch step.
 *
 * @param {RetrieveOptions} options
 * @returns {Promise<{ bundle: object, status: string, fallback: object }>}
 */
export async function retrieveForDispatch({ roleId, taskText, packetContextSummary, routeSignals }) {
  const overlayResult = resolveOverlay(roleId);
  const overlay = overlayResult?.overlay ?? null;

  // ── Live retrieval (Phase 2) ────────────────────────────────────
  if (_store && _retrieveFn) {
    const bundle = await _retrieveFn({
      store: _store,
      roleId,
      taskText,
      overlay,
      packetContextSummary,
      lexicalOnly: true, // Phase 2: lexical-only until embeddings are populated
    });

    const fallback = applyFallbackPolicy(bundle, overlay);

    return {
      bundle,
      status: deriveStatus(fallback, bundle),
      fallback,
    };
  }

  // ── Stub fallback (no corpus configured) ────────────────────────
  const bundle = buildStubBundle(roleId, taskText, overlayResult);
  const fallback = applyFallbackPolicy(bundle, overlay);

  return {
    bundle,
    status: deriveStatus(fallback, bundle),
    fallback,
  };
}

/**
 * Derive packet knowledge status from fallback state.
 *
 * no_overlay with selected chunks maps to "weak" (shared-corpus-only evidence),
 * matching fallback-policy's "continue — using shared corpus only" action.
 * "none" is reserved for genuinely empty retrievals, since renderKnowledgeBlock()
 * drops the knowledge block entirely for status "none".
 */
function deriveStatus(fallback, bundle) {
  switch (fallback.state) {
    case "healthy": return "strong";
    case "no_overlay": return (bundle?.selected?.length ?? 0) > 0 ? "weak" : "none";
    case "no_strong_match": return "weak";
    case "stale_dominant": return "stale";
    case "conflicting": return "conflicted";
    case "forbidden_hit": return "strong"; // forbidden sources removed = governance working
    default: return "weak";
  }
}

/**
 * Build a stub retrieval bundle when no corpus is available.
 */
function buildStubBundle(roleId, taskText, overlayResult) {
  const hasOverlayData = overlayResult !== null;

  return {
    version: "1.0",
    role_id: roleId,
    query: {
      task_text: taskText,
      lexical_query: [],
      semantic_query: [],
      applied_overlay_rules: hasOverlayData ? [`overlay:${roleId}`] : [],
      applied_filters: [],
      generated_at: new Date().toISOString(),
    },
    summary: {
      total_candidates: 0,
      selected_count: 0,
      stale_count: 0,
      forbidden_hits: 0,
      trust_tier_breakdown: { authoritative: 0, preferred: 0, general: 0, untrusted: 0 },
      source_breakdown: {},
      rerank_strategy: "stub-no-corpus",
    },
    selected: [],
    rejected: [],
    provenance: {
      source_ids: [],
      document_ids: [],
      trust_posture: "weak",
      freshness_posture: "stale",
    },
    warnings: [
      { code: "ONLY_SHARED_CORPUS", message: "No corpus configured — stub bundle returned" },
    ],
    diagnostics: {
      latency_ms: 0,
      candidate_pool_size: 0,
      deduped_count: 0,
      dropped_forbidden_count: 0,
      dropped_stale_count: 0,
    },
  };
}
