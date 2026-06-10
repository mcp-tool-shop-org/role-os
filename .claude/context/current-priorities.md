# Current Priorities — role-os

> **Freshness:** last verified 2026-06-10 against role-os **v2.9.1**. If `package.json` version
> no longer matches, treat every count and law below as suspect and re-verify against source
> (`src/route.mjs` ROLE_CATALOG, `src/packs.mjs` TEAM_PACKS, `src/mission.mjs` MISSIONS,
> CHANGELOG.md) before enforcing anything.

## Active work

- Dogfood swarm on role-os itself (Stage A amend in progress). Findings and fixes tracked in dogfood-labs swarm records.

## Next up

- Swarm Stages B–D (proactive hardening, humanization, visual polish), then feature pass and full treatment.

## Blocked

- Nothing currently blocked.

## Completed recently

- v2.9.1 published (current) — role character-sheet dossier system wired into dispatch
- v2.8.0 — capability gate + conformance live-catalog rollout
- Specialist tier shipped (registry, gate, shadow probes, budget/conformance consults)
- Deep-audit and dogfood-swarm missions shipped (dynamic, manifest-scaled dispatch)
- Brainstorm mission v0.4 golden run proven (two-layer truth/render architecture)

## Banned detours

1. **No config file system.** Zero-config is a feature. Context files are the customization surface, not framework configuration. (Runtime state under `.role-os/` — specialist registry, run files — is persisted state, not framework config.)
2. **No third-party plugin/extension architecture.** The starter-pack is the standard. The specialist tier registers *backends* for existing advisory seams; it does not add catalog roles or third-party packs.
3. **No LLM on the deterministic hot path.** Routing, validation, and gating are deterministic floors. LLM features (budget consult, conformance consult, specialist dispatch) are opt-in advisory ceilings that fail open — they may inform, never silently replace, the deterministic decision.
4. **No interactive TUI.** Packet creation prompts are the only interactive element. No curses, no full-screen mode, no wizard flows.
5. **No memory layer.** Role OS integrates with Claude project memory. It must never store repo facts, decisions, or treatment history.
6. **No always-on network features.** Default operation is local filesystem only. Network egress exists ONLY behind explicit opt-ins: `roleos verify-citations` (prism → arXiv/Crossref), the specialist tier (configured `backend_url`), and `ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT` (local model endpoint). All fail open/closed as designed and are off by default. Adding a network path that is on by default, or that does not fail safe, requires explicit human approval.

## Must-preserve invariants

These cannot be traded away without explicit human approval:

1. **Zero dependencies.** `npm install` installs nothing. Intentional and non-negotiable.
2. **Catalog synchronization.** The role catalog (currently 61 roles in 11 families — source of truth: `ROLE_CATALOG` in `src/route.mjs`) only changes with synchronized updates to starter-pack, routing-rules, tool-permissions, README, and handbook. Never inline a hardcoded role count in a new surface — derive or cite the source.
3. **3 packet types.** Feature, integration, identity. Hardcoded in CLI. Any new type requires code + docs + test changes.
4. **4 verdict types.** Accept, accept-with-notes, reject, blocked. Hardcoded in CLI. Closed enum.
5. **4 context files.** Product-brief, repo-map, brand-rules, current-priorities. Checked by status command.
6. **Filesystem-only state.** Every command reads from and writes to `.claude/` (and `.role-os/` for specialist state). No hidden globals, no cross-run memory outside those directories.
7. **Init idempotence.** `roleos init` skips existing files. Never overwrites user-filled context.
8. **Starter-pack = bootstrap truth.** What init scaffolds must match what README describes, what routing-rules govern, and what tool-permissions enforce. Drift between these is a product defect.
9. **Full-catalog routing.** `roleos route` scores every role in ROLE_CATALOG (all 61 at v2.9.0). Any routing surface claiming partial coverage is stale and must be fixed, not enforced.
10. **No canonical memory duplication.** Role OS reads Claude project memory. It never rewrites, abstracts, or creates parallel memory.

## Validation law

- `npm test` runs the full suite — 1435 tests across 65 test files at v2.9.1 (1432 pass, 3 deliberate skips) (see CHANGELOG for the current count)
- `npm run verify` smoke-tests the CLI
- CI matrix: Node 18 + 22
- All validation is terminal-based. No browser, no visual verification.
- No network access in any default-path command; opt-in network features (see Banned detours #6) are exercised only by their own opt-in tests.
