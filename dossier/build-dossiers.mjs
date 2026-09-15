#!/usr/bin/env node
/**
 * build-dossiers.mjs — generate examples/<id>.json (full dossiers) for every roster role
 * from the calibrated aptitude model + roster identity.
 *
 * build[axis] = clamp0-5( ideal[axis] + dispositionDelta[axis] ) — so the radar
 * shows the role's canonical ideal vs the build its disposition produces. Skips `judge`
 * (hand-authored, richer). Re-run after the model or roster changes, then build-gallery.mjs.
 *
 * Requires aptitude-tuned.json with a complete 6-axis 0–5 ideal and valid>=2 for every
 * non-judge roster id (same bar as tune-aptitudes.mjs). Missing, corrupt, or incomplete
 * input logs and exits 1 — no silent archetype fallback. Pass --allow-baseline to use
 * aptitude-model.json archetypes; that path stamps each sheet idealSource so the gallery
 * cannot present a prior as a panel tune.
 *
 * Inputs:  portraits/roster.json, aptitude-model.json, aptitude-tuned.json
 * Output: examples/<id>.json
 * Usage:  node build-dossiers.mjs [--allow-baseline]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const ALLOW_BASELINE = args.includes('--allow-baseline');

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

function pathsFromEnv() {
  return {
    rosterPath: process.env.ROLEOS_DOSSIER_ROSTER || join(HERE, 'portraits', 'roster.json'),
    modelPath: process.env.ROLEOS_DOSSIER_MODEL || join(HERE, 'aptitude-model.json'),
    tunedPath: process.env.ROLEOS_DOSSIER_TUNED || join(HERE, 'aptitude-tuned.json'),
    exDir: process.env.ROLEOS_DOSSIER_EXAMPLES || join(HERE, 'examples'),
  };
}

/** Same bar as tune-aptitudes.mjs completeIdeal, plus the 0–5 clamp that writer already applies. */
function completeIdeal(ideal) {
  if (!ideal || typeof ideal !== 'object' || Array.isArray(ideal)) return false;
  return AXES.every((k) => {
    const v = ideal[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5;
  });
}

/** Panel-ready: complete ideal AND valid>=2 (tune-aptitudes weak-filter, consumer side). */
function panelReady(entry) {
  return !!entry && completeIdeal(entry.ideal) && Number(entry.valid) >= 2;
}

function loadTuned(tunedPath) {
  let raw;
  try {
    raw = readFileSync(tunedPath, 'utf8');
  } catch (e) {
    return { ok: false, tuned: {}, error: `aptitude-tuned.json missing (${e.message})` };
  }
  let tuned;
  try {
    tuned = JSON.parse(raw);
  } catch (e) {
    return { ok: false, tuned: {}, error: `aptitude-tuned.json corrupt (${e.message})` };
  }
  if (!tuned || typeof tuned !== 'object' || Array.isArray(tuned)) {
    return { ok: false, tuned: {}, error: 'aptitude-tuned.json is not an object' };
  }
  return { ok: true, tuned, error: null };
}

function panelGap(id, entry) {
  if (!entry) return `${id}: missing`;
  if (!completeIdeal(entry.ideal)) return `${id}: ideal incomplete (need finite 0–5 on ${AXES.join(', ')})`;
  if (!(Number(entry.valid) >= 2)) return `${id}: valid=${entry.valid} (need >=2)`;
  return null;
}

function resolveIdeal(id, tuned, model, allowBaseline) {
  const arch = model.roleArchetype?.[id];
  const entry = tuned[id];
  if (panelReady(entry)) {
    return { ideal: entry.ideal, source: 'panel-tuned', arch, gap: null };
  }
  const baseline = arch && model.archetypes?.[arch];
  const gap = panelGap(id, entry);
  if (allowBaseline && completeIdeal(baseline)) {
    return { ideal: baseline, source: 'archetype-baseline', arch, gap };
  }
  return { ideal: null, source: null, arch, gap: gap || `${id}: no archetype/ideal (arch=${arch})` };
}

function buildSheet(id, r, resolved, model) {
  const { ideal, source, arch } = resolved;
  const disp = model.dispositions[r.disposition] || { delta: {}, blurb: '', voice: '', prompt_delta: '' };
  const delta = disp.delta || {};
  const aptitudes = {}, idealOut = {};
  for (const ax of AXES) {
    idealOut[ax] = clamp(ideal[ax] ?? 0);
    aptitudes[ax] = clamp((ideal[ax] ?? 0) + (delta[ax] ?? 0));
  }
  const deltaStr = {};
  for (const [k, v] of Object.entries(delta)) deltaStr[k] = signed(v);
  return {
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
    // idealSource is the gallery-visible stamp: panel-tuned vs archetype-baseline.
    // --allow-baseline is the only path that may write archetype-baseline.
    idealSource: source,
    operatingProfile: {
      active: r.disposition, blurb: disp.blurb, delta: deltaStr,
      prompt_delta: disp.prompt_delta, voice: disp.voice,
    },
    techniques: [],
    charter: r.charter,
    maps_to: MAPS,
  };
}

export function main(paths = pathsFromEnv()) {
  const roster = JSON.parse(readFileSync(paths.rosterPath, 'utf8'));
  delete roster._note;
  const model = JSON.parse(readFileSync(paths.modelPath, 'utf8'));
  const loaded = loadTuned(paths.tunedPath);

  if (!loaded.ok && !ALLOW_BASELINE) {
    console.error(`error: ${loaded.error}; run tune-aptitudes.mjs or pass --allow-baseline to stamp archetype priors`);
    process.exit(1);
  }
  if (!loaded.ok && ALLOW_BASELINE) {
    console.warn(`warn: ${loaded.error}; --allow-baseline using aptitude-model.json archetypes (sheets will be stamped archetype-baseline)`);
  }

  const tuned = loaded.ok ? loaded.tuned : {};
  const ids = Object.keys(roster).filter((id) => id !== 'judge');
  const resolved = {};
  const gaps = [];
  const unusable = [];
  for (const id of ids) {
    const res = resolveIdeal(id, tuned, model, ALLOW_BASELINE);
    resolved[id] = res;
    if (res.gap) gaps.push(res.gap);
    if (!res.ideal) unusable.push(res.gap || `${id}: no ideal`);
  }

  if (!ALLOW_BASELINE && gaps.length) {
    console.error(`error: aptitude-tuned.json incomplete — need valid>=2 and a complete 6-axis 0–5 ideal for every non-judge id (same bar as tune-aptitudes.mjs); ${gaps.length}/${ids.length} missing`);
    for (const g of gaps) console.error(`  ${g}`);
    console.error('pass --allow-baseline to use archetype priors (stamps idealSource: archetype-baseline)');
    process.exit(1);
  }
  if (unusable.length) {
    console.error(`error: ${unusable.length}/${ids.length} roles have no usable ideal (even with${ALLOW_BASELINE ? '' : 'out'} --allow-baseline); not writing`);
    for (const g of unusable) console.error(`  ${g}`);
    process.exit(1);
  }

  mkdirSync(paths.exDir, { recursive: true });
  let panel = 0, baseline = 0;
  for (const id of ids) {
    const res = resolved[id];
    if (res.source === 'archetype-baseline') {
      console.warn(`! ${id}: no complete panel ideal — using archetype prior (--allow-baseline)`);
      baseline++;
    } else {
      panel++;
    }
    const dossier = buildSheet(id, roster[id], res, model);
    writeFileSync(join(paths.exDir, `${id}.json`), JSON.stringify(dossier, null, 2) + '\n');
  }
  console.log(`dossiers: ${ids.length} written (${panel} panel-tuned, ${baseline} archetype-baseline) → ${paths.exDir} (judge kept as hand-authored)`);
  return 0;
}

function isCli() {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(argv1).toLowerCase();
  } catch {
    return false;
  }
}

if (isCli()) main();
