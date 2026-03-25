# Changelog

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
