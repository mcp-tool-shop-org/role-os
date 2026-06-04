"""Stage: freeze — fold human-review verdicts into the frozen certification exam.

Input: `exam_resolved.jsonl` exported by review-ui/index.html (one object per reviewed
record; keys per REVIEW_UI_PROMPT.md export contract). For each resolved record the
human label is GOLD: outcome = human_outcome, outcome_source = "human",
weak_label = False. The frozen exam is the human-resolved subset only.

ANDON: a resolved id that lands in `train` (would contaminate the exam) or a bad
human_outcome value hard-fails. Read-only on corpus; writes exam.jsonl + a report.

Run:  python -m harvester.freeze <exam_resolved.jsonl>   (from tools/token-budget-dataset/)
"""
import collections
import json
import os
import sys

from . import config, schema
from .manifest import AndonHalt, _hash_records


def _load_jsonl(path):
    out = []
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except Exception:
                    pass
    return out


def freeze(resolved_path, v_dir=None):
    v_dir = v_dir or os.path.join(config.DATASET_ROOT, "v0.1")
    resolved = _load_jsonl(resolved_path)
    if not resolved:
        raise AndonHalt(f"no resolved verdicts in {resolved_path} — nothing to freeze")

    corpus = {r["dispatch_id"]: r for r in _load_jsonl(os.path.join(v_dir, "corpus.jsonl"))}
    train_ids = {r["dispatch_id"] for r in _load_jsonl(os.path.join(v_dir, "train.jsonl"))}
    exam_pool_ids = {r["dispatch_id"] for r in _load_jsonl(os.path.join(v_dir, "exam_pool.jsonl"))}

    frozen, strays, contaminating = [], [], []
    confirmed = overrode = 0
    for v in resolved:
        did = v.get("dispatch_id")
        ho = v.get("human_outcome")
        if ho not in schema.OUTCOME_VALUES:
            raise AndonHalt(f"bad human_outcome {ho!r} for {did}")
        if did not in corpus:
            strays.append(did)
            continue
        if did in train_ids:                       # ANDON: never certify a train record
            contaminating.append(did)
            continue
        rec = dict(corpus[did])
        rec["outcome"] = ho
        rec["outcome_source"] = "human"
        rec["weak_label"] = False                  # human-resolved = gold
        rec["cost_weight"] = config.COST_WEIGHT_STARVED if ho == "starved" else config.COST_WEIGHT_DEFAULT
        note = (v.get("note") or "").strip()
        who = v.get("reviewer") or "anon"
        rec["label_reason"] = f"human review ({who}): {ho}" + (f" — {note}" if note else "")
        frozen.append(rec)
        if v.get("confirmed"):
            confirmed += 1
        else:
            overrode += 1

    if contaminating:
        raise AndonHalt(f"{len(contaminating)} resolved ids are in TRAIN — exam contamination: {contaminating[:5]}")
    if {r["dispatch_id"] for r in frozen} & train_ids:
        raise AndonHalt("frozen exam overlaps train")

    out_path = os.path.join(v_dir, "exam.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for r in frozen:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    report = {
        "frozen_exam": len(frozen),
        "confirmed": confirmed,
        "overrode": overrode,
        "agreement_rate": round(confirmed / max(1, len(frozen)), 3),
        "in_exam_pool": sum(1 for r in frozen if r["dispatch_id"] in exam_pool_ids),
        "strays_not_in_corpus": len(strays),
        "outcome_dist": dict(collections.Counter(r["outcome"] for r in frozen)),
        "exam_hash": _hash_records(frozen),
    }
    with open(os.path.join(v_dir, "exam_freeze_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report


def main():
    if len(sys.argv) < 2:
        print("usage: python -m harvester.freeze <exam_resolved.jsonl>")
        sys.exit(2)
    rep = freeze(sys.argv[1])
    print("froze exam:", json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()
