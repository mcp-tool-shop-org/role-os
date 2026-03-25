/**
 * Outcome Calibration — Phase M
 *
 * Records outcome signals from real runs and tunes routing/pack
 * selection from results. The learning loop improves selection
 * without overriding hard safety constraints.
 *
 * What it tunes:
 * - Pack suggestion weights (which pack for which signals)
 * - Confidence thresholds (when to suggest vs fall back)
 * - Role scoring boosts (from successful chain patterns)
 *
 * What it NEVER overrides:
 * - Hard mismatch guards
 * - Conflict detection rules
 * - Escalation honesty
 * - Evidence requirements
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── Outcome record shape ──────────────────────────────────────────────────────

/**
 * @typedef {Object} RunOutcome
 * @property {string} runId - Unique run identifier
 * @property {string} timestamp - ISO timestamp
 * @property {string} packetFile - Path to the packet
 * @property {string} detectedType - feature/integration/identity
 * @property {string|null} suggestedPack - Pack auto-suggested (or null)
 * @property {string} suggestedConfidence - high/medium/low
 * @property {string|null} selectedPack - Pack actually used (or null for free routing)
 * @property {boolean} operatorOverride - Did operator change the suggestion?
 * @property {boolean} mismatchRedirect - Was a mismatch guard triggered?
 * @property {string|null} mismatchFrom - Pack that was rejected
 * @property {string|null} mismatchTo - Pack that was suggested instead
 * @property {number} chainLength - Number of roles in the chain
 * @property {number} escalations - Number of escalation events
 * @property {number} rejectedVerdicts - Number of rejected verdicts
 * @property {number} corrections - Number of operator corrections
 * @property {string} completionStatus - completed/blocked/failed/abandoned
 * @property {string[]} rolesUsed - Roles that participated
 */

// ── Ledger ────────────────────────────────────────────────────────────────────

const LEDGER_DIR = ".claude/calibration";
const LEDGER_FILE = "outcome-ledger.jsonl";

/**
 * Record a run outcome to the ledger (append-only JSONL).
 *
 * @param {RunOutcome} outcome
 * @param {string} [cwd] - Working directory (default: process.cwd())
 */
export function recordOutcome(outcome, cwd = process.cwd()) {
  const dir = join(cwd, LEDGER_DIR);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, LEDGER_FILE);
  const line = JSON.stringify({ ...outcome, recordedAt: new Date().toISOString() }) + "\n";
  writeFileSync(path, line, { flag: "a" });
}

/**
 * Read all outcomes from the ledger.
 *
 * @param {string} [cwd]
 * @returns {RunOutcome[]}
 */
export function readOutcomes(cwd = process.cwd()) {
  const path = join(cwd, LEDGER_DIR, LEDGER_FILE);
  if (!existsSync(path)) return [];

  return readFileSync(path, "utf-8")
    .split("\n")
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);
}

// ── Calibration analysis ──────────────────────────────────────────────────────

/**
 * Compute calibration metrics from the outcome ledger.
 *
 * @param {RunOutcome[]} outcomes
 * @returns {CalibrationReport}
 */
export function computeCalibration(outcomes) {
  if (outcomes.length === 0) {
    return {
      totalRuns: 0,
      packUsageRate: 0,
      freeRoutingRate: 0,
      highConfidenceAccuracy: 0,
      operatorOverrideRate: 0,
      mismatchRedirectRate: 0,
      avgEscalations: 0,
      avgCorrections: 0,
      completionRate: 0,
      packPerformance: {},
      suggestions: [],
    };
  }

  const total = outcomes.length;
  const packUsed = outcomes.filter(o => o.selectedPack);
  const freeRouted = outcomes.filter(o => !o.selectedPack);
  const highConf = outcomes.filter(o => o.suggestedConfidence === "high");
  const highConfCorrect = highConf.filter(o =>
    o.selectedPack === o.suggestedPack && !o.operatorOverride
  );
  const overrides = outcomes.filter(o => o.operatorOverride);
  const redirects = outcomes.filter(o => o.mismatchRedirect);
  const completed = outcomes.filter(o => o.completionStatus === "completed");

  // Per-pack performance
  const packPerformance = {};
  for (const o of outcomes) {
    const key = o.selectedPack || "free-routing";
    if (!packPerformance[key]) {
      packPerformance[key] = {
        runs: 0,
        completed: 0,
        escalations: 0,
        corrections: 0,
        avgChainLength: 0,
        totalChainLength: 0,
      };
    }
    const p = packPerformance[key];
    p.runs++;
    if (o.completionStatus === "completed") p.completed++;
    p.escalations += o.escalations;
    p.corrections += o.corrections;
    p.totalChainLength += o.chainLength;
  }
  for (const p of Object.values(packPerformance)) {
    p.avgChainLength = p.runs > 0 ? Math.round((p.totalChainLength / p.runs) * 10) / 10 : 0;
    p.completionRate = p.runs > 0 ? Math.round((p.completed / p.runs) * 100) : 0;
  }

  // Generate suggestions
  const suggestions = [];

  // If high-confidence accuracy is below 80%, suggest tightening
  const highConfAccuracy = highConf.length > 0
    ? Math.round((highConfCorrect.length / highConf.length) * 100)
    : 100;
  if (highConfAccuracy < 80 && highConf.length >= 3) {
    suggestions.push({
      type: "tighten-confidence",
      detail: `High-confidence accuracy is ${highConfAccuracy}% (${highConfCorrect.length}/${highConf.length}). Consider raising the confidence threshold.`,
    });
  }

  // If operator override rate is above 20%, suggest review
  const overrideRate = Math.round((overrides.length / total) * 100);
  if (overrideRate > 20 && total >= 5) {
    suggestions.push({
      type: "review-suggestions",
      detail: `Operator override rate is ${overrideRate}%. Pack suggestions may be misaligned with operator intent.`,
    });
  }

  // If a specific pack has high escalation rate, flag it
  for (const [key, p] of Object.entries(packPerformance)) {
    if (p.runs >= 3 && p.escalations / p.runs > 1) {
      suggestions.push({
        type: "pack-escalation-concern",
        detail: `Pack "${key}" averages ${(p.escalations / p.runs).toFixed(1)} escalations per run. May need retuning.`,
      });
    }
  }

  return {
    totalRuns: total,
    packUsageRate: Math.round((packUsed.length / total) * 100),
    freeRoutingRate: Math.round((freeRouted.length / total) * 100),
    highConfidenceAccuracy: highConfAccuracy,
    operatorOverrideRate: overrideRate,
    mismatchRedirectRate: Math.round((redirects.length / total) * 100),
    avgEscalations: Math.round((outcomes.reduce((s, o) => s + o.escalations, 0) / total) * 10) / 10,
    avgCorrections: Math.round((outcomes.reduce((s, o) => s + o.corrections, 0) / total) * 10) / 10,
    completionRate: Math.round((completed.length / total) * 100),
    packPerformance,
    suggestions,
  };
}

// ── Weight tuning ─────────────────────────────────────────────────────────────

/**
 * Compute pack score boosts from successful outcome patterns.
 * Returns a map of pack → keyword → boost amount.
 *
 * Rules:
 * - Only boost from completed runs with 0 corrections
 * - Never boost above +2 per keyword
 * - Never create new keywords — only boost existing ones
 *
 * @param {RunOutcome[]} outcomes
 * @returns {Record<string, number>} packName → boost amount
 */
export function computePackBoosts(outcomes) {
  const boosts = {};

  const cleanRuns = outcomes.filter(
    o => o.selectedPack && o.completionStatus === "completed" && o.corrections === 0
  );

  for (const o of cleanRuns) {
    const pack = o.selectedPack;
    boosts[pack] = Math.min((boosts[pack] || 0) + 0.5, 2.0);
  }

  return boosts;
}

/**
 * Compute confidence threshold adjustment from outcomes.
 * If high-confidence suggestions are often overridden, raise the threshold.
 * If medium-confidence suggestions are often accepted, lower it.
 *
 * @param {RunOutcome[]} outcomes
 * @returns {{ adjustment: number, reason: string }}
 */
export function computeConfidenceAdjustment(outcomes) {
  const highConf = outcomes.filter(o => o.suggestedConfidence === "high");
  const medConf = outcomes.filter(o => o.suggestedConfidence === "medium");

  const highOverridden = highConf.filter(o => o.operatorOverride).length;
  const medAccepted = medConf.filter(o => o.selectedPack === o.suggestedPack && !o.operatorOverride).length;

  if (highConf.length >= 3 && highOverridden / highConf.length > 0.3) {
    return {
      adjustment: +1,
      reason: `${Math.round(highOverridden / highConf.length * 100)}% of high-confidence suggestions were overridden. Recommend raising keyword threshold from 3 to 4 for "high."`,
    };
  }

  if (medConf.length >= 3 && medAccepted / medConf.length > 0.7) {
    return {
      adjustment: -1,
      reason: `${Math.round(medAccepted / medConf.length * 100)}% of medium-confidence suggestions were accepted. Recommend lowering keyword threshold from 3 to 2 for "high."`,
    };
  }

  return { adjustment: 0, reason: "Confidence thresholds are well-calibrated." };
}

/**
 * Format a calibration report for display.
 *
 * @param {object} report
 * @returns {string}
 */
export function formatCalibrationReport(report) {
  const lines = [
    `\nOutcome Calibration Report`,
    `─────────────────────────`,
    `Total runs: ${report.totalRuns}`,
    `Pack usage: ${report.packUsageRate}% | Free routing: ${report.freeRoutingRate}%`,
    `High-confidence accuracy: ${report.highConfidenceAccuracy}%`,
    `Operator override rate: ${report.operatorOverrideRate}%`,
    `Mismatch redirect rate: ${report.mismatchRedirectRate}%`,
    `Avg escalations: ${report.avgEscalations} | Avg corrections: ${report.avgCorrections}`,
    `Completion rate: ${report.completionRate}%`,
  ];

  if (Object.keys(report.packPerformance).length > 0) {
    lines.push(`\nPer-pack performance:`);
    for (const [key, p] of Object.entries(report.packPerformance)) {
      lines.push(`  ${key}: ${p.runs} runs, ${p.completionRate}% completion, ${p.avgChainLength} avg chain, ${p.escalations} escalations`);
    }
  }

  if (report.suggestions.length > 0) {
    lines.push(`\nCalibration suggestions:`);
    for (const s of report.suggestions) {
      lines.push(`  ! [${s.type}] ${s.detail}`);
    }
  } else {
    lines.push(`\nNo calibration adjustments needed.`);
  }

  return lines.join("\n");
}
