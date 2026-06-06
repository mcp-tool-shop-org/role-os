import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  consultConformance,
  schemaFloor,
  contractFloor,
  resolveOperand,
  conformanceConsultEnabled,
  conformanceAgree,
  evidenceFor,
  claimFor,
  CONFORMANCE_ROLE,
} from "../src/specialist/conformance-consult.mjs";

const FORCE_SPECIALIST = { scoreFn: () => 1.0, oodFn: () => false };

const REGISTRY_SPECIALISTS = [
  {
    role: CONFORMANCE_ROLE,
    backend_url: "http://localhost:8001",
    fallback: "claude",
    workload_quota: 1.0,
    active_version: "v1",
    versions: [
      {
        id: "v1",
        adapter_id: "conformance-14b-soup",
        base_model: "Qwen/Qwen3-14B",
        gate_threshold: 0.6,
        certified_level: "L5",
        exam_hash: "fixture",
        field_audit_window: 200,
        created_at: "2026-06-06T00:00:00Z",
        ood_floor: 0.4,
      },
    ],
  },
];

function fixturePaths(specialists = REGISTRY_SPECIALISTS) {
  const dir = mkdtempSync(join(tmpdir(), "roleos-conf-"));
  const registry = join(dir, "specialists.json");
  writeFileSync(registry, JSON.stringify({ schema: "roleos-specialist-registry/v1", specialists }));
  return { registry, state: join(dir, "state.json"), events: join(dir, "events.jsonl") };
}

const TOOL = {
  name: "read_file",
  contract: "Reads a UTF-8 text file. `path` MUST be an absolute path.",
  params: [{ name: "path", type: "string", required: true }, { name: "encoding", type: "string", required: false, enum: ["utf-8", "ascii"] }],
};
const HTTP_TOOL = {
  name: "http_fetch",
  contract: "Fetches a URL via the given method.",
  params: [{ name: "url", type: "string", required: true }, { name: "method", type: "string", required: true, enum: ["GET", "POST"] }, { name: "retries", type: "integer", required: false, max: 5 }],
};

const okHttp = (verdict) => async () => ({
  ok: true, status: 200, error: null,
  json: { verdict, score: 0.9, adapter_id: "conformance-14b-soup", base_model: "Qwen/Qwen3-14B", duration_ms: 5 },
});
const downHttp = async () => ({ ok: false, status: 0, json: null, error: "ECONNREFUSED" });
const throwHttp = async () => { throw new Error("boom"); };
const failIfCalled = async () => { throw new Error("LLM must NOT be consulted when the floor catches it"); };

describe("schemaFloor (deterministic L1-L3)", () => {
  it("passes a fully valid call", () => {
    assert.equal(schemaFloor(TOOL, { path: "/etc/hosts", encoding: "utf-8" }).verdict, null);
  });
  it("catches a missing required arg (L2)", () => {
    assert.equal(schemaFloor(TOOL, { encoding: "utf-8" }).verdict, "nonconformant");
  });
  it("catches a wrong type (L1)", () => {
    const r = schemaFloor(TOOL, { path: 42 });
    assert.equal(r.verdict, "nonconformant");
    assert.ok(r.violations.some((v) => v.includes("should be string")));
  });
  it("catches an out-of-enum value (L3)", () => {
    assert.equal(schemaFloor(TOOL, { path: "/x", encoding: "base64" }).verdict, "nonconformant");
  });
  it("catches an over-max value (L3)", () => {
    assert.equal(schemaFloor(HTTP_TOOL, { url: "/x", method: "GET", retries: 99 }).verdict, "nonconformant");
  });
});

describe("contractFloor (computable L4 — the v0.3 floor)", () => {
  const T = (constraints, params = []) => ({ name: "t", contract: "c", params, constraints });

  it("no constraints -> defers (verdict null)", () => {
    assert.equal(contractFloor(T([]), { a: 1 }).verdict, null);
  });

  it("cmp lt: proves an inverted ordering", () => {
    const tool = T([{ kind: "cmp", op: "lt", left: "start", right: "end" }]);
    assert.equal(contractFloor(tool, { start: 5, end: 10 }).verdict, null);
    const bad = contractFloor(tool, { start: 10, end: 5 });
    assert.equal(bad.verdict, "nonconformant");
    assert.ok(bad.violations[0].includes("not lt"));
  });

  it("cmp le with {len} operand: cardinality top_n <= len(docs)", () => {
    const tool = T([{ kind: "cmp", op: "le", left: "top_n", right: { len: "docs" } }]);
    assert.equal(contractFloor(tool, { top_n: 3, docs: ["a", "b", "c"] }).verdict, null);
    assert.equal(contractFloor(tool, { top_n: 5, docs: ["a", "b", "c"] }).verdict, "nonconformant");
  });

  it("cmp eq with {len} operands: len(inputs) == len(ids)", () => {
    const tool = T([{ kind: "cmp", op: "eq", left: { len: "inputs" }, right: { len: "ids" } }]);
    assert.equal(contractFloor(tool, { inputs: [1, 2, 3], ids: ["a", "b", "c"] }).verdict, null);
    assert.equal(contractFloor(tool, { inputs: [1, 2, 3], ids: ["a", "b"] }).verdict, "nonconformant");
  });

  it("sum eq (with float tolerance): allocations must total the budget", () => {
    const tool = T([{ kind: "sum", op: "eq", of: "alloc", vs: "total" }]);
    assert.equal(contractFloor(tool, { alloc: { a: 600, b: 400 }, total: 1000 }).verdict, null);
    assert.equal(contractFloor(tool, { alloc: { a: 600, b: 300 }, total: 1000 }).verdict, "nonconformant");
    // float weights summing to 1.0 within epsilon
    assert.equal(contractFloor(tool, { alloc: [0.4, 0.35, 0.25], total: 1.0 }).verdict, null);
  });

  it("sum le over a LIST of scalar fields: additive in-bounds x+width <= W", () => {
    const tool = T([{ kind: "sum", op: "le", of: ["x", "width"], vs: "image_width" }]);
    assert.equal(contractFloor(tool, { x: 100, width: 800, image_width: 1920 }).verdict, null);
    assert.equal(contractFloor(tool, { x: 1500, width: 800, image_width: 1920 }).verdict, "nonconformant");
  });

  it("present: exactly one of ip|cname (mutual exclusion)", () => {
    const tool = T([{ kind: "present", fields: ["ip", "cname"], count: 1 }]);
    assert.equal(contractFloor(tool, { ip: "1.2.3.4" }).verdict, null);
    assert.equal(contractFloor(tool, { ip: "1.2.3.4", cname: "x.example" }).verdict, "nonconformant"); // both
    assert.equal(contractFloor(tool, {}).verdict, "nonconformant"); // neither
  });

  it("requires: conditional co-requirement (if mtls then ca_path)", () => {
    const tool = T([{ kind: "requires", when: { field: "mtls", equals: true }, require: ["ca_path"] }]);
    assert.equal(contractFloor(tool, { mtls: true, ca_path: "/etc/ca.pem" }).verdict, null);
    assert.equal(contractFloor(tool, { mtls: false }).verdict, null); // condition not hit
    assert.equal(contractFloor(tool, { mtls: true }).verdict, "nonconformant");
  });

  it("distinct: source != destination", () => {
    const tool = T([{ kind: "distinct", fields: ["src", "dst"] }]);
    assert.equal(contractFloor(tool, { src: "a", dst: "b" }).verdict, null);
    assert.equal(contractFloor(tool, { src: "a", dst: "a" }).verdict, "nonconformant");
  });

  it("member: value must be in a STATE-provided set", () => {
    const tool = T([{ kind: "member", field: "seat", in: { state: "available" } }]);
    const state = { available: ["12A", "12B", "14C"] };
    assert.equal(contractFloor(tool, { seat: "12B" }, state).verdict, null);
    assert.equal(contractFloor(tool, { seat: "30F" }, state).verdict, "nonconformant");
    // prose/absent state -> can't resolve -> DEFERS, never false-flags
    assert.equal(contractFloor(tool, { seat: "30F" }, "prose only").verdict, null);
  });

  it("char_at: reference allele matches the sequence at position (0-based)", () => {
    const tool = T([{ kind: "char_at", string: "seq", index: "pos", equals: "ref" }]);
    assert.equal(contractFloor(tool, { seq: "ACGT", pos: 0, ref: "A" }).verdict, null);
    assert.equal(contractFloor(tool, { seq: "ACGT", pos: 0, ref: "T" }).verdict, "nonconformant");
  });

  it("char_at with offset: 1-based position (offset -1)", () => {
    const tool = T([{ kind: "char_at", string: "seq", index: "pos", equals: "ref", offset: -1 }]);
    // "ACGTTAGCCA": 1-based pos 5 -> index 4 -> "T"
    assert.equal(contractFloor(tool, { seq: "ACGTTAGCCA", pos: 5, ref: "T" }).verdict, null);
    assert.equal(contractFloor(tool, { seq: "ACGTTAGCCA", pos: 5, ref: "A" }).verdict, "nonconformant");
  });

  it("UNEVALUABLE constraints DEFER (never assert conformance, never false-flag)", () => {
    const tool = T([{ kind: "cmp", op: "lt", left: "a", right: "missing" }]);
    assert.equal(contractFloor(tool, { a: 1 }).verdict, null); // right operand absent -> defer
    const unknown = T([{ kind: "no_such_kind", foo: 1 }]);
    assert.equal(contractFloor(unknown, { a: 1 }).verdict, null); // forward-compatible
  });

  it("resolveOperand resolves bare-field / value / len / state", () => {
    assert.equal(resolveOperand("a", { a: 7 }), 7);
    assert.equal(resolveOperand({ value: 9 }, {}), 9);
    assert.equal(resolveOperand({ len: "xs" }, { xs: [1, 2, 3] }), 3);
    assert.equal(resolveOperand({ state: "k" }, {}, { k: 42 }), 42);
  });
});

describe("conformance helpers", () => {
  it("conformanceConsultEnabled reads the flag (default OFF)", () => {
    const prev = process.env.ROLEOS_CONFORMANCE_CONSULT;
    delete process.env.ROLEOS_CONFORMANCE_CONSULT;
    assert.equal(conformanceConsultEnabled(), false);
    process.env.ROLEOS_CONFORMANCE_CONSULT = "1";
    assert.equal(conformanceConsultEnabled(), true);
    if (prev === undefined) delete process.env.ROLEOS_CONFORMANCE_CONSULT;
    else process.env.ROLEOS_CONFORMANCE_CONSULT = prev;
  });
  it("evidenceFor/claimFor match the trained EVIDENCE/CLAIM shape", () => {
    const ev = evidenceFor(TOOL, "read hosts");
    assert.ok(ev.startsWith("TOOL: read_file\nCONTRACT:"));
    assert.ok(ev.includes("PARAMS (JSON schema):") && ev.includes("INTENT: read hosts"));
    assert.equal(claimFor(TOOL, { path: "/etc/hosts" }), 'CALL: read_file({"path":"/etc/hosts"})');
  });
  it("conformanceAgree normalizes string|{verdict}", () => {
    assert.equal(conformanceAgree("conformant", { verdict: "conformant" }), true);
    assert.equal(conformanceAgree("nonconformant", "conformant"), false);
  });
});

describe("consultConformance", () => {
  it("is a no-op when disabled (the default)", async () => {
    const r = await consultConformance({ tool: TOOL, call: { path: "/x" } }, { enabled: false });
    assert.equal(r.verdict, null);
    assert.equal(r.source, "disabled");
  });

  it("short-circuits to the floor on a mechanical violation — WITHOUT consulting the LLM", async () => {
    const r = await consultConformance(
      { tool: TOOL, call: { path: 42 } },                       // wrong type
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: failIfCalled, classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "nonconformant");
    assert.equal(r.source, "floor");
    assert.ok(r.receipt.decision.detail.includes("should be string"));
  });

  it("short-circuits to the CONTRACT floor on a computable violation — WITHOUT consulting the LLM", async () => {
    const tool = {
      name: "split_traffic", contract: "weights must sum to 100",
      params: [{ name: "weights", type: "array", required: true }],
      constraints: [{ kind: "sum", op: "eq", of: "weights", vs: { value: 100 } }],
    };
    const r = await consultConformance(
      { tool, call: { weights: [60, 30] } },                    // sums to 90, schema-valid
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: failIfCalled, classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "nonconformant");
    assert.equal(r.source, "floor");
    assert.equal(r.receipt.decision.reason, "contract_violation");
    assert.ok(r.receipt.decision.detail.includes("sum"));
  });

  it("contract floor uses STATE (member) to prove an out-of-set value — no LLM", async () => {
    const tool = {
      name: "assign_seat", contract: "seat must be available",
      params: [{ name: "seat", type: "string", required: true }],
      constraints: [{ kind: "member", field: "seat", in: { state: "available" } }],
    };
    const r = await consultConformance(
      { tool, call: { seat: "30F" }, state: { available: ["12A", "12B"] } },
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: failIfCalled, classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "nonconformant");
    assert.equal(r.source, "floor");
  });

  it("contract floor PASSES (defers) -> still consults the LLM for the residual semantics", async () => {
    const tool = {
      name: "split_traffic", contract: "weights must sum to 100",
      params: [{ name: "weights", type: "array", required: true }],
      constraints: [{ kind: "sum", op: "eq", of: "weights", vs: { value: 100 } }],
    };
    const r = await consultConformance(
      { tool, call: { weights: [60, 40] } },                    // sums to 100 -> floor defers
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: okHttp("conformant"), classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "conformant");
    assert.equal(r.source, "specialist");
  });

  it("floor passes -> consults the specialist (L4/L5)", async () => {
    const r = await consultConformance(
      { tool: TOOL, call: { path: "/etc/hosts" }, intent: "read hosts" },
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: okHttp("conformant"), classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "conformant");
    assert.equal(r.source, "specialist");
    assert.equal(r.receipt.schema, "roleos-specialist-receipt/v1");
  });

  it("FAILS OPEN to abstain (escalate) — never 'conformant' — when the backend is down", async () => {
    const r = await consultConformance(
      { tool: TOOL, call: { path: "/etc/hosts" } },
      { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: downHttp, classifier: FORCE_SPECIALIST }
    );
    assert.equal(r.verdict, "abstain");
    assert.notEqual(r.verdict, "conformant");
  });

  it("NEVER throws — an unexpected error yields a receipt + abstain", async () => {
    let r;
    await assert.doesNotReject(async () => {
      r = await consultConformance(
        { tool: TOOL, call: { path: "/etc/hosts" } },
        { enabled: true, paths: fixturePaths(), nowIso: "2026-06-06T00:00:00Z", httpFn: throwHttp, classifier: FORCE_SPECIALIST }
      );
    });
    assert.equal(r.verdict, "abstain");
    assert.ok(r.receipt);
  });
});
