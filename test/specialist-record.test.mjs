import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRecord, deriveTechniques, SHADOW_VERIFIED_MIN_PROBES } from "../src/specialist/record.mjs";

// The Record: assembled read-only from real ledgers; absent ledgers yield explicit empty
// states, techniques fire only on receipt-backed predicates (design/specialists-layer.md
// findings 5, 16-17, 21).

const ROLE = "Token Budget Analyst";

function writeRegistry(dir, { level = "L5" } = {}) {
  mkdirSync(join(dir, ".role-os"), { recursive: true });
  writeFileSync(join(dir, ".role-os", "specialists.json"), JSON.stringify({
    schema: "roleos-specialist-registry/v1",
    specialists: [{
      role: ROLE,
      backend_url: "http://localhost:8000",
      fallback: "claude",
      workload_quota: 0.5,
      active_version: "v-test-1",
      versions: [{
        id: "v-test-1", adapter_id: "test-adapter", base_model: "Qwen/Qwen3-14B",
        gate_threshold: 0.6, certified_level: level, exam_hash: "abc123",
        field_audit_window: 200, created_at: "2026-06-05T00:00:00Z", ood_floor: 0.4,
      }],
    }],
  }));
}

function appendEvents(dir, events) {
  mkdirSync(join(dir, ".role-os"), { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(join(dir, ".role-os", "specialist-events.jsonl"), lines, { flag: "a" });
}

const probe = (agreed, i) => ({ kind: "shadow-probe", role: ROLE, ts: `2026-06-07T00:00:${String(i % 60).padStart(2, "0")}Z`, data: { agreed } });

describe("buildRecord — honest empty states", () => {
  let dir;
  before(() => { dir = mkdtempSync(join(tmpdir(), "roleos-record-empty-")); });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it("yields assessed basis, null band, and empty ledgers in a bare repo", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    assert.equal(r.certification.current, null);
    assert.equal(r.certification.basis, "assessed");
    assert.equal(r.certification.band, null);
    assert.deepEqual(r.certification.ledger, []);
    assert.equal(r.field.dispatchWindow, null);
    assert.equal(r.field.probes, null);
    assert.deepEqual(r.field.perTask, []);
    assert.equal(r.field.outcomes, null);
    assert.equal(r.field.overrides, null);
    assert.equal(r.calibration, null);
    assert.equal(r.divergence.status, "unmonitored");
    assert.deepEqual(r.repsEvents, []);
    assert.deepEqual(r.techniques, []);
  });
});

describe("buildRecord — certification from the registry + events ledger", () => {
  let dir;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), "roleos-record-cert-"));
    writeRegistry(dir);
    appendEvents(dir, [
      { kind: "register", role: ROLE, ts: "2026-06-05T16:23:45.076Z", data: { version_id: "v-test-1", certified_level: "L5" } },
      { kind: "promote", role: ROLE, ts: "2026-06-05T16:23:45.147Z", data: { from_version: null, to_version: "v-test-1", certified_level: "L5" } },
    ]);
  });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it("reports certified basis with the active version, band still null until measured", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    assert.equal(r.certification.basis, "certified");
    assert.equal(r.certification.current.certified_level, "L5");
    assert.equal(r.certification.current.version_id, "v-test-1");
    assert.equal(r.certification.band, null);
    assert.equal(r.certification.ledger.length, 2);
  });

  it("earns clean-promotion when the ledger has a promote and no rollback/halt", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    const t = r.techniques.find((x) => x.id === "clean-promotion");
    assert.ok(t, "clean-promotion earned");
    assert.ok(t.receipts[0].includes("v-test-1"));
  });

  it("feeds reps from the certification ledger (verified events, not activity)", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    assert.deepEqual(r.repsEvents.map((e) => e.kind), ["certification", "promote"]);
  });

  it("a rollback receipt revokes clean-promotion eligibility", () => {
    appendEvents(dir, [{ kind: "rollback", role: ROLE, ts: "2026-06-08T00:00:00Z", data: { from_version: "v-test-1", to_version: null } }]);
    const r = buildRecord(ROLE, { cwd: dir });
    assert.equal(r.techniques.find((x) => x.id === "clean-promotion"), undefined);
    // ...but the rollback itself is still a verified event on the ledger.
    assert.ok(r.repsEvents.some((e) => e.kind === "rollback"));
  });
});

describe("deriveTechniques — shadow-verified streak", () => {
  const cert = { current: null };

  it(`earns at ${SHADOW_VERIFIED_MIN_PROBES} consecutive agreed probes, not one sooner`, () => {
    const just = Array.from({ length: SHADOW_VERIFIED_MIN_PROBES }, (_, i) => probe(true, i));
    assert.ok(deriveTechniques({ certification: cert, events: just }).some((t) => t.id === "shadow-verified"));
    const oneShort = just.slice(1);
    assert.ok(!deriveTechniques({ certification: cert, events: oneShort }).some((t) => t.id === "shadow-verified"));
  });

  it("a single disagreement breaks the streak", () => {
    const events = Array.from({ length: SHADOW_VERIFIED_MIN_PROBES }, (_, i) => probe(i !== 3, i));
    assert.ok(!deriveTechniques({ certification: cert, events }).some((t) => t.id === "shadow-verified"));
  });

  it("clear-halt is an operator boundary — only probes after it count", () => {
    const events = [
      ...Array.from({ length: 30 }, (_, i) => probe(true, i)),
      { kind: "clear-halt", role: ROLE, ts: "2026-06-07T01:00:00Z", data: {} },
      ...Array.from({ length: 5 }, (_, i) => probe(true, i)),
    ];
    assert.ok(!deriveTechniques({ certification: cert, events }).some((t) => t.id === "shadow-verified"));
  });
});

describe("buildRecord — field signals from runs and the outcome ledger", () => {
  let dir;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), "roleos-record-field-"));
    mkdirSync(join(dir, ".claude", "runs"), { recursive: true });
    writeFileSync(join(dir, ".claude", "runs", "run-1.json"), JSON.stringify({
      id: "run-1",
      steps: [
        { role: ROLE, produces: "budget-forecast", status: "complete", completedAt: "2026-06-08T10:00:00Z" },
        { role: ROLE, produces: "budget-forecast", status: "failed" },
        { role: "Judge", produces: "verdict", status: "complete", completedAt: "2026-06-08T11:00:00Z" },
      ],
    }));
    mkdirSync(join(dir, ".claude", "calibration"), { recursive: true });
    writeFileSync(join(dir, ".claude", "calibration", "outcome-ledger.jsonl"),
      JSON.stringify({ completionStatus: "completed", rolesUsed: [ROLE, "Judge"], corrections: 1, rejectedVerdicts: 0 }) + "\n" +
      JSON.stringify({ completionStatus: "failed", rolesUsed: ["Judge"], corrections: 0, rejectedVerdicts: 2 }) + "\n");
  });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it("aggregates per-task rows for this role only", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    assert.deepEqual(r.field.perTask, [{ produces: "budget-forecast", complete: 1, failed: 1, blocked: 0, other: 0 }]);
  });

  it("summarizes only outcome rows this role participated in", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    assert.equal(r.field.outcomes.runs, 1);
    assert.equal(r.field.outcomes.completed, 1);
    assert.equal(r.field.outcomes.corrections, 1);
  });

  it("accepted field work feeds reps; failed steps do not", () => {
    const r = buildRecord(ROLE, { cwd: dir });
    const field = r.repsEvents.filter((e) => e.kind === "field");
    assert.equal(field.length, 1);
    assert.equal(field[0].ref, "run-1:budget-forecast");
  });
});

describe("buildRecord — against this repo's committed registry (smoke)", () => {
  // Only asserts COMMITTED truth: .role-os/specialists.json ships in git, but the events
  // ledger (.role-os/specialist-events.jsonl) is gitignored runtime state, so ledger and
  // technique behavior is covered by the fixture suites above, not here (CI has no ledger).
  it("Token Budget Analyst reads as certified L5 from the committed registry", () => {
    const r = buildRecord("Token Budget Analyst", { cwd: join(import.meta.dirname, "..") });
    assert.equal(r.certification.basis, "certified");
    assert.equal(r.certification.current.certified_level, "L5");
    assert.equal(r.certification.band, null);
  });
});
