/**
 * Stage A regression — contract C5: distinct-identifier citation counting.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   countIdentifiers counts DISTINCT normalized identifiers (capture group, lowercase,
 *   strip arXiv vN suffix, strip trailing punctuation) — the house citation format
 *   "arXiv:2402.01817 ... https://arxiv.org/abs/2402.01817" is ONE source and must NOT
 *   trigger the multi-source flag; two genuinely different identifiers still flag.
 *
 * Provenance: SPECIALIST-002, verified live in verify-stage-a.json (the spurious
 * "(item cites multiple sources)" unparsed entry downgraded clean prism accepts to
 * escalate, CLI exit 30 instead of 0, on protocol-conformant single-source items).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractCitations } from "../src/verify-citations.mjs";

const MULTI_SOURCE = /multiple sources/i;

function multiSourceFlags(result) {
  return result.unparsed.filter(u => MULTI_SOURCE.test(u));
}

describe("C5 — same-paper ID + URL counts as one source", () => {
  it("arXiv ID + arxiv.org URL of the SAME paper does not flag multi-source", () => {
    const md = "- Kambhampati et al. 2024 — arXiv:2402.01817. https://arxiv.org/abs/2402.01817 — LLMs cannot self-verify.";
    const r = extractCitations(md);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].identifier, "arXiv:2402.01817");
    assert.equal(multiSourceFlags(r).length, 0,
      "the house format (ID + URL of the same paper) must not be flagged as multiple sources");
  });

  it("arXiv version suffix is normalized away (vN variant of the same paper)", () => {
    const md = "- Huang et al. 2023 — arXiv:2310.01798v2. https://arxiv.org/abs/2310.01798 — self-correction fails.";
    const r = extractCitations(md);
    assert.equal(r.citations.length, 1);
    assert.equal(multiSourceFlags(r).length, 0,
      "arXiv:<id>vN and arXiv:<id> are the same paper after normalization");
  });

  it("DOI + doi.org URL of the SAME paper does not flag multi-source", () => {
    const md = "- Buçinca et al. 2021 — doi:10.1145/3290605.3300233. https://doi.org/10.1145/3290605.3300233 — cognitive forcing.";
    const r = extractCitations(md);
    assert.equal(r.citations.length, 1);
    assert.equal(multiSourceFlags(r).length, 0,
      "DOI twin (identifier + resolver URL) is one source");
  });

  it("trailing punctuation never splits an identifier into a second source", () => {
    const md = "- Verma & Nalisnick 2022 — arXiv:2202.03673, https://arxiv.org/abs/2202.03673.";
    const r = extractCitations(md);
    assert.equal(r.citations.length, 1);
    assert.equal(multiSourceFlags(r).length, 0);
  });
});

describe("C5 — genuinely different identifiers still flag", () => {
  it("two different arXiv IDs in one item flag multi-source", () => {
    const md = "- Combined claim — arXiv:2402.01817 and arXiv:2310.01798 both show verification gaps.";
    const r = extractCitations(md);
    assert.equal(r.citations.length, 1, "only the first identifier is verified");
    assert.equal(multiSourceFlags(r).length, 1,
      "two distinct papers in one item must surface the multi-source miss");
  });

  it("an arXiv ID plus a DIFFERENT paper's DOI flags multi-source", () => {
    const md = "- Mixed claim — arXiv:2402.01817 per doi:10.1145/3290605.3300233 framing.";
    const r = extractCitations(md);
    assert.equal(multiSourceFlags(r).length, 1,
      "distinct identifiers across schemes are distinct sources");
  });
});
