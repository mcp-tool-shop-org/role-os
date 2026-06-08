/**
 * Enforcement test for the LIVE conformance catalog (.claude/role-os/tool-contracts.json) — the wedge-#1
 * seam that `src/hooks.mjs#conformanceAdvisory` reads at runtime, keyed by REAL tool names. Same safety
 * invariant as the rollout test: the deterministic floor (schema L1-L3 + computable contract L4) must
 * NEVER flag a tool's known-good conformant call. A false "nonconformant" on a valid call would emit a
 * wrong advisory on real work, so it is committed and CI-enforced. The known-good + known-violation
 * example calls live in tools/conformance-dataset/live-tools/corpus.json (the blind-authored +
 * adversarially-refuted fixtures). Coverage of the known violations is reported by build_live_contracts.mjs;
 * this test guards correctness/safety (0 false-positives) and catches catalog drift.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { schemaFloor, contractFloor } from "../src/specialist/conformance-consult.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAT = join(HERE, "..", ".claude", "role-os", "tool-contracts.json");
const CORPUS = join(HERE, "..", "tools", "conformance-dataset", "live-tools", "corpus.json");

const KNOWN_KINDS = new Set(["cmp", "sum", "present", "requires", "distinct", "member", "char_at"]);

describe("live tool-contracts catalog (.claude/role-os/tool-contracts.json)", () => {
  if (!existsSync(CAT) || !existsSync(CORPUS)) {
    it("catalog + corpus present", () => {
      assert.ok(false, "tool-contracts.json / live-tools/corpus.json missing — run live-tools/build_live_contracts.mjs");
    });
    return;
  }
  const catalog = JSON.parse(readFileSync(CAT, "utf-8"));
  const corpus = JSON.parse(readFileSync(CORPUS, "utf-8"));
  const exBy = Object.fromEntries(corpus.map((e) => [e.tool, e]));

  const floors = (tool, call, state) => [
    ...schemaFloor(tool, call).violations,
    ...contractFloor(tool, call, state).violations,
  ];

  it("is non-empty and every entry has params", () => {
    const names = Object.keys(catalog);
    assert.ok(names.length > 0, "live catalog should not be empty");
    for (const [n, e] of Object.entries(catalog)) assert.ok(Array.isArray(e.params), `${n}: missing params[]`);
  });

  it("every constraint uses a known DSL kind", () => {
    for (const [n, e] of Object.entries(catalog)) {
      for (const c of e.constraints || []) assert.ok(KNOWN_KINDS.has(c.kind), `${n}: unknown constraint kind '${c.kind}'`);
    }
  });

  it("SAFETY INVARIANT: no catalog entry flags any of its conformant calls (0 false-positives)", () => {
    const fp = [];
    for (const [n, e] of Object.entries(catalog)) {
      const tool = { name: n, contract: e.contract, params: e.params || [], constraints: e.constraints || [] };
      const ex = exBy[n];
      if (!ex) continue;
      for (const call of ex.conformant_args || []) {
        const v = floors(tool, call, e.state_struct || null);
        if (v.length) fp.push(`${n}: ${v.join("; ")} on ${JSON.stringify(call)}`);
      }
    }
    assert.deepEqual(fp, [], `live catalog must not flag conformant calls:\n${fp.join("\n")}`);
  });

  it("every tool with >=1 constraint has conformant fixtures guarding it", () => {
    const missing = [];
    for (const [n, e] of Object.entries(catalog)) {
      if ((e.constraints || []).length && !(exBy[n] && (exBy[n].conformant_args || []).length)) missing.push(n);
    }
    assert.deepEqual(missing, [], `constrained tools without conformant fixtures: ${missing.join(", ")}`);
  });
});
