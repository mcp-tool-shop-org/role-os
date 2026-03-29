/**
 * Artifact Evidence Analyzer
 *
 * Connects: retrieval bundle → prompt knowledge block → artifact output
 *
 * Deterministic chain-of-custody checks:
 * - Which retrieved references appear in the artifact?
 * - Which artifact claims are backed by retrieved evidence?
 * - Did the artifact cite material when it should?
 * - Did it invent unsupported references?
 * - Did posture status affect artifact behavior?
 *
 * No LLM judge vibes. Just structural truth checks.
 */

// ── ArtifactEvidenceReport ──────────────────────────────────────────

/**
 * @typedef {Object} ArtifactEvidenceReport
 * @property {string} role_id
 * @property {string} task_id
 * @property {string} knowledge_status - strong | weak | stale | conflicted | none
 *
 * @property {RetrievedReferenceCheck[]} reference_checks
 * @property {number} references_available - total retrieved references
 * @property {number} references_used - references found in artifact
 * @property {number} references_missed - available but not used
 * @property {number} unsupported_references - artifact cited something not in bundle
 * @property {number} reference_use_ratio - references_used / references_available
 *
 * @property {PostureComplianceCheck} posture_compliance
 * @property {DistinctivenessSignal[]} distinctiveness_signals
 * @property {DriftViolation[]} drift_violations
 *
 * @property {string} verdict - pass | warn | fail
 * @property {string[]} reasons
 */

/**
 * @typedef {Object} RetrievedReferenceCheck
 * @property {string} reference - citation reference from bundle
 * @property {string} chunk_id
 * @property {boolean} found_in_artifact
 * @property {string[]} match_locations - where in artifact it was found
 */

/**
 * @typedef {Object} PostureComplianceCheck
 * @property {string} status - strong | weak | stale | conflicted | none
 * @property {boolean} compliant
 * @property {string[]} expected_signals - what should appear given posture
 * @property {string[]} found_signals - what actually appeared
 * @property {string[]} missing_signals - expected but absent
 */

/**
 * @typedef {Object} DistinctivenessSignal
 * @property {string} signal - what was checked
 * @property {boolean} present
 * @property {string} [evidence] - where in artifact
 */

/**
 * @typedef {Object} DriftViolation
 * @property {string} violation - what was found
 * @property {string} evidence - the offending text
 * @property {string} rule - which anti-goal was violated
 */

// ── Posture Signal Expectations ─────────────────────────────────────

const POSTURE_SIGNALS = {
  strong: {
    // Strong posture: artifact should reference sources and make definitive claims
    expected: ["per ", "according to", "documented in", "as identified", "findings", "recommendation"],
    banned: ["insufficient evidence", "unable to assess", "lack sufficient data"],
  },
  weak: {
    expected: ["limited evidence", "partial", "insufficient", "uncertain", "preliminary"],
    banned: [],
  },
  stale: {
    expected: ["outdated", "stale", "may no longer", "as of", "dated", "older"],
    banned: [],
  },
  conflicted: {
    expected: ["disagree", "conflict", "contradict", "contested", "divergent"],
    banned: ["all sources agree", "clear answer"],
    // Note: "consensus" alone is too broad — "false consensus" is actually correct behavior.
    // Only ban unqualified consensus claims.
  },
  none: {
    expected: [],
    banned: ["retrieved evidence", "according to retrieved", "knowledge base"],
  },
};

// ── Role Distinctiveness Profiles ───────────────────────────────────

const ROLE_PROFILES = {
  "product-strategist": {
    expected_signals: [
      "user value", "tradeoff", "scope", "adoption", "leverage",
      "opportunity cost", "strategic", "outcome", "positioning",
    ],
    anti_signals: [
      "CVE", "exploit", "injection", "threat model",
      "handbook structure", "navigation pattern",
      "verdict", "accept", "reject",
    ],
  },
  "security-reviewer": {
    expected_signals: [
      "vulnerability", "threat", "exploit", "attack", "risk",
      "mitigation", "access control", "injection", "auth",
      "security", "trust boundary",
    ],
    anti_signals: [
      "market share", "competitor", "pricing",
      "user value", "adoption friction",
      "handbook", "progressive disclosure",
    ],
  },
  "competitive-analyst": {
    expected_signals: [
      "competitor", "market", "differentiation", "pricing",
      "substitute", "switching cost", "moat", "disadvantage",
      "landscape", "ecosystem",
    ],
    anti_signals: [
      "CVE", "exploit", "injection",
      "handbook", "navigation",
      "verdict", "reject", "quality bar",
    ],
  },
  "docs-architect": {
    expected_signals: [
      "structure", "navigation", "hierarchy", "section",
      "handbook", "documentation", "getting started",
      "progressive disclosure", "cross-reference",
    ],
    anti_signals: [
      "CVE", "exploit", "threat model",
      "market share", "competitor", "pricing",
      "verdict", "reject",
    ],
  },
  "critic-reviewer": {
    expected_signals: [
      "verdict", "accept", "reject", "quality bar",
      "evidence", "contract", "completeness",
      "precedent", "failure pattern", "drift",
    ],
    anti_signals: [
      "market share", "competitor",
      "handbook structure",
      "exploit", "CVE",
    ],
  },
};

// ── Main Analyzer ───────────────────────────────────────────────────

/**
 * Analyze an artifact against its retrieval bundle for evidence use.
 *
 * @param {Object} options
 * @param {string} options.role_id
 * @param {string} options.task_id
 * @param {string} options.artifact_text - the role's output artifact
 * @param {Object|null} options.packet_knowledge - packet.knowledge
 * @param {string[]} [options.known_external_refs] - references not in bundle that are still valid
 * @returns {ArtifactEvidenceReport}
 */
export function analyzeArtifactEvidence({
  role_id,
  task_id,
  artifact_text,
  packet_knowledge,
  known_external_refs = [],
}) {
  const reasons = [];
  const artifactLower = artifact_text.toLowerCase();
  const status = packet_knowledge?.status ?? "none";
  const bundle = packet_knowledge?.retrieval_bundle;

  // ── Reference Checks ────────────────────────────────────────────
  const referenceChecks = [];
  let refsAvailable = 0;
  let refsUsed = 0;

  if (bundle?.selected) {
    refsAvailable = bundle.selected.length;

    for (const chunk of bundle.selected) {
      const ref = chunk.citation?.reference ?? chunk.chunk_id;
      const refLower = ref.toLowerCase();

      // Check for exact reference, partial title match, or chunk content echo
      const locations = [];
      if (artifactLower.includes(refLower)) {
        locations.push("exact-reference");
      }
      // Check for title fragment
      if (chunk.title && artifactLower.includes(chunk.title.toLowerCase())) {
        locations.push("title-match");
      }
      // Check for source ID reference
      if (artifactLower.includes(chunk.source_id.toLowerCase())) {
        locations.push("source-id");
      }
      // Check for key content phrases (first 50 chars of content)
      const contentSnippet = chunk.content.slice(0, 50).toLowerCase();
      if (contentSnippet.length > 20 && artifactLower.includes(contentSnippet)) {
        locations.push("content-echo");
      }

      const found = locations.length > 0;
      if (found) refsUsed++;

      referenceChecks.push({
        reference: ref,
        chunk_id: chunk.chunk_id,
        found_in_artifact: found,
        match_locations: locations,
      });
    }
  }

  const refsMissed = refsAvailable - refsUsed;
  const refUseRatio = refsAvailable > 0 ? refsUsed / refsAvailable : 0;

  // ── Unsupported Reference Detection ─────────────────────────────
  // Look for citation-like patterns that don't match any retrieved reference
  const citationPatterns = extractCitationPatterns(artifact_text);
  const knownRefs = new Set([
    ...(bundle?.selected?.map((c) => (c.citation?.reference ?? c.chunk_id).toLowerCase()) ?? []),
    ...(bundle?.selected?.map((c) => c.title?.toLowerCase()).filter(Boolean) ?? []),
    ...(bundle?.selected?.map((c) => c.source_id.toLowerCase()) ?? []),
    ...known_external_refs.map((r) => r.toLowerCase()),
  ]);

  const unsupportedRefs = citationPatterns.filter(
    (p) => !knownRefs.has(p.toLowerCase()) && !isGenericPhrase(p)
  );

  // ── Posture Compliance ──────────────────────────────────────────
  const postureCompliance = checkPostureCompliance(artifactLower, status);

  // ── Distinctiveness Signals ─────────────────────────────────────
  const distinctivenessSignals = checkDistinctiveness(artifactLower, role_id);

  // ── Drift Violations ────────────────────────────────────────────
  const driftViolations = checkDrift(artifactLower, role_id);

  // ── Verdict ─────────────────────────────────────────────────────
  let verdict = "pass";

  if (status !== "none" && refsAvailable > 0 && refUseRatio < 0.1) {
    verdict = "fail";
    reasons.push(`Retrieved evidence mostly unused (${refsUsed}/${refsAvailable} = ${(refUseRatio * 100).toFixed(0)}%)`);
  }

  if (unsupportedRefs.length > 2) {
    verdict = verdict === "fail" ? "fail" : "warn";
    reasons.push(`${unsupportedRefs.length} unsupported references in artifact`);
  }

  if (!postureCompliance.compliant) {
    verdict = verdict === "fail" ? "fail" : "warn";
    reasons.push(`Posture compliance failed: missing ${postureCompliance.missing_signals.join(", ")}`);
  }

  if (driftViolations.length > 0) {
    verdict = "fail";
    reasons.push(`${driftViolations.length} drift violation(s): ${driftViolations.map((d) => d.violation).join(", ")}`);
  }

  const expectedSignalsHit = distinctivenessSignals.filter((s) => s.present).length;
  const totalExpected = distinctivenessSignals.length;
  if (totalExpected > 0 && expectedSignalsHit / totalExpected < 0.3) {
    verdict = verdict === "fail" ? "fail" : "warn";
    reasons.push(`Low distinctiveness: only ${expectedSignalsHit}/${totalExpected} expected signals found`);
  }

  if (verdict === "pass") {
    reasons.push("Evidence chain intact, posture compliant, role-distinct");
  }

  return {
    role_id,
    task_id,
    knowledge_status: status,
    reference_checks: referenceChecks,
    references_available: refsAvailable,
    references_used: refsUsed,
    references_missed: refsMissed,
    unsupported_references: unsupportedRefs.length,
    reference_use_ratio: refUseRatio,
    posture_compliance: postureCompliance,
    distinctiveness_signals: distinctivenessSignals,
    drift_violations: driftViolations,
    verdict,
    reasons,
  };
}

// ── Posture Compliance Checker ──────────────────────────────────────

function checkPostureCompliance(artifactLower, status) {
  const profile = POSTURE_SIGNALS[status];
  if (!profile) {
    return { status, compliant: true, expected_signals: [], found_signals: [], missing_signals: [] };
  }

  const found = [];
  const missing = [];

  for (const signal of profile.expected) {
    if (artifactLower.includes(signal.toLowerCase())) {
      found.push(signal);
    } else {
      missing.push(signal);
    }
  }

  // For posture compliance, finding at least one expected signal is enough
  // (except "none" which has no expected signals)
  const compliant = profile.expected.length === 0 || found.length > 0;

  // Check banned phrases
  const bannedFound = [];
  for (const banned of profile.banned) {
    if (artifactLower.includes(banned.toLowerCase())) {
      bannedFound.push(banned);
    }
  }

  return {
    status,
    compliant: compliant && bannedFound.length === 0,
    expected_signals: profile.expected,
    found_signals: found,
    missing_signals: missing.length > 0 && found.length === 0 ? missing : [],
    banned_violations: bannedFound,
  };
}

// ── Distinctiveness Checker ─────────────────────────────────────────

function checkDistinctiveness(artifactLower, roleId) {
  const profile = ROLE_PROFILES[roleId];
  if (!profile) return [];

  return profile.expected_signals.map((signal) => ({
    signal,
    present: artifactLower.includes(signal.toLowerCase()),
    evidence: artifactLower.includes(signal.toLowerCase())
      ? `Contains "${signal}"`
      : undefined,
  }));
}

// ── Drift Checker ───────────────────────────────────────────────────

function checkDrift(artifactLower, roleId) {
  const profile = ROLE_PROFILES[roleId];
  if (!profile) return [];

  const violations = [];
  for (const antiSignal of profile.anti_signals) {
    if (artifactLower.includes(antiSignal.toLowerCase())) {
      violations.push({
        violation: `Contains "${antiSignal}" — outside role mandate`,
        evidence: antiSignal,
        rule: `anti_signal: ${antiSignal}`,
      });
    }
  }

  return violations;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract citation-like patterns from artifact text.
 * Looks for: [brackets], "Source: ...", "Reference: ...", "per ...", "according to ..."
 */
function extractCitationPatterns(text) {
  const patterns = [];

  // Bracketed references: [Something]
  const bracketMatches = text.match(/\[([^\]]{5,80})\]/g) ?? [];
  for (const m of bracketMatches) {
    patterns.push(m.slice(1, -1));
  }

  // "Source: X" or "Reference: X"
  const sourceMatches = text.match(/(?:source|reference|per|according to):?\s+([^\n.]{5,80})/gi) ?? [];
  for (const m of sourceMatches) {
    const cleaned = m.replace(/^(?:source|reference|per|according to):?\s+/i, "").trim();
    if (cleaned) patterns.push(cleaned);
  }

  return patterns;
}

/**
 * Filter out generic phrases that look like citations but aren't.
 */
function isGenericPhrase(text) {
  const generics = [
    "see above", "see below", "as noted", "as mentioned", "emphasis added",
    "bold mine", "note", "important", "warning", "example",
    "preferred", "authoritative", "fresh", "stale", "aging",
  ];
  const lower = text.toLowerCase();
  return generics.some((g) => lower.includes(g)) || text.length < 8;
}
