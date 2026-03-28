# AUDIT-PARCEL: routing-roles

**Auditor:** Component Auditor
**Files:** src/route.mjs, src/conflicts.mjs, src/escalation.mjs, src/packs.mjs
**Lines:** 1,587
**Date:** 2026-03-27

## Findings

### M-RR-1: Substring matching causes false positives in keyword scoring
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/route.mjs — `scoreRole()`
- **Evidence:** Keywords like "audit" match "audit-synthesizer" and "component-auditor" equally; "security" matches both Security Reviewer and security-hardening mission
- **Impact:** Ambiguous routing when multiple roles share keyword roots
- **Fix:** Use word-boundary matching or exact-token matching instead of `.includes()`

### M-RR-2: Scout and Analyst role overlap in keyword space
- **Severity:** medium | **Confidence:** likely | **Category:** architecture
- **File:** src/route.mjs — ROLE_CATALOG
- **Evidence:** "Repo Researcher" and "Repo Scout" share keywords: research, explore, codebase, understand
- **Impact:** Routing may pick the wrong scout/analyst depending on input phrasing
- **Fix:** Differentiate trigger keywords more sharply or add disambiguation logic

### M-RR-3: `assembleChain` returns roles in catalog order, not dependency order
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/route.mjs — `assembleChain()`
- **Evidence:** Chain is assembled by filtering top-scored roles, but order depends on ROLE_CATALOG iteration order, not the pack's `chainOrder`
- **Impact:** Downstream consumers may receive roles in wrong execution order
- **Fix:** Sort assembled chain by pack's declared chainOrder or phase field

### M-RR-4: `detectType` falls through to "task" for ambiguous inputs
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/route.mjs — `detectType()`
- **Evidence:** Default return is "task" when no signals match, even for clearly non-task inputs like questions
- **Impact:** Misclassification leads to wrong role selection downstream
- **Fix:** Add a "question" or "unknown" type with explicit handling

### M-RR-5: Pack keyword matching duplicates role keyword matching
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/packs.mjs — PACK_KEYWORDS
- **Evidence:** PACK_KEYWORDS mirrors role keywords from ROLE_CATALOG, creating two parallel matching systems
- **Impact:** Maintenance burden — changes to role keywords must be mirrored in pack keywords
- **Fix:** Derive pack keywords from constituent roles' keywords automatically

### L-RR-6: `assessConfidence` thresholds are magic numbers
- **Severity:** low | **Confidence:** certain | **Category:** naming
- **File:** src/route.mjs — `assessConfidence()`
- **Evidence:** Confidence boundaries (0.7, 0.4) are inline literals with no documentation
- **Impact:** Hard to tune or understand calibration
- **Fix:** Extract to named constants with documentation

### L-RR-7: `detectConflicts` only checks direct role-pair conflicts
- **Severity:** low | **Confidence:** likely | **Category:** correctness
- **File:** src/conflicts.mjs — `detectConflicts()`
- **Evidence:** Conflict detection is pairwise; transitive conflicts (A conflicts with B, B conflicts with C, therefore A-C chain is risky) are not detected
- **Impact:** Complex chains may contain hidden friction
- **Fix:** Consider transitive conflict propagation for chains > 3 roles

### L-RR-8: `escalate` function has no cycle detection
- **Severity:** low | **Confidence:** possible | **Category:** state
- **File:** src/escalation.mjs — `escalate()`
- **Evidence:** Escalation routing follows `findResolver()` but doesn't track visited roles
- **Impact:** Theoretical infinite escalation loop if resolver graph has cycles
- **Fix:** Add visited-set or max-depth guard

### L-RR-9: Pack `optionalRoles` are never validated against ROLE_CATALOG
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/packs.mjs — TEAM_PACKS
- **Evidence:** `optionalRoles` arrays reference role names as strings but no validation ensures they exist in ROLE_CATALOG
- **Impact:** Typo in optional role name silently fails
- **Fix:** Add startup validation or test that checks all referenced role names exist

### I-RR-10: 54 roles in catalog — consider grouping or indexing
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/route.mjs — ROLE_CATALOG
- **Evidence:** Linear scan of 54 entries on every `scoreRole()` call
- **Impact:** Not a performance issue at current scale, but maintenance cost grows
- **Fix:** No action needed now; consider indexed lookup if catalog exceeds ~100

### M-RR-11: `routeCommand` returns first match above threshold, not best match
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/route.mjs — `routeCommand()`
- **Evidence:** Returns early on first role exceeding confidence threshold rather than scoring all and picking highest
- **Impact:** Suboptimal role selection when multiple roles qualify
- **Fix:** Score all candidates, return highest

### L-RR-12: Deep-audit pack `chainOrder` is a prose string, not machine-parseable
- **Severity:** low | **Confidence:** certain | **Category:** naming
- **File:** src/packs.mjs — TEAM_PACKS["deep-audit"]
- **Evidence:** `chainOrder: "Component Auditor (×N, parallel) + Test Truth Auditor (×M) → Seam Auditor (×K, from graph) → Audit Synthesizer"`
- **Impact:** Cannot be programmatically consumed for ordering
- **Fix:** Consider structured format alongside prose description

### L-RR-13: `getPack` and `getPackList` have no input validation
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/packs.mjs
- **Evidence:** `getPack(null)` returns undefined without error
- **Impact:** Callers must handle undefined; no helpful error message
- **Fix:** Throw or return explicit null with message for invalid inputs

### M-RR-14: Score normalization differs between `scoreRole` and `assessConfidence`
- **Severity:** medium | **Confidence:** possible | **Category:** correctness
- **File:** src/route.mjs
- **Evidence:** `scoreRole` produces raw additive scores; `assessConfidence` maps to confidence bands — but the mapping doesn't account for varying keyword counts per role
- **Impact:** Roles with more keywords naturally score higher regardless of match quality
- **Fix:** Normalize score by role's keyword count before confidence mapping

### I-RR-15: No telemetry or logging of routing decisions
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/route.mjs
- **Evidence:** Routing decisions are fire-and-forget; no trace of why a role was selected
- **Impact:** Hard to debug misrouting in production
- **Fix:** Consider optional verbose mode that returns scoring breakdown

### L-RR-16: `findResolver` returns null silently for unknown trigger types
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/escalation.mjs
- **Evidence:** Unknown trigger returns null, no log or warning
- **Impact:** Caller may not realize escalation was silently dropped
- **Fix:** Log warning for unrecognized trigger types

### I-RR-17: ROLE_CATALOG is a flat array — no semantic grouping
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/route.mjs
- **Evidence:** 54 roles in one flat array with only comments separating groups
- **Impact:** Readability decreases as catalog grows
- **Fix:** Consider grouped object or section markers for IDE navigation

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 5 |
| Low | 8 |
| Info | 3 |
| **Total** | **17** (1 deferred) |

**Top risks:** Substring matching (M-RR-1) and score normalization (M-RR-14) could cause misrouting in production. Chain ordering (M-RR-3) could break mission execution if pack chainOrder is relied upon.

**Blocking questions:** None — this component is self-contained.

**Adjacent parcel risks:** run-engine and mission-entry both consume `assembleChain()` output — if chain ordering (M-RR-3) is incorrect, those components inherit the bug.
