#!/usr/bin/env python
"""OOD generalization dogfood for the conformance watcher — the verifier-v2 lesson applied.

A held-out EXAM can report a lift that is really authoring-distribution fit (verifier-v2 over-flagged
faithful paraphrases at the same rate as v1 despite a strong exam). So we score the served model on a
set of FRESH cases authored by an independent agent fan-out (different tools, different surface, cross-
adjudicated) — distributionally independent of corpus_l4.json. Run the SAME cases against v1 and v0.2:
the lift is real only if v0.2 beats v1 HERE, not just on the exam.

Serializes each case into the trained EVIDENCE/CLAIM contract (TOOL/CONTRACT/PARAMS[/STATE] + CALL),
queries an OpenAI-compatible endpoint, parses with the SAME cost-safe order as certify_conformance.py
(nonconformant -> abstain -> conformant; default abstain — never the dangerous conformant), and scores
per contract-class accuracy + flip-consistency (whole tool group right) + false-conformant count
(gold != conformant but pred == conformant = a bad call waved through, the costly error).

Usage: python dogfood_conformance.py --endpoint http://localhost:8092 --cases ood/fresh_cases.jsonl --label v0.2 [--out f.json]
"""
import argparse, collections, json, re, urllib.request, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import config

SYS = config.SYSTEM_PROMPT


def evidence_for(case):
    schema = {p["name"]: {k: v for k, v in p.items() if k != "name"} for p in case["params"]}
    ev = (f"TOOL: {case['tool_name']}\nCONTRACT: {case['contract']}\n"
          f"PARAMS (JSON schema): {json.dumps(schema)}")
    if case.get("state"):
        ev += f"\nSTATE: {case['state']}"
    return ev


def claim_for(case, args):
    return f"CALL: {case['tool_name']}({json.dumps(args)})"


def query(endpoint, evidence, claim, timeout=120):
    user = f"EVIDENCE:\n{evidence}\n\nCLAIM:\n{claim}"
    body = json.dumps({"messages": [{"role": "system", "content": SYS},
                                    {"role": "user", "content": user}],
                       "max_tokens": 320, "temperature": 0.1}).encode()
    req = urllib.request.Request(endpoint + "/v1/chat/completions", body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


def parse_verdict(text):
    if "</think>" in text:
        text = text.split("</think>")[-1]
    t = text.lower()
    # Same normalization as certify_conformance.py: hyphen/space variants and explicit negation
    # must read nonconformant — never fall through to the dangerous bare 'conformant' substring.
    t = re.sub(r"non[\s-]+conformant", "nonconformant", t)
    if "nonconformant" in t:
        return "nonconformant"
    if re.search(r"\b(?:not|never|isn't|isnt|is not)\s+conformant", t):
        return "nonconformant"
    if "abstain" in t:
        return "abstain"
    if "conformant" in t:
        return "conformant"
    return "abstain"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", required=True)
    ap.add_argument("--cases", required=True)
    ap.add_argument("--label", required=True)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    cases = [json.loads(l) for l in open(a.cases, encoding="utf-8") if l.strip()]
    by_class = collections.defaultdict(lambda: {"hits": 0, "n": 0, "fc": 0, "atrisk": 0})
    group_ok = []          # one bool per tool case (flip-consistency unit)
    fc_total = atrisk_total = errors = 0
    n_items = n_hits = 0
    details = []

    for gi, case in enumerate(cases):
        cls = case.get("_class") or case.get("contract_class") or "?"
        ev = evidence_for(case)
        members = [("conformant", case["conformant_args"])]
        for v in case["violations"]:
            members.append(("nonconformant", v["args"]))
        grp_all_ok = True
        for gold, cargs in members:
            try:
                pred = parse_verdict(query(a.endpoint, ev, claim_for(case, cargs)))
            except Exception:
                pred, errors = "abstain", errors + 1
            ok = (pred == gold)
            n_items += 1; n_hits += 1 if ok else 0
            by_class[cls]["n"] += 1; by_class[cls]["hits"] += 1 if ok else 0
            if not ok:
                grp_all_ok = False
            if gold != "conformant":
                atrisk_total += 1; by_class[cls]["atrisk"] += 1
                if pred == "conformant":
                    fc_total += 1; by_class[cls]["fc"] += 1
                    details.append({"tool": case["tool_name"], "class": cls,
                                    "gold": gold, "pred": pred, "args": cargs})
        group_ok.append(grp_all_ok)
        if (gi + 1) % 10 == 0:
            print(f"  [{a.label}] {gi+1}/{len(cases)} groups scored", flush=True)

    res = {
        "label": a.label, "cases": len(cases), "items": n_items, "query_errors": errors,
        "accuracy": round(n_hits / n_items, 3) if n_items else 0.0,
        "flip_consistency": round(sum(group_ok) / len(group_ok), 3) if group_ok else 0.0,
        "false_conformant": fc_total, "at_risk": atrisk_total,
        "false_conformant_rate": round(fc_total / atrisk_total, 3) if atrisk_total else 0.0,
        "per_class": {c: {"acc": round(v["hits"] / v["n"], 3) if v["n"] else 0.0,
                          "n": v["n"], "false_conformant": v["fc"], "at_risk": v["atrisk"]}
                      for c, v in sorted(by_class.items())},
        "false_conformant_details": details,
    }
    print(json.dumps({k: v for k, v in res.items() if k != "false_conformant_details"}, indent=2))
    if details:
        print("\nFALSE CONFORMANTS (bad calls waved through):")
        for d in details:
            print(f"  [{d['class']}] {d['tool']}: said conformant for {json.dumps(d['args'])}")
    if a.out:
        json.dump(res, open(a.out, "w"), indent=2)


if __name__ == "__main__":
    main()
