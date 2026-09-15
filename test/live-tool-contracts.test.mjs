/**
 * Enforcement test for the LIVE conformance catalog (.claude/role-os/tool-contracts.json) — the wedge-#1
 * seam that `src/hooks.mjs#conformanceAdvisory` reads at runtime, keyed by REAL tool names. Same safety
 * invariant as the rollout test: the deterministic floor (schema L1-L3 + computable contract L4) must
 * NEVER flag a tool's known-good conformant call. A false "nonconformant" on a valid call would emit a
 * wrong advisory on real work, so it is committed and CI-enforced. The known-good + known-violation
 * example calls live in tools/conformance-dataset/live-tools/corpus.json (the blind-authored +
 * adversarially-refuted fixtures). This test guards both halves: 0 false-positives on conformant_args
 * AND true-positives on violation_args (emptying constraints or dropping contractFloor must go RED).
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

  // Documented LLM-ceiling gaps from live-tools/RECEIPT.md (7/78): relative-path is
  // open-set (not computable); invented params are tolerated by schemaFloor for
  // forward-compat; ToolSearch max_results has no schema min/integer bound.
  function isDocumentedCeilingGap(toolName, v) {
    const a = v.args || {};
    if (toolName === "Read" && a.file_path === "README.md") return true;
    if (toolName === "Write" && a.append === true) return true;
    if (toolName === "Glob" && a.recursive === true) return true;
    if (toolName === "Skill" && "timeout" in a) return true;
    if (toolName === "ToolSearch" && typeof a.max_results === "number") return true;
    return false;
  }

  it("TRUE POSITIVE: schemaFloor+contractFloor flag each corpus violation_args (except documented ceiling gaps)", () => {
    const missed = [];
    let executed = 0;
    let caught = 0;
    for (const ex of corpus) {
      const e = catalog[ex.tool];
      assert.ok(e, `corpus tool '${ex.tool}' missing from live catalog`);
      const tool = { name: ex.tool, contract: e.contract, params: e.params || [], constraints: e.constraints || [] };
      const vs = ex.violation_args || [];
      assert.ok(vs.length, `${ex.tool}: corpus must carry violation_args so the floor can go RED`);
      for (const v of vs) {
        executed++;
        const viol = floors(tool, v.args, e.state_struct || null);
        if (viol.length) caught++;
        else if (!isDocumentedCeilingGap(ex.tool, v)) {
          missed.push(`${ex.tool}: ${v.violates} :: ${JSON.stringify(v.args)}`);
        }
      }
    }
    assert.ok(executed > 0, "must actually execute corpus violation_args");
    assert.ok(caught > 0, "live catalog must catch at least one known violation");
    assert.deepEqual(missed, [], `live catalog must flag computable violation_args:\n${missed.join("\n")}`);
  });

  it("TRUE POSITIVE: Read limit:0 is nonconformant under the live catalog", () => {
    const e = catalog.Read;
    assert.ok(e, "Read must be in the live catalog");
    const limit0 = (exBy.Read?.violation_args || []).find((v) => v.args && v.args.limit === 0);
    assert.ok(limit0, "corpus must include Read limit:0");
    const tool = { name: "Read", contract: e.contract, params: e.params || [], constraints: e.constraints || [] };
    const viol = floors(tool, limit0.args, e.state_struct || null);
    assert.ok(viol.length, `Read limit:0 must be flagged (got ${JSON.stringify(viol)})`);
  });

  it("META: stripping Read's limit>0 rule lets limit:0 through (true-positive is load-bearing)", () => {
    const e = catalog.Read;
    const limit0 = (exBy.Read?.violation_args || []).find((v) => v.args && v.args.limit === 0);
    assert.ok(e && limit0, "Read catalog + limit:0 fixture required for META");
    const stripped = (e.constraints || []).filter((c) => !(c.kind === "cmp" && c.left === "limit"));
    const withRule = floors(
      { name: "Read", contract: e.contract, params: e.params || [], constraints: e.constraints || [] },
      limit0.args,
      e.state_struct || null,
    );
    const without = floors(
      { name: "Read", contract: e.contract, params: e.params || [], constraints: stripped },
      limit0.args,
      e.state_struct || null,
    );
    assert.ok(withRule.length, "live catalog must catch Read limit:0 before the mutation");
    assert.equal(without.length, 0, "without the limit>0 rule, limit:0 must slip through — otherwise this META is not proving the constraint");
  });
});
