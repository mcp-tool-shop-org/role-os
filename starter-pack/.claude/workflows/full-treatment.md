# Full Treatment

A repo-wide operating pass that produces a truthful assessment of current state, not a narrow packet.

Full treatment is not a feature request. It is an examination.

## Required Steps

### 1. Repo-first verification
- Verify repo exists and is clean
- Verify current branch and origin
- Verify build/test/run commands work
- Verify current working state before proposing anything

### 2. Current-state read
- Read purpose and architecture from live code, not stale assumptions
- Inspect actual structure, entrypoints, and runtime seams
- Identify what has changed since last treatment

### 3. Memory read and update
- Read existing memory files first
- Reconcile current findings against stored truth
- Update repo-facts, decisions, open-loops, and treatment-history
- If memory is empty, populate it from observed truth

### 4. Treatment scan
- Product/thesis alignment
- Architecture health
- Integration seams
- Contamination/drift
- Testing truth
- CI/release truth
- Documentation integrity

### 5. Problem-shape decomposition
Separate findings into:
- Feature work
- Integration work
- Identity work
- Debt/risk

Identify what actually deserves packets vs what is noise.

### 6. Prioritized operating output
- What is true now
- What is broken now
- What matters most
- What should happen next
- What is blocked
- What is assumed vs proven

### 7. Review
- Critic checks whether the treatment is complete enough to count as full treatment
- Partial treatment cannot be passed off as full treatment
- If memory was not read or updated, it is not full treatment
- If repo truth was not verified, it is not full treatment

## Failure Condition
If memory was not read or updated, or if repo truth was not verified, it is not full treatment. Reject it.

## Typical Chain
Orchestrator → Product Strategist → Backend Engineer → Test Engineer → Critic Reviewer

Add other roles only if the scan reveals work in their domain.

## Output
- Updated memory files
- Treatment entry in treatment-history.md
- Prioritized findings
- Recommended next packets
- Updated open-loops.md
- Critic verdict on treatment completeness
