/**
 * drift.mjs — specialist certification-staleness detector (S5 "later"). Research-grounded design
 * in design/specialist-drift-detection.md (run wf_e7feeda2-061). Computes a two-arm gate from
 * dispatch receipts, reducing each dispatch through the specialist's OWN output (BBSD — the
 * empirically best reducer, Rabanser et al. 2019 arXiv:1810.11953), against a SEALED-EXAM
 * reference. No external embedder, no GPU at check-time.
 *
 * Hides one secret family (Parnas): the statistical machinery (which test, which reduction). The
 * reducer is the specialist's hard verdict label for v1 (BBSDh); swapping to soft softmax (BBSDs)
 * or deep-kernel MMD does not change this module's interface (assessDrift in, status out).
 *
 * SAFETY: this module only computes a STATUS. `stale` is an advisory re-certification
 * recommendation surfaced to the director; nothing here fires a GPU job (NAMED_COMPENSATORS: the
 * only irreversible op it can recommend is the director's, gated by an attended decision).
 */

import { readFieldInputs } from "./field-log.mjs";

/** Pinned policy knobs (PIN_PER_STEP). Calibrate empirically before trusting `stale`
 *  (exam-vs-exam null FPR + injected-shift power) — the literature does not set absolute
 *  numbers for short structured text. See design/specialist-drift-detection.md. */
export const DRIFT_DEFAULTS = {
  N_FLOOR: 100,          // below this: accumulating, no test (S5-now)
  N_TRUST: 500,          // below this with a negative: inconclusive (low power), don't claim clean
  ALPHA: 0.05,           // G-test significance
  TV_OVERRIDE: 0.35,     // total-variation distance that fires `stale` regardless of the perf arm
  ACC_GAP_MARGIN: 0.10,  // ATC predicted-accuracy drop that trips the performance arm
  ECE_BINS: 10,          // equal-mass bins
  ECE_MIN_PER_BIN: 5,    // a bin below this is merged outward (small-N stability, Nixon 2019)
  ECE_MARGIN: 0.05,      // field-ECE lower-CI excess over exam baseline that trips the perf arm
  BOOTSTRAP: 500,        // bootstrap resamples for the ECE CI
};

// ── numerics: regularized incomplete gamma → chi-square survival ────────────────────────────────

function gammaln(xx) {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = xx, y = xx, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function gserP(a, x) { // lower regularized P(a,x) via series
  if (x <= 0) return 0;
  const gln = gammaln(a);
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 0; n < 300; n++) {
    ap += 1; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-13) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

function gcfQ(a, x) { // upper regularized Q(a,x) via continued fraction
  const FPMIN = 1e-300, gln = gammaln(a);
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-13) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Upper-tail chi-square probability P(X^2 > stat) with df degrees of freedom. */
export function chiSquareSf(stat, df) {
  if (df <= 0) return 1;
  if (stat <= 0) return 1;
  const a = df / 2, x = stat / 2;
  return x < a + 1 ? 1 - gserP(a, x) : gcfQ(a, x);
}

// ── drift arm: BBSDh G-test on the verdict-label marginal ───────────────────────────────────────

/**
 * G-test (likelihood-ratio chi-square) of homogeneity on a 2×K table (exam vs field counts over
 * the verdict classes). Returns the statistic, df=K-1, the upper-tail p-value, per-class counts,
 * and the total-variation distance between the two marginals.
 */
export function gTest(examCounts, fieldCounts, classes) {
  const rowExam = classes.reduce((s, c) => s + (examCounts[c] || 0), 0);
  const rowField = classes.reduce((s, c) => s + (fieldCounts[c] || 0), 0);
  const total = rowExam + rowField;
  let G = 0, tv = 0;
  const perClass = [];
  for (const c of classes) {
    const e = examCounts[c] || 0, f = fieldCounts[c] || 0;
    const colTotal = e + f;
    for (const [obs, rowTotal] of [[e, rowExam], [f, rowField]]) {
      const exp = total > 0 ? (rowTotal * colTotal) / total : 0;
      if (obs > 0 && exp > 0) G += 2 * obs * Math.log(obs / exp);
    }
    const pe = rowExam > 0 ? e / rowExam : 0;
    const pf = rowField > 0 ? f / rowField : 0;
    tv += Math.abs(pe - pf);
    perClass.push({ class: c, exam: e, field: f, exam_frac: round4(pe), field_frac: round4(pf) });
  }
  const df = Math.max(0, classes.length - 1);
  return { G: round4(G), df, p: round4(chiSquareSf(G, df)), tv_distance: round4(tv / 2), perClass };
}

// ── performance arm: ATC (label-free) + ECE (where outcomes exist) ───────────────────────────────

/** ATC predicted accuracy = fraction of field confidences at or above the cert-time threshold. */
export function atcPredictedAccuracy(scores, threshold) {
  if (!scores.length || typeof threshold !== "number") return null;
  return scores.filter((s) => s >= threshold).length / scores.length;
}

/** Equal-mass ECE over {conf, correct} pairs; bins below ECE_MIN_PER_BIN merge into the next. */
export function eceEqualMass(pairs, nbins, minPerBin) {
  const sorted = [...pairs].sort((a, b) => a.conf - b.conf);
  const N = sorted.length;
  if (N === 0) return null;
  const target = Math.max(minPerBin, Math.ceil(N / nbins));
  let ece = 0, i = 0;
  while (i < N) {
    let end = Math.min(N, i + target);
    if (N - end < minPerBin) end = N; // absorb a too-small tail
    const grp = sorted.slice(i, end);
    const acc = grp.filter((p) => p.correct).length / grp.length;
    const conf = grp.reduce((s, p) => s + p.conf, 0) / grp.length;
    ece += (grp.length / N) * Math.abs(acc - conf);
    i = end;
  }
  return ece;
}

/** Deterministic PRNG (mulberry32) so the ECE bootstrap CI is reproducible in tests. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lower bound of a percentile-bootstrap CI on ECE (gate on the lower bound, Nixon 2019). */
export function eceBootstrapLowerCI(pairs, { nbins, minPerBin, B, alpha = 0.05 } = {}) {
  const N = pairs.length;
  if (N === 0) return null;
  const rand = mulberry32(N * 2654435761 + pairs.filter((p) => p.correct).length);
  const samples = [];
  for (let b = 0; b < B; b++) {
    const resample = new Array(N);
    for (let i = 0; i < N; i++) resample[i] = pairs[Math.floor(rand() * N)];
    const e = eceEqualMass(resample, nbins, minPerBin);
    if (e !== null) samples.push(e);
  }
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return samples[Math.floor((alpha / 2) * samples.length)];
}

// ── the gate ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Assess certification staleness for a role from its field rows against a sealed-exam reference.
 *
 * @param {object} args
 * @param {Array}  args.fieldRows   rows from field-log.mjs (readFieldInputs)
 * @param {object|null} args.reference  roleos-exam-reference/v1 (or null → "accumulating")
 * @param {object} [args.config]    overrides for DRIFT_DEFAULTS
 * @returns {object} { status, n, drift, performance, override, power_note }
 */
export function assessDrift({ fieldRows, reference, config = {} }) {
  const cfg = { ...DRIFT_DEFAULTS, ...config };

  // BBSD reduces through the specialist's OWN output → only specialist-source rows with a verdict.
  const rows = fieldRows.filter((r) => r.source === "specialist" && r.verdict != null);
  const n = rows.length;

  if (!reference) {
    return { status: "accumulating", n, note: "no sealed-exam reference yet (needs cert-time capture)" };
  }
  if (n < cfg.N_FLOOR) {
    return { status: "accumulating", n, min_samples: cfg.N_FLOOR,
      note: `${n}/${cfg.N_FLOOR} specialist-routed verdicts toward the drift test` };
  }

  const classes = reference.classes || Object.keys(reference.label_marginal || {});

  // ── drift arm (BBSDh) ──
  const fieldCounts = {};
  for (const r of rows) fieldCounts[r.verdict] = (fieldCounts[r.verdict] || 0) + 1;
  const examCounts = {};
  for (const c of classes) examCounts[c] = Math.round((reference.label_marginal?.[c] || 0) * (reference.n_exam || 0));
  const gt = gTest(examCounts, fieldCounts, classes);
  const driftFires = gt.df > 0 && gt.p < cfg.ALPHA;
  const override = gt.tv_distance >= cfg.TV_OVERRIDE;

  // ── performance arm (ATC + ECE) ──
  const scores = rows.filter((r) => typeof r.score === "number").map((r) => r.score);
  const predicted = atcPredictedAccuracy(scores, reference.atc_threshold);
  const examAcc = typeof reference.exam_accuracy === "number" ? reference.exam_accuracy : null;
  const accGap = predicted !== null && examAcc !== null ? round4(examAcc - predicted) : null;
  const atcFires = accGap !== null && accGap >= cfg.ACC_GAP_MARGIN;

  // ECE only where field outcomes exist (a labeled subset; sparse in v1).
  const labeled = rows.filter((r) => typeof r.score === "number" && typeof r.outcome === "boolean")
    .map((r) => ({ conf: r.score, correct: r.outcome }));
  let eceLowerCI = null, eceFires = false;
  if (labeled.length >= cfg.ECE_MIN_PER_BIN && typeof reference.exam_ece === "number") {
    eceLowerCI = eceBootstrapLowerCI(labeled, { nbins: cfg.ECE_BINS, minPerBin: cfg.ECE_MIN_PER_BIN, B: cfg.BOOTSTRAP });
    eceFires = eceLowerCI !== null && eceLowerCI > reference.exam_ece + cfg.ECE_MARGIN;
  }

  const perfAvailable = accGap !== null || eceLowerCI !== null;
  const perfFires = atcFires || eceFires;

  // ── gate ──
  let status, reason;
  if (override) { status = "stale"; reason = "drift-override: catastrophic verdict-marginal shift"; }
  else if (driftFires && perfFires) { status = "stale"; reason = "both arms: output drift AND degraded performance"; }
  else if (driftFires && !perfFires) { status = "watch"; reason = perfAvailable ? "drift only — benign covariate move (perf arm clear)" : "drift only — performance arm unavailable (no confirmation)"; }
  else if (!driftFires && perfFires) { status = "watch"; reason = "performance signal without output drift — process/labeling issue, not staleness"; }
  else { status = n >= cfg.N_TRUST ? "monitored" : "monitored-lowpower";
    reason = n >= cfg.N_TRUST ? "no drift, adequate power" : `no drift but N<${cfg.N_TRUST} — inconclusive, do not reset stale-clock`; }

  return {
    status,
    reason,
    n,
    override,
    drift: { fires: driftFires, p: gt.p, G: gt.G, df: gt.df, tv_distance: gt.tv_distance, per_class: gt.perClass },
    performance: {
      fires: perfFires,
      available: perfAvailable,
      atc: { predicted_accuracy: predicted, exam_accuracy: examAcc, accuracy_gap: accGap, fires: atcFires },
      ece: { field_lower_ci: eceLowerCI === null ? null : round4(eceLowerCI), exam_baseline: reference.exam_ece ?? null, labeled_n: labeled.length, fires: eceFires },
    },
  };
}

/**
 * Convenience: read the field log and assess. Returns the same shape as assessDrift.
 * @param {string} fieldLogPath
 * @param {object} args { role, reference, config }
 */
export function assessDriftFromLog(fieldLogPath, { role, reference, config } = {}) {
  const fieldRows = readFieldInputs(fieldLogPath, { role });
  return assessDrift({ fieldRows, reference, config });
}

function round4(x) { return typeof x === "number" && Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : x; }
