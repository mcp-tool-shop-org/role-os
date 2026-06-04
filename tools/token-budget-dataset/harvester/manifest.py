"""Stage: manifest — provenance + receipts + the contamination hard-fail.
Hides one concern: PIN_PER_STEP provenance and the ANDON contamination gate (#1,#2).
"""
import collections
import hashlib
import json

from . import config, schema


class AndonHalt(RuntimeError):
    """Raised to hard-fail the build. No partial corpus is written after this."""


def _hash_records(records) -> str:
    h = hashlib.sha256()
    for r in records:
        h.update(json.dumps(r, sort_keys=True, ensure_ascii=False).encode("utf-8"))
        h.update(b"\n")
    return h.hexdigest()[:16]


def _dist(records, field):
    return dict(collections.Counter(r.get(field) for r in records))


def contamination_check(splits: dict) -> None:
    """ANDON: exam dispatch_ids must be disjoint from train+audit. Hard-fail otherwise."""
    exam_ids = {r["dispatch_id"] for r in splits["exam_pool"]}
    other_ids = {r["dispatch_id"] for r in splits["train"]} | {r["dispatch_id"] for r in splits["audit"]}
    overlap = exam_ids & other_ids
    if overlap:
        raise AndonHalt(f"exam<->train/audit contamination: {len(overlap)} shared dispatch_ids "
                        f"e.g. {list(overlap)[:5]}")


def build_manifest(all_records, splits, scrub_counts, locate_summary, build_time_iso) -> dict:
    return {
        "dataset": "token-budget-analyst",
        "version": "v0.1",
        "harvester_version": config.HARVESTER_VERSION,
        "built_at": build_time_iso,
        "schema_hash": schema.schema_hash(),
        "schema_fields": schema.FIELDS,
        "pin_per_step": {
            "harvester_version": config.HARVESTER_VERSION,
            "transcript_root": "<redacted-local>",
            "swarm_db": "<redacted-local>",
        },
        "counts": {
            "total": len(all_records),
            "exam_pool": len(splits["exam_pool"]),
            "audit": len(splits["audit"]),
            "train": len(splits["train"]),
            "human_review_queue": len(splits["review_queue"]),
        },
        "hashes": {
            "corpus": _hash_records(all_records),
            "exam_pool": _hash_records(splits["exam_pool"]),
            "train": _hash_records(splits["train"]),
        },
        "distributions": {
            "grain": _dist(all_records, "grain"),
            "outcome": _dist(all_records, "outcome"),
            "outcome_source": _dist(all_records, "outcome_source"),
            "join_confidence": _dist(all_records, "join_confidence"),
            "tier_used": _dist(all_records, "tier_used"),
            "weak_label": _dist(all_records, "weak_label"),
            "compaction_observed": _dist(all_records, "compaction_observed"),
        },
        "label_quality": {
            "gold_records": sum(1 for r in all_records if not r.get("weak_label")),
            "weak_records": sum(1 for r in all_records if r.get("weak_label")),
            "starved": sum(1 for r in all_records if r.get("outcome") == "starved"),
            "wasteful": sum(1 for r in all_records if r.get("outcome") == "wasteful"),
            "cost_weighted_5x": sum(1 for r in all_records if r.get("cost_weight") == config.COST_WEIGHT_STARVED),
        },
        "baseline": {
            "rule": "baseline_budget = max(context*1.5, 50000); baseline_tier = rule table",
            "ship_gate": "learned budgeter must beat baseline by >=10% cost at equal quality on the exam, "
                         "or v0.1 ships the deterministic policy (experimental hygiene, not a cited result)",
            "coverage": sum(1 for r in all_records if r.get("baseline_budget")),
        },
        "scrub_report": scrub_counts,
        "andon": {
            "secret_rescan": "passed (build would hard-fail on any survivor)",
            "contamination_check": "passed (exam disjoint from train/audit)",
        },
        "sources_located": locate_summary,
        "standards_compliance": {
            "1_PIN_PER_STEP": 3, "2_ANDON_AUTHORITY": 3, "3_NAMED_COMPENSATORS": 3,
            "4_DECOMPOSE_BY_SECRETS": 3, "5_UNCERTAINTY_GATED_HUMANS": 3, "6_EXTERNAL_VERIFIER": 2,
            "note": "see DESIGN.md §12; #6 held at 2 (remediation: hold out a mission-pass/fail source from features)",
        },
        "compensator": "rm -r dataset/v0.1/  (or git revert). All sources read read-only; no external irreversible action.",
    }
