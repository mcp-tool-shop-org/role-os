# Product Brief — role-os

## What this is

A portable, repo-native operating layer that routes work through role contracts, structured packets, review, and escalation. It prevents drift, false completion, contamination, and vibes-based progress by encoding work as auditable packets flowing through specialized roles with enforced verdicts.

## Thesis

Generic AI orchestration produces drift, false completion, and contamination because it has no concept of role boundaries, structured handoffs, or enforceable review. Role OS solves this by making every unit of work a packet with a defined owner, a typed chain, and a critic-gated verdict.

## Target user

- Claude sessions working on repos that need structured work beyond single-line fixes
- Orchestration systems (multi-claude) that need role-based task dispatch
- Repo maintainers who want to prevent identity contamination during forks or treatments

## Core value

Work flows through contracts, not vibes. Every role has a mission, boundaries, and escalation triggers. Every packet has a type, a chain, and a verdict. Every verdict ties to evidence.

## Non-goals

- Role OS is not a memory system. Claude project memory is canonical; Role OS integrates with it.
- Role OS is not a CI system. It produces structured work artifacts; CI consumes them.
- Role OS is not a project manager. It routes work; it does not plan roadmaps.
- Role OS is not a linter. It defines role contracts; it does not analyze code quality.

## Anti-thesis — what this product must never become

1. **A memory layer.** Role OS must never invent, duplicate, or abstract Claude project memory. Canonical memory lives at `memory/`. Role OS reads it, never rewrites it.
2. **A configuration framework.** Zero dependencies, no config files, no plugin systems. The starter-pack is the standard. If you need to customize, fill the context files — don't extend the framework.
3. **A loose advisory system.** Verdicts are binding. Accept means done. Reject means redo. Blocked means stop. There is no "probably fine" verdict.
4. **A tool that scaffolds stale truth.** If the starter-pack drifts from the README, handbook, routing rules, or policy files, the tool is broken. Bootstrap truth must be synchronized.
5. **A tool that invents state outside the filesystem.** Every command reads from and writes to `.claude/`. No caching, no hidden globals, no session memory across runs.
6. **A role factory.** The 32-role catalog is the catalog. New roles require synchronized updates to starter-pack, routing-rules, tool-permissions, README, and handbook. No silent role addition.
7. **A tool that blurs the line between routing recommendation and routing truth.** `roleos route` recommends chains; it does not assign them. The recommendation is keyword-scored across 6 roles; 26 roles require manual orchestrator assignment. This limitation must be documented, not hidden.
