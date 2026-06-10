/**
 * Persistent Run Engine — Phase U (v2.0.0)
 *
 * One command from task description to active execution.
 * Runs persist to disk so sessions can resume.
 *
 * `roleos run "<task>"` → entry decision → plan → execute
 * `roleos resume`       → continue interrupted run
 * `roleos next`         → show what's next
 * `roleos explain`      → show current state
 *
 * Interventions: reroute, split, escalate, retry, block, reopen
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { decideEntry } from "./entry.mjs";
import { getMission } from "./mission.mjs";
import { TEAM_PACKS, getPack, getPackRoles } from "./packs.mjs";
import { ROLE_CATALOG } from "./route.mjs";
import { ROLE_ARTIFACT_CONTRACTS, validateArtifact, getHandoffContract } from "./artifacts.mjs";
import { buildSwarmSteps, buildDynamicSteps } from "./mission-run.mjs";
import { isValidStepTransition } from "./state-machine.mjs";
import { retrieveForDispatch, isKnowledgeConfigured } from "./knowledge/index.mjs";

// ── Run directory ────────────────────────────────────────────────────────────

const RUNS_DIR = ".claude/runs";

function runsDir(cwd) {
  return join(cwd, RUNS_DIR);
}

function runPath(cwd, id) {
  return join(runsDir(cwd), `${id}.json`);
}

// ── Run statuses ─────────────────────────────────────────────────────────────

/**
 * @typedef {"planning"|"running"|"paused"|"completed"|"partial"|"failed"} RunStatus
 */

/**
 * @typedef {"pending"|"active"|"completed"|"partial"|"failed"|"blocked"|"skipped"} StepStatus
 */

/**
 * @typedef {Object} RunStep
 * @property {number} index
 * @property {string} role
 * @property {string} produces - artifact type this step should produce
 * @property {StepStatus} status
 * @property {string|null} artifact - produced artifact content/reference
 * @property {string|null} note
 * @property {string|null} guidance - step-local operator guidance
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} PersistentRun
 * @property {string} id
 * @property {string} taskDescription
 * @property {"mission"|"pack"|"free-routing"} entryLevel
 * @property {string|null} missionKey
 * @property {string|null} packKey
 * @property {object} entryDecision - full entry decision snapshot
 * @property {RunStatus} status
 * @property {RunStep[]} steps
 * @property {Array<object>} escalations
 * @property {Array<object>} interventions - operator interventions log
 * @property {string} createdAt
 * @property {string|null} pausedAt
 * @property {string|null} completedAt
 * @property {object|null} completionReport
 */

let _counter = 0;

// ── Create a run ─────────────────────────────────────────────────────────────

/**
 * Create a new persistent run from a task description.
 * Uses decideEntry() to pick the right level, then builds steps.
 *
 * @param {string} taskDescription
 * @param {string} cwd - working directory (for persistence)
 * @param {object} [opts]
 * @param {string} [opts.forceMission] - force a specific mission key
 * @param {string} [opts.forcePack] - force a specific pack key
 * @param {object} [opts.manifest] - dispatch manifest for dynamic missions
 *   (swarm-manifest.json for dogfood-swarm, audit-manifest.json for deep-audit);
 *   scales steps per domain/component instead of using the static artifactFlow
 * @returns {PersistentRun}
 */
export async function createPersistentRun(taskDescription, cwd, opts = {}) {
  if (!taskDescription || !taskDescription.trim()) {
    throw new Error("Task description required");
  }

  const entry = decideEntry(taskDescription);
  let level = entry.level;
  let missionKey = null;
  let packKey = null;
  let steps;

  // Force overrides
  if (opts.forceMission) {
    const mission = getMission(opts.forceMission);
    if (!mission) throw new Error(`Mission "${opts.forceMission}" not found`);
    level = "mission";
    missionKey = opts.forceMission;
    steps = buildMissionSteps(opts.forceMission, opts.manifest);
  } else if (opts.forcePack) {
    const pack = getPack(opts.forcePack);
    if (!pack) throw new Error(`Pack "${opts.forcePack}" not found`);
    level = "pack";
    packKey = opts.forcePack;
    steps = buildPackSteps(opts.forcePack);
  } else if (level === "mission" && entry.mission) {
    missionKey = entry.mission.key;
    steps = buildMissionSteps(entry.mission.key);
  } else if (level === "pack" && entry.pack) {
    packKey = entry.pack.key;
    steps = buildPackSteps(entry.pack.key);
  } else {
    // Free routing — build minimal steps from entry hints
    steps = buildFreeRoutingSteps(taskDescription);
  }

  const id = `run-${Date.now()}-${++_counter}`;

  // Knowledge retrieval — automatic when corpus is configured
  let knowledge = null;
  if (isKnowledgeConfigured()) {
    // Retrieve for the primary role in the chain (first step's role)
    const primaryRole = steps[0]?.role;
    if (primaryRole) {
      try {
        const roleId = primaryRole.toLowerCase().replace(/\s+/g, "-");
        const result = await retrieveForDispatch({
          roleId,
          taskText: taskDescription.trim(),
        });
        knowledge = { retrieval_bundle: result.bundle, status: result.status };
      } catch (e) {
        // Retrieval failure is non-fatal — run proceeds without knowledge
        knowledge = null;
      }
    }
  }

  const run = {
    id,
    taskDescription: taskDescription.trim(),
    entryLevel: level,
    missionKey,
    packKey,
    entryDecision: entry,
    status: "planning",
    steps,
    escalations: [],
    interventions: [],
    createdAt: new Date().toISOString(),
    pausedAt: null,
    completedAt: null,
    completionReport: null,
    knowledge,
  };

  // Persist
  saveRun(cwd, run);

  return run;
}

// ── Step builders ────────────────────────────────────────────────────────────

function buildMissionSteps(missionKey, manifest = null) {
  const mission = getMission(missionKey);

  // Dynamic dispatch — when a manifest is supplied, scale steps from it:
  // dogfood-swarm builds per-domain steps with stage/gate metadata,
  // deep-audit builds one auditor step per component/boundary.
  let flow = mission.artifactFlow;
  if (manifest && mission.dynamicDispatch) {
    flow = missionKey === "dogfood-swarm"
      ? buildSwarmSteps(mission, manifest)
      : buildDynamicSteps(mission, manifest);
  }

  // Spread first so dispatch metadata (stage, domain, isGate, userApproval,
  // parcel, consumedBy, …) carries through, then pin the run.mjs step shape.
  return flow.map((step, i) => ({
    ...step,
    index: i,
    role: step.role,
    produces: step.produces,
    status: "pending",
    artifact: null,
    note: null,
    guidance: buildStepGuidance(step.role, step.produces, mission),
    startedAt: null,
    completedAt: null,
  }));
}

function buildPackSteps(packKey) {
  const pack = getPack(packKey);
  const handoff = getHandoffContract(packKey);

  // Derive steps from the pack's real roster (includes the final review gate
  // and conditional Orchestrator) — never from chainOrder prose, which for
  // brainstorm/deep-audit/swarm contains pseudo-role fragments.
  const roles = getPackRoles(packKey) || pack.roles;

  // Fail loudly on roles missing from the catalog — a run built around a
  // nonexistent role breaks guidance, artifact contracts, and escalation.
  const unknown = roles.filter(name => !ROLE_CATALOG.some(r => r.name === name));
  if (unknown.length > 0) {
    throw new Error(
      `Pack "${packKey}" contains roles not in the role catalog: ${unknown.join(", ")}`
    );
  }

  return roles.map((roleName, i) => {
    // Resolve produces by role lookup into the handoff flow — index alignment
    // is wrong whenever the roster and flow are ordered differently.
    const flowEntry = handoff?.flow?.find(f => f.role === roleName);
    const artifact = flowEntry?.produces || guessArtifact(roleName);
    return {
      index: i,
      role: roleName,
      produces: artifact,
      status: "pending",
      artifact: null,
      note: null,
      guidance: buildStepGuidance(roleName, artifact, null),
      startedAt: null,
      completedAt: null,
    };
  });
}

function buildFreeRoutingSteps(taskDescription) {
  // Free routing gets a minimal 3-step chain:
  // 1. Analysis (best-fit role from catalog)
  // 2. Execution (operator decides)
  // 3. Review (Critic Reviewer)
  return [
    {
      index: 0,
      role: "Repo Researcher",
      produces: "analysis",
      status: "pending",
      artifact: null,
      note: null,
      guidance: "Analyze the task, identify affected code/systems, produce a findings report.",
      startedAt: null,
      completedAt: null,
    },
    {
      index: 1,
      role: "Backend Engineer",
      produces: "implementation",
      status: "pending",
      artifact: null,
      note: null,
      guidance: "Execute the task based on analysis. Operator may reroute this step to a different role.",
      startedAt: null,
      completedAt: null,
    },
    {
      index: 2,
      role: "Critic Reviewer",
      produces: "verdict",
      status: "pending",
      artifact: null,
      note: null,
      guidance: "Review all artifacts. Accept, reject, or block with evidence.",
      startedAt: null,
      completedAt: null,
    },
  ];
}

// ── Step guidance ────────────────────────────────────────────────────────────

function buildStepGuidance(roleName, produces, mission) {
  const contract = ROLE_ARTIFACT_CONTRACTS[roleName];
  const lines = [];

  lines.push(`Role: ${roleName}`);
  lines.push(`Produce: ${produces}`);

  if (contract) {
    if (contract.requiredSections) {
      lines.push(`Required sections: ${contract.requiredSections.join(", ")}`);
    }
    if (contract.completionRule) {
      lines.push(`Done when: ${contract.completionRule}`);
    }
  }

  if (mission?.stopConditions) {
    lines.push(`Stop conditions: ${mission.stopConditions.join("; ")}`);
  }

  return lines.join("\n");
}

function guessArtifact(roleName) {
  const map = {
    "Orchestrator": "decomposition-plan",
    "Product Strategist": "strategy-brief",
    "Spec Writer": "implementation-spec",
    "Backend Engineer": "change-plan",
    "Frontend Developer": "change-plan",
    "Test Engineer": "test-package",
    "Security Reviewer": "security-findings",
    "Critic Reviewer": "verdict",
    "Docs Architect": "docs-update",
    "Repo Researcher": "analysis",
    "Deployment Verifier": "deploy-check",
    "Release Engineer": "release-plan",
    "Launch Strategist": "launch-plan",
    "Launch Copywriter": "copy-package",
    "Community Manager": "community-plan",
    "Competitive Analyst": "competitive-analysis",
  };
  return map[roleName] || "artifact";
}

// ── Step lifecycle ───────────────────────────────────────────────────────────

/**
 * Start the next pending step in a run.
 * @param {PersistentRun} run
 * @param {string} cwd
 * @returns {RunStep|null}
 */
export function startNext(run, cwd) {
  // Guard: refuse to activate a new step if one is already active (prevents dual-active)
  const alreadyActive = run.steps.find(s => s.status === "active");
  if (alreadyActive) return null;

  const next = run.steps.find(s => s.status === "pending");
  if (!next) return null;

  next.status = "active";
  next.startedAt = new Date().toISOString();
  run.status = "running";

  saveRun(cwd, run);
  return next;
}

/**
 * Complete the current active step.
 * @param {PersistentRun} run
 * @param {string} artifact
 * @param {string} [note]
 * @param {string} cwd
 * @returns {RunStep}
 */
export function completeCurrentStep(run, artifact, note, cwd) {
  const active = run.steps.find(s => s.status === "active");
  if (!active) throw new Error("No active step to complete");

  // Validate artifact against role contract (warn, don't block)
  const validation = validateArtifact(active.role, artifact);
  active.artifactValidation = validation;

  active.status = "completed";
  active.artifact = artifact;
  active.note = note || null;
  active.completedAt = new Date().toISOString();

  // Check if all done
  const allDone = run.steps.every(s =>
    s.status === "completed" || s.status === "skipped"
  );
  if (allDone) {
    run.status = "completed";
    run.completedAt = new Date().toISOString();
  }

  saveRun(cwd, run);
  return active;
}

/**
 * Fail the current active step.
 * @param {PersistentRun} run
 * @param {"partial"|"failed"} status
 * @param {string} reason
 * @param {string} cwd
 * @returns {RunStep}
 */
export function failCurrentStep(run, status, reason, cwd) {
  if (status !== "partial" && status !== "failed") {
    throw new Error(`Invalid fail status: "${status}"`);
  }

  const active = run.steps.find(s => s.status === "active");
  if (!active) throw new Error("No active step to fail");

  active.status = status;
  active.note = reason;
  active.completedAt = new Date().toISOString();

  // Block downstream pending steps
  let foundActive = false;
  for (const step of run.steps) {
    if (step === active) { foundActive = true; continue; }
    if (foundActive && step.status === "pending") {
      step.status = "blocked";
      step.note = `Blocked: upstream ${active.role} ${status}`;
    }
  }

  run.status = status;
  run.completedAt = new Date().toISOString();

  saveRun(cwd, run);
  return active;
}

/**
 * Pause a running run (for session resume later).
 * @param {PersistentRun} run
 * @param {string} cwd
 */
export function pauseRun(run, cwd) {
  if (run.status !== "running" && run.status !== "planning") return;
  run.status = "paused";
  run.pausedAt = new Date().toISOString();
  saveRun(cwd, run);
}

/**
 * Resume a paused run.
 * @param {PersistentRun} run
 * @param {string} cwd
 * @returns {RunStep|null} The active or next step
 */
export function resumeRun(run, cwd) {
  if (run.status !== "paused") {
    throw new Error(`Cannot resume run in "${run.status}" state`);
  }

  // Check if there's already an active step
  const active = run.steps.find(s => s.status === "active");
  if (active) {
    run.status = "running";
    run.pausedAt = null;
    saveRun(cwd, run);
    return active;
  }

  // Otherwise start the next pending step
  run.status = "running";
  run.pausedAt = null;
  const next = run.steps.find(s => s.status === "pending");
  if (next) {
    next.status = "active";
    next.startedAt = new Date().toISOString();
  }
  saveRun(cwd, run);
  return next || null;
}

// ── Interventions ────────────────────────────────────────────────────────────

/**
 * Reroute a step to a different role.
 * @param {PersistentRun} run
 * @param {number} stepIndex
 * @param {string} newRole
 * @param {string} reason
 * @param {string} cwd
 */
export function reroute(run, stepIndex, newRole, reason, cwd) {
  const step = run.steps[stepIndex];
  if (!step) throw new Error(`Invalid step index: ${stepIndex}`);
  if (step.status === "completed") throw new Error("Cannot reroute a completed step");
  const inCatalog = ROLE_CATALOG.some(r => r.name === newRole);
  if (!inCatalog) throw new Error(`Role "${newRole}" not in catalog`);

  const oldRole = step.role;
  step.role = newRole;
  step.guidance = buildStepGuidance(newRole, step.produces, null);

  run.interventions.push({
    type: "reroute",
    stepIndex,
    from: oldRole,
    to: newRole,
    reason,
    timestamp: new Date().toISOString(),
  });

  saveRun(cwd, run);
}

/**
 * Record an escalation during execution.
 * @param {PersistentRun} run
 * @param {string} from
 * @param {string} to
 * @param {string} trigger
 * @param {string} action
 * @param {string} cwd
 * @returns {{reopened: boolean, warning: string|null}}
 */
export function escalate(run, from, to, trigger, action, cwd) {
  const escalation = {
    from, to, trigger, action,
    timestamp: new Date().toISOString(),
    reopened: false,
    warning: null,
  };
  run.escalations.push(escalation);

  // Find the LAST matching completed step for the target role
  let targetStep = null;
  for (let i = run.steps.length - 1; i >= 0; i--) {
    if (run.steps[i].role === to && run.steps[i].status === "completed") {
      targetStep = run.steps[i];
      break;
    }
  }

  if (targetStep) {
    targetStep.status = "pending";
    targetStep.artifact = null;
    targetStep.note = `Re-opened by escalation: ${trigger}`;
    targetStep.completedAt = null;
    escalation.reopened = true;

    // Unblock downstream steps that were blocked by this step's absence
    for (let i = targetStep.index + 1; i < run.steps.length; i++) {
      if (run.steps[i].status === "blocked") {
        run.steps[i].status = "pending";
        run.steps[i].note = `Unblocked: ${to} re-opened for escalation`;
      }
    }

    // A completed run with a re-opened step is no longer complete —
    // mirror reopenStep so formatNext doesn't report "All done."
    if (run.status === "completed") {
      run.status = "paused";
      run.completedAt = null;
    }
  } else {
    const inChain = run.steps.some(s => s.role === to);
    escalation.warning = inChain
      ? `Role "${to}" has no completed step to re-open.`
      : `Role "${to}" is not in this run's chain.`;
  }

  run.interventions.push({
    type: "escalate",
    from, to, trigger, action,
    reopened: escalation.reopened,
    warning: escalation.warning,
    timestamp: escalation.timestamp,
  });

  saveRun(cwd, run);
  return { reopened: escalation.reopened, warning: escalation.warning };
}

/**
 * Retry a failed/partial step.
 * @param {PersistentRun} run
 * @param {number} stepIndex
 * @param {string} cwd
 */
export function retry(run, stepIndex, cwd) {
  const step = run.steps[stepIndex];
  if (!step) throw new Error(`Invalid step index: ${stepIndex}`);
  // blocked is retryable so an operator block (or a mistaken one) has a recovery path
  if (step.status !== "failed" && step.status !== "partial" && step.status !== "blocked") {
    throw new Error(`Step ${stepIndex} is "${step.status}", not failed/partial/blocked`);
  }

  const previousStatus = step.status;
  step.status = "pending";
  step.artifact = null;
  step.note = `Retried (was ${previousStatus})`;
  step.completedAt = null;

  // Unblock downstream
  for (let i = stepIndex + 1; i < run.steps.length; i++) {
    if (run.steps[i].status === "blocked") {
      run.steps[i].status = "pending";
      run.steps[i].note = `Unblocked: step ${stepIndex} retried`;
    }
  }

  // Reset run status if it was failed/partial
  if (run.status === "failed" || run.status === "partial") {
    run.status = "paused";
    run.completedAt = null;
  }

  run.interventions.push({
    type: "retry",
    stepIndex,
    role: step.role,
    timestamp: new Date().toISOString(),
  });

  saveRun(cwd, run);
}

/**
 * Mark a step as blocked with a reason.
 * @param {PersistentRun} run
 * @param {number} stepIndex
 * @param {string} reason
 * @param {string} cwd
 */
export function blockStep(run, stepIndex, reason, cwd) {
  const step = run.steps[stepIndex];
  if (!step) throw new Error(`Invalid step index: ${stepIndex}`);
  // Enforce the canonical state machine — blocking a completed/failed step
  // would strand the run with no CLI recovery path.
  if (!isValidStepTransition(step.status, "blocked")) {
    throw new Error(
      `Cannot block step ${stepIndex} (${step.role}) — invalid transition "${step.status}" → "blocked". ` +
      `Only pending or active steps can be blocked.`
    );
  }

  step.status = "blocked";
  step.note = reason;
  step.completedAt = new Date().toISOString();

  run.interventions.push({
    type: "block",
    stepIndex,
    role: step.role,
    reason,
    timestamp: new Date().toISOString(),
  });

  saveRun(cwd, run);
}

/**
 * Reopen a completed step (force re-execution).
 * @param {PersistentRun} run
 * @param {number} stepIndex
 * @param {string} reason
 * @param {string} cwd
 */
export function reopenStep(run, stepIndex, reason, cwd) {
  const step = run.steps[stepIndex];
  if (!step) throw new Error(`Invalid step index: ${stepIndex}`);
  if (step.status !== "completed" && step.status !== "partial" && step.status !== "blocked") {
    throw new Error(`Step ${stepIndex} is "${step.status}", can only reopen completed/partial/blocked`);
  }

  step.status = "pending";
  step.artifact = null;
  step.note = `Re-opened: ${reason}`;
  step.completedAt = null;

  // Reset run status if it was completed
  if (run.status === "completed") {
    run.status = "paused";
    run.completedAt = null;
  }

  run.interventions.push({
    type: "reopen",
    stepIndex,
    role: step.role,
    reason,
    timestamp: new Date().toISOString(),
  });

  saveRun(cwd, run);
}

// ── Introspection ────────────────────────────────────────────────────────────

/**
 * Get the current position in a run.
 * @param {PersistentRun} run
 * @returns {{activeStep: RunStep|null, nextStep: RunStep|null, completedCount: number, totalSteps: number, progress: string}}
 */
export function getPosition(run) {
  const active = run.steps.find(s => s.status === "active");
  const next = active ? null : run.steps.find(s => s.status === "pending");
  const completed = run.steps.filter(s => s.status === "completed").length;
  const total = run.steps.length;

  return {
    activeStep: active || null,
    nextStep: next || null,
    completedCount: completed,
    totalSteps: total,
    progress: `${completed}/${total}`,
  };
}

/**
 * Explain the current run state in detail.
 * @param {PersistentRun} run
 * @returns {string}
 */
export function explainRun(run) {
  const pos = getPosition(run);
  const lines = [];

  // Header
  const levelLabel = run.entryLevel === "mission"
    ? `Mission: ${getMission(run.missionKey)?.name || run.missionKey}`
    : run.entryLevel === "pack"
      ? `Pack: ${getPack(run.packKey)?.name || run.packKey}`
      : "Free Routing";

  lines.push(`# Run: ${run.id}`);
  lines.push(`**Task:** ${run.taskDescription}`);
  lines.push(`**Level:** ${levelLabel}`);
  lines.push(`**Status:** ${run.status.toUpperCase()} (${pos.progress} steps completed)`);
  lines.push(`**Created:** ${run.createdAt}`);
  if (run.pausedAt) lines.push(`**Paused:** ${run.pausedAt}`);
  if (run.completedAt) lines.push(`**Completed:** ${run.completedAt}`);

  // Steps
  lines.push("");
  lines.push("## Steps");
  for (const step of run.steps) {
    const icon = step.status === "completed" ? "[x]" :
                 step.status === "active"    ? "[>]" :
                 step.status === "partial"   ? "[~]" :
                 step.status === "failed"    ? "[!]" :
                 step.status === "blocked"   ? "[-]" :
                 step.status === "skipped"   ? "[s]" : "[ ]";
    const artifact = step.artifact ? ` → ${step.produces}` : "";
    const note = step.note ? ` (${step.note})` : "";
    lines.push(`  ${icon} ${step.index}. ${step.role}${artifact}${note}`);
  }

  // Active step guidance
  if (pos.activeStep) {
    lines.push("");
    lines.push("## Current Step Guidance");
    lines.push(pos.activeStep.guidance || "No specific guidance.");
  } else if (pos.nextStep) {
    lines.push("");
    lines.push("## Next Step");
    lines.push(`${pos.nextStep.role} → ${pos.nextStep.produces}`);
    lines.push(pos.nextStep.guidance || "No specific guidance.");
  }

  // Escalations
  if (run.escalations.length > 0) {
    lines.push("");
    lines.push("## Escalations");
    for (const esc of run.escalations) {
      lines.push(`  - ${esc.from} → ${esc.to}: ${esc.trigger}`);
    }
  }

  // Interventions
  if (run.interventions.length > 0) {
    lines.push("");
    lines.push("## Interventions");
    for (const iv of run.interventions) {
      lines.push(`  - [${iv.type}] ${iv.timestamp}: ${JSON.stringify(iv)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a short "what's next" summary.
 * @param {PersistentRun} run
 * @returns {string}
 */
export function formatNext(run) {
  const pos = getPosition(run);

  if (run.status === "completed") {
    return `Run completed (${pos.progress} steps). All done.`;
  }

  if (run.status === "failed" || run.status === "partial") {
    const failedStep = run.steps.find(s => s.status === "failed" || s.status === "partial");
    return `Run ${run.status} at step ${failedStep?.index ?? "?"} (${failedStep?.role || "?"}). ` +
           `Use \`roleos retry ${failedStep?.index}\` to retry or \`roleos escalate\` to reroute.`;
  }

  if (pos.activeStep) {
    return `Active: step ${pos.activeStep.index} — ${pos.activeStep.role} → ${pos.activeStep.produces}\n` +
           `Progress: ${pos.progress}\n\n` +
           (pos.activeStep.guidance || "");
  }

  if (pos.nextStep) {
    return `Next: step ${pos.nextStep.index} — ${pos.nextStep.role} → ${pos.nextStep.produces}\n` +
           `Progress: ${pos.progress}\n` +
           `Run \`roleos next\` to start this step.\n\n` +
           (pos.nextStep.guidance || "");
  }

  return `Run is ${run.status}. No actionable steps.`;
}

// ── Completion report ────────────────────────────────────────────────────────

/**
 * Generate a completion report for a finished run.
 * @param {PersistentRun} run
 * @returns {object}
 */
export function generateReport(run) {
  const pos = getPosition(run);
  const artifacts = run.steps
    .filter(s => s.status === "completed" && s.artifact)
    .map(s => ({ role: s.role, type: s.produces, artifact: s.artifact }));

  const levelName = run.entryLevel === "mission"
    ? getMission(run.missionKey)?.name || run.missionKey
    : run.entryLevel === "pack"
      ? getPack(run.packKey)?.name || run.packKey
      : "Free Routing";

  const honestPartial = run.missionKey
    ? getMission(run.missionKey)?.honestPartial
    : null;

  const isComplete = run.status === "completed";
  const isPartial = run.status === "partial";
  const isFailed = run.status === "failed";

  const report = {
    runId: run.id,
    entryLevel: run.entryLevel,
    levelName,
    taskDescription: run.taskDescription,
    outcome: run.status,
    progress: pos.progress,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    steps: run.steps.map(s => ({
      index: s.index,
      role: s.role,
      produces: s.produces,
      status: s.status,
      hasArtifact: !!s.artifact,
      note: s.note,
    })),
    artifactsProduced: artifacts.length,
    artifactChain: artifacts,
    escalationCount: run.escalations.length,
    interventionCount: run.interventions.length,
    knowledge: run.knowledge ? {
      status: run.knowledge.status,
      selected_count: run.knowledge.retrieval_bundle?.selected?.length ?? 0,
      trust_posture: run.knowledge.retrieval_bundle?.provenance?.trust_posture ?? "unknown",
      freshness_posture: run.knowledge.retrieval_bundle?.provenance?.freshness_posture ?? "unknown",
      warning_codes: (run.knowledge.retrieval_bundle?.warnings ?? []).map((w) => w.code),
    } : null,
    honestPartial: (isPartial || isFailed) ? honestPartial : null,
    verdict: isComplete
      ? "Run completed — all steps passed."
      : isPartial
        ? `Run partially completed (${pos.progress}).${honestPartial ? " " + honestPartial : ""}`
        : isFailed
          ? `Run failed at step ${run.steps.find(s => s.status === "failed")?.index ?? "?"} ` +
            `(${run.steps.find(s => s.status === "failed")?.role || "unknown"}).`
          : `Run still in progress (${pos.progress}).`,
  };

  run.completionReport = report;
  return report;
}

/**
 * Format a completion report as human-readable text.
 * @param {object} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = [];

  lines.push(`# Run Report: ${report.levelName}`);
  lines.push("");
  lines.push(`**Task:** ${report.taskDescription}`);
  lines.push(`**Entry:** ${report.entryLevel}`);
  lines.push(`**Outcome:** ${report.outcome.toUpperCase()}`);
  lines.push(`**Progress:** ${report.progress}`);
  lines.push(`**Artifacts:** ${report.artifactsProduced}`);
  if (report.escalationCount > 0) lines.push(`**Escalations:** ${report.escalationCount}`);
  if (report.interventionCount > 0) lines.push(`**Interventions:** ${report.interventionCount}`);

  lines.push("");
  lines.push("## Steps");
  for (const step of report.steps) {
    const icon = step.status === "completed" ? "[x]" :
                 step.status === "active"    ? "[>]" :
                 step.status === "partial"   ? "[~]" :
                 step.status === "failed"    ? "[!]" :
                 step.status === "blocked"   ? "[-]" : "[ ]";
    const artifact = step.hasArtifact ? ` → ${step.produces}` : "";
    const note = step.note ? ` (${step.note})` : "";
    lines.push(`  ${icon} ${step.index}. ${step.role}${artifact}${note}`);
  }

  // Knowledge posture (Phase 5)
  if (report.knowledge) {
    lines.push("");
    lines.push("## Knowledge");
    lines.push(`  Status: ${report.knowledge.status}`);
    lines.push(`  Evidence: ${report.knowledge.selected_count} chunks selected`);
    lines.push(`  Trust: ${report.knowledge.trust_posture} | Freshness: ${report.knowledge.freshness_posture}`);
    if (report.knowledge.warning_codes.length > 0) {
      lines.push(`  Warnings: ${report.knowledge.warning_codes.join(", ")}`);
    }
  }

  if (report.honestPartial) {
    lines.push("");
    lines.push("## Honest Partial");
    lines.push(report.honestPartial);
  }

  lines.push("");
  lines.push("## Verdict");
  lines.push(report.verdict);

  return lines.join("\n");
}

// ── Persistence ──────────────────────────────────────────────────────────────

/**
 * Save a run to disk.
 * @param {string} cwd
 * @param {PersistentRun} run
 */
export function saveRun(cwd, run) {
  const dir = runsDir(cwd);
  mkdirSync(dir, { recursive: true });
  const target = runPath(cwd, run.id);
  const tmp = target + ".tmp";
  writeFileSync(tmp, JSON.stringify(run, null, 2));
  renameSync(tmp, target);
}

/**
 * Load a run from disk.
 * @param {string} cwd
 * @param {string} id
 * @returns {PersistentRun|null}
 */
export function loadRun(cwd, id) {
  const p = runPath(cwd, id);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8"));
}

/**
 * List all runs in the working directory.
 * @param {string} cwd
 * @returns {Array<{id: string, task: string, status: string, level: string, missionKey: string|null, createdAt: string}>}
 */
export function listRuns(cwd) {
  const dir = runsDir(cwd);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const run = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        return {
          id: run.id,
          task: run.taskDescription,
          status: run.status,
          level: run.entryLevel,
          missionKey: run.missionKey ?? null,
          createdAt: run.createdAt,
        };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Find the most recent active (running/paused/planning) run.
 * @param {string} cwd
 * @returns {PersistentRun|null}
 */
export function findActiveRun(cwd) {
  const dir = runsDir(cwd);
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .sort().reverse(); // newest first by filename (timestamp in ID)

  for (const f of files) {
    try {
      const run = JSON.parse(readFileSync(join(dir, f), "utf-8"));
      if (["running", "paused", "planning", "failed", "partial"].includes(run.status)) {
        return run;
      }
    } catch { /* skip corrupt files */ }
  }

  return null;
}

// ── Friction measurement ─────────────────────────────────────────────────────

/**
 * Measure operator friction for a completed run.
 * Counts touches (interventions, manual steps, escalations).
 * @param {PersistentRun} run
 * @returns {{totalTouches: number, interventions: number, escalations: number, manualSteps: number, stepsWithNotes: number, frictionScore: string}}
 */
export function measureFriction(run) {
  const interventions = run.interventions.length;
  const escalations = run.escalations.length;
  const manualSteps = run.steps.length; // all steps require operator for now
  const stepsWithNotes = run.steps.filter(s => s.note).length;
  const totalTouches = interventions + escalations + manualSteps;

  let frictionScore;
  if (totalTouches <= run.steps.length) frictionScore = "low";
  else if (totalTouches <= run.steps.length * 2) frictionScore = "medium";
  else frictionScore = "high";

  return {
    totalTouches,
    interventions,
    escalations,
    manualSteps,
    stepsWithNotes,
    frictionScore,
  };
}
