import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gate, defaultClassifier, cosineSimilarity, defaultScoreFn, defaultOodFn } from "../src/specialist/gate.mjs";

// ── Fixtures ──────────────────────────────────────────────────────────────────────────────────

function entry(over = {}) {
  return {
    role: "Verifier",
    backend_url: "http://localhost:8000",
    fallback: "claude",
    workload_quota: 0.7,
    active_version: "v1",
    versions: [
      {
        id: "v1",
        adapter_id: "adapter-2026-06-04",
        base_model: "Qwen/Qwen3-7B",
        gate_threshold: 0.75,
        certified_level: "L1",
        exam_hash: "abcd",
        field_audit_window: 200,
        created_at: "2026-06-04T00:00:00Z",
      },
    ],
    ...over,
  };
}

const quota = (used = 0, window = 200) => ({ used, window });
const halt = (over = {}) => ({ halted: false, ...over });

/** A classifier that lets us drive the gate's decisions deterministically. */
const driving = (score, ood = false) => ({
  scoreFn: () => score,
  oodFn: () => ood,
});

// ── Happy path ─────────────────────────────────────────────────────────────────────────────────

describe("gate — happy path", () => {
  it("routes to the specialist when score > threshold, not OOD, quota ok", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(0, 200),
      haltState: halt(),
      classifier: driving(0.9, false),
    });
    assert.equal(d.route, "specialist");
    assert.equal(d.reason, "ok");
    assert.equal(d.score, 0.9);
  });
});

// ── Reject 1 mirror — registry handles base_model, here we just ensure no special case ───────

describe("gate — registry rejects are handled at load, not in the gate", () => {
  it("trusts the registryEntry's shape (an invalid entry would have been rejected by loadRegistry)", () => {
    // The gate does not re-validate base_model; that's the registry's job. So a misconfigured
    // entry that somehow reached the gate would still route — but in production the registry
    // never produces such an entry. This test pins the boundary: gate trusts its input.
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.99),
    });
    assert.equal(d.route, "specialist");
  });
});

// ── Reject 2: uncertified active is a safety net even past the registry ───────────────────────

describe("gate — Reject 2 (uncertified active version)", () => {
  it("fails open when active_version is L0", () => {
    const e = entry({ versions: [{ ...entry().versions[0], certified_level: "L0" }] });
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: e,
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.99),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "uncertified_active_version");
  });

  it("fails open when active_version is null (no version routed)", () => {
    const e = entry({ active_version: null });
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: e,
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.99),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "no_active_version");
  });
});

// ── Reject 3: workload quota ──────────────────────────────────────────────────────────────────

describe("gate — Reject 3 (quota exhausted)", () => {
  it("fails open when share-if-added would exceed quota", () => {
    // workload_quota = 0.7, window = 100; used = 70 means share-if-added = 0.71 > 0.7
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry({ workload_quota: 0.7 }),
      quotaState: quota(70, 100),
      haltState: halt(),
      classifier: driving(0.99),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "quota_exhausted");
    assert.equal(d.quotaOk, false);
  });

  it("routes when used + 1 == cap exactly", () => {
    // share-if-added = 70/100 = 0.7 ≤ 0.7
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry({ workload_quota: 0.7 }),
      quotaState: quota(69, 100),
      haltState: halt(),
      classifier: driving(0.99),
    });
    assert.equal(d.route, "specialist");
    assert.equal(d.quotaOk, true);
  });
});

// ── Reject 4: score below threshold ───────────────────────────────────────────────────────────

describe("gate — Reject 4 (score below threshold)", () => {
  it("fails open when score < gate_threshold", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.5, false), // below 0.75
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "score_below_threshold");
    assert.equal(d.score, 0.5);
  });

  it("routes when score == threshold (inclusive)", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.75, false),
    });
    assert.equal(d.route, "specialist");
  });
});

// ── Reject 5: OOD ─────────────────────────────────────────────────────────────────────────────

describe("gate — Reject 5 (OOD)", () => {
  it("fails open when OOD even if score would be high", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.99, true),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "ood");
    assert.equal(d.ood, true);
  });
});

// ── Shadow-probe halt is sticky and dominates ─────────────────────────────────────────────────

describe("gate — shadow_probe_halt (sticky)", () => {
  it("fails open when halted, regardless of score / quota / OOD", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: { halted: true, reason: "shadow disagreed" },
      classifier: driving(0.99, false),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "shadow_probe_halt");
    assert.equal(d.detail, "shadow disagreed");
  });
});

// ── Classifier malfunctions fail open ─────────────────────────────────────────────────────────

describe("gate — classifier-side fail-open", () => {
  it("fails open on score outside [0, 1]", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: { scoreFn: () => 1.5, oodFn: () => false },
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "score_invalid");
  });

  it("fails open on NaN score", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: { scoreFn: () => NaN, oodFn: () => false },
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "score_invalid");
  });

  it("fails open when scoreFn throws", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: { scoreFn: () => { throw new Error("boom"); }, oodFn: () => false },
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "score_fn_threw");
  });

  it("fails open when oodFn throws", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: entry(),
      quotaState: quota(),
      haltState: halt(),
      classifier: { scoreFn: () => 0.9, oodFn: () => { throw new Error("boom"); } },
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "ood_check_threw");
  });
});

// ── No registry entry / dangling pointer ──────────────────────────────────────────────────────

describe("gate — boundary cases", () => {
  it("fails open when no registry entry is provided", () => {
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: null,
      quotaState: quota(),
      haltState: halt(),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "no_registry_entry");
  });

  it("fails open with registry_dangling_pointer if active_version is invalid", () => {
    const e = entry({ active_version: "ghost" });
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: e,
      quotaState: quota(),
      haltState: halt(),
      classifier: driving(0.9),
    });
    assert.equal(d.route, "claude");
    assert.equal(d.reason, "registry_dangling_pointer");
  });
});

// ── Default classifier — embedding-similarity scoring ─────────────────────────────────────────

describe("default classifier — embedding-similarity scoreFn", () => {
  it("score = 0 when input has no embedding (always fails open)", () => {
    const v = { exam_centroid: [1, 0, 0] };
    assert.equal(defaultScoreFn({}, v), 0);
  });

  it("score = 0 when version has no centroid", () => {
    const v = {};
    assert.equal(defaultScoreFn({ embedding: [1, 0, 0] }, v), 0);
  });

  it("score = 1 for an identical-direction unit vector", () => {
    const v = { exam_centroid: [1, 0, 0] };
    assert.equal(defaultScoreFn({ embedding: [1, 0, 0] }, v), 1);
  });

  it("score = 0.5 for an orthogonal vector (cosine=0)", () => {
    const v = { exam_centroid: [1, 0, 0] };
    assert.equal(defaultScoreFn({ embedding: [0, 1, 0] }, v), 0.5);
  });

  it("score = 0 for an antiparallel vector (cosine=-1)", () => {
    const v = { exam_centroid: [1, 0, 0] };
    assert.equal(defaultScoreFn({ embedding: [-1, 0, 0] }, v), 0);
  });

  it("OOD when no centroid (defensive — fail open by default)", () => {
    assert.equal(defaultOodFn({ embedding: [1, 0, 0] }, {}), true);
  });

  it("not OOD when similarity is above the version's ood_floor", () => {
    const v = { exam_centroid: [1, 0, 0], ood_floor: 0.4 };
    assert.equal(defaultOodFn({ embedding: [1, 0, 0] }, v), false);
  });

  it("OOD when similarity is below the version's ood_floor", () => {
    const v = { exam_centroid: [1, 0, 0], ood_floor: 0.4 };
    // orthogonal → cosine=0 → OOD because 0 < 0.4
    assert.equal(defaultOodFn({ embedding: [0, 1, 0] }, v), true);
  });
});

describe("cosineSimilarity helper", () => {
  it("returns 0 for zero-norm vectors", () => {
    assert.equal(cosineSimilarity([0, 0, 0], [1, 1, 1]), 0);
  });
  it("identical vectors → 1", () => {
    assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
  });
});

// ── The default classifier is the one exported as `defaultClassifier` ─────────────────────────

describe("defaultClassifier", () => {
  it("composes defaultScoreFn + defaultOodFn", () => {
    assert.equal(defaultClassifier.scoreFn, defaultScoreFn);
    assert.equal(defaultClassifier.oodFn, defaultOodFn);
  });

  it("end-to-end: an input with a matching embedding routes to specialist", () => {
    const e = entry({
      versions: [
        {
          ...entry().versions[0],
          exam_centroid: [1, 0, 0],
          gate_threshold: 0.6,
          ood_floor: 0.4,
        },
      ],
    });
    const d = gate({
      role: "Verifier",
      input: { embedding: [1, 0, 0] },
      registryEntry: e,
      quotaState: quota(),
      haltState: halt(),
      classifier: defaultClassifier,
    });
    assert.equal(d.route, "specialist");
    assert.equal(d.score, 1);
  });

  it("end-to-end: an input with no embedding fails open under the default classifier", () => {
    const e = entry({ versions: [{ ...entry().versions[0], exam_centroid: [1, 0, 0] }] });
    const d = gate({
      role: "Verifier",
      input: {},
      registryEntry: e,
      quotaState: quota(),
      haltState: halt(),
      classifier: defaultClassifier,
    });
    assert.equal(d.route, "claude");
    // Both ood and score_below_threshold would fire; ood fires first.
    assert.equal(d.reason, "ood");
  });
});
