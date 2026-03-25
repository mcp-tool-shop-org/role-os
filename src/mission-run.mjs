/**
 * Mission Runner — Phase S (v1.8.0)
 *
 * Executes a mission through the full Role OS stack:
 *   mission → packet → route → pack → artifacts → review → completion report
 *
 * The runner does NOT execute code — it orchestrates the contract chain
 * and tracks state so that operators (human or agent) know exactly
 * where they are, what's been produced, and what's next.
 */

import { MISSIONS, getMission, validateMission } from "./mission.mjs";
import { TEAM_PACKS } from "./packs.mjs";
import { validateArtifact, ROLE_ARTIFACT_CONTRACTS } from "./artifacts.mjs";

let _runCounter = 0;

// ── Run states ──────────────────────────────────────────────────────────────

/**
 * @typedef {"pending"|"active"|"completed"|"partial"|"failed"|"escalated"} StepStatus
 */

/**
 * @typedef {Object} MissionStep
 * @property {string} role
 * @property {string} produces - artifact type
 * @property {string|null} consumedBy - next role or null
 * @property {StepStatus} status
 * @property {string|null} artifact - produced artifact content/reference
 * @property {string|null} note - operator note
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {"planning"|"running"|"completed"|"partial"|"failed"} RunStatus
 */

/**
 * @typedef {Object} MissionRun
 * @property {string} id
 * @property {string} missionKey
 * @property {string} taskDescription
 * @property {RunStatus} status
 * @property {MissionStep[]} steps
 * @property {Array<{from: string, to: string, trigger: string, action: string, timestamp: string}>} escalations
 * @property {string} startedAt
 * @property {string|null} completedAt
 * @property {object|null} completionReport
 */

// ── Create a run ────────────────────────────────────────────────────────────

/**
 * Create a new mission run from a mission key and task description.
 *
 * @param {string} missionKey
 * @param {string} taskDescription
 * @returns {MissionRun}
 */
export function createRun(missionKey, taskDescription) {
  const mission = getMission(missionKey);
  if (!mission) {
    throw new Error(`Mission "${missionKey}" not found. Available: ${Object.keys(MISSIONS).join(", ")}`);
  }

  const validation = validateMission(missionKey);
  if (!validation.valid) {
    throw new Error(`Mission "${missionKey}" has issues: ${validation.issues.join("; ")}`);
  }

  const id = `${missionKey}-${Date.now()}-${++_runCounter}`;

  const steps = mission.artifactFlow.map((step) => ({
    role: step.role,
    produces: step.produces,
    consumedBy: step.consumedBy,
    status: "pending",
    artifact: null,
    note: null,
    startedAt: null,
    completedAt: null,
  }));

  return {
    id,
    missionKey,
    taskDescription,
    status: "planning",
    steps,
    escalations: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    completionReport: null,
  };
}

// ── Step through a run ──────────────────────────────────────────────────────

/**
 * Start the next pending step.
 * @param {MissionRun} run
 * @returns {MissionStep|null} The started step, or null if no pending steps
 */
export function startNextStep(run) {
  const next = run.steps.find((s) => s.status === "pending");
  if (!next) return null;

  next.status = "active";
  next.startedAt = new Date().toISOString();
  run.status = "running";

  return next;
}

/**
 * Complete the current active step with an artifact.
 * @param {MissionRun} run
 * @param {string} artifact - The produced artifact (content or reference)
 * @param {string} [note] - Optional operator note
 * @returns {MissionStep}
 */
export function completeStep(run, artifact, note) {
  const active = run.steps.find((s) => s.status === "active");
  if (!active) {
    throw new Error("No active step to complete");
  }

  active.status = "completed";
  active.artifact = artifact;
  active.note = note || null;
  active.completedAt = new Date().toISOString();

  // Check if all steps are done
  const allDone = run.steps.every((s) => s.status === "completed");
  if (allDone) {
    run.status = "completed";
    run.completedAt = new Date().toISOString();
  }

  return active;
}

/**
 * Mark the current active step as failed/partial.
 * @param {MissionRun} run
 * @param {"partial"|"failed"} status
 * @param {string} reason
 * @returns {MissionStep}
 */
export function failStep(run, status, reason) {
  if (status !== "partial" && status !== "failed") {
    throw new Error(`Invalid fail status: "${status}". Use "partial" or "failed"`);
  }

  const active = run.steps.find((s) => s.status === "active");
  if (!active) {
    throw new Error("No active step to fail");
  }

  active.status = status;
  active.note = reason;
  active.completedAt = new Date().toISOString();

  // Mission status follows the worst step
  run.status = status;
  run.completedAt = new Date().toISOString();

  return active;
}

/**
 * Record an escalation during a run.
 * @param {MissionRun} run
 * @param {string} from - Role escalating
 * @param {string} to - Role receiving
 * @param {string} trigger - What triggered it
 * @param {string} action - What needs to happen
 * @returns {object} The escalation record
 */
export function recordEscalation(run, from, to, trigger, action) {
  const escalation = {
    from,
    to,
    trigger,
    action,
    timestamp: new Date().toISOString(),
  };
  run.escalations.push(escalation);

  // Re-activate the target step if it exists and was completed
  // (escalation loops back to an earlier role)
  const targetStep = run.steps.find((s) => s.role === to && s.status === "completed");
  if (targetStep) {
    targetStep.status = "pending";
    targetStep.artifact = null;
    targetStep.note = `Re-opened by escalation: ${trigger}`;
    targetStep.completedAt = null;
  }

  return escalation;
}

// ── Run introspection ───────────────────────────────────────────────────────

/**
 * Get the current position in a run.
 * @param {MissionRun} run
 * @returns {{currentStep: MissionStep|null, completedCount: number, totalSteps: number, progress: string}}
 */
export function getRunPosition(run) {
  const active = run.steps.find((s) => s.status === "active");
  const completedCount = run.steps.filter((s) => s.status === "completed").length;
  const totalSteps = run.steps.length;

  return {
    currentStep: active || null,
    completedCount,
    totalSteps,
    progress: `${completedCount}/${totalSteps}`,
  };
}

/**
 * Get the artifact chain produced so far.
 * @param {MissionRun} run
 * @returns {Array<{role: string, type: string, artifact: string}>}
 */
export function getArtifactChain(run) {
  return run.steps
    .filter((s) => s.status === "completed" && s.artifact)
    .map((s) => ({
      role: s.role,
      type: s.produces,
      artifact: s.artifact,
    }));
}

// ── Completion report ───────────────────────────────────────────────────────

/**
 * Generate a completion report for a finished (or partially finished) run.
 * This is the "honest partial" — it tells you exactly what happened,
 * not what you hoped would happen.
 *
 * @param {MissionRun} run
 * @returns {object} Completion report
 */
export function generateCompletionReport(run) {
  const mission = getMission(run.missionKey);
  const position = getRunPosition(run);
  const artifactChain = getArtifactChain(run);

  const stepSummaries = run.steps.map((s) => ({
    role: s.role,
    produces: s.produces,
    status: s.status,
    hasArtifact: !!s.artifact,
    note: s.note,
  }));

  const isComplete = run.status === "completed";
  const isPartial = run.status === "partial";
  const isFailed = run.status === "failed";

  const report = {
    missionKey: run.missionKey,
    missionName: mission.name,
    taskDescription: run.taskDescription,
    outcome: run.status,
    progress: position.progress,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.completedAt
      ? new Date(run.completedAt) - new Date(run.startedAt)
      : null,
    steps: stepSummaries,
    artifactsProduced: artifactChain.length,
    artifactChain,
    escalationCount: run.escalations.length,
    escalations: run.escalations,
    honestPartial: isPartial || isFailed ? mission.honestPartial : null,
    verdict: isComplete
      ? "Mission completed — all artifacts produced, all steps passed."
      : isPartial
        ? `Mission partially completed (${position.progress}). ${mission.honestPartial}`
        : isFailed
          ? `Mission failed at step ${position.completedCount + 1}/${position.totalSteps} (${run.steps.find((s) => s.status === "failed")?.role || "unknown"}).`
          : `Mission still running (${position.progress}).`,
  };

  // Attach to run
  run.completionReport = report;

  return report;
}

/**
 * Format a completion report as human-readable text.
 * @param {object} report
 * @returns {string}
 */
export function formatCompletionReport(report) {
  const lines = [];

  lines.push(`# Mission Report: ${report.missionName}`);
  lines.push("");
  lines.push(`**Task:** ${report.taskDescription}`);
  lines.push(`**Outcome:** ${report.outcome.toUpperCase()}`);
  lines.push(`**Progress:** ${report.progress}`);

  if (report.durationMs) {
    const seconds = Math.round(report.durationMs / 1000);
    lines.push(`**Duration:** ${seconds}s`);
  }

  lines.push("");
  lines.push("## Steps");
  for (const step of report.steps) {
    const icon = step.status === "completed" ? "[x]" :
                 step.status === "active" ? "[>]" :
                 step.status === "partial" ? "[~]" :
                 step.status === "failed" ? "[!]" : "[ ]";
    const artifact = step.hasArtifact ? ` → ${step.produces}` : "";
    const note = step.note ? ` (${step.note})` : "";
    lines.push(`  ${icon} ${step.role}${artifact}${note}`);
  }

  if (report.escalationCount > 0) {
    lines.push("");
    lines.push("## Escalations");
    for (const esc of report.escalations) {
      lines.push(`  - ${esc.from} → ${esc.to}: ${esc.trigger} → ${esc.action}`);
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
