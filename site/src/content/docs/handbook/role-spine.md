---
title: Role Spine
description: The 8 specialist roles and their contracts.
sidebar:
  order: 2
---

Role OS ships 8 proven role contracts. Each role has a defined mission, scope boundaries, expected inputs, required outputs, a quality bar, and escalation triggers.

## Core roles

### Orchestrator
Decomposes work into the smallest lawful chain. Routes packets to the right roles, verifies dependencies, and coordinates sequencing. Does not perform specialist work.

### Product Strategist
Shapes scope and protects product intent. Defines what the work is for, what is primary vs noise, and sets success criteria for downstream roles. Does not write implementation code.

### Critic Reviewer
Accepts or rejects work based on contract compliance, quality, and truthfulness. Ties every verdict to evidence and the done definition. Does not rewrite the work.

## Engineering roles

### Frontend Developer
Implements user-facing interfaces faithfully from upstream handoffs. Does not redefine product scope or backend contracts without escalation.

### Backend Engineer
Implements server-side behavior, data flow, and system contracts. Does not silently change public contracts without surfacing impact.

### Test Engineer
Verifies work against real risk, not ceremony. Distinguishes proven from unproven. Does not declare product direction.

## Design role

### UI Designer
Designs hierarchy, interaction, and visual structure. Proposes component structure but does not invent backend behavior.

## Marketing role

### Launch Copywriter
Writes truthful messaging grounded in shipped work. Does not invent product capabilities.

## Role selection

Not every packet needs all 8 roles. Use the smallest chain that covers the work:

- **Feature work:** Orchestrator, Product Strategist, UI Designer, Backend/Frontend, Test, Critic (5-7 roles)
- **Integration work:** Orchestrator, Backend, Frontend, Test, Critic (4-5 roles)
- **Identity/polish:** Orchestrator, Product Strategist, UI Designer, Frontend, Test, Critic (5-6 roles)
- **Bug fix:** Orchestrator, Backend or Frontend, Test, Critic (3-4 roles)
