import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_ARTIFACT_CONTRACTS,
  PACK_HANDOFF_CONTRACTS,
  validateArtifact,
  validatePackChain,
  getArtifactContract,
  getHandoffContract,
  formatArtifactValidation,
  formatPackChain,
} from "../src/artifacts.mjs";

// ── Contract completeness ─────────────────────────────────────────────────────

describe("ROLE_ARTIFACT_CONTRACTS", () => {
  it("defines contracts for 20+ chain-critical roles", () => {
    const count = Object.keys(ROLE_ARTIFACT_CONTRACTS).length;
    assert.ok(count >= 20, `Only ${count} contracts defined`);
  });

  it("every contract has required fields", () => {
    for (const [role, contract] of Object.entries(ROLE_ARTIFACT_CONTRACTS)) {
      assert.ok(contract.artifactType, `${role} missing artifactType`);
      assert.ok(Array.isArray(contract.requiredSections), `${role} missing requiredSections`);
      assert.ok(contract.requiredSections.length > 0, `${role} has empty requiredSections`);
      assert.ok(Array.isArray(contract.consumedBy), `${role} missing consumedBy`);
      assert.ok(contract.completionRule, `${role} missing completionRule`);
    }
  });

  it("Critic Reviewer produces verdict with evidence", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Critic Reviewer"];
    assert.equal(contract.artifactType, "verdict");
    assert.ok(contract.requiredSections.includes("verdict"));
    assert.ok(contract.requiredSections.includes("evidence"));
  });

  it("Critic Reviewer has no downstream consumer", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Critic Reviewer"];
    assert.equal(contract.consumedBy.length, 0);
  });

  it("Red-Teamer produces a red-team-report consumed by Critic Reviewer", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Red-Teamer"];
    assert.ok(contract, "Red-Teamer role missing");
    assert.equal(contract.artifactType, "red-team-report");
    assert.ok(contract.consumedBy.includes("Critic Reviewer"));
  });

  it("Red-Teamer contract requires named subject and attack evidence", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Red-Teamer"];
    assert.ok(contract.requiredSections.includes("subject-under-test"),
      "Red-team reports must name the subject under test for reproducibility");
    assert.ok(contract.requiredSections.includes("attack-vectors"));
    assert.ok(contract.requiredSections.includes("attempted-violations"));
    assert.ok(contract.requiredSections.includes("catch-rate"));
    assert.ok(contract.requiredSections.includes("uncaught-breaks"));
  });

  it("Caption Auditor produces a caption-audit consumed by Critic Reviewer", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Caption Auditor"];
    assert.ok(contract, "Caption Auditor role missing");
    assert.equal(contract.artifactType, "caption-audit");
    assert.ok(contract.consumedBy.includes("Critic Reviewer"));
  });

  it("Caption Auditor contract requires sample reproducibility", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Caption Auditor"];
    assert.ok(contract.requiredSections.includes("dataset-scope"));
    assert.ok(contract.requiredSections.includes("rule-compliance-summary"));
    assert.ok(contract.requiredSections.includes("violations"));
    assert.ok(contract.requiredSections.includes("sampling-strategy"),
      "Caption audit must declare how the sample was taken, for reproducibility");
  });

  it("Monster Taxonomy Verifier produces a taxonomy-audit consumed by Critic Reviewer", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Monster Taxonomy Verifier"];
    assert.ok(contract, "Monster Taxonomy Verifier role missing");
    assert.equal(contract.artifactType, "taxonomy-audit");
    assert.ok(contract.consumedBy.includes("Critic Reviewer"));
  });

  it("Monster Taxonomy Verifier contract requires LoRA-separability verdict", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Monster Taxonomy Verifier"];
    assert.ok(contract.requiredSections.includes("entries-audited"));
    assert.ok(contract.requiredSections.includes("schema-compliance"));
    assert.ok(contract.requiredSections.includes("lora-separability-assessment"),
      "Taxonomy audit must declare whether the creature set is ready to train separately from humans");
  });
});

describe("PACK_HANDOFF_CONTRACTS", () => {
  it("defines handoff contracts for all 10 packs", () => {
    const packs = ["feature", "bugfix", "security", "docs", "launch", "research", "treatment", "brainstorm", "deep-audit", "swarm"];
    for (const p of packs) {
      assert.ok(PACK_HANDOFF_CONTRACTS[p], `Missing contract for ${p}`);
      assert.ok(PACK_HANDOFF_CONTRACTS[p].flow.length >= 2, `${p} flow too short`);
    }
  });

  it("every pack ends with terminal step (consumedBy null)", () => {
    for (const [pack, contract] of Object.entries(PACK_HANDOFF_CONTRACTS)) {
      const last = contract.flow[contract.flow.length - 1];
      if (pack === "brainstorm") {
        assert.equal(last.role, "Judge", `brainstorm should end with Judge`);
        assert.equal(last.produces, "judge-report", `brainstorm last step should produce judge-report`);
      } else {
        assert.equal(last.role, "Critic Reviewer", `${pack} doesn't end with Critic`);
        assert.equal(last.produces, "verdict", `${pack} last step doesn't produce verdict`);
      }
      assert.equal(last.consumedBy, null, `${pack} verdict should have no consumer`);
    }
  });

  it("feature pack has 5-step flow", () => {
    assert.equal(PACK_HANDOFF_CONTRACTS.feature.flow.length, 5);
  });

  it("treatment pack has 8-step flow (longest)", () => {
    assert.equal(PACK_HANDOFF_CONTRACTS.treatment.flow.length, 8);
  });
});

// ── Artifact validation ───────────────────────────────────────────────────────

describe("validateArtifact", () => {
  it("validates complete Product Strategist output", () => {
    const artifact = `
## Problem Framing
The real problem is X.

## Scope
Include A, B, C.

## Non-Goals
Do not include D.

## Tradeoffs
Option 1 vs Option 2.
`;
    const result = validateArtifact("Product Strategist", artifact);
    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it("flags missing sections", () => {
    const artifact = `
## Problem Framing
Some content.

## Scope
More content.
`;
    const result = validateArtifact("Product Strategist", artifact);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("non-goals"));
    assert.ok(result.missing.includes("tradeoffs"));
  });

  it("validates complete Critic Reviewer verdict", () => {
    const artifact = `
## Verdict
ACCEPT WITH NOTES

## Evidence
- AC-1 met
- AC-2 met with caveats

## Required Corrections
None blocking.
`;
    const result = validateArtifact("Critic Reviewer", artifact);
    assert.equal(result.valid, true);
  });

  it("warns on thin artifacts", () => {
    const artifact = `## Verdict\nAccept.\n`;
    const result = validateArtifact("Critic Reviewer", artifact);
    assert.ok(result.warnings.some(w => w.includes("thin")));
  });

  it("warns on missing upstream evidence reference", () => {
    const artifact = `
## Files to Change
src/route.mjs

## Implementation Approach
Add a new function.

## Risk Notes
Low risk.
`;
    const result = validateArtifact("Backend Engineer", artifact);
    // Should warn about missing reference to implementation-spec
    assert.ok(result.warnings.some(w => w.includes("implementation-spec") || w.includes("implementation spec")));
  });

  it("returns valid for unknown roles (no contract)", () => {
    const result = validateArtifact("Unknown Role", "some content");
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes("No artifact contract")));
  });

  it("validates Spec Writer with acceptance criteria", () => {
    const artifact = `
## Acceptance Criteria
AC-1: Feature works.
AC-2: Tests pass.
AC-3: No regression.

## Edge Cases
- Empty input
- Large input

## Interface Spec
Returns JSON with fields: name, version.
`;
    const result = validateArtifact("Spec Writer", artifact);
    assert.equal(result.valid, true);
  });
});

// ── Pack chain validation ─────────────────────────────────────────────────────

describe("validatePackChain", () => {
  it("validates complete feature pack chain", () => {
    const artifacts = {
      "Product Strategist": "## Problem Framing\nX\n## Scope\nY\n## Non-Goals\nZ\n## Tradeoffs\nA vs B\nMore detail here.",
      "Spec Writer": "## Acceptance Criteria\nAC-1\n## Edge Cases\nEC-1\n## Interface Spec\nJSON shape\nWith implementation spec reference.",
      "Backend Engineer": "## Files to Change\nsrc/x.mjs\n## Implementation Approach\nAdd function.\n## Risk Notes\nLow.\nReference implementation spec here.",
      "Test Engineer": "## Test Plan\n5 tests\n## Test Cases\nTC-1, TC-2, TC-3\n## False Confidence Assessment\nDoes not prove X.\nBased on the change plan.",
      "Critic Reviewer": "## Verdict\nAccept\n## Evidence\nAll ACs met.\n## Required Corrections\nNone.\nFull review complete.",
    };
    const result = validatePackChain("feature", artifacts);
    assert.equal(result.valid, true);
    assert.equal(result.steps.length, 5);
  });

  it("flags missing artifacts in the chain", () => {
    const artifacts = {
      "Product Strategist": "## Problem Framing\nX\n## Scope\nY\n## Non-Goals\nZ\n## Tradeoffs\nA\nMore detail.",
      // Spec Writer missing
      "Backend Engineer": "## Files to Change\nsrc/x.mjs\n## Implementation Approach\nY\n## Risk Notes\nZ\nWith spec.",
    };
    const result = validatePackChain("feature", artifacts);
    assert.equal(result.valid, false);
    assert.ok(result.steps.some(s => s.status === "missing"));
  });

  it("flags incomplete artifacts", () => {
    const artifacts = {
      "Product Strategist": "## Problem Framing\nX\n## Scope\nY\n",  // missing non-goals + tradeoffs
    };
    const result = validatePackChain("feature", artifacts);
    assert.equal(result.valid, false);
    assert.ok(result.steps.some(s => s.status === "incomplete"));
  });

  it("validates all 9 pack contracts exist", () => {
    for (const pack of ["feature", "bugfix", "security", "docs", "launch", "research", "treatment", "brainstorm", "swarm"]) {
      const result = validatePackChain(pack, {});
      assert.ok(result.steps.length > 0, `${pack} has no steps`);
    }
  });

  it("returns error for unknown pack", () => {
    const result = validatePackChain("nonexistent", {});
    assert.equal(result.valid, false);
    assert.ok(result.steps[0].detail.includes("No handoff contract"));
  });
});

// ── Getters ───────────────────────────────────────────────────────────────────

describe("getArtifactContract", () => {
  it("returns contract for known role", () => {
    const contract = getArtifactContract("Product Strategist");
    assert.ok(contract);
    assert.equal(contract.artifactType, "strategy-brief");
  });

  it("returns null for unknown role", () => {
    assert.equal(getArtifactContract("Unknown"), null);
  });
});

describe("getHandoffContract", () => {
  it("returns contract for known pack", () => {
    const contract = getHandoffContract("feature");
    assert.ok(contract);
    assert.equal(contract.flow.length, 5);
  });

  it("returns null for unknown pack", () => {
    assert.equal(getHandoffContract("nonexistent"), null);
  });
});

// ── Format ────────────────────────────────────────────────────────────────────

describe("formatArtifactValidation", () => {
  it("formats valid result", () => {
    const validation = validateArtifact("Product Strategist",
      "## Problem Framing\nX\n## Scope\nY\n## Non-Goals\nZ\n## Tradeoffs\nA\nMore content.");
    const output = formatArtifactValidation("Product Strategist", validation);
    assert.ok(output.includes("✓"));
    assert.ok(output.includes("strategy-brief"));
  });

  it("formats invalid result", () => {
    const validation = validateArtifact("Product Strategist", "## Scope\nY");
    const output = formatArtifactValidation("Product Strategist", validation);
    assert.ok(output.includes("✗"));
    assert.ok(output.includes("missing"));
  });
});

describe("formatPackChain", () => {
  it("formats complete chain", () => {
    const result = validatePackChain("launch", {
      "Launch Strategist": "## Launch Sequence\nT0\n## Proof Packaging\nEvidence\n## Channel Selection\nGitHub\n## Success Criteria\nDownloads.\nMore detail.",
      "Launch Copywriter": "## Release Notes\nv1.0\n## Short Announcement\nShipped.\nBased on launch brief.\nMore content lines.",
      "Critic Reviewer": "## Verdict\nAccept\n## Evidence\nClean.\n## Required Corrections\nNone.\nFull review.",
    });
    const output = formatPackChain("launch", result);
    assert.ok(output.includes("Pack Chain Validation"));
    assert.ok(output.includes("launch"));
  });
});
