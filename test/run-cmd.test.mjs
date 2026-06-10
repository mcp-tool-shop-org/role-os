import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BIN = join(process.cwd(), "bin", "roleos.mjs");
// Scratch dir lives in the OS tmpdir so an interrupted run never litters the repo root.
const TEST_CWD = join(tmpdir(), `roleos-test-cmd-runs-${process.pid}`);

function run(cmd) {
  // BIN is quoted so checkouts under paths containing spaces still work.
  return execSync(`node "${BIN}" ${cmd}`, {
    cwd: TEST_CWD,
    encoding: "utf-8",
    timeout: 10000,
  });
}

function setup() {
  rmSync(TEST_CWD, { recursive: true, force: true });
  mkdirSync(TEST_CWD, { recursive: true });
}

function teardown() {
  rmSync(TEST_CWD, { recursive: true, force: true });
}

// ── roleos run ───────────────────────────────────────────────────────────────

describe("roleos run CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("creates a run from task description", () => {
    const out = run('run "fix the crash in save handler"');
    assert.ok(out.includes("Created run:"));
    assert.ok(out.includes("Entry: MISSION"));
    assert.ok(out.includes("Started step 0:"));
  });

  it("run list shows created runs", () => {
    run('run "fix the crash in save handler"');
    const list = run("run list");
    assert.ok(list.includes("[>]"));
    assert.ok(list.includes("fix the crash"));
  });

  it("run list shows empty when no runs", () => {
    const list = run("run list");
    assert.ok(list.includes("No runs found"));
  });

  it("prints usage when no args", () => {
    const out = run("run");
    assert.ok(out.includes("Usage:"));
  });
});

// ── roleos explain ───────────────────────────────────────────────────────────

describe("roleos explain CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("explains the active run", () => {
    run('run "fix the crash in save handler"');
    const out = run("explain");
    assert.ok(out.includes("Run:"));
    assert.ok(out.includes("Task:"));
    assert.ok(out.includes("Steps"));
    assert.ok(out.includes("[>]"));
  });
});

// ── roleos next ──────────────────────────────────────────────────────────────

describe("roleos next CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("shows what's next when step is active", () => {
    run('run "fix the crash in save handler"');
    const out = run("next");
    assert.ok(out.includes("Active:") || out.includes("Started step"));
  });
});

// ── roleos complete ──────────────────────────────────────────────────────────

describe("roleos complete CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("completes the active step", () => {
    run('run "fix the crash in save handler"');
    const out = run("complete diagnosis.md Found the root cause");
    assert.ok(out.includes("Completed step 0"));
    assert.ok(out.includes("Next:"));
  });
});

// ── roleos fail ──────────────────────────────────────────────────────────────

describe("roleos fail CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("fails the active step", () => {
    run('run "fix the crash in save handler"');
    const out = run("fail failed Cannot reproduce the bug");
    assert.ok(out.includes("failed"));
    assert.ok(out.includes("Blocked"));
  });
});

// ── roleos retry ─────────────────────────────────────────────────────────────

describe("roleos retry CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("retries a failed step", () => {
    run('run "fix the crash in save handler"');
    run("fail failed Cannot reproduce");
    const out = run("retry 0");
    assert.ok(out.includes("Retried step 0"));
  });
});

// ── roleos report ────────────────────────────────────────────────────────────

describe("roleos report CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("generates report for active run", () => {
    run('run "fix the crash in save handler"');
    const out = run("report");
    assert.ok(out.includes("Run Report"));
    assert.ok(out.includes("Verdict"));
  });
});

// ── roleos friction ──────────────────────────────────────────────────────────

describe("roleos friction CLI", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("measures friction for active run", () => {
    run('run "fix the crash in save handler"');
    const out = run("friction");
    assert.ok(out.includes("Friction Report"));
    assert.ok(out.includes("Total touches:"));
    assert.ok(out.includes("Friction score:"));
  });
});
