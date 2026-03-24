import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectConflicts } from "../src/conflicts.mjs";
import { ROLE_CATALOG } from "../src/route.mjs";

function makeChain(...roleNames) {
  return roleNames.map(name => {
    const role = ROLE_CATALOG.find(r => r.name === name);
    if (!role) throw new Error(`Unknown role: ${name}`);
    return { role, score: role.alwaysInclude ? Infinity : 3, matched: [], reasons: [] };
  });
}

// ── Pass 1: Hard conflicts ────────────────────────────────────────────────────

describe("hard conflicts", () => {
  it("errors when chain has only gate/growth roles and no builders", () => {
    const chain = makeChain("Orchestrator", "Launch Strategist", "Critic Reviewer");
    const findings = detectConflicts(chain);
    const blocking = findings.filter(f => f.type === "blocking");
    assert.ok(blocking.length > 0, "should find blocking conflict");
    assert.ok(blocking[0].message.includes("no builder roles"));
  });

  it("no error when chain has builders", () => {
    const chain = makeChain("Orchestrator", "Backend Engineer", "Test Engineer", "Critic Reviewer");
    const blocking = detectConflicts(chain).filter(f => f.type === "blocking");
    assert.equal(blocking.length, 0);
  });
});

// ── Pass 2: Sequence conflicts ────────────────────────────────────────────────

describe("sequence conflicts", () => {
  it("warns when Test Engineer appears before any builder", () => {
    // Test Engineer at position 1, Backend Engineer at position 2
    const chain = makeChain("Orchestrator", "Test Engineer", "Backend Engineer", "Critic Reviewer");
    const seq = detectConflicts(chain).filter(f => f.type === "sequence");
    assert.ok(seq.some(f => f.roles.includes("Test Engineer")), "should warn about Test Engineer sequence");
  });

  it("warns when Launch Copywriter appears before builders", () => {
    const chain = makeChain("Orchestrator", "Launch Copywriter", "Backend Engineer", "Critic Reviewer");
    const seq = detectConflicts(chain).filter(f => f.type === "sequence");
    assert.ok(seq.some(f => f.roles.includes("Launch Copywriter")), "should warn about copywriter before builders");
  });

  it("no sequence warning when order is correct", () => {
    const chain = makeChain("Orchestrator", "Product Strategist", "Backend Engineer", "Test Engineer", "Critic Reviewer");
    const seq = detectConflicts(chain).filter(f => f.type === "sequence");
    assert.equal(seq.length, 0);
  });
});

// ── Pass 3: Redundancy ────────────────────────────────────────────────────────

describe("redundancy", () => {
  it("warns when >3 roles from the same pack", () => {
    const chain = makeChain(
      "Orchestrator",
      "Backend Engineer", "Frontend Developer", "Test Engineer", "Performance Engineer",
      "Critic Reviewer"
    );
    const red = detectConflicts(chain).filter(f => f.type === "redundancy");
    assert.ok(red.some(f => f.message.includes("engineering")), "should warn about engineering pack density");
  });

  it("warns when overlap pair is present", () => {
    const chain = makeChain("Orchestrator", "Coverage Auditor", "Test Engineer", "Backend Engineer", "Critic Reviewer");
    const red = detectConflicts(chain).filter(f => f.type === "redundancy");
    assert.ok(
      red.some(f => f.roles.includes("Coverage Auditor") && f.roles.includes("Test Engineer")),
      "should warn about Coverage Auditor / Test Engineer overlap"
    );
  });

  it("no redundancy warning for clean team", () => {
    const chain = makeChain("Orchestrator", "Product Strategist", "Backend Engineer", "Test Engineer", "Critic Reviewer");
    const red = detectConflicts(chain).filter(f => f.type === "redundancy");
    assert.equal(red.length, 0);
  });
});

// ── Pass 4: Coverage gaps ─────────────────────────────────────────────────────

describe("coverage gaps", () => {
  it("warns when engineering-heavy chain has no Test Engineer", () => {
    const chain = makeChain("Orchestrator", "Backend Engineer", "Frontend Developer", "Critic Reviewer");
    const cov = detectConflicts(chain).filter(f => f.type === "coverage");
    assert.ok(cov.some(f => f.message.includes("no Test Engineer")), "should warn about missing tester");
  });

  it("no coverage warning when Test Engineer is present", () => {
    const chain = makeChain("Orchestrator", "Backend Engineer", "Frontend Developer", "Test Engineer", "Critic Reviewer");
    const cov = detectConflicts(chain).filter(f => f.type === "coverage");
    assert.equal(cov.length, 0);
  });
});

// ── Clean chain ───────────────────────────────────────────────────────────────

describe("clean chain", () => {
  it("standard feature chain produces 0 findings", () => {
    const chain = makeChain(
      "Orchestrator", "Product Strategist", "UI Designer",
      "Backend Engineer", "Frontend Developer", "Test Engineer",
      "Critic Reviewer"
    );
    const findings = detectConflicts(chain);
    assert.equal(findings.length, 0, `expected 0 findings, got: ${findings.map(f => f.message).join("; ")}`);
  });

  it("treatment chain produces 0 findings", () => {
    const chain = makeChain(
      "Orchestrator", "Repo Researcher", "Metadata Curator",
      "Release Engineer", "Critic Reviewer"
    );
    const findings = detectConflicts(chain);
    assert.equal(findings.length, 0, `expected 0 findings, got: ${findings.map(f => f.message).join("; ")}`);
  });
});

// ── Repair suggestions ────────────────────────────────────────────────────────

describe("repair suggestions", () => {
  it("every finding has a non-empty repair field", () => {
    // Deliberately broken chain to trigger multiple findings
    const chain = makeChain("Orchestrator", "Test Engineer", "Launch Copywriter", "Critic Reviewer");
    const findings = detectConflicts(chain);
    assert.ok(findings.length > 0, "should have findings");
    for (const f of findings) {
      assert.ok(f.repair && f.repair.length > 10, `finding "${f.message}" has weak repair: "${f.repair}"`);
    }
  });
});
