"""Stage: split — exam / field-audit / train, with the discipline from DESIGN.md §8.
Hides one concern: split policy + the human-review gate (workflow-standard #5).

Exam is the NEWEST frozen time window and is temporally disjoint from train. The
harvester does NOT auto-freeze the exam as ground truth — it emits an exam POOL and a
human-review queue of the highest-uncertainty labels; the frozen exam is the
human-resolved subset (UNCERTAINTY_GATED_HUMANS).
"""
from . import config


def _ts_key(rec):
    return rec.get("timestamp") or ""


def needs_human_review(rec) -> bool:
    """The highest-uncertainty labels gate on a human before exam freeze."""
    return (
        rec.get("weak_label", True)
        or rec.get("outcome") in ("starved", "wasteful")
        or rec.get("join_confidence") in ("probable", "weak")
    )


def split_records(records: list[dict]) -> dict:
    dated = [r for r in records if r.get("timestamp")]
    undated = [r for r in records if not r.get("timestamp")]
    dated.sort(key=_ts_key)  # oldest -> newest (ISO8601 UTC sorts lexically)

    n = len(dated)
    n_exam = int(n * config.EXAM_FRACTION)
    n_audit = int(n * config.AUDIT_FRACTION)
    exam = dated[n - n_exam:] if n_exam else []
    audit = dated[n - n_exam - n_audit: n - n_exam] if n_audit else []
    train = dated[: n - n_exam - n_audit] + undated  # undated never enters exam

    review_queue = [r for r in exam if needs_human_review(r)]
    return {"exam_pool": exam, "audit": audit, "train": train,
            "review_queue": review_queue}
