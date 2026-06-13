import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  logDispatchInput,
  readFieldInputs,
  summarizeFieldInputs,
  FIELD_INPUT_MAX_CHARS,
  DRIFT_MIN_SAMPLES,
} from "../src/specialist/field-log.mjs";

function tmpLog() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-field-log-"));
  return { dir, path: join(dir, "specialist-field-log.jsonl"), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const OBS = (over = {}) => ({
  role: "Token Budget Analyst",
  ts: "2026-06-13T00:00:00Z",
  traceId: "t1",
  route: "specialist",
  source: "specialist",
  input: { claim: "x" },
  ...over,
});

describe("field-log — append and read back", () => {
  it("logDispatchInput writes a record readFieldInputs returns with the expected fields", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ input: "hello budget" }));
      const rows = readFieldInputs(path);
      assert.equal(rows.length, 1);
      const r = rows[0];
      assert.equal(r.role, "Token Budget Analyst");
      assert.equal(r.ts, "2026-06-13T00:00:00Z");
      assert.equal(r.trace_id, "t1");
      assert.equal(r.route, "specialist");
      assert.equal(r.source, "specialist");
      assert.equal(r.input, "hello budget");
      assert.equal(r.input_len, "hello budget".length);
      assert.match(r.input_sha256, /^[0-9a-f]{64}$/);
      assert.equal(r.input_truncated, undefined);
    } finally { cleanup(); }
  });

  it("creates parent directories as needed (mkdir -p semantics)", () => {
    const { dir, cleanup } = tmpLog();
    try {
      const nested = join(dir, "deep", "nested", "field-log.jsonl");
      logDispatchInput(nested, OBS());
      assert.equal(readFieldInputs(nested).length, 1);
    } finally { cleanup(); }
  });
});

describe("field-log — stable, order-independent hashing", () => {
  it("object inputs hash by sorted keys (insertion order does not change the sha)", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ traceId: "a", input: { b: 2, a: 1 } }));
      logDispatchInput(path, OBS({ traceId: "b", input: { a: 1, b: 2 } }));
      const [r1, r2] = readFieldInputs(path);
      assert.equal(r1.input_sha256, r2.input_sha256, "same content, same hash regardless of key order");
    } finally { cleanup(); }
  });

  it("different content yields different hashes", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ traceId: "a", input: { a: 1 } }));
      logDispatchInput(path, OBS({ traceId: "b", input: { a: 2 } }));
      const [r1, r2] = readFieldInputs(path);
      assert.notEqual(r1.input_sha256, r2.input_sha256);
    } finally { cleanup(); }
  });
});

describe("field-log — truncation", () => {
  it("bounds the stored snapshot but hashes/length the FULL input", () => {
    const { path, cleanup } = tmpLog();
    try {
      const big = "z".repeat(FIELD_INPUT_MAX_CHARS + 500);
      logDispatchInput(path, OBS({ input: big }));
      const r = readFieldInputs(path)[0];
      assert.equal(r.input.length, FIELD_INPUT_MAX_CHARS);
      assert.equal(r.input_truncated, true);
      assert.equal(r.input_len, FIELD_INPUT_MAX_CHARS + 500, "length reflects the full input, not the snapshot");
    } finally { cleanup(); }
  });
});

describe("field-log — filtering and tolerance", () => {
  it("readFieldInputs filters by role", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ role: "A" }));
      logDispatchInput(path, OBS({ role: "B" }));
      logDispatchInput(path, OBS({ role: "A" }));
      assert.equal(readFieldInputs(path, { role: "A" }).length, 2);
      assert.equal(readFieldInputs(path, { role: "B" }).length, 1);
    } finally { cleanup(); }
  });

  it("absent file reads as empty", () => {
    const { dir, cleanup } = tmpLog();
    try {
      assert.deepEqual(readFieldInputs(join(dir, "nope.jsonl")), []);
    } finally { cleanup(); }
  });

  it("non-parsing lines are skipped (operator-editable in a pinch)", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS());
      appendFileSync(path, "not json\n", "utf8");
      logDispatchInput(path, OBS({ traceId: "t2" }));
      assert.equal(readFieldInputs(path).length, 2);
    } finally { cleanup(); }
  });
});

describe("field-log — accumulation summary (the Record's divergence field)", () => {
  it("empty log reports unmonitored with zero samples", () => {
    const { dir, cleanup } = tmpLog();
    try {
      const s = summarizeFieldInputs(join(dir, "nope.jsonl"));
      assert.equal(s.status, "unmonitored");
      assert.equal(s.samples, 0);
      assert.equal(s.min_samples, DRIFT_MIN_SAMPLES);
    } finally { cleanup(); }
  });

  it("reports accumulating with honest counts below the threshold; no drift verdict", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ traceId: "a", source: "specialist", input: { a: 1 } }));
      logDispatchInput(path, OBS({ traceId: "b", source: "claude", input: { a: 1 } })); // duplicate content
      logDispatchInput(path, OBS({ traceId: "c", source: "specialist", input: { a: 2 } }));
      const s = summarizeFieldInputs(path, { minSamples: 100 });
      assert.equal(s.status, "accumulating");
      assert.equal(s.samples, 3);
      assert.equal(s.distinct_inputs, 2, "two distinct input hashes among three rows");
      assert.equal(s.specialist_routed, 2);
      assert.equal(s.test_ready, false);
      assert.equal(s.last_seen, "2026-06-13T00:00:00Z");
      assert.ok(!("fresh" in s) && !("stale" in s), "no drift verdict is emitted yet");
    } finally { cleanup(); }
  });

  it("flips test_ready once samples reach minSamples", () => {
    const { path, cleanup } = tmpLog();
    try {
      for (let i = 0; i < 4; i++) logDispatchInput(path, OBS({ traceId: `t${i}`, input: { i } }));
      const s = summarizeFieldInputs(path, { minSamples: 4 });
      assert.equal(s.test_ready, true);
      assert.equal(s.samples, 4);
    } finally { cleanup(); }
  });

  it("filters the summary by role", () => {
    const { path, cleanup } = tmpLog();
    try {
      logDispatchInput(path, OBS({ role: "A", traceId: "a" }));
      logDispatchInput(path, OBS({ role: "B", traceId: "b" }));
      assert.equal(summarizeFieldInputs(path, { role: "A" }).samples, 1);
    } finally { cleanup(); }
  });
});
