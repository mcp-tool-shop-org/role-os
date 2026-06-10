# Repo Map — role-os

> **Freshness:** last verified 2026-06-10 against role-os **v2.9.1**. Counts below are
> point-in-time; when in doubt, derive from source (`ls src/`, `ROLE_CATALOG` in
> `src/route.mjs`, `ls test/*.test.mjs`).

## Stack

- Runtime: Node.js >= 18.0.0 (ESM only)
- Dependencies: zero (intentional)
- Test framework: Node.js built-in `node --test`
- Site: Astro + Starlight (in site/ subdirectory, separate deps)

## Structure

```
bin/
  roleos.mjs                # CLI entry point — dispatch + structured error handling; version read from package.json
src/                        # ~42 modules + 3 subsystems
  entry.mjs / entry-cmd.mjs       # Unified entry: mission → pack → free routing (`roleos start`)
  run.mjs / run-cmd.mjs           # Persistent run engine + interventions (retry/reroute/escalate/block/reopen)
  mission.mjs / mission-run.mjs / mission-cmd.mjs   # 9 missions, mission runner, CLI
  audit-cmd.mjs                   # `roleos audit` — deep audit with manifest generation
  swarm-cmd.mjs                   # `roleos swarm` — dogfood swarm with domain detection
  swarm/                          # Domain detection, build gate, evidence persistence bridge
  route.mjs                       # ROLE_CATALOG (61 roles, 11 families) + full-catalog scoring + chain builder
  packs.mjs / packs-cmd.mjs       # TEAM_PACKS (10 calibrated packs) + auto-selection
  conflicts.mjs                   # 4-pass conflict detection
  escalation.mjs                  # Auto-routing for blocked/rejected/split
  evidence.mjs                    # Structured evidence + role-aware requirements
  dispatch.mjs                    # Runtime dispatch manifests for multi-claude
  tool-profiles.mjs               # Per-role tool sandboxing
  state-machine.mjs               # Canonical step/run transition maps
  artifacts.mjs / artifacts-cmd.mjs  # Per-role artifact contracts + pack handoffs
  decompose.mjs / composite.mjs / replan.mjs  # Composite tasks, dependency execution, replanning
  calibration.mjs                 # Outcome recording + weight tuning
  hooks.mjs                       # 5 lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, SubagentStart, Stop)
  session.mjs                     # `roleos init claude` scaffolding + doctor
  brainstorm.mjs / brainstorm-roles.mjs / brainstorm-render.mjs  # Two-layer brainstorm (truth + render)
  verify-citations.mjs / verify-citations-cmd.mjs / citation-panel.mjs  # Citation gate (prism, opt-in network)
  specialist/                     # Specialist tier: registry, gate, HTTP client, shadow probes, capability gate, budget/conformance consults
  knowledge/                      # Knowledge retrieval: overlay resolution, dispatch bundles, evidence analysis
  init.mjs / packet.mjs / review.mjs / status.mjs / prompts.mjs / fs-utils.mjs  # v1 spine commands
  dossier-block.mjs / role-dossiers.json  # Dossier → dispatch Operating Posture wiring
starter-pack/
  agents/                  # 39 role contracts across 8 pack directories
  context/                 # 4 context file templates
  schemas/                 # task-packet, handoff, review-verdict, specialist
  policy/                  # routing-rules, tool-permissions, escalation-rules, done-definition, specialist-tier
  workflows/               # ship-feature, fix-bug, launch-update, full-treatment
  examples/                # feature, integration, identity packet examples
  handbook.md              # Operational field manual
  README.md                # Starter-pack intro
dossier/                   # Role character sheets, portraits pipeline, gallery (dossier.html)
test/                      # 65 test files, 1435 tests (node --test)
site/                      # Astro/Starlight landing page + handbook docs
```

## Build commands

| Command | What it does |
|---------|-------------|
| `npm test` | `node --test test/*.test.mjs` |
| `npm run verify` | Tests + `roleos help` + echo pass marker |

## Primary seam: Bootstrap truth and contract drift

This is the highest-risk seam. The starter-pack IS the product. If it drifts from what the CLI expects, what the README describes, or what the routing/policy files govern, the tool scaffolds lies.

**Synchronized surfaces (must all agree):**

| Surface | What it defines | Location |
|---------|----------------|----------|
| Role catalog | 61 roles in 11 families (source of truth) | `src/route.mjs:ROLE_CATALOG` |
| Starter-pack agents | 39 shipped role contracts (name, mission, boundaries) | `starter-pack/agents/` (8 dirs) |
| README role table | Catalog families summing to 61 | `README.md` |
| Routing rules | When to use each shipped role | `starter-pack/policy/routing-rules.md` |
| Tool permissions | May/must-not for each shipped role | `starter-pack/policy/tool-permissions.md` |
| Team packs | 10 dispatch packs + chains | `src/packs.mjs:TEAM_PACKS` |
| Missions | 9 named missions + artifact flows | `src/mission.mjs:MISSIONS` |
| CLI packet types | 3 valid types | `src/packet.mjs:TYPES` |
| CLI verdict enum | 4 valid verdicts | `src/review.mjs:VERDICTS` |
| Handbook | Operational guide | `starter-pack/handbook.md` |

A change to any one surface without updating all others is a contract breach.

Note: the shipped starter-pack (39 contracts) and the runtime catalog (61) overlap but are
not identical — the brainstorm and swarm families are runtime-only roles driven by missions,
while the pack ships 4 contracts beyond the catalog (Red-Teamer, Caption Auditor, Monster
Taxonomy Verifier, Information Architect). When stating counts, name which surface you mean.

## Key files and their invariants

| File | Invariant |
|------|-----------|
| `src/init.mjs` | Copies starter-pack to `.claude/` via `copyDirSafe()`. Skips existing files (idempotent; `--force` refreshes canonical files). Does NOT customize, interpolate, or inject — pure copy. |
| `src/packet.mjs:TYPES` | Hardcoded: `["feature", "integration", "identity"]`. CLI rejects unknown types. |
| `src/route.mjs:ROLE_CATALOG` | Full catalog; every role scoreable by `roleos route`. |
| `src/review.mjs:VERDICTS` | Hardcoded: `["accept", "accept-with-notes", "reject", "blocked"]`. CLI rejects unknown verdicts. |
| `src/status.mjs` | Reads all state from filesystem. Checks 4 context files + spine files. No cache, no memory. |
| `src/fs-utils.mjs:copyDirSafe()` | Skips existing files. Never overwrites. Returns created/skipped counts. |
| `bin/roleos.mjs` | Version is read from `package.json` at runtime — never hardcode it. |

## Secondary seams

### 1. Packet parsing (regex-based)
Route, review, and status parse packet markdown via regex on `## ` headings. Sensitive to header format — a typo like `## Task id` (lowercase) silently breaks parsing.

### 2. Init idempotence with explicit update path
`roleos init` skips existing files; `roleos init --force` refreshes canonical files. Users on old scaffolds must run `--force` to pick up starter-pack updates.

### 3. Verdict overwrite without history
`roleos review` force-writes verdict files. Multiple reviewers overwrite each other. No locking, no merge, no history.

## Validation law

- `npm test` runs the full suite (1435 tests / 65 files at v2.9.1)
- `npm run verify` smoke-tests the CLI
- CI runs on Node 18 + 22 (matrix)
- All validation is terminal-based. No browser, no visual verification.
- Default-path commands make no network requests; opt-in network features are `roleos verify-citations` (prism), the specialist tier (`backend_url`), and the budget/conformance consults (env-gated).
