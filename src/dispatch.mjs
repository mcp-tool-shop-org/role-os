/**
 * Runtime dispatch engine.
 *
 * Turns a staffed, validated chain into an executable dispatch manifest
 * that multi-claude can consume. Role-OS owns staffing/routing/evidence;
 * multi-claude owns execution.
 *
 * This module:
 * 1. Maps roles → role configs (tool profiles, system prompts, budgets)
 * 2. Tracks execution state (queued → running → completed/failed/blocked)
 * 3. Collects outputs back into the packet system
 * 4. Generates escalation packets for blocked/rejected work
 * 5. Closes chains to final completion
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveBlocked, resolveRejected } from "./escalation.mjs";
import { TOOL_PROFILES } from "./tool-profiles.mjs";
import { renderKnowledgeBlock, knowledgeManifestSummary } from "./knowledge/render-knowledge-block.mjs";
import { renderDossierBlock } from "./dossier-block.mjs";

// ── Default role config ─────────────────────────────────────────────────────

const DEFAULTS = {
  model: "sonnet",
  maxTurns: 30,
  maxBudgetUsd: 5.0,
  timeoutMs: 10 * 60 * 1000, // 10 minutes
};

// ── Execution states ──────────────────────────────────────────────────────────

export const EXEC_STATES = [
  "queued",         // in chain, not yet launched
  "running",        // role session active
  "waiting",        // waiting for upstream handoff
  "blocked",        // hit a block condition
  "needs-review",   // completed work, awaiting verdict
  "completed",      // approved and done
  "failed",         // session error or timeout
  "interrupted",    // manually stopped
];

// ── System prompt builder ─────────────────────────────────────────────────────

function buildRolePrompt(roleName, packetContent, chainContext, packetKnowledge) {
  const knowledgeBlock = renderKnowledgeBlock(packetKnowledge);
  const dossierBlock = renderDossierBlock(roleName);

  return `You are operating as ${roleName} in a Role-OS managed chain.

## Your Role Contract
Follow the ${roleName} contract exactly. Your quality bar, inputs, outputs, and escalation rules are defined in .claude/agents/.

## Current Packet
${packetContent}

## Chain Context
You are step ${chainContext.stepNumber} of ${chainContext.totalSteps} in this chain.
${chainContext.previousRole ? `Previous role: ${chainContext.previousRole} (${chainContext.previousStatus})` : "You are the first role in this chain."}
${chainContext.nextRole ? `Next role: ${chainContext.nextRole}` : "You are the last role before Critic review."}
${knowledgeBlock ? `\n${knowledgeBlock}\n` : ""}${dossierBlock ? `\n${dossierBlock}\n` : ""}
## Handoff Requirements
When you finish, produce a structured handoff:
1. Summary of what you did
2. Artifacts produced (files, changes, docs)
3. Open questions or risks for the next role
4. Evidence items for your verdict (kind, reference, claim, status)

## Stop Conditions
- If you cannot proceed: output a BLOCKED status with a clear reason
- If the upstream handoff is insufficient: output a BLOCKED status explaining what's missing
- Do not silently skip work — surface every gap explicitly
`;
}

// ── Dispatch manifest builder ─────────────────────────────────────────────────

/**
 * Build a dispatch manifest from a routed chain.
 * This is the contract between Role-OS (planning) and multi-claude (execution).
 *
 * @param {Object} options
 * @param {string} options.packetFile - Path to the packet markdown
 * @param {string} options.packetContent - Packet markdown content
 * @param {Array<{role: {name: string, pack: string}}>} options.chainRoles - Assembled chain
 * @param {string} options.cwd - Working directory for execution
 * @param {Object} [options.overrides] - Per-role config overrides
 * @returns {DispatchManifest}
 */
export function buildDispatchManifest({ packetFile, packetContent, chainRoles, cwd, overrides = {}, packetKnowledge = null }) {
  const runId = `run-${Date.now()}`;
  const steps = [];

  for (let i = 0; i < chainRoles.length; i++) {
    const { role } = chainRoles[i];
    const roleOverrides = overrides[role.name] || {};

    const chainContext = {
      stepNumber: i + 1,
      totalSteps: chainRoles.length,
      previousRole: i > 0 ? chainRoles[i - 1].role.name : null,
      previousStatus: i > 0 ? "pending" : null,
      nextRole: i < chainRoles.length - 1 ? chainRoles[i + 1].role.name : null,
    };

    steps.push({
      stepIndex: i,
      packetId: `${runId}-step-${i}`,
      role: role.name,
      pack: role.pack,
      tools: TOOL_PROFILES[role.name] || ["Read", "Glob", "Grep"],
      systemPrompt: buildRolePrompt(role.name, packetContent, chainContext, packetKnowledge),
      model: roleOverrides.model || DEFAULTS.model,
      maxTurns: roleOverrides.maxTurns || DEFAULTS.maxTurns,
      maxBudgetUsd: roleOverrides.maxBudgetUsd || DEFAULTS.maxBudgetUsd,
      timeoutMs: roleOverrides.timeoutMs || DEFAULTS.timeoutMs,
      state: "queued",
      dependsOn: i > 0 ? [`${runId}-step-${i - 1}`] : [],
      handoff: {
        from: i > 0 ? chainRoles[i - 1].role.name : null,
        to: i < chainRoles.length - 1 ? chainRoles[i + 1].role.name : null,
      },
      knowledge: knowledgeManifestSummary(packetKnowledge),
    });
  }

  return {
    version: 1,
    runId,
    createdAt: new Date().toISOString(),
    packetFile: resolve(packetFile),
    cwd: resolve(cwd),
    totalSteps: steps.length,
    steps,
  };
}

// ── Execution state tracker ───────────────────────────────────────────────────

/**
 * Update a step's execution state in the manifest.
 *
 * @param {DispatchManifest} manifest
 * @param {number} stepIndex
 * @param {string} newState - One of EXEC_STATES
 * @param {Object} [result] - Execution result data
 * @returns {DispatchManifest} Updated manifest (mutated in place)
 */
export function updateStepState(manifest, stepIndex, newState, result = {}) {
  const step = manifest.steps[stepIndex];
  if (!step) throw new Error(`Invalid step index: ${stepIndex}`);
  if (!EXEC_STATES.includes(newState)) throw new Error(`Invalid state: ${newState}`);

  step.state = newState;
  step.result = {
    ...step.result,
    ...result,
    updatedAt: new Date().toISOString(),
  };

  // Auto-advance: if this step completed, mark next step as ready
  if (newState === "completed" && stepIndex < manifest.steps.length - 1) {
    const nextStep = manifest.steps[stepIndex + 1];
    if (nextStep.state === "queued") {
      nextStep.state = "waiting"; // ready to launch
    }
  }

  return manifest;
}

/**
 * Get the chain's overall status from individual step states.
 *
 * @param {DispatchManifest} manifest
 * @returns {{status: string, completedSteps: number, totalSteps: number, currentStep: Object|null, blockedSteps: Object[]}}
 */
export function getChainStatus(manifest) {
  const completed = manifest.steps.filter(s => s.state === "completed").length;
  const blocked = manifest.steps.filter(s => s.state === "blocked");
  const failed = manifest.steps.filter(s => s.state === "failed");
  const running = manifest.steps.find(s => s.state === "running");
  const waiting = manifest.steps.find(s => s.state === "waiting");

  let status;
  if (failed.length > 0) status = "failed";
  else if (blocked.length > 0) status = "blocked";
  else if (completed === manifest.steps.length) status = "completed";
  else if (running) status = "running";
  else if (waiting) status = "ready";
  else status = "queued";

  return {
    status,
    completedSteps: completed,
    totalSteps: manifest.steps.length,
    currentStep: running || waiting || null,
    blockedSteps: blocked,
    failedSteps: failed,
  };
}

// ── Escalation packet generator ───────────────────────────────────────────────

/**
 * Generate an escalation packet when a step is blocked or rejected.
 *
 * @param {Object} step - The blocked/rejected step
 * @param {string} reason - Block/rejection reason
 * @param {string} verdict - "blocked" or "reject"
 * @returns {Object} Escalation packet ready for routing
 */
export function generateEscalationPacket(step, reason, verdict) {
  const escalation = verdict === "blocked"
    ? resolveBlocked(reason)
    : resolveRejected(reason, step.role);

  return {
    type: "escalation",
    sourceStep: step.packetId,
    sourceRole: step.role,
    verdict,
    reason,
    escalation,
    packet: {
      title: `Escalation: ${step.role} ${verdict} — ${reason.slice(0, 80)}`,
      assignedRole: escalation.targetRole,
      recovery: escalation.recovery,
      requiredArtifact: escalation.requiredArtifact,
      context: escalation.handoffContext || escalation.reason,
      sourcePacketFile: step.packetId,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Manifest persistence ──────────────────────────────────────────────────────

/**
 * Save a dispatch manifest to disk.
 *
 * @param {DispatchManifest} manifest
 * @param {string} outputDir - Directory to write to
 * @returns {string} Path to the saved manifest
 */
export function saveManifest(manifest, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, `${manifest.runId}.dispatch.json`);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}

/**
 * Load a dispatch manifest from disk.
 *
 * @param {string} path
 * @returns {DispatchManifest}
 */
export function loadManifest(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

// ── Exports for integration ───────────────────────────────────────────────────

export { TOOL_PROFILES, DEFAULTS };
