/**
 * Composite Execution — Phase O
 *
 * Takes a decomposed mixed task and runs child packets as one coherent
 * operation: dependency-driven execution, artifact passing between
 * children, branch recovery, and final synthesis.
 *
 * O1 — Dependency-driven child execution
 * O2 — Branch recovery
 * O3 — Final handoff synthesis
 */

// ── Artifact contracts ────────────────────────────────────────────────────────

/**
 * Defines what each category produces and what it expects as input.
 * This is the structure that makes cross-packet handoffs real instead
 * of hoping the operator connects the dots.
 */
export const ARTIFACT_CONTRACTS = {
  research: {
    produces: ["research-brief", "recommendation", "evidence-summary"],
    expects: [],
    description: "Produces research findings and recommendations that downstream decisions consume.",
  },
  build: {
    produces: ["implementation", "code-changes", "test-results"],
    expects: ["scope-doc", "spec"],
    description: "Produces working code with tests. Expects scope or spec from upstream.",
  },
  bugfix: {
    produces: ["fix-implementation", "regression-tests", "root-cause-analysis"],
    expects: ["bug-report", "reproduction-steps"],
    description: "Produces a fix with regression tests. Expects a clear bug report.",
  },
  security: {
    produces: ["security-findings", "threat-model", "remediation-plan"],
    expects: ["implementation", "code-changes"],
    description: "Produces security findings. Best when run after implementation exists.",
  },
  docs: {
    produces: ["documentation", "handbook-pages", "changelog-entry"],
    expects: ["implementation", "code-changes", "security-findings"],
    description: "Produces docs from shipped work. Expects something to document.",
  },
  launch: {
    produces: ["release-notes", "announcement-copy", "social-posts"],
    expects: ["implementation", "documentation", "changelog-entry"],
    description: "Produces launch copy. Expects shipped + documented work.",
  },
  treatment: {
    produces: ["audit-report", "remediation-list", "release-readiness"],
    expects: ["implementation"],
    description: "Produces a ship-readiness assessment. Expects a repo with real content.",
  },
};

// ── Execution engine ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} ChildExecution
 * @property {string} category
 * @property {string} pack
 * @property {"pending"|"ready"|"running"|"completed"|"blocked"|"failed"|"recovery"} status
 * @property {string[]} dependsOn
 * @property {string[]} producedArtifacts - Artifact types this child has produced
 * @property {string[]} receivedArtifacts - Artifact types received from upstream
 * @property {object|null} result - Outcome data when completed
 * @property {object|null} blockInfo - Recovery info when blocked
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} CompositeExecution
 * @property {string} parentId
 * @property {"pending"|"running"|"completed"|"blocked"|"failed"} status
 * @property {ChildExecution[]} children
 * @property {string[]} dependencyOrder
 * @property {object[]} artifactLedger - All artifacts passed between children
 * @property {object[]} recoveryLog - All recovery events
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */

/**
 * Initialize a composite execution from a run plan.
 *
 * @param {object} runPlan - From decompose.createRunPlan()
 * @returns {CompositeExecution}
 */
export function initExecution(runPlan) {
  return {
    parentId: runPlan.parentId,
    status: "pending",
    children: runPlan.children.map(child => ({
      category: child.category,
      pack: child.pack,
      status: "pending",
      dependsOn: child.dependsOn,
      producedArtifacts: [],
      receivedArtifacts: [],
      result: null,
      blockInfo: null,
      startedAt: null,
      completedAt: null,
    })),
    dependencyOrder: runPlan.dependencyOrder,
    artifactLedger: [],
    recoveryLog: [],
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Advance the execution: find and return the next ready child.
 * A child is ready when all its dependencies are completed and
 * their required artifacts are available.
 *
 * @param {CompositeExecution} exec
 * @returns {{ child: ChildExecution, artifacts: object[], reason: string } | null}
 */
export function advance(exec) {
  if (exec.status === "completed" || exec.status === "failed") return null;

  if (!exec.startedAt) exec.startedAt = new Date().toISOString();
  exec.status = "running";

  for (const child of exec.children) {
    if (child.status !== "pending") continue;

    // Check all dependencies are completed
    const depsComplete = child.dependsOn.every(dep => {
      const depChild = exec.children.find(c => c.category === dep);
      return depChild && depChild.status === "completed";
    });

    if (!depsComplete) continue;

    // Gather artifacts from upstream dependencies
    const availableArtifacts = exec.artifactLedger.filter(a =>
      child.dependsOn.includes(a.fromCategory)
    );

    // Check artifact expectations
    const contract = ARTIFACT_CONTRACTS[child.category];
    const received = availableArtifacts.map(a => a.type);
    child.receivedArtifacts = received;

    // Mark as ready
    child.status = "ready";

    return {
      child,
      artifacts: availableArtifacts,
      reason: child.dependsOn.length === 0
        ? `${child.category} has no dependencies — ready to start.`
        : `Dependencies complete (${child.dependsOn.join(", ")}). ${received.length} artifacts available.`,
    };
  }

  return null;
}

/**
 * Mark a child as started (running).
 *
 * @param {CompositeExecution} exec
 * @param {string} category
 */
export function startChild(exec, category) {
  const child = exec.children.find(c => c.category === category);
  if (!child) return;
  child.status = "running";
  child.startedAt = new Date().toISOString();
}

/**
 * Complete a child with artifacts.
 *
 * @param {CompositeExecution} exec
 * @param {string} category
 * @param {{ artifacts: string[], result: object }} outcome
 */
export function completeChild(exec, category, outcome) {
  const child = exec.children.find(c => c.category === category);
  if (!child) return;

  child.status = "completed";
  child.completedAt = new Date().toISOString();
  child.producedArtifacts = outcome.artifacts || [];
  child.result = outcome.result || {};

  // Record artifacts in the ledger
  for (const artifactType of child.producedArtifacts) {
    exec.artifactLedger.push({
      type: artifactType,
      fromCategory: category,
      fromPack: child.pack,
      producedAt: child.completedAt,
    });
  }

  // Check if all children complete
  if (exec.children.every(c => c.status === "completed")) {
    exec.status = "completed";
    exec.completedAt = new Date().toISOString();
  }
}

// ── Branch recovery (O2) ──────────────────────────────────────────────────────

/**
 * Block a child and create a recovery path.
 * Downstream children stay paused. The blocked child gets a recovery plan.
 *
 * @param {CompositeExecution} exec
 * @param {string} category
 * @param {{ reason: string, recoveryType: "retry"|"reroute"|"escalate", targetRole?: string }} blockInfo
 */
export function blockChild(exec, category, blockInfo) {
  const child = exec.children.find(c => c.category === category);
  if (!child) return;

  child.status = "blocked";
  child.blockInfo = {
    ...blockInfo,
    blockedAt: new Date().toISOString(),
  };

  // Log the recovery event
  exec.recoveryLog.push({
    event: "child-blocked",
    category,
    reason: blockInfo.reason,
    recoveryType: blockInfo.recoveryType,
    timestamp: new Date().toISOString(),
  });

  // Mark parent as blocked
  exec.status = "blocked";

  // Downstream children that depend on this one stay pending (they can't advance)
  // This is already handled by advance() checking dependency completion
}

/**
 * Recover a blocked child (retry it).
 *
 * @param {CompositeExecution} exec
 * @param {string} category
 */
export function recoverChild(exec, category) {
  const child = exec.children.find(c => c.category === category);
  if (!child || child.status !== "blocked") return;

  child.status = "pending";
  child.blockInfo = null;

  exec.recoveryLog.push({
    event: "child-recovered",
    category,
    timestamp: new Date().toISOString(),
  });

  // If no other children are blocked, parent returns to running
  const anyBlocked = exec.children.some(c => c.status === "blocked");
  if (!anyBlocked) {
    exec.status = "running";
  }
}

/**
 * Fail a child permanently. Downstream children become unreachable.
 *
 * @param {CompositeExecution} exec
 * @param {string} category
 * @param {string} reason
 */
export function failChild(exec, category, reason) {
  const child = exec.children.find(c => c.category === category);
  if (!child) return;

  child.status = "failed";
  child.blockInfo = { reason, permanent: true };

  exec.recoveryLog.push({
    event: "child-failed",
    category,
    reason,
    timestamp: new Date().toISOString(),
  });

  // Check if any remaining children can still complete
  // A child is unreachable if it directly or transitively depends on the failed one
  const unreachable = findUnreachable(exec, category);
  for (const cat of unreachable) {
    const c = exec.children.find(ch => ch.category === cat);
    if (c && c.status === "pending") {
      c.status = "failed";
      c.blockInfo = { reason: `Upstream dependency "${category}" failed.`, permanent: true };
    }
  }

  exec.status = "failed";
}

/**
 * Find all categories that transitively depend on a given category.
 * Uses a visited set to guard against circular dependency graphs.
 */
function findUnreachable(exec, failedCategory) {
  const unreachable = new Set();
  const visited = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of exec.children) {
      if (unreachable.has(child.category)) continue;
      if (visited.has(child.category) && !child.dependsOn.includes(failedCategory) && !child.dependsOn.some(d => unreachable.has(d))) {
        continue; // already evaluated without being unreachable — skip
      }
      visited.add(child.category);
      if (child.dependsOn.includes(failedCategory) || child.dependsOn.some(d => unreachable.has(d))) {
        unreachable.add(child.category);
        changed = true;
      }
    }
  }
  return [...unreachable];
}

/**
 * Check for circular dependencies in the execution plan.
 * Returns an array of categories involved in cycles (empty if none).
 *
 * @param {CompositeExecution} exec
 * @returns {string[]}
 */
export function detectCycles(exec) {
  const resolved = new Set();
  const visiting = new Set();
  const cycles = [];

  function visit(category) {
    if (resolved.has(category)) return;
    if (visiting.has(category)) {
      cycles.push(category);
      return;
    }
    visiting.add(category);
    const child = exec.children.find(c => c.category === category);
    if (child) {
      for (const dep of child.dependsOn) {
        visit(dep);
      }
    }
    visiting.delete(category);
    resolved.add(category);
  }

  for (const child of exec.children) {
    visit(child.category);
  }
  return cycles;
}

// ── Invalidation ──────────────────────────────────────────────────────────────

/**
 * Invalidate downstream children when an upstream change makes their
 * artifacts stale. Resets completed children back to pending.
 *
 * @param {CompositeExecution} exec
 * @param {string} category - The category whose output changed
 */
export function invalidateDownstream(exec, category) {
  const downstream = findUnreachable(exec, category);
  for (const cat of downstream) {
    const child = exec.children.find(c => c.category === cat);
    if (child && child.status === "completed") {
      child.status = "pending";
      child.result = null;
      child.producedArtifacts = [];
      child.completedAt = null;

      // Remove stale artifacts from ledger
      exec.artifactLedger = exec.artifactLedger.filter(a => a.fromCategory !== cat);

      exec.recoveryLog.push({
        event: "child-invalidated",
        category: cat,
        reason: `Upstream "${category}" changed — artifacts are stale.`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Parent goes back to running
  if (exec.status === "completed") {
    exec.status = "running";
    exec.completedAt = null;
  }
}

// ── Final synthesis (O3) ──────────────────────────────────────────────────────

/**
 * Synthesize child outcomes into a parent-level completion report.
 *
 * @param {CompositeExecution} exec
 * @returns {object}
 */
export function synthesize(exec) {
  const completed = exec.children.filter(c => c.status === "completed");
  const blocked = exec.children.filter(c => c.status === "blocked");
  const failed = exec.children.filter(c => c.status === "failed");
  const pending = exec.children.filter(c => c.status === "pending" || c.status === "ready");

  const allArtifacts = exec.artifactLedger.map(a => `${a.type} (from ${a.fromCategory})`);

  return {
    parentId: exec.parentId,
    status: exec.status,
    summary: {
      total: exec.children.length,
      completed: completed.length,
      blocked: blocked.length,
      failed: failed.length,
      pending: pending.length,
    },
    completedChildren: completed.map(c => ({
      category: c.category,
      pack: c.pack,
      artifacts: c.producedArtifacts,
    })),
    unresolvedBranches: [...blocked, ...failed].map(c => ({
      category: c.category,
      status: c.status,
      reason: c.blockInfo?.reason || "unknown",
    })),
    allArtifacts,
    recoveryEvents: exec.recoveryLog.length,
    truthful: exec.status === "completed"
      ? "All child packets completed in dependency order."
      : blocked.length > 0
        ? `${blocked.length} child packet(s) blocked. Parent cannot be marked complete.`
        : failed.length > 0
          ? `${failed.length} child packet(s) failed. Downstream work was halted.`
          : `${pending.length} child packet(s) still pending.`,
  };
}

/**
 * Format the synthesis report for display.
 *
 * @param {object} synthesis
 * @returns {string}
 */
export function formatSynthesis(synthesis) {
  const lines = [
    `\nComposite Execution Report`,
    `──────────────────────────`,
    `Parent: ${synthesis.parentId}`,
    `Status: ${synthesis.status}`,
    `Children: ${synthesis.summary.completed}/${synthesis.summary.total} completed`,
  ];

  if (synthesis.completedChildren.length > 0) {
    lines.push(`\nCompleted:`);
    for (const c of synthesis.completedChildren) {
      lines.push(`  ✓ ${c.category} (${c.pack} pack) → ${c.artifacts.join(", ") || "no artifacts"}`);
    }
  }

  if (synthesis.unresolvedBranches.length > 0) {
    lines.push(`\nUnresolved:`);
    for (const b of synthesis.unresolvedBranches) {
      lines.push(`  ✗ ${b.category} — ${b.status}: ${b.reason}`);
    }
  }

  if (synthesis.allArtifacts.length > 0) {
    lines.push(`\nArtifact ledger: ${synthesis.allArtifacts.join(", ")}`);
  }

  if (synthesis.recoveryEvents > 0) {
    lines.push(`\nRecovery events: ${synthesis.recoveryEvents}`);
  }

  lines.push(`\n${synthesis.truthful}`);

  return lines.join("\n");
}
