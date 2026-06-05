"""Puzzle-curriculum generator (Mike's design).

Turns real harvested dispatches into leveled, SELF-CHECKABLE token-economics puzzles:
teach the PRINCIPLES (work the reasoning muscle), not a regression table. Every puzzle
has a computable answer (no human grading), the worked reasoning, and the REAL question
that follows once the principle is grokked. Difficulty rungs are the progression an AI
works up to — and map to the specialist's certification levels.

Rungs:
  L1 spot-the-driver   — read the bill, name the dominant cost          (warm-up)
  L2 which-costs-more  — compare two tasks; output is a red herring     (the trap)
  L3 fit-or-split      — will this task fit a budget, or must it split? (the decision)
  L4 spot-the-failure  — diagnose a starved run, say what to predict    (diagnosis)
  L5 what-if           — how does cost move as steps grow?              (dynamics)

Source = dataset/v0.1/corpus.jsonl (the scenario bank). Read-only. More rungs over time.
"""
import json
import os
import re
import statistics

from . import config

W = config.PRICE_WEIGHTS
CAPS = {1: 120, 2: 80, 3: 120, 4: 9999, 5: 100}   # L4 = all real ran-out cases


def _components(r):
    return {
        "output": (r.get("output_tokens_total") or 0) * W["output"],
        "cache write": (r.get("cache_creation_total") or 0) * W["cache_creation"],
        "cache read": (r.get("cache_read_total") or 0) * W["cache_read"],
        "input": (r.get("input_tokens_total") or 0) * W["input"],
    }


def _fmt(n):
    return f"{int(n):,}"


def _steps(r):
    return (r.get("complexity_signals") or {}).get("num_turns") or 0


def _gist(r, n=72):
    """Plain one-line task summary, with scrubbed markers cut off (no <PATH> noise)."""
    t = (r.get("task_text") or "").strip().replace("\n", " ")
    t = re.split(r"<PATH>|<EMAIL>|\[ARTIFACT", t)[0].strip()
    if t and not t.startswith("["):
        clause = re.split(r"(?<=[.!?])\s", t)[0].strip(" -:.·")
        clause = re.sub(r"\s+(for the|at|in|on)$", "", clause)
        if len(clause) >= 12:
            return (clause[:n] + "…") if len(clause) > n else clause
    sig = r.get("complexity_signals") or {}
    bits = [b for b in (r.get("role"), sig.get("action")) if b]
    return (" ".join(bits) + " task") if bits else f"a {r.get('grain')} dispatch"


def _stride(items, cap):
    if len(items) <= cap:
        return items
    step = len(items) / cap
    return [items[int(i * step)] for i in range(cap)]


# ---------------- rung generators ----------------

def level1_spot_driver(r):
    comps = _components(r)
    total = sum(comps.values()) or 1
    driver = max(comps, key=comps.get)
    bill = "\n".join(f"    {k:<12}{_fmt(v):>15}" for k, v in comps.items())
    return {
        "level": 1, "type": "spot-the-driver",
        "principle": "Cost is usually dominated by cache-read — the context re-read on every step — "
                     "not by how much new text the agent writes.",
        "prompt": "A dispatch's bill, in weighted tokens:\n" + bill + "\n  Which ONE line drove the cost?",
        "answer": driver,
        "reasoning": f"{driver} = {_fmt(comps[driver])} weighted ({100*comps[driver]/total:.0f}% of the bill), the largest line.",
        "real_question": "Real one: given a task, its context size, and its step count, name the component "
                         "that will dominate its cost.",
        "source_dispatch_ids": [r["dispatch_id"]],
    }


def level2_which_costs_more(a, b):
    sa, sb = a["cost_weighted_spend"], b["cost_weighted_spend"]
    ans = "A" if sa > sb else "B"
    out_says = "A" if (a.get("output_tokens_total") or 0) > (b.get("output_tokens_total") or 0) else "B"
    return {
        "level": 2, "type": "which-costs-more",
        "principle": "Cost is about context-re-read x number-of-steps. Raw output is a red herring — a "
                     "small task that keeps re-reading a big context beats a big writing task.",
        "prompt": "Two real tasks — which cost more in total tokens?\n"
                  f"    A: {_gist(a)}\n"
                  f"       wrote ~{_fmt(a.get('output_tokens_total') or 0)} tokens over {_steps(a)} steps, context ~{_fmt(a.get('context_tokens') or 0)}\n"
                  f"    B: {_gist(b)}\n"
                  f"       wrote ~{_fmt(b.get('output_tokens_total') or 0)} tokens over {_steps(b)} steps, context ~{_fmt(b.get('context_tokens') or 0)}",
        "answer": ans,
        "is_trap": out_says != ans,
        "reasoning": f"{ans} cost {_fmt(max(sa, sb))} vs {_fmt(min(sa, sb))} weighted. The winner re-read its "
                     f"context over more steps — that cache-read volume set the bill, not the output "
                     f"(by output alone you'd have guessed {out_says}).",
        "real_question": "Real one: given two upcoming tasks, predict which will spend more.",
        "source_dispatch_ids": [a["dispatch_id"], b["dispatch_id"]],
    }


def level3_fit_or_split(r, budget):
    cost = r["cost_weighted_spend"]
    fits = cost <= budget
    tail = "" if fits else " The context gets re-read every step, so cumulative cost blew past the budget — split it."
    return {
        "level": 3, "type": "fit-or-split",
        "principle": "It's the cumulative re-reading (context x steps), not the one-time context size, that busts a budget.",
        "prompt": f"You have a budget of {_fmt(budget)} weighted tokens for ONE agent.\n"
                  f"    Task: {_gist(r)}\n"
                  f"    context ~{_fmt(r.get('context_tokens') or 0)}, expected ~{_steps(r)} steps.\n"
                  "  Fit it in one pass, or split it up?",
        "answer": "fit" if fits else "split",
        "reasoning": f"It actually cost {_fmt(cost)} weighted — {'under' if fits else 'over'} the {_fmt(budget)} budget.{tail}",
        "real_question": "Real one: given a task and a budget, decide fit-or-split before running it.",
        "source_dispatch_ids": [r["dispatch_id"]],
    }


def level4_spot_failure(r):
    return {
        "level": 4, "type": "spot-the-failure",
        "principle": "A run that compacts mid-way or stops on length was under-budgeted — predict the squeeze first.",
        "prompt": "An agent's run ended like this:\n"
                  f"    final stop:          {r.get('final_stop_reason')}\n"
                  f"    forced a compaction: {'yes' if r.get('compaction_observed') else 'no'} (at ~{_fmt(r.get('pre_compaction_tokens') or 0)} tokens)\n"
                  f"    peak context:        {_fmt(r.get('peak_context_tokens') or 0)}\n"
                  "  What happened, and what should a budget-planner have predicted up front?",
        "answer": "It ran out of room (starved) — the planner should have flagged it as too big for one "
                  "pass / a compaction risk and reserved headroom or split the work.",
        "reasoning": "Context ran up to the ceiling and the system had to compact to keep going — a "
                     "starvation tell. A good budgeter predicts that squeeze up front.",
        "real_question": "Real one: given a task and its context, predict whether it will need a mid-run compaction.",
        "source_dispatch_ids": [r["dispatch_id"]],
    }


def level5_what_if(r):
    return {
        "level": 5, "type": "what-if",
        "principle": "Cache-read scales with steps (context re-read each step); output doesn't. "
                     "More steps means proportionally more cost, led by cache-read.",
        "prompt": f"A task ran {_steps(r)} steps and cost {_fmt(r['cost_weighted_spend'])} weighted, mostly "
                  f"re-reading a ~{_fmt(r.get('context_tokens') or 0)}-token context.\n"
                  "  If the SAME task ran 3x as many steps, which component grows fastest?",
        "answer": "cache read",
        "reasoning": "Roughly ~3x the cost. Cache-read grows fastest — the context is re-read on every step, "
                     "so it scales with step count; output barely moves.",
        "real_question": "Real one: predict how a task's cost changes as its step count grows.",
        "source_dispatch_ids": [r["dispatch_id"]],
    }


# ---------------- full corpus -> puzzle set ----------------

def _driver(r):
    c = _components(r)
    return max(c, key=c.get)


def generate_all(v_dir=None):
    v_dir = v_dir or os.path.join(config.DATASET_ROOT, "v0.1")
    recs = [json.loads(l) for l in open(os.path.join(v_dir, "corpus.jsonl"), encoding="utf-8")]
    exam_ids = {json.loads(l)["dispatch_id"]
                for l in open(os.path.join(v_dir, "exam_pool.jsonl"), encoding="utf-8")} \
        if os.path.exists(os.path.join(v_dir, "exam_pool.jsonl")) else set()
    subs = [r for r in recs if r.get("grain") == "subagent" and (r.get("cost_weighted_spend") or 0) > 0]
    subs.sort(key=lambda r: r["cost_weighted_spend"])
    puzzles = []

    # L1
    for r in _stride(subs, CAPS[1]):
        puzzles.append(level1_spot_driver(r))

    # L2 trap pairs: pair a high-output cheap record with a low-output dear record
    n = len(subs)
    if n >= 4:
        cheap_half = sorted(subs[: n // 2], key=lambda r: -(r.get("output_tokens_total") or 0))
        dear_half = sorted(subs[n // 2:], key=lambda r: (r.get("output_tokens_total") or 0))
        for a, b in zip(_stride(cheap_half, CAPS[2]), _stride(dear_half, CAPS[2])):
            if a["dispatch_id"] != b["dispatch_id"]:
                puzzles.append(level2_which_costs_more(a, b))

    # L3 fit-or-split: budget = corpus median spend (so the answer varies)
    budget = int(statistics.median([r["cost_weighted_spend"] for r in subs]))
    for r in _stride(subs, CAPS[3]):
        puzzles.append(level3_fit_or_split(r, budget))

    # L4: every real ran-out case (auto-compaction or starved), most dramatic first
    ran_out = [r for r in recs if (r.get("compaction_observed") and r.get("compaction_trigger") == "auto")
               or r.get("outcome") == "starved"]
    ran_out.sort(key=lambda r: -(r.get("pre_compaction_tokens") or r.get("peak_context_tokens") or 0))
    for r in ran_out[: CAPS[4]]:
        puzzles.append(level4_spot_failure(r))

    # L5: records with enough steps for the dynamics to matter
    stepful = [r for r in subs if _steps(r) >= 10]
    for r in _stride(stepful, CAPS[5]):
        puzzles.append(level5_what_if(r))

    # split puzzles by their source dispatch's split (no train/exam leakage)
    for i, p in enumerate(puzzles):
        p["id"] = f"pz-{p['level']}-{i:04d}"
        p["split"] = "exam" if any(d in exam_ids for d in p["source_dispatch_ids"]) else "train"

    return puzzles


def write_dataset(v_dir=None):
    import collections
    import hashlib
    v_dir = v_dir or os.path.join(config.DATASET_ROOT, "v0.1")
    out_dir = os.path.join(v_dir, "puzzles")
    os.makedirs(out_dir, exist_ok=True)
    puzzles = generate_all(v_dir)

    def dump(path, rows):
        with open(path, "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    train = [p for p in puzzles if p["split"] == "train"]
    exam = [p for p in puzzles if p["split"] == "exam"]
    dump(os.path.join(out_dir, "puzzles.jsonl"), puzzles)
    dump(os.path.join(out_dir, "puzzles_train.jsonl"), train)
    dump(os.path.join(out_dir, "puzzles_exam.jsonl"), exam)

    h = hashlib.sha256()
    for p in puzzles:
        h.update(json.dumps(p, sort_keys=True, ensure_ascii=False).encode())
    manifest = {
        "dataset": "token-budget-analyst-puzzles", "version": "v0.1",
        "total": len(puzzles), "train": len(train), "exam": len(exam),
        "by_level": dict(collections.Counter(p["level"] for p in puzzles)),
        "by_type": dict(collections.Counter(p["type"] for p in puzzles)),
        "level2_traps": sum(1 for p in puzzles if p.get("is_trap")),
        "hash": h.hexdigest()[:16],
        "note": "self-checkable token-economics curriculum; answers are computable (no human grading). "
                "Rungs map to the specialist's certification levels.",
    }
    with open(os.path.join(out_dir, "puzzles_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    return manifest


def _pretty(p):
    t = "  (TRAP)" if p.get("is_trap") else ""
    return "\n".join([f"== RUNG {p['level']} - {p['type']}{t}",
                      f"PRINCIPLE: {p['principle']}", "", p["prompt"], "",
                      f"  ANSWER: {p['answer']}", f"  WHY:    {p['reasoning']}",
                      f"  -> {p['real_question']}"])


if __name__ == "__main__":
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if len(sys.argv) > 1 and sys.argv[1] == "build":
        print("puzzles manifest:", json.dumps(write_dataset(), indent=2))
    else:
        # demo: one fresh example per rung
        seen = set()
        for p in generate_all():
            if p["level"] in seen:
                continue
            seen.add(p["level"])
            print(_pretty(p)); print()
