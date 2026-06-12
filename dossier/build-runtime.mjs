#!/usr/bin/env node
/**
 * build-runtime.mjs — compile the dossiers into the runtime file that ships with role-os.
 *
 * The npm `files` field ships `src/` (not `dossier/`), so we emit src/role-dossiers.json
 * keyed by role id. Schema v0.2: carries what dispatch needs (operatingProfile prompt_delta +
 * aptitudes) plus what the crew surfaces need (`roleos crew`, dossier gallery): grade with
 * basis/band, reps (verified events), techniques, charter, maps_to. Reads v0.1 example files
 * tolerantly (disposition -> operatingProfile). Re-run after dossiers change, then commit
 * src/role-dossiers.json.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const exDir = join(HERE, 'examples');
const out = {};
for (const f of readdirSync(exDir).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(exDir, f), 'utf8'));
  const profile = d.operatingProfile || d.disposition || {};
  const grade = d.grade
    ? { ...d.grade, basis: d.grade.basis || 'assessed', band: d.grade.band ?? null }
    : null;
  out[d.id] = {
    role: d.role,
    specialization: d.specialization || null,
    function: d.function || null,
    crew: d.crew || [],
    grade,
    reps: d.reps || { unit: 'verified events', count: 0, events: [], note: 'verified training/exam/field events only — never calendar units' },
    aptitudes: d.aptitudes,
    ideal: d.ideal || null,
    operatingProfile: {
      active: profile.active,
      blurb: profile.blurb || null,
      prompt_delta: profile.prompt_delta,
    },
    techniques: d.techniques || [],
    charter: d.charter || null,
    maps_to: d.maps_to || null,
  };
}
const dst = join(HERE, '..', 'src', 'role-dossiers.json');
writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
console.log(`src/role-dossiers.json: ${Object.keys(out).length} roles (roleos-dossier/v0.2 runtime)`);
