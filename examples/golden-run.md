# Brainstorm Golden Run — Canonical Proof

**Topic:** MCP server marketplace
**Objective:** Identify the highest-leverage product direction for a curated MCP server discovery platform
**Evidence mode:** mixed | **Breadth:** 3 | **Depth:** 1

This is the actual artifact chain from a complete brainstorm run.
Truth layer, dispute graph, verdict, rendered artifacts, and trace links — all frozen.

---

## Layer 1: Truth Artifacts

### Context Analyst (ContextMap)

```
terms:
  - MCP server: A process exposing tools/resources via Model Context Protocol
    adjacent to: language server, plugin, extension
  - server registry: An index mapping server names to metadata and install paths
    adjacent to: package registry, plugin directory
  - attestation: A signed claim about a server's properties made by an external verifier
    adjacent to: code signing, supply-chain provenance
  - discovery layer: A system that surfaces available servers to consumers without hosting them
    adjacent to: marketplace, search engine, catalog

category_map:
  - Registry: npm, PyPI, crates.io, Docker Hub
  - Marketplace: VS Code Marketplace, Shopify App Store, Salesforce AppExchange
  - Discovery Layer: Awesome lists, product directories, Hacker News

lineage_claims:
  - MCP registries descend from package registries, not app stores
    precedent: npm registry, crates.io index
  - Attestation-first trust inherits from supply-chain security, not review systems
    precedent: Sigstore, SLSA framework, npm provenance

boundary_claims:
  - An MCP marketplace is NOT an app store — it does not host, execute, or sandbox servers
  - A registry is NOT a marketplace — registries index, marketplaces curate and surface
```

### User Value Analyst (UserValueMap)

```
jobs:
  - AI app developer, wiring a new capability into their agent
    → find a tested, maintained MCP server that does exactly this
  - Team lead, evaluating third-party MCP servers for production
    → know which servers are safe, maintained, and compatible before committing
  - MCP server author, publishing their server to get adoption
    → be discovered by the right developers without manual outreach

frictions:
  - [high] No single place lists available MCP servers with quality signals
  - [medium] Server compatibility with different clients is undocumented
  - [high] Trust signals are absent — no way to distinguish maintained from abandoned

unmet_desires:
  - A confidence score that reflects real signals, not self-reported claims
  - Install-and-try friction under 60 seconds for any discovered server

willingness_signals:
  - Developers already maintain curated awesome-lists manually
  - Teams already write internal wikis rating MCP servers
```

### Mechanics Analyst (MechanicsMap)

```
loops:
  - Discovery loop:
    search query + filter criteria → index lookup + relevance scoring + attestation check
    → ranked server list + trust indicators
  - Attestation loop:
    server manifest + verifier identity → property check + signature generation
    → signed attestation record

dependencies:
  - Discovery layer requires: server registry index, attestation records
  - Attestation system requires: server manifest schema, verifier key infrastructure
  - Relevance scoring requires: usage signals, attestation freshness

failure_points:
  - If manifest schema fragments → attestation inputs become inconsistent
  - If verifier keys are not rotatable → single compromise poisons the trust layer
  - If usage signals are self-reported → gaming is trivial

irreducible_mechanisms:
  - Registry index: maps server IDs to metadata without hosting servers
  - Attestation record format: machine-readable, independently verifiable
```

### Positioning Analyst (PositioningMap)

```
substitutes:
  - Awesome-MCP lists: overlap on discovery, gap at trust signals / freshness / compatibility
  - VS Code Marketplace: overlap on curated discovery, gap at protocol (extensions not MCP) + centralized
  - npm search: overlap on keyword discovery, gap at MCP-specific metadata + attestation

wedge_candidates:
  - "First open attestation layer for MCP servers"
    timing: legal now (no competitor has attestation)
    risk: perishable if a second layer ships
  - "The trust layer the MCP ecosystem is missing"
    timing: legal after 10+ verified attestations exist
    risk: hollow assertion if coverage is thin

category_frame:
  MCP server trust and discovery layer — not a marketplace, not a registry,
  but the attestation foundation that makes both work

forbidden_claims:
  - "Best MCP marketplace" — no marketplace features exist yet
  - "Comprehensive MCP directory" — coverage incomplete until automated sync exists
```

---

## Provenance Atoms (after Normalize)

Each atom carries: `source_role`, `source_artifact_type`, `claim_kind`, `allowed_challengers`

**Zero claim-kind overlap between roles:**
- Context Analyst: definition, category, lineage, boundary, adjacency
- User Value Analyst: need, desire, friction, willingness, avoidance
- Mechanics Analyst: mechanism, dependency, constraint, failure_mode, loop
- Positioning Analyst: positioning, wedge, substitute, timing, category_frame

Every non-Contrarian atom is challengeable by Contrarian Analyst.

---

## Dispute Graph

### Challenges issued: 4

| Target | Challenger | Type | Argument |
|--------|-----------|------|----------|
| ctx-8: "NOT an app store" boundary | Contrarian | unsupported | If you index packages and surface install paths, the distinction is one of degree, not kind. |
| pos-5: "trust infrastructure" category frame | Contrarian | premature | A trust layer with zero attestations is an empty taxonomy. |
| uv-6: confidence score desire | Mechanics | mechanically_blocked | Schema fragmentation makes inputs inconsistent, scores become meaningless. |
| pos-3: "first open attestation layer" wedge | Contrarian | premature | "First" is a timing claim that expires. What is the durable version? |

### Rebuttals: 3 narrowed, 1 unresolved

| Claim | Response | Resolution |
|-------|----------|-----------|
| "NOT an app store" | **NARROWED** | Revised to: "does not host, sandbox, or execute — discovery and attestation only." Boundary is functional, not categorical. |
| "trust infrastructure" | **NARROWED** | Legal only after 10+ independent attestations. Until then: "attestation-ready discovery layer." |
| confidence score | **NARROWED** | Score available where manifest data is schema-conformant. "Unavailable" when inputs insufficient. |
| "first open attestation layer" | **UNRESOLVED** | No durable replacement found. "First" acknowledged as perishable. Needs follow-on. |

---

## Synthesis Report

**Topic model:** MCP server discovery is a trust problem masquerading as a search problem. The ecosystem needs attestation infrastructure before marketplace features.

**Tensions (from dispute graph):**
- Attestation without adoption is empty (Contrarian) vs attestation is the only durable wedge (Positioning)
- "Not an app store" is principled (Context) vs functionally indistinguishable at scale (Contrarian)

### Advancing directions: 3

**1. Attestation-ready discovery layer**
Build the registry index + attestation format first. Discovery is the wedge. Trust is the moat.
*Supporting atoms: ctx-3 (attestation definition), mech-5 (attestation record irreducible), pos-1 (awesome-list gap)*

**2. Confidence scoring with degradation**
Surface a confidence score where data exists, degrade gracefully to "unknown" where it doesn't.
*Supporting atoms: uv-1 (developer search job), uv-6 (confidence desire), mech-1 (discovery loop)*

**3. Zero-config install path**
Reduce install-and-try friction to under 60 seconds for any discoverable server.
*Supporting atoms: uv-7 (install friction desire), mech-1 (discovery loop)*

### Archived: 2
- Full marketplace with hosting — violates constraint (no centralized hosting)
- Review/rating system — trust from reviews is gameable; attestation is more durable

---

## Judge Verdict

**Disposition:** accept (first loop)
**Overall quality:** strong

| Direction | Verdict | Action |
|-----------|---------|--------|
| Attestation-ready discovery | ready_to_advance | build_now |
| Confidence scoring | ready_to_advance | build_now |
| Zero-config install path | needs_incubation | hold_for_followon |

**Reasoning:**
- All 3 directions grounded in multi-role evidence
- Dispute graph produced 3 narrowings and 1 unresolved — healthy pressure, not deadlock
- Attestation direction survived Contrarian scrutiny after narrowing

---

## Layer 2: Rendered Artifacts

### Boundary Memo (Context Analyst — taxonomist voice)

**Classification**
MCP server marketplace: a discovery layer that indexes server metadata and surfaces availability.
A member of the "discovery infrastructure" category — distinct from registries (which store) and marketplaces (which host).

**Adjacent spaces**
Package registries (npm, PyPI, crates.io): share indexing but add hosting.
Plugin directories (VS Code Marketplace, Shopify): share curation but require centralized execution.
Curated lists (awesome-lists, product directories): share discovery but lack machine-readable trust data.

**Lineage**
Descends from package registry indexing — the index-without-hosting pattern of npm and crates.io.
Attestation model descends from supply-chain security provenance — Sigstore, SLSA, npm provenance attestations.

**Exclusions**
Not a package manager — does not host, execute, or sandbox servers.
Not a marketplace — does not transact, review, or rank by popularity.
Not a registry — does not store artifacts or enforce versioning.

### Field Notes (User Value Analyst — ethnographer voice)

**Observed situations**
A developer is wiring a new tool into their AI agent. They open GitHub search, type "MCP server" plus a capability keyword, and scroll through repositories. They check stars, last commit date, and README quality. Ten minutes in, they have three candidates and no confidence in any of them.

A team lead is evaluating whether to approve a third-party MCP server for production. They read the README, check the issues tab, look for a LICENSE file. They find no compatibility data, no maintenance commitment, no security review.

**What they reach for**
Stars and commit recency as proxy trust signals. README quality as proxy documentation. Issue count as proxy maintenance health. Manual awesome-list curation as a workaround for missing search.

**What they avoid**
Servers with no README. Servers with no recent commits. Anything that requires reading source code to understand capabilities.

**Signals of readiness**
Developers already maintain curated awesome-lists — organizing server recommendations by hand. Teams already write internal evaluations. "Is this safe?" is the question asked before every integration.

### System Sketch (Mechanics Analyst — whiteboard voice)

**Core loops**
Discovery loop: search query + filter criteria → index lookup → relevance scoring → attestation check → ranked server list + trust indicators.
Attestation loop: server manifest + verifier identity → property check → signature generation → signed attestation record.

**Dependency map**
Discovery layer requires server registry index.
Discovery layer requires attestation records.
Attestation system requires server manifest schema.
Attestation system requires verifier key rotation.

**Break points**
If manifest schema fragments → attestation inputs become inconsistent → scores are meaningless.
If verifier keys are not rotatable → single key compromise poisons entire trust layer.
If usage signals are self-reported → gaming is trivial → scores lose credibility.

**Irreducibles**
Registry index: maps server IDs to metadata without hosting servers. Cannot be deferred.
Attestation record format: machine-readable, independently verifiable signed attestations. Cannot be simplified.

### Claim Brief (Positioning Analyst — strategist voice)

**Territory**
"Attestation-ready discovery layer for MCP servers" — the space between registry and marketplace, defined by trust signals not hosting.

**Current occupants**
Awesome-MCP lists: hold discovery territory but no trust signals, no freshness, no compatibility data.
VS Code Marketplace: holds curated discovery with quality signals but wrong protocol and centralized.
npm search: holds keyword discovery but no MCP-specific metadata, no attestation.

**Timing**
"First open attestation layer for MCP servers" — legal now, no competitor has attestation. Risk: perishable if a second layer ships.
"The trust layer the MCP ecosystem is missing" — legal after 10+ verified attestations exist. Risk: hollow assertion if coverage is thin.

**Forbidden claims**
"Best MCP marketplace" — never legal. No marketplace features exist.
"Comprehensive MCP directory" — not legal until automated sync achieves coverage.

### Cross-Exam Transcript (Contrarian Analyst — litigator voice)

**Challenges**

Regarding ctx-8 (Context Analyst):
On what basis is "NOT an app store" a principled boundary rather than a matter of degree? If the system indexes packages and surfaces install paths, what measurable property separates it from an app store?

Regarding pos-5 (Positioning Analyst):
"Trust infrastructure" before attestation adoption exists is a promissory note. A trust layer with zero attestations is an empty taxonomy. What evidence makes this a positioning claim rather than a wish?

Regarding uv-6 (User Value Analyst):
A confidence score requires consistent input signals. If manifest schema fragments across server authors, scores become meaningless. What mechanism prevents input inconsistency?

Regarding pos-3 (Positioning Analyst):
"First" is a timing claim that expires. Once a second attestation layer ships, this wedge is dead. What is the durable version?

**Exposed assumptions**
All four analysts assume server authors will publish machine-readable manifests voluntarily.
The confidence score assumes signal sources are independent and non-gameable.
The "not an app store" boundary assumes the system will never add hosting or execution.

**Burden shifts**
Context Analyst must demonstrate a measurable boundary, not a categorical assertion.
Positioning Analyst must identify the durable wedge that survives "first mover" expiry.
Mechanics Analyst must specify the schema enforcement mechanism that prevents fragmentation.

---

## Trace Map (Rendered → Truth)

Every substantive claim in the render layer traces back to a truth-layer atom.

| Rendered phrase | Truth atom |
|----------------|-----------|
| "discovery layer that indexes server metadata" | atom-context-analyst-4 |
| "Descends from package registry indexing" | atom-context-analyst-5 |
| "Attestation model descends from supply-chain security" | atom-context-analyst-6 |
| "does not host, execute, or sandbox" | atom-context-analyst-7 |
| "wiring a new tool into their AI agent" | atom-user-value-analyst-1 |
| "evaluating whether to approve a third-party MCP server" | atom-user-value-analyst-2 |
| "Stars and commit recency as proxy trust signals" | atom-user-value-analyst-4 |
| "already maintain curated awesome-lists" | atom-user-value-analyst-8 |
| "index lookup" | atom-mechanics-analyst-1 |
| "property check" | atom-mechanics-analyst-2 |
| "Discovery layer requires server registry index" | atom-mechanics-analyst-3 |
| "manifest schema fragments" | atom-mechanics-analyst-5 |
| "verifier keys are not rotatable" | atom-mechanics-analyst-6 |
| "Awesome-MCP lists" | atom-positioning-analyst-1 |
| "First open attestation layer" | atom-positioning-analyst-3 |
| "legal after 10+ verified attestations" | atom-positioning-analyst-4 |

Cross-exam targets trace directly: every challenge references a real atom ID.
Synthesis directions cite atoms, never rendered prose.

---

## Chain of Custody

```
Request → Frame (v0.3 pipeline, 4 analysts + contrarian)
  → Analyze (4 role-native truth artifacts, blindspot-enforced)
    → Normalize (provenance atoms, zero claim-kind overlap)
      → Cross-Examine (4 challenges, permission-matrix filtered)
        → Rebut (3 narrowed, 1 unresolved)
          → Synthesize (dispute-informed, atom-cited)
            → Expand (3 product shapes, distinct)
              → Judge (accept, first loop)
                → Render (5 formats, lexical-ban enforced)
                  → Trace (16+ links, rendered → truth)
```

**894 tests. 0 failures. Architecture frozen 2026-03-27.**
