import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEvidence, runOffloadPanel, applyLocalPanel } from "../src/citation-panel.mjs";
import { runCitationGate } from "../src/verify-citations.mjs";
import { exitCodeFor } from "../src/verify-citations-cmd.mjs";

// ── Fixtures ───────────────────────────────────────────────────────────────────────────────────

const ONE = "1. **Autoregressive LLMs cannot self-verify.** Kambhampati et al. 2024 (arXiv:2402.01817).";

/** A prism response with one resolved+supported citation that carries title + span (evidence). */
function prismSupported(over = {}) {
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
        source_title: "LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks",
        supporting_span: "We argue LLMs cannot self-verify their own outputs and need an external sound verifier.",
      },
    ],
    receipt: { id: "prism-abc", signature: "deadbeef", retrieval_pins: [] },
    ...over,
  };
}

const prismExec = (response, status = 0) => () => ({ status, stdout: JSON.stringify(response), stderr: "" });

/** An injectable offload exec that returns a fixed panel verdict + the three real seat models. */
function offloadExecReturning(verdict, seatVerdicts) {
  const seats = (seatVerdicts || ["qwen3-4b", "qwen3-14b", "mistral-nemo-12b"].map((m) => [m, verdict])).map(
    ([model, v]) => ({ model, verdict: v, confidence: 0.9, rationale: "x" }),
  );
  return () => ({ status: 0, stdout: JSON.stringify({ verdict, mode: "panel", seats }), stderr: "" });
}

// ── buildEvidence ────────────────────────────────────────────────────────────────────────────

describe("buildEvidence", () => {
  it("joins title + span", () => {
    assert.equal(buildEvidence({ source_title: "T", span: "S" }), "Title: T\n\nS");
  });
  it("title only / span only", () => {
    assert.equal(buildEvidence({ source_title: "T", span: "" }), "Title: T");
    assert.equal(buildEvidence({ source_title: null, span: "S" }), "S");
  });
  it("nothing -> empty (cannot judge)", () => {
    assert.equal(buildEvidence({ source_title: "", span: null }), "");
    assert.equal(buildEvidence({}), "");
  });
});

// ── runOffloadPanel ──────────────────────────────────────────────────────────────────────────

const SUP = [{ id: "c1", identifier: "arXiv:2402.01817", claim: "X", evidence: "Title: T\n\nS" }];

describe("runOffloadPanel", () => {
  it("panel agrees (supported) -> no disagreement, reachable, records seat models", () => {
    const p = runOffloadPanel(SUP, { exec: offloadExecReturning("supported") });
    assert.equal(p.reachable, true);
    assert.equal(p.disagreements.length, 0);
    assert.deepEqual(p.seats, ["qwen3-4b", "qwen3-14b", "mistral-nemo-12b"]);
    assert.equal(p.perCitation[0].panel_verdict, "supported");
  });

  it("panel says refuted -> disagreement recorded", () => {
    const p = runOffloadPanel(SUP, { exec: offloadExecReturning("refuted") });
    assert.equal(p.disagreements.length, 1);
    assert.equal(p.disagreements[0].panel, "refuted");
    assert.equal(p.disagreements[0].prism, "supported");
  });

  it("panel says insufficient -> disagreement (the dominant real failure: real paper, claim unsupported)", () => {
    const p = runOffloadPanel(SUP, { exec: offloadExecReturning("insufficient") });
    assert.equal(p.disagreements.length, 1);
    assert.equal(p.disagreements[0].panel, "insufficient");
  });

  it("no evidence -> 'no_evidence' (noted, NOT a disagreement — absence is not contradiction)", () => {
    const p = runOffloadPanel([{ id: "c1", identifier: "x", claim: "X", evidence: "" }], {
      exec: offloadExecReturning("supported"),
    });
    assert.equal(p.disagreements.length, 0);
    assert.equal(p.perCitation[0].panel_verdict, "no_evidence");
  });

  it("missing offload binary (ENOENT) -> unreachable", () => {
    const enoent = () => {
      const e = new Error("spawn python ENOENT");
      e.code = "ENOENT";
      throw e;
    };
    const p = runOffloadPanel(SUP, { exec: enoent });
    assert.equal(p.reachable, false);
    assert.equal(p.unreachable, true);
  });

  it("garbage stdout -> error verdict, unreachable when nothing parsed", () => {
    const p = runOffloadPanel(SUP, { exec: () => ({ status: 1, stdout: "not json", stderr: "boom" }) });
    assert.equal(p.reachable, false);
    assert.equal(p.unreachable, true);
    assert.equal(p.perCitation[0].panel_verdict, "error");
  });
});

// ── applyLocalPanel (MONOTONE-TIGHTENING) ──────────────────────────────────────────────────────

const passing = () => ({ verdict: "accept", pass: true, blocking: false, advisory: false, citations: [] });

describe("applyLocalPanel — monotone", () => {
  it("passing gate + panel agrees -> stays accept", () => {
    const g = applyLocalPanel(passing(), runOffloadPanel(SUP, { exec: offloadExecReturning("supported") }));
    assert.equal(g.pass, true);
    assert.equal(g.verdict, "accept");
    assert.ok(g.local_panel);
  });

  it("passing gate + disagreement -> escalate with a CONTRASTIVE message", () => {
    const g = applyLocalPanel(passing(), runOffloadPanel(SUP, { exec: offloadExecReturning("refuted") }));
    assert.equal(g.pass, false);
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "local_panel_disagreement");
    assert.match(g.detail, /prism read the source as SUPPORTING/);
    assert.match(g.detail, /panel found "refuted"/);
  });

  it("passing gate + unreachable panel -> escalate (a closed gate), never silent-accept", () => {
    const enoent = () => {
      const e = new Error("ENOENT");
      e.code = "ENOENT";
      throw e;
    };
    const g = applyLocalPanel(passing(), runOffloadPanel(SUP, { exec: enoent }));
    assert.equal(g.pass, false);
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "local_panel_unreachable");
  });

  it("blocking gate + panel disagrees -> STILL blocking (floor dominates; panel cannot override)", () => {
    const blocked = { verdict: "refuse", pass: false, blocking: true, advisory: false, citations: [] };
    const g = applyLocalPanel(blocked, runOffloadPanel(SUP, { exec: offloadExecReturning("supported") }));
    assert.equal(g.blocking, true);
    assert.equal(g.verdict, "refuse");
  });

  it("never loosens: panel cannot turn a non-pass into a pass", () => {
    const advisory = { verdict: "revise", pass: false, blocking: false, advisory: true, citations: [] };
    const g = applyLocalPanel(advisory, runOffloadPanel(SUP, { exec: offloadExecReturning("supported") }));
    assert.equal(g.pass, false);
    assert.equal(g.verdict, "revise");
  });
});

// ── runCitationGate end-to-end (both prism + offload execs injected) ────────────────────────────

describe("runCitationGate with --local-panel", () => {
  it("prism accept + panel supported -> still accept; receipt records the seat models (PIN_PER_STEP)", () => {
    const r = runCitationGate(ONE, {
      exec: prismExec(prismSupported()),
      localPanel: true,
      offloadExec: offloadExecReturning("supported"),
    });
    assert.equal(r.pass, true);
    assert.equal(r.verdict, "accept");
    assert.deepEqual(r.receipt.local_panel.seats, ["qwen3-4b", "qwen3-14b", "mistral-nemo-12b"]);
    assert.equal(r.receipt.local_panel.disagreements.length, 0);
    assert.equal(exitCodeFor(r), 0);
  });

  it("prism accept + panel refuted -> gate DOWNGRADED to escalate (exit 30)", () => {
    const r = runCitationGate(ONE, {
      exec: prismExec(prismSupported()),
      localPanel: true,
      offloadExec: offloadExecReturning("refuted"),
    });
    assert.equal(r.pass, false);
    assert.equal(r.verdict, "escalate");
    assert.equal(r.reason, "local_panel_disagreement");
    assert.equal(r.receipt.local_panel.disagreements.length, 1);
    assert.equal(exitCodeFor(r), 30);
  });

  it("localPanel off -> panel never runs (offload exec not called), receipt.local_panel is null", () => {
    let called = false;
    const r = runCitationGate(ONE, {
      exec: prismExec(prismSupported()),
      localPanel: false,
      offloadExec: () => {
        called = true;
        return { status: 0, stdout: "{}", stderr: "" };
      },
    });
    assert.equal(called, false);
    assert.equal(r.pass, true);
    assert.equal(r.receipt.local_panel, null);
  });

  it("prism BLOCKING + localPanel on -> panel skipped (gate not pass), floor stands", () => {
    let called = false;
    const r = runCitationGate(ONE, {
      exec: prismExec(
        prismSupported({
          verdict: "refuse",
          citation_results: [{ citation_id: "c1", identifier: "arXiv:2401.99999", existence: "fabricated", verdict: "refuse", action: "DROP", detail: "no record" }],
        }),
      ),
      localPanel: true,
      offloadExec: () => {
        called = true;
        return { status: 0, stdout: "{}", stderr: "" };
      },
    });
    assert.equal(called, false); // panel only runs on a still-passing gate
    assert.equal(r.blocking, true);
    assert.equal(r.receipt.local_panel, null);
  });
});
