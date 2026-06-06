#!/usr/bin/env python
"""Merge the workflow-generated+verified tools into corpus_tools.json (dedupe by name; keep the
hand-authored originals on conflict). Structural validation only — the cross-family verify pass already
confirmed the L4/L5 labels. Usage: python merge_corpus.py <workflow_output.json>"""
import json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "corpus_tools.json")
REQ = {"name", "contract", "params", "conformant_args", "intent", "l4_violation", "l5_wrong_action"}

data = json.load(open(sys.argv[1], encoding="utf-8"))
gen = ((data.get("result") if isinstance(data.get("result"), dict) else None) or data).get("tools") or []
existing = json.load(open(CORPUS, encoding="utf-8"))
seen = {t["name"] for t in existing}
merged, added, skipped = list(existing), 0, 0
for t in gen:
    if not isinstance(t, dict) or not REQ.issubset(t) or not isinstance(t.get("params"), list):
        skipped += 1; continue
    if t["name"] in seen:
        skipped += 1; continue
    seen.add(t["name"]); merged.append(t); added += 1
json.dump(merged, open(CORPUS, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"existing={len(existing)}  generated={len(gen)}  added={added}  skipped={skipped}  total={len(merged)}")
