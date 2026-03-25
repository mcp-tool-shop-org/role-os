import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEAM_PACKS, suggestPack, getPack, listPacks } from "../src/packs.mjs";
import { ROLE_CATALOG } from "../src/route.mjs";

// ── Pack structure ────────────────────────────────────────────────────────────

describe("TEAM_PACKS", () => {
  it("has 7 packs", () => {
    assert.equal(Object.keys(TEAM_PACKS).length, 7);
  });

  it("every pack has required fields", () => {
    for (const [key, pack] of Object.entries(TEAM_PACKS)) {
      assert.ok(pack.name, `${key} missing name`);
      assert.ok(pack.description, `${key} missing description`);
      assert.ok(Array.isArray(pack.roles), `${key} missing roles`);
      assert.ok(pack.roles.length >= 3, `${key} has fewer than 3 roles`);
      assert.ok(Array.isArray(pack.optionalRoles), `${key} missing optionalRoles`);
      assert.ok(pack.chainOrder, `${key} missing chainOrder`);
      assert.ok(Array.isArray(pack.requiredArtifacts), `${key} missing requiredArtifacts`);
      assert.ok(Array.isArray(pack.stopConditions), `${key} missing stopConditions`);
      assert.ok(pack.escalationOwner, `${key} missing escalationOwner`);
      assert.ok(pack.dispatchDefaults, `${key} missing dispatchDefaults`);
      assert.ok(pack.trialEvidence, `${key} missing trialEvidence`);
    }
  });

  it("every pack role exists in ROLE_CATALOG", () => {
    const catalogNames = new Set(ROLE_CATALOG.map(r => r.name));
    for (const [key, pack] of Object.entries(TEAM_PACKS)) {
      for (const role of [...pack.roles, ...pack.optionalRoles]) {
        assert.ok(catalogNames.has(role), `${key} references unknown role: ${role}`);
      }
    }
  });

  it("every pack includes Orchestrator and Critic Reviewer", () => {
    for (const [key, pack] of Object.entries(TEAM_PACKS)) {
      assert.ok(pack.roles.includes("Orchestrator"), `${key} missing Orchestrator`);
      assert.ok(pack.roles.includes("Critic Reviewer"), `${key} missing Critic Reviewer`);
    }
  });

  it("every pack has trial evidence citation", () => {
    for (const [key, pack] of Object.entries(TEAM_PACKS)) {
      assert.ok(pack.trialEvidence.length > 10, `${key} has weak trial evidence: "${pack.trialEvidence}"`);
    }
  });
});

// ── Pack suggestion ───────────────────────────────────────────────────────────

describe("suggestPack", () => {
  it("suggests feature pack for feature-building content", () => {
    const result = suggestPack("Build a new feature to implement user authentication and create the login UI.");
    assert.ok(result);
    assert.equal(result.pack, "feature");
  });

  it("suggests bugfix pack for bug-related content", () => {
    const result = suggestPack("Fix the crash that happens when the error handler encounters a regression in the parser.");
    assert.ok(result);
    assert.equal(result.pack, "bugfix");
  });

  it("suggests security pack for security content", () => {
    const result = suggestPack("Run a security audit. Check for vulnerabilities, OWASP patterns, and CVE exposure.");
    assert.ok(result);
    assert.equal(result.pack, "security");
  });

  it("suggests docs pack for documentation content", () => {
    const result = suggestPack("Write the documentation handbook and publish the changelog for the release.");
    assert.ok(result);
    assert.equal(result.pack, "docs");
  });

  it("suggests launch pack for launch content", () => {
    const result = suggestPack("Plan the launch. Write release notes and go-to-market messaging for the announcement.");
    assert.ok(result);
    assert.equal(result.pack, "launch");
  });

  it("suggests research pack for research content", () => {
    const result = suggestPack("Run UX research on user friction. Do competitive analysis and synthesize strategy.");
    assert.ok(result);
    assert.equal(result.pack, "research");
  });

  it("suggests treatment pack for treatment content", () => {
    const result = suggestPack("Full treatment: repo audit, shipcheck, cleanup, polish, and release.");
    assert.ok(result);
    assert.equal(result.pack, "treatment");
  });

  it("returns null for content with no pack signals", () => {
    const result = suggestPack("Hello world.");
    assert.equal(result, null);
  });

  it("includes confidence level", () => {
    const result = suggestPack("Fix the bug that causes a crash and error in the regression test suite.");
    assert.ok(result);
    assert.ok(["high", "medium", "low"].includes(result.confidence));
  });
});

// ── Pack lookup ───────────────────────────────────────────────────────────────

describe("getPack", () => {
  it("returns pack by name", () => {
    const pack = getPack("feature");
    assert.ok(pack);
    assert.equal(pack.name, "Feature Build");
  });

  it("returns null for unknown pack", () => {
    assert.equal(getPack("nonexistent"), null);
  });
});

// ── Pack listing ──────────────────────────────────────────────────────────────

describe("listPacks", () => {
  it("returns all 7 packs with summary info", () => {
    const packs = listPacks();
    assert.equal(packs.length, 7);
    for (const p of packs) {
      assert.ok(p.key);
      assert.ok(p.name);
      assert.ok(p.description);
      assert.ok(p.roleCount >= 3);
    }
  });
});
