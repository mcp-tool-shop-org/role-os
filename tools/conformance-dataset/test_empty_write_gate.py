"""Reverted-red proofs for empty-set overwrite on the conformance writers.

Empty recs/train/exam used to os.replace a good exam after a vacuous audit PASS;
audit used to PASS when every record lacked pair_id (groups.pop(None) -> 0==0).

Run:  python test_empty_write_gate.py    (from tools/conformance-dataset/)
Exit 0 = gates hold; non-zero = empty overwrite is unblocked.
"""
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audit as A
import build_conformance_dataset as B
import config

FAILS = []


def check(name, cond):
    print(("  PASS " if cond else "  FAIL ") + name)
    if not cond:
        FAILS.append(name)


def test_audit_empty_and_no_pair_id_fail():
    print("test_audit_empty_and_no_pair_id_fail")
    check("empty recs FAIL", A.audit([]) is False)
    orphan = [{"verdict": "conformant", "level": 1, "evidence": "e", "split": "train"}]
    check("recs without pair_id FAIL", A.audit(orphan) is False)
    ready = [
        {"verdict": "conformant", "level": 1, "evidence": "e1", "split": "train", "pair_id": "p1"},
        {"verdict": "nonconformant", "level": 1, "evidence": "e2", "split": "train", "pair_id": "p1"},
    ]
    check("flip-ready group PASS", A.audit(ready) is True)
    check("pair_id on SCHEMA_FIELDS", "pair_id" in config.SCHEMA_FIELDS)
    check("contrast on SCHEMA_FIELDS", "contrast" in config.SCHEMA_FIELDS)
    check("tool_key on SCHEMA_FIELDS", "tool_key" in config.SCHEMA_FIELDS)


def test_refuse_empty_replace():
    print("test_refuse_empty_replace")
    check("empty recs refused", B.refuse_empty_replace([], ["t"], ["e"]) is False)
    check("empty train refused", B.refuse_empty_replace(["r"], [], ["e"]) is False)
    check("empty exam refused", B.refuse_empty_replace(["r"], ["t"], []) is False)
    check("non-empty allowed", B.refuse_empty_replace(["r"], ["t"], ["e"]) is True)


def test_empty_exam_does_not_replace_prior():
    """If refuse_empty_replace is skipped, os.replace of exam==[] destroys a good exam."""
    print("test_empty_exam_does_not_replace_prior")
    d = tempfile.mkdtemp()
    exam = os.path.join(d, "conformance_exam_records.jsonl")
    marker = json.dumps({"id": "keep-exam", "pair_id": "p1"}) + "\n"
    with open(exam, "w", encoding="utf-8") as f:
        f.write(marker)
    recs, train, empty_exam = [{"id": "r"}], [{"id": "t"}], []
    if B.refuse_empty_replace(recs, train, empty_exam):
        B._write_jsonl(exam, empty_exam)
    with open(exam, encoding="utf-8") as f:
        check("prior exam intact on empty exam", f.read() == marker)


def main():
    for t in (test_audit_empty_and_no_pair_id_fail, test_refuse_empty_replace,
              test_empty_exam_does_not_replace_prior):
        t()
    print()
    if FAILS:
        print(f"FAILED ({len(FAILS)}): {FAILS}")
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
