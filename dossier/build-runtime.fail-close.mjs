#!/usr/bin/env node
/**
 * Reverted-red proof for F-4277ba44: empty / partial / schema-mismatch compiles
 * must exit 1 and leave the previous dump in place. Does not write src/role-dossiers.json.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, 'build-runtime.mjs');
const LIVE_DUMP = join(HERE, '..', 'src', 'role-dossiers.json');
const SENTINEL = '{"__sentinel":true}\n';

const AXES = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];
const FULL = Object.fromEntries(AXES.map((k, i) => [k, i === 0 ? 5 : 1]));

function example(id, extra = {}) {
  return {
    schema: 'roleos-dossier/v0.2',
    id,
    role: id,
    aptitudes: { ...FULL },
    ideal: { ...FULL },
    operatingProfile: { active: 'Skeptic', prompt_delta: 'x' },
    ...extra,
  };
}

function roster(...ids) {
  return Object.fromEntries(ids.map((id) => [id, { role: id }]));
}

function hash(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

function run(exDir, rosterPath, dst) {
  return spawnSync(process.execPath, [BUILD], {
    env: {
      ...process.env,
      ROLEOS_DOSSIER_EXAMPLES: exDir,
      ROLEOS_DOSSIER_ROSTER: rosterPath,
      ROLEOS_DOSSIER_OUT: dst,
    },
    encoding: 'utf8',
  });
}

function fixture(populate) {
  const root = mkdtempSync(join(tmpdir(), 'roleos-dossier-fail-close-'));
  const exDir = join(root, 'examples');
  mkdirSync(exDir);
  const rosterPath = join(root, 'roster.json');
  const dst = join(root, 'role-dossiers.json');
  writeFileSync(dst, SENTINEL);
  populate({ root, exDir, rosterPath, dst });
  return { root, exDir, rosterPath, dst };
}

const dumpBefore = hash(LIVE_DUMP);
let failed = 0;

function check(label, ok) {
  if (ok) {
    console.log(`PASS  ${label}`);
    return;
  }
  failed++;
  console.error(`FAIL  ${label}`);
}

function refused(label, populate) {
  const fx = fixture(populate);
  try {
    const r = run(fx.exDir, fx.rosterPath, fx.dst);
    const left = readFileSync(fx.dst, 'utf8');
    check(`${label}: exit !== 0`, r.status !== 0);
    check(`${label}: previous dump left in place`, left === SENTINEL);
    check(`${label}: logs schema/count`, /roleos-dossier\/v0\.2/.test(`${r.stdout}\n${r.stderr}`) && /\d+\/\d+/.test(`${r.stdout}\n${r.stderr}`));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

refused('empty examples', ({ rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
});

refused('partial 1-of-2', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('judge')) + '\n');
});

refused('schema v0.1', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('judge', { schema: 'roleos-dossier/v0.1' })) + '\n');
});

refused('missing schema', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  const d = example('judge');
  delete d.schema;
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(d) + '\n');
});

refused('incomplete aptitudes', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  const apt = { ...FULL };
  delete apt.candor;
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('judge', { aptitudes: apt })) + '\n');
});

refused('incomplete ideal', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('judge', { ideal: {} })) + '\n');
});

refused('unparseable JSON', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  writeFileSync(join(exDir, 'judge.json'), '{not json');
});

refused('id/filename mismatch', ({ exDir, rosterPath }) => {
  writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
  writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('orchestrator')) + '\n');
});

{
  const fx = fixture(({ exDir, rosterPath }) => {
    writeFileSync(rosterPath, JSON.stringify(roster('judge')) + '\n');
    writeFileSync(join(exDir, 'judge.json'), JSON.stringify(example('judge')) + '\n');
  });
  try {
    const r = run(fx.exDir, fx.rosterPath, fx.dst);
    const dump = JSON.parse(readFileSync(fx.dst, 'utf8'));
    check('complete 1-id set: exit 0', r.status === 0);
    check('complete 1-id set: wrote dump', dump.judge && dump.judge.aptitudes && dump.judge.ideal);
    check('complete 1-id set: logs 1/1', /1\/1/.test(`${r.stdout}\n${r.stderr}`));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'roleos-dossier-fail-close-live-'));
  const dst = join(root, 'role-dossiers.json');
  writeFileSync(dst, SENTINEL);
  try {
    const env = { ...process.env, ROLEOS_DOSSIER_OUT: dst };
    delete env.ROLEOS_DOSSIER_EXAMPLES;
    delete env.ROLEOS_DOSSIER_ROSTER;
    const r = spawnSync(process.execPath, [BUILD], { env, encoding: 'utf8' });
    const dump = JSON.parse(readFileSync(dst, 'utf8'));
    const n = Object.keys(dump).length;
    check('live roster: exit 0', r.status === 0);
    check(`live roster: wrote ${n} roles (need 64)`, n === 64);
    check('live roster: logs 64/64', /64\/64/.test(`${r.stdout}\n${r.stderr}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

check('src/role-dossiers.json unchanged', hash(LIVE_DUMP) === dumpBefore);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall fail-close checks passed');
