/**
 * Enforcement test for the rollout catalog (tools/conformance-dataset/tool-constraints.json): the
 * deterministic floor's per-tool constraints must NEVER flag a tool's known-good conformant call. This
 * is the safety invariant of the whole approach — a false "nonconformant" on a valid call would block
 * real work — so it is committed and CI-enforced: no mis-authored constraint can land. (Coverage of the
 * known violations is reported by build_tool_constraints.mjs; this test guards correctness/safety.)
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
});
