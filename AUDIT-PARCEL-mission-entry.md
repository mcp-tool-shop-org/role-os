# AUDIT-PARCEL: mission-entry

**Auditor:** Component Auditor
**Files:** src/mission.mjs, src/mission-cmd.mjs, src/mission-run.mjs, src/entry.mjs, src/entry-cmd.mjs, src/decompose.mjs
**Lines:** 1,741
**Date:** 2026-03-27

## Findings

### H-ME-1: `dynamicDispatch` field declared but never consumed by runtime
- **Severity:** high | **Confidence:** certain | **Category:** correctness
- **File:** src/mission.mjs — MISSIONS["deep-audit"].dynamicDispatch
- **Evidence:** The deep-audit mission declares `dynamicDispatch` with scaling rules, but `createRun()` in mission-run.mjs builds steps from static `artifactFlow` only. No code reads `dynamicDispatch`.
- **Impact:** Deep-audit mission cannot function as designed — it dispatches 5 static steps instead of N+K+M+1 dynamic workers
- **Fix:** Implement dynamic dispatch in `createRun()` that reads manifest and creates steps per component/boundary when `dynamicDispatch` is present

### M-ME-2: `suggestMission` uses simple keyword counting — no TF-IDF or weighting
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/mission.mjs — `suggestMission()`
- **Evidence:** Signal matching counts keyword hits; common words like "bug" score same as specific phrases like "root cause analysis"
- **Impact:** Ambiguous descriptions may match wrong mission
- **Fix:** Weight multi-word signals higher than single-word matches

### M-ME-3: `selectEntryPath` doesn't validate pack existence
- **Severity:** medium | **Confidence:** certain | **Category:** error-handling
- **File:** src/entry.mjs — `selectEntryPath()`
- **Evidence:** Entry path selection references pack names without verifying they exist in TEAM_PACKS
- **Impact:** Nonexistent pack reference produces cryptic downstream error
- **Fix:** Validate pack existence at entry selection time

### M-ME-4: `decompose` complexity estimation is coarse
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/decompose.mjs — `estimateComplexity()`
- **Evidence:** Complexity is "low/medium/high" based on step count thresholds alone, not actual task content
- **Impact:** A 3-step mission with complex steps is rated "low" while a 7-step trivial mission is "high"
- **Fix:** Factor in role complexity hints or artifact difficulty

### L-ME-5: `buildEntryManifest` includes redundant fields
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/entry.mjs — `buildEntryManifest()`
- **Evidence:** Manifest duplicates mission fields (name, description, pack) that are already in MISSIONS
- **Impact:** Maintenance burden — changes to mission must be reflected in manifest
- **Fix:** Reference mission by key instead of copying fields

### L-ME-6: Mission `dispatchDefaults` are never applied during dispatch
- **Severity:** low | **Confidence:** certain | **Category:** dead-code
- **File:** src/mission.mjs — all missions have `dispatchDefaults`
- **Evidence:** `maxTurns`, `maxBudgetUsd`, `model` are declared but no code reads them during run creation or dispatch
- **Impact:** Budget/turn limits are aspirational, not enforced
- **Fix:** Wire dispatch defaults into the dispatch manifest or document as advisory-only

### L-ME-7: `executeMissionRun` is imported in tests but not in any src/ file
- **Severity:** low | **Confidence:** likely | **Category:** dead-code
- **File:** src/mission-run.mjs — `executeMissionRun`
- **Evidence:** Exported but only consumed by test files, not by any other source module
- **Impact:** May indicate incomplete wiring or premature export
- **Fix:** Verify intended usage; if CLI-only, document the entry point

### L-ME-8: `validateMission` checks structure but not semantic consistency
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/mission.mjs — `validateMission()`
- **Evidence:** Validates that fields exist and have correct types, but doesn't check that roleChain roles exist in ROLE_CATALOG or that pack exists in TEAM_PACKS
- **Impact:** Mission can reference nonexistent roles/packs and still pass validation
- **Fix:** Add cross-reference validation against ROLE_CATALOG and TEAM_PACKS

### L-ME-9: Mission `escalationBranches` have no ordering guarantee
- **Severity:** low | **Confidence:** possible | **Category:** correctness
- **File:** src/mission.mjs — all missions
- **Evidence:** Escalation branches are evaluated in array order; first match wins
- **Impact:** Branch ordering affects which escalation fires for ambiguous triggers
- **Fix:** Document evaluation order or add priority field

### I-ME-10: `mission.mjs` is a dependency aggregator — imports 4 other src modules
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **File:** src/mission.mjs
- **Evidence:** Imports from route.mjs, packs.mjs, artifacts.mjs, and entry.mjs
- **Impact:** Changes to any of those modules may break mission.mjs
- **Fix:** Acceptable for an aggregator; ensure import surface is narrow

### I-ME-11: Deep-audit mission `stopConditions` reference "manifest exhausted" but no manifest consumption exists
- **Severity:** info | **Confidence:** certain | **Category:** correctness
- **File:** src/mission.mjs — MISSIONS["deep-audit"].stopConditions
- **Evidence:** Stop condition says "all manifest components audited" but no runtime checks manifest completion
- **Impact:** Stop condition is aspirational, not enforceable
- **Fix:** Implement manifest-completion tracking when dynamicDispatch is wired

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 5 |
| Info | 2 |
| **Total** | **11** |

**Top risks:** The dynamicDispatch gap (H-ME-1) means the deep-audit mission — the mission we're currently running — cannot function through the normal mission runner. It works only through manual orchestration (as we're doing now).

**Blocking questions:** Is dynamicDispatch intended to be implemented in v2.2, or is it permanently a manual-orchestration-only feature?

**Adjacent parcel risks:** run-engine depends on mission-entry's step definitions. If dynamicDispatch is implemented, run-engine's createRun will need corresponding changes.
