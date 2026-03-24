# Role OS

<p align="center">
  <img src="assets/logo.png" alt="Role OS" width="400">
</p>

A portable, repo-native operating layer that routes work through role contracts, memory, structured packets, review, and escalation so teams can do feature work, integration work, identity repair, and full repo treatment without drift, false completion, or vibes-based progress claims.

## What it does

Role OS prevents the specific failures that generic AI workflows produce:

- **Drift** — roles stay in lane. Product doesn't redesign. Frontend doesn't redefine scope. Backend doesn't invent product direction.
- **False completion** — the done definition is concrete. Work that hides gaps, skips verification, or solves a different problem gets rejected.
- **Contamination** — forked or inherited projects carry identity residue. Role OS detects and rejects cross-project drift in terminology, visuals, and mental models.
- **Vibes-based progress** — every handoff is structured. Every verdict ties to evidence. "It feels done" is not a valid state.

## How it works

1. **Create a packet** — define what needs to exist when the work is done
2. **Route through a chain** — the smallest set of specialized roles needed
3. **Each role produces a handoff** — structured output that reduces ambiguity for the next role
4. **Critic reviews against contract** — accepts, rejects, or blocks based on evidence, not impression

## Memory

Memory gives Claude continuity across sessions. Without it, every session restarts from zero.

| File | Purpose |
|------|---------|
| `memory/repo-facts.md` | Stable truths: stack, entrypoints, seams, constraints |
| `memory/decisions.md` | Important choices that should not be re-argued |
| `memory/open-loops.md` | Unresolved items: blockers, deferred work, risks |
| `memory/treatment-history.md` | Ledger of full treatments with findings and outcomes |

## Full treatment

A full treatment is a repo-wide examination, not a narrow packet. It verifies repo truth, reads and updates memory, scans across product/architecture/contamination/testing/CI, decomposes findings by problem shape, and produces prioritized output.

A treatment is **not complete** if memory was not read or updated, or if repo truth was not verified.

## The spine

Role OS ships 8 proven role contracts:

| Role | Job |
|------|-----|
| **Orchestrator** | Decomposes work into the smallest lawful chain |
| **Product Strategist** | Shapes scope and protects product intent |
| **UI Designer** | Designs hierarchy, interaction, and visual structure |
| **Frontend Developer** | Implements user-facing surfaces faithfully |
| **Backend Engineer** | Implements server/data contracts and system behavior |
| **Test Engineer** | Verifies work against real risk, not ceremony |
| **Launch Copywriter** | Writes truthful messaging grounded in shipped work |
| **Critic Reviewer** | Accepts or rejects based on contract compliance |

## Quick start

```bash
# Copy the starter pack into your repo
cp -r starter-pack/ your-repo/.claude/

# Fill the four context files
# - context/product-brief.md   (what this product is)
# - context/repo-map.md        (how the repo works)
# - context/current-priorities.md (what's happening now)
# - context/brand-rules.md     (identity law)

# Create your first packet, route it, review it
# See starter-pack/handbook.md for the full flow
```

## Evidence

Role OS was proven across three trial shapes in two structurally different repos:

**Trial 001 — Feature work** (Crew Screen, Star Freight)
- 7-role chain, 45 test scenarios, 0 role collisions
- Prevented contamination from fork ancestor, caught inline invention, surfaced honest blockers

**Trial 002 — Integration work** (CampaignState wiring, Star Freight)
- 5-role chain, resolved architectural seam without fallback lies
- Anti-fallback tests proved the live path is real, not placeholder

**Trial 003 — Identity work** (Contamination purge, Star Freight)
- 6-role chain, 51 test scenarios including durable CI contamination defense
- Repaired inherited fiction drift without collapsing into broad redesign

**Portability trial** (Persona consistency, sensor-humor)
- Same spine, different language/domain/stack
- Adopted with context changes only — no core contract modifications

## Core properties

These are non-negotiable. If a change weakens any of them, reject it.

- Role boundaries hold
- Review has teeth
- Escalation stays honest
- Packets stay testable
- Portability requires context adaptation, not core surgery

## Project structure

```
role-os/
  README.md                    ← You are here
  starter-pack/
    handbook.md                ← How Role OS works (under 500 words)
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 8 role contracts
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment
    memory/                    ← Repo-local continuity across sessions
    packets/                   ← Active and completed work units
    reviews/                   ← Active and completed verdicts
    status/                    ← Current repo operating state
```

## Security

Role OS operates **locally only**. It copies markdown templates and writes packet/verdict files to your repository's `.claude/` directory. It does not access the network, handle secrets, or collect telemetry. No dangerous operations — all file writes use skip-if-exists by default. See [SECURITY.md](SECURITY.md) for the full policy.

## Status

**v1.0.0 — Shipped**

- v0.1: Operational — 3 trials, 3 accepts, 0 role collisions
- v0.2: Adoption — default workflow in anchor repo, portable to second repo
- v0.3: Productization — starter pack, bootstrap CLI, adoption docs

## License

MIT
