/**
 * Proven Team Packs — Calibrated.
 *
 * Battle-tested role combinations for common task families.
 * Each pack was proven through execution trials (G1–G10) and
 * calibrated by pack comparison trials (PACK-COMPARISON.md).
 *
 * Calibration findings applied:
 * - Orchestrator is conditional (only when task is multi-role + ambiguous)
 * - Every pack has mismatch detection + alternative suggestion
 * - Treatment includes Security Reviewer by default
 * - Research opens with Product Strategist (framing before research)
 * - Docs has upstream-synthesis gate
 *
 * Usage: `roleos route --pack feature` or auto-detected from packet content.
 */

// ── Mismatch detection ────────────────────────────────────────────────────────
// Each pack declares what it is NOT for, and which pack IS right.

/**
 * @typedef {Object} MismatchGuard
 * @property {string[]} notForSignals - Content patterns that indicate this pack is wrong
 * @property {string} suggestInstead - Which pack to suggest instead
 * @property {string} reason - Why this pack is wrong for that signal
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
    orchestratorRequired: true, // multi-role, cross-functional — Orchestrator adds value
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
    trialEvidence: "G1 (Product), G2 (Engineering) — 6/6 gold-task passes. Pack comparison: wins vs free routing.",
    mismatchGuards: [
      { notForSignals: ["security review", "threat model", "vulnerability", "injection"], suggestInstead: "security", reason: "This is a security review, not a feature build" },
      { notForSignals: ["launch", "announce", "release notes", "messaging"], suggestInstead: "launch", reason: "This is launch/messaging work, not feature implementation" },
      { notForSignals: ["bug", "fix", "crash", "broken", "regression"], suggestInstead: "bugfix", reason: "This is a bug to fix, not a feature to build" },
      { notForSignals: ["handbook", "documentation", "restructure docs"], suggestInstead: "docs", reason: "This is docs work, not feature implementation" },
      { notForSignals: ["research", "should we", "competitive", "trend"], suggestInstead: "research", reason: "This is a research/strategy question, not a feature build" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "full treatment", "polish"], suggestInstead: "treatment", reason: "This is repo treatment work, not feature implementation" },
    ],
  },

  // ── Bugfix / Repair ───────────────────────────────────────────────────────
  bugfix: {
    name: "Bugfix / Repair",
    description: "Diagnose → fix → verify → review. Minimal chain, fast turnaround.",
    roles: [
      "Repo Researcher",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    orchestratorRequired: false,
    optionalRoles: ["Frontend Developer", "Performance Engineer"],
    chainOrder: "Repo Researcher → Backend Engineer → Test Engineer",
    requiredArtifacts: ["repo map / diagnosis", "fix implementation", "regression tests", "verdict"],
    stopConditions: [
      "Repo Researcher cannot reproduce → escalate to user",
      "Fix introduces new failures → loop back to Backend Engineer",
    ],
    escalationOwner: "Critic Reviewer",
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "G2 (Engineering), G7 (Repo Researcher), I-2 (shipped real fix).",
    mismatchGuards: [
      { notForSignals: ["launch", "announce", "release notes", "messaging"], suggestInstead: "launch", reason: "This is launch work, not a bugfix" },
      { notForSignals: ["research", "should we", "tradeoff", "strategy"], suggestInstead: "research", reason: "This is a research/strategy question, not a bug to fix" },
      { notForSignals: ["feature", "new command", "add", "create", "implement"], suggestInstead: "feature", reason: "This is a new feature, not a bug to fix" },
      { notForSignals: ["handbook", "documentation", "restructure docs", "starlight"], suggestInstead: "docs", reason: "This is docs work, not a bugfix" },
      { notForSignals: ["security review", "threat model", "vulnerability"], suggestInstead: "security", reason: "This is a security review, not a bugfix" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "polish"], suggestInstead: "treatment", reason: "This is repo treatment, not a bugfix" },
    ],
  },

  // ── Security Review ───────────────────────────────────────────────────────
  security: {
    name: "Security Review",
    description: "Threat model → code review → dependency audit → verdict",
    roles: [
      "Security Reviewer",
      "Dependency Auditor",
      "Critic Reviewer",
    ],
    orchestratorRequired: false, // single-domain, clear scope
    optionalRoles: ["Backend Engineer", "Test Engineer"],
    chainOrder: "Security Reviewer → Dependency Auditor",
    requiredArtifacts: ["threat model", "code review findings", "dependency audit", "verdict"],
    stopConditions: [
      "Critical vulnerability found → immediate escalation to user",
      "Dependency with known CVE → flag for Engineering",
    ],
    escalationOwner: "Security Reviewer",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G6 (Security Reviewer, Dependency Auditor) — 2/2 gold-task passes. I-3 Critic found 3 gaps prior roles missed.",
    mismatchGuards: [
      { notForSignals: ["documentation", "handbook", "restructure", "navigation"], suggestInstead: "docs", reason: "This is docs/structure work, not a security review" },
      { notForSignals: ["feature", "implement", "build", "add command"], suggestInstead: "feature", reason: "This is feature work, not a security review" },
      { notForSignals: ["bug", "fix", "crash", "broken", "regression"], suggestInstead: "bugfix", reason: "This is a bug to fix, not a security review" },
      { notForSignals: ["launch", "announce", "release notes", "messaging"], suggestInstead: "launch", reason: "This is launch work, not a security review" },
      { notForSignals: ["research", "should we", "competitive", "strategy"], suggestInstead: "research", reason: "This is a research question, not a security review" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "polish"], suggestInstead: "treatment", reason: "This is repo treatment, not a security review" },
    ],
  },

  // ── Docs / Handbook ─────────────────────────────────────────────────
  docs: {
    name: "Docs / Handbook",
    description: "Triage → synthesize → structure → write → metadata → review",
    roles: [
      "Support Triage Lead",   // interpret raw input (triage reports, issue lists, feedback)
      "Feedback Synthesizer",  // cluster and theme the interpreted input
      "Docs Architect",        // structure and write the docs
      "Metadata Curator",      // verify metadata alignment
      "Critic Reviewer",
    ],
    orchestratorRequired: false,
    optionalRoles: ["Repo Translator", "Brand Guardian", "Release Engineer", "Deployment Verifier"],
    chainOrder: "Support Triage Lead → Feedback Synthesizer → Docs Architect → Metadata Curator",
    requiredArtifacts: ["classified input", "synthesized themes", "docs structure", "metadata audit", "verdict"],
    stopConditions: [
      "Support Triage Lead finds input data ambiguous → request clarification",
      "Feedback Synthesizer finds insufficient signal → escalate to user",
      "Docs Architect finds product direction unclear → escalate to Product Strategist",
    ],
    escalationOwner: "Docs Architect",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G4 (Docs Architect), G7 (Treatment), I-4 (shipped page). Calibrated: Support Triage Lead + Feedback Synthesizer upstream. Release/Deploy moved to optional (overhead for docs-only tasks).",
    mismatchGuards: [
      { notForSignals: ["research", "should we", "competitive", "strategy"], suggestInstead: "research", reason: "This is a research/strategy question — decide before documenting" },
      { notForSignals: ["security review", "threat", "vulnerability", "injection"], suggestInstead: "security", reason: "This is a security review, not docs work" },
      { notForSignals: ["feature", "implement", "build", "add command"], suggestInstead: "feature", reason: "This is feature work, not docs" },
      { notForSignals: ["bug", "fix", "crash", "broken"], suggestInstead: "bugfix", reason: "This is a bugfix, not docs work" },
      { notForSignals: ["launch", "announce", "go-to-market", "messaging"], suggestInstead: "launch", reason: "This is launch work, not docs" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "full treatment"], suggestInstead: "treatment", reason: "This is repo treatment, not docs only" },
    ],
  },

  // ── Launch / Messaging ────────────────────────────────────────────────────
  launch: {
    name: "Launch / Messaging",
    description: "Plan launch → write copy. Hard pipeline: Strategist → Copywriter.",
    roles: [
      "Launch Strategist",
      "Launch Copywriter",
      "Critic Reviewer",
    ],
    orchestratorRequired: false, // smallest pack, hard pipeline, no decomposition needed
    optionalRoles: ["Content Strategist", "Community Manager"],
    chainOrder: "Launch Strategist → Launch Copywriter",
    requiredArtifacts: ["launch plan", "release copy", "verdict"],
    stopConditions: [
      "Launch Strategist finds no proof assets → delay launch",
      "Launch Copywriter finds product claims unverifiable → escalate to Product Strategist",
    ],
    escalationOwner: "Launch Strategist",
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "G3 (pipeline proven), I-5 (v1.1.0 launch, Accept). Pack comparison: tie/marginal win. TRUE DEFAULT.",
    mismatchGuards: [
      { notForSignals: ["bug", "fix", "crash", "broken", "error"], suggestInstead: "bugfix", reason: "This is a bug to fix, not a launch to plan" },
      { notForSignals: ["implement", "build", "add command", "new feature"], suggestInstead: "feature", reason: "This is feature work — build first, launch second" },
      { notForSignals: ["security review", "threat", "vulnerability", "injection"], suggestInstead: "security", reason: "This is a security review, not launch work" },
      { notForSignals: ["handbook", "documentation", "restructure docs"], suggestInstead: "docs", reason: "This is docs work, not launch messaging" },
      { notForSignals: ["research", "should we", "competitive", "trend"], suggestInstead: "research", reason: "This is research, not launch messaging" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "polish"], suggestInstead: "treatment", reason: "This is repo treatment, not launch" },
    ],
  },

  // ── Research / Strategy ───────────────────────────────────────────────────
  research: {
    name: "Research / Strategy",
    description: "Frame decision → gather evidence → synthesize → recommend",
    roles: [
      "Product Strategist",   // REORDERED: framing first, then research
      "UX Researcher",
      "Competitive Analyst",
      "Feedback Synthesizer",
      "Critic Reviewer",
    ],
    orchestratorRequired: false, // clear pipeline, Product Strategist frames
    optionalRoles: ["Trend Researcher", "User Interview Synthesizer"],
    chainOrder: "Product Strategist → UX Researcher → Competitive Analyst → Feedback Synthesizer",
    requiredArtifacts: ["decision frame", "friction inventory", "competitive landscape", "signal synthesis", "verdict"],
    stopConditions: [
      "Product Strategist finds the question too vague → request clarification",
      "UX Researcher finds insufficient user data → escalate to Product Strategist",
      "Competitive Analyst finds no comparable products → narrow scope",
    ],
    escalationOwner: "Product Strategist",
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G8 (Research cluster), G9 (Growth/Product), I-6 (game dev decision). Calibrated: Product Strategist now opens (framing before research).",
    mismatchGuards: [
      { notForSignals: ["implement", "build", "add command", "write code"], suggestInstead: "feature", reason: "This is implementation work, not research" },
      { notForSignals: ["bug", "fix", "crash", "broken"], suggestInstead: "bugfix", reason: "This is a bugfix, not a research question" },
      { notForSignals: ["security review", "threat", "vulnerability", "injection"], suggestInstead: "security", reason: "This is a security review, not research" },
      { notForSignals: ["handbook", "documentation", "restructure docs"], suggestInstead: "docs", reason: "This is docs work, not research" },
      { notForSignals: ["launch", "announce", "release notes", "messaging"], suggestInstead: "launch", reason: "This is launch work, not research" },
      { notForSignals: ["treatment", "repo audit", "shipcheck", "polish"], suggestInstead: "treatment", reason: "This is repo treatment, not research" },
    ],
  },

  // ── Treatment (repo polish) ───────────────────────────────────────────────
  treatment: {
    name: "Treatment (Repo Polish)",
    description: "Full repo treatment: research → security → audit → docs → metadata → release → deploy → verify",
    roles: [
      "Repo Researcher",
      "Security Reviewer",      // ADDED: was optional, now default (pack comparison finding)
      "Coverage Auditor",
      "Docs Architect",
      "Metadata Curator",
      "Release Engineer",
      "Deployment Verifier",
      "Critic Reviewer",
    ],
    orchestratorRequired: false, // long but sequential — each role has a clear handoff
    optionalRoles: ["Brand Guardian", "Repo Translator", "Dependency Auditor"],
    chainOrder: "Repo Researcher → Security Reviewer → Coverage Auditor → Docs Architect → Metadata Curator → Release Engineer → Deployment Verifier",
    requiredArtifacts: ["repo map", "security findings", "coverage audit", "docs", "metadata audit", "release", "deployment verification", "verdict"],
    stopConditions: [
      "Security Reviewer finds critical vulnerability → block release until resolved",
      "Coverage Auditor finds false confidence → flag for Test Engineer",
      "Deployment Verifier finds broken live artifacts → loop back to Release Engineer",
    ],
    escalationOwner: "Repo Researcher",
    dispatchDefaults: { model: "sonnet", maxTurns: 30, maxBudgetUsd: 5.0 },
    trialEvidence: "G6-G7 (roles proven), I-7 (full chain, Accept-with-notes). Calibrated: Security Reviewer now default (was optional — pack comparison loss).",
    mismatchGuards: [
      { notForSignals: ["launch", "announce", "release notes", "social", "messaging"], suggestInstead: "launch", reason: "This is launch/messaging work — Treatment audits repos, it doesn't write announcements" },
      { notForSignals: ["research", "should we", "competitive", "strategy"], suggestInstead: "research", reason: "This is a research/strategy question, not a repo treatment" },
      { notForSignals: ["feature", "new command", "implement", "add", "create"], suggestInstead: "feature", reason: "This is feature work, not repo treatment" },
      { notForSignals: ["bug", "fix", "crash", "broken"], suggestInstead: "bugfix", reason: "This is a bugfix, not a full treatment" },
      { notForSignals: ["security review", "threat model", "injection"], suggestInstead: "security", reason: "This is a security review — treatment includes security but this task is security-only" },
      { notForSignals: ["handbook", "documentation", "restructure docs"], suggestInstead: "docs", reason: "This is docs-only work, not a full treatment" },
    ],
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
 * Check if a pack is a mismatch for the given content.
 * Returns null if no mismatch, or the suggested alternative if mismatch detected.
 *
 * @param {string} packName
 * @param {string} content - Packet content
 * @returns {{ suggestInstead: string, reason: string } | null}
 */
export function checkPackMismatch(packName, content) {
  const pack = TEAM_PACKS[packName];
  if (!pack || !pack.mismatchGuards) return null;

  const lower = content.toLowerCase();
  for (const guard of pack.mismatchGuards) {
    const triggered = guard.notForSignals.some(signal => lower.includes(signal));
    if (triggered) {
      return { suggestInstead: guard.suggestInstead, reason: guard.reason };
    }
  }
  return null;
}

/**
 * Get a pack's effective roles (with conditional Orchestrator).
 *
 * @param {string} packName
 * @param {boolean} [forceOrchestrator=false]
 * @returns {string[] | null}
 */
export function getPackRoles(packName, forceOrchestrator = false) {
  const pack = TEAM_PACKS[packName];
  if (!pack) return null;

  const roles = [...pack.roles];
  // Add Orchestrator only if the pack requires it or forced
  if ((pack.orchestratorRequired || forceOrchestrator) && !roles.includes("Orchestrator")) {
    roles.unshift("Orchestrator");
  }
  // Remove Orchestrator if pack doesn't require it and not forced
  if (!pack.orchestratorRequired && !forceOrchestrator && roles[0] === "Orchestrator") {
    roles.shift();
  }
  return roles;
}

/**
 * Get a pack by name.
 */
export function getPack(name) {
  return TEAM_PACKS[name] || null;
}

/**
 * List all available packs.
 */
export function listPacks() {
  return Object.entries(TEAM_PACKS).map(([key, pack]) => ({
    key,
    name: pack.name,
    description: pack.description,
    roleCount: pack.roles.length,
    optionalCount: pack.optionalRoles.length,
    orchestratorRequired: pack.orchestratorRequired,
  }));
}
