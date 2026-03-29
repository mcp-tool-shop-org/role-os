import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  startNextStep,
  completeStep,
  generateCompletionReport,
  formatCompletionReport,
} from "../src/mission-run.mjs";

// ── Knowledge Fixture ───────────────────────────────────────────────

function makePacketKnowledge(status) {
  return {
    retrieval_bundle: {
      version: "1.0",
      role_id: "test",
      selected: [
        { chunk_id: "c1", citation: { reference: "OWASP Top 10" } },
        { chunk_id: "c2", citation: { reference: "Auth Review" } },
        { chunk_id: "c3", citation: { reference: "Threat Model" } },
      ],
      provenance: { trust_posture: "strong", freshness_posture: "fresh" },
      warnings: status === "conflicted"
        ? [{ code: "CONFLICTING_EVIDENCE", message: "Sources disagree" }]
        : status === "stale"
          ? [{ code: "STALE_DOMINANT", message: "Stale evidence" }]
          : [],
    },
    status,
  };
}

// ── Mission Run with Knowledge ──────────────────────────────────────

describe("mission run with knowledge", () => {
  it("createRun accepts knowledge option", () => {
    const pk = makePacketKnowledge("strong");
    const run = createRun("brainstorm", "Test brainstorm task", { knowledge: pk });
    assert.ok(run.knowledge);
    assert.equal(run.knowledge.status, "strong");
  });

  it("createRun works without knowledge (backward compat)", () => {
    const run = createRun("brainstorm", "Test brainstorm task");
    assert.equal(run.knowledge, null);
  });

  it("completion report includes knowledge summary when present", () => {
    const pk = makePacketKnowledge("strong");
    const run = createRun("brainstorm", "Test brainstorm", { knowledge: pk });

    // Run through all steps
    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    assert.ok(report.knowledge);
    assert.equal(report.knowledge.status, "strong");
    assert.equal(report.knowledge.selected_count, 3);
    assert.equal(report.knowledge.trust_posture, "strong");
    assert.equal(report.knowledge.freshness_posture, "fresh");
  });

  it("completion report has null knowledge when not provided", () => {
    const run = createRun("bugfix", "Fix the crash");

    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Fix artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    assert.equal(report.knowledge, null);
  });

  it("completion report includes warning codes", () => {
    const pk = makePacketKnowledge("conflicted");
    const run = createRun("brainstorm", "Conflicted test", { knowledge: pk });

    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    assert.ok(report.knowledge.warning_codes.includes("CONFLICTING_EVIDENCE"));
  });
});

// ── Formatted Report with Knowledge ─────────────────────────────────

describe("formatted report with knowledge", () => {
  it("includes knowledge section in formatted output", () => {
    const pk = makePacketKnowledge("strong");
    const run = createRun("brainstorm", "Test brainstorm", { knowledge: pk });

    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);

    assert.ok(text.includes("## Knowledge"));
    assert.ok(text.includes("Status: strong"));
    assert.ok(text.includes("3 chunks selected"));
    assert.ok(text.includes("Trust: strong"));
  });

  it("omits knowledge section when not present", () => {
    const run = createRun("bugfix", "Fix the crash");

    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Fix artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);

    assert.ok(!text.includes("## Knowledge"));
  });

  it("shows warnings in formatted output", () => {
    const pk = makePacketKnowledge("stale");
    const run = createRun("brainstorm", "Stale test", { knowledge: pk });

    let step;
    while ((step = startNextStep(run))) {
      completeStep(run, `Artifact for ${step.role}`);
    }

    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);

    assert.ok(text.includes("Warnings: STALE_DOMINANT"));
  });
});
