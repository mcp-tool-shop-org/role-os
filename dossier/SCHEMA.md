# Role OS — Personnel Dossier (schema v0.1)

A character-sheet for the crew, built so **every datapoint is a real knob**, not flavor. A
dossier reads a role's existing Role OS definition (Mission, Quality Bar, Escalation
Triggers, artifact contract, pack membership, dispatch config) and adds the four things
those definitions don't carry yet: numeric **aptitudes**, a **disposition** layer, visible
**progression**, and a **portrait**.

No fantasy vocabulary anywhere — this reads in a boardroom. But the *shape* of a character
sheet survives: a portrait, a stat block, a function + specialization, a grade, perks, and a
temperament.

## Design contract (the thing that makes it more than a poster)

A D&D sheet works because STR isn't decoration — it changes the attack roll. Here, **each
aptitude is a real lever on how the role behaves when dispatched.** Crank a Judge's
Skepticism and it actually refutes harder. The dossier is the role's *config UI wearing a
costume*. This aligns with `PIN_PER_STEP`: the sheet is the pinned per-step config, made
legible and editable.

**Shipped (v2.9.0):** the live wiring of aptitudes → dispatch is real. `src/dossier-block.mjs`
compiles each role's disposition `prompt_delta` + tuned aptitudes into an "Operating Posture"
block that `dispatch.mjs` (`buildRolePrompt` / `buildDispatchManifest`) injects into every
dispatch prompt. Runtime data ships in `src/role-dossiers.json` (compiled by
`build-runtime.mjs` from `examples/*.json` — all 64 roster roles filled and panel-tuned).

## The six Aptitudes (0–5)

Each aptitude maps to a concrete dispatch knob. This table is the load-bearing part of the
schema — if a stat doesn't map to a knob, it doesn't belong on the sheet.

| Aptitude | 0 ⟶ 5 | Real dispatch knob | Workflow standard |
|---|---|---|---|
| **Rigor** | skim ⟶ reads every line, quotes evidence | quality-bar strictness; "read-every-line" enforcement; verifier sample size | — |
| **Pace** | deliberate / iterative ⟶ fast / few-turns | `maxTurns`, budget profile, iteration cap | — |
| **Range** | convergent / spec-bound ⟶ divergent / generative | creativity; proposes alternatives vs executes the brief | — |
| **Skepticism** | trusting / accepts ⟶ refutes / demands proof | verifier strength; accept-vs-reject bias; "default-to-refuted" toggle | `EXTERNAL_VERIFIER` |
| **Autonomy** | escalates often ⟶ runs to completion | escalation / human-gate threshold | `UNCERTAINTY_GATED_HUMANS` |
| **Candor** | terse / result-only ⟶ explains, frames contrastively | output verbosity; contrastive-framing toggle | `UNCERTAINTY_GATED_HUMANS` |

Each role carries **two arrays**: its `aptitudes` (the current build) and its `ideal` (the
canonical profile for that role). The card draws the ideal as a faint reference polygon
behind the current build, and derives a **Calibration** score (how close the build is to
ideal). Re-speccing moves the polygon and recomputes Calibration — that's the "complete
customization" surface, with a guardrail that tells you how far you've drifted from canon.

## Disposition (the "skeptical judge" layer)

A disposition is a **preset that sits on top of the base role**. It (a) nudges the aptitude
array and (b) injects a real `prompt_delta` into dispatch. So personality → measurable
behavior, not flavor text.

Roster (office-safe archetypes):

> **Skeptic · Builder · Diplomat · Contrarian · Perfectionist · Pragmatist · Investigator · Maverick**

Example — `Skeptic` on the Judge: `{skepticism:+1, pace:-1}` and the prompt delta *"default
to revise/reject; an unrebutted challenge blocks 'accept'."* That delta is literally the
adversarial-verify pattern from `workflow-standards.md` — disposition wires straight into a
named standard.

## Progression (gamifies training, for free)

Role OS already tracks `certified_level` (L0–L5) + `exam_hash` per specialist in
`.role-os/specialists.json`. The dossier surfaces that as the headline:

- **Grade** = `certified_level` (L0 → L5), labelled Associate → … → Distinguished.
- **Reps** = a progress bar fed by missions completed / evals passed (Phase 5 hookup).
- Leveling unlocks **Signature Moves** and raises **Bandwidth** (turn / budget ceiling).

## Data contract (`roleos-dossier/v0.1`)

```jsonc
{
  "id": "judge",                         // slug, joins to the role definition
  "role": "Judge", "specialization": "…", "function": "Adjudication",
  "fileNo": "RO-ADJ-001", "clearance": "VERIFIER",
  "crew": [{ "pack": "brainstorm", "label": "Brainstorm", "role_in_pack": "final verdict" }],
  "grade": { "level": "L5", "label": "Distinguished", "path": ["L0", …, "L5"] },
  "reps": { "completed": 0, "toNext": null, "unit": "adjudications", "note": "…" },
  "aptitudes": { "rigor":5, "pace":1, "range":1, "skepticism":5, "autonomy":3, "candor":4 },
  "ideal":     { "rigor":5, "pace":2, "range":1, "skepticism":4, "autonomy":3, "candor":4 },
  "disposition": { "active":"Skeptic", "blurb":"…", "delta":{…}, "prompt_delta":"…",
                   "voice":"…", "roster":[ … 8 … ] },
  "loadout": { "model": { "pin":"claude-sonnet-4-6", "maxTurns":40, "budgetUsd":6.0 },
               "tools": [ { "name":"dispute-graph", "access":"read" }, … ] },
  "signatureMoves": [ { "name":"…", "desc":"…", "earned":"Skeptic"? } ],
  "charter": "…",                        // surfaces the role's Mission
  "guards":  [ "…" ],                    // surfaces Escalation Triggers + blindspots
  "maps_to": { "<aptitude>": "what this stat actually changes for THIS role" }
}
```

`portrait` is intentionally absent from the dossier JSON — portraits live in the separate
portrait pipeline (`portraits/` — locked house style on Chroma1-HD, frozen per-role briefs).
All 64 portraits are rendered and wired into `dossier.html` via `portraits/web/<id>.jpg`
(resolved by `build-gallery.mjs`, not stored on the dossier record).

## Standards compliance (per `workflow-standards.md`)

- **PIN_PER_STEP — 2 (PRESENT):** `loadout.model` pins model + maxTurns + budget, and
  `loadout.tools` pins the role's read/write surface. The dossier *is* the pinned config.
- **ANDON_AUTHORITY — 1 (PARTIAL):** the card surfaces `guards` loudly but doesn't yet halt
  a pipeline. *Remediation (open — owner: dossier):* a build whose Calibration drops below a
  floor blocks dispatch with a contrastive ANDON. Still unbuilt even though the dispatch
  wiring shipped (see Roadmap item 5).
- **NAMED_COMPENSATORS — 2 (PRESENT):** dispatch wiring reads committed
  `src/role-dossiers.json` and injects a prompt block — no runtime writes. The named undo for
  a bad build is "restore canonical (ideal) build": revert `examples/<id>.json`, re-run
  `build-runtime.mjs`, commit. Owner: dossier.
- **DECOMPOSE_BY_SECRETS — 2 (PRESENT):** schema groups what changes often (aptitudes,
  disposition, reps) apart from what's stable (charter, guards, artifact contract).
- **UNCERTAINTY_GATED_HUMANS — 2 (PRESENT):** the Autonomy aptitude *is* the escalation
  threshold; the Calibration gauge surfaces uncertainty about a build before it ships.
- **EXTERNAL_VERIFIER — 2 (PRESENT):** Skepticism encodes verifier strength; the 64-role
  fill (shipped) verified each stat→knob mapping with a different-family adversarial critic
  (corrections applied via `apply-tuning-fixes.mjs`).

## Roadmap

Shipped (as of v2.9.0):

1. ~~**Foundation —** schema + Judge worked example + openable card matching engine-room.~~ ✅
2. ~~**Fill the roster —** all 64 aptitude arrays + ideals drafted, panel-tuned, and
   adversarially verified (external-verifier corrections via `apply-tuning-fixes.mjs`).~~ ✅
3. ~~**Wire to dispatch —** aptitudes / disposition read at dispatch time via
   `src/dossier-block.mjs` → Operating Posture block in every dispatch prompt.~~ ✅
4. ~~**Portraits —** all 64 rendered in the locked Chroma1-HD house style and wired into
   `dossier.html`.~~ ✅

Open:

5. **Calibration ANDON —** a build whose Calibration drops below a floor blocks dispatch with
   a contrastive ANDON (the ANDON_AUTHORITY remediation above — genuinely unbuilt).
6. **Progression hookup —** reps fed by real mission / eval completion; visible level-ups.
