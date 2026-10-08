import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RECIPE_SCHEMA, canonicalJson, hashRecipeCard, validateRecipeCard } from "../src/specialist/recipe-card.mjs";
import { createHash } from "node:crypto";
import {
  DUPLICATE_KAPPA,
  MIN_GROUPS,
  MIN_ITEMS,
  PANEL_SCHEMA,
  VALIDATION_SCHEMA,
  accuracy,
  baggedSelect,
  bestSingle,
  buildPanelFile,
  disagreement,
  diversityMatrix,
  doubleFault,
  errorConsistency,
  greedySelect,
  hashValidation,
  juryCheck,
  jurySelect,
  makeRng,
  nestedEstimate,
  panelMeasurement,
  panelScore,
  parsePanel,
  parseValidation,
  pointAccuracy,
  scoreItems,
} from "../src/specialist/jury.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "roleos.mjs");

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...opts });
}

function noiseCritics({ n, seed, specs }) {
  const rng = makeRng(seed);
  const noises = {};
  for (let s = 0; s < specs.length; s++) {
    const spec = specs[s];
    if (spec.copyNoiseFrom) continue;
    const row = new Array(n);
    for (let i = 0; i < n; i++) row[i] = (rng() * 2 - 1) * spec.scale;
    noises[spec.id] = row;
  }
  for (let s = 0; s < specs.length; s++) {
    const spec = specs[s];
    if (spec.copyNoiseFrom) noises[spec.id] = noises[spec.copyNoiseFrom];
  }
  const items = [];
  const critics = specs.map((spec) => ({
    id: spec.id,
    kind: "pointwise",
    threshold: 0,
    scores: {},
  }));
  for (let i = 0; i < n; i++) {
    const id = `p${String(i).padStart(4, "0")}`;
    const truth = rng() < 0.5 ? 1 : 0;
    items.push({ id, group: `g${String(i).padStart(4, "0")}`, truth });
    const signal = truth === 1 ? 1 : -1;
    for (let c = 0; c < specs.length; c++) {
      const signed = specs[c].invert ? -signal : signal;
      critics[c].scores[id] = signed + noises[specs[c].id][i];
    }
  }
  return { items, critics };
}

function validationDoc(items, critics) {
  const docCritics = {};
  for (let i = 0; i < critics.length; i++) {
    const c = critics[i];
    docCritics[c.id] = { kind: c.kind, threshold: c.threshold, scores: c.scores };
  }
  return { schema: VALIDATION_SCHEMA, items, critics: docCritics };
}

function confusionPair() {
  // n = 100, truth all 1, threshold 0.
  // d = 1 → kappa 0.9375. d = 2 → kappa 0.875.
  const items = [];
  for (let i = 0; i < 100; i++) items.push({ id: `p${i}`, group: `g${i}`, truth: 1 });
  function critic(id, wrongAt) {
    const scores = {};
    const wrong = new Set(wrongAt);
    for (let i = 0; i < 100; i++) scores[`p${i}`] = wrong.has(i) ? -1 : 1;
    return { id, threshold: 0, scores };
  }
  return { items, critic };
}

describe("accuracy and error consistency", () => {
  it("treats a score equal to the threshold as an abstention, not a no", () => {
    const critic = { id: "c", threshold: 0, scores: { tie: 0, yes: 1, no: -1 } };
    const items = [
      { id: "tie", group: "g0", truth: 1 },
      { id: "yes", group: "g1", truth: 1 },
      { id: "no", group: "g2", truth: 1 },
    ];
    assert.equal(pointAccuracy(critic, items).correct, 1);
    assert.equal(pointAccuracy(critic, items).scored, 2);
    assert.equal(pointAccuracy({ id: "c", threshold: 0, scores: { tie: 0 } }, [items[0]]), null);
    const acc = accuracy(critic, items, { seed: 0, B: 40 });
    assert.equal(acc.scored, 3);
    assert.equal(acc.decided, 2);
    assert.equal(acc.correct, 1);
    assert.equal(acc.accuracy, 0.5);
    assert.equal(acc.coverage, 1);
    const onZeroTruth = accuracy(
      { id: "c", threshold: 0, scores: { tie: 0 } },
      [{ id: "tie", group: "g", truth: 0 }],
      { seed: 0, B: 20 },
    );
    assert.equal(onZeroTruth.accuracy, null);
    assert.equal(onZeroTruth.correct, 0);
    assert.equal(onZeroTruth.coverage, 1);

    const a = { id: "a", threshold: 0, scores: { tie: 0, q: 1 } };
    const b = { id: "b", threshold: 0, scores: { tie: -1, q: 1 } };
    const pairItems = [
      { id: "tie", group: "g", truth: 1 },
      { id: "q", group: "h", truth: 1 },
    ];
    const pair = diversityMatrix([a, b], pairItems);
    assert.equal(pair[0].n, 1);
    assert.equal(pair[0].disagreement, 0);
  });

  it("excludes abstentions from accuracy and reports coverage", () => {
    const items = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, group: `g${i}`, truth: 1 }));
    const scores = { p0: 1, p1: 1, p2: -1 };
    const critic = { id: "c", threshold: 0, scores };
    const acc = accuracy(critic, items, { seed: 0, B: 50 });
    assert.equal(acc.scored, 3);
    assert.equal(acc.correct, 2);
    assert.equal(acc.accuracy, 2 / 3);
    assert.equal(acc.coverage, 0.75);
    assert.ok(acc.ci);
  });

  it("reports unmeasured accuracy when a critic scored nothing", () => {
    const items = [{ id: "p", group: "g", truth: 1 }];
    const acc = accuracy({ id: "c", threshold: 0, scores: {} }, items, { seed: 0, B: 20 });
    assert.equal(acc.accuracy, null);
    assert.equal(acc.ci, null);
    assert.equal(acc.coverage, 0);
  });

  it("matches a hand-built kappa, and flags only the pair at or above 0.9", () => {
    const { items, critic } = confusionPair();
    const aWrong = [];
    for (let i = 80; i < 100; i++) aWrong.push(i);
    const a = critic("a", aWrong);
    // d=1: both correct 0..78, A-only 79, B-only 80, both wrong 81..99
    const bWrong = [79];
    for (let i = 81; i < 100; i++) bWrong.push(i);
    const b = critic("b", bWrong);
    assert.equal(pointAccuracy(a, items).accuracy, 0.8);
    assert.equal(pointAccuracy(b, items).accuracy, 0.8);
    assert.ok(Math.abs(errorConsistency(a, b, items) - 0.9375) < 1e-12);
    assert.equal(doubleFault(a, b, items), 0.19);
    assert.equal(disagreement(a, b, items), 0.02);

    const cWrong = [78, 79];
    for (let i = 82; i < 100; i++) cWrong.push(i);
    const c = critic("c", cWrong);
    assert.ok(Math.abs(errorConsistency(a, c, items) - 0.875) < 1e-12);
    assert.ok(errorConsistency(a, c, items) < DUPLICATE_KAPPA);

    const report = juryCheck([a, b, c], items, { seed: 0, B: 20 });
    const flagged = report.duplicates.map((d) => `${d.a}/${d.b}`);
    assert.ok(flagged.includes("a/b"));
    assert.equal(flagged.includes("a/c"), false);
  });

  it("leaves kappa unmeasured when chance agreement is already 1", () => {
    const items = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, group: `g${i}`, truth: 1 }));
    const perfect = { id: "a", threshold: 0, scores: { p0: 1, p1: 2, p2: 3, p3: 4 } };
    const also = { id: "b", threshold: 0, scores: { p0: 5, p1: 1, p2: 1, p3: 8 } };
    assert.equal(errorConsistency(perfect, also, items), null);
    assert.equal(doubleFault(perfect, also, items), 0);
    const none = { id: "z", threshold: 0, scores: {} };
    assert.equal(errorConsistency(perfect, none, items), null);
    assert.equal(doubleFault(perfect, none, items), null);
    assert.equal(disagreement(perfect, none, items), null);
  });

  it("gives a wider interval when repeated items share a group", () => {
    const rng = makeRng(4);
    const clustered = [];
    const scores = {};
    for (let g = 0; g < 40; g++) {
      const truth = rng() < 0.5 ? 1 : 0;
      const correct = rng() < 0.62;
      const predict = correct ? truth : 1 - truth;
      const score = predict === 1 ? 1 : -1;
      for (let c = 0; c < 5; c++) {
        const id = `g${g}-${c}`;
        clustered.push({ id, group: `g${g}`, truth });
        scores[id] = score;
      }
    }
    const critic = { id: "c", threshold: 0, scores };
    const unclustered = clustered.map((it) => ({ ...it, group: it.id }));
    const opts = { seed: 0, B: 800 };
    const wide = accuracy(critic, clustered, opts);
    const narrow = accuracy(critic, unclustered, opts);
    assert.equal(wide.accuracy, narrow.accuracy);
    const wideWidth = wide.ci.high - wide.ci.low;
    const narrowWidth = narrow.ci.high - narrow.ci.low;
    assert.ok(wideWidth > narrowWidth, `clustered ${wideWidth} should exceed unclustered ${narrowWidth}`);
  });

  it("changes the interval when the seed changes, and repeats it when the seed does not", () => {
    const { items, critics } = noiseCritics({
      n: 80,
      seed: 9,
      specs: [{ id: "c", scale: 2.5 }],
    });
    const a = accuracy(critics[0], items, { seed: 0, B: 300 });
    const a2 = accuracy(critics[0], items, { seed: 0, B: 300 });
    assert.deepEqual(a, a2);
  });
});

describe("selection", () => {
  it("does not give an identical copy a second seat", () => {
    const { items, critics } = noiseCritics({
      n: 120,
      seed: 3,
      specs: [{ id: "a", scale: 2.5 }],
    });
    const copy = { id: "b", kind: "pointwise", threshold: 0, scores: { ...critics[0].scores } };
    assert.equal(errorConsistency(critics[0], copy, items), 1);
    const matrix = diversityMatrix([copy, critics[0]], items);
    assert.equal(matrix.length, 1);
    assert.equal(matrix[0].a, "a");
    assert.equal(matrix[0].b, "b");

    const greedy = greedySelect([critics[0], copy], items, { maxSize: 5 });
    assert.deepEqual(greedy.members, [{ critic: "a", count: 1 }]);

    const report = jurySelect([critics[0], copy], items, { seed: 0, B: 200, bags: 20, folds: 5, maxSize: 5 });
    assert.equal(report.duplicates.length, 1);
    assert.equal(report.verdict.decision, "best-single");
    assert.equal(report.verdict.critic, "a");
    assert.ok(report.nested.differenceCi.low <= 0);
    assert.deepEqual(report.bagged.members.map((m) => m.critic), ["a"]);
  });

  it("keeps a panel when independent errors beat the best single critic", () => {
    const { items, critics } = noiseCritics({
      n: 400,
      seed: 11,
      specs: [
        { id: "c0", scale: 2.5 },
        { id: "c1", scale: 2.5 },
        { id: "c2", scale: 2.5 },
      ],
    });
    const report = jurySelect(critics, items, { seed: 0, B: 400, bags: 30, folds: 5, maxSize: 5 });
    const best = bestSingle(critics, items);
    const scored = panelScore(report.bagged.members, items, critics);
    assert.ok(
      scored.accuracy > best.accuracy,
      `panel ${scored.accuracy} should beat ${best.id} at ${best.accuracy}`,
    );
    assert.equal(report.verdict.decision, "panel", JSON.stringify(report.verdict));
    assert.ok(report.nested.differenceCi.low > 0, JSON.stringify(report.nested.differenceCi));
    assert.ok(report.nested.panelAccuracy > report.nested.bestSingleAccuracy);
    const votes = report.bagged.members.reduce((sum, m) => sum + m.count, 0);
    assert.ok(votes >= 2, JSON.stringify(report.bagged.members));
    assert.equal(report.inverted.length, 0);
  });

  it("names the strong critic when weak correlated critics do not earn a panel", () => {
    const { items, critics } = noiseCritics({
      n: 300,
      seed: 5,
      specs: [
        { id: "strong", scale: 1.25 },
        { id: "weak-a", scale: 10 },
        { id: "weak-b", scale: 10, copyNoiseFrom: "weak-a" },
      ],
    });
    const report = jurySelect(critics, items, { seed: 0, B: 300, bags: 20, folds: 5, maxSize: 5 });
    assert.equal(report.verdict.decision, "best-single", JSON.stringify({
      verdict: report.verdict,
      nested: report.nested && {
        panel: report.nested.panelAccuracy,
        single: report.nested.bestSingleAccuracy,
        ci: report.nested.differenceCi,
      },
      members: report.bagged && report.bagged.members,
    }));
    assert.equal(report.verdict.critic, "strong");
    assert.ok(report.duplicates.some((d) => d.a === "weak-a" && d.b === "weak-b"));
    assert.ok(report.nested.differenceCi.low <= 0);
  });

  it("flags an inverted critic and does not flip it into the panel", () => {
    const { items, critics } = noiseCritics({
      n: 80,
      seed: 8,
      specs: [
        { id: "good", scale: 1.25 },
        { id: "anti", scale: 0.4, invert: true },
      ],
    });
    const anti = critics.find((c) => c.id === "anti");
    const measured = accuracy(anti, items, { seed: 0, B: 400 });
    assert.ok(measured.accuracy < 0.5, String(measured.accuracy));
    assert.ok(measured.ci.high < 0.5, JSON.stringify(measured.ci));
    const report = jurySelect(critics, items, { seed: 0, B: 400, bags: 15, folds: 5, maxSize: 5 });
    assert.deepEqual(report.inverted, ["anti"]);
    assert.equal(report.verdict.decision, "best-single");
    assert.equal(report.verdict.critic, "good");
    assert.ok(report.bagged.members.every((m) => m.critic !== "anti"));
    // A silent sign flip would make this critic look strong. It does not.
    assert.ok(report.critics.find((c) => c.id === "anti").accuracy < 0.5);
  });

  it("says insufficient-data below 30 items or below 10 groups, and not on the boundary", () => {
    function grid(nItems, nGroups) {
      const items = [];
      const scores = {};
      for (let i = 0; i < nItems; i++) {
        const id = `p${i}`;
        const truth = i % 2;
        items.push({ id, group: `g${i % nGroups}`, truth });
        scores[id] = truth === 1 ? 1 : -1;
      }
      return jurySelect(
        [{ id: "solo", threshold: 0, scores }],
        items,
        { seed: 0, B: 30, bags: 5, folds: 5, maxSize: 3 },
      );
    }
    const fewItems = grid(MIN_ITEMS - 1, MIN_ITEMS - 1);
    assert.equal(fewItems.verdict.decision, "insufficient-data");
    assert.equal(fewItems.verdict.critic, null);
    assert.match(fewItems.verdict.reason, /29 items/);
    assert.equal(fewItems.bagged, null);

    const fewGroups = grid(36, MIN_GROUPS - 1);
    assert.equal(fewGroups.verdict.decision, "insufficient-data");
    assert.match(fewGroups.verdict.reason, /9 groups/);

    const enough = grid(MIN_ITEMS, MIN_GROUPS);
    assert.notEqual(enough.verdict.decision, "insufficient-data");
  });

  it("refuses a recommendation when every measured critic is inverted", () => {
    const items = [];
    const scores = {};
    for (let i = 0; i < 40; i++) {
      const truth = i % 2;
      items.push({ id: `p${i}`, group: `g${i}`, truth });
      scores[`p${i}`] = truth === 1 ? -1 : 1;
    }
    const report = jurySelect(
      [{ id: "anti", threshold: 0, scores }],
      items,
      { seed: 0, B: 100, bags: 5, folds: 5, maxSize: 3 },
    );
    assert.deepEqual(report.inverted, ["anti"]);
    assert.equal(report.verdict.decision, "insufficient-data");
    assert.equal(report.verdict.critic, null);
    assert.match(report.verdict.reason, /below 0\.5/);
  });

  it("counts a repeated critic as two votes", () => {
    const critics = [
      { id: "a", threshold: 0, scores: { p: 1 } },
      { id: "b", threshold: 0, scores: { p: -1 } },
    ];
    const items = [{ id: "p", group: "g", truth: 1 }];
    const members = (countA) => ([
      { critic: "a", count: countA, mean: 0, sd: 1, threshold: 0 },
      { critic: "b", count: 1, mean: 0, sd: 1, threshold: 0 },
    ]);
    const tied = scoreItems(members(1), items, critics);
    assert.equal(tied[0].score, 0);
    assert.equal(tied[0].decision, null);
    const tiedSummary = panelScore(members(1), items, critics);
    assert.equal(tiedSummary.accuracy, null);
    assert.equal(tiedSummary.scored, 0);
    const weighted = scoreItems(members(2), items, critics);
    assert.ok(Math.abs(weighted[0].score - (1 / 3)) < 1e-12);
    assert.equal(weighted[0].decision, 1);
  });

  it("counts an exact panel tie as coverage and not as a no", () => {
    // A is z = [-1, -1, 1, 1] (mean 0, sd 1). B is z = [1, 3, 1, 3]
    // (mean 2, sd 1). On p0 the centred votes are -1 and +1, so the panel
    // mean is exactly 0. That item is an abstention: in coverage, out of
    // the accuracy denominator. Counting it as a no (truth is 1) drops the
    // rate from 1 to 0.75.
    const critics = [
      { id: "a", threshold: 0, scores: { p0: -1, p1: -1, p2: 1, p3: 1 } },
      { id: "b", threshold: 0, scores: { p0: 1, p1: 3, p2: 1, p3: 3 } },
    ];
    const items = [
      { id: "p0", group: "g0", truth: 1 },
      { id: "p1", group: "g1", truth: 1 },
      { id: "p2", group: "g2", truth: 1 },
      { id: "p3", group: "g3", truth: 1 },
    ];
    const measured = panelMeasurement(critics, items, [
      { critic: "a", count: 1 },
      { critic: "b", count: 1 },
    ]);
    assert.equal(measured.covered, 4);
    assert.equal(measured.coverage, 1);
    assert.equal(measured.scored, 3);
    assert.equal(measured.correct, 3);
    assert.equal(measured.accuracy, 1);
  });

  it("gives a repeated seat two votes inside selection", () => {
    // A is a constant no. One seat of A loses to B on p1; two seats of A win it.
    // Ignoring member count leaves the panel at one seat each and accuracy 0.75.
    const critics = [
      { id: "a", threshold: 0, scores: { p0: -4, p1: -4, p2: -4, p3: -4 } },
      { id: "b", threshold: 0, scores: { p0: 1, p1: 2, p2: 3, p3: 4 } },
    ];
    const items = [
      { id: "p0", group: "g0", truth: 0 },
      { id: "p1", group: "g1", truth: 0 },
      { id: "p2", group: "g2", truth: 1 },
      { id: "p3", group: "g3", truth: 1 },
    ];
    const picked = greedySelect(critics, items, { maxSize: 3 });
    const a = picked.members.find((m) => m.critic === "a");
    const b = picked.members.find((m) => m.critic === "b");
    assert.equal(a.count, 2);
    assert.equal(b.count, 1);
    assert.equal(picked.accuracy, 1);
  });

  it("centres on the threshold with the stored mean and sd", () => {
    // (score - mean) / sd - (threshold - mean) / sd = (score - threshold) / sd
    const rows = scoreItems(
      [{ critic: "a", count: 1, mean: 10, sd: 2, threshold: 2 }],
      [{ id: "p", group: "g", truth: 1 }],
      [{ id: "a", threshold: 2, scores: { p: 4 } }],
    );
    assert.ok(Math.abs(rows[0].score - 1) < 1e-12);
    assert.equal(rows[0].decision, 1);
  });

  it("treats a constant critic as a sign vote", () => {
    const rows = scoreItems(
      [{ critic: "a", count: 1, mean: 3, sd: 0, threshold: 0 }],
      [{ id: "p", group: "g", truth: 1 }, { id: "q", group: "g", truth: 0 }],
      [{ id: "a", threshold: 0, scores: { p: 3, q: 3 } }],
    );
    assert.equal(rows[0].decision, 1);
    assert.equal(rows[1].decision, 1);
    const tie = scoreItems(
      [{ critic: "a", count: 1, mean: 0, sd: 0, threshold: 0 }],
      [{ id: "p", group: "g", truth: 1 }],
      [{ id: "a", threshold: 0, scores: { p: 0 } }],
    );
    assert.equal(tie[0].score, null);
    assert.equal(tie[0].decision, null);
  });

  it("abstains when every member lacks a score", () => {
    const rows = scoreItems(
      [{ critic: "a", count: 1, mean: 0, sd: 1, threshold: 0 }],
      [{ id: "p", group: "g", truth: 1 }],
      [{ id: "a", threshold: 0, scores: {} }],
    );
    assert.equal(rows[0].score, null);
    assert.equal(rows[0].decision, null);
    const summary = panelScore(
      [{ critic: "a", count: 1, mean: 0, sd: 1, threshold: 0 }],
      [{ id: "p", group: "g", truth: 1 }],
      [{ id: "a", threshold: 0, scores: {} }],
    );
    assert.equal(summary.accuracy, null);
  });

  it("repeats byte-identical JSON for the same seed", () => {
    const { items, critics } = noiseCritics({
      n: 60,
      seed: 2,
      specs: [{ id: "a", scale: 2.5 }, { id: "b", scale: 2.5 }],
    });
    const opts = { seed: 4, B: 40, bags: 8, folds: 5, maxSize: 4 };
    const first = JSON.stringify(jurySelect(critics, items, opts));
    const second = JSON.stringify(jurySelect(critics, items, opts));
    assert.equal(first, second);
    const other = JSON.stringify(jurySelect(critics, items, { ...opts, seed: 5 }));
    assert.notEqual(first, other);
  });

  it("rejects a non-positive bag count and a one-fold estimate", () => {
    const items = [{ id: "p", group: "g", truth: 1 }];
    const critics = [{ id: "a", threshold: 0, scores: { p: 1 } }];
    assert.throws(() => jurySelect(critics, items, { bags: 0 }), /bags/);
    assert.throws(() => jurySelect(critics, items, { maxSize: 0 }), /maxSize/);
    assert.throws(() => accuracy(critics[0], items, { B: 0 }), /bootstrap/);
    assert.throws(() => nestedEstimate(critics, items, { folds: 1 }), /folds/);
    const empty = greedySelect(critics, items, { maxSize: 0 });
    assert.deepEqual(empty.members, []);
    const none = baggedSelect(critics, items, { bags: 4, seed: 0, maxSize: 0 });
    assert.deepEqual(none.members, []);
  });

  it("keeps the best single when the nested interval straddles 0", () => {
    const rng = makeRng(103);
    const items = [];
    const a = { id: "a", kind: "pointwise", threshold: 0, scores: {} };
    const b = { id: "b", kind: "pointwise", threshold: 0, scores: {} };
    for (let i = 0; i < 40; i++) {
      const id = `p${i}`;
      const truth = rng() < 0.5 ? 1 : 0;
      items.push({ id, group: `g${i % 12}`, truth });
      const signal = truth === 1 ? 1 : -1;
      a.scores[id] = signal + (rng() * 2 - 1) * 2.2;
      b.scores[id] = signal + (rng() * 2 - 1) * 2.4;
      if (i % 5 === 0) b.scores[id] = -signal + (rng() * 2 - 1) * 0.4;
    }
    const report = jurySelect([a, b], items, { seed: 1, B: 80, bags: 12, folds: 5, maxSize: 3 });
    assert.equal(report.verdict.decision, "best-single");
    assert.equal(report.verdict.critic, "a");
    assert.ok(report.bagged.members.length >= 1);
    assert.ok(report.nested.differenceCi.low < 0, JSON.stringify(report.nested.differenceCi));
    assert.ok(report.nested.differenceCi.high > 0, JSON.stringify(report.nested.differenceCi));
    assert.match(report.verdict.reason, /does not lie entirely above 0/);
  });

  it("says why a nested fold was skipped or left items out", () => {
    const lone = [{ id: "p", group: "g", truth: 1 }];
    const critic = [{ id: "a", threshold: 0, scores: { p: 1 } }];
    const empty = nestedEstimate(critic, lone, { folds: 2, seed: 0, bags: 2, maxSize: 2, B: 8 });
    const emptyReasons = empty.perFold.map((fold) => fold.reason).join(" | ");
    assert.match(emptyReasons, /training fold is empty/);
    assert.match(emptyReasons, /held-out fold is empty/);

    const items = [
      { id: "d", group: "decided", truth: 1 },
      { id: "t", group: "tie", truth: 1 },
    ];
    const critics = [{ id: "a", threshold: 0, scores: { d: 1, t: 0 } }];
    const mixed = nestedEstimate(critics, items, { folds: 2, seed: 0, bags: 2, maxSize: 2, B: 8 });
    const mixedReasons = mixed.perFold.map((fold) => `${fold.skipped ? "skip" : "ran"} ${fold.reason}`).join(" | ");
    assert.match(mixedReasons, /no critic has a measured accuracy/);
    assert.match(mixedReasons, /abstained/);
    const ran = mixed.perFold.find((fold) => fold.skipped === false);
    assert.equal(ran.n, 0);
    assert.ok(ran.heldOut > 0);

    const train = [
      { id: "p0", group: "train", truth: 0 },
      { id: "p1", group: "train", truth: 0 },
      { id: "p2", group: "train", truth: 1 },
      { id: "p3", group: "train", truth: 1 },
    ];
    const bTie = 2 * Math.sqrt(1.25);
    const held = [
      { id: "panel", group: "held", truth: 0 },
      { id: "single", group: "held", truth: 1 },
      { id: "missing", group: "held" },
    ];
    const both = [
      {
        id: "a",
        threshold: 0,
        scores: { p0: -4, p1: -4, p2: -4, p3: -4, panel: -4, single: 0, missing: 1 },
      },
      {
        id: "b",
        threshold: 0,
        scores: { p0: 1, p1: 2, p2: 3, p3: 4, panel: bTie, single: 1, missing: 1 },
      },
    ];
    const split = nestedEstimate(both, train.concat(held), { folds: 2, seed: 0, bags: 4, maxSize: 3, B: 8 });
    const explained = split.perFold.map((fold) => fold.reason || "").join(" | ");
    assert.match(explained, /where the panel abstained/);
    assert.match(explained, /where the best single abstained/);
    assert.match(explained, /where truth is missing/);
  });
});

describe("files", () => {
  it("hashes canonical JSON, not key order", () => {
    const left = {
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p", group: "g", truth: 1 }],
      critics: {
        b: { threshold: 0, scores: { p: 1 } },
        a: { kind: "pointwise", threshold: 0.5, scores: { p: -1 } },
      },
    };
    const right = {
      critics: {
        a: { scores: { p: -1 }, threshold: 0.5, kind: "pointwise" },
        b: { scores: { p: 1 }, threshold: 0 },
      },
      items: [{ truth: 1, group: "g", id: "p" }],
      schema: VALIDATION_SCHEMA,
    };
    assert.equal(hashValidation(left), hashValidation(right));
    assert.equal(hashValidation(left), createHash("sha256").update(canonicalJson(left)).digest("hex"));
    const changed = JSON.parse(JSON.stringify(left));
    changed.critics.a.scores.p = 0;
    assert.notEqual(hashValidation(left), hashValidation(changed));
  });

  it("parses a validation file and rejects a broken one", () => {
    const ok = parseValidation({
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p1", group: "g", truth: 0 }],
      critics: { a: { kind: "pairwise", threshold: 0.5, scores: { p1: 0.2 } } },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.critics[0].kind, "pairwise");

    const bad = parseValidation({
      schema: "nope",
      items: [{ id: "p1", truth: 2 }, { id: "p1", group: "g", truth: 1 }],
      critics: { a: { threshold: 0, scores: { p1: Number.NaN } } },
    });
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.includes("schema")));
    assert.ok(bad.errors.some((e) => e.includes("group")));
    assert.ok(bad.errors.some((e) => e.includes("truth")));
    assert.ok(bad.errors.some((e) => e.includes("duplicates")));

    const notObj = parseValidation(null);
    assert.equal(notObj.ok, false);
    const scoreOk = parseValidation({
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p1" }],
      critics: { a: { threshold: 0, scores: { p1: 1 } } },
    }, { requireTruth: false });
    assert.equal(scoreOk.ok, true);
    assert.equal(scoreOk.items[0].truth, null);
  });

  it("round-trips a panel file through score", () => {
    const { items, critics } = noiseCritics({
      n: 40,
      seed: 6,
      specs: [{ id: "a", scale: 2 }, { id: "b", scale: 2 }],
    });
    const doc = validationDoc(items, critics);
    const report = jurySelect(critics, items, { seed: 1, B: 50, bags: 8, folds: 5, maxSize: 4 });
    const panel = buildPanelFile({
      members: report.bagged.members,
      validationSha256: hashValidation(doc),
      seed: 1,
      maxSize: 4,
      bags: 8,
      folds: 5,
      bootstrap: 50,
      nested: report.nested,
    });
    assert.equal(panel.schema, PANEL_SCHEMA);
    assert.equal(panel.verdict, "panel");
    assert.equal(panel.selected_on.validation_sha256, hashValidation(doc));
    const parsed = parsePanel(panel);
    assert.equal(parsed.ok, true);
    const fresh = items.map((it) => ({ id: it.id, group: it.group, truth: null }));
    const fromFile = scoreItems(parsed.members, fresh, critics);
    const direct = scoreItems(report.bagged.members, items, critics);
    assert.deepEqual(fromFile, direct);

    const refused = parsePanel({ schema: PANEL_SCHEMA, verdict: "best-single", members: [] });
    assert.equal(refused.ok, false);
  });
});

describe("roleos jury CLI", () => {
  it("prints help from the catalog and the verb", () => {
    const help = execFileSync(process.execPath, [CLI, "help"], { encoding: "utf8" });
    assert.match(help, /roleos jury check/);
    assert.match(help, /roleos jury select/);
    assert.match(help, /roleos jury score/);
    const verb = execFileSync(process.execPath, [CLI, "jury", "--help"], { encoding: "utf8" });
    assert.match(verb, /roleos jury select/);
    assert.match(verb, /unmeasured/);
  });

  it("rejects usage mistakes as structured errors, and prints a stack only with --debug", () => {
    const unknown = run(["jury", "nope"]);
    assert.equal(unknown.status, 1);
    const body = JSON.parse(unknown.stderr);
    assert.equal(body.code, "USER_ERROR");
    assert.match(body.hint, /roleos jury help/);
    assert.doesNotMatch(unknown.stderr, /jury-cmd\.mjs/);

    const missing = run(["jury", "check", "does-not-exist.json"]);
    assert.equal(missing.status, 1);
    assert.match(JSON.parse(missing.stderr).message, /not found/);

    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-"));
    try {
      const bad = join(dir, "bad.json");
      writeFileSync(bad, "{");
      const parsed = run(["jury", "check", bad]);
      assert.equal(parsed.status, 1);
      assert.match(JSON.parse(parsed.stderr).message, /not valid JSON/);

      const wrong = join(dir, "wrong.json");
      writeFileSync(wrong, JSON.stringify({ schema: "nope" }));
      const schema = run(["jury", "check", wrong]);
      assert.equal(schema.status, 1);
      assert.match(JSON.parse(schema.stderr).message, /schema/);

      const tiny = join(dir, "tiny.json");
      writeFileSync(tiny, JSON.stringify({
        schema: VALIDATION_SCHEMA,
        items: [{ id: "p", group: "g", truth: 1 }],
        critics: { a: { threshold: 0, scores: { p: 1 } } },
      }));
      const bags = run(["jury", "select", tiny, "--bags", "0"]);
      assert.equal(bags.status, 1);
      assert.match(JSON.parse(bags.stderr).message, /--bags/);

      const seed = run(["jury", "select", tiny, "--seed", "nope"]);
      assert.equal(seed.status, 1);
      assert.match(JSON.parse(seed.stderr).message, /--seed/);

      const debug = run(["jury", "check", "does-not-exist.json", "--debug"]);
      assert.equal(debug.status, 1);
      assert.match(debug.stderr, /not found/);
      assert.match(debug.stderr, /at /);
      assert.doesNotMatch(debug.stderr, /USER_ERROR/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not write a panel file for insufficient data", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-"));
    try {
      const items = [];
      const scores = {};
      for (let i = 0; i < 12; i++) {
        items.push({ id: `p${i}`, group: `g${i}`, truth: i % 2 });
        scores[`p${i}`] = 1;
      }
      const file = join(dir, "small.json");
      const out = join(dir, "panel.json");
      writeFileSync(file, JSON.stringify(validationDoc(items, [{ id: "a", kind: "pointwise", threshold: 0, scores }])));
      const result = run(["jury", "select", file, "--out", out, "--json", "--bags", "4", "--folds", "5"]);
      assert.equal(result.status, 0, result.stderr);
      const body = JSON.parse(result.stdout);
      assert.equal(body.verdict.decision, "insufficient-data");
      assert.equal(body.panel_written, false);
      assert.equal(existsSync(out), false);
      assert.match(result.stdout, /insufficient-data/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("selects, writes, and scores only when the verdict is panel, and the JSON repeats", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-"));
    try {
      const { items, critics } = noiseCritics({
        n: 400,
        seed: 11,
        specs: [
          { id: "c0", scale: 2.5 },
          { id: "c1", scale: 2.5 },
          { id: "c2", scale: 2.5 },
        ],
      });
      const doc = validationDoc(items, critics);
      const file = join(dir, "validation.json");
      const out = join(dir, "panel.json");
      writeFileSync(file, JSON.stringify(doc));
      const args = ["jury", "select", file, "--json", "--seed", "0", "--bags", "30", "--folds", "5", "--max-size", "5", "--out", out];
      const first = run(args);
      const second = run(args);
      assert.equal(first.status, 0, first.stderr);
      assert.equal(first.stdout, second.stdout);
      const body = JSON.parse(first.stdout);
      assert.equal(body.verdict.decision, "panel");
      assert.equal(body.panel_written, true);
      const panel = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(panel.schema, PANEL_SCHEMA);
      assert.equal(panel.selected_on.validation_sha256, hashValidation(doc));
      assert.equal(panel.selected_on.seed, 0);
      assert.equal(panel.selected_on.bootstrap, 2000);

      const fresh = {
        schema: VALIDATION_SCHEMA,
        items: items.slice(0, 3).map((it) => ({ id: it.id })),
        critics: doc.critics,
      };
      const itemsFile = join(dir, "items.json");
      writeFileSync(itemsFile, JSON.stringify(fresh));
      const scored = run(["jury", "score", out, itemsFile, "--json"]);
      assert.equal(scored.status, 0, scored.stderr);
      const rows = JSON.parse(scored.stdout).items;
      assert.equal(rows.length, 3);
      const direct = scoreItems(panel.members, fresh.items.map((it) => ({ id: it.id, group: it.id, truth: null })), critics);
      assert.deepEqual(rows, direct);
      for (let i = 0; i < rows.length; i++) {
        assert.equal(typeof rows[i].score, "number");
        assert.ok(rows[i].decision === 0 || rows[i].decision === 1);
      }

      const text = run(["jury", "score", out, itemsFile]);
      assert.match(text.stdout, /decision [01]/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prints unmeasured for a critic that abstained, and best-single writes nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-"));
    try {
      const items = [];
      const scores = {};
      for (let i = 0; i < 40; i++) {
        const truth = i % 2;
        items.push({ id: `p${i}`, group: `g${i}`, truth });
        scores[`p${i}`] = truth === 1 ? 1 : -1;
      }
      const file = join(dir, "val.json");
      writeFileSync(file, JSON.stringify({
        schema: VALIDATION_SCHEMA,
        items,
        critics: {
          solo: { kind: "pointwise", threshold: 0, scores },
          silent: { kind: "pointwise", threshold: 0, scores: {} },
        },
      }));
      const checked = run(["jury", "check", file]);
      assert.equal(checked.status, 0, checked.stderr);
      assert.match(checked.stdout, /silent  accuracy unmeasured/);
      assert.match(checked.stdout, /duplicates/);

      const out = join(dir, "should-not-exist.json");
      const selected = run(["jury", "select", file, "--out", out, "--bags", "6", "--folds", "5", "--seed", "1"]);
      assert.equal(selected.status, 0, selected.stderr);
      assert.match(selected.stdout, /verdict: best-single \(solo\)/);
      assert.match(selected.stdout, /not written/);
      assert.match(selected.stdout, /n \d+ of 40/);
      assert.match(selected.stdout, /fold 0: n /);
      assert.equal(existsSync(out), false);

      const json = run(["jury", "select", file, "--json", "--bags", "6", "--folds", "5", "--seed", "1", "--out", out]);
      const body = JSON.parse(json.stdout);
      assert.equal(body.verdict.decision, "best-single");
      assert.equal(body.verdict.critic, "solo");
      assert.equal(body.panel_written, false);
      const silent = body.critics.find((c) => c.id === "silent");
      assert.equal(silent.accuracy, null);
      assert.equal(silent.ci, null);
      assert.equal(silent.decided, 0);
      assert.ok(Array.isArray(body.nested.per_fold));
      assert.equal(body.nested.per_fold.length, 5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prints skipped folds and an exact-zero panel abstention", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-"));
    try {
      const items = [];
      const scores = {};
      for (let i = 0; i < 30; i++) {
        items.push({ id: `p${i}`, group: `g${i % 10}`, truth: i % 2 });
        scores[`p${i}`] = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1);
      }
      const file = join(dir, "val.json");
      writeFileSync(file, JSON.stringify(validationDoc(items, [
        { id: "a", kind: "pointwise", threshold: 0, scores },
      ])));
      const selected = run(["jury", "select", file, "--folds", "12", "--bags", "4", "--seed", "0"]);
      assert.equal(selected.status, 0, selected.stderr);
      assert.match(selected.stdout, /fold \d+: skipped — held-out fold is empty/);
      assert.match(selected.stdout, /left out \d+ where both abstained/);
      assert.match(selected.stdout, /n \d+ of 30/);

      const panel = {
        schema: PANEL_SCHEMA,
        verdict: "panel",
        members: [
          { critic: "a", count: 1, mean: 0, sd: 1, threshold: 0 },
          { critic: "b", count: 1, mean: 0, sd: 1, threshold: 0 },
        ],
      };
      const panelFile = join(dir, "panel.json");
      const itemsFile = join(dir, "items.json");
      writeFileSync(panelFile, JSON.stringify(panel));
      writeFileSync(itemsFile, JSON.stringify({
        schema: VALIDATION_SCHEMA,
        items: [{ id: "p" }],
        critics: {
          a: { threshold: 0, scores: { p: 1 } },
          b: { threshold: 0, scores: { p: -1 } },
        },
      }));
      const scored = run(["jury", "score", panelFile, itemsFile]);
      assert.equal(scored.status, 0, scored.stderr);
      assert.match(scored.stdout, /score 0\.0000  decision abstain/);
      const scoredJson = run(["jury", "score", panelFile, itemsFile, "--json"]);
      const row = JSON.parse(scoredJson.stdout).items[0];
      assert.equal(row.score, 0);
      assert.equal(row.decision, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function recipeCard(id, controls) {
  const card = {
    schema: RECIPE_SCHEMA,
    id,
    role: "Auditor",
    attribute: "finds the planted error in one answer",
    format: { kind: "pointwise" },
    sources: [{ name: "pairs", licence: "studio-internal" }],
    negatives: {
      construction: "planted-edit",
      generators: [
        { model: "model-a", family: "qwen", revision: "r1" },
        { model: "model-b", family: "gemma", revision: "r2" },
      ],
      error_taxonomy: ["wrong fact"],
    },
    splits: {
      train: { n: 1 }, validation: { n: 1 }, final: { n: 1 },
      held_out_generator: { family: "granite" }, natural_errors: { n: 1 },
    },
    controls,
    pins: { features: "pinned" },
  };
  const checked = validateRecipeCard(card);
  if (!checked.ok) throw new Error(checked.errors.join("; "));
  return { card, sha256: hashRecipeCard(card), controls: checked.controls, gaps: checked.warnings };
}

function cleanAssessment(id) {
  const built = recipeCard(id, [{
    name: "positive-marker",
    status: "passed",
    measure: { metric: "accuracy", point: 0.8, ci: [0.7, 0.9], n: 40, clusters: "prompt" },
  }]);
  return {
    id: built.card.id,
    sha256: built.sha256,
    passed: built.controls.passed,
    failed: built.controls.failed,
    unresolved: built.controls.unresolved,
    gaps: built.gaps,
    card: built.card,
  };
}

describe("recipe evidence gates the jury", () => {
  it("excludes a failed or unresolved control, and a gap does not", () => {
    const { items, critics } = noiseCritics({
      n: 40,
      seed: 3,
      specs: [{ id: "strong", scale: 0.2 }, { id: "weak", scale: 2.5 }],
    });
    const opts = { seed: 0, B: 30, bags: 6, folds: 5, maxSize: 3 };
    const failed = cleanAssessment("strong-card");
    failed.failed = ["shuffled-labels"];
    failed.passed = [];
    const clean = cleanAssessment("weak-card");
    const blocked = jurySelect(critics, items, {
      ...opts,
      recipes: { strong: failed, weak: clean },
    });
    assert.equal(blocked.excluded.some((row) => row.id === "strong" && row.reason.includes("shuffled-labels failed")), true);
    assert.notEqual(blocked.verdict.critic, "strong");
    if (blocked.bagged) assert.ok(blocked.bagged.members.every((m) => m.critic !== "strong"));
    assert.ok(blocked.verdict.decision === "best-single" || blocked.verdict.decision === "panel");
    if (blocked.verdict.decision === "best-single") assert.equal(blocked.verdict.critic, "weak");

    const only = noiseCritics({ n: 40, seed: 1, specs: [{ id: "only", scale: 0.1 }] });
    const onlyFailed = new Map([["only", { id: "only-card", sha256: "a".repeat(64), passed: [], failed: ["shuffled-labels"], unresolved: [], gaps: [] }]]);
    const denied = jurySelect(only.critics, only.items, { ...opts, recipes: onlyFailed });
    assert.equal(denied.verdict.decision, "insufficient-data");
    assert.match(denied.verdict.reason, /excluded by its recipe card/);
    const admitted = jurySelect(only.critics, only.items, { ...opts, recipes: onlyFailed, allowUnproven: true });
    assert.notEqual(admitted.verdict.decision, "insufficient-data");
    assert.equal(admitted.excluded.length, 0);
    assert.equal(admitted.allowUnproven, true);

    const unresolved = jurySelect(only.critics, only.items, {
      ...opts,
      recipes: new Map([["only", { id: "only-card", sha256: "b".repeat(64), passed: [], failed: [], unresolved: ["same-generator-no-error"], gaps: [] }]]),
    });
    assert.equal(unresolved.verdict.decision, "insufficient-data");
    assert.match(unresolved.excluded[0].reason, /same-generator-no-error unresolved/);

    const gappy = jurySelect(only.critics, only.items, {
      ...opts,
      recipes: new Map([["only", { id: "only-card", sha256: "c".repeat(64), passed: ["shuffled-labels"], failed: [], unresolved: [], gaps: ["plain random shuffle"] }]]),
    });
    assert.equal(gappy.excluded.length, 0);
    assert.notEqual(gappy.verdict.decision, "insufficient-data");

    const first = JSON.stringify(jurySelect(critics, items, { ...opts, recipes: { strong: failed, weak: clean } }));
    const second = JSON.stringify(jurySelect(critics, items, { ...opts, recipes: { strong: failed, weak: clean } }));
    assert.equal(first, second);
  });

  it("requires a card only when asked, and records recipe ids on the panel", () => {
    const { items, critics } = noiseCritics({
      n: 40,
      seed: 4,
      specs: [{ id: "carded", scale: 0.2 }, { id: "bare", scale: 0.2 }],
    });
    const opts = { seed: 2, B: 20, bags: 4, folds: 5, maxSize: 3 };
    const carded = cleanAssessment("carded-card");
    const open = jurySelect(critics, items, { ...opts, recipes: { carded, bare: null } });
    assert.equal(open.excluded.length, 0);
    assert.equal(open.critics.find((c) => c.id === "bare").recipe.note, "unproven: no recipe card");
    const required = jurySelect(critics, items, { ...opts, recipes: { carded, bare: null }, requireRecipe: true });
    assert.equal(required.excluded.some((row) => row.id === "bare" && row.reason === "unproven: no recipe card"), true);
    assert.ok(!required.bagged || required.bagged.members.every((m) => m.critic !== "bare"));

    const panel = buildPanelFile({
      members: [{
        critic: "carded", count: 1, mean: 0, sd: 1, threshold: 0,
        recipeId: carded.id, recipeSha256: carded.sha256,
      }],
      validationSha256: "d".repeat(64),
      seed: 0, maxSize: 3, bags: 4, folds: 5, bootstrap: 20,
      nested: { panelAccuracy: 0.8, bestSingleAccuracy: 0.7, difference: 0.1, differenceCi: { low: 0.02, high: 0.2 }, n: 40 },
      allowUnproven: true,
    });
    assert.equal(panel.allow_unproven, true);
    assert.equal(panel.members[0].recipe_id, "carded-card");
    assert.equal(panel.members[0].recipe_sha256, carded.sha256);
    const parsed = parsePanel(panel);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.allowUnproven, true);
    assert.equal(parsed.members[0].recipe_id, "carded-card");
    const old = parsePanel({
      schema: PANEL_SCHEMA,
      verdict: "panel",
      members: [{ critic: "a", count: 1, mean: 0, sd: 1, threshold: 0 }],
    });
    assert.equal(old.ok, true);
    assert.equal(old.allowUnproven, false);
    assert.equal(old.members[0].recipe_id, null);
    assert.equal(old.members[0].recipe_sha256, null);
    const badFlag = parsePanel({
      schema: PANEL_SCHEMA,
      verdict: "panel",
      allow_unproven: "yes",
      members: [{ critic: "a", count: 1, mean: 0, sd: 1, threshold: 0, recipe_sha256: "zz" }],
    });
    assert.equal(badFlag.ok, false);
    assert.ok(badFlag.errors.some((e) => e.includes("allow_unproven")));
    assert.ok(badFlag.errors.some((e) => e.includes("recipe_sha256")));

    const member = { critic: "a", count: 1, mean: 0, sd: 1, threshold: 0 };
    for (const recipeId of [12, ""]) {
      const dropped = parsePanel({
        schema: PANEL_SCHEMA,
        verdict: "panel",
        members: [{ ...member, recipe_id: recipeId }],
      });
      assert.equal(dropped.ok, false);
      assert.equal(dropped.members.length, 0);
      assert.ok(dropped.errors.some((e) => e.includes("recipe_id must be a non-empty string or null")), `recipe_id ${JSON.stringify(recipeId)}`);
    }
  });

  it("parses a recipe pointer and rejects a malformed one", () => {
    const ok = parseValidation({
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p", group: "g", truth: 1 }],
      critics: { a: { threshold: 0, scores: { p: 1 }, recipe: { path: "card.json", sha256: "ab".repeat(32) } } },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.critics[0].recipe.path, "card.json");
    const absent = parseValidation({
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p", group: "g", truth: 1 }],
      critics: { a: { threshold: 0, scores: { p: 1 } } },
    });
    assert.equal(absent.critics[0].recipe, null);
    const bad = parseValidation({
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p", group: "g", truth: 1 }],
      critics: { a: { threshold: 0, scores: { p: 1 }, recipe: { path: "", sha256: "ZZ" } } },
    });
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.includes("recipe.path")));
    assert.ok(bad.errors.some((e) => e.includes("recipe.sha256")));

    const base = {
      schema: VALIDATION_SCHEMA,
      items: [{ id: "p", group: "g", truth: 1 }],
    };
    for (const recipe of [null, "nope", []]) {
      const rejected = parseValidation({
        ...base,
        critics: { a: { threshold: 0, scores: { p: 1 }, recipe } },
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.critics.length, 1);
      assert.equal(rejected.critics[0].recipe, null);
      assert.ok(
        rejected.errors.some((e) => e.includes("recipe must be an object { path, sha256 }")),
        `recipe ${JSON.stringify(recipe)}: ${rejected.errors.join("; ")}`,
      );
    }
  });

  it("ignores an inherited recipe and a blank recipe map, and still names the missing card", () => {
    const { items, critics } = noiseCritics({
      n: 8,
      seed: 3,
      specs: [{ id: "known", scale: 0.2 }, { id: "missing", scale: 0.2 }],
    });
    const known = cleanAssessment("known-card");
    const stolen = cleanAssessment("stolen-card");
    const recipes = Object.assign(Object.create({ missing: stolen }), { known });
    const partial = juryCheck(critics, items, { seed: 1, B: 20, recipes });
    const knownRow = partial.critics.find((c) => c.id === "known");
    const missingRow = partial.critics.find((c) => c.id === "missing");
    assert.equal(knownRow.recipe.id, "known-card");
    assert.equal(knownRow.recipe.note, null);
    assert.equal(missingRow.recipe.note, "unproven: no recipe card");
    assert.equal(missingRow.recipe.id, null);
    assert.equal(partial.excluded.some((row) => row.id === "missing"), false);

    const required = juryCheck(critics, items, { seed: 1, B: 20, recipes, requireRecipe: true });
    assert.equal(required.excluded.some((row) => row.id === "missing" && row.reason === "unproven: no recipe card"), true);
    assert.equal(required.excluded.some((row) => row.id === "known"), false);

    const blank = juryCheck(critics, items, { seed: 1, B: 20, recipes: "" });
    assert.equal(blank.critics.length, 2);
    assert.equal(blank.critics.every((c) => c.recipe && c.recipe.note === "unproven: no recipe card"), true);
    assert.equal(blank.excluded.length, 0);
  });
});

describe("roleos jury recipe CLI", () => {
  function writeValidation(dir, critics, items, recipes) {
    const doc = validationDoc(items, critics);
    for (let i = 0; i < critics.length; i++) {
      const critic = critics[i];
      const recipe = recipes[critic.id];
      if (!recipe) continue;
      const fileName = `${critic.id}.json`;
      writeFileSync(join(dir, fileName), JSON.stringify(recipe.card));
      doc.critics[critic.id].recipe = { path: fileName, sha256: recipe.sha256 };
    }
    const file = join(dir, "validation.json");
    writeFileSync(file, JSON.stringify(doc));
    return file;
  }

  it("excludes a failed card, admits it with --allow-unproven, and requires a card only when asked", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-recipe-"));
    try {
      const { items, critics } = noiseCritics({
        n: 40,
        seed: 8,
        specs: [{ id: "bad", scale: 0.2 }, { id: "good", scale: 0.4 }],
      });
      const bad = recipeCard("bad-card", [{ name: "shuffled-labels", status: "failed", result: "still predictable" }]);
      const good = cleanAssessment("good-card");
      const file = writeValidation(dir, critics, items, { bad, good });
      const args = ["jury", "select", file, "--json", "--seed", "0", "--bags", "4", "--folds", "5", "--max-size", "3"];
      const blocked = run(args);
      assert.equal(blocked.status, 0, blocked.stderr);
      const again = run(args);
      assert.equal(again.stdout, blocked.stdout);
      const body = JSON.parse(blocked.stdout);
      assert.equal(body.excluded.some((row) => row.id === "bad" && /shuffled-labels failed/.test(row.reason)), true);
      assert.notEqual(body.verdict.critic, "bad");
      if (body.bagged) assert.ok(body.bagged.members.every((m) => m.critic !== "bad"));
      const text = run(["jury", "check", file]);
      assert.equal(text.status, 0, text.stderr);
      assert.match(text.stdout, /bad  passed: none  failed: shuffled-labels  unresolved: none/);
      assert.match(text.stdout, /good  passed: positive-marker/);
      assert.match(text.stdout, /excluded by recipe/);

      const admitted = run([...args, "--allow-unproven"]);
      assert.equal(admitted.status, 0, admitted.stderr);
      const open = JSON.parse(admitted.stdout);
      assert.equal(open.excluded.some((row) => row.id === "bad"), false);
      assert.equal(open.allow_unproven, true);

      const bare = noiseCritics({ n: 40, seed: 9, specs: [{ id: "solo", scale: 0.2 }] });
      const bareFile = writeValidation(dir, bare.critics, bare.items, {});
      const noted = run(["jury", "check", bareFile]);
      assert.match(noted.stdout, /solo  unproven: no recipe card/);
      const required = run(["jury", "select", bareFile, "--json", "--require-recipe", "--bags", "4", "--folds", "5", "--seed", "1"]);
      assert.equal(required.status, 0, required.stderr);
      const reqBody = JSON.parse(required.stdout);
      assert.equal(reqBody.excluded[0].reason, "unproven: no recipe card");
      assert.equal(reqBody.verdict.decision, "insufficient-data");
      assert.match(reqBody.verdict.reason, /excluded by its recipe card/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("errors on a hash mismatch, a missing card, and an invalid card, and --allow-unproven does not skip the mismatch", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-recipe-"));
    try {
      const { items, critics } = noiseCritics({ n: 40, seed: 2, specs: [{ id: "a", scale: 0.2 }] });
      const built = cleanAssessment("a-card");
      const file = writeValidation(dir, critics, items, { a: built });
      const doc = JSON.parse(readFileSync(file, "utf8"));
      doc.critics.a.recipe.sha256 = "f".repeat(64);
      writeFileSync(file, JSON.stringify(doc));
      const mismatch = run(["jury", "check", file, "--allow-unproven"]);
      assert.notEqual(mismatch.status, 0);
      const err = JSON.parse(mismatch.stderr);
      assert.match(err.message, /hash mismatch/);
      assert.match(err.message, new RegExp(built.sha256));
      assert.doesNotMatch(mismatch.stderr, /jury-cmd\.mjs/);

      doc.critics.a.recipe.path = "missing-card.json";
      doc.critics.a.recipe.sha256 = built.sha256;
      writeFileSync(file, JSON.stringify(doc));
      const missing = run(["jury", "select", file, "--require-recipe"]);
      assert.notEqual(missing.status, 0);
      assert.match(JSON.parse(missing.stderr).message, /not found/);

      writeFileSync(join(dir, "missing-card.json"), JSON.stringify({ schema: RECIPE_SCHEMA }));
      const invalid = run(["jury", "check", file]);
      assert.notEqual(invalid.status, 0);
      assert.match(JSON.parse(invalid.stderr).message, /invalid/);

      const cardDir = join(dir, "card-dir");
      mkdirSync(cardDir);
      doc.critics.a.recipe.path = "card-dir";
      doc.critics.a.recipe.sha256 = built.sha256;
      writeFileSync(file, JSON.stringify(doc));
      const unread = run(["jury", "check", file, "--allow-unproven"]);
      assert.notEqual(unread.status, 0);
      const unreadErr = JSON.parse(unread.stderr);
      assert.match(unreadErr.message, /could not read recipe card for a/);
      assert.match(unreadErr.hint, /relative to the validation file/);
      assert.doesNotMatch(unread.stderr, /jury-cmd\.mjs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes recipe ids into a panel file", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-jury-recipe-"));
    try {
      const { items, critics } = noiseCritics({
        n: 400,
        seed: 11,
        specs: [{ id: "c0", scale: 2.5 }, { id: "c1", scale: 2.5 }, { id: "c2", scale: 2.5 }],
      });
      const recipes = {
        c0: cleanAssessment("c0-card"),
        c1: cleanAssessment("c1-card"),
        c2: cleanAssessment("c2-card"),
      };
      const file = writeValidation(dir, critics, items, recipes);
      const out = join(dir, "panel.json");
      const selected = run(["jury", "select", file, "--json", "--seed", "0", "--bags", "30", "--folds", "5", "--max-size", "5", "--out", out, "--allow-unproven"]);
      assert.equal(selected.status, 0, selected.stderr);
      const body = JSON.parse(selected.stdout);
      assert.equal(body.verdict.decision, "panel");
      const panel = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(panel.allow_unproven, true);
      assert.ok(panel.members.length > 0);
      for (let i = 0; i < panel.members.length; i++) {
        const member = panel.members[i];
        assert.equal(member.recipe_id, `${member.critic}-card`);
        assert.equal(member.recipe_sha256, recipes[member.critic].sha256);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("mentions the recipe flags in the catalog and the verb help", () => {
    const catalog = execFileSync(process.execPath, [CLI, "help"], { encoding: "utf8" });
    assert.match(catalog, /--allow-unproven/);
    assert.match(catalog, /--require-recipe/);
    const verb = execFileSync(process.execPath, [CLI, "jury", "help"], { encoding: "utf8" });
    assert.match(verb, /--allow-unproven/);
    assert.match(verb, /--require-recipe/);
    assert.match(verb, /unproven: no/);
    assert.match(verb, /recipe card/);
    assert.match(verb, /reversed-correction|unresolved|recipe/);
  });
});

describe("core source", () => {
  it("does not call Math.random or the network", () => {
    const src = readFileSync(join(ROOT, "src", "specialist", "jury.mjs"), "utf8");
    const cmd = readFileSync(join(ROOT, "src", "jury-cmd.mjs"), "utf8");
    assert.equal(src.includes("Math.random"), false);
    assert.equal(cmd.includes("Math.random"), false);
    assert.equal(src.includes("fetch("), false);
    assert.equal(cmd.includes("fetch("), false);
  });
});
