---
title: Missions
description: 6 proven recurring workflows with tracked steps, escalation branches, and honest-partial reporting.
sidebar:
  order: 1.5
---

Missions are named, repeatable job types that make recurring work boringly reliable. Each mission declares a pack, role chain, artifact flow, escalation branches, and an honest-partial definition.

## The 6 missions

| Mission | Pack | Roles | Chain | Use when |
|---------|------|-------|-------|----------|
| `feature-ship` | feature | 5 | Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer | Full feature delivery end-to-end |
| `bugfix` | bugfix | 4 | Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer | Diagnose, fix, test, verify a bug or regression |
| `treatment` | treatment | 4 | Security Reviewer, Docs Architect, Deployment Verifier, Critic Reviewer | Pre-publish shipcheck + polish + docs + CI |
| `docs-release` | docs | 2 | Docs Architect, Critic Reviewer | Write or update docs, release notes |
| `security-hardening` | security | 4 | Security Reviewer, Backend Engineer, Test Engineer, Critic Reviewer | Threat model, audit, fix, re-audit |
| `research-launch` | research | 4 | Product Strategist, Competitive Analyst, Docs Architect, Critic Reviewer | Frame question, research, document, decide |

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

## CLI reference

```bash
roleos mission list                    # List all 6 missions
roleos mission show <key>              # Full detail for a mission
roleos mission suggest <text>          # Suggest a mission for a task
roleos mission validate [key]          # Validate wiring (all or one)
roleos start <task description>        # Auto-decide: mission, pack, or free routing
roleos start --json <task description> # Same, but JSON output
```
