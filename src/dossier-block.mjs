/**
 * dossier-block.mjs — opt-in "Operating Posture" prompt block from a role's dossier.
 *
 * Mirrors render-knowledge-block.mjs: a pure function returning string | null. When a role
 * has a dossier (src/role-dossiers.json, compiled by dossier/build-runtime.mjs), it injects
 * that role's disposition behavioral instruction + a posture line derived from its tuned
 * six-axis aptitudes. No dossier -> null -> the prompt is byte-identical to before. This is
 * how a role's character sheet actually configures the role at dispatch time.
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
 * Render the Operating Posture block for a role, or null if it has no dossier.
 * @param {string} roleName  display name, e.g. "Backend Engineer"
 * @returns {string|null}
 */
export function renderDossierBlock(roleName) {
  const d = loadDossiers()[toId(roleName)];
  if (!d) return null;
  const dispo = d.disposition || {};
  const lines = ["## Operating Posture"];
  if (dispo.active && dispo.prompt_delta) {
    lines.push(`Disposition — **${dispo.active}**: ${dispo.prompt_delta}`);
  }
  const posture = postureLine(d.aptitudes);
  if (posture) lines.push(`Tuned profile: ${posture}.`);
  return lines.length > 1 ? lines.join("\n") : null;
}
