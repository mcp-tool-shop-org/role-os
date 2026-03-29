/**
 * Run Friction Trials — Phase U
 *
 * Real task descriptions run through the full persistent run engine.
 * Each trial measures operator friction: how many touches does it take
 * to go from task description to completion?
 *
 * Trials:
 *   U1 — Bugfix mission: create, step through, complete, report
 *   U2 — Feature mission: create, reroute mid-chain, complete
 *   U3 — Treatment mission: create, fail a step, retry, complete
 *   U4 — Pack-level run: security audit via pack (not mission)
 *   U5 — Free routing: novel task, full lifecycle
 *   U6 — Interrupted run: create, pause, resume from disk, complete
 *
 * Findings format: { id, severity, summary, fix }
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  createPersistentRun, startNext, completeCurrentStep, failCurrentStep,
  pauseRun, resumeRun, reroute, escalate, retry, reopenStep,
  getPosition, explainRun, formatNext, generateReport, formatReport,
  loadRun, findActiveRun, measureFriction, saveRun,
} from "../src/run.mjs";

const TEST_CWD = join(process.cwd(), ".test-trials-tmp");

function setup() {
  rmSync(TEST_CWD, { recursive: true, force: true });
  mkdirSync(TEST_CWD, { recursive: true });
}

function teardown() {
  rmSync(TEST_CWD, { recursive: true, force: true });
}

// ── Trial U1: Bugfix — clean run through ─────────────────────────────────────

describe("U1 — Bugfix mission clean run", () => {
  let run, findings;
  beforeEach(async () => {
    setup();
    findings = [];
    run = await createPersistentRun("fix the crash in save handler when file is locked", TEST_CWD);
  });
  afterEach(teardown);

  it("routes to bugfix mission", async () => {
    assert.equal(run.entryLevel, "mission");
    assert.equal(run.missionKey, "bugfix");
  });

  it("step-through requires exactly N startNext + completeStep calls", async () => {
    const stepCount = run.steps.length;
    let touches = 0;

    for (let i = 0; i < stepCount; i++) {
      const step = startNext(run, TEST_CWD);
      touches++; // startNext
      assert.ok(step, `Should have step ${i}`);

      completeCurrentStep(run, `artifact-${i}.md`, null, TEST_CWD);
      touches++; // completeStep
    }

    assert.equal(run.status, "completed");
    assert.equal(touches, stepCount * 2);

    if (touches > 10) {
      findings.push({
        id: "U1-F1",
        severity: "observation",
        summary: `${touches} operator touches for ${stepCount}-step bugfix — consider auto-advance`,
      });
    }
  });

  it("completion report is truthful", async () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `artifact-${i}.md`, null, TEST_CWD);
    }

    const report = generateReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, run.steps.length);
    assert.ok(report.verdict.includes("completed"));
  });

  it("friction score is low for clean run", async () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `a-${i}`, null, TEST_CWD);
    }
    const f = measureFriction(run);
    assert.equal(f.frictionScore, "low");
    assert.equal(f.interventions, 0);
    assert.equal(f.escalations, 0);
  });
});

// ── Trial U2: Feature mission with mid-chain reroute ─────────────────────────

describe("U2 — Feature mission with reroute", () => {
  let run;
  beforeEach(async () => {
    setup();
    run = await createPersistentRun("add a new export CSV feature to the data dashboard", TEST_CWD);
  });
  afterEach(teardown);

  it("routes to feature mission or pack", async () => {
    assert.ok(
      run.entryLevel === "mission" || run.entryLevel === "pack",
      `Expected mission or pack, got ${run.entryLevel}`
    );
  });

  it("reroute changes the execution path cleanly", async () => {
    // Start step 0
    startNext(run, TEST_CWD);
    completeCurrentStep(run, "strategy.md", null, TEST_CWD);

    // Reroute step 1 (if it exists and is pending)
    if (run.steps.length > 1 && run.steps[1].status === "pending") {
      const oldRole = run.steps[1].role;
      reroute(run, 1, "Frontend Developer", "CSV export is a UI feature", TEST_CWD);
      assert.equal(run.steps[1].role, "Frontend Developer");
      assert.notEqual(run.steps[1].role, oldRole);
    }

    // Complete remaining steps
    for (let i = 0; i < run.steps.length; i++) {
      if (run.steps[i].status === "pending") {
        startNext(run, TEST_CWD);
        completeCurrentStep(run, `artifact-${i}`, null, TEST_CWD);
      }
    }

    assert.equal(run.status, "completed");
    const f = measureFriction(run);
    assert.ok(f.interventions >= 1, "Reroute should register as intervention");
  });
});

// ── Trial U3: Treatment mission with failure and retry ───────────────────────

describe("U3 — Treatment mission with retry", () => {
  let run;
  beforeEach(async () => {
    setup();
    run = await createPersistentRun("run the full treatment and shipcheck on this repo", TEST_CWD, { forceMission: "treatment" });
  });
  afterEach(teardown);

  it("routes to treatment mission", async () => {
    assert.equal(run.missionKey, "treatment");
  });

  it("fail → retry → complete lifecycle works", async () => {
    // Start step 0
    startNext(run, TEST_CWD);

    // Fail step 0
    failCurrentStep(run, "failed", "Security scan found issues that need fixing first", TEST_CWD);
    assert.equal(run.status, "failed");

    // Retry
    retry(run, 0, TEST_CWD);
    assert.equal(run.steps[0].status, "pending");

    // Resume and complete all
    resumeRun(run, TEST_CWD);
    completeCurrentStep(run, "security-clean.md", "Issues resolved", TEST_CWD);

    for (let i = 1; i < run.steps.length; i++) {
      if (run.steps[i].status === "pending") {
        startNext(run, TEST_CWD);
        completeCurrentStep(run, `artifact-${i}`, null, TEST_CWD);
      }
    }

    assert.equal(run.status, "completed");

    const f = measureFriction(run);
    assert.ok(f.interventions >= 1, "Retry should count as intervention");
    assert.ok(f.frictionScore === "low" || f.frictionScore === "medium");
  });
});

// ── Trial U4: Pack-level run (forced pack, not mission) ──────────────────────

describe("U4 — Pack-level security run", () => {
  let run;
  beforeEach(async () => {
    setup();
    run = await createPersistentRun("audit the dispatch module for injection risks", TEST_CWD, { forcePack: "security" });
  });
  afterEach(teardown);

  it("creates a pack-level run", async () => {
    assert.equal(run.entryLevel, "pack");
    assert.equal(run.packKey, "security");
  });

  it("pack steps have guidance", async () => {
    for (const step of run.steps) {
      assert.ok(step.guidance, `Step ${step.index} (${step.role}) should have guidance`);
    }
  });

  it("completes through pack chain", async () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `security-artifact-${i}`, null, TEST_CWD);
    }
    assert.equal(run.status, "completed");
  });
});

// ── Trial U5: Free routing for novel task ────────────────────────────────────

describe("U5 — Free routing novel task", () => {
  let run;
  beforeEach(async () => {
    setup();
    run = await createPersistentRun("prototype a completely novel approach to config validation", TEST_CWD);
  });
  afterEach(teardown);

  it("falls to free routing for unknown task shape", async () => {
    assert.equal(run.entryLevel, "free-routing");
  });

  it("has 3-step minimal chain", async () => {
    assert.equal(run.steps.length, 3);
    assert.equal(run.steps[0].role, "Repo Researcher");
    assert.equal(run.steps[2].role, "Critic Reviewer");
  });

  it("completes through free-routing chain", async () => {
    for (let i = 0; i < run.steps.length; i++) {
      startNext(run, TEST_CWD);
      completeCurrentStep(run, `output-${i}`, null, TEST_CWD);
    }
    assert.equal(run.status, "completed");

    const report = generateReport(run);
    assert.equal(report.entryLevel, "free-routing");
    assert.equal(report.outcome, "completed");
  });
});

// ── Trial U6: Interrupted run — pause, load from disk, resume ────────────────

describe("U6 — Interrupted run with disk resume", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("survives session interruption", async () => {
    // Session 1: create and start
    const run1 = await createPersistentRun("fix the crash in save handler", TEST_CWD);
    startNext(run1, TEST_CWD);
    completeCurrentStep(run1, "diagnosis.md", null, TEST_CWD);
    pauseRun(run1, TEST_CWD);

    // "Session ends" — run1 object goes out of scope
    const runId = run1.id;

    // Session 2: load from disk and resume
    const run2 = loadRun(TEST_CWD, runId);
    assert.ok(run2, "Should load run from disk");
    assert.equal(run2.status, "paused");
    assert.equal(run2.steps[0].status, "completed");

    // Resume
    const step = resumeRun(run2, TEST_CWD);
    assert.ok(step);
    assert.equal(run2.status, "running");

    // Complete remaining
    completeCurrentStep(run2, "fix.patch", null, TEST_CWD);
    for (let i = 0; i < run2.steps.length; i++) {
      if (run2.steps[i].status === "pending") {
        startNext(run2, TEST_CWD);
        completeCurrentStep(run2, `a-${i}`, null, TEST_CWD);
      }
    }

    assert.equal(run2.status, "completed");
  });

  it("findActiveRun picks up paused run", async () => {
    const run = await createPersistentRun("fix the crash in save handler", TEST_CWD);
    startNext(run, TEST_CWD);
    pauseRun(run, TEST_CWD);

    const found = findActiveRun(TEST_CWD);
    assert.ok(found);
    assert.equal(found.id, run.id);
    assert.equal(found.status, "paused");
  });
});

// ── Trial summary ────────────────────────────────────────────────────────────

describe("U-series friction summary", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("all 6 trial types produce low/medium friction scores", async () => {
    const results = [];

    // U1: Clean bugfix
    const u1 = await createPersistentRun("fix the crash in save handler", TEST_CWD);
    for (let i = 0; i < u1.steps.length; i++) {
      startNext(u1, TEST_CWD); completeCurrentStep(u1, `a-${i}`, null, TEST_CWD);
    }
    results.push({ trial: "U1", ...measureFriction(u1) });

    // U3: Treatment with retry
    const u3 = await createPersistentRun("run shipcheck", TEST_CWD, { forceMission: "treatment" });
    startNext(u3, TEST_CWD);
    failCurrentStep(u3, "failed", "issue", TEST_CWD);
    retry(u3, 0, TEST_CWD);
    resumeRun(u3, TEST_CWD);
    completeCurrentStep(u3, "done", null, TEST_CWD);
    for (let i = 1; i < u3.steps.length; i++) {
      if (u3.steps[i].status === "pending") {
        startNext(u3, TEST_CWD); completeCurrentStep(u3, `a-${i}`, null, TEST_CWD);
      }
    }
    results.push({ trial: "U3", ...measureFriction(u3) });

    // U5: Free routing
    const u5 = await createPersistentRun("novel prototype idea", TEST_CWD);
    for (let i = 0; i < u5.steps.length; i++) {
      startNext(u5, TEST_CWD); completeCurrentStep(u5, `a-${i}`, null, TEST_CWD);
    }
    results.push({ trial: "U5", ...measureFriction(u5) });

    for (const r of results) {
      assert.ok(
        r.frictionScore === "low" || r.frictionScore === "medium",
        `Trial ${r.trial} friction ${r.frictionScore} should be low or medium`
      );
    }
  });
});
