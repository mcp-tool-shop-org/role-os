# Token Budget Analyst — Dataset Design (v0.1)

**Status:** draft, anchored in a real probe of this rig's data (2026-06-04).
**Scope:** dataset only. No training, no gate wiring, no live token accounting. The corpus is
handed to [[backpropagate]] in a later kickoff.
**Specialist:** #2 in the specialist tier (see `specialist-tier-architecture.md`). Backs the
**role-os dispatcher** — consulted before each dispatch to predict the budget envelope.

---

## 1. What the specialist predicts (label space)

Per dispatch, given `(task_text, role, context_tokens, complexity_signals)`:

| # | Prediction | Method (built at TRAIN time, not stored pre-baked) |
|---|---|---|
| a | **token budget** as a conformal prediction interval | conformal residuals over `tokens_used` (Yadkori et al., DeepMind 2024, arXiv:2405.01563) |
| b | **model tier** as One-vs-All `P(tier sufficient)` | OvA over per-tier success observations (Verma & Nalisnick, ICML 2022) |
| c | **cascade decision** — try the cheap tier first? | FrugalGPT pattern (Chen et al. 2023, arXiv:2305.05176) |
| d | **compaction trigger** — will this dispatch need mid-run compaction? | binary over observed auto-compaction events |

**Honest framing (load-bearing).** The corpus is the **observation layer**. It stores the
*observed* quantities (`tokens_used`, `tier_used`, `outcome`, `compaction_observed`). The conformal
interval, the OvA probabilities, the cascade policy, and the compaction classifier are all **derived
at train/eval time** from a calibration split of these observations. The corpus does **not** ship
pre-computed intervals — it ships what is needed to compute them. Anyone expecting a `budget_interval`
column in the corpus is misreading the design.

---

## 2. The counterfactual problem (do not paper over it)

We observe **actual** tokens used and **actual** tier picked. We never directly observe the
**optimal** budget or the **cheapest sufficient** tier. The label is a counterfactual. Our strategy:

- **Budget label** = `tokens_used` (always observed) **annotated** with an `outcome` flag:
  - `starved` — ran out / needed compaction / failed for length (the observed count is a *lower bound*
    on what was needed, not the right answer);
  - `wasteful` — a large tier ran a tiny job (the observed count is fine but the tier was over-kill);
  - `success` — completed correctly at the observed count (the count is a usable target);
  - `failed` — failed for non-length reasons (count is noise);
  - `unknown` — no outcome signal (weak example).
- **Tier label** = `cheapest_sufficient_tier` **only where a cascade was actually observed**
  (same task tried on a cheaper tier first). Otherwise `tier_used` + the `outcome` quality flag, with
  `cheapest_sufficient_tier = null` and `weak_label = true`.
- **Outcome quality** comes from **real** signals (§5). No outcome signal ⇒ `weak_label = true`,
  `outcome = "unknown"`. We never promote a guess to ground truth.

This honesty is the whole point. A budgeter trained as if `tokens_used` were always the right target
would confidently under-budget every task that was *already* starved.

---

## 3. The dispatch record (grain)

Primary grain = **subagent dispatch** = one `subagents/agent-<id>.jsonl` transcript. This is role-os's
"per dispatch" unit and carries the full feature vector. Measured population on this rig: **1038**
agent transcripts across all projects.

Secondary grain = **top-level session** (`<uuid>.jsonl`, 178 of them). Sessions are the **only place
auto-compaction is observable** (subagents run in one large window and almost never compact). We
harvest sessions as a supplementary set tagged `grain:"session"` so the compaction label has real
positives. Measured: **12 `auto` + 11 `manual`** compaction events across all 178 sessions — compaction
is a **rare, sparse-positive** label, not a dense one. `peak_context_tokens` is the always-available
continuous pressure feature that stands in for it on the dense majority.

---

## 4. Features (observable from the transcript, no join needed)

Extracted per dispatch from the `message.usage` blocks and `message.model`:

- `context_tokens` — initial context at dispatch = first assistant turn's
  `input + cache_read + cache_creation` (the budgeter's **input** feature, known *before* the dispatch).
  Measured p50 ≈ 38k, p90 ≈ 43k.
- `tokens_used` — Σ `output_tokens` over the dispatch's assistant turns (the cost the budget caps).
  Measured p50 ≈ 13k, p90 ≈ 35k, max ≈ 65k.
- `peak_context_tokens` — max over turns of `input+cache_read+cache_creation` (compaction pressure).
  Measured p50 ≈ 100k, p90 ≈ 232k.
- `num_turns` — assistant-message count (length/complexity proxy). p50 ≈ 56.
- `tier_used` — `message.model` (mode across turns). Real diversity in corpus: opus-4-7/4-8,
  sonnet-4-6, haiku-4-5, opus-4-6.
- `final_stop_reason` — last assistant `stop_reason`. `max_tokens` ⇒ output-starved; `null` (≈22% of
  transcripts) ⇒ uncertain completion (a **weak** signal, not an outcome — the real outcome is the join).
- `complexity_signals` — derived, non-sensitive: `task_text_len`, `num_tool_results`, presence of
  large pasted artifacts, `attribution_agent` (subagent_type: general-purpose/Explore),
  `attribution_skill` (dogfood-swarm/swarm-control-plane/...), parsed `domain`/`wave`/`phase`/`action`.

---

## 5. The join (the part most likely to be wrong)

There is **no hard foreign key** from a Claude dispatch to an outcome row. Confirmed by probe:
`agent_runs` in the swarm DB has **no** session/agent/transcript id, and `started_at`/`completed_at`
are often null. The join is **fuzzy and multi-key**. Every joined label carries a `join_confidence`.

**Outcome sources** (mapped on this rig):

| Source | Location | Outcome field | Join keys to a dispatch |
|---|---|---|---|
| dogfood-swarm | `E:/AI/dogfood-labs/swarms/control-plane.db` | `agent_runs.status` ∈ {complete, failed, timed_out, invalid_output, ownership_violation}; `verification_receipts.passed` | `runs.local_path`↔`cwd`, `runs.branch`↔`gitBranch`, `waves.phase`+`wave_number`+`domains.name` ↔ parsed from `task_text`, time-window ↔ `timestamp` |
| role-os mission | `<packet>.verdict.md`, `<packet>.citation-receipt.json` next to packets | verdict ∈ {accept, accept-with-notes, reject, blocked}; `.pass` | task id / wave / domain / file mtime |
| code-review | `E:/AI/readouts/<kb>/waves/wave-*/family-verdicts.json` | verdict ∈ {confirmed, cant_confirm, refuted} | kb name + wave number |

**Scale reality:** the swarm DB holds **58** `agent_runs` total. Even a perfect join labels at most
~58 dispatches `outcome_source:"dogfood"`. The other ~980 dispatches are **not** externally labelled —
their budget/tier are still observed (§4), and their `outcome` is either transcript-derived
(`starved`/`wasteful` from §4 internal signals) or `unknown`. **This is expected and honest.**

**Join confidence tiers** (recorded per record as `join_confidence`):

- `exact` — `cwd`+`gitBranch`+`commit_sha` match a run AND `(phase, wave_number, domain)` uniquely
  identifies one `agent_run` AND the dispatch timestamp falls inside the wave window.
- `probable` — repo + (phase, wave, domain) match but timestamp window is loose or domain inferred.
- `weak` — only repo/skill match; outcome borrowed at the wave level.
- `none` — no external match; outcome is transcript-derived or `unknown`.

`outcome_source` ∈ `{dogfood, code-review, mission, transcript, none}`. **Deviation from the kickoff
contract:** the kickoff enum omits `transcript`. We add it because the `starved`/`wasteful` flags are
*defined* by transcript-internal evidence (max_tokens / auto-compaction / large-tier-tiny-output),
which is legitimate outcome evidence for the *budget* label even when no external receipt exists.
`weak_label` is still set for these. Documented here so the deviation is explicit, not silent.

---

## 6. Cost asymmetry (locked)

Under-budget ≫ over-budget. Running out mid-task = lost work; over-provisioning = some wasted tokens.
Each record carries a `cost_weight` so training/eval up-weights the dangerous error:

- false-"enough" (predicted sufficient, actually `starved`) → weight **5×** (Wang 2025, arXiv:2510.22016)
- false-"not-enough" (predicted insufficient, actually fine) → weight **1×**

The eval is **not** balanced accuracy. It is **cost-at-fixed-quality** (FrugalGPT framing): "matched
quality at X% of the generalist-default cost," with the 5:1 FP:FN asymmetry baked into the cost.

---

## 7. The sanity gate — deterministic baseline (record it now)

A learned budgeter only earns its keep if it beats a deterministic baseline. We compute and store the
baseline's prediction **per record** so the later eval is honest and reproducible:

- `baseline_budget = max(context_tokens * 1.5, 50_000)`
- `baseline_tier` = small rule table (context/role → tier), defined in `harvester/baseline.py`.

**Ship gate:** the specialist must beat this baseline by **≥10% cost at equal quality** on the
certification exam, or v0.1 ships the deterministic policy and the weights wait. *(Experimental
hygiene, not a cited result — stated as such.)*

---

## 8. Splits (same discipline as the Verifier)

- **Certification exam** — frozen, human-reviewed slice; the level-progression metric set. The
  highest-uncertainty labels (the counterfactual `starved`/`wasteful` calls) are queued for human
  review **before** freeze. Exam set hash is pinned in the manifest.
- **Field audit** — rolling slice from dispatches *after* each training cutoff. Exam↔audit divergence
  is the overfitting/contamination alarm.
- **Train** — everything else.

**Discipline:** exam is **temporally disjoint** from train (split on dispatch `timestamp`, exam =
newest frozen window) and **never** sampled into the training pool. The manifest step runs a
**contamination check that hard-fails the build** if any `dispatch_id` appears in both exam and train
(ANDON, §12).

---

## 9. Scrub (privacy — load-bearing, hard-gated)

Transcripts and logs contain real work: secrets, absolute paths, PII, proprietary game canon.
Training data is forever. The scrub pass runs **before any record leaves role-os**:

1. **Redact credential patterns** — API keys, bearer tokens, AWS keys, private-key blocks, passwords,
   `gh` tokens, connection strings.
2. **Redact absolute paths** — `E:\...`, `C:\Users\mikey\...`, `/Users/...`, `/home/...` → `<PATH>`.
3. **Redact emails / the author email.**
4. **Strip large embedded artifacts** — a pasted file/blob over a threshold becomes
   `[ARTIFACT len=N kind=…]`, keeping the **length feature**, dropping the content.
5. **Canon repos** (`star-freight*`, `saints-mile`, `the-fractured-road`, `motif`, `style-dataset-lab`):
   `task_text` body is reduced to features (len + structural signals + first 200 scrubbed chars);
   full verbatim is dropped. Proprietary canon does not enter the corpus.

**ANDON:** after scrub, a verifier re-scans every output record for surviving secret patterns. **Any
hit hard-fails the build** (no partial corpus is written). Scrub counts by category go in the manifest.

---

## 10. Corpus schema (the contract)

One JSON object per line (`corpus.jsonl`). Kickoff contract fields **plus** the honest additions
(§5, §3, §6, §7), each justified above:

```jsonc
{
  "dispatch_id": "agent-a0bc…",          // = agentId (subagent) | sessionId (session grain)
  "grain": "subagent",                    // "subagent" | "session"
  "source_file": "<PATH redacted>",       // provenance (scrubbed)
  "harvester_version": "0.1.0",           // PIN_PER_STEP
  "timestamp": "2026-05-12T08:24:…Z",     // dispatch start (for temporal split)
  "cwd_repo": "role-os",                   // repo basename only (path scrubbed)
  "git_branch": "token-budget-dataset",

  "task_text": "<scrubbed task prompt>",  // feature; canon-repo → features only
  "task_text_len": 4631,
  "role": "CI/DOCS",                       // parsed domain | attribution | null
  "attribution_agent": "general-purpose",
  "attribution_skill": "dogfood-swarm",
  "context_tokens": 49130,                 // INPUT feature (pre-dispatch)
  "complexity_signals": { "num_turns": 56, "num_tool_results": 12, "has_large_artifact": false,
                          "phase": "health-audit-a", "wave": 1, "action": "audit" },

  "tokens_used": 13062,                    // observed (Σ output)
  "peak_context_tokens": 100526,
  "final_stop_reason": "end_turn",
  "tier_used": "claude-opus-4-7",
  "cascade_observed": false,
  "cheapest_sufficient_tier": null,

  "compaction_observed": false,            // auto-compaction during dispatch (session grain mostly)
  "compaction_trigger": null,              // "auto" | "manual" | null
  "pre_compaction_tokens": null,

  "outcome": "success",                    // success|starved|wasteful|failed|unknown
  "outcome_source": "dogfood",             // dogfood|code-review|mission|transcript|none
  "join_confidence": "probable",           // exact|probable|weak|none
  "weak_label": false,
  "cost_weight": 1.0,                      // 5.0 for false-"enough" risk class

  "baseline_budget": 73695,                // max(context*1.5, 50000)
  "baseline_tier": "sonnet"                // rule-table prediction
}
```

Field count and meanings are pinned by `harvester/schema.py`; the manifest records the schema hash.

---

## 11. Corpus → training conversion (for the later kickoff)

The Token Budget Analyst is a **predictor**, not an instruction-tuned chat model. backpropagate /
[[repo-dataset]] consume `(prompt → completion)` pairs (alpaca/chatml/sharegpt). At training time a
thin converter maps each corpus record to:

- **prompt** = serialized features (`task_text` + `role` + `context_tokens` + `complexity_signals`)
- **completion** = the structured label JSON (`{budget, tier_probs, cascade, compaction}`), where the
  conformal interval and OvA probabilities are computed from the calibration split, **not** copied
  from a single record.

We do **not** freeze the alpaca shape now (the kickoff: "confirm backpropagate's expected
training-data shape before fixing the corpus format"). The rich JSONL above is the intermediate;
conversion + conformal calibration belong to `KICKOFF-specialist-training.md`.

---

## 11b. Known limitations (v0.1) — measured on the real build, not hypothetical

These come from the actual `manifest.json` of the first full build (1217 records). Surfaced here so
the training kickoff inherits the caveats instead of rediscovering them (no silent caps):

1. **Tier label is opus-dominated (1140/1217 ≈ 94% opus; 32 sonnet, 29 haiku).** Mike runs almost
   everything on Opus, so the corpus has very few examples of *"a cheaper tier was sufficient."* The
   **budget regression** (on `tokens_used`) is well-supported; the **tier OvA** and especially the
   **cascade / `cheapest_sufficient_tier`** signal are weak by data scarcity. The deterministic
   `baseline_tier` table may be hard to beat on tier until more cheap-tier dispatches accumulate via
   the field audit. State this in the eval; don't claim a tier win the data can't support.
2. **External gold is sparse and concentrated in `train`, not `exam`.** 6 `exact` + 9 `probable` +
   154 `weak` = 169/1217 (≈14%) carry an external (`dogfood`) label; only 6 are gold (`weak_label:false`).
   They come from the 05-21 backpropagate and 06-02 prism swarms — *old* dispatches that land in `train`.
   The temporal `exam` (newest 15%) therefore has **no external gold**; its gold must be produced by the
   **human-review pass** over `human_review_queue.jsonl` (§8). This is by design (exam is "human-reviewed"),
   not a defect — but it means the certification metric depends on that human pass existing.
3. **Most `success` labels are WEAK (`outcome_source:"transcript"`, 800/1217).** A clean `end_turn`
   means "completed without running out," **not** "did the task correctly." Only the externally-joined
   records assert task-quality. Treat transcript-`success` as a budget signal, not a quality signal.
4. **Compaction positives are rare (19 total, 14 `auto`).** The compaction classifier (label d) is a
   sparse-positive problem; lean on `peak_context_tokens` as the continuous feature and expect the
   binary label to need the field audit to grow.
5. **The join is day-level, not sub-day** (UTC-vs-local timestamp mismatch, §5). It pins the *run*
   reliably (runs are days apart, one per repo in the current DB) but does not claim to pin the exact
   minute. Receipts that the join does not over-claim: `test_harvester.py::test_join_does_not_overclaim`.

**Receipts.** `test_harvester.py` (run `python test_harvester.py`, exits non-zero on failure) proves:
all 7 secret classes are redacted with no ANDON survivor; ANDON catches an un-scrubbed secret;
contamination hard-fails on overlap; canon truncation fires; the join pins the time-correct run and
refuses to exact-match wave/domain coincidence. These are the receipts behind the #2 score below.

---

## 12. Standards compliance (per workflow-standards.md)

| # | Standard | Score | Evidence |
|---|---|---|---|
| 1 | PIN_PER_STEP | 3 | Each record pins `dispatch_id` + `source_file` + `harvester_version`; corpus + exam-set hashes frozen in the manifest. |
| 2 | ANDON_AUTHORITY | 3 | Scrub re-scan hard-fails the build on any surviving secret (§9). Exam↔train contamination check hard-fails the build (§8). Both are raising stages, not warnings, and `build.py` writes **nothing** until both pass. **Receipts:** `test_harvester.py` proves both gates fire. |
| 3 | NAMED_COMPENSATORS | 3 | Local versioned files only; all sources read **read-only**. Compensator = delete the version dir / `git revert`. No external irreversible action. |
| 4 | DECOMPOSE_BY_SECRETS | 3 | Stages each hide one concern: `locate` (where) · `parse_*` (per-source format) · `join` (fuzzy match) · `scrub` (privacy) · `label` (outcome policy) · `split` (exam discipline) · `manifest` (provenance). |
| 5 | UNCERTAINTY_GATED_HUMANS | 3 | The exam slice is human-reviewed; the highest-uncertainty labels (counterfactual `starved`/`wasteful`) are queued for human check **before** freeze. |
| 6 | EXTERNAL_VERIFIER | 2 | The budgeter's base is cross-family (non-Claude) — consistent with #6 by construction. Held at 2 because outcome labels partly derive from the same dispatches it predicts; **remediation:** hold out one outcome-label source (mission pass/fail) never used as a feature (owner: dataset maintainer). |

**Compensators (no-skip check):** local dataset files only; all sources read-only; no
publish/release/tag/repo-edit/Pages deploy. Fully reversible by `rm -r dataset/<version>/` or
`git revert`. No compensator table of irreversible actions is required because the harvester performs
none.

---

## 13. Build order (this kickoff)

1. `locate` + `parse` for the **agent-transcript** source → harvest a **small sample**.
2. **Inspect the join** to the swarm DB on that sample before scaling.
3. Scale parse to all sources.
4. `scrub` → `label` → `split` → `manifest`.
5. Record the deterministic baseline per record.
6. Freeze exam-set hash; queue uncertain labels for human review.

Out of scope: training, gate/dispatch wiring, live token accounting.
