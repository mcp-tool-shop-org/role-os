/**
 * Fallback policy for degraded retrieval scenarios.
 *
 * Explicit governance — no silent garbage.
 * Every degraded state has a named action and a message.
 */

/**
 * Evaluate the fallback state for a retrieval bundle.
 *
 * @param {Object} bundle - RetrievalBundle
 * @param {Object|null} overlay - RoleOverlay or null
 * @returns {{ state: string, action: string, message: string }}
 */
export function applyFallbackPolicy(bundle, overlay) {
  // Malformed bundle from a buggy/version-skewed retrieve() → named degraded
  // state instead of a TypeError that callers would swallow silently.
  if (!bundle || typeof bundle !== "object" || !Array.isArray(bundle.selected)) {
    return {
      state: "malformed_bundle",
      action: "warn",
      message: "Retrieval bundle is malformed (missing or invalid selected[]) — knowledge degraded",
    };
  }

  const summary = bundle.summary ?? {};

  // No overlay → shared corpus only
  if (!overlay) {
    return {
      state: "no_overlay",
      action: "continue",
      message: `No overlay for role ${bundle.role_id ?? "unknown"} — using shared corpus only`,
    };
  }

  // No selected chunks at all
  if (bundle.selected.length === 0) {
    return {
      state: "no_strong_match",
      action: "warn",
      message: "No chunks selected — bundle is empty",
    };
  }

  // Check for forbidden source hits
  if ((summary.forbidden_hits ?? 0) > 0) {
    // Forbidden sources were removed, but log the diagnostic
    return {
      state: "forbidden_hit",
      action: "continue",
      message: `${summary.forbidden_hits} forbidden source(s) removed from results`,
    };
  }

  // Check for stale-dominant results
  const totalRelevant = (summary.selected_count ?? 0) + (summary.stale_count ?? 0);
  if (totalRelevant > 0 && (summary.stale_count ?? 0) / totalRelevant > 0.5) {
    return {
      state: "stale_dominant",
      action: "warn",
      message: `${summary.stale_count} of ${totalRelevant} relevant candidates are stale`,
    };
  }

  // Check for conflicting evidence
  const conflictWarning = bundle.warnings?.find((w) => w.code === "CONFLICTING_EVIDENCE");
  if (conflictWarning) {
    return {
      state: "conflicting",
      action: "warn",
      message: conflictWarning.message,
    };
  }

  // Check for weak trust posture
  if ((bundle.provenance?.trust_posture ?? "weak") === "weak") {
    return {
      state: "no_strong_match",
      action: "warn",
      message: "All selected chunks are low-trust — bundle marked weak",
    };
  }

  // Healthy
  return {
    state: "healthy",
    action: "continue",
    message: "Retrieval healthy",
  };
}
