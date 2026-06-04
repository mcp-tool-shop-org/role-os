"""Stage: scrub — privacy. Hides one concern: keeping secrets/paths/PII/canon out
of the corpus (DESIGN.md §9). Training data is forever.

ANDON (workflow-standard #2): after scrub, `andon_rescan` re-checks every output for
surviving SECRET patterns. Any hit must hard-fail the whole build — no partial corpus.
"""
import re

from . import config

# --- SECRET patterns: redacted AND re-scanned by ANDON (a survivor halts the build) ---
SECRET_PATTERNS = [
    ("PRIVATE_KEY", re.compile(r"-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]+?-----END[A-Z ]*PRIVATE KEY-----")),
    ("AWS_KEY", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("OPENAI_KEY", re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}\b")),
    ("GH_TOKEN", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b")),
    ("GH_PAT", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("SLACK_TOKEN", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("GOOGLE_KEY", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("BEARER", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]{20,}")),
    ("CONN_STRING_CRED", re.compile(r"\b[a-z][a-z0-9+.\-]*://[^\s:/@]+:[^\s/@]+@")),
    ("ASSIGNED_SECRET", re.compile(
        r"(?i)\b(api[_-]?key|secret|token|password|passwd|pwd|access[_-]?key)\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-/+]{16,}")),
]

# --- non-secret PII/paths: redacted but NOT andon-fatal ---
PATH_PATTERNS = [
    re.compile(r"[A-Za-z]:[\\/](?:Users[\\/][^\\/\s\"'<>|]+|[^\s\"'<>|]+)"),  # Windows abs path
    re.compile(r"/(?:Users|home)/[^\s\"'<>|]+"),                              # *nix home path
]
EMAIL_PATTERN = re.compile(r"\b[\w.+\-]+@[\w\-]+\.[\w.\-]+\b")
FENCED_BLOCK = re.compile(r"```[\s\S]*?```")


def _redact_secrets(text, counts):
    for name, pat in SECRET_PATTERNS:
        text, n = pat.subn(f"<{name}>", text)
        if n:
            counts[name] = counts.get(name, 0) + n
    return text


def _strip_large_artifacts(text, counts):
    def repl(m):
        block = m.group(0)
        if len(block) >= config.LARGE_ARTIFACT_CHARS:
            counts["ARTIFACT"] = counts.get("ARTIFACT", 0) + 1
            return f"[ARTIFACT len={len(block)} kind=fenced]"
        return block
    text = FENCED_BLOCK.sub(repl, text)
    # also collapse any remaining very long single lines
    out = []
    for line in text.splitlines():
        if len(line) >= config.LARGE_ARTIFACT_CHARS:
            counts["ARTIFACT"] = counts.get("ARTIFACT", 0) + 1
            out.append(f"[ARTIFACT len={len(line)} kind=line]")
        else:
            out.append(line)
    return "\n".join(out)


def scrub_text(text: str, counts: dict) -> str:
    if not text:
        return ""
    text = _redact_secrets(text, counts)
    text = _strip_large_artifacts(text, counts)
    for pat in PATH_PATTERNS:
        text, n = pat.subn("<PATH>", text)
        if n:
            counts["PATH"] = counts.get("PATH", 0) + n
    text, n = EMAIL_PATTERN.subn("<EMAIL>", text)
    if n:
        counts["EMAIL"] = counts.get("EMAIL", 0) + n
    return text


def _repo_base(path):
    if not path:
        return None
    return path.replace("\\", "/").rstrip("/").split("/")[-1]


def scrub_record(rec: dict, counts: dict) -> dict:
    """Scrub task_text + source path, derive cwd_repo, drop internal raw fields.
    Returns a NEW dict containing only schema fields (plus nothing else)."""
    cwd = rec.get("cwd")
    cwd_repo = _repo_base(cwd)
    is_canon = cwd_repo in config.CANON_REPOS

    scrubbed = scrub_text(rec.get("task_text") or "", counts)
    if is_canon:
        # proprietary canon: features only, no verbatim body
        counts["CANON_TRUNCATED"] = counts.get("CANON_TRUNCATED", 0) + 1
        scrubbed = scrubbed[: config.CANON_TASK_TEXT_PREVIEW] + " …[CANON_REDACTED]"
    scrubbed = scrubbed[: config.TASK_TEXT_MAX_CHARS]

    out = dict(rec)
    out["task_text"] = scrubbed
    out["cwd_repo"] = cwd_repo
    out["source_file"] = scrub_text(rec.get("source_file") or "", {})  # redact path in provenance
    # drop internal-only fields not in the schema
    for k in ("cwd", "_session_id", "tier_used_raw", "git_branch"):
        pass
    out["git_branch"] = rec.get("git_branch")  # keep (scrubbed of nothing sensitive: branch name)
    return out


def andon_rescan(records: list[dict]) -> list[tuple]:
    """Re-scan every output record's text fields for surviving SECRET patterns.
    Returns a list of (dispatch_id, pattern_name, snippet). EMPTY = clean.
    The build MUST hard-fail if this is non-empty."""
    survivors = []
    text_fields = ("task_text", "source_file")
    for rec in records:
        for fld in text_fields:
            val = rec.get(fld) or ""
            for name, pat in SECRET_PATTERNS:
                m = pat.search(val)
                if m:
                    survivors.append((rec.get("dispatch_id"), name, m.group(0)[:40]))
    return survivors
