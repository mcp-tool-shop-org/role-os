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

# --- token ECONOMICS: cost-weighted spend (the v0.1 prediction target) ---
# The budget is SPEND, model fixed (not tier selection). Raw output tokens hide the
# real cost: a dispatch can be cheap on output but expensive on cache_creation, or
# nearly free if it is mostly cache_read (~10x cheaper than a cache write). We weight
# each usage component by Anthropic's STRUCTURAL price ratios (relative to input=1):
#   output 5x, cache_creation (write) 1.25x, cache_read 0.1x.
# Result = "cost-weighted tokens" in input-token-equivalents (model-agnostic in ratio;
# multiply by the model's $/Mtok-input later to get dollars).
# NOTE: confirm absolute Opus $/Mtok before dollarizing; the RATIOS below are the stable
# part and are what the cost-weighting needs.
PRICE_WEIGHTS = {"input": 1.0, "output": 5.0, "cache_creation": 1.25, "cache_read": 0.1}

def cost_weighted_spend(input_t: int, cache_creation_t: int, cache_read_t: int, output_t: int) -> int:
    w = PRICE_WEIGHTS
    return int((input_t or 0) * w["input"]
               + (cache_creation_t or 0) * w["cache_creation"]
               + (cache_read_t or 0) * w["cache_read"]
               + (output_t or 0) * w["output"])

# --- cost asymmetry (Wang 2025, arXiv:2510.22016) ---
COST_WEIGHT_STARVED = 5.0     # false-"enough": predicted sufficient, actually starved
COST_WEIGHT_DEFAULT = 1.0

# --- deterministic baseline (the sanity gate, DESIGN.md §7) ---
# Predicts the cost-weighted SPEND from the pre-dispatch context size. Deliberately
# simple; the bar the learned budgeter must beat by >=10% at equal quality. Likely
# needs recalibration once the spend distribution is observed (manifest reports it).
BASELINE_FLOOR_TOKENS = 50_000
BASELINE_CONTEXT_MULT = 1.5

def baseline_spend(context_tokens: int) -> int:
    return int(max(context_tokens * BASELINE_CONTEXT_MULT, BASELINE_FLOOR_TOKENS))

# --- waste (economic): high spend, little to show for it (cache churn / overhead) ---
WASTE_OUTPUT_MAX = 800        # tiny output ...
WASTE_SPEND_MIN = 50_000      # ... yet a large cost-weighted spend => wasteful

# --- tier normalization: model id -> coarse tier (RECORDED METADATA, not a target) ---
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
# (economic waste thresholds WASTE_OUTPUT_MAX / WASTE_SPEND_MIN are defined above)
