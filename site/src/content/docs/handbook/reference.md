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
roleos init
```

Scaffolds the full Role Spine into `.claude/` under the current directory. Includes role contracts, schemas, policies, workflows, context templates, and example packets. Existing files are never overwritten.

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
