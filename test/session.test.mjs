import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaffoldClaude, doctor, generateRouteCard, formatDoctor } from "../src/session.mjs";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-session");

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
}

function setup() {
  cleanup();
  mkdirSync(TEST_DIR, { recursive: true });
}

// ── scaffoldClaude ────────────────────────────────────────────────────────────

describe("scaffoldClaude", () => {
  before(setup);
  afterEach(cleanup);

  it("creates CLAUDE.md with Role OS section", () => {
    setup();
    const result = scaffoldClaude(TEST_DIR);
    assert.ok(result.created.includes("CLAUDE.md"));
    const content = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    assert.ok(content.includes("## Role OS"));
    assert.ok(content.includes("/roleos-route"));
    assert.ok(content.includes("Route card required"));
  });

  it("creates /roleos-route command", () => {
    setup();
    scaffoldClaude(TEST_DIR);
    const cmdPath = join(TEST_DIR, ".claude", "commands", "roleos-route.md");
    assert.ok(existsSync(cmdPath));
    const content = readFileSync(cmdPath, "utf-8");
    assert.ok(content.includes("Route Task Through Role OS"));
    assert.ok(content.includes("Route card format"));
  });

  it("creates /roleos-review command", () => {
    setup();
    scaffoldClaude(TEST_DIR);
    const cmdPath = join(TEST_DIR, ".claude", "commands", "roleos-review.md");
    assert.ok(existsSync(cmdPath));
    const content = readFileSync(cmdPath, "utf-8");
    assert.ok(content.includes("Review Work Through Role OS"));
  });

  it("creates /roleos-status command", () => {
    setup();
    scaffoldClaude(TEST_DIR);
    const cmdPath = join(TEST_DIR, ".claude", "commands", "roleos-status.md");
    assert.ok(existsSync(cmdPath));
  });

  it("appends to existing CLAUDE.md without Role OS section", () => {
    setup();
    writeFileSync(join(TEST_DIR, "CLAUDE.md"), "# Existing Project\n\nSome instructions.\n");
    const result = scaffoldClaude(TEST_DIR);
    assert.ok(result.created.includes("CLAUDE.md (appended)"));
    const content = readFileSync(join(TEST_DIR, "CLAUDE.md"), "utf-8");
    assert.ok(content.includes("# Existing Project"));
    assert.ok(content.includes("## Role OS"));
  });

  it("skips CLAUDE.md when Role OS section already present", () => {
    setup();
    writeFileSync(join(TEST_DIR, "CLAUDE.md"), "## Role OS\n\nAlready configured.\n");
    const result = scaffoldClaude(TEST_DIR);
    assert.ok(result.skipped.some(s => s.includes("CLAUDE.md")));
  });

  it("does not overwrite existing commands without --force", () => {
    setup();
    scaffoldClaude(TEST_DIR);
    const result = scaffoldClaude(TEST_DIR);
    assert.ok(result.skipped.some(s => s.includes("roleos-route")));
  });

  it("overwrites with --force", () => {
    setup();
    scaffoldClaude(TEST_DIR);
    const result = scaffoldClaude(TEST_DIR, { force: true });
    assert.ok(result.created.some(s => s.includes("roleos-route")));
  });
});

// ── doctor ────────────────────────────────────────────────────────────────────

describe("doctor", () => {
  before(setup);
  afterEach(cleanup);

  it("reports unhealthy for bare directory", () => {
    setup();
    const result = doctor(TEST_DIR);
    assert.equal(result.healthy, false);
    assert.ok(result.checks.some(c => c.status === "fail"));
  });

  it("reports healthy after full init + claude scaffold", () => {
    setup();
    // Simulate full init: create .claude/, agents/, context/, packets/
    const claudeDir = join(TEST_DIR, ".claude");
    mkdirSync(join(claudeDir, "agents", "core"), { recursive: true });
    mkdirSync(join(claudeDir, "context"), { recursive: true });
    mkdirSync(join(claudeDir, "packets"), { recursive: true });
    // Write non-template context files
    for (const f of ["product-brief.md", "repo-map.md", "brand-rules.md", "current-priorities.md"]) {
      writeFileSync(join(claudeDir, "context", f), `Real content for ${f}\nWith multiple lines\nOf actual data\n`);
    }
    // Scaffold claude integration
    scaffoldClaude(TEST_DIR);
    const result = doctor(TEST_DIR);
    assert.equal(result.healthy, true);
  });

  it("warns on empty context files", () => {
    setup();
    const claudeDir = join(TEST_DIR, ".claude");
    mkdirSync(join(claudeDir, "agents"), { recursive: true });
    mkdirSync(join(claudeDir, "context"), { recursive: true });
    scaffoldClaude(TEST_DIR);
    const result = doctor(TEST_DIR);
    assert.ok(result.checks.some(c => c.name === "context files" && c.status !== "pass"));
  });

  it("checks for /roleos-route command", () => {
    setup();
    mkdirSync(join(TEST_DIR, ".claude"), { recursive: true });
    scaffoldClaude(TEST_DIR);
    const result = doctor(TEST_DIR);
    const routeCheck = result.checks.find(c => c.name === "/roleos-route command");
    assert.equal(routeCheck.status, "pass");
  });
});

// ── generateRouteCard ─────────────────────────────────────────────────────────

describe("generateRouteCard", () => {
  it("generates a valid markdown route card", () => {
    const card = generateRouteCard({
      type: "feature",
      pack: "feature",
      packConfidence: "high",
      isComposite: false,
      chain: "Product Strategist → Spec Writer → Backend Engineer → Test Engineer → Critic Reviewer",
      confidence: "high",
      reason: "Packet contains implementation scope with clear deliverable type.",
      successArtifact: "Working implementation with tests and Critic verdict.",
    });
    assert.ok(card.includes("## Route Card"));
    assert.ok(card.includes("feature"));
    assert.ok(card.includes("high"));
    assert.ok(card.includes("Working implementation"));
  });

  it("shows composite status when applicable", () => {
    const card = generateRouteCard({
      type: "feature",
      isComposite: true,
      compositeReason: "3 subtask categories detected",
    });
    assert.ok(card.includes("yes"));
    assert.ok(card.includes("3 subtask categories"));
  });

  it("shows mismatch when present", () => {
    const card = generateRouteCard({
      type: "bugfix",
      mismatch: "Selected pack 'launch' does not match task. Suggested: bugfix.",
    });
    assert.ok(card.includes("Mismatch"));
    assert.ok(card.includes("bugfix"));
  });

  it("handles missing fields gracefully", () => {
    const card = generateRouteCard({});
    assert.ok(card.includes("unknown"));
    assert.ok(card.includes("free routing"));
  });
});

// ── formatDoctor ──────────────────────────────────────────────────────────────

describe("formatDoctor", () => {
  it("formats healthy result", () => {
    const output = formatDoctor({
      checks: [{ name: "test", status: "pass", detail: "ok" }],
      healthy: true,
    });
    assert.ok(output.includes("Healthy"));
    assert.ok(output.includes("✓"));
  });

  it("formats unhealthy result", () => {
    const output = formatDoctor({
      checks: [{ name: "test", status: "fail", detail: "missing" }],
      healthy: false,
    });
    assert.ok(output.includes("Unhealthy"));
    assert.ok(output.includes("✗"));
  });
});
