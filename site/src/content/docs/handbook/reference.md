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

Creates a disk-backed run from a task description. Auto-decides entry level (mission/pack/free routing), builds steps with guidance, starts the first step, and persists to `.claude/runs/`. Use `--mission=<key>` or `--pack=<key>` to force a specific entry level instead of auto-detection.

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

Marks the active step completed with the given artifact reference. Prints the next pending step; the operator must run `roleos next` to start it.

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

### abandon

```bash
roleos abandon [id]
```

Gives up on a run that has not already ended. With no id, it uses the active run. The ledger keeps that end state. A second end for the same run id is not written.

### report

```bash
roleos report [id]                      # Generate completion report
```

### friction

```bash
roleos friction [id]                    # Measure operator friction
```

Counts total touches (interventions, escalations, manual steps) and produces a friction score (low/medium/high).

### audit

```bash
roleos audit                           # Start a deep audit on the current repo
roleos audit manifest                  # Show the audit manifest
roleos audit manifest --generate       # Generate a skeleton manifest from src/
roleos audit status                    # Show audit run progress
roleos audit verify                    # Verify manifest and audit outputs
```

Runs a componentized deep audit against the current repo. The audit decomposes a repo into bounded components (via `audit-manifest.json`), dispatches one auditor per component, inspects seams between components, checks test truth, then synthesizes into a ranked action plan.

**Workflow:**
1. `roleos audit manifest --generate` — creates a skeleton `audit-manifest.json`
2. Edit the manifest to define components, boundaries, and dependencies
3. `roleos audit` — starts a persistent run using the `deep-audit` mission
4. `roleos next` — step through each auditor
5. `roleos audit verify` — confirms manifest and outputs are consistent

### swarm

```bash
roleos swarm                           # Start a dogfood swarm on the current repo
roleos swarm manifest                  # Show the swarm manifest
roleos swarm manifest --generate       # Auto-detect domains and generate manifest
roleos swarm status                    # Show swarm run progress by stage
roleos swarm findings                  # List findings by severity
roleos swarm approve                   # Approve the current feature gate
roleos swarm verify                    # Verify manifest and run state
```

Runs a multi-pass convergence swarm on the current repo. The swarm moves through four stages (health-a, health-b, health-c, feature), each dispatching parallel domain agents with exclusive file ownership. Build gates run after every wave.

**Workflow:**
1. `roleos swarm manifest --generate` — auto-detects repo type and generates `swarm-manifest.json` with domain assignments
2. Edit the manifest to customize domain boundaries (optional)
3. `roleos swarm` — starts the swarm, creates a save-point tag, begins Health-A
4. `roleos swarm status` — check progress by stage
5. `roleos swarm approve` — approve feature findings when prompted
6. `roleos swarm verify` — verify final state

### mission

```bash
roleos mission list                    # List all 9 missions
roleos mission show <key>              # Full detail for a mission
roleos mission suggest <text>          # Suggest a mission for a task
roleos mission validate [key]          # Validate mission wiring
```

Inspect and validate the mission library. Available missions: `feature-ship`, `bugfix`, `treatment`, `docs-release`, `security-hardening`, `research-launch`, `brainstorm`, `deep-audit`, `dogfood-swarm`.

### init

```bash
roleos init                    # Scaffold Role Spine into .claude/
roleos init --force            # Update canonical files (protects context/)
roleos init claude             # Scaffold Claude Code integration (CLAUDE.md, commands, hooks)
roleos init claude --force     # Update Claude Code integration files
```

Scaffolds the full Role Spine (39 role contracts across 8 packs, as of v2.9.0) into `.claude/` under the current directory. Includes role contracts, schemas, policies, workflows, context templates, and example packets. Existing files are never overwritten.

`roleos init claude` adds Claude Code session integration: appends a Role OS section to CLAUDE.md, creates `/roleos-route`, `/roleos-review`, and `/roleos-status` slash commands, and configures 5 lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, SubagentStart, Stop). Use `roleos doctor` to verify the wiring. Hooks provide advisory enforcement: route card reminders, write-tool gating, subagent role injection, and completion audits.

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
- `--verbose` — show all scoring details, including non-triggered roles. Also prints the pack boost, the run count, and the clean rate. An empty ledger prints "Calibration: no recorded runs yet". The boost does not change the keyword score that confidence is taken from.
- `--no-split` — force single-packet routing even if composite task is detected

### review

```bash
roleos review <packet-file> <verdict>
```

Records a review verdict. Verdicts: `accept`, `accept-with-notes`, `reject`, `blocked`. Prompts for reviewer role, reason, contract checks, and next owner.

### packs

```bash
roleos packs list                      # List all 10 team packs
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

### recipe

```bash
roleos recipe init <role> [--out <file>] [--id <id>]
roleos recipe check <card.json> [--json]
roleos recipe hash <card.json>
roleos recipe controls
roleos specialist register <role> <version.json> --recipe <card.json>
```

Checks a dataset recipe card (`roleos-recipe-card/v1`). `check` separates errors from evidence gaps and prints the card's canonical SHA-256. A passed control with no measure is a gap. An inconsistent measure is an error. `shuffled-labels` prints its permutation floor, 1/(nulls+1). `same-generator-no-error` can be `unresolved` when two edit methods disagree. `reversed-correction` passes only when the accuracy interval lies entirely above 0.5. `controls` lists the nine standard controls. `--recipe` pins `{ id, sha256, path }` on a specialist version.

### jury

```bash
roleos jury check <validation.json> [--json] [--allow-unproven] [--require-recipe]
roleos jury select <validation.json> [--max-size 5] [--bags 50] [--folds 5] [--seed 0] [--allow-unproven] [--require-recipe] [--out panel.json] [--json]
roleos jury score <panel.json> <items.json> [--json]
```

Measures critics on a validation file (`roleos-jury-validation/v1`) and keeps a panel only when it beats the best single critic. Below 30 items or 10 groups the verdict is `insufficient-data`. `--out` writes `roleos-jury-panel/v1` only when the verdict is `panel`.

A critic whose card has a failed or unresolved standard control is left out unless `--allow-unproven`. A critic with no card is seated, and printed as `unproven: no recipe card`, unless `--require-recipe`. `--allow-unproven` does not forgive a hash mismatch, a missing file, an invalid card, or an unreadable path. A gap on the card does not by itself exclude the critic.

`score` applies the saved means, standard deviations, thresholds, and counts. It does not refit them. An absent score is `unmeasured`. A score exactly equal to a critic's threshold is an abstention, and so is a panel score of exactly 0. The text prints that as `abstain`. The same seed repeats the same numbers.

### calibration

```bash
roleos calibration [--json]
```

Prints the calibration report and the per-combination table. An empty ledger prints `no recorded runs yet`, not zeros. Below 5 runs a combination says `insufficient data` and has no rate. At 5 or more, the clean rate (completed, no corrections, no rejected verdicts) is a Wilson 95% interval.

The pack boost applies only after that pack has 5 recorded outcomes: +0.5 for each completed run with corrections 0, capped at +2. It never names a pack the keywords did not already match. Confidence is still taken from the keyword score (3 is high, 2 is medium). Role weights and confidence thresholds do not change. The report may suggest looking at the keyword cutoff. Role OS does not apply that suggestion.

`ROLEOS_NO_CALIBRATION=1` turns the boost off. Recording continues.

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
