/**
 * Knowledge Block Renderer — transforms a retrieval bundle into a prompt fragment.
 *
 * This is a pure function: same input → same output. No retrieval logic.
 * No raw JSON dump. No ad hoc search. Just governed prompt construction.
 *
 * The block has 4 sections:
 *   1. Knowledge posture (one line)
 *   2. Retrieved evidence (top N excerpts with citations)
 *   3. Warnings / constraints
 *   4. Usage law (status-specific behavioral rules)
 */

// ── Configuration ───────────────────────────────────────────────────

const MAX_EVIDENCE_CHUNKS = 6;
const MAX_EXCERPT_LENGTH = 200;

// ── Status-Specific Usage Law ───────────────────────────────────────

const USAGE_LAW = {
  strong: [
    "Prioritize retrieved evidence when making claims in your domain.",
    "Cite retrieved references when making specific substantive claims.",
    "Do not invent sources that were not retrieved.",
  ],
  weak: [
    "Treat retrieved evidence as partial — it may not cover the full picture.",
    "Avoid overclaiming based on limited evidence.",
    "Escalate uncertainty where it affects your deliverable.",
    "Do not invent sources that were not retrieved.",
  ],
  stale: [
    "Retrieved evidence may be outdated — note possible staleness in your analysis.",
    "Do not present stale evidence as current truth without qualification.",
    "Flag any claims that depend on time-sensitive data.",
    "Do not invent sources that were not retrieved.",
  ],
  conflicted: [
    "Retrieved sources contain conflicting evidence.",
    "Surface the conflict explicitly — do not flatten disagreement into fake consensus.",
    "Acknowledge which claims are contested and by what sources.",
    "Do not invent sources that were not retrieved.",
  ],
  none: null, // No knowledge block rendered
};

// ── Main Renderer ───────────────────────────────────────────────────

/**
 * Render a knowledge prompt block from packet.knowledge.
 *
 * @param {Object|null} packetKnowledge - packet.knowledge (with retrieval_bundle and status)
 * @returns {string|null} Prompt block string, or null if no knowledge to render
 */
export function renderKnowledgeBlock(packetKnowledge) {
  if (!packetKnowledge || packetKnowledge.status === "none") {
    return null;
  }

  const { retrieval_bundle: bundle, status } = packetKnowledge;
  if (!bundle || !bundle.selected?.length) {
    return null;
  }

  const sections = [];

  // 1. Posture line
  sections.push(`## Retrieved Knowledge\n\nKnowledge status: **${status}**`);

  // 2. Evidence excerpts
  const evidenceBlock = renderEvidenceBlock(bundle.selected);
  if (evidenceBlock) {
    sections.push(evidenceBlock);
  }

  // 3. Warnings
  const warningsBlock = renderWarningsBlock(bundle.warnings);
  if (warningsBlock) {
    sections.push(warningsBlock);
  }

  // 4. Usage law
  const lawBlock = renderUsageLaw(status);
  if (lawBlock) {
    sections.push(lawBlock);
  }

  return sections.join("\n\n");
}

// ── Evidence Renderer ───────────────────────────────────────────────

/**
 * Render the top N evidence excerpts.
 */
function renderEvidenceBlock(selected) {
  if (!selected?.length) return null;

  const top = selected.slice(0, MAX_EVIDENCE_CHUNKS);
  const lines = ["### Evidence"];

  for (let i = 0; i < top.length; i++) {
    const chunk = top[i];
    const trustLabel = chunk.metadata?.trust_tier ?? "general";
    const freshnessLabel = chunk.metadata?.freshness?.status ?? "undated";
    const citation = chunk.citation?.reference ?? chunk.chunk_id;
    const excerpt = truncateExcerpt(chunk.content);

    lines.push(`${i + 1}. [${trustLabel} | ${freshnessLabel}] ${citation}`);
    lines.push(`   "${excerpt}"`);
  }

  return lines.join("\n");
}

// ── Warnings Renderer ───────────────────────────────────────────────

/**
 * Render retrieval warnings as constraints.
 */
function renderWarningsBlock(warnings) {
  if (!warnings?.length) return null;

  const meaningful = warnings.filter(
    (w) => w.code !== "FORBIDDEN_SOURCE_HIT" // governance working, not a user-facing warning
  );

  if (!meaningful.length) return null;

  const lines = ["### Warnings"];
  for (const warning of meaningful) {
    lines.push(`- ${formatWarning(warning)}`);
  }

  return lines.join("\n");
}

/**
 * Format a warning into human-readable text.
 */
function formatWarning(warning) {
  switch (warning.code) {
    case "NO_HIGH_TRUST_MATCH":
      return "No authoritative sources matched — evidence quality is limited.";
    case "ONLY_SHARED_CORPUS":
      return "No role-specific evidence found — results are from shared corpus only.";
    case "STALE_DOMINANT":
      return "Most retrieved evidence is outdated — treat with caution.";
    case "LOW_DIVERSITY":
      return "Evidence comes from a single source — limited perspective.";
    case "CONFLICTING_EVIDENCE":
      return `Conflicting evidence: ${warning.message}`;
    default:
      return warning.message;
  }
}

// ── Usage Law Renderer ──────────────────────────────────────────────

/**
 * Render status-specific usage law.
 */
function renderUsageLaw(status) {
  const laws = USAGE_LAW[status];
  if (!laws) return null;

  const lines = ["### Knowledge Use Rules"];
  for (const law of laws) {
    lines.push(`- ${law}`);
  }

  return lines.join("\n");
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Truncate content to MAX_EXCERPT_LENGTH, preserving word boundaries.
 */
function truncateExcerpt(content) {
  if (!content) return "";
  if (content.length <= MAX_EXCERPT_LENGTH) return content;

  const truncated = content.slice(0, MAX_EXCERPT_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > MAX_EXCERPT_LENGTH * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

// ── Manifest Summary ────────────────────────────────────────────────

/**
 * Generate a compact knowledge summary for the dispatch manifest.
 * Not full excerpts — just posture truth.
 *
 * @param {Object|null} packetKnowledge
 * @returns {Object|null} Compact summary for manifest, or null
 */
export function knowledgeManifestSummary(packetKnowledge) {
  if (!packetKnowledge || packetKnowledge.status === "none") {
    return null;
  }

  const { retrieval_bundle: bundle, status } = packetKnowledge;
  if (!bundle) return null;

  return {
    status,
    selected_count: bundle.selected?.length ?? 0,
    trust_posture: bundle.provenance?.trust_posture ?? "weak",
    freshness_posture: bundle.provenance?.freshness_posture ?? "stale",
    warning_codes: (bundle.warnings ?? []).map((w) => w.code),
    rerank_strategy: bundle.summary?.rerank_strategy ?? "unknown",
  };
}
