import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  chiSquareSf,
  gTest,
  atcPredictedAccuracy,
  eceEqualMass,
  eceBootstrapLowerCI,
  assessDrift,
  ksTwoSample,
  parseNumber,
  DRIFT_DEFAULTS,
} from "../src/specialist/drift.mjs";

// A sealed-exam reference fixture: balanced 2-class exam, 90% accurate, ATC threshold 0.7.
const REF = {
  schema: "roleos-exam-reference/v1",
  role: "R",
  classes: ["a", "b"],
  label_marginal: { a: 0.5, b: 0.5 },
  n_exam: 300,
  exam_accuracy: 0.9,
  atc_threshold: 0.7,
  exam_ece: 0.03,
};

/** Build n specialist-source field rows: a-fraction `aFrac`, constant `score`, optional `outcome`. */
function rows(n, { aFrac = 0.5, score, outcome } = {}) {
  const out = [];
  const aCount = Math.round(n * aFrac);
  for (let i = 0; i < n; i++) {
    const row = { role: "R", source: "specialist", verdict: i < aCount ? "a" : "b" };
    if (score !== undefined) row.score = score;
    if (outcome !== undefined) row.outcome = outcome;
    out.push(row);
  }
  return out;
}

describe("chiSquareSf — against known critical values", () => {
  it("matches alpha=0.05 critical points", () => {
    assert.ok(Math.abs(chiSquareSf(3.841, 1) - 0.05) < 0.002, "df=1");
    assert.ok(Math.abs(chiSquareSf(5.991, 2) - 0.05) < 0.002, "df=2");
    assert.ok(Math.abs(chiSquareSf(11.07, 5) - 0.05) < 0.003, "df=5");
  });
  it("matches alpha=0.001 and edge cases", () => {
    assert.ok(Math.abs(chiSquareSf(10.828, 1) - 0.001) < 0.0005);
    assert.equal(chiSquareSf(0, 1), 1);
    assert.equal(chiSquareSf(5, 0), 1); // df=0 → no test
  });
});

describe("gTest — verdict-marginal homogeneity", () => {
  it("identical marginals → ~no statistic, p≈1, tv 0", () => {
    const g = gTest({ a: 150, b: 150 }, { a: 100, b: 100 }, ["a", "b"]);
    assert.ok(g.G < 1e-6);
    assert.ok(g.p > 0.99);
    assert.equal(g.tv_distance, 0);
    assert.equal(g.df, 1);
  });
  it("shifted marginals → small p and correct TV distance", () => {
    const g = gTest({ a: 150, b: 150 }, { a: 30, b: 170 }, ["a", "b"]); // field 0.15/0.85 vs 0.5/0.5
    assert.ok(g.p < 0.01, `p=${g.p}`);
    assert.equal(g.tv_distance, 0.35);
  });
  it("df = K-1 for three classes", () => {
    const g = gTest({ a: 100, b: 100, c: 100 }, { a: 100, b: 100, c: 100 }, ["a", "b", "c"]);
    assert.equal(g.df, 2);
  });
});

describe("atcPredictedAccuracy", () => {
  it("fraction at or above threshold", () => {
    assert.equal(atcPredictedAccuracy([0.9, 0.8, 0.6, 0.5], 0.7), 0.5);
    assert.equal(atcPredictedAccuracy([], 0.7), null);
    assert.equal(atcPredictedAccuracy([0.9], undefined), null);
  });
});

describe("eceEqualMass + bootstrap CI", () => {
  it("perfect calibration → ~0", () => {
    // confidence == accuracy in each region: low-conf wrong, high-conf right
    const pairs = [];
    for (let i = 0; i < 50; i++) pairs.push({ conf: 0.5, correct: i % 2 === 0 }); // 0.5 conf, 50% right
    for (let i = 0; i < 50; i++) pairs.push({ conf: 1.0, correct: true }); // 1.0 conf, 100% right
    const e = eceEqualMass(pairs, 10, 5);
    assert.ok(e < 0.05, `ece=${e}`);
  });
  it("overconfident-and-wrong → large ECE, bootstrap lower CI also large", () => {
    const pairs = Array.from({ length: 60 }, () => ({ conf: 0.95, correct: false }));
    const e = eceEqualMass(pairs, 10, 5);
    assert.ok(e > 0.9, `ece=${e}`);
    const lo = eceBootstrapLowerCI(pairs, { nbins: 10, minPerBin: 5, B: 200 });
    assert.ok(lo > 0.9, `lowerCI=${lo}`);
  });
  it("bootstrap CI is deterministic (seeded)", () => {
    const pairs = Array.from({ length: 40 }, (_, i) => ({ conf: 0.8, correct: i % 3 !== 0 }));
    const a = eceBootstrapLowerCI(pairs, { nbins: 10, minPerBin: 5, B: 200 });
    const b = eceBootstrapLowerCI(pairs, { nbins: 10, minPerBin: 5, B: 200 });
    assert.equal(a, b);
  });
});

describe("assessDrift — honest pre-test states", () => {
  it("no reference → accumulating", () => {
    const r = assessDrift({ fieldRows: rows(200, { score: 0.9 }), reference: null });
    assert.equal(r.status, "accumulating");
  });
  it("below N_FLOOR → accumulating", () => {
    const r = assessDrift({ fieldRows: rows(50, { score: 0.9 }), reference: REF });
    assert.equal(r.status, "accumulating");
    assert.equal(r.n, 50);
  });
  it("only specialist-source rows with a verdict are counted", () => {
    const mixed = [
      ...rows(120, { score: 0.9 }),
      ...Array.from({ length: 80 }, () => ({ role: "R", source: "claude", verdict: "a" })), // ignored
    ];
    const r = assessDrift({ fieldRows: mixed, reference: REF });
    assert.equal(r.n, 120);
  });
});

describe("assessDrift — the gate", () => {
  it("exam-vs-exam null does NOT fire (matched marginal, good confidence)", () => {
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.5, score: 0.9 }), reference: REF });
    assert.equal(r.drift.fires, false);
    assert.equal(r.performance.fires, false);
    assert.equal(r.status, "monitored-lowpower"); // N<500 → inconclusive, not "stale", not falsely "clean"
  });

  it("no drift at high N → monitored (adequate power)", () => {
    const r = assessDrift({ fieldRows: rows(600, { aFrac: 0.5, score: 0.9 }), reference: REF });
    assert.equal(r.status, "monitored");
  });

  it("both arms trip → stale", () => {
    // marginal 0.30/0.70 (drift, TV=0.20 < override) + confidence collapse (ATC gap large)
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.3, score: 0.5 }), reference: REF });
    assert.equal(r.drift.fires, true);
    assert.equal(r.override, false);
    assert.equal(r.performance.atc.fires, true);
    assert.equal(r.status, "stale");
  });

  it("drift only (perf clear) → watch, not stale", () => {
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.3, score: 0.95 }), reference: REF });
    assert.equal(r.drift.fires, true);
    assert.equal(r.performance.fires, false);
    assert.equal(r.status, "watch");
  });

  it("drift with performance arm UNAVAILABLE → watch, never stale (safe)", () => {
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.3 }), reference: REF }); // no scores
    assert.equal(r.drift.fires, true);
    assert.equal(r.performance.available, false);
    assert.equal(r.status, "watch");
    assert.match(r.reason, /unavailable/);
  });

  it("catastrophic drift fires the override → stale even with a clear perf arm", () => {
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.1, score: 0.95 }), reference: REF }); // TV=0.4
    assert.equal(r.override, true);
    assert.equal(r.performance.fires, false);
    assert.equal(r.status, "stale");
    assert.match(r.reason, /override/);
  });

  it("calibration arm via ECE: overconfident-wrong field, no drift → watch (process issue)", () => {
    const r = assessDrift({
      fieldRows: rows(200, { aFrac: 0.5, score: 0.95, outcome: false }), // matched marginal, but wrong-at-high-conf
      reference: REF,
    });
    assert.equal(r.drift.fires, false);
    assert.equal(r.performance.ece.fires, true);
    assert.equal(r.status, "watch");
  });

  it("ECE + drift together → stale", () => {
    const r = assessDrift({
      fieldRows: rows(200, { aFrac: 0.3, score: 0.95, outcome: false }), // drift + miscalibration
      reference: REF,
    });
    assert.equal(r.drift.fires, true);
    assert.equal(r.performance.fires, true);
    assert.equal(r.status, "stale");
  });
});

// ── numeric reducer (regressor specialist, e.g. the budgeter) ────────────────────────────────────

describe("ksTwoSample + parseNumber", () => {
  it("identical samples → D≈0, p≈1", () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const r = ksTwoSample(a, [...a]);
    assert.ok(r.D < 1e-9);
    assert.ok(r.p > 0.99);
  });
  it("disjoint samples → D=1, tiny p", () => {
    const r = ksTwoSample([0, 1, 2, 3, 4], [100, 101, 102, 103, 104]);
    assert.equal(r.D, 1);
    assert.ok(r.p < 0.05);
  });
  it("empty either side → no-op (D 0, p 1)", () => {
    assert.deepEqual(ksTwoSample([], [1, 2, 3]), { D: 0, p: 1 });
  });
  it("parseNumber pulls the last number out of a verdict label", () => {
    assert.equal(parseNumber('{"spend_weighted":245000}'), 245000);
    assert.equal(parseNumber("estimate: 1,250,000 tokens"), 1250000);
    assert.equal(parseNumber(42), 42);
    assert.equal(parseNumber("abstain"), null);
  });
});

describe("assessDrift — numeric reducer (KS on the scalar output)", () => {
  const NUM_REF = {
    schema: "roleos-exam-reference/v1", role: "B", reducer: "numeric",
    exam_outputs: Array.from({ length: 300 }, (_, i) => i), // uniform 0..299
    n_exam: 300,
  };
  const numRows = (n, valueFn) =>
    Array.from({ length: n }, (_, i) => ({ role: "B", source: "specialist", verdict: String(valueFn(i)) }));

  it("matched output distribution → no drift, monitored-lowpower", () => {
    const r = assessDrift({ fieldRows: numRows(200, (i) => Math.floor((i * 300) / 200)), reference: NUM_REF });
    assert.equal(r.drift.test, "ks");
    assert.equal(r.drift.fires, false);
    assert.equal(r.status, "monitored-lowpower");
  });

  it("moderately shifted output → drift fires (no override) → watch (perf unavailable)", () => {
    const r = assessDrift({ fieldRows: numRows(200, (i) => 100 + (i % 150)), reference: NUM_REF }); // 100..249
    assert.equal(r.drift.fires, true);
    assert.equal(r.override, false);
    assert.equal(r.status, "watch");
  });

  it("catastrophic output shift → KS override → stale", () => {
    const r = assessDrift({ fieldRows: numRows(200, (i) => 5000 + i), reference: NUM_REF }); // far above exam range
    assert.equal(r.override, true);
    assert.equal(r.status, "stale");
    assert.match(r.reason, /override/);
  });
});

describe("assessDrift — pinned config is overridable", () => {
  it("respects a custom N_TRUST", () => {
    const r = assessDrift({ fieldRows: rows(200, { aFrac: 0.5, score: 0.9 }), reference: REF, config: { N_TRUST: 150 } });
    assert.equal(r.status, "monitored");
  });
  it("DRIFT_DEFAULTS are present and pinned", () => {
    assert.equal(DRIFT_DEFAULTS.N_FLOOR, 100);
    assert.equal(DRIFT_DEFAULTS.ALPHA, 0.05);
  });
});
