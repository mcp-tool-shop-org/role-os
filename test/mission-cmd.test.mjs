import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");

function run(args) {
  return execSync(`node "${CLI}" ${args}`, { encoding: "utf-8", cwd: __dirname });
}

function runFail(args) {
  try {
    execSync(`node "${CLI}" ${args}`, { encoding: "utf-8", cwd: __dirname, stdio: "pipe" });
    return null;
  } catch (err) {
    return err;
  }
}

// ── mission list ────────────────────────────────────────────────────────────

describe("roleos mission list", () => {
  it("lists all 7 missions", () => {
    const out = run("mission list");
    assert.ok(out.includes("Mission Library"));
    assert.ok(out.includes("feature-ship"));
    assert.ok(out.includes("bugfix"));
    assert.ok(out.includes("treatment"));
    assert.ok(out.includes("docs-release"));
    assert.ok(out.includes("security-hardening"));
    assert.ok(out.includes("research-launch"));
    assert.ok(out.includes("brainstorm"));
    assert.ok(out.includes("7 missions"));
  });
});

// ── mission show ────────────────────────────────────────────────────────────

describe("roleos mission show", () => {
  it("shows full detail for bugfix", () => {
    const out = run("mission show bugfix");
    assert.ok(out.includes("Bugfix & Diagnosis"));
    assert.ok(out.includes("Role Chain"));
    assert.ok(out.includes("Artifact Flow"));
    assert.ok(out.includes("Escalation Branches"));
    assert.ok(out.includes("Honest Partial"));
    assert.ok(out.includes("Stop Conditions"));
    assert.ok(out.includes("Dispatch Defaults"));
    assert.ok(out.includes("Repo Researcher"));
  });

  it("shows trial evidence", () => {
    const out = run("mission show feature-ship");
    assert.ok(out.includes("Trial Evidence"));
    assert.ok(out.includes("G1"));
  });

  it("fails for unknown mission", () => {
    const err = runFail("mission show nonexistent");
    assert.ok(err);
  });

  it("fails with no key", () => {
    const err = runFail("mission show");
    assert.ok(err);
  });
});

// ── mission suggest ─────────────────────────────────────────────────────────

describe("roleos mission suggest", () => {
  it("suggests bugfix for bug descriptions", () => {
    const out = run("mission suggest fix the broken crash");
    assert.ok(out.includes("bugfix"));
    assert.ok(out.includes("Confidence"));
  });

  it("suggests treatment for polish descriptions", () => {
    const out = run("mission suggest run the treatment and shipcheck");
    assert.ok(out.includes("treatment"));
  });

  it("handles no-match gracefully", () => {
    const out = run("mission suggest xyzzy plugh");
    assert.ok(out.includes("No mission matched"));
  });

  it("fails with no text", () => {
    const err = runFail("mission suggest");
    assert.ok(err);
  });
});

// ── mission validate ────────────────────────────────────────────────────────

describe("roleos mission validate", () => {
  it("validates all missions", () => {
    const out = run("mission validate");
    assert.ok(out.includes("[PASS] feature-ship"));
    assert.ok(out.includes("[PASS] bugfix"));
    assert.ok(out.includes("All valid"));
  });

  it("validates a single mission", () => {
    const out = run("mission validate bugfix");
    assert.ok(out.includes("[PASS]"));
  });
});

// ── help shows mission commands ─────────────────────────────────────────────

describe("help includes missions", () => {
  it("help text shows mission commands", () => {
    const out = run("help");
    assert.ok(out.includes("roleos mission list"));
    assert.ok(out.includes("roleos mission show"));
    assert.ok(out.includes("roleos mission suggest"));
    assert.ok(out.includes("roleos mission validate"));
  });
});
