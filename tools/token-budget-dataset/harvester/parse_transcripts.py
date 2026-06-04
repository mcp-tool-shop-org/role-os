"""Stage: parse — Claude Code transcripts -> per-dispatch feature dicts.

Hides one concern: the transcript JSONL format. Emits raw (unscrubbed) feature
dicts; scrub is a separate downstream stage. Read-only.
"""
import json
import os
import re

from . import config


def _iter_records(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue


def parse_role_signals(task_text: str) -> dict:
    """Heuristic extraction of swarm/mission role structure from the task prompt.
    These are also the fuzzy join keys (DESIGN.md §5)."""
    t = task_text or ""
    sig = {"domain": None, "wave": None, "phase": None, "action": None}

    # domain: "You are the <DOMAIN> domain agent" or a bare known domain token
    m = re.search(r"You are the\s+([A-Z][A-Z0-9/_\- ]{1,30}?)\s+(?:domain|agent)", t)
    if m:
        sig["domain"] = m.group(1).strip().rstrip(" -")
    else:
        m = re.search(r"\b(CI/DOCS|TESTS|FRONTEND|BACKEND|CI|DOCS|core-infra|verticals)\b", t)
        if m:
            sig["domain"] = m.group(1)

    m = re.search(r"[Ww]ave[\s\-]?([A-Z]?\d+)", t)
    if m:
        sig["wave"] = m.group(1)

    m = re.search(r"health-audit-([abc])", t)
    if m:
        sig["phase"] = "health-audit-" + m.group(1)
    else:
        m = re.search(r"[Ss]tage\s+([A-C])\b", t)
        if m:
            sig["phase"] = "stage-" + m.group(1).lower()
        else:
            m = re.search(r"[Pp]hase[\s\-]?(\d+)", t)
            if m:
                sig["phase"] = "phase-" + m.group(1)

    for act in ("feature-audit", "final-test", "humaniz", "implementation",
                "audit", "amend", "fix", "feature", "review"):
        if act in t.lower():
            sig["action"] = "humanization" if act == "humaniz" else act
            break
    return sig


def _has_large_artifact(task_text: str) -> bool:
    if not task_text:
        return False
    # a long fenced block or a very long unbroken line = pasted artifact
    if re.search(r"```[\s\S]{%d,}?```" % config.LARGE_ARTIFACT_CHARS, task_text):
        return True
    return any(len(line) > config.LARGE_ARTIFACT_CHARS for line in task_text.splitlines())


def parse_agent_transcript(path: str) -> dict | None:
    """One subagent dispatch -> raw feature dict (no scrub, no outcome, no join)."""
    first_ts = None
    cwd = git_branch = None
    agent_id = session_id = None
    task_text = None
    attr_agent = attr_skill = None
    init_ctx = None
    total_out = total_in = total_cc = total_cr = 0
    peak_ctx = 0
    num_turns = 0
    num_tool_results = 0
    last_stop = None
    tier_counts = {}
    compaction = {"observed": False, "trigger": None, "pre": None}

    saw_any = False
    for rec in _iter_records(path):
        saw_any = True
        t = rec.get("type")
        if first_ts is None and rec.get("timestamp"):
            first_ts = rec.get("timestamp")
        cwd = cwd or rec.get("cwd")
        git_branch = git_branch or rec.get("gitBranch")
        agent_id = agent_id or rec.get("agentId")
        session_id = session_id or rec.get("sessionId")

        if t == "system" and rec.get("compactMetadata"):
            cm = rec["compactMetadata"]
            compaction["observed"] = True
            compaction["trigger"] = cm.get("trigger")
            compaction["pre"] = cm.get("preTokens")

        msg = rec.get("message") or {}
        if t == "user" and task_text is None:
            c = msg.get("content")
            if isinstance(c, str) and c.strip():
                task_text = c
        if t == "user":
            c = msg.get("content")
            if isinstance(c, list):
                num_tool_results += sum(
                    1 for b in c if isinstance(b, dict) and b.get("type") == "tool_result"
                )
        if rec.get("toolUseResult") is not None:
            num_tool_results += 1

        if t == "assistant" and isinstance(msg, dict):
            num_turns += 1
            attr_agent = attr_agent or rec.get("attributionAgent")
            attr_skill = attr_skill or rec.get("attributionSkill")
            model = msg.get("model")
            if model:
                tier_counts[model] = tier_counts.get(model, 0) + 1
            last_stop = msg.get("stop_reason", last_stop)
            u = msg.get("usage") or {}
            ui = u.get("input_tokens", 0) or 0
            ucc = u.get("cache_creation_input_tokens", 0) or 0
            ucr = u.get("cache_read_input_tokens", 0) or 0
            total_out += u.get("output_tokens", 0) or 0
            total_in += ui
            total_cc += ucc
            total_cr += ucr
            ctx = ui + ucr + ucc
            if init_ctx is None and ctx > 0:
                init_ctx = ctx
            peak_ctx = max(peak_ctx, ctx)

    if not saw_any or agent_id is None:
        return None

    dominant_model = max(tier_counts, key=tier_counts.get) if tier_counts else None
    sigs = parse_role_signals(task_text or "")
    return {
        "dispatch_id": agent_id,
        "grain": "subagent",
        "source_file": path,
        "harvester_version": config.HARVESTER_VERSION,
        "timestamp": first_ts,
        "_session_id": session_id,           # internal, dropped before write
        "cwd": cwd,                          # internal raw, scrubbed -> cwd_repo
        "git_branch": git_branch,
        "task_text": task_text or "",
        "task_text_len": len(task_text or ""),
        "role": sigs["domain"],
        "attribution_agent": attr_agent,
        "attribution_skill": attr_skill,
        "context_tokens": init_ctx or 0,
        "complexity_signals": {
            "num_turns": num_turns,
            "num_tool_results": num_tool_results,
            "has_large_artifact": _has_large_artifact(task_text or ""),
            "phase": sigs["phase"],
            "wave": sigs["wave"],
            "action": sigs["action"],
        },
        "cost_weighted_spend": config.cost_weighted_spend(total_in, total_cc, total_cr, total_out),
        "input_tokens_total": total_in,
        "cache_creation_total": total_cc,
        "cache_read_total": total_cr,
        "output_tokens_total": total_out,
        "peak_context_tokens": peak_ctx,
        "final_stop_reason": last_stop,
        "tier_used": config.normalize_tier(dominant_model),
        "tier_used_raw": dominant_model,
        "compaction_observed": compaction["observed"],
        "compaction_trigger": compaction["trigger"],
        "pre_compaction_tokens": compaction["pre"],
    }


def parse_session_transcript(path: str) -> dict | None:
    """Top-level session -> session-grain feature dict. The only place auto
    compaction is reliably observable (DESIGN.md §3)."""
    first_ts = None
    cwd = git_branch = session_id = None
    task_text = None
    init_ctx = None
    total_out = total_in = total_cc = total_cr = 0
    peak_ctx = 0
    num_turns = 0
    last_stop = None
    tier_counts = {}
    compaction = {"observed": False, "trigger": None, "pre": None}

    for rec in _iter_records(path):
        t = rec.get("type")
        if first_ts is None and rec.get("timestamp"):
            first_ts = rec.get("timestamp")
        cwd = cwd or rec.get("cwd")
        git_branch = git_branch or rec.get("gitBranch")
        session_id = session_id or rec.get("sessionId")

        if rec.get("compactMetadata"):
            cm = rec["compactMetadata"]
            # auto compaction is the meaningful "needed compaction" label
            if cm.get("trigger") == "auto" or not compaction["observed"]:
                compaction["observed"] = True
                compaction["trigger"] = cm.get("trigger")
                compaction["pre"] = cm.get("preTokens")

        msg = rec.get("message") or {}
        if t == "user" and task_text is None:
            c = msg.get("content")
            if isinstance(c, str) and c.strip():
                task_text = c
        if t == "assistant" and isinstance(msg, dict):
            num_turns += 1
            model = msg.get("model")
            if model:
                tier_counts[model] = tier_counts.get(model, 0) + 1
            last_stop = msg.get("stop_reason", last_stop)
            u = msg.get("usage") or {}
            ui = u.get("input_tokens", 0) or 0
            ucc = u.get("cache_creation_input_tokens", 0) or 0
            ucr = u.get("cache_read_input_tokens", 0) or 0
            total_out += u.get("output_tokens", 0) or 0
            total_in += ui
            total_cc += ucc
            total_cr += ucr
            ctx = ui + ucr + ucc
            if init_ctx is None and ctx > 0:
                init_ctx = ctx
            peak_ctx = max(peak_ctx, ctx)

    if session_id is None:
        return None
    dominant_model = max(tier_counts, key=tier_counts.get) if tier_counts else None
    sigs = parse_role_signals(task_text or "")
    return {
        "dispatch_id": session_id,
        "grain": "session",
        "source_file": path,
        "harvester_version": config.HARVESTER_VERSION,
        "timestamp": first_ts,
        "_session_id": session_id,
        "cwd": cwd,
        "git_branch": git_branch,
        "task_text": task_text or "",
        "task_text_len": len(task_text or ""),
        "role": sigs["domain"],
        "attribution_agent": None,
        "attribution_skill": None,
        "context_tokens": init_ctx or 0,
        "complexity_signals": {
            "num_turns": num_turns,
            "num_tool_results": None,
            "has_large_artifact": _has_large_artifact(task_text or ""),
            "phase": sigs["phase"],
            "wave": sigs["wave"],
            "action": sigs["action"],
        },
        "cost_weighted_spend": config.cost_weighted_spend(total_in, total_cc, total_cr, total_out),
        "input_tokens_total": total_in,
        "cache_creation_total": total_cc,
        "cache_read_total": total_cr,
        "output_tokens_total": total_out,
        "peak_context_tokens": peak_ctx,
        "final_stop_reason": last_stop,
        "tier_used": config.normalize_tier(dominant_model),
        "tier_used_raw": dominant_model,
        "compaction_observed": compaction["observed"],
        "compaction_trigger": compaction["trigger"],
        "pre_compaction_tokens": compaction["pre"],
    }
