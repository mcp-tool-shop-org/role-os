/**
 * Mixed-Task Decomposition — Phase N
 *
 * Detects composite work early, splits it into the right packets,
 * assigns packs/roles to each slice, and preserves dependencies.
 *
 * Failure mode this solves: treating one messy task like one job
 * when it is actually several (feature + docs, bugfix + release,
 * research + product framing, security + treatment).
 */

import { suggestPack } from "./packs.mjs";

// ── Subtask categories ────────────────────────────────────────────────────────

const SUBTASK_CATEGORIES = {
  build: {
    signals: ["implement", "add feature", "create command", "build", "code", "develop", "ship feature"],
    pack: "feature",
    phase: 1,
  },
  bugfix: {
    signals: ["fix", "bug", "crash", "broken", "repair", "regression", "patch"],
    pack: "bugfix",
    phase: 1,
  },
  security: {
    signals: ["security review", "vulnerability", "injection", "threat model", "audit security", "CVE"],
    pack: "security",
    phase: 2,
  },
  docs: {
    signals: ["documentation", "handbook", "readme", "update docs", "write docs", "add page"],
    pack: "docs",
    phase: 3,
  },
  research: {
    signals: ["research", "should we", "evaluate", "assess whether", "competitive analysis", "investigate"],
    pack: "research",
    phase: 0, // research goes first when present
  },
  launch: {
    signals: ["launch", "announce", "release notes", "social post", "messaging", "publish announcement"],
    pack: "launch",
    phase: 4,
  },
  treatment: {
    signals: ["treatment", "repo polish", "pre-release", "ship-ready", "housekeeping", "cleanup"],
    pack: "treatment",
    phase: 3,
  },
};

// ── Composite signals (structural patterns that suggest multiple tasks) ──────

const COMPOSITE_CONNECTORS = [
  /\band\s+(?:then|also|additionally)\b/i,
  /\bafter\s+that\b/i,
  /\bplus\b/i,
  /\bas\s+well\s+as\b/i,
  /\bthen\s+(?:write|update|create|run|do)\b/i,
  /\balso\s+(?:need|want|should|must)\b/i,
];

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * Detect whether a packet contains composite work.
 *
 * @param {string} content - Packet markdown content
 * @returns {{
 *   isComposite: boolean,
 *   confidence: "high" | "medium" | "low",
 *   detectedCategories: { category: string, signals: string[], pack: string }[],
 *   hasConnectors: boolean,
 *   reason: string
 * }}
 */
export function detectComposite(content) {
  const lower = content.toLowerCase();

  // Find matching categories
  const detectedCategories = [];
  for (const [category, def] of Object.entries(SUBTASK_CATEGORIES)) {
    const matchedSignals = def.signals.filter(s => lower.includes(s.toLowerCase()));
    if (matchedSignals.length > 0) {
      detectedCategories.push({
        category,
        signals: matchedSignals,
        pack: def.pack,
        phase: def.phase,
      });
    }
  }

  // Check for structural connectors
  const hasConnectors = COMPOSITE_CONNECTORS.some(re => re.test(content));

  // Determine if composite
  const categoryCount = detectedCategories.length;

  if (categoryCount <= 1) {
    return {
      isComposite: false,
      confidence: "high",
      detectedCategories,
      hasConnectors,
      reason: categoryCount === 0
        ? "No recognized subtask categories detected."
        : `Single category detected: ${detectedCategories[0].category}.`,
    };
  }

  // Multiple categories detected
  let confidence;
  let reason;

  if (categoryCount >= 3 || (categoryCount >= 2 && hasConnectors)) {
    confidence = "high";
    reason = `${categoryCount} distinct subtask categories detected${hasConnectors ? " with structural connectors" : ""}. Recommend splitting.`;
  } else if (categoryCount === 2 && !hasConnectors) {
    confidence = "medium";
    reason = `${categoryCount} categories detected without explicit connectors. May be composite or just a broad single task.`;
  } else {
    confidence = "low";
    reason = "Ambiguous — multiple weak signals.";
  }

  return {
    isComposite: categoryCount >= 2,
    confidence,
    detectedCategories,
    hasConnectors,
    reason,
  };
}

// ── Decomposition ─────────────────────────────────────────────────────────────

/**
 * Decompose a composite task into linked child packets.
 *
 * @param {string} content - Original packet content
 * @param {{ category: string, signals: string[], pack: string, phase: number }[]} categories
 * @returns {{
 *   parentId: string,
 *   children: { id: string, category: string, pack: string, dependsOn: string[], phase: number }[],
 *   dependencyOrder: string[],
 *   handoffChain: string,
 * }}
 */
export function decompose(content, categories) {
  const parentId = `parent-${Date.now()}`;

  // Sort by phase (research first, launch last)
  const sorted = [...categories].sort((a, b) => a.phase - b.phase);

  const children = sorted.map((cat, i) => {
    const id = `${parentId}-${cat.category}`;
    const dependsOn = i > 0 ? [sorted[i - 1].category] : [];

    return {
      id,
      category: cat.category,
      pack: cat.pack,
      dependsOn,
      phase: cat.phase,
    };
  });

  const dependencyOrder = children.map(c => c.category);

  const handoffChain = children
    .map(c => `${c.category} (${c.pack} pack)`)
    .join(" → ");

  return {
    parentId,
    children,
    dependencyOrder,
    handoffChain,
  };
}

// ── Parent run plan ───────────────────────────────────────────────────────────

/**
 * Create a parent run plan with completion tracking.
 *
 * @param {object} decomposition - Output from decompose()
 * @returns {object}
 */
export function createRunPlan(decomposition) {
  return {
    parentId: decomposition.parentId,
    status: "pending",
    children: decomposition.children.map(child => ({
      ...child,
      status: "pending",
      escalations: 0,
      completedAt: null,
    })),
    dependencyOrder: decomposition.dependencyOrder,
    handoffChain: decomposition.handoffChain,
    completionCondition: "All child packets must be completed in dependency order.",
    escalationRollup: "Any child blocked or failed blocks the parent.",
  };
}

/**
 * Update a child's status in the run plan.
 *
 * @param {object} plan
 * @param {string} category
 * @param {"pending"|"running"|"completed"|"blocked"|"failed"} status
 * @returns {object} Updated plan
 */
export function updateChildStatus(plan, category, status) {
  const child = plan.children.find(c => c.category === category);
  if (!child) return plan;

  child.status = status;
  if (status === "completed") {
    child.completedAt = new Date().toISOString();
  }

  // Update parent status
  const allCompleted = plan.children.every(c => c.status === "completed");
  const anyBlocked = plan.children.some(c => c.status === "blocked" || c.status === "failed");

  if (allCompleted) plan.status = "completed";
  else if (anyBlocked) plan.status = "blocked";
  else if (plan.children.some(c => c.status === "running")) plan.status = "running";

  return plan;
}

/**
 * Get the next actionable child in the plan.
 *
 * @param {object} plan
 * @returns {{ child: object, reason: string } | null}
 */
export function getNextChild(plan) {
  for (const child of plan.children) {
    if (child.status !== "pending") continue;

    // Check dependencies
    const depsComplete = child.dependsOn.every(dep => {
      const depChild = plan.children.find(c => c.category === dep);
      return depChild && depChild.status === "completed";
    });

    if (depsComplete) {
      return {
        child,
        reason: child.dependsOn.length === 0
          ? `${child.category} has no dependencies — ready to start.`
          : `Dependencies complete: ${child.dependsOn.join(", ")}.`,
      };
    }
  }
  return null;
}

// ── Format ────────────────────────────────────────────────────────────────────

/**
 * Format decomposition result for display.
 *
 * @param {object} detection - Output from detectComposite()
 * @param {object} [decomposition] - Output from decompose() (if composite)
 * @returns {string}
 */
export function formatDecomposition(detection, decomposition) {
  const lines = [];

  if (!detection.isComposite) {
    lines.push(`Task type: single`);
    lines.push(`  ${detection.reason}`);
    return lines.join("\n");
  }

  lines.push(`Task type: composite (${detection.confidence} confidence)`);
  lines.push(`  ${detection.reason}`);
  lines.push(``);
  lines.push(`Detected subtasks:`);
  for (const cat of detection.detectedCategories) {
    lines.push(`  ${cat.category} → ${cat.pack} pack (signals: ${cat.signals.join(", ")})`);
  }

  if (decomposition) {
    lines.push(``);
    lines.push(`Recommended split:`);
    lines.push(`  ${decomposition.handoffChain}`);
    lines.push(``);
    lines.push(`Dependency order:`);
    for (const child of decomposition.children) {
      const deps = child.dependsOn.length > 0 ? ` (after: ${child.dependsOn.join(", ")})` : " (no dependencies)";
      lines.push(`  ${child.category}${deps}`);
    }
  }

  if (detection.confidence === "medium" || detection.confidence === "low") {
    lines.push(``);
    lines.push(`⚠ Confidence is ${detection.confidence}. Consider whether this is truly composite`);
    lines.push(`  or just a broad single task. Use --no-split to force single-packet routing.`);
  }

  return lines.join("\n");
}
