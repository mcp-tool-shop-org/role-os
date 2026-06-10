# The Specialists Layer — design lock

**Status:** DESIGN LOCKED (director-approved 2026-06-10) · **Research grounding: VERIFIED-WITH-NOTES** — Step-4 ran 2026-06-10 via `roleos verify-citations` (prism, dev-mode receipt: `specialists-layer.citation-receipt.json`). Verdict `revise` (advisory): 19 identifiers checked, **0 fabricated, 0 misattributed**; 1 numeric phrasing corrected to match source (finding 12); 10 claims are grounded in paper bodies beyond the title+abstract lens (research agents retrieved full pages — see `findings.json`); 9 items carry SSRN/PMC/journal identifiers outside the oracle's arXiv/DOI resolvers (manually retrieval-verified at research time). Re-sign with a real `PRISM_SIGNING_KEY` when prism key provisioning lands.
**Dispatch:** study-swarm `wf_31d82709-c5c` (5 questions, 40 retrieval-backed findings) — evidence at `dogfood-labs/swarms/swarm-1781065638-70d5/study-swarm-specialists/{findings.json,dispatch.lock.json}`.

## What this is

Role OS roles already become **specialists**: locally fine-tuned adapters, certified L0–L5 through exams with bootstrap CIs, flip-consistency anti-shortcut metrics, two-seed replication, and weight-space averaging. This layer makes that progression *visible, composable, and quietly thrilling* — the fun of capability growth and training-data alchemy, with zero game vocabulary.

**Design principles (director's brief):**

1. **A scientific instrument first.** Every surface reads like lab equipment, not a game. The reward is the results a specialist delivers in action, the rich documentation of progress, and the alchemy-like process of composing adapters — never a synthetic payout. (Findings 1, 2, 9)
2. **Measurement is the progression.** Nothing advances by activity counts, calendars, or farmable actions; everything advances by verified capability evidence. (2, 4, 5, 16)
3. **Vocabulary carries the experience.** Game-framing alone delivers most of the motivational payload (8); a single metaphor steers expectations (7). The register is **athletic-certification** — every term is *literally true* of adapter lifecycle.
4. **Honest by construction.** Anything the sheet displays is the real system state — the exact injected text, the real CI, the real lineage. No flavor text that isn't load-bearing.

## Vocabulary (locked — athletic-certification register)

| Concept | Term | Literal truth it names |
|---|---|---|
| Trained adapter backing a role | **Specialist** | (existing) |
| Capability tier L0–L5 | **Grade** | conservative lower bound of measured skill (17) |
| Progress toward next grade | **Reps** | count of *verified* training/exam/field events — never calendar units (4) |
| Promotion event | **Certification** | preregistered exam, CI-gated, every attempt counted (16, 17) |
| Per-specialist performance history | **The Record** | per-task-type hit rates, override outcomes, calibration — a reliance-calibration instrument (21) |
| Earned distinction | **Technique** | auto-derived from properties of real results; non-farmable (5) |
| Behavioral configuration (was "disposition/personality") | **Operating Profile** with **Priorities** | the *exact* posture text injected at dispatch, shown verbatim (20; renamed per director — the layer stays, the label becomes honest) |
| Adapter composition (model soup / merging) | **Cross-training** | skill-union merge with computable compatibility (10–13) |
| Capability removal (task-vector negation) | **Untraining** | (10) |
| Prerequisite curriculum graph | **Training program** | prerequisite-first ordering measurably cuts data needs (14) |
| Specialization depth vs retained range | **Depth gauge** | the LoRA learns-less/forgets-less axis; rank is the knob (15) |
| Certification currency vs field reality | **Form** | grades go stale on *drift evidence only*, triggering re-certification (19) |

Banned: XP, levels-as-word (grade only), loot, quests, streaks, any calendar-decay, leaderboards across specialists (1, 4, 5).

## The mechanics

### Grade band (progression core)
A specialist's grade is the **conservative lower bound** of a batch-computed skill estimate (Bradley–Terry over the full comparison set, bootstrap CIs — never online Elo on frozen checkpoints) (17). Progression = the band tightening and its floor crossing a threshold. The crew report renders the band itself; watching it tighten across training generations IS the progress bar.

### The Record
Per specialist: certification history, per-task-type field hit rate, override-was-right vs override-was-wrong counts, calibration (ECE), exam-vs-field divergence status. Purpose: train the *director's* reliance — who to trust on what (21). Charisma sits next to falsifiable numbers, always on the same screen (21-Bansal rail).

### Certification (promotion gate)
- Exams preregistered before training starts; every attempt logged; selective disclosure impossible by construction (16).
- Mechanical contamination check (order-likelihood exchangeability test) — a positive flag voids the certification automatically (16).
- Calibration gates independently of accuracy: an overconfident specialist does not promote (18).
- Defenses are automatic, not judgment calls — in a one-human studio, trainer/examiner/promoter are the same person, so trust-based separation of duties is unavailable (16).

### Cross-training (the alchemy)
- **Compatibility readout first**: sign-agreement between adapter deltas, computed and shown *before* any merge run (11). A real number, not flavor.
- Merge (TIES-style or learned concatenation per LoRA Soups) then **exam-gated birth**: the new specialist exists only if it certifies (12, 13).
- **Failed cross-training is a designed outcome** — 4–14B is the fragile regime (13); the failure record is itself documentation.
- Hard honesty boundary: cross-training yields **skill union (A-and-B), never novel capability C** (12). No surface may imply emergent discovery.
- **Untraining** is the sibling operation: subtract a task vector to remove a trait (10).
- Lineage is recorded: every specialist's sheet shows ancestry (seeds, soups, cross-training graph) — permanent records, no dependence cliff (3).

### Training programs
Prerequisite graphs over curricula: completing foundations makes advanced certifications cheaper/faster — a tech tree that mirrors a measured effect (14). Data-mix previews show quantitatively predicted outcomes + forgetting-risk threshold where mixture-law fits exist (curriculum-mixing findings; recipe preview).

### Form
Production inputs per specialist are drift-tested against the certification exam distribution (representation-level two-sample tests). Malignant divergence → grade marked **stale**, re-certification triggered (19). Form never decays by calendar — only by evidence (4).

### Techniques
Auto-derived distinctions from real result properties (e.g., a flip-consistency ceiling, a zero-override field stretch on a task family, a cross-training that certified first attempt). Non-farmable by construction — there is no repeatable low-value action that mints one (5). Rendered as compressed evidence: each technique links to the receipts that earned it.

## Surfaces (director: HTML + Rich CLI)

**Crew Report (HTML)** — evolution of `dossier/dossier.html`: roster → per-specialist sheet (portrait, operating profile, grade band, record, lineage graph, techniques, form status). Built from the same JSON the CLI reads; no hand-maintained state.

**Rich CLI** — `roleos crew` (roster: glyph, grade band, form, one-line record), `roleos crew <role>` (full sheet), plus the existing `roleos specialist ...` verbs gaining `cross-train`, `untrain`, `form-check` subcommands. Renders as instrument readout: bands, numbers, receipts.

**Ceremony (director: silent reward, but still a ceremony).** On certification or successful cross-training: the specialist's **glyph pulses** once (HTML: a single slow pulse animation; CLI: the glyph mark printed with a one-line certification record). No fanfare text, no confetti, no exclamation marks. The instrument confirms; the reward is the new capability in action and the record it leaves. (1, 2, 9)

**Consent rail:** the crew layer is a *view the director opens* — core CLI dispatch output stays unchanged; scoring rules are fully inspectable in this doc + the schemas (6).

## The Operating Profile layer (personality, kept and made honest)

Director's call: the personality layer is load-bearing and stays — renamed and trued-up:

- **Operating Profile** = the named posture (Skeptic / Builder / Diplomat / Contrarian / Perfectionist / Pragmatist / Investigator / Maverick — professional words, kept) + **Priorities** (what this specialist optimizes for, in order).
- **Honesty mechanic:** the sheet renders the *exact* prompt-delta text injected at dispatch. What you read is what the model gets. No hidden flavor, no displayed-but-uninjected fiction. (20)
- Prompt injection stays **functional** (task posture, priorities, evidence standards — the Kong-style frame that helps); socio-demographic/affective flavor stays out of prompts (Zheng/Gupta risk) (20).
- **Anthropomorphism rails:** profiles are static professional descriptors. No affective states, no needs, no fatigue, no guilt mechanics, no specialists chiming in unprompted (22). Portraits stay; they are engagement-legitimate (22-Blut) and sit beside the falsifiable record (21).

## Implementation phases (post-verification; build kickoffs later)

| Phase | Builds | Depends on |
|---|---|---|
| S1 | Vocabulary migration (dossier schema: disposition→operating profile/priorities; grade band fields; reps redefinition to verified-events) | nothing |
| S2 | The Record pipeline (field outcomes → per-task stats; calibration; all-attempts certification ledger) | dossier Phase 5 hookup (reps feed) |
| S3 | Crew Report HTML + `roleos crew` CLI | S1, S2 |
| S4 | Cross-training + untraining commands (compatibility readout, exam-gated birth, lineage graph) | **GPU** (merge + certify runs) |
| S5 | Form checks (drift tests, stale-marking, re-cert trigger) | S2; production traffic |
| S6 | Training programs (prerequisite graphs, recipe previews) | training-knowledge KB integration |

## Research grounding (the dispatch's empirical floor)

Provisional pending Step-4 receipt. Full 40-finding set: `findings.json`. Load-bearing subset:

1. **Gamification effects are real but small and context-fragile.** Hamari et al. 2014 (DOI 10.1109/HICSS.2014.377). Design for this exact user; import no stock patterns.
2. **Informational competence feedback enhances intrinsic motivation; expected rewards undermine it.** Deci, Koestner & Ryan 1999 (Psychological Bulletin 125(6)). Measurement, never payout.
3. **Removing an incentive layer collapses propped-up behavior.** Thom, Millen & DiMicco 2012 (CSCW, DOI 10.1145/2145204.2145362). Permanent records over incentive layers.
4. **Streak mechanics induced junk calendar-work in expert developers (GitHub natural experiment).** Moldon, Strohmaier & Wachs 2021 (ICSE, arXiv:2006.02371). No streaks, no calendar decay.
5. **Badges barely steer (~5–30%); "phantom steering" inflated prior claims.** Hoernle et al. 2022 (DOI 10.1007/s10115-021-01637-6). Distinctions = compressed evidence, not levers.
6. **Imposed gamification backfires; consented works.** Mollick & Rothbard 2014 (SSRN 2277103). Opt-in view, inspectable rules.
7. **One metaphorical word covertly steers reasoning.** Thibodeau & Boroditsky 2011 (PLoS ONE, DOI 10.1371/journal.pone.0016782). Vocabulary is the highest-leverage layer.
8. **Game-framing alone (no mechanics) delivers most of the interest boost.** Lieberoth 2015 (Games and Culture 10(3), DOI 10.1177/1555412014559978). Spend on framing, not mechanics.
9. **Competence-feedback framing crowds motivation in; quota framing flips it.** Huang, Chen & Zhou 2024 (Frontiers in Psychology, PMC10807424). Every number is a PR, never a target.
10. **Task vectors compose additively and negate selectively.** Ilharco et al. 2022 (arXiv:2212.04089). Cross-training and untraining are real algebra.
11. **Merge interference is measurable (sign disagreement); trimming + sign-election recovers it.** Yadav et al. 2023 (TIES, arXiv:2306.01708). Compatibility readout before fusion.
12. **Skill-pair composition works — learned concatenation (CAT) beat merging baselines by ~43% and joint data-mixing by ~12% — but merged adapters fail knowledge integration.** Prabhakar et al. 2024 (arXiv:2410.13025); Chen et al. 2025 (arXiv:2506.13479). Union, never alchemy-into-novel-C.
13. **Merging is most fragile at small scale (4–14B).** Yadav et al. 2024 (arXiv:2410.03617). Exam-gated birth; failure designed-in.
14. **Prerequisite-ordered curricula measurably cut data needs.** Chen et al. 2023 (Skill-It, arXiv:2307.14430). Training programs are real mechanics.
15. **LoRA learns less, forgets less — depth vs range is a measured axis.** Biderman et al. 2024 (arXiv:2405.09673). The depth gauge.
16. **Goodhart has four variants needing four defenses; contamination is provable; count every attempt.** Manheim & Garrabrant 2018 (arXiv:1803.04585); Oren et al. 2023 (arXiv:2310.17623); Singh et al. 2025 (arXiv:2504.20879). Automatic, mechanical anti-gaming.
17. **Skill ratings for frozen checkpoints: batch + uncertainty; grant from the conservative bound.** Boubdir et al. 2023 (arXiv:2311.17295); Herbrich et al. 2007 (TrueSkill, NIPS); Miller 2024 (arXiv:2411.00640). The grade band.
18. **Fine-tuning is when calibration drifts; temperature scaling measures/fixes it.** Guo et al. 2017 (arXiv:1706.04599). Calibration gates promotion.
19. **Dataset shift is detectable via representation-level two-sample tests.** Rabanser et al. 2019 (arXiv:1810.11953). Form/staleness on evidence only.
20. **Prompt personas don't improve output and can bias it; narrow task-role framing helps.** Zheng et al. 2024 (arXiv:2311.10054); Gupta et al. 2024 (arXiv:2311.04892); Kong et al. 2024 (arXiv:2308.07702). Profiles displayed honestly, injected functionally.
21. **Reliance calibration is measurable and trainable; persuasive presentation inflates wrong-acceptance.** Schemmer et al. 2023 (arXiv:2302.02187); Bansal et al. 2021 (arXiv:2006.14779). The Record; charisma beside evidence.
22. **Anthropomorphism boosts engagement (meta-analytic) but affective agents create dependence harms and human-like presence can degrade team performance.** Blut et al. 2021 (DOI 10.1007/s11747-020-00762-y); Laestadius et al. 2022 (DOI 10.1177/14614448221142007); Qin, Lee & Sajda 2025 (arXiv:2501.15332). Static, non-affective, no simulated presence.

## Standards compliance

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 2 | Dispatch lock emitted (`dispatch.lock.json`: script SHA-256, model, run id). Implementation phases pin exams preregistered-before-training. |
| ANDON_AUTHORITY | 2 | Contamination flag voids certification mechanically; calibration gate blocks promotion; malignant drift halts a grade to stale. |
| NAMED_COMPENSATORS | 2 | Registry promote/rollback are existing pointer-swap compensators; this doc's canon-write is covered by `revert_dispatch_commit` + `requalify_dependent_slices`; cross-training births are exam-gated (no uncertified specialist goes live). Training-run GPU spend: bounded, owner-accepted cost. |
| DECOMPOSE_BY_SECRETS | 2 | Measurement core (grades/record/exams — stable) is separated from presentation (crew report/CLI — volatile) and from composition ops (cross-training — GPU-coupled). |
| UNCERTAINTY_GATED_HUMANS | 2 | Grade bands display uncertainty explicitly; promotion gates on CI bounds; Step-4 verification escalated to the director with a contrastive frame rather than silently skipped. |
| EXTERNAL_VERIFIER | 2 | Certification exams are external to the trained model; citation verification via family-different prism gate (pending receipt → 3). |

## Open items

- [ ] **Step-4 verification** (`roleos verify-citations design/specialists-layer.md`) when GPU frees — receipt attached here; any FABRICATED/MISATTRIBUTED finding triggers re-grounding of its mechanics.
- [ ] Glyph design per specialist (GlyphStudio is the studio's pixel-craft tool — natural fit).
- [ ] Capability-gate scope enforcement (carried from Stage A deferral — lands with the S-phases).
- [ ] training-knowledge KB ↔ training programs integration contract (S6).
