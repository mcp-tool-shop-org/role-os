# Claude Design prompt — exam review UI

Paste everything in the fenced block below into Claude Design (claude.ai/design). It produces a
single offline `index.html`. The harvester writes the input it consumes
(`dataset/v0.1/human_review_queue.jsonl`, 180 rows) and reads back its export
(`exam_resolved.jsonl`) — the **export contract** at the bottom is the integration seam; the returned
HTML must honor it exactly (especially `dispatch_id`, the join key).

---

```
Build a single, self-contained, fully OFFLINE web app in ONE index.html file (inline CSS + vanilla
JS, no frameworks, no build step, no CDN, no network requests, NO AI/model calls — it must run by
double-clicking the file). It is a fast, keyboard-driven tool for a human to review and label a queue
of "dispatch" records one at a time, then export the results.

PURPOSE
Each record is one AI "dispatch" (an agent task that ran). For each, an automated harvester has
pre-filled a guess at the OUTCOME of its token SPEND. A human reviewer confirms or overrides that
guess. The point is honest labels for a training dataset, so make the harvester's guess and its
reasoning prominent, and make confirming or overriding a single keystroke.

INPUT
The user clicks "Load queue" and picks a .jsonl file (one JSON object per line; skip malformed lines
and show a count of any skipped). Never upload or mutate the file. Each object looks like this
(two synthetic samples — real data is loaded at runtime, do not hardcode it):

{"dispatch_id":"agent-EXAMPLE0001","grain":"subagent","cwd_repo":"demo-service","timestamp":"2026-06-03T14:22:05Z","task_text":"You are the DOCS domain agent. Audit the README and CONTRIBUTING for broken links and stale version badges, then propose fixes.","task_text_len":118,"role":"DOCS","attribution_skill":"dogfood-swarm","context_tokens":41200,"complexity_signals":{"num_turns":54,"num_tool_results":31,"has_large_artifact":false,"phase":"stage-a","wave":"2","action":"audit"},"cost_weighted_spend":948756,"input_tokens_total":5120,"cache_creation_total":210400,"cache_read_total":3980000,"output_tokens_total":12840,"outcome":"success","outcome_source":"transcript","join_confidence":"none","weak_label":true,"cost_weight":1.0,"label_reason":"ended cleanly (end_turn) at 948,756 weighted spend — completion only, task quality unverified","baseline_spend":61800,"peak_context_tokens":104300,"final_stop_reason":"end_turn","tier_used":"opus","compaction_observed":false,"compaction_trigger":null}
{"dispatch_id":"agent-EXAMPLE0002","grain":"session","cwd_repo":"demo-service","timestamp":"2026-06-03T19:40:12Z","task_text":"Refactor the payments module end to end and migrate every call site, with tests.","task_text_len":80,"role":null,"attribution_skill":null,"context_tokens":38900,"complexity_signals":{"num_turns":410,"num_tool_results":null,"has_large_artifact":true,"phase":null,"wave":null,"action":"refactor"},"cost_weighted_spend":58200000,"input_tokens_total":402000,"cache_creation_total":9100000,"cache_read_total":410000000,"output_tokens_total":1820000,"outcome":"starved","outcome_source":"transcript","join_confidence":"none","weak_label":true,"cost_weight":5.0,"label_reason":"observed spend is a LOWER bound — forced an auto-compaction, peak context near the 1M ceiling","baseline_spend":58350,"peak_context_tokens":963000,"final_stop_reason":"tool_use","tier_used":"opus","compaction_observed":true,"compaction_trigger":"auto"}

THE REVIEWER'S DECISION (per record)
Confirm or correct the `outcome`. The five outcomes, in plain terms:
- success  — the spend was right-sized; the dispatch finished cleanly and the token count is a good target.
- starved  — it ran out / had to compact / was cut off for length; the observed spend is only a LOWER bound.
- wasteful — it burned a large spend for very little output (cache churn / overhead); over-provisioned.
- failed   — it failed for non-length reasons; the token count is noise.
- unknown  — not enough signal to say.
Show the pre-filled `outcome` and its `label_reason` prominently, framed contrastively, e.g.
"Harvester thinks: SUCCESS — <label_reason>. Confirm, or override:". Highlight the pre-filled choice.

UI (one record at a time, calm dark technical dashboard, monospace accents, high contrast, keyboard-first)
1. Header: progress "12 / 180", a progress bar, counts of confirmed vs overridden so far, and Load/Export buttons.
2. The harvester's guess banner (big): the outcome + its label_reason, with the matching verdict button highlighted.
3. SPEND BREAKDOWN — the centerpiece. A horizontal stacked bar showing WHERE the cost-weighted spend
   went, using these weights: output×5, cache_creation×1.25, cache_read×0.1, input×1. Compute each
   segment = component_total × weight, label each segment with its name and its weighted value, and
   show the total = cost_weighted_spend. Make it obvious when cache_read dominates (it often does — that
   is the key insight). Also show raw output_tokens_total next to it so the gap between "raw output" and
   "real weighted cost" is visible.
4. Facts panel (compact, monospace): context_tokens, peak_context_tokens, num_turns (from
   complexity_signals), tier_used, final_stop_reason, compaction_observed/trigger, grain, cwd_repo,
   outcome_source, join_confidence, weak_label, baseline_spend. If outcome_source is not "transcript",
   badge it as "external evidence (join_confidence)".
5. task_text in a collapsible monospace block (can be long; default collapsed to ~6 lines with expand).
6. Verdict bar + an optional one-line note field.

KEYBOARD (show a legend)
- Enter or C : confirm the pre-filled guess
- 1: success   2: starved   3: wasteful   4: failed   5: unknown
- N: focus the note field    →: skip (no verdict)    ←: previous record
After a verdict, auto-advance to the next un-reviewed record.

RESUMABLE
Persist each verdict to localStorage keyed by dispatch_id. On reload, restore progress and jump to the
first un-reviewed record. Show "Already reviewed: X" and allow re-reviewing a record (overwrite).

EXPORT
An "Export resolved" button downloads a file named exam_resolved.jsonl — one JSON object per REVIEWED
record, with EXACTLY these keys (preserve dispatch_id verbatim — it is the join key):
{"dispatch_id": <string, unchanged>, "harvester_outcome": <the original outcome>, "human_outcome":
<the reviewer's choice>, "confirmed": <true if human_outcome == harvester_outcome else false>, "note":
<string, "" if none>, "reviewed_at": <ISO 8601 timestamp>, "reviewer": <string from a small reviewer-name
input, default "">}.
Also show an on-screen summary: total reviewed, confirmed vs overridden, and the human_outcome distribution.

QUALITY
Vanilla JS only, accessible (real buttons, ARIA labels, focus states), keyboard-first, no external
requests of any kind, graceful with malformed/missing fields (show "—"), and it must work opened
directly from disk. Keep it one file.
```

---

## Export contract (integration seam — what the harvester's freeze step reads back)

The returned `index.html` must export `exam_resolved.jsonl` with one object per reviewed record:

| key | type | meaning |
|---|---|---|
| `dispatch_id` | string | **unchanged** from input — the join key back to `corpus.jsonl` |
| `harvester_outcome` | string | the original pre-filled `outcome` |
| `human_outcome` | string | one of success / starved / wasteful / failed / unknown |
| `confirmed` | bool | `human_outcome == harvester_outcome` |
| `note` | string | optional reviewer note (`""` if none) |
| `reviewed_at` | ISO 8601 | when reviewed |
| `reviewer` | string | reviewer name (`""` if blank) |

When you send the HTML (and/or an `exam_resolved.jsonl` you produced with it) back, the harvester's
freeze step joins on `dispatch_id`, overwrites `outcome`/`outcome_source="human"`/`weak_label=false`
for resolved records, and writes the frozen `exam.jsonl` + its hash.
