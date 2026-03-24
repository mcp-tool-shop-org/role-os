# Current Priorities — role-os

## Active work

- Role OS lockdown (this audit). Second repo in org rollout. Meta case: locking the tool that locks other repos.

## Next up

- None scheduled beyond lockdown.

## Blocked

- Nothing currently blocked.

## Completed recently

- v1.0.1 published (current)
- CommandUI locked as reference implementation
- Shipcheck locked as first org rollout repo
- 8-language translation set complete
- Landing page + handbook deployed

## Banned detours

1. **No config file system.** Zero-config is a feature. Context files are the customization surface, not framework configuration.
2. **No plugin/extension architecture.** The starter-pack is the standard. No custom roles via registration, no third-party packs.
3. **No AI-powered routing.** Route uses deterministic keyword matching. Do not replace it with LLM calls, embeddings, or similarity scoring.
4. **No interactive TUI.** Packet creation prompts are the only interactive element. No curses, no full-screen mode, no wizard flows.
5. **No memory layer.** Role OS integrates with Claude project memory. It must never store repo facts, decisions, or treatment history.
6. **No network features.** All operations are local filesystem. No API calls, no remote state, no sync.

## Must-preserve invariants

These cannot be traded away without explicit human approval:

1. **Zero dependencies.** `npm install` installs nothing. Intentional and non-negotiable.
2. **32-role catalog.** Exactly 32 roles across 8 packs. Any change requires synchronized updates to starter-pack, routing-rules, tool-permissions, README, and handbook.
3. **3 packet types.** Feature, integration, identity. Hardcoded in CLI. Any new type requires code + docs + test changes.
4. **4 verdict types.** Accept, accept-with-notes, reject, blocked. Hardcoded in CLI. Closed enum.
5. **4 context files.** Product-brief, repo-map, brand-rules, current-priorities. Checked by status command.
6. **Filesystem-only state.** Every command reads from and writes to `.claude/`. No caching, no hidden globals, no cross-run memory.
7. **Init idempotence.** `roleos init` skips existing files. Never overwrites user-filled context.
8. **Starter-pack = bootstrap truth.** What init scaffolds must match what README describes, what routing-rules govern, and what tool-permissions enforce. Drift between these is a product defect.
9. **Route limitation transparency.** `roleos route` scores 6 of 32 roles. This limitation must be documented wherever routing is described.
10. **No canonical memory duplication.** Role OS reads Claude project memory. It never rewrites, abstracts, or creates parallel memory.

## Validation law

- `npm test` runs 18 test cases covering all 5 commands
- `npm run verify` smoke-tests the CLI
- CI matrix: Node 18 + 22
- All validation is terminal-based. No browser, no visual verification.
- No network access in any command.
