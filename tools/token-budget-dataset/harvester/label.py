"""Stage: label — derive the counterfactual-honest outcome, cost weight, and the
deterministic baseline. Hides one concern: the outcome/label policy (DESIGN.md §2,§6,§7).

Precedence for `outcome` (budget-relevant):
  1. starved   — transcript shows ran-out / auto-compaction / max_tokens (corrupts the
                 budget label: tokens_used is only a LOWER bound). Dominates because it
                 invalidates the observed count.
  2. failed    — external receipt says the task failed (tokens_used is noise).
  3. success   — external receipt says the task succeeded (count is a usable target).
  4. wasteful  — large cost-weighted spend, tiny output (cache churn / overhead).
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
    # economic waste: a large cost-weighted spend with tiny output to show for it
    # (cache churn / context overhead burned without producing results).
    return ((rec.get("output_tokens_total") or 0) < config.WASTE_OUTPUT_MAX
            and (rec.get("cost_weighted_spend") or 0) > config.WASTE_SPEND_MIN)


def apply_label(rec: dict, join_result: dict) -> dict:
    """Mutate rec in place: set outcome, outcome_source, join_confidence, weak_label,
    cost_weight, baseline_spend. join_result is from join.join_dispatch."""
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

    # short human-readable rationale for the contrastive review UI (standard #5)
    rec["label_reason"] = _reason(rec, outcome, source)

    # deterministic baseline (the sanity gate) — predicts cost_weighted_spend
    ctx = rec.get("context_tokens") or 0
    rec["baseline_spend"] = config.baseline_spend(ctx)
    return rec


def _reason(rec, outcome, source) -> str:
    spend = rec.get("cost_weighted_spend") or 0
    out_t = rec.get("output_tokens_total") or 0
    if outcome == "starved":
        bits = []
        if rec.get("final_stop_reason") == "max_tokens":
            bits.append("hit max_tokens")
        if rec.get("compaction_observed") and rec.get("compaction_trigger") == "auto":
            bits.append("forced an auto-compaction")
        if (rec.get("peak_context_tokens") or 0) >= config.STARVE_PEAK_CTX:
            bits.append("peak context near the 1M ceiling")
        return "observed spend is a LOWER bound — " + (", ".join(bits) or "ran to the limit")
    if outcome == "wasteful":
        return f"{spend:,} weighted spend for only {out_t:,} output tokens (cache churn / overhead)"
    if outcome == "failed":
        return f"external {source} receipt marked the task failed — spend is noise"
    if outcome == "success" and source != "transcript":
        return f"external {source} receipt confirmed success at {spend:,} weighted spend"
    if outcome == "success":
        return f"ended cleanly (end_turn) at {spend:,} weighted spend — completion only, task quality unverified"
    return "no completion or outcome signal"
