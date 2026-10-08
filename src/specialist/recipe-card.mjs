/**
 * Recipe cards — the dataset recipe behind a trained role (`roleos-recipe-card/v1`).
 *
 * A specialist's role comes from the data it was trained on, not from a prompt. A recipe card
 * records that data's design so the role can be reproduced, compared and audited: what the
 * role should learn, how its negatives were made, the filters, the format, the splits, the
 * controls that prove it learned the attribute (and not a generator's fingerprint), and the
 * pins. A registry version can point at a card by id + sha256 (`recipe_card`), so every
 * certified role traces to the recipe that made it.
 *
 * Grounding: rnd entry 2026-10-08-dataset-recipes-for-critic-jury-roles-designing-roles-by-dat
 * (DataComp's "recipe as the unit of study"; Datasheets / Data Cards; CriticGPT's lesson that
 * planted-error recovery overstates quality; generator fingerprints in single-source data).
 *
 * Pure module: no I/O beyond the JSON text the caller passes in.
 */

import { createHash } from "node:crypto";

export const RECIPE_SCHEMA = "roleos-recipe-card/v1";

/**
 * The standard controls a critic recipe ships with, cheapest first. Each guards a different
 * way a trained critic can look good without having learned its attribute.
 */
export const STANDARD_CONTROLS = Object.freeze([
  { name: "positive-marker", guards: "the pipeline can learn at all (a known marker must be learned)" },
  { name: "graded-marker", guards: "the features can see an edit as small as a real one" },
  { name: "shuffled-labels", guards: "the features carry nothing label-correlated besides the attribute" },
  { name: "partial-input", guards: "half the input (edit span only, one side only) does not already solve it" },
  { name: "generator-identity-probe", guards: "which model made the data is not trivially recoverable" },
  { name: "same-generator-no-error", guards: "an edit by the same generator without an error reads as clean" },
  { name: "reversed-correction", guards: "the critic is not just an edit detector: the edited copy is the corrected, stronger one" },
  { name: "held-out-generator", guards: "the attribute transfers to data from a family it never saw" },
  { name: "natural-errors", guards: "the critic finds real, unplanted errors, not only planted ones" },
]);

export const FORMAT_KINDS = Object.freeze(["pointwise", "pairwise", "rubric", "generative", "other"]);
export const CONSTRUCTIONS = Object.freeze(["planted-edit", "human-inserted", "rewrite", "natural", "mixed", "other"]);
export const CONTROL_STATUS = Object.freeze(["passed", "failed", "not-run", "unresolved"]);

/** Exactly half of each cluster's labels are flipped (Ojala & Garriga 2010). */
const BALANCED_PERMUTATION = "balanced-permutation";
const EDIT_METHODS = Object.freeze(["word-swap", "sentence-rewrite"]);
const SHUFFLE_WHY = 'method must be "balanced-permutation" (exactly half of each cluster\'s labels are flipped; Ojala & Garriga 2010). A plain random shuffle is a gap, because a consistent edit direction makes the shuffle imbalance set the sign';
const EDIT_WHY = 'method must be "word-swap" or "sentence-rewrite", and the paraphrase median must not exceed 2× the error median; a pass needs the edit-rate CI to include 0.5';
const REVERSED_WHY = "passed needs an accuracy CI entirely above 0.5 (the edited copy is the corrected, stronger one; touching 0.5 is not above)";

/** Canonical JSON: keys sorted at every level, so the hash ignores formatting and key order. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashRecipeCard(card) {
  return createHash("sha256").update(canonicalJson(card)).digest("hex");
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);

function methodWhy(name) {
  if (name === "shuffled-labels") return SHUFFLE_WHY;
  if (name === "same-generator-no-error") return EDIT_WHY;
  if (name === "reversed-correction") return REVERSED_WHY;
  return "";
}

/** p ≥ 1/(nulls+1). Equality within 1e-9 of p*(nulls+1) === 1 still clears the floor. */
function belowPermutationFloor(p, nulls) {
  return p * (nulls + 1) < 1 - 1e-9;
}

function beatsEveryNull(p, nulls) {
  return Math.abs(p * (nulls + 1) - 1) <= 1e-9;
}

function ciIncludes(ci, value) {
  return ci[0] <= value && value <= ci[1];
}

function intervalsOverlap(a, b) {
  return a[0] <= b[1] && b[0] <= a[1];
}

/**
 * Read one measure. The inconsistencies named by the card contract are errors.
 * Missing optional fields stay missing so the method rules can report them as gaps.
 * Returns null only when `measure` is not an object.
 */
function readMeasure(measure, tag, errors) {
  if (!measure || typeof measure !== "object" || Array.isArray(measure)) {
    errors.push(`${tag}: measure must be an object`);
    return null;
  }
  const out = { methods: [] };
  readMeasureFields(measure, `${tag}: measure`, errors, out);
  if (measure.methods !== undefined) {
    if (!Array.isArray(measure.methods)) {
      errors.push(`${tag}: measure.methods must be an array`);
    } else {
      for (let j = 0; j < measure.methods.length; j++) {
        const entry = measure.methods[j];
        const entryTag = `${tag}: measure.methods[${j}]`;
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          errors.push(`${entryTag} must be an object`);
          continue;
        }
        const parsed = {};
        readMeasureFields(entry, entryTag, errors, parsed);
        out.methods.push(parsed);
      }
    }
  }
  return out;
}

function readMeasureFields(measure, prefix, errors, out) {
  if (measure.ci !== undefined) {
    const ci = measure.ci;
    if (!Array.isArray(ci) || ci.length !== 2 || !isFiniteNum(ci[0]) || !isFiniteNum(ci[1])) {
      errors.push(`${prefix}.ci must be a pair of finite numbers [low, high]`);
    } else if (ci[0] > ci[1]) {
      errors.push(`${prefix}.ci low ${ci[0]} is above high ${ci[1]}`);
    } else {
      out.ci = [ci[0], ci[1]];
    }
  }
  if (measure.point !== undefined) {
    if (!isFiniteNum(measure.point)) {
      errors.push(`${prefix}.point must be a finite number`);
    } else if (out.ci && (measure.point < out.ci[0] || measure.point > out.ci[1])) {
      errors.push(`${prefix}.point ${measure.point} is outside its CI [${out.ci[0]}, ${out.ci[1]}]`);
    } else {
      out.point = measure.point;
    }
  }
  if (measure.p !== undefined) {
    if (!isFiniteNum(measure.p) || measure.p <= 0 || measure.p > 1) {
      errors.push(`${prefix}.p must be in (0, 1]`);
    } else {
      out.p = measure.p;
    }
  }
  if (measure.nulls !== undefined) {
    if (!Number.isInteger(measure.nulls) || measure.nulls < 1) {
      errors.push(`${prefix}.nulls must be an integer ≥ 1`);
    } else {
      out.nulls = measure.nulls;
    }
  }
  if (typeof measure.method === "string" && measure.method.length > 0) out.method = measure.method;
  if (measure.paraphrase_median !== undefined) {
    if (!isFiniteNum(measure.paraphrase_median)) out.paraphraseInvalid = true;
    else out.paraphrase_median = measure.paraphrase_median;
  }
  if (measure.error_median !== undefined) {
    if (!isFiniteNum(measure.error_median)) out.errorInvalid = true;
    else out.error_median = measure.error_median;
  }
}

function applyControlRules(control, index, errors, warnings, notes) {
  const name = control.name;
  const tag = `controls[${index}] (${name})`;
  const why = methodWhy(name);
  if (control.measure === undefined) {
    if (control.status === "passed") {
      warnings.push(why ? `${tag}: passed without a measure — ${why}` : `${tag}: passed without a measure`);
    } else if (control.status !== "not-run" && why) {
      warnings.push(`${tag}: no measure — ${why}`);
    }
    return;
  }
  const measure = readMeasure(control.measure, tag, errors);
  if (!measure) return;
  if (name === "shuffled-labels") applyShuffledLabels(tag, control.status, measure, errors, warnings, notes);
  else if (name === "same-generator-no-error") applySameGenerator(tag, control.status, measure, errors, warnings);
  else if (name === "reversed-correction") applyReversedCorrection(tag, control.status, measure, errors);
}

function applyShuffledLabels(tag, status, measure, errors, warnings, notes) {
  if (measure.method !== BALANCED_PERMUTATION) warnings.push(`${tag}: ${SHUFFLE_WHY}`);
  if (measure.nulls !== undefined) {
    const floor = `1/${measure.nulls + 1}`;
    let note = `${tag}: permutation floor is ${floor}`;
    if (status === "passed" && measure.p !== undefined && beatsEveryNull(measure.p, measure.nulls)) {
      note += "; a pass at this floor means the observed result beat every null";
    }
    notes.push(note);
  }
  if (status !== "passed") return;
  if (measure.p === undefined || measure.nulls === undefined) {
    errors.push(`${tag}: passed needs p and nulls, because a pass requires p ≥ 1/(nulls+1)`);
    return;
  }
  if (belowPermutationFloor(measure.p, measure.nulls)) {
    errors.push(`${tag}: passed needs p ≥ 1/${measure.nulls + 1}; got ${measure.p}`);
  }
}

function medianGap(tag, label, rec, warnings) {
  if (rec.paraphraseInvalid || rec.errorInvalid) {
    warnings.push(`${tag}: ${label} paraphrase_median and error_median must be finite numbers`);
    return;
  }
  if (rec.paraphrase_median === undefined || rec.error_median === undefined) {
    warnings.push(`${tag}: ${label} paraphrase_median and error_median are required`);
    return;
  }
  if (rec.paraphrase_median > 2 * rec.error_median) {
    warnings.push(`${tag}: ${label} paraphrase median ${rec.paraphrase_median} exceeds 2× the error median ${rec.error_median}`);
  }
}

function applySameGenerator(tag, status, measure, errors, warnings) {
  if (!EDIT_METHODS.includes(measure.method)) {
    warnings.push(`${tag}: method must be "word-swap" or "sentence-rewrite"`);
  }
  medianGap(tag, "measure", measure, warnings);
  for (let j = 0; j < measure.methods.length; j++) {
    medianGap(tag, `methods[${j}]`, measure.methods[j], warnings);
  }
  if (status === "passed") {
    if (!measure.ci || !ciIncludes(measure.ci, 0.5)) {
      errors.push(`${tag}: passed needs the edit-rate CI to include 0.5`);
    }
    for (let j = 0; j < measure.methods.length; j++) {
      const ci = measure.methods[j].ci;
      if (ci && !ciIncludes(ci, 0.5)) {
        errors.push(`${tag}: methods[${j}] passed needs the edit-rate CI to include 0.5`);
      }
    }
  }
  const byMethod = new Map();
  const records = [measure, ...measure.methods];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (EDIT_METHODS.includes(rec.method) && !byMethod.has(rec.method)) byMethod.set(rec.method, rec);
  }
  if (byMethod.size < 2) return;
  const a = byMethod.get("word-swap");
  const b = byMethod.get("sentence-rewrite");
  if (!a.ci || !b.ci) {
    warnings.push(`${tag}: both methods are recorded but a CI is missing, so whether the intervals overlap is unmeasured`);
    return;
  }
  if (!intervalsOverlap(a.ci, b.ci) && status !== "unresolved") {
    errors.push(`${tag}: both methods are recorded and their CIs do not overlap, so status must be "unresolved"`);
  }
}

function applyReversedCorrection(tag, status, measure, errors) {
  if (status !== "passed") return;
  if (!measure.ci || !(measure.ci[0] > 0.5)) {
    const low = measure.ci ? measure.ci[0] : "missing";
    errors.push(`${tag}: passed needs an accuracy CI entirely above 0.5 (low ${low} is not above 0.5; touching 0.5 is not above)`);
  }
}

/**
 * Validate a card. Errors make the card unusable; warnings mark gaps in the recipe's evidence
 * (a card can be registered with warnings — the Record shows them). Notes are printed facts
 * that are not gaps, such as the permutation floor of a shuffled-labels control.
 *
 * @returns {{ ok: boolean, errors: string[], warnings: string[], notes: string[], controls: object }}
 */
export function validateRecipeCard(card) {
  const errors = [];
  const warnings = [];
  const notes = [];
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    return { ok: false, errors: ["card must be a JSON object"], warnings, notes, controls: summarizeControls([]) };
  }
  if (card.schema !== RECIPE_SCHEMA) errors.push(`schema must be "${RECIPE_SCHEMA}"`);
  for (const f of ["id", "role", "attribute"]) if (!isStr(card[f])) errors.push(`${f} must be a non-empty string`);

  const fmt = card.format;
  if (!fmt || typeof fmt !== "object") errors.push("format must be an object");
  else if (!FORMAT_KINDS.includes(fmt.kind)) errors.push(`format.kind must be one of ${FORMAT_KINDS.join(", ")}`);
  else if (fmt.kind === "pairwise" && fmt.order_randomised !== true) {
    warnings.push("format: pairwise data without order randomisation teaches position (randomise, and consider swap augmentation)");
  }

  const neg = card.negatives;
  if (!neg || typeof neg !== "object") errors.push("negatives must be an object");
  else {
    if (!CONSTRUCTIONS.includes(neg.construction)) errors.push(`negatives.construction must be one of ${CONSTRUCTIONS.join(", ")}`);
    const gens = Array.isArray(neg.generators) ? neg.generators : [];
    if (neg.construction && neg.construction !== "natural" && neg.construction !== "human-inserted") {
      if (!gens.length) errors.push("negatives.generators must list the model(s) that made the negatives");
      for (const [i, g] of gens.entries()) {
        if (!g || !isStr(g.model) || !isStr(g.family)) errors.push(`negatives.generators[${i}] needs model and family`);
        else if (!isStr(g.revision)) warnings.push(`negatives.generators[${i}] (${g.model}): no pinned revision or digest`);
      }
      const families = new Set(gens.filter((g) => g && isStr(g.family)).map((g) => g.family.toLowerCase()));
      if (families.size === 1) {
        warnings.push("negatives: one generator family — a critic can learn that family's fingerprint instead of the attribute (train on 2–3 families, hold one out)");
      }
    }
    if (!Array.isArray(neg.error_taxonomy) || !neg.error_taxonomy.length) {
      warnings.push("negatives.error_taxonomy is empty — tag error types so results can be sliced");
    }
  }

  const splits = card.splits;
  if (!splits || typeof splits !== "object") errors.push("splits must be an object");
  else {
    for (const s of ["train", "validation"]) if (!splits[s]) errors.push(`splits.${s} is required`);
    if (!splits.final) warnings.push("splits.final missing — keep one set never used to train, select or tune");
    if (!splits.held_out_generator) warnings.push("splits.held_out_generator missing — the in-family sets cannot reveal a generator fingerprint");
    if (!splits.natural_errors) warnings.push("splits.natural_errors missing — planted-error accuracy overstates a critic");
  }

  if (!Array.isArray(card.sources) || !card.sources.length) warnings.push("sources is empty — record provenance and licence");
  else for (const [i, s] of card.sources.entries()) {
    if (!s || !isStr(s.name)) errors.push(`sources[${i}] needs a name`);
    else if (!isStr(s.licence)) warnings.push(`sources[${i}] (${s.name}): no licence recorded`);
  }

  const controls = Array.isArray(card.controls) ? card.controls : [];
  if (card.controls !== undefined && !Array.isArray(card.controls)) errors.push("controls must be an array");
  for (const [i, c] of controls.entries()) {
    if (!c || !isStr(c.name)) errors.push(`controls[${i}] needs a name`);
    else if (!CONTROL_STATUS.includes(c.status)) errors.push(`controls[${i}] (${c.name}): status must be one of ${CONTROL_STATUS.join(", ")}`);
    else applyControlRules(c, i, errors, warnings, notes);
  }
  const summary = summarizeControls(controls);
  if (summary.missing.length) warnings.push(`standard controls not recorded: ${summary.missing.join(", ")}`);
  for (const f of summary.failed) warnings.push(`control failed: ${f} — the role's readings that depend on it do not hold`);
  for (const u of summary.unresolved) warnings.push(`control unresolved: ${u} — the control is not passed`);

  if (!card.pins || typeof card.pins !== "object") warnings.push("pins missing — pin every model, prompt and tool version (PIN_PER_STEP)");

  return { ok: errors.length === 0, errors, warnings, notes, controls: summary };
}

/** Standard-control coverage: which ran, passed, failed, are unresolved, or are missing. */
export function summarizeControls(controls) {
  const byName = new Map((controls || []).filter((c) => c && isStr(c.name)).map((c) => [c.name, c]));
  const standard = STANDARD_CONTROLS.map((s) => s.name);
  const passed = standard.filter((n) => byName.get(n)?.status === "passed");
  const failed = standard.filter((n) => byName.get(n)?.status === "failed");
  const unresolved = standard.filter((n) => byName.get(n)?.status === "unresolved");
  const notRun = standard.filter((n) => byName.get(n)?.status === "not-run");
  const missing = standard.filter((n) => !byName.has(n));
  return {
    standard: standard.length,
    passed,
    failed,
    unresolved,
    not_run: notRun,
    missing,
    coverage: `${passed.length}/${standard.length}`,
  };
}

/** Parse + validate a card from JSON text; never throws. */
export function parseRecipeCard(text) {
  let card;
  try { card = JSON.parse(text); }
  catch (err) { return { card: null, ok: false, errors: [`not valid JSON: ${err.message}`], warnings: [], notes: [], controls: summarizeControls([]), sha256: null }; }
  const v = validateRecipeCard(card);
  return { card, ...v, sha256: v.ok ? hashRecipeCard(card) : null };
}

/** A starting card for a role, every standard control listed as not-run. */
export function recipeTemplate(role, id = "") {
  return {
    schema: RECIPE_SCHEMA,
    id: id || `${String(role).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v1`,
    role,
    attribute: "",
    target_failures: [],
    out_of_scope: [],
    format: { kind: "pointwise", order_randomised: false, swap_augmented: false, reference_answer: "none", rationale: false },
    sources: [{ name: "", licence: "", provenance: "" }],
    negatives: { construction: "planted-edit", generators: [{ model: "", family: "", revision: "" }], error_taxonomy: [], edit_stats: null, seed: 0, code_hash: "" },
    filtering: [],
    mixture: {},
    splits: { train: null, validation: null, final: null, held_out_generator: null, natural_errors: null },
    controls: STANDARD_CONTROLS.map((c) => ({ name: c.name, status: "not-run", result: "" })),
    results: [],
    pins: {},
    references: [],
  };
}

/** The registry's pointer to a card: { id, sha256, path? }. */
export function validateRecipePointer(p, tag) {
  const errors = [];
  if (!p || typeof p !== "object") return [`${tag}: recipe_card must be an object { id, sha256, path? }`];
  if (!isStr(p.id)) errors.push(`${tag}: recipe_card.id must be a non-empty string`);
  if (typeof p.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(p.sha256)) errors.push(`${tag}: recipe_card.sha256 must be a 64-char lowercase hex sha256`);
  if (p.path !== undefined && !isStr(p.path)) errors.push(`${tag}: recipe_card.path, if present, must be a non-empty string`);
  return errors;
}
