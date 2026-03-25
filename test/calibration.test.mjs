import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  recordOutcome,
  readOutcomes,
  computeCalibration,
  computePackBoosts,
  computeConfidenceAdjustment,
  formatCalibrationReport,
} from "../src/calibration.mjs";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-calibration");

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
}

function makeOutcome(overrides = {}) {
  return {
    runId: `test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    packetFile: "test.md",
    detectedType: "feature",
    suggestedPack: "feature",
    suggestedConfidence: "high",
    selectedPack: "feature",
    operatorOverride: false,
    mismatchRedirect: false,
    mismatchFrom: null,
    mismatchTo: null,
    chainLength: 6,
    escalations: 0,
    rejectedVerdicts: 0,
    corrections: 0,
    completionStatus: "completed",
    rolesUsed: ["Orchestrator", "Product Strategist", "Backend Engineer", "Test Engineer", "Critic Reviewer"],
    ...overrides,
  };
}

// ── Ledger ────────────────────────────────────────────────────────────────────

describe("outcome ledger", () => {
  before(cleanup);
  afterEach(cleanup);

  it("records and reads outcomes", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const outcome = makeOutcome();
    recordOutcome(outcome, TEST_DIR);
    const results = readOutcomes(TEST_DIR);
    assert.equal(results.length, 1);
    assert.equal(results[0].runId, outcome.runId);
  });

  it("appends multiple outcomes", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    recordOutcome(makeOutcome({ runId: "run-1" }), TEST_DIR);
    recordOutcome(makeOutcome({ runId: "run-2" }), TEST_DIR);
    recordOutcome(makeOutcome({ runId: "run-3" }), TEST_DIR);
    const results = readOutcomes(TEST_DIR);
    assert.equal(results.length, 3);
  });

  it("returns empty array when no ledger exists", () => {
    const results = readOutcomes(TEST_DIR);
    assert.equal(results.length, 0);
  });
});

// ── Calibration computation ───────────────────────────────────────────────────

describe("computeCalibration", () => {
  it("returns zero-state for empty outcomes", () => {
    const report = computeCalibration([]);
    assert.equal(report.totalRuns, 0);
    assert.equal(report.packUsageRate, 0);
    assert.equal(report.completionRate, 0);
  });

  it("computes correct rates from outcomes", () => {
    const outcomes = [
      makeOutcome({ selectedPack: "feature", completionStatus: "completed" }),
      makeOutcome({ selectedPack: "feature", completionStatus: "completed" }),
      makeOutcome({ selectedPack: null, completionStatus: "completed" }), // free routing
      makeOutcome({ selectedPack: "bugfix", completionStatus: "blocked", escalations: 2 }),
      makeOutcome({ selectedPack: "docs", completionStatus: "completed", operatorOverride: true }),
    ];
    const report = computeCalibration(outcomes);
    assert.equal(report.totalRuns, 5);
    assert.equal(report.packUsageRate, 80); // 4/5 used a pack
    assert.equal(report.freeRoutingRate, 20); // 1/5 free routing
    assert.equal(report.completionRate, 80); // 4/5 completed
    assert.equal(report.operatorOverrideRate, 20); // 1/5 overridden
  });

  it("computes high-confidence accuracy", () => {
    const outcomes = [
      makeOutcome({ suggestedPack: "feature", selectedPack: "feature", suggestedConfidence: "high" }),
      makeOutcome({ suggestedPack: "feature", selectedPack: "feature", suggestedConfidence: "high" }),
      makeOutcome({ suggestedPack: "feature", selectedPack: "bugfix", suggestedConfidence: "high", operatorOverride: true }),
    ];
    const report = computeCalibration(outcomes);
    assert.equal(report.highConfidenceAccuracy, 67); // 2/3
  });

  it("generates tighten-confidence suggestion when accuracy is low", () => {
    const outcomes = [
      makeOutcome({ suggestedConfidence: "high", operatorOverride: true }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: true }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: false }),
    ];
    const report = computeCalibration(outcomes);
    assert.ok(report.suggestions.some(s => s.type === "tighten-confidence"));
  });

  it("computes per-pack performance", () => {
    const outcomes = [
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", chainLength: 6 }),
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", chainLength: 5 }),
      makeOutcome({ selectedPack: "bugfix", completionStatus: "blocked", chainLength: 4, escalations: 2 }),
    ];
    const report = computeCalibration(outcomes);
    assert.equal(report.packPerformance.feature.runs, 2);
    assert.equal(report.packPerformance.feature.completionRate, 100);
    assert.equal(report.packPerformance.feature.avgChainLength, 5.5);
    assert.equal(report.packPerformance.bugfix.escalations, 2);
  });
});

// ── Pack boosts ───────────────────────────────────────────────────────────────

describe("computePackBoosts", () => {
  it("boosts packs with clean completed runs", () => {
    const outcomes = [
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", corrections: 0 }),
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", corrections: 0 }),
      makeOutcome({ selectedPack: "bugfix", completionStatus: "completed", corrections: 0 }),
    ];
    const boosts = computePackBoosts(outcomes);
    assert.equal(boosts.feature, 1.0); // 2 × 0.5
    assert.equal(boosts.bugfix, 0.5); // 1 × 0.5
  });

  it("does not boost runs with corrections", () => {
    const outcomes = [
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", corrections: 2 }),
    ];
    const boosts = computePackBoosts(outcomes);
    assert.equal(boosts.feature, undefined);
  });

  it("caps boost at 2.0", () => {
    const outcomes = Array.from({ length: 10 }, () =>
      makeOutcome({ selectedPack: "feature", completionStatus: "completed", corrections: 0 })
    );
    const boosts = computePackBoosts(outcomes);
    assert.equal(boosts.feature, 2.0);
  });

  it("does not boost free routing runs", () => {
    const outcomes = [
      makeOutcome({ selectedPack: null, completionStatus: "completed", corrections: 0 }),
    ];
    const boosts = computePackBoosts(outcomes);
    assert.equal(Object.keys(boosts).length, 0);
  });
});

// ── Confidence adjustment ─────────────────────────────────────────────────────

describe("computeConfidenceAdjustment", () => {
  it("suggests raising threshold when high-confidence is often overridden", () => {
    const outcomes = [
      makeOutcome({ suggestedConfidence: "high", operatorOverride: true }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: true }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: false }),
    ];
    const result = computeConfidenceAdjustment(outcomes);
    assert.equal(result.adjustment, +1);
  });

  it("suggests lowering threshold when medium-confidence is often accepted", () => {
    const outcomes = [
      makeOutcome({ suggestedConfidence: "medium", suggestedPack: "feature", selectedPack: "feature", operatorOverride: false }),
      makeOutcome({ suggestedConfidence: "medium", suggestedPack: "docs", selectedPack: "docs", operatorOverride: false }),
      makeOutcome({ suggestedConfidence: "medium", suggestedPack: "bugfix", selectedPack: "bugfix", operatorOverride: false }),
    ];
    const result = computeConfidenceAdjustment(outcomes);
    assert.equal(result.adjustment, -1);
  });

  it("returns zero adjustment when thresholds are well-calibrated", () => {
    const outcomes = [
      makeOutcome({ suggestedConfidence: "high", operatorOverride: false }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: false }),
      makeOutcome({ suggestedConfidence: "high", operatorOverride: false }),
    ];
    const result = computeConfidenceAdjustment(outcomes);
    assert.equal(result.adjustment, 0);
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatCalibrationReport", () => {
  it("produces readable output", () => {
    const report = computeCalibration([
      makeOutcome({ selectedPack: "feature", completionStatus: "completed" }),
      makeOutcome({ selectedPack: "bugfix", completionStatus: "completed" }),
    ]);
    const formatted = formatCalibrationReport(report);
    assert.ok(formatted.includes("Total runs: 2"));
    assert.ok(formatted.includes("Completion rate: 100%"));
    assert.ok(formatted.includes("feature:"));
  });
});
