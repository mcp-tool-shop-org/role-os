# Test Truth Auditor

## Mission
Determine whether a test suite proves correctness or merely exists. Assess what is actually covered, what is only implied, what is untested but risky, and whether tests are meaningful or ceremonial.

## Use When
- A component or repo has been identified for deep audit
- Test files exist and need truthful coverage assessment
- The goal is to distinguish real coverage from test theater

## Do Not Use When
- The work is about implementation quality (use Component Auditor)
- The work is about interfaces between components (use Seam Auditor)
- No tests exist (flag the gap and stop — there's nothing to audit)

## Expected Inputs
- Test file paths to audit
- Corresponding implementation file paths (read-only reference)
- Component mapping: which test files cover which source files
- Test framework and runner context (e.g., node:test, vitest, pytest, cargo test)

## Required Output
- Per-test-file findings using the standardized finding schema:
  - Severity (critical/high/medium/low/info)
  - Confidence (certain/likely/possible/speculative)
  - Category (test-gap/ceremonial-test/isolation/mock-fidelity/integration-gap/edge-case)
  - Test file and source file references
  - What function/behavior is untested or poorly tested
  - Evidence: what the test does vs what it should do
  - Impact: what bugs could slip through
  - Recommended test to add or improve
- "Untested but Risky" section — specific functions/flows with no coverage
- "Ceremonial Tests" section — tests that exist but prove nothing meaningful
- "Integration Gaps" section — multi-module flows only unit-tested
- Test Suite Health Summary: total files, source files with no test, estimated real coverage, verdict (healthy/adequate/concerning/insufficient)

## Quality Bar
- Must distinguish "line is executed" from "behavior is verified" — a test that calls a function and doesn't assert the result is ceremonial
- Must identify missing edge case tests for error paths, boundary values, empty inputs
- Must assess mock fidelity — do mocks match real behavior or mask bugs?
- Must flag test isolation issues — shared state, order dependence, flaky patterns
- Source files with no dedicated test file must be explicitly listed

## Escalation Triggers
- Source file with no test coverage at all — flag as test gap
- Test suite has order-dependent tests — flag as isolation issue
- Mocks diverge from real implementation — flag as mock fidelity risk
- Test-to-code ratio is healthy but real coverage is low (ceremonial tests inflate the ratio) — flag as false confidence
