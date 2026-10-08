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
  { name: "held-out-generator", guards: "the attribute transfers to data from a family it never saw" },
  { name: "natural-errors", guards: "the critic finds real, unplanted errors, not only planted ones" },
]);

export const FORMAT_KINDS = Object.freeze(["pointwise", "pairwise", "rubric", "generative", "other"]);
export const CONSTRUCTIONS = Object.freeze(["planted-edit", "human-inserted", "rewrite", "natural", "mixed", "other"]);
export const CONTROL_STATUS = Object.freeze(["passed", "failed", "not-run"]);

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

/**
 * Validate a card. Errors make the card unusable; warnings mark gaps in the recipe's evidence
 * (a card can be registered with warnings — the Record shows them).
 *
 * @returns {{ ok: boolean, errors: string[], warnings: string[], controls: object }}
 */
export function validateRecipeCard(card) {
  const errors = [];
  const warnings = [];
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    return { ok: false, errors: ["card must be a JSON object"], warnings, controls: summarizeControls([]) };
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
  }
  const summary = summarizeControls(controls);
  if (summary.missing.length) warnings.push(`standard controls not recorded: ${summary.missing.join(", ")}`);
  for (const f of summary.failed) warnings.push(`control failed: ${f} — the role's readings that depend on it do not hold`);

  if (!card.pins || typeof card.pins !== "object") warnings.push("pins missing — pin every model, prompt and tool version (PIN_PER_STEP)");

  return { ok: errors.length === 0, errors, warnings, controls: summary };
}

/** Standard-control coverage: which ran, passed, failed, or are missing. */
export function summarizeControls(controls) {
  const byName = new Map((controls || []).filter((c) => c && isStr(c.name)).map((c) => [c.name, c]));
  const standard = STANDARD_CONTROLS.map((s) => s.name);
  const passed = standard.filter((n) => byName.get(n)?.status === "passed");
  const failed = standard.filter((n) => byName.get(n)?.status === "failed");
  const notRun = standard.filter((n) => byName.get(n)?.status === "not-run");
  const missing = standard.filter((n) => !byName.has(n));
  return { standard: standard.length, passed, failed, not_run: notRun, missing, coverage: `${passed.length}/${standard.length}` };
}

/** Parse + validate a card from JSON text; never throws. */
export function parseRecipeCard(text) {
  let card;
  try { card = JSON.parse(text); }
  catch (err) { return { card: null, ok: false, errors: [`not valid JSON: ${err.message}`], warnings: [], controls: summarizeControls([]), sha256: null }; }
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
