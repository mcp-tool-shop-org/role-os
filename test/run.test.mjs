import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  createPersistentRun, startNext, completeCurrentStep, failCurrentStep,
  pauseRun, resumeRun, reroute, escalate, retry, blockStep, reopenStep,
  getPosition, explainRun, formatNext, generateReport, formatReport,
  saveRun, loadRun, listRuns, findActiveRun, measureFriction,
} from "../src/run.mjs";

const TEST_CWD = join(process.cwd(), ".test-runs-tmp");

function setup() {
  rmSync(TEST_CWD, { recursive: true, force: true });
  mkdirSync(TEST_CWD, { recursive: true });
}

function teardown() {
  rmSync(TEST_CWD, { recursive: true, force: true });
}

// ── Create run ───────────────────────────────────────────────────────────────

describe("createPersistentRun", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("creates a run from a bugfix task", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    assert.ok(run.id.startsWith("run-"));
    assert.equal(run.entryLevel, "mission");
    assert.equal(run.missionKey, "bugfix");
    assert.equal(run.status, "planning");
    assert.ok(run.steps.length >= 3);
    assert.ok(run.createdAt);
  });

  it("persists run to disk", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    const loaded = loadRun(TEST_CWD, run.id);
    assert.ok(loaded);
    assert.equal(loaded.id, run.id);
    assert.equal(loaded.taskDescription, run.taskDescription);
  });

  it("creates a run from a feature task → mission or pack", () => {
    const run = createPersistentRun("add a new export CSV feature to the dashboard", TEST_CWD);
    assert.ok(run.entryLevel === "mission" || run.entryLevel === "pack");
    assert.ok(run.steps.length >= 2);
  });

  it("creates a free-routing run for novel tasks", () => {
    const run = createPersistentRun("do something entirely unique and unprecedented", TEST_CWD);
    assert.equal(run.entryLevel, "free-routing");
    assert.equal(run.steps.length, 3); // minimal chain
  });

  it("accepts forceMission override", () => {
    const run = createPersistentRun("anything", TEST_CWD, { forceMission: "treatment" });
    assert.equal(run.entryLevel, "mission");
    assert.equal(run.missionKey, "treatment");
  });

  it("accepts forcePack override", () => {
    const run = createPersistentRun("anything", TEST_CWD, { forcePack: "security" });
    assert.equal(run.entryLevel, "pack");
    assert.equal(run.packKey, "security");
  });

  it("throws on empty task", () => {
    assert.throws(() => createPersistentRun("", TEST_CWD), /Task description required/);
  });

  it("throws on invalid forceMission", () => {
    assert.throws(() => createPersistentRun("x", TEST_CWD, { forceMission: "nonexistent" }), /not found/);
  });

  it("each step has guidance", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    for (const step of run.steps) {
      assert.ok(step.guidance, `Step ${step.index} (${step.role}) missing guidance`);
      assert.ok(step.guidance.includes("Role:"));
      assert.ok(step.guidance.includes("Produce:"));
    }
  });

  it("steps have correct initial state", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    for (const step of run.steps) {
      assert.equal(step.status, "pending");
      assert.equal(step.artifact, null);
      assert.equal(step.startedAt, null);
    }
  });
});

// ── Step lifecycle ───────────────────────────────────────────────────────────

describe("step lifecycle", () => {
  let run;
  beforeEach(() => {
    setup();
    run = createPersistentRun("fix the crash in save handler", TEST_CWD);
  });
  afterEach(teardown);

  it("startNext activates first pending step", () => {
    const step = startNext(run, TEST_CWD);
    assert.ok(step);
    assert.equal(step.status, "active");
    assert.equal(step.index, 0);
    assert.equal(run.status, "running");
  });

  it("startNext returns null when no pending steps", () => {
    // Make all steps completed
    for (const s of run.steps) { s.status = "completed"; }
    const result = startNext(run, TEST_CWD);
    assert.equal(result, null);
  });

  it("completeCurrentStep marks step completed", () => {
    startNext(run, TEST_CWD);
    const step = completeCurrentStep(run, "diagnosis.md", "Found root cause", TEST_CWD);
    assert.equal(step.status, "completed");
    assert.equal(step.artifact, "diagnosis.md");
    assert.equal(step.note, "Found root cause");
    assert.ok(step.completedAt);
  });

  it("completeCurrentStep throws when no active step", () => {
    assert.throws(() => completeCurrentStep(run, "x", null, TEST_CWD), /No active step/);
  });

  it("completeCurrentStep attaches artifact validation", () => {
    startNext(run, TEST_CWD);
    const step = completeCurrentStep(run, "## Diagnosis\nRoot cause.\n## Affected Files\nsrc/x.mjs", null, TEST_CWD);
    assert.ok(step.artifactValidation, "should attach validation result");
    assert.ok("valid" in step.artifactValidation);
  });

  it("completing all steps marks run completed", () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `artifact-${i}`, null, TEST_CWD);
    }
    assert.equal(run.status, "completed");
    assert.ok(run.completedAt);
  });

  it("failCurrentStep blocks downstream", () => {
    startNext(run, TEST_CWD);
    failCurrentStep(run, "failed", "Cannot find the bug", TEST_CWD);

    const blocked = run.steps.filter(s => s.status === "blocked");
    assert.ok(blocked.length >= 1, "Should have blocked downstream steps");
    assert.equal(run.status, "failed");
  });

  it("failCurrentStep with partial status", () => {
    startNext(run, TEST_CWD);
    failCurrentStep(run, "partial", "Found partial info", TEST_CWD);
    assert.equal(run.status, "partial");
  });

  it("failCurrentStep rejects invalid status", () => {
    startNext(run, TEST_CWD);
    assert.throws(() => failCurrentStep(run, "bogus", "reason", TEST_CWD), /Invalid fail status/);
  });
});

// ── Pause and resume ─────────────────────────────────────────────────────────

describe("pause and resume", () => {
  let run;
  beforeEach(() => {
    setup();
    run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    startNext(run, TEST_CWD);
  });
  afterEach(teardown);

  it("pauses a running run", () => {
    pauseRun(run, TEST_CWD);
    assert.equal(run.status, "paused");
    assert.ok(run.pausedAt);
  });

  it("resumes a paused run with active step", () => {
    pauseRun(run, TEST_CWD);
    const step = resumeRun(run, TEST_CWD);
    assert.equal(run.status, "running");
    assert.ok(step);
    assert.equal(step.status, "active");
    assert.equal(run.pausedAt, null);
  });

  it("resumes a paused run with no active step (starts next)", () => {
    completeCurrentStep(run, "done", null, TEST_CWD);
    pauseRun(run, TEST_CWD);
    const step = resumeRun(run, TEST_CWD);
    assert.ok(step);
    assert.equal(step.status, "active");
    assert.equal(step.index, 1);
  });

  it("throws when resuming non-paused run", () => {
    assert.throws(() => resumeRun(run, TEST_CWD), /Cannot resume/);
  });

  it("persists pause/resume state", () => {
    pauseRun(run, TEST_CWD);
    const loaded = loadRun(TEST_CWD, run.id);
    assert.equal(loaded.status, "paused");
  });
});

// ── Interventions ────────────────────────────────────────────────────────────

describe("interventions", () => {
  let run;
  beforeEach(() => {
    setup();
    run = createPersistentRun("fix the crash in save handler", TEST_CWD);
  });
  afterEach(teardown);

  describe("reroute", () => {
    it("changes a step's role", () => {
      const oldRole = run.steps[1].role;
      reroute(run, 1, "Frontend Developer", "Need frontend fix", TEST_CWD);
      assert.equal(run.steps[1].role, "Frontend Developer");
      assert.notEqual(run.steps[1].role, oldRole);
      assert.equal(run.interventions.length, 1);
      assert.equal(run.interventions[0].type, "reroute");
    });

    it("rejects reroute to nonexistent role", () => {
      assert.throws(() => reroute(run, 1, "FakeRole", "test", TEST_CWD), /not in catalog/);
    });

    it("rejects reroute of completed step", () => {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, "done", null, TEST_CWD);
      assert.throws(() => reroute(run, 0, "Frontend Developer", "too late", TEST_CWD), /Cannot reroute a completed/);
    });
  });

  describe("escalate", () => {
    it("re-opens a completed step", () => {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, "diagnosis", null, TEST_CWD);
      startNext(run, TEST_CWD);

      const result = escalate(run, run.steps[1].role, run.steps[0].role, "bad diagnosis", "redo", TEST_CWD);
      assert.equal(result.reopened, true);
      assert.equal(run.steps[0].status, "pending");
      assert.equal(run.escalations.length, 1);
    });

    it("warns when target role not in chain", () => {
      const result = escalate(run, "Test Engineer", "UI Designer", "need design", "redesign", TEST_CWD);
      assert.equal(result.reopened, false);
      assert.ok(result.warning);
      assert.ok(result.warning.includes("not in this run's chain"));
    });

    it("unblocks downstream steps when escalation re-opens", () => {
      // Complete step 0, start and fail step 1 (blocks step 2+)
      startNext(run, TEST_CWD);
      completeCurrentStep(run, "done", null, TEST_CWD);
      startNext(run, TEST_CWD);
      failCurrentStep(run, "failed", "broken", TEST_CWD);

      const blockedBefore = run.steps.filter(s => s.status === "blocked").length;
      assert.ok(blockedBefore > 0);

      // Escalate back to step 0 — should unblock downstream
      escalate(run, run.steps[1].role, run.steps[0].role, "re-analyze", "redo", TEST_CWD);
      const blockedAfter = run.steps.filter(s => s.status === "blocked").length;
      assert.ok(blockedAfter < blockedBefore);
    });
  });

  describe("retry", () => {
    it("retries a failed step", () => {
      startNext(run, TEST_CWD);
      failCurrentStep(run, "failed", "oops", TEST_CWD);

      retry(run, 0, TEST_CWD);
      assert.equal(run.steps[0].status, "pending");
      assert.equal(run.steps[0].artifact, null);
      assert.equal(run.interventions.length, 1);
    });

    it("unblocks downstream after retry", () => {
      startNext(run, TEST_CWD);
      failCurrentStep(run, "failed", "oops", TEST_CWD);
      const blockedBefore = run.steps.filter(s => s.status === "blocked").length;

      retry(run, 0, TEST_CWD);
      const blockedAfter = run.steps.filter(s => s.status === "blocked").length;
      assert.ok(blockedAfter < blockedBefore);
    });

    it("rejects retry of non-failed step", () => {
      assert.throws(() => retry(run, 0, TEST_CWD), /not failed\/partial/);
    });

    it("resets run status from failed to paused", () => {
      startNext(run, TEST_CWD);
      failCurrentStep(run, "failed", "oops", TEST_CWD);
      assert.equal(run.status, "failed");

      retry(run, 0, TEST_CWD);
      assert.equal(run.status, "paused");
    });
  });

  describe("block", () => {
    it("blocks a step with reason", () => {
      blockStep(run, 1, "Waiting for API spec", TEST_CWD);
      assert.equal(run.steps[1].status, "blocked");
      assert.equal(run.steps[1].note, "Waiting for API spec");
    });
  });

  describe("reopen", () => {
    it("reopens a completed step", () => {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, "done", null, TEST_CWD);

      reopenStep(run, 0, "Found issue in review", TEST_CWD);
      assert.equal(run.steps[0].status, "pending");
      assert.equal(run.steps[0].artifact, null);
    });

    it("rejects reopen of pending step", () => {
      assert.throws(() => reopenStep(run, 0, "test", TEST_CWD), /can only reopen/);
    });

    it("resets run status from completed to paused", () => {
      for (let i = 0; i < run.steps.length; i++) {
        startNext(run, TEST_CWD);
        completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
      }
      assert.equal(run.status, "completed");

      reopenStep(run, 0, "redo", TEST_CWD);
      assert.equal(run.status, "paused");
    });
  });
});

// ── Introspection ────────────────────────────────────────────────────────────

describe("introspection", () => {
  let run;
  beforeEach(() => {
    setup();
    run = createPersistentRun("fix the crash in save handler", TEST_CWD);
  });
  afterEach(teardown);

  it("getPosition returns correct state", () => {
    const pos = getPosition(run);
    assert.equal(pos.completedCount, 0);
    assert.ok(pos.totalSteps >= 3);
    assert.equal(pos.activeStep, null);
    assert.ok(pos.nextStep);
  });

  it("getPosition shows active step", () => {
    startNext(run, TEST_CWD);
    const pos = getPosition(run);
    assert.ok(pos.activeStep);
    assert.equal(pos.activeStep.index, 0);
  });

  it("explainRun produces readable output", () => {
    startNext(run, TEST_CWD);
    const text = explainRun(run);
    assert.ok(text.includes("Run:"));
    assert.ok(text.includes("Task:"));
    assert.ok(text.includes("Steps"));
    assert.ok(text.includes("[>]"));
    assert.ok(text.includes("Current Step Guidance"));
  });

  it("formatNext shows active step guidance", () => {
    startNext(run, TEST_CWD);
    const text = formatNext(run);
    assert.ok(text.includes("Active:"));
    assert.ok(text.includes("Repo Researcher"));
  });

  it("formatNext shows completion message", () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
    }
    const text = formatNext(run);
    assert.ok(text.includes("completed"));
  });
});

// ── Completion report ────────────────────────────────────────────────────────

describe("completion report", () => {
  let run;
  beforeEach(() => {
    setup();
    run = createPersistentRun("fix the crash in save handler", TEST_CWD);
  });
  afterEach(teardown);

  it("generates report for completed run", () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `artifact-${i}`, null, TEST_CWD);
    }
    const report = generateReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, run.steps.length);
    assert.ok(report.verdict.includes("completed"));
  });

  it("generates report for failed run with honest-partial", () => {
    startNext(run, TEST_CWD);
    failCurrentStep(run, "failed", "cannot reproduce", TEST_CWD);
    const report = generateReport(run);
    assert.equal(report.outcome, "failed");
    assert.ok(report.verdict.includes("failed"));
  });

  it("formatReport produces readable output", () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `artifact-${i}`, null, TEST_CWD);
    }
    const report = generateReport(run);
    const text = formatReport(report);
    assert.ok(text.includes("Run Report"));
    assert.ok(text.includes("Verdict"));
    assert.ok(text.includes("[x]"));
  });
});

// ── Persistence ──────────────────────────────────────────────────────────────

describe("persistence", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("listRuns returns all runs sorted by newest first", () => {
    createPersistentRun("task one", TEST_CWD);
    createPersistentRun("task two", TEST_CWD);
    const list = listRuns(TEST_CWD);
    assert.equal(list.length, 2);
    // Newest first
    assert.ok(list[0].createdAt >= list[1].createdAt);
  });

  it("listRuns returns empty array when no runs", () => {
    const list = listRuns(TEST_CWD);
    assert.equal(list.length, 0);
  });

  it("findActiveRun finds running run", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    startNext(run, TEST_CWD);
    const found = findActiveRun(TEST_CWD);
    assert.ok(found);
    assert.equal(found.id, run.id);
  });

  it("findActiveRun finds paused run", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    startNext(run, TEST_CWD);
    pauseRun(run, TEST_CWD);
    const found = findActiveRun(TEST_CWD);
    assert.ok(found);
    assert.equal(found.status, "paused");
  });

  it("findActiveRun returns null when all runs completed", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
    }
    const found = findActiveRun(TEST_CWD);
    assert.equal(found, null);
  });

  it("loadRun returns null for nonexistent run", () => {
    const result = loadRun(TEST_CWD, "nonexistent");
    assert.equal(result, null);
  });

  it("round-trips full run state through disk", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    startNext(run, TEST_CWD);
    completeCurrentStep(run, "diagnosis.md", "Root cause found", TEST_CWD);
    reroute(run, 1, "Frontend Developer", "UI bug", TEST_CWD);

    const loaded = loadRun(TEST_CWD, run.id);
    assert.equal(loaded.steps[0].status, "completed");
    assert.equal(loaded.steps[0].artifact, "diagnosis.md");
    assert.equal(loaded.steps[1].role, "Frontend Developer");
    assert.equal(loaded.interventions.length, 1);
  });
});

// ── Friction measurement ─────────────────────────────────────────────────────

describe("friction measurement", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("measures friction for a clean run", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
    }
    const f = measureFriction(run);
    assert.equal(f.interventions, 0);
    assert.equal(f.escalations, 0);
    assert.equal(f.frictionScore, "low");
  });

  it("measures friction for a run with interventions", () => {
    const run = createPersistentRun("fix bug", TEST_CWD);
    startNext(run, TEST_CWD);
    failCurrentStep(run, "failed", "oops", TEST_CWD);
    retry(run, 0, TEST_CWD);
    startNext(run, TEST_CWD);
    completeCurrentStep(run, "done", null, TEST_CWD);

    const f = measureFriction(run);
    assert.ok(f.interventions >= 1);
    assert.ok(f.totalTouches > run.steps.length);
  });
});

// ── End-to-end lifecycle ─────────────────────────────────────────────────────

describe("end-to-end lifecycle", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("full lifecycle: create → start → complete all → report", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    assert.equal(run.status, "planning");

    // Step through all steps
    for (let i = 0; i < run.steps.length; i++) {
      const step = startNext(run, TEST_CWD);
      assert.ok(step, `Step ${i} should start`);
      assert.equal(step.status, "active");
      completeCurrentStep(run, `artifact-${i}.md`, `Step ${i} done`, TEST_CWD);
    }

    assert.equal(run.status, "completed");

    // Generate report
    const report = generateReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, run.steps.length);

    // Format report
    const text = formatReport(report);
    assert.ok(text.includes("completed"));

    // Friction
    const f = measureFriction(run);
    assert.equal(f.frictionScore, "low");

    // Persisted
    const loaded = loadRun(TEST_CWD, run.id);
    assert.equal(loaded.status, "completed");
  });

  it("lifecycle with failure, retry, and recovery", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);

    // Start and fail step 0
    startNext(run, TEST_CWD);
    failCurrentStep(run, "failed", "cannot find code", TEST_CWD);
    assert.equal(run.status, "failed");

    // Retry step 0
    retry(run, 0, TEST_CWD);
    assert.equal(run.status, "paused");

    // Resume and complete
    resumeRun(run, TEST_CWD);
    completeCurrentStep(run, "found-it.md", null, TEST_CWD);

    // Complete remaining
    for (let i = 1; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
    }

    assert.equal(run.status, "completed");
    const f = measureFriction(run);
    assert.ok(f.interventions >= 1);
  });

  it("lifecycle with pause and resume", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);
    startNext(run, TEST_CWD);

    // Pause mid-step
    pauseRun(run, TEST_CWD);
    assert.equal(run.status, "paused");

    // Resume from disk
    const loaded = loadRun(TEST_CWD, run.id);
    const step = resumeRun(loaded, TEST_CWD);
    assert.ok(step);
    assert.equal(loaded.status, "running");
  });

  it("lifecycle with escalation loop", () => {
    const run = createPersistentRun("fix the crash in save handler", TEST_CWD);

    // Complete step 0 and 1
    startNext(run, TEST_CWD);
    completeCurrentStep(run, "diagnosis", null, TEST_CWD);
    startNext(run, TEST_CWD);
    completeCurrentStep(run, "fix.patch", null, TEST_CWD);

    // Step 2 (Test Engineer) finds issue — escalate back to step 0
    startNext(run, TEST_CWD);
    const result = escalate(run, run.steps[2].role, run.steps[0].role, "missed edge case", "re-diagnose", TEST_CWD);
    assert.equal(result.reopened, true);
    assert.equal(run.steps[0].status, "pending");

    // Re-run from step 0
    completeCurrentStep(run, "tests.md", null, TEST_CWD); // finish step 2 first
    startNext(run, TEST_CWD); // re-start step 0
    completeCurrentStep(run, "better-diagnosis", null, TEST_CWD);
  });
});
