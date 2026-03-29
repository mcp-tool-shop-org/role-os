/**
 * P5 — Audit-driven test additions.
 *
 * P5-1: Concurrency test for persistent run state
 * P5-2: Case-insensitive section header test for artifacts
 * P5-3: Corrupted ledger file test for calibration
 * P5-4: Chain length cap test for assembleChain
 * P5-5: Atom pool resolution test for golden-run challenges
 * P5-6: Artifact persistence round-trip assertion
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const TEST_CWD = join(__dirname, "..", ".test-p5");

function cleanup() {
  if (existsSync(TEST_CWD)) rmSync(TEST_CWD, { recursive: true });
}

// ── P5-1: Concurrent persistent run state ────────────────────────────────────

describe("P5-1: concurrent persistent run state", () => {
  afterEach(cleanup);

  it("two runs saved to the same cwd do not overwrite each other", async () => {
    const { createPersistentRun, loadRun, listRuns } = await import("../src/run.mjs");

    const run1 = await createPersistentRun("first task", TEST_CWD);
    const run2 = await createPersistentRun("second task", TEST_CWD);

    assert.notEqual(run1.id, run2.id, "Run IDs must be unique");

    const loaded1 = loadRun(TEST_CWD, run1.id);
    const loaded2 = loadRun(TEST_CWD, run2.id);

    assert.equal(loaded1.taskDescription, "first task");
    assert.equal(loaded2.taskDescription, "second task");

    const all = listRuns(TEST_CWD);
    assert.equal(all.length, 2);
  });

  it("saveRun produces atomic writes (tmp file renamed)", async () => {
    const { createPersistentRun, saveRun, loadRun } = await import("../src/run.mjs");

    const run = await createPersistentRun("atomic test", TEST_CWD);
    run.status = "running";
    saveRun(TEST_CWD, run);

    const loaded = loadRun(TEST_CWD, run.id);
    assert.equal(loaded.status, "running");

    // No .tmp files should remain
    const runsDir = join(TEST_CWD, ".claude", "runs");
    if (existsSync(runsDir)) {
      const { readdirSync } = await import("node:fs");
      const files = readdirSync(runsDir);
      const tmpFiles = files.filter(f => f.endsWith(".tmp"));
      assert.equal(tmpFiles.length, 0, "No .tmp files should remain after save");
    }
  });
});

// ── P5-2: Case-insensitive section headers in artifact validation ────────────

describe("P5-2: case-insensitive section headers", () => {
  it("validateArtifact matches section headers case-insensitively", async () => {
    const { validateArtifact } = await import("../src/artifacts.mjs");

    // Backend Engineer requires: files-to-change, implementation-approach, risk-notes
    const artifact = [
      "## FILES TO CHANGE",
      "- src/run.mjs",
      "",
      "## Implementation Approach",
      "Add visited-set parameter.",
      "",
      "## RISK NOTES",
      "Minor performance impact.",
    ].join("\n");

    const result = validateArtifact("Backend Engineer", artifact);
    // All three required sections should be found regardless of casing
    assert.ok(result, "validateArtifact should return a result");
    // Count missing required sections
    const missing = result.missingSections || [];
    assert.equal(missing.length, 0, `No sections should be missing, got: ${missing.join(", ")}`);
  });
});

// ── P5-3: Corrupted ledger file for calibration ─────────────────────────────

describe("P5-3: corrupted calibration ledger", () => {
  afterEach(cleanup);

  it("readOutcomes handles corrupted JSON gracefully", async () => {
    const { readOutcomes } = await import("../src/calibration.mjs");

    const ledgerDir = join(TEST_CWD, ".claude", "calibration");
    mkdirSync(ledgerDir, { recursive: true });
    writeFileSync(join(ledgerDir, "outcomes.json"), "NOT_VALID_JSON{{{");

    const outcomes = readOutcomes(TEST_CWD);
    assert.ok(Array.isArray(outcomes), "Should return an array even on corrupted file");
    assert.equal(outcomes.length, 0, "Should return empty array for corrupted file");
  });
});

// ── P5-4: Chain length cap for assembleChain ────────────────────────────────

describe("P5-4: assembleChain length", () => {
  it("assembleChain does not crash on large input", async () => {
    const { assembleChain, scoreRole, MIN_SCORE_THRESHOLD } = await import("../src/route.mjs");

    // Create a large scored-roles array
    const fakeRoles = Array.from({ length: 50 }, (_, i) => ({
      role: { name: `Role-${i}`, pack: "engineering", phase: i % 5 },
      score: MIN_SCORE_THRESHOLD + 1,
    }));

    const chain = assembleChain(fakeRoles);
    assert.ok(Array.isArray(chain), "assembleChain should return an array");
    assert.equal(chain.length, 50, "All roles should be included (no implicit cap)");
  });
});

// ── P5-5: Atom pool resolution for golden-run challenges ────────────────────

describe("P5-5: atom pool resolution", () => {
  it("translateToAtoms preserves source_role and claim_kind on all atoms", async () => {
    const { translateToAtoms, validateAtomProvenance } = await import("../src/brainstorm-roles.mjs");

    // Minimal ContextMap artifact matching translateToAtoms expected shape
    const contextMapArtifact = {
      type: "ContextMap",
      terms: [
        { term: "Unit Test", meaning: "Test of a single code unit", adjacent_to: ["integration test"] },
      ],
      category_map: [
        { category: "Verification", examples: ["unit test", "integration test"] },
      ],
      lineage_claims: [
        { claim: "Unit testing descended from QA", precedent: ["IEEE 829"] },
      ],
      boundary_claims: [
        { claim: "Testing stops at production monitoring" },
      ],
    };

    const atoms = translateToAtoms("Context Analyst", contextMapArtifact);
    assert.ok(atoms.length > 0, "Should produce at least one atom");

    for (const atom of atoms) {
      const v = validateAtomProvenance(atom);
      assert.ok(v.valid, `Atom ${atom.id} failed provenance: ${v.issues.join(", ")}`);
      assert.equal(atom.source_role, "Context Analyst");
      assert.ok(atom.claim_kind, `Atom ${atom.id} must have claim_kind`);
    }
  });
});

// ── P5-6: Artifact persistence round-trip ───────────────────────────────────

describe("P5-6: artifact persistence round-trip", () => {
  afterEach(cleanup);

  it("completeCurrentStep persists artifact and reloads correctly", async () => {
    const { createPersistentRun, startNext, completeCurrentStep, loadRun } = await import("../src/run.mjs");

    const run = await createPersistentRun("round-trip test", TEST_CWD);
    startNext(run, TEST_CWD);

    const artifactContent = "## Files to Change\n- src/run.mjs\n\n## Implementation Approach\nFix bug.\n\n## Risk Notes\nNone.";
    completeCurrentStep(run, artifactContent, "test note", TEST_CWD);

    // Reload from disk
    const loaded = loadRun(TEST_CWD, run.id);
    const step0 = loaded.steps[0];

    assert.equal(step0.status, "completed");
    assert.equal(step0.artifact, artifactContent, "Artifact content must survive round-trip");
    assert.equal(step0.note, "test note");
    assert.ok(step0.completedAt, "completedAt must be set");
    assert.ok(step0.artifactValidation, "artifactValidation must be persisted");
  });
});
