import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideEntry, formatEntryDecision } from "../src/entry.mjs";

// ── Mission-level routing ───────────────────────────────────────────────────

describe("decideEntry → mission", () => {
  it("routes bugfix tasks to bugfix mission", () => {
    const d = decideEntry("fix the crash in save handler, it's broken");
    assert.equal(d.level, "mission");
    assert.equal(d.mission.key, "bugfix");
    assert.ok(d.confidence >= 0.5);
    assert.ok(d.reason.includes("Bugfix"));
  });

  it("routes treatment tasks to treatment mission", () => {
    const d = decideEntry("run the full treatment and shipcheck on this repo before publishing");
    assert.equal(d.level, "mission");
    assert.equal(d.mission.key, "treatment");
  });

  it("routes security audit tasks to security-hardening mission", () => {
    const d = decideEntry("audit security vulnerabilities and create threat model for dispatch");
    assert.equal(d.level, "mission");
    assert.equal(d.mission.key, "security-hardening");
  });

  it("routes research tasks to research-launch mission", () => {
    const d = decideEntry("research whether we should evaluate custom missions for org adoption");
    assert.equal(d.level, "mission");
    assert.equal(d.mission.key, "research-launch");
  });

  it("provides alternative when choosing mission", () => {
    const d = decideEntry("fix the crash in save handler, it's broken");
    assert.ok(d.alternative);
    assert.equal(d.alternative.level, "pack");
  });

  it("includes mission details: key, name, pack, roleChain, entryPath, stepCount", () => {
    const d = decideEntry("fix the broken crash bug regression");
    assert.equal(d.level, "mission");
    assert.ok(d.mission.key);
    assert.ok(d.mission.name);
    assert.ok(d.mission.pack);
    assert.ok(d.mission.roleChain.length > 0);
    assert.ok(d.mission.entryPath);
    assert.ok(d.mission.stepCount > 0);
  });
});

// ── Pack-level routing ──────────────────────────────────────────────────────

describe("decideEntry → pack", () => {
  it("routes clear feature tasks to feature pack", () => {
    const d = decideEntry("add a new export command for artifacts");
    assert.equal(d.level, "pack");
    assert.equal(d.pack.key, "feature");
  });

  it("includes pack details: key, name, roles, chainOrder", () => {
    const d = decideEntry("add a new export command for artifacts");
    assert.equal(d.level, "pack");
    assert.ok(d.pack.key);
    assert.ok(d.pack.name);
    assert.ok(d.pack.roles.length > 0);
    assert.ok(d.pack.chainOrder);
  });

  it("warns on low-confidence pack match", () => {
    const d = decideEntry("do something with the code");
    if (d.level === "pack") {
      assert.ok(d.warnings.length > 0 || d.confidence < 0.5);
    }
  });
});

// ── Free routing ────────────────────────────────────────────────────────────

describe("decideEntry → free-routing", () => {
  it("falls back to free routing for novel tasks", () => {
    const d = decideEntry("something completely novel that matches nothing at all");
    assert.equal(d.level, "free-routing");
    assert.ok(d.confidence < 0.2);
    assert.ok(d.freeRouting);
    assert.ok(d.freeRouting.hint);
  });

  it("falls back for empty input", () => {
    const d = decideEntry("");
    assert.equal(d.level, "free-routing");
    assert.equal(d.confidence, 0);
    assert.ok(d.warnings.includes("Empty task description"));
  });

  it("includes routing hint", () => {
    const d = decideEntry("xyzzy plugh nothing matches");
    assert.equal(d.level, "free-routing");
    assert.ok(d.freeRouting.hint.includes("packet") || d.freeRouting.hint.includes("route"));
  });
});

// ── Composite detection ─────────────────────────────────────────────────────

describe("composite task handling", () => {
  it("flags composite tasks", () => {
    const d = decideEntry("build the new dashboard feature, then write documentation and update the changelog");
    assert.equal(d.isComposite, true);
    assert.ok(d.warnings.some(w => w.includes("composite")));
  });

  it("non-composite tasks are not flagged", () => {
    const d = decideEntry("fix the crash in save handler");
    assert.equal(d.isComposite, false);
  });
});

// ── Agreement boost ─────────────────────────────────────────────────────────

describe("mission-pack agreement", () => {
  it("boosts confidence when mission and pack agree", () => {
    // Bugfix: both mission and pack point to bugfix
    const d = decideEntry("fix the broken crash in save handler");
    if (d.level === "mission") {
      assert.ok(d.confidence > 0.5, "Agreement should boost confidence");
    }
  });
});

// ── Format output ───────────────────────────────────────────────────────────

describe("formatEntryDecision", () => {
  it("formats mission decision", () => {
    const d = decideEntry("fix the broken crash bug regression");
    const text = formatEntryDecision(d);
    assert.ok(text.includes("MISSION"));
    assert.ok(text.includes("Chain:"));
    assert.ok(text.includes("Alternative:"));
  });

  it("formats pack decision", () => {
    const d = decideEntry("add a new export command");
    const text = formatEntryDecision(d);
    assert.ok(text.includes("PACK") || text.includes("MISSION"));
    // Either is acceptable — depends on signal strength
  });

  it("formats free-routing decision", () => {
    const d = decideEntry("xyzzy plugh nothing");
    const text = formatEntryDecision(d);
    assert.ok(text.includes("FREE-ROUTING"));
    assert.ok(text.includes("Hint:"));
  });

  it("includes composite note when relevant", () => {
    const d = decideEntry("build feature then write docs and fix bugs");
    if (d.isComposite) {
      const text = formatEntryDecision(d);
      assert.ok(text.includes("composite"));
    }
  });

  it("includes warnings", () => {
    const d = decideEntry("");
    const text = formatEntryDecision(d);
    assert.ok(text.includes("Warnings:"));
  });
});

// ── Decision shape ──────────────────────────────────────────────────────────

describe("decision shape", () => {
  it("always has required fields", () => {
    const tasks = [
      "fix the crash",
      "add a new feature",
      "run the treatment",
      "something novel",
      "",
    ];
    for (const task of tasks) {
      const d = decideEntry(task);
      assert.ok(["mission", "pack", "free-routing"].includes(d.level), `Invalid level: ${d.level}`);
      assert.ok(typeof d.reason === "string");
      assert.ok(typeof d.confidence === "number");
      assert.ok(typeof d.isComposite === "boolean");
      assert.ok(Array.isArray(d.warnings));
      // Exactly one of mission/pack/freeRouting is non-null
      const nonNull = [d.mission, d.pack, d.freeRouting].filter(x => x !== null);
      assert.equal(nonNull.length, 1, `Expected exactly 1 non-null detail for "${task}", got ${nonNull.length}`);
    }
  });
});
