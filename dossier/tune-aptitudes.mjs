#!/usr/bin/env node
/**
 * tune-aptitudes.mjs — per-role aptitude tuning via a PANEL of big cloud models (median consensus).
 *
 * For each role (skip judge), a panel of diverse Ollama-Cloud models each reads the role's
 * function/charter + its archetype baseline ideal and returns a tuned 6-axis ideal (0-5).
 * We take the PER-AXIS MEDIAN across the panel — ensemble measurement, robust to single-model
 * bias — to get a unique, role-specific ideal. Output: aptitude-tuned.json (median + raw panel
 * readings for audit). build-dossiers.mjs then prefers these tuned ideals over the archetype prior.
 *
 * Secret: OLLAMA_API_KEY from env (never hardcode).  Usage: node tune-aptitudes.mjs [--models a,b,c]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const KEY = process.env.OLLAMA_API_KEY;
if (!KEY) { console.error('error: set OLLAMA_API_KEY'); process.exit(1); }

const ENDPOINT = 'https://ollama.com/v1/chat/completions';
const PANEL = argOf('--models', 'minimax-m3,deepseek-v4-pro,glm-5.1').split(',').map((s) => s.trim());
const AXES = ['rigor', 'pace', 'range', 'skepticism', 'autonomy', 'candor'];
const BATCH = Number(argOf('--batch', '4'));

const roster = JSON.parse(readFileSync(join(HERE, 'portraits', 'roster.json'), 'utf8'));
delete roster._note;
const model = JSON.parse(readFileSync(join(HERE, 'aptitude-model.json'), 'utf8'));

const SYS = `You are calibrating a six-axis BEHAVIORAL profile for one role in a studio's AI crew — treat it like setting a precision instrument. Output ONLY a JSON object {"rigor":int,"pace":int,"range":int,"skepticism":int,"autonomy":int,"candor":int}, each 0-5. No prose, no markdown.

Axis meaning (0 -> 5):
- rigor: skim -> reads every line, demands evidence
- pace: deliberate/iterative -> fast/few-turns
- range: convergent/spec-bound -> divergent/generative
- skepticism: trusting/accepts -> refutes/demands proof
- autonomy: escalates often -> runs to completion solo
- candor: terse/result-only -> explains, frames contrastively

You are given the role's ARCHETYPE BASELINE ideal. Tune the profile to THIS role's specific function and charter so it is genuinely distinctive from generic archetype-mates: nudge axes by ±1 (occasionally ±2) where this role's actual work differs from the generic archetype. Stay within the archetype family — do not invert it. Return only the tuned ideal.`;

function userMsg(id, r) {
  const arch = model.roleArchetype[id];
  const baseline = model.archetypes[arch];
  return `Role: ${r.role} (function: ${r.function}). Specialization: ${r.specialization}. Charter: ${r.charter}\nArchetype: ${arch}. Archetype baseline ideal: ${JSON.stringify(baseline)}.\nReturn the tuned 6-axis ideal JSON for THIS specific role.`;
}

function parseArr(txt) {
  txt = String(txt || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
  if (s < 0 || e < 0) return null;
  try {
    const o = JSON.parse(txt.slice(s, e + 1));
    const a = {};
    for (const k of AXES) { const v = Math.round(Number(o[k])); if (!Number.isFinite(v)) return null; a[k] = Math.max(0, Math.min(5, v)); }
    return a;
  } catch { return null; }
}

async function ask(modelName, id, r) {
  const body = { model: modelName, stream: false, temperature: 0.3, messages: [{ role: 'system', content: SYS }, { role: 'user', content: userMsg(id, r) }] };
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${modelName} HTTP ${res.status}`);
  const data = await res.json();
  return parseArr(data.choices?.[0]?.message?.content);
}

function median(nums) { const s = nums.slice().sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); }

async function tuneRole(id, r) {
  const arch = model.roleArchetype[id];
  const baseline = model.archetypes[arch];
  const readings = await Promise.all(PANEL.map((m) => ask(m, id, r).catch(() => null)));
  const panel = {}; const valid = [];
  PANEL.forEach((m, i) => { panel[m] = readings[i]; if (readings[i]) valid.push(readings[i]); });
  let ideal;
  if (valid.length >= 2) { ideal = {}; for (const ax of AXES) ideal[ax] = median(valid.map((v) => v[ax])); }
  else { ideal = { ...baseline }; } // fall back to archetype prior if the panel didn't return enough
  return { archetype: arch, baseline, panel, valid: valid.length, ideal };
}

async function run() {
  const ids = Object.keys(roster).filter((id) => id !== 'judge');
  const out = {};
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const results = await Promise.all(slice.map((id) => tuneRole(id, roster[id]).then((res) => [id, res]).catch((e) => { console.error(`! ${id}: ${e.message}`); return [id, null]; })));
    for (const [id, res] of results) {
      if (!res) continue;
      out[id] = res;
      console.log(`${id} [${res.archetype}] panel=${res.valid}/${PANEL.length} -> ${AXES.map((a) => res.ideal[a]).join('')}`);
    }
  }
  writeFileSync(join(HERE, 'aptitude-tuned.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`\ntuned: ${Object.keys(out).length} roles via panel [${PANEL.join(', ')}] -> aptitude-tuned.json`);
}
run();
