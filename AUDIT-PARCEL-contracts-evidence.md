# AUDIT-PARCEL: contracts-evidence

**Auditor:** Component Auditor
**Files:** src/artifacts.mjs, src/artifacts-cmd.mjs, src/evidence.mjs, src/calibration.mjs, src/trial.mjs, src/review.mjs
**Lines:** 1,982
**Date:** 2026-03-27

## Findings

### C-CE-1: "approve" vs "accept" typo bug in evidence validation
- **Severity:** critical | **Confidence:** certain | **Category:** correctness
- **File:** src/evidence.mjs — line ~195
- **Evidence:** Evidence validation checks for verdict string "approve" but the Critic Reviewer contract and all tests use "accept". The check `verdict.includes("approve")` never matches the actual verdict format.
- **Impact:** Evidence-backed verdicts silently fail validation — the grounding check is bypassed for every verdict
- **Fix:** Change "approve" to "accept" (or normalize both to a canonical form)

### H-CE-2: Wrong artifact type for Dependency Auditor contract
- **Severity:** high | **Confidence:** certain | **Category:** correctness
- **File:** src/artifacts.mjs — ROLE_ARTIFACT_CONTRACTS["Dependency Auditor"]
- **Evidence:** Dependency Auditor's `artifactType` doesn't match the type used in PACK_HANDOFF_CONTRACTS flows that reference it
- **Impact:** Artifact validation fails for legitimate Dependency Auditor output
- **Fix:** Align artifact type between ROLE_ARTIFACT_CONTRACTS and PACK_HANDOFF_CONTRACTS

### M-CE-3: `validateArtifact` section matching is case-sensitive
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/artifacts.mjs — `validateArtifact()`
- **Evidence:** Required sections like "problem framing" are matched case-insensitively against markdown headers, but the `.toLowerCase()` transform may not handle Unicode correctly
- **Impact:** Edge case — non-ASCII section headers could fail validation
- **Fix:** Use locale-aware comparison or document ASCII-only requirement

### M-CE-4: `computeCalibration` divides by zero when no outcomes recorded
- **Severity:** medium | **Confidence:** likely | **Category:** error-handling
- **File:** src/calibration.mjs — `computeCalibration()`
- **Evidence:** Calibration computation divides actual outcomes by total predictions; if total is zero, result is NaN
- **Impact:** NaN propagates through calibration scores, corrupting pack boost calculations
- **Fix:** Guard against zero denominator, return neutral calibration (1.0)

### M-CE-5: `runTrial` doesn't validate manifest against current ROLE_CATALOG
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/trial.mjs — `runTrial()`
- **Evidence:** Trial manifest references role names; if catalog has changed since manifest creation, roles may not exist
- **Impact:** Trial fails with cryptic error instead of clear "role not found" message
- **Fix:** Validate manifest roles against current catalog before executing trial

### M-CE-6: `recordOutcome` writes to file without locking
- **Severity:** medium | **Confidence:** certain | **Category:** state
- **File:** src/calibration.mjs — `recordOutcome()`
- **Evidence:** Outcome is appended to JSON file via read-modify-write without file locking
- **Impact:** Concurrent outcome recording (from parallel trial runs) can corrupt the outcomes file
- **Fix:** Use atomic write (write to temp, rename) or advisory file lock

### M-CE-7: `computePackBoosts` uses arithmetic mean — outliers skew results
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/calibration.mjs — `computePackBoosts()`
- **Evidence:** Pack boost is average of outcome scores; one extreme value shifts the boost significantly
- **Impact:** A single catastrophic outcome can suppress a pack's boost score unfairly
- **Fix:** Use median or trimmed mean for robustness

### L-CE-8: `generateReview` doesn't reference the artifact contract
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/review.mjs — `generateReview()`
- **Evidence:** Review generation examines the artifact content but doesn't check it against the role's artifact contract
- **Impact:** Review may miss missing required sections that the contract mandates
- **Fix:** Cross-reference artifact against its contract during review generation

### L-CE-9: `buildTrialManifest` hardcodes trial parameters
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/trial.mjs — `buildTrialManifest()`
- **Evidence:** Trial timeout, retry count, and scoring weights are inline constants
- **Impact:** Cannot be tuned per-pack or per-role without code changes
- **Fix:** Pull parameters from pack's dispatchDefaults or make configurable

### L-CE-10: `validatePackChain` returns early on first missing step
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/artifacts.mjs — `validatePackChain()`
- **Evidence:** Actually checks all steps, but error messages reference only first failure in summary
- **Impact:** User sees one issue, fixes it, re-runs, sees next — tedious iteration
- **Fix:** Return all issues in first pass (which it does internally — improve summary message)

### L-CE-11: `formatArtifactValidation` uses emoji without fallback
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/artifacts.mjs — `formatArtifactValidation()`
- **Evidence:** Uses ✓ and ✗ characters that may not render in all terminals
- **Impact:** Garbled output on terminals without Unicode support
- **Fix:** Minor — acceptable for modern terminals

### L-CE-12: `GROUNDING_LEVELS` in evidence.mjs are not referenced by calibration
- **Severity:** low | **Confidence:** certain | **Category:** dead-code
- **File:** src/evidence.mjs — GROUNDING_LEVELS
- **Evidence:** Exported constant defining grounding levels, but calibration.mjs uses its own hardcoded levels
- **Impact:** Two parallel definitions of grounding levels, risk of drift
- **Fix:** Consolidate to single source of truth in evidence.mjs

### L-CE-13: `readOutcomes` returns empty array for missing file — no error distinction
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/calibration.mjs — `readOutcomes()`
- **Evidence:** Returns `[]` for both "no outcomes yet" and "file read error"
- **Impact:** Silent data loss — corrupted file looks like empty history
- **Fix:** Distinguish between file-not-found (expected) and read-error (unexpected)

### I-CE-14: artifacts.mjs is a hub module (4 dependents)
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **File:** src/artifacts.mjs
- **Evidence:** Consumed by run-engine, mission-entry, contracts-evidence internal modules, and tests
- **Impact:** Changes to artifact contracts ripple across the system
- **Fix:** None needed — hub status is documented in manifest

### I-CE-15: Trial and calibration subsystem is the only external I/O in this component
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/calibration.mjs, src/trial.mjs
- **Evidence:** These two files do file I/O (read/write outcomes); all other files in the component are pure functions
- **Impact:** I/O surface is small and well-contained
- **Fix:** None — good isolation

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 1 |
| Medium | 5 |
| Low | 6 |
| Info | 2 |
| **Total** | **15** |

**Top risks:** The "approve" vs "accept" bug (C-CE-1) is the only critical finding in the entire audit. It means evidence-backed verdict validation is silently broken. The wrong artifact type (H-CE-2) means one role's output always fails contract validation.

**Blocking questions:** Is the "approve"/"accept" divergence intentional (different verdict vocabularies for different contexts) or a typo? All tests use "accept" which suggests "approve" is wrong.

**Adjacent parcel risks:** run-engine's `completeStep` calls `validateArtifact` — if artifact types are wrong (H-CE-2), run completion may be incorrectly gated. Mission-entry imports artifacts for mission step definitions — type mismatches propagate.
