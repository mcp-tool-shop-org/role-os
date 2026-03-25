import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectComposite,
  decompose,
  createRunPlan,
  updateChildStatus,
  getNextChild,
  formatDecomposition,
} from "../src/decompose.mjs";

// ── Detection ─────────────────────────────────────────────────────────────────

describe("detectComposite", () => {
  it("detects single-category tasks", () => {
    const result = detectComposite("Implement a new CLI command for listing packs");
    assert.equal(result.isComposite, false);
    assert.equal(result.detectedCategories.length, 1);
    assert.equal(result.detectedCategories[0].category, "build");
  });

  it("detects composite: feature + docs", () => {
    const result = detectComposite(
      "Implement the roleos execute command and then write the handbook page for it"
    );
    assert.equal(result.isComposite, true);
    assert.ok(result.detectedCategories.some(c => c.category === "build"));
    assert.ok(result.detectedCategories.some(c => c.category === "docs"));
  });

  it("detects composite: bugfix + launch", () => {
    const result = detectComposite(
      "Fix the crash in roleos route and then announce the patch with release notes"
    );
    assert.equal(result.isComposite, true);
    assert.ok(result.detectedCategories.some(c => c.category === "bugfix"));
    assert.ok(result.detectedCategories.some(c => c.category === "launch"));
  });

  it("detects composite: research + build", () => {
    const result = detectComposite(
      "Research whether we should add game dev roles and then implement the Playtester role"
    );
    assert.equal(result.isComposite, true);
    assert.ok(result.detectedCategories.some(c => c.category === "research"));
    assert.ok(result.detectedCategories.some(c => c.category === "build"));
  });

  it("detects composite: security + treatment", () => {
    const result = detectComposite(
      "Run a security review on dispatch.mjs and also do a pre-release treatment pass"
    );
    assert.equal(result.isComposite, true);
    assert.ok(result.detectedCategories.some(c => c.category === "security"));
    assert.ok(result.detectedCategories.some(c => c.category === "treatment"));
  });

  it("detects high confidence when 3+ categories", () => {
    const result = detectComposite(
      "Implement the feature, update the documentation, and then announce the launch"
    );
    assert.equal(result.isComposite, true);
    assert.equal(result.confidence, "high");
    assert.ok(result.detectedCategories.length >= 3);
  });

  it("detects high confidence when 2 categories + connectors", () => {
    const result = detectComposite(
      "Fix the bug and then write the release notes for the patch"
    );
    assert.equal(result.isComposite, true);
    assert.equal(result.confidence, "high");
    assert.equal(result.hasConnectors, true);
  });

  it("detects medium confidence when 2 categories without connectors", () => {
    const result = detectComposite(
      "Run a security review. The handbook could use some updating."
    );
    assert.equal(result.isComposite, true);
    assert.equal(result.confidence, "medium");
  });

  it("detects structural connectors", () => {
    const result = detectComposite("Build the feature and then update docs");
    assert.equal(result.hasConnectors, true);
  });

  it("returns no categories for ambiguous content", () => {
    const result = detectComposite("Think about the project direction");
    assert.equal(result.isComposite, false);
    assert.equal(result.detectedCategories.length, 0);
  });

  it("does not false-positive on 'integration testing'", () => {
    const result = detectComposite("Write integration testing for the route module");
    // Should not detect 'build' from 'implement' — only from actual build signals
    assert.equal(result.isComposite, false);
  });
});

// ── Decomposition ─────────────────────────────────────────────────────────────

describe("decompose", () => {
  it("creates child packets sorted by phase", () => {
    const categories = [
      { category: "launch", pack: "launch", phase: 4, signals: ["announce"] },
      { category: "build", pack: "feature", phase: 1, signals: ["implement"] },
      { category: "docs", pack: "docs", phase: 3, signals: ["documentation"] },
    ];
    const result = decompose("test content", categories);
    assert.equal(result.children.length, 3);
    assert.equal(result.children[0].category, "build");  // phase 1
    assert.equal(result.children[1].category, "docs");    // phase 3
    assert.equal(result.children[2].category, "launch");  // phase 4
  });

  it("sets dependencies based on order", () => {
    const categories = [
      { category: "build", pack: "feature", phase: 1, signals: ["implement"] },
      { category: "docs", pack: "docs", phase: 3, signals: ["documentation"] },
    ];
    const result = decompose("test", categories);
    assert.deepEqual(result.children[0].dependsOn, []); // build first
    assert.deepEqual(result.children[1].dependsOn, ["build"]); // docs after build
  });

  it("research goes first when present", () => {
    const categories = [
      { category: "build", pack: "feature", phase: 1, signals: ["implement"] },
      { category: "research", pack: "research", phase: 0, signals: ["research"] },
    ];
    const result = decompose("test", categories);
    assert.equal(result.children[0].category, "research"); // phase 0
    assert.equal(result.children[1].category, "build");     // phase 1
  });

  it("produces a human-readable handoff chain", () => {
    const categories = [
      { category: "build", pack: "feature", phase: 1, signals: ["implement"] },
      { category: "launch", pack: "launch", phase: 4, signals: ["announce"] },
    ];
    const result = decompose("test", categories);
    assert.equal(result.handoffChain, "build (feature pack) → launch (launch pack)");
  });
});

// ── Run plan ──────────────────────────────────────────────────────────────────

describe("createRunPlan", () => {
  it("creates a plan with pending children", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    assert.equal(plan.status, "pending");
    assert.equal(plan.children.length, 2);
    assert.ok(plan.children.every(c => c.status === "pending"));
  });
});

describe("updateChildStatus", () => {
  it("marks child as completed", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "completed");
    assert.equal(plan.children[0].status, "completed");
    assert.ok(plan.children[0].completedAt);
  });

  it("marks parent completed when all children complete", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "completed");
    updateChildStatus(plan, "docs", "completed");
    assert.equal(plan.status, "completed");
  });

  it("marks parent blocked when any child is blocked", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "blocked");
    assert.equal(plan.status, "blocked");
  });
});

describe("getNextChild", () => {
  it("returns first child when no dependencies", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    const next = getNextChild(plan);
    assert.equal(next.child.category, "build");
  });

  it("returns second child after first completes", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "completed");
    const next = getNextChild(plan);
    assert.equal(next.child.category, "docs");
  });

  it("returns null when next child has unmet dependencies", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
      { category: "docs", pack: "docs", phase: 3, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "running");
    const next = getNextChild(plan);
    // build is running, docs depends on build → no actionable child
    assert.equal(next, null);
  });

  it("returns null when all children are complete", () => {
    const decomposition = decompose("test", [
      { category: "build", pack: "feature", phase: 1, signals: [] },
    ]);
    const plan = createRunPlan(decomposition);
    updateChildStatus(plan, "build", "completed");
    const next = getNextChild(plan);
    assert.equal(next, null);
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatDecomposition", () => {
  it("formats single task", () => {
    const detection = detectComposite("Implement a CLI command");
    const output = formatDecomposition(detection);
    assert.ok(output.includes("single"));
  });

  it("formats composite task with split recommendation", () => {
    const detection = detectComposite(
      "Implement the feature and then write the handbook page and announce the launch"
    );
    const decomposition = decompose("test", detection.detectedCategories);
    const output = formatDecomposition(detection, decomposition);
    assert.ok(output.includes("composite"));
    assert.ok(output.includes("Recommended split"));
    assert.ok(output.includes("Dependency order"));
  });

  it("shows uncertainty warning for medium confidence", () => {
    const detection = {
      isComposite: true,
      confidence: "medium",
      detectedCategories: [
        { category: "build", pack: "feature", signals: ["implement"] },
        { category: "docs", pack: "docs", signals: ["documentation"] },
      ],
      hasConnectors: false,
      reason: "2 categories without connectors",
    };
    const output = formatDecomposition(detection);
    assert.ok(output.includes("⚠"));
    assert.ok(output.includes("--no-split"));
  });
});
