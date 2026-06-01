import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractCitations, gateCitations, runCitationGate } from "../src/verify-citations.mjs";

// ── Fixtures ───────────────────────────────────────────────────────────────────────────────────

const SAMPLE = `## Research grounding

1. **Autoregressive LLMs cannot self-verify and need a sound external verifier.** Kambhampati et al. 2024 (arXiv:2402.01817). Implication: role-os defers to prism.
2. **Self-correction without external feedback degrades reasoning.** Huang et al. 2023 (arXiv:2310.01798). Implication: no self-check.
3. **Hash-chaining gives a tamper-evident order.** Haber & Stornetta 1991 (DOI:10.1007/BF00196791). Implication: chain receipts.
4. This is just a prose sentence with no citation in it.
5. **A claim with a non-resolvable source.** Some Author 2020 (RFC 9110). Implication: surfaced for manual review.
`;

function prismResponse(over = {}) {
  return {
    verdict: "accept",
    confidence: 1.0,
    retryable: false,
    lens_results: [],
    pairwise_rho: {},
    citation_results: [
      {
        citation_id: "c1",
        identifier: "arXiv:2402.01817",
        existence: "resolved",
        finding_match: "supported",
        verdict: "accept",
        action: "OK",
        detail: "source supports the claim",
        supporting_span: "the abstract",
      },
    ],
    receipt: {
      id: "prism-abc",
      signature: "deadbeef",
      retrieval_pins: [
        {
          id: "c1",
          identifier: "arXiv:2402.01817",
          query: "http://export.arxiv.org/api/query?id_list=2402.01817",
          source_sha256: "cafef00d",
          existence: "resolved",
        },
      ],
    },
    ...over,
  };
}

/** Build an injectable exec that returns a fixed prism response. */
function execReturning(response, status = 0) {
  return () => ({ status, stdout: JSON.stringify(response), stderr: "" });
}

// ── extractCitations ─────────────────────────────────────────────────────────────────────────

describe("extractCitations", () => {
  it("extracts arXiv and DOI citations and copies the bold finding as the claim", () => {
    const { citations } = extractCitations(SAMPLE);
    const ids = citations.map((c) => c.identifier);
    assert.ok(ids.includes("arXiv:2402.01817"));
    assert.ok(ids.includes("arXiv:2310.01798"));
    assert.ok(ids.includes("10.1007/BF00196791"));
    const first = citations.find((c) => c.identifier === "arXiv:2402.01817");
    assert.match(first.claim, /cannot self-verify/);
    assert.match(first.authors, /Kambhampati/);
    assert.equal(first.year, "2024");
  });

  it("surfaces citation-like items with no resolvable id in `unparsed`, not silently dropped", () => {
    const { citations, unparsed } = extractCitations(SAMPLE);
    assert.equal(citations.length, 3); // arXiv x2 + DOI x1 (RFC is not resolvable by prism)
    assert.equal(unparsed.length, 1); // the RFC item
    assert.match(unparsed[0], /RFC 9110/);
  });

  it("ignores plain prose with no citation", () => {
    const { citations, unparsed } = extractCitations("Just some prose. Nothing to cite here.");
    assert.equal(citations.length, 0);
    assert.equal(unparsed.length, 0);
  });

  it("never invents an identifier (copy-only)", () => {
    const { citations } = extractCitations("**A finding with no id.** Smith 2021.");
    assert.equal(citations.length, 0); // no arXiv/DOI present -> not fabricated into one
  });
});

// ── gateCitations (three tiers) ────────────────────────────────────────────────────────────────

describe("gateCitations", () => {
  it("all-resolved+supported -> pass, not blocking", () => {
    const g = gateCitations(prismResponse());
    assert.equal(g.pass, true);
    assert.equal(g.blocking, false);
    assert.equal(g.advisory, false);
    assert.equal(g.verdict, "accept");
  });

  it("a fabricated existence is BLOCKING (Tier 1 hard halt)", () => {
    const g = gateCitations(
      prismResponse({
        verdict: "refuse",
        citation_results: [
          { citation_id: "c1", identifier: "arXiv:2401.99999", existence: "fabricated", verdict: "refuse", action: "DROP", detail: "arXiv has no record" },
        ],
      }),
    );
    assert.equal(g.blocking, true);
    assert.equal(g.pass, false);
  });

  it("a contradicted finding (paper exists) is advisory revise, NOT blocking", () => {
    const g = gateCitations(
      prismResponse({
        verdict: "revise",
        citation_results: [
          { citation_id: "c1", identifier: "arXiv:2402.01817", existence: "resolved", finding_match: "contradicted", verdict: "revise", action: "FIX TO MATCH SOURCE", detail: "numeric mismatch" },
        ],
      }),
    );
    assert.equal(g.blocking, false);
    assert.equal(g.advisory, true);
    assert.equal(g.pass, false);
  });

  it("a prism error maps to escalate/advisory (never a silent pass)", () => {
    const g = gateCitations({ error: { reason: "INVALID_ARTIFACT", detail: "bad json" } });
    assert.equal(g.verdict, "escalate");
    assert.equal(g.pass, false);
    assert.equal(g.advisory, true);
    assert.equal(g.reason, "INVALID_ARTIFACT");
  });
});

// ── runCitationGate (injected exec — no real prism) ──────────────────────────────────────────────

describe("runCitationGate", () => {
  it("accepts and emits a receipt chained to prism's HMAC receipt", () => {
    const r = runCitationGate(SAMPLE, { exec: execReturning(prismResponse()) });
    assert.equal(r.pass, true);
    assert.equal(r.verdict, "accept");
    assert.equal(r.receipt.prism_receipt.id, "prism-abc");
    assert.equal(r.receipt.prism_receipt.signature, "deadbeef");
    assert.match(r.receipt.chain_sha256, /^[0-9a-f]{64}$/);
    assert.equal(r.receipt.retrieval_pins[0].source_sha256, "cafef00d");
  });

  it("blocks on a fabricated citation", () => {
    const r = runCitationGate(SAMPLE, {
      exec: execReturning(
        prismResponse({
          verdict: "refuse",
          citation_results: [{ citation_id: "c1", identifier: "arXiv:2401.99999", existence: "fabricated", verdict: "refuse", action: "DROP", detail: "no record" }],
        }),
      ),
    });
    assert.equal(r.blocking, true);
    assert.equal(r.pass, false);
  });

  it("escalates (never accepts) when the verifier binary is missing — an unreachable gate is closed", () => {
    const enoent = () => {
      const e = new Error("spawn prism ENOENT");
      e.code = "ENOENT";
      throw e;
    };
    const r = runCitationGate(SAMPLE, { exec: enoent });
    assert.equal(r.pass, false);
    assert.equal(r.verdict, "escalate");
    assert.equal(r.reason, "verifier_unreachable");
  });

  it("escalates when prism produces no parseable JSON", () => {
    const r = runCitationGate(SAMPLE, { exec: () => ({ status: 0, stdout: "not json", stderr: "boom" }) });
    assert.equal(r.verdict, "escalate");
    assert.equal(r.reason, "verifier_unreachable");
  });

  it("escalates when no resolvable citations are found (does not call the verifier)", () => {
    let called = false;
    const r = runCitationGate("Just prose, nothing to cite.", {
      exec: () => {
        called = true;
        return { status: 0, stdout: "{}", stderr: "" };
      },
    });
    assert.equal(called, false);
    assert.equal(r.reason, "no_citations");
    assert.equal(r.pass, false);
  });

  it("parses prism JSON even when prism exits non-zero (refuse path)", () => {
    const r = runCitationGate(SAMPLE, {
      exec: execReturning(
        prismResponse({
          verdict: "refuse",
          citation_results: [{ citation_id: "c1", identifier: "arXiv:2401.99999", existence: "fabricated", verdict: "refuse", action: "DROP", detail: "no record" }],
        }),
        20,
      ),
    });
    assert.equal(r.verdict, "refuse");
    assert.equal(r.blocking, true);
  });
});
