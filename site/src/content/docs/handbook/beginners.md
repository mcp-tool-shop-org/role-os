---
title: Beginners
description: New to Role OS? A plain-language walkthrough of what it is, why it exists, and how to start using it.
sidebar:
  order: 99
---

## What is Role OS?

Role OS is an operating system for multi-agent AI workflows. When you use multiple Claude instances (or any AI agents) to accomplish work, Role OS provides the structure that prevents common failures: scope drift, false completion, contradictory decisions, and unverified handoffs.

Think of it as a staffing system. You describe a task, and Role OS decides which specialist roles should handle it, in what order, and what each role must produce before passing work to the next. Every step has a contract, every handoff has structure, and every verdict requires evidence.

Role OS is a CLI tool that runs locally. It writes markdown files to your repository's `.claude/` directory. It does not access the network, collect telemetry, or handle secrets.

## Why does it exist?

When AI agents work without structure, three things break consistently:

1. **Roles blur.** A coding agent rewrites product requirements. A testing agent declares features complete. A documentation agent invents capabilities that do not exist.

2. **Completion is faked.** Work gets marked "done" based on vibes rather than evidence. Gaps are hidden in optimistic summaries. Downstream work builds on foundations that were never verified.

3. **Recovery fails silently.** When something goes wrong, there is no defined path to fix it. Work gets retried without understanding why it failed, or it gets abandoned without documenting what was learned.

Role OS solves these by enforcing role contracts (each role has a defined scope and must escalate when out of bounds), structured evidence (every verdict ties to concrete proof), and automatic recovery routing (blocked work gets sent to the right resolver with a reason and required artifact).

## Key concepts

**Roles** are specialist contracts. Role OS has 31 roles across 8 packs (Core, Engineering, Design, Marketing, Treatment, Product, Research, Growth). Each role declares what it does, when to use it, when not to use it, what inputs it needs, what outputs it must produce, and when to escalate. Roles do not overlap: a Backend Engineer does not make product decisions, and a Product Strategist does not write code.

**Packets** are structured task descriptions. A packet declares what the task is, what outcome is expected, what is in scope, what is not, and what the done definition looks like. Packets are the unit of work that gets routed, reviewed, and tracked.

**Packs** are pre-assembled teams. Instead of choosing individual roles, you pick a named pack (like "bugfix" or "feature") that contains the right roles in the right order. There are 7 packs for common work types.

**Missions** are named recurring workflows. A mission combines a pack with a proven role chain, artifact flow, escalation branches, and an honest-partial definition. There are 6 missions: feature-ship, bugfix, treatment, docs-release, security-hardening, and research-launch.

**Runs** are persistent executions. When you start a run with `roleos run`, the system creates a disk-backed execution that tracks every step, artifact, escalation, and intervention. Runs survive session interruptions and can be resumed.

**Evidence** is required proof. Every review verdict must include structured evidence items. The system checks for sufficiency: a verdict without evidence is rejected.

## Installation and first run

Install Role OS globally or use it directly with npx:

```bash
npm install -g role-os
```

Initialize a repository for Role OS:

```bash
roleos init
```

This creates the `.claude/` directory with role contracts, schemas, policies, and example packets. Existing files are never overwritten.

If you use Claude Code, also scaffold the session integration:

```bash
roleos init claude
```

This adds Role OS slash commands (`/roleos-route`, `/roleos-review`, `/roleos-status`) and lifecycle hooks to your Claude Code session. Run `roleos doctor` to verify.

Run your first task:

```bash
roleos run "fix the login button not responding on mobile"
```

Role OS decides the best entry path automatically. For this task, it would likely select the **bugfix** mission with 70% or higher confidence. The system creates a persistent run, picks the role chain (Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer), and starts the first step with guidance on what to produce.

Step through the run:

```bash
roleos next                          # See or start the next step
roleos complete diagnosis.md "Found root cause"  # Complete the active step
roleos explain                       # See full run state at any time
roleos report                        # Generate a completion report when done
```

## Common workflows

### Fix a bug

```bash
roleos run "users report crash when saving with empty title"
# → MISSION: Bugfix & Diagnosis
# → Chain: Repo Researcher → Backend Engineer → Test Engineer → Critic Reviewer
```

The Repo Researcher diagnoses the root cause. The Backend Engineer implements the fix. The Test Engineer verifies the fix does not introduce regressions. The Critic Reviewer accepts or rejects based on evidence.

### Build a feature

```bash
roleos run "add CSV export to the reports page"
# → MISSION: Feature Shipment
# → Chain: Product Strategist → Spec Writer → Backend Engineer → Test Engineer → Critic Reviewer
```

The Product Strategist frames the scope. The Spec Writer produces an implementation spec with acceptance criteria. The Backend Engineer implements it. Testing and review follow.

### Run a security audit

```bash
roleos run --pack=security "audit the authentication flow"
# → PACK: Security Review
# → Chain: Security Reviewer → Dependency Auditor → Critic Reviewer
```

### Handle a blocked step

When a step cannot proceed, use interventions:

```bash
roleos fail partial "cannot reproduce the bug"  # Mark step as partial
roleos retry 0                                   # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI issue" # Swap a role
roleos escalate "Test" "Backend" "regression" "re-fix"  # Escalate between roles
roleos block 2 "waiting for API spec"            # Block a step
roleos reopen 0 "found new evidence"             # Reopen a completed step
```

### Go manual with packets

If you prefer manual control over automatic runs:

```bash
roleos start "fix the crash"                # See the entry decision (no run created)
roleos packet new feature                   # Create a structured packet
roleos route .claude/packets/my-feature.md  # Get routing recommendation
roleos review .claude/packets/my-feature.md accept  # Record a verdict
```

## Troubleshooting

**"No mission or pack matched"** — Your task description is too vague or too novel. The system falls back to free routing, which scores all 31 roles against the content. Try making your description more specific, or create a packet with `roleos packet new` and use `roleos route` for role-level routing.

**"Mismatch detected"** — You routed a task through the wrong pack. The system tells you which pack is right. Re-run with the suggested pack or let `roleos start` decide automatically.

**Run is stuck** — Use `roleos explain` to see the full state. If a step is blocked, use `roleos fail partial <reason>` to move forward honestly, or `roleos retry <step>` to try again. Use `roleos friction` to see how many operator touches the run has required.

**Doctor check fails** — Run `roleos doctor` to verify your repo is wired for Role OS. It checks for CLAUDE.md integration, slash commands, hooks, and role contracts. Fix any missing pieces with `roleos init` or `roleos init claude`.

**Session interrupted** — Runs persist to disk in `.claude/runs/`. Use `roleos resume` to pick up where you left off. The system shows you the current step and its guidance.

**Too many roles suggested** — The router always recommends the smallest valid chain. If it suggests more roles than you expect, your task may be composite (multiple jobs in one). Consider splitting it: `roleos start` will warn you when composite tasks are detected.

## Next steps

- **[Getting Started](/role-os/handbook/getting-started/)** — The full bootstrap walkthrough with context files and packet flow
- **[Missions](/role-os/handbook/missions/)** — Deep dive into the 6 mission types and honest-partial reporting
- **[Role Spine](/role-os/handbook/role-spine/)** — Browse all 31 roles and their contracts
- **[Team Packs](/role-os/handbook/team-packs/)** — See the 7 packs and how mismatch detection works
- **[Reference](/role-os/handbook/reference/)** — Full CLI command reference with all options
