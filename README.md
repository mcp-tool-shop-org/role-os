<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

A portable, repo-native operating layer that routes work through role contracts, structured packets, review, and escalation so teams can do feature work, integration work, identity repair, and full repo treatment without drift, false completion, or vibes-based progress claims.

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

## Memory and continuity

Role OS does not own or duplicate the memory layer. Where Claude project memory exists, it is the canonical continuity system — repo facts, decisions, open loops, and treatment history live there.

Role OS integrates with Claude project memory. It does not replace it.

## Full treatment and shipcheck

Full treatment is a canonical 7-phase protocol defined in Claude project memory (`memory/full-treatment.md`). Role OS routes and reviews treatments using role contracts, handoffs, and critic gates — it does not redefine the protocol.

**Shipcheck** is the 31-item quality gate that runs before full treatment. Hard gates A-D must pass before any treatment begins. Canonical reference: `memory/shipcheck.md`.

Order: Shipcheck first, then full treatment. No v1.0.0 without passing hard gates.

## 32 roles across 8 packs

| Pack | Roles |
|------|-------|
| **Core** (3) | Orchestrator, Product Strategist, Critic Reviewer |
| **Engineering** (7) | Frontend Developer, Backend Engineer, Test Engineer, Refactor Engineer, Performance Engineer, Dependency Auditor, Security Reviewer |
| **Design** (2) | UI Designer, Brand Guardian |
| **Marketing** (1) | Launch Copywriter |
| **Treatment** (7) | Repo Researcher, Repo Translator, Docs Architect, Metadata Curator, Coverage Auditor, Deployment Verifier, Release Engineer |
| **Product** (4) | Feedback Synthesizer, Roadmap Prioritizer, Spec Writer, Information Architect |
| **Research** (4) | UX Researcher, Competitive Analyst, Trend Researcher, User Interview Synthesizer |
| **Growth** (4) | Launch Strategist, Content Strategist, Community Manager, Support Triage Lead |

Every role has a full contract: mission, use when, do not use when, expected inputs, required outputs, quality bar, and escalation triggers.

## Quick start

```bash
npx role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
```

## When not to use Role OS

- Single-line fixes, typos, or obvious bugs
- Exploratory research with no defined output
- Work that fits in one person's head in 5 minutes
- Emergency hotfixes that need to ship before a review chain completes
- Projects where you want speed over structure

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

**Full treatment FT-001** (portlight-desktop)
- 7-phase staffed treatment with Treatment Pack roles
- Shipcheck gating proven, zero role collisions

**Full treatment FT-002** (studioflow)
- Same treatment pack, structurally different repo (creative workspace vs game)
- Treatment Pack portable — no contract modifications needed

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
  bin/roleos.mjs               ← CLI entrypoint
  src/                         ← CLI implementation
  starter-pack/
    handbook.md                ← How Role OS works
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 32 role contracts across 8 packs
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment
```

## Security

Role OS operates **locally only**. It copies markdown templates and writes packet/verdict files to your repository's `.claude/` directory. It does not access the network, handle secrets, or collect telemetry. No dangerous operations — all file writes use skip-if-exists by default. See [SECURITY.md](SECURITY.md) for the full policy.

## Status

**v1.0.0 — Broad Surface, Same Laws**

- v0.1: Operational — 3 trials, 3 accepts, 0 role collisions
- v0.2: Adoption — default workflow in anchor repo, portable to second repo
- v0.3: Productization — starter pack, bootstrap CLI, evidence surface
- v0.4: Treatment Pack — 8 treatment/identity roles, full treatment staffed, portable across 2 repos
- v1.0.0: 32 roles across 8 packs, full CLI, proven treatment, multi-repo portability

## License

MIT

---

Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
