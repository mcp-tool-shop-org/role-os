"""Corpus record schema (the contract). Pinned field list + a stable hash so the
manifest can record exactly which schema produced a corpus (PIN_PER_STEP)."""
import hashlib
import json

# Ordered field list = the contract in DESIGN.md §10. Changing this changes the
# schema hash, which the manifest records — that is intentional.
FIELDS = [
    # identity / provenance
    "dispatch_id", "grain", "source_file", "harvester_version", "timestamp",
    "cwd_repo", "git_branch",
    # features (input, known pre-dispatch)
    "task_text", "task_text_len", "role", "attribution_agent", "attribution_skill",
    "context_tokens", "complexity_signals",
    # === v0.1 PREDICTION TARGET: cost-weighted token spend ===
    "cost_weighted_spend",              # the budget the analyst predicts (conformal at train time)
    "input_tokens_total", "cache_creation_total", "cache_read_total", "output_tokens_total",
    # outcome (counterfactual-honest annotation of the spend target)
    "outcome", "outcome_source", "join_confidence", "weak_label", "cost_weight",
    "label_reason",                     # short human-readable rationale (contrastive review)
    # deterministic baseline (sanity gate) — predicts cost_weighted_spend
    "baseline_spend",
    # === RECORDED METADATA (not a v0.1 target; kept for later use) ===
    "peak_context_tokens", "final_stop_reason",
    "tier_used",                        # metadata: enables a future Claude-vs-local lever
    "compaction_observed", "compaction_trigger", "pre_compaction_tokens",  # future v2 target
]

OUTCOME_VALUES = {"success", "starved", "wasteful", "failed", "unknown"}
OUTCOME_SOURCE_VALUES = {"dogfood", "code-review", "mission", "transcript", "none"}
JOIN_CONFIDENCE_VALUES = {"exact", "probable", "weak", "none"}
GRAIN_VALUES = {"subagent", "session"}


def schema_hash() -> str:
    return hashlib.sha256(json.dumps(FIELDS, sort_keys=True).encode()).hexdigest()[:16]


def empty_record() -> dict:
    return {f: None for f in FIELDS}


def validate(rec: dict) -> list[str]:
    """Return a list of problems (empty = valid). Cheap structural gate."""
    problems = []
    missing = [f for f in FIELDS if f not in rec]
    if missing:
        problems.append(f"missing fields: {missing}")
    if rec.get("outcome") not in OUTCOME_VALUES:
        problems.append(f"bad outcome: {rec.get('outcome')!r}")
    if rec.get("outcome_source") not in OUTCOME_SOURCE_VALUES:
        problems.append(f"bad outcome_source: {rec.get('outcome_source')!r}")
    if rec.get("join_confidence") not in JOIN_CONFIDENCE_VALUES:
        problems.append(f"bad join_confidence: {rec.get('join_confidence')!r}")
    if rec.get("grain") not in GRAIN_VALUES:
        problems.append(f"bad grain: {rec.get('grain')!r}")
    return problems
