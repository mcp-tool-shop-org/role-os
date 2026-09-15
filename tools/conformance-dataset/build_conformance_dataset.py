#!/usr/bin/env python
"""Assemble the Tool-Call Conformance SFT from corpus_tools.json via the contrast generators, split
TOOL-atomically (all of a tool's groups share a split, so its shared evidence never spans train/exam),
run the HARD-GATE audit BEFORE any write, then emit train SFT + held-out exam. A FAIL leaves existing
jsonl untouched. CPU + re-runnable. Point BUDGETER_DATA at conformance_train_sft.jsonl to train via
the proven mint. Run: python build_conformance_dataset.py"""
import os, sys, json, hashlib, shutil, tempfile
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import config            # noqa: F401  (shared contract / system prompt)
import conformance_puzzles as P
import audit as A

EXAM_FRAC = float(os.environ.get("BUILD_EXAM_FRAC", "0.25"))
GENS = [("ty", P.type_group), ("rq", P.required_group), ("en", P.enum_group),
        ("ct", P.contract_group), ("in", P.intent_group)]


def _pid(tag, anchor, i):
    return "c-" + hashlib.sha1(f"{tag}:{i}:{anchor}".encode()).hexdigest()[:10]


def load_json(name, default):
    p = os.path.join(HERE, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def load_corpus():
    """corpus_tools.json is the canonical base; corpus_l4.json carries the v0.2 deltas — same-name
    entries OVERRIDE IN PLACE (preserving the tool's index so its tool-atomic split is unchanged) and
    new-name entries APPEND. Keeping all v0.2 changes in one file makes the delta reviewable and leaves
    the canonical corpus untouched."""
    base = load_json("corpus_tools.json", [])
    delta = load_json("corpus_l4.json", [])
    n0, idx = len(base), {t["name"]: i for i, t in enumerate(base)}
    added = replaced = 0
    for t in delta:
        if t["name"] in idx:
            base[idx[t["name"]]] = t; replaced += 1
        else:
            idx[t["name"]] = len(base); base.append(t); added += 1
    print(f"corpus: base={n0}  l4_override={replaced}  l4_new={added}  total={len(base)}")
    return base


def build():
    recs, tools = [], load_corpus()
    for i, t in enumerate(tools):
        tool_key = f"{i}:{t['name']}"          # split unit — keeps a tool's shared evidence in one split
        for tag, gen in GENS:
            g = gen(t, _pid(tag, t["name"], i))
            if g:
                for r in g:
                    r["tool_key"] = tool_key
                recs += g
    return recs, len(tools)


def split_tool_atomic(recs):
    for p in recs:
        h = int(hashlib.sha1(p["tool_key"].encode()).hexdigest()[:8], 16)
        p["split"] = "exam" if (h % 100) < int(EXAM_FRAC * 100) else "train"
    return recs


def _write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def main():
    recs, n_tools = build()
    for i, p in enumerate(recs):
        p["id"] = f"c-{p['level']}-{i:05d}"
    split_tool_atomic(recs)

    train = [P.to_sft(p) for p in recs if p["split"] == "train"]
    exam = [p for p in recs if p["split"] == "exam"]
    print(f"tools={n_tools}  records={len(recs)}  train_sft={len(train)}  exam={len(exam)}")
    lvl = Counter(p["level"] for p in recs)
    print("level dist: " + ", ".join(f"L{k}={lvl[k]}" for k in sorted(lvl)))
    tr_tools = len({p["tool_key"] for p in recs if p["split"] == "train"})
    ex_tools = len({p["tool_key"] for p in recs if p["split"] == "exam"})
    print(f"tool split: train={tr_tools} tools, exam={ex_tools} tools")
    print("\n===== AUDIT (hard gate) =====")
    ok = A.audit(recs)
    if not ok:
        # Failing build must not replace a previously-good exam/train.
        print("AUDIT FAIL — jsonl files NOT written (existing exam/train left untouched)", file=sys.stderr)
        sys.exit(1)

    names = (
        "conformance_records.jsonl",
        "conformance_train_sft.jsonl",
        "conformance_exam_records.jsonl",
    )
    tmp = tempfile.mkdtemp(prefix="conformance-build-", dir=HERE)
    try:
        _write_jsonl(os.path.join(tmp, names[0]), recs)
        _write_jsonl(os.path.join(tmp, names[1]), train)
        _write_jsonl(os.path.join(tmp, names[2]), exam)
        for name in names:
            os.replace(os.path.join(tmp, name), os.path.join(HERE, name))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
