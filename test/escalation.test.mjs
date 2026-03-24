import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBlocked,
  resolveRejected,
  resolveConflict,
  resolveSplit,
  formatEscalation,
} from "../src/escalation.mjs";

// ── Blocked work routing ──────────────────────────────────────────────────────

describe("resolveBlocked", () => {
  it("routes missing info to Product Strategist", () => {
    const result = resolveBlocked("missing info about the user requirements");
    assert.equal(result.targetRole, "Product Strategist");
    assert.equal(result.recovery, "revise");
  });

  it("routes dependency unavailable to Orchestrator", () => {
    const result = resolveBlocked("dependency unavailable — auth service not deployed");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("routes scope contradiction to Product Strategist", () => {
    const result = resolveBlocked("scope contradiction between requirements A and B");
    assert.equal(result.targetRole, "Product Strategist");
    assert.equal(result.recovery, "revise");
  });

  it("routes technical infeasibility to Backend Engineer", () => {
    const result = resolveBlocked("technical infeasibility — cannot use this API pattern");
    assert.equal(result.targetRole, "Backend Engineer");
    assert.equal(result.recovery, "revise");
  });

  it("routes owner ambiguity to Orchestrator", () => {
    const result = resolveBlocked("owner ambiguity — unclear who should handle this");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("routes blocked upstream to Orchestrator", () => {
    const result = resolveBlocked("blocked upstream — waiting on API contract");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("defaults unrecognized reasons to Orchestrator", () => {
    const result = resolveBlocked("some completely novel reason nobody anticipated");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
    assert.ok(result.handoffContext.includes("some completely novel reason"));
  });

  it("every result has all required fields", () => {
    const result = resolveBlocked("missing info");
    assert.ok(result.targetRole);
    assert.ok(result.recovery);
    assert.ok(result.reason);
    assert.ok(result.requiredArtifact);
  });
});

// ── Rejected work routing ─────────────────────────────────────────────────────

describe("resolveRejected", () => {
  it("routes quality bar miss back to previous role", () => {
    const result = resolveRejected("quality bar miss — tests incomplete", "Backend Engineer");
    assert.equal(result.targetRole, "Backend Engineer");
    assert.equal(result.recovery, "retry");
  });

  it("routes wrong artifact type back to previous role", () => {
    const result = resolveRejected("wrong artifact type — expected spec, got code", "Spec Writer");
    assert.equal(result.targetRole, "Spec Writer");
    assert.equal(result.recovery, "revise");
  });

  it("routes incomplete evidence back to previous role", () => {
    const result = resolveRejected("incomplete evidence — missing test results", "Test Engineer");
    assert.equal(result.targetRole, "Test Engineer");
    assert.equal(result.recovery, "retry");
  });

  it("routes role mismatch to Orchestrator", () => {
    const result = resolveRejected("role mismatch — this should be owned by design", "Backend Engineer");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("routes chain problem to Orchestrator", () => {
    const result = resolveRejected("chain problem — test before implementation", "Test Engineer");
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("defaults to previous role for unrecognized rejection", () => {
    const result = resolveRejected("didn't like the approach", "UI Designer");
    assert.equal(result.targetRole, "UI Designer");
    assert.equal(result.recovery, "retry");
  });

  it("defaults to Orchestrator when no previous role", () => {
    const result = resolveRejected("unclear reason", null);
    assert.equal(result.targetRole, "Orchestrator");
  });
});

// ── Conflict escalation routing ───────────────────────────────────────────────

describe("resolveConflict", () => {
  it("routes blocking conflict to Orchestrator for reroute", () => {
    const result = resolveConflict({
      type: "blocking", severity: "error",
      roles: ["Test Engineer"], message: "no builders", repair: "add builder",
    });
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("routes sequence conflict to Orchestrator for reroute", () => {
    const result = resolveConflict({
      type: "sequence", severity: "warning",
      roles: ["Test Engineer"], message: "test before build", repair: "reorder",
    });
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "reroute");
  });

  it("routes redundancy to Orchestrator for revise", () => {
    const result = resolveConflict({
      type: "redundancy", severity: "warning",
      roles: ["A", "B"], message: "overlap", repair: "trim",
    });
    assert.equal(result.recovery, "revise");
  });

  it("routes coverage gap to Orchestrator for add-role", () => {
    const result = resolveConflict({
      type: "coverage", severity: "warning",
      roles: ["Backend Engineer"], message: "no tester", repair: "add Test Engineer",
    });
    assert.equal(result.recovery, "add-role");
  });

  it("includes conflict message in reason", () => {
    const result = resolveConflict({
      type: "blocking", severity: "error",
      roles: [], message: "specific problem here", repair: "fix it",
    });
    assert.ok(result.reason.includes("specific problem here"));
  });
});

// ── Split routing ─────────────────────────────────────────────────────────────

describe("resolveSplit", () => {
  it("routes to Orchestrator for decomposition", () => {
    const result = resolveSplit(9);
    assert.equal(result.targetRole, "Orchestrator");
    assert.equal(result.recovery, "split");
    assert.ok(result.handoffContext.includes("9 roles"));
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatEscalation", () => {
  it("produces readable multi-line output", () => {
    const result = resolveBlocked("missing info");
    const formatted = formatEscalation(result);
    assert.ok(formatted.includes("Product Strategist"));
    assert.ok(formatted.includes("revise"));
    assert.ok(formatted.includes("must produce"));
  });
});
