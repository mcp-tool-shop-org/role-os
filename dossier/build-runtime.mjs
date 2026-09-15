#!/usr/bin/env node
/**
 * build-runtime.mjs — compile the dossiers into the runtime file that ships with role-os.
 *
 * The npm `files` field ships `src/` (not `dossier/`), so we emit src/role-dossiers.json
 * keyed by role id. Schema v0.2 only: refuse to write unless every roster id has a
 * parseable v0.2 example with a complete 6-axis aptitudes/ideal. Empty, partial, or
 * schema-mismatched sets exit 1 and leave the previous dump in place. Re-run after
 * dossiers change, then commit src/role-dossiers.json.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = 'roleos-dossier/v0.2';
const AXES = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];

function pathsFromEnv() {
  return {
    exDir: process.env.ROLEOS_DOSSIER_EXAMPLES || join(HERE, 'examples'),
    rosterPath: process.env.ROLEOS_DOSSIER_ROSTER || join(HERE, 'portraits', 'roster.json'),
    dst: process.env.ROLEOS_DOSSIER_OUT || join(HERE, '..', 'src', 'role-dossiers.json'),
  };
}

function completeSix(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return AXES.every((k) => {
    const v = obj[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5;
  });
}

function compileRecord(d, stem) {
  const errors = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { record: null, errors: [`${stem}.json: not an object`] };
  if (d.schema !== SCHEMA) errors.push(`${stem}.json: schema ${JSON.stringify(d.schema)} !== ${SCHEMA}`);
  if (d.id !== stem) errors.push(`${stem}.json: id ${JSON.stringify(d.id)} !== filename stem`);
  if (!completeSix(d.aptitudes)) errors.push(`${stem}.json: aptitudes missing complete 6-axis 0–5`);
  if (!completeSix(d.ideal)) errors.push(`${stem}.json: ideal missing complete 6-axis 0–5`);
  if (errors.length) return { record: null, errors };
  const profile = d.operatingProfile || {};
  const grade = d.grade
    ? { ...d.grade, basis: d.grade.basis || 'assessed', band: d.grade.band ?? null }
    : null;
  return {
    record: {
      role: d.role,
      specialization: d.specialization || null,
      function: d.function || null,
      crew: d.crew || [],
      grade,
      reps: d.reps || { unit: 'verified events', count: 0, events: [], note: 'verified training/exam/field events only — never calendar units' },
      aptitudes: d.aptitudes,
      ideal: d.ideal,
      operatingProfile: {
        active: profile.active,
        blurb: profile.blurb || null,
        prompt_delta: profile.prompt_delta,
      },
      techniques: d.techniques || [],
      charter: d.charter || null,
      maps_to: d.maps_to || null,
    },
    errors: [],
  };
}

export function compileRuntime(paths = pathsFromEnv()) {
  const errors = [];
  let roster = {};
  try {
    roster = JSON.parse(readFileSync(paths.rosterPath, 'utf8'));
  } catch (e) {
    return { ok: false, out: {}, rosterIds: [], errors: [`roster unreadable: ${e.message}`], parsed: 0, schema: SCHEMA };
  }
  if (!roster || typeof roster !== 'object' || Array.isArray(roster)) {
    return { ok: false, out: {}, rosterIds: [], errors: ['roster is not an object'], parsed: 0, schema: SCHEMA };
  }
  delete roster._note;
  const rosterIds = Object.keys(roster);

  let files = [];
  try {
    files = readdirSync(paths.exDir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    return { ok: false, out: {}, rosterIds, errors: [`examples unreadable: ${e.message}`], parsed: 0, schema: SCHEMA };
  }

  const out = {};
  for (const f of files) {
    const stem = f.slice(0, -5);
    let d;
    try {
      d = JSON.parse(readFileSync(join(paths.exDir, f), 'utf8'));
    } catch (e) {
      errors.push(`${f}: JSON.parse failed (${e.message})`);
      continue;
    }
    const { record, errors: recErrors } = compileRecord(d, stem);
    if (recErrors.length) {
      errors.push(...recErrors);
      continue;
    }
    out[d.id] = record;
  }

  if (rosterIds.length === 0) errors.push('roster is empty');
  const missing = rosterIds.filter((id) => !Object.prototype.hasOwnProperty.call(out, id));
  const extra = Object.keys(out).filter((id) => !Object.prototype.hasOwnProperty.call(roster, id));
  if (missing.length) errors.push(`missing roster ids (${missing.length}/${rosterIds.length}): ${missing.join(', ')}`);
  if (extra.length) errors.push(`examples not in roster (${extra.length}): ${extra.join(', ')}`);

  const parsed = Object.keys(out).length;
  const ok = errors.length === 0 && parsed === rosterIds.length && rosterIds.length > 0;
  return { ok, out, rosterIds, errors, parsed, schema: SCHEMA };
}

export function main(paths = pathsFromEnv()) {
  const result = compileRuntime(paths);
  const nRoster = result.rosterIds.length;
  const nOut = result.parsed;
  console.log(`${result.schema}: ${nOut}/${nRoster} roster roles parseable`);
  if (!result.ok) {
    console.error(`error: ${result.schema} compile refused — ${nOut}/${nRoster} roster roles parseable; dump NOT written`);
    for (const e of result.errors) console.error(`  ${e}`);
    process.exit(1);
  }
  writeFileSync(paths.dst, JSON.stringify(result.out, null, 2) + '\n');
  console.log(`${paths.dst}: ${nOut}/${nRoster} roles (${result.schema} runtime)`);
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
