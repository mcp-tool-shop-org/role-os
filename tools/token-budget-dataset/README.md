# Token Budget Analyst — dataset harvester

Builds the training **dataset** for specialist #2 (the Token Budget Analyst) of the
[specialist tier](../../../). The analyst backs role-os's dispatcher: given
`(task, role, context size, complexity signals)` it predicts the **cost-weighted token spend** of a
dispatch (with an interval) — token *economics*, model held fixed (not model-tier selection). **This
directory is dataset-only** — no training, no gate wiring, no live token accounting (later kickoffs).

Not shipped in the npm package (role-os `files` excludes `tools/`). Stdlib-only Python (no pip,
no GPU). All sources are read **read-only**.

## What it does

Harvests Claude Code **subagent transcripts** (one per dispatch) + **session transcripts** (where
compaction is observable), joins them to **outcome receipts** (dogfood swarm DB, role-os mission
verdicts, readouts code-review verdicts), derives **counterfactual-honest** labels, **scrubs**
secrets/paths/PII/canon, splits **exam / field-audit / train**, and writes a hashed **manifest**.

Read `DESIGN.md` first — it explains the label model, the fuzzy-join confidence tiers, the cost
asymmetry, the deterministic baseline (the ship gate), and the honest limitations measured on the
real build.

## Run

```bash
# from this directory
python -m harvester.build                  # full build -> dataset/v0.1/
python -m harvester.build --sample 120     # quick smoke run
python -m harvester.inspect_sample 1039    # locate+parse+join report, writes nothing
python test_harvester.py                   # self-tests / ANDON + join receipts (exit!=0 on fail)
```

## Stages (each hides one concern — DECOMPOSE_BY_SECRETS)

| Stage | File | Concern |
|---|---|---|
| locate | `harvester/locate.py` | where the data lives |
| parse (transcripts) | `harvester/parse_transcripts.py` | the JSONL transcript format |
| parse (outcomes) | `harvester/parse_outcomes.py` | each outcome source's format |
| join | `harvester/join.py` | the fuzzy multi-key match + confidence |
| label | `harvester/label.py` | outcome policy, cost weight, baseline, cascade |
| scrub | `harvester/scrub.py` | privacy + the ANDON secret re-scan |
| split | `harvester/split.py` | exam/audit/train + the human-review gate |
| manifest | `harvester/manifest.py` | provenance, hashes, contamination hard-fail |
| build | `harvester/build.py` | orchestration; writes nothing until both ANDON gates pass |

## Output (local, git-ignored, regenerable)

`dataset/v0.1/`: `corpus.jsonl`, `train.jsonl`, `audit.jsonl`, `exam_pool.jsonl`,
`human_review_queue.jsonl`, `manifest.json`. The corpus is **not** committed to this public repo
(even scrubbed, it is internal operational data); it regenerates from the harvester. The harvester
**code** is tracked.

## Safety

- Sources read-only; only local files written. **Compensator:** `rm -r dataset/v0.1/` (or `git revert`).
- ANDON: a surviving secret pattern OR an exam↔train id overlap **hard-fails the build** — no partial
  corpus is written. Proven by `test_harvester.py`.

## Next

Hand `dataset/v0.1/` to [[backpropagate]] in the training kickoff (`KICKOFF-specialist-training.md`).
The conformal interval + OvA tier probabilities are computed there from a calibration split — the
corpus is the observation layer, not pre-baked predictions (DESIGN.md §1, §11).
