/**
 * Exit-condition regression — F-06e572d7 (wave-4 left this lock out of src).
 *
 * Coordinator health-a is a control, not metadata. Deleting
 * enforceExitCondition, stubbing it to always pass, or reverting
 * completeCurrentStep / completeStep to skip it must turn this file red.
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  evaluateExitCondition,
  enforceExitCondition,
} from "../src/swarm/exit-condition.mjs";
import {
  createRun,
  completeStep,
  assertGateApproval,
} from "../src/mission-run.mjs";
import {
  createPersistentRun,
  completeCurrentStep,
} from "../src/run.mjs";

const MANIFEST = {
  version: "1.0",
  repo: "exit-condition-fixture",
  repoType: "cli",
  domains: [
    { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**"], agentSlot: 0 },
  ],
  stages: ["health-a", "health-b", "health-c", "feature", "treatment"],
};

const OPEN_CRITICAL = JSON.stringify({
  domain: "backend",
  summary: "planted open CRITICAL for exit-condition regression",
  findings: [
    {
      id: "F-planted-crit",
      severity: "CRITICAL",
      status: "open",
      description: "planted open CRITICAL wave-report finding",
    },
  ],
});

const OPEN_HIGH = JSON.stringify({
  domain: "backend",
  summary: "planted open HIGH for exit-condition regression",
  findings: [
    {
      id: "F-planted-high",
      severity: "HIGH",
      status: "open",
      description: "planted open HIGH wave-report finding",
    },
  ],
});

const CLEAN = JSON.stringify({
  domain: "backend",
  summary: "0 open CRITICAL+HIGH",
  findings: [
    {
      id: "F-fixed-crit",
      severity: "CRITICAL",
      status: "fixed",
      description: "closed critical does not block",
    },
    {
      id: "F-open-medium",
      severity: "MEDIUM",
      status: "open",
      description: "open medium does not block health-a",
    },
  ],
});

const tmpDirs = [];

function makeTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-exit-cond-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

function swarmRun() {
  return createRun("dogfood-swarm", "exit-condition regression", { manifest: MANIFEST });
}

function plantWaveReports(run, stage, body) {
  const planted = [];
  for (const step of run.steps) {
    if (step.produces === "wave-report" && step.stage === stage) {
      step.status = "completed";
      step.artifact = body;
      planted.push(step);
    }
  }
  assert.ok(planted.length > 0, `${stage} wave-report step missing`);
  return planted;
}

function activateGate(run, stage) {
  const gate = run.steps.find((s) => s.isGate && s.stage === stage);
  assert.ok(gate, `${stage} coordinator gate missing`);
  gate.status = "active";
  // Isolate exitCondition from the sibling after-wave build gate.
  gate.buildGate = false;
  return gate;
}

function assertHealthARefuse(fn) {
  assert.throws(fn, (err) => {
    assert.match(err.message, /Cannot complete health-a gate/);
    assert.match(err.message, /CRITICAL|HIGH/);
    assert.equal(err.exitCode, 1);
    assert.ok(Array.isArray(err.blockingFindings) && err.blockingFindings.length >= 1);
    return true;
  });
}

describe("named exports (deleting enforceExitCondition must fail this module)", () => {
  it("evaluateExitCondition and enforceExitCondition are functions", () => {
    assert.equal(typeof evaluateExitCondition, "function");
    assert.equal(typeof enforceExitCondition, "function");
  });
});

describe("evaluateExitCondition against planted wave-reports", () => {
  it("fails health-a when a same-stage wave-report has open CRITICAL", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", OPEN_CRITICAL);
    const gate = run.steps.find((s) => s.isGate && s.stage === "health-a");
    const result = evaluateExitCondition({
      exitCondition: gate.exitCondition,
      steps: run.steps,
      stage: "health-a",
    });
    assert.equal(result.pass, false);
    assert.match(result.reason, /CRITICAL/);
    assert.ok(result.blocking.some((f) => f.id === "F-planted-crit"));
  });

  it("fails health-a when a same-stage wave-report has open HIGH", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", OPEN_HIGH);
    const gate = run.steps.find((s) => s.isGate && s.stage === "health-a");
    const result = evaluateExitCondition({
      exitCondition: gate.exitCondition,
      steps: run.steps,
      stage: "health-a",
    });
    assert.equal(result.pass, false);
    assert.match(result.reason, /HIGH/);
  });

  it("passes health-a when 0 CRITICAL+HIGH remain open", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", CLEAN);
    const gate = run.steps.find((s) => s.isGate && s.stage === "health-a");
    const result = evaluateExitCondition({
      exitCondition: gate.exitCondition,
      steps: run.steps,
      stage: "health-a",
    });
    assert.equal(result.pass, true);
    assert.equal(result.reason, null);
    assert.equal(result.blocking.length, 0);
  });
});

describe("enforceExitCondition", () => {
  it("throws on health-a with an open CRITICAL wave-report", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", OPEN_CRITICAL);
    const gate = activateGate(run, "health-a");
    assertHealthARefuse(() => enforceExitCondition({ step: gate, run }));
  });

  it("returns pass when health-a has 0 open CRITICAL+HIGH", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", CLEAN);
    const gate = activateGate(run, "health-a");
    const result = enforceExitCondition({ step: gate, run });
    assert.equal(result.pass, true);
    assert.ok(!result.skipped);
  });
});

describe("completeStep health-a gate", () => {
  it("refuses complete when the planted wave-report is open CRITICAL", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", OPEN_CRITICAL);
    activateGate(run, "health-a");
    assertHealthARefuse(() => completeStep(run, "swarm-gate", null, makeTmpDir()));
  });

  it("completes when 0 CRITICAL+HIGH are open", () => {
    const run = swarmRun();
    plantWaveReports(run, "health-a", CLEAN);
    const gate = activateGate(run, "health-a");
    const step = completeStep(run, "swarm-gate", null, makeTmpDir());
    assert.equal(step.status, "completed");
    assert.equal(gate.exitConditionResult.pass, true);
  });
});

describe("completeCurrentStep health-a gate", () => {
  it("throws when a dogfood-swarm health-a gate still has open CRITICAL", async () => {
    const cwd = makeTmpDir();
    const run = await createPersistentRun("dogfood swarm health pass", cwd, {
      forceMission: "dogfood-swarm",
      manifest: MANIFEST,
    });
    plantWaveReports(run, "health-a", OPEN_CRITICAL);
    activateGate(run, "health-a");
    assertHealthARefuse(() => completeCurrentStep(run, "swarm-gate", null, cwd));
  });

  it("completes the health-a gate when 0 CRITICAL+HIGH are open", async () => {
    const cwd = makeTmpDir();
    const run = await createPersistentRun("dogfood swarm health pass", cwd, {
      forceMission: "dogfood-swarm",
      manifest: MANIFEST,
    });
    plantWaveReports(run, "health-a", CLEAN);
    const gate = activateGate(run, "health-a");
    const step = completeCurrentStep(run, "swarm-gate", null, cwd);
    assert.equal(step.status, "completed");
    assert.equal(gate.exitConditionResult.pass, true);
  });
});

describe("userApproval vs health-a skip", () => {
  it("health-a (userApproval false) does not require swarm approve", () => {
    const run = swarmRun();
    const gate = run.steps.find((s) => s.isGate && s.stage === "health-a");
    assert.equal(gate.userApproval, false);
    assert.doesNotThrow(() => assertGateApproval(gate));
  });

  it("health-b complete without approve is denied", () => {
    const run = swarmRun();
    const gate = activateGate(run, "health-b");
    assert.equal(gate.userApproval, true);
    assert.notEqual(gate.userApprovalStatus, "approved");
    assert.throws(
      () => completeStep(run, "swarm-gate", null, makeTmpDir()),
      /Cannot complete health-b gate without user approval/,
    );
  });
});
