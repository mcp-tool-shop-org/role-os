"""Stage: label — derive the counterfactual-honest outcome, cost weight, and the
deterministic baseline. Hides one concern: the outcome/label policy (DESIGN.md §2,§6,§7).

Precedence for `outcome` (budget-relevant):
  1. starved   — transcript shows ran-out / auto-compaction / max_tokens (corrupts the
                 budget label: tokens_used is only a LOWER bound). Dominates because it
                 invalidates the observed count.
  2. failed    — external receipt says the task failed (tokens_used is noise).
  3. success   — external receipt says the task succeeded (count is a usable target).
  4. wasteful  — a top tier ran a trivially small job.
  5. success*  — clean end_turn, no external check (WEAK success).
  6. unknown   — no signal.
"""
from . import config


def _starved(rec) -> bool:
    if rec.get("compaction_observed") and rec.get("compaction_trigger") == "auto":
        return True
    if rec.get("final_stop_reason") == "max_tokens":
        return True
    if (rec.get("peak_context_tokens") or 0) >= config.STARVE_PEAK_CTX:
        return True
    return False


def _wasteful(rec) -> bool:
    sig = rec.get("complexity_signals") or {}
    return (
        rec.get("tier_used") == config.WASTE_TIER
        and (rec.get("tokens_used") or 0) < config.WASTE_MAX_TOKENS
        and (rec.get("peak_context_tokens") or 0) < config.WASTE_MAX_CTX
        and (sig.get("num_turns") or 0) <= config.WASTE_MAX_TURNS
    )


def apply_label(rec: dict, join_result: dict) -> dict:
    """Mutate rec in place: set outcome, outcome_source, join_confidence, weak_label,
    cost_weight, baseline_budget, baseline_tier. join_result is from join.join_dispatch."""
    conf = join_result.get("join_confidence", "none")
    ext_outcome = join_result.get("outcome")
    ext_source = join_result.get("outcome_source", "none")

    starved = _starved(rec)
    wasteful = _wasteful(rec)
    clean = rec.get("final_stop_reason") == "end_turn"

    # precedence
    if starved:
        outcome, source = "starved", "transcript"
        # if an external source ALSO saw it, keep that source for provenance
        if conf in ("exact", "probable"):
            source = ext_source
    elif ext_outcome in ("failed", "success") and conf in ("exact", "probable", "weak"):
        outcome, source = ext_outcome, ext_source
    elif wasteful:
        outcome, source = "wasteful", "transcript"
    elif clean:
        outcome, source = "success", "transcript"   # WEAK success (unverified)
    else:
        outcome, source = "unknown", "none"

    # weak_label: only an EXACT external join (or external failed/success at exact) is gold
    gold = (conf == "exact" and source in ("dogfood", "code-review", "mission"))
    rec["outcome"] = outcome
    rec["outcome_source"] = source
    rec["join_confidence"] = conf
    rec["weak_label"] = not gold

    # cost asymmetry: starved records are the false-"enough" risk class -> up-weight 5x
    rec["cost_weight"] = config.COST_WEIGHT_STARVED if outcome == "starved" else config.COST_WEIGHT_DEFAULT

    # deterministic baseline (the sanity gate)
    ctx = rec.get("context_tokens") or 0
    rec["baseline_budget"] = config.baseline_budget(ctx)
    rec["baseline_tier"] = config.baseline_tier(ctx, rec.get("role"))
    return rec


def detect_cascades(records: list[dict]) -> None:
    """Cross-dispatch: if the SAME task ran on >1 tier and a cheaper tier completed
    cleanly, mark cascade_observed + cheapest_sufficient_tier. Rare in practice; this
    just captures it honestly where it exists (DESIGN.md §1c)."""
    tier_rank = {"haiku": 0, "sonnet": 1, "opus": 2}
    groups = {}
    for r in records:
        key = (r.get("task_text_len"), (r.get("task_text") or "")[:120])
        groups.setdefault(key, []).append(r)
    for key, grp in groups.items():
        tiers = {r.get("tier_used") for r in grp if r.get("tier_used") in tier_rank}
        if len(tiers) < 2:
            continue
        # cheapest tier that completed cleanly (end_turn, not starved)
        ok = [r for r in grp if r.get("final_stop_reason") == "end_turn"
              and r.get("outcome") != "starved" and r.get("tier_used") in tier_rank]
        if not ok:
            continue
        cheapest = min(ok, key=lambda r: tier_rank[r["tier_used"]])
        for r in grp:
            r["cascade_observed"] = True
            r["cheapest_sufficient_tier"] = cheapest["tier_used"]
