---
title: Getting Started
description: Install Role OS and run your first packet in 10 minutes.
sidebar:
  order: 1
---

## Install

Install globally via npm:

```bash
npm install -g @mcptoolshop/role-os
```

Or run directly:

```bash
npx @mcptoolshop/role-os init
```

## Bootstrap a repo

### 1. Initialize (1 min)

```bash
roleos init
```

This scaffolds `.claude/` with the full Role Spine: 8 role contracts, schemas, policies, workflows, context templates, and example packets.

### 2. Fill context (5 min)

Fill the four context files for your project:

- `context/product-brief.md` — what this product is, its thesis, non-goals
- `context/repo-map.md` — stack, entrypoints, build commands, risky seams
- `context/current-priorities.md` — active work, blockers, banned detours
- `context/brand-rules.md` — tone, domain language, contamination risks

Each file includes inline prompts to guide you.

### 3. Start a task (1 min)

Describe what you need and let Role OS decide the right level:

```bash
roleos start "fix the crash in save handler"
# → MISSION: Bugfix & Diagnosis — Repo Researcher → Backend Engineer → Test Engineer → Critic Reviewer
```

Or go manual with packets:

```bash
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

## What you just learned

The full packet flow: create, verify, route, execute, review. Every packet follows this shape. The three canonical examples in `examples/` show how feature, integration, and identity packets differ.
