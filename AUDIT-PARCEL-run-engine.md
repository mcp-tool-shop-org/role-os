# AUDIT-PARCEL: run-engine

**Auditor:** Component Auditor
**Files:** src/run.mjs, src/run-cmd.mjs, src/dispatch.mjs, src/replan.mjs, src/composite.mjs
**Lines:** 2,545
**Date:** 2026-03-27

## Findings

### H-RE-1: Non-atomic persistence in `completeStep` / `failStep`
- **Severity:** high | **Confidence:** certain | **Category:** state
- **File:** src/run.mjs — `completeStep()`, `failStep()`
- **Evidence:** Step status, artifact, and run status are updated sequentially. If process crashes between step.status update and run.status update, state is inconsistent.
- **Impact:** Run can be in limbo — step completed but run still "running" — with no recovery path
- **Fix:** Wrap state transitions in an atomic write (write full run state to temp file, rename)

### H-RE-2: Incompatible state machines between `run.mjs` and `mission-run.mjs`
- **Severity:** high | **Confidence:** certain | **Category:** architecture
- **File:** src/run.mjs vs src/mission-run.mjs
- **Evidence:** `run.mjs` has states: created→running→paused→completed/failed. `mission-run.mjs` has: planning→running→completed/partial/failed. "paused" doesn't exist in mission-run; "planning" doesn't exist in run.
- **Impact:** Code that checks `run.status === "paused"` will never match a mission-run, and vice versa
- **Fix:** Unify state machines or document the divergence as intentional with adapter functions

### H-RE-3: Unbounded recursion in `isDependentOn`
- **Severity:** high | **Confidence:** certain | **Category:** correctness
- **File:** src/composite.mjs — `isDependentOn()`
- **Evidence:** Recursive traversal of dependency graph with no visited-set guard
- **Impact:** Cyclic dependencies cause stack overflow
- **Fix:** Add visited-set parameter, bail on revisit

### H-RE-4: Escalation can create dual-active states
- **Severity:** high | **Confidence:** likely | **Category:** state
- **File:** src/run.mjs — escalation handling
- **Evidence:** When an escalation re-opens a completed step, the currently active step is not deactivated first
- **Impact:** Two steps can be simultaneously "active", violating the single-active-step invariant
- **Fix:** Deactivate current active step before re-opening escalation target

### M-RE-5: `buildDispatchManifest` includes all steps regardless of status
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/dispatch.mjs — `buildDispatchManifest()`
- **Evidence:** Manifest includes completed and failed steps alongside pending ones
- **Impact:** Dispatcher may attempt to re-dispatch already-completed work
- **Fix:** Filter to pending/active steps only, or mark completed steps clearly

### M-RE-6: `generateEscalationPacket` hardcodes escalation format
- **Severity:** medium | **Confidence:** certain | **Category:** architecture
- **File:** src/dispatch.mjs — `generateEscalationPacket()`
- **Evidence:** Escalation packet format is a string template, not structured data
- **Impact:** Consumers must parse strings instead of inspecting fields
- **Fix:** Return structured object with string rendering as a method

### M-RE-7: `replan` doesn't validate that new plan is compatible with completed work
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/replan.mjs — `replan()`
- **Evidence:** Replanning generates new steps but doesn't check whether completed artifacts are still valid under the new plan
- **Impact:** Stale artifacts from pre-replan steps may be consumed by post-replan steps
- **Fix:** Flag completed steps as "pre-replan" and require explicit validation

### M-RE-8: `updateStepState` accepts any string as status
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/dispatch.mjs — `updateStepState()`
- **Evidence:** No enum validation on status parameter
- **Impact:** Invalid status strings silently create corrupted state
- **Fix:** Validate against allowed status enum

### M-RE-9: `synthesizeResults` concatenates without deduplication
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/composite.mjs — `synthesizeResults()`
- **Evidence:** Results from parallel branches are concatenated; duplicate findings from overlapping work are not detected
- **Impact:** Synthesis output may contain redundant findings
- **Fix:** Add deduplication by finding ID or content hash

### M-RE-10: Run ID generation uses `Date.now()` — not unique under parallel dispatch
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/run.mjs — `createRun()`
- **Evidence:** ID is `${missionKey}-${Date.now()}` — two runs created in the same millisecond collide
- **Impact:** ID collision in parallel dispatch scenarios (which deep-audit uses)
- **Fix:** Add random suffix or use crypto.randomUUID()

### L-RE-11: `resumeRun` doesn't validate run integrity before resuming
- **Severity:** low | **Confidence:** likely | **Category:** error-handling
- **File:** src/run.mjs — `resumeRun()`
- **Evidence:** Resumes from persisted state without checking for corruption (e.g., missing steps, invalid status)
- **Impact:** Corrupted state silently propagates
- **Fix:** Run integrity check before resume

### L-RE-12: `buildReplanOptions` returns hardcoded options
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/replan.mjs — `buildReplanOptions()`
- **Evidence:** Options are static regardless of failure context
- **Impact:** Replan suggestions may not be relevant to the actual failure
- **Fix:** Consider failure-type-aware option generation

### L-RE-13: `decomposeComposite` has no size guard
- **Severity:** low | **Confidence:** possible | **Category:** correctness
- **File:** src/composite.mjs — `decomposeComposite()`
- **Evidence:** No limit on decomposition depth or breadth
- **Impact:** Pathological input could create thousands of sub-steps
- **Fix:** Add max-depth and max-breadth guards

### L-RE-14: `runCommand` doesn't sanitize command input
- **Severity:** low | **Confidence:** certain | **Category:** security
- **File:** src/run-cmd.mjs — `runCommand()`
- **Evidence:** Command strings passed through without validation
- **Impact:** Internal-only (commands come from mission definitions, not user input), but defense-in-depth suggests validation
- **Fix:** Validate command format against allowed patterns

### L-RE-15: TOOL_PROFILES are append-only — no validation against ROLE_CATALOG
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/dispatch.mjs — TOOL_PROFILES
- **Evidence:** Tool profiles reference role names as strings; no check that roles exist
- **Impact:** Typo in profile key silently orphans the profile
- **Fix:** Add test that validates all TOOL_PROFILES keys exist in ROLE_CATALOG

### I-RE-16: run.mjs is 949 lines — largest file in the codebase
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/run.mjs
- **Evidence:** 949 lines with state machine, persistence, step management, and run lifecycle all in one file
- **Impact:** High cognitive load for maintainers
- **Fix:** Consider extracting state machine transitions into a separate module

### L-RE-17: `completeStep` doesn't validate artifact content
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/run.mjs — `completeStep()`
- **Evidence:** Accepts any string as artifact, including empty string
- **Impact:** Empty artifacts pass silently through the chain
- **Fix:** Reject empty/whitespace-only artifacts

### M-RE-18: No timeout mechanism for active steps
- **Severity:** medium | **Confidence:** certain | **Category:** state
- **File:** src/run.mjs
- **Evidence:** A step marked "active" stays active indefinitely if the worker crashes
- **Impact:** Run is stuck forever with no recovery path
- **Fix:** Add step timeout with auto-fail after configurable duration

### L-RE-19: `failStep` with "partial" doesn't preserve partial artifact
- **Severity:** low | **Confidence:** likely | **Category:** correctness
- **File:** src/run.mjs — `failStep()`
- **Evidence:** Partial failure records a note but discards any partial work product
- **Impact:** Partial work is lost; next attempt starts from scratch
- **Fix:** Accept optional partial artifact parameter

### I-RE-20: dispatch.mjs imports escalation.mjs — cross-component dependency
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **File:** src/dispatch.mjs
- **Evidence:** dispatch imports from escalation (owned by routing-roles component)
- **Impact:** Creates coupling between run-engine and routing-roles beyond the documented boundary
- **Fix:** Document as intentional shared-leaf dependency (already noted in manifest)

### L-RE-21: `buildDispatchManifest` doesn't include tool profiles
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/dispatch.mjs
- **Evidence:** Dispatch manifest lists steps and roles but doesn't attach TOOL_PROFILES
- **Impact:** Consumers must separately look up tool profiles
- **Fix:** Include tool profile in each step of the manifest

### M-RE-22: State transitions not validated — can go from "completed" to "active"
- **Severity:** medium | **Confidence:** certain | **Category:** state
- **File:** src/run.mjs
- **Evidence:** Escalation re-opening allows completed→pending transition, but no formal state machine enforces valid transitions
- **Impact:** Any code path can set any status, bypassing intended lifecycle
- **Fix:** Add transition validator that only allows declared transitions

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 4 |
| Medium | 8 |
| Low | 8 |
| Info | 2 |
| **Total** | **22** |

**Top risks:** Non-atomic persistence (H-RE-1) and dual-active states (H-RE-4) are the highest-risk findings. Both can corrupt run state in ways that are difficult to diagnose. Unbounded recursion (H-RE-3) is a crash bug waiting for the right input.

**Blocking questions:** Is the divergent state machine (H-RE-2) between run.mjs and mission-run.mjs intentional? If so, adapter functions are needed. If not, one must be deprecated.

**Adjacent parcel risks:** mission-entry consumes run-engine's state machine — the incompatible states (H-RE-2) directly affect mission lifecycle tracking.
