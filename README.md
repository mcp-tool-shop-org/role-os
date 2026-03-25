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

A multi-Claude operating system that staffs, routes, validates, and runs work through 31 specialized role contracts. Creates task packets, assembles the right team from scored role matching, detects broken chains before execution, auto-routes recovery when work is blocked or rejected, and requires structured evidence in every verdict.

## What it does

Role OS is the professional way to use multi-Claude. It prevents the specific failures that generic AI workflows produce:

- **Drift** — roles stay in lane. Product doesn't redesign. Frontend doesn't redefine scope. Backend doesn't invent product direction.
- **False completion** — the done definition is concrete. Work that hides gaps, skips verification, or solves a different problem gets rejected.
- **Contamination** — forked or inherited projects carry identity residue. Role OS detects and rejects cross-project drift in terminology, visuals, and mental models.
- **Vibes-based progress** — every handoff is structured. Every verdict ties to evidence. "It feels done" is not a valid state.

## How it works

1. **Create a packet** — define what needs to exist when the work is done
2. **Route through a chain** — `roleos route` scores all 31 roles against the packet content, assembles a dynamic chain ordered by work phase, and explains why each role was chosen
3. **Validate the team** — 4-pass conflict detection catches hard conflicts, sequence errors, redundancy, and coverage gaps before execution starts
4. **Each role produces a handoff** — structured output with evidence items that reduce ambiguity for the next role
5. **Critic reviews against contract** — accepts, rejects, or blocks based on structured evidence, not impression
6. **Recovery routes automatically** — blocked or rejected work gets routed to the right resolver with a reason, recovery type, and required artifact

## Org rollout state

Org-wide rollout state (queue, decisions, audit records, per-repo lock packets) lives in a separate private repo: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). This repo is the product; that repo is operational state.

## Memory and continuity

Role OS does not own or duplicate the memory layer. Where Claude project memory exists, it is the canonical continuity system — repo facts, decisions, open loops, and treatment history live there.

Role OS integrates with Claude project memory. It does not replace it.

## Full treatment and shipcheck

Full treatment is a canonical 7-phase protocol defined in Claude project memory (`memory/full-treatment.md`). Role OS routes and reviews treatments using role contracts, handoffs, and critic gates — it does not redefine the protocol.

**Shipcheck** is the 31-item quality gate that runs before full treatment. Hard gates A-D must pass before any treatment begins. Canonical reference: `memory/shipcheck.md`.

Order: Shipcheck first, then full treatment. No v1.0.0 without passing hard gates.

## 31 roles across 8 packs

| Pack | Roles |
|------|-------|
| **Core** (3) | Orchestrator, Product Strategist, Critic Reviewer |
| **Engineering** (7) | Frontend Developer, Backend Engineer, Test Engineer, Refactor Engineer, Performance Engineer, Dependency Auditor, Security Reviewer |
| **Design** (2) | UI Designer, Brand Guardian |
| **Marketing** (1) | Launch Copywriter |
| **Treatment** (7) | Repo Researcher, Repo Translator, Docs Architect, Metadata Curator, Coverage Auditor, Deployment Verifier, Release Engineer |
| **Product** (3) | Feedback Synthesizer, Roadmap Prioritizer, Spec Writer |
| **Research** (4) | UX Researcher, Competitive Analyst, Trend Researcher, User Interview Synthesizer |
| **Growth** (4) | Launch Strategist, Content Strategist, Community Manager, Support Triage Lead |

Every role has a full contract: mission, use when, do not use when, expected inputs, required outputs, quality bar, and escalation triggers. Every role is routable — `roleos route` can recommend any of them based on packet content.

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
  bin/roleos.mjs               ← CLI entrypoint
  src/
    route.mjs                  ← 31-role routing + dynamic chain builder
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    trial.mjs                  ← Role execution trial framework
    packet.mjs                 ← Packet creation
    review.mjs                 ← Verdict recording + escalation integration
    status.mjs                 ← Active packet + verdict status
  test/
    route.test.mjs             ← 49 tests (routing + disambiguation)
    conflicts.test.mjs         ← 13 tests (4 conflict types)
    escalation.test.mjs        ← 22 tests (blocked/rejected/conflict/split)
    evidence.test.mjs          ← 23 tests (schema + sufficiency)
    dispatch.test.mjs          ← 21 tests (manifests + state + escalation packets)
    trial.test.mjs             ← 12 tests (trial framework)
    cli.test.mjs               ← 22 tests (CLI integration)
  .claude/
    agents/                    ← 31 role contracts across 8 packs
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing rules, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment
    context/                   ← Fill these for your repo
    trials/                    ← Execution trial packets + results
```

## Security

Role OS operates **locally only**. It copies markdown templates and writes packet/verdict files to your repository's `.claude/` directory. It does not access the network, handle secrets, or collect telemetry. No dangerous operations — all file writes use skip-if-exists by default. See [SECURITY.md](SECURITY.md) for the full policy.

## The operating system

| Layer | What it does | Status |
|-------|-------------|--------|
| **Routing** | Scores all 31 roles against packet content, explains recommendations, assesses confidence | ✓ Shipped |
| **Chain builder** | Assembles phase-ordered chains from scored roles, packet-type biased not template-locked | ✓ Shipped |
| **Conflict detection** | 4-pass validation: hard conflicts, sequence, redundancy, coverage gaps. Repair suggestions. | ✓ Shipped |
| **Escalation** | Auto-routes blocked/rejected/split work to the right resolver with reason + required artifact | ✓ Shipped |
| **Evidence** | Role-aware structured evidence in verdicts. Sufficiency checks. 12 evidence kinds. | ✓ Shipped |
| **Dispatch** | Generates execution manifests for multi-claude. Per-role tool profiles, system prompts, budgets. | ✓ Shipped |
| **Trials** | Full roster proven: 30/30 gold-task + 5/5 negative trials. 7 pack trials complete. | ✓ Complete |
| **Team Packs** | 7 calibrated packs with auto-selection, mismatch guards, and free-routing fallback. | ✓ Shipped |
| **Outcome calibration** | Records run outcomes, tunes pack/role weights from results, adjusts confidence thresholds. | ✓ Shipped |
| **Mixed-task decomposition** | Detects composite work, splits into child packets, assigns packs, preserves dependencies. | ✓ Shipped |
| **Composite execution** | Runs child packets in dependency order with artifact passing, branch recovery, and synthesis. | ✓ Shipped |
| **Adaptive replanning** | Mid-run scope changes, findings, or new requirements update the plan without restarting. | ✓ Shipped |

## Status

- v0.1–v0.4: Foundation — trials, adoption, treatment pack, starter pack
- v1.0.0: 32 roles, full CLI, proven treatment, multi-repo portability
- v1.0.2: Role OS lockdown (bootstrap truth fixes, init --force)
- v1.1.0: 31 roles, full routing spine, conflict detection, escalation, evidence, dispatch, 7 proven team packs. 35 execution trials. 212 tests.
- v1.2.0: Calibrated packs promoted to default entry. Auto-selection, mismatch detection, alternative suggestion, free-routing fallback. 246 tests.
- **Current**: Outcome calibration, mixed-task decomposition, composite execution, adaptive replanning. 317 tests.

## License

MIT

---

Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
