import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dispatchSpecialist } from "../src/specialist/dispatch.mjs";
import { saveRegistry, REGISTRY_SCHEMA } from "../src/specialist/registry.mjs";
import { readEvents } from "../src/specialist/events.mjs";
import { loadState, getHalt } from "../src/specialist/state.mjs";
import { readFieldInputs } from "../src/specialist/field-log.mjs";

function tmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-dispatch-"));
  return {
    dir,
    paths: {
      registry: join(dir, "specialists.json"),
      state: join(dir, "state.json"),
      events: join(dir, "events.jsonl"),
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function writeRegistry(path, over = {}) {
  saveRegistry(path, {
    schema: REGISTRY_SCHEMA,
    specialists: [
      {
        role: "Verifier",
        backend_url: "http://stub",
        fallback: "claude",
        workload_quota: 0.7,
        active_version: "v1",
        versions: [
          {
            id: "v1",
            adapter_id: "adapter-1",
            base_model: "Qwen/Qwen3-7B",
            gate_threshold: 0.6,
            certified_level: "L1",
            exam_hash: "e",
            field_audit_window: 200,
            created_at: "2026-06-04T00:00:00Z",
            ...(over.versionOver || {}),
          },
        ],
        ...(over.entryOver || {}),
      },
    ],
    ...(over.regOver || {}),
  });
}

/** Drive the gate deterministically — always-pass classifier. */
const PASS = { scoreFn: () => 0.99, oodFn: () => false };

/** A canned httpFn that returns a successful specialist response. */
function specialistOk(verdict = "supported", adapter_id = "adapter-1") {
  return async () => ({
    ok: true,
    status: 200,
    json: { verdict, score: 0.9, adapter_id, base_model: "Qwen/Qwen3-7B", duration_ms: 100 },
    error: null,
  });
}

/** A canned httpFn that errors at the transport layer. */
const specialistErr = async () => ({ ok: false, status: 0, json: null, error: "timeout" });

const NOW = "2026-06-04T00:00:00Z";

// ── Happy path: specialist serves the dispatch ─────────────────────────────────────────────────

describe("dispatchSpecialist — happy path", () => {
  it("routes to specialist; result comes from the backend", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: { claim: "x" },
        claudeFn: async () => { throw new Error("Claude should not be called on happy path"); },
        traceId: "t1",
        nowIso: NOW,
        paths,
        classifier: PASS,
        httpFn: specialistOk("supported"),
      });
      assert.equal(result, "supported");
      assert.equal(receipt.route, "specialist");
      assert.equal(receipt.source, "specialist");
      assert.equal(receipt.specialist_call.ok, true);
      assert.equal(receipt.specialist_call.adapter_id, "adapter-1");
    } finally { cleanup(); }
  });
});

// ── Gate-level fail-open: no specialist call, result from Claude ──────────────────────────────

describe("dispatchSpecialist — gate fails open", () => {
  it("when score is below threshold, calls Claude and never the specialist", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      let httpCalls = 0;
      const httpFn = async () => {
        httpCalls += 1;
        throw new Error("specialist should not be called");
      };
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-said-so",
        traceId: "t1",
        nowIso: NOW,
        paths,
        classifier: { scoreFn: () => 0.1, oodFn: () => false }, // below 0.6 threshold
        httpFn,
      });
      assert.equal(httpCalls, 0);
      assert.equal(result, "claude-said-so");
      assert.equal(receipt.route, "claude");
      assert.equal(receipt.source, "claude");
      assert.equal(receipt.decision.reason, "score_below_threshold");
      assert.equal(receipt.specialist_call, undefined);
    } finally { cleanup(); }
  });

  it("when no registry entry exists, falls open to Claude with reason no_registry_entry", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      // intentionally do NOT write a registry
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude",
        traceId: "t1",
        nowIso: NOW,
        paths,
        classifier: PASS,
        httpFn: specialistOk(),
      });
      assert.equal(result, "claude");
      assert.equal(receipt.decision.reason, "no_registry_entry");
    } finally { cleanup(); }
  });
});

// ── Transport-level fail-open: gate routes to specialist, call fails, Claude takes over ───────

describe("dispatchSpecialist — transport fail-open", () => {
  it("specialist call failure → falls open to Claude", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-fallback",
        traceId: "t1",
        nowIso: NOW,
        paths,
        classifier: PASS,
        httpFn: specialistErr,
      });
      assert.equal(result, "claude-fallback");
      assert.equal(receipt.route, "specialist"); // gate's decision
      assert.equal(receipt.source, "claude");    // realized
      assert.equal(receipt.specialist_call.ok, false);
      assert.equal(receipt.specialist_call.error, "timeout");
    } finally { cleanup(); }
  });

  it("adapter_id echo mismatch → falls open to Claude", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const httpFn = async () => ({
        ok: true, status: 200, error: null,
        json: { verdict: "OK", adapter_id: "WRONG-ADAPTER", base_model: "Qwen", duration_ms: 10 },
      });
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-safe",
        traceId: "t1",
        nowIso: NOW,
        paths,
        classifier: PASS,
        httpFn,
      });
      assert.equal(result, "claude-safe");
      assert.equal(receipt.source, "claude");
      assert.equal(receipt.specialist_call.error, "adapter_id_mismatch");
    } finally { cleanup(); }
  });
});

// ── Shadow probe firing ───────────────────────────────────────────────────────────────────────

describe("dispatchSpecialist — shadow probe", () => {
  it("fires every K dispatches (K=2 to keep the test small)", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      let claudeCalls = 0;
      const claudeFn = async () => { claudeCalls += 1; return "supported"; };
      for (let i = 0; i < 4; i++) {
        await dispatchSpecialist({
          role: "Verifier",
          input: {},
          claudeFn,
          traceId: `t${i}`,
          nowIso: NOW,
          paths,
          classifier: PASS,
          httpFn: specialistOk("supported"),
          shadow: { K: 2 },
        });
      }
      // Dispatches 2 and 4 should fire shadow probes → 2 extra Claude calls
      assert.equal(claudeCalls, 2);
      const probes = readEvents(paths.events, { kind: "shadow-probe" });
      assert.equal(probes.length, 2);
      assert.equal(probes[0].data.agreed, true);
    } finally { cleanup(); }
  });

  it("records disagreement when verdicts differ", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const claudeFn = async () => "unsupported"; // diverges from specialist
      await dispatchSpecialist({
        role: "Verifier", input: {}, claudeFn, traceId: "t1", nowIso: NOW, paths,
        classifier: PASS, httpFn: specialistOk("supported"), shadow: { K: 1 },
      });
      const probes = readEvents(paths.events, { kind: "shadow-probe" });
      assert.equal(probes.length, 1);
      assert.equal(probes[0].data.agreed, false);
    } finally { cleanup(); }
  });
});

// ── Halt after rolling-window disagreement ────────────────────────────────────────────────────

describe("dispatchSpecialist — andon halt", () => {
  it("halts the role after N=5 probes with disagreement > tau", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      // Tiny window: K=1 (every dispatch is a probe), N=5, tau=0.4 → halt when ≥3/5 disagree
      const claudeFn = async () => "unsupported"; // always disagrees
      for (let i = 0; i < 5; i++) {
        await dispatchSpecialist({
          role: "Verifier", input: {}, claudeFn,
          traceId: `t${i}`, nowIso: NOW, paths,
          classifier: PASS, httpFn: specialistOk("supported"),
          shadow: { K: 1, N: 5, tau: 0.4 },
        });
      }
      // After 5 disagreements, halt should fire
      const halts = readEvents(paths.events, { kind: "halt" });
      assert.equal(halts.length, 1);
      assert.equal(halts[0].role, "Verifier");
      const state = loadState(paths.state);
      const h = getHalt(state, "Verifier");
      assert.equal(h.halted, true);
      assert.match(h.reason, /halted/);
    } finally { cleanup(); }
  });

  it("after a halt, the gate refuses to route to the specialist (sticky)", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      // Trigger the halt with tight thresholds.
      const claudeFn = async () => "B";
      for (let i = 0; i < 5; i++) {
        await dispatchSpecialist({
          role: "Verifier", input: {}, claudeFn,
          traceId: `t${i}`, nowIso: NOW, paths,
          classifier: PASS, httpFn: specialistOk("A"), shadow: { K: 1, N: 5, tau: 0.4 },
        });
      }
      // Now make a new dispatch and ensure the specialist HTTP is NOT called
      let httpCalls = 0;
      const watchedHttp = async () => { httpCalls += 1; return { ok: true, status: 200, json: { verdict: "A", adapter_id: "adapter-1" }, error: null }; };
      const { receipt } = await dispatchSpecialist({
        role: "Verifier", input: {}, claudeFn: async () => "B",
        traceId: "tFinal", nowIso: NOW, paths,
        classifier: PASS, httpFn: watchedHttp, shadow: { K: 1, N: 5, tau: 0.4 },
      });
      assert.equal(httpCalls, 0);
      assert.equal(receipt.decision.reason, "shadow_probe_halt");
      assert.equal(receipt.source, "claude");
    } finally { cleanup(); }
  });
});

// ── Receipt is a stable shape ─────────────────────────────────────────────────────────────────

describe("dispatchSpecialist — receipt shape", () => {
  it("schema, role, ts, trace_id, route, source, decision are present", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const { receipt } = await dispatchSpecialist({
        role: "Verifier", input: {}, claudeFn: async () => "x",
        traceId: "t1", nowIso: NOW, paths,
        classifier: PASS, httpFn: specialistOk(),
      });
      assert.equal(receipt.schema, "roleos-specialist-receipt/v1");
      assert.equal(receipt.role, "Verifier");
      assert.equal(receipt.ts, NOW);
      assert.equal(receipt.trace_id, "t1");
      assert.equal(typeof receipt.route, "string");
      assert.equal(typeof receipt.source, "string");
      assert.equal(typeof receipt.decision, "object");
    } finally { cleanup(); }
  });
});

// ── Field-input logging (S5) ───────────────────────────────────────────────────────────────────

describe("dispatchSpecialist — field-input logging", () => {
  it("logs one field-input observation per dispatch, co-located with the events ledger", async () => {
    const { dir, paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      await dispatchSpecialist({
        role: "Verifier", input: { claim: "alpha" }, claudeFn: async () => "x",
        traceId: "t1", nowIso: NOW, paths, classifier: PASS, httpFn: specialistOk("supported"),
      });
      const rows = readFieldInputs(join(dir, "specialist-field-log.jsonl"), { role: "Verifier" });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].route, "specialist");
      assert.equal(rows[0].source, "specialist");
      assert.match(rows[0].input_sha256, /^[0-9a-f]{64}$/);
      assert.ok(rows[0].input.includes("alpha"));
    } finally { cleanup(); }
  });

  it("logs both routes — a Claude-routed (gate fail-open) dispatch records source=claude", async () => {
    const { dir, paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      await dispatchSpecialist({
        role: "Verifier", input: { claim: "beta" }, claudeFn: async () => "claude-said-so",
        traceId: "t1", nowIso: NOW, paths,
        classifier: { scoreFn: () => 0.1, oodFn: () => false }, httpFn: specialistOk(),
      });
      const rows = readFieldInputs(join(dir, "specialist-field-log.jsonl"));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].route, "claude");
      assert.equal(rows[0].source, "claude");
    } finally { cleanup(); }
  });

  it("a logging failure never breaks a dispatch (best-effort contract)", async () => {
    const { dir, paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      // Point the field log at a path whose parent is a FILE, so mkdir/append throws internally.
      const blocker = join(dir, "blocker");
      writeFileSync(blocker, "x");
      const { result } = await dispatchSpecialist({
        role: "Verifier", input: {}, claudeFn: async () => "x",
        traceId: "t1", nowIso: NOW, paths: { ...paths, fieldLog: join(blocker, "field-log.jsonl") },
        classifier: PASS, httpFn: specialistOk("supported"),
      });
      assert.equal(result, "supported"); // dispatch still succeeded despite the logging error
    } finally { cleanup(); }
  });

  it("respects an explicit paths.fieldLog override", async () => {
    const { dir, paths, cleanup } = tmpDir();
    try {
      writeRegistry(paths.registry);
      const custom = join(dir, "custom-field-log.jsonl");
      await dispatchSpecialist({
        role: "Verifier", input: {}, claudeFn: async () => "x",
        traceId: "t1", nowIso: NOW, paths: { ...paths, fieldLog: custom },
        classifier: PASS, httpFn: specialistOk(),
      });
      assert.equal(readFieldInputs(custom).length, 1);
      assert.equal(readFieldInputs(join(dir, "specialist-field-log.jsonl")).length, 0);
    } finally { cleanup(); }
  });
});
