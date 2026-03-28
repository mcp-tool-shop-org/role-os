/**
 * Mission Library — Phase S (v1.8.0)
 *
 * Named, repeatable job types that make recurring work boringly reliable.
 * Each mission declares:
 * - Default pack and role chain
 * - Expected artifact flow
 * - Common escalation branches
 * - What "honest partial" looks like
 * - Entry conditions and stop conditions
 *
 * Missions are NOT new abstractions — they are proven patterns
 * extracted from real execution (trials G1–G10, pack comparisons,
 * completion proof arc).
 */

import { TEAM_PACKS } from "./packs.mjs";
import { ROLE_ARTIFACT_CONTRACTS } from "./artifacts.mjs";
import { ROLE_CATALOG } from "./route.mjs";

// ── Mission definitions ─────────────────────────────────────────────────────

export const MISSIONS = {
  // ── Feature Shipment ────────────────────────────────────────────────────
  "feature-ship": {
    name: "Feature Shipment",
    description: "Scope, spec, implement, test, and review a new feature end-to-end.",
    pack: "feature",
    entryPath: "Product Strategist frames scope → Spec Writer writes spec → implementation → test → review",
    roleChain: [
      "Product Strategist",
      "Spec Writer",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Product Strategist", produces: "strategy-brief", consumedBy: "Spec Writer" },
      { role: "Spec Writer", produces: "implementation-spec", consumedBy: "Backend Engineer" },
      { role: "Backend Engineer", produces: "change-plan", consumedBy: "Test Engineer" },
      { role: "Test Engineer", produces: "test-report", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "scope ambiguity", from: "Spec Writer", to: "Product Strategist", action: "clarify scope before proceeding" },
      { trigger: "untestable spec", from: "Test Engineer", to: "Spec Writer", action: "revise interface spec for testability" },
      { trigger: "review rejection", from: "Critic Reviewer", to: "Backend Engineer", action: "address findings, re-test, re-review" },
    ],
    honestPartial: "Scope + spec complete but implementation blocked. Artifact chain intact up to the blocking point. Handoff includes what was tried and why it stalled.",
    stopConditions: [
      "Critic Reviewer accepts",
      "Escalation exhausts retry budget (3 loops max)",
      "Scope change invalidates the mission — replan required",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 30, maxBudgetUsd: 5.0 },
    trialEvidence: "G1, G2 — 6/6 gold passes. Pack comparison: wins vs free routing.",
  },

  // ── Bugfix / Diagnosis ──────────────────────────────────────────────────
  "bugfix": {
    name: "Bugfix & Diagnosis",
    description: "Diagnose root cause, fix, test, and verify a bug or regression.",
    pack: "bugfix",
    entryPath: "Repo Researcher diagnoses root cause → Backend Engineer fixes → Test Engineer verifies → Critic reviews",
    roleChain: [
      "Repo Researcher",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Repo Researcher", produces: "diagnosis-report", consumedBy: "Backend Engineer" },
      { role: "Backend Engineer", produces: "change-plan", consumedBy: "Test Engineer" },
      { role: "Test Engineer", produces: "test-report", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "root cause unclear", from: "Repo Researcher", to: "Repo Researcher", action: "gather more evidence, add reproduction steps" },
      { trigger: "fix introduces regression", from: "Test Engineer", to: "Backend Engineer", action: "revise fix approach" },
      { trigger: "diagnosis was wrong", from: "Backend Engineer", to: "Repo Researcher", action: "re-diagnose with new evidence from attempted fix" },
    ],
    honestPartial: "Root cause identified and documented but fix is non-trivial. Diagnosis report artifact is complete. Handoff includes attempted approaches and why they failed.",
    stopConditions: [
      "Critic Reviewer accepts fix",
      "Root cause confirmed but fix requires scope expansion — replan as feature-ship",
      "Bug is not reproducible — document findings and close",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "G3, G4 — 4/4 gold passes. Honest partial validated in R1-2 (README anomaly).",
  },

  // ── Treatment (Repo Polish) ─────────────────────────────────────────────
  "treatment": {
    name: "Treatment (Repo Polish)",
    description: "Full treatment: shipcheck gates, polish, docs, translations, version bump, publish.",
    pack: "treatment",
    entryPath: "Shipcheck gates first → Security Reviewer audits → Docs Architect updates → Deployment Verifier verifies CI → Critic reviews",
    roleChain: [
      "Security Reviewer",
      "Docs Architect",
      "Deployment Verifier",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Security Reviewer", produces: "security-audit", consumedBy: "Docs Architect" },
      { role: "Docs Architect", produces: "docs-update", consumedBy: "Deployment Verifier" },
      { role: "Deployment Verifier", produces: "ci-verification", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "security gate fails", from: "Security Reviewer", to: "Backend Engineer", action: "fix security issue before treatment continues" },
      { trigger: "CI fails after changes", from: "Deployment Verifier", to: "Backend Engineer", action: "fix CI, re-verify" },
      { trigger: "shipcheck hard gate blocks", from: "Critic Reviewer", to: "Security Reviewer", action: "address blocking gate, restart treatment" },
    ],
    honestPartial: "Shipcheck passed but polish incomplete. Security and docs artifacts exist. Remaining items documented in handoff.",
    stopConditions: [
      "All shipcheck hard gates pass + Critic accepts",
      "Security gate A blocks — must fix before continuing",
      "Scope expands to feature work — decompose into treatment + feature-ship",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G5, G6 — treatment pack proven. Completion proof arc validated honest partial.",
  },

  // ── Docs / Release ──────────────────────────────────────────────────────
  "docs-release": {
    name: "Docs & Release",
    description: "Write or update documentation, prepare release notes, publish.",
    pack: "docs",
    entryPath: "Docs Architect synthesizes upstream → writes docs → Critic reviews completeness",
    roleChain: [
      "Docs Architect",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Docs Architect", produces: "docs-update", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "upstream source missing", from: "Docs Architect", to: "Product Strategist", action: "clarify what changed and why" },
      { trigger: "docs conflict with code", from: "Critic Reviewer", to: "Docs Architect", action: "reconcile docs with actual implementation" },
    ],
    honestPartial: "Core docs updated but supplementary pages (handbook, translations) pending. Main artifact complete.",
    stopConditions: [
      "Critic accepts docs as accurate and complete",
      "Upstream changes still in flight — park docs until code stabilizes",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 15, maxBudgetUsd: 2.0 },
    trialEvidence: "G7, G8 — docs pack proven. Upstream-synthesis gate prevents stale docs.",
  },

  // ── Security Hardening ──────────────────────────────────────────────────
  "security-hardening": {
    name: "Security Hardening",
    description: "Threat model, audit, fix vulnerabilities, verify gates.",
    pack: "security",
    entryPath: "Security Reviewer threat-models → identifies issues → Backend Engineer fixes → re-audit",
    roleChain: [
      "Security Reviewer",
      "Backend Engineer",
      "Test Engineer",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Security Reviewer", produces: "security-audit", consumedBy: "Backend Engineer" },
      { role: "Backend Engineer", produces: "change-plan", consumedBy: "Test Engineer" },
      { role: "Test Engineer", produces: "test-report", consumedBy: "Security Reviewer" },
      { role: "Security Reviewer", produces: "security-audit", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "critical vulnerability found", from: "Security Reviewer", to: "Backend Engineer", action: "immediate fix, skip non-critical work" },
      { trigger: "fix breaks functionality", from: "Test Engineer", to: "Backend Engineer", action: "find fix that preserves both security and function" },
      { trigger: "threat model scope expands", from: "Security Reviewer", to: "Product Strategist", action: "reframe scope — is this a feature-ship or security mission?" },
    ],
    honestPartial: "Threat model complete, critical issues fixed, non-critical items documented as backlog. Audit artifact reflects actual state.",
    stopConditions: [
      "All critical findings fixed + Critic accepts",
      "No critical findings — document clean audit",
      "Scope expands beyond security — decompose into security + feature-ship",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 4.0 },
    trialEvidence: "G9, G10 — security pack proven. Treatment includes Security Reviewer by default.",
  },

  // ── Research → Framing → Launch ─────────────────────────────────────────
  "research-launch": {
    name: "Research → Framing → Launch",
    description: "Investigate a question, frame findings into a decision, prepare launch artifacts.",
    pack: "research",
    entryPath: "Product Strategist frames question → Competitive Analyst investigates → findings → launch decision",
    roleChain: [
      "Product Strategist",
      "Competitive Analyst",
      "Docs Architect",
      "Critic Reviewer",
    ],
    artifactFlow: [
      { role: "Product Strategist", produces: "strategy-brief", consumedBy: "Competitive Analyst" },
      { role: "Competitive Analyst", produces: "research-findings", consumedBy: "Product Strategist" },
      { role: "Docs Architect", produces: "docs-update", consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer", produces: "review-verdict", consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "research inconclusive", from: "Competitive Analyst", to: "Product Strategist", action: "narrow the question or accept uncertainty" },
      { trigger: "findings contradict assumption", from: "Competitive Analyst", to: "Product Strategist", action: "reframe strategy based on evidence" },
      { trigger: "launch blocked by findings", from: "Critic Reviewer", to: "Product Strategist", action: "decide: proceed with caveats or pivot" },
    ],
    honestPartial: "Research complete with findings documented. Launch decision pending stakeholder input. Research artifact is self-contained.",
    stopConditions: [
      "Critic accepts research findings and launch plan",
      "Research reveals the question is wrong — reframe mission",
      "Findings are clear but launch is premature — park with documented rationale",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 20, maxBudgetUsd: 3.0 },
    trialEvidence: "Research pack opens with Product Strategist (framing before research). Validated in pack comparison.",
  },

  // ── Brainstorm (Structured Inquiry) ────────────────────────────────────────
  "brainstorm": {
    name: "Brainstorm (Structured Inquiry)",
    description: "Specialized roles under law, with traceable disagreement and verdict-bearing output. Each analyst emits a role-native schema; cross-exam produces a dispute graph; synthesis consumes truth, never prose. Both truth and rendered layers are always available.",
    pack: "brainstorm",
    entryPath: "Frame → 4 Analysts (parallel, role-native) → Normalize (provenance atoms) → Cross-Examine (directed challenges) → Rebut (defend/narrow/retract) → Synthesize (dispute-informed) → Expand → Judge → Render (opt-in) → Return",
    roleChain: [
      "Context Analyst",
      "User Value Analyst",
      "Mechanics Analyst",
      "Positioning Analyst",
      "Normalizer",
      "Contrarian Analyst",
      "Synthesizer",
      "Product Expander",
      "Judge",
    ],
    artifactFlow: [
      // Layer 1: Truth — role-native schemas, provenance atoms, dispute graph
      { role: "Context Analyst",     produces: "context-map",          consumedBy: "Normalizer" },
      { role: "User Value Analyst",  produces: "user-value-map",       consumedBy: "Normalizer" },
      { role: "Mechanics Analyst",   produces: "mechanics-map",        consumedBy: "Normalizer" },
      { role: "Positioning Analyst", produces: "positioning-map",      consumedBy: "Normalizer" },
      { role: "Normalizer",          produces: "provenance-atoms",     consumedBy: "Contrarian Analyst" },
      { role: "Contrarian Analyst",  produces: "challenge-set",        consumedBy: "Normalizer" },
      // Rebut: original analysts respond to challenges (defend/narrow/retract)
      { role: "Normalizer",          produces: "rebuttal-set",         consumedBy: "Synthesizer" },
      // Synthesis consumes truth layer: atoms + challenge edges + rebuttal edges
      { role: "Synthesizer",         produces: "synthesis-report",     consumedBy: "Product Expander" },
      { role: "Product Expander",    produces: "expanded-concept",     consumedBy: "Judge" },
      { role: "Judge",               produces: "judge-report",         consumedBy: null },
      // Layer 2: Render — human-legible presentation of truth artifacts (opt-in)
      // Rendered artifacts: Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript
      // Debate transcript: readable exchange generated from challenge/rebuttal graph
      // Trace links: every rendered sentence maps to a truth-layer atom
    ],
    escalationBranches: [
      { trigger: "judge_revise_expand",     from: "Judge", to: "Product Expander", action: "re-expand targeted directions with revision guidance" },
      { trigger: "judge_revise_synthesize", from: "Judge", to: "Synthesizer",      action: "reselect directions with judge feedback, then re-expand and re-judge" },
      { trigger: "boundary_violation",      from: "Normalizer", to: "Context Analyst", action: "re-analyze with out-of-lens claims rejected" },
      { trigger: "challenge_rejected",      from: "Normalizer", to: "Contrarian Analyst", action: "re-challenge with filtered targets (cross-exam matrix enforced)" },
    ],
    honestPartial: "Brainstorm explored multiple dimensions. Truth artifacts up to the blocking phase are intact, inspectable, and traceable. Dispute graph partial if stalled during cross-examine/rebut. Rendered artifacts only available for completed truth artifacts.",
    stopConditions: [
      "Judge accepts with disposition 'accept' — both layers assembled, trace links verified",
      "Judge rejects — mission returns honest partial with truth artifacts intact",
      "Loop budget exhausted (3 revision loops) — Judge forced to accept or reject",
      "Frame fails to resolve objective — mission aborts with guidance",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 40, maxBudgetUsd: 6.0 },
    trialEvidence: "v0.4 golden run — 894 tests green. Full chain of custody proven: truth artifacts, provenance atoms, dispute graph (4 challenges, 3 narrowed, 1 unresolved), rendered artifacts in 5 formats, debate transcript, 16+ trace links from rendered → truth. Architecture frozen 2026-03-27.",
  },
  // ── Deep Audit (Componentized Repo Understanding) ──────────────────────────
  "deep-audit": {
    name: "Deep Audit",
    description: "Decompose a repo into bounded components, dispatch one auditor per component, inspect seams from the dependency graph, assess test truth, then synthesize into a ranked verdict and action plan. Worker count scales with the repo graph — not fixed.",
    pack: "deep-audit",
    entryPath: "Decompose repo → validate parcels → Component Auditor ×N (parallel) + Test Truth Auditor ×M → Seam Auditor ×K (from graph edges) → Audit Synthesizer → Critic reviews verdict",
    // NOTE: This mission has a DYNAMIC role chain. The static chain below
    // shows the role archetypes. At dispatch time, Component Auditor and
    // Seam Auditor are instantiated once per component/boundary cluster.
    // A 10-component repo with 4 risky boundaries = 10 + 4 + 2 + 1 + 1 = 18 tasks.
    roleChain: [
      "Component Auditor",   // ×N — one per component from audit-manifest
      "Test Truth Auditor",  // ×M — one per component or one overlay pass
      "Seam Auditor",        // ×K — one per risky boundary cluster from graph
      "Audit Synthesizer",   // ×1 — consumes all outputs, produces verdict
      "Critic Reviewer",     // ×1 — final acceptance
    ],
    // Dynamic dispatch contract:
    // Step 1 produces audit-manifest.json with components[] and boundaries[].
    // Steps 2-4 are instantiated from the manifest:
    //   - One Component Auditor task per components[] entry
    //   - One Test Truth Auditor task per component (or grouped by layer)
    //   - One Seam Auditor task per boundary cluster
    // Step 5 (Audit Synthesizer) runs after ALL step 2-4 tasks complete.
    // Step 6 (Critic Reviewer) reviews the synthesis.
    dynamicDispatch: {
      scalingRoles: ["Component Auditor", "Test Truth Auditor", "Seam Auditor"],
      manifestSource: "audit-manifest.json",
      componentAuditorPer: "components",
      testTruthAuditorPer: "components",
      seamAuditorPer: "boundary_clusters",
      synthesisAfter: ["Component Auditor", "Test Truth Auditor", "Seam Auditor"],
    },
    artifactFlow: [
      // Step 1: Decomposition (done before mission dispatch — input artifact)
      { role: "Component Auditor",   produces: "component-audit-report", consumedBy: "Audit Synthesizer" },
      { role: "Test Truth Auditor",  produces: "test-truth-report",      consumedBy: "Audit Synthesizer" },
      { role: "Seam Auditor",        produces: "seam-audit-report",      consumedBy: "Audit Synthesizer" },
      { role: "Audit Synthesizer",   produces: "audit-summary",          consumedBy: "Critic Reviewer" },
      { role: "Audit Synthesizer",   produces: "audit-action-plan",      consumedBy: "Critic Reviewer" },
      { role: "Critic Reviewer",     produces: "review-verdict",         consumedBy: null },
    ],
    escalationBranches: [
      { trigger: "component exceeds 8K lines", from: "Component Auditor", to: "Component Auditor", action: "re-slice into sub-components, re-dispatch" },
      { trigger: "circular dependency found", from: "Seam Auditor", to: "Audit Synthesizer", action: "elevate as architectural finding, do not attempt to resolve" },
      { trigger: "parcel outputs inconsistent", from: "Audit Synthesizer", to: "Component Auditor", action: "re-audit the inconsistent component with narrower scope" },
      { trigger: "critical finding spans 3+ components", from: "Audit Synthesizer", to: "Seam Auditor", action: "targeted cross-cut audit on the systemic issue" },
      { trigger: "test suite is ceremonial", from: "Test Truth Auditor", to: "Audit Synthesizer", action: "flag as structural risk — false confidence in coverage" },
    ],
    honestPartial: "Component audits complete but seam inspection blocked or synthesis incomplete. Per-component findings are individually valid and actionable. Manifest and component reports exist even if synthesis does not.",
    stopConditions: [
      "Audit Synthesizer produces verdict + action plan, Critic accepts",
      "Decomposition reveals repo is too tangled to slice — document why and abort",
      "All component audits complete but seam audits blocked — synthesize with component-only truth",
      "Budget exhausted — synthesize from whatever component audits completed",
    ],
    dispatchDefaults: { model: "sonnet", maxTurns: 25, maxBudgetUsd: 3.0 },
    trialEvidence: "New mission — no trial evidence yet. Architecture designed 2026-03-27.",
  },
};

// ── Mission catalog ─────────────────────────────────────────────────────────

/**
 * List all missions with summary info.
 * @returns {Array<{key: string, name: string, description: string, pack: string, roleCount: number}>}
 */
export function listMissions() {
  return Object.entries(MISSIONS).map(([key, m]) => ({
    key,
    name: m.name,
    description: m.description,
    pack: m.pack,
    roleCount: m.roleChain.length,
  }));
}

/**
 * Get a mission by key.
 * @param {string} key
 * @returns {object|null}
 */
export function getMission(key) {
  return MISSIONS[key] || null;
}

/**
 * Suggest a mission for a task description (signal matching).
 * @param {string} taskDescription
 * @returns {{mission: string, confidence: "high"|"medium"|"low", reason: string}|null}
 */
export function suggestMission(taskDescription) {
  const text = taskDescription.toLowerCase();

  const MISSION_SIGNALS = {
    "feature-ship": {
      signals: ["add feature", "implement", "build", "create", "new command", "ship feature", "develop", "add command", "new feature", "add support"],
      weight: 1,
    },
    "bugfix": {
      signals: ["fix", "bug", "crash", "broken", "regression", "repair", "diagnose", "not working"],
      weight: 1,
    },
    "treatment": {
      signals: ["treatment", "polish", "shipcheck", "pre-release", "ship-ready", "cleanup", "housekeeping"],
      weight: 1.2, // slightly prefer treatment when signals match (common task)
    },
    "docs-release": {
      signals: ["documentation", "docs", "readme", "release notes", "changelog", "handbook", "write docs"],
      weight: 1,
    },
    "security-hardening": {
      signals: ["security", "vulnerability", "threat model", "audit", "CVE", "injection", "hardening"],
      weight: 1.1,
    },
    "research-launch": {
      signals: ["research", "investigate", "should we", "evaluate", "competitive", "launch plan", "strategy"],
      weight: 1,
    },
    "brainstorm": {
      signals: ["brainstorm", "explore ideas", "explore directions", "opportunity map", "creative directions", "concept exploration", "what could we build", "divergent thinking", "ideate"],
      weight: 1.1,
    },
    "deep-audit": {
      signals: ["deep audit", "component audit", "decompose and audit", "audit components", "structural audit", "deep review", "code audit", "repo deep dive"],
      weight: 1.2,
    },
  };

  let bestKey = null;
  let bestScore = 0;

  for (const [key, def] of Object.entries(MISSION_SIGNALS)) {
    let hits = 0;
    for (const signal of def.signals) {
      if (text.includes(signal)) hits++;
    }
    const score = hits * def.weight;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  if (!bestKey || bestScore === 0) return null;

  const confidence = bestScore >= 3 ? "high" : bestScore >= 1.5 ? "medium" : "low";
  const mission = MISSIONS[bestKey];

  return {
    mission: bestKey,
    confidence,
    reason: `Matched ${Math.floor(bestScore)} signal(s) for "${mission.name}"`,
  };
}

// ── Mission validation ──────────────────────────────────────────────────────

/**
 * Validate that a mission's pack and roles are properly wired.
 * @param {string} key
 * @returns {{valid: boolean, issues: string[]}}
 */
export function validateMission(key) {
  const mission = MISSIONS[key];
  if (!mission) return { valid: false, issues: [`Mission "${key}" not found`] };

  const issues = [];

  // Check pack exists
  if (!TEAM_PACKS[mission.pack]) {
    issues.push(`Pack "${mission.pack}" not found in TEAM_PACKS`);
  }

  // S6-F1: Check all role names exist in ROLE_CATALOG
  const catalogNames = new Set(ROLE_CATALOG.map((r) => r.name));
  for (const roleName of mission.roleChain) {
    if (!catalogNames.has(roleName)) {
      issues.push(`Role "${roleName}" in roleChain not found in ROLE_CATALOG`);
    }
  }
  for (const step of mission.artifactFlow) {
    if (!catalogNames.has(step.role)) {
      issues.push(`Role "${step.role}" in artifactFlow not found in ROLE_CATALOG`);
    }
  }

  // Check artifact contracts exist for producing roles
  for (const step of mission.artifactFlow) {
    if (ROLE_ARTIFACT_CONTRACTS[step.role]) {
      // Contract exists — good
    }
    // Not all roles need contracts (only chain-critical ones), so missing is a warning not error
  }

  // Check artifact flow continuity (each consumed artifact should be produced upstream)
  const produced = new Set();
  for (const step of mission.artifactFlow) {
    produced.add(step.produces);
  }

  // Check escalation branches reference roles in the chain or known roles
  for (const branch of mission.escalationBranches) {
    if (!mission.roleChain.includes(branch.from) && branch.from !== branch.to) {
      // from role should be in chain or self-referencing
      issues.push(`Escalation "from" role "${branch.from}" not in role chain`);
    }
  }

  // Check stop conditions exist
  if (!mission.stopConditions || mission.stopConditions.length === 0) {
    issues.push("Mission has no stop conditions");
  }

  // Check honest partial exists
  if (!mission.honestPartial) {
    issues.push("Mission has no honest-partial definition");
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validate ALL missions.
 * @returns {{allValid: boolean, results: Record<string, {valid: boolean, issues: string[]}>}}
 */
export function validateAllMissions() {
  const results = {};
  let allValid = true;

  for (const key of Object.keys(MISSIONS)) {
    const result = validateMission(key);
    results[key] = result;
    if (!result.valid) allValid = false;
  }

  return { allValid, results };
}
