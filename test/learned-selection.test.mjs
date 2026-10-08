import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  recordOutcome,
  readOutcomes,
  wilsonInterval,
  computeCombinationStats,
  summarizePack,
  evidenceRows,
  calibrationSnapshot,
  formatPackEvidence,
  formatCombinationTable,
  terminalStatus,
  outcomeFromRun,
  recordRunOutcome,
  taskKindOf,
  formatCalibrationReport,
  computeCalibration,
} from "../src/calibration.mjs";
import { suggestPack } from "../src/packs.mjs";
import { createRun, startNextStep, completeStep, failStep } from "../src/mission-run.mjs";
import {
  completeCurrentStep,
  failCurrentStep,
  blockStep,
  abandonRun,
  pauseRun,
  startNext,
  createPersistentRun,
} from "../src/run.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, "bin", "roleos.mjs");
const REPO_LEDGER = join(ROOT, ".claude", "calibration", "outcome-ledger.jsonl");
const TIE = "build a new bug fix";
const WILSON_7_OF_10 = Object.freeze({
  low: 0.39677814746114537,
  high: 0.8922087325936989,
});

const dirs = [];
let seq = 0;

function scratch() {
  const dir = join(tmpdir(), `roleos-learned-${process.pid}-${++seq}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (!Object.prototype.hasOwnProperty.call(extra, "ROLEOS_NO_CALIBRATION")) {
    delete env.ROLEOS_NO_CALIBRATION;
  }
  return env;
}

function cli(args, cwd, extraEnv) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: childEnv(extraEnv),
    timeout: 20000,
  });
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
}

function bugfixRuns(n, status = "completed", extra = {}) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      runId: `bug-${status}-${extra.rejectedVerdicts || 0}-${i}-${++seq}`,
      timestamp: "2026-01-01T00:00:00.000Z",
      packetFile: null,
      detectedType: null,
      suggestedPack: extra.selectedPack || "bugfix",
      suggestedConfidence: "medium",
      selectedPack: extra.selectedPack || "bugfix",
      missionKey: Object.prototype.hasOwnProperty.call(extra, "missionKey") ? extra.missionKey : null,
      operatorOverride: false,
      mismatchRedirect: false,
      mismatchFrom: null,
      mismatchTo: null,
      chainLength: 2,
      escalations: 0,
      rejectedVerdicts: extra.rejectedVerdicts || 0,
      corrections: extra.corrections || 0,
      completionStatus: status,
      rolesUsed: extra.rolesUsed || ["Backend Engineer", "Critic Reviewer"],
    });
  }
  return rows;
}

function running(steps, extra = {}) {
  return {
    id: extra.id || `run-${++seq}`,
    taskDescription: TIE,
    entryLevel: "pack",
    missionKey: extra.missionKey ?? null,
    packKey: Object.prototype.hasOwnProperty.call(extra, "packKey") ? extra.packKey : "bugfix",
    entryDecision: Object.prototype.hasOwnProperty.call(extra, "entryDecision")
      ? extra.entryDecision
      : {
          level: "pack",
          confidence: 0.5,
          pack: { key: "feature" },
          mission: null,
          alternative: null,
        },
    status: extra.status || "running",
    steps,
    escalations: extra.escalations || [],
    interventions: extra.interventions || [],
    createdAt: "2026-01-01T00:00:00.000Z",
    pausedAt: null,
    completedAt: null,
    packetFile: extra.packetFile ?? null,
    detectedType: extra.detectedType ?? null,
    operatorOverride: extra.operatorOverride === true,
  };
}

function step(role, status) {
  return { index: 0, role, produces: "artifact", status, artifact: null, note: null };
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  assert.equal(existsSync(REPO_LEDGER), false);
});

describe("outcome recording", () => {
  it("writes one line per run id and keeps the first body", () => {
    const cwd = scratch();
    const first = bugfixRuns(1)[0];
    assert.equal(recordOutcome(first, cwd), true);
    assert.equal(recordOutcome({ ...first, selectedPack: "feature" }, cwd), false);
    const rows = readOutcomes(cwd);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].selectedPack, "bugfix");
    assert.equal(typeof rows[0].recordedAt, "string");
  });

  it("still appends a line that has no run id", () => {
    const cwd = scratch();
    const row = bugfixRuns(1)[0];
    delete row.runId;
    assert.equal(recordOutcome(row, cwd), true);
    assert.equal(recordOutcome(row, cwd), true);
    assert.equal(readOutcomes(cwd).length, 2);
  });

  it("does not record a step while the run can still move", () => {
    const cwd = scratch();
    const run = running([
      step("Backend Engineer", "active"),
      { ...step("Critic Reviewer", "pending"), index: 1 },
    ]);
    completeCurrentStep(run, "fix applied", null, cwd);
    assert.notEqual(run.status, "completed");
    assert.equal(readOutcomes(cwd).length, 0);
    assert.equal(recordRunOutcome(run, cwd), false);
  });

  it("records completed once, with the run's fields, and ignores a second write", () => {
    const cwd = scratch();
    const run = running(
      [
        step("Backend Engineer", "active"),
        { ...step("Docs Architect", "skipped"), index: 1 },
      ],
      { escalations: [{ from: "A", to: "B" }] },
    );
    completeCurrentStep(run, "done", "Reject the patch", cwd);
    const rows = readOutcomes(cwd);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].runId, run.id);
    assert.equal(rows[0].completionStatus, "completed");
    assert.equal(rows[0].selectedPack, "bugfix");
    assert.equal(rows[0].suggestedPack, "feature");
    assert.equal(rows[0].suggestedConfidence, "medium");
    assert.equal(rows[0].operatorOverride, true);
    assert.equal(rows[0].missionKey, null);
    assert.equal(rows[0].escalations, 1);
    assert.equal(rows[0].rejectedVerdicts, 1);
    assert.equal(rows[0].corrections, 0);
    assert.deepEqual(rows[0].rolesUsed, ["Backend Engineer"]);
    assert.equal(rows[0].timestamp, run.completedAt);
    assert.equal(rows[0].mismatchRedirect, false);
    assert.equal(rows[0].mismatchFrom, null);
    assert.equal(rows[0].mismatchTo, null);
    assert.equal(recordRunOutcome(run, cwd), false);
    assert.equal(readOutcomes(cwd).length, 1);
  });

  it("records failed and partial, and refuses to abandon either", () => {
    const failedDir = scratch();
    const failed = running([
      step("Backend Engineer", "active"),
      { ...step("Critic Reviewer", "pending"), index: 1 },
    ]);
    failCurrentStep(failed, "failed", "cannot reproduce", failedDir);
    assert.equal(failed.status, "failed");
    assert.equal(readOutcomes(failedDir)[0].completionStatus, "failed");
    assert.equal(failed.steps[1].status, "blocked");
    assert.throws(() => abandonRun(failed, failedDir), /first end state/);
    assert.equal(readOutcomes(failedDir).length, 1);
    assert.equal(readOutcomes(failedDir)[0].completionStatus, "failed");

    const partialDir = scratch();
    const partial = running([step("Backend Engineer", "active")]);
    failCurrentStep(partial, "partial", "need a repro", partialDir);
    assert.equal(partial.status, "partial");
    assert.equal(readOutcomes(partialDir)[0].completionStatus, "partial");
    assert.equal(recordRunOutcome(partial, partialDir), false);
  });

  it("records blocked only when nothing is left to run, and does not change run status", () => {
    const openDir = scratch();
    const open = running([
      step("Backend Engineer", "active"),
      { ...step("Critic Reviewer", "pending"), index: 1 },
    ]);
    blockStep(open, 0, "waiting", openDir);
    assert.equal(open.status, "running");
    assert.equal(readOutcomes(openDir).length, 0);

    const cwd = scratch();
    const run = running([
      { ...step("Backend Engineer", "completed"), index: 0 },
      { ...step("Critic Reviewer", "active"), index: 1 },
    ]);
    blockStep(run, 1, "waiting on the operator", cwd);
    assert.equal(run.status, "running");
    const rows = readOutcomes(cwd);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].completionStatus, "blocked");
    assert.equal(rows[0].corrections, 0);
  });

  it("records abandoned once, and will not rewrite a completed run", () => {
    const cwd = scratch();
    const run = running([step("Backend Engineer", "active")]);
    pauseRun(run, cwd);
    assert.equal(run.status, "paused");
    assert.equal(readOutcomes(cwd).length, 0);
    run.status = "running";
    const abandoned = abandonRun(run, cwd);
    assert.equal(abandoned.status, "abandoned");
    assert.equal(readOutcomes(cwd)[0].completionStatus, "abandoned");
    assert.equal(abandonRun(run, cwd), run);
    assert.equal(readOutcomes(cwd).length, 1);

    const doneDir = scratch();
    const done = running([step("Backend Engineer", "active")]);
    completeCurrentStep(done, "done", null, doneDir);
    assert.throws(() => abandonRun(done, doneDir), /first end state/);
    assert.equal(done.status, "completed");
    assert.equal(readOutcomes(doneDir).length, 1);
    assert.equal(readOutcomes(doneDir)[0].completionStatus, "completed");
  });

  it("does not write when cwd is missing", () => {
    const run = running([step("Backend Engineer", "completed")], { status: "completed" });
    run.completedAt = "2026-01-01T00:00:00.000Z";
    assert.equal(recordRunOutcome(run), false);
    assert.equal(recordRunOutcome(run, ""), false);
  });

  it("records a mission outcome only when the caller passes a directory", () => {
    const silent = createRun("docs-release", "write the handbook");
    startNextStep(silent);
    completeStep(silent, "docs body");
    const silentFail = createRun("docs-release", "write the handbook");
    startNextStep(silentFail);
    failStep(silentFail, "failed", "upstream missing");
    assert.equal(existsSync(REPO_LEDGER), false);

    const cwd = scratch();
    const early = createRun("docs-release", "write the handbook");
    startNextStep(early);
    completeStep(early, "docs body", null, cwd);
    assert.equal(early.status, "running");
    assert.equal(readOutcomes(cwd).length, 0);
    startNextStep(early);
    completeStep(early, "accepted", null, cwd);
    const done = readOutcomes(cwd);
    assert.equal(done.length, 1);
    assert.equal(done[0].completionStatus, "completed");
    assert.equal(done[0].missionKey, "docs-release");
    assert.equal(done[0].selectedPack, "docs");
    assert.equal(done[0].suggestedPack, "docs");
    assert.equal(early.packKey, undefined);
    assert.deepEqual(done[0].rolesUsed, ["Critic Reviewer", "Docs Architect"]);
    assert.equal(recordRunOutcome({ ...early, packKey: "docs" }, cwd), false);
    assert.equal(readOutcomes(cwd).length, 1);

    const failedDir = scratch();
    const failed = createRun("docs-release", "write the handbook");
    startNextStep(failed);
    failStep(failed, "failed", "upstream missing", failedDir);
    assert.equal(readOutcomes(failedDir)[0].completionStatus, "failed");
    assert.equal(readOutcomes(failedDir)[0].selectedPack, "docs");
    assert.equal(failed.packKey, undefined);

    const partialDir = scratch();
    const partial = createRun("docs-release", "write the handbook");
    startNextStep(partial);
    failStep(partial, "partial", "pages still open", partialDir);
    assert.equal(readOutcomes(partialDir)[0].completionStatus, "partial");
  });

  it("records the mission pack when the run itself has no pack", () => {
    const bare = {
      id: "mission-bare",
      status: "completed",
      missionKey: "bugfix",
      packKey: null,
      steps: [{ role: "Repo Researcher", status: "completed" }],
      escalations: [],
      interventions: [],
      entryDecision: {
        level: "mission",
        confidence: 0.9,
        mission: { key: "bugfix", pack: "bugfix" },
        pack: null,
      },
    };
    const row = outcomeFromRun(bare);
    assert.equal(row.selectedPack, "bugfix");
    assert.equal(row.missionKey, "bugfix");
    assert.equal(row.operatorOverride, false);
    assert.equal(bare.packKey, null);

    const kept = outcomeFromRun({ ...bare, id: "kept", packKey: "feature" });
    assert.equal(kept.selectedPack, "feature");

    const unknown = outcomeFromRun({
      ...bare,
      id: "unknown",
      missionKey: "not-a-mission",
      entryDecision: { level: "mission", mission: { key: "not-a-mission" }, pack: null },
    });
    assert.equal(unknown.selectedPack, null);

    function missionRun(steps, extra = {}) {
      return running(steps, {
        missionKey: "bugfix",
        packKey: null,
        entryDecision: {
          level: "mission",
          confidence: 0.9,
          mission: { key: "bugfix", pack: "bugfix" },
          pack: null,
          alternative: { level: "pack", key: "bugfix", confidence: 0.5 },
        },
        ...extra,
      });
    }

    const failedDir = scratch();
    const failed = missionRun([step("Repo Researcher", "active")]);
    failCurrentStep(failed, "failed", "cannot reproduce", failedDir);
    assert.equal(failed.packKey, null);
    assert.equal(readOutcomes(failedDir)[0].selectedPack, "bugfix");
    assert.equal(readOutcomes(failedDir)[0].completionStatus, "failed");

    const blockedDir = scratch();
    const blocked = missionRun([step("Repo Researcher", "active")]);
    blockStep(blocked, 0, "waiting", blockedDir);
    assert.equal(blocked.packKey, null);
    assert.equal(readOutcomes(blockedDir)[0].selectedPack, "bugfix");
    assert.equal(readOutcomes(blockedDir)[0].completionStatus, "blocked");

    const abandonedDir = scratch();
    const abandoned = missionRun([step("Repo Researcher", "pending")], { status: "planning" });
    abandonRun(abandoned, abandonedDir);
    assert.equal(abandoned.packKey, null);
    assert.equal(readOutcomes(abandonedDir)[0].selectedPack, "bugfix");
    assert.equal(readOutcomes(abandonedDir)[0].completionStatus, "abandoned");
  });
});

describe("combination stats", () => {
  it("matches the Wilson 95% interval for 7 of 10", () => {
    const direct = wilsonInterval(7, 10);
    near(direct.low, WILSON_7_OF_10.low);
    near(direct.high, WILSON_7_OF_10.high);
    const bounds = wilsonInterval(0, 5);
    near(bounds.low, 0);
    near(bounds.high, 0.43448246478317476);
    const full = wilsonInterval(5, 5);
    near(full.low, 0.5655175352168251);
    near(full.high, 1);
    assert.equal(wilsonInterval(-1, 5), null);
    assert.equal(wilsonInterval(6, 5), null);
    assert.equal(wilsonInterval(1, 0), null);
    assert.equal(wilsonInterval(Number.NaN, 5), null);

    const sample = bugfixRuns(7).concat(bugfixRuns(3, "failed"));
    const stats = computeCombinationStats(sample);
    assert.equal(stats.length, 1);
    assert.equal(stats[0].runs, 10);
    assert.equal(stats[0].completed, 7);
    assert.equal(stats[0].clean, 7);
    assert.equal(stats[0].status, "measured");
    near(stats[0].cleanRate, 0.7);
    near(stats[0].interval.low, WILSON_7_OF_10.low);
    near(stats[0].interval.high, WILSON_7_OF_10.high);
    assert.match(
      formatPackEvidence(evidenceRows(sample)),
      /bugfix: boost \+2, 10 runs, clean rate 0\.700 \[0\.397, 0\.892\]/,
    );
  });

  it("withholds the rate below minRuns and merges roles whatever order they were stored", () => {
    const few = computeCombinationStats(bugfixRuns(4));
    assert.equal(few[0].runs, 4);
    assert.equal(few[0].status, "insufficient data");
    assert.equal(few[0].cleanRate, null);
    assert.equal(few[0].interval, null);
    const hidden = formatPackEvidence(evidenceRows(bugfixRuns(4)));
    assert.match(hidden, /bugfix: boost \+0, 4 runs, insufficient data/);
    assert.doesNotMatch(hidden, /clean rate/);
    assert.match(formatPackEvidence(evidenceRows(bugfixRuns(1))), /1 run, insufficient data/);

    const mixedOrder = bugfixRuns(3, "completed", { rolesUsed: ["Zed", "Ann"] })
      .concat(bugfixRuns(3, "completed", { rolesUsed: ["Ann", "Zed"] }));
    const merged = computeCombinationStats(mixedOrder);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].runs, 6);
    assert.equal(merged[0].status, "measured");
    assert.deepEqual(merged[0].roles, ["Ann", "Zed"]);

    const negative = computeCombinationStats(bugfixRuns(1), { minRuns: -1 });
    assert.equal(negative[0].status, "insufficient data");
    const pack = summarizePack(bugfixRuns(1), "bugfix", { bugfix: 0.5 }, -1);
    assert.equal(pack.status, "insufficient data");
    assert.equal(pack.boost, 0);
    assert.equal(pack.cleanRate, null);
  });

  it("does not call a completed run clean when it has corrections", () => {
    const rows = bugfixRuns(5, "completed", { corrections: 1 });
    const stats = computeCombinationStats(rows);
    assert.equal(stats.length, 1);
    assert.equal(stats[0].completed, 5);
    assert.equal(stats[0].clean, 0);
    assert.equal(stats[0].status, "measured");
    assert.equal(stats[0].cleanRate, 0);
    const table = formatCombinationTable(stats);
    assert.match(table, /\| 0 clean \|/);
    assert.doesNotMatch(table, /1\.000/);
    const evidence = evidenceRows(rows);
    assert.equal(evidence[0].pack, "bugfix");
    assert.equal(evidence[0].clean, 0);
    assert.equal(evidence[0].boost, 0);
    assert.equal(suggestPack(TIE, { outcomes: rows, env: {} }).pack, "feature");
  });

  it("keys a mission ahead of its pack, and says free-routing when neither is set", () => {
    const mission = computeCombinationStats([
      bugfixRuns(1, "completed", { missionKey: "docs-release", selectedPack: "docs" })[0],
    ]);
    assert.equal(mission[0].taskKind, "docs-release");
    assert.equal(taskKindOf({ suggestedPack: "feature" }), "feature");
    assert.equal(taskKindOf({}), "free-routing");
    assert.equal(computeCombinationStats(null).length, 0);
    const loose = computeCombinationStats([null, { rolesUsed: "nope" }]);
    assert.equal(loose.length, 1);
    assert.equal(loose[0].taskKind, "free-routing");
    assert.deepEqual(loose[0].roles, []);
  });

  it("prints an empty ledger as a sentence", () => {
    assert.equal(formatPackEvidence([]), "Calibration: no recorded runs yet");
    assert.equal(calibrationSnapshot({ outcomes: [] }).text, "Calibration: no recorded runs yet");
    assert.match(calibrationSnapshot({ outcomes: [{ runId: "only" }] }).text, /1 recorded run, none named a pack/);
    assert.match(calibrationSnapshot({ outcomes: [{}, {}] }).text, /2 recorded runs, none named a pack/);
    const off = calibrationSnapshot({
      outcomes: bugfixRuns(5),
      env: { ROLEOS_NO_CALIBRATION: "1" },
    });
    assert.equal(off.disabled, true);
    assert.equal(off.evidence.length, 0);
    assert.match(off.text, /Calibration off \(ROLEOS_NO_CALIBRATION=1\)/);
    assert.match(formatCombinationTable([]), /no combinations/);
    assert.match(
      formatCombinationTable([{
        taskKind: "bugfix",
        roles: [],
        runs: 5,
        completed: 5,
        clean: 5,
        status: "measured",
        cleanRate: 1,
        interval: { low: 0.5655175352168251, high: 1 },
      }]),
      /\(no roles\)/,
    );
    assert.match(
      formatPackEvidence([{ pack: "bugfix", status: "measured", runs: 5, cleanRate: 1, interval: { low: 0.5, high: 1 }, boost: Number.NaN }]),
      /boost \+0/,
    );
  });
});

describe("learned pack boost", () => {
  it("leaves keyword routing unchanged when the ledger is empty", () => {
    const quiet = { outcomes: [], env: {} };
    assert.equal(suggestPack("Hello world.", quiet), null);
    const feature = suggestPack(
      "Build a new feature to implement user authentication and create the login UI.",
      quiet,
    );
    assert.equal(feature.pack, "feature");
    assert.equal(feature.confidence, "high");
    assert.equal(suggestPack(TIE, quiet).pack, "feature");
    assert.equal(suggestPack(TIE, quiet).confidence, "medium");
    assert.deepEqual(suggestPack(TIE, quiet).scores, { feature: 2, bugfix: 2 });
  });

  it("breaks a keyword tie only after minRuns, and keeps confidence on the keyword score", () => {
    const env = {};
    const four = suggestPack(TIE, { outcomes: bugfixRuns(4), env });
    assert.equal(four.pack, "feature");
    assert.equal(four.evidence.find((row) => row.pack === "bugfix").boost, 0);
    assert.equal(four.evidence.find((row) => row.pack === "bugfix").cleanRate, null);

    const five = suggestPack(TIE, { outcomes: bugfixRuns(5), env });
    assert.equal(five.pack, "bugfix");
    assert.equal(five.confidence, "medium");
    assert.deepEqual(five.scores, { feature: 2, bugfix: 2 });
    assert.equal(five.evidence.find((row) => row.pack === "bugfix").boost, 2);

    const opened = suggestPack(TIE, { outcomes: bugfixRuns(4), minRuns: 4, env });
    assert.equal(opened.pack, "bugfix");

    const mixed = bugfixRuns(4).concat(bugfixRuns(1, "failed"));
    assert.equal(suggestPack(TIE, { outcomes: mixed, env }).pack, "bugfix");
    assert.equal(suggestPack(TIE, { outcomes: bugfixRuns(5, "failed"), env }).pack, "feature");

    const rejected = bugfixRuns(5, "completed", { rejectedVerdicts: 1 });
    const rejectedPick = suggestPack(TIE, { outcomes: rejected, env });
    assert.equal(rejectedPick.pack, "bugfix");
    assert.equal(rejectedPick.evidence.find((row) => row.pack === "bugfix").clean, 0);
    assert.equal(rejectedPick.evidence.find((row) => row.pack === "bugfix").boost, 2);

    const half = bugfixRuns(1).concat(bugfixRuns(4, "failed"));
    const halfPick = suggestPack(TIE, { outcomes: half, env });
    assert.equal(halfPick.pack, "bugfix");
    assert.equal(halfPick.evidence.find((row) => row.pack === "bugfix").boost, 0.5);

    const launch = bugfixRuns(5, "completed", { selectedPack: "launch" });
    assert.equal(suggestPack(TIE, { outcomes: launch, env }).pack, "feature");
  });

  it("never suggests a boosted pack the keywords did not hit", () => {
    const launch = bugfixRuns(5, "completed", { selectedPack: "launch" });
    const env = {};
    assert.equal(suggestPack("Hello world.", { outcomes: launch, env }), null);
    const crash = suggestPack("crash", { outcomes: launch, env });
    assert.equal(crash.pack, "bugfix");
    assert.equal(crash.confidence, "low");
    assert.equal(crash.scores.bugfix, 1);
    assert.equal(crash.scores.launch, undefined);
    assert.equal(Object.keys(crash.scores).includes("launch"), false);
  });

  it("ignores a passed-in ledger when the kill switch is on", () => {
    const off = suggestPack(TIE, {
      outcomes: bugfixRuns(5),
      env: { ROLEOS_NO_CALIBRATION: "1" },
    });
    assert.equal(off.pack, "feature");
    assert.equal(off.calibration, "off");
    assert.equal(off.evidence.length, 0);

    const previous = process.env.ROLEOS_NO_CALIBRATION;
    process.env.ROLEOS_NO_CALIBRATION = "1";
    try {
      assert.equal(suggestPack(TIE, { outcomes: bugfixRuns(5) }).pack, "feature");
    } finally {
      if (previous === undefined) delete process.env.ROLEOS_NO_CALIBRATION;
      else process.env.ROLEOS_NO_CALIBRATION = previous;
    }
  });

  it("reads the run directory, not the process directory", async () => {
    const empty = scratch();
    const plain = await createPersistentRun(TIE, empty);
    assert.equal(plain.entryLevel, "pack");
    assert.equal(plain.packKey, "feature");

    const cwd = scratch();
    for (const row of bugfixRuns(5)) recordOutcome(row, cwd);
    const learned = await createPersistentRun(TIE, cwd);
    // The boost flips the pack to bugfix. The entry ladder already promotes a
    // medium mission when the pack agrees, so the run is the bugfix mission.
    assert.equal(learned.entryLevel, "mission");
    assert.equal(learned.missionKey, "bugfix");
    assert.equal(learned.packKey, null);
    assert.equal(existsSync(REPO_LEDGER), false);

    const previous = process.env.ROLEOS_NO_CALIBRATION;
    process.env.ROLEOS_NO_CALIBRATION = "1";
    try {
      const restored = await createPersistentRun(TIE, cwd);
      assert.equal(restored.packKey, "feature");
    } finally {
      if (previous === undefined) delete process.env.ROLEOS_NO_CALIBRATION;
      else process.env.ROLEOS_NO_CALIBRATION = previous;
    }
  });

  it("learns the tie from five completed bugfix missions", async () => {
    const cwd = scratch();
    const task = "diagnose the crash and fix the regression";
    for (let i = 0; i < 5; i++) {
      const run = await createPersistentRun(task, cwd);
      assert.equal(run.entryLevel, "mission");
      assert.equal(run.missionKey, "bugfix");
      assert.equal(run.packKey, null);
      let guard = 0;
      while (run.status !== "completed") {
        assert.ok(startNext(run, cwd));
        completeCurrentStep(
          run,
          "The diagnosis names the crash, the fix, and the regression test that holds.",
          null,
          cwd,
        );
        assert.ok(++guard < 8);
      }
    }

    const rows = readOutcomes(cwd);
    assert.equal(rows.length, 5);
    for (const row of rows) {
      assert.equal(row.selectedPack, "bugfix");
      assert.equal(row.missionKey, "bugfix");
      assert.equal(row.completionStatus, "completed");
      assert.equal(row.corrections, 0);
      assert.equal(row.operatorOverride, false);
    }

    const report = formatCalibrationReport(computeCalibration(rows));
    assert.match(report, /Pack usage: 100% \| Free routing: 0%/);
    assert.doesNotMatch(report, /Pack usage: 0%/);
    assert.doesNotMatch(report, /Free routing: 100%/);
    assert.doesNotMatch(calibrationSnapshot({ cwd }).text, /none named a pack/);

    writeFileSync(join(cwd, "tie.md"), `${TIE}\n`);
    const learned = cli(["route", "tie.md", "--verbose"], cwd);
    assert.equal(learned.status, 0);
    assert.match(learned.stdout, /Suggested pack: bugfix/);
    assert.doesNotMatch(learned.stdout, /none named a pack/);
    assert.equal(suggestPack(TIE, { cwd }).pack, "bugfix");

    const flipped = await createPersistentRun(TIE, cwd);
    assert.equal(flipped.entryLevel, "mission");
    assert.equal(flipped.missionKey, "bugfix");
    assert.equal(flipped.packKey, null);

    const restoredRoute = cli(["route", "tie.md", "--verbose"], cwd, { ROLEOS_NO_CALIBRATION: "1" });
    assert.match(restoredRoute.stdout, /Suggested pack: feature/);
    assert.match(restoredRoute.stdout, /Calibration off \(ROLEOS_NO_CALIBRATION=1\)/);
    const previous = process.env.ROLEOS_NO_CALIBRATION;
    process.env.ROLEOS_NO_CALIBRATION = "1";
    try {
      assert.equal(suggestPack(TIE, { cwd }).pack, "feature");
      const restored = await createPersistentRun(TIE, cwd);
      assert.equal(restored.entryLevel, "pack");
      assert.equal(restored.packKey, "feature");
    } finally {
      if (previous === undefined) delete process.env.ROLEOS_NO_CALIBRATION;
      else process.env.ROLEOS_NO_CALIBRATION = previous;
    }
  });
});

describe("outcome fields", () => {
  it("sorts roles, counts corrections and rejections, and names a confidence", () => {
    const row = outcomeFromRun({
      id: "fields",
      status: "completed",
      packKey: "bugfix",
      missionKey: null,
      packetFile: "p.md",
      detectedType: "bugfix",
      completedAt: "2026-02-02T00:00:00.000Z",
      entryDecision: {
        level: "pack",
        confidence: 0.85,
        pack: { key: "bugfix" },
        mission: null,
      },
      steps: [
        { role: "Backend Engineer", status: "completed", note: "Reject the patch" },
        { role: "Backend Engineer", status: "completed", note: null },
        { role: "Docs Architect", status: "skipped", note: null },
        { role: "Critic Reviewer", status: "pending", note: null },
      ],
      escalations: [{}, {}],
      interventions: [
        { type: "retry" },
        { type: "reroute" },
        { type: "reopen" },
        { type: "reject" },
        { type: "block" },
      ],
    }, "2026-03-03T00:00:00.000Z");
    assert.equal(row.timestamp, "2026-02-02T00:00:00.000Z");
    assert.deepEqual(row.rolesUsed, ["Backend Engineer"]);
    assert.equal(row.rejectedVerdicts, 2);
    assert.equal(row.corrections, 3);
    assert.equal(row.escalations, 2);
    assert.equal(row.suggestedPack, "bugfix");
    assert.equal(row.suggestedConfidence, "high");
    assert.equal(row.operatorOverride, false);
    assert.equal(row.chainLength, 4);
    assert.equal(row.packetFile, "p.md");
    assert.equal(row.detectedType, "bugfix");
    assert.equal(row.completionStatus, "completed");

    assert.equal(outcomeFromRun({
      id: "med",
      status: "completed",
      steps: [],
      entryDecision: { level: "pack", confidence: 0.5, pack: { key: "docs" } },
    }).suggestedConfidence, "medium");
    assert.equal(outcomeFromRun({
      id: "low",
      status: "completed",
      steps: [],
      entryDecision: { level: "pack", confidence: 0.2, pack: { key: "docs" } },
    }).suggestedConfidence, "low");
    assert.equal(outcomeFromRun({
      id: "none",
      status: "completed",
      steps: [],
      entryDecision: { level: "pack", confidence: 0, pack: { key: "docs" } },
    }).suggestedConfidence, null);

    const alternative = outcomeFromRun({
      id: "alt",
      status: "completed",
      missionKey: "docs-release",
      steps: [],
      escalations: [],
      interventions: [],
      entryDecision: {
        level: "mission",
        confidence: 0.9,
        pack: null,
        mission: { key: "docs-release" },
        alternative: { level: "pack", key: "docs", confidence: 0.5 },
      },
    });
    assert.equal(alternative.suggestedPack, "docs");
    assert.equal(alternative.suggestedConfidence, "medium");
    assert.equal(alternative.operatorOverride, false);

    assert.equal(outcomeFromRun({
      id: "pack-only",
      status: "failed",
      packKey: "security",
      steps: [],
      completedAt: null,
    }, "2026-04-04T00:00:00.000Z").suggestedPack, "security");
    assert.equal(outcomeFromRun({
      id: "pack-only",
      status: "failed",
      packKey: "security",
      steps: [],
    }, "2026-04-04T00:00:00.000Z").timestamp, "2026-04-04T00:00:00.000Z");
  });

  it("marks an operator override when the run leaves the entry decision", () => {
    function ended(entry, extra) {
      return outcomeFromRun({
        id: "op",
        status: "completed",
        steps: [{ role: "Backend Engineer", status: "completed" }],
        escalations: [],
        interventions: [],
        packKey: extra.packKey ?? null,
        missionKey: extra.missionKey ?? null,
        operatorOverride: extra.operatorOverride === true,
        entryDecision: entry,
      }).operatorOverride;
    }
    assert.equal(ended({ level: "pack", pack: { key: "bugfix" } }, { packKey: "bugfix", operatorOverride: true }), true);
    assert.equal(ended(
      { level: "mission", mission: { key: "docs-release" }, pack: null },
      { missionKey: "bugfix" },
    ), true);
    assert.equal(ended(
      { level: "mission", mission: { key: "docs-release" }, pack: { key: "docs" } },
      { packKey: "docs" },
    ), true);
    assert.equal(ended({ level: "pack", pack: { key: "feature" } }, { packKey: "bugfix" }), true);
    assert.equal(ended(
      { level: "pack", pack: { key: "bugfix" } },
      { packKey: "bugfix", missionKey: "docs-release" },
    ), true);
    assert.equal(ended({ level: "free-routing", pack: null }, { packKey: "bugfix" }), true);
    assert.equal(ended({ level: "pack", pack: { key: "bugfix" } }, { packKey: "bugfix" }), false);
  });

  it("treats an exact block of the remaining steps as terminal and a live step as not", () => {
    assert.equal(terminalStatus(null), null);
    assert.equal(terminalStatus({ status: "completed" }), "completed");
    assert.equal(terminalStatus({ status: "failed" }), "failed");
    assert.equal(terminalStatus({ status: "partial" }), "partial");
    assert.equal(terminalStatus({ status: "blocked" }), "blocked");
    assert.equal(terminalStatus({ status: "abandoned" }), "abandoned");
    assert.equal(terminalStatus({ status: "running", steps: [] }), null);
    assert.equal(terminalStatus({ status: "running", steps: [{ status: "pending" }] }), null);
    assert.equal(terminalStatus({
      status: "running",
      steps: [{ status: "active" }, { status: "blocked" }],
    }), null);
    assert.equal(terminalStatus({
      status: "running",
      steps: [{ status: "completed" }, { status: "blocked" }],
    }), "blocked");
    assert.equal(terminalStatus({
      status: "running",
      steps: [{ status: "completed" }],
    }), null);
    assert.equal(terminalStatus({
      status: "running",
      steps: [{ status: "skipped" }],
    }), null);
  });
});

describe("calibration command and evidence text", () => {
  it("says there are no recorded runs yet, and not a zero report", () => {
    const cwd = scratch();
    const text = cli(["calibration"], cwd);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /no recorded runs yet/);
    assert.doesNotMatch(text.stdout, /Total runs/);

    const json = cli(["calibration", "--json"], cwd);
    assert.equal(json.status, 0);
    assert.deepEqual(JSON.parse(json.stdout), {
      recorded: false,
      message: "no recorded runs yet",
    });

    const help = cli(["calibration", "--help"], cwd);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /insufficient data/);
    const catalog = cli(["help"], cwd);
    assert.match(catalog.stdout, /roleos calibration \[\-\-json\]/);

    const flag = cli(["calibration", "--nope"], cwd);
    assert.equal(flag.status, 1);
    const parsed = JSON.parse(flag.stderr);
    assert.match(parsed.message, /Unknown flag/);
    assert.match(parsed.hint, /roleos calibration/);
    const extra = cli(["calibration", "report"], cwd);
    assert.equal(extra.status, 1);
    assert.match(JSON.parse(extra.stderr).message, /Unexpected argument/);
  });

  it("prints the report, the table, and null rates below the gate", () => {
    const cwd = scratch();
    for (const row of bugfixRuns(5).concat(bugfixRuns(2, "completed", { selectedPack: "feature", rolesUsed: ["Docs Architect"] }))) {
      recordOutcome(row, cwd);
    }
    const text = cli(["calibration"], cwd);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /Total runs: 7/);
    assert.match(text.stdout, /Combinations/);
    assert.match(text.stdout, /insufficient data/);
    assert.match(text.stdout, /1\.000 \[0\.566, 1\.000\]/);

    const body = JSON.parse(cli(["calibration", "--json"], cwd).stdout);
    assert.equal(body.recorded, true);
    assert.equal(body.report.totalRuns, 7);
    const thin = body.combinations.find((row) => row.runs < 5);
    const fat = body.combinations.find((row) => row.runs >= 5);
    assert.equal(thin.status, "insufficient data");
    assert.equal(thin.cleanRate, null);
    assert.equal(thin.interval, null);
    assert.equal(fat.status, "measured");
    assert.equal(fat.cleanRate, 1);
    near(fat.interval.low, 0.5655175352168251);
    near(fat.interval.high, 1);
  });

  it("shows the evidence from route --verbose and explain, and the kill switch hides it", () => {
    const empty = scratch();
    writeFileSync(join(empty, "tie.md"), `${TIE}\n`);
    writeFileSync(join(empty, "hello.md"), "Hello world.\n");
    const quiet = cli(["route", "tie.md", "--verbose"], empty);
    assert.equal(quiet.status, 0);
    assert.match(quiet.stdout, /Calibration: no recorded runs yet/);
    assert.match(quiet.stdout, /Suggested pack: feature/);
    assert.match(quiet.stdout, /Not triggered: \d+ roles/);
    const noKeywords = cli(["route", "--verbose", "hello.md"], empty);
    assert.match(noKeywords.stdout, /Calibration: no recorded runs yet/);
    const packed = cli(["route", "tie.md", "--verbose", "--pack=bugfix"], empty);
    assert.match(packed.stdout, /Calibration: no recorded runs yet/);
    assert.match(packed.stdout, /Using pack:/);

    const cwd = scratch();
    writeFileSync(join(cwd, "tie.md"), `${TIE}\n`);
    for (const row of bugfixRuns(5)) recordOutcome(row, cwd);
    const learned = cli(["route", "tie.md", "--verbose"], cwd);
    assert.equal(learned.status, 0);
    assert.match(learned.stdout, /Suggested pack: bugfix/);
    assert.match(learned.stdout, /bugfix: boost \+2, 5 runs, clean rate 1\.000 \[0\.566, 1\.000\]/);

    const off = cli(["route", "tie.md", "--verbose"], cwd, { ROLEOS_NO_CALIBRATION: "1" });
    assert.match(off.stdout, /Calibration off \(ROLEOS_NO_CALIBRATION=1\)/);
    assert.match(off.stdout, /Suggested pack: feature/);
    assert.doesNotMatch(off.stdout, /boost \+2/);

    const explained = cli(["run", TIE], cwd);
    assert.equal(explained.status, 0);
    const explanation = cli(["explain"], cwd);
    assert.equal(explanation.status, 0);
    assert.match(explanation.stdout, /bugfix: boost \+2, 5 runs/);
    const fresh = scratch();
    assert.equal(cli(["run", TIE], fresh).status, 0);
    const bare = cli(["explain"], fresh);
    assert.match(bare.stdout, /Calibration: no recorded runs yet/);
    assert.doesNotMatch(bare.stdout, /Total runs: 0/);
  });

  it("abandons a run from the CLI", () => {
    const cwd = scratch();
    const started = cli(["run", "diagnose the crash and fix the regression"], cwd);
    assert.equal(started.status, 0);
    assert.match(started.stdout, /Mission: bugfix/);

    const help = cli(["abandon", "--help"], cwd);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /roleos abandon \[id\]/);
    assert.match(cli(["help"], cwd).stdout, /roleos abandon \[id\]/);

    const abandoned = cli(["abandon"], cwd);
    assert.equal(abandoned.status, 0);
    assert.match(abandoned.stdout, /Abandoned run/);
    const rows = readOutcomes(cwd);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].completionStatus, "abandoned");
    assert.equal(rows[0].selectedPack, "bugfix");
    assert.equal(rows[0].missionKey, "bugfix");

    const again = cli(["abandon", rows[0].runId], cwd);
    assert.equal(again.status, 0);
    assert.equal(readOutcomes(cwd).length, 1);
    const idle = cli(["abandon"], cwd);
    assert.equal(idle.status, 1);
    assert.match(JSON.parse(idle.stderr).message, /No active run/);

    const missing = cli(["abandon", "run-missing"], cwd);
    assert.equal(missing.status, 1);
    const missingBody = JSON.parse(missing.stderr);
    assert.match(missingBody.message, /not found/);
    assert.match(missingBody.hint, /run list/);

    const extra = cli(["abandon", rows[0].runId, "extra"], cwd);
    assert.equal(extra.status, 1);
    assert.match(JSON.parse(extra.stderr).message, /Usage: roleos abandon/);

    const ended = scratch();
    assert.equal(cli(["run", "diagnose the crash and fix the regression"], ended).status, 0);
    const failed = cli(["fail", "failed", "cannot reproduce"], ended);
    assert.equal(failed.status, 0);
    const refused = cli(["abandon"], ended);
    assert.equal(refused.status, 1);
    const refusedBody = JSON.parse(refused.stderr);
    assert.match(refusedBody.message, /first end state/);
    assert.equal(typeof refusedBody.hint, "string");
    assert.equal(readOutcomes(ended).length, 1);
    assert.equal(readOutcomes(ended)[0].completionStatus, "failed");
    assert.equal(readOutcomes(ended)[0].selectedPack, "bugfix");
  });
});
