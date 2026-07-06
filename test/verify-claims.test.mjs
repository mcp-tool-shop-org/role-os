import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  normalizeClaims,
  gateClaims,
  runClaimsGate,
  resolveInternCmd,
  MAX_CLAIMS,
} from "../src/verify-claims.mjs";
import { exitCodeFor } from "../src/verify-claims-cmd.mjs";

// ── Fixtures (mirror ollama_verify_claims' real VerifyClaimsResult shape) ──────────────────────

function juror(model, over = {}) {
  return { model, verdict: "CONFIRMED", severity: "medium", rationale: "the evidence supports it", ...over };
}

function claimAgg(over = {}) {
  return {
    id: "c1",
    statement: "the fix handles the empty-input case",
    verdict: "CONFIRMED",
    confidence: "high",
    refute_votes: 0,
    confirm_votes: 3,
    uncertain_votes: 0,
    jurors: [juror("deepseek-v4-pro:cloud"), juror("kimi-k2.7-code:cloud"), juror("glm-5.2:cloud")],
    ...over,
  };
}

function verifyResult(over = {}) {
  return {
    claims: [claimAgg()],
    panel: [
      { model: "deepseek-v4-pro:cloud", served_model: "deepseek-v4-pro", included: true, verdicts_returned: 1 },
      { model: "kimi-k2.7-code:cloud", served_model: "kimi-k2.7-code", included: true, verdicts_returned: 1 },
      { model: "glm-5.2:cloud", served_model: "glm-5.2", included: true, verdicts_returned: 1 },
    ],
    summary: "1 confirmed, 0 refuted, 0 needs review across 1 claim(s); panel 3/3 cloud-served",
    min_refute_votes: 2,
    weak: false,
    ...over,
  };
}

function envelopeOf(result, over = {}) {
  return {
    tier_used: "deep",
    model: "deepseek-v4-pro:cloud,kimi-k2.7-code:cloud,glm-5.2:cloud",
    backend: "cloud",
    tokens_in: 300,
    tokens_out: 150,
    run_id: "run-fixture-1",
    call_id: "call-fixture-1",
    result,
    ...over,
  };
}

/** Injectable callTool returning a fixed envelope (the tool's happy wire shape). */
function callToolReturning(envelope) {
  return async () => ({ ok: true, envelope });
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

// ── normalizeClaims ────────────────────────────────────────────────────────────────────────────

describe("normalizeClaims", () => {
  it("accepts bare strings and mints sequential ids", () => {
    const { claims, invalid } = normalizeClaims(["first claim", "second claim"]);
    assert.equal(claims.length, 2);
    assert.deepEqual(claims.map((c) => c.id), ["c1", "c2"]);
    assert.equal(claims[0].statement, "first claim");
    assert.equal(invalid.length, 0);
  });

  it("accepts objects, keeps caller ids, and honors claim/finding aliases", () => {
    const { claims } = normalizeClaims([
      { id: "r1", statement: "a statement" },
      { claim: "a claim-shaped field" },
      { finding: "a finding-shaped field" },
    ]);
    assert.equal(claims[0].id, "r1");
    assert.equal(claims[1].statement, "a claim-shaped field");
    assert.equal(claims[2].statement, "a finding-shaped field");
  });

  it("surfaces unusable items and duplicate ids in `invalid`, never silently drops", () => {
    const { claims, invalid } = normalizeClaims([
      { id: "dup", statement: "one" },
      { id: "dup", statement: "two" },
      { note: "no statement here" },
      42,
    ]);
    assert.equal(claims.length, 2);
    assert.ok(invalid.some((x) => x.includes("dup")));
    assert.equal(invalid.length, 3); // no-statement object + number + duplicate-id note
  });

  it("rejects non-array input", () => {
    const { claims, invalid } = normalizeClaims({ statement: "not an array" });
    assert.equal(claims.length, 0);
    assert.equal(invalid.length, 1);
  });
});

// ── gateClaims (the three-tier mapping) ────────────────────────────────────────────────────────

describe("gateClaims", () => {
  it("all CONFIRMED on a full panel -> accept (pass, not advisory, not blocking)", () => {
    const g = gateClaims(verifyResult());
    assert.equal(g.verdict, "accept");
    assert.equal(g.pass, true);
    assert.equal(g.blocking, false);
    assert.equal(g.advisory, false);
    assert.equal(g.claims.length, 1);
    assert.equal(g.claims[0].jurors.length, 3);
  });

  it("weak panel -> escalate, even when every claim is CONFIRMED", () => {
    const g = gateClaims(verifyResult({ weak: true }));
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "weak_panel");
    assert.equal(g.pass, false);
    assert.equal(g.advisory, true);
  });

  it("weak DOMINATES refuted — a thin panel must not decide a kill, even in strict mode", () => {
    const r = verifyResult({
      weak: true,
      claims: [claimAgg({ verdict: "REFUTED", refute_votes: 1, confirm_votes: 0 })],
    });
    const g = gateClaims(r, { strictRefuted: true });
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "weak_panel");
    assert.equal(g.blocking, false);
  });

  it("a REFUTED claim -> advisory revise by default (model consensus, not determinism)", () => {
    const r = verifyResult({
      claims: [claimAgg(), claimAgg({ id: "c2", verdict: "REFUTED", refute_votes: 2, confirm_votes: 1 })],
    });
    const g = gateClaims(r);
    assert.equal(g.verdict, "revise");
    assert.equal(g.reason, "refuted_claims");
    assert.equal(g.blocking, false);
    assert.equal(g.advisory, true);
    assert.match(g.detail, /1 claim\(s\) REFUTED/);
  });

  it("strictRefuted turns a REFUTED into a blocking refuse (the opt-in hard andon)", () => {
    const r = verifyResult({
      claims: [claimAgg({ verdict: "REFUTED", refute_votes: 2, confirm_votes: 1 })],
    });
    const g = gateClaims(r, { strictRefuted: true });
    assert.equal(g.verdict, "refuse");
    assert.equal(g.blocking, true);
    assert.equal(g.advisory, false);
  });

  it("REFUTED takes precedence over NEEDS_REVIEW in the same result (revise names the actionable problem)", () => {
    const r = verifyResult({
      claims: [
        claimAgg({ id: "c1", verdict: "REFUTED", refute_votes: 2 }),
        claimAgg({ id: "c2", verdict: "NEEDS_REVIEW", confidence: "low", confirm_votes: 1 }),
      ],
    });
    const g = gateClaims(r);
    assert.equal(g.verdict, "revise");
  });

  it("NEEDS_REVIEW (no refutes) -> escalate: a human owns what the panel could not settle", () => {
    const r = verifyResult({
      claims: [claimAgg({ verdict: "NEEDS_REVIEW", confidence: "low", confirm_votes: 1 })],
    });
    const g = gateClaims(r);
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "needs_review");
  });

  it("zero adjudicated claims is never trusted as accept", () => {
    const g = gateClaims(verifyResult({ claims: [] }));
    assert.equal(g.verdict, "escalate");
    assert.equal(g.reason, "no_adjudicated_claims");
  });

  it("malformed verifier output -> escalate (untrusted boundary input)", () => {
    for (const bad of [null, undefined, "text", { weak: false }, { claims: "nope" }]) {
      const g = gateClaims(bad);
      assert.equal(g.verdict, "escalate");
      assert.equal(g.reason, "malformed_verifier_output");
    }
  });
});

// ── runClaimsGate (runner: load -> callTool -> gate -> receipt) ────────────────────────────────

describe("runClaimsGate", () => {
  it("accept path from a claims file, with a recomputable chained receipt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-claims-"));
    const file = join(dir, "claims.json");
    try {
      writeFileSync(file, JSON.stringify([{ id: "c1", statement: "the fix handles the empty-input case" }]));
      const env = envelopeOf(verifyResult());
      const res = await runClaimsGate(file, { callTool: callToolReturning(env) });
      assert.equal(res.pass, true);
      assert.equal(res.verdict, "accept");
      const r = res.receipt;
      assert.equal(r.schema, "roleos-claims-receipt/v1");
      assert.equal(r.tool, "roleos verify-claims");
      assert.equal(r.strict_refuted, false);
      // PIN_PER_STEP provenance: correlation ids + backend + the seats as served.
      assert.equal(r.intern.run_id, "run-fixture-1");
      assert.equal(r.intern.backend, "cloud");
      assert.equal(r.panel.length, 3);
      assert.equal(r.panel[0].served_model, "deepseek-v4-pro");
      // The chain is recomputable from the receipt's own parts + what we supplied: the
      // normalized claims, the exact wire request, and the envelope.
      const sentClaims = [{ id: "c1", statement: "the fix handles the empty-input case" }];
      assert.equal(r.claims_sha256, sha256(JSON.stringify(sentClaims)));
      assert.equal(r.request_sha256, sha256(JSON.stringify({ claims: sentClaims })));
      assert.equal(r.envelope_sha256, sha256(JSON.stringify(env)));
      assert.equal(
        r.chain_sha256,
        sha256([r.claims_sha256, r.request_sha256, r.envelope_sha256, r.verdict].join("|")),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("threads sources/reference/panel/minRefuteVotes into the tool args (reference capped at 20k)", async () => {
    let captured = null;
    const callTool = async (call) => {
      captured = call;
      return { ok: true, envelope: envelopeOf(verifyResult()) };
    };
    await runClaimsGate([{ id: "x", statement: "s" }], {
      callTool,
      sources: ["src/a.mjs", "src/b.mjs"],
      reference: "R".repeat(30_000),
      panel: ["deepseek-v4-pro:cloud", "glm-5.2:cloud"],
      minRefuteVotes: 3,
    });
    assert.equal(captured.toolName, "ollama_verify_claims");
    assert.deepEqual(captured.toolArgs.claims, [{ id: "x", statement: "s" }]);
    assert.deepEqual(captured.toolArgs.source_paths, ["src/a.mjs", "src/b.mjs"]);
    assert.equal(captured.toolArgs.reference.length, 20_000);
    assert.deepEqual(captured.toolArgs.panel, ["deepseek-v4-pro:cloud", "glm-5.2:cloud"]);
    assert.equal(captured.toolArgs.min_refute_votes, 3);
  });

  it("request_sha256 pins the evidence set: same claims, different reference -> different chain", async () => {
    const env = envelopeOf(verifyResult());
    const callTool = callToolReturning(env);
    const claims = [{ id: "c1", statement: "a stable claim" }];
    const a = await runClaimsGate(claims, { callTool, reference: "test run A: 10 passed" });
    const b = await runClaimsGate(claims, { callTool, reference: "test run B: 9 passed, 1 failed" });
    assert.equal(a.receipt.claims_sha256, b.receipt.claims_sha256); // same claims…
    assert.notEqual(a.receipt.request_sha256, b.receipt.request_sha256); // …different evidence
    assert.notEqual(a.receipt.chain_sha256, b.receipt.chain_sha256); // the chain sees it
  });

  it("an unreachable verifier ESCALATES — a closed gate, never a default accept", async () => {
    const res = await runClaimsGate([{ statement: "s" }], {
      callTool: async () => ({ ok: false, detail: "spawn ENOENT" }),
    });
    assert.equal(res.verdict, "escalate");
    assert.equal(res.reason, "verifier_unreachable");
    assert.equal(res.pass, false);
  });

  it("CLOUD_NOT_CONFIGURED is named distinctly (operator config, not an outage)", async () => {
    const res = await runClaimsGate([{ statement: "s" }], {
      callTool: async () => ({
        ok: false,
        code: "CLOUD_NOT_CONFIGURED",
        detail: "ollama_verify_claims requires Ollama Cloud",
      }),
    });
    assert.equal(res.verdict, "escalate");
    assert.equal(res.reason, "cloud_not_configured");
  });

  it("more than MAX_CLAIMS refuses loudly WITHOUT calling the tool (never silently truncates)", async () => {
    let called = 0;
    const many = Array.from({ length: MAX_CLAIMS + 1 }, (_, i) => `claim number ${i}`);
    const res = await runClaimsGate(many, {
      callTool: async () => {
        called += 1;
        return { ok: true, envelope: envelopeOf(verifyResult()) };
      },
    });
    assert.equal(res.verdict, "escalate");
    assert.equal(res.reason, "too_many_claims");
    assert.equal(called, 0);
  });

  it("an empty claims input reports no_claims (exit-code 2 tier)", async () => {
    const res = await runClaimsGate([], { callTool: async () => ({ ok: true, envelope: {} }) });
    assert.equal(res.reason, "no_claims");
  });

  it("a missing claims file escalates invalid_input (never scans the path string)", async () => {
    const res = await runClaimsGate(join(tmpdir(), "does-not-exist-roleos.json"), {
      callTool: async () => ({ ok: true, envelope: {} }),
    });
    assert.equal(res.verdict, "escalate");
    assert.equal(res.reason, "invalid_input");
  });

  it("excluded-seat evidence (exclude_reason + bounded raw_sample) rides into the receipt", async () => {
    const r = verifyResult({
      panel: [
        { model: "deepseek-v4-pro:cloud", served_model: "deepseek-v4-pro", included: true, verdicts_returned: 1 },
        {
          model: "kimi-k2.7-code:cloud",
          served_model: "kimi-k2.7-code",
          included: false,
          exclude_reason: "no_valid_verdicts",
          raw_sample: "I think these claims look plausible overall...",
          verdicts_returned: 0,
        },
        { model: "glm-5.2:cloud", served_model: "glm-5.2", included: true, verdicts_returned: 1 },
      ],
    });
    const res = await runClaimsGate([{ statement: "s" }], {
      callTool: callToolReturning(envelopeOf(r)),
    });
    const seat = res.receipt.panel.find((s) => s.model === "kimi-k2.7-code:cloud");
    assert.equal(seat.exclude_reason, "no_valid_verdicts");
    assert.match(seat.raw_sample, /plausible/);
  });
});

// ── exit codes (the machine contract) ──────────────────────────────────────────────────────────

describe("exitCodeFor", () => {
  it("maps the tiers: blocking 20 · accept 0 · no_claims 2 · escalate 30 · revise 10", () => {
    assert.equal(exitCodeFor({ blocking: true, pass: false, verdict: "refuse" }), 20);
    assert.equal(exitCodeFor({ blocking: false, pass: true, verdict: "accept" }), 0);
    assert.equal(exitCodeFor({ blocking: false, pass: false, verdict: "escalate", reason: "no_claims" }), 2);
    assert.equal(exitCodeFor({ blocking: false, pass: false, verdict: "escalate", reason: "weak_panel" }), 30);
    assert.equal(exitCodeFor({ blocking: false, pass: false, verdict: "revise", reason: "refuted_claims" }), 10);
  });
});

// ── resolveInternCmd ───────────────────────────────────────────────────────────────────────────

describe("resolveInternCmd", () => {
  it("an explicit internCmd wins and is spawned with no args", () => {
    const r = resolveInternCmd("C:/tools/ollama-intern-mcp.exe");
    assert.deepEqual(r, { cmd: "C:/tools/ollama-intern-mcp.exe", args: [] });
  });

  it("an explicit .js entry runs under the current node (Windows cannot exec a script)", () => {
    const r = resolveInternCmd("E:/AI/ollama-intern-mcp/dist/index.js");
    assert.deepEqual(r, { cmd: process.execPath, args: ["E:/AI/ollama-intern-mcp/dist/index.js"] });
  });
});
