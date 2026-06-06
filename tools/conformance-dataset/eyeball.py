import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
recs = [json.loads(l) for l in open(os.path.join(HERE, "conformance_records.jsonl"), encoding="utf-8")]


def show(level, type_, n=3):
    seen = set()
    for r in recs:
        if r["level"] == level and r["type"] == type_ and r["pair_id"] not in seen and r["verdict"] == "nonconformant":
            seen.add(r["pair_id"])
            tool = r["evidence"].split("\n")[0]
            print("  " + tool)
            print("    bad CALL : " + r["claim"][:150])
            print("    why      : " + r["corruption"][:160])
            print()
            if len(seen) >= n:
                break


print("== L4 semantic-contract ==")
show(4, "semantic-contract", 3)
print("== L5 intent-action ==")
show(5, "intent-action", 3)
