---
title: Reference
description: CLI commands, schemas, and policies.
sidebar:
  order: 3
---

## CLI commands

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

Reads the packet, detects the problem shape, and recommends the smallest valid role chain. Includes dependency verification notes.

### review

```bash
roleos review <packet-file> <verdict>
```

Records a review verdict. Verdicts: `accept`, `accept-with-notes`, `reject`, `blocked`. Prompts for reviewer role, reason, contract checks, and next owner.

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
