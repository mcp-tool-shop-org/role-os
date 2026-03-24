# Workflow: Protect Bootstrap Truth

## Use when

A proposed change touches any of these paths:
- `starter-pack/` — any modification to agent contracts, schemas, policies, workflows, context templates, examples, or handbook
- `src/route.mjs` — any modification to ROLE_KEYWORDS, CHAINS, or type detection
- `src/packet.mjs` — any modification to TYPES, TYPICAL_CHAINS, or DELIVERABLE_DEFAULTS
- `src/review.mjs` — any modification to VERDICTS enum
- `src/status.mjs` — any modification to context file list, spine file list, or status computation
- `src/init.mjs` — any modification to copy logic or starter-pack resolution
- `README.md` — any modification to role table, quick start, or feature claims

## Required chain

1. **Backend Engineer** — implements the change
2. **Test Engineer** — verifies enums, catalog counts, and sync between surfaces
3. **Critic Reviewer** — reviews against reject criteria below

Add **Docs Architect** if the change affects handbook, README role table, or starter-pack README.

## Required review checks

The Critic must verify ALL of the following against evidence (not impression):

- [ ] Starter-pack agent count is exactly 32 (count files in `starter-pack/agents/`)
- [ ] README role table matches starter-pack agent files (names, packs, counts)
- [ ] `routing-rules.md` covers all 32 roles
- [ ] `tool-permissions.md` covers all 32 roles
- [ ] `src/route.mjs:ROLE_KEYWORDS` has not silently dropped or added roles
- [ ] `src/route.mjs:CHAINS` matches `src/packet.mjs:TYPICAL_CHAINS` for all 3 types
- [ ] `src/packet.mjs:TYPES` still has exactly 3 entries
- [ ] `src/review.mjs:VERDICTS` still has exactly 4 entries
- [ ] `src/status.mjs` checks exactly 4 context files and 5 spine files
- [ ] `src/init.mjs` resolves starter-pack from `__dirname/../starter-pack` (no invented paths)
- [ ] `src/fs-utils.mjs:copyDirSafe()` still skips existing files (never overwrites)
- [ ] No new dependency added to package.json
- [ ] `npm test` passes all 18+ test cases
- [ ] `npm run verify` exits 0
- [ ] No canonical memory duplication introduced (no local re-implementation of `memory/` content)

## Reject criteria — automatic reject

A change is **automatically rejected** if it:

1. **Scaffolds files the product no longer treats as canonical.** If a role, schema, policy, or workflow is removed from the product definition but remains in starter-pack, init will scaffold a lie. Starter-pack must reflect current product truth.

2. **Reintroduces invented local memory.** Any file, variable, or data structure that stores repo facts, decisions, or treatment history outside of Claude project memory. Role OS reads memory; it never creates a parallel system.

3. **Weakens route/review/status truthfulness.** Any change that makes status report something other than filesystem truth. Any change that makes route recommend roles it cannot keyword-score without disclosing the limitation. Any change that makes review accept a verdict not in the enum.

4. **Expands role surface without synchronized coverage.** Adding a role to `starter-pack/agents/` without corresponding updates to routing-rules, tool-permissions, README role table, and handbook. Adding a keyword-scored role to route.mjs without a starter-pack contract.

5. **Changes starter-pack content without matching README/handbook/examples.** If the README says 32 roles and starter-pack has 33, the bootstrap is a lie. If the handbook describes a workflow that starter-pack doesn't include, the documentation is a lie.

6. **Lets CLI and starter-pack drift apart.** If `src/packet.mjs:TYPES` adds a new type but starter-pack has no example for it. If `src/review.mjs:VERDICTS` adds a verdict but the schema doesn't document it. The CLI and the starter-pack are one product.

7. **Alters hardcoded enums without synchronized updates.** Changing TYPES, VERDICTS, CHAINS, ROLE_KEYWORDS, context file list, or spine file list without updating all consuming surfaces (code, tests, docs, starter-pack).

8. **Overrides init idempotence.** Any change that makes `roleos init` overwrite user-filled context files or previously scaffolded role contracts. Init must skip existing files.

## Doctrine references

- Starter-pack: `starter-pack/` (canonical bootstrap source)
- Routing rules: `starter-pack/policy/routing-rules.md` (all 32 roles)
- Tool permissions: `starter-pack/policy/tool-permissions.md` (all 32 roles)
- CLI enums: `src/packet.mjs:TYPES`, `src/route.mjs:CHAINS`, `src/review.mjs:VERDICTS`
- Memory integration: `starter-pack/handbook.md` (memory layer section)
- Lockdown doctrine: `role-os-rollout/DOCTRINE.md`
