import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkSufficiency,
  getRequirements,
  validateEvidenceItem,
  formatSufficiency,
  EVIDENCE_KINDS,
  EVIDENCE_STATUSES,
  VERDICT_TYPES,
  ROLE_EVIDENCE_REQUIREMENTS,
} from "../src/evidence.mjs";

// ── Schema constants ──────────────────────────────────────────────────────────

describe("evidence schema", () => {
  it("has at least 10 evidence kinds", () => {
    assert.ok(EVIDENCE_KINDS.length >= 10);
  });

  it("has 4 evidence statuses", () => {
    assert.equal(EVIDENCE_STATUSES.length, 4);
    assert.ok(EVIDENCE_STATUSES.includes("supports"));
    assert.ok(EVIDENCE_STATUSES.includes("missing"));
    assert.ok(EVIDENCE_STATUSES.includes("contradicts"));
  });

  it("has exactly 4 verdict types (closed enum)", () => {
    assert.equal(VERDICT_TYPES.length, 4);
    assert.ok(VERDICT_TYPES.includes("accept"));
    assert.ok(VERDICT_TYPES.includes("reject"));
    assert.ok(VERDICT_TYPES.includes("blocked"));
  });
});

// ── Role-aware evidence requirements ──────────────────────────────────────────

describe("role evidence requirements", () => {
  it("has requirements for key reviewer roles", () => {
    const keyRoles = [
      "Critic Reviewer", "Test Engineer", "Backend Engineer",
      "Security Reviewer", "Performance Engineer",
    ];
    for (const role of keyRoles) {
      const reqs = getRequirements(role);
      assert.ok(reqs.required.length > 0, `${role} should have required evidence`);
      assert.ok(reqs.description.length > 10, `${role} should have a description`);
    }
  });

  it("Test Engineer requires test + output evidence", () => {
    const reqs = getRequirements("Test Engineer");
    assert.ok(reqs.required.includes("test"));
    assert.ok(reqs.required.includes("output"));
  });

  it("Backend Engineer requires code + test evidence", () => {
    const reqs = getRequirements("Backend Engineer");
    assert.ok(reqs.required.includes("code"));
    assert.ok(reqs.required.includes("test"));
  });

  it("Performance Engineer requires measurement + output", () => {
    const reqs = getRequirements("Performance Engineer");
    assert.ok(reqs.required.includes("measurement"));
    assert.ok(reqs.required.includes("output"));
  });

  it("Product Strategist requires user-intent + reasoning", () => {
    const reqs = getRequirements("Product Strategist");
    assert.ok(reqs.required.includes("user-intent"));
    assert.ok(reqs.required.includes("reasoning"));
  });

  it("returns default requirements for unknown roles", () => {
    const reqs = getRequirements("Unknown Role That Doesn't Exist");
    assert.ok(reqs.required.includes("reasoning"));
  });
});

// ── Evidence item validation ──────────────────────────────────────────────────

describe("validateEvidenceItem", () => {
  it("valid item produces no errors", () => {
    const errors = validateEvidenceItem({
      kind: "test",
      reference: "test/route.test.mjs",
      claim: "All 37 routing tests pass",
      status: "supports",
    });
    assert.equal(errors.length, 0);
  });

  it("rejects invalid kind", () => {
    const errors = validateEvidenceItem({
      kind: "vibes",
      reference: "somewhere",
      claim: "it felt good",
      status: "supports",
    });
    assert.ok(errors.some(e => e.includes("Invalid evidence kind")));
  });

  it("rejects empty reference", () => {
    const errors = validateEvidenceItem({
      kind: "test",
      reference: "",
      claim: "tests pass",
      status: "supports",
    });
    assert.ok(errors.some(e => e.includes("reference")));
  });

  it("rejects empty claim", () => {
    const errors = validateEvidenceItem({
      kind: "test",
      reference: "test/file.mjs",
      claim: "",
      status: "supports",
    });
    assert.ok(errors.some(e => e.includes("claim")));
  });

  it("rejects invalid status", () => {
    const errors = validateEvidenceItem({
      kind: "test",
      reference: "test/file.mjs",
      claim: "tests pass",
      status: "maybe",
    });
    assert.ok(errors.some(e => e.includes("Invalid evidence status")));
  });
});

// ── Sufficiency checks ────────────────────────────────────────────────────────

describe("checkSufficiency", () => {
  it("sufficient when all required evidence kinds present", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Test Engineer",
      summary: "All tests pass",
      evidence: [
        { kind: "test", reference: "test/route.test.mjs", claim: "37/37 pass", status: "supports" },
        { kind: "output", reference: "npm test output", claim: "0 failures", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "high",
    });
    assert.equal(result.sufficient, true);
    assert.equal(result.missingRequired.length, 0);
  });

  it("insufficient when required evidence kind missing", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Test Engineer",
      summary: "Looks good",
      evidence: [
        { kind: "reasoning", reference: "my judgment", claim: "seems fine", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "high",
    });
    assert.equal(result.sufficient, false);
    assert.ok(result.missingRequired.includes("test"));
    assert.ok(result.missingRequired.includes("output"));
  });

  it("warns on contradictions in approve verdict", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Backend Engineer",
      summary: "Approved despite concern",
      evidence: [
        { kind: "code", reference: "src/api.ts", claim: "endpoint implemented", status: "supports" },
        { kind: "test", reference: "test/api.test.ts", claim: "2 tests failing", status: "contradicts" },
      ],
      gaps: [],
      risks: [],
      confidence: "medium",
    });
    assert.ok(result.contradictions.length > 0);
    assert.ok(result.warnings.some(w => w.includes("contradictions")));
  });

  it("warns on approve with missing evidence items", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Critic Reviewer",
      summary: "Approved",
      evidence: [
        { kind: "spec", reference: "packet.md", claim: "scope met", status: "supports" },
        { kind: "reasoning", reference: "review notes", claim: "quality bar met", status: "supports" },
        { kind: "test", reference: "test results", claim: "not run yet", status: "missing" },
      ],
      gaps: [],
      risks: [],
      confidence: "medium",
    });
    assert.ok(result.warnings.some(w => w.includes("marked 'missing'")));
  });

  it("warns on non-approve without gaps or requiredNextArtifact", () => {
    const result = checkSufficiency({
      verdict: "reject",
      reviewerRole: "Critic Reviewer",
      summary: "Rejected",
      evidence: [
        { kind: "spec", reference: "packet.md", claim: "scope not met", status: "supports" },
        { kind: "reasoning", reference: "review", claim: "quality bar missed", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "high",
    });
    assert.ok(result.warnings.some(w => w.includes("gaps or requiredNextArtifact")));
  });

  it("warns on low-confidence approve", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Critic Reviewer",
      summary: "Probably fine",
      evidence: [
        { kind: "spec", reference: "packet.md", claim: "seems ok", status: "partial" },
        { kind: "reasoning", reference: "gut feeling", claim: "should work", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "low",
    });
    assert.ok(result.warnings.some(w => w.includes("Low confidence approve")));
  });

  it("no warnings on clean reject with gaps and next artifact", () => {
    const result = checkSufficiency({
      verdict: "reject",
      reviewerRole: "Critic Reviewer",
      summary: "Quality bar not met",
      evidence: [
        { kind: "spec", reference: "packet.md", claim: "scope mismatch", status: "supports" },
        { kind: "reasoning", reference: "review", claim: "3 quality items failed", status: "supports" },
      ],
      gaps: ["test coverage below 80%", "no error handling for edge case X"],
      risks: ["regression risk if shipped as-is"],
      requiredNextArtifact: "Revised implementation with test coverage and edge case handling",
      confidence: "high",
    });
    // Should be sufficient (has required evidence for Critic)
    assert.equal(result.sufficient, true);
    // Should have no warnings (gaps and nextArtifact present)
    const recoveryWarning = result.warnings.filter(w => w.includes("gaps or requiredNextArtifact"));
    assert.equal(recoveryWarning.length, 0);
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatSufficiency", () => {
  it("shows sufficient for complete evidence", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Test Engineer",
      summary: "Pass",
      evidence: [
        { kind: "test", reference: "tests", claim: "pass", status: "supports" },
        { kind: "output", reference: "output", claim: "clean", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "high",
    });
    const formatted = formatSufficiency(result, "Test Engineer");
    assert.ok(formatted.includes("✓"));
    assert.ok(formatted.includes("sufficient"));
  });

  it("shows insufficient with missing items", () => {
    const result = checkSufficiency({
      verdict: "accept",
      reviewerRole: "Test Engineer",
      summary: "Pass",
      evidence: [
        { kind: "reasoning", reference: "notes", claim: "looks ok", status: "supports" },
      ],
      gaps: [],
      risks: [],
      confidence: "high",
    });
    const formatted = formatSufficiency(result, "Test Engineer");
    assert.ok(formatted.includes("✗"));
    assert.ok(formatted.includes("insufficient"));
    assert.ok(formatted.includes("test"));
  });
});
