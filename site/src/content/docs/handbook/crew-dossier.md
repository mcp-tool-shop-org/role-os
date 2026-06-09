---
title: Crew Dossier
description: Per-role character sheets — aptitudes, disposition, and portrait — that configure each role at dispatch time.
sidebar:
  order: 9
---

Every Role OS role has a **dossier**: a character sheet that is also run-time configuration. It answers two questions at once — *who is this role* (a gamified, at-a-glance identity) and *how should it behave when dispatched* (real knobs, not flavor).

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

Each role has two arrays: its **ideal** (the canonical profile for the role's archetype) and its **build** (the ideal nudged by its disposition). The gallery radar draws both, so you can see how a role's temperament tunes it off-canon.

## Disposition

A disposition is a preset that sits on top of the role and both nudges the aptitude array and injects a real behavioral instruction at dispatch. Eight archetypes:

> **Skeptic · Builder · Diplomat · Contrarian · Perfectionist · Pragmatist · Investigator · Maverick**

For example, a **Skeptic** raises skepticism and lowers pace, and injects an instruction like *"default to revise/reject; an unrebutted challenge blocks acceptance; require explicit evidence before crediting a claim."* So "skeptical Judge" is a real configuration, not a label.

## Operating Posture at dispatch (opt-in)

When a role has a dossier, `buildRolePrompt` appends an **Operating Posture** block to its prompt: the disposition's behavioral instruction plus a one-line posture derived from the role's aptitudes (e.g. *"reads exhaustively and demands evidence; challenges hard before accepting; escalates early when uncertain"*).

This is **additive and non-breaking** — a role with no dossier produces a byte-identical prompt to before, mirroring the existing knowledge-block injection. The runtime data lives in `src/role-dossiers.json` (compiled from the dossiers and shipped with the package), so the feature needs no extra setup.

## The crew gallery

`dossier/dossier.html` is a self-contained gallery: painted portraits grouped by crew, each opening that role's dossier — radar (build vs ideal), a calibration score, the disposition with its behavioral delta, and the charter. It is generated from the role data by `dossier/build-gallery.mjs`, so it refreshes whenever the roster, portraits, or stats change.

## How the profiles were calibrated

The aptitude profiles were tuned like an instrument, not guessed:

1. A model of 10 role **archetypes** — each a distinct six-axis ideal — plus an 8-disposition delta library. Build = clamp(ideal + disposition delta).
2. A **panel of three diverse models** read each role's function and charter and proposed a tuned profile; a per-axis **median** rejected single-model bias.
3. A **different-family external-verifier** pass broke the residual collisions knob-faithfully — yielding 64 distinct, knob-faithful fingerprints (the 61 roles plus 3 specialty auditors).

[Back to the handbook](/role-os/handbook/) · [Landing page](/role-os/)
