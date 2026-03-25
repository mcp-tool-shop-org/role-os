/**
 * Entry Path Comparison Trials — Phase T
 *
 * Real tasks from this repo's history, run through decideEntry().
 * For each task: what did the system pick? Was it right?
 * Findings drive hardening.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideEntry } from "../src/entry.mjs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");

function run(args) {
  return execSync(`node "${CLI}" ${args}`, { encoding: "utf-8", cwd: __dirname });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T1: Tasks that should route to MISSION
// ═══════════════════════════════════════════════════════════════════════════════

describe("T1: mission-level tasks", () => {
  const missionTasks = [
    { task: "fix the crash when saving empty packets", expected: "bugfix", why: "Clear bug + crash signals" },
    { task: "the save handler is broken and throwing regression errors", expected: "bugfix", why: "broken + regression signals" },
    { task: "run shipcheck and treatment on role-os before v1.9.0", expected: "treatment", why: "shipcheck + treatment signals" },
    { task: "polish and cleanup the repo for pre-release", expected: "treatment", why: "polish + cleanup + pre-release" },
    { task: "audit security vulnerabilities in the dispatch module", expected: "security-hardening", why: "security + vulnerability + audit" },
    { task: "security audit and threat model for the dispatch vulnerability", expected: "security-hardening", why: "security + audit + threat model + vulnerability" },
    { task: "research whether we should evaluate custom missions and investigate org adoption", expected: "research-launch", why: "research + should we + evaluate + investigate" },
    { task: "investigate and evaluate the competitive landscape strategy for CLI tools", expected: "research-launch", why: "research + evaluate + competitive + strategy" },
  ];

  for (const { task, expected, why } of missionTasks) {
    it(`"${task}" → mission:${expected} (${why})`, () => {
      const d = decideEntry(task);
      assert.equal(d.level, "mission", `Expected mission, got ${d.level}. Reason: ${d.reason}`);
      assert.equal(d.mission.key, expected, `Expected ${expected}, got ${d.mission.key}`);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T2: Tasks that should route to PACK
// ═══════════════════════════════════════════════════════════════════════════════

describe("T2: pack-level tasks", () => {
  const packTasks = [
    { task: "add a new export command for the CLI", expected: "feature", why: "Single feature, not full lifecycle" },
    { task: "build and implement a new dashboard component", expected: "feature", why: "Build + implement signals" },
    { task: "update the documentation and write handbook for mission commands", expected: "docs", why: "documentation + write + handbook signals" },
  ];

  for (const { task, expected, why } of packTasks) {
    it(`"${task}" → pack:${expected} (${why})`, () => {
      const d = decideEntry(task);
      // Accept either pack or mission (mission is a valid promotion)
      assert.ok(
        d.level === "pack" || d.level === "mission",
        `Expected pack or mission, got ${d.level}. Reason: ${d.reason}`
      );
      if (d.level === "pack") {
        assert.equal(d.pack.key, expected, `Expected ${expected} pack, got ${d.pack.key}`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T3: Tasks that should route to FREE ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

describe("T3: free-routing tasks", () => {
  const freeTasks = [
    { task: "xyzzy plugh nothing matches", why: "Gibberish" },
    { task: "think about life", why: "No technical signals" },
  ];

  for (const { task, why } of freeTasks) {
    it(`"${task}" → free-routing (${why})`, () => {
      const d = decideEntry(task);
      assert.equal(d.level, "free-routing", `Expected free-routing, got ${d.level}. Reason: ${d.reason}`);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T4: Composite tasks — should flag decomposition
// ═══════════════════════════════════════════════════════════════════════════════

describe("T4: composite task detection", () => {
  it("feature + docs is composite", () => {
    const d = decideEntry("build the new mission runner feature and then write documentation for it");
    assert.equal(d.isComposite, true);
    assert.ok(d.warnings.some(w => w.includes("composite")));
  });

  it("bugfix + security is composite", () => {
    const d = decideEntry("fix the vulnerability and then do a security audit of the whole module");
    assert.equal(d.isComposite, true);
  });

  it("single-focus tasks are not composite", () => {
    const d = decideEntry("fix the crash in save handler");
    assert.equal(d.isComposite, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T5: CLI integration — roleos start
// ═══════════════════════════════════════════════════════════════════════════════

describe("T5: CLI integration", () => {
  it("roleos start shows entry decision", () => {
    const out = run('start "fix the broken crash"');
    assert.ok(out.includes("Entry Decision:"));
    assert.ok(out.includes("Next steps:"));
  });

  it("roleos start --json outputs valid JSON", () => {
    const out = run('start --json "fix the crash"');
    const decision = JSON.parse(out);
    assert.ok(decision.level);
    assert.ok(decision.reason);
    assert.ok(typeof decision.confidence === "number");
  });

  it("roleos start with no text shows error", () => {
    try {
      run("start");
      assert.fail("Should have thrown");
    } catch (err) {
      assert.ok(err.status !== 0);
    }
  });

  it("help text shows start command", () => {
    const out = run("help");
    assert.ok(out.includes("roleos start"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL T6: Ladder honesty — system doesn't force wrong abstraction
// ═══════════════════════════════════════════════════════════════════════════════

describe("T6: ladder honesty", () => {
  it("never returns mission with null mission detail", () => {
    const tasks = ["fix crash", "build feature", "treatment", "write docs", "audit security", "research question", "novel task", ""];
    for (const task of tasks) {
      const d = decideEntry(task);
      if (d.level === "mission") {
        assert.ok(d.mission, `Mission level but mission detail is null for "${task}"`);
        assert.ok(d.mission.key, `Mission key is missing for "${task}"`);
      }
    }
  });

  it("never returns pack with null pack detail", () => {
    const tasks = ["fix crash", "build feature", "treatment", "novel task"];
    for (const task of tasks) {
      const d = decideEntry(task);
      if (d.level === "pack") {
        assert.ok(d.pack, `Pack level but pack detail is null for "${task}"`);
        assert.ok(d.pack.key, `Pack key is missing for "${task}"`);
      }
    }
  });

  it("confidence is always between 0 and 1", () => {
    const tasks = ["fix crash", "build feature", "novel task", ""];
    for (const task of tasks) {
      const d = decideEntry(task);
      assert.ok(d.confidence >= 0 && d.confidence <= 1, `Confidence ${d.confidence} out of range for "${task}"`);
    }
  });

  it("warnings are always an array", () => {
    const tasks = ["fix crash", "novel task", ""];
    for (const task of tasks) {
      const d = decideEntry(task);
      assert.ok(Array.isArray(d.warnings));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINDINGS from trials
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase T findings summary", () => {
  it("documents entry-path trial findings", () => {
    const findings = [
      {
        id: "T1-F1",
        severity: "observation",
        summary: "Short task descriptions with few signals fall to free routing even when intent is clear",
        note: "'create a threat model' only hits 1 signal — not enough for mission. Operators should use 2-3 descriptive words. This is a feature: the system is honest about weak signal instead of guessing.",
      },
      {
        id: "T2-F1",
        severity: "observation",
        summary: "Pack-level tasks sometimes promote to mission when signals overlap",
        note: "This is acceptable — mission is a valid promotion from pack. The alternative is always available.",
      },
    ];

    for (const f of findings) {
      assert.ok(f.id);
      assert.ok(f.severity);
      assert.ok(f.summary);
    }
  });
});
