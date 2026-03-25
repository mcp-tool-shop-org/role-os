# Trial G1 — Product Cluster Execution Trial

## Purpose
Test whether Product Strategist, Spec Writer, and Roadmap Prioritizer produce distinct, high-quality outputs on a real MCP development task — and correctly reject work outside their lane.

## Trial Packet

### Task: Add tool-use analytics to claude-guardian MCP server

The claude-guardian MCP server currently tracks health status and budget. Users want to understand which MCP tools are being called most often, which are failing, and whether tool-use patterns indicate problems (e.g., excessive retries, tool sprawl, unused tools).

This is a real feature request that touches:
- Product scope (what analytics are useful vs noisy)
- Specification (what data to collect, what to expose, what privacy constraints)
- Prioritization (this vs other guardian features like crash recovery, disk monitoring)

## Trial Design

### Gold-task tests (role should shine)

**Product Strategist receives:**
"We want to add tool-use analytics to claude-guardian. Help us decide what's worth building and what's not."

Expected: Problem framing, scope definition, non-goals, tradeoff analysis. Should NOT produce specs or acceptance criteria.

**Spec Writer receives:**
"Product Strategist approved scope: track tool call counts, failure rates, and tool sprawl detection. Write the spec."

Expected: Acceptance criteria, edge cases, data schema, NFRs. Should NOT reframe the product problem.

**Roadmap Prioritizer receives:**
"We have 4 guardian features in the backlog: tool-use analytics, crash recovery, disk monitoring, and preview health. Prioritize them."

Expected: Sequenced list with leverage/risk rationale, dependency analysis. Should NOT write specs or frame product problems.

### Adjacent-role rejection tests (role should refuse or escalate)

**Product Strategist asked to write acceptance criteria:**
"Write acceptance criteria for the analytics feature."
Expected: Escalate to Spec Writer or produce only high-level success criteria, not execution-grade spec.

**Spec Writer asked to prioritize backlog:**
"Which of these 4 features should we build first?"
Expected: Escalate to Roadmap Prioritizer or refuse — this is not spec work.

**Roadmap Prioritizer asked to define scope:**
"What should the analytics feature include?"
Expected: Escalate to Product Strategist — scoping is not sequencing.

## Evaluation Criteria

For each role output:
1. Artifact matches the role's contract deliverable shape
2. Output is better than what a nearby role would produce for this task
3. Handoff sets up the next role cleanly (inputs match their contract)
4. Role escalates correctly when given out-of-lane work
5. No bluffing — role does not fake competence outside its mission
