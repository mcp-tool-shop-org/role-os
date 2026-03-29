import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  surfaceFromDomain,
  deriveVerdict,
  buildScenarioResults,
  computeOverallVerdict,
  buildSubmission,
  buildAuditPayload,
} from "../src/swarm/persist-bridge.mjs";

// ── surfaceFromDomain ───────────────────────────────────────────────────────

describe("surfaceFromDomain", () => {
  it("maps backend to cli", () => assert.equal(surfaceFromDomain("backend"), "cli"));
  it("maps bridge to cli", () => assert.equal(surfaceFromDomain("bridge"), "cli"));
  it("maps tests to cli", () => assert.equal(surfaceFromDomain("tests"), "cli"));
  it("maps infra to cli", () => assert.equal(surfaceFromDomain("infra"), "cli"));
  it("maps frontend to web", () => assert.equal(surfaceFromDomain("frontend"), "web"));
  it("maps unknown to cli", () => assert.equal(surfaceFromDomain("unknown"), "cli"));
});

// ── deriveVerdict ───────────────────────────────────────────────────────────

describe("deriveVerdict", () => {
  it("no findings = pass", () => {
    assert.equal(deriveVerdict([]), "pass");
  });

  it("null findings = pass", () => {
    assert.equal(deriveVerdict(null), "pass");
  });

  it("critical open = fail", () => {
    assert.equal(deriveVerdict([{ severity: "critical" }]), "fail");
  });

  it("high open = partial", () => {
    assert.equal(deriveVerdict([{ severity: "high" }]), "partial");
  });

  it("only medium = pass", () => {
    assert.equal(deriveVerdict([{ severity: "medium" }]), "pass");
  });

  it("fixed critical = pass", () => {
    assert.equal(deriveVerdict([{ severity: "critical", status: "fixed" }]), "pass");
  });

  it("accepted_risk high = pass", () => {
    assert.equal(deriveVerdict([{ severity: "high", status: "accepted_risk" }]), "pass");
  });
});

// ── buildScenarioResults ────────────────────────────────────────────────────

describe("buildScenarioResults", () => {
  it("groups by domain", () => {
    const results = buildScenarioResults([
      { domain: "backend", stage: "health-a", findings: [{ severity: "medium" }], remediations: [] },
      { domain: "frontend", stage: "health-a", findings: [], remediations: [] },
    ]);
    assert.equal(results.length, 2);
    assert.equal(results[0].scenario_id, "swarm-backend");
    assert.equal(results[1].scenario_id, "swarm-frontend");
  });

  it("computes evidence correctly", () => {
    const results = buildScenarioResults([
      {
        domain: "backend", stage: "health-a",
        findings: [
          { severity: "critical", status: "fixed" },
          { severity: "high" },
          { severity: "medium" },
        ],
        remediations: [{ id: "r1" }],
      },
    ]);
    assert.equal(results[0].evidence.total_findings, 3);
    assert.equal(results[0].evidence.fixed, 1);
    assert.equal(results[0].evidence.open_findings, 2);
  });
});

// ── computeOverallVerdict ───────────────────────────────────────────────────

describe("computeOverallVerdict", () => {
  it("all pass = pass", () => {
    assert.equal(computeOverallVerdict([{ verdict: "pass" }, { verdict: "pass" }]), "pass");
  });

  it("any fail = fail", () => {
    assert.equal(computeOverallVerdict([{ verdict: "pass" }, { verdict: "fail" }]), "fail");
  });

  it("any partial (no fail) = partial", () => {
    assert.equal(computeOverallVerdict([{ verdict: "pass" }, { verdict: "partial" }]), "partial");
  });
});

// ── buildSubmission ─────────────────────────────────────────────────────────

describe("buildSubmission", () => {
  it("builds valid submission shape", () => {
    const manifest = { repo: "test-repo", domains: [{ id: "backend" }] };
    const reports = [{ domain: "backend", stage: "health-a", findings: [], remediations: [] }];
    const sub = buildSubmission(manifest, reports, { commitSha: "abc123", branch: "main" });

    assert.equal(sub.repo, "test-repo");
    assert.equal(sub.execution_mode, "automated");
    assert.equal(sub.metadata.tool, "role-os-swarm");
    assert.equal(sub.metadata.commit_sha, "abc123");
    assert.ok(Array.isArray(sub.scenario_results));
  });
});

// ── buildAuditPayload ───────────────────────────────────────────────────────

describe("buildAuditPayload", () => {
  it("builds valid audit payload shape", () => {
    const manifest = { repo: "test-repo", domains: [{ id: "backend" }] };
    const reports = [{
      domain: "backend", stage: "health-a",
      findings: [
        { severity: "critical", status: "fixed" },
        { severity: "medium" },
      ],
      remediations: [],
    }];
    const payload = buildAuditPayload(manifest, reports, { commitSha: "abc123" });

    assert.equal(payload.run.slug, "swarm-test-repo");
    assert.equal(payload.metrics.total_findings, 2);
    assert.equal(payload.metrics.critical, 1);
    assert.equal(payload.metrics.fixed, 1);
    assert.equal(payload.metrics.pass_rate, 50);
  });

  it("handles zero findings", () => {
    const manifest = { repo: "clean-repo", domains: [{ id: "backend" }] };
    const reports = [{ domain: "backend", stage: "health-a", findings: [], remediations: [] }];
    const payload = buildAuditPayload(manifest, reports);

    assert.equal(payload.metrics.total_findings, 0);
    assert.equal(payload.metrics.pass_rate, 100);
    assert.equal(payload.run.blocking_release, false);
  });
});
