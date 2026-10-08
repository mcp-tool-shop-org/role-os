import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RECIPE_SCHEMA,
  STANDARD_CONTROLS,
  canonicalJson,
  hashRecipeCard,
  validateRecipeCard,
  summarizeControls,
  parseRecipeCard,
  recipeTemplate,
  validateRecipePointer,
} from "../src/specialist/recipe-card.mjs";
import { validateRegistry, REGISTRY_SCHEMA } from "../src/specialist/registry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "roleos.mjs");

/** A measure that satisfies the method rule for this control, so a complete card still has no gaps. */
function satisfyingMeasure(name) {
  if (name === "shuffled-labels") {
    return {
      metric: "accuracy", point: 0.5, ci: [0.4, 0.6], n: 100, clusters: "prompt",
      method: "balanced-permutation", p: 0.2, nulls: 19,
    };
  }
  if (name === "same-generator-no-error") {
    return {
      metric: "edit-rate", point: 0.5, ci: [0.4, 0.6], n: 100, clusters: "prompt",
      method: "word-swap", paraphrase_median: 3, error_median: 4,
    };
  }
  if (name === "reversed-correction") {
    return { metric: "accuracy", point: 0.8, ci: [0.7, 0.9], n: 80, clusters: "prompt" };
  }
  return { metric: "accuracy", point: 0.8, ci: [0.7, 0.9], n: 50, clusters: "prompt" };
}

function goodCard(over = {}) {
  return {
    schema: RECIPE_SCHEMA,
    id: "auditor-planted-v1",
    role: "Auditor",
    attribute: "finds the planted error in one answer",
    format: { kind: "pointwise" },
    sources: [{ name: "aspire-si fresh pairs", licence: "studio-internal", provenance: "aspire-si-runs/2026-10-08" }],
    negatives: {
      construction: "planted-edit",
      generators: [
        { model: "Qwen2.5-32B-Instruct Q4", family: "qwen", revision: "q4_k_m" },
        { model: "gemma4:31b", family: "gemma", revision: "6316f0629137" },
      ],
      error_taxonomy: ["wrong fact or number", "reasoning step that does not follow"],
    },
    splits: { train: { pairs: 603 }, validation: { pairs: 149 }, final: { pairs: 127 }, held_out_generator: { family: "granite" }, natural_errors: { items: 80 } },
    controls: STANDARD_CONTROLS.map((c) => ({ name: c.name, status: "passed", measure: satisfyingMeasure(c.name) })),
    pins: { features: "Qwen/Qwen2.5-1.5B-Instruct@989aa79" },
    ...over,
  };
}

describe("recipe card validation", () => {
  it("accepts a complete card with no gaps", () => {
    const r = validateRecipeCard(goodCard());
    assert.equal(r.ok, true, r.errors.join("; "));
    assert.deepEqual(r.warnings, []);
    assert.equal(r.controls.coverage, `${STANDARD_CONTROLS.length}/${STANDARD_CONTROLS.length}`);
  });

  it("rejects missing core fields and a wrong schema", () => {
    const r = validateRecipeCard({ schema: "x" });
    assert.equal(r.ok, false);
    for (const want of ["schema must be", "id must be", "role must be", "attribute must be", "format must be", "negatives must be", "splits must be"]) {
      assert.ok(r.errors.some((e) => e.includes(want)), `missing error: ${want}`);
    }
    assert.equal(validateRecipeCard(null).ok, false);
    assert.equal(validateRecipeCard([]).ok, false);
  });

  it("requires generators for generated negatives, but not for natural ones", () => {
    const noGen = goodCard({ negatives: { construction: "planted-edit", generators: [], error_taxonomy: ["x"] } });
    assert.ok(validateRecipeCard(noGen).errors.some((e) => e.includes("generators must list")));
    const natural = goodCard({ negatives: { construction: "natural", error_taxonomy: ["x"] } });
    assert.equal(validateRecipeCard(natural).ok, true);
    const badGen = goodCard({ negatives: { construction: "planted-edit", generators: [{ model: "m" }], error_taxonomy: ["x"] } });
    assert.ok(validateRecipeCard(badGen).errors.some((e) => e.includes("needs model and family")));
  });

  it("flags the evidence gaps the research names", () => {
    const card = goodCard({
      format: { kind: "pairwise" },
      negatives: { construction: "planted-edit", generators: [{ model: "Qwen2.5-32B", family: "qwen" }], error_taxonomy: [] },
      splits: { train: {}, validation: {} },
      sources: [],
      controls: [{ name: "shuffled-labels", status: "failed" }],
      pins: undefined,
    });
    const r = validateRecipeCard(card);
    assert.equal(r.ok, true);
    const w = r.warnings.join("\n");
    for (const want of ["order randomisation", "one generator family", "no pinned revision", "error_taxonomy is empty",
      "splits.final missing", "held_out_generator missing", "natural_errors missing", "sources is empty",
      "standard controls not recorded", "control failed: shuffled-labels", "pins missing"]) {
      assert.ok(w.includes(want), `missing gap: ${want}`);
    }
  });

  it("validates control entries and source licences", () => {
    const r = validateRecipeCard(goodCard({ controls: [{ name: "positive-marker", status: "done" }, {}], sources: [{ name: "s" }, {}] }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("status must be one of")));
    assert.ok(r.errors.some((e) => e.includes("controls[1] needs a name")));
    assert.ok(r.errors.some((e) => e.includes("sources[1] needs a name")));
    assert.ok(r.warnings.some((e) => e.includes("no licence recorded")));
    assert.ok(validateRecipeCard(goodCard({ controls: "x" })).errors.some((e) => e.includes("controls must be an array")));
    assert.ok(validateRecipeCard(goodCard({ format: { kind: "vibes" } })).errors.some((e) => e.includes("format.kind")));
  });
});

describe("recipe card hashing and helpers", () => {
  it("hashes canonically: key order and whitespace do not matter, content does", () => {
    const a = goodCard();
    const b = JSON.parse(JSON.stringify(a, Object.keys(a).sort()));
    assert.equal(hashRecipeCard(a), hashRecipeCard(JSON.parse(JSON.stringify(a))));
    assert.equal(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
    assert.notEqual(hashRecipeCard(a), hashRecipeCard(goodCard({ attribute: "something else" })));
    assert.match(hashRecipeCard(b), /^[0-9a-f]{64}$/);
  });

  it("parses text without throwing", () => {
    assert.equal(parseRecipeCard("{nope").ok, false);
    const r = parseRecipeCard(JSON.stringify(goodCard()));
    assert.equal(r.ok, true);
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.equal(parseRecipeCard(JSON.stringify({ schema: RECIPE_SCHEMA })).sha256, null);
  });

  it("summarizes control coverage", () => {
    const s = summarizeControls([{ name: "positive-marker", status: "passed" }, { name: "natural-errors", status: "not-run" }, { name: "custom", status: "passed" }]);
    assert.deepEqual(s.passed, ["positive-marker"]);
    assert.deepEqual(s.not_run, ["natural-errors"]);
    assert.equal(s.missing.length, STANDARD_CONTROLS.length - 2);
    assert.equal(s.coverage, `1/${STANDARD_CONTROLS.length}`);
  });

  it("makes a template with every standard control not-run", () => {
    const t = recipeTemplate("Advocate");
    assert.equal(t.schema, RECIPE_SCHEMA);
    assert.equal(t.id, "advocate-v1");
    assert.equal(t.controls.length, STANDARD_CONTROLS.length);
    assert.ok(t.controls.every((c) => c.status === "not-run"));
    assert.equal(recipeTemplate("X", "custom-id").id, "custom-id");
  });

  it("validates the registry pointer", () => {
    assert.deepEqual(validateRecipePointer({ id: "a", sha256: "f".repeat(64) }, "t"), []);
    assert.equal(validateRecipePointer(null, "t").length, 1);
    const errs = validateRecipePointer({ id: "", sha256: "XYZ", path: "" }, "t");
    assert.equal(errs.length, 3);
  });
});

describe("registry carries recipe_card", () => {
  const version = (over = {}) => ({
    id: "v1", adapter_id: "a", base_model: "Qwen/Qwen3-7B", gate_threshold: 0.7, certified_level: "L1",
    exam_hash: "abc", field_audit_window: 100, created_at: "2026-10-08T00:00:00Z", ...over,
  });
  const reg = (v) => ({ schema: REGISTRY_SCHEMA, specialists: [{ role: "Auditor", backend_url: "http://x", fallback: "claude", workload_quota: 0.5, active_version: "v1", versions: [v] }] });

  it("accepts a valid pointer and versions without one", () => {
    assert.equal(validateRegistry(reg(version())).ok, true);
    assert.equal(validateRegistry(reg(version({ recipe_card: { id: "c", sha256: "a".repeat(64), path: "cards/c.json" } }))).ok, true);
  });

  it("rejects a malformed pointer", () => {
    const r = validateRegistry(reg(version({ recipe_card: { id: "c", sha256: "short" } })));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("recipe_card.sha256")));
  });
});

describe("roleos recipe CLI", () => {
  it("init → check → hash round-trips, and register links the card", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-recipe-"));
    try {
      const cardPath = join(dir, "card.json");
      execFileSync(process.execPath, [CLI, "recipe", "init", "Auditor", "--out", cardPath], { encoding: "utf8" });
      const template = JSON.parse(readFileSync(cardPath, "utf8"));
      assert.equal(template.role, "Auditor");
      const refused = spawnSync(process.execPath, [CLI, "recipe", "init", "Auditor", "--out", cardPath], { encoding: "utf8" });
      assert.notEqual(refused.status, 0);

      const bad = spawnSync(process.execPath, [CLI, "recipe", "check", cardPath, "--json"], { encoding: "utf8" });
      assert.equal(bad.status, 2);
      assert.equal(JSON.parse(bad.stdout).ok, false);

      writeFileSync(cardPath, JSON.stringify(goodCard({ controls: [{ name: "positive-marker", status: "passed" }] }), null, 2));
      const ok = execFileSync(process.execPath, [CLI, "recipe", "check", cardPath], { encoding: "utf8" });
      assert.match(ok, /✓/);
      assert.match(ok, new RegExp(`1/${STANDARD_CONTROLS.length} standard controls passed`));
      const sha = execFileSync(process.execPath, [CLI, "recipe", "hash", cardPath], { encoding: "utf8" }).trim();
      assert.equal(sha, hashRecipeCard(JSON.parse(readFileSync(cardPath, "utf8"))));
      assert.match(execFileSync(process.execPath, [CLI, "recipe", "controls"], { encoding: "utf8" }), /held-out-generator/);

      const versionPath = join(dir, "version.json");
      writeFileSync(versionPath, JSON.stringify({ id: "v1", adapter_id: "a", base_model: "Qwen/Qwen3-7B", gate_threshold: 0.7,
        certified_level: "L1", exam_hash: "abc", field_audit_window: 100, created_at: "2026-10-08T00:00:00Z" }));
      const regPath = join(dir, "specialists.json");
      const out = execFileSync(process.execPath, [CLI, "specialist", "register", "Auditor", versionPath, "--recipe", cardPath,
        "--backend-url", "http://127.0.0.1:9", "--registry", regPath, "--events", join(dir, "events.jsonl")], { encoding: "utf8" });
      assert.match(out, /recipe auditor-planted-v1/);
      assert.match(out, /recipe gap: standard controls not recorded/);
      const saved = JSON.parse(readFileSync(regPath, "utf8"));
      assert.equal(saved.specialists[0].versions[0].recipe_card.sha256, sha);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("register refuses an invalid recipe card", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-recipe-"));
    try {
      const cardPath = join(dir, "card.json");
      writeFileSync(cardPath, JSON.stringify({ schema: RECIPE_SCHEMA }));
      const versionPath = join(dir, "version.json");
      writeFileSync(versionPath, JSON.stringify({ id: "v1" }));
      const r = spawnSync(process.execPath, [CLI, "specialist", "register", "Auditor", versionPath, "--recipe", cardPath,
        "--registry", join(dir, "s.json")], { encoding: "utf8" });
      assert.equal(r.status, 2);
      assert.match(r.stderr, /Recipe card errors/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prints help and rejects unknown subcommands", () => {
    const help = execFileSync(process.execPath, [CLI, "recipe", "help"], { encoding: "utf8" });
    assert.match(help, /roleos recipe check/);
    assert.match(help, /unresolved/);
    assert.match(help, /reversed-correction/);
    assert.match(help, /1\/\(nulls\+1\)/);
    const catalog = execFileSync(process.execPath, [CLI, "help"], { encoding: "utf8" });
    assert.match(catalog, /reversed-correction/);
    assert.notEqual(spawnSync(process.execPath, [CLI, "recipe", "bogus"], { encoding: "utf8" }).status, 0);
  });
});

describe("recipe measure and method rules", () => {
  function one(control) {
    return goodCard({ controls: [control] });
  }

  it("errors on each inconsistent measure and accepts an empty measure as not one of those errors", () => {
    const lowHigh = validateRecipeCard(one({
      name: "positive-marker", status: "passed",
      measure: { point: 0.5, ci: [0.8, 0.2] },
    }));
    assert.equal(lowHigh.ok, false);
    assert.ok(lowHigh.errors.some((e) => e.includes("low 0.8 is above high 0.2")));

    const outside = validateRecipeCard(one({
      name: "positive-marker", status: "passed",
      measure: { point: 0.9, ci: [0.2, 0.4] },
    }));
    assert.equal(outside.ok, false);
    assert.ok(outside.errors.some((e) => e.includes("outside its CI")));

    const pZero = validateRecipeCard(one({
      name: "positive-marker", status: "passed",
      measure: { p: 0, ci: [0.2, 0.4], point: 0.3 },
    }));
    assert.equal(pZero.ok, false);
    assert.ok(pZero.errors.some((e) => e.includes("p must be in (0, 1]")));

    const pAbove = validateRecipeCard(one({
      name: "positive-marker", status: "passed",
      measure: { p: 1.1, ci: [0.2, 0.4], point: 0.3 },
    }));
    assert.ok(pAbove.errors.some((e) => e.includes("p must be in (0, 1]")));

    const pOne = validateRecipeCard(one({
      name: "positive-marker", status: "not-run",
      measure: { p: 1, ci: [0.2, 0.4], point: 0.3 },
    }));
    assert.equal(pOne.errors.some((e) => e.includes("p must be in")), false);

    const nulls = validateRecipeCard(one({
      name: "positive-marker", status: "passed",
      measure: { nulls: 0, ci: [0.2, 0.4], point: 0.3 },
    }));
    assert.equal(nulls.ok, false);
    assert.ok(nulls.errors.some((e) => e.includes("nulls must be an integer ≥ 1")));

    const fraction = validateRecipeCard(one({
      name: "positive-marker", status: "not-run",
      measure: { nulls: 1.5 },
    }));
    assert.ok(fraction.errors.some((e) => e.includes("nulls must be an integer ≥ 1")));

    const notObject = validateRecipeCard(one({
      name: "positive-marker", status: "passed", measure: [],
    }));
    assert.ok(notObject.errors.some((e) => e.includes("measure must be an object")));

    const badCi = validateRecipeCard(one({
      name: "positive-marker", status: "not-run", measure: { ci: [0.2] },
    }));
    assert.ok(badCi.errors.some((e) => e.includes("pair of finite numbers")));

    const empty = validateRecipeCard(one({ name: "graded-marker", status: "not-run", measure: {} }));
    assert.equal(empty.errors.some((e) => /low|outside its CI|p must be in|nulls must be/.test(e)), false);
  });

  it("rejects a methods value that is not an array, and an entry that is not an object", () => {
    const notArray = validateRecipeCard(one({
      name: "positive-marker", status: "not-run",
      measure: { methods: { method: "word-swap" } },
    }));
    assert.equal(notArray.ok, false);
    assert.ok(notArray.errors.some((e) => e.includes("measure.methods must be an array")));

    const badEntries = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: {
        method: "word-swap", paraphrase_median: 3, error_median: 4, ci: [0.4, 0.6], point: 0.5,
        methods: [null, "x", []],
      },
    }));
    assert.equal(badEntries.ok, false);
    for (let i = 0; i < 3; i++) {
      assert.ok(
        badEntries.errors.some((e) => e.includes(`measure.methods[${i}] must be an object`)),
        `missing methods[${i}] error: ${badEntries.errors.join("; ")}`,
      );
    }
  });

  it("rejects a point that is not a finite number", () => {
    for (const point of ["high", Number.NaN, Number.POSITIVE_INFINITY]) {
      const bad = validateRecipeCard(one({
        name: "positive-marker", status: "not-run",
        measure: { point, ci: [0.2, 0.4] },
      }));
      assert.equal(bad.ok, false);
      assert.ok(bad.errors.some((e) => e.includes("point must be a finite number")), `point ${point}`);
    }
  });

  it("accepts balanced-permutation, and gaps a missing or wrong shuffle method", () => {
    const present = validateRecipeCard(one({
      name: "shuffled-labels", status: "passed", measure: satisfyingMeasure("shuffled-labels"),
    }));
    assert.equal(present.ok, true, present.errors.join("; "));
    assert.equal(present.warnings.some((w) => w.includes("balanced-permutation")), false);
    assert.ok(present.notes.some((n) => n.includes("permutation floor is 1/20")));
    assert.equal(present.notes.some((n) => n.includes("beat every null")), false);

    const absent = validateRecipeCard(one({
      name: "shuffled-labels", status: "passed",
      measure: { metric: "accuracy", point: 0.5, ci: [0.4, 0.6], p: 0.2, nulls: 19 },
    }));
    assert.equal(absent.ok, true, absent.errors.join("; "));
    assert.ok(absent.warnings.some((w) => w.includes("Ojala & Garriga 2010")));
    assert.ok(absent.warnings.some((w) => w.includes("shuffle imbalance")));

    const wrong = validateRecipeCard(one({
      name: "shuffled-labels", status: "failed",
      measure: { method: "random-shuffle", p: 0.2, nulls: 19, point: 0.5, ci: [0.4, 0.6] },
    }));
    assert.equal(wrong.ok, true, wrong.errors.join("; "));
    assert.ok(wrong.warnings.some((w) => w.includes("balanced-permutation") && w.includes("plain random shuffle")));
    assert.equal(wrong.controls.failed.includes("shuffled-labels"), true);
  });

  it("prints the 1/21 floor at 20 nulls, and errors when a pass is below it", () => {
    const onFloor = validateRecipeCard(one({
      name: "shuffled-labels", status: "passed",
      measure: { method: "balanced-permutation", p: 1 / 21, nulls: 20, point: 0.5, ci: [0.4, 0.6] },
    }));
    assert.equal(onFloor.ok, true, onFloor.errors.join("; "));
    assert.ok(onFloor.notes.some((n) => n.includes("1/21") && n.includes("beat every null")));

    const below = validateRecipeCard(one({
      name: "shuffled-labels", status: "passed",
      measure: { method: "balanced-permutation", p: 1 / 21 / 2, nulls: 20, point: 0.5, ci: [0.4, 0.6] },
    }));
    assert.equal(below.ok, false);
    assert.ok(below.errors.some((e) => e.includes("1/21")));
    assert.ok(below.notes.some((n) => n.includes("permutation floor is 1/21")));
    assert.equal(below.notes.some((n) => n.includes("beat every null")), false);

    const missingP = validateRecipeCard(one({
      name: "shuffled-labels", status: "passed",
      measure: { method: "balanced-permutation", nulls: 20, point: 0.5, ci: [0.4, 0.6] },
    }));
    assert.ok(missingP.errors.some((e) => e.includes("p and nulls")));

    const dir = mkdtempSync(join(tmpdir(), "roleos-recipe-floor-"));
    try {
      const cardPath = join(dir, "card.json");
      writeFileSync(cardPath, JSON.stringify(one({
        name: "shuffled-labels", status: "passed",
        measure: { method: "balanced-permutation", p: 1 / 21, nulls: 20, point: 0.5, ci: [0.4, 0.6] },
      })));
      const text = execFileSync(process.execPath, [CLI, "recipe", "check", cardPath], { encoding: "utf8" });
      assert.match(text, /note\s+.*1\/21/);
      assert.match(text, /beat every null/);
      const body = JSON.parse(execFileSync(process.execPath, [CLI, "recipe", "check", cardPath, "--json"], { encoding: "utf8" }));
      assert.ok(body.notes.some((n) => n.includes("1/21")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("gaps a paraphrase median that exceeds twice the error median", () => {
    const gap = validateRecipeCard(one({
      name: "same-generator-no-error", status: "passed",
      measure: {
        metric: "edit-rate", point: 0.5, ci: [0.4, 0.6], method: "sentence-rewrite",
        paraphrase_median: 9, error_median: 4,
      },
    }));
    assert.equal(gap.ok, true, gap.errors.join("; "));
    assert.ok(gap.warnings.some((w) => w.includes("exceeds 2×")));

    const exact = validateRecipeCard(one({
      name: "same-generator-no-error", status: "passed",
      measure: {
        metric: "edit-rate", point: 0.5, ci: [0.4, 0.6], method: "word-swap",
        paraphrase_median: 8, error_median: 4,
      },
    }));
    assert.equal(exact.warnings.some((w) => w.includes("exceeds 2×")), false);

    const missing = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: { method: "word-swap", point: 0.5, ci: [0.4, 0.6] },
    }));
    assert.ok(missing.warnings.some((w) => w.includes("paraphrase_median and error_median are required")));

    const offHalf = validateRecipeCard(one({
      name: "same-generator-no-error", status: "passed",
      measure: {
        method: "word-swap", point: 0.8, ci: [0.7, 0.9],
        paraphrase_median: 3, error_median: 4,
      },
    }));
    assert.equal(offHalf.ok, false);
    assert.ok(offHalf.errors.some((e) => e.includes("include 0.5")));
  });

  it("requires unresolved when the two edit-method intervals do not overlap", () => {
    const measure = {
      metric: "edit-rate", point: 0.25, ci: [0.2, 0.3], n: 40, clusters: "prompt",
      method: "word-swap", paraphrase_median: 3, error_median: 4,
      methods: [{ method: "sentence-rewrite", ci: [0.7, 0.8], point: 0.75, paraphrase_median: 4, error_median: 4 }],
    };
    const bad = validateRecipeCard(one({ name: "same-generator-no-error", status: "passed", measure }));
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.includes('status must be "unresolved"')));

    const held = validateRecipeCard(one({ name: "same-generator-no-error", status: "unresolved", measure }));
    assert.equal(held.ok, true, held.errors.join("; "));
    assert.deepEqual(held.controls.unresolved, ["same-generator-no-error"]);
    assert.ok(held.warnings.some((w) => w.includes("control unresolved: same-generator-no-error")));

    const touching = validateRecipeCard(one({
      name: "same-generator-no-error", status: "passed",
      measure: {
        ...measure,
        ci: [0.45, 0.5],
        point: 0.5,
        methods: [{ method: "sentence-rewrite", ci: [0.5, 0.6], point: 0.55, paraphrase_median: 3, error_median: 4 }],
      },
    }));
    assert.equal(touching.ok, true, touching.errors.join("; "));
    assert.equal(touching.errors.some((e) => e.includes("unresolved")), false);

    const secondRatio = validateRecipeCard(one({
      name: "same-generator-no-error", status: "unresolved",
      measure: {
        ...measure,
        methods: [{ method: "sentence-rewrite", ci: [0.7, 0.8], paraphrase_median: 10, error_median: 4 }],
      },
    }));
    assert.ok(secondRatio.warnings.some((w) => w.includes("methods[0]") && w.includes("exceeds 2×")));
  });

  it("gaps a non-finite paraphrase median and a non-finite error median separately", () => {
    const badParaphrase = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: {
        method: "word-swap", ci: [0.4, 0.6], point: 0.5,
        paraphrase_median: "wide", error_median: 4,
        methods: [{ method: "sentence-rewrite", paraphrase_median: 3, error_median: Number.NaN }],
      },
    }));
    assert.equal(badParaphrase.ok, true, badParaphrase.errors.join("; "));
    assert.ok(badParaphrase.warnings.some((w) => w.includes("measure paraphrase_median and error_median must be finite numbers")));
    assert.ok(badParaphrase.warnings.some((w) => w.includes("methods[0] paraphrase_median and error_median must be finite numbers")));
  });

  it("gaps a same-generator method outside word-swap and sentence-rewrite", () => {
    const wrong = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: {
        method: "free-rewrite", paraphrase_median: 3, error_median: 4, ci: [0.4, 0.6], point: 0.5,
      },
    }));
    assert.equal(wrong.ok, true, wrong.errors.join("; "));
    assert.ok(wrong.warnings.some((w) => w.includes('method must be "word-swap" or "sentence-rewrite"')));

    const kept = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: satisfyingMeasure("same-generator-no-error"),
    }));
    assert.equal(kept.warnings.some((w) => w.includes('method must be "word-swap" or "sentence-rewrite"')), false);
  });

  it("gaps when both edit methods are recorded and either CI is missing", () => {
    const missingSwap = validateRecipeCard(one({
      name: "same-generator-no-error", status: "failed",
      measure: {
        method: "word-swap", paraphrase_median: 3, error_median: 4,
        methods: [{ method: "sentence-rewrite", ci: [0.4, 0.6], paraphrase_median: 3, error_median: 4 }],
      },
    }));
    assert.equal(missingSwap.ok, true, missingSwap.errors.join("; "));
    assert.ok(missingSwap.warnings.some((w) => w.includes("a CI is missing") && w.includes("overlap is unmeasured")));

    const missingRewrite = validateRecipeCard(one({
      name: "same-generator-no-error", status: "unresolved",
      measure: {
        method: "word-swap", ci: [0.4, 0.6], paraphrase_median: 3, error_median: 4,
        methods: [{ method: "sentence-rewrite", paraphrase_median: 3, error_median: 4 }],
      },
    }));
    assert.equal(missingRewrite.ok, true, missingRewrite.errors.join("; "));
    assert.ok(missingRewrite.warnings.some((w) => w.includes("a CI is missing") && w.includes("overlap is unmeasured")));
    assert.equal(missingRewrite.controls.unresolved.includes("same-generator-no-error"), true);
  });

  it("puts reversed-correction in the template and the summary, and requires the CI above 0.5", () => {
    const template = recipeTemplate("Skeptic");
    assert.equal(template.controls.length, STANDARD_CONTROLS.length);
    const names = template.controls.map((c) => c.name);
    const at = names.indexOf("reversed-correction");
    assert.equal(names[at - 1], "same-generator-no-error");
    assert.equal(template.controls[at].status, "not-run");
    assert.match(execFileSync(process.execPath, [CLI, "recipe", "controls"], { encoding: "utf8" }), /reversed-correction/);

    const summary = summarizeControls([
      { name: "reversed-correction", status: "passed" },
      { name: "same-generator-no-error", status: "unresolved" },
    ]);
    assert.deepEqual(summary.passed, ["reversed-correction"]);
    assert.deepEqual(summary.unresolved, ["same-generator-no-error"]);
    assert.equal(summary.coverage, `1/${STANDARD_CONTROLS.length}`);

    const touch = validateRecipeCard(one({
      name: "reversed-correction", status: "passed",
      measure: { metric: "accuracy", point: 0.6, ci: [0.5, 0.7] },
    }));
    assert.equal(touch.ok, false);
    assert.ok(touch.errors.some((e) => e.includes("entirely above 0.5") && e.includes("touching 0.5")));

    const above = validateRecipeCard(one({
      name: "reversed-correction", status: "passed",
      measure: satisfyingMeasure("reversed-correction"),
    }));
    assert.equal(above.ok, true, above.errors.join("; "));

    const noCi = validateRecipeCard(one({
      name: "reversed-correction", status: "passed",
      measure: { metric: "accuracy", point: 0.8 },
    }));
    assert.ok(noCi.errors.some((e) => e.includes("entirely above 0.5")));
  });

  it("keeps an old free-text card valid, with gaps and no new errors", () => {
    const old = goodCard({
      controls: [
        { name: "positive-marker", status: "passed", result: "marker learned, accuracy 0.91" },
        { name: "shuffled-labels", status: "not-run", result: "not run yet" },
        { name: "natural-errors", status: "failed", result: "missed the real errors" },
      ],
    });
    const r = validateRecipeCard(old);
    assert.equal(r.ok, true, r.errors.join("; "));
    assert.equal(r.errors.length, 0);
    assert.ok(r.warnings.some((w) => w.includes("passed without a measure")));
    assert.ok(r.warnings.some((w) => w.includes("standard controls not recorded") && w.includes("reversed-correction")));
    assert.equal(r.warnings.some((w) => w.includes("shuffled-labels") && w.includes("balanced-permutation")), false);
    assert.ok(r.warnings.some((w) => w.includes("control failed: natural-errors")));
  });

  it("gaps a passed control once when the measure is absent, including a failed special control", () => {
    const passed = validateRecipeCard(one({ name: "graded-marker", status: "passed", result: "it worked" }));
    assert.equal(passed.ok, true, passed.errors.join("; "));
    const measureGaps = passed.warnings.filter((w) => w.includes("passed without a measure"));
    assert.equal(measureGaps.length, 1);

    const failed = validateRecipeCard(one({ name: "reversed-correction", status: "failed" }));
    assert.equal(failed.ok, true, failed.errors.join("; "));
    assert.ok(failed.warnings.some((w) => w.includes("no measure") && w.includes("above 0.5")));
    assert.equal(failed.warnings.filter((w) => w.includes("reversed-correction") && w.includes("measure")).length, 1);
  });
});
