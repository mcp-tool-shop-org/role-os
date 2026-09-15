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

from harvester import scrub, manifest, join, config, label, freeze, puzzles, parse_outcomes

FAILS = []


def check(name, cond):
    print(("  PASS " if cond else "  FAIL ") + name)
    if not cond:
        FAILS.append(name)


def test_scrub_redacts_real_secrets():
    print("test_scrub_redacts_real_secrets")
    # Synthetic tokens only — not live secrets. Each fixture independently proves
    # detection: (1) ANDON hits the raw string, (2) the raw needle is gone after
    # scrub, (3) the named placeholder is present, (4) ANDON is clean. Scrub/andon
    # consistency is not proof of detection (a no-op pattern would pass both).
    samples = {
        "GH_TOKEN": (
            "token ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA here",
            "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ),
        "OPENAI_KEY": (
            "key sk-AAAAAAAAAAAAAAAAAAAAAAAA done",
            "sk-AAAAAAAAAAAAAAAAAAAAAAAA",
        ),
        "AWS_KEY": (
            "id AKIAAAAAAAAAAAAAAAAA end",
            "AKIAAAAAAAAAAAAAAAAA",
        ),
        "GOOGLE_KEY": (
            "g AIzaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA z",
            "AIzaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ),
        "BEARER": (
            "Authorization: Bearer abcdefghijklmnopqrstuvwxyz12",
            "abcdefghijklmnopqrstuvwxyz12",
        ),
        "ASSIGNED_SECRET": (
            'password = "hunter2hunter2hunter2"',
            "hunter2hunter2hunter2",
        ),
        "CONN_STRING_CRED": (
            "postgres://user:secretpw@host/db",
            "secretpw",
        ),
    }
    for label_name, (text, needle) in samples.items():
        pre = scrub.andon_rescan([{"dispatch_id": "t", "task_text": text, "source_file": ""}])
        check(f"{label_name} ANDON hits raw", any(s[1] == label_name for s in pre))
        out = scrub.scrub_text(text, {})
        check(f"{label_name} raw needle gone", needle not in out)
        check(f"{label_name} placeholder present", f"<{label_name}>" in out)
        leftover = scrub.andon_rescan([{"dispatch_id": "t", "task_text": out, "source_file": ""}])
        check(f"{label_name} ANDON clean after scrub", not leftover)


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


def _remainder_after_path(text):
    """Text immediately after each <PATH> placeholder, up to whitespace."""
    token = "<PATH>"
    rems = []
    start = 0
    while True:
        i = text.find(token, start)
        if i < 0:
            break
        j = i + len(token)
        k = j
        while k < len(text) and not text[k].isspace():
            k += 1
        rems.append(text[j:k])
        start = j
    return rems


def test_path_email_redaction():
    print("test_path_email_redaction")
    # Nested Windows home path — remainder after <PATH> must be empty (no
    # leftover separators or .claude segments). Assembled at runtime so the
    # source file never contains a contiguous home-path needle.
    win_home = "C:" + "\\" + "Users" + "\\" + "acct\\.claude\\projects\\E--AI-role-os\\agent-1.jsonl"
    win = "see " + win_home + " and mail me@example.com"
    pre = scrub.andon_rescan([{"dispatch_id": "p", "task_text": win, "source_file": ""}])
    check("ANDON hits raw Windows home path", any(s[1] == "WIN_HOME" for s in pre))
    c = {}
    out = scrub.scrub_text(win, c)
    check("windows user path redacted", "Users" not in out and "<PATH>" in out)
    check("remainder after <PATH> empty", _remainder_after_path(out) == [""])
    check("no leftover separators or .claude", "\\" not in out and "/" not in out and ".claude" not in out)
    check("email redacted", "<EMAIL>" in out and "example.com" not in out)
    post = scrub.andon_rescan([{"dispatch_id": "p", "task_text": out, "source_file": ""}])
    check("ANDON clean after path scrub", not post)

    # Confirmed short-branch leak: a Public-profile file used to leave a remainder after <PATH>.
    pub = "C:" + "\\" + "Users" + "\\" + "Public\\secret.txt"
    out_pub = scrub.scrub_text(pub, {})
    check("Public home fully eaten", out_pub == "<PATH>")
    check("no leaked secret.txt remainder", "secret.txt" not in out_pub)

    nix = "/Users/acct/.claude/projects/foo/agent-1.jsonl"
    check("ANDON hits raw /Users/", any(
        s[1] == "NIX_USERS" for s in scrub.andon_rescan(
            [{"dispatch_id": "n", "task_text": nix, "source_file": ""}])))
    out_nix = scrub.scrub_text(nix, {})
    check("unix Users fully eaten", out_nix == "<PATH>" and ".claude" not in out_nix)

    home = "/home/acct/.claude/foo"
    check("ANDON hits raw /home/", any(
        s[1] == "NIX_HOME" for s in scrub.andon_rescan(
            [{"dispatch_id": "h", "task_text": home, "source_file": ""}])))
    out_home = scrub.scrub_text(home, {})
    check("unix home fully eaten", out_home == "<PATH>" and ".claude" not in out_home)

    rec = {"task_text": "fix", "cwd": "E:/AI/role-os",
           "source_file": "C:" + "\\" + "Users" + "\\" + "acct\\.claude\\projects\\E--AI-role-os\\agent-1.jsonl"}
    rec_out = scrub.scrub_record(rec, {})
    check("source_file fully redacted", rec_out["source_file"] == "<PATH>")
    check("source_file no .claude leftover", ".claude" not in rec_out["source_file"])


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


def test_scrub_record_drops_internal_fields():
    print("test_scrub_record_drops_internal_fields")
    rec = {"task_text": "fix the thing", "cwd": "E:/AI/some-repo",
           "source_file": "E:/AI/some-repo/x.jsonl", "_session_id": "sess-123",
           "tier_used_raw": "claude-opus", "git_branch": "main", "dispatch_id": "d9"}
    out = scrub.scrub_record(rec, {})
    check("cwd dropped", "cwd" not in out)
    check("_session_id dropped", "_session_id" not in out)
    check("tier_used_raw dropped", "tier_used_raw" not in out)
    check("git_branch kept", out.get("git_branch") == "main")
    check("cwd_repo still derived", out["cwd_repo"] == "some-repo")
    check("input record not mutated", rec.get("cwd") == "E:/AI/some-repo")


def test_roleos_receipt_outcomes():
    print("test_roleos_receipt_outcomes")
    # roleos-citation-receipt/v1 fixture shapes (src/verify-citations.mjs buildReceipt):
    # verdict/blocking/advisory — there is NO 'pass' field.
    with tempfile.TemporaryDirectory() as td:
        fixtures = {
            "a.citation-receipt.json": {"schema": "roleos-citation-receipt/v1",
                                        "verdict": "accept", "blocking": False, "advisory": False},
            "b.citation-receipt.json": {"schema": "roleos-citation-receipt/v1",
                                        "verdict": "refuse", "blocking": True, "advisory": False},
            "c.citation-receipt.json": {"schema": "roleos-citation-receipt/v1",
                                        "verdict": "escalate", "blocking": False, "advisory": True},
        }
        for name, body in fixtures.items():
            with open(os.path.join(td, name), "w", encoding="utf-8") as f:
                json.dump(body, f)
        got = {v["verdict"]: v["outcome"] for v in parse_outcomes.load_roleos_verdicts(td)}
        check("accept -> success", got.get("accept") == "success")
        check("blocking refuse -> failed", got.get("refuse") == "failed")
        check("non-blocking escalate -> unknown", got.get("escalate") == "unknown")


def main():
    for t in (test_scrub_redacts_real_secrets, test_andon_catches_unscrubbed_secret,
              test_contamination_check_raises, test_canon_truncation,
              test_path_email_redaction, test_baseline, test_cost_weighting,
              test_join_does_not_overclaim, test_freeze_folds_human_verdicts,
              test_puzzles_self_check, test_scrub_record_drops_internal_fields,
              test_roleos_receipt_outcomes):
        t()
    print()
    if FAILS:
        print(f"FAILED ({len(FAILS)}): {FAILS}")
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
