# Brainstorm Mission — v0.1 Spec

## Status: LOCKED — ready to build

---

## 1. Product Intent

A Role-OS mission that performs **multi-perspective search + controlled compression + deliberate recombination** on any topic. Not "find ideas." Not "parallel notes." A lawful thinking pipeline that produces traceable, structured, actionable output.

---

## 2. Mission Identity

```
key:         brainstorm
name:        Brainstorm (Structured Inquiry)
pack:        brainstorm
roleCount:   v0.1 = 6, full = 10
```

---

## 3. BrainstormRequest (Mission Input)

The Frame phase resolves this from the raw task description.

```typescript
type BrainstormRequest = {
  topic: string                    // what is being explored
  objective: string                // what we want to learn or decide
  audience?: string                // who this is for
  constraints?: string[]           // hard boundaries
  search_axes?: string[]           // user-specified dimensions (optional override)
  output_mode: 'idea_set' | 'strategy' | 'concepts' | 'opportunity_map'
  breadth: number                  // how many directions advance through Synthesize (default: 3)
  depth: number                    // expansion passes per advancing direction (default: 1)
  novelty_bias: 'low' | 'medium' | 'high'
  evidence_mode: 'strict' | 'mixed' | 'speculative'
}
```

### Parameter semantics (deterministic, not vibes)

| Param | Controls | Runtime effect |
|-------|----------|----------------|
| `breadth` | Directions advancing through Synthesize | Synthesizer MUST select exactly `breadth` directions. No more, no fewer. |
| `depth` | Expansion passes per direction | Each advancing direction receives exactly `depth` expander packets. depth=1 → Product Expander only. depth=2 → Product + Scenario. depth=3 → Product + Scenario + Moat. |
| `evidence_mode` | Claim constraints | See Section 6 for the confidence/grade constraint matrix. |
| `novelty_bias` | Scout prompt framing | low = prioritize proven patterns. medium = balanced. high = prioritize unexpected combinations and bold bets. |

---

## 4. Evidence Mode Constraint Matrix

Evidence mode constrains which `(evidence_grade, confidence)` pairs are legal.

```
                    grounded    mixed       speculative
strict:
  high              YES         NO          NO
  medium            YES         NO          NO
  low               YES         NO          NO

mixed:
  high              YES         NO          NO
  medium            YES         YES         NO
  low               YES         YES         YES

speculative:
  high              YES         NO          NO
  medium            YES         YES         YES
  low               YES         YES         YES
```

**Rule:** `confidence: high` is ONLY legal for `evidence_grade: grounded`, regardless of mode.
**Rule:** `strict` mode forbids all non-grounded claims.
**Rule:** `speculative` mode allows speculative claims but caps them at `medium` confidence.

Enforcement point: Normalize phase. Violations are flagged in `unsupported_high_confidence_flags`.

---

## 5. Pipeline Phases

```
Frame → Scout (parallel) → Normalize → Synthesize → Expand → Judge → Return
                                            ↑                    |
                                            └── revise_synthesize ┘
                                                      ↑          |
                                        Expand ←──── revise_expand ┘
```

### Phase A: Frame

**Role:** Planner (inline, not a pack role — runs as mission setup)

**Input:** Raw task description
**Output:** Resolved `BrainstormRequest`

**Responsibilities:**
- Parse objective vs topic (reject if objective is missing or vague)
- Set defaults for omitted fields
- Select scout roster based on topic signals
- Validate evidence_mode / breadth / depth are coherent
- Produce the execution plan: which scouts, which expanders, how many passes

**Artifact:** `brainstorm-frame`
**Required sections:** `request`, `scout-roster`, `execution-plan`

---

### Phase B: Scout (parallel)

**Roles:** 3 in v0.1, up to 8 at full

Each scout runs independently. No scout reads another scout's output.

#### v0.1 Scout Roster

| Scout | Lens | What it looks for |
|-------|------|-------------------|
| Context Scout | Landscape | Terminology, adjacent spaces, prior art, domain structure |
| User Value Scout | Human need | Pains, desires, behaviors, unmet needs, user segments |
| Creative Leap Scout | Novel directions | Unexpected combinations, cross-domain analogies, bold bets |

#### Full Roster (v1.0+)

| Scout | Lens |
|-------|------|
| Context Scout | Landscape, terminology, structure |
| User Value Scout | Human need, pains, desires |
| Creative Leap Scout | Novel combinations, bold bets |
| Mechanics Scout | Structural/operational feasibility |
| Market Scout | Existing solutions, whitespace, sameness traps |
| Contrarian Scout | Challenge-only (see Section 7) |
| Feasibility Scout | What can be proven now vs later |
| Quality Bar Scout | What would make this excellent vs adequate |

#### ScoutFinding Schema (artifact type: `scout-finding`)

```typescript
type ScoutFinding = {
  id: string                       // e.g., "sf-context-001"
  role: string                     // scout role name
  axis: string                     // what dimension this covers
  statements: Array<{
    id: string                     // e.g., "sf-context-001-s1"
    text: string                   // the claim or observation
    kind: 'claim' | 'opportunity' | 'risk' | 'tension' | 'unknown'
    evidence_grade: 'grounded' | 'mixed' | 'speculative'
    confidence: 'high' | 'medium' | 'low'
    evidence_refs?: string[]       // citations, links, references
    challenges?: string[]          // known weaknesses of this statement
  }>
}
```

**Artifact contract per scout:**
- Required sections: `axis`, `statements` (min 3, max 12)
- Each statement must have `kind`, `evidence_grade`, `confidence`
- Completion rule: All statements satisfy evidence mode constraints

---

### Phase C: Normalize

**Role:** Normalizer (dedicated role, not a scout)

**Input:** All `scout-finding` artifacts
**Output:** `normalized-finding-set`

**Responsibilities:**
1. **Deduplicate** — collapse semantically overlapping statements across scouts
2. **Count support** — how many scouts independently support each claim
3. **Detect conflicts** — identify direct contradictions between scouts
4. **Validate confidence** — flag any `(evidence_grade, confidence)` pairs that violate the evidence mode matrix
5. **Build finding atoms** — produce synthesis-ready units

#### NormalizedFindingSet Schema (artifact type: `normalized-finding-set`)

```typescript
type FindingAtom = {
  id: string                       // e.g., "fa-001"
  statement: string                // canonical phrasing
  kind: 'claim' | 'opportunity' | 'risk' | 'tension' | 'unknown'
  source_roles: string[]           // which scouts contributed
  source_statement_ids: string[]   // trace to original statements
  support_count: number            // how many scouts support this
  challenge_count: number          // how many scouts challenge this
  evidence_grade: 'grounded' | 'mixed' | 'speculative'
  confidence: 'high' | 'medium' | 'low'
}

type FindingConflict = {
  id: string
  finding_a_id: string
  finding_b_id: string
  reason: string
  severity: 'hard' | 'soft'       // hard = direct contradiction, soft = tension
}

type NormalizedFindingSet = {
  atoms: FindingAtom[]
  conflicts: FindingConflict[]
  duplicates_collapsed: number
  unsupported_high_confidence_flags: string[]  // violations of evidence mode
  stats: {
    total_source_statements: number
    total_atoms: number
    grounded_count: number
    mixed_count: number
    speculative_count: number
  }
}
```

**Artifact contract:**
- Required sections: `atoms`, `conflicts`, `stats`
- Completion rule: All atoms satisfy evidence mode. All source statements traced.

---

### Phase D: Synthesize

**Role:** Synthesizer (dedicated role)

**Input:** `normalized-finding-set`
**Output:** `synthesis-report`

**Responsibilities:**
1. Identify major themes from finding atoms
2. Preserve real tensions (do NOT manufacture false consensus)
3. Select exactly `breadth` advancing directions
4. Explain why archived directions were cut
5. Each advancing direction must cite supporting finding atom IDs

#### SynthesisReport Schema (artifact type: `synthesis-report`)

```typescript
type SynthesisReport = {
  topic_model: string              // one-paragraph understanding of the space
  major_themes: string[]           // 3-7 themes found
  tensions: Array<{
    tension: string
    why_it_matters: string
    finding_conflict_ids: string[] // trace to NormalizedFindingSet conflicts
  }>
  advancing_directions: Array<{
    id: string                     // e.g., "dir-001"
    name: string                   // short label
    thesis: string                 // one-sentence statement
    why_it_matters: string         // value proposition
    supporting_atoms: string[]     // finding atom IDs
    risks: string[]
    open_questions: string[]
  }>
  archived_directions: Array<{
    name: string
    reason: string                 // why it was cut
  }>
}
```

**Laws:**
- `advancing_directions.length === breadth` (exact match, enforced)
- Each direction must cite >= 2 supporting atoms
- Archived directions must have explicit reasons
- Tensions from conflicts MUST be preserved, not smoothed over

**Artifact contract:**
- Required sections: `topic-model`, `major-themes`, `advancing-directions`, `archived-directions`
- Completion rule: Exactly `breadth` directions. All directions cite atoms.

---

### Phase E: Expand

**Roles:** Expanders (1-3 depending on `depth`)

| depth | Expanders activated |
|-------|-------------------|
| 1 | Product Expander |
| 2 | Product Expander + Scenario Expander |
| 3 | Product Expander + Scenario Expander + Moat Expander |

Each expander runs on ALL advancing directions. So total expansion packets = `breadth * depth`.

#### Expander Role Contracts

**Product Expander** — turns direction into concrete shape
- Required output: features, core loop, target user, smallest proof version
- Artifact type: `product-expansion`

**Scenario Expander** (depth >= 2) — shows direction in context
- Required output: 2-3 concrete user scenarios, edge cases, failure modes
- Artifact type: `scenario-expansion`

**Moat Expander** (depth >= 3) — explores defensibility
- Required output: differentiation, stickiness, competitive response, phase plan
- Artifact type: `moat-expansion`

#### ExpandedConcept Schema (artifact type: `expanded-concept`)

Each advancing direction accumulates expansions into one concept:

```typescript
type ExpandedConcept = {
  direction_id: string             // from synthesis-report
  direction_name: string
  thesis: string
  product_shape?: {                // from Product Expander
    target_user: string
    core_mechanism: string
    features: string[]
    core_loop: string
    smallest_proof: string
    key_risks: string[]
  }
  scenarios?: Array<{              // from Scenario Expander
    situation: string
    user_action: string
    outcome: string
    edge_case?: string
  }>
  moat?: {                         // from Moat Expander
    differentiation: string
    stickiness: string
    competitive_response: string
    phase_plan: string[]
  }
}
```

---

### Phase F: Judge

**Role:** Judge (dedicated role)

**Input:** `expanded-concept[]` + `synthesis-report` + `brainstorm-frame`
**Output:** `judge-report`

**This is a GATE, not a commentator.**

#### JudgeReport Schema (artifact type: `judge-report`)

```typescript
type JudgeDisposition =
  | 'accept'
  | 'revise_expand'
  | 'revise_synthesize'
  | 'reject'

type JudgeReport = {
  disposition: JudgeDisposition
  overall_quality: 'ready_to_advance' | 'needs_incubation' | 'not_active_now'
  per_direction: Array<{
    direction_id: string
    verdict: 'ready_to_advance' | 'needs_incubation' | 'not_active_now'
    reasons: string[]
    failing_criteria?: Array<
      | 'weak_differentiation'
      | 'low_evidence_support'
      | 'generic_expansion'
      | 'contradiction_unresolved'
      | 'poor_objective_alignment'
      | 'infeasible'
    >
  }>
  revision_targets?: string[]      // direction IDs that need rework
  revision_guidance?: string       // what specifically to fix
  reasons: string[]
}
```

**Disposition routing:**

| Disposition | Action |
|-------------|--------|
| `accept` | Proceed to Return |
| `revise_expand` | Send `revision_targets` back to Expand with `revision_guidance`. Expand re-runs on targeted directions only. Then Judge re-evaluates. Max 2 loops. |
| `revise_synthesize` | Send back to Synthesize with guidance to reselect directions. Then Expand + Judge run again. Max 1 loop. |
| `reject` | Mission terminates with honest partial: "Brainstorm could not produce viable directions under current constraints. Consider: adjusting constraints, broadening scope, or changing evidence mode." |

**Loop budget:** Max 2 expand revisions + 1 synthesize revision = 3 total loops before forced accept-or-reject.

---

### Phase G: Return

**Role:** Assembler (inline, not a pack role)

**Input:** All artifacts from the pipeline
**Output:** `brainstorm-result`

#### BrainstormResult Schema (artifact type: `brainstorm-result`)

```typescript
type BrainstormResult = {
  // Executive summary
  core_read: string                // one-paragraph statement of what was learned

  // Structured output
  opportunity_map: Array<{
    direction_id: string
    name: string
    thesis: string
    why_it_matters: string
    expanded_concept: ExpandedConcept
    judge_verdict: 'ready_to_advance' | 'needs_incubation'
    supporting_evidence_count: number
  }>

  // Tensions and open questions
  unresolved_tensions: Array<{
    tension: string
    why_it_matters: string
  }>
  open_questions: string[]

  // Trace
  evidence_trail: {
    scouts_run: string[]
    total_findings: number
    atoms_after_normalize: number
    directions_considered: number
    directions_advancing: number
    expansion_passes: number
    judge_loops: number
    judge_disposition: JudgeDisposition
  }

  // Metadata
  request: BrainstormRequest
  pipeline_duration_steps: number
}
```

---

## 6. Role Chain & Artifact Flow

### v0.1 Chain (serial representation for mission.mjs)

```
Framer
  → Context Scout (parallel group start)
  → User Value Scout (parallel with above)
  → Creative Leap Scout (parallel with above)
  → Normalizer (parallel group end — depends on all scouts)
  → Synthesizer
  → Product Expander
  → Judge
  → Assembler
```

### artifactFlow

```javascript
[
  { role: "Framer",             produces: "brainstorm-frame",        consumedBy: ["Context Scout", "User Value Scout", "Creative Leap Scout"] },
  { role: "Context Scout",      produces: "scout-finding",           consumedBy: "Normalizer" },
  { role: "User Value Scout",   produces: "scout-finding",           consumedBy: "Normalizer" },
  { role: "Creative Leap Scout",produces: "scout-finding",           consumedBy: "Normalizer" },
  { role: "Normalizer",         produces: "normalized-finding-set",  consumedBy: "Synthesizer" },
  { role: "Synthesizer",        produces: "synthesis-report",        consumedBy: "Product Expander" },
  { role: "Product Expander",   produces: "expanded-concept",        consumedBy: "Judge" },
  { role: "Judge",              produces: "judge-report",            consumedBy: "Assembler" },
  { role: "Assembler",          produces: "brainstorm-result",       consumedBy: null }
]
```

### Parallel execution note

Existing `composite.mjs` supports dependency-driven execution. Scouts declare `dependsOn: ["Framer"]` and can run in parallel. Normalizer declares `dependsOn: ["Context Scout", "User Value Scout", "Creative Leap Scout"]` — it waits for all three.

### Feedback loop note

Judge's `revise_expand` / `revise_synthesize` dispositions require **escalation branches**, which the mission system already supports. Map them as:

```javascript
escalationBranches: [
  { trigger: "judge_revise_expand",     from: "Judge", to: "Product Expander", action: "re-expand targeted directions with revision guidance" },
  { trigger: "judge_revise_synthesize", from: "Judge", to: "Synthesizer",      action: "reselect directions with judge feedback, then re-expand and re-judge" }
]
```

---

## 7. Contrarian Scout Contract (v1.0, not v0.1)

The Contrarian Scout does NOT generate standalone opinions. It ONLY challenges existing findings.

**Execution order:** Runs AFTER other scouts, consumes their `scout-finding` artifacts.

```typescript
type ContrarianChallenge = {
  id: string
  target_statement_id: string      // which scout statement is being challenged
  challenge_type:
    | 'overgeneralization'
    | 'weak_evidence'
    | 'market_assumption'
    | 'user_misalignment'
    | 'execution_risk'
    | 'false_novelty'
  argument: string                 // the specific counter-argument
  replacement_or_constraint?: string
  evidence_grade: 'grounded' | 'mixed' | 'speculative'
  confidence: 'high' | 'medium' | 'low'
}
```

**Laws:**
- Every challenge MUST cite a specific `target_statement_id`
- No freeform "what if we're wrong" — must name what it's challenging and why
- Challenges feed into Normalize as additional input (increase `challenge_count` on targeted atoms)

---

## 8. Pack Definition

```javascript
// For packs.mjs
{
  key: 'brainstorm',
  name: 'Brainstorm (Structured Inquiry)',
  description: 'Multi-perspective search, controlled synthesis, and deliberate expansion on any topic.',
  roles: [
    // v0.1
    'Context Scout',
    'User Value Scout',
    'Creative Leap Scout',
    'Normalizer',
    'Synthesizer',
    'Product Expander',
    'Judge',
    // v1.0+ additions:
    // 'Mechanics Scout',
    // 'Market Scout',
    // 'Contrarian Scout',
    // 'Feasibility Scout',
    // 'Quality Bar Scout',
    // 'Scenario Expander',
    // 'Moat Expander',
  ],
  orchestratorRequired: false,
  signals: [
    'brainstorm', 'explore', 'ideate', 'investigate directions',
    'opportunity', 'what could', 'possibilities', 'creative',
    'divergent', 'think about', 'strategy options', 'concept exploration'
  ],
  antiSignals: [
    'fix bug', 'implement', 'deploy', 'test', 'review code',
    'security audit', 'write docs', 'release'
  ],
  chainOrder: [
    'Framer', 'Context Scout', 'User Value Scout', 'Creative Leap Scout',
    'Normalizer', 'Synthesizer', 'Product Expander', 'Judge', 'Assembler'
  ]
}
```

---

## 9. Entry Routing Signals

Add to `entry.mjs` signal detection:

```javascript
// Mission match for brainstorm
{
  keywords: ['brainstorm', 'explore ideas', 'investigate', 'opportunity map',
             'creative directions', 'concept exploration', 'what could we build',
             'strategy options', 'divergent thinking'],
  mission: 'brainstorm',
  weight: 0.8
}
```

---

## 10. Build Slices

Each slice is one commit. Each commit ships with tests.

### Slice 1 — Types & Frame

- Add `BrainstormRequest` type
- Add evidence mode constraint matrix (validation function)
- Add `brainstorm-frame` artifact contract
- Frame resolver: task description → BrainstormRequest
- Tests: frame parsing, default resolution, evidence mode validation, breadth/depth bounds

### Slice 2 — Scout Schema & 3 Scouts

- Add `ScoutFinding` schema
- Add `scout-finding` artifact contract
- Define 3 scout roles in role catalog: Context Scout, User Value Scout, Creative Leap Scout
- Tests: schema validation, evidence mode compliance per statement, artifact completeness

### Slice 3 — Normalize

- Add `NormalizedFindingSet` schema (FindingAtom, FindingConflict)
- Add `normalized-finding-set` artifact contract
- Normalizer role: dedup, support counting, conflict detection, confidence validation
- Tests: dedup collapses identical claims, conflicts detected, evidence mode violations flagged

### Slice 4 — Synthesize

- Add `SynthesisReport` schema
- Add `synthesis-report` artifact contract
- Synthesizer role: theme extraction, direction selection, archive reasoning
- Tests: breadth enforcement (exact count), atom citation requirement, tension preservation

### Slice 5 — Expand

- Add `ExpandedConcept` schema
- Add `product-expansion` artifact contract
- Product Expander role
- Tests: expansion covers all advancing directions, required fields present

### Slice 6 — Judge

- Add `JudgeReport` schema with disposition routing
- Add `judge-report` artifact contract
- Judge role with gate logic
- Tests: disposition types trigger correct routing, loop budget enforced (max 3)

### Slice 7 — Assemble & Wire Mission

- Add `BrainstormResult` schema
- Add `brainstorm-result` artifact contract
- Assembler (inline, not a catalog role)
- Wire mission in `mission.mjs` with roleChain, artifactFlow, escalationBranches
- Wire pack in `packs.mjs`
- Wire entry signals in `entry.mjs`
- Tests: full pipeline dry run, mission validation passes, entry routing matches brainstorm signals

### Slice 8 — Dogfood

- Run on 3 real topics:
  1. "AI-native music creation workspace for indie game composers"
  2. "Desktop-first sprite animation tool that competes with Aseprite"
  3. "MCP server marketplace with trust and quality signals"
- Inspect handoff quality at each phase boundary
- Document findings, adjust schemas if needed

### Slice 9 — Contrarian (v1.0)

- Add `ContrarianChallenge` schema
- Contrarian Scout role: challenge-only, evidence-gated
- Adjust Normalize to ingest contrarian challenges
- Tests: challenges must cite target IDs, freeform rejected

---

## 11. Stop Conditions

```javascript
stopConditions: [
  "Judge accepts with disposition 'accept'",
  "Judge rejects — mission returns honest partial",
  "Loop budget exhausted (3 revision loops) — Judge forced to accept or reject",
  "Frame fails to resolve objective — mission aborts with guidance"
]
```

---

## 12. Honest Partial

```
"Brainstorm explored [N] dimensions via [scout_count] scouts. Normalize produced
[atom_count] finding atoms with [conflict_count] conflicts. Synthesis selected
[breadth] directions. Expansion produced [concept_count] concepts. Judge disposition:
[disposition]. [If partial:] The pipeline stalled at [phase] because [reason].
Artifacts up to that point are intact and inspectable."
```

---

## 13. Acceptance Criteria (v0.1 is done when)

- [ ] `roleos mission show brainstorm` displays full mission detail
- [ ] `roleos mission validate brainstorm` exits 0
- [ ] `roleos packs show brainstorm` displays pack roster
- [ ] `roleos run "brainstorm: <topic>"` creates a persistent run with correct steps
- [ ] Evidence mode validation rejects illegal (grade, confidence) pairs
- [ ] Breadth is enforced: synthesis with breadth=3 produces exactly 3 directions
- [ ] Depth is enforced: depth=1 runs 1 expander, depth=2 runs 2
- [ ] Judge disposition routes correctly (accept → return, revise → loop, reject → partial)
- [ ] Loop budget is respected (max 3 revisions)
- [ ] Full pipeline dry run produces a valid `brainstorm-result` artifact
- [ ] All schemas validate with the artifact system
- [ ] Tests cover every phase boundary
