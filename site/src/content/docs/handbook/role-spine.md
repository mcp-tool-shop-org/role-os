---
title: Role Spine
description: All 61 specialist roles, their families, and their contracts.
sidebar:
  order: 2
---

Role OS ships a 61-role catalog organized into 11 role families. Each role has a defined mission, scope boundaries, expected inputs, required outputs, a quality bar, and escalation triggers. The router scores all 61 roles against packet content and assembles the smallest valid chain.

Role *families* group related contracts in the catalog. They are distinct from the 10 dispatch [team packs](/role-os/handbook/team-packs/) (`feature`, `bugfix`, `security`, …), which are curated chains drawn from this catalog.

## Quick reference

| Family | Roles | Count |
|--------|-------|-------|
| **Core** | Orchestrator, Critic Reviewer | 2 |
| **Product** | Product Strategist, Feedback Synthesizer, Roadmap Prioritizer, Spec Writer | 4 |
| **Engineering** | Frontend Developer, Backend Engineer, Test Engineer, Refactor Engineer, Performance Engineer, Dependency Auditor, Security Reviewer | 7 |
| **Design** | UI Designer, Brand Guardian | 2 |
| **Marketing** | Launch Copywriter | 1 |
| **Treatment** | Repo Researcher, Repo Translator, Docs Architect, Metadata Curator, Coverage Auditor, Deployment Verifier, Release Engineer | 7 |
| **Research** | UX Researcher, Competitive Analyst, Trend Researcher, User Interview Synthesizer | 4 |
| **Growth** | Launch Strategist, Content Strategist, Community Manager, Support Triage Lead | 4 |
| **Brainstorm** | Context Analyst, User Value Analyst, Mechanics Analyst, Positioning Analyst, Contrarian Analyst, Normalizer, Synthesizer, Product Expander, Judge, Scenario Expander, Moat Expander, Context Scout, User Value Scout, Creative Leap Scout, Mechanics Scout, Market Scout, Contrarian Scout, Feasibility Scout, Quality Bar Scout | 19 |
| **Deep Audit** | Component Auditor, Test Truth Auditor, Seam Auditor, Audit Synthesizer | 4 |
| **Swarm** | Swarm Coordinator, Swarm Backend Agent, Swarm Bridge Agent, Swarm Tests Agent, Swarm Infra Agent, Swarm Frontend Agent, Swarm Synthesizer | 7 |

## Core (2 roles)

### Orchestrator
Decomposes work into the smallest lawful chain. Routes packets to the right roles, verifies dependencies, and coordinates sequencing. Does not perform specialist work. Included automatically when a task is multi-step and cross-functional.

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

## Product (4 roles)

### Product Strategist
Shapes scope and protects product intent. Defines what the work is for, what is primary vs noise, and sets success criteria for downstream roles. Does not write implementation code.

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

## Brainstorm (19 roles)

The brainstorm family powers structured multi-perspective inquiry. The current pipeline runs the five Analysts through Normalizer, Synthesizer, Product Expander, and Judge (the [brainstorm pack](/role-os/handbook/team-packs/)'s chain); the Expanders are optional depth passes, and the Scouts are routable specialists for lighter exploratory tasks.

### Context Analyst
Answers "what is this, what is it next to, and what is it not?" via terminology genealogy, adjacency maps, and category boundary maps. Produces a ContextMap.

### User Value Analyst
Answers "where is the felt pull or pain?" via jobs-to-be-done, pain/relief mapping, and willingness/avoidance signals. Produces a UserValueMap.

### Mechanics Analyst
Answers "what has to be true for this to work?" via loop decomposition, dependency chains, and failure-mode analysis. Produces a MechanicsMap.

### Positioning Analyst
Answers "what claim could this own, and when is it legal to make it?" via substitute comparison, wedge identification, and claim timing analysis. Produces a PositioningMap.

### Contrarian Analyst
Attacks claim by claim: identifies overstated, premature, or structurally false claims and exposes contradictions. Produces a ChallengeSet. Does not generate ideas of its own.

### Normalizer
Translates role-native outputs into provenance-preserving atoms: dedups, clusters, detects conflicts, and calibrates evidence. Also runs the rebuttal pass after the Contrarian challenge.

### Synthesizer
Extracts themes and candidate directions from the normalized atom pool, preserving tensions and disagreement rather than flattening them into false consensus.

### Product Expander
Expands the chosen direction into a product shape: features, core loop, target user, and the smallest provable version.

### Judge
The brainstorm quality gate. Issues an accept/revise/reject disposition with targeted revision routing. The brainstorm counterpart of the Critic Reviewer.

### Scenario Expander *(optional)*
Grounds a concept in concrete user situations, edge cases, and failure modes.

### Moat Expander *(optional)*
Assesses defensibility: differentiation, stickiness, competitive moat, and phase planning.

### Context Scout
Maps the domain landscape: terminology, adjacent spaces, and prior art.

### User Value Scout
Maps user pain, desire, behavior, and unmet needs across segments.

### Creative Leap Scout
Proposes the bold bets: cross-domain analogies, unexpected combinations, and divergent directions.

### Mechanics Scout
Probes structural and operational feasibility — how the idea actually works.

### Market Scout
Surveys existing solutions, whitespace, and sameness traps in positioning.

### Contrarian Scout
Challenges scout findings: weak evidence, overgeneralization, and false novelty.

### Feasibility Scout
Assesses buildability, complexity, and the timeline to a provable result.

### Quality Bar Scout
Defines the excellence threshold the concept must clear — what "adequate" vs "excellent" means for this idea.

## Deep Audit (4 roles)

### Component Auditor
Audits a single bounded component: code quality, contract compliance, error handling, and architectural patterns. Receives one parcel from the audit manifest. Does not audit boundaries or test suites.

### Test Truth Auditor
Assesses whether tests for a component prove correctness or merely exist. Distinguishes real coverage from ceremonial tests. Does not write tests or fix code.

### Seam Auditor
Inspects integration boundaries between components: contract compatibility, data flow, error propagation, and coupling. Works from the dependency graph, not from individual modules.

### Audit Synthesizer
Consumes all component, test truth, and seam audit reports. Produces a ranked verdict (findings by severity) and an action plan (priority tiers with concrete next steps). Does not perform auditing.

## Swarm (7 roles)

### Swarm Coordinator
Orchestrates the multi-pass convergence protocol. Manages the swarm manifest, enforces stage gates, evaluates exit conditions (0 CRITICAL + 0 HIGH), runs build gates after every wave, and presents findings to the user at approval checkpoints. Does not audit or remediate code.

### Swarm Backend Agent
Exclusive ownership of core server logic files. Audits and remediates in the same wave — reads assigned files, identifies findings by severity, applies fixes, and verifies the build still passes. Only touches files within its manifest assignment.

### Swarm Bridge Agent
Exclusive ownership of secondary services, integrations, WebSocket bridges, middleware, and adapters. Same audit-and-remediate cycle as other domain agents. Skipped for repos with no bridge layer.

### Swarm Tests Agent
Exclusive ownership of the test suite: test files, fixtures, mocks, and conftest. Audits for gaps, ceremonial tests, and fixture quality. Reports coverage delta after remediations.

### Swarm Infra Agent
Exclusive ownership of CI workflows, configuration files, and documentation. Inspects GitHub Actions, Docker, ESLint/Prettier configs, README accuracy, and CHANGELOG freshness. Does not touch source code.

### Swarm Frontend Agent
Exclusive ownership of the UI layer: components, pages, styles, and public assets. Audits for bugs, accessibility issues, and UX improvements. Reports accessibility findings separately.

### Swarm Synthesizer
Produces the final verification report after all four stages complete. Summarizes stage results, tallies findings fixed vs remaining, runs the final test suite, and recommends ship, hold, or re-swarm.

## Role selection

Not every packet needs all 61 roles. The router and team packs select the smallest chain that covers the work. Common patterns:

- **Feature work:** Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer (5 roles)
- **Bugfix:** Repo Researcher, Backend Engineer, Test Engineer, Critic Reviewer (4 roles)
- **Treatment:** Repo Researcher, Security Reviewer, Coverage Auditor, Docs Architect, Metadata Curator, Release Engineer, Deployment Verifier, Critic Reviewer (8 roles)
- **Security review:** Security Reviewer, Dependency Auditor, Critic Reviewer (3 roles)
- **Docs work:** Support Triage Lead, Feedback Synthesizer, Docs Architect, Metadata Curator, Critic Reviewer (5 roles)
- **Research:** Product Strategist, UX Researcher, Competitive Analyst, Feedback Synthesizer, Critic Reviewer (5 roles)
- **Launch messaging:** Launch Strategist, Launch Copywriter, Critic Reviewer (3 roles)

Use `roleos packs list` to see all 10 team packs and their role compositions.

## How routing works

The router scores all 61 roles against packet content using weighted keywords and multi-word triggers. Each role declares keyword affinities (e.g., Backend Engineer matches "api", "database", "server") and strong triggers (e.g., "data migration", "schema change"). Roles also declare exclusion conditions (e.g., UI Designer excludes "cli only", "backend only").

The chain builder assembles phase-ordered chains from scored roles. Roles are assigned to phases (0 = orchestration, 1 = framing, 2 = design/spec, 3 = implementation, 4 = testing, 5 = metadata/release, 6 = deployment/launch, 99 = review). The Orchestrator and Critic Reviewer are always included when the chain is multi-step.

Conflict detection runs 4 passes before execution: hard conflicts (mutually exclusive roles), sequence violations (wrong phase ordering), redundancy (overlapping scope), and coverage gaps (missing critical roles for the task type).
