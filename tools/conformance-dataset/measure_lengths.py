import json, os
f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conformance_train_sft.jsonl")
lens = []
for line in open(f, encoding="utf-8"):
    msgs = json.loads(line)["messages"]
    lens.append(sum(len(m["content"]) for m in msgs))
lens.sort()
n = len(lens)
def tok(c): return int(c / 3.5)
print(f"n={n}")
print(f"chars : max={lens[-1]} p99={lens[int(0.99*n)]} p95={lens[int(0.95*n)]} p50={lens[n//2]} avg={sum(lens)//n}")
print(f"est tok(~3.5ch): max={tok(lens[-1])} p99={tok(lens[int(0.99*n)])} p95={tok(lens[int(0.95*n)])} p50={tok(lens[n//2])}")
print(f"examples over ~768 tok (2688 ch): {sum(1 for c in lens if c > 2688)}")
print(f"examples over ~896 tok (3136 ch): {sum(1 for c in lens if c > 3136)}")
