#!/usr/bin/env node
/**
 * Reverted-red proof for F-a92be7db: missing / corrupt / incomplete aptitude-tuned.json
 * must log and exit 1 without writing sheets. Archetype fallback only behind
 * --allow-baseline, which stamps idealSource so a prior cannot pass as a tune.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, 'build-dossiers.mjs');
const AXES = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];
const FULL = Object.fromEntries(AXES.map((k, i) => [k, (i % 5) + 1]));

function roster(...ids) {
  const out = { _note: 'fixture' };
  for (const id of ids) {
    out[id] = {
      role: id, function: id, specialization: id, crew: 'core',
      disposition: 'Diplomat', grade: 'L3', charter: 'c',
    };
  }
  return out;
}

function modelFor(ids) {
  return {
    archetypes: { coordinator: { ...FULL } },
    roleArchetype: Object.fromEntries(ids.map((id) => [id, 'coordinator'])),
    dispositions: { Diplomat: { delta: { pace: 1 }, blurb: 'b', voice: 'v', prompt_delta: 'p' } },
  };
}

function panelEntry(ideal = FULL, valid = 3) {
  return { archetype: 'coordinator', valid, ideal: { ...ideal } };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'roleos-build-dossiers-'));
  const exDir = join(root, 'examples');
  mkdirSync(exDir);
  const rosterPath = join(root, 'roster.json');
  const modelPath = join(root, 'model.json');
  const tunedPath = join(root, 'aptitude-tuned.json');
  writeFileSync(join(exDir, 'SENTINEL.json'), '{"__sentinel":true}\n');
  return { root, exDir, rosterPath, modelPath, tunedPath };
}

function run(fx, extraArgs = [], extraEnv = {}) {
  return spawnSync(process.execPath, [BUILD, ...extraArgs], {
    env: {
      ...process.env,
      ROLEOS_DOSSIER_ROSTER: fx.rosterPath,
      ROLEOS_DOSSIER_MODEL: fx.modelPath,
      ROLEOS_DOSSIER_TUNED: fx.tunedPath,
      ROLEOS_DOSSIER_EXAMPLES: fx.exDir,
      ...extraEnv,
    },
    encoding: 'utf8',
  });
}

function stems(exDir) {
  return readdirSync(exDir).filter((f) => f.endsWith('.json')).sort();
}

let failed = 0;
function check(label, ok) {
  if (ok) {
    console.log(`PASS  ${label}`);
    return;
  }
  failed++;
  console.error(`FAIL  ${label}`);
}

function refused(label, populate, { args = [], want = /error:.*aptitude-tuned/i } = {}) {
  const fx = fixture();
  try {
    writeFileSync(fx.rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
    writeFileSync(fx.modelPath, JSON.stringify(modelFor(['judge', 'orchestrator'])) + '\n');
    populate(fx);
    const r = run(fx, args);
    const log = `${r.stdout}\n${r.stderr}`;
    check(`${label}: exit !== 0`, r.status !== 0);
    check(`${label}: did not write sheets`, JSON.stringify(stems(fx.exDir)) === JSON.stringify(['SENTINEL.json']));
    check(`${label}: logged the defect`, want.test(log));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

refused('missing tuned file', (fx) => {
  /* leave tunedPath absent */
});

refused('corrupt JSON', (fx) => {
  writeFileSync(fx.tunedPath, '{not json');
}, { want: /corrupt/i });

refused('empty object {}', (fx) => {
  writeFileSync(fx.tunedPath, '{}\n');
}, { want: /incomplete/i });

refused('present id with empty ideal', (fx) => {
  writeFileSync(fx.tunedPath, JSON.stringify({ orchestrator: panelEntry({}, 3) }) + '\n');
}, { want: /incomplete/i });

refused('valid=1 (below tune-aptitudes bar)', (fx) => {
  writeFileSync(fx.tunedPath, JSON.stringify({ orchestrator: panelEntry(FULL, 1) }) + '\n');
}, { want: /valid=1/i });

refused('missing an axis', (fx) => {
  const ideal = { ...FULL };
  delete ideal.candor;
  writeFileSync(fx.tunedPath, JSON.stringify({ orchestrator: panelEntry(ideal, 3) }) + '\n');
}, { want: /incomplete/i });

{
  const fx = fixture();
  try {
    writeFileSync(fx.rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
    writeFileSync(fx.modelPath, JSON.stringify(modelFor(['judge', 'orchestrator'])) + '\n');
    writeFileSync(fx.tunedPath, JSON.stringify({ orchestrator: panelEntry(FULL, 3) }) + '\n');
    const r = run(fx);
    const sheet = JSON.parse(readFileSync(join(fx.exDir, 'orchestrator.json'), 'utf8'));
    check('complete panel: exit 0', r.status === 0);
    check('complete panel: wrote orchestrator.json', sheet.id === 'orchestrator');
    check('complete panel: stamps panel-tuned', sheet.idealSource === 'panel-tuned');
    check('complete panel: did not overwrite judge', stems(fx.exDir).includes('SENTINEL.json'));
    check('complete panel: logs panel-tuned count', /1 panel-tuned, 0 archetype-baseline/.test(`${r.stdout}\n${r.stderr}`));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

{
  const fx = fixture();
  try {
    writeFileSync(fx.rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
    writeFileSync(fx.modelPath, JSON.stringify(modelFor(['judge', 'orchestrator'])) + '\n');
    /* no tuned file */
    const r = run(fx, ['--allow-baseline']);
    const sheet = JSON.parse(readFileSync(join(fx.exDir, 'orchestrator.json'), 'utf8'));
    check('--allow-baseline missing file: exit 0', r.status === 0);
    check('--allow-baseline missing file: stamps archetype-baseline', sheet.idealSource === 'archetype-baseline');
    check('--allow-baseline missing file: logs prior', /archetype prior/.test(`${r.stdout}\n${r.stderr}`));
    check('--allow-baseline missing file: ideal is the archetype', sheet.ideal.rigor === FULL.rigor && sheet.ideal.candor === FULL.candor);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

{
  const fx = fixture();
  try {
    writeFileSync(fx.rosterPath, JSON.stringify(roster('judge', 'orchestrator', 'backend-engineer')) + '\n');
    writeFileSync(fx.modelPath, JSON.stringify(modelFor(['judge', 'orchestrator', 'backend-engineer'])) + '\n');
    writeFileSync(fx.tunedPath, JSON.stringify({ orchestrator: panelEntry(FULL, 3) }) + '\n');
    const r = run(fx, ['--allow-baseline']);
    const a = JSON.parse(readFileSync(join(fx.exDir, 'orchestrator.json'), 'utf8'));
    const b = JSON.parse(readFileSync(join(fx.exDir, 'backend-engineer.json'), 'utf8'));
    check('mixed --allow-baseline: exit 0', r.status === 0);
    check('mixed: panel-ready stays panel-tuned', a.idealSource === 'panel-tuned');
    check('mixed: missing id stamps archetype-baseline', b.idealSource === 'archetype-baseline');
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

{
  const fx = fixture();
  try {
    writeFileSync(fx.rosterPath, JSON.stringify(roster('judge', 'orchestrator')) + '\n');
    writeFileSync(fx.modelPath, JSON.stringify(modelFor(['judge', 'orchestrator'])) + '\n');
    writeFileSync(fx.tunedPath, '{}\n');
    const r = run(fx); // no --allow-baseline
    check('hollow {} without flag: exit !== 0', r.status !== 0);
    check('hollow {} without flag: wrote no sheets', JSON.stringify(stems(fx.exDir)) === JSON.stringify(['SENTINEL.json']));
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall fail-close checks passed');
