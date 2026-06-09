# Role OS Crew — Portrait Brief (format v0.1)

The **art contract** for the dossier portraits. Per the visual-pipeline rule (*no free-form
prompts — an art contract must exist first*), this file IS that contract. These portraits are
an internal studio-tool asset set (the Role OS crew), **not game canon** — so they skip
sdlab's constitution machinery, but the pipeline's core laws still bind: locked house style,
external-verifier gate, look-at-images before declaring success.

The goal that drives every decision: **61 roles × specializations must look like one crew,
not 61 unrelated images.** Coherence is the #1 constraint.

## How a brief is built (blocks)

A portrait prompt is assembled from blocks. **Locked blocks are byte-identical across all 61**
(that's the coherence guarantee). **Variable blocks** are derived from the dossier.

| Block | Locked? | Source | Purpose |
|---|---|---|---|
| `style` | 🔒 locked | `house-style.json` | medium, rendering, art-direction tokens, quality |
| `framing` | 🔒 locked | `house-style.json` | chest-up, three-quarter, backdrop, lighting |
| `subject` | variable | role function | the figure + wardrobe/props that read the role |
| `specialization` | variable | specialization | a sub-cue for the track |
| `expression` | variable | **disposition** | the face/mood — personality drives the portrait |
| `crew_palette` | variable | crew/pack | accent color + insignia (pack = color identity) |
| `grade_cue` | variable | grade | subtle prestige refinement (L0→L5) |
| `negative` | 🔒 locked | `house-style.json` | quality + consistency negatives |
| `params` | semi | base + per-role seed | model/sampler/steps/cfg/size/seed |

Builder = `style + framing + subject + specialization + expression + crew_palette + grade_cue`
→ positive prompt; `negative` → negative; `params` → sampler config. The `$house` token in a
brief means "pull this block verbatim from `house-style.json`" — so a style change is one edit
in one file, re-applied to all 61.

## Dossier → brief derivation (the load-bearing link)

The variable blocks are *derived*, not hand-authored — that's what makes "personality affects
the portrait" real and reproducible:

- `expression` ← `disposition.active`. **Skeptic** → "narrowed appraising eyes, unconvinced,
  guarded." **Builder** → "forward-leaning, focused, sleeves-up." Same map the dispatch
  `prompt_delta` uses — the face and the behavior come from one source.
- `crew_palette` ← `crew[].pack`. brainstorm → violet; engineering → cyan; security → amber; etc.
- `grade_cue` ← `grade.level`. L5 → "distinguished, refined tailoring, a subtle rank mark."
- `subject`/`specialization` ← the role's function + specialization.

## Consistency doctrine (how a roster stays coherent)

1. **Locked blocks are hashed.** `house-style.json` carries `style`, `framing`, `negative`. Its
   SHA is recorded in every batch receipt (`PIN_PER_STEP`). Change the house style → bump the
   hash → all portraits are knowingly stale.
2. **Deterministic seed per role** (`seed = hash(role-id)`), so a re-roll or a tweak is
   reproducible and a single role can be regenerated without disturbing the rest.
3. **House-style LoRA (Phase 2).** After the first ~12 portraits pass the gate and Mike
   approves, train a style LoRA on Chroma1-HD (or Illustrious) from those, then generate 13–61
   with the LoRA loaded (rgthree Power-Lora-Loader) for a hard lock. This is the sdlab/LoRA
   superpower applied to the crew.
4. **External-verifier gate (`EXTERNAL_VERIFIER` + `ANDON_AUTHORITY`).** Every render is checked
   by **ai-eyes-mcp** (SigLIP2 — a *different model family* from the generator, sees only the
   image, never the prompt): single subject, chest-up framing, no legible text, reads as the
   role cue. Fail → re-roll. ai-eyes has veto.
5. **Look at the images.** Never describe or approve a portrait without opening it. (Earned
   rule — trust was lost over fabricated analysis.)

## Model + workflow (verified, commercial-safe — from model-knowledge KB, wave 4)

License is the decisive axis (these portraits may ship inside a marketed tool).

- **Base — Chroma1-HD** (Apache 2.0, 8.9B FLUX-class) for painted/semi-real, *or* **Illustrious
  XL v2.0** (CreativeML Open RAIL-M, commercial-OK) for illustrated character art. Both are
  LoRA-friendly and fit 32 GB with headroom. Pick follows the art-direction decision.
- **In-image text (optional)** — Qwen-Image-2512 (Apache 2.0) if portraits carry etched file
  numbers/insignia text.
- **Avoid** FLUX.1-dev / FLUX.2-dev / klein-9B (non-commercial) and **CodeFormer** face-restore
  weights (non-commercial — use **GFPGAN** in FaceDetailer).
- **Workflow base:** `readouts/model-knowledge/workflows/image/image_chroma_text_to_image.json`
  (Chroma) or `sdxl_simple_example.json` (Illustrious). Add **ComfyUI-Impact-Pack**
  FaceDetailer (GFPGAN, strength 0.5–0.7) for clean faces, **rgthree** Power-Lora-Loader for the
  Phase-2 house LoRA, **UltimateSDUpscale** (not SUPIR — non-commercial) for the final pass.
- **Rig:** ComfyUI portable CUDA-13; SageAttention accel; never `pip install xformers`.

## Contract (`roleos-portrait/v0.1`)

```jsonc
{
  "id": "judge",
  "dossier_ref": "../examples/judge.json",
  "blocks": {
    "style": "$house", "framing": "$house",          // pulled from house-style.json
    "subject": "…", "specialization": "…",
    "expression": "…",                                // derived from disposition
    "crew_palette": "…",                              // derived from crew/pack
    "grade_cue": "…"                                  // derived from grade
  },
  "derivation": { "expression_from": "disposition.active = Skeptic", … },
  "params": { "base": "chroma1-hd", "sampler": "euler", "steps": 30, "cfg": 4.5,
              "width": 832, "height": 1216, "seed": "det:hash(judge)" },
  "gate": { "ai_eyes": ["single subject", "chest-up framing", "no legible text",
                        "reads as an adjudicator figure"] }
}
```

## Assembled example — the Judge (provisional house style: *painted semi-real*, pending lock)

**Positive:**
> painterly character portrait, semi-realistic digital illustration in the tradition of Octopath
> Traveler / Chained Echoes splash art, confident brushwork, cinematic muted palette, soft
> volumetric studio lighting, high detail · chest-up portrait, three-quarter angle, subject
> centered, plain deep-navy gradient backdrop with a faint instrument-panel grid, soft key light
> upper-left with cool rim light · **a composed adjudicator in a dark structured high-collar
> coat, holding a slim closed verdict folio, calm authoritative bearing, an arbiter of
> arguments** · a faint fan of review documents at the lower frame edge · **narrowed appraising
> eyes, one brow faintly raised, measured and unconvinced, guarded composure** *(← Skeptic)* ·
> violet accent rim-light and a small violet insignia pin at the collar *(← brainstorm crew)* ·
> distinguished refined tailoring, a subtle five-bar rank mark *(← L5)*

**Negative (locked):**
> text, watermark, signature, logo, caption, letters, gibberish text, extra fingers, deformed
> hands, malformed limbs, lowres, blurry, jpeg artifacts, oversaturated, duplicate, two heads,
> cropped face

**Params:** Chroma1-HD · euler · 30 steps · cfg 4.5 · 832×1216 · seed = hash("judge")

## Standards compliance (per `workflow-standards.md`)

- **PIN_PER_STEP — 2:** locked blocks hashed in `house-style.json`; deterministic per-role seed;
  base/sampler/steps/cfg pinned in `params`. *Remediation:* emit a `pipeline.lock.json` per batch
  (ComfyUI SHA, workflow SHA, LoRA hash, ai-eyes version, house-style SHA) — owner: portraits, Phase 2.
- **ANDON_AUTHORITY — 2:** ai-eyes veto halts a portrait; empty approved-baseline surfaced before bulk runs.
- **NAMED_COMPENSATORS — 2:** ComfyUI batch writes + ai-eyes evals are reversible per the
  visual-pipeline compensator table (`rm -rf outputs/<batch>/`, delete eval rows). No irreversible
  call until a portrait is committed into `dossier.html` — that's a `git revert`.
- **DECOMPOSE_BY_SECRETS — 3:** house style (changes rarely) split from per-role briefs (change per
  role) split from per-run params/seed (change per generation) — three cadences, three files.
- **UNCERTAINTY_GATED_HUMANS — 2:** ai-eyes confidence below threshold → mandatory human review;
  look-at-images rule forces a human open before approval.
- **EXTERNAL_VERIFIER — 3:** ai-eyes-mcp is a different family from the generator and never sees the prompt.

## Roadmap

1. **Lock art direction** (Mike) → write `house-style.json` (the locked style/framing/negative).
2. **Builder** — `build-prompt.mjs`: dossier + brief → positive/negative/params + ComfyUI API payload.
3. **First batch (~12 hero roles)** → ai-eyes gate → Mike approves the look.
4. **House-style LoRA** trained on the approved 12 → generate 13–61 with it loaded.
5. **Wire** approved portraits into `dossier.html` (replace the `portrait pending` placeholder).
