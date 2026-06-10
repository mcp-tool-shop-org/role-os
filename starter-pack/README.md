# Role OS Starter Pack

A repo-native operating layer that routes work through role contracts, structured handoffs, review, and escalation — preventing drift, false completion, and cross-project contamination.

## What's in the pack

```
starter-pack/
  handbook.md              ← Start here. How Role OS works.
  context/                 ← Fill these for your repo.
    product-brief.md         Product truth
    repo-map.md              Technical truth
    current-priorities.md    What's happening now
    brand-rules.md           Identity law
  examples/                ← Learn from real trials.
    feature-packet.md        Building a new capability
    integration-packet.md    Wiring systems together
    identity-packet.md       Repairing inherited drift
  agents/                  ← 39 role contracts across 8 packs. The spine.
    core/                    (3)  orchestrator, product-strategist, critic-reviewer
    product/                 (4)  spec-writer, roadmap-prioritizer, feedback-synthesizer,
                                  information-architect
    engineering/             (14) frontend-developer, backend-engineer, test-engineer,
                                  refactor-engineer, performance-engineer, security-reviewer,
                                  dependency-auditor, component-auditor, seam-auditor,
                                  test-truth-auditor, audit-synthesizer, red-teamer,
                                  caption-auditor, monster-taxonomy-verifier
    design/                  (2)  ui-designer, brand-guardian
    marketing/               (1)  launch-copywriter
    growth/                  (4)  launch-strategist, content-strategist, community-manager,
                                  support-triage-lead
    research/                (4)  ux-researcher, competitive-analyst, trend-researcher,
                                  user-interview-synthesizer
    treatment/               (7)  repo-researcher, repo-translator, docs-architect,
                                  metadata-curator, coverage-auditor, deployment-verifier,
                                  release-engineer
  schemas/                 ← Packet and handoff formats.
    task-packet.md           What work needs doing
    handoff.md               What one role passes to the next
    review-verdict.md        Accept, reject, or block
    specialist.md            Specialist registry, gate, and consult record formats
  policy/                  ← System law.
    routing-rules.md         Which role handles what
    tool-permissions.md      What each role may and must not do
    escalation-rules.md      When to escalate instead of guess
    done-definition.md       What "done" actually means
    specialist-tier.md       Law for model-backed specialist roles (registry, gate, probes)
  workflows/               ← Predefined role sequences.
    ship-feature.md          Feature from shaping to review
    fix-bug.md               Bug from report to regression defense
    launch-update.md         Copy from shipped truth to messaging
    full-treatment.md        Repo polish + publish, integrated with shipcheck
```

## Quick start

1. Copy this pack into your repo's `.claude/` directory
2. Read `handbook.md` (a five-minute read)
3. Fill the four `context/` files for your project
4. Create your first packet using `schemas/task-packet.md`
5. Route it through the smallest chain that covers the work
6. Review and record the verdict

## Evidence

Role OS was proven across three trial shapes:

- **Feature work** (Crew Screen) — prevented contamination, inline invention, and hidden blockers across a 7-role chain
- **Integration work** (CampaignState wiring) — resolved an architectural seam without fallback lies or hybrid-state ambiguity
- **Identity work** (contamination purge) — repaired inherited fiction drift without collapsing into broad redesign

Portability was proven by adopting the same spine in a structurally different repo (MCP server vs Python game) with context changes only — no core contract modifications.

## Core properties

These are the properties Role OS protects. If a change would weaken any of them, reject it.

- **Role boundaries hold** — roles do not collapse into each other
- **Review has teeth** — the critic rejects work that is vague, contaminated, or incomplete
- **Escalation stays honest** — roles surface gaps instead of hiding them
- **Packets stay testable** — done definitions are concrete, not aspirational
- **Portability requires context, not surgery** — new repos adapt context files, not the spine
