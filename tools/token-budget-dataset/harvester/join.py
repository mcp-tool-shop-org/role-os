"""Stage: join — match a dispatch to an outcome row, with honest confidence.

Hides one concern: the fuzzy multi-key match (DESIGN.md §5). There is no hard FK,
so every match records a `join_confidence` in {exact, probable, weak, none} and the
caller decides whether to trust it (weak_label).
"""
import re
from datetime import datetime


def _repo_base(path):
    if not path:
        return None
    return path.replace("\\", "/").rstrip("/").split("/")[-1]


def _norm_domain(s):
    if not s:
        return None
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _parse_time(s):
    if not s:
        return None
    s = s.strip().replace("Z", "").replace("T", " ")
    s = re.sub(r"\.\d+$", "", s)            # drop fractional seconds
    s = re.sub(r"[+\-]\d\d:?\d\d$", "", s)  # drop tz offset
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except Exception:
            continue
    return None


def _domains_match(disp_domain, row_domain):
    a, b = _norm_domain(disp_domain), _norm_domain(row_domain)
    if not a or not b:
        return False
    return a == b or a in b or b in a


def build_swarm_index(swarm_rows):
    """Index outcome rows by repo_base for cheap candidate lookup."""
    idx = {}
    for r in swarm_rows:
        idx.setdefault(r["repo_base"], []).append(r)
    return idx


# Day-level slack for run pinning: dispatch timestamps are UTC, swarm timestamps
# are local wall-clock (no tz). Runs in the DB are days apart, so day-level pinning
# disambiguates the run without needing the exact offset. We do NOT claim sub-day
# precision (DESIGN.md §5).
_DAY_SLACK_SECONDS = 36 * 3600  # +-1.5 days


def _within_run(disp_t, lo, hi):
    t0, t1 = _parse_time(lo), _parse_time(hi)
    if not (disp_t and t0 and t1):
        return False
    return (t0.timestamp() - _DAY_SLACK_SECONDS) <= disp_t.timestamp() <= (t1.timestamp() + _DAY_SLACK_SECONDS)


def join_dispatch(disp: dict, swarm_index: dict) -> dict:
    """Return {outcome, outcome_source, join_confidence, matched} or a 'none' result.

    Strategy: pin the RUN by dispatch timestamp first (day-level), THEN match
    (wave, domain) within it. (wave, domain) is not unique across runs of the same
    repo, so matching it without pinning the run produces false-confident joins."""
    none_result = {"outcome": None, "outcome_source": "none",
                   "join_confidence": "none", "matched": None}

    repo = _repo_base(disp.get("cwd"))
    candidates = swarm_index.get(repo)
    if not candidates:
        return none_result

    sig = disp.get("complexity_signals") or {}
    disp_wave = str(sig.get("wave")) if sig.get("wave") is not None else None
    disp_phase = sig.get("phase")
    disp_domain = disp.get("role")
    disp_t = _parse_time(disp.get("timestamp"))

    # which runs is this dispatch time-plausibly inside?
    pinned_runs = set()
    if disp_t:
        for row in candidates:
            if _within_run(disp_t, row.get("run_window_start"), row.get("run_window_end")):
                pinned_runs.add(row.get("run_id"))
    unambiguous = len(pinned_runs) == 1

    best = None
    best_rank = -1  # 3=exact 2=probable 1=weak
    best_tie = ()
    for row in candidates:
        run_pinned = row.get("run_id") in pinned_runs
        wave_ok = disp_wave is not None and str(row.get("wave_number")) == disp_wave
        phase_ok = disp_phase is not None and row.get("phase") == disp_phase
        domain_ok = _domains_match(disp_domain, row.get("domain_name"))

        if run_pinned and unambiguous and wave_ok and domain_ok:
            rank = 3   # exact: run uniquely time-pinned + wave + domain all agree
        elif run_pinned and ((wave_ok and domain_ok) or (domain_ok and unambiguous)):
            rank = 2   # probable: run pinned + strong corroboration
        elif run_pinned or domain_ok or phase_ok:
            rank = 1   # weak: repo + one corroborating key
        else:
            rank = 0
        tie = (run_pinned, domain_ok, wave_ok)
        if (rank, tie) > (best_rank, best_tie):
            best, best_rank, best_tie = row, rank, tie

    if best is None or best_rank == 0:
        return none_result

    conf = {3: "exact", 2: "probable", 1: "weak"}[best_rank]
    # outcome preference: agent-level status, else wave build-pass
    outcome = best.get("outcome")
    if outcome == "unknown" and best.get("build_passed") is not None:
        outcome = "success" if best["build_passed"] else "failed"
    return {
        "outcome": outcome,
        "outcome_source": best.get("source", "dogfood"),
        "join_confidence": conf,
        "matched": {
            "agent_run_id": best.get("agent_run_id"),
            "raw_status": best.get("raw_status"),
            "repo": best.get("repo_base"),
            "wave": best.get("wave_number"),
            "phase": best.get("phase"),
            "domain": best.get("domain_name"),
        },
    }
