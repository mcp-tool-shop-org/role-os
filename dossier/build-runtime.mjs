#!/usr/bin/env node
/**
 * build-runtime.mjs — compile the dossiers into a compact runtime file that ships with role-os.
 *
 * dispatch needs only a little per role (disposition prompt_delta + aptitudes), and the npm
 * `files` field ships `src/` (not `dossier/`). So we emit src/role-dossiers.json — small, no
 * images — keyed by role id. Re-run after dossiers change, then commit src/role-dossiers.json.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const exDir = join(HERE, 'examples');
const out = {};
for (const f of readdirSync(exDir).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(exDir, f), 'utf8'));
  out[d.id] = {
    role: d.role,
    aptitudes: d.aptitudes,
    disposition: { active: d.disposition?.active, prompt_delta: d.disposition?.prompt_delta },
  };
}
const dst = join(HERE, '..', 'src', 'role-dossiers.json');
writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
console.log(`src/role-dossiers.json: ${Object.keys(out).length} roles`);
