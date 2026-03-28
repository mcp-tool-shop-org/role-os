# AUDIT-PARCEL: brainstorm-system

**Auditor:** Component Auditor
**Files:** src/brainstorm.mjs, src/brainstorm-render.mjs, src/brainstorm-roles.mjs
**Lines:** 2,014
**Date:** 2026-03-27

## Findings

### H-BS-1: `partitionBrief` security bypass for unknown roles
- **Severity:** high | **Confidence:** certain | **Category:** security
- **File:** src/brainstorm-roles.mjs — `partitionBrief()`
- **Evidence:** When a role is not in ROLE_NATIVE_SCHEMAS, the function returns the full unpartitioned brief. This means an unknown role gets access to everything instead of nothing.
- **Impact:** Fail-open behavior — any unrecognized role name receives complete brief access
- **Fix:** Fail-closed: unknown roles should receive empty/minimal brief, not full access

### H-BS-2: Divergent atom schemas between brainstorm.mjs and brainstorm-roles.mjs
- **Severity:** high | **Confidence:** certain | **Category:** correctness
- **File:** src/brainstorm.mjs — `validateBrainstormResult()` vs src/brainstorm-roles.mjs — `translateToAtoms()`
- **Evidence:** `validateBrainstormResult` expects atoms with `{claim, evidence, confidence}`. `translateToAtoms` produces `{assertion, grounding, certainty}`. Field names diverge.
- **Impact:** Atoms produced by role-native translation fail validation by the brainstorm validator
- **Fix:** Align field names or add normalization layer between translation and validation

### M-BS-3: Evidence mode "invention" bypasses grounding requirements
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/brainstorm.mjs — `validateEvidencePair()`
- **Evidence:** In "invention" mode, evidence validation is relaxed — `grounding: "none"` is accepted
- **Impact:** Invention mode can produce claims with zero evidentiary backing that look validated
- **Fix:** Tag invention-mode outputs distinctly so downstream consumers know grounding is absent

### M-BS-4: `resolveFrame` doesn't validate frame against available roles
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/brainstorm.mjs — `resolveFrame()`
- **Evidence:** Frame resolution accepts any frame name; if it doesn't match a known frame, it falls through to a default
- **Impact:** Typo in frame name silently uses default instead of erroring
- **Fix:** Warn or error on unknown frame names

### M-BS-5: Cross-examination permissions are not symmetric
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/brainstorm-roles.mjs — CROSS_EXAM_PERMISSIONS
- **Evidence:** Role A can challenge Role B, but B cannot necessarily challenge A. This is by design for some pairs but undocumented for others.
- **Impact:** Some perspectives can never be challenged, creating blind spots
- **Fix:** Document which asymmetries are intentional; add test coverage for permission matrix

### M-BS-6: `renderBrainstormOutput` doesn't handle empty perspectives
- **Severity:** medium | **Confidence:** certain | **Category:** error-handling
- **File:** src/brainstorm-render.mjs — `renderBrainstormOutput()`
- **Evidence:** Empty perspective array produces malformed output (section headers with no content)
- **Impact:** Visual artifact in rendered output; consumers may fail to parse
- **Fix:** Handle empty perspectives with "No perspectives generated" message

### M-BS-7: Two-layer architecture (truth+render) has no reconciliation check
- **Severity:** medium | **Confidence:** likely | **Category:** architecture
- **File:** src/brainstorm.mjs + src/brainstorm-render.mjs
- **Evidence:** Truth layer produces validated atoms; render layer formats them. But no check ensures render didn't drop or add atoms during formatting.
- **Impact:** Rendered output may diverge from validated truth
- **Fix:** Add post-render atom count check or hash verification

### L-BS-8: ROLE_NATIVE_SCHEMAS are hardcoded — not extensible
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/brainstorm-roles.mjs — ROLE_NATIVE_SCHEMAS
- **Evidence:** Schemas are inline objects; adding a new role's native schema requires editing the source file
- **Impact:** Extensibility requires code changes, not configuration
- **Fix:** Acceptable for current scale; consider schema-from-role-definition if brainstorm roles grow beyond ~20

### L-BS-9: ROLE_BLINDSPOTS values are prose, not structured
- **Severity:** low | **Confidence:** certain | **Category:** naming
- **File:** src/brainstorm-roles.mjs — ROLE_BLINDSPOTS
- **Evidence:** Blindspot descriptions are free-text strings
- **Impact:** Cannot be programmatically compared or composed
- **Fix:** Consider structured blindspot categories alongside prose descriptions

### L-BS-10: `canChallenge` returns boolean but callers need reason
- **Severity:** low | **Confidence:** likely | **Category:** correctness
- **File:** src/brainstorm-roles.mjs — `canChallenge()`
- **Evidence:** Returns true/false without explanation of why a challenge is allowed or denied
- **Impact:** Debugging permission issues requires reading source code
- **Fix:** Return `{allowed, reason}` object

### L-BS-11: `formatPerspective` doesn't escape markdown in user content
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/brainstorm-render.mjs — `formatPerspective()`
- **Evidence:** User-provided content (claims, evidence) is interpolated directly into markdown without escaping
- **Impact:** Markdown injection — content with `##` or `---` breaks formatting
- **Fix:** Escape or fence user content within code blocks or blockquotes

### L-BS-12: `validateRoleNativeOutput` has no max-size guard
- **Severity:** low | **Confidence:** possible | **Category:** correctness
- **File:** src/brainstorm-roles.mjs — `validateRoleNativeOutput()`
- **Evidence:** Validates structure but not size; a role could produce megabytes of atoms
- **Impact:** Memory pressure if role produces unbounded output
- **Fix:** Add max-atom-count guard

### I-BS-13: Brainstorm system is completely isolated — zero imports from other src/ modules
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/brainstorm*.mjs
- **Evidence:** No imports from any other src/ file
- **Impact:** Clean isolation — changes here cannot break other components
- **Fix:** None needed — this is a strength

### L-BS-14: Evidence mode transitions are not guarded
- **Severity:** low | **Confidence:** possible | **Category:** state
- **File:** src/brainstorm.mjs
- **Evidence:** A brainstorm can switch evidence modes mid-pipeline (e.g., strict→speculative) without validation
- **Impact:** Mixed-mode results may have inconsistent grounding standards
- **Fix:** Lock evidence mode at pipeline start or track mode per-atom

### M-BS-15: `translateToAtoms` drops fields not in target schema
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/brainstorm-roles.mjs — `translateToAtoms()`
- **Evidence:** Translation maps role-native fields to atom fields; unmapped fields are silently dropped
- **Impact:** Role-specific context (e.g., domain annotations) is lost in translation
- **Fix:** Preserve unmapped fields in an `extra` bucket or warn on drop

### L-BS-16: No test for round-trip: native→atoms→render→parse
- **Severity:** low | **Confidence:** certain | **Category:** test-gap
- **File:** test/brainstorm-roles.test.mjs
- **Evidence:** Tests validate individual functions but no test exercises the full pipeline: role-native output → translateToAtoms → validateBrainstormResult → renderBrainstormOutput
- **Impact:** Integration bugs between layers may go undetected
- **Fix:** Add golden-run integration test (brainstorm-golden-run.test.mjs exists but may not cover this path)

### I-BS-17: Two-layer architecture is novel and well-isolated
- **Severity:** info | **Confidence:** certain | **Category:** architecture
- **File:** src/brainstorm.mjs + src/brainstorm-render.mjs
- **Evidence:** Truth layer (brainstorm.mjs) and render layer (brainstorm-render.mjs) are cleanly separated
- **Impact:** Enables independent testing and evolution of each layer
- **Fix:** None — document as architectural decision record

### L-BS-18: `CROSS_EXAM_PERMISSIONS` matrix is sparse
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/brainstorm-roles.mjs
- **Evidence:** Not all role pairs have explicit permission entries; missing pairs default to "no challenge"
- **Impact:** Some legitimate challenges may be silently blocked
- **Fix:** Consider default-allow with explicit deny list, or complete the matrix

### I-BS-19: Brainstorm system has highest complexity-to-test ratio
- **Severity:** info | **Confidence:** certain | **Category:** test-gap
- **File:** test/brainstorm*.test.mjs
- **Evidence:** 2,014 lines of source with 4 test files — test coverage appears adequate but the two-layer + role-native schema complexity means edge cases are numerous
- **Impact:** Some validation edge cases may be untested
- **Fix:** Review golden-run tests for completeness

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 6 |
| Low | 8 |
| Info | 3 |
| **Total** | **19** |

**Top risks:** Security bypass (H-BS-1) is a design flaw — unknown roles should fail closed, not open. Divergent atom schemas (H-BS-2) means the role-native→atom pipeline is broken for any role using `translateToAtoms`.

**Blocking questions:** Is the atom field divergence (H-BS-2) a known issue or an oversight? The brainstorm calibration tests (4/4 passed per memory) may not exercise the `translateToAtoms` path.

**Adjacent parcel risks:** None — brainstorm is an isolated island. However, if brainstorm results are ever consumed by run-engine or mission-entry, the atom schema divergence becomes a cross-component bug.
