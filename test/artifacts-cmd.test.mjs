import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");
// Scratch dir lives in the OS tmpdir so an interrupted run never litters the repo root.
const TEST_DIR = join(tmpdir(), `roleos-test-artifacts-cmd-${process.pid}`);

function run(...args) {
  return execFileSync("node", [CLI, ...args], {
    encoding: "utf-8",
    cwd: TEST_DIR,
    timeout: 10000,
  });
}

function runExpectFail(...args) {
  try {
    execFileSync("node", [CLI, ...args], { encoding: "utf-8", cwd: TEST_DIR, timeout: 10000 });
    return null;
  } catch (err) {
    // Structured errors go to stderr as JSON
    return (err.stderr || "") + (err.stdout || "") + (err.message || "");
  }
}

function setup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
}

describe("roleos artifacts", () => {
  before(setup);
  afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); });

  // AC-1: bare artifacts lists all roles with contracts
  it("lists all roles with contracts", () => {
    setup();
    const output = run("artifacts");
    assert.ok(output.includes("Role artifact contracts"));
    assert.ok(output.includes("Product Strategist"));
    assert.ok(output.includes("Critic Reviewer"));
    assert.ok(output.includes("strategy-brief"));
    assert.ok(output.includes("verdict"));
  });

  it("lists with 'list' subcommand too", () => {
    setup();
    const output = run("artifacts", "list");
    assert.ok(output.includes("Role artifact contracts"));
  });

  // AC-2: show displays contract fields
  it("shows artifact contract for a role", () => {
    setup();
    const output = run("artifacts", "show", "Product Strategist");
    assert.ok(output.includes("strategy-brief"));
    assert.ok(output.includes("problem-framing"));
    assert.ok(output.includes("scope"));
    assert.ok(output.includes("Spec Writer"));
    assert.ok(output.includes("Completion rule"));
  });

  it("resolves slug-style role names", () => {
    setup();
    const output = run("artifacts", "show", "product-strategist");
    assert.ok(output.includes("strategy-brief"));
  });

  it("resolves case-insensitive role names", () => {
    setup();
    const output = run("artifacts", "show", "critic reviewer");
    assert.ok(output.includes("verdict"));
  });

  // AC-3: unknown role gives structured error
  it("errors on unknown role with hint", () => {
    setup();
    const output = runExpectFail("artifacts", "show", "Unknown Role");
    assert.ok(output);
    assert.ok(output.includes("No artifact contract"));
  });

  // AC-4: validate checks a file against contract
  it("validates a complete artifact file", () => {
    setup();
    const filePath = join(TEST_DIR, "brief.md");
    writeFileSync(filePath, `## Problem Framing\nReal problem.\n## Scope\nA,B,C.\n## Non-Goals\nNot D.\n## Tradeoffs\nX vs Y.\nMore detail.\n`);
    const output = run("artifacts", "validate", "Product Strategist", filePath);
    assert.ok(output.includes("✓"));
  });

  it("validates an incomplete artifact file", () => {
    setup();
    const filePath = join(TEST_DIR, "partial.md");
    writeFileSync(filePath, `## Problem Framing\nSome content.\n## Scope\nMore content.\n`);
    const output = runExpectFail("artifacts", "validate", "Product Strategist", filePath);
    // Should show missing sections
    assert.ok(output && (output.includes("non-goals") || output.includes("✗")));
  });

  // AC-5: missing file error
  it("errors on missing file", () => {
    setup();
    const output = runExpectFail("artifacts", "validate", "Product Strategist", "nonexistent.md");
    assert.ok(output);
    assert.ok(output.includes("not found") || output.includes("File not found"));
  });

  // AC-6: chain shows pack handoff flow
  it("shows pack handoff chain", () => {
    setup();
    const output = run("artifacts", "chain", "feature");
    assert.ok(output.includes("feature pack"));
    assert.ok(output.includes("Product Strategist"));
    assert.ok(output.includes("strategy-brief"));
    assert.ok(output.includes("Critic Reviewer"));
    assert.ok(output.includes("verdict"));
  });

  it("shows every pack chain (including deep-audit)", () => {
    setup();
    for (const pack of ["feature", "bugfix", "security", "docs", "launch", "research", "treatment", "deep-audit", "brainstorm", "swarm"]) {
      const output = run("artifacts", "chain", pack);
      assert.ok(output.includes(pack), `Missing pack name for ${pack}`);
      if (pack === "brainstorm") {
        assert.ok(output.includes("Judge"), `Missing Judge for brainstorm`);
      } else {
        assert.ok(output.includes("Critic Reviewer"), `Missing Critic for ${pack}`);
      }
    }
  });

  // AC-7: unknown pack error
  it("errors on unknown pack with hint", () => {
    setup();
    const output = runExpectFail("artifacts", "chain", "nonexistent");
    assert.ok(output);
    assert.ok(output.includes("No handoff contract"));
  });

  // Unknown subcommand
  it("errors on unknown subcommand", () => {
    setup();
    const output = runExpectFail("artifacts", "unknown");
    assert.ok(output);
    assert.ok(output.includes("Unknown artifacts subcommand"));
  });
});
