#!/usr/bin/env node
/**
 * render.mjs — render frozen portrait briefs through a running ComfyUI.
 *
 * Builds the right API graph from the brief's params.kind ("chroma" = FLUX-style
 * UNET+T5+VAE+SamplerCustomAdvanced; "sdxl" = CheckpointLoaderSimple+KSampler), submits
 * to /prompt, polls /history, and copies the finished PNG into renders/<id>.png.
 *
 *   COMFY_URL  (default http://127.0.0.1:8188)
 *   COMFY_OUT  (default E:\AI-Models\ComfyUI_windows_portable\ComfyUI\output)
 *
 * Usage:  node render.mjs --id judge   |   node render.mjs --all
 */
import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const COMFY = (process.env.COMFY_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
const COMFY_OUT = process.env.COMFY_OUT || 'E:\\AI-Models\\ComfyUI_windows_portable\\ComfyUI\\output';
const LORA = argOf('--lora');
const LORA_STR = Number(argOf('--lora-strength', '0.8'));
const SUFFIX = argOf('--suffix', '');
const BRIEFS = join(HERE, 'briefs');
const RENDERS = join(HERE, 'renders');

// Chroma1-HD (FLUX-class): UNET + t5xxl(CLIPLoader type=chroma) + ae VAE, AuraFlow flow-shift,
// CFGGuider + SamplerCustomAdvanced (euler / beta). Mirrors the verified Chroma workflow.
function graphChroma(b) {
  const p = b.params, a = b.assembled;
  const lora = LORA || p.lora;
  const loraStr = LORA ? LORA_STR : (p.lora_strength ?? 0.8);
  const g = {
    u: { class_type: 'UNETLoader', inputs: { unet_name: p.unet, weight_dtype: 'default' } },
    c: { class_type: 'CLIPLoader', inputs: { clip_name: p.clip, type: p.clip_type || 'chroma', device: 'default' } },
    vae: { class_type: 'VAELoader', inputs: { vae_name: p.vae } },
    shift: { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['u', 0], shift: p.shift ?? 1.0 } },
    pos: { class_type: 'CLIPTextEncode', inputs: { clip: ['c', 0], text: a.positive } },
    neg: { class_type: 'CLIPTextEncode', inputs: { clip: ['c', 0], text: a.negative } },
    g: { class_type: 'CFGGuider', inputs: { model: ['shift', 0], positive: ['pos', 0], negative: ['neg', 0], cfg: p.cfg } },
    ks: { class_type: 'KSamplerSelect', inputs: { sampler_name: p.sampler } },
    sch: { class_type: 'BasicScheduler', inputs: { model: ['shift', 0], scheduler: p.scheduler, steps: p.steps, denoise: 1.0 } },
    noise: { class_type: 'RandomNoise', inputs: { noise_seed: p.seed } },
    lat: { class_type: 'EmptySD3LatentImage', inputs: { width: p.width, height: p.height, batch_size: 1 } },
    samp: { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['noise', 0], guider: ['g', 0], sampler: ['ks', 0], sigmas: ['sch', 0], latent_image: ['lat', 0] } },
    dec: { class_type: 'VAEDecode', inputs: { samples: ['samp', 0], vae: ['vae', 0] } },
    save: { class_type: 'SaveImage', inputs: { filename_prefix: `roleos/${b.id}`, images: ['dec', 0] } },
  };
  if (lora) {
    g.lora = { class_type: 'LoraLoaderModelOnly', inputs: { model: ['u', 0], lora_name: lora, strength_model: loraStr } };
    g.shift.inputs.model = ['lora', 0];
  }
  return g;
}

// SDXL single-checkpoint txt2img.
function graphSDXL(b) {
  const p = b.params, a = b.assembled;
  const ckpt = p.checkpoint || `${p.base}.safetensors`;
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: ckpt } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: a.positive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: a.negative, clip: ['4', 1] } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: p.width, height: p.height, batch_size: 1 } },
    '3': { class_type: 'KSampler', inputs: { seed: p.seed, steps: p.steps, cfg: p.cfg, sampler_name: p.sampler, scheduler: p.scheduler, denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: `roleos/${b.id}`, images: ['8', 0] } },
  };
}

function buildGraph(b) {
  return (b.params.kind === 'chroma') ? graphChroma(b) : graphSDXL(b);
}

async function up() {
  try { const r = await fetch(`${COMFY}/system_stats`); return r.ok; } catch { return false; }
}

async function submit(g) {
  const r = await fetch(`${COMFY}/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: g }),
  });
  if (!r.ok) throw new Error(`/prompt HTTP ${r.status}: ${(await r.text()).slice(0, 400)}`);
  return (await r.json()).prompt_id;
}

async function wait(id, timeoutMs = 420000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = await fetch(`${COMFY}/history/${id}`);
    const h = await r.json();
    if (h[id]) {
      if (h[id].status?.status_str === 'error') throw new Error('ComfyUI execution error (see server console).');
      const out = h[id].outputs || {};
      for (const nid of Object.keys(out)) {
        if (out[nid].images?.length) return out[nid].images[0];
      }
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new Error('timed out waiting for render');
}

async function run() {
  if (!(await up())) { console.error(`error: ComfyUI not reachable at ${COMFY} — start it first.`); process.exit(1); }
  mkdirSync(RENDERS, { recursive: true });
  const idsArg = argOf('--ids');
  const allBriefs = () => readdirSync(BRIEFS).filter((f) => f.endsWith('.portrait.json')).map((f) => f.replace('.portrait.json', ''));
  const ids = args.includes('--missing')
    ? allBriefs().filter((id) => !existsSync(join(RENDERS, `${id}.png`)))
    : args.includes('--all')
    ? allBriefs()
    : idsArg
    ? idsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : [argOf('--id')].filter(Boolean);
  if (!ids.length) { console.error('error: pass --id <role> or --all'); process.exit(1); }

  let ok = 0, fail = 0;
  for (const id of ids) {
    const briefPath = join(BRIEFS, `${id}.portrait.json`);
    if (!existsSync(briefPath)) { console.error(`skip: no brief ${id}`); continue; }
    const b = JSON.parse(readFileSync(briefPath, 'utf8'));
    process.stdout.write(`rendering ${id} [${b.params.kind || 'sdxl'}] (seed ${b.params.seed}) ... `);
    try {
      const img = await wait(await submit(buildGraph(b)));
      const src = join(COMFY_OUT, img.subfolder || '', img.filename);
      const dst = join(RENDERS, `${id}${SUFFIX}.png`);
      if (existsSync(src)) { copyFileSync(src, dst); console.log(`ok -> renders/${id}.png`); }
      else { console.log(`done (ComfyUI: ${img.subfolder}/${img.filename}) — copy source not found at ${src}`); }
      ok++;
    } catch (e) { console.log('FAIL'); console.error('  ' + String(e.message || e).slice(0, 280)); fail++; }
  }
  console.log(`\ndone: ${ok} ok, ${fail} failed → ${RENDERS}`);
}

run();
