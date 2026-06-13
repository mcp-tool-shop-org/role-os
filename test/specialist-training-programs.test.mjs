import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  edgeWitness,
  buildCurriculum,
  cheapestChain,
  loadCurriculum,
  recipePreview,
  WITNESS_WEIGHTS,
  THIN_WITNESS,
} from "../src/specialist/training-programs.mjs";

const T = (id, over = {}) => ({ id, slug: `t${id}`, name: `T${id}`, lane: "llm", evidence_strength: "measured-on-rig", ...over });

describe("edgeWitness — directional signal fusion", () => {
  it("explicit predecessor + stage chain dominate; co-occurrence corroborates", () => {
    assert.equal(edgeWitness({ explicit_predecessor: true, stage_chain: true }),
      WITNESS_WEIGHTS.explicit_predecessor + WITNESS_WEIGHTS.stage_chain);
    assert.equal(edgeWitness({ explicit_predecessor: true }), WITNESS_WEIGHTS.explicit_predecessor);
    assert.equal(edgeWitness({ shared_datasets: 3 }), WITNESS_WEIGHTS.shared_datasets);
    assert.equal(edgeWitness({}), 0);
  });
});

describe("buildCurriculum — honest empty/unavailable states", () => {
  it("null curriculum → unavailable", () => {
    assert.equal(buildCurriculum(null).status, "unavailable");
  });
  it("no edges → provisional with no edges", () => {
    const g = buildCurriculum({ schema: "roleos-curriculum/v1", techniques: [T(1), T(2)], edges: [] });
    assert.equal(g.status, "provisional");
    assert.equal(g.edges.length, 0);
    assert.deepEqual(g.roots.sort(), [1, 2]);
  });
});

describe("buildCurriculum — evidence classification", () => {
  it("structural edge with no outcome delta → unverified (S6.1 default), status provisional", () => {
    const g = buildCurriculum({ techniques: [T(1), T(2)], edges: [{ from: 1, to: 2, signals: { explicit_predecessor: true, stage_chain: true } }] });
    assert.equal(g.edges.length, 1);
    assert.equal(g.edges[0].evidence, "unverified");
    assert.equal(g.status, "provisional");
    assert.equal(g.counts.unverified, 1);
    assert.equal(g.counts.confirmed, 0);
  });

  it("correlation-only edge (witness < THIN, no predecessor) → dropped as spurious", () => {
    const g = buildCurriculum({ techniques: [T(1), T(2)], edges: [{ from: 1, to: 2, signals: { shared_datasets: 5 } }] });
    assert.equal(g.edges.length, 0);
    assert.equal(g.counts.dropped_spurious, 1);
    assert.ok(edgeWitness({ shared_datasets: 5 }) < THIN_WITNESS);
  });

  it("receipt-backed outcome delta → confirmed, status graph", () => {
    const g = buildCurriculum({
      techniques: [T(1), T(2)],
      edges: [{ from: 1, to: 2, signals: { explicit_predecessor: true }, outcome_delta: { steps_saved_frac: 0.3, n_receipts: 2 } }],
    });
    assert.equal(g.edges[0].evidence, "confirmed");
    assert.equal(g.status, "graph");
    assert.equal(g.counts.confirmed, 1);
  });
});

describe("buildCurriculum — DAG gate + transitive reduction", () => {
  it("drops a back-edge that would create a cycle (a tech tree is a DAG)", () => {
    const g = buildCurriculum({
      techniques: [T(1), T(2), T(3)],
      edges: [
        { from: 1, to: 2, signals: { explicit_predecessor: true } },
        { from: 2, to: 3, signals: { explicit_predecessor: true } },
        { from: 3, to: 1, signals: { explicit_predecessor: true } }, // cycle
      ],
    });
    assert.equal(g.counts.dropped_cyclic, 1);
    // the surviving graph is acyclic: 1->2->3, root = 1
    assert.deepEqual(g.roots, [1]);
  });

  it("tags a closure-implied edge instead of double-counting it", () => {
    const g = buildCurriculum({
      techniques: [T(1), T(2), T(3)],
      edges: [
        { from: 1, to: 2, signals: { explicit_predecessor: true } },
        { from: 2, to: 3, signals: { explicit_predecessor: true } },
        { from: 1, to: 3, signals: { explicit_predecessor: true } }, // implied by 1->2->3
      ],
    });
    const implied = g.edges.find((e) => e.from === 1 && e.to === 3);
    assert.equal(implied.closure_implied, true);
    assert.equal(g.counts.closure_implied, 1);
    // root is still only 1; 3's "incoming" via the implied edge does not change entry points
    assert.deepEqual(g.roots, [1]);
  });
});

describe("cheapestChain", () => {
  it("structural chain is returned but marked unverified (no deltas)", () => {
    const g = buildCurriculum({
      techniques: [T(1), T(2), T(3)],
      edges: [
        { from: 1, to: 2, signals: { explicit_predecessor: true } },
        { from: 2, to: 3, signals: { explicit_predecessor: true } },
      ],
    });
    const c = cheapestChain(g, 3);
    assert.deepEqual(c.chain, [1, 2]);
    assert.equal(c.verified, false);
    assert.equal(c.steps_saved_frac, null);
  });

  it("confirmed deltas → verified chain with summed steps saved", () => {
    const g = buildCurriculum({
      techniques: [T(1), T(2), T(3)],
      edges: [
        { from: 1, to: 2, signals: { explicit_predecessor: true }, outcome_delta: { steps_saved_frac: 0.2, n_receipts: 1 } },
        { from: 2, to: 3, signals: { explicit_predecessor: true }, outcome_delta: { steps_saved_frac: 0.3, n_receipts: 1 } },
      ],
    });
    const c = cheapestChain(g, 3);
    assert.deepEqual(c.chain, [1, 2]);
    assert.equal(c.verified, true);
    assert.equal(c.steps_saved_frac, 0.5);
  });

  it("no prerequisites → null", () => {
    const g = buildCurriculum({ techniques: [T(1)], edges: [] });
    assert.equal(cheapestChain(g, 1), null);
  });
});

describe("recipePreview — S6.2 recipe-level preview", () => {
  it("empty preview block → unavailable, awaiting S6.3", () => {
    const r = recipePreview({ slug: "qlora", name: "QLoRA", preview: {} });
    assert.equal(r.status, "unavailable");
    assert.match(r.note, /S6\.3/);
  });

  it("a technique with no preview block at all → unavailable (does not throw)", () => {
    assert.equal(recipePreview({ slug: "x", name: "X" }).status, "unavailable");
  });

  it("a fitted mixing law → predicted outcome with calibrated confidence", () => {
    const r = recipePreview({
      slug: "x", name: "X",
      preview: {
        mixing_law: { tier: "law-predicted", predicted_loss: 1.23, predicted_steps_to_cert: 600 },
        calibration_params: 4_000_000_000, calibration_tokens: 100_000_000,
      },
    });
    assert.equal(r.status, "preview");
    assert.equal(r.predicted_outcome.predicted_loss, 1.23);
    assert.equal(r.predicted_outcome.confidence, "calibrated");
    assert.deepEqual(r.predicted_outcome.calibration, { params: 4_000_000_000, tokens: 100_000_000 });
  });

  it("an out-of-calibration candidate downgrades confidence (finding 11)", () => {
    const r = recipePreview(
      { slug: "x", name: "X", preview: { mixing_law: { predicted_loss: 1 }, calibration_params: 4e9 } },
      { candidateParams: 14e9 }); // 14B vs 4B-calibrated → ratio 3.5 > 2
    assert.match(r.predicted_outcome.confidence, /out-of-calibration/);
  });

  it("a replay fraction → an actionable forgetting recommendation", () => {
    const r = recipePreview({ slug: "x", name: "X", preview: { replay_fraction: 0.01, measured_forgetting: 0.05 } });
    assert.equal(r.status, "preview");
    assert.equal(r.forgetting.recommended_replay_fraction, 0.01);
    assert.match(r.forgetting.note, /1% replay/);
  });
});

describe("loadCurriculum — from a published export", () => {
  it("absent export → unavailable", () => {
    // An explicit missing path bypasses resolution (env / .role-os / sibling-readouts default) →
    // deterministic unavailable regardless of whether a sibling readouts export exists on this machine.
    const r = loadCurriculum({ path: join(tmpdir(), "roleos-no-such-curriculum.json") });
    assert.equal(r.status, "unavailable");
  });

  it("reads and builds from a curriculum.json file", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-curriculum-"));
    try {
      const p = join(dir, "curriculum.json");
      writeFileSync(p, JSON.stringify({
        schema: "roleos-curriculum/v1",
        techniques: [T(1), T(2)],
        edges: [{ from: 1, to: 2, signals: { explicit_predecessor: true, stage_chain: true } }],
      }));
      const g = loadCurriculum({ path: p });
      assert.equal(g.status, "provisional");
      assert.equal(g.edges[0].evidence, "unverified");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
