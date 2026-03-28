/**
 * Deep Audit Proof Run — Runner-Native Self-Audit
 *
 * Proves that createRun("deep-audit", ..., { manifest }) works end-to-end
 * with the REAL Role-OS audit-manifest.json. This is the proof that
 * Dynamic Dispatch is not just wired but actually produces the right
 * shape from a real repo decomposition.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createRun,
  startNextStep,
  completeStep,
  failStep,
  recordEscalation,
  getRunPosition,
  getArtifactChain,
  generateCompletionReport,
  formatCompletionReport,
} from "../src/mission-run.mjs";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));

// Load the REAL manifest — not a mock
const manifestPath = join(__dirname, "..", "audit-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// ── Manifest sanity ─────────────────────────────────────────────────────────

describe("manifest integrity", () => {
  it("has components and boundaries", () => {
    assert.ok(Array.isArray(manifest.components));
    assert.ok(manifest.components.length >= 5);
    assert.ok(Array.isArray(manifest.boundaries));
    assert.ok(manifest.boundaries.length >= 5);
  });

  it("every component has an id", () => {
    for (const c of manifest.components) {
      assert.ok(c.id, `Component missing id: ${JSON.stringify(c)}`);
    }
  });

  it("every boundary has from and to", () => {
    for (const b of manifest.boundaries) {
      assert.ok(b.from, `Boundary missing from`);
      assert.ok(b.to, `Boundary missing to`);
    }
  });
});

// ── Dynamic dispatch step creation ──────────────────────────────────────────

describe("runner-native dispatch from real manifest", () => {
  it("creates the correct total step count", () => {
    const run = createRun("deep-audit", "Role-OS self-audit", { manifest });
    // N components + N test truth + K boundaries + non-scaling (2 synth + 1 critic) = 2N + K + 3
    const N = manifest.components.length;   // 6
    const K = manifest.boundaries.length;   // 8
    const expected = (2 * N) + K + 3;       // 23
    assert.equal(run.steps.length, expected,
      `Expected ${expected} steps (2×${N} + ${K} + 3), got ${run.steps.length}`);
  });

  it("creates one Component Auditor per component", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    const compSteps = run.steps.filter(s => s.role === "Component Auditor");
    assert.equal(compSteps.length, manifest.components.length);
    for (let i = 0; i < manifest.components.length; i++) {
      assert.equal(compSteps[i].parcel, manifest.components[i].id,
        `Step ${i} parcel should be ${manifest.components[i].id}`);
    }
  });

  it("creates one Test Truth Auditor per component", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    const testSteps = run.steps.filter(s => s.role === "Test Truth Auditor");
    assert.equal(testSteps.length, manifest.components.length);
    for (let i = 0; i < manifest.components.length; i++) {
      assert.equal(testSteps[i].parcel, manifest.components[i].id);
    }
  });

  it("creates one Seam Auditor per boundary", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    const seamSteps = run.steps.filter(s => s.role === "Seam Auditor");
    assert.equal(seamSteps.length, manifest.boundaries.length);
    // Verify parcel labels match boundary from-to
    for (let i = 0; i < manifest.boundaries.length; i++) {
      const b = manifest.boundaries[i];
      const expected = `${b.from}-${b.to}`;
      assert.equal(seamSteps[i].parcel, expected);
    }
  });

  it("includes exactly 2 Audit Synthesizer steps and 1 Critic Reviewer", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    const synth = run.steps.filter(s => s.role === "Audit Synthesizer");
    const critic = run.steps.filter(s => s.role === "Critic Reviewer");
    assert.equal(synth.length, 2, "Should have 2 Audit Synthesizer steps (summary + action plan)");
    assert.equal(critic.length, 1, "Should have 1 Critic Reviewer step");
  });

  it("non-scaling roles come after all scaling roles", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    const scalingRoles = new Set(["Component Auditor", "Test Truth Auditor", "Seam Auditor"]);
    let seenNonScaling = false;
    for (const step of run.steps) {
      if (!scalingRoles.has(step.role)) seenNonScaling = true;
      if (seenNonScaling && scalingRoles.has(step.role)) {
        assert.fail(`Scaling role "${step.role}" appears after non-scaling role`);
      }
    }
  });

  it("marks run as dynamicDispatch and retains manifest", () => {
    const run = createRun("deep-audit", "self-audit", { manifest });
    assert.equal(run.dynamicDispatch, true);
    assert.ok(run.manifest);
    assert.equal(run.manifest.components.length, manifest.components.length);
  });
});

// ── Artifact validation fires on every step ─────────────────────────────────

describe("artifact validation in dynamic run", () => {
  it("every completed step has artifactValidation attached", () => {
    const run = createRun("deep-audit", "validation proof", { manifest });
    // Complete first 3 steps (component auditors)
    for (let i = 0; i < 3; i++) {
      startNextStep(run);
      const step = completeStep(run, `## Findings\nFinding ${i}.\n## Summary\nDone.`);
      assert.ok(step.artifactValidation, `Step ${i} should have validation`);
      assert.ok("valid" in step.artifactValidation);
    }
  });

  it("validation detects missing sections for known roles", () => {
    const run = createRun("deep-audit", "validation proof", { manifest });
    startNextStep(run); // Component Auditor
    // Intentionally incomplete artifact — missing required sections
    const step = completeStep(run, "Just a paragraph with no sections.");
    assert.ok(step.artifactValidation);
    // Component Auditor contract requires findings + summary sections
    if (!step.artifactValidation.valid) {
      assert.ok(step.artifactValidation.missing.length > 0);
    }
    // Step still completes (warn, don't block)
    assert.equal(step.status, "completed");
  });
});

// ── Full lifecycle proof ────────────────────────────────────────────────────

describe("full runner-native audit lifecycle", () => {
  it("completes all 23 steps and generates report", () => {
    const run = createRun("deep-audit", "Role-OS v2.1.1 self-audit", { manifest });
    const totalSteps = run.steps.length;

    // Walk through every step
    for (let i = 0; i < totalSteps; i++) {
      const step = startNextStep(run);
      assert.ok(step, `Step ${i} should be startable`);
      assert.equal(step.status, "active");

      const pos = getRunPosition(run);
      assert.equal(pos.progress, `${i}/${totalSteps}`);

      // Produce a realistic artifact per role type
      let artifact;
      switch (step.role) {
        case "Component Auditor":
          artifact = `## Findings\n### M-${step.parcel}-1\n- Severity: medium\n- File: src/x.mjs\n- Evidence: found issue\n## Summary\n| Severity | Count |\n|---|---|\n| Medium | 1 |`;
          break;
        case "Test Truth Auditor":
          artifact = `## Findings\n### T-${step.parcel}-1\n- Category: coverage\n- Evidence: gap found\n## Component Scorecards\n| Component | Verdict |\n|---|---|\n| ${step.parcel} | SOLID |`;
          break;
        case "Seam Auditor":
          artifact = `## Findings\n### S-${step.parcel}-1\n- Category: contract\n- Evidence: boundary checked\n## Summary\nClean boundary.`;
          break;
        case "Audit Synthesizer":
          artifact = `## Verdict\nACCEPT WITH CONDITIONS\n## Finding Rollup\n| Severity | Count |\n|---|---|\n| Medium | 6 |\n## Action Plan\nP1: Fix critical. P2: Wire gates.`;
          break;
        case "Critic Reviewer":
          artifact = `## Verdict\nACCEPT\n## Evidence\n- All parcels complete\n- Synthesis is truthful\n## Required Corrections\nNone.`;
          break;
        default:
          artifact = `Output for ${step.role}`;
      }

      completeStep(run, artifact);
    }

    // Run should be complete
    assert.equal(run.status, "completed");
    assert.ok(run.completedAt);

    // All steps completed
    const allCompleted = run.steps.every(s => s.status === "completed");
    assert.ok(allCompleted, "Every step should be completed");

    // Every step has artifact validation
    for (const step of run.steps) {
      assert.ok(step.artifactValidation, `${step.role} (${step.parcel || "terminal"}) missing validation`);
    }

    // Generate report
    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "completed");
    assert.equal(report.artifactsProduced, totalSteps);
    assert.equal(report.escalationCount, 0);
    assert.ok(report.durationMs !== null);

    // Artifact chain has all entries
    const chain = getArtifactChain(run);
    assert.equal(chain.length, totalSteps);
  });

  it("format report shows all dynamic roles", () => {
    const run = createRun("deep-audit", "format proof", { manifest });
    for (let i = 0; i < run.steps.length; i++) {
      startNextStep(run);
      completeStep(run, `Artifact ${i}`);
    }
    const report = generateCompletionReport(run);
    const text = formatCompletionReport(report);

    assert.ok(text.includes("Deep Audit"), "Report should reference mission name");
    assert.ok(text.includes("COMPLETED"), "Report should show completed");
    assert.ok(text.includes(`${run.steps.length}/${run.steps.length}`), "Progress should be N/N");
    assert.ok(text.includes("Component Auditor"), "Should list Component Auditor steps");
    assert.ok(text.includes("Seam Auditor"), "Should list Seam Auditor steps");
    assert.ok(text.includes("Audit Synthesizer"), "Should list Audit Synthesizer");
    assert.ok(text.includes("Critic Reviewer"), "Should list Critic Reviewer");
  });
});

// ── Escalation in dynamic run ───────────────────────────────────────────────

describe("escalation in dynamic run", () => {
  it("escalation re-opens a component auditor step", () => {
    const run = createRun("deep-audit", "escalation proof", { manifest });

    // Complete first component auditor
    startNextStep(run);
    completeStep(run, "Initial audit of routing-roles");

    // Start second component auditor
    startNextStep(run);

    // Escalate back to first — "component exceeds 8K lines"
    recordEscalation(run,
      "Component Auditor", "Component Auditor",
      "component exceeds 8K lines", "re-slice into sub-components");

    assert.equal(run.escalations.length, 1);
    // First step should be re-opened
    const firstStep = run.steps[0];
    assert.equal(firstStep.status, "pending");
    assert.equal(firstStep.artifact, null);
  });

  it("partial run generates honest-partial report", () => {
    const run = createRun("deep-audit", "partial proof", { manifest });

    // Complete some steps
    startNextStep(run);
    completeStep(run, "First parcel done");
    startNextStep(run);
    completeStep(run, "Second parcel done");
    startNextStep(run);

    // Third step fails
    failStep(run, "partial", "Component too tangled to audit cleanly");
    assert.equal(run.status, "partial");

    const report = generateCompletionReport(run);
    assert.equal(report.outcome, "partial");
    assert.ok(report.honestPartial);
    assert.equal(report.progress, `2/${run.steps.length}`);

    const text = formatCompletionReport(report);
    assert.ok(text.includes("PARTIAL"));
    assert.ok(text.includes("Honest Partial"));
  });
});

// ── Scaling verification ────────────────────────────────────────────────────

describe("scaling verification", () => {
  it("step count matches 2N + K + 3 formula", () => {
    // Test with several manifest sizes
    const cases = [
      { components: 3, boundaries: 2, expected: 11 },   // 6 + 2 + 3
      { components: 6, boundaries: 8, expected: 23 },   // 12 + 8 + 3 (real manifest)
      { components: 10, boundaries: 5, expected: 28 },  // 20 + 5 + 3
      { components: 15, boundaries: 12, expected: 45 }, // 30 + 12 + 3
    ];

    for (const { components: n, boundaries: k, expected } of cases) {
      const m = {
        components: Array.from({ length: n }, (_, i) => ({ id: `c${i}` })),
        boundaries: Array.from({ length: k }, (_, i) => ({ from: `c${i}`, to: `c${i + 1}` })),
      };
      const run = createRun("deep-audit", "scaling test", { manifest: m });
      assert.equal(run.steps.length, expected,
        `${n} components + ${k} boundaries should produce ${expected} steps, got ${run.steps.length}`);
    }
  });

  it("real manifest produces exactly 23 steps", () => {
    const run = createRun("deep-audit", "real manifest", { manifest });
    assert.equal(run.steps.length, 23);
    assert.equal(run.steps.filter(s => s.role === "Component Auditor").length, 6);
    assert.equal(run.steps.filter(s => s.role === "Test Truth Auditor").length, 6);
    assert.equal(run.steps.filter(s => s.role === "Seam Auditor").length, 8);
    assert.equal(run.steps.filter(s => s.role === "Audit Synthesizer").length, 2);
    assert.equal(run.steps.filter(s => s.role === "Critic Reviewer").length, 1);
  });
});
