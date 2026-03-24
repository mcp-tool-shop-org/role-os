# Role OS — Adoption Handbook

## What Role OS does

Role OS routes scoped work through role contracts, memory, structured packets, review, and escalation — so features, integrations, identity repairs, and full repo treatments ship without drift, false completion, or vibes-based progress claims.

Each role has a contract: what it owns, what it must produce, when to escalate. Work moves through a chain of roles. A critic reviews against the contract, not against wishes. Memory preserves truth across sessions. The system protects truth, not speed.

## Five layers

1. **Role Spine** — eight specialist role contracts with hard boundaries
2. **Workflows** — canonical problem shapes: feature, integration, identity, full treatment
3. **Memory** — repo-local continuity for accumulated truth, decisions, open loops, and treatment history
4. **Packets and review** — structured work units with typed verdicts
5. **Evidence** — file-system-based visibility into active work, blockers, and treatment state

## Use it for

- **Features** that need product shaping, implementation, testing, and review
- **Integrations** that wire systems together across architectural seams
- **Identity/polish work** that repairs branding, fiction, or terminology drift
- **Full treatment** — a repo-wide examination that produces truthful state, not wishes
- Any scoped work where you want honest decomposition, clear handoffs, and truthful review

## Don't use it for

- Single-line fixes, typos, or obvious bugs
- Exploratory research or spikes with no defined output
- Work where the entire scope fits in one person's head in 5 minutes
- Emergency hotfixes that need to ship before a review chain completes

## Packet flow

1. **Create a packet** — define the outcome, scope, non-goals, constraints, and done definition
2. **Verify dependencies** — confirm every upstream assumption against repo truth
3. **Route to a chain** — pick the smallest set of roles needed (2-7 roles, not always all)
4. **Each role produces a handoff** — structured output that reduces ambiguity for the next role
5. **Critic reviews** — accepts, rejects, or sends back with notes, judged against contract and done definition
6. **Record the verdict** — evidence of what was accepted, what was flagged, what follows

## Memory

Memory gives Claude continuity across sessions. Without it, every session restarts from zero.

- **repo-facts.md** — stable truths: stack, entrypoints, seams, constraints
- **decisions.md** — important choices that should not be re-argued
- **open-loops.md** — unresolved items: blockers, deferred work, risks
- **treatment-history.md** — ledger of full treatments with findings and outcomes

Update memory during work, not only at the end. Close loops when resolved. Add new ones when discovered.

## Full treatment

A full treatment is a repo-wide examination, not a narrow packet. It verifies repo truth, reads and updates memory, scans for product/architecture/contamination issues, decomposes findings by problem shape, and produces prioritized output.

A treatment is not complete if memory was not read or updated, or if repo truth was not verified.

## Review and escalation

The critic reviewer is not ceremonial. They reject work that is vague, contaminated, or incomplete — even if it's otherwise functional. "Good but wrong" is a valid rejection.

Any role can escalate when missing information would change the work materially. Escalation is expected, not failure. Hiding gaps is the actual failure.

## First run

1. Fill `context/` files — product brief, repo map, priorities, brand rules
2. Fill `memory/repo-facts.md` with current repo truth
3. Create your first packet in `packets/active/`
4. Route it through the smallest chain that covers the work
5. Produce handoffs (light format for routine, full format for complex)
6. Review and record the verdict

You will learn the system by using it once, not by studying it.
