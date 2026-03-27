<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>


<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="600">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

A multi-Claude operating system that staffs, routes, validates, and runs work through 50 specialized role contracts. Creates task packets, assembles the right team from scored role matching, detects broken chains before execution, auto-routes recovery when work is blocked or rejected, and requires structured evidence in every verdict.

## What it does

Role OS is the professional way to use multi-Claude. It prevents the specific failures that generic AI workflows produce:

- **Drift** — roles stay in lane. Product doesn't redesign. Frontend doesn't redefine scope. Backend doesn't invent product direction.
- **False completion** — the done definition is concrete. Work that hides gaps, skips verification, or solves a different problem gets rejected.
- **Contamination** — forked or inherited projects carry identity residue. Role OS detects and rejects cross-project drift in terminology, visuals, and mental models.
- **Vibes-based progress** — every handoff is structured. Every verdict ties to evidence. "It feels done" is not a valid state.

## How it works

Describe your task. Role OS decides the right level of orchestration automatically.

```bash
roleos start "fix the crash in save handler"
# → MISSION: Bugfix & Diagnosis (70% confidence)
#   Chain: Repo Researcher → Backend Engineer → Test Engineer → Critic Reviewer

roleos start "add a new export command"
# → PACK: Feature Build (50% confidence)
#   Roles: Orchestrator, Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer

roleos start "something completely novel"
# → FREE-ROUTING (10% confidence)
#   Hint: Create a packet and run `roleos route` for role-level routing
```

**The fallback ladder:**

1. **Mission** — when the task matches a proven recurring workflow (bugfix, treatment, feature-ship, docs, security, research). Known role chain, artifact flow, escalation branches, and honest-partial definitions.
2. **Pack** — when the task is a known family but not a full mission shape. 7 calibrated team packs with auto-selection and mismatch guards.
3. **Free routing** — when the task is novel, mixed, or uncertain. Scores all 31 roles against packet content and assembles a dynamic chain.

The system never forces work through the wrong abstraction. It explains why it chose each level and offers alternatives.

**One command to active execution:**

```bash
roleos run "fix the crash in save handler"
# → Created run: run-1234
# → Entry: MISSION (bugfix)
# → Started step 0: Repo Researcher → diagnosis-report
# → Guidance: Required sections: entrypoints, module-map, build-test-commands

roleos next                    # Start the next step
roleos complete diagnosis.md   # Complete the active step with artifact
roleos explain                 # Show full run state and guidance
roleos resume                  # Continue an interrupted run
roleos report                  # Generate completion report
roleos friction                # Measure operator touches
```

**Interventions when things go wrong:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Runs persist to disk (`.claude/runs/`), so interrupted sessions resume cleanly. Every step includes operator guidance: what to produce, required sections, and stop conditions.

**Once routed:**

1. **Each role produces a handoff** — structured output with evidence items that reduce ambiguity for the next role
2. **Critic reviews against contract** — accepts, rejects, or blocks based on structured evidence, not impression
3. **Recovery routes automatically** — blocked or rejected work gets routed to the right resolver with a reason, recovery type, and required artifact

## Org rollout state

Org-wide rollout state (queue, decisions, audit records, per-repo lock packets) lives in a separate private repo: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). This repo is the product; that repo is operational state.

## Memory and continuity

Role OS does not own or duplicate the memory layer. Where Claude project memory exists, it is the canonical continuity system — repo facts, decisions, open loops, and treatment history live there.

Role OS integrates with Claude project memory. It does not replace it.

## Full treatment and shipcheck

Full treatment is a canonical 7-phase protocol defined in Claude project memory (`memory/full-treatment.md`). Role OS routes and reviews treatments using role contracts, handoffs, and critic gates — it does not redefine the protocol.

**Shipcheck** is the 31-item quality gate that runs before full treatment. Hard gates A-D must pass before any treatment begins. Canonical reference: `memory/shipcheck.md`.

Order: Shipcheck first, then full treatment. No v1.0.0 without passing hard gates.

## 50 roles across 8 packs

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

# Describe what you need — Role OS picks the right level:
roleos run "fix the crash in save handler"
# → Creates run, picks bugfix mission, starts first step with guidance

# Step through:
roleos next                    # Start next step
roleos complete artifact.md    # Complete with artifact
roleos explain                 # Show full state
roleos report                  # Completion report

# Or go manual:
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept

# Explore missions and packs:
roleos mission list
roleos packs list
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

**Brainstorm golden run** (MCP server marketplace topic)
- 9-role chain, 4 analysts in parallel, cross-examine + rebut dispute graph
- 4 challenges issued, 3 claims narrowed, 1 unresolved — healthy pressure, not deadlock
- 16+ trace links from rendered artifacts back to truth-layer atoms
- Full chain of custody proven: truth → atoms → dispute → synthesis → expand → judge → render → trace

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
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    run.mjs                    ← Persistent run engine: create → step → pause → resume → report
    run-cmd.mjs                ← `roleos run/resume/next/explain/complete/fail` + interventions
    mission.mjs                ← 7 named mission types (feature, bugfix, treatment, docs, security, research, brainstorm)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 30 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 894 tests across 30 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
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
| **Session spine** | `roleos init claude` scaffolds CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifies wiring. Route cards prove engagement. | ✓ Shipped |
| **Hook spine** | 5 lifecycle hooks (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Advisory enforcement: route card reminders, write-tool gating, subagent role injection, completion audit. | ✓ Shipped |
| **Artifact spine** | 30 per-role artifact contracts. 7 pack handoff contracts. Structural validation. Chain completeness checks. Downstream roles never guess what they received. | ✓ Shipped |
| **Mission library** | 7 named missions (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm). Each declares pack, role chain, artifact flow, escalation branches, honest-partial definition. All 7 trial-proven. | ✓ Shipped |
| **Mission runner** | Create runs, step through with tracked state, complete/fail with honest reporting. Blocked-step propagation, out-of-chain escalation warnings, last-step re-opening. | ✓ Shipped |
| **Unified entry** | `roleos start` decides mission vs pack vs free routing automatically. Fallback ladder with confidence scores, alternatives, and composite detection. | ✓ Shipped |
| **Persistent runs** | `roleos run` creates disk-backed runs. `resume`, `next`, `explain`, `complete`, `fail`. Interventions: reroute, escalate, retry, block, reopen. Step-local guidance. Friction measurement. | ✓ Shipped |
| **Brainstorm** | Two-layer architecture: truth (role-native schemas, provenance atoms, cross-exam dispute graph) + render (5 distinct voices, lexical bans, debate transcript). Trace links prove every rendered claim maps to a truth atom. Golden run: 894 tests. | ✓ Shipped |

## 7 missions

| Mission | Pack | Roles | When to use |
|---------|------|-------|-------------|
| `feature-ship` | feature | 5 | Full feature delivery: scope → spec → implement → test → review |
| `bugfix` | bugfix | 4 | Diagnose root cause, fix, test, verify |
| `treatment` | treatment | 4 | Shipcheck + polish + docs + CI verify + review |
| `docs-release` | docs | 2 | Write/update documentation, release notes |
| `security-hardening` | security | 4 | Threat model, audit, fix vulnerabilities, re-audit, verify |
| `research-launch` | research | 4 | Frame question, research, document findings, decide |
| `brainstorm` | brainstorm | 9 | Structured multi-perspective inquiry with traceable disagreement and verdict |

Each mission includes honest-partial definitions — when work stalls, the system documents what was completed and what remains instead of bluffing completion.

### Brainstorm mission

Not "AI brainstorming." The brainstorm mission is **specialized roles under law, with traceable disagreement and verdict-bearing output.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**What makes it different:**

- **Layer 1 (truth):** Four analysts emit role-native schemas (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — not shared prose. Each role is blindspot-enforced: forbidden phrases, forbidden claim kinds, filtered input partitions. Atoms carry provenance. A directed cross-examination graph produces targeted challenges. Original analysts defend, narrow, or retract under pressure.

- **Layer 2 (render):** Five distinct human voices (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) with lexical bans preventing voice convergence. Synthesis consumes truth, never rendered prose. Both layers always available.

- **Chain of custody:** Every rendered sentence traces back to a truth-layer atom. Synthesis directions cite atoms. Cross-exam targets real claim IDs. The dispute graph is the product, not the prose.

**Proven:** v0.4 golden run — 894 tests, full chain of custody verified. See [`examples/golden-run.md`](examples/golden-run.md) for the complete artifact chain.

## Status

- v0.1–v0.4: Foundation — trials, adoption, treatment pack, starter pack
- v1.0.0: 32 roles, full CLI, proven treatment, multi-repo portability
- v1.0.2: Role OS lockdown (bootstrap truth fixes, init --force)
- v1.1.0: 31 roles, full routing spine, conflict detection, escalation, evidence, dispatch, 7 proven team packs. 35 execution trials. 212 tests.
- v1.2.0: Calibrated packs promoted to default entry. Auto-selection, mismatch detection, alternative suggestion, free-routing fallback. 246 tests.
- v1.3.0: Outcome calibration, mixed-task decomposition, composite execution, adaptive replanning. 317 tests.
- v1.4.0: Session spine — `roleos init claude`, `roleos doctor`, route cards, /roleos-route + /roleos-review + /roleos-status commands. 335 tests.
- v1.5.0: Hook spine — 5 lifecycle hooks for runtime enforcement. 358 tests.
- v1.6.0: Artifact spine — 20 per-role artifact contracts, 7 pack handoff contracts, structural validation. 385 tests.
- v1.7.0: Completion proof — real tasks run through the full stack. `roleos artifacts` CLI. Honest escalation on structural fixes. 398 tests.
- v1.8.0: Mission library (Phase S) — 6 named missions, runner engine, completion reports. Hardened from 6 real trial runs. 481 tests.
- v1.9.0: Unified entry path (Phase T) — `roleos start` auto-decides mission vs pack vs free routing. Fallback ladder, composite detection, entry-path comparison trials. 527 tests.
- **v2.0.0**: Operator friction pass (Phase U) — `roleos run` creates persistent disk-backed runs. Resume, next, explain, complete, fail. Interventions: reroute, escalate, retry, block, reopen. Step-local guidance at every step. Friction measurement. 6 friction trials. 613 tests.
- **v2.0.1**: Handbook audit, beginner docs, test count corrections. 617 tests.
- **v2.1.0**: Brainstorm mission (v0.4) — specialized roles under law, traceable disagreement, verdict-bearing output. Two-layer architecture (truth + render), cross-exam permission matrix, dispute graph, golden run proof. 7 missions, 50 roles, 8 packs. 894 tests.

## License

MIT

---

Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
