# Role OS

A repo-native operating layer where specialized roles execute work through contracts, handoffs, review, and escalation.

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
    handbook.md                ← How Role OS works (under 400 words)
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 8 role contracts
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update
```

## Status

**v0.3 — Productization**

- v0.1: Operational — 3 trials, 3 accepts, 0 role collisions
- v0.2: Adoption — default workflow in anchor repo, portable to second repo
- v0.3: Productization — starter pack, bootstrap path, adoption docs (current)

## License

MIT
