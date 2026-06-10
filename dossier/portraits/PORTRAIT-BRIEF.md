# Role OS Crew — Portrait Brief (format v0.1)

The **art contract** for the dossier portraits. Per the visual-pipeline rule (*no free-form
prompts — an art contract must exist first*), this file IS that contract. These portraits are
an internal studio-tool asset set (the Role OS crew), **not game canon** — so they skip
sdlab's constitution machinery, but the pipeline's core laws still bind: locked house style,
external-verifier gate, look-at-images before declaring success.

The goal that drives every decision: **64 roles × specializations must look like one crew,
not 64 unrelated images.** Coherence is the #1 constraint. (The roster is 64: 61 catalog
roles + 3 deep-audit specialists.)

## How a brief is built (blocks)

A portrait prompt is assembled from blocks. **Locked blocks are byte-identical across the
roster** (that's the coherence guarantee — see "Frozen exceptions" below for the 13 briefs
that deliberately deviate). **Variable blocks** are derived from the dossier.

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
in one file, re-applied to all 64 *at authoring time*. Note that `render.mjs` renders from the
brief's frozen `assembled` blocks, not live from `$house`: re-rendering reproduces exactly what
each brief froze, and a house-style change only reaches a portrait when its brief is
re-assembled (which the house-SHA check below makes loud).

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

1. **Locked blocks are hashed.** `house-style.json` carries `style`, `framing`, `negative` and
   records their SHA-256 in its `sha` field (`sha256(style + "\n" + framing + "\n" + negative)`).
   `write-prompt.mjs` stamps that hash into each brief's `provenance.house_sha` at authoring
   time, and `render.mjs` warns when a brief's recorded hash differs from the current one
   (`PIN_PER_STEP`). Change the house style → recompute the `sha` field → stale briefs are
   knowingly stale, not silently mixed.
2. **Deterministic seed per role** (`seed = hash(role-id)`, FNV-1a in `write-prompt.mjs`), so a
   re-roll or a tweak is reproducible and a single role can be regenerated without disturbing
   the rest. Three briefs carry documented manual re-rolls (see "Frozen exceptions");
   `write-prompt.mjs` warns before overwriting any brief whose frozen seed differs from the
   det-hash, so re-authoring can't silently change a portrait identity.
3. **House-style LoRA (Phase 2).** After the first ~12 portraits pass the gate and Mike
   approves, train a style LoRA on Chroma1-HD (or Illustrious) from those, then generate 13–64
   with the LoRA loaded (rgthree Power-Lora-Loader) for a hard lock. This is the sdlab/LoRA
   superpower applied to the crew.
4. **External-verifier gate (`EXTERNAL_VERIFIER` + `ANDON_AUTHORITY`).** Every render is checked
   by **ai-eyes-mcp** (SigLIP2 — a *different model family* from the generator, sees only the
   image, never the prompt): single subject, chest-up framing, no legible text, reads as the
   role cue. Fail → re-roll. ai-eyes has veto.
5. **Look at the images.** Never describe or approve a portrait without opening it. (Earned
   rule — trust was lost over fabricated analysis.)

## Frozen exceptions (committed deviations from the locked blocks)

The shipped roster is **not** 64 byte-identical locked blocks — these deviations are frozen
on purpose because the committed renders were approved as-is, and `render.mjs` renders from
each brief's `assembled` blocks (so `node render.mjs --all` reproduces the approved roster,
deviations included):

- **12 Batch-1 hero briefs carry the v0.1 house style** inside their frozen `assembled`
  blocks ("visible confident brushwork and soft edges" + the shorter v0.1 negative):
  `backend-engineer`, `brand-guardian`, `component-auditor`, `contrarian-analyst`,
  `critic-reviewer`, `judge`, `launch-copywriter`, `orchestrator`, `product-strategist`,
  `release-engineer`, `security-reviewer`, `ux-researcher`. They were rendered, gated, and
  approved before the v0.2 lock; re-assembling them from the current `house-style.json`
  would change those 12 approved portraits, so they are preserved byte-for-byte as rendered.
- **`scenario-expander`'s negative was hand-extended post-freeze** with
  `cigarette, smoking, cigar, vape` (the marker prop kept rendering as a cigarette). Noted in
  its `provenance.edited`. If the smoking failure mode recurs on other roles, promote those
  tokens into the house negative (and recompute the house `sha`).
- **Three briefs carry manual seed re-rolls** (recorded in `provenance.seed_rerolled`):
  `launch-copywriter` (718291837), `moat-expander` (3663100777), `scenario-expander`
  (763040777). The det-hash seeds would produce different portraits; the frozen seeds are
  the committed identities.

Any **future** batch must use the current locked blocks verbatim — the exceptions above are
grandfathered, not precedent. A full-roster style refresh means re-assembling all 64 briefs
from `house-style.json` and re-rendering everything behind the ai-eyes gate.

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

Matches the shape actually frozen in `briefs/<id>.portrait.json` (e.g.
`briefs/judge.portrait.json`), with the locked house params (steps 26, cfg 3.5):

```jsonc
{
  "schema": "roleos-portrait/v0.1",
  "id": "judge",
  "role": "Judge",
  "dossier_ref": "../../examples/judge.json",
  "blocks": {
    "style": "$house", "framing": "$house",          // pulled from house-style.json
    "subject": "…", "specialization": "…",
    "expression": "…",                                // derived from disposition
    "crew_palette": "…",                              // derived from crew/pack
    "grade_cue": "…"                                  // derived from grade
  },
  "negative": "$house",
  "params": { "kind": "chroma", "unet": "Chroma1-HD.safetensors",
              "clip": "t5xxl_fp8_e4m3fn.safetensors", "clip_type": "chroma",
              "vae": "ae.safetensors", "sampler": "euler", "scheduler": "beta",
              "steps": 26, "cfg": 3.5, "shift": 1, "width": 832, "height": 1216,
              "seed": 2866996644 },                   // FNV-1a det-hash of "judge"
  "assembled": { "positive": "…", "negative": "…" }, // frozen — what render.mjs renders
  "provenance": { "authored_by": "minimax-m3", "engine": "ollama-cloud",
                  "house_style": "painted-concept-art", "frozen": true,
                  "house_sha": "…" },                 // stamped at authoring time going
                                                      // forward; absent on the frozen v0.1
                                                      // batch (predates the hash)
  "gate": { "ai_eyes": ["single subject", "chest-up framing", "no legible text",
                        "reads as an adjudicator figure"] }
}
```

## Assembled example — the Judge (HISTORICAL pre-lock prototype)

> **Status:** this is the original prototype written before the house style locked — kept as
> the worked example of block assembly. Its style wording, negative, and params (steps 30,
> cfg 4.5) are **not** the locked values; the live frozen brief is
> `briefs/judge.portrait.json` (steps 26, cfg 3.5, seed 2866996644). The prototype JSON that
> used to sit at `examples/judge.portrait.json` was removed — this section is its only record.

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

- **PIN_PER_STEP — 2:** locked blocks hashed in `house-style.json` (`sha` field), stamped into
  brief provenance by `write-prompt.mjs` and checked by `render.mjs`; deterministic per-role
  seed with an overwrite warning on re-rolled briefs; base/sampler/steps/cfg pinned in
  `params`. *Remediation:* emit a `pipeline.lock.json` per batch (ComfyUI SHA, workflow SHA,
  LoRA hash, ai-eyes version, house-style SHA) — owner: portraits, Phase 2.
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

1. ~~**Lock art direction** (Mike) → write `house-style.json` (the locked style/framing/negative).~~ ✅
2. ~~**Builder** — `write-prompt.mjs` (author + freeze briefs) and `render.mjs` (brief → ComfyUI API payload → renders/).~~ ✅
3. ~~**First batch (12 hero roles)** → ai-eyes gate → Mike approved the look~~ ✅ (frozen
   pre-v0.2-lock — see "Frozen exceptions").
4. **House-style LoRA** trained on the approved 12 → load for any future batch / full-roster
   refresh (rgthree Power-Lora-Loader). The frozen briefs pin no LoRA.
5. ~~**Wire** approved portraits into `dossier.html` (all 64 live via `portraits/web/`).~~ ✅
