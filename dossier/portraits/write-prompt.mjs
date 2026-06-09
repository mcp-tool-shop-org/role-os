#!/usr/bin/env node
/**
 * write-prompt.mjs — author Role OS portrait briefs via Ollama Cloud, freeze to JSON.
 *
 * The cloud LLM authors the VARIABLE blocks (subject / specialization / expression /
 * crew_palette / grade_cue) once; we freeze the result into briefs/<id>.portrait.json so
 * generation is reproducible from there (the frozen brief is the PIN). Locked blocks
 * (style / framing / negative) and per-role seed come from house-style.json, not the LLM.
 *
 * Secret: OLLAMA_API_KEY is read from the environment — NEVER hardcode or commit it.
 *
 * Usage:
 *   $env:OLLAMA_API_KEY='...'; node write-prompt.mjs --id judge
 *   $env:OLLAMA_API_KEY='...'; node write-prompt.mjs --all [--model minimax-m3]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const MODEL = argOf('--model', 'minimax-m3');
const ENDPOINT = 'https://ollama.com/v1/chat/completions';
const KEY = process.env.OLLAMA_API_KEY;
if (!KEY) {
  console.error('error: set OLLAMA_API_KEY in the environment (do not hardcode the key).');
  process.exit(1);
}

const house = JSON.parse(readFileSync(join(HERE, 'house-style.json'), 'utf8'));
const roster = JSON.parse(readFileSync(join(HERE, argOf('--roster', 'roster.json')), 'utf8'));
const OUTDIR = join(HERE, 'briefs');

const SYS = `You are the art director for an internal studio tool's CHARACTER ROSTER, rendered as PAINTED WESTERN CONCEPT ART — digital oil painting in the tradition of AAA character key-art and graphic-novel cover painting. Grounded, adult, naturalistic. This is explicitly NOT anime, NOT manga, NOT cartoon, NOT cel-shaded.

Output ONLY a JSON object. No prose outside JSON, no markdown fences. Keys (all string values): subject, specialization, expression, crew_palette, grade_cue.

Rules:
- Office-appropriate, modern, real-looking adult professionals ("operatives" of a studio crew). Modern business / work attire only. ABSOLUTELY NO costumes, hats, caps, hoods, goggles, military uniforms, school uniforms, exposed midriff, bare shoulders, or fantasy/sci-fi gear.
- Each value is a vivid, concrete VISUAL phrase describing what the painter renders.
- subject: a SINGLE adult person, head-and-shoulders, in modern professional attire, plus small handheld or worn props that make the role's FUNCTION legible. Props are small items held in-hand or worn — NEVER a room, desk, workstation, screen-filled scene, or any background environment.
- specialization: one small visual sub-cue (a small held object or worn detail), not a scene.
- expression: MUST embody the given disposition (face + posture).
- crew_palette: the given accent color used ONLY as a subtle rim-light and a small collar insignia — NOT as the whole outfit.
- grade_cue: MUST reflect the given grade as a small insignia or tailoring detail.
- Do NOT describe the background, setting, lighting, or art style — those are locked elsewhere. The subject stands against an implied plain studio backdrop.`;

function userMsg(r) {
  const accent = house.pack_palette[r.crew] || 'cool steel-silver';
  const gradeCue = house.grade_cue[r.grade] || '';
  const dispHint = house.disposition_expression[r.disposition] || '';
  return `Role dossier:
- role: ${r.role}
- function: ${r.function}
- specialization: ${r.specialization}
- charter: ${r.charter || ''}

Crew: ${r.crew}. Accent color: ${accent}.
Disposition to embody: ${r.disposition}${dispHint ? ` (${dispHint})` : ''}.
Grade: ${r.grade}${gradeCue ? ` (${gradeCue})` : ''}.

Write the JSON now.`;
}

// Deterministic seed from id (FNV-1a-ish) so re-rolls / tweaks are reproducible.
function seedFor(id) {
  let h = 2166136261 >>> 0;
  for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

function assemble(blocks) {
  const positive = [house.blocks.style, house.blocks.framing, blocks.subject,
    blocks.specialization, blocks.expression, blocks.crew_palette, blocks.grade_cue]
    .filter(Boolean).join(', ');
  return { positive, negative: house.blocks.negative };
}

async function authorBlocks(r) {
  const body = {
    model: MODEL, stream: false, temperature: 0.7,
    messages: [{ role: 'system', content: SYS }, { role: 'user', content: userMsg(r) }],
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let txt = (data.choices?.[0]?.message?.content || '').trim();
  txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(txt);
}

async function run() {
  mkdirSync(OUTDIR, { recursive: true });
  const idsArg = argOf('--ids');
  const ids = args.includes('--missing')
    ? Object.keys(roster).filter((k) => !k.startsWith('_') && !existsSync(join(OUTDIR, `${k}.portrait.json`)))
    : args.includes('--all')
    ? Object.keys(roster).filter((k) => !k.startsWith('_'))
    : idsArg
    ? idsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : [argOf('--id')].filter(Boolean);
  if (!ids.length) { console.error('error: pass --id <role> or --all'); process.exit(1); }

  let ok = 0, fail = 0;
  for (const id of ids) {
    const r = roster[id];
    if (!r) { console.error(`skip: no roster entry "${id}"`); continue; }
    process.stdout.write(`authoring ${id} via ${MODEL} ... `);
    try {
      const blocks = await authorBlocks(r);
      const brief = {
        schema: 'roleos-portrait/v0.1',
        id, role: r.role,
        dossier_ref: `../../examples/${id}.json`,
        blocks: { style: '$house', framing: '$house', ...blocks },
        negative: '$house',
        params: { ...house.params, seed: seedFor(id) },
        assembled: assemble(blocks),
        provenance: { authored_by: MODEL, engine: 'ollama-cloud', house_style: house.direction, frozen: true },
        gate: { ai_eyes: ['single subject', 'chest-up framing', 'no legible text', `clearly reads as the role's function: ${r.function}`] },
      };
      writeFileSync(join(OUTDIR, `${id}.portrait.json`), JSON.stringify(brief, null, 2) + '\n');
      console.log('ok'); ok++;
    } catch (e) {
      console.log('FAIL'); console.error('  ' + String(e.message || e).slice(0, 240)); fail++;
    }
  }
  console.log(`\ndone: ${ok} ok, ${fail} failed → ${OUTDIR}`);
}

run();
