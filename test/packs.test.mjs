import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEAM_PACKS, suggestPack, getPack, listPacks, checkPackMismatch, getPackRoles } from "../src/packs.mjs";
import { ROLE_CATALOG } from "../src/route.mjs";

// ── Pack structure ────────────────────────────────────────────────────────────

describe("TEAM_PACKS", () => {
  it("has 10 packs", () => {
    assert.equal(Object.keys(TEAM_PACKS).length, 10);
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

  it("every pack includes Critic Reviewer or Judge (Orchestrator is conditional)", () => {
    for (const [key, pack] of Object.entries(TEAM_PACKS)) {
      assert.ok(pack.roles.includes("Critic Reviewer") || pack.roles.includes("Judge"), `${key} missing Critic Reviewer or Judge`);
      // Orchestrator is now conditional — only required packs include it
      if (pack.orchestratorRequired) {
        assert.ok(pack.roles.includes("Orchestrator"), `${key} declares orchestratorRequired but missing Orchestrator`);
      }
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
  it("returns all 10 packs with summary info", () => {
    const packs = listPacks();
    assert.equal(packs.length, 10);
    for (const p of packs) {
      assert.ok(p.key);
      assert.ok(p.name);
      assert.ok(p.description);
      assert.ok(p.roleCount >= 3);
    }
  });
});

// ── Calibration: mismatch detection ───────────────────────────────────────────

describe("checkPackMismatch (J1 calibration)", () => {
  it("feature pack detects security task as mismatch", () => {
    const result = checkPackMismatch("feature", "Security review the dispatch engine for injection vulnerabilities and threat model.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "security");
  });

  it("bugfix pack detects launch task as mismatch", () => {
    const result = checkPackMismatch("bugfix", "Plan and write the v1.2.0 launch announcement with release notes and social messaging.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "launch");
  });

  it("security pack detects docs task as mismatch", () => {
    const result = checkPackMismatch("security", "Restructure the handbook documentation and add a navigation page.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "docs");
  });

  it("docs pack detects research task as mismatch", () => {
    const result = checkPackMismatch("docs", "Research whether we should add GPT-4 support. Assess the competitive strategy.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "research");
  });

  it("launch pack detects bugfix as mismatch", () => {
    const result = checkPackMismatch("launch", "Fix the crash that happens when the error handler encounters a broken file.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "bugfix");
  });

  it("research pack detects implementation task as mismatch", () => {
    const result = checkPackMismatch("research", "Implement the roleos execute command and build the CLI handler.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "feature");
  });

  it("treatment pack detects launch task as mismatch", () => {
    const result = checkPackMismatch("treatment", "Write the v1.1.0 social media announcement and release notes messaging.");
    assert.ok(result);
    assert.equal(result.suggestInstead, "launch");
  });

  it("returns null when pack matches the task", () => {
    const result = checkPackMismatch("feature", "Build a new CLI command to show pack details and role lineups.");
    assert.equal(result, null);
  });
});

// ── Calibration: conditional Orchestrator ──────────────────────────────────────

describe("getPackRoles (conditional Orchestrator)", () => {
  it("feature pack includes Orchestrator (required)", () => {
    const roles = getPackRoles("feature");
    assert.ok(roles.includes("Orchestrator"));
  });

  it("bugfix pack excludes Orchestrator by default", () => {
    const roles = getPackRoles("bugfix");
    assert.ok(!roles.includes("Orchestrator"), "Bugfix should not include Orchestrator by default");
  });

  it("security pack excludes Orchestrator by default", () => {
    const roles = getPackRoles("security");
    assert.ok(!roles.includes("Orchestrator"));
  });

  it("launch pack excludes Orchestrator by default", () => {
    const roles = getPackRoles("launch");
    assert.ok(!roles.includes("Orchestrator"));
  });

  it("forceOrchestrator adds it to any pack", () => {
    const roles = getPackRoles("bugfix", true);
    assert.ok(roles.includes("Orchestrator"));
  });
});

// ── Calibration: Treatment includes Security Reviewer ─────────────────────────

describe("treatment pack calibration (J2)", () => {
  it("treatment pack includes Security Reviewer by default", () => {
    const pack = getPack("treatment");
    assert.ok(pack.roles.includes("Security Reviewer"), "Treatment must include Security Reviewer");
  });
});

// ── Calibration: Research pack reordered ───────────────────────────────────────

describe("research pack calibration (J2)", () => {
  it("research pack opens with Product Strategist (framing first)", () => {
    const pack = getPack("research");
    // First non-Orchestrator role should be Product Strategist
    const firstRole = pack.roles[0];
    assert.equal(firstRole, "Product Strategist", "Research pack should open with Product Strategist");
  });
});

// ── Calibration: Docs pack has upstream synthesis ──────────────────────────────

describe("docs pack calibration (final fix)", () => {
  it("docs pack opens with Support Triage Lead (interpret before synthesize)", () => {
    const pack = getPack("docs");
    assert.equal(pack.roles[0], "Support Triage Lead", "Docs should open with triage interpretation");
  });

  it("docs pack has Feedback Synthesizer as second role", () => {
    const pack = getPack("docs");
    assert.equal(pack.roles[1], "Feedback Synthesizer", "Synthesis follows triage");
  });

  it("docs pack moved Release Engineer + Deployment Verifier to optional", () => {
    const pack = getPack("docs");
    assert.ok(!pack.roles.includes("Release Engineer"), "Release Engineer should be optional");
    assert.ok(!pack.roles.includes("Deployment Verifier"), "Deployment Verifier should be optional");
    assert.ok(pack.optionalRoles.includes("Release Engineer"));
    assert.ok(pack.optionalRoles.includes("Deployment Verifier"));
  });
});
