"""Stage: locate — find all source files. Hides one concern: where data lives.
Read-only; returns paths + existence, never opens for parsing here."""
import glob
import os

from . import config


def _norm(paths):
    return sorted(p.replace("\\", "/") for p in paths)


def agent_transcripts() -> list[str]:
    return _norm(glob.glob(os.path.join(config.TRANSCRIPT_ROOT, "*", "*", "subagents", "agent-*.jsonl")))


def session_transcripts() -> list[str]:
    return _norm(glob.glob(os.path.join(config.TRANSCRIPT_ROOT, "*", "*.jsonl")))


def outcome_sources() -> dict:
    """Locate the three outcome-label sources; report existence (no parsing)."""
    return {
        "swarm_db": {
            "path": config.SWARM_DB,
            "exists": os.path.exists(config.SWARM_DB),
        },
        "readouts_verdicts": {
            "paths": _norm(glob.glob(os.path.join(config.READOUTS_ROOT, "*", "waves", "*", "family-verdicts.json"))),
        },
        "roleos_receipts": {
            # role-os writes <packet>.verdict.md / <packet>.citation-receipt.json next to packets
            "verdicts": _norm(glob.glob(os.path.join(config.ROLEOS_REPO, "**", "*.verdict.md"), recursive=True)),
            "citation_receipts": _norm(glob.glob(os.path.join(config.ROLEOS_REPO, "**", "*.citation-receipt.json"), recursive=True)),
        },
    }


def summary() -> dict:
    oc = outcome_sources()
    return {
        "agent_transcripts": len(agent_transcripts()),
        "session_transcripts": len(session_transcripts()),
        "swarm_db_exists": oc["swarm_db"]["exists"],
        "readouts_verdict_files": len(oc["readouts_verdicts"]["paths"]),
        "roleos_verdict_files": len(oc["roleos_receipts"]["verdicts"]),
        "roleos_citation_receipts": len(oc["roleos_receipts"]["citation_receipts"]),
    }
