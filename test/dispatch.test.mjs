import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDispatchManifest,
  updateStepState,
  getChainStatus,
  generateEscalationPacket,
  TOOL_PROFILES,
  EXEC_STATES,
} from "../src/dispatch.mjs";
import { ROLE_CATALOG } from "../src/route.mjs";

function makeChainRoles(...roleNames) {
  return roleNames.map(name => {
    const role = ROLE_CATALOG.find(r => r.name === name);
    if (!role) throw new Error(`Unknown role: ${name}`);
    return { role, score: 3, matched: [], reasons: [] };
  });
}

const SAMPLE_PACKET = `# Task: Build login API
## Requested Outcome
Implement JWT auth endpoint
## Scope
Backend only
## Packet Type
feature
`;

// ── Tool profiles ─────────────────────────────────────────────────────────────

describe("tool profiles", () => {
  it("has profiles for all 32 roles", () => {
    for (const role of ROLE_CATALOG) {
      assert.ok(
        TOOL_PROFILES[role.name],
        `Missing tool profile for ${role.name}`
      );
      assert.ok(TOOL_PROFILES[role.name].length > 0);
    }
  });

  it("engineering roles have Bash access", () => {
    const engineeringRoles = ["Backend Engineer", "Frontend Developer", "Test Engineer"];
    for (const name of engineeringRoles) {
      assert.ok(TOOL_PROFILES[name].includes("Bash"), `${name} should have Bash`);
    }
  });

  it("research roles do NOT have Write access", () => {
    const researchRoles = ["UX Researcher", "Competitive Analyst", "Trend Researcher"];
    for (const name of researchRoles) {
      assert.ok(!TOOL_PROFILES[name].includes("Write"), `${name} should not have Write`);
      assert.ok(!TOOL_PROFILES[name].includes("Edit"), `${name} should not have Edit`);
    }
  });

  it("Critic Reviewer does NOT have Write access", () => {
    assert.ok(!TOOL_PROFILES["Critic Reviewer"].includes("Write"));
    assert.ok(!TOOL_PROFILES["Critic Reviewer"].includes("Edit"));
  });
});

// ── Dispatch manifest ─────────────────────────────────────────────────────────

describe("buildDispatchManifest", () => {
  it("creates manifest with correct step count", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Test Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test-packet.md",
      packetContent: SAMPLE_PACKET,
      chainRoles: chain,
      cwd: "/test/project",
    });

    assert.equal(manifest.totalSteps, 4);
    assert.equal(manifest.steps.length, 4);
    assert.ok(manifest.runId.startsWith("run-"));
    assert.ok(manifest.createdAt);
  });

  it("each step has required fields", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: SAMPLE_PACKET,
      chainRoles: chain,
      cwd: "/test",
    });

    for (const step of manifest.steps) {
      assert.ok(step.packetId);
      assert.ok(step.role);
      assert.ok(step.pack);
      assert.ok(Array.isArray(step.tools));
      assert.ok(step.systemPrompt);
      assert.ok(step.model);
      assert.ok(step.maxTurns > 0);
      assert.ok(step.maxBudgetUsd > 0);
      assert.ok(step.timeoutMs > 0);
      assert.equal(step.state, "queued");
    }
  });

  it("steps have correct dependency chain", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Test Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: SAMPLE_PACKET,
      chainRoles: chain,
      cwd: "/test",
    });

    assert.equal(manifest.steps[0].dependsOn.length, 0); // Orchestrator — no deps
    assert.equal(manifest.steps[1].dependsOn.length, 1); // Backend — depends on Orchestrator
    assert.equal(manifest.steps[2].dependsOn.length, 1); // Test — depends on Backend
    assert.equal(manifest.steps[3].dependsOn.length, 1); // Critic — depends on Test
  });

  it("system prompts include role name and chain context", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: SAMPLE_PACKET,
      chainRoles: chain,
      cwd: "/test",
    });

    assert.ok(manifest.steps[0].systemPrompt.includes("Orchestrator"));
    assert.ok(manifest.steps[0].systemPrompt.includes("step 1 of 3"));
    assert.ok(manifest.steps[1].systemPrompt.includes("Backend Engineer"));
    assert.ok(manifest.steps[1].systemPrompt.includes("Previous role: Orchestrator"));
    assert.ok(manifest.steps[2].systemPrompt.includes("Critic Reviewer"));
    assert.ok(manifest.steps[2].systemPrompt.includes("last worker"));
  });

  it("respects per-role overrides", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: SAMPLE_PACKET,
      chainRoles: chain,
      cwd: "/test",
      overrides: { "Backend Engineer": { model: "opus", maxBudgetUsd: 10.0 } },
    });

    assert.equal(manifest.steps[1].model, "opus");
    assert.equal(manifest.steps[1].maxBudgetUsd, 10.0);
    assert.equal(manifest.steps[0].model, "sonnet"); // Orchestrator uses default
  });
});

// ── Execution state tracking ──────────────────────────────────────────────────

describe("updateStepState", () => {
  it("updates step state", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });

    updateStepState(manifest, 0, "running");
    assert.equal(manifest.steps[0].state, "running");
  });

  it("auto-advances next step to waiting on completion", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });

    updateStepState(manifest, 0, "completed");
    assert.equal(manifest.steps[0].state, "completed");
    assert.equal(manifest.steps[1].state, "waiting"); // auto-advanced
  });

  it("rejects invalid state", () => {
    const chain = makeChainRoles("Orchestrator", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });

    assert.throws(() => updateStepState(manifest, 0, "vibes"), /Invalid state/);
  });
});

// ── Chain status ──────────────────────────────────────────────────────────────

describe("getChainStatus", () => {
  it("queued when all steps are queued", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });

    const status = getChainStatus(manifest);
    assert.equal(status.status, "queued");
    assert.equal(status.completedSteps, 0);
  });

  it("running when a step is running", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });
    updateStepState(manifest, 0, "running");

    const status = getChainStatus(manifest);
    assert.equal(status.status, "running");
    assert.equal(status.currentStep.role, "Orchestrator");
  });

  it("blocked when a step is blocked", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });
    updateStepState(manifest, 0, "completed");
    updateStepState(manifest, 1, "blocked", { reason: "missing API spec" });

    const status = getChainStatus(manifest);
    assert.equal(status.status, "blocked");
    assert.equal(status.blockedSteps.length, 1);
    assert.equal(status.blockedSteps[0].role, "Backend Engineer");
  });

  it("completed when all steps are completed", () => {
    const chain = makeChainRoles("Orchestrator", "Backend Engineer", "Critic Reviewer");
    const manifest = buildDispatchManifest({
      packetFile: "test.md", packetContent: SAMPLE_PACKET,
      chainRoles: chain, cwd: "/test",
    });
    updateStepState(manifest, 0, "completed");
    updateStepState(manifest, 1, "completed");
    updateStepState(manifest, 2, "completed");

    const status = getChainStatus(manifest);
    assert.equal(status.status, "completed");
    assert.equal(status.completedSteps, 3);
  });
});

// ── Escalation packet generation ──────────────────────────────────────────────

describe("generateEscalationPacket", () => {
  it("generates blocked escalation with resolver", () => {
    const step = { packetId: "run-1-step-1", role: "Backend Engineer" };
    const packet = generateEscalationPacket(step, "missing info about auth requirements", "blocked");

    assert.equal(packet.type, "escalation");
    assert.equal(packet.verdict, "blocked");
    assert.equal(packet.escalation.targetRole, "Product Strategist");
    assert.ok(packet.packet.title.includes("Backend Engineer"));
    assert.ok(packet.packet.title.includes("blocked"));
    assert.ok(packet.packet.requiredArtifact);
  });

  it("generates rejected escalation routing back to previous role", () => {
    const step = { packetId: "run-1-step-2", role: "Backend Engineer" };
    const packet = generateEscalationPacket(step, "quality bar miss — tests incomplete", "reject");

    assert.equal(packet.type, "escalation");
    assert.equal(packet.verdict, "reject");
    assert.equal(packet.escalation.targetRole, "Backend Engineer"); // back to producer
    assert.equal(packet.escalation.recovery, "retry");
  });

  it("generates escalation with all required fields", () => {
    const step = { packetId: "run-1-step-0", role: "Orchestrator" };
    const packet = generateEscalationPacket(step, "dependency unavailable", "blocked");

    assert.ok(packet.sourceStep);
    assert.ok(packet.sourceRole);
    assert.ok(packet.escalation.targetRole);
    assert.ok(packet.escalation.recovery);
    assert.ok(packet.escalation.requiredArtifact);
    assert.ok(packet.packet.title);
    assert.ok(packet.packet.assignedRole);
    assert.ok(packet.generatedAt);
  });
});

// ── Execution states ──────────────────────────────────────────────────────────

describe("execution states", () => {
  it("has at least 7 states", () => {
    assert.ok(EXEC_STATES.length >= 7);
  });

  it("includes all critical states", () => {
    const critical = ["queued", "running", "blocked", "completed", "failed"];
    for (const state of critical) {
      assert.ok(EXEC_STATES.includes(state), `Missing state: ${state}`);
    }
  });
});
