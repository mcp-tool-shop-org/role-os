import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  shouldShadowProbe,
  recordProbe,
  checkHalt,
  contrastiveHaltMessage,
  appendHaltEvent,
  appendClearHaltEvent,
  SHADOW_DEFAULTS,
} from "../src/specialist/shadow.mjs";
import { readEvents } from "../src/specialist/events.mjs";

function tmpFile(name = "events.jsonl") {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-shadow-"));
  const path = join(dir, name);
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("shouldShadowProbe", () => {
  it("fires only on the Kth tick", () => {
    assert.equal(shouldShadowProbe(1, 20), false);
    assert.equal(shouldShadowProbe(19, 20), false);
    assert.equal(shouldShadowProbe(20, 20), true);
    assert.equal(shouldShadowProbe(21, 20), true); // counter >= K (caller resets after probe)
  });

  it("uses SHADOW_DEFAULTS.K by default (20)", () => {
    assert.equal(SHADOW_DEFAULTS.K, 20);
    assert.equal(shouldShadowProbe(20), true);
    assert.equal(shouldShadowProbe(19), false);
  });
});

describe("recordProbe", () => {
  it("appends a JSONL line readable by readEvents", () => {
    const { path, cleanup } = tmpFile();
    try {
      recordProbe(path, {
        role: "Verifier",
        ts: "2026-06-04T00:00:00Z",
        trace_id: "t1",
        agreed: true,
        specialist_summary: "supported",
        claude_summary: "supported",
      });
      const events = readEvents(path, { role: "Verifier", kind: "shadow-probe" });
      assert.equal(events.length, 1);
      assert.equal(events[0].kind, "shadow-probe");
      assert.equal(events[0].data.agreed, true);
      assert.equal(events[0].data.trace_id, "t1");
    } finally { cleanup(); }
  });
});

describe("checkHalt", () => {
  it("does not halt on a thin sample (probes < N)", () => {
    const { path, cleanup } = tmpFile();
    try {
      // 5 probes, ALL disagree — agreement = 0%, but probes < N=50 so we should NOT halt
      for (let i = 0; i < 5; i++) {
        recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: false });
      }
      const r = checkHalt(path, "Verifier", 50, 0.15);
      assert.equal(r.probes, 5);
      assert.equal(r.shouldHalt, false);
    } finally { cleanup(); }
  });

  it("halts when probes >= N and rate < 1 - tau", () => {
    const { path, cleanup } = tmpFile();
    try {
      // 50 probes: 40 agree, 10 disagree -> rate = 0.8 < 0.85 (1 - 0.15) -> halt
      for (let i = 0; i < 40; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: true });
      for (let i = 40; i < 50; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: false });
      const r = checkHalt(path, "Verifier", 50, 0.15);
      assert.equal(r.probes, 50);
      assert.equal(r.agreed, 40);
      assert.equal(r.rate, 0.8);
      assert.equal(r.shouldHalt, true);
    } finally { cleanup(); }
  });

  it("does NOT halt when rate >= 1 - tau", () => {
    const { path, cleanup } = tmpFile();
    try {
      // 50 probes: 45 agree, 5 disagree -> rate = 0.9 ≥ 0.85 -> no halt
      for (let i = 0; i < 45; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: true });
      for (let i = 45; i < 50; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: false });
      const r = checkHalt(path, "Verifier", 50, 0.15);
      assert.equal(r.shouldHalt, false);
    } finally { cleanup(); }
  });

  it("uses only the last N events when more exist", () => {
    const { path, cleanup } = tmpFile();
    try {
      // 100 probes total: first 50 all disagree, last 50 all agree → rolling window of 50 is healthy
      for (let i = 0; i < 50; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: false });
      for (let i = 50; i < 100; i++) recordProbe(path, { role: "Verifier", ts: `t${i}`, trace_id: `id${i}`, agreed: true });
      const r = checkHalt(path, "Verifier", 50, 0.15);
      assert.equal(r.rate, 1);
      assert.equal(r.shouldHalt, false);
    } finally { cleanup(); }
  });
});

describe("contrastiveHaltMessage", () => {
  it("includes role, probes, rate, tau, and the clear-halt command", () => {
    const msg = contrastiveHaltMessage({ role: "Verifier", probes: 50, rate: 0.8, tau: 0.15 });
    assert.match(msg, /Verifier/);
    assert.match(msg, /80\.0%/);
    assert.match(msg, /50 probes/);
    assert.match(msg, /85\.0%/);
    assert.match(msg, /roleos specialist clear-halt Verifier/);
  });
});

describe("appendHaltEvent + appendClearHaltEvent", () => {
  it("halt event is recoverable via readEvents", () => {
    const { path, cleanup } = tmpFile();
    try {
      appendHaltEvent(path, {
        role: "Verifier",
        ts: "2026-06-04T00:00:00Z",
        reason: "drift",
        probes: 50, agreed: 40, rate: 0.8, tau: 0.15,
      });
      const events = readEvents(path, { role: "Verifier", kind: "halt" });
      assert.equal(events.length, 1);
      assert.equal(events[0].data.reason, "drift");
      assert.equal(events[0].data.probes, 50);
    } finally { cleanup(); }
  });

  it("clear-halt event records operator + reason", () => {
    const { path, cleanup } = tmpFile();
    try {
      appendClearHaltEvent(path, {
        role: "Verifier",
        ts: "2026-06-04T00:00:00Z",
        operator: "mike",
        reason: "reviewed disagreements, false alarm",
      });
      const events = readEvents(path, { role: "Verifier", kind: "clear-halt" });
      assert.equal(events.length, 1);
      assert.equal(events[0].data.operator, "mike");
      assert.match(events[0].data.reason, /false alarm/);
    } finally { cleanup(); }
  });
});

describe("readEvents — filtering", () => {
  it("filters by role and kind", () => {
    const { path, cleanup } = tmpFile();
    try {
      recordProbe(path, { role: "A", ts: "t1", trace_id: "x", agreed: true });
      recordProbe(path, { role: "B", ts: "t2", trace_id: "y", agreed: true });
      appendHaltEvent(path, { role: "A", ts: "t3", reason: "r", probes: 50, agreed: 30, rate: 0.6, tau: 0.15 });
      const probesA = readEvents(path, { role: "A", kind: "shadow-probe" });
      const haltsA = readEvents(path, { role: "A", kind: "halt" });
      const allA = readEvents(path, { role: "A" });
      assert.equal(probesA.length, 1);
      assert.equal(haltsA.length, 1);
      assert.equal(allA.length, 2);
    } finally { cleanup(); }
  });

  it("returns empty list on missing file (does not throw)", () => {
    assert.deepEqual(readEvents("/nonexistent/events.jsonl"), []);
  });

  it("accepts an array of kinds", () => {
    const { path, cleanup } = tmpFile();
    try {
      recordProbe(path, { role: "A", ts: "t1", trace_id: "x", agreed: true });
      appendHaltEvent(path, { role: "A", ts: "t2", reason: "r", probes: 50, agreed: 30, rate: 0.6, tau: 0.15 });
      assert.equal(readEvents(path, { kind: ["shadow-probe", "halt"] }).length, 2);
    } finally { cleanup(); }
  });
});
