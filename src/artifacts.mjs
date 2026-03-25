/**
 * Artifact Spine — Phase Q (v1.6.0)
 *
 * Every important role produces a declared artifact with a known shape.
 * Downstream roles never guess what they received.
 *
 * 1. Per-role artifact contracts (required sections, evidence, references)
 * 2. Structural validation (completeness, not semantic perfection)
 * 3. Pack-level handoff contracts (expected artifact flow between steps)
 * 4. Composite artifact ledger integration
 */

// ── Per-role artifact contracts ───────────────────────────────────────────────

/**
 * Each contract defines what a role MUST produce for its handoff to be valid.
 * Not every role needs a contract — only chain-critical roles that hand off
 * to other roles.
 */
export const ROLE_ARTIFACT_CONTRACTS = {
  "Product Strategist": {
    artifactType: "strategy-brief",
    requiredSections: ["problem-framing", "scope", "non-goals", "tradeoffs"],
    optionalSections: ["user-value", "risks", "success-criteria"],
    requiredEvidence: [],
    consumedBy: ["Spec Writer", "Orchestrator"],
    completionRule: "All 4 required sections must be present and non-empty.",
  },
  "Spec Writer": {
    artifactType: "implementation-spec",
    requiredSections: ["acceptance-criteria", "edge-cases", "interface-spec"],
    optionalSections: ["data-schema", "nfrs", "open-questions"],
    requiredEvidence: ["strategy-brief"],
    consumedBy: ["Backend Engineer", "Frontend Developer"],
    completionRule: "At least 3 acceptance criteria. Edge cases identified. Interface shape defined.",
  },
  "Backend Engineer": {
    artifactType: "change-plan",
    requiredSections: ["files-to-change", "implementation-approach", "risk-notes"],
    optionalSections: ["test-strategy", "migration-notes"],
    requiredEvidence: ["implementation-spec"],
    consumedBy: ["Test Engineer", "Critic Reviewer"],
    completionRule: "Files named. Approach described. Risks surfaced.",
  },
  "Frontend Developer": {
    artifactType: "change-plan",
    requiredSections: ["files-to-change", "implementation-approach", "risk-notes"],
    optionalSections: ["component-structure", "accessibility-notes"],
    requiredEvidence: ["implementation-spec"],
    consumedBy: ["Test Engineer", "Critic Reviewer"],
    completionRule: "Files named. Approach described. Risks surfaced.",
  },
  "Test Engineer": {
    artifactType: "test-package",
    requiredSections: ["test-plan", "test-cases", "false-confidence-assessment"],
    optionalSections: ["edge-case-coverage", "regression-defense"],
    requiredEvidence: ["change-plan"],
    consumedBy: ["Critic Reviewer"],
    completionRule: "Test plan present. At least 3 test cases. False confidence assessment honest.",
  },
  "Security Reviewer": {
    artifactType: "security-findings",
    requiredSections: ["findings", "severity-assessment", "recommendations"],
    optionalSections: ["threat-model", "exploitation-scenarios"],
    requiredEvidence: ["change-plan"],
    consumedBy: ["Backend Engineer", "Critic Reviewer"],
    completionRule: "Each finding has severity + recommendation. No finding without remediation path.",
  },
  "Coverage Auditor": {
    artifactType: "coverage-report",
    requiredSections: ["well-defended", "poorly-defended", "false-confidence", "priority-recommendations"],
    optionalSections: ["missing-defenses", "regression-vectors"],
    requiredEvidence: [],
    consumedBy: ["Test Engineer", "Critic Reviewer"],
    completionRule: "Coverage honestly assessed. False confidence identified. Priorities ranked.",
  },
  "Docs Architect": {
    artifactType: "doc-map",
    requiredSections: ["page-structure", "content-gaps", "navigation-design"],
    optionalSections: ["getting-started-flow", "search-requirements"],
    requiredEvidence: [],
    consumedBy: ["Metadata Curator", "Release Engineer"],
    completionRule: "Pages listed. Gaps identified. Navigation designed.",
  },
  "Launch Strategist": {
    artifactType: "launch-brief",
    requiredSections: ["launch-sequence", "proof-packaging", "channel-selection", "success-criteria"],
    optionalSections: ["risk-assessment", "what-not-to-say"],
    requiredEvidence: [],
    consumedBy: ["Launch Copywriter"],
    completionRule: "Sequence defined. Proof mapped. Channels selected. Success measurable.",
  },
  "Launch Copywriter": {
    artifactType: "copy-package",
    requiredSections: ["release-notes", "short-announcement"],
    optionalSections: ["npm-description", "social-variants", "messaging-angle"],
    requiredEvidence: ["launch-brief"],
    consumedBy: ["Critic Reviewer"],
    completionRule: "Release notes present. At least one announcement variant.",
  },
  "Repo Researcher": {
    artifactType: "repo-map",
    requiredSections: ["entrypoints", "module-map", "build-test-commands"],
    optionalSections: ["seams", "dependencies"],
    requiredEvidence: [],
    consumedBy: ["Backend Engineer", "Coverage Auditor", "Security Reviewer"],
    completionRule: "Entrypoints listed. Module responsibilities described. Commands documented.",
  },
  "Metadata Curator": {
    artifactType: "metadata-audit",
    requiredSections: ["manifest-audit", "registry-alignment"],
    optionalSections: ["badge-verification", "discovery-surface", "recommendations"],
    requiredEvidence: [],
    consumedBy: ["Release Engineer"],
    completionRule: "Package.json audited. Registry alignment checked.",
  },
  "Release Engineer": {
    artifactType: "release-plan",
    requiredSections: ["version-decision", "changelog-draft", "pre-publish-checklist"],
    optionalSections: ["packaging-check", "release-steps"],
    requiredEvidence: [],
    consumedBy: ["Deployment Verifier", "Critic Reviewer"],
    completionRule: "Version decided with rationale. Changelog written. Checklist present.",
  },
  "Deployment Verifier": {
    artifactType: "deployment-report",
    requiredSections: ["live-state-assessment"],
    optionalSections: ["npm-verification", "github-verification", "badge-verification", "translation-check"],
    requiredEvidence: [],
    consumedBy: ["Critic Reviewer"],
    completionRule: "All deployed surfaces checked. Stale/mismatched items named.",
  },
  "Critic Reviewer": {
    artifactType: "verdict",
    requiredSections: ["verdict", "evidence", "required-corrections"],
    optionalSections: ["notes", "next-owner", "chain-assessment"],
    requiredEvidence: [],
    consumedBy: [],
    completionRule: "Verdict stated. Evidence cited. Corrections listed if not accept.",
  },
  "UX Researcher": {
    artifactType: "ux-evaluation",
    requiredSections: ["friction-inventory", "severity-ranking", "recommendations"],
    optionalSections: ["flow-analysis", "heuristic-evaluation"],
    requiredEvidence: [],
    consumedBy: ["Product Strategist", "UI Designer"],
    completionRule: "Friction points identified. Severity ranked. Evidence-based recommendations.",
  },
  "Competitive Analyst": {
    artifactType: "landscape-analysis",
    requiredSections: ["competitor-inventory", "differentiation", "honest-disadvantages"],
    optionalSections: ["positioning-gaps", "recommendations"],
    requiredEvidence: [],
    consumedBy: ["Product Strategist"],
    completionRule: "Competitors listed. Differentiation clear. Disadvantages honest.",
  },
  "Feedback Synthesizer": {
    artifactType: "signal-synthesis",
    requiredSections: ["theme-extraction", "theme-ranking", "confidence-assessment"],
    optionalSections: ["contradictions", "complaint-to-action"],
    requiredEvidence: [],
    consumedBy: ["Product Strategist"],
    completionRule: "Themes extracted. Ranking justified. Confidence assessed.",
  },
  "Refactor Engineer": {
    artifactType: "refactor-plan",
    requiredSections: ["structural-assessment", "module-boundaries", "migration-path"],
    optionalSections: ["duplication-inventory", "proposed-structure"],
    requiredEvidence: [],
    consumedBy: ["Test Engineer", "Critic Reviewer"],
    completionRule: "Current structure assessed. Target boundaries defined. Migration preserves tests.",
  },
  "Support Triage Lead": {
    artifactType: "triage-report",
    requiredSections: ["classification", "priority-assignment", "routing"],
    optionalSections: ["recurring-patterns", "systemic-recommendations"],
    requiredEvidence: [],
    consumedBy: ["Feedback Synthesizer", "Docs Architect"],
    completionRule: "Each item classified. Priority assigned. Route to owner named.",
  },
};

// ── Artifact validation ───────────────────────────────────────────────────────

/**
 * Validate an artifact against its role contract.
 * Checks structural completeness, not semantic quality.
 *
 * @param {string} roleName
 * @param {string} artifactContent - The artifact text
 * @returns {{ valid: boolean, missing: string[], warnings: string[], contract: object|null }}
 */
export function validateArtifact(roleName, artifactContent) {
  const contract = ROLE_ARTIFACT_CONTRACTS[roleName];
  if (!contract) {
    return { valid: true, missing: [], warnings: ["No artifact contract defined for this role."], contract: null };
  }

  const lower = artifactContent.toLowerCase();
  const missing = [];
  const warnings = [];

  // Check required sections
  for (const section of contract.requiredSections) {
    // Look for the section as a heading or key phrase
    const patterns = [
      section.toLowerCase(),
      section.replace(/-/g, " ").toLowerCase(),
      `## ${section.replace(/-/g, " ")}`.toLowerCase(),
      `### ${section.replace(/-/g, " ")}`.toLowerCase(),
    ];
    const found = patterns.some(p => lower.includes(p));
    if (!found) {
      missing.push(section);
    }
  }

  // Check required evidence references
  for (const evidence of contract.requiredEvidence) {
    const patterns = [
      evidence.toLowerCase(),
      evidence.replace(/-/g, " ").toLowerCase(),
    ];
    const found = patterns.some(p => lower.includes(p));
    if (!found) {
      warnings.push(`Expected reference to "${evidence}" from upstream role.`);
    }
  }

  // Check minimum content length (not just headers)
  const contentLines = artifactContent.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (contentLines.length < 5) {
    warnings.push("Artifact appears thin — fewer than 5 content lines.");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    contract,
  };
}

// ── Pack-level handoff contracts ──────────────────────────────────────────────

/**
 * Defines the expected artifact flow for each pack.
 * Each step produces an artifact that the next step consumes.
 */
export const PACK_HANDOFF_CONTRACTS = {
  feature: {
    flow: [
      { role: "Product Strategist", produces: "strategy-brief", consumedBy: "Spec Writer" },
      { role: "Spec Writer", produces: "implementation-spec", consumedBy: "Backend Engineer" },
      { role: "Backend Engineer", produces: "change-plan", consumedBy: "Test Engineer" },
      { role: "Test Engineer", produces: "test-package", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  bugfix: {
    flow: [
      { role: "Repo Researcher", produces: "repo-map", consumedBy: "Backend Engineer" },
      { role: "Backend Engineer", produces: "change-plan", consumedBy: "Test Engineer" },
      { role: "Test Engineer", produces: "test-package", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  security: {
    flow: [
      { role: "Security Reviewer", produces: "security-findings", consumedBy: "Critic Reviewer" },
      { role: "Dependency Auditor", produces: "metadata-audit", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  docs: {
    flow: [
      { role: "Support Triage Lead", produces: "triage-report", consumedBy: "Feedback Synthesizer" },
      { role: "Feedback Synthesizer", produces: "signal-synthesis", consumedBy: "Docs Architect" },
      { role: "Docs Architect", produces: "doc-map", consumedBy: "Metadata Curator" },
      { role: "Metadata Curator", produces: "metadata-audit", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  launch: {
    flow: [
      { role: "Launch Strategist", produces: "launch-brief", consumedBy: "Launch Copywriter" },
      { role: "Launch Copywriter", produces: "copy-package", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  research: {
    flow: [
      { role: "Product Strategist", produces: "strategy-brief", consumedBy: "UX Researcher" },
      { role: "UX Researcher", produces: "ux-evaluation", consumedBy: "Competitive Analyst" },
      { role: "Competitive Analyst", produces: "landscape-analysis", consumedBy: "Feedback Synthesizer" },
      { role: "Feedback Synthesizer", produces: "signal-synthesis", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
  treatment: {
    flow: [
      { role: "Repo Researcher", produces: "repo-map", consumedBy: "Security Reviewer" },
      { role: "Security Reviewer", produces: "security-findings", consumedBy: "Coverage Auditor" },
      { role: "Coverage Auditor", produces: "coverage-report", consumedBy: "Docs Architect" },
      { role: "Docs Architect", produces: "doc-map", consumedBy: "Metadata Curator" },
      { role: "Metadata Curator", produces: "metadata-audit", consumedBy: "Release Engineer" },
      { role: "Release Engineer", produces: "release-plan", consumedBy: "Deployment Verifier" },
      { role: "Deployment Verifier", produces: "deployment-report", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "verdict", consumedBy: null },
    ],
  },
};

/**
 * Validate a pack's artifact chain — check that each step's output
 * matches what the next step expects.
 *
 * @param {string} packName
 * @param {Record<string, string>} artifacts - Map of role name → artifact content
 * @returns {{ valid: boolean, steps: object[] }}
 */
export function validatePackChain(packName, artifacts) {
  const contract = PACK_HANDOFF_CONTRACTS[packName];
  if (!contract) {
    return { valid: false, steps: [{ role: "unknown", status: "error", detail: `No handoff contract for pack "${packName}"` }] };
  }

  const steps = [];
  let chainValid = true;

  for (const step of contract.flow) {
    const content = artifacts[step.role];
    if (!content) {
      steps.push({
        role: step.role,
        produces: step.produces,
        status: "missing",
        detail: `No artifact from ${step.role}.`,
      });
      chainValid = false;
      continue;
    }

    const validation = validateArtifact(step.role, content);
    steps.push({
      role: step.role,
      produces: step.produces,
      status: validation.valid ? "valid" : "incomplete",
      missing: validation.missing,
      warnings: validation.warnings,
      detail: validation.valid
        ? `${step.produces} is structurally complete.`
        : `Missing sections: ${validation.missing.join(", ")}`,
    });

    if (!validation.valid) chainValid = false;
  }

  return { valid: chainValid, steps };
}

/**
 * Get the artifact contract for a specific role.
 *
 * @param {string} roleName
 * @returns {object|null}
 */
export function getArtifactContract(roleName) {
  return ROLE_ARTIFACT_CONTRACTS[roleName] || null;
}

/**
 * Get the handoff contract for a specific pack.
 *
 * @param {string} packName
 * @returns {object|null}
 */
export function getHandoffContract(packName) {
  return PACK_HANDOFF_CONTRACTS[packName] || null;
}

/**
 * Format artifact validation result for display.
 *
 * @param {string} roleName
 * @param {object} validation
 * @returns {string}
 */
export function formatArtifactValidation(roleName, validation) {
  const lines = [`Artifact validation — ${roleName}`];

  if (validation.valid) {
    lines.push(`  ✓ Structurally complete`);
  } else {
    lines.push(`  ✗ Incomplete — missing: ${validation.missing.join(", ")}`);
  }

  if (validation.warnings.length > 0) {
    for (const w of validation.warnings) {
      lines.push(`  ! ${w}`);
    }
  }

  if (validation.contract) {
    lines.push(`  Contract: ${validation.contract.artifactType}`);
    lines.push(`  Consumed by: ${validation.contract.consumedBy.join(", ") || "terminal"}`);
  }

  return lines.join("\n");
}

/**
 * Format pack chain validation for display.
 *
 * @param {string} packName
 * @param {object} chainValidation
 * @returns {string}
 */
export function formatPackChain(packName, chainValidation) {
  const lines = [
    `\nPack Chain Validation — ${packName}`,
    `─────────────────────────────────`,
  ];

  for (const step of chainValidation.steps) {
    const icon = step.status === "valid" ? "✓" : step.status === "missing" ? "○" : "!";
    lines.push(`  ${icon} ${step.role} → ${step.produces}: ${step.detail}`);
  }

  lines.push(``);
  lines.push(chainValidation.valid
    ? `Chain valid — all artifacts structurally complete.`
    : `Chain incomplete — see above for missing artifacts.`
  );

  return lines.join("\n");
}
