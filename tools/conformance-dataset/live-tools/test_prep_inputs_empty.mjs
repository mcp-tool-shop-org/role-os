/**
 * Reverted-red: empty authored/examples used to writeFileSync [] over git-tracked
 * raw.json / corpus.json and skip the downstream coverage-collapse gate.
 *
 * Run: node test_prep_inputs_empty.mjs   (from tools/conformance-dataset/live-tools/)
 * Exit 0 = refuse-to-write holds; non-zero = empty overwrite is unblocked.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const script = join(HERE, "prep_inputs.mjs");
const rawPath = join(HERE, "raw.json");
const corpusPath = join(HERE, "corpus.json");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "  PASS " : "  FAIL ") + name);
  if (!cond) fails += 1;
};

const beforeRaw = sha(rawPath);
const beforeCorpus = sha(corpusPath);
const td = mkdtempSync(join(tmpdir(), "prep-empty-"));

const run = (payload, label) => {
  const p = join(td, `${label}.json`);
  writeFileSync(p, JSON.stringify(payload));
  return spawnSync(process.execPath, [script, p], { encoding: "utf-8" });
};

const empty = run({ authored: [], examples: [] }, "empty");
check("empty arrays exit non-zero", empty.status !== 0);
check("empty arrays mention EMPTY GROUND", /EMPTY GROUND/.test(`${empty.stderr || ""}${empty.stdout || ""}`));
check("raw.json unchanged", sha(rawPath) === beforeRaw);
check("corpus.json unchanged", sha(corpusPath) === beforeCorpus);

const bad = run({ authored: {}, examples: [] }, "shape");
check("bad payload shape exit non-zero", bad.status !== 0);

const uncovered = run({
  authored: [{ tool: "Read", constraints: [] }],
  examples: [{ tool: "Read", conformant_args: [], violation_args: [] }],
}, "uncovered");
check("uncovered tools.json row exit non-zero", uncovered.status !== 0);
check("uncovered does not write", sha(rawPath) === beforeRaw && sha(corpusPath) === beforeCorpus);

if (fails) {
  console.error(`FAILED (${fails})`);
  process.exit(1);
}
console.log("ALL PASS");
