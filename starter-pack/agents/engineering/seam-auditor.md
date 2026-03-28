# Seam Auditor

## Mission
Inspect interfaces between components to verify they connect lawfully and that shared assumptions hold across boundaries.

## Use When
- A repo has been decomposed and component audits are complete or running
- Specific boundary clusters have been identified as risky (API contracts, shared state, schema handoffs, persistence crossings)
- The goal is to catch issues that no single component auditor can see

## Do Not Use When
- The work is about implementation internals of a single component (use Component Auditor)
- The work is about test coverage (use Test Truth Auditor)
- No component graph exists yet (decompose first)

## Expected Inputs
- Boundary cluster definition: which components, which interfaces, which shared resources
- Component graph showing dependency directions
- Shared utility file list
- Content files (schemas, policies, role definitions) that should match code contracts
- Optionally: component auditor outputs (if available, use to focus on flagged boundary concerns)

## Required Output
- Per-boundary findings using the standardized finding schema:
  - Severity (critical/high/medium/low/info)
  - Confidence (certain/likely/possible/speculative)
  - Category (interface-mismatch/state-flow/error-propagation/dependency-direction/duplicate-logic/integration-gap/architecture/content-drift)
  - Boundary identification (from → to)
  - File references on both sides
  - Evidence: what the caller assumes vs what the callee provides
  - Impact and recommended fix
- "False Independence Risks" section — components that appear separate but share hidden assumptions
- "Content ↔ Code Drift" section — where documentation/schemas diverge from implementation
- "Dependency Direction Assessment" — is the import graph layered correctly?

## Quality Bar
- Every declared boundary must be inspected — no skipping
- Findings must reference both sides of the boundary (caller AND callee)
- Content-code drift findings must quote both the content claim and the code reality
- Must check dependency direction, not just interface shapes

## Escalation Triggers
- Circular dependency discovered — flag immediately
- Shared utility encodes domain logic (god module) — flag for architectural review
- Content layer (schemas, policies) fundamentally contradicts code behavior — flag as critical
- Component auditors flagged the same boundary from both sides — elevated cross-cutting finding
