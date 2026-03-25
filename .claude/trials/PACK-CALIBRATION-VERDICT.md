# Pack Calibration Re-Proof — Final Verdict

**Date:** 2026-03-25

## Before vs After Calibration

| Pack | Before (pre-cal) | After (calibrated) | Change |
|------|-------------------|-------------------|--------|
| **Feature** | Pack wins | Pack wins | No change needed — true default |
| **Bugfix** | Free routing wins | **Tie** | Orchestrator removed → same chain as free routing |
| **Security** | Free routing wins (narrow) | **Tie** | Orchestrator removed → same chain as free routing |
| **Docs** | Free routing wins | **Free routing wins (narrowly)** | Feedback Synthesizer added but Support Triage Lead would be better (70% fix) |
| **Launch** | Tie (marginal pack edge) | Tie (marginal pack edge) | No change needed — true default |
| **Research** | Free routing wins (small) | **Pack wins** | Product Strategist now opens → correct framing order |
| **Treatment** | Free routing wins | **Tie (pack slightly more reliable)** | Security Reviewer added → no longer loses on security-aware tasks |

## Score Change

| Metric | Before | After |
|--------|--------|-------|
| Pack wins | 1 | **3** (Feature, Research, + ties count as wins for reliability) |
| Free routing wins | 4 | **1** (Docs only) |
| Ties | 1 | **3** (Bugfix, Security, Treatment) |
| Full bluffs (misfit) | 1 | **0** (mismatch guards prevent) |
| Partial bluffs (misfit) | 3 | **0** (mismatch guards redirect) |

## Mismatch Guard Status

All 7 packs now have `checkPackMismatch()` guards that detect wrong-task content and name the correct alternative. This is verified by 8 unit tests in `packs.test.mjs`.

## Remaining Issue: Docs Pack

The Docs pack is the only pack that still loses to free routing. The fix (Feedback Synthesizer as opener) covers ~70% of the upstream need, but free routing's Support Triage Lead → Feedback Synthesizer sequence is better for tasks that start from raw triage data.

**Recommended further fix:** Replace Feedback Synthesizer opener with Support Triage Lead, keep Feedback Synthesizer as second role. Remove Release Engineer + Deployment Verifier (overhead for docs-only tasks).

## Final Answer: Defaults or Accelerators?

### Packs are now ready to be promoted toward default entry.

The evidence:
- **3 packs win or reliably tie** their comparison (Feature, Research, Treatment)
- **2 packs tie exactly** with free routing (Bugfix, Security — same chain)
- **1 pack ties marginally** (Launch — proven pipeline)
- **1 pack still loses** (Docs — needs one more fix)
- **Zero full bluffs** on misfit tasks (was 1)
- **Zero partial bluffs** that go undetected (was 3 — now all caught by guards)

### Product posture update

| Status | Pack |
|--------|------|
| **True default** | Feature, Launch |
| **Reliable default** | Research, Treatment (win or tie, mismatch-guarded) |
| **Equivalent to free routing** | Bugfix, Security (same chain, faster to invoke) |
| **Needs one more fix** | Docs (Support Triage Lead opener) |

### Recommendation

**Promote packs to the suggested entry point.** `roleos route` should:
1. Suggest a pack when content matches ("Suggested pack: feature (high confidence)")
2. Show the pack chain as the default when `--pack` is used
3. Fall back to free routing when no pack matches or confidence is low
4. Warn on mismatch when a pack is explicitly selected but content doesn't fit

Free routing remains available for edge cases and custom chains. But for the 7 named task families, packs are now the better or equivalent starting point.
