/**
 * Adaptive Replanning — Phase P
 *
 * When reality changes mid-run, revise the plan without collapsing
 * into manual rescue or restarting everything. Preserve valid work,
 * reopen stale work, insert missing branches, keep the run truthful.
 */

import { ARTIFACT_CONTRACTS, invalidateDownstream } from "./composite.mjs";

// ── Change events ─────────────────────────────────────────────────────────────

/**
 * @typedef {"scope-change"|"artifact-changed"|"new-requirement"|"review-finding"|"dependency-discovered"|"priority-change"} ChangeType
 */

/**
 * Create a structured change event.
 *
 * @param {ChangeType} type
 * @param {object} detail
 * @returns {object}
 */
export function createChangeEvent(type, detail) {
  const VALID_TYPES = [
    "scope-change",
    "artifact-changed",
    "new-requirement",
    "review-finding",
    "dependency-discovered",
    "priority-change",
  ];

  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid change type: "${type}". Valid types: ${VALID_TYPES.join(", ")}`);
  }

  return {
    type,
    detail: {
      description: detail.description || "",
      affectedCategory: detail.affectedCategory || null,
      newCategory: detail.newCategory || null,
      newPack: detail.newPack || null,
      insertAfter: detail.insertAfter || null,
      invalidatesArtifacts: detail.invalidatesArtifacts || [],
      ...detail,
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Impact analysis ───────────────────────────────────────────────────────────

/**
 * Analyze the impact of a change event on a composite execution.
 *
 * @param {object} exec - CompositeExecution from composite.mjs
 * @param {object} changeEvent
 * @returns {{
 *   validChildren: string[],
 *   staleChildren: string[],
 *   staleArtifacts: string[],
 *   needsNewChild: boolean,
 *   needsReorder: boolean,
 *   needsPackChange: boolean,
 *   summary: string,
 * }}
 */
export function analyzeImpact(exec, changeEvent) {
  const { type, detail } = changeEvent;
  const validChildren = [];
  const staleChildren = [];
  const staleArtifacts = [];
  let needsNewChild = false;
  let needsReorder = false;
  let needsPackChange = false;

  switch (type) {
    case "scope-change": {
      // Scope change affects everything downstream of the affected category
      const affected = detail.affectedCategory;
      if (affected) {
        for (const child of exec.children) {
          if (child.category === affected || isDependentOn(exec, child.category, affected)) {
            if (child.status === "completed") {
              staleChildren.push(child.category);
              staleArtifacts.push(...child.producedArtifacts);
            }
          } else {
            if (child.status === "completed") validChildren.push(child.category);
          }
        }
      }
      break;
    }

    case "artifact-changed": {
      // Specific artifacts are invalidated
      for (const artifactType of detail.invalidatesArtifacts) {
        const producer = exec.artifactLedger.find(a => a.type === artifactType);
        if (producer) {
          staleArtifacts.push(artifactType);
          // Find consumers of this artifact
          for (const child of exec.children) {
            if (child.receivedArtifacts?.includes(artifactType) && child.status === "completed") {
              staleChildren.push(child.category);
            }
          }
        }
      }
      // Everything not stale is valid
      for (const child of exec.children) {
        if (child.status === "completed" && !staleChildren.includes(child.category)) {
          validChildren.push(child.category);
        }
      }
      break;
    }

    case "new-requirement": {
      needsNewChild = !!detail.newCategory;
      // Existing completed work stays valid unless the new requirement
      // changes what they depend on
      for (const child of exec.children) {
        if (child.status === "completed") validChildren.push(child.category);
      }
      break;
    }

    case "review-finding": {
      // A review finding typically requires inserting a new branch
      needsNewChild = !!detail.newCategory;
      // The category that produced the finding is valid (the finding came FROM it)
      // Downstream might need revalidation
      if (detail.affectedCategory) {
        for (const child of exec.children) {
          if (isDependentOn(exec, child.category, detail.affectedCategory) && child.status === "completed") {
            staleChildren.push(child.category);
          }
        }
      }
      for (const child of exec.children) {
        if (child.status === "completed" && !staleChildren.includes(child.category)) {
          validChildren.push(child.category);
        }
      }
      break;
    }

    case "dependency-discovered": {
      // A missing prerequisite was found — may need reorder or new child
      needsNewChild = !!detail.newCategory;
      needsReorder = true;
      for (const child of exec.children) {
        if (child.status === "completed") validChildren.push(child.category);
      }
      break;
    }

    case "priority-change": {
      needsReorder = true;
      // Priority change doesn't invalidate completed work
      for (const child of exec.children) {
        if (child.status === "completed") validChildren.push(child.category);
      }
      break;
    }
  }

  const summaryParts = [];
  if (validChildren.length > 0) summaryParts.push(`${validChildren.length} children still valid`);
  if (staleChildren.length > 0) summaryParts.push(`${staleChildren.length} children stale`);
  if (staleArtifacts.length > 0) summaryParts.push(`${staleArtifacts.length} artifacts invalidated`);
  if (needsNewChild) summaryParts.push("new child packet needed");
  if (needsReorder) summaryParts.push("reorder needed");

  return {
    validChildren,
    staleChildren,
    staleArtifacts,
    needsNewChild,
    needsReorder,
    needsPackChange,
    summary: summaryParts.join("; ") || "No impact detected.",
  };
}

// ── Selective replanning ──────────────────────────────────────────────────────

/**
 * Apply a replan to a composite execution. Returns the plan diff.
 *
 * @param {object} exec - CompositeExecution
 * @param {object} impact - From analyzeImpact()
 * @param {object} changeEvent
 * @returns {{ actions: object[], diff: object }}
 */
export function replan(exec, impact, changeEvent) {
  const actions = [];
  const before = snapshotState(exec);

  // 1. Invalidate stale children
  if (impact.staleChildren.length > 0) {
    for (const cat of impact.staleChildren) {
      const child = exec.children.find(c => c.category === cat);
      if (child && child.status === "completed") {
        child.status = "pending";
        child.result = null;
        child.producedArtifacts = [];
        child.completedAt = null;

        // Remove stale artifacts
        exec.artifactLedger = exec.artifactLedger.filter(a => a.fromCategory !== cat);

        actions.push({
          action: "invalidate",
          category: cat,
          reason: `Stale due to ${changeEvent.type}: ${changeEvent.detail.description}`,
        });
      }
    }
  }

  // 2. Insert new child if needed
  if (impact.needsNewChild && changeEvent.detail.newCategory) {
    const newCat = changeEvent.detail.newCategory;
    const existing = exec.children.find(c => c.category === newCat);

    if (!existing) {
      const insertAfter = changeEvent.detail.insertAfter;
      const contract = ARTIFACT_CONTRACTS[newCat];

      const newChild = {
        category: newCat,
        pack: changeEvent.detail.newPack || newCat,
        status: "pending",
        dependsOn: insertAfter ? [insertAfter] : [],
        producedArtifacts: [],
        receivedArtifacts: [],
        result: null,
        blockInfo: null,
        startedAt: null,
        completedAt: null,
      };

      // Insert after the specified position
      if (insertAfter) {
        const idx = exec.children.findIndex(c => c.category === insertAfter);
        exec.children.splice(idx + 1, 0, newChild);

        // Update dependencies: children that depended on insertAfter now depend on newCat
        for (const child of exec.children) {
          if (child.category !== newCat && child.dependsOn.includes(insertAfter)) {
            child.dependsOn = child.dependsOn.map(d => d === insertAfter ? newCat : d);
          }
        }
        // The new child depends on insertAfter
        newChild.dependsOn = [insertAfter];
      } else {
        exec.children.push(newChild);
      }

      exec.dependencyOrder = exec.children.map(c => c.category);

      actions.push({
        action: "insert",
        category: newCat,
        pack: newChild.pack,
        insertAfter: insertAfter || "end",
        reason: changeEvent.detail.description,
      });
    }
  }

  // 3. Reorder if needed
  if (impact.needsReorder && !impact.needsNewChild) {
    // Simple reorder: move priority-changed category earlier
    // For now, this is recorded as an action but the actual reorder
    // requires operator confirmation since it may change semantics
    actions.push({
      action: "reorder-suggested",
      reason: changeEvent.detail.description,
      note: "Reorder requires operator confirmation.",
    });
  }

  // Reset parent status
  if (exec.status === "completed") {
    exec.status = "running";
    exec.completedAt = null;
  }

  const after = snapshotState(exec);

  return {
    actions,
    diff: buildDiff(before, after, changeEvent),
  };
}

// ── Plan diff ─────────────────────────────────────────────────────────────────

function snapshotState(exec) {
  return {
    childCount: exec.children.length,
    categories: exec.children.map(c => c.category),
    statuses: Object.fromEntries(exec.children.map(c => [c.category, c.status])),
    artifactCount: exec.artifactLedger.length,
    parentStatus: exec.status,
  };
}

function buildDiff(before, after, changeEvent) {
  const changes = [];

  // New children
  const added = after.categories.filter(c => !before.categories.includes(c));
  if (added.length > 0) changes.push(`Added: ${added.join(", ")}`);

  // Status changes
  for (const cat of before.categories) {
    if (before.statuses[cat] !== after.statuses[cat]) {
      changes.push(`${cat}: ${before.statuses[cat]} → ${after.statuses[cat]}`);
    }
  }

  // Artifact changes
  if (before.artifactCount !== after.artifactCount) {
    changes.push(`Artifacts: ${before.artifactCount} → ${after.artifactCount}`);
  }

  return {
    trigger: changeEvent.type,
    description: changeEvent.detail.description,
    changes,
    preserved: before.categories.filter(c => before.statuses[c] === "completed" && after.statuses[c] === "completed"),
    reopened: before.categories.filter(c => before.statuses[c] === "completed" && after.statuses[c] === "pending"),
    inserted: added,
  };
}

/**
 * Format a plan diff for display.
 *
 * @param {object} result - From replan()
 * @returns {string}
 */
export function formatReplan(result) {
  const lines = [
    `\nAdaptive Replan`,
    `───────────────`,
    `Trigger: ${result.diff.trigger}`,
    `Reason: ${result.diff.description}`,
  ];

  if (result.actions.length === 0) {
    lines.push(`\nNo changes needed.`);
    return lines.join("\n");
  }

  lines.push(`\nActions taken:`);
  for (const a of result.actions) {
    if (a.action === "invalidate") {
      lines.push(`  ↻ ${a.category} — reopened (${a.reason})`);
    } else if (a.action === "insert") {
      lines.push(`  + ${a.category} (${a.pack} pack) — inserted after ${a.insertAfter}`);
    } else if (a.action === "reorder-suggested") {
      lines.push(`  ⚠ Reorder suggested — ${a.reason}`);
    }
  }

  if (result.diff.preserved.length > 0) {
    lines.push(`\nPreserved (still valid):`);
    for (const c of result.diff.preserved) {
      lines.push(`  ✓ ${c}`);
    }
  }

  if (result.diff.reopened.length > 0) {
    lines.push(`\nReopened (stale):`);
    for (const c of result.diff.reopened) {
      lines.push(`  ↻ ${c}`);
    }
  }

  if (result.diff.inserted.length > 0) {
    lines.push(`\nInserted:`);
    for (const c of result.diff.inserted) {
      lines.push(`  + ${c}`);
    }
  }

  return lines.join("\n");
}

// ── Helper ────────────────────────────────────────────────────────────────────

function isDependentOn(exec, category, upstream) {
  const child = exec.children.find(c => c.category === category);
  if (!child) return false;
  if (child.dependsOn.includes(upstream)) return true;
  return child.dependsOn.some(dep => isDependentOn(exec, dep, upstream));
}
