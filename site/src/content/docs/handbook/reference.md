---
title: Reference
description: CLI commands, schemas, and policies.
sidebar:
  order: 4
---

## CLI commands

### start

```bash
roleos start <task description>
roleos start --json <task description>
```

Decides the best entry path for a task: mission, pack, or free routing. Explains why it chose each level and offers alternatives. Use `--json` for machine-readable output.

### run

```bash
roleos run "<task description>"         # Create and start a persistent run
roleos run --mission=bugfix "<task>"    # Force a specific mission
roleos run --pack=security "<task>"     # Force a specific pack
roleos run list                         # List all runs
roleos run show <id>                    # Show run detail
```

Creates a disk-backed run from a task description. Auto-decides entry level (mission/pack/free routing), builds steps with guidance, starts the first step, and persists to `.claude/runs/`.

### resume

```bash
roleos resume [id]                      # Resume the active or named run
```

Continues an interrupted run. If a step was active when paused, it resumes there. Otherwise starts the next pending step.

### next

```bash
roleos next                             # Start the next step or show what's active
```

If a step is currently active, shows it with guidance. If no step is active, starts the next pending step.

### explain

```bash
roleos explain [id]                     # Full run state with guidance
```

Shows: task, entry level, status, all steps with status icons, current step guidance, escalations, and interventions.

### complete

```bash
roleos complete <artifact> [note]       # Complete the active step
```

Marks the active step completed with the given artifact reference. Advances to the next step.

### fail

```bash
roleos fail <partial|failed> <reason>   # Fail the active step
```

Marks the active step as partial or failed. Blocks all downstream pending steps.

### Interventions

```bash
roleos retry <step-index>               # Retry a failed/partial step
roleos reroute <step> <role> <reason>   # Swap a step's role
roleos escalate <from> <to> <trigger> <action>  # Escalate between roles
roleos block <step-index> <reason>      # Block a step
roleos reopen <step-index> <reason>     # Reopen a completed step
```

### report

```bash
roleos report [id]                      # Generate completion report
```

### friction

```bash
roleos friction [id]                    # Measure operator friction
```

Counts total touches (interventions, escalations, manual steps) and produces a friction score (low/medium/high).

### mission

```bash
roleos mission list                    # List all 6 missions
roleos mission show <key>              # Full detail for a mission
roleos mission suggest <text>          # Suggest a mission for a task
roleos mission validate [key]          # Validate mission wiring
```

Inspect and validate the mission library. Available missions: `feature-ship`, `bugfix`, `treatment`, `docs-release`, `security-hardening`, `research-launch`.

### init

```bash
roleos init                    # Scaffold Role Spine into .claude/
roleos init --force            # Update canonical files (protects context/)
roleos init claude             # Scaffold Claude Code integration (CLAUDE.md, commands, hooks)
roleos init claude --force     # Update Claude Code integration files
```

Scaffolds the full Role Spine (31 roles across 8 packs) into `.claude/` under the current directory. Includes role contracts, schemas, policies, workflows, context templates, and example packets. Existing files are never overwritten.

`roleos init claude` adds Claude Code session integration: appends a Role OS section to CLAUDE.md, creates `/roleos-route`, `/roleos-review`, and `/roleos-status` slash commands, and configures lifecycle hooks. Use `roleos doctor` to verify the wiring.

### packet new

```bash
roleos packet new <type>
```

Creates a structured packet file. Types: `feature`, `integration`, `identity`. Prompts for title, outcome, scope, non-goals, constraints, and key inputs.

### route

```bash
roleos route <packet-file>
```

Reads the packet, detects the problem shape, and recommends the smallest valid role chain. Suggests a pack when confidence is high. Detects composite tasks and recommends splitting. Includes dependency verification notes.

Options:
- `--pack=<name>` — use a specific pack instead of auto-selection
- `--verbose` — show all scoring details including non-triggered roles
- `--no-split` — force single-packet routing even if composite task is detected

### review

```bash
roleos review <packet-file> <verdict>
```

Records a review verdict. Verdicts: `accept`, `accept-with-notes`, `reject`, `blocked`. Prompts for reviewer role, reason, contract checks, and next owner.

### packs

```bash
roleos packs list                      # List all 7 team packs
roleos packs suggest <packet-file>     # Suggest a pack for a packet
roleos packs show <pack-key>           # Show full pack detail
```

### artifacts

```bash
roleos artifacts                       # List all role artifact contracts
roleos artifacts show <role>           # Show contract for a role
roleos artifacts validate <role> <file> # Validate a file against a contract
roleos artifacts chain <pack>          # Show pack handoff flow
```

### status

```bash
roleos status                          # Show active work and health
roleos status --write                  # Write .claude/status/index.md
roleos status --json                   # Output as JSON
```

### doctor

```bash
roleos doctor                          # Verify repo is wired for Role OS
```

### help

```bash
roleos help
```

Prints usage information and available commands.

## Schemas

### Task packet
Defines: task ID, title, requested outcome, user intent, scope, non-goals, inputs, constraints, deliverable type, assigned role, dependencies, done definition, and open questions.

### Handoff
Defines: from/to role, task ID, status (ready/blocked/needs-clarification/completed-with-risks), summary, artifacts, decisions, assumptions, risks, recommended next step, and evidence.

### Review verdict
Defines: reviewer, task ID, verdict, reason, contract check (scope/output/quality/risks/readiness), required corrections, and next owner.

## Policies

### Routing rules
Use the smallest number of roles needed. Route based on work type: product shaping, UI design, frontend/backend implementation, testing, copy, or review.

### Escalation rules
Escalate when missing information would change the work materially. Mandatory cases: missing API contracts, conflicting goals, unknown conventions, unavailable dependencies, or unresolvable quality gaps.

### Done definition
A role is done when it completed the assigned scope, produced the required output shape, surfaced risks honestly, identified the next owner, and its output is reviewable without extra interpretation. Work carrying cross-project residue is not done.

### Tool permissions
Each role uses minimum tools. Roles must not perform work outside their contract boundary.

## Relationship to shipcheck and full treatment

- **Shipcheck** is the 31-item quality gate that runs before full treatment
- **Full treatment** is the canonical 7-phase polish and publish protocol
- Both are defined in Claude project memory, not reimplemented by Role OS
- Role OS adds role contracts, handoffs, and review gates on top
