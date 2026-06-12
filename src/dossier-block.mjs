/**
 * dossier-block.mjs — opt-in "Operating Posture" prompt block from a role's dossier.
 *
 * Mirrors render-knowledge-block.mjs: a pure function returning string | null. When a role
 * has a dossier (src/role-dossiers.json, compiled by dossier/build-runtime.mjs), it injects
 * that role's operating-profile instruction + derived priorities + a posture line from its
 * tuned six-axis aptitudes. No dossier -> null -> the prompt is byte-identical to before.
 *
 * HONESTY CONTRACT (design/specialists-layer.md, finding 20): every surface that displays a
 * role's operating profile renders EXACTLY what this module injects — deriveProfile() is the
 * single source of truth for the injected text. Surfaces import it; they never restate it.
 * Schema v0.2 renames the layer disposition -> operatingProfile; v0.1 records are still read.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSafe } from "./fs-utils.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const AXES = ["rigor", "pace", "range", "skepticism", "autonomy", "candor"];

const HIGH = {
  rigor: "reads exhaustively and demands quoted evidence",
  pace: "moves fast with few iterations",
  range: "explores divergent options",
  skepticism: "challenges hard and withholds acceptance until proof is shown",
  autonomy: "runs to completion before escalating",
  candor: "explains its reasoning and frames choices contrastively",
};
const LOW = {
  rigor: "works at a deliberate skim",
  pace: "works deliberately, iterating",
  range: "converges and executes the brief as given",
  skepticism: "extends good faith and takes the contract at face value",
  autonomy: "escalates early when uncertain",
  candor: "stays terse and results-only",
};

// What each high-set axis means the role optimizes FOR (ordered list source).
const PRIORITY = {
  rigor: "evidence depth",
  pace: "throughput",
  range: "option coverage",
  skepticism: "claim verification",
  autonomy: "independent completion",
  candor: "explained reasoning",
};

let _dossiers = null;
function loadDossiers() {
  if (_dossiers) return _dossiers;
  const raw = readFileSafe(join(HERE, "role-dossiers.json"));
  if (!raw) { _dossiers = {}; return _dossiers; }
  try { _dossiers = JSON.parse(raw); } catch { _dossiers = {}; }
  return _dossiers;
}

function toId(roleName) {
  return String(roleName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function postureLine(aptitudes) {
  if (!aptitudes) return "";
  const parts = [];
  for (const ax of AXES) {
    const v = aptitudes[ax];
    if (v >= 4) parts.push(HIGH[ax]);
    else if (v <= 1) parts.push(LOW[ax]);
  }
  return parts.join("; ");
}

/**
 * Ordered priorities derived from the tuned aptitudes: every axis at 4+ contributes,
 * highest value first, canonical axis order breaking ties. Deterministic — priorities are
 * computed from the real knobs, never authored as flavor.
 * @returns {string[]} e.g. ["claim verification", "evidence depth"]
 */
export function derivePriorities(aptitudes) {
  if (!aptitudes) return [];
  return AXES
    .map((ax, i) => ({ ax, i, v: aptitudes[ax] ?? 0 }))
    .filter((e) => e.v >= 4)
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((e) => PRIORITY[e.ax]);
}

/**
 * The role's operating profile as dispatch sees it — the single source of truth shared by
 * the prompt injection, the crew gallery, and the CLI sheet. Reads v0.2 (operatingProfile)
 * with a tolerant fallback to v0.1 (disposition).
 * @param {object} d  a dossier record from role-dossiers.json
 * @returns {{archetype: string|null, promptDelta: string|null, priorities: string[], posture: string}}
 */
export function deriveProfile(d) {
  const profile = d?.operatingProfile || d?.disposition || {};
  return {
    archetype: profile.active || null,
    promptDelta: profile.prompt_delta || null,
    priorities: derivePriorities(d?.aptitudes),
    posture: postureLine(d?.aptitudes),
  };
}

/**
 * Render the Operating Posture block for a role, or null if it has no dossier.
 * @param {string} roleName  display name, e.g. "Backend Engineer"
 * @returns {string|null}
 */
export function renderDossierBlock(roleName) {
  const d = loadDossiers()[toId(roleName)];
  if (!d) return null;
  const p = deriveProfile(d);
  const lines = ["## Operating Posture"];
  if (p.archetype && p.promptDelta) {
    lines.push(`Profile — **${p.archetype}**: ${p.promptDelta}`);
  }
  if (p.priorities.length) lines.push(`Priorities: ${p.priorities.join("; ")}.`);
  if (p.posture) lines.push(`Tuned posture: ${p.posture}.`);
  return lines.length > 1 ? lines.join("\n") : null;
}
