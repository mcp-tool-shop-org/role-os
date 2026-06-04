# Token Budget Analyst — Dataset Design (v0.1)

**Status:** built, anchored in a real probe of this rig's data (2026-06-04).
**Scope:** dataset only. No training, no gate wiring, no live token accounting. The corpus is
handed to [[backpropagate]] in a later kickoff.
**Specialist:** #2 in the specialist tier (see `specialist-tier-architecture.md`). Backs the
**role-os dispatcher** — consulted before each dispatch to predict the spend envelope.

> **Frame correction (2026-06-04, Mike).** The original kickoff listed model-tier selection and a
> cheap-tier *cascade* (FrugalGPT) as prediction targets. Those optimize for API dollars by trading
> quality for a cheaper model — which the studio deliberately does **not** do (it runs Opus by
> design). The analyst is about **token economics**: forecasting and controlling token **spend**,
> with the model held fixed. **v0.1 predicts exactly one thing: cost-weighted token spend per
> dispatch (with an interval).** Model tier is **dropped as a target** and kept only as recorded
> metadata (it enables a *future* Claude-vs-local-intern lever — the one real model axis Mike uses —
> but that is out of v0.1 scope). Compaction is likewise demoted to metadata for now.

---

## 1. What the specialist predicts (v0.1 label space)

Per dispatch, given `(task_text, role, context_tokens, complexity_signals)`:

| Prediction | Method (built at TRAIN time, not stored pre-baked) |
|---|---|
| **cost-weighted token spend** as a conformal prediction interval | conformal residuals over `cost_weighted_spend`, in **log space** (Yadkori et al., DeepMind 2024, arXiv:2405.01563) |

That's it for v0.1. Compaction-risk, wave-level allocation, waste flagging, and a Claude-vs-local
delegation lever are **deferred** — the corpus records the signal for them (compaction fields, the
cost breakdown, `tier_used`) but the v0.1 analyst does not predict them.

**Honest framing (load-bearing).** The corpus is the **observation layer**. It stores the *observed*
`cost_weighted_spend` plus its raw components. The conformal interval is **derived at train time**
from a calibration split. The corpus ships what is needed to compute the interval, not a pre-baked one.

---

## 2. The target: cost-weighted spend (not raw output)

Raw output-token count hides the real economics. A dispatch can be cheap on output but expensive on
`cache_creation` (rebuilding context), or run up enormous `cache_read` (re-reading a large context
every turn). We weight each usage component by **Anthropic's structural price ratios** (relative to
input = 1):

```
cost_weighted_spend = input*1.0 + cache_creation*1.25 + cache_read*0.1 + output*5.0
```

Result is in **input-token-equivalents** — model-agnostic in ratio; multiply by the model's
`$/Mtok-input` later for dollars. *(The ratios are the stable part; confirm absolute Opus $/Mtok
before dollarizing.)* Weights live in `config.PRICE_WEIGHTS`.

**Measured (this rig, 1217 records).** The reframe earns its keep immediately:
- Subagent-dispatch spend (the per-dispatch target): **p50 ≈ 949k, p90 ≈ 3.6M, max ≈ 107M** weighted
  tokens — vs raw output p50 ≈ 17k. The real cost is ~56× the output count.
- **`cache_read` is the dominant driver** — ~half of weighted spend at p50, and it dominates the tail
  (a 3,813-turn session legitimately accumulated 1.87B cache-read tokens). This is exactly the
  economics that "budget = output count" would have missed.

---

## 3. The counterfactual problem (do not paper over it)

We observe **actual** spend, never the **optimal** spend. The label is a counterfactual. So
`cost_weighted_spend` is **annotated** with an `outcome` flag describing the observed spend's validity:

- `starved` — ran out / needed auto-compaction / hit `max_tokens`. The observed spend is a **lower
  bound** on what was needed, not the right answer. (cost-weight 5×, §6.)
- `wasteful` — large spend, tiny output (cache churn / overhead with little to show). Over-provisioned.
- `success` — completed at the observed spend (a usable regression target).
- `failed` — failed for non-length reasons (spend is noise).
- `unknown` — no signal (weak example).

A budgeter trained as if observed spend were always the right target would confidently under-budget
every dispatch that was *already* starved.

---

## 4. The dispatch record (grain)

Primary grain = **subagent dispatch** = one `subagents/agent-<id>.jsonl` transcript — role-os's "per
dispatch" unit. **This is the v0.1 prediction target.** Measured: **1039** on this rig.

Secondary grain = **top-level session** (`<uuid>.jsonl`, 178). Sessions are 10× more expensive (long
main-loop) and are the only place auto-compaction is observable. They are kept tagged `grain:"session"`
as **metadata** (for the deferred compaction target), **not** as part of the v0.1 spend target
population. Spend stats are reported per grain in the manifest so the two are never conflated.

---

## 5. Features (observable from the transcript, no join needed)

- `context_tokens` — initial context at dispatch (the budgeter's **input** feature, known *before* the
  dispatch). Measured p50 ≈ 38k.
- `cost_weighted_spend` — the target (§2), plus its four raw components
  (`input/cache_creation/cache_read/output _tokens_total`) so the cost model can be recomputed or
  reweighted without re-harvesting.
- `peak_context_tokens` — compaction-pressure (metadata).
- `complexity_signals` — non-sensitive: `num_turns`, `num_tool_results`, `has_large_artifact`,
  `attribution_agent`, `attribution_skill`, parsed `domain`/`wave`/`phase`/`action`.
- `tier_used`, `compaction_*`, `final_stop_reason` — **recorded metadata** (not v0.1 targets).

---

## 6. Cost asymmetry (locked)

Under-budget ≫ over-budget. Running out mid-task = lost work; over-provisioning = some wasted tokens.
Records carry `cost_weight`: **5×** for the false-"enough" risk class (`outcome == "starved"`), **1×**
otherwise (Wang 2025, arXiv:2510.22016). The eval is **cost-at-fixed-quality** (FrugalGPT framing) with
the 5:1 asymmetry baked in — not balanced accuracy.

---

## 7. The sanity gate — deterministic baseline

A learned budgeter only earns its keep if it beats a deterministic baseline. We store the baseline's
prediction per record: `baseline_spend = max(context_tokens * 1.5, 50_000)` (predicts
`cost_weighted_spend`; likely needs recalibration once the spend distribution is seen — the manifest
reports both). **Ship gate:** beat the baseline by **≥10% at equal quality** on the certification exam,
or v0.1 ships the deterministic policy and the weights wait. *(Experimental hygiene, not a cited result.)*

---

## 8. Splits

- **Certification exam** — frozen, human-reviewed, newest temporal window; the level-progression metric.
- **Field audit** — rolling slice after each cutoff; exam↔audit divergence is the overfitting alarm.
- **Train** — the rest.

Exam is **temporally disjoint** from train (split on `timestamp`) and **never** sampled into train.
The manifest's contamination check **hard-fails the build** on any shared `dispatch_id` (§12). The
highest-uncertainty labels (the counterfactual `starved`/`wasteful` calls) go to
`human_review_queue.jsonl` for human resolution **before** the exam is frozen.

---

## 9. Scrub (privacy — load-bearing, hard-gated)

Training data is forever. Before any record leaves role-os the scrub pass (1) redacts credential
patterns, (2) redacts absolute paths, (3) redacts emails, (4) strips large embedded artifacts to a
`[ARTIFACT len=N]` placeholder (keeping the length feature), and (5) reduces **canon-repo** task text
to features only. **ANDON:** a re-scan re-checks every output for surviving secret patterns and **any
hit hard-fails the build** — no partial corpus is written. Scrub counts go in the manifest. Proven by
`test_harvester.py`.

---

## 10. The join (outcome quality — fuzzy, the part most likely to be wrong)

There is **no hard foreign key** from a dispatch to an outcome row (the swarm DB's `agent_runs` has no
session/agent id). The join is fuzzy and multi-key (`repo + phase + wave + domain + day-window`); every
joined label carries a `join_confidence` in {exact, probable, weak, none}. Run pinning is **day-level**
(dispatch timestamps are UTC, swarm timestamps local) — it pins the run (runs are days apart, one per
repo) but does not claim sub-day precision. Sources: swarm `control-plane.db` (`agent_runs.status`),
role-os `*.verdict.md`/`*.citation-receipt.json`, readouts `family-verdicts.json`. `outcome_source`
adds `"transcript"` to the kickoff enum because `starved`/`wasteful` are defined by transcript-internal
evidence; `weak_label` is still set. **Scale reality:** only ~14% of dispatches get any external label;
the rest carry observed spend + transcript-derived outcome. Expected and honest.

---

## 11. Corpus schema (the contract)

One JSON object per line (`corpus.jsonl`). Field list is pinned by `harvester/schema.py`; the manifest
records the schema hash.

```jsonc
{
  "dispatch_id": "agent-…", "grain": "subagent", "source_file": "<scrubbed>",
  "harvester_version": "0.1.0", "timestamp": "…Z", "cwd_repo": "role-os", "git_branch": "…",

  "task_text": "<scrubbed>", "task_text_len": 4631, "role": "CI/DOCS",
  "attribution_agent": "general-purpose", "attribution_skill": "dogfood-swarm",
  "context_tokens": 49130, "complexity_signals": { … },

  // === v0.1 PREDICTION TARGET ===
  "cost_weighted_spend": 948756,
  "input_tokens_total": …, "cache_creation_total": …, "cache_read_total": …, "output_tokens_total": …,

  // outcome annotation (counterfactual-honest)
  "outcome": "success", "outcome_source": "transcript", "join_confidence": "none",
  "weak_label": true, "cost_weight": 1.0,
  "baseline_spend": 73695,

  // === RECORDED METADATA (not a v0.1 target) ===
  "peak_context_tokens": 100526, "final_stop_reason": "end_turn",
  "tier_used": "opus",                                  // future Claude-vs-local lever
  "compaction_observed": false, "compaction_trigger": null, "pre_compaction_tokens": null
}
```

---

## 11b. Corpus → training conversion (for the later kickoff)

The analyst is a **predictor**, not a chat model. A thin converter maps each record to a
`(prompt → completion)` pair (alpaca/chatml — backpropagate auto-detects): **prompt** = serialized
features; **completion** = the spend interval, computed from the calibration split in **log space**,
not copied from one record. The alpaca shape is not frozen here (kickoff: confirm backpropagate's shape
first); the rich JSONL is the intermediate. [[repo-dataset]] (v1.2.0) can package it.

---

## 11c. Known limitations (v0.1) — measured, not hypothetical

1. **Heavy-tailed spend (~2 orders of magnitude).** Subagent spend p50 ≈ 949k, max ≈ 107M. Regress in
   **log space**; the conformal interval lives in log space. A linear-space regressor will be dominated
   by the tail.
2. **`cache_read` dominates.** ~half of weighted spend at p50, more in the tail. The budgeter must read
   `context_tokens` and the dispatch's expected turn-count to anticipate cumulative re-reads — output
   length alone is not predictive of spend.
3. **External gold is sparse (~14% labelled, 6 gold) and old → concentrated in `train`.** The temporal
   `exam` has no external gold; exam gold comes from the **human-review pass** over the 180-row queue.
4. **Two grains, 10× apart.** Predict on the **subagent** grain; session-grain records are metadata.
   Do not train a single regressor across both without a grain feature.
5. **Tier is ~94% Opus.** Irrelevant to v0.1 (tier is not a target) — noted only because the *future*
   Claude-vs-local lever will need deliberately-generated local-model dispatches; the observational
   corpus cannot supply them.

**Receipts.** `python test_harvester.py` (exits non-zero on failure) proves: 7 secret classes redacted
with no ANDON survivor; ANDON catches an un-scrubbed secret; contamination hard-fails on overlap; canon
truncation fires; the cost-weighting ratios are correct; the join pins the time-correct run and refuses
to exact-match wave/domain coincidence.

---

## 12. Standards compliance (per workflow-standards.md)

| # | Standard | Score | Evidence |
|---|---|---|---|
| 1 | PIN_PER_STEP | 3 | Each record pins `dispatch_id` + `source_file` + `harvester_version`; corpus/exam/schema hashes + `cost_model_weights` frozen in the manifest. |
| 2 | ANDON_AUTHORITY | 3 | Scrub re-scan + exam↔train contamination check both hard-fail the build; `build.py` writes nothing until both pass. **Receipts:** `test_harvester.py`. |
| 3 | NAMED_COMPENSATORS | 3 | Local versioned files only; all sources read read-only. Compensator = `rm -r dataset/v0.1/` or `git revert`. No external irreversible action. |
| 4 | DECOMPOSE_BY_SECRETS | 3 | Stages each hide one concern: locate · parse · join · scrub · label · split · manifest. |
| 5 | UNCERTAINTY_GATED_HUMANS | 3 | Exam is human-reviewed; the counterfactual `starved`/`wasteful` labels queue for human resolution before freeze. |
| 6 | EXTERNAL_VERIFIER | 2 | Base is cross-family (non-Claude) — consistent by construction. Held at 2: outcome labels partly derive from the same dispatches; remediation: hold out a mission-pass/fail source from features. |

**Compensators (no-skip check):** local files only; sources read-only; no publish/release/tag/repo-edit.
Reversible by `rm -r` / `git revert`. The harvester performs no irreversible action.
