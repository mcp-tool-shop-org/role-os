---
title: Team Packs
description: 7 pre-assembled role chains for common work types. Pick a pack, describe a task, and route it in one command.
sidebar:
  order: 3
---

Team Packs are curated subsets of the 31-role spine. Instead of selecting individual roles, you pick a named pack that already contains the right roles in the right order for a given class of work. Each pack includes mismatch detection: if your task does not fit the pack, it suggests the right one instead.

```bash
roleos run --pack=feature "add export command"
roleos packs list
roleos packs suggest .claude/packets/my-task.md
```

## When to use a pack vs. free routing

Use a pack when the work is well-scoped and the domain is clear. Use free routing (`roleos route`) when the work cuts across domains or you need a custom chain. `roleos start` picks the right level automatically (mission, pack, or free routing) based on your task description.

## The 7 packs

### 1. Feature Build

Full feature delivery: scope, spec, implement, test, review.

| | |
|---|---|
| **Roles** | Orchestrator, Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer |
| **Optional** | UI Designer, Frontend Developer, Security Reviewer |
| **Chain** | Product Strategist, Spec Writer, Backend Engineer, Test Engineer |
| **Orchestrator** | Required (multi-role, cross-functional) |
| **Artifacts** | Scope doc, spec, implementation, test results, verdict |

---

### 2. Bugfix / Repair

Diagnose, fix, verify, review. Minimal chain, fast turnaround.

| | |
|---|---|
| **Roles** | Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer |
| **Optional** | Frontend Developer, Performance Engineer |
| **Chain** | Repo Researcher, Backend Engineer, Test Engineer |
| **Orchestrator** | Not required |
| **Artifacts** | Repo map / diagnosis, fix implementation, regression tests, verdict |

---

### 3. Security Review

Threat model, code review, dependency audit, verdict.

| | |
|---|---|
| **Roles** | Security Reviewer, Dependency Auditor, Critic Reviewer |
| **Optional** | Backend Engineer, Test Engineer |
| **Chain** | Security Reviewer, Dependency Auditor |
| **Orchestrator** | Not required |
| **Artifacts** | Threat model, code review findings, dependency audit, verdict |

---

### 4. Docs / Handbook

Triage raw input, synthesize themes, structure docs, verify metadata, review.

| | |
|---|---|
| **Roles** | Support Triage Lead, Feedback Synthesizer, Docs Architect, Metadata Curator, Critic Reviewer |
| **Optional** | Repo Translator, Brand Guardian, Release Engineer, Deployment Verifier |
| **Chain** | Support Triage Lead, Feedback Synthesizer, Docs Architect, Metadata Curator |
| **Orchestrator** | Not required |
| **Artifacts** | Classified input, synthesized themes, docs structure, metadata audit, verdict |

---

### 5. Launch / Messaging

Plan launch strategy, write copy, review.

| | |
|---|---|
| **Roles** | Launch Strategist, Launch Copywriter, Critic Reviewer |
| **Optional** | Content Strategist, Community Manager |
| **Chain** | Launch Strategist, Launch Copywriter |
| **Orchestrator** | Not required |
| **Artifacts** | Launch plan, release copy, verdict |

---

### 6. Research / Strategy

Frame the decision, gather evidence, synthesize, recommend.

| | |
|---|---|
| **Roles** | Product Strategist, UX Researcher, Competitive Analyst, Feedback Synthesizer, Critic Reviewer |
| **Optional** | Trend Researcher, User Interview Synthesizer |
| **Chain** | Product Strategist, UX Researcher, Competitive Analyst, Feedback Synthesizer |
| **Orchestrator** | Not required |
| **Artifacts** | Decision frame, friction inventory, competitive landscape, signal synthesis, verdict |

---

### 7. Treatment (Repo Polish)

Full repo treatment: research, security, audit, docs, metadata, release, deploy, verify.

| | |
|---|---|
| **Roles** | Repo Researcher, Security Reviewer, Coverage Auditor, Docs Architect, Metadata Curator, Release Engineer, Deployment Verifier, Critic Reviewer |
| **Optional** | Brand Guardian, Repo Translator, Dependency Auditor |
| **Chain** | Repo Researcher, Security Reviewer, Coverage Auditor, Docs Architect, Metadata Curator, Release Engineer, Deployment Verifier |
| **Orchestrator** | Not required (long but sequential, clear handoffs) |
| **Artifacts** | Repo map, security findings, coverage audit, docs, metadata audit, release, deployment verification, verdict |

---

## Pack reference

| Pack | Key | Roles | Primary use |
|------|-----|-------|-------------|
| Feature Build | `feature` | 6 (+3 optional) | Full feature delivery end-to-end |
| Bugfix / Repair | `bugfix` | 4 (+2 optional) | Diagnose, fix, test, verify |
| Security Review | `security` | 3 (+2 optional) | Threat model and dependency audit |
| Docs / Handbook | `docs` | 5 (+4 optional) | Documentation structure and content |
| Launch / Messaging | `launch` | 3 (+2 optional) | Launch strategy and release copy |
| Research / Strategy | `research` | 5 (+2 optional) | Decision framing and evidence gathering |
| Treatment | `treatment` | 8 (+3 optional) | Full repo polish and publish |

## Mismatch detection

Every pack includes guards that detect when a task does not belong. If you route a bugfix task through the feature pack, the system warns you and suggests `bugfix` instead. This prevents wasted work from routing through the wrong abstraction.

```bash
roleos packs suggest .claude/packets/my-task.md
# → Suggested: bugfix (high confidence)
# → Mismatch: feature pack is wrong for this task — this is a bug to fix, not a feature to build
```

## Combining packs

Packs are not mutually exclusive. A treatment often runs the treatment pack end-to-end, but you can also chain packs manually. The output of each pack is the input for the next. Use `roleos review` to record the verdict between packs.

## Related

- [Role Spine](/role-os/handbook/role-spine/) — the full 31-role catalog that packs draw from
- [Missions](/role-os/handbook/missions/) — 6 recurring workflows built on top of packs
- [Getting Started](/role-os/handbook/getting-started/) — run your first task
- [Reference](/role-os/handbook/reference/) — full CLI command reference
