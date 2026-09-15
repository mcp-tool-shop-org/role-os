#!/usr/bin/env node
/**
 * apply-tuning-fixes.mjs — apply the external-verifier corrections to aptitude-tuned.json,
 * then run a deterministic tie-break safety net so all 64 fingerprints (63 tuned + judge) are
 * pairwise distinct. Usage: node apply-tuning-fixes.mjs <verifier-output-or-corrections.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TUNED = join(HERE, 'aptitude-tuned.json');
const AX = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];
const clamp = (v) => Math.max(0, Math.min(5, Math.round(Number(v))));
const key = (o) => AX.map((a) => o[a]).join('-');

const t = JSON.parse(readFileSync(TUNED, 'utf8'));
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const fixes = raw.corrections || raw.result?.corrections || raw;

let applied = 0;
for (const [id, arr] of Object.entries(fixes)) {
  if (!t[id] || !arr || typeof arr !== 'object') continue;
  const cur = { ...t[id].ideal };
  for (const ax of AX) if (arr[ax] != null) cur[ax] = clamp(arr[ax]);
  t[id].ideal = cur; t[id].verified = true; applied++;
}

// deterministic final tie-break — pre-seed with judge's fixed hand-authored ideal
const JUDGE_KEY = '5-2-1-4-3-4';
const seen = new Map([[JUDGE_KEY, 'judge']]);
let broke = 0;
const unfixed = [];
for (const id of Object.keys(t)) {
  let k = key(t[id].ideal);
  if (seen.has(k)) {
    const prior = seen.get(k);
    let fixed = false;
    for (const ax of ['autonomy', 'candor', 'range', 'pace', 'rigor', 'skepticism']) {
      for (const d of [1, -1, 2, -2]) {
        const v = t[id].ideal[ax] + d;
        if (v < 0 || v > 5) continue;
        const test = { ...t[id].ideal, [ax]: v };
        const k2 = key(test);
        if (!seen.has(k2)) {
          t[id].ideal = test;
          t[id].verified = false;
          t[id].tiebroken = { axis: ax, delta: d, collided_with: prior };
          k = k2;
          fixed = true;
          break;
        }
      }
      if (fixed) break;
    }
    if (fixed) broke++;
    else unfixed.push({ id, prior, key: k });
  }
  seen.set(k, id);
}

const judgeInFile = Object.prototype.hasOwnProperty.call(t, 'judge');
const groups = {};
if (!judgeInFile) groups[JUDGE_KEY] = ['judge'];
for (const id of Object.keys(t)) { const kk = key(t[id].ideal); (groups[kk] = groups[kk] || []).push(id); }
const col = Object.values(groups).filter((v) => v.length > 1);
const expected = Object.keys(t).length + (judgeInFile ? 0 : 1);
const distinct = Object.keys(groups).length;
if (unfixed.length || col.length || distinct !== expected) {
  console.error(`error: residual collisions; not writing aptitude-tuned.json (distinct ${distinct}/${expected}, unfixed ${unfixed.length})`);
  for (const v of col) console.error('  residual:', v.join(', '));
  for (const u of unfixed) console.error(`  unfixed: ${u.id} collides with ${u.prior} at ${u.key}`);
  process.exit(1);
}

writeFileSync(TUNED, JSON.stringify(t, null, 2) + '\n');
console.log(`applied ${applied} verifier corrections; deterministic tie-breaks ${broke}; distinct ${distinct}/${expected} (63 tuned + judge); residual collisions 0`);
