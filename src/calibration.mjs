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
import { getMission } from "./mission.mjs";

// ── Outcome record shape ──────────────────────────────────────────────────────

/**
 * @typedef {Object} RunOutcome
 * @property {string} runId - Unique run identifier
 * @property {string} timestamp - ISO timestamp
 * @property {string} packetFile - Path to the packet
 * @property {string} detectedType - feature/integration/identity
 * @property {string|null} suggestedPack - Pack auto-suggested (or null)
 * @property {string|null} suggestedConfidence - high/medium/low, or null when unmeasured
 * @property {string|null} selectedPack - Pack actually used. A mission records its pack. Null for free routing.
 * @property {string|null} [missionKey] - Mission key when the run had one
 * @property {boolean} operatorOverride - Did operator change the suggestion?
 * @property {boolean} mismatchRedirect - Was a mismatch guard triggered?
 * @property {string|null} mismatchFrom - Pack that was rejected
 * @property {string|null} mismatchTo - Pack that was suggested instead
 * @property {number} chainLength - Number of roles in the chain
 * @property {number} escalations - Number of escalation events
 * @property {number} rejectedVerdicts - Number of rejected verdicts
 * @property {number} corrections - Number of operator corrections
 * @property {string} completionStatus - completed/partial/blocked/failed/abandoned
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
  // One line per run. A second call with the same run id does not append.
  if (outcome && outcome.runId) {
    const prior = readOutcomes(cwd);
    for (let i = 0; i < prior.length; i++) {
      if (prior[i].runId === outcome.runId) return false;
    }
  }
  const line = JSON.stringify({ ...outcome, recordedAt: new Date().toISOString() }) + "\n";
  writeFileSync(path, line, { flag: "a" });
  return true;
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

// ── Learned selection ─────────────────────────────────────────────────────────

/** A pack or a role combination needs this many recorded runs before a rate is claimed. */
export const MIN_CALIBRATION_RUNS = 5;

/** 95% standard-normal quantile. Wilson intervals use this, not a rounded 1.96. */
export const WILSON_Z95 = 1.959963984540054;

const CORRECTION_TYPES = new Set(["reroute", "retry", "reopen"]);

/**
 * Kill switch. `ROLEOS_NO_CALIBRATION=1` restores pure keyword routing.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function calibrationDisabled(env = process.env) {
  return env.ROLEOS_NO_CALIBRATION === "1";
}

/**
 * Wilson score interval for `successes` out of `total`.
 * The bounds sit inside [0, 1]. Null when the count is not a usable sample.
 * @param {number} successes
 * @param {number} total
 * @param {number} [z]
 * @returns {{ low: number, high: number } | null}
 */
export function wilsonInterval(successes, total, z = WILSON_Z95) {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) return null;
  if (successes < 0 || successes > total) return null;
  const phat = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = (phat + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((phat * (1 - phat)) / total + z2 / (4 * total * total))) / denom;
  return {
    low: Math.max(0, centre - margin),
    high: Math.min(1, centre + margin),
  };
}

function normalizedRoles(roles) {
  if (!Array.isArray(roles)) return [];
  const out = [];
  for (let i = 0; i < roles.length; i++) {
    if (typeof roles[i] === "string" && out.indexOf(roles[i]) === -1) out.push(roles[i]);
  }
  out.sort();
  return out;
}

function isClean(outcome) {
  return outcome.completionStatus === "completed"
    && (outcome.corrections || 0) === 0
    && (outcome.rejectedVerdicts || 0) === 0;
}

/**
 * Task kind is the mission key when the run had one, otherwise the pack.
 * @param {RunOutcome} outcome
 */
export function taskKindOf(outcome) {
  if (outcome && outcome.missionKey) return String(outcome.missionKey);
  if (outcome && outcome.selectedPack) return String(outcome.selectedPack);
  if (outcome && outcome.suggestedPack) return String(outcome.suggestedPack);
  return "free-routing";
}

/**
 * Per-combination record. Below `minRuns` the rate and the interval are absent
 * and the status is "insufficient data".
 *
 * @param {RunOutcome[]} outcomes
 * @param {{ minRuns?: number }} [options]
 */
export function computeCombinationStats(outcomes, { minRuns = MIN_CALIBRATION_RUNS } = {}) {
  const groups = new Map();
  const list = Array.isArray(outcomes) ? outcomes : [];
  for (let i = 0; i < list.length; i++) {
    const outcome = list[i];
    if (!outcome || typeof outcome !== "object") continue;
    const roles = normalizedRoles(outcome.rolesUsed);
    const kind = taskKindOf(outcome);
    const key = kind + "\0" + roles.join("\0");
    let group = groups.get(key);
    if (!group) {
      group = { taskKind: kind, roles, runs: 0, completed: 0, clean: 0 };
      groups.set(key, group);
    }
    group.runs += 1;
    if (outcome.completionStatus === "completed") group.completed += 1;
    if (isClean(outcome)) group.clean += 1;
  }

  const rows = [...groups.values()];
  rows.sort((a, b) => (a.taskKind < b.taskKind ? -1 : a.taskKind > b.taskKind ? 1 : (a.roles.join() < b.roles.join() ? -1 : a.roles.join() > b.roles.join() ? 1 : 0)));

  return rows.map((group) => {
    const base = {
      taskKind: group.taskKind,
      roles: group.roles,
      runs: group.runs,
      completed: group.completed,
      clean: group.clean,
    };
    if (!(minRuns >= 0) || group.runs < minRuns) {
      return { ...base, status: "insufficient data", cleanRate: null, interval: null };
    }
    return {
      ...base,
      status: "measured",
      cleanRate: group.clean / group.runs,
      interval: wilsonInterval(group.clean, group.runs),
    };
  });
}

/**
 * Evidence for one pack. The boost is the existing `computePackBoosts` value,
 * and it is 0 until the pack itself has `minRuns` recorded outcomes.
 * The clean rate uses the combination rule (completed, no corrections, no rejected verdicts).
 */
export function summarizePack(outcomes, pack, boosts, minRuns = MIN_CALIBRATION_RUNS) {
  let runs = 0;
  let clean = 0;
  const list = Array.isArray(outcomes) ? outcomes : [];
  for (let i = 0; i < list.length; i++) {
    const outcome = list[i];
    if (!outcome || outcome.selectedPack !== pack) continue;
    runs += 1;
    if (isClean(outcome)) clean += 1;
  }
  const stored = boosts && boosts[pack] ? boosts[pack] : 0;
  if (!(minRuns >= 0) || runs < minRuns) {
    return {
      pack,
      runs,
      clean,
      boost: 0,
      status: "insufficient data",
      cleanRate: null,
      interval: null,
    };
  }
  return {
    pack,
    runs,
    clean,
    boost: stored,
    status: "measured",
    cleanRate: clean / runs,
    interval: wilsonInterval(clean, runs),
  };
}

function formatBoost(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
}

function formatRate(rate, interval) {
  return `${rate.toFixed(3)} [${interval.low.toFixed(3)}, ${interval.high.toFixed(3)}]`;
}

/**
 * Text for route --verbose and explain. An empty list is not a zero rate.
 * @param {Array<object>} rows
 */
export function formatPackEvidence(rows) {
  if (!rows || rows.length === 0) return "Calibration: no recorded runs yet";
  const lines = ["Calibration:"];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.status !== "measured" || row.cleanRate === null || !row.interval) {
      const runs = row && row.runs ? row.runs : 0;
      lines.push(`  ${row.pack}: boost +0, ${runs} ${runs === 1 ? "run" : "runs"}, insufficient data`);
      continue;
    }
    lines.push(`  ${row.pack}: boost +${formatBoost(row.boost)}, ${row.runs} runs, clean rate ${formatRate(row.cleanRate, row.interval)}`);
  }
  return lines.join("\n");
}

/**
 * Per-combination table. Rates below the gate say "insufficient data".
 * @param {Array<object>} rows
 */
export function formatCombinationTable(rows) {
  const lines = ["", "Combinations (task kind, sorted roles)"];
  if (!rows || rows.length === 0) {
    lines.push("  no combinations");
    return lines.join("\n");
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const roles = row.roles && row.roles.length ? row.roles.join(", ") : "(no roles)";
    const rate = row.status === "measured" && row.cleanRate !== null && row.interval
      ? formatRate(row.cleanRate, row.interval)
      : "insufficient data";
    lines.push(`  ${row.taskKind} | ${roles} | ${row.runs} runs | ${row.completed} completed | ${row.clean} clean | ${rate}`);
  }
  return lines.join("\n");
}

function confidenceWord(score) {
  if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) return null;
  if (score >= 0.8) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

/**
 * One row per pack that was actually selected. Order is the pack name.
 * @param {RunOutcome[]} outcomes
 * @param {number} [minRuns]
 */
export function evidenceRows(outcomes, minRuns = MIN_CALIBRATION_RUNS) {
  const list = Array.isArray(outcomes) ? outcomes : [];
  const boosts = computePackBoosts(list);
  const seen = [];
  for (let i = 0; i < list.length; i++) {
    const pack = list[i] && list[i].selectedPack;
    if (typeof pack === "string" && pack && seen.indexOf(pack) === -1) seen.push(pack);
  }
  seen.sort();
  return seen.map((pack) => summarizePack(list, pack, boosts, minRuns));
}

/**
 * What route --verbose and explain print. The kill switch wins over a
 * ledger, including one passed in by the caller. An empty ledger is a
 * sentence, not a zero rate.
 * @param {{ cwd?: string, outcomes?: RunOutcome[], env?: NodeJS.ProcessEnv, minRuns?: number }} [options]
 */
export function calibrationSnapshot(options = {}) {
  const opts = options && typeof options === "object" ? options : {};
  const minRuns = opts.minRuns ?? MIN_CALIBRATION_RUNS;
  if (calibrationDisabled(opts.env)) {
    return {
      disabled: true,
      outcomes: [],
      evidence: [],
      text: "Calibration off (ROLEOS_NO_CALIBRATION=1). Keyword scores only.",
    };
  }
  const outcomes = Array.isArray(opts.outcomes)
    ? opts.outcomes
    : readOutcomes(opts.cwd ?? process.cwd());
  const evidence = evidenceRows(outcomes, minRuns);
  let text;
  if (outcomes.length === 0) text = "Calibration: no recorded runs yet";
  else if (evidence.length === 0) {
    text = `Calibration: ${outcomes.length} recorded ${outcomes.length === 1 ? "run" : "runs"}, none named a pack`;
  } else text = formatPackEvidence(evidence);
  return { disabled: false, outcomes, evidence, text };
}

/**
 * Status that ends a run, or null while the run can still move.
 * A step block ends the run when nothing is pending or active.
 * @param {object} run
 * @returns {string|null}
 */
export function terminalStatus(run) {
  if (!run || typeof run !== "object") return null;
  const status = run.status;
  if (status === "completed" || status === "failed" || status === "partial" || status === "blocked" || status === "abandoned") {
    return status;
  }
  const steps = Array.isArray(run.steps) ? run.steps : [];
  if (steps.length === 0) return null;
  let open = false;
  let blocked = false;
  for (let i = 0; i < steps.length; i++) {
    const stepStatus = steps[i] && steps[i].status;
    if (stepStatus === "active" || stepStatus === "pending") open = true;
    if (stepStatus === "blocked") blocked = true;
  }
  if (!open && blocked) return "blocked";
  return null;
}

function missionPack(missionKey) {
  if (!missionKey) return null;
  const mission = getMission(missionKey);
  if (!mission || typeof mission.pack !== "string" || mission.pack.length === 0) return null;
  return mission.pack;
}

function operatorDidOverride(run, entry, selectedPack, missionKey) {
  if (run && run.operatorOverride === true) return true;
  if (!entry) return false;
  if (missionKey && entry.mission && entry.mission.key && missionKey !== entry.mission.key) return true;
  if (entry.level === "mission" && !run.missionKey && selectedPack) return true;
  if (entry.level === "pack" && entry.pack && entry.pack.key && selectedPack && selectedPack !== entry.pack.key) return true;
  if (entry.level === "pack" && run.missionKey && !(entry.mission && entry.mission.key)) return true;
  if (entry.level === "free-routing" && (selectedPack || run.missionKey)) return true;
  return false;
}

/**
 * One ledger row from a run. Absent fields stay null. Roles are sorted.
 * A mission run records that mission's pack even when the run's pack key is empty.
 * An explicit pack key is kept.
 * @param {object} run
 * @param {string} [now]
 */
export function outcomeFromRun(run, now = new Date().toISOString()) {
  const entry = run && run.entryDecision ? run.entryDecision : null;
  let suggestedPack = null;
  let suggestedConfidence = null;
  if (entry && entry.pack && entry.pack.key) {
    suggestedPack = entry.pack.key;
    suggestedConfidence = confidenceWord(entry.confidence);
  } else if (entry && entry.alternative && entry.alternative.level === "pack" && entry.alternative.key) {
    suggestedPack = entry.alternative.key;
    suggestedConfidence = confidenceWord(entry.alternative.confidence);
  } else if (run && run.packKey) {
    suggestedPack = run.packKey;
  }

  const missionKey = (run && run.missionKey) || (entry && entry.mission && entry.mission.key) || null;
  const explicitPack = run && run.packKey ? run.packKey : null;
  const selectedPack = explicitPack || missionPack(missionKey);
  const steps = run && Array.isArray(run.steps) ? run.steps : [];
  const roles = [];
  let rejectedFromNotes = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || !step.role) continue;
    if (step.status === "pending" || step.status === "skipped") continue;
    if (roles.indexOf(step.role) === -1) roles.push(step.role);
    if (typeof step.note === "string" && /^reject\b/i.test(step.note)) rejectedFromNotes += 1;
  }
  roles.sort();

  const interventions = run && Array.isArray(run.interventions) ? run.interventions : [];
  let corrections = 0;
  let rejectedVerdicts = rejectedFromNotes;
  for (let i = 0; i < interventions.length; i++) {
    const type = interventions[i] && interventions[i].type;
    if (CORRECTION_TYPES.has(type)) corrections += 1;
    if (type === "reject") rejectedVerdicts += 1;
  }

  return {
    runId: run.id,
    timestamp: (run && run.completedAt) || now,
    packetFile: (run && run.packetFile) || null,
    detectedType: (run && run.detectedType) || null,
    suggestedPack,
    suggestedConfidence,
    selectedPack,
    missionKey,
    operatorOverride: operatorDidOverride(run, entry, selectedPack, missionKey),
    mismatchRedirect: false,
    mismatchFrom: null,
    mismatchTo: null,
    chainLength: steps.length,
    escalations: run && Array.isArray(run.escalations) ? run.escalations.length : 0,
    rejectedVerdicts,
    corrections,
    completionStatus: terminalStatus(run),
    rolesUsed: roles,
  };
}

/**
 * Append the run's outcome once it has ended. A re-completed run does not write again.
 * @param {object} run
 * @param {string} [cwd]
 * @returns {boolean} true when a new line was written
 */
export function recordRunOutcome(run, cwd) {
  if (!cwd || !terminalStatus(run)) return false;
  return recordOutcome(outcomeFromRun(run), cwd);
}
