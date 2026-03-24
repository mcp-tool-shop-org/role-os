/**
 * Escalation auto-routing.
 *
 * When a packet hits a stop condition (blocked, rejected, conflict, split-needed),
 * this module routes it to the right resolver with a reason, required artifact,
 * and recovery type.
 *
 * Every escalation produces a clean next-step — not just a destination.
 */

// ── Recovery types ────────────────────────────────────────────────────────────

/**
 * @typedef {'retry' | 'revise' | 'review' | 'split' | 'reroute' | 'add-role'} RecoveryType
 */

/**
 * @typedef {Object} EscalationResult
 * @property {string} targetRole - Who owns the recovery
 * @property {RecoveryType} recovery - What kind of recovery this is
 * @property {string} reason - Why this role was chosen
 * @property {string} requiredArtifact - What they must produce to unblock
 * @property {string} handoffContext - What the target needs to know
 */

// ── Blocked work routing ──────────────────────────────────────────────────────
// Each blocked reason maps to a resolver role + recovery path.

const BLOCKED_ROUTES = {
  // Missing information / unclear requirements
  "missing info": {
    targetRole: "Product Strategist",
    recovery: "revise",
    reason: "Blocked on missing information — Product Strategist owns requirement clarification",
    requiredArtifact: "Updated scope doc or clarified requirements",
    handoffContext: "Identify exactly what information is missing and whether it requires user input or can be derived from existing context",
  },
  "unclear requirements": {
    targetRole: "Product Strategist",
    recovery: "revise",
    reason: "Requirements are ambiguous — Product Strategist owns scope clarification",
    requiredArtifact: "Clarified requirements with acceptance criteria",
    handoffContext: "Flag which requirements are ambiguous and what interpretations exist",
  },
  "scope contradiction": {
    targetRole: "Product Strategist",
    recovery: "revise",
    reason: "Scope contains contradictions — Product Strategist must resolve",
    requiredArtifact: "Revised scope with contradictions resolved and tradeoffs documented",
    handoffContext: "List the specific contradictions and what each interpretation implies for delivery",
  },

  // Dependency unavailable
  "dependency unavailable": {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Upstream dependency is unavailable — Orchestrator must re-sequence or find alternative",
    requiredArtifact: "Revised execution plan with dependency resolved or worked around",
    handoffContext: "Identify which dependency is blocked, what it provides, and whether alternatives exist",
  },
  "blocked upstream": {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Upstream work is incomplete — Orchestrator must re-sequence",
    requiredArtifact: "Updated chain with dependency ordering corrected",
    handoffContext: "Identify which upstream deliverable is missing and which role was supposed to produce it",
  },

  // Technical infeasibility
  "technical infeasibility": {
    targetRole: "Backend Engineer",
    recovery: "revise",
    reason: "Proposed approach is technically infeasible — needs engineering assessment",
    requiredArtifact: "Feasibility analysis with alternative approaches",
    handoffContext: "Document what was attempted, why it failed, and what constraints make the original approach infeasible",
  },
  "architecture mismatch": {
    targetRole: "Orchestrator",
    recovery: "split",
    reason: "Work doesn't fit the current architecture — may need decomposition",
    requiredArtifact: "Architectural assessment and revised packet(s)",
    handoffContext: "Explain the mismatch between the work and the architecture, and what would need to change",
  },

  // Owner ambiguity
  "owner ambiguity": {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Unclear which role owns this work — Orchestrator must assign",
    requiredArtifact: "Clear role assignment with justification",
    handoffContext: "Describe what the work is and which roles could plausibly own it",
  },
};

// ── Rejected work routing ─────────────────────────────────────────────────────
// Rejected work routes backward with intent.

const REJECTED_ROUTES = {
  "quality bar miss": {
    recovery: "retry",
    reason: "Output did not meet the role's quality bar — send back to the producing role",
    requiredArtifact: "Revised output addressing quality bar gaps",
    handoffContext: "Cite the specific quality bar items that were not met",
    targetRoleRule: "previous", // route to the role that produced the rejected output
  },
  "wrong artifact type": {
    recovery: "revise",
    reason: "Wrong deliverable type — role may have misunderstood the packet",
    requiredArtifact: "Correct artifact type as specified in the packet",
    handoffContext: "Clarify what artifact was expected vs what was produced",
    targetRoleRule: "previous",
  },
  "incomplete evidence": {
    recovery: "retry",
    reason: "Evidence is incomplete — role must provide missing proof",
    requiredArtifact: "Complete evidence set as required by the review contract",
    handoffContext: "List exactly which evidence items are missing or insufficient",
    targetRoleRule: "previous",
  },
  "role mismatch": {
    recovery: "reroute",
    reason: "This work was assigned to the wrong role — needs re-routing",
    requiredArtifact: "Re-routed packet with correct role assignment",
    handoffContext: "Explain why the current role is wrong and which role should own this",
    targetRoleRule: "orchestrator",
  },
  "chain problem": {
    recovery: "reroute",
    reason: "The chain/ordering is wrong — Orchestrator must restructure",
    requiredArtifact: "Revised chain with corrected ordering or role selection",
    handoffContext: "Describe the chain problem and what the correct structure should be",
    targetRoleRule: "orchestrator",
  },
};

// ── Conflict escalation routing ───────────────────────────────────────────────

const CONFLICT_ROUTES = {
  blocking: {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Hard conflict in chain — cannot execute without restructuring",
    requiredArtifact: "Revised chain with conflict resolved",
  },
  sequence: {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Sequence conflict — roles are in the wrong order",
    requiredArtifact: "Reordered chain with correct role sequencing",
  },
  redundancy: {
    targetRole: "Orchestrator",
    recovery: "revise",
    reason: "Redundant roles in chain — consider trimming or splitting",
    requiredArtifact: "Trimmed chain or split into sub-packets",
  },
  coverage: {
    targetRole: "Orchestrator",
    recovery: "add-role",
    reason: "Coverage gap — chain is missing a critical role",
    requiredArtifact: "Updated chain with missing role added",
  },
};

// ── Split routing ─────────────────────────────────────────────────────────────

const SPLIT_ROUTE = {
  targetRole: "Orchestrator",
  recovery: "split",
  reason: "Chain is too large (>7 roles) — needs decomposition into sub-packets",
  requiredArtifact: "Decomposed packets, each with its own chain and scope",
  handoffContext: "Identify natural seams in the work where splitting reduces complexity without creating integration debt",
};

// ── Resolution engine ─────────────────────────────────────────────────────────

/**
 * Resolve a blocked verdict to an escalation target.
 *
 * @param {string} blockedReason - Why the work is blocked (free text, matched against known patterns)
 * @returns {EscalationResult}
 */
export function resolveBlocked(blockedReason) {
  const lower = (blockedReason || "").toLowerCase();

  // Try exact-ish matches first
  for (const [pattern, route] of Object.entries(BLOCKED_ROUTES)) {
    if (lower.includes(pattern)) {
      return { ...route };
    }
  }

  // Default: Orchestrator owns unknown blocks
  return {
    targetRole: "Orchestrator",
    recovery: "reroute",
    reason: "Blocked for unrecognized reason — Orchestrator must assess and route",
    requiredArtifact: "Assessment of block cause and recovery plan",
    handoffContext: `Original block reason: "${blockedReason}"`,
  };
}

/**
 * Resolve a rejected verdict to an escalation target.
 *
 * @param {string} rejectedReason - Why the work was rejected
 * @param {string} previousRole - The role that produced the rejected output
 * @returns {EscalationResult}
 */
export function resolveRejected(rejectedReason, previousRole) {
  const lower = (rejectedReason || "").toLowerCase();

  for (const [pattern, route] of Object.entries(REJECTED_ROUTES)) {
    if (lower.includes(pattern)) {
      const target = route.targetRoleRule === "previous"
        ? (previousRole || "Orchestrator")
        : route.targetRoleRule === "orchestrator"
          ? "Orchestrator"
          : route.targetRoleRule;

      return {
        targetRole: target,
        recovery: route.recovery,
        reason: route.reason,
        requiredArtifact: route.requiredArtifact,
        handoffContext: route.handoffContext,
      };
    }
  }

  // Default: route back to previous role for retry
  return {
    targetRole: previousRole || "Orchestrator",
    recovery: "retry",
    reason: "Rejected — route back to producing role for revision",
    requiredArtifact: "Revised output addressing rejection reason",
    handoffContext: `Original rejection reason: "${rejectedReason}"`,
  };
}

/**
 * Resolve a conflict finding to an escalation target.
 *
 * @param {{type: string, severity: string, roles: string[], message: string, repair: string}} conflict
 * @returns {EscalationResult}
 */
export function resolveConflict(conflict) {
  const route = CONFLICT_ROUTES[conflict.type] || CONFLICT_ROUTES.blocking;

  return {
    targetRole: route.targetRole,
    recovery: route.recovery,
    reason: `${route.reason}: ${conflict.message}`,
    requiredArtifact: route.requiredArtifact,
    handoffContext: `Repair suggestion: ${conflict.repair}`,
  };
}

/**
 * Resolve a split-needed chain to a decomposition owner.
 *
 * @param {number} chainSize
 * @returns {EscalationResult}
 */
export function resolveSplit(chainSize) {
  return {
    ...SPLIT_ROUTE,
    handoffContext: `Current chain has ${chainSize} roles. ${SPLIT_ROUTE.handoffContext}`,
  };
}

/**
 * Format an escalation result for operator display.
 *
 * @param {EscalationResult} result
 * @returns {string}
 */
export function formatEscalation(result) {
  const lines = [
    `  → ${result.targetRole} (${result.recovery})`,
    `    why: ${result.reason}`,
    `    must produce: ${result.requiredArtifact}`,
  ];
  if (result.handoffContext) {
    lines.push(`    context: ${result.handoffContext}`);
  }
  return lines.join("\n");
}
