"""Curriculum audit — the hard gate before any training (raw accuracy lies; flip-consistency is the
truth metric). Checks a contrast-grouped dataset: verdict balance, flip-readiness (every group has
surface-near members of DIFFERING verdicts), split integrity (no torn group), and evidence leakage
(the same evidence text never spans train and exam). Run: python audit.py <records.jsonl>. Exit 0=PASS."""
import sys, json
from collections import Counter, defaultdict


def audit(recs):
    total = len(recs) or 1
    verd = Counter(p["verdict"] for p in recs)
    lvl_verd = defaultdict(Counter)
    for p in recs:
        lvl_verd[p["level"]][p["verdict"]] += 1
    groups = defaultdict(list)
    for p in recs:
        groups[p.get("pair_id")].append(p)
    groups.pop(None, None)

    flip_ready = sum(1 for g in groups.values() if len({m["verdict"] for m in g}) >= 2)
    torn = sum(1 for g in groups.values() if len({m.get("split") for m in g}) > 1)
    ev_splits = defaultdict(set)
    for p in recs:
        ev_splits[p["evidence"]].add(p.get("split"))
    leaked = [e for e, s in ev_splits.items() if len(s - {None}) > 1]

    majority = max(verd.values()) / total
    print(f"records={len(recs)}  groups={len(groups)}")
    print("verdict balance: " + ", ".join(f"{k}={v} ({100 * v / total:.0f}%)" for k, v in verd.items()))
    print("per-level verdicts: " + "; ".join(f"L{l}:{dict(c)}" for l, c in sorted(lvl_verd.items())))
    print(f"majority-guess accuracy ceiling: {majority:.2f}  (flip-consistency is the real metric)")
    print(f"flip-ready groups: {flip_ready}/{len(groups)}")
    print(f"torn groups (members across splits): {torn}")
    print(f"evidence leaked across splits: {len(leaked)}")
    ok = flip_ready == len(groups) and torn == 0 and len(leaked) == 0
    print("AUDIT: " + ("PASS" if ok else "FAIL"))
    return ok


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python audit.py <records.jsonl>"); sys.exit(2)
    recs = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8") if l.strip()]
    sys.exit(0 if audit(recs) else 1)
