/**
 * Role conflict detection.
 *
 * Tells the operator when the staffed team is internally broken
 * before work starts. Four passes: hard conflicts, sequence,
 * redundancy, coverage gaps. Every finding includes a repair suggestion.
 */

// ── Per-role constraints ──────────────────────────────────────────────────────

const ROLE_CONSTRAINTS = {
  "Critic Reviewer": {
    lateOnly: true,
    requiresBeforePacks: ["engineering", "design", "treatment", "product"],
    description: "review/gate role — needs something to review",
  },
  "Test Engineer": {
    lateOnly: true,
    requiresBeforePacks: ["engineering", "design"],
    description: "test role — needs something to test",
  },
  "Coverage Auditor": {
    lateOnly: true,
    requiresBeforePacks: ["engineering"],
    description: "coverage role — needs code to audit",
  },
  "Deployment Verifier": {
    lateOnly: true,
    requiresBeforePacks: ["engineering", "treatment"],
    description: "verification role — needs something deployed to verify",
  },
  "Release Engineer": {
    lateOnly: true,
    requiresBeforePacks: ["engineering", "treatment"],
    description: "release role — needs built or prepared artifacts to release",
  },
  "Launch Copywriter": {
    requiresBeforePacks: ["engineering", "design", "product"],
    description: "messaging role — needs product substance to write about",
  },
  "Launch Strategist": {
    requiresBeforePacks: ["engineering", "design", "product"],
    description: "launch role — needs product substance to plan launch around",
  },
  "Content Strategist": {
    requiresBeforePacks: ["engineering", "design", "product"],
    description: "content role — needs product substance for content planning",
  },
};

// ── Overlap declarations ──────────────────────────────────────────────────────
// Roles that produce similar artifacts and rarely both need to be in the same chain.

const OVERLAP_PAIRS = [
  ["Coverage Auditor", "Test Engineer", "both assess test quality — consider keeping only one unless scope is very large"],
  ["Repo Researcher", "Docs Architect", "both map repo structure — Researcher maps truth, Architect builds docs from it"],
  ["Launch Strategist", "Launch Copywriter", "both serve launches — Strategist plans, Copywriter writes. Both needed only for major launches"],
  ["Competitive Analyst", "Trend Researcher", "both scan external landscape — consider whether one covers the need"],
];

// ── Builder packs (roles that produce primary artifacts) ──────────────────────

const BUILDER_PACKS = new Set(["engineering", "design", "product", "treatment"]);

// ── Pack limits ───────────────────────────────────────────────────────────────

const MAX_SAME_PACK = 3;

// ── Detection engine ──────────────────────────────────────────────────────────

/**
 * Detect conflicts in a staffed chain.
 *
 * @param {Array<{role: {name: string, pack: string, phase: number}}>} chainRoles
 * @returns {Array<{type: string, severity: string, roles: string[], message: string, repair: string}>}
 */
export function detectConflicts(chainRoles) {
  const findings = [];
  const names = chainRoles.map(r => r.role.name);
  const packs = chainRoles.map(r => r.role.pack);
  const roles = chainRoles.map(r => r.role);

  // ── Pass 1: Hard conflicts ──────────────────────────────────────────────

  // Check if review/gate roles are the only non-Orchestrator roles (no builders)
  const nonCore = roles.filter(r => r.name !== "Orchestrator" && r.name !== "Critic Reviewer");
  const builders = nonCore.filter(r => BUILDER_PACKS.has(r.pack));

  if (builders.length === 0 && nonCore.length > 0) {
    const nonCoreNames = nonCore.map(r => r.name);
    findings.push({
      type: "blocking",
      severity: "error",
      roles: nonCoreNames,
      message: `Chain has no builder roles (engineering, design, product, or treatment). Only gate/growth/research roles present: ${nonCoreNames.join(", ")}.`,
      repair: "Add at least one role that produces a primary artifact (e.g., Backend Engineer, UI Designer, Spec Writer).",
    });
  }

  // ── Pass 2: Sequence conflicts ──────────────────────────────────────────

  for (const [roleName, constraints] of Object.entries(ROLE_CONSTRAINTS)) {
    const roleIdx = names.indexOf(roleName);
    if (roleIdx === -1) continue; // role not in chain

    if (constraints.requiresBeforePacks) {
      // Check if any role from the required packs appears BEFORE this role
      const hasPriorBuilder = roles.slice(0, roleIdx).some(
        r => constraints.requiresBeforePacks.includes(r.pack)
      );

      if (!hasPriorBuilder && builders.length > 0) {
        // There ARE builders, but they're all AFTER this role
        findings.push({
          type: "sequence",
          severity: "warning",
          roles: [roleName],
          message: `${roleName} (${constraints.description}) appears before any ${constraints.requiresBeforePacks.join("/")} role in the chain.`,
          repair: `Move ${roleName} later in the chain, after the roles that produce what it needs.`,
        });
      }

      if (builders.length === 0 && !constraints.lateOnly) {
        // No builders at all — this was caught in Pass 1, skip double-reporting
      }
    }

    if (constraints.lateOnly) {
      // Check if this role appears in the first half of the chain (before most work)
      const midpoint = Math.floor(chainRoles.length / 2);
      if (roleIdx > 0 && roleIdx < midpoint && chainRoles.length > 3) {
        findings.push({
          type: "sequence",
          severity: "warning",
          roles: [roleName],
          message: `${roleName} is a late-chain role but appears in the first half (position ${roleIdx + 1} of ${chainRoles.length}).`,
          repair: `Move ${roleName} toward the end of the chain where it can act on completed work.`,
        });
      }
    }
  }

  // ── Pass 3: Redundancy ──────────────────────────────────────────────────

  // Pack density check
  const packCounts = {};
  for (const pack of packs) {
    packCounts[pack] = (packCounts[pack] || 0) + 1;
  }
  for (const [pack, count] of Object.entries(packCounts)) {
    if (pack === "core") continue; // Orchestrator + Critic are always present
    if (count > MAX_SAME_PACK) {
      const packRoles = roles.filter(r => r.pack === pack).map(r => r.name);
      findings.push({
        type: "redundancy",
        severity: "warning",
        roles: packRoles,
        message: `${count} roles from the "${pack}" pack: ${packRoles.join(", ")}. This may indicate an oversized or overlapping team.`,
        repair: `Review whether all ${count} ${pack} roles are needed. Consider splitting into sub-packets if scope is broad.`,
      });
    }
  }

  // Overlap pair check
  for (const [roleA, roleB, note] of OVERLAP_PAIRS) {
    if (names.includes(roleA) && names.includes(roleB)) {
      findings.push({
        type: "redundancy",
        severity: "warning",
        roles: [roleA, roleB],
        message: `${roleA} and ${roleB} are both in the chain — ${note}.`,
        repair: `Consider whether both are needed, or if one can cover the scope.`,
      });
    }
  }

  // ── Pass 4: Coverage gaps ───────────────────────────────────────────────

  const engineeringCount = roles.filter(r => r.pack === "engineering").length;
  const hasTestEngineer = names.includes("Test Engineer");
  const hasCritic = names.includes("Critic Reviewer");

  // Engineering-heavy with no tester
  if (engineeringCount >= 2 && !hasTestEngineer) {
    findings.push({
      type: "coverage",
      severity: "warning",
      roles: roles.filter(r => r.pack === "engineering").map(r => r.name),
      message: `Chain has ${engineeringCount} engineering roles but no Test Engineer. Code may ship without verification.`,
      repair: "Add Test Engineer to verify the engineering output before review.",
    });
  }

  // Builders present but no critic (defensive — should be caught by always-include)
  if (builders.length > 0 && !hasCritic) {
    findings.push({
      type: "coverage",
      severity: "error",
      roles: builders.map(r => r.name),
      message: "Chain has builder roles but no Critic Reviewer. Work cannot be accepted without a final gate.",
      repair: "Add Critic Reviewer as the final role in the chain.",
    });
  }

  // Large chain without Orchestrator (defensive)
  if (chainRoles.length > 4 && !names.includes("Orchestrator")) {
    findings.push({
      type: "coverage",
      severity: "warning",
      roles: names,
      message: "Chain has 5+ roles but no Orchestrator. Complex work needs coordination.",
      repair: "Add Orchestrator at the start of the chain to decompose and sequence the work.",
    });
  }

  return findings;
}
