# AUDIT-TESTS: Role-OS Test Truth Report

**Auditor:** Test Truth Auditor
**Repo:** mcp-tool-shop-org/role-os v2.1.0
**Date:** 2026-03-27
**Test files:** 31 | **Test lines:** 10,570 | **Source lines:** 11,402
**Test-to-source ratio:** 0.93:1
**Tests:** 905/905 (100% pass)
**External dependencies:** 0 (pure node:test + node:assert/strict)

---

## Overall Verdict: STRONG with one critical logic bug masked by tests

This is NOT a ceremonial test suite. Tests exercise real logic paths, validate error conditions, test boundary cases, and use realistic data. However, one critical bug in `evidence.mjs` is actively masked, and a few coverage gaps exist in the highest-risk areas.

---

## Findings

### T-contracts-evidence-1: "approve" vs "accept" bug masked by substring assertions (CRITICAL)
- **Severity:** critical | **Confidence:** certain | **Category:** false-confidence
- **File:** src/evidence.mjs:195, test/evidence.test.mjs:238-257
- **Evidence:** Line 195 checks `verdict.verdict !== "approve"` but the VERDICT_TYPES enum defines `"accept"`. Since `"accept" !== "approve"` is always true, every `accept` verdict triggers the spurious "Non-approve verdict should specify gaps" warning. Tests pass because they check for specific warning substrings, not for the absence of unexpected warnings.
- **Impact:** Every `accept` verdict generates a false warning. Operators cannot trust the warning list. Tests mask the bug via substring matching.
- **Fix:** Change line 195 to check `!== "accept"`. Add test verifying clean `accept` verdict produces ZERO warnings.

### T-contracts-evidence-2: Mixed "approve"/"accept" terminology in warning messages (HIGH)
- **Severity:** high | **Confidence:** certain | **Category:** false-confidence
- **File:** src/evidence.mjs:185,191,197,203
- **Evidence:** Enum value is `"accept"` (line 34) but warning messages reference `"approve"` (lines 185, 191, 197, 203). Tests check substrings like `"contradictions"` so they don't catch the terminology mismatch.
- **Impact:** Confusing UX — operator sees "approve" in warnings but must pass "accept" in the API.
- **Fix:** Standardize all messages to "accept". Add tests checking warning terminology matches enum values.

### T-run-engine-1: No concurrency testing for persistent state (MEDIUM)
- **Severity:** medium | **Confidence:** likely | **Category:** test-gap
- **File:** test/run.test.mjs, test/run-trials.test.mjs
- **Evidence:** State machine transitions tested only sequentially. No test for concurrent state mutations (e.g., `completeCurrentStep` during `saveRun` write). In a multi-Claude environment, file-level races could corrupt run state.
- **Impact:** False confidence that persistence is safe under concurrency.
- **Fix:** Add tests with two in-memory references to same on-disk run, verify conflict detection.

### T-brainstorm-2: Golden-run challenge targets not validated against atom pool (MEDIUM)
- **Severity:** medium | **Confidence:** likely | **Category:** test-gap
- **File:** test/brainstorm-golden-run.test.mjs:327,365-369,388-401
- **Evidence:** Challenge `target_claim_id` values are hardcoded strings. `validateChallengeEdge` checks structure only, not that targets exist in atom pool. `filterChallenges` test only asserts the illegal challenge is rejected, not that legal challenges resolved to real atoms.
- **Impact:** If atom ID generation changes, challenges could target nonexistent atoms and tests would still pass.
- **Fix:** Assert all permitted challenges have `target_claim_id` matching actual atoms in pool.

### T-routing-roles-2: No chain length cap test (MEDIUM)
- **Severity:** medium | **Confidence:** likely | **Category:** test-gap
- **File:** test/route.test.mjs
- **Evidence:** `assembleChain` tests verify composition but not length bounds. A kitchen-sink prompt mentioning every domain keyword could produce an unbounded chain.
- **Impact:** Excessive step counts in runs from pathological inputs.
- **Fix:** Add test with all-keyword prompt, verify chain length cap.

### T-contracts-evidence-3: No case-sensitivity test for artifact section matching (MEDIUM)
- **Severity:** medium | **Confidence:** certain | **Category:** coverage
- **File:** test/artifacts.test.mjs
- **Evidence:** All test artifacts use exact-case headers (`## Problem Framing`). No test with lowercase headers (`## problem framing`). Real-world LLM outputs use inconsistent casing.
- **Impact:** Validation failures in production would not be caught.
- **Fix:** Add test with lowercase section headers.

### T-contracts-evidence-4: No corrupted ledger file test (MEDIUM)
- **Severity:** medium | **Confidence:** likely | **Category:** test-gap
- **File:** test/calibration.test.mjs
- **Evidence:** File I/O tested only with clean inputs. No test for corrupted/truncated JSON ledger.
- **Impact:** Crashed write could block all calibration functionality.
- **Fix:** Add test with corrupted ledger file, verify graceful handling.

### T-run-engine-2: Trial U6 doesn't verify artifact persistence round-trip (LOW)
- **Severity:** low | **Confidence:** certain | **Category:** coverage
- **File:** test/run-trials.test.mjs
- **Evidence:** U6 uses `loadRun` but doesn't assert step artifacts survive disk round-trip. Covered separately in run.test.mjs:495-510.
- **Fix:** Add artifact assertion to U6.

### T-run-engine-3: CLI tests are smoke-level, not correctness proofs (INFO)
- **Severity:** info | **Confidence:** certain | **Category:** ceremonial
- **File:** test/run-cmd.test.mjs
- **Evidence:** 156 lines of CLI tests check stdout substrings. Would pass even if output format changed significantly. Real correctness is in unit tests.
- **Fix:** Appropriate as smoke tests. No action needed.

### T-brainstorm-1: Brainstorm test suite is exemplary (INFO — positive)
- **Severity:** info | **Confidence:** certain | **Category:** coverage
- **Evidence:** 3,250 test lines for 2,014 source lines (1.6:1 ratio). Golden-run test is 1,099 lines of end-to-end proof through all 10 pipeline phases. Evidence mode constraint matrices exhaustively tested. Lexical bans cross-tested between roles.
- **Fix:** None. Model for other components.

### T-routing-roles-1: Role surfacing tests are thorough (INFO — positive)
- **Severity:** info | **Confidence:** certain | **Category:** coverage
- **Evidence:** Every non-always-include role has a dedicated surfacing test with realistic prompts. No role is "dark" (unreachable by any input).
- **Fix:** None needed.

### T-session-scaffolding-1: Session tests are appropriate for risk level (INFO — positive)
- **Severity:** info | **Confidence:** certain | **Category:** coverage
- **Evidence:** Scaffolding, doctor, route cards, idempotency, hooks lifecycle, version consistency all tested. Coverage matches risk level.
- **Fix:** None needed.

### T-mission-entry-1: Mission-entry tests are strong (INFO — positive)
- **Severity:** info | **Confidence:** certain | **Category:** coverage
- **Evidence:** 1,929 test lines for 1,741 source (1.11:1). 8 mission trials + 6 entry trials provide realistic end-to-end coverage. Decompose tests cover category detection, phase ordering, complexity estimation.
- **Fix:** None needed.

---

## Component Scorecards

| Component | Source | Tests | Ratio | Ceremonial | Bugs Masked | Verdict |
|-----------|--------|-------|-------|-----------|-------------|---------|
| routing-roles | 1,587 | 955 | 0.60 | 0 | 0 | **SOLID** |
| run-engine | 2,545 | 1,452 | 0.57 | ~5 CLI | 0 | **GOOD** (gap: concurrency) |
| mission-entry | 1,741 | 1,929 | 1.11 | 0 | 0 | **STRONG** |
| brainstorm-system | 2,014 | 3,250 | 1.61 | 0 | 0 | **EXCELLENT** |
| contracts-evidence | 1,982 | 875 | 0.44 | 0 | 1 critical | **NEEDS FIX** |
| session-scaffolding | 1,563 | 828 | 0.53 | 0 | 0 | **SOLID** |

## Key Conclusions

1. **Not ceremonial.** 905 tests exercise real logic with realistic data. Zero mocks — all real implementations with temp directories for I/O. Gold standard for mock fidelity.

2. **One critical masked bug.** The "approve" vs "accept" mismatch in evidence.mjs means every accept verdict generates a spurious warning. Tests pass via substring matching that misses the false positive.

3. **Brainstorm golden-run is the model.** 1,099-line end-to-end proof through 10 pipeline phases. Other components should aspire to this level.

4. **Integration is good, concurrency is untested.** Run-trials and mission-trials provide realistic scenarios. The gap is multi-Claude concurrent state access.

5. **Test investment matches risk.** Highest-risk component (brainstorm: complex validation) has highest ratio (1.61:1). Lowest-risk component (session: scaffolding) has lowest ratio (0.53:1). This is correct prioritization.
