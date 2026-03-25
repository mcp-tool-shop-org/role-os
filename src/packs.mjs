/**
 * Proven Team Packs.
 *
 * Battle-tested role combinations for common task families.
 * Each pack was proven through execution trials (G1–G10).
 * Packs outperform raw routing on their task family by starting
 * from a validated lineup instead of building from scratch.
 *
 * Usage: `roleos route --pack feature` or auto-detected from packet content.
 */

// ── Pack definitions ──────────────────────────────────────────────────────────

export const TEAM_PACKS = {
  // ── Feature Build ─────────────────────────────────────────────────────────
  feature: {
    name: "Feature Build",
    description: "Full feature delivery: scope → spec → implement → test → review",
    roles: [
      "Orchestrator",
      "Product Strategist",
      "Spec Writer",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    optionalRoles: ["UI Designer", "Frontend Developer", "Security Reviewer"],
    chainOrder: "Product Strategist → Spec Writer → Backend Engineer → Test Engineer",
    requiredArtifacts: ["scope doc", "spec", "implementation", "test results", "verdict"],
    stopConditions: [
      "Spec Writer finds scope ambiguity → escalate to Product Strategist",
      "Test Engineer finds untestable spec → escalate to Spec Writer",
      "Critic rejects → loop back to responsible role",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 30, maxBudgetUsd: 5.0 },
    trialEvidence: "G1 (Product), G2 (Engineering) — 6/6 gold-task passes",
  },

  // ── Bugfix / Repair ───────────────────────────────────────────────────────
  bugfix: {
    name: "Bugfix / Repair",
    description: "Diagnose → fix → verify → review. Minimal chain, fast turnaround.",
    roles: [
      "Orchestrator",
      "Repo Researcher",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    optionalRoles: ["Frontend Developer", "Performance Engineer"],
    chainOrder: "Repo Researcher → Backend Engineer → Test Engineer",
    requiredArtifacts: ["repo map / diagnosis", "fix implementation", "regression tests", "verdict"],
    stopConditions: [
      "Repo Researcher cannot reproduce → escalate to Orchestrator",
      "Fix introduces new failures → loop back to Backend Engineer",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "G2 (Engineering), G7 (Repo Researcher) — roles proven",
  },

  // ── Security Review ───────────────────────────────────────────────────────
  security: {
    name: "Security Review",
    description: "Threat model → code review → dependency audit → verdict",
    roles: [
      "Orchestrator",
      "Security Reviewer",
      "Dependency Auditor",
      "Critic Reviewer",
    ],
    optionalRoles: ["Backend Engineer", "Test Engineer"],
    chainOrder: "Security Reviewer → Dependency Auditor",
    requiredArtifacts: ["threat model", "code review findings", "dependency audit", "verdict"],
    stopConditions: [
      "Critical vulnerability found → immediate escalation to Orchestrator",
      "Dependency with known CVE → flag for Engineering",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G6 (Security Reviewer, Dependency Auditor) — 2/2 gold-task passes",
  },

  // ── Docs / Handbook / Release ─────────────────────────────────────────────
  docs: {
    name: "Docs / Handbook / Release",
    description: "Structure → write → metadata → release → verify deployment",
    roles: [
      "Orchestrator",
      "Docs Architect",
      "Metadata Curator",
      "Release Engineer",
      "Deployment Verifier",
      "Critic Reviewer",
    ],
    optionalRoles: ["Repo Translator", "Brand Guardian"],
    chainOrder: "Docs Architect → Metadata Curator → Release Engineer → Deployment Verifier",
    requiredArtifacts: ["docs structure", "metadata audit", "release package", "deployment verification", "verdict"],
    stopConditions: [
      "Docs Architect finds product direction unclear → escalate to Product Strategist",
      "Deployment Verifier finds broken artifacts → loop back to Release Engineer",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G4 (Docs Architect), G7 (Treatment cluster) — 5/5 gold-task passes",
  },

  // ── Launch / Messaging ────────────────────────────────────────────────────
  launch: {
    name: "Launch / Messaging",
    description: "Plan launch → write copy → content strategy. Hard pipeline: Strategist → Copywriter.",
    roles: [
      "Orchestrator",
      "Launch Strategist",
      "Launch Copywriter",
      "Critic Reviewer",
    ],
    optionalRoles: ["Content Strategist", "Community Manager"],
    chainOrder: "Launch Strategist → Launch Copywriter",
    requiredArtifacts: ["launch plan", "release copy", "verdict"],
    stopConditions: [
      "Launch Strategist finds no proof assets → delay launch",
      "Launch Copywriter finds product claims unverifiable → escalate to Product Strategist",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "G3 (Launch Strategist, Launch Copywriter) — 2/2 gold-task passes, pipeline proven",
  },

  // ── Research / Strategy ───────────────────────────────────────────────────
  research: {
    name: "Research / Strategy",
    description: "UX research → competitive analysis → trend assessment → user synthesis → product strategy",
    roles: [
      "Orchestrator",
      "UX Researcher",
      "Competitive Analyst",
      "Feedback Synthesizer",
      "Product Strategist",
      "Critic Reviewer",
    ],
    optionalRoles: ["Trend Researcher", "User Interview Synthesizer"],
    chainOrder: "UX Researcher → Competitive Analyst → Feedback Synthesizer → Product Strategist",
    requiredArtifacts: ["friction inventory", "competitive landscape", "signal synthesis", "product recommendations", "verdict"],
    stopConditions: [
      "UX Researcher finds insufficient user data → escalate to Orchestrator",
      "Competitive Analyst finds no comparable products → narrow scope",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G8 (Research cluster), G9 (Growth/Product) — 8/8 gold-task passes",
  },

  // ── Treatment (repo polish) ───────────────────────────────────────────────
  treatment: {
    name: "Treatment (Repo Polish)",
    description: "Full repo treatment: research → audit → docs → metadata → release → deploy → verify",
    roles: [
      "Orchestrator",
      "Repo Researcher",
      "Coverage Auditor",
      "Docs Architect",
      "Metadata Curator",
      "Release Engineer",
      "Deployment Verifier",
      "Critic Reviewer",
    ],
    optionalRoles: ["Brand Guardian", "Repo Translator", "Security Reviewer"],
    chainOrder: "Repo Researcher → Coverage Auditor → Docs Architect → Metadata Curator → Release Engineer → Deployment Verifier",
    requiredArtifacts: ["repo map", "coverage audit", "docs", "metadata audit", "release", "deployment verification", "verdict"],
    stopConditions: [
      "Coverage Auditor finds false confidence → flag for Test Engineer",
      "Deployment Verifier finds broken live artifacts → loop back to Release Engineer",
    ],
    escalationOwner: "Orchestrator",
    dispatchDefaults: { model: "sonnet", maxTurns: 30, maxBudgetUsd: 5.0 },
    trialEvidence: "G6 (Coverage Auditor), G7 (Treatment cluster) — roles proven across multiple trials",
  },
};

// ── Pack selection ────────────────────────────────────────────────────────────

const PACK_KEYWORDS = {
  feature:   ["feature", "build", "implement", "new", "add", "create"],
  bugfix:    ["bug", "fix", "repair", "broken", "crash", "error", "regression"],
  security:  ["security", "threat", "vulnerability", "audit", "owasp", "cve"],
  docs:      ["docs", "documentation", "handbook", "release", "publish", "changelog"],
  launch:    ["launch", "announce", "release notes", "messaging", "go-to-market"],
  research:  ["research", "competitive", "ux", "friction", "user", "strategy", "trend"],
  treatment: ["treatment", "polish", "cleanup", "repo audit", "shipcheck", "full treatment"],
};

/**
 * Suggest the best pack for a packet based on content analysis.
 *
 * @param {string} content - Packet markdown content
 * @returns {{ pack: string, confidence: string, scores: Record<string, number> } | null}
 */
export function suggestPack(content) {
  const lower = content.toLowerCase();
  const scores = {};

  for (const [packName, keywords] of Object.entries(PACK_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[packName] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;

  const [topPack, topScore] = sorted[0];
  const confidence = topScore >= 3 ? "high" : topScore >= 2 ? "medium" : "low";

  return { pack: topPack, confidence, scores };
}

/**
 * Get a pack by name.
 *
 * @param {string} name
 * @returns {object | null}
 */
export function getPack(name) {
  return TEAM_PACKS[name] || null;
}

/**
 * List all available packs.
 *
 * @returns {Array<{name: string, description: string, roleCount: number}>}
 */
export function listPacks() {
  return Object.entries(TEAM_PACKS).map(([key, pack]) => ({
    key,
    name: pack.name,
    description: pack.description,
    roleCount: pack.roles.length,
    optionalCount: pack.optionalRoles.length,
  }));
}
