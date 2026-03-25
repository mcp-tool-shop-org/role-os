/**
 * Unified Entry Path — Phase T (v1.9.0)
 *
 * When a user brings Role-OS a task, the system decides the best
 * abstraction level automatically:
 *
 *   1. MISSION — when the task matches a proven recurring workflow
 *   2. PACK — when the task is a known family but not a full mission shape
 *   3. FREE ROUTING — when the task is novel, mixed, or uncertain
 *
 * The entry path is honest: it explains WHY it chose each level,
 * and never forces work through the wrong abstraction.
 */

import { suggestMission, getMission, MISSIONS } from "./mission.mjs";
import { suggestPack, getPack, checkPackMismatch, TEAM_PACKS } from "./packs.mjs";
import { detectComposite } from "./decompose.mjs";
import { ROLE_CATALOG } from "./route.mjs";

// ── Entry levels ────────────────────────────────────────────────────────────

/**
 * @typedef {"mission"|"pack"|"free-routing"} EntryLevel
 */

/**
 * @typedef {Object} EntryDecision
 * @property {EntryLevel} level - Which abstraction level was chosen
 * @property {string} reason - Human-readable explanation
 * @property {number} confidence - 0-1 confidence in this choice
 * @property {object|null} mission - Mission details (when level=mission)
 * @property {object|null} pack - Pack details (when level=pack)
 * @property {object|null} freeRouting - Routing hints (when level=free-routing)
 * @property {object|null} alternative - Next-best option if operator disagrees
 * @property {boolean} isComposite - Whether the task looks like multiple jobs
 * @property {string[]} warnings - Any concerns about the choice
 */

// ── Confidence thresholds ───────────────────────────────────────────────────

const MISSION_HIGH_THRESHOLD = 0.7;   // strong mission match → use mission
const MISSION_MEDIUM_THRESHOLD = 0.4; // decent match → mission if pack also agrees
const PACK_HIGH_THRESHOLD = 0.6;      // strong pack match → use pack
const PACK_MEDIUM_THRESHOLD = 0.3;    // decent match → use pack as fallback

// ── Core entry function ─────────────────────────────────────────────────────

/**
 * Decide the best entry path for a task description.
 *
 * The fallback ladder:
 *   mission (when fit is strong)
 *   → pack (when mission fit is weak but task family is clear)
 *   → free routing (when the task is novel or mixed)
 *
 * @param {string} taskDescription
 * @returns {EntryDecision}
 */
export function decideEntry(taskDescription) {
  if (!taskDescription || taskDescription.trim().length === 0) {
    return {
      level: "free-routing",
      reason: "No task description provided — defaulting to free routing.",
      confidence: 0,
      mission: null,
      pack: null,
      freeRouting: { hint: "Provide a task description for better routing." },
      alternative: null,
      isComposite: false,
      warnings: ["Empty task description"],
    };
  }

  const text = taskDescription.trim();
  const warnings = [];

  // Step 1: Check for composite tasks (multi-job detection)
  const composite = detectComposite(text);
  const isComposite = composite.isComposite;
  if (isComposite) {
    warnings.push(
      `Task looks composite (${composite.detectedCategories.map(c => c.category).join(" + ")}). ` +
      `Consider decomposing before routing.`
    );
  }

  // Step 2: Try mission suggestion
  const missionSuggestion = suggestMission(text);
  const missionScore = scoreMissionFit(missionSuggestion);

  // Step 3: Try pack suggestion
  const packSuggestion = suggestPack(text);
  const packScore = scorePackFit(packSuggestion);

  // Step 4: Check agreement (mission and pack point to the same family)
  const agreement = checkAgreement(missionSuggestion, packSuggestion);

  // Step 5: Apply the fallback ladder
  return applyLadder(text, missionSuggestion, missionScore, packSuggestion, packScore, agreement, isComposite, composite, warnings);
}

// ── Scoring helpers ─────────────────────────────────────────────────────────

/**
 * Normalize mission suggestion into a 0-1 score.
 */
function scoreMissionFit(suggestion) {
  if (!suggestion) return 0;
  switch (suggestion.confidence) {
    case "high": return 0.9;
    case "medium": return 0.55;
    case "low": return 0.25;
    default: return 0;
  }
}

/**
 * Normalize pack suggestion into a 0-1 score.
 */
function scorePackFit(suggestion) {
  if (!suggestion) return 0;
  switch (suggestion.confidence) {
    case "high": return 0.85;
    case "medium": return 0.5;
    case "low": return 0.2;
    default: return 0;
  }
}

/**
 * Check if mission and pack suggestions agree (point to same family).
 */
function checkAgreement(missionSuggestion, packSuggestion) {
  if (!missionSuggestion || !packSuggestion) return false;
  const mission = getMission(missionSuggestion.mission);
  if (!mission) return false;
  return mission.pack === packSuggestion.pack;
}

// ── Fallback ladder ─────────────────────────────────────────────────────────

function applyLadder(text, missionSug, missionScore, packSug, packScore, agreement, isComposite, composite, warnings) {
  // ── MISSION: strong match, or medium match with pack agreement ──────────
  if (missionScore >= MISSION_HIGH_THRESHOLD) {
    const mission = getMission(missionSug.mission);
    return {
      level: "mission",
      reason: `Strong mission match: "${mission.name}" (${missionSug.confidence} confidence, ${missionSug.reason}). ` +
              `This is a proven recurring workflow with known role chain, artifact flow, and escalation branches.`,
      confidence: missionScore,
      mission: {
        key: missionSug.mission,
        name: mission.name,
        pack: mission.pack,
        roleChain: mission.roleChain,
        entryPath: mission.entryPath,
        stepCount: mission.artifactFlow.length,
      },
      pack: null,
      freeRouting: null,
      alternative: packSug ? {
        level: "pack",
        key: packSug.pack,
        name: TEAM_PACKS[packSug.pack]?.name,
        confidence: packScore,
      } : null,
      isComposite,
      warnings,
    };
  }

  if (missionScore >= MISSION_MEDIUM_THRESHOLD && agreement) {
    const mission = getMission(missionSug.mission);
    return {
      level: "mission",
      reason: `Mission match: "${mission.name}" (${missionSug.confidence} confidence). ` +
              `Pack suggestion agrees (${packSug.pack}), reinforcing the mission choice.`,
      confidence: Math.min(missionScore + 0.15, 0.85), // boost from agreement
      mission: {
        key: missionSug.mission,
        name: mission.name,
        pack: mission.pack,
        roleChain: mission.roleChain,
        entryPath: mission.entryPath,
        stepCount: mission.artifactFlow.length,
      },
      pack: null,
      freeRouting: null,
      alternative: {
        level: "pack",
        key: packSug.pack,
        name: TEAM_PACKS[packSug.pack]?.name,
        confidence: packScore,
      },
      isComposite,
      warnings,
    };
  }

  // ── PACK: strong pack match but mission doesn't fit well ─────────────────
  if (packScore >= PACK_HIGH_THRESHOLD) {
    const pack = TEAM_PACKS[packSug.pack];
    return {
      level: "pack",
      reason: `Task family match: "${pack.name}" pack (${packSug.confidence} confidence). ` +
              (missionScore > 0
                ? `Mission "${getMission(missionSug.mission)?.name}" was considered but fit was weak (${missionSug.confidence}).`
                : `No mission matched — task family is clear but not a full recurring workflow.`),
      confidence: packScore,
      mission: null,
      pack: {
        key: packSug.pack,
        name: pack.name,
        roles: pack.roles,
        chainOrder: pack.chainOrder,
        description: pack.description,
      },
      freeRouting: null,
      alternative: missionSug ? {
        level: "mission",
        key: missionSug.mission,
        name: getMission(missionSug.mission)?.name,
        confidence: missionScore,
      } : null,
      isComposite,
      warnings,
    };
  }

  if (packScore >= PACK_MEDIUM_THRESHOLD) {
    const pack = TEAM_PACKS[packSug.pack];
    return {
      level: "pack",
      reason: `Weak task family match: "${pack.name}" pack (${packSug.confidence} confidence). ` +
              `Using pack as starting point — operator may want to adjust.`,
      confidence: packScore,
      mission: null,
      pack: {
        key: packSug.pack,
        name: pack.name,
        roles: pack.roles,
        chainOrder: pack.chainOrder,
        description: pack.description,
      },
      freeRouting: null,
      alternative: {
        level: "free-routing",
        confidence: 0,
      },
      isComposite,
      warnings: [...warnings, "Low pack confidence — consider free routing if this doesn't fit"],
    };
  }

  // ── FREE ROUTING: novel, mixed, or uncertain ─────────────────────────────
  const freeHints = buildFreeRoutingHints(text, missionSug, packSug, isComposite, composite);

  return {
    level: "free-routing",
    reason: freeHints.reason,
    confidence: 0.1,
    mission: null,
    pack: null,
    freeRouting: freeHints,
    alternative: missionSug ? {
      level: "mission",
      key: missionSug.mission,
      name: getMission(missionSug.mission)?.name,
      confidence: missionScore,
    } : packSug ? {
      level: "pack",
      key: packSug.pack,
      name: TEAM_PACKS[packSug.pack]?.name,
      confidence: packScore,
    } : null,
    isComposite,
    warnings: [...warnings, "Free routing selected — task will be scored against all 31 roles"],
  };
}

function buildFreeRoutingHints(text, missionSug, packSug, isComposite, composite) {
  let reason;
  if (isComposite) {
    reason = `Task looks composite (${composite.detectedCategories.map(c => c.category).join(" + ")}). ` +
             `No single mission or pack covers all parts — use free routing with decomposition.`;
  } else if (!missionSug && !packSug) {
    reason = "No mission or pack matched. Task is novel — free routing will score all 31 roles.";
  } else {
    reason = "Mission and pack matches were too weak to commit. Free routing will let role scoring decide.";
  }

  return {
    reason,
    hint: isComposite
      ? "Consider running `roleos route` on a packet for each sub-task."
      : "Create a packet with `roleos packet new` and run `roleos route` for role-level routing.",
    suggestedRoleCount: isComposite ? composite.detectedCategories.length * 3 : null,
  };
}

// ── Format for display ──────────────────────────────────────────────────────

/**
 * Format an entry decision as human-readable text.
 * @param {EntryDecision} decision
 * @returns {string}
 */
export function formatEntryDecision(decision) {
  const lines = [];
  const conf = Math.round(decision.confidence * 100);

  lines.push(`Entry Decision: ${decision.level.toUpperCase()} (${conf}% confidence)`);
  lines.push("");
  lines.push(`Reason: ${decision.reason}`);

  if (decision.level === "mission" && decision.mission) {
    lines.push("");
    lines.push(`Mission: ${decision.mission.name} (${decision.mission.key})`);
    lines.push(`Pack: ${decision.mission.pack}`);
    lines.push(`Entry: ${decision.mission.entryPath}`);
    lines.push(`Chain: ${decision.mission.roleChain.join(" → ")}`);
    lines.push(`Steps: ${decision.mission.stepCount}`);
  }

  if (decision.level === "pack" && decision.pack) {
    lines.push("");
    lines.push(`Pack: ${decision.pack.name} (${decision.pack.key})`);
    lines.push(`Roles: ${decision.pack.roles.join(", ")}`);
    lines.push(`Chain: ${decision.pack.chainOrder}`);
  }

  if (decision.level === "free-routing" && decision.freeRouting) {
    lines.push("");
    lines.push(`Hint: ${decision.freeRouting.hint}`);
  }

  if (decision.alternative) {
    lines.push("");
    const altConf = Math.round((decision.alternative.confidence || 0) * 100);
    lines.push(`Alternative: ${decision.alternative.level}${decision.alternative.name ? ` (${decision.alternative.name})` : ""} at ${altConf}% confidence`);
  }

  if (decision.isComposite) {
    lines.push("");
    lines.push(`Note: This task looks composite — consider decomposing before proceeding.`);
  }

  if (decision.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of decision.warnings) {
      lines.push(`  - ${w}`);
    }
  }

  return lines.join("\n");
}
