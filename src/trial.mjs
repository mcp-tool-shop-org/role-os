/**
 * Role Execution Trial Runner
 *
 * Runs gold-task and rejection tests against individual roles to verify:
 * 1. Artifact matches contract deliverable shape
 * 2. Output is better than what a nearby role would produce
 * 3. Handoff sets up the next role cleanly
 * 4. Role escalates correctly when given out-of-lane work
 * 5. No bluffing — role does not fake competence outside its mission
 */

import { ROLE_CATALOG, scoreRole, MIN_SCORE_THRESHOLD } from "./route.mjs";
import { TOOL_PROFILES } from "./dispatch.mjs";
import { getRequirements } from "./evidence.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ── Trial types ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TrialCase
 * @property {string} id - Unique trial case ID
 * @property {string} role - Role name being tested
 * @property {string} type - 'gold-task' | 'rejection' | 'handoff'
 * @property {string} prompt - Task description given to the role
 * @property {string} expectedBehavior - What the role should do
 * @property {string[]} mustInclude - Output must contain these elements
 * @property {string[]} mustNotInclude - Output must NOT contain these elements
 * @property {string} [escalateTo] - If rejection test, expected escalation target
 */

/**
 * @typedef {Object} TrialResult
 * @property {string} caseId
 * @property {string} role
 * @property {string} type
 * @property {boolean} passed
 * @property {string[]} findings - What was observed
 * @property {string[]} violations - Contract violations found
 * @property {string} [escalationTarget] - Who the role should hand off to
 */

// ── Role contract extractors ──────────────────────────────────────────────────

/**
 * Get a role's contract summary for trial evaluation.
 */
export function getRoleContract(roleName) {
  const role = ROLE_CATALOG.find(r => r.name === roleName);
  if (!role) return null;

  const tools = TOOL_PROFILES[roleName] || [];
  const evidence = getRequirements(roleName);

  return {
    name: roleName,
    pack: role.pack,
    phase: role.phase,
    keywords: role.keywords,
    triggers: role.triggers,
    tools,
    evidenceRequired: evidence.required,
    evidenceRecommended: evidence.recommended,
    evidenceDescription: evidence.description,
  };
}

// ── Trial case builder ────────────────────────────────────────────────────────

/**
 * Build gold-task trial cases for a role cluster.
 */
export function buildClusterTrials(clusterName, roles, taskContext) {
  const trials = [];

  for (const { role, goldTask, rejectionTask } of roles) {
    // Gold-task test
    trials.push({
      id: `${clusterName}-gold-${role.replace(/\s+/g, '-').toLowerCase()}`,
      role,
      type: "gold-task",
      prompt: goldTask.prompt,
      expectedBehavior: goldTask.expected,
      mustInclude: goldTask.mustInclude || [],
      mustNotInclude: goldTask.mustNotInclude || [],
      context: taskContext,
    });

    // Rejection test
    if (rejectionTask) {
      trials.push({
        id: `${clusterName}-reject-${role.replace(/\s+/g, '-').toLowerCase()}`,
        role,
        type: "rejection",
        prompt: rejectionTask.prompt,
        expectedBehavior: rejectionTask.expected,
        mustInclude: rejectionTask.mustInclude || [],
        mustNotInclude: rejectionTask.mustNotInclude || [],
        escalateTo: rejectionTask.escalateTo,
        context: taskContext,
      });
    }
  }

  return trials;
}

// ── Trial evaluation ──────────────────────────────────────────────────────────

/**
 * Evaluate a role's output against trial expectations.
 * This is a structural check, not an LLM judge.
 */
export function evaluateTrialOutput(trialCase, output) {
  const violations = [];
  const findings = [];

  // Check mustInclude
  for (const required of trialCase.mustInclude) {
    if (!output.toLowerCase().includes(required.toLowerCase())) {
      violations.push(`Missing required element: "${required}"`);
    } else {
      findings.push(`✓ Contains: "${required}"`);
    }
  }

  // Check mustNotInclude
  for (const forbidden of trialCase.mustNotInclude) {
    if (output.toLowerCase().includes(forbidden.toLowerCase())) {
      violations.push(`Contains forbidden element: "${forbidden}"`);
    } else {
      findings.push(`✓ Avoids: "${forbidden}"`);
    }
  }

  // For rejection tests: check if escalation is mentioned
  if (trialCase.type === "rejection" && trialCase.escalateTo) {
    if (output.toLowerCase().includes(trialCase.escalateTo.toLowerCase()) ||
        output.toLowerCase().includes("escalat") ||
        output.toLowerCase().includes("hand off") ||
        output.toLowerCase().includes("not my") ||
        output.toLowerCase().includes("outside my")) {
      findings.push(`✓ Correctly identifies need to escalate/hand off`);
    } else {
      violations.push(`Should escalate to ${trialCase.escalateTo} but did not indicate escalation`);
    }
  }

  const passed = violations.length === 0;

  return {
    caseId: trialCase.id,
    role: trialCase.role,
    type: trialCase.type,
    passed,
    findings,
    violations,
    escalationTarget: trialCase.escalateTo,
  };
}

// ── Trial report ──────────────────────────────────────────────────────────────

/**
 * Format trial results as a readable report.
 */
export function formatTrialReport(clusterName, results) {
  const lines = [`\n# Trial Report: ${clusterName}\n`];

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  lines.push(`Results: ${passed}/${total} passed\n`);

  for (const result of results) {
    const icon = result.passed ? "✓" : "✗";
    lines.push(`${icon} ${result.caseId} (${result.type})`);
    lines.push(`  Role: ${result.role}`);

    if (result.findings.length > 0) {
      for (const f of result.findings) {
        lines.push(`  ${f}`);
      }
    }

    if (result.violations.length > 0) {
      for (const v of result.violations) {
        lines.push(`  ✗ ${v}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

// ── Pre-built cluster trials ──────────────────────────────────────────────────

export const PRODUCT_CLUSTER_TRIALS = buildClusterTrials(
  "product-cluster",
  [
    {
      role: "Product Strategist",
      goldTask: {
        prompt: "We want to add tool-use analytics to claude-guardian. Help us decide what's worth building.",
        expected: "Problem framing, scope definition, non-goals, tradeoff analysis",
        mustInclude: ["scope", "tradeoff"],
        mustNotInclude: ["acceptance criteria", "edge case enumeration"],
      },
      rejectionTask: {
        prompt: "Write detailed acceptance criteria for the analytics feature.",
        expected: "Escalate to Spec Writer",
        escalateTo: "Spec Writer",
        mustInclude: [],
        mustNotInclude: [],
      },
    },
    {
      role: "Spec Writer",
      goldTask: {
        prompt: "Product Strategist approved scope: track tool call counts, failure rates, and tool sprawl detection. Write the execution-grade spec.",
        expected: "Acceptance criteria, edge cases, data schema, NFRs",
        mustInclude: ["acceptance criteria"],
        mustNotInclude: [],
      },
      rejectionTask: {
        prompt: "Which of these 4 features should we build first: analytics, crash recovery, disk monitoring, preview health?",
        expected: "Escalate to Roadmap Prioritizer",
        escalateTo: "Roadmap Prioritizer",
        mustInclude: [],
        mustNotInclude: [],
      },
    },
    {
      role: "Roadmap Prioritizer",
      goldTask: {
        prompt: "We have 4 guardian features in the backlog: tool-use analytics, crash recovery, disk monitoring, preview health. Prioritize them by leverage and dependency.",
        expected: "Sequenced list with leverage/risk rationale, dependency analysis",
        mustInclude: ["prioriti", "depend"],
        mustNotInclude: [],
      },
      rejectionTask: {
        prompt: "What should the analytics feature include? Define the scope.",
        expected: "Escalate to Product Strategist",
        escalateTo: "Product Strategist",
        mustInclude: [],
        mustNotInclude: [],
      },
    },
  ],
  "claude-guardian MCP server — tool-use analytics feature"
);
