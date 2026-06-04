"""Orchestrator: locate -> parse -> join -> label -> scrub -> split -> manifest.

Nothing is written until BOTH andon gates pass (secret re-scan + exam/train
contamination). Read-only on all sources. Local files only; compensator = delete
the version dir.

Run:  python -m harvester.build [--sample N] [--out DIR]   (from tools/token-budget-dataset/)
"""
import argparse
import datetime as _dt
import json
import os

from . import (config, locate, parse_transcripts, parse_outcomes, join,
               label, scrub, split, schema, manifest)


def _finalize(rec: dict) -> dict:
    return {f: rec.get(f) for f in schema.FIELDS}


def _write_jsonl(path, records):
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def run(sample=None, out_dir=None):
    out_dir = out_dir or os.path.join(config.DATASET_ROOT, "v0.1")
    loc = locate.summary()
    print("locate:", loc)

    # --- parse ---
    agent_files = locate.agent_transcripts()
    sess_files = locate.session_transcripts()
    if sample:
        agent_files = agent_files[:: max(1, len(agent_files) // sample)][:sample]
        sess_files = sess_files[:: max(1, len(sess_files) // max(1, sample // 5))][:max(1, sample // 5)]

    records = []
    for fp in agent_files:
        d = parse_transcripts.parse_agent_transcript(fp)
        if d:
            records.append(d)
    for fp in sess_files:
        d = parse_transcripts.parse_session_transcript(fp)
        if d:
            records.append(d)
    print(f"parsed: {len(records)} records "
          f"({sum(r['grain']=='subagent' for r in records)} subagent / "
          f"{sum(r['grain']=='session' for r in records)} session)")

    # --- join ---
    swarm = parse_outcomes.load_swarm_outcomes()
    idx = join.build_swarm_index(swarm)
    for r in records:
        jr = join.join_dispatch(r, idx)
        label.apply_label(r, jr)

    # --- scrub (in memory) ---
    scrub_counts = {}
    scrubbed = [scrub.scrub_record(r, scrub_counts) for r in records]

    # --- ANDON #1: secret re-scan. Hard-fail before ANY write. ---
    survivors = scrub.andon_rescan(scrubbed)
    if survivors:
        raise manifest.AndonHalt(
            f"scrub leaked {len(survivors)} secret pattern(s); build halted, nothing written. "
            f"first: {survivors[:3]}")

    final = [_finalize(r) for r in scrubbed]

    # cheap structural validation on a sample
    problems = []
    for r in final[:50]:
        problems += schema.validate(r)
    if problems:
        raise manifest.AndonHalt(f"schema validation failed: {problems[:5]}")

    # --- split ---
    splits = split.split_records(final)

    # --- ANDON #2: contamination. Hard-fail before ANY write. ---
    manifest.contamination_check(splits)

    # --- write (only now that both gates passed) ---
    os.makedirs(out_dir, exist_ok=True)
    _write_jsonl(os.path.join(out_dir, "corpus.jsonl"), final)
    _write_jsonl(os.path.join(out_dir, "train.jsonl"), splits["train"])
    _write_jsonl(os.path.join(out_dir, "audit.jsonl"), splits["audit"])
    _write_jsonl(os.path.join(out_dir, "exam_pool.jsonl"), splits["exam_pool"])
    _write_jsonl(os.path.join(out_dir, "human_review_queue.jsonl"), splits["review_queue"])

    built_at = _dt.datetime.now().isoformat(timespec="seconds")
    man = manifest.build_manifest(final, splits, scrub_counts, loc, built_at)
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(man, f, indent=2, ensure_ascii=False)

    print(f"\nwrote {len(final)} records -> {out_dir}")
    print("  splits:", man["counts"])
    print("  label_quality:", man["label_quality"])
    print("  outcome dist:", man["distributions"]["outcome"])
    print("  scrub report:", scrub_counts)
    return man


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=None, help="cap inputs for a quick run")
    ap.add_argument("--out", type=str, default=None, help="output dir")
    args = ap.parse_args()
    run(sample=args.sample, out_dir=args.out)


if __name__ == "__main__":
    main()
