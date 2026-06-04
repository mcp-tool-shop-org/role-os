"""Stage: parse (outcomes) — load the three outcome-label sources into
join-ready rows. Hides one concern: each outcome source's format. Read-only.

No source has a hard FK to a Claude dispatch (DESIGN.md §5) — these rows expose
the fuzzy keys (repo, branch, commit, phase, wave, domain, time-window) that
join.py matches against dispatch features.
"""
import json
import os
import sqlite3

from . import config

# swarm agent_runs.status -> our outcome enum
_SWARM_STATUS = {
    "complete": "success",
    "failed": "failed",
    "timed_out": "failed",
    "invalid_output": "failed",
    "ownership_violation": "failed",
    "pending": "unknown",
    "dispatched": "unknown",
    "running": "unknown",
}


def _repo_base(local_path: str | None, repo: str | None) -> str | None:
    if repo:
        return repo.split("/")[-1]
    if local_path:
        return local_path.replace("\\", "/").rstrip("/").split("/")[-1]
    return None


def load_swarm_outcomes(db_path: str = None) -> list[dict]:
    """One row per swarm agent_run, enriched with its wave/run/domain join keys
    and the wave's build-verification result."""
    db_path = db_path or config.SWARM_DB
    if not os.path.exists(db_path):
        return []
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # wave-level build verification (passed 0/1) keyed by wave_id
    verif = {}
    for r in cur.execute("SELECT wave_id, passed, exit_code, test_count FROM verification_receipts"):
        verif[r["wave_id"]] = {"passed": r["passed"], "exit_code": r["exit_code"], "test_count": r["test_count"]}

    # run-level time window (for pinning a dispatch to ONE run before matching
    # wave/domain — (wave,domain) is NOT unique across runs of the same repo).
    run_window = {}
    for r in cur.execute(
        "SELECT run_id, MIN(created_at) AS lo, MAX(COALESCE(completed_at, created_at)) AS hi "
        "FROM waves GROUP BY run_id"):
        run_window[r["run_id"]] = (r["lo"], r["hi"])

    rows = []
    q = """
      SELECT ar.id AS agent_run_id, ar.status AS ar_status, ar.error_message,
             ar.started_at, ar.completed_at,
             w.id AS wave_id, w.phase, w.wave_number, w.status AS wave_status,
             w.created_at AS wave_created, w.completed_at AS wave_completed,
             d.name AS domain_name,
             r.id AS run_id, r.repo, r.local_path, r.branch, r.commit_sha
      FROM agent_runs ar
      JOIN waves w ON ar.wave_id = w.id
      JOIN domains d ON ar.domain_id = d.id
      JOIN runs r ON w.run_id = r.id
    """
    for r in cur.execute(q):
        rows.append({
            "source": "dogfood",
            "agent_run_id": r["agent_run_id"],
            "outcome": _SWARM_STATUS.get(r["ar_status"], "unknown"),
            "raw_status": r["ar_status"],
            "build_passed": verif.get(r["wave_id"], {}).get("passed"),
            # join keys
            "run_id": r["run_id"],
            "repo_base": _repo_base(r["local_path"], r["repo"]),
            "local_path": (r["local_path"] or "").replace("\\", "/"),
            "branch": r["branch"],
            "commit_sha": r["commit_sha"],
            "phase": r["phase"],
            "wave_number": r["wave_number"],
            "domain_name": r["domain_name"],
            "window_start": r["wave_created"],
            "window_end": r["wave_completed"],
            "run_window_start": run_window.get(r["run_id"], (None, None))[0],
            "run_window_end": run_window.get(r["run_id"], (None, None))[1],
        })
    con.close()
    return rows


def load_readouts_verdicts(root: str = None) -> list[dict]:
    """code-review / verifier outcomes: confirmed|cant_confirm|refuted per KB+wave."""
    import glob
    root = root or config.READOUTS_ROOT
    out = []
    for path in glob.glob(os.path.join(root, "*", "waves", "*", "family-verdicts.json")):
        path = path.replace("\\", "/")
        parts = path.split("/")
        try:
            kb = parts[parts.index("waves") - 1]
            wave_dir = parts[parts.index("waves") + 1]
        except ValueError:
            kb, wave_dir = None, None
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        confirmed = refuted = cant = 0
        for fam in (data.values() if isinstance(data, dict) else []):
            for v in (fam.get("verdicts", {}) or {}).values():
                vv = v.get("verdict")
                confirmed += vv == "confirmed"
                refuted += vv == "refuted"
                cant += vv == "cant_confirm"
        # KB-wave level outcome: refuted-heavy => failed signal; confirmed => success
        outcome = "success" if confirmed >= max(1, refuted) else "failed"
        out.append({
            "source": "code-review",
            "outcome": outcome,
            "kb": kb, "wave_dir": wave_dir,
            "confirmed": confirmed, "refuted": refuted, "cant_confirm": cant,
        })
    return out


def load_roleos_verdicts(repo: str = None) -> list[dict]:
    """role-os mission verdicts written next to packets (may be absent in a clean
    checkout — these are runtime artifacts)."""
    import glob
    repo = repo or config.ROLEOS_REPO
    out = []
    for path in glob.glob(os.path.join(repo, "**", "*.citation-receipt.json"), recursive=True):
        try:
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            continue
        out.append({
            "source": "mission",
            "outcome": "success" if d.get("pass") else "failed",
            "verdict": d.get("verdict"),
            "path": path.replace("\\", "/"),
        })
    return out
