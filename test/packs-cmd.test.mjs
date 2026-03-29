import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");
const TMP = join(__dirname, "..", ".test-packs-sandbox");

function run(args, opts = {}) {
  return execFileSync("node", [CLI, ...args], {
    encoding: "utf-8",
    timeout: 10000,
    cwd: TMP,
    ...opts,
  });
}

function runExpectFail(args, opts = {}) {
  try {
    execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      timeout: 10000,
      cwd: TMP,
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
    });
    throw new Error("Expected non-zero exit but command succeeded");
  } catch (err) {
    if (err.message === "Expected non-zero exit but command succeeded") throw err;
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      status: err.status,
    };
  }
}

describe("roleos packs", () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe("packs list", () => {
    it("T1: shows count of all 10 packs", () => {
      const out = run(["packs", "list"]);
      assert.match(out, /10 packs available/);
    });

    it("T2: shows all 9 pack keys", () => {
      const out = run(["packs", "list"]);
      for (const key of ["feature", "bugfix", "security", "docs", "launch", "research", "treatment", "deep-audit", "brainstorm"]) {
        assert.ok(out.includes(key), `Missing pack key: ${key}`);
      }
    });

    it("T3: shows role count for each pack", () => {
      const out = run(["packs", "list"]);
      assert.match(out, /\(\d+ roles\)/);
    });

    it("T4: bare 'packs' behaves as 'packs list'", () => {
      const out = run(["packs"]);
      assert.match(out, /10 packs available/);
    });
  });

  // ── show ──────────────────────────────────────────────────────────────────

  describe("packs show", () => {
    it("T5: feature pack shows name, roles, core members", () => {
      const out = run(["packs", "show", "feature"]);
      assert.match(out, /Feature Build/);
      assert.match(out, /Roles \(6\)/);
      assert.match(out, /Orchestrator/);
      assert.match(out, /Critic Reviewer/);
    });

    it("T6: feature pack shows chain order and required artifacts sections", () => {
      const out = run(["packs", "show", "feature"]);
      assert.match(out, /Chain order:/);
      assert.match(out, /Required artifacts:/);
    });

    it("T7: feature pack shows dispatch defaults with formatted budget", () => {
      const out = run(["packs", "show", "feature"]);
      assert.match(out, /Dispatch defaults:/);
      assert.match(out, /maxBudgetUsd:\s+\$5\.00/);
    });

    it("T8: feature pack shows trial evidence", () => {
      const out = run(["packs", "show", "feature"]);
      assert.match(out, /Trial evidence:/);
    });

    it("T9: bugfix pack shows correct name and role count", () => {
      const out = run(["packs", "show", "bugfix"]);
      assert.match(out, /Bugfix \/ Repair/);
      assert.match(out, /Roles \(4\)/);
    });

    it("T10: treatment pack has 8 roles", () => {
      const out = run(["packs", "show", "treatment"]);
      assert.match(out, /Roles \(8\)/);
    });

    it("T11: wrong-case key errors with exit code 1", () => {
      const result = runExpectFail(["packs", "show", "FEATURE"]);
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.message, /Unknown pack: FEATURE/);
    });

    it("T12: missing key errors with hint to use packs list", () => {
      const result = runExpectFail(["packs", "show"]);
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.hint, /roleos packs list/);
    });
  });

  // ── suggest ───────────────────────────────────────────────────────────────

  describe("packs suggest", () => {
    it("T13: suggests feature pack from feature-keyword content", () => {
      const packetPath = join(TMP, "feature-packet.md");
      writeFileSync(packetPath, "# Packet\n\nBuild a new feature. Implement user auth. Create login endpoint.", "utf-8");
      const out = run(["packs", "suggest", "feature-packet.md"]);
      assert.match(out, /Suggested pack: feature/);
      assert.match(out, /Confidence:/);
    });

    it("T14: suggests bugfix pack from bugfix-keyword content", () => {
      const packetPath = join(TMP, "bugfix-packet.md");
      writeFileSync(packetPath, "# Packet\n\nFix the crash. There is a regression and an error in the handler.", "utf-8");
      const out = run(["packs", "suggest", "bugfix-packet.md"]);
      assert.match(out, /Suggested pack: bugfix/);
    });

    it("T15: reports no match for content with no recognizable signals", () => {
      const packetPath = join(TMP, "empty-packet.md");
      writeFileSync(packetPath, "Hello world.", "utf-8");
      const out = run(["packs", "suggest", "empty-packet.md"]);
      assert.match(out, /No pack match found/);
    });

    it("T16: errors on missing file with exit code 1", () => {
      const result = runExpectFail(["packs", "suggest", "nonexistent.md"]);
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.message, /not found/);
    });

    it("T17: errors when no file argument given", () => {
      const result = runExpectFail(["packs", "suggest"]);
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.message, /Usage: roleos packs suggest/);
    });

    it("T18: includes Next step hint in output", () => {
      const packetPath = join(TMP, "hint-packet.md");
      writeFileSync(packetPath, "Build a new feature and implement the backend endpoint. Create tests.", "utf-8");
      const out = run(["packs", "suggest", "hint-packet.md"]);
      assert.match(out, /Next: roleos route/);
    });
  });

  // ── help integration ──────────────────────────────────────────────────────

  describe("help integration", () => {
    it("T19: help mentions roleos packs list", () => {
      const out = run(["help"]);
      assert.match(out, /roleos packs list/);
    });

    it("T20: help mentions roleos packs suggest", () => {
      const out = run(["help"]);
      assert.match(out, /roleos packs suggest/);
    });

    it("T21: help mentions roleos packs show", () => {
      const out = run(["help"]);
      assert.match(out, /roleos packs show/);
    });
  });

  // ── unknown subcommand ────────────────────────────────────────────────────

  describe("unknown subcommand", () => {
    it("T22: unknown subcommand errors with exit code 1 and message", () => {
      const result = runExpectFail(["packs", "frobnicate"]);
      assert.equal(result.status, 1);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.message, /Unknown packs subcommand: frobnicate/);
    });

    it("T23: unknown subcommand hint references packs list", () => {
      const result = runExpectFail(["packs", "frobnicate"]);
      const parsed = JSON.parse(result.stderr);
      assert.match(parsed.hint, /roleos packs list/);
    });
  });
});
