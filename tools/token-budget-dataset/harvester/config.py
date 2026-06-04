"""Configuration for the Token Budget Analyst dataset harvester.

Stdlib-only. No GPU, no network. All source reads are read-only.
Paths are this-rig (Robot, drives C and E only). Override via env if needed.
"""
import os

HARVESTER_VERSION = "0.1.0"

# --- source locations (read-only) ---
TRANSCRIPT_ROOT = os.environ.get(
    "TBA_TRANSCRIPT_ROOT", "C:/Users/mikey/.claude/projects"
)
SWARM_DB = os.environ.get(
    "TBA_SWARM_DB", "E:/AI/dogfood-labs/swarms/control-plane.db"
)
READOUTS_ROOT = os.environ.get("TBA_READOUTS_ROOT", "E:/AI/readouts")
ROLEOS_REPO = os.environ.get("TBA_ROLEOS_REPO", "E:/AI/role-os")

# --- output (local, versioned, git-tracked except the raw cache) ---
DATASET_ROOT = os.environ.get(
    "TBA_DATASET_ROOT",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset"),
)

# --- canon repos: task_text reduced to features only (no verbatim canon) ---
CANON_REPOS = {
    "star-freight", "star-freight-ue5", "star-freight-grounded",
    "saints-mile", "the-fractured-road", "motif", "style-dataset-lab",
    "world-forge", "forge-vault",
}

# --- scrub thresholds ---
LARGE_ARTIFACT_CHARS = 2000   # an embedded block over this is stripped to a placeholder
TASK_TEXT_MAX_CHARS = 8000    # hard cap on retained task_text (post-scrub)
CANON_TASK_TEXT_PREVIEW = 200 # canon repos keep only this many scrubbed chars

# --- cost asymmetry (Wang 2025, arXiv:2510.22016) ---
COST_WEIGHT_STARVED = 5.0     # false-"enough": predicted sufficient, actually starved
COST_WEIGHT_DEFAULT = 1.0

# --- deterministic baseline (the sanity gate, DESIGN.md §7) ---
BASELINE_FLOOR_TOKENS = 50_000
BASELINE_CONTEXT_MULT = 1.5

def baseline_budget(context_tokens: int) -> int:
    return int(max(context_tokens * BASELINE_CONTEXT_MULT, BASELINE_FLOOR_TOKENS))

def baseline_tier(context_tokens: int, role: str | None) -> str:
    """Small rule table: context/role -> tier. Deliberately simple; this is the
    bar the learned budgeter must beat by >=10% cost at equal quality."""
    if context_tokens < 20_000:
        return "haiku"
    if context_tokens < 80_000:
        return "sonnet"
    return "opus"

# --- tier normalization: model id -> coarse tier ---
def normalize_tier(model: str | None) -> str | None:
    if not model:
        return None
    m = model.lower()
    if "haiku" in m:
        return "haiku"
    if "sonnet" in m:
        return "sonnet"
    if "opus" in m:
        return "opus"
    if "synthetic" in m:
        return "synthetic"
    return "other"

# --- temporal split: exam = newest frozen window (fraction of timeline) ---
EXAM_FRACTION = 0.15          # newest 15% of dispatches by timestamp -> exam pool
AUDIT_FRACTION = 0.10         # next-newest 10% -> field audit

# --- transcript-internal outcome thresholds (DESIGN.md §4/§2) ---
# starvation: auto-compaction near the 1M ceiling, or output hard-stop
STARVE_PEAK_CTX = 900_000     # peak context this close to 1M => context-starved
# waste: a top tier ran a trivially small job
WASTE_TIER = "opus"
WASTE_MAX_TOKENS = 1500
WASTE_MAX_CTX = 60_000
WASTE_MAX_TURNS = 3
