#!/usr/bin/env node
/**
 * build-dossiers.mjs — generate examples/<id>.json (full dossiers) for every roster role
 * from the calibrated aptitude model + roster identity.
 *
 * build[axis] = clamp0-5( archetypeIdeal[axis] + dispositionDelta[axis] ) — so the radar
 * shows the role's canonical ideal vs the build its disposition produces. Skips `judge`
 * (hand-authored, richer). Re-run after the model or roster changes, then build-gallery.mjs.
 *
 * Inputs:  portraits/roster.json, aptitude-model.json  ·  Output: examples/<id>.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const roster = JSON.parse(readFileSync(join(HERE, 'portraits', 'roster.json'), 'utf8'));
delete roster._note;
const model = JSON.parse(readFileSync(join(HERE, 'aptitude-model.json'), 'utf8'));
let tuned = {};
try { tuned = JSON.parse(readFileSync(join(HERE, 'aptitude-tuned.json'), 'utf8')); } catch { /* not tuned yet — fall back to archetype ideals */ }
const exDir = join(HERE, 'examples');
mkdirSync(exDir, { recursive: true });

const AXES = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];
const GRADES = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const GRADE_LABEL = { L0: 'Associate', L1: 'Contributor', L2: 'Senior', L3: 'Staff', L4: 'Principal', L5: 'Distinguished' };
const MAPS = {
  rigor: 'Depth of review and evidence demanded before this role accepts work',
  pace: 'maxTurns / budget profile — fast throughput vs deliberate iteration',
  range: 'Convergent execution of the brief vs divergent option-generation',
  skepticism: 'Verifier strength — how hard this role challenges before crediting a claim',
  autonomy: 'Escalation threshold — runs to completion vs stops to ask',
  candor: 'Output verbosity and whether it frames its reasoning contrastively',
};
const clamp = (v) => Math.max(0, Math.min(5, Math.round(v)));
const signed = (v) => (v > 0 ? `+${v}` : `${v}`);

let ok = 0, warn = 0;
for (const [id, r] of Object.entries(roster)) {
  if (id === 'judge') continue; // keep the hand-authored full dossier
  const arch = model.roleArchetype[id];
  const ideal = (tuned[id] && tuned[id].ideal) || (arch && model.archetypes[arch]);
  if (!ideal) { console.warn(`! ${id}: no archetype/ideal (arch=${arch}) — skipped`); warn++; continue; }
  const disp = model.dispositions[r.disposition] || { delta: {}, blurb: '', voice: '', prompt_delta: '' };
  const delta = disp.delta || {};
  const aptitudes = {}, idealOut = {};
  for (const ax of AXES) { idealOut[ax] = clamp(ideal[ax] ?? 0); aptitudes[ax] = clamp((ideal[ax] ?? 0) + (delta[ax] ?? 0)); }
  const deltaStr = {};
  for (const [k, v] of Object.entries(delta)) deltaStr[k] = signed(v);

  const dossier = {
    schema: 'roleos-dossier/v0.2',
    id, role: r.role, specialization: r.specialization, function: r.function,
    crew: [{ pack: r.crew, label: r.crew, role_in_pack: '' }],
    archetype: arch,
    // basis 'assessed' = panel-tuned editorial assessment, no exam behind it; band stays null
    // until the certification pipeline measures one (basis 'certified', S2). Honest by
    // construction per design/specialists-layer.md findings 16-17.
    grade: { level: r.grade, label: GRADE_LABEL[r.grade] || r.grade, path: GRADES, basis: 'assessed', band: null },
    reps: { unit: 'verified events', count: 0, events: [], note: 'verified training/exam/field events only — never calendar units' },
    aptitudes, ideal: idealOut,
    operatingProfile: {
      active: r.disposition, blurb: disp.blurb, delta: deltaStr,
      prompt_delta: disp.prompt_delta, voice: disp.voice,
    },
    techniques: [],
    charter: r.charter,
    maps_to: MAPS,
  };
  writeFileSync(join(exDir, `${id}.json`), JSON.stringify(dossier, null, 2) + '\n');
  ok++;
}
console.log(`dossiers: ${ok} written, ${warn} skipped → ${exDir} (judge kept as hand-authored)`);
