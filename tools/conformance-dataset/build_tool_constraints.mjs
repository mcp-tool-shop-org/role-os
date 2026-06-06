/**
 * Rollout builder — turn the blind-authored constraints into the VALIDATED tool-constraints.json catalog
 * (the deterministic floor's per-tool knowledge base). For each of the 90 corpus tools:
 *   1. GUARD: keep only constraints that pass the tool's known-good conformant_args (drop any that flag
 *      it — provably mis-authored). This is the same sound production rule the v0.3 OOD proof used.
 *   2. COVERAGE: report whether the surviving constraints catch the tool's known l4 violation(s) — i.e.
 *      how much of the trained semantic-contract rung the deterministic floor now owns outright.
 * Writes tool-constraints.json (name -> {constraints, state_struct?}). The leftover (semantic) contracts
 * stay the LLM ceiling's job. Inputs: effective_corpus.json (full, with gold) + tool_constraints_raw.json
 * (the workflow's blind output). Run: node build_tool_constraints.mjs
 */
import { contractFloor } from "../../src/specialist/conformance-consult.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const P = (f) => join(HERE, f);
const corpus = JSON.parse(readFileSync(P("effective_corpus.json"), "utf-8"));
const raw = JSON.parse(readFileSync(P("tool_constraints_raw.json"), "utf-8"));
const l4Of = (t) => t.l4_violations || (t.l4_violation ? [t.l4_violation] : []);

const catalog = {};
let kept = 0, dropped = 0, toolsWith = 0, l4Total = 0, l4Caught = 0;
const droppedDetail = [], semanticOnly = [];

for (const t of corpus) {
  const a = raw[t.name] || { constraints: [], state_struct: null };
  const state = a.state_struct || null;
  const base = { name: t.name, contract: t.contract, params: t.params };
  const valid = (a.constraints || []).filter((k) => {
    const flags = contractFloor({ ...base, constraints: [k] }, t.conformant_args, state).verdict === "nonconformant";
    if (flags) { dropped++; droppedDetail.push(`${t.name}:${k.kind}`); } else kept++;
    return !flags;
  });
  if (valid.length) { catalog[t.name] = { constraints: valid, ...(state ? { state_struct: state } : {}) }; toolsWith++; }
  let toolCaught = true;
  for (const v of l4Of(t)) {
    l4Total++;
    if (contractFloor({ ...base, constraints: valid }, v.args, state).verdict === "nonconformant") l4Caught++;
    else toolCaught = false;
  }
  if (l4Of(t).length && !toolCaught) semanticOnly.push(t.name);
}

// Final guard: the written catalog must NOT flag any conformant call.
let fp = 0;
for (const t of corpus) {
  const c = catalog[t.name];
  if (!c) continue;
  const r = contractFloor({ name: t.name, contract: t.contract, params: t.params, constraints: c.constraints }, t.conformant_args, c.state_struct || null);
  if (r.verdict === "nonconformant") { fp++; console.log(`  !! FP ${t.name}: ${r.violations.join("; ")}`); }
}

writeFileSync(P("tool-constraints.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log("=== tool-constraints.json (rollout seed catalog) ===");
console.log(`tools with >=1 valid constraint: ${toolsWith}/${corpus.length}`);
console.log(`constraints: kept=${kept}  dropped(mis-authored, auto-guarded)=${dropped}`);
if (droppedDetail.length) console.log(`  dropped: ${droppedDetail.join(", ")}`);
console.log(`known l4 violations now caught DETERMINISTICALLY by the floor: ${l4Caught}/${l4Total} (${(100 * l4Caught / l4Total).toFixed(0)}%)`);
console.log(`  remaining ${l4Total - l4Caught} are genuinely-semantic -> stay the LLM ceiling's job (${semanticOnly.length} tools)`);
console.log(`final-catalog conformant false-positives: ${fp}  (must be 0)`);
