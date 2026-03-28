# AUDIT-ACTION-PLAN: Role-OS v2.1.0

**Date:** 2026-03-27
**Based on:** AUDIT-SUMMARY.md + 6 parcel reports + seam report + test truth report
**Total findings:** 128 (2 critical, 11 high, 39 medium, 50 low, 25 info)

---

## Priority 1: Critical Bug Fix (Do Now)

### P1-1: Fix "approve" → "accept" in evidence.mjs
- **Findings:** C-CE-1, T-contracts-evidence-1, T-contracts-evidence-2
- **Files:** src/evidence.mjs (line 195 + lines 185, 191, 197, 203)
- **Action:**
  1. Change `verdict.verdict !== "approve"` to `verdict.verdict !== "accept"` on line 195
  2. Replace all "approve" strings in warning messages with "accept" (lines 185, 191, 197, 203)
  3. Add test: clean `{verdict: "accept"}` with no gaps produces zero warnings
  4. Add test: warning messages reference "accept", not "approve"
- **Effort:** ~30 minutes
- **Risk if skipped:** Evidence validation silently broken for every accept verdict

---

## Priority 2: Wire the Quality Gate (Do This Week)

### P2-1: Wire validateArtifact at execution boundaries
- **Findings:** S-X1, S-3a, S-5b
- **Files:** src/run.mjs (`completeCurrentStep`), src/mission-run.mjs (`completeStep`)
- **Action:**
  1. In both completion functions, call `validateArtifact(step.role, artifact)`
  2. If `valid === false`, add validation result to step warnings (don't hard-block)
  3. Add tests proving validation runs at completion time
  4. Remove dead imports in mission-run.mjs (TEAM_PACKS, ROLE_ARTIFACT_CONTRACTS if unused after wiring)
- **Effort:** ~2 hours
- **Risk if skipped:** Core value proposition ("downstream roles never guess what they received") is unenforced

---

## Priority 3: Run-Engine Hardening (Do This Sprint)

### P3-1: Fix unbounded recursion in isDependentOn
- **Finding:** H-RE-3
- **File:** src/composite.mjs
- **Action:** Add visited-set parameter, bail on revisit
- **Effort:** ~30 minutes

### P3-2: Prevent dual-active states from escalation
- **Finding:** H-RE-4
- **File:** src/run.mjs
- **Action:** Deactivate current active step before re-opening escalation target
- **Effort:** ~1 hour

### P3-3: Atomic persistence for state transitions
- **Finding:** H-RE-1
- **File:** src/run.mjs
- **Action:** Write full run state to temp file, rename to target (atomic on POSIX and NTFS)
- **Effort:** ~1 hour

### P3-4: Add state transition validator
- **Finding:** H-RE-22 (M), H-RE-2 (H)
- **File:** src/run.mjs
- **Action:** Define valid transitions as a map, reject invalid transitions. Decide whether run.mjs and mission-run.mjs should share a state machine or remain divergent.
- **Effort:** ~2 hours

---

## Priority 4: Correctness Fixes (Do Next Sprint)

### P4-1: Fix artifact type mismatch for Dependency Auditor
- **Finding:** H-CE-2
- **File:** src/artifacts.mjs
- **Action:** Align artifact type between ROLE_ARTIFACT_CONTRACTS and PACK_HANDOFF_CONTRACTS

### P4-2: Fix partitionBrief fail-open for unknown roles
- **Finding:** H-BS-1
- **File:** src/brainstorm-roles.mjs
- **Action:** Unknown roles receive empty/minimal brief, not full access

### P4-3: Align atom field names between brainstorm.mjs and brainstorm-roles.mjs
- **Finding:** H-BS-2
- **Files:** src/brainstorm.mjs, src/brainstorm-roles.mjs
- **Action:** Standardize on one field naming scheme (claim/evidence/confidence) or add normalization layer

### P4-4: Fix /dev/stdin for Windows
- **Finding:** H-SS-1
- **File:** src/session.mjs (or CLI entry)
- **Action:** Use `process.stdin` or `fs.readFileSync(0)` for cross-platform stdin

### P4-5: Break circular dependency (trial.mjs → dispatch.mjs)
- **Finding:** S-X2, S-6c
- **Files:** src/trial.mjs, src/dispatch.mjs
- **Action:** Extract TOOL_PROFILES to shared module or accept as parameter

---

## Priority 5: Test Suite Improvements (Ongoing)

| ID | Action | Finding |
|----|--------|---------|
| P5-1 | Add concurrency test for persistent run state | T-run-engine-1 |
| P5-2 | Add case-insensitive section header test for artifacts | T-contracts-evidence-3 |
| P5-3 | Add corrupted ledger file test for calibration | T-contracts-evidence-4 |
| P5-4 | Add chain length cap test for assembleChain | T-routing-roles-2 |
| P5-5 | Add atom pool resolution test for golden-run challenges | T-brainstorm-2 |
| P5-6 | Add U6 artifact persistence round-trip assertion | T-run-engine-2 |

---

## Priority 6: Medium-Severity Polish (Backlog)

These 39 medium findings are real but non-urgent. Group by theme:

**Validation gaps (11):** M-RE-5, M-RE-7, M-RE-8, M-RE-9, M-RE-10, M-ME-2, M-ME-3, M-ME-4, M-CE-3, M-CE-5, M-CE-7
**State management (3):** M-RE-18, M-RE-22, M-CE-6
**Architecture (5):** M-RE-6, M-SS-2, M-SS-3, M-SS-4, S-5a
**Brainstorm (5):** M-BS-3, M-BS-4, M-BS-5, M-BS-6, M-BS-7, M-BS-15
**Routing (3):** M-RR-1, M-RR-11, M-RR-14

---

## Priority 7: Manifest Corrections (Quick)

Update audit-manifest.json:
1. Boundary 1 contract: "assembleChain()" → "ROLE_CATALOG for role validation"
2. Boundary 3 contract: "validateArtifact() gates completion" → "ROLE_ARTIFACT_CONTRACTS for step guidance" (until P2-1 ships)
3. Boundary 7 contract: "readJSON" → "readFileSafe for packet content"
4. Boundary 8: relabel from session-scaffolding to routing-roles
5. contracts-evidence upstream_deps: add "run-engine"

---

## Not Addressed by This Audit

- **dynamicDispatch runtime** (H-ME-1): Declared but unconsumed. This is a feature gap, not a bug. The deep-audit mission works through manual orchestration today. Implementing the runtime is a feature decision, not a fix.
- **Performance:** No performance profiling was done. The linear scan of 54 roles in scoreRole() is noted (I-RR-10) but not a concern at current scale.
- **Content parcels:** starter-pack/ and .claude/ Markdown content was not audited for consistency with code contracts. This should be a separate audit pass.

---

## Recommended Execution Order

```
Week 1:  P1-1 (critical bug)  →  P2-1 (wire quality gate)  →  P3-1 thru P3-4 (run-engine hardening)
Week 2:  P4-1 thru P4-5 (correctness fixes)  →  P5-1 thru P5-6 (test improvements)
Week 3+: P6 (medium polish, prioritized by user impact)  →  P7 (manifest corrections)
```

Total estimated effort: ~3-4 days for P1-P5, ongoing for P6.
