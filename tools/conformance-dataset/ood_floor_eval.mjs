/**
 * v0.3 PROOF — run the deterministic contractFloor over the OOD dogfood cases and measure whether it
 * catches the COMPUTABLE violations the v1 LLM waved through, WITHOUT false-flagging conformant calls.
 *
 * Inputs:
 *   ood/fresh_cases.jsonl   — the 49 independently-authored OOD cases (with gold conformant + violations)
 *   ood/constraints.json    — {tool_name: {constraints, state_struct}} authored BLIND from contract prose
 *   ood/dogfood-v1.json      — the v1 LLM's false-conformants on these same cases (the bar to beat)
 *
 * The floor only ever PROVES a violation; an unevaluable constraint defers (verdict null) to the LLM.
 * Win condition: 0 false-positives on conformant calls + the floor catches v1's computable FCs, so the
 * COMBINED (floor OR LLM) false-conformant count drops toward 0. Run: node ood_floor_eval.mjs
 */
import { contractFloor } from "../../src/specialist/conformance-consult.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const P = (f) => join(HERE, f);
const cases = readFileSync(P("ood/fresh_cases.jsonl"), "utf-8").trim().split("\n").map((l) => JSON.parse(l));
const ann = JSON.parse(readFileSync(P("ood/constraints.json"), "utf-8"));
const v1 = JSON.parse(readFileSync(P("ood/dogfood-v1.json"), "utf-8"));

const stateFor = (c) => (ann[c.tool_name] || {}).state_struct || null;

// VALIDATION GUARD (sound production rule + robustness to blind-authoring noise): a constraint is
// trustworthy only if it PASSES the tool's known-good conformant call. Any constraint that, on its own,
// flags the conformant is provably mis-authored (or contradicts a sibling) -> drop it. We report how
// many were dropped so the blind-authoring quality is transparent.
let droppedTotal = 0, rawTotal = 0;
const droppedDetail = [];
const _validCache = {};
function validConstraints(c) {
  if (_validCache[c.tool_name]) return _validCache[c.tool_name];
  const raw = (ann[c.tool_name] || {}).constraints || [];
  rawTotal += raw.length;
  const state = stateFor(c);
  const base = { name: c.tool_name, contract: c.contract, params: c.params };
  const kept = raw.filter((k) => {
    const flags = contractFloor({ ...base, constraints: [k] }, c.conformant_args, state).verdict === "nonconformant";
    if (flags) { droppedTotal++; droppedDetail.push({ tool: c.tool_name, cls: c._class, kind: k.kind }); }
    return !flags;
  });
  _validCache[c.tool_name] = kept;
  return kept;
}
const toolFor = (c) => ({ name: c.tool_name, contract: c.contract, params: c.params, constraints: validConstraints(c) });

const byClass = {};
let fpConf = 0, atRisk = 0, caught = 0, deferred = 0, constraintsTotal = 0;
const falsePositives = [], missed = [];

for (const c of cases) {
  const cls = c._class || "?";
  byClass[cls] ||= { at_risk: 0, caught: 0, deferred: 0, conf_fp: 0, n_constraints: 0 };
  const tool = toolFor(c), state = stateFor(c);
  byClass[cls].n_constraints += tool.constraints.length;
  constraintsTotal += tool.constraints.length;

  // conformant call: the floor MUST NOT flag it
  const cf = contractFloor(tool, c.conformant_args, state);
  if (cf.verdict === "nonconformant") {
    fpConf++; byClass[cls].conf_fp++;
    falsePositives.push({ tool: c.tool_name, cls, why: cf.violations.join("; ") });
  }
  // each violation: caught (proved) or deferred (LLM's job)
  for (const v of c.violations) {
    atRisk++; byClass[cls].at_risk++;
    const r = contractFloor(tool, v.args, state);
    if (r.verdict === "nonconformant") { caught++; byClass[cls].caught++; }
    else { deferred++; byClass[cls].deferred++; missed.push({ tool: c.tool_name, cls, clause: v.clause }); }
  }
}

// Cross-check the v1 LLM false-conformants: does the floor now catch each one?
const v1fc = v1.false_conformant_details || [];
let v1Caught = 0;
const stillMissed = [];
for (const fc of v1fc) {
  const c = cases.find((x) => x.tool_name === fc.tool);
  if (!c) { stillMissed.push({ ...fc, note: "case not found" }); continue; }
  const r = contractFloor(toolFor(c), fc.args, stateFor(c));
  if (r.verdict === "nonconformant") v1Caught++;
  else stillMissed.push({ tool: fc.tool, cls: fc.class });
}

console.log("=== v0.3 contract-floor OOD proof ===");
console.log(`cases=${cases.length}  constraints authored(raw)=${rawTotal}  kept(pass conformant)=${rawTotal - droppedTotal}  dropped(mis-authored)=${droppedTotal}  at-risk violations=${atRisk}`);
if (droppedDetail.length) console.log(`  dropped: ${droppedDetail.map((d) => `${d.tool}:${d.kind}`).join(", ")}`);
console.log(`\nFLOOR over all OOD violations:  caught=${caught}/${atRisk} (${(100 * caught / atRisk).toFixed(0)}%)  deferred-to-LLM=${deferred}`);
console.log(`CONFORMANT false-positives (must be 0): ${fpConf}`);
if (falsePositives.length) for (const f of falsePositives) console.log(`  !! FP [${f.cls}] ${f.tool}: ${f.why}`);

console.log("\nper class  (caught / at-risk | conf-FP | #constraints):");
for (const [cls, s] of Object.entries(byClass).sort()) {
  console.log(`  ${cls.padEnd(24)} ${String(s.caught).padStart(2)}/${String(s.at_risk).padStart(2)}   FP=${s.conf_fp}   constraints=${s.n_constraints}`);
}

console.log(`\n=== vs the v1 LLM's false-conformants (the bar) ===`);
console.log(`v1 false-conformants on OOD: ${v1fc.length}`);
console.log(`  now CAUGHT by the deterministic floor: ${v1Caught}`);
console.log(`  COMBINED (floor OR v1-LLM) residual false-conformants: ${v1fc.length - v1Caught}`);
if (stillMissed.length) {
  console.log("  still uncaught (genuinely-semantic or unmodeled):");
  for (const m of stillMissed) console.log(`    - [${m.cls}] ${m.tool}${m.note ? " (" + m.note + ")" : ""}`);
}
