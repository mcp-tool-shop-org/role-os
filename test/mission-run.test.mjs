import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  startNextStep,
  completeStep,
  failStep,
  recordEscalation,
  getRunPosition,
  getArtifactChain,
  generateCompletionReport,
  formatCompletionReport,
} from "../src/mission-run.mjs";

// ── createRun ───────────────────────────────────────────────────────────────

describe("createRun", () => {
  it("creates a run for a valid mission", () => {
    const run = createRun("bugfix", "Fix the crash in save handler");
    assert.ok(run.id.startsWith("bugfix-"));
    assert.equal(run.missionKey, "bugfix");
    assert.equal(run.taskDescription, "Fix the crash in save handler");
    assert.equal(run.status, "planning");
    assert.equal(run.steps.length, 4); // bugfix has 4 artifact flow steps
    assert.ok(run.startedAt);
    assert.equal(run.completedAt, null);
    assert.equal(run.completionReport, null);
    assert.deepEqual(run.escalations, []);
  });

  it("throws for unknown mission", () => {
    assert.throws(() => createRun("nonexistent", "anything"), /not found/);
  });

  it("steps start as pending", () => {
    const run = createRun("bugfix", "test");
    for (const step of run.steps) {
      assert.equal(step.status, "pending");
      assert.equal(step.artifact, null);
      assert.equal(step.startedAt, null);
    }
  });

  it("creates runs for all 8 missions", () => {
    const keys = ["feature-ship", "bugfix", "treatment", "docs-release", "security-hardening", "research-launch", "brainstorm", "deep-audit"];
    for (const key of keys) {
      const run = createRun(key, `Test ${key}`);
      assert.ok(run.id.startsWith(`${key}-`));
      assert.ok(run.steps.length >= 2);
    }
  });
});

// ── startNextStep ───────────────────────────────────────────────────────────

describe("startNextStep", () => {
  it("starts the first pending step", () => {
    const run = createRun("bugfix", "test");
    const step = startNextStep(run);
    assert.ok(step);
    assert.equal(step.role, "Repo Researcher");
    assert.equal(step.status, "active");
    assert.ok(step.startedAt);
    assert.equal(run.status, "running");
  });

  it("returns null when no pending steps", () => {
    const run = createRun("docs-release", "test");
    // Start and complete all steps
    startNextStep(run);
    completeStep(run, "docs artifact");
    startNextStep(run);
    completeStep(run, "review verdict");
    const result = startNextStep(run);
    assert.equal(result, null);
  });
});

// ── completeStep ────────────────────────────────────────────────────────────

describe("completeStep", () => {
  it("completes the active step with artifact", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const step = completeStep(run, "Root cause: null pointer in save()");
    assert.equal(step.status, "completed");
    assert.equal(step.artifact, "Root cause: null pointer in save()");
    assert.ok(step.completedAt);
  });

  it("accepts optional note", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const step = completeStep(run, "diagnosis", "Took 3 attempts to reproduce");
    assert.equal(step.note, "Took 3 attempts to reproduce");
  });

  it("throws when no active step", () => {
    const run = createRun("bugfix", "test");
    assert.throws(() => completeStep(run, "anything"), /No active step/);
  });

  it("sets run to completed when all steps done", () => {
    const run = createRun("docs-release", "test");
    startNextStep(run);
    completeStep(run, "docs");
    startNextStep(run);
    completeStep(run, "verdict");
    assert.equal(run.status, "completed");
    assert.ok(run.completedAt);
  });

  it("attaches artifact validation to completed step", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const step = completeStep(run, "## Diagnosis\nRoot cause found.\n## Affected Files\nsrc/x.mjs");
    assert.ok(step.artifactValidation, "completeStep should attach validation result");
    assert.ok("valid" in step.artifactValidation, "validation should have valid field");
  });

  it("validation flags missing sections on incomplete artifact", () => {
    const run = createRun("feature-ship", "test");
    startNextStep(run); // Product Strategist
    // Missing required sections for Product Strategist (needs problem-framing, scope, non-goals, tradeoffs)
    const step = completeStep(run, "## Problem Framing\nJust this.");
    assert.ok(step.artifactValidation);
    assert.equal(step.artifactValidation.valid, false);
    assert.ok(step.artifactValidation.missing.length > 0);
    // Step still completes (warn, don't block)
    assert.equal(step.status, "completed");
  });
});

// ── failStep ────────────────────────────────────────────────────────────────

describe("failStep", () => {
  it("marks active step as partial", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const step = failStep(run, "partial", "Root cause unclear, need more evidence");
    assert.equal(step.status, "partial");
    assert.equal(step.note, "Root cause unclear, need more evidence");
    assert.equal(run.status, "partial");
  });

  it("marks active step as failed", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const step = failStep(run, "failed", "Cannot reproduce");
    assert.equal(step.status, "failed");
    assert.equal(run.status, "failed");
  });

  it("throws for invalid status", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    assert.throws(() => failStep(run, "invalid", "reason"), /Invalid fail status/);
  });

  it("throws when no active step", () => {
    const run = createRun("bugfix", "test");
    assert.throws(() => failStep(run, "failed", "reason"), /No active step/);
  });
});

// ── recordEscalation ────────────────────────────────────────────────────────

describe("recordEscalation", () => {
  it("records an escalation", () => {
    const run = createRun("bugfix", "test");
    const esc = recordEscalation(run, "Repo Researcher", "Repo Researcher", "root cause unclear", "gather more evidence");
    assert.equal(esc.from, "Repo Researcher");
    assert.equal(esc.to, "Repo Researcher");
    assert.ok(esc.timestamp);
    assert.equal(run.escalations.length, 1);
  });

  it("re-opens a completed step when escalating back", () => {
    const run = createRun("bugfix", "test");
    // Complete diagnosis
    startNextStep(run);
    completeStep(run, "initial diagnosis");
    // Start fix
    startNextStep(run);
    // Escalate back to Repo Researcher
    recordEscalation(run, "Backend Engineer", "Repo Researcher", "diagnosis was wrong", "re-diagnose");
    const diagStep = run.steps.find(s => s.role === "Repo Researcher");
    assert.equal(diagStep.status, "pending");
    assert.equal(diagStep.artifact, null);
  });
});

// ── getRunPosition ──────────────────────────────────────────────────────────

describe("getRunPosition", () => {
  it("tracks position in a fresh run", () => {
    const run = createRun("bugfix", "test");
    const pos = getRunPosition(run);
    assert.equal(pos.currentStep, null);
    assert.equal(pos.completedCount, 0);
    assert.equal(pos.totalSteps, 4);
    assert.equal(pos.progress, "0/4");
  });

  it("tracks active step", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const pos = getRunPosition(run);
    assert.equal(pos.currentStep.role, "Repo Researcher");
    assert.equal(pos.progress, "0/4");
  });

  it("tracks completed steps", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    completeStep(run, "diagnosis");
    const pos = getRunPosition(run);
    assert.equal(pos.completedCount, 1);
    assert.equal(pos.progress, "1/4");
  });
});

// ── getArtifactChain ────────────────────────────────────────────────────────

describe("getArtifactChain", () => {
  it("returns empty for fresh run", () => {
    const run = createRun("bugfix", "test");
    assert.deepEqual(getArtifactChain(run), []);
  });

  it("returns completed artifacts", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    completeStep(run, "diagnosis report");
    startNextStep(run);
    completeStep(run, "change plan");
    const chain = getArtifactChain(run);
    assert.equal(chain.length, 2);
    assert.equal(chain[0].role, "Repo Researcher");
    assert.equal(chain[0].type, "diagnosis-report");
    assert.equal(chain[1].role, "Backend Engineer");
    assert.equal(chain[1].type, "change-plan");
  });
});

// ── generateCompletionReport ────────────────────────────────────────────────

describe("generateCompletionReport", () => {
  it("generates report for completed run", () => {
    const run = createRun("docs-release", "Update the README");
    startNextStep(run);
    completeStep(run, "Updated docs");
    startNextStep(run);
    completeStep(run, "Accepted");
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.progress, "2/2");
    assert.equal(report.artifactsProduced, 2);
    assert.ok(report.verdict.includes("completed"));
    assert.equal(report.honestPartial, null);
    assert.ok(report.durationMs !== null);
  });

  it("generates report for partial run", () => {
    const run = createRun("bugfix", "Fix crash");
    startNextStep(run);
    failStep(run, "partial", "Root cause unclear");
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "partial");
    assert.equal(report.progress, "0/4");
    assert.ok(report.honestPartial);
    assert.ok(report.verdict.includes("partially"));
  });

  it("generates report for failed run", () => {
    const run = createRun("bugfix", "Fix crash");
    startNextStep(run);
    failStep(run, "failed", "Cannot reproduce");
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "failed");
    assert.ok(report.verdict.includes("failed"));
  });

  it("includes escalation count", () => {
    const run = createRun("bugfix", "test");
    recordEscalation(run, "A", "B", "trigger", "action");
    startNextStep(run);
    completeStep(run, "done");
    const report = generateCompletionReport(run);
    assert.equal(report.escalationCount, 1);
  });

  it("attaches report to run object", () => {
    const run = createRun("docs-release", "test");
    startNextStep(run);
    completeStep(run, "docs");
    startNextStep(run);
    completeStep(run, "verdict");
    const report = generateCompletionReport(run);
    assert.equal(run.completionReport, report);
  });
});

// ── formatCompletionReport ──────────────────────────────────────────────────

describe("formatCompletionReport", () => {
  it("formats a completed report as text", () => {
    const run = createRun("docs-release", "Update README");
    startNextStep(run);
    completeStep(run, "docs");
    startNextStep(run);
    completeStep(run, "accepted");
    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);
    assert.ok(text.includes("# Mission Report: Docs & Release"));
    assert.ok(text.includes("COMPLETED"));
    assert.ok(text.includes("2/2"));
    assert.ok(text.includes("[x] Docs Architect"));
    assert.ok(text.includes("[x] Critic Reviewer"));
  });

  it("formats a partial report with honest-partial section", () => {
    const run = createRun("bugfix", "Fix crash");
    startNextStep(run);
    failStep(run, "partial", "Root cause unclear");
    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);
    assert.ok(text.includes("PARTIAL"));
    assert.ok(text.includes("## Honest Partial"));
    assert.ok(text.includes("[~] Repo Researcher"));
  });

  it("formats escalations when present", () => {
    const run = createRun("bugfix", "test");
    recordEscalation(run, "Test Engineer", "Backend Engineer", "regression found", "revise fix");
    startNextStep(run);
    completeStep(run, "diagnosis");
    startNextStep(run);
    completeStep(run, "fix");
    startNextStep(run);
    completeStep(run, "tests pass");
    startNextStep(run);
    completeStep(run, "accepted");
    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);
    assert.ok(text.includes("## Escalations"));
    assert.ok(text.includes("Test Engineer"));
    assert.ok(text.includes("regression found"));
  });
});

// ── Full mission lifecycle ──────────────────────────────────────────────────

describe("full mission lifecycle", () => {
  it("runs a bugfix mission end-to-end", () => {
    const run = createRun("bugfix", "Fix null pointer in save handler");

    // Step 1: Diagnose
    const diag = startNextStep(run);
    assert.equal(diag.role, "Repo Researcher");
    completeStep(run, "Root cause: save() called with null context when session expired");

    // Step 2: Fix
    const fix = startNextStep(run);
    assert.equal(fix.role, "Backend Engineer");
    completeStep(run, "Added null check + session validation before save");

    // Step 3: Test
    const test = startNextStep(run);
    assert.equal(test.role, "Test Engineer");
    completeStep(run, "5 new tests: null context, expired session, valid save, concurrent save, empty data");

    // Step 4: Review
    const review = startNextStep(run);
    assert.equal(review.role, "Critic Reviewer");
    completeStep(run, "Accepted: fix is minimal, tests cover edge cases, no regressions");

    assert.equal(run.status, "completed");

    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, 4);
    assert.equal(report.escalationCount, 0);
  });

  it("runs a bugfix with escalation loop", () => {
    const run = createRun("bugfix", "Fix intermittent test failure");

    // Diagnose
    startNextStep(run);
    completeStep(run, "Initial diagnosis: race condition in event handler");

    // Fix attempt
    startNextStep(run);
    completeStep(run, "Added mutex to event handler");

    // Test finds regression
    startNextStep(run);
    // Escalate back to engineer
    recordEscalation(run, "Test Engineer", "Backend Engineer", "fix introduces regression", "revise fix approach");
    failStep(run, "partial", "Mutex causes deadlock in certain paths");

    // The run is now partial — Backend Engineer step was re-opened
    assert.equal(run.status, "partial");
    assert.equal(run.escalations.length, 1);

    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "partial");
    assert.ok(report.honestPartial);
  });

  it("runs a feature-ship mission end-to-end", () => {
    const run = createRun("feature-ship", "Add roleos mission command");

    // All 5 steps
    startNextStep(run);
    completeStep(run, "Strategy brief: mission library for recurring task families");
    startNextStep(run);
    completeStep(run, "Spec: 6 missions, CLI commands, validation, suggest");
    startNextStep(run);
    completeStep(run, "Implementation: mission.mjs, mission-run.mjs, mission-cmd.mjs");
    startNextStep(run);
    completeStep(run, "Tests: 45 tests covering catalog, lifecycle, escalation, reporting");
    startNextStep(run);
    completeStep(run, "Accepted: clean implementation, tests comprehensive, ready to ship");

    assert.equal(run.status, "completed");
    const report = generateCompletionReport(run);
    assert.equal(report.artifactsProduced, 5);
  });
});

// ── Dynamic dispatch ────────────────────────────────────────────────────────

describe("dynamic dispatch", () => {
  const manifest = {
    components: [
      { id: "comp-a", description: "Component A", lines: 500 },
      { id: "comp-b", description: "Component B", lines: 800 },
      { id: "comp-c", description: "Component C", lines: 300 },
    ],
    boundaries: [
      { from: "comp-a", to: "comp-b", interface: "a imports b" },
      { from: "comp-b", to: "comp-c", interface: "b imports c" },
    ],
  };

  it("creates dynamic steps from manifest", () => {
    const run = createRun("deep-audit", "Audit the repo", { manifest });
    assert.equal(run.dynamicDispatch, true);
    assert.ok(run.manifest);
    // 3 component auditors + 3 test truth + 2 seam + synthesizer×2 + critic = 11
    assert.equal(run.steps.length, 11);
  });

  it("creates one Component Auditor per component", () => {
    const run = createRun("deep-audit", "Audit", { manifest });
    const compSteps = run.steps.filter(s => s.role === "Component Auditor");
    assert.equal(compSteps.length, 3);
    assert.equal(compSteps[0].parcel, "comp-a");
    assert.equal(compSteps[1].parcel, "comp-b");
    assert.equal(compSteps[2].parcel, "comp-c");
  });

  it("creates one Test Truth Auditor per component", () => {
    const run = createRun("deep-audit", "Audit", { manifest });
    const testSteps = run.steps.filter(s => s.role === "Test Truth Auditor");
    assert.equal(testSteps.length, 3);
  });

  it("creates one Seam Auditor per boundary", () => {
    const run = createRun("deep-audit", "Audit", { manifest });
    const seamSteps = run.steps.filter(s => s.role === "Seam Auditor");
    assert.equal(seamSteps.length, 2);
    assert.equal(seamSteps[0].parcel, "comp-a-comp-b");
    assert.equal(seamSteps[1].parcel, "comp-b-comp-c");
  });

  it("includes non-scaling roles (Synthesizer + Critic)", () => {
    const run = createRun("deep-audit", "Audit", { manifest });
    const synth = run.steps.filter(s => s.role === "Audit Synthesizer");
    const critic = run.steps.filter(s => s.role === "Critic Reviewer");
    assert.ok(synth.length >= 1);
    assert.equal(critic.length, 1);
  });

  it("falls back to static steps without manifest", () => {
    const run = createRun("deep-audit", "Audit without manifest");
    assert.equal(run.dynamicDispatch, false);
    assert.equal(run.manifest, null);
    // Static artifactFlow has 6 steps
    assert.equal(run.steps.length, 6);
  });

  it("can execute dynamic run through full lifecycle", () => {
    const run = createRun("deep-audit", "Full test", { manifest });
    // Execute all steps
    for (let i = 0; i < run.steps.length; i++) {
      startNextStep(run);
      completeStep(run, `Artifact for step ${i}`);
    }
    assert.equal(run.status, "completed");
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, 11);
  });

  it("scales with larger manifests", () => {
    const bigManifest = {
      components: Array.from({ length: 10 }, (_, i) => ({ id: `comp-${i}`, lines: 1000 })),
      boundaries: Array.from({ length: 5 }, (_, i) => ({ from: `comp-${i}`, to: `comp-${i + 1}` })),
    };
    const run = createRun("deep-audit", "Big audit", { manifest: bigManifest });
    // 10 component + 10 test truth + 5 seam + 2 synth + 1 critic = 28
    assert.equal(run.steps.length, 28);
    assert.equal(run.steps.filter(s => s.role === "Component Auditor").length, 10);
    assert.equal(run.steps.filter(s => s.role === "Seam Auditor").length, 5);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("run id is unique per creation", () => {
    const run1 = createRun("bugfix", "test");
    const run2 = createRun("bugfix", "test");
    assert.notEqual(run1.id, run2.id);
  });

  it("generateCompletionReport works on running mission", () => {
    const run = createRun("bugfix", "test");
    startNextStep(run);
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "running");
    assert.ok(report.verdict.includes("still running"));
  });
});
