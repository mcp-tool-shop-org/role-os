import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRoleContract,
  buildClusterTrials,
  evaluateTrialOutput,
  formatTrialReport,
  PRODUCT_CLUSTER_TRIALS,
} from "../src/trial.mjs";

// ── Role contract extraction ──────────────────────────────────────────────────

describe("getRoleContract", () => {
  it("returns contract for known role", () => {
    const contract = getRoleContract("Product Strategist");
    assert.ok(contract);
    assert.equal(contract.name, "Product Strategist");
    assert.ok(contract.keywords.length > 0);
    assert.ok(contract.tools.length > 0);
  });

  it("returns null for unknown role", () => {
    assert.equal(getRoleContract("Nonexistent Role"), null);
  });

  it("includes evidence requirements", () => {
    const contract = getRoleContract("Test Engineer");
    assert.ok(contract.evidenceRequired.includes("test"));
    assert.ok(contract.evidenceRequired.includes("output"));
  });
});

// ── Cluster trial builder ─────────────────────────────────────────────────────

describe("buildClusterTrials", () => {
  it("product cluster has 6 trials (3 gold + 3 rejection)", () => {
    assert.equal(PRODUCT_CLUSTER_TRIALS.length, 6);
    const gold = PRODUCT_CLUSTER_TRIALS.filter(t => t.type === "gold-task");
    const reject = PRODUCT_CLUSTER_TRIALS.filter(t => t.type === "rejection");
    assert.equal(gold.length, 3);
    assert.equal(reject.length, 3);
  });

  it("each trial has required fields", () => {
    for (const trial of PRODUCT_CLUSTER_TRIALS) {
      assert.ok(trial.id, "missing id");
      assert.ok(trial.role, "missing role");
      assert.ok(trial.type, "missing type");
      assert.ok(trial.prompt, "missing prompt");
      assert.ok(trial.expectedBehavior, "missing expectedBehavior");
    }
  });

  it("rejection trials have escalation targets", () => {
    const rejections = PRODUCT_CLUSTER_TRIALS.filter(t => t.type === "rejection");
    for (const t of rejections) {
      assert.ok(t.escalateTo, `${t.id} missing escalateTo`);
    }
  });
});

// ── Trial evaluation ──────────────────────────────────────────────────────────

describe("evaluateTrialOutput", () => {
  it("passes when output contains all mustInclude", () => {
    const trial = {
      id: "test-gold", role: "Product Strategist", type: "gold-task",
      prompt: "test", expectedBehavior: "test",
      mustInclude: ["scope", "tradeoff"],
      mustNotInclude: ["acceptance criteria"],
    };
    const output = "The scope of this feature involves a key tradeoff between simplicity and power.";
    const result = evaluateTrialOutput(trial, output);
    assert.equal(result.passed, true);
    assert.equal(result.violations.length, 0);
  });

  it("fails when output missing mustInclude", () => {
    const trial = {
      id: "test-gold", role: "Product Strategist", type: "gold-task",
      prompt: "test", expectedBehavior: "test",
      mustInclude: ["scope", "tradeoff"],
      mustNotInclude: [],
    };
    const output = "Here is the scope of the feature.";
    const result = evaluateTrialOutput(trial, output);
    assert.equal(result.passed, false);
    assert.ok(result.violations.some(v => v.includes("tradeoff")));
  });

  it("fails when output contains mustNotInclude", () => {
    const trial = {
      id: "test-gold", role: "Product Strategist", type: "gold-task",
      prompt: "test", expectedBehavior: "test",
      mustInclude: [],
      mustNotInclude: ["acceptance criteria"],
    };
    const output = "Here are the acceptance criteria for the feature.";
    const result = evaluateTrialOutput(trial, output);
    assert.equal(result.passed, false);
    assert.ok(result.violations.some(v => v.includes("forbidden")));
  });

  it("rejection test passes when escalation is indicated", () => {
    const trial = {
      id: "test-reject", role: "Product Strategist", type: "rejection",
      prompt: "test", expectedBehavior: "test",
      mustInclude: [], mustNotInclude: [],
      escalateTo: "Spec Writer",
    };
    const output = "This is outside my scope. I'd hand off to Spec Writer for detailed acceptance criteria.";
    const result = evaluateTrialOutput(trial, output);
    assert.equal(result.passed, true);
  });

  it("rejection test fails when no escalation indicated", () => {
    const trial = {
      id: "test-reject", role: "Product Strategist", type: "rejection",
      prompt: "test", expectedBehavior: "test",
      mustInclude: [], mustNotInclude: [],
      escalateTo: "Spec Writer",
    };
    const output = "Sure, here are the acceptance criteria I wrote for you.";
    const result = evaluateTrialOutput(trial, output);
    assert.equal(result.passed, false);
    assert.ok(result.violations.some(v => v.includes("escalate")));
  });
});

// ── Trial report formatting ───────────────────────────────────────────────────

describe("formatTrialReport", () => {
  it("produces readable report with pass/fail counts", () => {
    const results = [
      { caseId: "test-1", role: "A", type: "gold-task", passed: true, findings: ["✓ good"], violations: [] },
      { caseId: "test-2", role: "B", type: "rejection", passed: false, findings: [], violations: ["bad thing"] },
    ];
    const report = formatTrialReport("test-cluster", results);
    assert.ok(report.includes("1/2 passed"));
    assert.ok(report.includes("✓ test-1"));
    assert.ok(report.includes("✗ test-2"));
  });
});
