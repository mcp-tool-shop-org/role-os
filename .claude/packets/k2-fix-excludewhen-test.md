# Task Packet

## Task ID
2026-03-25-fix-excludewhen-test

## Title
Add regression tests for excludeWhen enforcement found by Coverage Auditor

## Requested Outcome
The Coverage Auditor trial (G6) found that excludeWhen was declared but never enforced. The calibration pass fixed it, but there are no dedicated regression tests. Add tests that prevent silent revert.

## Packet Type
feature

## Scope
- Add tests proving excludeWhen suppresses roles when exclusion patterns match
- Add test proving excludeWhen does NOT fire when pattern is absent
- Add test for detectType false-positive prevention on "integration testing"

## Inputs
- src/route.mjs (scoreRole with excludeWhen)
- test/route.test.mjs (existing tests)
- .claude/trials/G5-G10-results/report.md (Coverage Auditor findings)
