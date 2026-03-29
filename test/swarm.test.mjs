import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLE_CATALOG } from "../src/route.mjs";
import { TEAM_PACKS, suggestPack } from "../src/packs.mjs";
import { ROLE_ARTIFACT_CONTRACTS, PACK_HANDOFF_CONTRACTS } from "../src/artifacts.mjs";
import { MISSIONS, getMission, suggestMission, validateMission } from "../src/mission.mjs";
import { createRun } from "../src/mission-run.mjs";
import { TOOL_PROFILES } from "../src/tool-profiles.mjs";

// ── Swarm Roles ─────────────────────────────────────────────────────────────

describe("Swarm roles in ROLE_CATALOG", () => {
  const SWARM_ROLES = [
    "Swarm Coordinator",
    "Swarm Backend Agent",
    "Swarm Bridge Agent",
    "Swarm Tests Agent",
    "Swarm Infra Agent",
    "Swarm Frontend Agent",
    "Swarm Synthesizer",
  ];

  it("all 7 swarm roles exist", () => {
    const names = ROLE_CATALOG.map(r => r.name);
    for (const role of SWARM_ROLES) {
      assert.ok(names.includes(role), `Missing role: ${role}`);
    }
  });

  it("all swarm roles belong to the swarm pack", () => {
    const swarmRoles = ROLE_CATALOG.filter(r => r.pack === "swarm");
    assert.equal(swarmRoles.length, 7);
  });

  it("domain agents have Code or Test affinity", () => {
    const domainAgents = ROLE_CATALOG.filter(r =>
      r.pack === "swarm" && r.name.includes("Agent")
    );
    for (const agent of domainAgents) {
      const hasCodeOrTest = agent.deliverableAffinity.includes("Code") ||
                            agent.deliverableAffinity.includes("Test");
      const hasReview = agent.deliverableAffinity.includes("Review");
      assert.ok(hasCodeOrTest || hasReview, `${agent.name} should have Code, Test, or Review affinity`);
    }
  });

  it("coordinator has phase 0, domain agents phase 3, synthesizer phase 5", () => {
    const coordinator = ROLE_CATALOG.find(r => r.name === "Swarm Coordinator");
    assert.equal(coordinator.phase, 0);

    const backend = ROLE_CATALOG.find(r => r.name === "Swarm Backend Agent");
    assert.equal(backend.phase, 3);

    const synth = ROLE_CATALOG.find(r => r.name === "Swarm Synthesizer");
    assert.equal(synth.phase, 5);
  });
});

// ── Swarm Pack ──────────────────────────────────────────────────────────────

describe("Swarm pack in TEAM_PACKS", () => {
  it("exists", () => {
    assert.ok(TEAM_PACKS.swarm, "swarm pack missing");
  });

  it("has 8 roles (7 swarm + Critic Reviewer)", () => {
    assert.equal(TEAM_PACKS.swarm.roles.length, 8);
    assert.ok(TEAM_PACKS.swarm.roles.includes("Critic Reviewer"));
  });

  it("does not require orchestrator (Coordinator handles it)", () => {
    assert.equal(TEAM_PACKS.swarm.orchestratorRequired, false);
  });

  it("has mismatch guards", () => {
    assert.ok(TEAM_PACKS.swarm.mismatchGuards.length >= 3);
  });

  it("has trial evidence", () => {
    assert.ok(TEAM_PACKS.swarm.trialEvidence.includes("claude-collaborate"));
  });

  it("suggestPack matches on swarm keywords", () => {
    const result = suggestPack("run a dogfood swarm health pass on this repo");
    assert.ok(result);
    assert.equal(result.pack, "swarm");
  });
});

// ── Swarm Artifact Contracts ────────────────────────────────────────────────

describe("Swarm artifact contracts", () => {
  const SWARM_ROLES_WITH_CONTRACTS = [
    "Swarm Coordinator",
    "Swarm Backend Agent",
    "Swarm Bridge Agent",
    "Swarm Tests Agent",
    "Swarm Infra Agent",
    "Swarm Frontend Agent",
    "Swarm Synthesizer",
  ];

  it("all 7 swarm roles have artifact contracts", () => {
    for (const role of SWARM_ROLES_WITH_CONTRACTS) {
      assert.ok(ROLE_ARTIFACT_CONTRACTS[role], `Missing contract for ${role}`);
    }
  });

  it("coordinator produces swarm-gate", () => {
    assert.equal(ROLE_ARTIFACT_CONTRACTS["Swarm Coordinator"].artifactType, "swarm-gate");
  });

  it("domain agents produce wave-report", () => {
    for (const role of ["Swarm Backend Agent", "Swarm Bridge Agent", "Swarm Tests Agent", "Swarm Infra Agent", "Swarm Frontend Agent"]) {
      assert.equal(ROLE_ARTIFACT_CONTRACTS[role].artifactType, "wave-report");
    }
  });

  it("synthesizer produces swarm-final-report", () => {
    assert.equal(ROLE_ARTIFACT_CONTRACTS["Swarm Synthesizer"].artifactType, "swarm-final-report");
  });

  it("tests agent has coverage-delta section", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Swarm Tests Agent"];
    assert.ok(contract.requiredSections.includes("coverage-delta"));
  });

  it("frontend agent has accessibility-issues section", () => {
    const contract = ROLE_ARTIFACT_CONTRACTS["Swarm Frontend Agent"];
    assert.ok(contract.requiredSections.includes("accessibility-issues"));
  });

  it("pack handoff contract exists for swarm", () => {
    assert.ok(PACK_HANDOFF_CONTRACTS.swarm, "Missing swarm handoff contract");
    assert.ok(PACK_HANDOFF_CONTRACTS.swarm.flow.length >= 6);
  });

  it("pack handoff ends with Critic Reviewer producing verdict", () => {
    const flow = PACK_HANDOFF_CONTRACTS.swarm.flow;
    const last = flow[flow.length - 1];
    assert.equal(last.role, "Critic Reviewer");
    assert.equal(last.consumedBy, null);
  });
});

// ── Swarm Mission Definition ────────────────────────────────────────────────

describe("dogfood-swarm mission", () => {
  it("exists in MISSIONS", () => {
    assert.ok(MISSIONS["dogfood-swarm"]);
  });

  it("validates successfully", () => {
    const result = validateMission("dogfood-swarm");
    assert.equal(result.valid, true, `Validation failed: ${result.issues.join(", ")}`);
  });

  it("has pack = swarm", () => {
    assert.equal(MISSIONS["dogfood-swarm"].pack, "swarm");
  });

  it("has 8 roles in roleChain", () => {
    assert.equal(MISSIONS["dogfood-swarm"].roleChain.length, 8);
  });

  it("suggestMission matches on swarm keywords", () => {
    const result = suggestMission("dogfood swarm this repo");
    assert.ok(result);
    assert.equal(result.mission, "dogfood-swarm");
  });

  it("suggestMission matches on convergence keyword", () => {
    const result = suggestMission("run a full quality convergence pass");
    assert.ok(result);
    assert.equal(result.mission, "dogfood-swarm");
  });

  it("has waveLoops with 5 stages", () => {
    const wl = MISSIONS["dogfood-swarm"].waveLoops;
    assert.ok(Array.isArray(wl));
    assert.equal(wl.length, 5);
    assert.equal(wl[0].stage, "health-a");
    assert.equal(wl[1].stage, "health-b");
    assert.equal(wl[2].stage, "health-c");
    assert.equal(wl[3].stage, "feature");
    assert.equal(wl[4].stage, "treatment");
  });

  it("health-a loops until 0 CRITICAL + 0 HIGH", () => {
    const ha = MISSIONS["dogfood-swarm"].waveLoops[0];
    assert.ok(ha.exitCondition.includes("0 CRITICAL"));
    assert.equal(ha.userApproval, false);
    assert.equal(ha.buildGate, true);
  });

  it("health-b requires user approval", () => {
    const hb = MISSIONS["dogfood-swarm"].waveLoops[1];
    assert.equal(hb.userApproval, true);
  });

  it("feature stage requires user approval", () => {
    const feat = MISSIONS["dogfood-swarm"].waveLoops[3];
    assert.equal(feat.userApproval, true);
  });

  it("treatment stage requires user approval and references full-treatment", () => {
    const treat = MISSIONS["dogfood-swarm"].waveLoops[4];
    assert.equal(treat.stage, "treatment");
    assert.equal(treat.userApproval, true);
    assert.equal(treat.buildGate, true);
    assert.ok(treat.exitCondition.includes("shipcheck"));
    assert.ok(treat.notes.includes("full-treatment.md"));
  });

  it("has exclusiveOwnership config", () => {
    const eo = MISSIONS["dogfood-swarm"].exclusiveOwnership;
    assert.ok(eo);
    assert.equal(eo.mode, "strict");
    assert.equal(eo.maxAgentsPerWave, 5);
  });

  it("has dynamicDispatch config", () => {
    const dd = MISSIONS["dogfood-swarm"].dynamicDispatch;
    assert.ok(dd);
    assert.equal(dd.manifestSource, "swarm-manifest.json");
    assert.equal(dd.scalingRoles.length, 5);
  });

  it("has at least 5 escalation branches", () => {
    assert.ok(MISSIONS["dogfood-swarm"].escalationBranches.length >= 5);
  });

  it("has at least 4 stop conditions", () => {
    assert.ok(MISSIONS["dogfood-swarm"].stopConditions.length >= 4);
  });

  it("artifact flow has stage annotations", () => {
    const flow = MISSIONS["dogfood-swarm"].artifactFlow;
    const stages = new Set(flow.map(s => s.stage));
    assert.ok(stages.has("health-a"));
    assert.ok(stages.has("health-b"));
    assert.ok(stages.has("health-c"));
    assert.ok(stages.has("feature"));
    assert.ok(stages.has("treatment"));
    assert.ok(stages.has("final"));
  });

  it("trial evidence references claude-collaborate", () => {
    assert.ok(MISSIONS["dogfood-swarm"].trialEvidence.includes("claude-collaborate"));
  });
});

// ── Swarm Dynamic Dispatch ──────────────────────────────────────────────────

describe("Swarm dynamic dispatch", () => {
  const sampleManifest = {
    version: "1.0",
    repo: "test-repo",
    repoType: "cli",
    domains: [
      { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**"], agentSlot: 0 },
      { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**"], agentSlot: 1 },
      { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**", "*.md"], agentSlot: 2 },
    ],
    stages: ["health-a", "health-b", "health-c", "feature", "treatment"],
  };

  it("creates run with correct step count from manifest", () => {
    // 3 domains × 5 stages = 15 domain steps + 5 coordinator gates + synthesizer + critic = 22
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    assert.equal(run.steps.length, 22);
  });

  it("domain steps have stage annotations", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const healthASteps = run.steps.filter(s => s.stage === "health-a" && s.role !== "Swarm Coordinator");
    assert.equal(healthASteps.length, 3); // 3 domains
  });

  it("coordinator gate steps exist for each stage", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const gates = run.steps.filter(s => s.isGate);
    assert.equal(gates.length, 5); // one per stage (health-a, health-b, health-c, feature, treatment)
  });

  it("gates have exit condition and build gate flags", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const healthAGate = run.steps.find(s => s.isGate && s.stage === "health-a");
    assert.ok(healthAGate);
    assert.ok(healthAGate.exitCondition);
    assert.equal(healthAGate.buildGate, true);
  });

  it("health-b gate has userApproval", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const hbGate = run.steps.find(s => s.isGate && s.stage === "health-b");
    assert.equal(hbGate.userApproval, true);
  });

  it("feature gate has userApproval", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const featGate = run.steps.find(s => s.isGate && s.stage === "feature");
    assert.equal(featGate.userApproval, true);
  });

  it("stages are ordered correctly (health-a → health-b → health-c → feature → treatment → final)", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const stageOrder = [];
    for (const step of run.steps) {
      if (!stageOrder.includes(step.stage)) stageOrder.push(step.stage);
    }
    assert.deepEqual(stageOrder, ["health-a", "health-b", "health-c", "feature", "treatment", "final"]);
  });

  it("final stage has Synthesizer and Critic", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const finalSteps = run.steps.filter(s => s.stage === "final");
    assert.equal(finalSteps.length, 2);
    assert.equal(finalSteps[0].role, "Swarm Synthesizer");
    assert.equal(finalSteps[1].role, "Critic Reviewer");
  });

  it("domain steps have patterns from manifest", () => {
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: sampleManifest });
    const backendStep = run.steps.find(s => s.domain === "backend");
    assert.ok(backendStep);
    assert.deepEqual(backendStep.patterns, ["src/**"]);
  });

  it("scales with domain count — 5 domains creates more steps", () => {
    const bigManifest = {
      ...sampleManifest,
      domains: [
        { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**"], agentSlot: 0 },
        { id: "bridge", role: "Swarm Bridge Agent", patterns: ["bridge/**"], agentSlot: 1 },
        { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**"], agentSlot: 2 },
        { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**"], agentSlot: 3 },
        { id: "frontend", role: "Swarm Frontend Agent", patterns: ["ui/**"], agentSlot: 4 },
      ],
    };
    // 5 domains × 5 stages = 25 domain steps + 5 gates + 2 final = 32
    const run = createRun("dogfood-swarm", "Test swarm", { manifest: bigManifest });
    assert.equal(run.steps.length, 32);
  });
});

// ── Tool Profiles ───────────────────────────────────────────────────────────

describe("Swarm tool profiles", () => {
  it("all 7 swarm roles have tool profiles", () => {
    const roles = [
      "Swarm Coordinator", "Swarm Backend Agent", "Swarm Bridge Agent",
      "Swarm Tests Agent", "Swarm Infra Agent", "Swarm Frontend Agent",
      "Swarm Synthesizer",
    ];
    for (const role of roles) {
      assert.ok(TOOL_PROFILES[role], `Missing tool profile for ${role}`);
    }
  });

  it("domain agents have Edit tool (they remediate code)", () => {
    const agents = ["Swarm Backend Agent", "Swarm Bridge Agent", "Swarm Tests Agent", "Swarm Infra Agent", "Swarm Frontend Agent"];
    for (const agent of agents) {
      assert.ok(TOOL_PROFILES[agent].includes("Edit"), `${agent} should have Edit tool`);
    }
  });

  it("coordinator does not have Edit (orchestration only)", () => {
    assert.ok(!TOOL_PROFILES["Swarm Coordinator"].includes("Edit"));
  });
});
