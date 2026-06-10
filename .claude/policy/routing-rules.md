# Routing Rules

Use the smallest number of roles needed to complete the task correctly.

## Route to Orchestrator
- Multi-step work
- Cross-functional work
- Ambiguous ownership
- Need for sequencing or decomposition

## Route to Product Strategist
- Problem framing
- Scope definition
- Prioritization
- Feature shaping
- Tradeoff decisions

## Route to UI Designer
- Information hierarchy
- User flow
- Interaction design
- Screen structure
- Visual direction within existing brand

## Route to Frontend Developer
- UI implementation
- Client state
- Components
- Interaction wiring
- Frontend integration

## Route to Backend Engineer
- APIs
- Services
- Data flow
- Persistence
- Contracts
- Server logic

## Route to Test Engineer
- Test plans
- Regression defense
- Edge cases
- Verification coverage

## Route to Launch Copywriter
- Release notes
- Launch messaging
- Positioning
- Conversion copy

## Route to Critic Reviewer
- Final acceptance
- Contract validation
- Quality gate
- Truthful rejection

## Route to Repo Researcher
- Repo structure mapping
- Entrypoint and seam discovery
- Build/test command verification
- Dependency verification against live repo truth

## Route to Repo Translator
- README or docs translation to other languages
- Cross-audience documentation adaptation
- Translation verification and degenerate output detection

## Route to Docs Architect
- Handbook or docs site creation
- Documentation restructuring
- Starlight docs setup
- Information architecture for searchable docs

## Route to Metadata Curator
- Package manifest audit
- GitHub repo metadata (description, topics, homepage)
- Badge verification
- Registry metadata alignment

## Route to Coverage Auditor
- Test coverage assessment
- False confidence detection
- Missing defense identification
- CI coverage integration

## Route to Deployment Verifier
- Post-deploy verification
- Landing page, handbook, and package live checks
- Badge resolution verification
- Translation spot-checks

## Route to Release Engineer
- Version bump and tagging
- Changelog updates
- Package build and publish readiness
- Staging and release execution

## Route to Brand Guardian
- Identity contamination audit
- Terminology and tone consistency
- Fork/ancestor residue detection
- Replacement doctrine enforcement

## Route to Feedback Synthesizer
- User signal clustering and theme extraction
- Issue backlog analysis
- Complaint-to-action translation
- Post-launch signal interpretation

## Route to Roadmap Prioritizer
- Work sequencing by leverage and dependency
- Backlog ordering
- Dependency mapping between work items
- "Stop doing this" recommendations

## Route to Spec Writer
- Turning approved scope into execution-grade specs
- Acceptance criteria authoring
- Edge case enumeration
- Non-functional requirements definition

## Route to Information Architect
- Navigation and hierarchy design
- Content organization and findability
- Cross-surface consistency
- Naming and labeling recommendations

## Route to Refactor Engineer
- Structure cleanup without behavior change
- Duplication elimination
- Module boundary clarification
- Complexity reduction

## Route to Performance Engineer
- Measured performance optimization
- Regression identification with profiling
- Hot path analysis
- Performance budget enforcement

## Route to Dependency Auditor
- Dependency health assessment
- Vulnerability scanning and triage
- Supply-chain risk evaluation
- Stale package identification

## Route to Security Reviewer
- Code security review (injection, auth, secrets)
- Threat model verification
- OWASP pattern detection
- Security claim validation

## Route to Launch Strategist
- Launch planning and sequencing
- Proof packaging for launch claims
- Channel selection and timing
- Success criteria definition

## Route to Content Strategist
- Long-form content planning
- Technical article and case study angles
- Docs-to-marketing bridge
- Content calendar development

## Route to Community Manager
- Issue and discussion triage
- Community response drafting
- Contribution guidance
- Community health assessment

## Route to Support Triage Lead
- Support request classification
- Bug vs user error distinction
- Priority assignment
- Recurring pattern analysis

## Route to UX Researcher
- User flow friction analysis
- Heuristic evaluation
- Usability issue identification
- Evidence-based design input

## Route to Competitive Analyst
- Competitive landscape mapping
- Differentiation assessment
- Positioning gap identification
- Honest disadvantage acknowledgment

## Route to Trend Researcher
- Technology and market trend analysis
- Ecosystem signal assessment
- Risk and opportunity identification
- Adoption timing recommendations

## Route to User Interview Synthesizer
- Interview theme extraction
- Mental model mapping
- Unmet needs ranking
- Sample-aware confidence assessment

## Route to Component Auditor
- Deep audit of a bounded code component (assigned parcel with owned paths)
- Per-file findings with quoted evidence, severity, and confidence
- Truthful per-component understanding, not surface scanning
- Not for tests (Test Truth Auditor) or cross-component interfaces (Seam Auditor)

## Route to Seam Auditor
- Interface inspection between components (boundary clusters)
- Caller-assumption vs callee-contract verification
- Content ↔ code drift detection (schemas/docs vs implementation)
- Dependency-direction assessment of the import graph

## Route to Test Truth Auditor
- Test suite truthfulness assessment (proves correctness vs merely exists)
- Ceremonial-test and test-theater detection
- Untested-but-risky flow identification
- Mock fidelity and integration-gap analysis

## Route to Audit Synthesizer
- Synthesis of completed component/seam/test audit parcels into one repo verdict
- Ranked action plan (P0-P3) grouped by root cause
- Cross-cutting finding identification and parcel-contradiction adjudication
- Only after all audit parcels complete — never audits code directly

## Route to Red-Teamer
- Adversarial stress-testing of validators, caption rules, and pipeline contracts
- Independent validation of canon-checking critics
- Pre-freeze attack passes on training datasets and prompt libraries
- Catch-rate measurement with named, categorized attack vectors

## Route to Caption Auditor
- Static caption compliance audit against the research-backed caption rules
- Training-manifest pre-freeze verification
- Post-rule-change dataset re-verification
- Periodic drift checks against frozen manifests

## Route to Monster Taxonomy Verifier
- Creature/monster canon entry audit for LoRA-trainable schema fields
- Monster-dataset separability assessment (apart from human-character data)
- Anatomy/species/scale field coverage verification
- Pre-assembly checks before a Monster LoRA dataset is built
