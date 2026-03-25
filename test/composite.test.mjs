import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARTIFACT_CONTRACTS,
  initExecution,
  advance,
  startChild,
  completeChild,
  blockChild,
  recoverChild,
  failChild,
  invalidateDownstream,
  synthesize,
  formatSynthesis,
} from "../src/composite.mjs";
import { decompose, createRunPlan } from "../src/decompose.mjs";

function makePlan(categories) {
  const cats = categories.map((c, i) => ({
    category: c,
    pack: ARTIFACT_CONTRACTS[c] ? c : "feature",
    phase: i,
    signals: [],
  }));
  const decomposition = decompose("test", cats);
  return createRunPlan(decomposition);
}

// ── Artifact contracts ────────────────────────────────────────────────────────

describe("ARTIFACT_CONTRACTS", () => {
  it("defines contracts for all 7 categories", () => {
    const categories = ["research", "build", "bugfix", "security", "docs", "launch", "treatment"];
    for (const cat of categories) {
      assert.ok(ARTIFACT_CONTRACTS[cat], `Missing contract for ${cat}`);
      assert.ok(Array.isArray(ARTIFACT_CONTRACTS[cat].produces));
      assert.ok(Array.isArray(ARTIFACT_CONTRACTS[cat].expects));
    }
  });

  it("research expects nothing (it goes first)", () => {
    assert.equal(ARTIFACT_CONTRACTS.research.expects.length, 0);
  });

  it("launch expects implementation and documentation", () => {
    assert.ok(ARTIFACT_CONTRACTS.launch.expects.includes("implementation"));
    assert.ok(ARTIFACT_CONTRACTS.launch.expects.includes("documentation"));
  });
});

// ── O1: Dependency-driven execution ───────────────────────────────────────────

describe("initExecution", () => {
  it("creates execution with pending children", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    assert.equal(exec.status, "pending");
    assert.equal(exec.children.length, 2);
    assert.ok(exec.children.every(c => c.status === "pending"));
    assert.equal(exec.artifactLedger.length, 0);
  });
});

describe("advance", () => {
  it("returns first child when no dependencies", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    const next = advance(exec);
    assert.ok(next);
    assert.equal(next.child.category, "build");
    assert.equal(next.child.status, "ready");
  });

  it("blocks second child until first completes", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec); // build becomes ready
    startChild(exec, "build");

    const next = advance(exec);
    assert.equal(next, null); // docs can't start yet
  });

  it("advances to second child after first completes", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation", "code-changes"] });

    const next = advance(exec);
    assert.ok(next);
    assert.equal(next.child.category, "docs");
    assert.ok(next.artifacts.length > 0);
  });

  it("passes artifacts from upstream to downstream", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation", "test-results"] });

    const next = advance(exec);
    assert.ok(next.artifacts.some(a => a.type === "implementation"));
    assert.ok(next.artifacts.some(a => a.fromCategory === "build"));
  });

  it("returns null when all children complete", () => {
    const plan = makePlan(["build"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });

    const next = advance(exec);
    assert.equal(next, null);
    assert.equal(exec.status, "completed");
  });

  it("marks parent as running on first advance", () => {
    const plan = makePlan(["build"]);
    const exec = initExecution(plan);
    assert.equal(exec.status, "pending");
    advance(exec);
    assert.equal(exec.status, "running");
    assert.ok(exec.startedAt);
  });
});

describe("completeChild", () => {
  it("records artifacts in the ledger", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation", "code-changes", "test-results"] });

    assert.equal(exec.artifactLedger.length, 3);
    assert.ok(exec.artifactLedger.every(a => a.fromCategory === "build"));
  });

  it("marks parent completed when all children finish", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec);
    startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });

    advance(exec);
    startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation"] });

    assert.equal(exec.status, "completed");
    assert.ok(exec.completedAt);
  });
});

// ── O2: Branch recovery ───────────────────────────────────────────────────────

describe("blockChild", () => {
  it("blocks a child and marks parent blocked", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });

    assert.equal(exec.children[0].status, "blocked");
    assert.equal(exec.status, "blocked");
    assert.equal(exec.recoveryLog.length, 1);
  });

  it("downstream children stay pending when upstream is blocked", () => {
    const plan = makePlan(["build", "docs", "launch"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });

    const next = advance(exec);
    assert.equal(next, null); // docs and launch can't proceed
  });
});

describe("recoverChild", () => {
  it("recovers a blocked child and resumes execution", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });
    recoverChild(exec, "build");

    assert.equal(exec.children[0].status, "pending");
    assert.equal(exec.status, "running");
    assert.equal(exec.recoveryLog.length, 2); // blocked + recovered
  });

  it("allows downstream to advance after recovery and completion", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });
    recoverChild(exec, "build");

    // Now build can advance again
    const next = advance(exec);
    assert.ok(next);
    assert.equal(next.child.category, "build");
  });
});

describe("failChild", () => {
  it("fails a child and marks downstream as failed too", () => {
    const plan = makePlan(["build", "docs", "launch"]);
    const exec = initExecution(plan);
    advance(exec);
    startChild(exec, "build");
    failChild(exec, "build", "Unrecoverable error");

    assert.equal(exec.children[0].status, "failed");
    assert.equal(exec.children[1].status, "failed"); // docs depends on build
    assert.equal(exec.children[2].status, "failed"); // launch depends on docs
    assert.equal(exec.status, "failed");
  });

  it("only fails transitive dependents, not unrelated children", () => {
    // Simulate two independent branches by creating a plan manually
    const exec = initExecution({
      parentId: "test-branch",
      children: [
        { category: "build", pack: "feature", dependsOn: [] },
        { category: "security", pack: "security", dependsOn: [] },
        { category: "docs", pack: "docs", dependsOn: ["build"] },
      ],
      dependencyOrder: ["build", "security", "docs"],
    });

    advance(exec); // build ready
    startChild(exec, "build");
    failChild(exec, "build", "Build failed");

    assert.equal(exec.children[0].status, "failed"); // build
    assert.equal(exec.children[1].status, "pending"); // security — independent
    assert.equal(exec.children[2].status, "failed"); // docs — depends on build
  });
});

// ── Invalidation ──────────────────────────────────────────────────────────────

describe("invalidateDownstream", () => {
  it("resets completed downstream children when upstream changes", () => {
    const plan = makePlan(["build", "docs", "launch"]);
    const exec = initExecution(plan);

    // Complete the full chain
    advance(exec); startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });
    advance(exec); startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation"] });
    advance(exec); startChild(exec, "launch");
    completeChild(exec, "launch", { artifacts: ["release-notes"] });

    assert.equal(exec.status, "completed");

    // Build changes — invalidate downstream
    invalidateDownstream(exec, "build");

    assert.equal(exec.children[0].status, "completed"); // build itself stays
    assert.equal(exec.children[1].status, "pending"); // docs reset
    assert.equal(exec.children[2].status, "pending"); // launch reset
    assert.equal(exec.status, "running"); // parent reopened
  });

  it("removes stale artifacts from ledger", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });
    advance(exec); startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation", "changelog-entry"] });

    assert.equal(exec.artifactLedger.length, 3);

    invalidateDownstream(exec, "build");
    // docs artifacts should be removed
    assert.ok(exec.artifactLedger.every(a => a.fromCategory !== "docs"));
    assert.equal(exec.artifactLedger.length, 1); // only build's artifact remains
  });
});

// ── O3: Final synthesis ───────────────────────────────────────────────────────

describe("synthesize", () => {
  it("produces truthful report for completed execution", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });
    advance(exec); startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation"] });

    const report = synthesize(exec);
    assert.equal(report.status, "completed");
    assert.equal(report.summary.completed, 2);
    assert.equal(report.summary.blocked, 0);
    assert.equal(report.unresolvedBranches.length, 0);
    assert.ok(report.truthful.includes("All child packets completed"));
  });

  it("produces truthful report for blocked execution", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });

    const report = synthesize(exec);
    assert.equal(report.status, "blocked");
    assert.equal(report.summary.blocked, 1);
    assert.equal(report.unresolvedBranches.length, 1);
    assert.ok(report.truthful.includes("blocked"));
  });

  it("produces truthful report for failed execution", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    failChild(exec, "build", "Unrecoverable");

    const report = synthesize(exec);
    assert.equal(report.status, "failed");
    assert.equal(report.summary.failed, 2); // build + docs (downstream)
    assert.ok(report.truthful.includes("failed"));
  });

  it("lists all artifacts in the ledger", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation", "test-results"] });
    advance(exec); startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation"] });

    const report = synthesize(exec);
    assert.equal(report.allArtifacts.length, 3);
  });

  it("counts recovery events", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);

    advance(exec); startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });
    recoverChild(exec, "build");

    const report = synthesize(exec);
    assert.equal(report.recoveryEvents, 2);
  });
});

describe("formatSynthesis", () => {
  it("formats completed execution", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec); startChild(exec, "build");
    completeChild(exec, "build", { artifacts: ["implementation"] });
    advance(exec); startChild(exec, "docs");
    completeChild(exec, "docs", { artifacts: ["documentation"] });

    const report = synthesize(exec);
    const output = formatSynthesis(report);
    assert.ok(output.includes("Composite Execution Report"));
    assert.ok(output.includes("2/2 completed"));
    assert.ok(output.includes("✓ build"));
    assert.ok(output.includes("✓ docs"));
  });

  it("formats execution with unresolved branches", () => {
    const plan = makePlan(["build", "docs"]);
    const exec = initExecution(plan);
    advance(exec); startChild(exec, "build");
    blockChild(exec, "build", { reason: "Missing spec", recoveryType: "retry" });

    const report = synthesize(exec);
    const output = formatSynthesis(report);
    assert.ok(output.includes("Unresolved"));
    assert.ok(output.includes("✗ build"));
    assert.ok(output.includes("Missing spec"));
  });
});
