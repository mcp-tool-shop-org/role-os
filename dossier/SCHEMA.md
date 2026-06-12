# Role OS — Personnel Dossier (schema v0.2)

A character-sheet for the crew, built so **every datapoint is a real knob**, not flavor. A
dossier reads a role's existing Role OS definition (Mission, Quality Bar, Escalation
Triggers, artifact contract, pack membership, dispatch config) and adds the things those
definitions don't carry yet: numeric **aptitudes**, an **operating profile**, visible
**progression**, and a **portrait**.

No fantasy vocabulary anywhere — this reads in a boardroom. The register is
**athletic-certification** (the locked design: `design/specialists-layer.md`): trained,
certified, fielded, has a record, can lose form — every term literally true of the adapter
lifecycle.

**v0.1 → v0.2 (2026-06-10):** `disposition` → `operatingProfile` (the layer stays — renamed
and made honest); `signatureMoves` → `techniques` (now strictly EARNED: auto-derived from
certification/field receipts, never authored — the v0.1 static prose moves were cut);
`grade` gained `basis` (`assessed` | `certified`) and `band` (null until measured);
`reps` is a ledger of **verified events** (training/exam/field — never calendar units).
Readers (`src/dossier-block.mjs`, `build-runtime.mjs`) accept v0.1 records tolerantly.

## Design contract (the thing that makes it more than a poster)

A stat that doesn't map to a knob doesn't belong on the sheet. **Each aptitude is a real
lever on how the role behaves when dispatched.** Crank a Judge's Skepticism and it actually
refutes harder. The dossier is the role's *config UI*. This aligns with `PIN_PER_STEP`: the
sheet is the pinned per-step config, made legible and editable.

**Honesty contract (design finding 20):** every surface that displays a role's operating
profile renders **exactly what dispatch injects**. `deriveProfile()` /
`renderDossierBlock()` in `src/dossier-block.mjs` are the single source of truth; the
gallery embeds the verbatim injected block (`window.INJECTED`, "As dispatched" panel) and
the CLI sheet reads the same functions. What you read is what the model gets.

**Shipped (v2.9.0, renamed v0.2 in the specialists layer S1):** the live wiring of
aptitudes → dispatch is real. `src/dossier-block.mjs` compiles each role's operating-profile
`prompt_delta` + derived **priorities** + a posture line into an "Operating Posture" block
that `dispatch.mjs` injects into every dispatch prompt. Runtime data ships in
`src/role-dossiers.json` (compiled by `build-runtime.mjs` from `examples/*.json` — all 64
roster roles filled and panel-tuned).

## The six Aptitudes (0–5)

| Aptitude | 0 ⟶ 5 | Real dispatch knob | Workflow standard |
|---|---|---|---|
| **Rigor** | skim ⟶ reads every line, quotes evidence | quality-bar strictness; "read-every-line" enforcement; verifier sample size | — |
| **Pace** | deliberate / iterative ⟶ fast / few-turns | `maxTurns`, budget profile, iteration cap | — |
| **Range** | convergent / spec-bound ⟶ divergent / generative | creativity; proposes alternatives vs executes the brief | — |
| **Skepticism** | trusting / accepts ⟶ refutes / demands proof | verifier strength; accept-vs-reject bias; "default-to-refuted" toggle | `EXTERNAL_VERIFIER` |
| **Autonomy** | escalates often ⟶ runs to completion | escalation / human-gate threshold | `UNCERTAINTY_GATED_HUMANS` |
| **Candor** | terse / result-only ⟶ explains, frames contrastively | output verbosity; contrastive-framing toggle | `UNCERTAINTY_GATED_HUMANS` |

Each role carries **two arrays**: its `aptitudes` (the current build) and its `ideal` (the
canonical profile). The card draws the ideal as a faint reference polygon behind the current
build and derives a **Calibration** score. **Priorities** — what the role optimizes for, in
order — are *derived* from the high-set aptitudes (`derivePriorities()`), never authored:
rigor→evidence depth, pace→throughput, range→option coverage, skepticism→claim verification,
autonomy→independent completion, candor→explained reasoning.

## Operating Profile (the "skeptical judge" layer)

The personality layer, kept and made honest. An operating profile is a **preset that sits on
top of the base role**: it (a) nudges the aptitude array and (b) injects a real
`prompt_delta` into dispatch. Personality → measurable behavior, never flavor text. The
injection is **functional posture only** (task frame, priorities, evidence standards); no
affective states, no needs, no simulated social presence (design findings 20, 22).

Roster (office-safe archetypes):

> **Skeptic · Builder · Diplomat · Contrarian · Perfectionist · Pragmatist · Investigator · Maverick**

Example — `Skeptic` on the Judge: `{skepticism:+1, pace:-1}` and the prompt delta *"default
to revise/reject; an unrebutted challenge blocks 'accept'."* That delta is literally the
adversarial-verify pattern from `workflow-standards.md`.

*Build-input note:* `portraits/roster.json` and `aptitude-model.json` keep their internal
`disposition` keys — they are generator inputs naming the archetype assignment, and the
portrait pipeline (frozen briefs + renders) reads them. The rename governs every authored,
displayed, injected, and shipped surface.

## Progression (the measured kind)

Grades are **earned by measurement**, per the specialists-layer design:

- **Grade** = `{ level, label, path, basis, band }`. `basis: "assessed"` = panel-tuned
  editorial assessment (no exam behind it — the honest state of all 64 roster roles today).
  `basis: "certified"` = backed by the certification pipeline (`.role-os/specialists.json`:
  exams with CI gates, contamination checks, two-seed replication). `band` is the
  conservative skill interval `{floor, estimate, ceiling}` — **null until measured**
  (renderers show "unmeasured", never an invented number). S2 wires the registry.
- **Reps** = `{ unit, count, events[], note }` — a ledger of verified training/exam/field
  events. Never calendar units, never activity counts (design finding 4: streaks induce
  junk work).
- **Techniques** = earned distinctions, auto-derived from properties of real results
  (a flip-consistency ceiling, a zero-override field stretch, a first-attempt certified
  cross-training). Non-farmable by construction; each links to the receipts that earned it
  (design finding 5). `techniques: []` until the S2 derivation machinery lands.

## Data contract (`roleos-dossier/v0.2`)

```jsonc
{
  "schema": "roleos-dossier/v0.2",
  "id": "judge",                         // slug, joins to the role definition
  "role": "Judge", "specialization": "…", "function": "Adjudication",
  "fileNo": "RO-ADJ-001", "clearance": "VERIFIER",
  "crew": [{ "pack": "brainstorm", "label": "Brainstorm", "role_in_pack": "final verdict" }],
  "grade": { "level": "L5", "label": "Distinguished", "path": ["L0", …, "L5"],
             "basis": "assessed",        // assessed | certified
             "band": null },             // {floor, estimate, ceiling} once measured
  "reps": { "unit": "adjudications", "count": 0, "events": [],
            "note": "verified training/exam/field events only — never calendar units" },
  "aptitudes": { "rigor":5, "pace":1, "range":1, "skepticism":5, "autonomy":3, "candor":4 },
  "ideal":     { "rigor":5, "pace":2, "range":1, "skepticism":4, "autonomy":3, "candor":4 },
  "operatingProfile": { "active":"Skeptic", "blurb":"…", "delta":{…}, "prompt_delta":"…",
                        "voice":"…" },   // priorities are DERIVED, not stored
  "loadout": { "model": { "pin":"claude-sonnet-4-6", "maxTurns":40, "budgetUsd":6.0 },
               "tools": [ { "name":"dispute-graph", "access":"read" }, … ] },
  "techniques": [],                      // earned via receipts only — see Progression
  "charter": "…",                        // surfaces the role's Mission
  "guards":  [ "…" ],                    // surfaces Escalation Triggers + blindspots
  "maps_to": { "<aptitude>": "what this stat actually changes for THIS role" }
}
```

`portrait` is intentionally absent from the dossier JSON — portraits live in the separate
portrait pipeline (`portraits/` — locked house style, frozen per-role briefs). All 64
portraits are rendered and wired into `dossier.html` via `portraits/web/<id>.jpg`.

## Standards compliance (per `workflow-standards.md`)

- **PIN_PER_STEP — 2 (PRESENT):** `loadout.model` pins model + maxTurns + budget;
  `loadout.tools` pins the role's read/write surface. The dossier *is* the pinned config.
- **ANDON_AUTHORITY — 1 (PARTIAL):** the card surfaces `guards` loudly but doesn't yet halt
  a pipeline. *Remediation (open — owner: dossier):* a build whose Calibration drops below a
  floor blocks dispatch with a contrastive ANDON (Roadmap item 5).
- **NAMED_COMPENSATORS — 2 (PRESENT):** dispatch wiring reads committed
  `src/role-dossiers.json` and injects a prompt block — no runtime writes. Named undo for a
  bad build: revert `examples/<id>.json` (or the generator inputs), re-run the build chain,
  commit. Owner: dossier.
- **DECOMPOSE_BY_SECRETS — 2 (PRESENT):** what changes often (aptitudes, profile, reps,
  techniques) is grouped apart from what's stable (charter, guards, artifact contract);
  derivations (priorities, posture, injected block) live in ONE module.
- **UNCERTAINTY_GATED_HUMANS — 2 (PRESENT):** Autonomy *is* the escalation threshold;
  `grade.band` makes skill uncertainty explicit and `basis` distinguishes measured from
  assessed.
- **EXTERNAL_VERIFIER — 2 (PRESENT):** Skepticism encodes verifier strength; the 64-role
  fill verified each stat→knob mapping with a different-family adversarial critic; grades
  only reach `basis: "certified"` through the external exam pipeline.

## Roadmap

Shipped:

1. ~~Foundation — schema + Judge worked example + openable card.~~ ✅
2. ~~Fill the roster — 64 aptitude arrays + ideals, panel-tuned, adversarially verified.~~ ✅
3. ~~Wire to dispatch — Operating Posture block in every dispatch prompt.~~ ✅
4. ~~Portraits — all 64 rendered and wired into `dossier.html`.~~ ✅
5. ~~**S1: schema v0.2** — operatingProfile + derived priorities + honest grade
   basis/band + verified-events reps + earned-only techniques + verbatim "As dispatched"
   panel.~~ ✅

6. ~~**S2 — the Record** (`src/specialist/record.mjs`): certification ledger + field
   stats + reps feed assembled read-only from real receipts; techniques v1
   (clean-promotion, shadow-verified) earned-only; `basis: "certified"` from the live
   registry.~~ ✅ (bands still null pending the exam-interval pipeline; calibration/ECE
   pending forecast-receipt instrumentation)
7. ~~**S3 — crew report:** `roleos crew` roster + sheet (verbatim dispatch block, the
   Record, honest empty states); gallery grade chips carry basis; quiet ceremony on
   `specialist promote` (mark + one-line record).~~ ✅ (HTML event-driven glyph pulse
   lands with live-record views; GlyphStudio marks replace the typographic placeholders)

Open (specialists layer, `design/specialists-layer.md`):

8. **S4 — cross-training + untraining:** compatibility readout, exam-gated birth, lineage
   (GPU; spans gpu-container/specialist-training).
9. **S5 — form:** drift checks against the exam distribution; stale-marking +
   re-certification triggers (the Record's `divergence` field is the hookup point).
10. **S6 — training programs:** prerequisite curricula + recipe previews via the readouts
    training-knowledge KB.
11. **Calibration ANDON** — a build whose Calibration drops below a floor blocks dispatch
    with a contrastive ANDON (carried from v0.1 roadmap).
