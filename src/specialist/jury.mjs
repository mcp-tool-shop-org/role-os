/**
 * Jury step — pick a panel of trained critics only when it beats the best one.
 *
 * Critics score a validation set (`roleos-jury-validation/v1`). Higher score means
 * "truth = 1". A score above the threshold is a yes, a score below it is a no,
 * and a score exactly equal to the threshold is an abstention: left out of
 * accuracy, still counted in coverage. A panel score of exactly 0 is a panel
 * abstention, not a no. The core measures each critic, measures how alike their
 * mistakes are, and keeps a panel only when nested group-clustered resampling
 * says the panel is better than the best single critic.
 *
 * Pure module: no I/O and no unseeded draws. Every interval is a function of the
 * items, the critics, and the seed the caller passes.
 *
 * Selection follows Caruana et al. 2004 (greedy forward selection with replacement,
 * equal weight per picked slot) and Caruana's bagging remedy (keep a critic chosen
 * in at least half the group-bootstrap bags). Error consistency is Cohen's kappa on
 * the right/wrong vectors, expected agreement taken from the two accuracies
 * (Geirhos, Meding, and Wichmann, 2020). The 0.9 duplicate cutoff is this studio's
 * rule, not a literature value.
 */

import { createHash } from "node:crypto";
import { canonicalJson } from "./recipe-card.mjs";

export const VALIDATION_SCHEMA = "roleos-jury-validation/v1";
export const PANEL_SCHEMA = "roleos-jury-panel/v1";

export const MIN_ITEMS = 30;
export const MIN_GROUPS = 10;
/** Studio rule: a pair at or above this error consistency is one critic counted twice. */
export const DUPLICATE_KAPPA = 0.9;

export const DEFAULT_BOOTSTRAP = 2000;
export const DEFAULT_BAGS = 50;
export const DEFAULT_FOLDS = 5;
export const DEFAULT_MAX_SIZE = 5;
export const DEFAULT_SEED = 0;

/**
 * mulberry32. Returns floats in [0, 1). Seed is taken modulo 2^32.
 * @param {number} seed
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveSeed(seed, salt) {
  let x = (seed >>> 0) ^ (salt >>> 0);
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return x >>> 0;
}

function percentile(sorted, p) {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function sortedGroups(items) {
  const seen = new Set();
  for (let i = 0; i < items.length; i++) seen.add(items[i].group);
  return [...seen].sort();
}

function byId(critics) {
  return critics.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Missing key, null, or a non-finite number is an abstention. */
function scoreOf(critic, itemId) {
  if (!critic || !critic.scores || !Object.prototype.hasOwnProperty.call(critic.scores, itemId)) return null;
  const v = critic.scores[itemId];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/**
 * 1 when the score is above the threshold, 0 when it is below.
 * Null when the score is missing or exactly the threshold: that is an abstention,
 * not a no.
 */
function decisionOf(score, threshold) {
  if (score === null || score === threshold) return null;
  return score > threshold ? 1 : 0;
}

/** Population mean and sd (divide by n). Empty input is unmeasured. */
function meanSd(values) {
  const n = values.length;
  if (n === 0) return { mean: null, sd: null };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  const mean = sum / n;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    ss += d * d;
  }
  return { mean, sd: Math.sqrt(ss / n) };
}

/**
 * Z-score on the fit set, then centre on the threshold.
 * (score - mean) / sd - (threshold - mean) / sd = (score - threshold) / sd.
 * Both terms are written out so the stored mean is actually applied.
 * sd of 0 has no scale: the vote is the sign of (score - threshold).
 * A tie is 0, and a 0 vote is an abstention, not a no.
 */
function centred(score, mean, sd, threshold) {
  if (mean === null || sd === null || !(sd > 0)) {
    if (score > threshold) return 1;
    if (score < threshold) return -1;
    return 0;
  }
  const z = (score - mean) / sd;
  const zThreshold = (threshold - mean) / sd;
  return z - zThreshold;
}

function fitCritic(critic, items) {
  const values = [];
  for (let i = 0; i < items.length; i++) {
    const s = scoreOf(critic, items[i].id);
    if (s !== null) values.push(s);
  }
  return meanSd(values);
}

/**
 * @returns {{ ok: boolean, errors: string[], items: object[], critics: object[] }}
 */
export function parseValidation(doc, { requireTruth = true } = {}) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: ["validation file must be a JSON object"], items: [], critics: [] };
  }
  if (doc.schema !== VALIDATION_SCHEMA) errors.push(`schema must be ${VALIDATION_SCHEMA}`);
  if (!Array.isArray(doc.items)) errors.push("items must be an array");
  if (!doc.critics || typeof doc.critics !== "object" || Array.isArray(doc.critics)) {
    errors.push("critics must be an object keyed by critic id");
  }
  if (!Array.isArray(doc.items) || !doc.critics || typeof doc.critics !== "object" || Array.isArray(doc.critics)) {
    return { ok: false, errors, items: [], critics: [] };
  }

  const items = [];
  const seen = new Set();
  for (let i = 0; i < doc.items.length; i++) {
    const it = doc.items[i];
    const tag = `items[${i}]`;
    if (!it || typeof it !== "object" || Array.isArray(it)) {
      errors.push(`${tag} must be an object`);
      continue;
    }
    if (typeof it.id !== "string" || it.id.length === 0) {
      errors.push(`${tag}.id must be a non-empty string`);
      continue;
    }
    if (seen.has(it.id)) {
      errors.push(`${tag}.id duplicates "${it.id}"`);
      continue;
    }
    seen.add(it.id);
    if (requireTruth) {
      if (typeof it.group !== "string" || it.group.length === 0) errors.push(`${tag}.group must be a non-empty string`);
      if (it.truth !== 0 && it.truth !== 1) errors.push(`${tag}.truth must be 0 or 1`);
    } else {
      if (it.group !== undefined && (typeof it.group !== "string" || it.group.length === 0)) {
        errors.push(`${tag}.group must be a non-empty string when present`);
      }
      if (it.truth !== undefined && it.truth !== 0 && it.truth !== 1) {
        errors.push(`${tag}.truth must be 0 or 1 when present`);
      }
    }
    items.push({
      id: it.id,
      group: typeof it.group === "string" && it.group.length > 0 ? it.group : it.id,
      truth: it.truth === 0 || it.truth === 1 ? it.truth : null,
    });
  }

  const critics = [];
  const ids = Object.keys(doc.critics).sort();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const c = doc.critics[id];
    const tag = `critics[${JSON.stringify(id)}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      errors.push(`${tag} must be an object`);
      continue;
    }
    if (typeof c.threshold !== "number" || !Number.isFinite(c.threshold)) {
      errors.push(`${tag}.threshold must be a finite number`);
      continue;
    }
    if (!c.scores || typeof c.scores !== "object" || Array.isArray(c.scores)) {
      errors.push(`${tag}.scores must be an object`);
      continue;
    }
    if (c.kind !== undefined && typeof c.kind !== "string") errors.push(`${tag}.kind must be a string`);
    let recipe = null;
    if (c.recipe !== undefined) {
      const pointer = c.recipe;
      if (!pointer || typeof pointer !== "object" || Array.isArray(pointer)) {
        errors.push(`${tag}.recipe must be an object { path, sha256 }`);
      } else {
        if (typeof pointer.path !== "string" || pointer.path.length === 0) {
          errors.push(`${tag}.recipe.path must be a non-empty string`);
        }
        if (typeof pointer.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(pointer.sha256)) {
          errors.push(`${tag}.recipe.sha256 must be a 64-char lowercase hex sha256`);
        }
        if (
          typeof pointer.path === "string" && pointer.path.length > 0
          && typeof pointer.sha256 === "string" && /^[0-9a-f]{64}$/.test(pointer.sha256)
        ) {
          recipe = { path: pointer.path, sha256: pointer.sha256 };
        }
      }
    }
    const scores = {};
    const keys = Object.keys(c.scores);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const v = c.scores[key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push(`${tag}.scores[${JSON.stringify(key)}] must be a finite number`);
        continue;
      }
      scores[key] = v;
    }
    critics.push({
      id,
      kind: typeof c.kind === "string" ? c.kind : null,
      threshold: c.threshold,
      scores,
      recipe,
    });
  }

  if (items.length === 0) errors.push("items must not be empty");
  if (critics.length === 0) errors.push("critics must not be empty");
  return { ok: errors.length === 0, errors, items, critics };
}

/** SHA-256 of the validation document's canonical JSON. */
export function hashValidation(doc) {
  return createHash("sha256").update(canonicalJson(doc)).digest("hex");
}

/**
 * Point accuracy, coverage, and a 95% group-clustered bootstrap interval.
 * Groups are resampled with replacement; items that share a group stay together.
 * `scored` counts every finite score, including a score exactly at the threshold.
 * `decided` counts only yes and no. Accuracy is correct / decided. It is null
 * when the critic made no decision ("unmeasured"), even if it scored every item
 * by landing on the threshold.
 */
export function accuracy(critic, items, { seed = DEFAULT_SEED, B = DEFAULT_BOOTSTRAP } = {}) {
  if (!Number.isInteger(B) || B < 1) {
    const err = new Error("bootstrap replicates (B) must be an integer ≥ 1");
    err.exitCode = 1;
    err.hint = "The default is 2000.";
    throw err;
  }
  const total = items.length;
  if (total === 0) {
    return { accuracy: null, coverage: null, scored: 0, decided: 0, total: 0, correct: 0, ci: null };
  }

  const buckets = new Map();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    let bucket = buckets.get(it.group);
    if (!bucket) {
      bucket = { correct: 0, decided: 0, covered: 0 };
      buckets.set(it.group, bucket);
    }
    const s = scoreOf(critic, it.id);
    if (s === null) continue;
    bucket.covered += 1;
    const decision = decisionOf(s, critic.threshold);
    if (decision === null) continue;
    bucket.decided += 1;
    if (decision === it.truth) bucket.correct += 1;
  }

  const groupIds = [...buckets.keys()].sort();
  const stats = [];
  let correct = 0;
  let decided = 0;
  let covered = 0;
  for (let i = 0; i < groupIds.length; i++) {
    const bucket = buckets.get(groupIds[i]);
    stats.push(bucket);
    correct += bucket.correct;
    decided += bucket.decided;
    covered += bucket.covered;
  }

  if (covered === 0) {
    return { accuracy: null, coverage: 0, scored: 0, decided: 0, total, correct: 0, ci: null };
  }
  if (decided === 0) {
    return { accuracy: null, coverage: covered / total, scored: covered, decided: 0, total, correct: 0, ci: null };
  }

  const rng = makeRng(seed);
  const replicates = [];
  const nG = stats.length;
  for (let b = 0; b < B; b++) {
    let cSum = 0;
    let sSum = 0;
    for (let g = 0; g < nG; g++) {
      const draw = stats[Math.floor(rng() * nG)];
      cSum += draw.correct;
      sSum += draw.decided;
    }
    if (sSum > 0) replicates.push(cSum / sSum);
  }

  let ci = null;
  if (replicates.length > 0) {
    replicates.sort((x, y) => x - y);
    ci = {
      low: percentile(replicates, 0.025),
      high: percentile(replicates, 0.975),
      replicates: replicates.length,
    };
  }

  return {
    accuracy: correct / decided,
    coverage: covered / total,
    scored: covered,
    decided,
    total,
    correct,
    ci,
  };
}

export function pointAccuracy(critic, items) {
  let correct = 0;
  let scored = 0;
  for (let i = 0; i < items.length; i++) {
    const decision = decisionOf(scoreOf(critic, items[i].id), critic.threshold);
    if (decision === null) continue;
    scored += 1;
    if (decision === items[i].truth) correct += 1;
  }
  if (scored === 0) return null;
  return { correct, scored, accuracy: correct / scored };
}

function pairStats(a, b, items) {
  let n = 0;
  let bothCorrect = 0;
  let bothWrong = 0;
  let aCorrect = 0;
  let bCorrect = 0;
  let disagree = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const pa = decisionOf(scoreOf(a, it.id), a.threshold);
    const pb = decisionOf(scoreOf(b, it.id), b.threshold);
    if (pa === null || pb === null) continue;
    n += 1;
    const ca = pa === it.truth;
    const cb = pb === it.truth;
    if (ca) aCorrect += 1;
    if (cb) bCorrect += 1;
    if (ca && cb) bothCorrect += 1;
    if (!ca && !cb) bothWrong += 1;
    if (pa !== pb) disagree += 1;
  }
  if (n === 0) {
    return { n: 0, errorConsistency: null, doubleFault: null, disagreement: null };
  }
  const accA = aCorrect / n;
  const accB = bCorrect / n;
  const observed = (bothCorrect + bothWrong) / n;
  const expected = accA * accB + (1 - accA) * (1 - accB);
  // Expected agreement of 1 means chance already saturates. Kappa is unmeasured.
  const errorConsistency = expected < 1 ? (observed - expected) / (1 - expected) : null;
  return {
    n,
    errorConsistency,
    doubleFault: bothWrong / n,
    disagreement: disagree / n,
  };
}

/** Cohen's kappa on right/wrong. Null when unmeasured. */
export function errorConsistency(a, b, items) {
  return pairStats(a, b, items).errorConsistency;
}

/** Share of jointly scored items both get wrong. Null when neither scored a shared item. */
export function doubleFault(a, b, items) {
  return pairStats(a, b, items).doubleFault;
}

/** Share of jointly scored items whose decisions differ. */
export function disagreement(a, b, items) {
  return pairStats(a, b, items).disagreement;
}

export function diversityMatrix(critics, items) {
  const ordered = byId(critics);
  const pairs = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const stats = pairStats(ordered[i], ordered[j], items);
      pairs.push({ a: ordered[i].id, b: ordered[j].id, ...stats });
    }
  }
  return pairs;
}

function fitAll(critics, items) {
  const fitted = new Map();
  for (let c = 0; c < critics.length; c++) {
    const critic = critics[c];
    const values = [];
    const at = [];
    for (let i = 0; i < items.length; i++) {
      const s = scoreOf(critic, items[i].id);
      if (s !== null) {
        values.push(s);
        at.push(i);
      }
    }
    const fit = meanSd(values);
    const out = new Array(items.length).fill(null);
    for (let k = 0; k < at.length; k++) {
      out[at[k]] = centred(values[k], fit.mean, fit.sd, critic.threshold);
    }
    fitted.set(critic.id, { mean: fit.mean, sd: fit.sd, threshold: critic.threshold, out });
  }
  return fitted;
}

function panelCounts(counts, fitted, items) {
  const members = [];
  for (const [id, count] of counts) {
    if (count > 0) members.push({ id, count, out: fitted.get(id).out });
  }
  let correct = 0;
  let scored = 0;
  let covered = 0;
  for (let i = 0; i < items.length; i++) {
    let wsum = 0;
    let w = 0;
    for (let m = 0; m < members.length; m++) {
      const z = members[m].out[i];
      // A centred 0 is a threshold tie: that member abstains and casts no vote.
      if (z === null || z === 0) continue;
      wsum += z * members[m].count;
      w += members[m].count;
    }
    if (w === 0) continue;
    const mean = wsum / w;
    // The panel produced a score, so the item is in coverage.
    covered += 1;
    // Equal opposing votes are a panel abstention: in coverage, out of accuracy.
    // Deleting the next line counts the tie as a no.
    if (mean === 0) continue;
    scored += 1;
    const decision = mean > 0 ? 1 : 0;
    if (decision === items[i].truth) correct += 1;
  }
  if (scored === 0 && covered === 0) return null;
  return { correct, scored, covered };
}

/**
 * Refit critics and count an explicit panel.
 * `covered` includes a panel abstention (mean exactly 0).
 * `scored` counts only yes and no. Accuracy is correct / scored.
 */
export function panelMeasurement(critics, items, members) {
  const ordered = byId(critics);
  const fitted = fitAll(ordered, items);
  const counts = new Map();
  for (let i = 0; i < members.length; i++) {
    counts.set(members[i].critic, members[i].count);
  }
  const stats = panelCounts(counts, fitted, items);
  const total = items.length;
  if (!stats || stats.scored === 0) {
    return {
      correct: 0,
      scored: 0,
      covered: stats ? stats.covered : 0,
      accuracy: null,
      coverage: total === 0 ? null : (stats ? stats.covered : 0) / total,
    };
  }
  return {
    correct: stats.correct,
    scored: stats.scored,
    covered: stats.covered,
    accuracy: stats.correct / stats.scored,
    coverage: total === 0 ? null : stats.covered / total,
  };
}

/**
 * Best critic by point accuracy. Ties break toward the lexicographically smaller id.
 * @returns {{ id: string, correct: number, scored: number, accuracy: number } | null}
 */
export function bestSingle(critics, items) {
  let best = null;
  const ordered = byId(critics);
  for (let i = 0; i < ordered.length; i++) {
    const acc = pointAccuracy(ordered[i], items);
    if (!acc) continue;
    const row = { id: ordered[i].id, correct: acc.correct, scored: acc.scored, accuracy: acc.accuracy };
    if (!best) {
      best = row;
      continue;
    }
    const left = row.correct * best.scored;
    const right = best.correct * row.scored;
    if (left > right || (left === right && row.id < best.id)) best = row;
  }
  return best;
}

/**
 * Greedy forward selection with replacement. Starts at the best single critic.
 * Adds the critic (a critic may be added again) that most raises panel accuracy.
 * Stops when no addition raises it, or when the slot count reaches maxSize.
 * A picked critic counts once per slot.
 */
export function greedySelect(critics, items, { maxSize = DEFAULT_MAX_SIZE } = {}) {
  const ordered = byId(critics);
  if (ordered.length === 0 || !Number.isInteger(maxSize) || maxSize < 1) {
    return { members: [], accuracy: null };
  }
  const fitted = fitAll(ordered, items);
  const best = bestSingle(ordered, items);
  if (!best) return { members: [], accuracy: null };

  const counts = new Map([[best.id, 1]]);
  let current = panelCounts(counts, fitted, items);
  let slots = 1;
  while (slots < maxSize) {
    let bestAdd = null;
    for (let i = 0; i < ordered.length; i++) {
      const id = ordered[i].id;
      const trial = new Map(counts);
      trial.set(id, (trial.get(id) || 0) + 1);
      const acc = panelCounts(trial, fitted, items);
      if (!acc || !current) continue;
      if (acc.correct * current.scored <= current.correct * acc.scored) continue;
      if (
        !bestAdd
        || acc.correct * bestAdd.scored > bestAdd.correct * acc.scored
        || (acc.correct * bestAdd.scored === bestAdd.correct * acc.scored && id < bestAdd.id)
      ) {
        bestAdd = { id, correct: acc.correct, scored: acc.scored };
      }
    }
    if (!bestAdd) break;
    counts.set(bestAdd.id, (counts.get(bestAdd.id) || 0) + 1);
    current = { correct: bestAdd.correct, scored: bestAdd.scored };
    slots += 1;
  }

  const members = [];
  for (const [id, count] of counts) {
    if (count > 0) members.push({ critic: id, count });
  }
  members.sort((a, b) => (a.critic < b.critic ? -1 : a.critic > b.critic ? 1 : 0));
  return {
    members,
    accuracy: current ? current.correct / current.scored : null,
  };
}

function resampleGroups(items, groupIds, rng) {
  const by = new Map();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    let rows = by.get(it.group);
    if (!rows) {
      rows = [];
      by.set(it.group, rows);
    }
    rows.push(it);
  }
  const n = groupIds.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const rows = by.get(groupIds[Math.floor(rng() * n)]);
    for (let k = 0; k < rows.length; k++) out.push(rows[k]);
  }
  return out;
}

function lowerMedian(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * Run greedySelect on group-bootstrap resamples. Keep critics chosen in at least
 * half the bags. The count is the lower median of that critic's counts on the bags
 * that chose it.
 */
export function baggedSelect(critics, items, {
  bags = DEFAULT_BAGS,
  seed = DEFAULT_SEED,
  maxSize = DEFAULT_MAX_SIZE,
} = {}) {
  const ordered = byId(critics);
  const rng = makeRng(seed);
  const groupIds = sortedGroups(items);
  const history = new Map();
  for (let i = 0; i < ordered.length; i++) history.set(ordered[i].id, []);

  for (let b = 0; b < bags; b++) {
    const sample = groupIds.length === 0 ? [] : resampleGroups(items, groupIds, rng);
    const selected = greedySelect(ordered, sample, { maxSize });
    const countOf = new Map();
    for (let i = 0; i < selected.members.length; i++) {
      countOf.set(selected.members[i].critic, selected.members[i].count);
    }
    for (let i = 0; i < ordered.length; i++) {
      const id = ordered[i].id;
      history.get(id).push(countOf.get(id) || 0);
    }
  }

  const members = [];
  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i].id;
    const counts = history.get(id);
    const present = [];
    for (let k = 0; k < counts.length; k++) if (counts[k] > 0) present.push(counts[k]);
    if (present.length * 2 >= bags && bags > 0) {
      members.push({
        critic: id,
        count: lowerMedian(present),
        bagsPresent: present.length,
      });
    }
  }
  members.sort((a, b) => b.count - a.count || (a.critic < b.critic ? -1 : a.critic > b.critic ? 1 : 0));
  return { members, bags, seed };
}

function scoreOne(members, item, criticById) {
  let wsum = 0;
  let w = 0;
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const critic = criticById.get(member.critic);
    if (!critic || member.mean === null || member.sd === null) continue;
    const s = scoreOf(critic, item.id);
    if (s === null) continue;
    const z = centred(s, member.mean, member.sd, member.threshold);
    if (z === 0) continue;
    wsum += z * member.count;
    w += member.count;
  }
  if (w === 0) return { score: null, decision: null, abstained: true };
  const score = wsum / w;
  if (score === 0) return { score: 0, decision: null, abstained: true };
  return { score, decision: score > 0 ? 1 : 0, abstained: false };
}

function criticMap(critics) {
  return new Map(critics.map((c) => [c.id, c]));
}

/**
 * Apply a panel whose mean, sd, threshold, and count are already fixed.
 * Does not refit. An item every member abstains on is unmeasured (score null).
 */
export function scoreItems(members, items, critics) {
  const byId = critics instanceof Map ? critics : criticMap(critics);
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const scored = scoreOne(members, item, byId);
    out.push({ id: item.id, score: scored.score, decision: scored.decision });
  }
  return out;
}

/** Panel accuracy on items that received a decision and have a truth. */
export function panelScore(members, items, critics) {
  const rows = scoreItems(members, items, critics);
  let correct = 0;
  let scored = 0;
  const byItem = new Map(items.map((it) => [it.id, it]));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.decision === null) continue;
    const it = byItem.get(row.id);
    if (!it || (it.truth !== 0 && it.truth !== 1)) continue;
    scored += 1;
    if (row.decision === it.truth) correct += 1;
  }
  return {
    rows,
    accuracy: scored === 0 ? null : correct / scored,
    correct,
    scored,
  };
}

function shuffle(list, rng) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function bootstrapDiffCi(rows, seed, B) {
  const by = new Map();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let list = by.get(row.group);
    if (!list) {
      list = [];
      by.set(row.group, list);
    }
    list.push(row.diff);
  }
  const groupIds = [...by.keys()].sort();
  if (groupIds.length === 0) return null;
  const rng = makeRng(seed);
  const stats = [];
  const nG = groupIds.length;
  for (let b = 0; b < B; b++) {
    let sum = 0;
    let n = 0;
    for (let g = 0; g < nG; g++) {
      const diffs = by.get(groupIds[Math.floor(rng() * nG)]);
      for (let k = 0; k < diffs.length; k++) {
        sum += diffs[k];
        n += 1;
      }
    }
    if (n > 0) stats.push(sum / n);
  }
  if (stats.length === 0) return null;
  stats.sort((a, b) => a - b);
  return {
    low: percentile(stats, 0.025),
    high: percentile(stats, 0.975),
    replicates: stats.length,
  };
}

/**
 * Split groups into K folds. On each fold, bagged-select on the other folds and
 * score that panel on the held-out groups. Do the same for the best single critic
 * chosen on the training folds. The interval is a paired group-clustered bootstrap
 * of (panel correct − best-single correct) on the held-out items.
 */
export function nestedEstimate(critics, items, {
  folds = DEFAULT_FOLDS,
  seed = DEFAULT_SEED,
  bags = DEFAULT_BAGS,
  maxSize = DEFAULT_MAX_SIZE,
  B = DEFAULT_BOOTSTRAP,
} = {}) {
  if (!Number.isInteger(folds) || folds < 2) {
    const err = new Error("folds must be an integer ≥ 2");
    err.exitCode = 1;
    err.hint = "The default is 5.";
    throw err;
  }
  const ordered = byId(critics);
  const groupIds = sortedGroups(items);
  const rng = makeRng(seed);
  const shuffled = shuffle(groupIds, rng);
  const foldOf = new Map();
  for (let i = 0; i < shuffled.length; i++) foldOf.set(shuffled[i], i % folds);

  const rows = [];
  let panelCorrect = 0;
  let singleCorrect = 0;
  let n = 0;
  const perFold = [];

  for (let k = 0; k < folds; k++) {
    const train = [];
    const test = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (foldOf.get(it.group) === k) test.push(it);
      else train.push(it);
    }
    if (train.length === 0 || test.length === 0) {
      perFold.push({
        fold: k,
        skipped: true,
        n: 0,
        heldOut: test.length,
        reason: train.length === 0 ? "training fold is empty" : "held-out fold is empty",
        bestSingle: null,
        members: [],
      });
      continue;
    }
    const bagged = baggedSelect(ordered, train, { bags, seed: deriveSeed(seed, k + 1), maxSize });
    const best = bestSingle(ordered, train);
    if (!best || bagged.members.length === 0) {
      const why = !best && bagged.members.length === 0
        ? "no critic has a measured accuracy on the training fold, and bagged selection kept no critic"
        : !best
          ? "no critic has a measured accuracy on the training fold"
          : "bagged selection kept no critic";
      perFold.push({
        fold: k,
        skipped: true,
        n: 0,
        heldOut: test.length,
        reason: why,
        bestSingle: best ? best.id : null,
        members: [],
      });
      continue;
    }
    const members = [];
    for (let i = 0; i < bagged.members.length; i++) {
      const slot = bagged.members[i];
      const critic = ordered.find((c) => c.id === slot.critic);
      const fit = fitCritic(critic, train);
      members.push({
        critic: slot.critic,
        count: slot.count,
        mean: fit.mean,
        sd: fit.sd,
        threshold: critic.threshold,
      });
    }
    const bestCritic = ordered.find((c) => c.id === best.id);
    const byCritic = criticMap(ordered);
    let foldN = 0;
    let dropPanel = 0;
    let dropSingle = 0;
    let dropBoth = 0;
    let dropTruth = 0;
    for (let i = 0; i < test.length; i++) {
      const it = test[i];
      const panel = scoreOne(members, it, byCritic);
      const singleDecision = decisionOf(scoreOf(bestCritic, it.id), bestCritic.threshold);
      if ((it.truth !== 0 && it.truth !== 1) || panel.abstained || singleDecision === null) {
        if (it.truth !== 0 && it.truth !== 1) dropTruth += 1;
        else if (panel.abstained && singleDecision === null) dropBoth += 1;
        else if (panel.abstained) dropPanel += 1;
        else dropSingle += 1;
        continue;
      }
      const pc = panel.decision === it.truth ? 1 : 0;
      const sc = singleDecision === it.truth ? 1 : 0;
      rows.push({ group: it.group, diff: pc - sc });
      panelCorrect += pc;
      singleCorrect += sc;
      n += 1;
      foldN += 1;
    }
    perFold.push({
      fold: k,
      skipped: false,
      n: foldN,
      heldOut: test.length,
      reason: leftOutReason(dropPanel, dropSingle, dropBoth, dropTruth),
      bestSingle: best.id,
      members: members.map((m) => ({ critic: m.critic, count: m.count })),
    });
  }

  const panelAccuracy = n === 0 ? null : panelCorrect / n;
  const bestSingleAccuracy = n === 0 ? null : singleCorrect / n;
  const difference = n === 0 ? null : panelAccuracy - bestSingleAccuracy;
  const differenceCi = n === 0 ? null : bootstrapDiffCi(rows, deriveSeed(seed, 0xB007), B);

  return {
    folds,
    seed,
    n,
    panelAccuracy,
    bestSingleAccuracy,
    difference,
    differenceCi,
    perFold,
  };
}

function leftOutReason(dropPanel, dropSingle, dropBoth, dropTruth) {
  const parts = [];
  if (dropBoth > 0) parts.push(`${dropBoth} where both abstained`);
  if (dropPanel > 0) parts.push(`${dropPanel} where the panel abstained`);
  if (dropSingle > 0) parts.push(`${dropSingle} where the best single abstained`);
  if (dropTruth > 0) parts.push(`${dropTruth} where truth is missing`);
  if (parts.length === 0) return null;
  return `left out ${parts.join(", ")}`;
}

function lookupAssessment(recipes, id) {
  if (recipes instanceof Map) return recipes.has(id) ? recipes.get(id) : null;
  if (recipes && Object.prototype.hasOwnProperty.call(recipes, id)) return recipes[id];
  return null;
}

/**
 * A failed or unresolved standard control excludes the critic unless
 * allowUnproven is set. A missing card is a note, and excludes only when
 * requireRecipe is set. Gaps never exclude. `recipes == null` leaves the
 * gate off so existing callers are unchanged.
 */
function recipeAssessments(critics, recipes, { allowUnproven = false, requireRecipe = false } = {}) {
  if (recipes == null) return { applied: false, byId: new Map(), excluded: [] };
  const views = new Map();
  const excluded = [];
  const ordered = byId(critics);
  for (let i = 0; i < ordered.length; i++) {
    const critic = ordered[i];
    const assessment = lookupAssessment(recipes, critic.id);
    const view = assessment
      ? {
          id: typeof assessment.id === "string" ? assessment.id : null,
          sha256: typeof assessment.sha256 === "string" ? assessment.sha256 : null,
          passed: Array.isArray(assessment.passed) ? assessment.passed : [],
          failed: Array.isArray(assessment.failed) ? assessment.failed : [],
          unresolved: Array.isArray(assessment.unresolved) ? assessment.unresolved : [],
          gaps: Array.isArray(assessment.gaps) ? assessment.gaps : [],
          note: null,
        }
      : {
          id: null,
          sha256: null,
          passed: [],
          failed: [],
          unresolved: [],
          gaps: [],
          note: "unproven: no recipe card",
        };
    const problems = [];
    for (let f = 0; f < view.failed.length; f++) problems.push(`${view.failed[f]} failed`);
    for (let u = 0; u < view.unresolved.length; u++) problems.push(`${view.unresolved[u]} unresolved`);
    if (!assessment && requireRecipe) {
      excluded.push({ id: critic.id, reason: "unproven: no recipe card" });
    } else if (problems.length > 0 && !allowUnproven) {
      excluded.push({ id: critic.id, reason: problems.join(", ") });
    }
    views.set(critic.id, view);
  }
  return { applied: true, byId: views, excluded };
}

function criticReports(critics, items, seed, B) {
  const reports = [];
  const ordered = byId(critics);
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    const measured = accuracy(c, items, { seed, B });
    reports.push({
      id: c.id,
      kind: c.kind,
      threshold: c.threshold,
      accuracy: measured.accuracy,
      coverage: measured.coverage,
      scored: measured.scored,
      decided: measured.decided,
      total: measured.total,
      correct: measured.correct,
      ci: measured.ci ? { low: measured.ci.low, high: measured.ci.high } : null,
    });
  }
  return reports;
}

/**
 * Per-critic accuracy, the diversity matrix, inverted critics, and duplicate pairs.
 * A critic is inverted when its accuracy interval lies entirely below 0.5.
 * The tool reports that and does not flip the critic's scores.
 */
export function juryCheck(critics, items, {
  seed = DEFAULT_SEED,
  B = DEFAULT_BOOTSTRAP,
  recipes,
  allowUnproven = false,
  requireRecipe = false,
} = {}) {
  const reports = criticReports(critics, items, seed, B);
  const pairs = diversityMatrix(critics, items);
  const inverted = [];
  for (let i = 0; i < reports.length; i++) {
    const row = reports[i];
    if (row.ci && row.ci.high < 0.5) inverted.push(row.id);
  }
  const duplicates = [];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.errorConsistency !== null && pair.errorConsistency >= DUPLICATE_KAPPA) {
      duplicates.push({ a: pair.a, b: pair.b, errorConsistency: pair.errorConsistency });
    }
  }
  const gate = recipeAssessments(critics, recipes, { allowUnproven, requireRecipe });
  for (let i = 0; i < reports.length; i++) {
    reports[i].recipe = gate.applied ? (gate.byId.get(reports[i].id) || null) : null;
  }
  return {
    items: items.length,
    groups: sortedGroups(items).length,
    seed,
    bootstrap: B,
    critics: reports,
    pairs,
    inverted,
    duplicates,
    excluded: gate.excluded,
    allowUnproven: gate.applied ? allowUnproven === true : false,
    requireRecipe: gate.applied ? requireRecipe === true : false,
  };
}

function fitMembers(slots, critics, items) {
  const by = criticMap(critics);
  const members = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const critic = by.get(slot.critic);
    const fit = fitCritic(critic, items);
    members.push({
      critic: slot.critic,
      count: slot.count,
      mean: fit.mean,
      sd: fit.sd,
      threshold: critic.threshold,
      bagsPresent: slot.bagsPresent,
    });
  }
  return members;
}

/**
 * Full selection. Verdict is "panel" only when the nested paired interval lies
 * entirely above 0 and bagging kept at least one critic. Otherwise "best-single"
 * (naming that critic) or "insufficient-data".
 */
export function jurySelect(critics, items, {
  seed = DEFAULT_SEED,
  B = DEFAULT_BOOTSTRAP,
  bags = DEFAULT_BAGS,
  folds = DEFAULT_FOLDS,
  maxSize = DEFAULT_MAX_SIZE,
  recipes,
  allowUnproven = false,
  requireRecipe = false,
} = {}) {
  if (!Number.isInteger(bags) || bags < 1) {
    const err = new Error("bags must be an integer ≥ 1");
    err.exitCode = 1;
    err.hint = "The default is 50.";
    throw err;
  }
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    const err = new Error("maxSize must be an integer ≥ 1");
    err.exitCode = 1;
    err.hint = "The default is 5.";
    throw err;
  }
  const check = juryCheck(critics, items, { seed, B, recipes, allowUnproven, requireRecipe });
  const base = {
    ...check,
    maxSize,
    bags,
    folds,
  };
  if (items.length < MIN_ITEMS || check.groups < MIN_GROUPS) {
    return {
      ...base,
      verdict: {
        decision: "insufficient-data",
        critic: null,
        reason: `need at least ${MIN_ITEMS} items and ${MIN_GROUPS} groups; got ${items.length} items and ${check.groups} groups`,
      },
      bagged: null,
      nested: null,
    };
  }

  const inverted = new Set(check.inverted);
  const excludedIds = new Set(check.excluded.map((row) => row.id));
  const eligible = byId(critics).filter((c) => !inverted.has(c.id) && !excludedIds.has(c.id) && pointAccuracy(c, items) !== null);
  if (eligible.length === 0) {
    const measured = byId(critics).filter((c) => pointAccuracy(c, items) !== null);
    const notInverted = measured.filter((c) => !inverted.has(c.id));
    let reason;
    if (measured.length === 0) reason = "no critic has a measured accuracy";
    else if (notInverted.length === 0) reason = "every critic with a measured accuracy has an interval entirely below 0.5";
    else reason = "every measured critic is excluded by its recipe card";
    return {
      ...base,
      verdict: {
        decision: "insufficient-data",
        critic: null,
        reason,
      },
      bagged: null,
      nested: null,
    };
  }

  const best = bestSingle(eligible, items);
  const bagged = baggedSelect(eligible, items, { bags, seed, maxSize });
  const nested = nestedEstimate(eligible, items, { folds, seed, bags, maxSize, B });
  const fitted = fitMembers(bagged.members, eligible, items).map((member) => {
    const view = check.critics.find((row) => row.id === member.critic);
    const recipe = view && view.recipe ? view.recipe : null;
    return {
      ...member,
      recipeId: recipe && recipe.id ? recipe.id : null,
      recipeSha256: recipe && recipe.sha256 ? recipe.sha256 : null,
    };
  });
  const clears = nested.differenceCi !== null && nested.differenceCi.low > 0;
  const hasMembers = fitted.length > 0;

  let decision;
  let reason;
  let criticName = null;
  if (clears && hasMembers) {
    decision = "panel";
    reason = "the nested paired interval of panel minus best single lies entirely above 0";
  } else {
    decision = "best-single";
    criticName = best.id;
    reason = !clears
      ? "the nested paired interval of panel minus best single does not lie entirely above 0"
      : "bagged selection kept no critic in at least half the bags";
  }

  return {
    ...base,
    verdict: { decision, critic: criticName, reason },
    bagged: { members: fitted, bags, seed },
    nested,
  };
}

export function buildPanelFile({
  members,
  validationSha256,
  seed,
  maxSize,
  bags,
  folds,
  bootstrap,
  nested,
  allowUnproven = false,
}) {
  return {
    schema: PANEL_SCHEMA,
    allow_unproven: allowUnproven === true,
    members: members.map((m) => ({
      critic: m.critic,
      count: m.count,
      mean: m.mean,
      sd: m.sd,
      threshold: m.threshold,
      recipe_id: m.recipeId || m.recipe_id || null,
      recipe_sha256: m.recipeSha256 || m.recipe_sha256 || null,
    })),
    selected_on: {
      validation_sha256: validationSha256,
      seed,
      max_size: maxSize,
      bags,
      folds,
      bootstrap,
    },
    verdict: "panel",
    nested: {
      panel_accuracy: nested.panelAccuracy,
      best_single_accuracy: nested.bestSingleAccuracy,
      difference: nested.difference,
      difference_ci: nested.differenceCi
        ? [nested.differenceCi.low, nested.differenceCi.high]
        : null,
      n: nested.n,
    },
  };
}

export function parsePanel(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: ["panel file must be a JSON object"], members: [] };
  }
  if (doc.schema !== PANEL_SCHEMA) errors.push(`schema must be ${PANEL_SCHEMA}`);
  if (doc.verdict !== "panel") errors.push('verdict must be "panel"');
  if (doc.allow_unproven !== undefined && typeof doc.allow_unproven !== "boolean") {
    errors.push("allow_unproven must be a boolean when present");
  }
  if (!Array.isArray(doc.members) || doc.members.length === 0) errors.push("members must be a non-empty array");
  const members = [];
  if (Array.isArray(doc.members)) {
    for (let i = 0; i < doc.members.length; i++) {
      const m = doc.members[i];
      const tag = `members[${i}]`;
      if (!m || typeof m !== "object" || Array.isArray(m)) {
        errors.push(`${tag} must be an object`);
        continue;
      }
      if (typeof m.critic !== "string" || m.critic.length === 0) errors.push(`${tag}.critic must be a non-empty string`);
      if (!Number.isInteger(m.count) || m.count < 1) errors.push(`${tag}.count must be an integer ≥ 1`);
      if (typeof m.mean !== "number" || !Number.isFinite(m.mean)) errors.push(`${tag}.mean must be a finite number`);
      if (typeof m.sd !== "number" || !Number.isFinite(m.sd) || m.sd < 0) errors.push(`${tag}.sd must be a finite number ≥ 0`);
      if (typeof m.threshold !== "number" || !Number.isFinite(m.threshold)) errors.push(`${tag}.threshold must be a finite number`);
      const recipeId = optionalRecipeField(m.recipe_id, `${tag}.recipe_id`, errors);
      const recipeSha = optionalRecipeSha(m.recipe_sha256, `${tag}.recipe_sha256`, errors);
      if (
        typeof m.critic === "string" && m.critic.length > 0
        && Number.isInteger(m.count) && m.count >= 1
        && typeof m.mean === "number" && Number.isFinite(m.mean)
        && typeof m.sd === "number" && Number.isFinite(m.sd) && m.sd >= 0
        && typeof m.threshold === "number" && Number.isFinite(m.threshold)
        && recipeId !== undefined
        && recipeSha !== undefined
      ) {
        members.push({
          critic: m.critic,
          count: m.count,
          mean: m.mean,
          sd: m.sd,
          threshold: m.threshold,
          recipe_id: recipeId,
          recipe_sha256: recipeSha,
        });
      }
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    members,
    allowUnproven: doc && doc.allow_unproven === true,
  };
}

/** Absent or null stays null. A wrong type is an error and returns undefined so the member is dropped. */
function optionalRecipeField(value, tag, errors) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${tag} must be a non-empty string or null`);
    return undefined;
  }
  return value;
}

function optionalRecipeSha(value, tag, errors) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    errors.push(`${tag} must be a 64-char lowercase hex sha256 or null`);
    return undefined;
  }
  return value;
}
