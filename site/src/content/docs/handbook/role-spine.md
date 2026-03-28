---
title: Role Spine
description: All 54 specialist roles across 9 packs and their contracts.
sidebar:
  order: 2
---

Role OS ships 54 role contracts organized into 9 packs. Each role has a defined mission, scope boundaries, expected inputs, required outputs, a quality bar, and escalation triggers. The router scores all 54 roles against packet content and assembles the smallest valid chain.

## Quick reference

| Pack | Roles | Count |
|------|-------|-------|
| **Core** | Orchestrator, Product Strategist, Critic Reviewer | 3 |
| **Engineering** | Frontend Developer, Backend Engineer, Test Engineer, Refactor Engineer, Performance Engineer, Dependency Auditor, Security Reviewer | 7 |
| **Design** | UI Designer, Brand Guardian | 2 |
| **Marketing** | Launch Copywriter | 1 |
| **Treatment** | Repo Researcher, Repo Translator, Docs Architect, Metadata Curator, Coverage Auditor, Deployment Verifier, Release Engineer | 7 |
| **Product** | Feedback Synthesizer, Roadmap Prioritizer, Spec Writer | 3 |
| **Research** | UX Researcher, Competitive Analyst, Trend Researcher, User Interview Synthesizer | 4 |
| **Growth** | Launch Strategist, Content Strategist, Community Manager, Support Triage Lead | 4 |
| **Deep Audit** | Component Auditor, Test Truth Auditor, Seam Auditor, Audit Synthesizer | 4 |

## Core (3 roles)

### Orchestrator
Decomposes work into the smallest lawful chain. Routes packets to the right roles, verifies dependencies, and coordinates sequencing. Does not perform specialist work. Included automatically when a task is multi-step and cross-functional.

### Product Strategist
Shapes scope and protects product intent. Defines what the work is for, what is primary vs noise, and sets success criteria for downstream roles. Does not write implementation code.

### Critic Reviewer
Accepts or rejects work based on contract compliance, quality, and truthfulness. Ties every verdict to evidence and the done definition. Does not rewrite the work. Always the final step in every chain.

## Engineering (7 roles)

### Backend Engineer
Implements server-side behavior, data flow, and system contracts. Does not silently change public contracts without surfacing impact.

### Frontend Developer
Implements user-facing interfaces faithfully from upstream handoffs. Does not redefine product scope or backend contracts without escalation.

### Test Engineer
Verifies work against real risk, not ceremony. Distinguishes proven from unproven. Does not declare product direction.

### Refactor Engineer
Reduces complexity, eliminates duplication, and clarifies module boundaries without changing external behavior. Does not introduce new features.

### Performance Engineer
Profiles hot paths, identifies bottlenecks, and enforces performance budgets. Does not make product decisions or change public APIs.

### Security Reviewer
Audits code for injection, auth gaps, secret exposure, and OWASP patterns. Produces threat models and remediation recommendations. Does not implement fixes.

### Dependency Auditor
Scans dependencies for known vulnerabilities, stale packages, and supply-chain risks. Does not rewrite application code.

## Design (2 roles)

### UI Designer
Designs hierarchy, interaction, and visual structure. Proposes component structure but does not invent backend behavior.

### Brand Guardian
Protects terminology, tone, and identity consistency. Detects contamination from forks, inherited projects, or cross-project drift. Does not implement code changes.

## Marketing (1 role)

### Launch Copywriter
Writes truthful messaging grounded in shipped work. Does not invent product capabilities.

## Treatment (7 roles)

### Repo Researcher
Maps repo structure, discovers entrypoints, build commands, test commands, and risky seams. Produces the foundational repo map that downstream roles depend on.

### Repo Translator
Translates READMEs and documentation into target languages. Does not modify source content.

### Docs Architect
Designs documentation structure: page hierarchy, navigation, content gaps, and getting-started flows. Does not implement code.

### Metadata Curator
Audits package manifests, badges, topics, homepage links, and registry metadata for correctness and consistency.

### Coverage Auditor
Assesses test coverage honestly. Identifies well-defended areas, poorly-defended areas, false confidence, and priority recommendations.

### Deployment Verifier
Verifies that builds, deployments, and published artifacts are correct and healthy. Checks landing pages, badges, and live URLs.

### Release Engineer
Manages version bumps, changelog entries, git tags, and publish readiness. Does not write feature code.

## Product (3 roles)

### Feedback Synthesizer
Clusters raw feedback signals into themes. Extracts actionable patterns from complaints, user signals, and sentiment data.

### Roadmap Prioritizer
Sequences work by leverage, dependency, and user value. Identifies what to stop doing. Does not implement.

### Spec Writer
Writes execution-grade specifications with acceptance criteria, edge cases, and interface definitions. Bridges product intent to engineering implementation.

## Research (4 roles)

### UX Researcher
Evaluates user flows for friction, usability heuristics, and pain points. Does not implement fixes.

### Competitive Analyst
Maps competitive landscape, differentiation gaps, and positioning opportunities. Does not make product decisions.

### Trend Researcher
Tracks technology trends, ecosystem signals, and adoption timing. Does not implement prototypes.

### User Interview Synthesizer
Extracts themes, mental models, and unmet needs from qualitative interview data. Does not conduct interviews.

## Growth (4 roles)

### Launch Strategist
Plans launches: channel selection, timing, proof packaging, and success criteria. Does not write implementation code.

### Content Strategist
Plans content: articles, case studies, tutorials, and marketing bridges. Does not write code or handle deployments.

### Community Manager
Manages open-source community health: issue triage, contribution guidance, discussion moderation, and feedback loops.

### Support Triage Lead
Classifies support input: bugs vs user errors, recurring patterns, and priority assignment. Produces structured triage output for downstream roles.

## Deep Audit (4 roles)

### Component Auditor
Audits a single bounded component: code quality, contract compliance, error handling, and architectural patterns. Receives one parcel from the audit manifest. Does not audit boundaries or test suites.

### Test Truth Auditor
Assesses whether tests for a component prove correctness or merely exist. Distinguishes real coverage from ceremonial tests. Does not write tests or fix code.

### Seam Auditor
Inspects integration boundaries between components: contract compatibility, data flow, error propagation, and coupling. Works from the dependency graph, not from individual modules.

### Audit Synthesizer
Consumes all component, test truth, and seam audit reports. Produces a ranked verdict (findings by severity) and an action plan (priority tiers with concrete next steps). Does not perform auditing.

## Role selection

Not every packet needs all 54 roles. The router and team packs select the smallest chain that covers the work. Common patterns:

- **Feature work:** Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer (5 roles)
- **Bugfix:** Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer (4 roles)
- **Treatment:** Repo Researcher, Security Reviewer, Coverage Auditor, Docs Architect, Metadata Curator, Release Engineer, Deployment Verifier, Critic Reviewer (8 roles)
- **Security review:** Security Reviewer, Dependency Auditor, Critic Reviewer (3 roles)
- **Docs work:** Support Triage Lead, Feedback Synthesizer, Docs Architect, Metadata Curator, Critic Reviewer (5 roles)
- **Research:** Product Strategist, UX Researcher, Competitive Analyst, Feedback Synthesizer, Critic Reviewer (5 roles)
- **Launch messaging:** Launch Strategist, Launch Copywriter, Critic Reviewer (3 roles)

Use `roleos packs list` to see all 9 team packs and their role compositions.

## How routing works

The router scores all 54 roles against packet content using weighted keywords and multi-word triggers. Each role declares keyword affinities (e.g., Backend Engineer matches "api", "database", "server") and strong triggers (e.g., "data migration", "schema change"). Roles also declare exclusion conditions (e.g., UI Designer excludes "cli only", "backend only").

The chain builder assembles phase-ordered chains from scored roles. Roles are assigned to phases (0 = orchestration, 1 = framing, 2 = design/spec, 3 = implementation, 4 = testing, 5 = metadata/release, 6 = deployment/launch, 99 = review). The Orchestrator and Critic Reviewer are always included when the chain is multi-step.

Conflict detection runs 4 passes before execution: hard conflicts (mutually exclusive roles), sequence violations (wrong phase ordering), redundancy (overlapping scope), and coverage gaps (missing critical roles for the task type).
