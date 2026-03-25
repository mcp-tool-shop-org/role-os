import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MISSIONS,
  listMissions,
  getMission,
  suggestMission,
  validateMission,
  validateAllMissions,
} from "../src/mission.mjs";

// ── Catalog completeness ────────────────────────────────────────────────────

describe("MISSIONS catalog", () => {
  it("defines 6 named missions", () => {
    assert.equal(Object.keys(MISSIONS).length, 6);
  });

  it("every mission has required fields", () => {
    for (const [key, m] of Object.entries(MISSIONS)) {
      assert.ok(m.name, `${key} missing name`);
      assert.ok(m.description, `${key} missing description`);
      assert.ok(m.pack, `${key} missing pack`);
      assert.ok(m.entryPath, `${key} missing entryPath`);
      assert.ok(Array.isArray(m.roleChain), `${key} missing roleChain`);
      assert.ok(m.roleChain.length >= 2, `${key} roleChain too short`);
      assert.ok(Array.isArray(m.artifactFlow), `${key} missing artifactFlow`);
      assert.ok(m.artifactFlow.length >= 2, `${key} artifactFlow too short`);
      assert.ok(Array.isArray(m.escalationBranches), `${key} missing escalationBranches`);
      assert.ok(m.escalationBranches.length >= 2, `${key} needs at least 2 escalation branches`);
      assert.ok(m.honestPartial, `${key} missing honestPartial`);
      assert.ok(Array.isArray(m.stopConditions), `${key} missing stopConditions`);
      assert.ok(m.stopConditions.length >= 2, `${key} needs at least 2 stop conditions`);
      assert.ok(m.dispatchDefaults, `${key} missing dispatchDefaults`);
      assert.ok(m.dispatchDefaults.model, `${key} missing dispatch model`);
      assert.ok(m.dispatchDefaults.maxTurns > 0, `${key} maxTurns must be positive`);
      assert.ok(m.dispatchDefaults.maxBudgetUsd > 0, `${key} maxBudgetUsd must be positive`);
    }
  });

  it("every artifact flow step has role, produces, and consumedBy", () => {
    for (const [key, m] of Object.entries(MISSIONS)) {
      for (const step of m.artifactFlow) {
        assert.ok(step.role, `${key} artifact flow step missing role`);
        assert.ok(step.produces, `${key} artifact flow step missing produces`);
        assert.ok("consumedBy" in step, `${key} artifact flow step missing consumedBy`);
      }
    }
  });

  it("last artifact flow step has consumedBy null (terminal)", () => {
    for (const [key, m] of Object.entries(MISSIONS)) {
      const last = m.artifactFlow[m.artifactFlow.length - 1];
      assert.equal(last.consumedBy, null, `${key} last step should be terminal`);
    }
  });

  it("every escalation branch has trigger, from, to, action", () => {
    for (const [key, m] of Object.entries(MISSIONS)) {
      for (const branch of m.escalationBranches) {
        assert.ok(branch.trigger, `${key} escalation missing trigger`);
        assert.ok(branch.from, `${key} escalation missing from`);
        assert.ok(branch.to, `${key} escalation missing to`);
        assert.ok(branch.action, `${key} escalation missing action`);
      }
    }
  });

  it("has the expected mission keys", () => {
    const keys = Object.keys(MISSIONS);
    assert.ok(keys.includes("feature-ship"));
    assert.ok(keys.includes("bugfix"));
    assert.ok(keys.includes("treatment"));
    assert.ok(keys.includes("docs-release"));
    assert.ok(keys.includes("security-hardening"));
    assert.ok(keys.includes("research-launch"));
  });
});

// ── listMissions ────────────────────────────────────────────────────────────

describe("listMissions", () => {
  it("returns array with correct shape", () => {
    const list = listMissions();
    assert.ok(Array.isArray(list));
    assert.equal(list.length, 6);
    for (const item of list) {
      assert.ok(item.key);
      assert.ok(item.name);
      assert.ok(item.description);
      assert.ok(item.pack);
      assert.ok(item.roleCount > 0);
    }
  });
});

// ── getMission ──────────────────────────────────────────────────────────────

describe("getMission", () => {
  it("returns mission for valid key", () => {
    const m = getMission("bugfix");
    assert.equal(m.name, "Bugfix & Diagnosis");
    assert.equal(m.pack, "bugfix");
  });

  it("returns null for unknown key", () => {
    assert.equal(getMission("nonexistent"), null);
  });
});

// ── suggestMission ──────────────────────────────────────────────────────────

describe("suggestMission", () => {
  it("suggests bugfix for crash descriptions", () => {
    const result = suggestMission("fix the crash in save handler, it's broken");
    assert.ok(result);
    assert.equal(result.mission, "bugfix");
  });

  it("suggests feature-ship for feature descriptions", () => {
    const result = suggestMission("implement a new command to build and ship feature");
    assert.ok(result);
    assert.equal(result.mission, "feature-ship");
  });

  it("suggests treatment for polish descriptions", () => {
    const result = suggestMission("run the full treatment and shipcheck on this repo");
    assert.ok(result);
    assert.equal(result.mission, "treatment");
  });

  it("suggests docs-release for docs descriptions", () => {
    const result = suggestMission("update the documentation and write release notes");
    assert.ok(result);
    assert.equal(result.mission, "docs-release");
  });

  it("suggests security-hardening for security descriptions", () => {
    const result = suggestMission("audit security vulnerabilities and threat model");
    assert.ok(result);
    assert.equal(result.mission, "security-hardening");
  });

  it("suggests research-launch for research descriptions", () => {
    const result = suggestMission("research whether we should evaluate this strategy");
    assert.ok(result);
    assert.equal(result.mission, "research-launch");
  });

  it("returns null for unrecognizable descriptions", () => {
    const result = suggestMission("xyzzy plugh nothing matches");
    assert.equal(result, null);
  });

  it("returns confidence levels", () => {
    const high = suggestMission("fix the bug, it's broken and crashed with regression");
    assert.ok(high);
    assert.equal(high.confidence, "high");

    const low = suggestMission("something about a bug");
    assert.ok(low);
    // low confidence for single signal match
    assert.ok(["low", "medium"].includes(low.confidence));
  });
});

// ── validateMission ─────────────────────────────────────────────────────────

describe("validateMission", () => {
  it("validates a good mission", () => {
    const result = validateMission("feature-ship");
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it("fails for unknown mission", () => {
    const result = validateMission("nonexistent");
    assert.equal(result.valid, false);
    assert.ok(result.issues[0].includes("not found"));
  });

  it("validates all 6 missions successfully", () => {
    for (const key of Object.keys(MISSIONS)) {
      const result = validateMission(key);
      assert.equal(result.valid, true, `${key} failed: ${result.issues.join(", ")}`);
    }
  });
});

// ── validateAllMissions ─────────────────────────────────────────────────────

describe("validateAllMissions", () => {
  it("returns allValid true for current catalog", () => {
    const { allValid, results } = validateAllMissions();
    assert.equal(allValid, true);
    assert.equal(Object.keys(results).length, 6);
  });
});
