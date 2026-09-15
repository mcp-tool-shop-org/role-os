/**
 * Enforcement test for the rollout catalog (tools/conformance-dataset/tool-constraints.json): the
 * deterministic floor's per-tool constraints must NEVER flag a tool's known-good conformant call. This
 * is the safety invariant of the whole approach — a false "nonconformant" on a valid call would block
 * real work — so it is committed and CI-enforced: no mis-authored constraint can land. This test also
 * executes each catalogued tool's known l4 violation(s): emptying constraints or dropping contractFloor
 * must go RED on the computable true-positives (semantic leftovers stay the LLM ceiling).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { contractFloor } from "../src/specialist/conformance-consult.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAT = join(HERE, "..", "tools", "conformance-dataset", "tool-constraints.json");
const CORPUS = join(HERE, "..", "tools", "conformance-dataset", "effective_corpus.json");

const KNOWN_KINDS = new Set(["cmp", "sum", "present", "requires", "distinct", "member", "char_at"]);

describe("tool-constraints catalog (rollout)", () => {
  if (!existsSync(CAT) || !existsSync(CORPUS)) {
    it("catalog present", () => { assert.ok(false, "tool-constraints.json / effective_corpus.json missing — run build_tool_constraints.mjs"); });
    return;
  }
  const catalog = JSON.parse(readFileSync(CAT, "utf-8"));
  const corpus = JSON.parse(readFileSync(CORPUS, "utf-8"));
  const byName = Object.fromEntries(corpus.map((t) => [t.name, t]));

  it("is non-empty and every entry maps to a known corpus tool", () => {
    const names = Object.keys(catalog);
    assert.ok(names.length > 0, "catalog should not be empty");
    for (const n of names) assert.ok(byName[n], `catalog tool '${n}' not in effective_corpus.json`);
  });

  it("every constraint uses a known DSL kind", () => {
    for (const [n, entry] of Object.entries(catalog)) {
      for (const c of entry.constraints) assert.ok(KNOWN_KINDS.has(c.kind), `${n}: unknown constraint kind '${c.kind}'`);
    }
  });

  it("SAFETY INVARIANT: no catalog constraint flags its tool's conformant call (0 false-positives)", () => {
    const fp = [];
    for (const [n, entry] of Object.entries(catalog)) {
      const t = byName[n];
      const tool = { name: n, contract: t.contract, params: t.params, constraints: entry.constraints };
      const r = contractFloor(tool, t.conformant_args, entry.state_struct || null);
      if (r.verdict === "nonconformant") fp.push(`${n}: ${r.violations.join("; ")}`);
    }
    assert.deepEqual(fp, [], `catalog constraints must not flag conformant calls:\n${fp.join("\n")}`);
  });

  const l4Of = (t) => t.l4_violations || (t.l4_violation ? [t.l4_violation] : []);

  // Computable l4 fixtures the floor currently owns. Emptying the catalog or
  // deleting contractFloor drops these and must turn this file RED. Semantic
  // leftovers (cron prose, relative-path, SQL dialect) stay the LLM ceiling.
  const MUST_CATCH = ["set_config", "crop_image", "distribute_budget", "configure_autoscaler", "split_traffic"];

  it("TRUE POSITIVE: catalog constraints flag known computable l4 violations", () => {
    const caughtTools = new Set();
    let executed = 0;
    let caught = 0;
    for (const [n, entry] of Object.entries(catalog)) {
      const t = byName[n];
      if (!t) continue;
      const tool = { name: n, contract: t.contract, params: t.params, constraints: entry.constraints };
      for (const v of l4Of(t)) {
        executed++;
        const r = contractFloor(tool, v.args, entry.state_struct || null);
        if (r.verdict === "nonconformant") {
          caught++;
          caughtTools.add(n);
        }
      }
    }
    assert.ok(executed > 0, "must actually execute catalogued l4_violation args");
    assert.ok(caught > 0, "rollout catalog must catch at least one l4 violation");
    const missedMust = MUST_CATCH.filter((n) => !caughtTools.has(n));
    assert.deepEqual(missedMust, [], `computable l4 must stay flagged: ${missedMust.join(", ")}`);
  });

  it("META: emptying catalog constraints drops true-positives (set_config global-without-admin)", () => {
    const t = byName.set_config;
    const entry = catalog.set_config;
    const v = l4Of(t)[0];
    assert.ok(t && entry && v, "set_config catalog + l4 fixture required for META");
    const withRule = contractFloor(
      { name: "set_config", contract: t.contract, params: t.params, constraints: entry.constraints },
      v.args,
      entry.state_struct || null,
    );
    const without = contractFloor(
      { name: "set_config", contract: t.contract, params: t.params, constraints: [] },
      v.args,
      entry.state_struct || null,
    );
    assert.equal(withRule.verdict, "nonconformant", "set_config global-without-admin must be flagged before the mutation");
    assert.notEqual(without.verdict, "nonconformant", "without constraints, the l4 fixture must slip through — otherwise this META is not proving the catalog");
  });
});
