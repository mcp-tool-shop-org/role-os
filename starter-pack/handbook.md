# Role OS — Adoption Handbook

## What Role OS does

Role OS routes scoped work through role contracts, structured handoffs, and review — so features, integrations, and identity repairs ship without drift, false completion, or vibes-based progress claims.

Each role has a contract: what it owns, what it must produce, when to escalate. Work moves through a chain of roles. A critic reviews against the contract, not against wishes. The system protects truth, not speed.

## Use it for

- **Features** that need product shaping, implementation, testing, and review
- **Integrations** that wire systems together across architectural seams
- **Identity/polish work** that repairs branding, fiction, or terminology drift
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

## Review and escalation

The critic reviewer is not ceremonial. They reject work that is vague, contaminated, or incomplete — even if it's otherwise functional. "Good but wrong" is a valid rejection.

Any role can escalate when missing information would change the work materially. Escalation is expected, not failure. Hiding gaps is the actual failure.

## First run

1. Fill `context/` files — product brief, repo map, priorities, brand rules
2. Create your first packet in `trials/` or `packets/`
3. Route it through the smallest chain that covers the work
4. Produce handoffs (light format for routine, full format for complex)
5. Review and record the verdict

You will learn the system by using it once, not by studying it.
