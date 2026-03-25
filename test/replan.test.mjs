import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createChangeEvent,
  analyzeImpact,
  replan,
  formatReplan,
} from "../src/replan.mjs";
import { decompose, createRunPlan } from "../src/decompose.mjs";
import {
  initExecution,
  advance,
  startChild,
  completeChild,
} from "../src/composite.mjs";

function makeExec(categories) {
  const cats = categories.map((c, i) => ({
    category: c, pack: c, phase: i, signals: [],
  }));
  const plan = createRunPlan(decompose("test", cats));
  return initExecution(plan);
}

function runToCompletion(exec, categories) {
  for (const cat of categories) {
    advance(exec);
    startChild(exec, cat);
    completeChild(exec, cat, { artifacts: [`${cat}-output`] });
  }
}

// ── Change events ─────────────────────────────────────────────────────────────

describe("createChangeEvent", () => {
  it("creates a valid change event", () => {
    const event = createChangeEvent("scope-change", {
      description: "Feature scope expanded to include admin panel",
      affectedCategory: "build",
    });
    assert.equal(event.type, "scope-change");
    assert.equal(event.detail.affectedCategory, "build");
    assert.ok(event.timestamp);
  });

  it("rejects invalid change types", () => {
    assert.throws(() => createChangeEvent("invalid-type", {}), /Invalid change type/);
  });

  it("creates all 6 change types", () => {
    const types = ["scope-change", "artifact-changed", "new-requirement",
                   "review-finding", "dependency-discovered", "priority-change"];
    for (const type of types) {
      const event = createChangeEvent(type, { description: "test" });
      assert.equal(event.type, type);
    }
  });
});

// ── Impact analysis ───────────────────────────────────────────────────────────

describe("analyzeImpact", () => {
  it("scope change marks downstream as stale", () => {
    const exec = makeExec(["build", "docs", "launch"]);
    runToCompletion(exec, ["build", "docs", "launch"]);

    const event = createChangeEvent("scope-change", {
      description: "Scope changed",
      affectedCategory: "build",
    });
    const impact = analyzeImpact(exec, event);

    assert.ok(impact.staleChildren.includes("build")); // build itself is stale (scope changed)
    assert.ok(impact.staleChildren.includes("docs"));
    assert.ok(impact.staleChildren.includes("launch"));
  });

  it("new-requirement flags needsNewChild", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build", "docs"]);

    const event = createChangeEvent("new-requirement", {
      description: "Security review now required",
      newCategory: "security",
    });
    const impact = analyzeImpact(exec, event);

    assert.equal(impact.needsNewChild, true);
    assert.equal(impact.validChildren.length, 2); // existing work stays valid
  });

  it("review-finding marks downstream as stale", () => {
    const exec = makeExec(["build", "docs", "launch"]);
    runToCompletion(exec, ["build", "docs", "launch"]);

    const event = createChangeEvent("review-finding", {
      description: "Security finding in build output",
      affectedCategory: "build",
      newCategory: "security",
    });
    const impact = analyzeImpact(exec, event);

    assert.equal(impact.needsNewChild, true);
    assert.ok(impact.staleChildren.includes("docs"));
    assert.ok(impact.staleChildren.includes("launch"));
  });

  it("dependency-discovered flags reorder", () => {
    const exec = makeExec(["build", "docs"]);

    const event = createChangeEvent("dependency-discovered", {
      description: "Research needed before build",
      newCategory: "research",
    });
    const impact = analyzeImpact(exec, event);

    assert.equal(impact.needsNewChild, true);
    assert.equal(impact.needsReorder, true);
  });

  it("priority-change flags reorder without invalidating", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build", "docs"]);

    const event = createChangeEvent("priority-change", {
      description: "Docs now higher priority",
    });
    const impact = analyzeImpact(exec, event);

    assert.equal(impact.needsReorder, true);
    assert.equal(impact.validChildren.length, 2);
    assert.equal(impact.staleChildren.length, 0);
  });

  it("artifact-changed invalidates consumers", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build"]);
    // Manually set receivedArtifacts on docs
    advance(exec);
    exec.children[1].receivedArtifacts = ["build-output"];
    startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["docs-output"] });

    const event = createChangeEvent("artifact-changed", {
      description: "Build output changed",
      invalidatesArtifacts: ["build-output"],
    });
    const impact = analyzeImpact(exec, event);

    assert.ok(impact.staleChildren.includes("docs"));
    assert.ok(impact.staleArtifacts.includes("build-output"));
  });
});

// ── Selective replanning ──────────────────────────────────────────────────────

describe("replan", () => {
  it("invalidates stale children and preserves valid ones", () => {
    const exec = makeExec(["build", "docs", "launch"]);
    runToCompletion(exec, ["build", "docs", "launch"]);
    assert.equal(exec.status, "completed");

    const event = createChangeEvent("scope-change", {
      description: "Build scope changed",
      affectedCategory: "build",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);

    // docs and launch should be reopened
    assert.ok(result.diff.reopened.includes("docs"));
    assert.ok(result.diff.reopened.includes("launch"));
    assert.equal(exec.status, "running"); // parent reopened
  });

  it("inserts a new child packet", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build"]);

    const event = createChangeEvent("review-finding", {
      description: "Security finding requires new review",
      affectedCategory: "build",
      newCategory: "security",
      newPack: "security",
      insertAfter: "build",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);

    assert.ok(result.diff.inserted.includes("security"));
    assert.equal(exec.children.length, 3); // was 2, now 3
    assert.equal(exec.children[1].category, "security"); // inserted after build
    // docs now depends on security, not build
    assert.ok(exec.children[2].dependsOn.includes("security"));
  });

  it("preserves completed work not affected by the change", () => {
    const exec = makeExec(["research", "build", "docs"]);
    runToCompletion(exec, ["research", "build", "docs"]);

    const event = createChangeEvent("scope-change", {
      description: "Docs scope changed",
      affectedCategory: "docs",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);

    assert.ok(result.diff.preserved.includes("research"));
    assert.ok(result.diff.preserved.includes("build"));
  });

  it("removes stale artifacts from ledger", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build", "docs"]);
    assert.equal(exec.artifactLedger.length, 2);

    const event = createChangeEvent("scope-change", {
      description: "Build scope changed",
      affectedCategory: "build",
    });
    const impact = analyzeImpact(exec, event);
    replan(exec, impact, event);

    // docs artifacts removed, build artifacts remain
    assert.ok(exec.artifactLedger.every(a => a.fromCategory !== "docs"));
  });

  it("execution resumes from next valid child after replan", () => {
    const exec = makeExec(["build", "docs", "launch"]);
    runToCompletion(exec, ["build", "docs", "launch"]);

    const event = createChangeEvent("scope-change", {
      description: "Docs need updating",
      affectedCategory: "docs",
    });
    const impact = analyzeImpact(exec, event);
    replan(exec, impact, event);

    // docs and launch are pending again, build is complete
    const next = advance(exec);
    assert.ok(next);
    assert.equal(next.child.category, "docs");
  });

  it("handles the real-world scenario: feature + security finding mid-run", () => {
    // Start with feature → docs → launch
    const exec = makeExec(["build", "docs", "launch"]);
    runToCompletion(exec, ["build"]);

    // Mid-run: security finding from build output
    const event = createChangeEvent("review-finding", {
      description: "Prompt injection vulnerability found in build output",
      affectedCategory: "build",
      newCategory: "security",
      newPack: "security",
      insertAfter: "build",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);

    // Security inserted after build, before docs
    assert.ok(result.diff.inserted.includes("security"));
    assert.equal(exec.children[1].category, "security");

    // Build stays completed (the finding came from it, it's not invalidated)
    assert.equal(exec.children[0].status, "completed");

    // Security is now the next actionable child
    const next = advance(exec);
    assert.ok(next);
    assert.equal(next.child.category, "security");
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatReplan", () => {
  it("formats a replan with actions", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build", "docs"]);

    const event = createChangeEvent("scope-change", {
      description: "Build scope changed",
      affectedCategory: "build",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);
    const output = formatReplan(result);

    assert.ok(output.includes("Adaptive Replan"));
    assert.ok(output.includes("scope-change"));
    assert.ok(output.includes("Reopened"));
  });

  it("formats insertion", () => {
    const exec = makeExec(["build", "docs"]);
    runToCompletion(exec, ["build"]);

    const event = createChangeEvent("new-requirement", {
      description: "Security review required",
      newCategory: "security",
      newPack: "security",
      insertAfter: "build",
    });
    const impact = analyzeImpact(exec, event);
    const result = replan(exec, impact, event);
    const output = formatReplan(result);

    assert.ok(output.includes("Inserted"));
    assert.ok(output.includes("security"));
  });

  it("formats no-change scenario", () => {
    const exec = makeExec(["build"]);
    const event = createChangeEvent("priority-change", {
      description: "No real change",
    });
    const impact = analyzeImpact(exec, event);
    // No stale, no new child needed
    impact.needsReorder = false;
    const result = replan(exec, impact, event);
    const output = formatReplan(result);
    assert.ok(output.includes("No changes needed") || output.includes("Reorder suggested"));
  });
});
