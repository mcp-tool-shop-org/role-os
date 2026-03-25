/**
 * Structured evidence for verdicts.
 *
 * A verdict is not just an opinion. It is a decision bound to explicit evidence.
 * This module defines evidence schemas, role-aware requirements, sufficiency
 * checks, and verdict-to-recovery continuity.
 */

// ── Evidence item kinds ───────────────────────────────────────────────────────

export const EVIDENCE_KINDS = [
  "spec",           // specification, requirements, scope doc
  "code",           // source code, implementation
  "test",           // test results, coverage data
  "output",         // build output, CLI output, logs
  "packet",         // another packet (upstream/downstream)
  "diff",           // code diff, before/after
  "doc",            // documentation, README, handbook
  "reasoning",      // architectural decision, tradeoff analysis
  "dependency",     // upstream dependency status
  "user-intent",    // user request, product requirement
  "measurement",    // metric, benchmark, performance data
  "review",         // prior review, verdict, feedback
];

export const EVIDENCE_STATUSES = [
  "supports",       // evidence directly supports the verdict
  "partial",        // evidence partially supports — gaps remain
  "contradicts",    // evidence contradicts the verdict (must be explained)
  "missing",        // expected evidence was not provided
];

export const VERDICT_TYPES = [
  "accept",             // work meets bar, move forward
  "accept-with-notes",  // work meets bar with documented caveats
  "reject",             // work does not meet bar, fundamental problems
  "blocked",            // cannot proceed — external dependency or ambiguity
];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"];

// ── Role-aware evidence requirements ──────────────────────────────────────────
// What evidence each reviewer role MUST provide. Derived from role contracts.

export const ROLE_EVIDENCE_REQUIREMENTS = {
  "Critic Reviewer": {
    required: ["spec", "reasoning"],
    recommended: ["test", "code", "review"],
    description: "Must cite quality bar items checked, contract compliance, and cross-contamination assessment",
  },
  "Test Engineer": {
    required: ["test", "output"],
    recommended: ["code", "measurement"],
    description: "Must cite test results (pass/fail), coverage data, and edge cases verified",
  },
  "Backend Engineer": {
    required: ["code", "test"],
    recommended: ["diff", "output", "dependency"],
    description: "Must cite changed files, test status, and API contract compliance",
  },
  "Frontend Developer": {
    required: ["code", "test"],
    recommended: ["diff", "output"],
    description: "Must cite changed components, test status, and interaction verification",
  },
  "UI Designer": {
    required: ["spec", "reasoning"],
    recommended: ["doc"],
    description: "Must cite design decisions, hierarchy rationale, and user flow justification",
  },
  "Product Strategist": {
    required: ["user-intent", "reasoning"],
    recommended: ["spec", "review"],
    description: "Must cite requirement fit, scope alignment, and tradeoff decisions",
  },
  "Security Reviewer": {
    required: ["code", "reasoning"],
    recommended: ["test", "measurement"],
    description: "Must cite patterns checked, threats assessed, and mitigations verified",
  },
  "Performance Engineer": {
    required: ["measurement", "output"],
    recommended: ["code", "diff"],
    description: "Must cite profiling results, metrics before/after, and budget compliance",
  },
  "Coverage Auditor": {
    required: ["test", "measurement"],
    recommended: ["code", "reasoning"],
    description: "Must cite coverage metrics, false confidence findings, and untested paths",
  },
  "Release Engineer": {
    required: ["output", "doc"],
    recommended: ["test", "diff"],
    description: "Must cite version, changelog, build output, and publish status",
  },
  "Deployment Verifier": {
    required: ["output", "doc"],
    recommended: ["test"],
    description: "Must cite live artifact status, badge checks, and spot-check results",
  },
  "Dependency Auditor": {
    required: ["measurement", "reasoning"],
    recommended: ["output"],
    description: "Must cite audit results, vulnerability findings, and supply-chain assessment",
  },
  "Brand Guardian": {
    required: ["reasoning", "doc"],
    recommended: ["diff"],
    description: "Must cite terminology audit, contamination findings, and identity assessment",
  },
  "Repo Researcher": {
    required: ["doc", "reasoning"],
    recommended: ["code"],
    description: "Must cite repo map, entrypoints found, build/test commands verified",
  },
  "Spec Writer": {
    required: ["spec", "reasoning"],
    recommended: ["user-intent"],
    description: "Must cite acceptance criteria, edge cases enumerated, and NFRs defined",
  },
};

// Default for roles without explicit requirements
const DEFAULT_REQUIREMENTS = {
  required: ["reasoning"],
  recommended: [],
  description: "Must provide reasoning for the verdict",
};

// ── Evidence sufficiency check ────────────────────────────────────────────────

/**
 * @typedef {Object} EvidenceItem
 * @property {string} kind - One of EVIDENCE_KINDS
 * @property {string} reference - File, path, packet ID, section
 * @property {string} claim - What this evidence supports
 * @property {string} status - One of EVIDENCE_STATUSES
 * @property {string} [notes] - Additional context
 */

/**
 * @typedef {Object} StructuredVerdict
 * @property {string} verdict - One of VERDICT_TYPES
 * @property {string} reviewerRole - Who is reviewing
 * @property {string} summary - Brief verdict summary
 * @property {EvidenceItem[]} evidence - Structured evidence items
 * @property {string[]} gaps - What's missing or weak
 * @property {string[]} risks - Identified risks
 * @property {string} [requiredNextArtifact] - What the next role must produce (for non-approve)
 * @property {string} confidence - One of CONFIDENCE_LEVELS
 */

/**
 * @typedef {Object} SufficiencyResult
 * @property {boolean} sufficient - Whether evidence meets role requirements
 * @property {string[]} missingRequired - Required evidence kinds not provided
 * @property {string[]} missingRecommended - Recommended evidence kinds not provided
 * @property {string[]} contradictions - Evidence items that contradict the verdict
 * @property {string[]} warnings - Non-blocking issues
 */

/**
 * Check whether a structured verdict has sufficient evidence for the reviewer role.
 *
 * @param {StructuredVerdict} verdict
 * @returns {SufficiencyResult}
 */
export function checkSufficiency(verdict) {
  const reqs = ROLE_EVIDENCE_REQUIREMENTS[verdict.reviewerRole] || DEFAULT_REQUIREMENTS;
  const providedKinds = new Set(verdict.evidence.map(e => e.kind));
  const warnings = [];

  // Check required evidence kinds
  const missingRequired = reqs.required.filter(kind => !providedKinds.has(kind));

  // Check recommended evidence kinds
  const missingRecommended = reqs.recommended.filter(kind => !providedKinds.has(kind));

  // Check for contradictions
  const contradictions = verdict.evidence
    .filter(e => e.status === "contradicts")
    .map(e => `${e.kind}: ${e.claim} (${e.reference})`);

  if (contradictions.length > 0 && verdict.verdict === "accept") {
    warnings.push("Verdict is 'approve' but evidence contains contradictions — review carefully");
  }

  // Check for missing evidence items on non-approve verdicts
  const missingItems = verdict.evidence.filter(e => e.status === "missing");
  if (missingItems.length > 0 && verdict.verdict === "accept") {
    warnings.push("Verdict is 'approve' but some evidence items are marked 'missing'");
  }

  // Non-approve verdicts should have gaps or requiredNextArtifact
  if (verdict.verdict !== "approve" && verdict.verdict !== "accept-with-notes") {
    if (verdict.gaps.length === 0 && !verdict.requiredNextArtifact) {
      warnings.push("Non-approve verdict should specify gaps or requiredNextArtifact for recovery");
    }
  }

  // Low confidence + approve is suspicious
  if (verdict.confidence === "low" && verdict.verdict === "accept") {
    warnings.push("Low confidence approve — consider whether evidence is actually sufficient");
  }

  const sufficient = missingRequired.length === 0 && contradictions.length === 0;

  return {
    sufficient,
    missingRequired,
    missingRecommended,
    contradictions,
    warnings,
  };
}

/**
 * Get evidence requirements for a role.
 *
 * @param {string} roleName
 * @returns {{required: string[], recommended: string[], description: string}}
 */
export function getRequirements(roleName) {
  return ROLE_EVIDENCE_REQUIREMENTS[roleName] || DEFAULT_REQUIREMENTS;
}

/**
 * Validate an evidence item's structure.
 *
 * @param {EvidenceItem} item
 * @returns {string[]} validation errors (empty = valid)
 */
export function validateEvidenceItem(item) {
  const errors = [];
  if (!item.kind || !EVIDENCE_KINDS.includes(item.kind)) {
    errors.push(`Invalid evidence kind: "${item.kind}". Valid: ${EVIDENCE_KINDS.join(", ")}`);
  }
  if (!item.reference || item.reference.trim().length === 0) {
    errors.push("Evidence item must have a reference (file, path, section, or packet ID)");
  }
  if (!item.claim || item.claim.trim().length === 0) {
    errors.push("Evidence item must have a claim (what it supports)");
  }
  if (!item.status || !EVIDENCE_STATUSES.includes(item.status)) {
    errors.push(`Invalid evidence status: "${item.status}". Valid: ${EVIDENCE_STATUSES.join(", ")}`);
  }
  return errors;
}

/**
 * Format a sufficiency result for operator display.
 *
 * @param {SufficiencyResult} result
 * @param {string} roleName
 * @returns {string}
 */
export function formatSufficiency(result, roleName) {
  const lines = [];
  const reqs = ROLE_EVIDENCE_REQUIREMENTS[roleName] || DEFAULT_REQUIREMENTS;

  if (result.sufficient) {
    lines.push(`  ✓ Evidence sufficient for ${roleName}`);
  } else {
    lines.push(`  ✗ Evidence insufficient for ${roleName}`);
  }

  if (result.missingRequired.length > 0) {
    lines.push(`    missing (required): ${result.missingRequired.join(", ")}`);
    lines.push(`    ${roleName} requirement: ${reqs.description}`);
  }

  if (result.missingRecommended.length > 0) {
    lines.push(`    missing (recommended): ${result.missingRecommended.join(", ")}`);
  }

  if (result.contradictions.length > 0) {
    lines.push(`    contradictions:`);
    for (const c of result.contradictions) {
      lines.push(`      - ${c}`);
    }
  }

  for (const w of result.warnings) {
    lines.push(`    ! ${w}`);
  }

  return lines.join("\n");
}
