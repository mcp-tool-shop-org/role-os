---
title: Getting Started
description: Install Role OS and run your first task in 5 minutes.
sidebar:
  order: 1
---

## Install

Install globally via npm:

```bash
npm install -g role-os
```

Or run directly:

```bash
npx role-os init
```

## Bootstrap a repo

### 1. Initialize (1 min)

```bash
roleos init
```

This scaffolds `.claude/` with the full Role Spine: 31 role contracts across 8 packs, schemas, policies, workflows, context templates, and example packets.

### 2. Fill context (5 min)

Fill the four context files for your project:

- `context/product-brief.md` — what this product is, its thesis, non-goals
- `context/repo-map.md` — stack, entrypoints, build commands, risky seams
- `context/current-priorities.md` — active work, blockers, banned detours
- `context/brand-rules.md` — tone, domain language, contamination risks

Each file includes inline prompts to guide you.

### 3. Run a task (1 min)

One command from task description to active execution:

```bash
roleos run "fix the crash in save handler"
# → Created run (bugfix mission)
# → Started step 0: Repo Researcher → diagnosis-report
# → Guidance: Required sections: entrypoints, module-map, build-test-commands
```

### 4. Step through the run

```bash
roleos complete diagnosis.md "Root cause found"  # Complete step with artifact
roleos next                                       # Start next step
roleos explain                                    # See full run state
```

If something goes wrong:

```bash
roleos fail partial "Cannot reproduce"            # Mark step as partial
roleos retry 0                                    # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"   # Swap a role
roleos resume                                     # Resume after interruption
```

Or go manual with packets:

```bash
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
```

### 5. Work through the chain

Each role in the chain reads the packet and upstream handoffs, produces its output, and hands off to the next role.

### 6. Review (1 min)

```bash
roleos review .claude/packets/my-feature.md accept
```

Record the verdict: `accept`, `accept-with-notes`, `reject`, or `blocked`. The CLI captures the reviewer, reason, contract checks, and next owner.

## Claude Code integration (optional)

If you use Claude Code, scaffold the session integration:

```bash
roleos init claude
```

This appends a Role OS section to your CLAUDE.md, creates `/roleos-route`, `/roleos-review`, and `/roleos-status` slash commands, and configures lifecycle hooks so Claude Code enters every session through role-os routing.

Verify the wiring:

```bash
roleos doctor
```

Doctor checks for CLAUDE.md integration, slash commands, hooks, and role contracts. Fix any missing pieces with `roleos init` or `roleos init claude --force`.

## What you just learned

The full packet flow: create, verify, route, execute, review. Every packet follows this shape. The three canonical examples in `examples/` show how feature, integration, and identity packets differ.
