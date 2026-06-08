/**
 * Live-catalog builder (wedge #1 internal-first rollout) — turn the blind-authored constraints + the
 * blind-authored example calls into the VALIDATED live catalog `.claude/role-os/tool-contracts.json`
 * keyed by REAL tool names. Same sound production rule as build_tool_constraints.mjs (the v0.3 OOD proof):
 *
 *   1. SCHEMA-CHECK the conformant examples: a "conformant" call that fails the schema floor is a
 *      mislabeled example (missing required / wrong type). It is EXCLUDED from the guard set and logged
 *      — it must not poison the guard.
 *   2. GUARD: keep only constraints that flag NONE of the (schema-valid) conformant calls. A constraint
 *      that flags a conformant call is dropped — provably mis-authored OR in conflict with an example.
 *      Both drops are logged with the offending call so a human can tell which (constraint wrong vs
 *      example mislabeled). Dropping is the SAFE direction: worst case is lost coverage, never a false flag.
 *   3. COVERAGE: report which known violation calls the surviving floor (schema + contract) catches.
 *   4. FINAL FP GATE: the assembled catalog must flag ZERO conformant calls (schema + contract). Exit 1 otherwise.
 *
 * Unlike the corpus reference catalog (contract-only, tools with >=1 constraint), the LIVE catalog
 * includes EVERY tool with its params so the deterministic SCHEMA floor (required/type/enum/max) also
 * runs live on real calls — strictly more coverage. Inputs in this dir: tools.json (ground-truth params),
 * raw.json (authored constraints), corpus.json (authored example calls). Run: node build_live_contracts.mjs
 */
import { schemaFloor, contractFloor } from "../../../src/specialist/conformance-consult.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const P = (f) => join(HERE, f);
const J = (f) => JSON.parse(readFileSync(P(f), "utf-8"));

const ground = J("tools.json").tools;
const rawArr = J("raw.json"); // [{tool, constraints, state_struct, notes}]
const exArr = J("corpus.json"); // [{tool, conformant_args[], violation_args:[{args,violates}]}]
const byTool = Object.fromEntries(ground.map((t) => [t.name, t]));
const rawBy = Object.fromEntries(rawArr.map((r) => [r.tool, r]));
const exBy = Object.fromEntries(exArr.map((e) => [e.tool, e]));

const floors = (tool, call, state) => {
  const s = schemaFloor(tool, call).violations;
  const c = contractFloor(tool, call, state).violations;
  return [...s, ...c];
};

// Whitelist the DSL keys so the SHIPPED catalog carries no provenance/scratch keys (e.g. _added).
const DSL_KEYS = new Set(["kind", "op", "left", "right", "of", "vs", "fields", "count", "when", "require", "field", "in", "string", "index", "equals", "offset"]);
const cleanConstraint = (k) => Object.fromEntries(Object.entries(k).filter(([key]) => DSL_KEYS.has(key)));

const catalog = {};
let kept = 0, dropped = 0, badExamples = 0, vTotal = 0, vCaught = 0;
const dropLog = [], badExLog = [], coverageGaps = [];

for (const t of ground) {
  const raw = rawBy[t.name] || { constraints: [], state_struct: null };
  const ex = exBy[t.name] || { conformant_args: [], violation_args: [] };
  const state = raw.state_struct || null;
  const base = { name: t.name, contract: t.contract, params: t.params };

  // (1) keep only conformant examples that PASS the schema floor (truly valid calls)
  const goodCalls = [];
  for (const call of ex.conformant_args || []) {
    const sv = schemaFloor(base, call).violations;
    if (sv.length) { badExamples++; badExLog.push(`${t.name}: conformant example fails schema floor (${sv.join("; ")}) -> ${JSON.stringify(call)}`); }
    else goodCalls.push(call);
  }

  // (2) GUARD: drop any constraint that flags a schema-valid conformant call
  const survivors = (raw.constraints || []).filter((k) => {
    const flagged = goodCalls.find((call) => contractFloor({ ...base, constraints: [k] }, call, state).verdict === "nonconformant");
    if (flagged) { dropped++; dropLog.push(`${t.name}:${k.kind} ${JSON.stringify(k)} flagged conformant ${JSON.stringify(flagged)}`); return false; }
    kept++; return true;
  });

  catalog[t.name] = { contract: t.contract, params: t.params, constraints: survivors.map(cleanConstraint), ...(state ? { state_struct: state } : {}) };

  // (3) COVERAGE on known violation calls (schema + surviving contract)
  const toolFull = { ...base, constraints: survivors };
  for (const v of ex.violation_args || []) {
    vTotal++;
    if (floors(toolFull, v.args, state).length) vCaught++;
    else coverageGaps.push(`${t.name}: NOT caught -> ${v.violates} :: ${JSON.stringify(v.args)}`);
  }
}

// (4) FINAL FP GATE — the written catalog must flag NO conformant call
let fp = 0;
const fpLog = [];
for (const t of ground) {
  const c = catalog[t.name];
  const ex = exBy[t.name] || { conformant_args: [] };
  const tool = { name: t.name, contract: c.contract, params: c.params, constraints: c.constraints };
  for (const call of ex.conformant_args || []) {
    if (schemaFloor(tool, call).violations.length) continue; // mislabeled example, already logged
    const r = contractFloor(tool, call, c.state_struct || null);
    if (r.verdict === "nonconformant") { fp++; fpLog.push(`${t.name}: ${r.violations.join("; ")} on ${JSON.stringify(call)}`); }
  }
}

const outDir = join(HERE, "..", "..", "..", ".claude", "role-os");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "tool-contracts.json"), JSON.stringify(catalog, null, 2) + "\n");

console.log("=== .claude/role-os/tool-contracts.json (live catalog) ===");
console.log(`tools catalogued: ${Object.keys(catalog).length}/${ground.length} (all tools; schema floor runs on every one)`);
const withC = Object.values(catalog).filter((c) => c.constraints.length).length;
console.log(`tools with >=1 surviving contract constraint: ${withC}`);
console.log(`contract constraints: kept=${kept}  dropped(guarded)=${dropped}`);
if (dropLog.length) { console.log("  DROPPED (review: constraint wrong OR example mislabeled):"); dropLog.forEach((d) => console.log("   - " + d)); }
if (badExLog.length) { console.log(`  MISLABELED conformant examples (excluded from guard): ${badExamples}`); badExLog.forEach((d) => console.log("   - " + d)); }
console.log(`known violations caught by the floor (schema+contract): ${vCaught}/${vTotal} (${vTotal ? (100 * vCaught / vTotal).toFixed(0) : 0}%)`);
if (coverageGaps.length) { console.log("  coverage gaps (left to the LLM ceiling / not computable):"); coverageGaps.forEach((g) => console.log("   - " + g)); }
console.log(`FINAL conformant false-positives: ${fp}  (MUST be 0)`);
if (fpLog.length) fpLog.forEach((f) => console.log("   !! FP " + f));
if (fp > 0) { console.error("FP GATE FAILED"); process.exit(1); }
console.log("OK — catalog written, 0 false-positives.");
