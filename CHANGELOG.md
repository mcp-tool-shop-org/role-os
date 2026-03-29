# Changelog

## 2.3.0

### Added

#### Dogfood Swarm Mission — Multi-Pass Health + Feature Convergence

- **Dogfood swarm mission** — 9th mission in the library. Three-stage health pass (bug/security → proactive → humanization) then iterative feature pass with exclusive file ownership, build gates, and user checkpoints. Moves a repo from "works" to "production-ready." Proven on claude-collaborate (35→129 tests, 106 findings fixed, v1.1.0 shipped).
- **7 new roles** — Swarm Coordinator, Swarm Backend Agent, Swarm Bridge Agent, Swarm Tests Agent, Swarm Infra Agent, Swarm Frontend Agent, Swarm Synthesizer (61 total roles)
- **Swarm team pack** — 10th pack, 8 roles (7 swarm + Critic Reviewer), with mismatch guards and trial evidence
- **Two new mission primitives**:
  - `waveLoops` — iterative convergence with exit conditions, max iterations, build gates, and user approval flags
  - `exclusiveOwnership` — strict domain file boundaries enforced by manifest
- **Dynamic domain dispatch** — scales agent count based on repo structure via `swarm-manifest.json`
- **`roleos swarm` CLI** — first-class entry point with subcommands: `swarm`, `swarm manifest`, `swarm manifest --generate`, `swarm status`, `swarm findings`, `swarm approve`, `swarm verify`
- **Domain detection** (`src/swarm/domain-detect.mjs`) — auto-detects repo type (CLI, web, desktop, MCP, monorepo) and generates domain manifests with non-overlapping file ownership
- **Build gate** (`src/swarm/build-gate.mjs`) — auto-detects build system (Node, Rust, Python, Go) and runs lint → typecheck → test verification after every wave
- **Evidence persistence bridge** (`src/swarm/persist-bridge.mjs`) — optional connection back to dogfood-labs, converts wave results to dogfood submission + audit DB payloads
- **7 artifact contracts** — `swarm-gate`, `wave-report` (×5 with domain-specific sections), `swarm-final-report`
- **Pack handoff contract** for swarm flow

### Tests
- 97 new tests (swarm core, domain detection, build gate, persist bridge) — total: 1150

## 2.2.1

### Added
- **`roleos audit` CLI** — first-class entry point for deep audit with subcommands: `audit`, `audit manifest`, `audit manifest --generate`, `audit status`, `audit verify`
- **Shared state machine** (`src/state-machine.mjs`) — canonical step/run transitions shared by both runners
- **Shared tool profiles** (`src/tool-profiles.mjs`) — extracted from dispatch.mjs to break trial→dispatch coupling

### Fixed
- **P3-1:** Cycle detection in composite execution (`detectCycles` + visited-set guard in `findUnreachable`)
- **P3-2:** Dual-active guard in `startNext`/`startNextStep` prevents two steps active simultaneously
- **P3-3:** Atomic persistence — `saveRun` writes to temp file then renames
- **P4-1:** Dependency Auditor has own artifact contract (`dependency-audit`), pack handoff corrected
- **P4-2:** `partitionBrief` returns topic-only for unknown roles instead of full brief
- **P4-3:** Atom kind normalization layer bridges scout `.kind` and atom `.claim_kind`
- **P4-4:** `/dev/stdin` → `readFileSync(0)` for Windows compatibility in all 5 hooks
- **P4-5:** TOOL_PROFILES extracted to shared module, eliminating trial→dispatch coupling
- Node 18 compatibility fix for `import.meta.dirname` in deep-audit-proof test

### Tests
- 18 new tests (audit-cmd, audit-p5, deep-audit-proof) — total: 954

## 2.2.0

### Added

#### Deep Audit Mission — Runner-Native Componentized Repo Audit

- **Deep audit mission** — 8th mission in the library. Decomposes a repo into bounded components, dispatches one auditor per component, inspects seams from the dependency graph, assesses test truth, then synthesizes into a ranked verdict and action plan.
- **Dynamic dispatch** — missions with `dynamicDispatch` field now expand from a manifest at runtime. `createRun("deep-audit", task, { manifest })` creates N + M + K + 3 steps from the repo graph instead of a fixed static chain. A 6-component / 8-boundary repo produces 23 steps; a 10-component / 5-boundary repo produces 28.
- **4 new audit roles** — Component Auditor, Seam Auditor, Test Truth Auditor, Audit Synthesizer. Each with full artifact contracts, tool profiles, and role definitions in starter-pack.
- **Deep-audit pack** — 9th team pack with scaling chain order, dispatch defaults, and mismatch guards.
- **Artifact validation at execution boundaries** — `validateArtifact()` now runs on every step completion in both `run.mjs` and `mission-run.mjs`. Validation results are attached to the step object. Warn, don't block.
- **Proof run test suite** — `test/deep-audit-proof.test.mjs` proves the full runner-native lifecycle against the real audit-manifest.json: step creation, parcel identity, validation, escalation, partial failure, scaling formula, and report generation.

### Fixed

- **Critical: "approve" vs "accept" verdict mismatch** — `evidence.mjs:195` checked `!== "approve"` but the enum defines `"accept"`. Every accept verdict generated a spurious warning. Tests masked it via substring matching. Fixed to `"accept"` with hardened exact-assertion tests.
- **Dead imports removed** — `TEAM_PACKS` and `ROLE_ARTIFACT_CONTRACTS` in mission-run.mjs, `TEAM_PACKS` in run.mjs, `scoreRole` and `MIN_SCORE_THRESHOLD` in trial.mjs were imported but never used.
- **Warning message terminology** — all evidence warning messages now use "accept" instead of "approve" consistently.

### Changed

- Mission count: 7 → 8
- Role count: 50 → 54 (4 deep audit roles)
- Pack count: 8 → 9
- Artifact contract count: 30 → 34 (4 new audit role contracts)
- Test count: 905 → 936

### Evidence

- Self-audit dogfood: 128 findings (1 critical, 11 high, 39 medium) across 6 component parcels, 8 boundary seams, and 31 test files
- Runner-native proof run: 23 dynamic steps from real manifest, full lifecycle, all green
- Scaling formula verified: 2N + K + 3 holds for manifests of 3, 6, 10, and 15 components

## 2.1.0

### Added

#### Brainstorm Mission (v0.4) — Structured Inquiry with Traceable Disagreement

- **Brainstorm mission** — 7th mission in the library, 9-role chain with two-layer architecture
- **Layer 1 (truth):** 4 analyst roles emit role-native schemas (ContextMap, UserValueMap, MechanicsMap, PositioningMap), not shared prose. Blindspot enforcement: forbidden phrases, forbidden claim kinds, filtered input partitions per role. Provenance-preserving atoms carry source_role, claim_kind, allowed_challengers. Cross-examination permission matrix (directed graph). Rebut phase: original analysts defend, narrow, or retract under pressure.
- **Layer 2 (render):** 5 distinct voices — Boundary Memo (taxonomist), Field Notes (ethnographer), System Sketch (whiteboard), Claim Brief (strategist), Cross-Exam Transcript (litigator). Lexical bans prevent voice convergence. Debate transcript generator. Both layers always available.
- **Trace links:** Every rendered sentence maps to a truth-layer atom. Synthesis cites atoms, never prose.
- **Golden run proof:** Full artifact chain for MCP server marketplace topic — truth artifacts, dispute graph (4 challenges, 3 narrowed, 1 unresolved), rendered artifacts, trace map (16+ links). Published as `examples/golden-run.md`.
- **Result formatter:** `formatBrainstormResult()` produces saveable markdown with verdict, directions, dispute, tensions, rendered artifacts (opt-in), and evidence trail. Layer parameter controls truth-only vs both.
- **Artifact contracts:** 9 brainstorm role contracts (replacing 3 v0.1 scout contracts) with completion rules, required evidence, and consumer mapping.
- **Pack update:** Brainstorm pack updated from v0.1 scouts to v0.3/v0.4 analysts with correct chain order and required artifacts.

### Changed

- Mission count: 6 → 7
- Role count: 31 → 50 (brainstorm analysts, contrarian, plus existing)
- Artifact contract count: 20 → 30
- Test count: 617 → 905

## 2.0.1

### Added

- 4 version consistency tests (semver, >= 1.0.0, CHANGELOG, help output)

## 2.0.0

### Added

#### Operator Friction Pass (Phase U)
- `roleos run "<task>"` — one command from task description to active execution
- Persistent disk-backed runs in `.claude/runs/` — survives session interruptions
- Entry level auto-selection: mission, pack, or free routing with force overrides (`--mission=`, `--pack=`)
- Step-local operator guidance at every step: role, artifact, required sections, completion rule, stop conditions
- `roleos resume [id]` — continue interrupted runs from disk
- `roleos next` — start the next step or show what's active
- `roleos explain [id]` — full run state with guidance, escalations, interventions
- `roleos complete <artifact> [note]` — complete the active step with artifact reference
- `roleos fail <partial|failed> <reason>` — fail with honest downstream blocking
- `roleos run list` — list all runs with status icons
- `roleos run show <id>` — full run detail

#### Intervention Shortcuts
- `roleos retry <step>` — retry a failed/partial step, unblock downstream
- `roleos reroute <step> <role> <reason>` — swap a step to a different role
- `roleos escalate <from> <to> <trigger> <action>` — escalate between roles with step re-opening
- `roleos block <step> <reason>` — manually block a step
- `roleos reopen <step> <reason>` — reopen a completed step for re-execution

#### Friction Measurement
- `roleos report [id]` — generate completion report with honest-partial
- `roleos friction [id]` — measure operator touches: interventions, escalations, manual steps
- Friction score: low/medium/high based on touch count vs step count

### Evidence
- 613 tests, zero failures (86 new)
- 6 friction trials validated: clean run, reroute, retry, pack-level, free-routing, disk resume
- All entry levels produce low/medium friction scores
- Disk round-trip verified: create → pause → load → resume → complete

## 1.9.0

### Added

#### Unified Entry Path (Phase T)
- `roleos start <task>` — auto-decides mission vs pack vs free routing
- Three-level fallback ladder with confidence scores and alternatives
- Composite task detection warns when a task should be decomposed
- `--json` flag for machine-readable entry decisions
- 46 new tests: entry engine, comparison trials, CLI integration

#### Handbook Updates
- New Missions handbook page with full mission documentation
- Updated Getting Started to lead with `roleos start`
- Updated Reference with all CLI commands (start, mission, packs, artifacts, status, doctor)
- Updated handbook index with entry levels and 9 operating layers

#### README Overhaul
- "How it works" section leads with `roleos start` examples
- Quick Start updated with mission and start commands
- Added 6 Missions table
- Updated project structure with all 18 source modules
- Updated status history through v1.9.0

### Evidence
- 527 tests, zero failures (46 new)
- Entry path trials validated against 20+ real task descriptions
- Fallback ladder tested: mission, pack, free-routing, composite, empty input

## 1.8.0

### Added

#### Mission Library (Phase S — Mission Hardening)
- 6 named, repeatable mission types: feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch
- Each mission declares: pack, role chain, artifact flow, escalation branches, honest-partial definition, stop conditions, dispatch defaults, trial evidence
- Mission runner: create → step through → complete/fail → generate completion report
- Completion proof reporter with honest-partial and formatted text output
- `roleos mission list` — list all missions
- `roleos mission show <key>` — full mission detail
- `roleos mission suggest <text>` — signal-based mission suggestion
- `roleos mission validate [key]` — validate mission wiring against packs/roles

#### Mission Runner Engine
- `createRun()` — instantiate a mission with tracked steps
- `startNextStep()` / `completeStep()` / `failStep()` — step lifecycle
- `recordEscalation()` — re-opens completed steps on escalation loops
- `getRunPosition()` / `getArtifactChain()` — run introspection
- `generateCompletionReport()` / `formatCompletionReport()` — honest outcome reporting

### Evidence
- 465 tests, zero failures (67 new)
- All 6 missions validate against live pack/role catalog
- Full lifecycle tests: end-to-end runs, escalation loops, partial completions, failure reporting

## 1.7.0

### Added

#### Completion Proof (Phase R)
- `roleos artifacts` CLI command: list, show, validate, chain subcommands
- 13 new CLI integration tests for artifact inspection
- Real task completion missions through the full stack

#### Completion Proof Evidence
- R1-1 Feature mission: `roleos artifacts` command shipped through feature pack
  - Pack: feature (high confidence, correct)
  - Chain: 5 roles, 0 escalations, 1 minor correction
  - Artifact contracts: all 4 used and valid
- R1-2 Bugfix mission: README.zh.md npm anomaly
  - Diagnosed correctly: npm auto-includes README* regardless of files field
  - Escalated honestly: fix requires structural decision (translation file organization)
  - Not force-closed: deferred to treatment pass

### Evidence
- 398 tests, zero failures
- 3 missions run through the full stack
- Completion metrics recorded per mission

## 1.6.0

### Added

#### Artifact Spine (Phase Q)
- 20 per-role artifact contracts: each defines artifact type, required sections, evidence references, downstream consumers, and completion rules
- `validateArtifact(role, content)` — structural validation against role contracts (missing sections, evidence references, content depth)
- 7 pack-level handoff contracts: define the expected artifact flow between steps for each pack (e.g., strategy-brief → implementation-spec → change-plan → test-package → verdict)
- `validatePackChain(pack, artifacts)` — validates an entire pack's artifact chain for completeness
- `getArtifactContract(role)` / `getHandoffContract(pack)` — lookup APIs
- `formatArtifactValidation()` / `formatPackChain()` — display formatters

#### Artifact contract coverage
- Product Strategist → strategy-brief (problem-framing, scope, non-goals, tradeoffs)
- Spec Writer → implementation-spec (acceptance-criteria, edge-cases, interface-spec)
- Backend/Frontend Engineer → change-plan (files-to-change, implementation-approach, risk-notes)
- Test Engineer → test-package (test-plan, test-cases, false-confidence-assessment)
- Security Reviewer → security-findings (findings, severity-assessment, recommendations)
- Critic Reviewer → verdict (verdict, evidence, required-corrections)
- And 14 more roles with full contracts

### Evidence
- 385 tests, zero failures
- 27 new artifact tests

## 1.5.0

### Added

#### Hook Spine / Runtime Enforcement (Phase R)
- 5 lifecycle hooks: SessionStart, UserPromptSubmit, PreToolUse, SubagentStart, Stop
- `scaffoldHooks()` generates all 5 hook scripts in .claude/hooks/
- `roleos init claude` now scaffolds hooks + settings.local.json with hook config
- `roleos doctor` now checks for hook scripts (check 7) and settings hooks (check 8)

#### SessionStart hook
- Establishes session contract on every new session
- Records session ID, timestamp, initializes state tracking
- Adds context reminding Claude to use /roleos-route for non-trivial tasks

#### UserPromptSubmit hook
- Classifies prompts as substantial (>50 chars + action verbs)
- After 2+ substantial prompts without a route card, adds context reminder
- Does not block — advisory enforcement

#### PreToolUse hook
- Records all tool usage in session state
- Flags write tools (Bash, Write, Edit) used without route card after substantial work
- Advisory, not blocking — preserves operator control

#### SubagentStart hook
- Injects active role contract into delegated agents
- Ensures subagents inherit the Role OS session context

#### Stop hook
- Warns when substantial sessions end without route card or outcome artifact
- Advisory — does not block session exit
- Trivial sessions (< 2 substantial prompts) are exempt

### Evidence
- 358 tests, zero failures
- 23 new hook tests covering all 5 lifecycle hooks

## 1.4.0

### Added

#### Session Spine (Phase Q)
- `roleos init claude` — scaffolds Claude Code integration: CLAUDE.md instructions, /roleos-route + /roleos-review + /roleos-status slash commands
- `roleos doctor` — verifies repo is correctly wired for Role OS sessions (6 checks: .claude/ dir, CLAUDE.md section, /roleos-route command, context files, role contracts, packets)
- Route card generation — session header artifact proving Role OS was engaged (task type, pack, confidence, composite status, success artifact)
- CLAUDE.md template instructs Claude to route through Role OS before non-trivial work
- /roleos-route command produces structured route cards
- /roleos-review command guides structured verdict production
- /roleos-status command shows active work and context health
- Appends to existing CLAUDE.md without overwriting (detects Role OS section)
- --force flag overwrites existing command files

### Evidence
- 335 tests, zero failures

## 1.3.0

### Added

#### Outcome Calibration (Phase M)
- Run outcome ledger — append-only JSONL recording pack selection, confidence, overrides, escalations, corrections, completion status
- `computeCalibration()` — pack usage rates, high-confidence accuracy, operator override rates, per-pack performance
- `computePackBoosts()` — weight tuning from clean completed runs (+0.5/run, capped at 2.0)
- `computeConfidenceAdjustment()` — raises threshold when high-confidence is often overridden, lowers when medium is often accepted
- Auto-generated calibration suggestions when metrics drift
- Safety constraint: calibration never overrides mismatch guards, conflict rules, escalation honesty, or evidence requirements

#### Mixed-Task Decomposition (Phase N)
- `detectComposite()` — 7 subtask categories (build, bugfix, security, docs, research, launch, treatment) with signal-based detection
- Structural connector detection ("and then", "after that", "plus", "also")
- Confidence levels: high (3+ categories or 2+ with connectors), medium, low
- `decompose()` — generates linked child packets sorted by phase order
- `createRunPlan()` — dependency-aware parent plan with child tracking
- Honest fallback: medium/low confidence shows uncertainty warning with `--no-split` override

#### Composite Execution (Phase O)
- `initExecution()` / `advance()` — dependency-driven child execution with artifact passing
- 7 artifact contracts defining what each category produces and expects
- Artifact ledger tracking all cross-packet handoffs
- `blockChild()` / `recoverChild()` / `failChild()` — branch recovery with transitive cascade
- `invalidateDownstream()` — resets stale children when upstream changes, removes stale artifacts
- `synthesize()` — truthful parent-level completion report
- Independent branches continue unaffected when a sibling fails

#### Adaptive Replanning (Phase P)
- 6 structured change event types: scope-change, artifact-changed, new-requirement, review-finding, dependency-discovered, priority-change
- `analyzeImpact()` — identifies valid/stale children, stale artifacts, whether new children or reorder needed
- `replan()` — selective replanning: invalidates only affected branches, inserts new children, updates dependencies
- Plan diff: shows what changed, what stayed valid, what reopened, what was inserted
- Execution resumes from next valid child after replan — no restart required

### Evidence
- 317 tests, zero failures
- Calibration, decomposition, composite execution, and replanning each have dedicated test suites

## 1.2.0

### Added
- Pack auto-selection in `roleos route` — suggests best pack when confidence is high
- `roleos route --pack=<name>` — use a specific pack for routing
- Pack mismatch detection — warns when a pack doesn't fit the task, suggests the correct alternative
- Pack fallback — mismatched or unknown packs fall back to free routing automatically
- `checkPackMismatch()` API with 7 guard sets covering all pack×task-type combinations
- `getPackRoles()` API with conditional Orchestrator support

### Changed
- Docs pack: Support Triage Lead now opens (was Feedback Synthesizer). Feedback Synthesizer is second. Release Engineer + Deployment Verifier moved to optional (overhead for docs-only tasks).
- Pack calibration applied from comparison evidence: conditional Orchestrator, Security Reviewer in Treatment, Product Strategist opens Research, mismatch guards on all 7 packs.

### Evidence
- Pack comparison: calibrated packs now win or tie 6/7 (was 2/7 pre-calibration)
- Misfit honesty: 0 full bluffs, 0 undetected partial bluffs (was 1 + 3)
- 230 tests, zero failures

## 1.1.0

### Added

#### Routing
- Full 31-role catalog — all roles scored by keyword, trigger phrase, packet type bias, and deliverable affinity
- Dynamic chain builder — phase-ordered assembly replacing static templates
- Routing confidence assessment (high/medium/low)
- `excludeWhen` enforcement — roles suppressed when exclusion patterns match packet content
- `detectType` false-positive prevention — "integration testing" no longer triggers integration type
- `--verbose` flag for `roleos route` — hides scoring noise by default

#### Conflict Detection
- 4-pass conflict engine: hard conflicts, sequence, redundancy, coverage gaps
- Per-role constraint registry: lateOnly, requiresBeforePacks
- Overlap pair detection
- Repair suggestions on every finding

#### Escalation Auto-Routing
- Blocked/rejected/conflict/split work auto-routes to named resolver
- Every escalation includes: target role, recovery type, required artifact, handoff context

#### Structured Evidence
- 12 evidence kinds, 4 statuses, closed 4-verdict enum (accept/accept-with-notes/reject/blocked)
- Role-aware evidence requirements for 15 roles
- Sufficiency checks with contradiction detection

#### Runtime Dispatch
- Execution manifests for multi-claude with per-role tool profiles and budgets
- 8 execution states with auto-advance
- Escalation packet generation for blocked/rejected steps

#### Proven Team Packs
- 7 battle-tested packs: feature, bugfix, security, docs, launch, research, treatment
- `roleos packs list` — show all packs with role counts
- `roleos packs suggest <packet>` — suggest best pack for a packet
- `roleos packs show <name>` — show pack details (roles, artifacts, stop conditions)
- Pack suggestion engine with confidence levels

#### Trials
- Full roster proven: 30/30 gold-task trials + 5/5 negative (wrong-task honesty) trials
- 7 pack execution trials — all packs ran full chains with honest Critic verdicts
- Trial framework: buildClusterTrials, evaluateTrialOutput, formatTrialReport

### Changed
- 32 → 31 roles: Information Architect merged into Docs Architect
- Verdict vocabulary unified: evidence.mjs now uses accept/reject/blocked (matching review.mjs)
- "worker" terminology replaced with "role" in dispatch.mjs

### Fixed
- `excludeWhen` was declared on 14 roles but never enforced — now active in scoreRole
- `detectType` false-positived on "integration testing" — now uses word-boundary regex
- "Not triggered: N roles" noise hidden by default (shown with --verbose)
- Handbook: Team Packs page added, reference sidebar reordered

## 1.0.2

### Fixed
- Fix double-nested `.claude/.claude/` directory created by `roleos init` — `starter-pack/.claude/workflows/full-treatment.md` moved to `starter-pack/workflows/`
- Read VERSION from `package.json` at runtime instead of hardcoded constant — prevents version drift between CLI and package metadata

### Added
- `roleos init --force` — update canonical scaffolded files while always protecting user-filled `context/` files
- 4 regression tests: no double-nesting, correct workflow placement, version sync, --force context protection

## 1.0.0

### Added
- `roleos init` — scaffold Role OS starter pack into `.claude/`
- `roleos packet new <type>` — create feature, integration, or identity packets
- `roleos route <packet-file>` — recommend smallest valid role chain with dependency verification
- `roleos review <packet-file> <verdict>` — record accept/reject/blocked verdicts
- Full starter pack: 8 role contracts, 3 schemas, 4 policies, 3 workflows
- Guided context templates with inline prompts
- 3 canonical example packets (feature, integration, identity)
- Adoption handbook
