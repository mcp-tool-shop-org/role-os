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
    controls: STANDARD_CONTROLS.map((c) => ({ name: c.name, status: "passed" })),
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
      assert.match(ok, /1\/8 standard controls passed/);
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
    assert.match(execFileSync(process.execPath, [CLI, "recipe", "help"], { encoding: "utf8" }), /roleos recipe check/);
    assert.notEqual(spawnSync(process.execPath, [CLI, "recipe", "bogus"], { encoding: "utf8" }).status, 0);
  });
});
