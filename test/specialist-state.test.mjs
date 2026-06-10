import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  emptyState,
  loadState,
  saveState,
  ensureRole,
  recordDispatch,
  quotaStateFor,
  incrementProbeCounter,
  resetProbeCounter,
  getHalt,
  setHalt,
  STATE_SCHEMA,
} from "../src/specialist/state.mjs";

function tmpFile(name = "state.json") {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-state-"));
  const path = join(dir, name);
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ── empty + round-trip ─────────────────────────────────────────────────────────────────────────

describe("state — emptyState + loadState + saveState", () => {
  it("emptyState returns a valid shape", () => {
    const s = emptyState();
    assert.equal(s.schema, STATE_SCHEMA);
    assert.deepEqual(s.roles, {});
  });

  it("loadState returns empty when the file does not exist", () => {
    const s = loadState("/nonexistent/state.json");
    assert.deepEqual(s, emptyState());
  });

  it("round-trips a state file", () => {
    const { path, cleanup } = tmpFile();
    try {
      const s = emptyState();
      recordDispatch(s, "specialist", 100, 1717545600000);
      recordDispatch(s, "claude", 100, 1717545601000);
      saveState(path, s);
      const back = loadState(path);
      assert.deepEqual(back.dispatches, [
        { t: 1717545600000, route: "specialist" },
        { t: 1717545601000, route: "claude" },
      ]);
    } finally { cleanup(); }
  });

  it("loadState throws STATE_SCHEMA_MISMATCH on wrong schema", () => {
    const { path, cleanup } = tmpFile();
    try {
      writeFileSync(path, JSON.stringify({ schema: "wrong", roles: {} }), "utf8");
      assert.throws(() => loadState(path), (err) => err.code === "STATE_SCHEMA_MISMATCH");
    } finally { cleanup(); }
  });

  it("loadState throws STATE_PARSE_ERROR on bad JSON", () => {
    const { path, cleanup } = tmpFile();
    try {
      writeFileSync(path, "{ not json", "utf8");
      assert.throws(() => loadState(path), (err) => err.code === "STATE_PARSE_ERROR");
    } finally { cleanup(); }
  });
});

// ── ensureRole + recordDispatch ──────────────────────────────────────────────────────────────

describe("state — ensureRole", () => {
  it("creates a fresh slot with zero probe counter and null halt", () => {
    const s = emptyState();
    const slot = ensureRole(s, "Verifier");
    // v2: dispatches live in the shared state.dispatches window, not in per-role slots
    assert.deepEqual(slot, { probe_counter: 0, halt: null });
  });

  it("does not overwrite an existing slot", () => {
    const s = emptyState();
    ensureRole(s, "Verifier").probe_counter = 5;
    ensureRole(s, "Verifier");
    assert.equal(s.roles.Verifier.probe_counter, 5);
  });
});

describe("state — recordDispatch (sliding window)", () => {
  it("appends route-tagged records in order", () => {
    const s = emptyState();
    recordDispatch(s, "specialist", 100, 1000);
    recordDispatch(s, "claude", 100, 2000);
    assert.deepEqual(s.dispatches, [
      { t: 1000, route: "specialist" },
      { t: 2000, route: "claude" },
    ]);
  });

  it("trims to window size", () => {
    const s = emptyState();
    for (let i = 0; i < 5; i++) recordDispatch(s, "specialist", 3, 1000 + i);
    assert.deepEqual(s.dispatches.map((d) => d.t), [1002, 1003, 1004]);
  });
});

// ── quotaStateFor ─────────────────────────────────────────────────────────────────────────────

describe("state — quotaStateFor", () => {
  it("returns used=0 for an unknown role", () => {
    assert.deepEqual(quotaStateFor(emptyState(), "Verifier", 100), { used: 0, window: 100 });
  });

  it("counts only specialist-routed records in the shared window", () => {
    const s = emptyState();
    recordDispatch(s, "specialist", 100, 1);
    recordDispatch(s, "claude", 100, 2);
    recordDispatch(s, "specialist", 100, 3);
    assert.deepEqual(quotaStateFor(s, "Verifier", 100), { used: 2, window: 100 });
  });
});

// ── probe counter ─────────────────────────────────────────────────────────────────────────────

describe("state — probe counter", () => {
  it("increments and returns the new value", () => {
    const s = emptyState();
    assert.equal(incrementProbeCounter(s, "Verifier"), 1);
    assert.equal(incrementProbeCounter(s, "Verifier"), 2);
    assert.equal(s.roles.Verifier.probe_counter, 2);
  });

  it("resetProbeCounter zeros the value", () => {
    const s = emptyState();
    incrementProbeCounter(s, "Verifier");
    incrementProbeCounter(s, "Verifier");
    resetProbeCounter(s, "Verifier");
    assert.equal(s.roles.Verifier.probe_counter, 0);
  });
});

// ── halt state ────────────────────────────────────────────────────────────────────────────────

describe("state — halt", () => {
  it("returns { halted: false } for unknown / not-halted role", () => {
    assert.deepEqual(getHalt(emptyState(), "Verifier"), { halted: false });
  });

  it("setHalt + getHalt round-trip", () => {
    const s = emptyState();
    setHalt(s, "Verifier", { reason: "drift", since: "2026-06-04T00:00:00Z" });
    const h = getHalt(s, "Verifier");
    assert.equal(h.halted, true);
    assert.equal(h.reason, "drift");
    assert.equal(h.since, "2026-06-04T00:00:00Z");
  });

  it("setHalt(null) clears", () => {
    const s = emptyState();
    setHalt(s, "Verifier", { reason: "drift", since: "2026-06-04T00:00:00Z" });
    setHalt(s, "Verifier", null);
    assert.deepEqual(getHalt(s, "Verifier"), { halted: false });
  });
});
