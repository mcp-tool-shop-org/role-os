---
title: Missions
description: 9 proven recurring workflows with tracked steps, escalation branches, and honest-partial reporting.
sidebar:
  order: 1.5
---

Missions are named, repeatable job types that make recurring work boringly reliable. Each mission declares a pack, role chain, artifact flow, escalation branches, and an honest-partial definition.

## The 9 missions

| Mission | Pack | Roles | Chain | Use when |
|---------|------|-------|-------|----------|
| `feature-ship` | feature | 5 | Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer | Full feature delivery end-to-end |
| `bugfix` | bugfix | 4 | Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer | Diagnose, fix, test, verify a bug or regression |
| `treatment` | treatment | 4 | Security Reviewer, Docs Architect, Deployment Verifier, Critic Reviewer | Pre-publish shipcheck + polish + docs + CI |
| `docs-release` | docs | 2 | Docs Architect, Critic Reviewer | Write or update docs, release notes |
| `security-hardening` | security | 4 | Security Reviewer, Backend Engineer, Test Engineer, Critic Reviewer | Threat model, audit, fix, re-audit |
| `research-launch` | research | 4 | Product Strategist, Competitive Analyst, Docs Architect, Critic Reviewer | Frame question, research, document, decide |
| `brainstorm` | brainstorm | 9 | 4 Analysts → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge | Structured multi-perspective inquiry with traceable disagreement |
| `deep-audit` | deep-audit | 5 (scales) | Component Auditor ×N + Test Truth Auditor ×M → Seam Auditor ×K → Synthesizer → Critic | Manifest-scaled repo audit — worker count scales with repo graph |
| `dogfood-swarm` | swarm | 8 (scales) | Coordinator → [5 domain agents parallel] → gate (×4 stages) → Synthesizer → Critic | Multi-pass convergence: health → proactive → humanization → feature |

## Using missions

### Start with a task description

```bash
roleos start "fix the crash in save handler"
# → MISSION: Bugfix & Diagnosis (70% confidence)
```

### Explore a mission

```bash
roleos mission show bugfix
```

This shows the full role chain, artifact flow, escalation branches, stop conditions, and honest-partial definition.

### Suggest a mission

```bash
roleos mission suggest "audit security vulnerabilities"
# → security-hardening (high confidence)
```

### Run a deep audit

The `deep-audit` mission has a dedicated CLI shortcut:

```bash
roleos audit manifest --generate     # Skeleton from src/
# Edit audit-manifest.json — define components and boundaries
roleos audit                         # Start the audit run
roleos audit status                  # Check progress
roleos audit verify                  # Verify outputs
```

This dispatches one auditor per component, scales with repo size, and synthesizes into a ranked action plan.

### Validate all missions

```bash
roleos mission validate
# Checks all role names against ROLE_CATALOG, verifies pack wiring
```

## Mission anatomy

Every mission declares:

- **Pack** — which team pack provides the roles
- **Role chain** — ordered list of roles that execute the mission
- **Artifact flow** — what each role produces and who consumes it
- **Escalation branches** — what happens when things go wrong (trigger, from, to, action)
- **Honest partial** — what "partially done" looks like, so the system never bluffs completion
- **Stop conditions** — when the mission is done (success, failure, or replan)
- **Dispatch defaults** — model, max turns, budget

## Honest partial

The most important feature of missions is the honest-partial definition. When work stalls at any step, the system:

1. Marks the failing step as `partial` or `failed`
2. Marks all downstream steps as `blocked`
3. Records what was produced and what wasn't
4. Generates a completion report that tells the truth

This prevents the most common failure in AI workflows: declaring success when the work is incomplete.

## The fallback ladder

Not every task is a mission. Role OS uses a three-level fallback:

1. **Mission** — strong match to a proven recurring workflow
2. **Pack** — task family is clear but not a full mission shape
3. **Free routing** — novel, mixed, or uncertain task

`roleos start` picks the right level automatically and explains why. The system never forces work through the wrong abstraction.

## Escalation

Missions define escalation branches for common failure modes:

- **Scope ambiguity** → escalate to Product Strategist
- **Fix introduces regression** → loop back to Backend Engineer
- **Upstream source missing** → escalate to relevant role (with warning if out-of-chain)
- **Security gate blocks** → address before continuing

When an escalation targets a role that already completed their step, the runner re-opens that step and clears the previous artifact. When the target role is not in the mission's chain, the runner records a warning so the operator knows manual intervention is needed.

## Deep audit mission

The deep audit mission decomposes a repo into bounded components and dispatches specialist auditors at a scale determined by the repo's dependency graph.

**Dynamic dispatch:** Worker count is not fixed. A 10-component repo with 5 boundary clusters produces 28 steps (`2×10 + 5 + 3`). The scaling formula is `2N + K + 3` where N = components, K = boundaries.

**Manifest-backed:** An `audit-manifest.json` defines components (file paths, line counts) and boundaries (from/to with interface descriptions). Each auditor receives only its parcel.

**Four role archetypes:**
- **Component Auditor** — code truth per module
- **Test Truth Auditor** — tests that prove vs tests that exist
- **Seam Auditor** — integration boundaries from the dependency graph
- **Audit Synthesizer** — ranked verdict + action plan from all parcels

**Artifact validation:** `validateArtifact()` fires on every step completion. Results are attached to step objects. The system tracks whether each artifact met its contract.

## Dogfood swarm mission

The dogfood swarm mission runs a **multi-pass convergence protocol** that moves a repo from "works" to "production-ready" through three health stages and iterative feature delivery.

**Four stages in sequence:**

1. **Health-A** (Bug/Security Fix) — 5 parallel domain agents audit and remediate. Loops until 0 CRITICAL + 0 HIGH findings remain.
2. **Health-B** (Proactive Hardening) — defensive coding, observability, graceful degradation. User reviews findings before amend wave.
3. **Health-C** (Humanization) — error messages that help users fix problems, reconnection feedback, loading states, accessibility. Loops until clean.
4. **Feature** (Capability Audit) — missing capabilities, UX gaps, production readiness. User approves before execution.

**Exclusive file ownership:** Each domain agent owns specific files via `swarm-manifest.json`. No two agents edit the same file.

**Build gates:** Lint + typecheck + test must pass after every wave. Auto-detects Node, Rust, Python, and Go build systems.

**Domain auto-detection:** `roleos swarm manifest --generate` detects repo type (CLI, web, desktop, MCP, monorepo) and generates non-overlapping domain assignments with 3-5 agents.

**Two new mission primitives:**
- `waveLoops` — iterative convergence with exit conditions, max iterations, and build gates
- `exclusiveOwnership` — strict domain file boundaries enforced by manifest

**Proven:** claude-collaborate (2026-03-28) — 35→129 tests, 106 findings fixed, v1.1.0 shipped.

## CLI reference

```bash
roleos mission list                    # List all 9 missions
roleos mission show <key>              # Full detail for a mission
roleos mission suggest <text>          # Suggest a mission for a task
roleos mission validate [key]          # Validate wiring (all or one)
roleos start <task description>        # Auto-decide: mission, pack, or free routing
roleos start --json <task description> # Same, but JSON output
roleos swarm                           # Start a dogfood swarm
roleos swarm manifest --generate       # Auto-detect domains
roleos swarm status                    # Check swarm progress by stage
roleos swarm findings                  # List findings by severity
roleos swarm approve                   # Approve feature gate
roleos swarm verify                    # Verify manifest and run state
```
