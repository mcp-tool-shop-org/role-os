"""Self-tests / receipts for the harvester. Proves the ANDON gates fire and the
fuzzy join does not over-claim. These are the receipts behind the standards-#2 and
join-correctness claims in DESIGN.md.

Run:  python test_harvester.py    (from tools/token-budget-dataset/)
Exit 0 = all pass; non-zero = a gate is broken (treat as build-blocking).
All secret literals below are OBVIOUSLY fake placeholders.
"""
import json
import os
import sys
import tempfile

from harvester import scrub, manifest, join, config, label, freeze, puzzles

FAILS = []


def check(name, cond):
    print(("  PASS " if cond else "  FAIL ") + name)
    if not cond:
        FAILS.append(name)


def test_scrub_redacts_real_secrets():
    print("test_scrub_redacts_real_secrets")
    samples = {
        "GH_TOKEN": "token ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA here",
        "OPENAI_KEY": "key sk-AAAAAAAAAAAAAAAAAAAAAAAA done",
        "AWS_KEY": "id AKIAAAAAAAAAAAAAAAAA end",
        "GOOGLE_KEY": "g AIzaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA z",
        "BEARER": "Authorization: Bearer abcdefghijklmnopqrstuvwxyz12",
        "ASSIGNED_SECRET": 'password = "hunter2hunter2hunter2"',
        "CONN_STRING_CRED": "postgres://user:secretpw@host/db",
    }
    counts = {}
    for label_name, text in samples.items():
        out = scrub.scrub_text(text, counts)
        # the raw secret body must be gone
        leftover = scrub.andon_rescan([{"dispatch_id": "t", "task_text": out, "source_file": ""}])
        check(f"{label_name} redacted (no andon survivor)", not leftover)


def test_andon_catches_unscrubbed_secret():
    print("test_andon_catches_unscrubbed_secret")
    # a record that BYPASSED scrub still gets caught by the re-scan gate
    bad = [{"dispatch_id": "leak1", "task_text": "ghp_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "source_file": ""}]
    survivors = scrub.andon_rescan(bad)
    check("andon flags an un-scrubbed GH token", len(survivors) == 1)
    check("survivor names the dispatch", survivors and survivors[0][0] == "leak1")


def test_contamination_check_raises():
    print("test_contamination_check_raises")
    splits = {
        "exam_pool": [{"dispatch_id": "X"}],
        "train": [{"dispatch_id": "X"}],   # same id in exam AND train = contamination
        "audit": [],
    }
    raised = False
    try:
        manifest.contamination_check(splits)
    except manifest.AndonHalt:
        raised = True
    check("contamination across exam/train hard-fails", raised)
    # clean splits do not raise
    ok = {"exam_pool": [{"dispatch_id": "A"}], "train": [{"dispatch_id": "B"}], "audit": []}
    no_raise = True
    try:
        manifest.contamination_check(ok)
    except manifest.AndonHalt:
        no_raise = False
    check("disjoint splits pass", no_raise)


def test_canon_truncation():
    print("test_canon_truncation")
    rec = {"task_text": "Secret plot beat: the captain betrays the crew. " * 50,
           "cwd": "E:/AI/star-freight", "source_file": "E:/AI/star-freight/x.jsonl"}
    out = scrub.scrub_record(rec, {})
    check("canon repo body redacted", "[CANON_REDACTED]" in out["task_text"])
    check("canon body short", len(out["task_text"]) <= config.CANON_TASK_TEXT_PREVIEW + 40)
    check("cwd_repo derived", out["cwd_repo"] == "star-freight")


def test_path_email_redaction():
    print("test_path_email_redaction")
    c = {}
    out = scrub.scrub_text(r"see C:\Users\mikey\secret.txt and mail me@example.com", c)
    check("windows user path redacted", "Users" not in out and "<PATH>" in out)
    check("email redacted", "<EMAIL>" in out and "example.com" not in out)


def test_baseline():
    print("test_baseline")
    check("baseline floor 50k", config.baseline_spend(1000) == 50_000)
    check("baseline scales", config.baseline_spend(100_000) == 150_000)


def test_cost_weighting():
    print("test_cost_weighting")
    # weights: input 1x, output 5x, cache_creation 1.25x, cache_read 0.1x
    check("output 5x", config.cost_weighted_spend(0, 0, 0, 100) == 500)
    check("cache_read 0.1x", config.cost_weighted_spend(0, 0, 1000, 0) == 100)
    check("cache_creation 1.25x", config.cost_weighted_spend(0, 400, 0, 0) == 500)
    check("input 1x", config.cost_weighted_spend(100, 0, 0, 0) == 100)
    check("combined", config.cost_weighted_spend(100, 400, 1000, 100) == 100 + 500 + 100 + 500)


def test_join_does_not_overclaim():
    print("test_join_does_not_overclaim")
    # two runs of the SAME repo, both with a wave1/tests agent_run. A dispatch whose
    # timestamp is INSIDE run-B's window must NOT exact-match run-A's wave1/tests.
    rows = [
        {"source": "dogfood", "agent_run_id": 1, "outcome": "success", "raw_status": "complete",
         "build_passed": None, "run_id": "runA", "repo_base": "demo", "branch": "main", "commit_sha": None,
         "phase": "health-audit-a", "wave_number": 1, "domain_name": "tests",
         "window_start": "2026-05-01 10:00:00", "window_end": "2026-05-01 10:30:00",
         "run_window_start": "2026-05-01 10:00:00", "run_window_end": "2026-05-01 10:30:00"},
        {"source": "dogfood", "agent_run_id": 2, "outcome": "failed", "raw_status": "invalid_output",
         "build_passed": None, "run_id": "runB", "repo_base": "demo", "branch": "main", "commit_sha": None,
         "phase": "health-audit-a", "wave_number": 1, "domain_name": "tests",
         "window_start": "2026-05-20 10:00:00", "window_end": "2026-05-20 10:30:00",
         "run_window_start": "2026-05-20 10:00:00", "run_window_end": "2026-05-20 10:30:00"},
    ]
    idx = join.build_swarm_index(rows)
    disp = {"cwd": "E:/AI/demo", "git_branch": "main", "role": "tests",
            "timestamp": "2026-05-20T10:15:00Z",
            "complexity_signals": {"wave": "1", "phase": "health-audit-a"}}
    res = join.join_dispatch(disp, idx)
    check("matches run-B (the time-pinned run), not run-A",
          res["matched"] and res["matched"]["agent_run_id"] == 2)
    check("confident because run is time-pinned", res["join_confidence"] in ("exact", "probable"))

    # a dispatch far from BOTH windows must not exact-match on wave/domain coincidence
    disp_far = dict(disp, timestamp="2026-08-01T10:15:00Z")
    res_far = join.join_dispatch(disp_far, idx)
    check("out-of-window dispatch is not exact", res_far["join_confidence"] != "exact")


def _write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def test_freeze_folds_human_verdicts():
    print("test_freeze_folds_human_verdicts")
    d = tempfile.mkdtemp()
    A = {"dispatch_id": "agent-A", "outcome": "success", "outcome_source": "transcript",
         "weak_label": True, "cost_weight": 1.0}
    B = {"dispatch_id": "agent-B", "outcome": "success", "outcome_source": "transcript",
         "weak_label": True, "cost_weight": 1.0}
    _write_jsonl(os.path.join(d, "corpus.jsonl"), [A, B])
    _write_jsonl(os.path.join(d, "train.jsonl"), [B])        # B is a TRAIN record
    _write_jsonl(os.path.join(d, "exam_pool.jsonl"), [A])    # A is in the exam
    rp = os.path.join(d, "exam_resolved.jsonl")
    _write_jsonl(rp, [{"dispatch_id": "agent-A", "harvester_outcome": "success",
                       "human_outcome": "wasteful", "confirmed": False, "note": "cache churn",
                       "reviewed_at": "2026-06-04T00:00:00Z", "reviewer": "mike"}])
    rep = freeze.freeze(rp, v_dir=d)
    exam = [json.loads(l) for l in open(os.path.join(d, "exam.jsonl"), encoding="utf-8")]
    check("one record frozen", len(exam) == 1)
    rec = exam[0]
    check("human outcome applied", rec["outcome"] == "wasteful")
    check("marked gold", rec["weak_label"] is False and rec["outcome_source"] == "human")
    check("override counted", rep["overrode"] == 1 and rep["confirmed"] == 0)

    # ANDON: a resolved id that is a TRAIN record must hard-fail (would contaminate the exam)
    _write_jsonl(rp, [{"dispatch_id": "agent-B", "harvester_outcome": "success",
                       "human_outcome": "success", "confirmed": True, "note": "",
                       "reviewed_at": "2026-06-04T00:00:00Z", "reviewer": "mike"}])
    raised = False
    try:
        freeze.freeze(rp, v_dir=d)
    except manifest.AndonHalt:
        raised = True
    check("certifying a train record hard-fails", raised)


def test_puzzles_self_check():
    print("test_puzzles_self_check")
    # L1: the answer must be the actual dominant WEIGHTED component
    r = {"dispatch_id": "d1", "output_tokens_total": 100, "cache_creation_total": 0,
         "cache_read_total": 100000, "input_tokens_total": 0}  # cache_read 10000 > output 500
    check("L1 names the true driver", puzzles.level1_spot_driver(r)["answer"] == "cache read")

    # L2: answer = higher spend; is_trap when output ranking disagrees
    a = {"dispatch_id": "a", "cost_weighted_spend": 900000, "output_tokens_total": 31000,
         "context_tokens": 44000, "complexity_signals": {"num_turns": 49}, "task_text": "A task."}
    b = {"dispatch_id": "b", "cost_weighted_spend": 1600000, "output_tokens_total": 3000,
         "context_tokens": 18000, "complexity_signals": {"num_turns": 61}, "task_text": "B task."}
    p2 = puzzles.level2_which_costs_more(a, b)
    check("L2 picks the costlier task", p2["answer"] == "B")
    check("L2 flags the trap (more output, less cost)", p2["is_trap"] is True)

    # L3: fit when cost <= budget, split otherwise
    r3 = {"dispatch_id": "d3", "cost_weighted_spend": 50000, "context_tokens": 38000,
          "complexity_signals": {"num_turns": 5}, "task_text": "x task."}
    check("L3 fit", puzzles.level3_fit_or_split(r3, 100000)["answer"] == "fit")
    check("L3 split", puzzles.level3_fit_or_split(r3, 10000)["answer"] == "split")


def main():
    for t in (test_scrub_redacts_real_secrets, test_andon_catches_unscrubbed_secret,
              test_contamination_check_raises, test_canon_truncation,
              test_path_email_redaction, test_baseline, test_cost_weighting,
              test_join_does_not_overclaim, test_freeze_folds_human_verdicts,
              test_puzzles_self_check):
        t()
    print()
    if FAILS:
        print(f"FAILED ({len(FAILS)}): {FAILS}")
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
