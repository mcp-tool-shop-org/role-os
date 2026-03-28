# AUDIT-SEAM: Role-OS Boundary Audit

**Auditor:** Seam Auditor
**Repo:** mcp-tool-shop-org/role-os v2.1.0
**Date:** 2026-03-27
**Boundaries inspected:** 8
**Total findings:** 15 (12 unique — S-X1 consolidates S-3a and S-5b)

---

## Boundary 1: run-engine → routing-roles
**Interface:** `run.mjs` imports `route.mjs` and `packs.mjs`
**Contract:** `assembleChain()` returns role chain for run steps

### S-1a: Dead import — TEAM_PACKS in run.mjs
- **Severity:** low | **Confidence:** certain | **Category:** dependency
- **Files:** src/run.mjs:19-20, src/packs.mjs:30
- **Evidence:** `run.mjs` imports `TEAM_PACKS` but never uses it. Only `getPack()` is called.
- **Impact:** False coupling signal. No functional bug.
- **Fix:** Remove `TEAM_PACKS` from the import.

### S-1b: Manifest contract is inaccurate — assembleChain() never called
- **Severity:** info | **Confidence:** certain | **Category:** contract
- **Files:** src/run.mjs:20,425, src/route.mjs:12
- **Evidence:** run.mjs imports `ROLE_CATALOG` for validation in `reroute()` only. It never calls `assembleChain()`. It builds chains through `buildMissionSteps`, `buildPackSteps`, `buildFreeRoutingSteps`.
- **Impact:** Manifest contract description is wrong — documentation issue, not a bug.
- **Fix:** Update manifest contract to: "run.mjs reads ROLE_CATALOG for role name validation during reroute".

---

## Boundary 2: run-engine → mission-entry
**Interface:** `run.mjs` imports `entry.mjs` and `mission.mjs`
**Contract:** entry provides run manifest, mission provides step definitions

### S-2a: Clean boundary — no issues
- **Severity:** info | **Confidence:** certain | **Category:** contract
- **Evidence:** Both imports are real and correctly used. `decideEntry()` returns `{level, mission, pack, ...}`, `getMission()` returns mission or null — both properly null-checked.

---

## Boundary 3: run-engine → contracts-evidence
**Interface:** `run.mjs` imports `artifacts.mjs`
**Contract:** `validateArtifact()` gates step completion

### S-3a: validateArtifact() never called — quality gate is unwired
- **Severity:** medium | **Confidence:** certain | **Category:** contract
- **Files:** src/run.mjs:21-22, src/run.mjs:308, src/artifacts.mjs:305
- **Evidence:** run.mjs imports `ROLE_ARTIFACT_CONTRACTS` and `getHandoffContract` but **never calls `validateArtifact()`**. Step completion at `completeCurrentStep()` accepts any string without validation.
- **Impact:** The manifest contract is violated. Steps complete with arbitrary content, bypassing structural validation.
- **Fix:** Call `validateArtifact(step.role, artifact)` in `completeCurrentStep()` or update manifest to state validation is opt-in.

### S-3b: Redundant import statements from same module
- **Severity:** low | **Confidence:** certain | **Category:** dependency
- **Files:** src/run.mjs:21-22
- **Evidence:** Two separate `import` lines from `./artifacts.mjs`.
- **Fix:** Combine into single import statement.

---

## Boundary 4: mission-entry → routing-roles
**Interface:** `mission.mjs` and `entry.mjs` import `route.mjs` and `packs.mjs`
**Contract:** missions reference pack names and route through role catalog

### S-4a: Dead import — ROLE_CATALOG in entry.mjs
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **Files:** src/entry.mjs:18
- **Evidence:** `entry.mjs` imports `ROLE_CATALOG` but never references it in any function body.
- **Fix:** Remove `ROLE_CATALOG` import from entry.mjs.

---

## Boundary 5: mission-entry → contracts-evidence
**Interface:** `mission.mjs` and `mission-run.mjs` import `artifacts.mjs`
**Contract:** missions define required artifacts per step

### S-5a: No-op artifact contract check in validateMission()
- **Severity:** medium | **Confidence:** certain | **Category:** contract
- **Files:** src/mission.mjs:18, src/mission.mjs:459-464
- **Evidence:** `validateMission()` checks if a contract exists for each artifactFlow role but does nothing with the result. No warning emitted, no issue added.
- **Impact:** New missions referencing roles without artifact contracts pass validation silently.
- **Fix:** Add warning to issues array when artifactFlow role lacks a contract.

### S-5b: Three dead imports in mission-run.mjs
- **Severity:** low | **Confidence:** certain | **Category:** state
- **Files:** src/mission-run.mjs:13-14
- **Evidence:** `validateArtifact`, `ROLE_ARTIFACT_CONTRACTS`, and `TEAM_PACKS` are imported but never used.
- **Impact:** Same gap as S-3a — artifact validation imported but unwired at mission-run layer.
- **Fix:** Wire `validateArtifact()` into `completeStep()` or remove unused imports.

---

## Boundary 6: contracts-evidence → routing-roles
**Interface:** `trial.mjs` imports `route.mjs`, `review.mjs` imports `escalation.mjs`
**Contract:** trials use routing to assign roles, reviews use escalation for failures

### S-6a: Dead imports in trial.mjs
- **Severity:** info | **Confidence:** certain | **Category:** correctness
- **Files:** src/trial.mjs:12-13
- **Evidence:** `scoreRole` and `MIN_SCORE_THRESHOLD` imported from route.mjs but never used.
- **Fix:** Remove unused imports.

### S-6b: Clean boundary — review.mjs → escalation.mjs
- **Severity:** info | **Confidence:** certain | **Category:** correctness
- **Evidence:** `resolveBlocked()`, `resolveRejected()`, `formatEscalation()` all correctly used.

### S-6c: Undocumented cross-boundary dependency — trial.mjs → dispatch.mjs
- **Severity:** medium | **Confidence:** likely | **Category:** dependency
- **Files:** src/trial.mjs:13, src/dispatch.mjs:97
- **Evidence:** `trial.mjs` (contracts-evidence) imports `TOOL_PROFILES` from `dispatch.mjs` (run-engine). This creates a **circular dependency**: run-engine → contracts-evidence (artifacts.mjs) AND contracts-evidence → run-engine (dispatch.mjs).
- **Impact:** Violates layered architecture. Prevents clean component extraction.
- **Fix:** Move `TOOL_PROFILES` to a shared module or accept as parameter.

---

## Boundary 7: routing-roles → session-scaffolding
**Interface:** `route.mjs` imports `fs-utils.mjs`
**Contract:** readJSON for loading saved routing state

### S-7a: Contract description is inaccurate
- **Severity:** low | **Confidence:** certain | **Category:** contract
- **Files:** src/route.mjs:3, src/fs-utils.mjs:68
- **Evidence:** route.mjs imports `readFileSafe` (not readJSON) and uses it to read Markdown packet files, not JSON routing state.
- **Fix:** Update manifest contract to: "readFileSafe for reading packet file content."

---

## Boundary 8: run-engine → session-scaffolding
**Interface:** `dispatch.mjs` imports `escalation.mjs` (shared leaf)
**Contract:** generateEscalationPacket uses escalation routing

### S-8a: Boundary is mislabeled in manifest
- **Severity:** low | **Confidence:** certain | **Category:** contract
- **Files:** src/dispatch.mjs:18, src/escalation.mjs
- **Evidence:** `escalation.mjs` is owned by routing-roles, not session-scaffolding. This boundary should be labeled "run-engine → routing-roles", not "run-engine → session-scaffolding".
- **Fix:** Relabel in manifest or merge with Boundary 1.

---

## Cross-Boundary Findings

### S-X1: Artifact validation is dead code at all execution boundaries (HIGH)
- **Severity:** high | **Confidence:** certain | **Category:** contract
- **Files:** src/run.mjs:308, src/mission-run.mjs:124, src/artifacts.mjs:305
- **Evidence:** Both `completeCurrentStep()` in run.mjs and `completeStep()` in mission-run.mjs accept artifact completion without calling `validateArtifact()`. The function is imported in both files but never invoked. The system's core promise — "downstream roles never guess what they received" — is not enforced at either execution seam.
- **Impact:** The entire artifact validation subsystem (30+ role contracts, required sections, evidence requirements) is **dead code at runtime**. Enforcement exists only in `roleos artifacts validate` CLI, not in execution flow.
- **Fix:** Add validation gates in both completion functions. Return warnings to operator rather than hard-blocking.

### S-X2: Circular dependency between run-engine and contracts-evidence (MEDIUM)
- **Severity:** medium | **Confidence:** certain | **Category:** dependency
- **Files:** src/trial.mjs:13 → src/dispatch.mjs, src/run.mjs:21 → src/artifacts.mjs
- **Evidence:** run-engine imports from contracts-evidence (artifacts.mjs), contracts-evidence imports from run-engine (dispatch.mjs via trial.mjs). JavaScript ESM handles this without crashing (static data), but it violates the layered architecture.
- **Fix:** Extract `TOOL_PROFILES` into shared utility module.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 4 |
| Info | 6 |
| **Total** | **15** |

### Top 3 Findings

1. **S-X1 (HIGH):** Artifact validation imported but never called at either execution boundary. The documented quality gate does not exist at runtime.
2. **S-X2 (MEDIUM):** Circular dependency via trial.mjs → dispatch.mjs violates layered architecture.
3. **S-3a / S-5a (MEDIUM):** Manifest contracts don't match code reality — validation claims are aspirational.

### What Is Clean

- Boundary 2 (run-engine → mission-entry): Correct imports, proper null checks, types align
- Boundary 6b (review.mjs → escalation.mjs): All imports correctly used
- Boundary 7 (route.mjs → fs-utils.mjs): Import real and correctly used
- No secrets or credentials leak across boundaries
- No state mutation leaks — all boundary functions operate on passed parameters or module-level constants
