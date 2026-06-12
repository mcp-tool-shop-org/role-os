---
title: Crew Dossier
description: Per-role character sheets — aptitudes, operating profile, and portrait — that configure each role at dispatch time.
sidebar:
  order: 9
---

Every Role OS role has a **dossier**: a character sheet that is also run-time configuration. It answers two questions at once — *who is this role* (an at-a-glance identity) and *how should it behave when dispatched* (real knobs, not flavor). Schema v0.2 (the specialists layer) keeps one rule above all: **everything the sheet displays is real system state** — the exact injected text, the real measurement basis, the real ledger.

## The six aptitudes

Each role carries six aptitudes scored 0–5. Every axis maps to a concrete dispatch knob — if a stat doesn't change behavior, it isn't on the sheet.

| Aptitude | 0 → 5 | Dispatch knob |
|---|---|---|
| **Rigor** | skim → reads every line, quotes evidence | quality-bar strictness / verifier depth |
| **Pace** | deliberate → fast, few turns | turn / budget profile |
| **Range** | convergent, spec-bound → divergent, generative | proposes alternatives vs executes the brief |
| **Skepticism** | trusting → refutes, demands proof | verifier strength, accept-vs-reject bias |
| **Autonomy** | escalates often → runs to completion | escalation / human-gate threshold |
| **Candor** | terse → explains, frames contrastively | output verbosity + contrastive framing |

Each role has two arrays: its **ideal** (the canonical profile for the role's archetype) and its **build** (the ideal nudged by its operating profile). The gallery radar draws both, so you can see how a role's configuration tunes it off-canon. **Priorities** — what the role optimizes for, in order — are derived from the high-set aptitudes automatically, never authored.

## Operating profile

An operating profile is a preset that sits on top of the role and both nudges the aptitude array and injects a real behavioral instruction at dispatch. Eight archetypes:

> **Skeptic · Builder · Diplomat · Contrarian · Perfectionist · Pragmatist · Investigator · Maverick**

For example, a **Skeptic** raises skepticism and lowers pace, and injects an instruction like *"default to revise/reject; an unrebutted challenge blocks acceptance; require explicit evidence before crediting a claim."* So "skeptical Judge" is a real configuration, not a label. The injection is functional posture only — task frame, priorities, evidence standards; profiles carry no affective states and no simulated social presence.

## Operating Posture at dispatch (opt-in)

When a role has a dossier, `buildRolePrompt` appends an **Operating Posture** block to its prompt: the profile's behavioral instruction, the derived priorities, and a one-line posture from the role's aptitudes (e.g. *"reads exhaustively and demands evidence; challenges hard before accepting; escalates early when uncertain"*).

This is **additive and non-breaking** — a role with no dossier produces a byte-identical prompt to before. The runtime data lives in `src/role-dossiers.json` (compiled from the dossiers and shipped with the package), so the feature needs no extra setup. The gallery's **"As dispatched"** panel shows the verbatim injected block per role — what you read is what the model gets.

## Grades, reps, and techniques (measured, never minted)

- **Grade** carries a `basis`: `assessed` (panel-tuned editorial assessment — the honest state of the roster today) or `certified` (backed by the certification pipeline's exams, confidence intervals, and replication). A grade's **band** — the conservative skill interval — stays `null` until actually measured; the sheet says "unmeasured" rather than inventing a number.
- **Reps** count **verified events** (training runs, exams, field outcomes) — never calendar streaks, never activity volume.
- **Techniques** are earned distinctions derived automatically from properties of real results, each linked to the receipts that earned it. They cannot be authored or farmed.

## The crew gallery

`dossier/dossier.html` is a self-contained gallery: painted portraits grouped by crew, each opening that role's dossier — radar (build vs ideal), a calibration score, the operating profile with its behavioral delta and verbatim dispatch block, techniques, and the charter. It is generated from the role data by `dossier/build-gallery.mjs`, so it refreshes whenever the roster, portraits, or stats change.

## How the profiles were calibrated

The aptitude profiles were tuned like an instrument, not guessed:

1. A model of 10 role **archetypes** — each a distinct six-axis ideal — plus an 8-profile delta library. Build = clamp(ideal + profile delta).
2. A **panel of three diverse models** read each role's function and charter and proposed a tuned profile; a per-axis **median** rejected single-model bias.
3. A **different-family external-verifier** pass broke the residual collisions knob-faithfully — yielding 64 distinct, knob-faithful fingerprints (the 61 roles plus 3 specialty auditors).

[Back to the handbook](/role-os/handbook/) · [Landing page](/role-os/)
