# Specialist training programs (S6) — role-os ↔ training-knowledge contract

**Status:** design dispatch, grounded by a 4-agent study-swarm (run `wf_9b6208e9-b97`, 2026-06-13), Step-4 verified.

**Step-4 verification (2026-06-13):**
- **Existence — confirmed, 0 fabricated.** All arXiv citations resolved via prism's **signed** retrieval oracle (22/22, including arXiv:2508.03999 on the signed re-run — the earlier dev-mode "unresolvable" was a transient arXiv-API hiccup); the 2 ACL-anthology papers (D15-1193, P17-1133) confirmed via the WebFetch oracle. **1 misattribution caught and corrected** (finding 22 was "Lan et al." — the paper is **Su et al.**).
- **Groundedness — load-bearing core checked by two decorrelated lenses** (WebFetch source-RAG + IBM-Granite-4.1 different-family, reasoning-stripped). Findings 6 & 9 fully SUPPORTED; findings 10/11/15 had sub-claims that the abstracts do not state, **softened above** to what the sources confirm.
- **Signed receipt + groundedness confirmed working:** `design/specialist-training-programs.verify-receipt.json` (signing key `prism keygen` → kid `ed25519-91914c8d4e99814a`; `PRISM_SIGNING_KEY` item resolved). The `escalate` verdict is correct (≥1 not_addressed → escalate-never-accept), but prism's groundedness lens **did run and produce verdicts** — the real dispatch scored **14 supported / 8 not_addressed / 0 fabricated** (verifier mistral-small:24b, a LOCAL family ≠ the anthropic caller, in the signed prism receipt). The earlier "every citation not_addressed" was a *report artifact* (the human report skipped supported citations) and `local_panel: null` was the offload second seat gated on `gate.pass` — **both fixed** (role-os `54f6a32`; the panel now runs on Ollama's `:11434` OpenAI endpoint with decorrelated families). **EXTERNAL_VERIFIER is satisfied by prism alone**; the manual two-lens groundedness above was corroboration — and it agreed, independently softening the same sub-claims.

S6 surfaces **training programs** for specialists by reading the `training-knowledge` KB
(`E:\AI\readouts\training-knowledge\training.db`, ~85 evidence-backed techniques with a
`predecessor_technique_id`+`stage_order` chain, `technique_evals`, `datasets`, and an
`engine_recipe_ref` seam to the tensor-engine recipe layer). Two surfaces: a **prerequisite
curriculum graph** (a tech tree: completing foundation techniques makes advanced specialist
certifications cheaper/faster) and **recipe previews** (a quantitatively predicted outcome +
forgetting-risk threshold shown *before* a GPU run). This doc is the CONTRACT: what role-os
COMPUTES, and what the KB must GUARANTEE, for both to be evidence-grounded rather than decorative.

## Research grounding (the dispatch's empirical floor)

Extends the design doc's finding 14 (Chen et al. 2023, Skill-It, arXiv:2307.14430). Each finding:
one-sentence claim, source, design implication.

### Curriculum ordering — what the payoff actually is

1. **The curriculum payoff is fewer training STEPS to the same quality, not a higher score — and a perplexity/loss-based difficulty signal backfires.** Zhang et al. 2025 (arXiv:2506.11300). → Frame the tech-tree benefit as **GPU-steps/data saved to the same certification**, and have role-os **refuse to surface a prerequisite edge whose only difficulty signal is perplexity/loss**.
2. **Easy-to-hard curriculum is near-necessary (not just helpful) for small models on hard skills — some targets are unreachable cold-start.** Parashar et al. 2025 (arXiv:2506.06632). → The graph needs a hard **`prerequisite-required`** edge type (gates reachability), not only a `cheaper` edge; the preview flags certs predicted to fail from a cold start.
3. **The curriculum benefit is conditional on (model capability × task difficulty) and can vanish or reverse on hard targets.** Jia et al. 2025 (arXiv:2510.19099). → The predicted-outcome number must be **conditioned on (base-model size, target-cert difficulty)**; mark advanced certs where ordering gains are known to vanish so the tree shows no phantom shortcut.
4. **Difficulty-targeted within-run data selection cuts fine-tuning time 23–62% at the same final quality.** Sun et al. 2025 (arXiv:2506.05316). → Quantify edges as a **% time-to-cert reduction with a range (~20–60%)**, capped at "same quality, fewer hours" — never "higher score".
5. **Adaptive, model-paced (competence-relative) curriculum is the robust lever (up to ~2× faster); static handcrafted schedules are fragile.** Shi et al. 2025 (AdaRFT, arXiv:2504.05520). → Previews must be **competence-relative to the specific candidate adapter** (reuse the S5 field-distribution logging), not a global constant.

### Recipe preview — predicted outcome + forgetting threshold are real, but tiered and scale-bounded

6. **Validation loss is a smooth, fittable function of data-mixture proportions, predictable from a few small calibration runs.** Ye et al. 2024 (Data Mixing Laws, arXiv:2403.16952). → A recipe's predicted outcome is a **fitted mixing-law point estimate**; the KB must store the law's coefficients + calibration runs, else the preview is decorative.
7. **A regression fit on many tiny proxy runs ranks unseen mixtures and transfers to far larger targets at ~10% compute.** Liu et al. 2024 (RegMix, arXiv:2407.01492). → Two confidence tiers: **`law-predicted` (point loss)** vs **`regression-predicted` (rank)** — reserve absolute loss claims for recipes with a fitted law.
8. **Proxy-tuned domain weights transfer to a 30× larger model and reach baseline accuracy in 2.6× fewer steps.** Xie et al. 2023 (DoReMi, arXiv:2305.10429). → That speedup is a measurable **edge weight** for the prerequisite graph; the KB records the proxy-to-target size ratio so role-os can flag too-small proxies.
9. **Catastrophic forgetting under fine-tuning is a power law in fine-tuned-parameter-count and steps, inverse-linearly tied to the gain.** Kalajdzievski 2024 (arXiv:2401.05605). → role-os **computes a predicted forgetting magnitude on the same knobs (rank, steps) the recipe already pins**, and shows the gain↔forgetting tradeoff explicitly (more gain costs more forgetting).
10. **Injecting ~1% pretraining/replay data into the fine-tune set largely prevents forgetting, with a scaling law over the injection fraction.** Bethune et al. 2025 (*Scaling Laws for Forgetting during Finetuning with Pretraining Data Injection*, arXiv:2502.06042 — the title grounds the scaling-law-over-injection claim; the abstract states the ~1% takeaway). → The forgetting threshold becomes an **actionable knob**: the preview recommends a **replay fraction** predicted to keep the role above its S5 drift gate.
11. **A predictable "critical mixture ratio" (general-to-domain) bounds capability loss — a power law in loss, mixture, and training tokens.** Gu et al. 2024 (CMR scaling law, arXiv:2407.17467). *(The paper's experiments report the ratio rising with model size, ≈30%→48% over 0.46B→3.1B — body-level; the abstract confirms only the predictable-threshold core, verified by both groundedness lenses.)* → Render the forgetting threshold as a **band**, and — motivated by the scale-dependence of mixing laws (this + finding 6) — compute it **per model size** so a 4B and a 14B specialist of the same role get different thresholds (matches our Qwen3-4B/14B split); **downgrade an out-of-band prediction to low-confidence**.

### Prerequisite-graph construction — every edge a witnessed, falsifiable claim

12. **A prerequisite edge can be MINED from an asymmetric reference signal (A's resources cite B more than the reverse ⇒ B precedes A), beating supervised baselines.** Liang et al. 2015 (RefD — *Measuring Prerequisite Relations Among Concepts*, EMNLP 2015, ACL Anthology D15-1193). → Every edge carries a **directional, machine-computable witness**; a near-symmetric edge is a candidate spurious edge and is **flagged, not drawn**.
13. **Fusing heterogeneous structural + behavioral signals raises prerequisite-edge precision over any single hand-crafted feature (+5.9–48% F1).** Pan et al. 2017 (ACL P17-1133). → Compute each edge from a **fusion** of KB-held signals (shared datasets, stage-chain co-occurrence, receipt/checkpoint reuse), never the lone `predecessor` pointer; expose the contributing signals so a thin edge looks thin.
14. **Prerequisite relations form a strict partial order; enforcing irreflexivity + transitivity + acyclicity removes contradictions and derives implied edges for free.** Liang et al. 2018 (arXiv:1801.06481). → A hard **DAG validity gate** (reject cycles), transitive closure to auto-derive + detect contradictions, and a distinct **`closure-implied`** edge class so curriculum-cost math doesn't double-count.
15. **Prerequisite structure can be discovered and validated from learner/outcome trajectories by making it a learnable parameter in a knowledge-tracing model.** Annabi & Nguyen 2024 (arXiv:2402.01672 — abstract-confirmed by both groundedness lenses). → Treat the tech tree as a **hypothesis tested against receipts**: edge A→B is real only if specialists who completed A certify B measurably cheaper than those who skipped it — the **"cheaper-after-foundation" delta is both the selling point and the validation test**; demote edges where it's absent. **Design principle (general causal inference, not attributed to this paper's abstract):** require an asymmetric behavioral/causal-support signal, not mere co-occurrence — a confounded edge does not reflect a real learn-A-before-B effect.

### Transfer prediction — signed edges + a cheap pre-run signal

16. **Intermediate-task transfer is pair-specific — often neutral or NEGATIVE — so "foundation helps" is never universal.** Pruksachatkun et al. 2020 (arXiv:2005.00628). → Store **signed per-edge transfer deltas** (not an unsigned is-prerequisite boolean); an edge earns the tree only if its measured target delta is positive.
17. **Task transfer forms a measurable graph in which a few foundations supply most of the transfer, cutting labeled data ~67% via an optimal transfer-graph solve.** Zamir et al. 2018 (Taskonomy, arXiv:1804.08328). → role-os **solves for the cheapest prerequisite chain** (a Bellman/optimization pass over the KB's pairwise transfer receipts) to a target cert.
18. **Inter-task affinity — how much one task's gradient step lowers another's loss — gathered in ONE run predicts good groupings (10% loss cut, 11.6× faster than train-all-pairs).** Fifty et al. 2021 (arXiv:2109.04617). → A **one-step affinity probe** is a cheap pre-run transfer signal, far cheaper than running the downstream training to find out.
19. **Fisher-information task embeddings predict the most transferable source before training, and transfer helps most when target data is scarce.** Vu et al. 2020 (arXiv:2005.00770). → The preview reports a **predicted transfer rank from a stored task-embedding fingerprint**, conditioned on the cert's data size (the predictor's value peaks exactly for niche, low-data roles).
20. **LEEP predicts downstream accuracy AND convergence speed from a single forward pass of target data through the source model — no fine-tuning.** Nguyen et al. 2020 (arXiv:2002.12462). → role-os computes a **LEEP-style score by running the cert's sealed exam once through the foundation adapter** — seconds of inference; low score ⇒ the preview warns the run won't pay off before any GPU time is spent.
21. **Task vectors from independent fine-tunes are near-orthogonal; cosine is high only for related tasks, signalling reinforce-vs-interfere.** Ilharco et al. 2023 (arXiv:2212.04089). → Compute **cosine between a foundation's logged task vector and the cert's expected direction** as a pre-run interference flag — the studio already produces these (S4d cosine 0.074), and S4d also warns cosine-orthogonality does **not** cleanly imply safe-to-compose (untraining collapsed despite cos 0.074), so cosine is a *flag*, not a *proof*.
22. **Merging heterogeneous task-specific LoRA adapters causes measurable negative transfer via parameter conflict.** Su et al. 2025 (TC-LoRA — *Tensorized Clustered LoRA Merging for Multi-Task Interference*, arXiv:2508.03999; existence confirmed via WebFetch oracle after the arXiv-API pin missed it). → Because our specialists ARE LoRA adapters, default to a **SEQUENCED curriculum** (one foundation's receipts chain to the next), reserving adapter *merging* for cases where measured task vectors are near-orthogonal; the KB records each chain as validated-as-sequence vs validated-as-merge.

## The contract

### What role-os COMPUTES (the consumer side)

| Computed | From | Findings |
|---|---|---|
| Per-edge **evidence strength** = directional mined witness × receipt-based outcome delta | RefD-style asymmetry + signal fusion + the cheaper-after-foundation delta | 12, 13, 15, 16 |
| **Transitive-reduced, acyclic** renderable tech tree; `closure-implied` edges tagged | DAG gate + transitive closure | 14 |
| **Cheapest prerequisite chain** to a target cert (max data-savings path) | optimization over signed pairwise transfer | 16, 17 |
| Recipe preview: **predicted outcome** (`law-predicted` point-loss \| `regression-predicted` rank; out-of-band → low-confidence) | fitted mixing law / proxy regression, scale-bounded | 6, 7, 8, 11 |
| Recipe preview: **forgetting band per model size** + recommended **replay fraction** | forgetting power-law + replay scaling-law + CMR | 9, 10, 11 |
| Recipe preview: **cheap pre-run transfer gate** (LEEP one-forward-pass + task-vector cosine + task-embedding rank + one-step affinity) | predictor ensemble, no downstream GPU run | 18, 19, 20, 21 |
| **`thin-evidence` / `unverified`** flags for under-witnessed or correlation-only edges | the witness + causal-support checks | 1, 12, 15 |
| Edge benefit framed as **% GPU-steps saved, same quality**; `prerequisite-required` vs `cheaper` edge classes | the efficiency framing + small-model necessity | 1, 2, 3, 4 |
| Predictions **competence-relative** to the candidate adapter (reuse S5 logging) | adaptive-curriculum lever | 5 |

### What the KB GUARANTEES (the producer side — `training-knowledge`)

Per technique / edge, beyond today's schema (`predecessor_technique_id`, `stage_order`,
`evidence_strength`, `technique_evals`, `engine_recipe_ref`):

| Guarantee | Why (findings) | Status in KB today |
|---|---|---|
| **difficulty tier + the difficulty SIGNAL used** (reject perplexity/loss-only) | 1 | new field |
| **signed measured transfer delta** toward the target exam + its receipt | 15, 16 | new (have `technique_evals` threshold/accepted, not signed cross-cert delta) |
| **fitted mixing-law coefficients OR proxy-regression** + **calibration scale (params, tokens)** | 6, 7, 11 | new |
| **replay fraction + measured forgetting at that fraction**; domain-vs-base similarity tag; role tolerance ε | 9, 10, 11 | new (relates to the S4c 20%-replay receipt) |
| **task-embedding fingerprint + task-vector fingerprint** | 19, 20, 21 | new (task vectors exist on the rig from S4; not in the KB) |
| **replayable eval/exam set** for the LEEP pass | 20 | exists (sealed exams) — needs a stable KB ref |
| **directional witness score + contributing signals** per edge; **outcome delta**; **validated-as-sequence vs validated-as-merge** | 12, 13, 22 | new |
| **no edge from assertion alone** — mined-with-witness or rejected; any LLM-suggested edge passes an external-verifier grounding gate | 15, EXTERNAL_VERIFIER standard | new (the `engine_recipe_ref` Parnas seam is the model for keeping producer/consumer split) |

The Parnas seam stays as the KB already designed it: measured it/s + VRAM peaks live in the
tensor-engine layer behind `engine_recipe_ref`, referenced not restated; S6 adds the
curriculum/transfer/forgetting fields on the technique side, and role-os computes the graph +
previews on the consumer side — neither restates the other's numbers.

## Phasing
- **S6.0 (this dispatch):** the contract — verified findings → the COMPUTES/GUARANTEES tables. No code.
- **S6.1:** KB schema additions (the new GUARANTEE fields) + a witness/validation builder that emits the directional-witness + acyclicity-gated graph from existing signals (no new GPU).
- **S6.2:** recipe-preview predictors that need only inference (LEEP pass, task-vector cosine, mixing-law point estimate from stored coefficients) surfaced via `roleos crew`.
- **S6.3 (GPU):** fit the mixing/forgetting laws and signed transfer deltas per role from small calibration runs — the one attended-GPU piece; until an edge has its receipt it renders `unverified`.

## Standards compliance

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 2 | The study-swarm script is persisted (`wf_9b6208e9-b97`); the contract pins each computed value to a finding number. Remediation to 3: emit the dispatch.lock (resolved agent model + per-prompt SHA + verifier run_id). |
| ANDON_AUTHORITY | 3 | An edge with no witness, a cycle, a perplexity-only difficulty signal, or an out-of-band prediction is refused/downgraded, not drawn (findings 1, 11, 12, 14). The preview's LEEP gate halts a run predicted not to pay off. |
| NAMED_COMPENSATORS | 3 | S6.0 writes only a design doc (compensator: `git revert`). No GPU, no publish. The graph/preview are advisory; the director owns every training run. |
| DECOMPOSE_BY_SECRETS | 3 | The producer (KB GUARANTEES) and consumer (role-os COMPUTES) are split exactly on the existing `engine_recipe_ref` Parnas line; the witness/predictor math is hidden behind the graph+preview interface. |
| UNCERTAINTY_GATED_HUMANS | 3 | Every edge and preview number renders its evidence tier (`law`/`regression`/`unverified`, `thin-evidence`, out-of-band downgrade); the director sees confidence, never a bare shortcut. |
| EXTERNAL_VERIFIER | 3 | Step-4 ran on the real dispatch through `roleos verify-citations` → prism's **signed** receipt: existence 22/22 (1 misattribution corrected) + groundedness **14 supported / 8 not_addressed / 0 fabricated** by a **different-family** verifier (mistral-small:24b ≠ anthropic caller), reasoning-stripped, with a retrieval-oracle existence floor, signed + replayable. The offload second-seat panel now runs too (role-os `54f6a32`, on Ollama). Corroborated by an independent manual two-lens pass (it softened 3 sub-claims). The contract also requires any LLM-suggested prerequisite edge to pass a different-family grounding gate (finding 15). |
