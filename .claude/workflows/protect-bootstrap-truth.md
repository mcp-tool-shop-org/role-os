# Workflow: Protect Bootstrap Truth

> **Freshness:** re-verified 2026-06-10 against role-os v2.9.0. All counts in this workflow
> are DERIVED from source at review time, never inlined — if you find a hardcoded count here
> or in any synchronized surface, treat it as drift and fix it against the source of truth.

## Use when

A proposed change touches any of these paths:
- `starter-pack/` — any modification to agent contracts, schemas, policies, workflows, context templates, examples, or handbook
- `src/route.mjs` — any modification to ROLE_CATALOG, chain building, or type detection
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

The Critic must verify ALL of the following against evidence (not impression). Counts are
derived at review time — never compare against a number written in a doc:

- [ ] Starter-pack agent count matches the synchronized surfaces (derive it: count files in `starter-pack/agents/**`; 39 at v2.9.0). Any doc stating a different count is drift.
- [ ] README role table matches `ROLE_CATALOG` in `src/route.mjs` (names, families, and rows summing to `ROLE_CATALOG.length` — verify with `node -e "import('./src/route.mjs').then(m => console.log(m.ROLE_CATALOG.length))"`)
- [ ] `routing-rules.md` covers every contract shipped in `starter-pack/agents/`
- [ ] `tool-permissions.md` covers every contract shipped in `starter-pack/agents/`
- [ ] `src/route.mjs:ROLE_CATALOG` has not silently dropped or added roles (diff against git)
- [ ] `src/packet.mjs:TYPICAL_CHAINS` still defines a chain for each of the 3 packet types, and every role named in it exists in ROLE_CATALOG
- [ ] `src/packet.mjs:TYPES` still has exactly 3 entries
- [ ] `src/review.mjs:VERDICTS` still has exactly 4 entries
- [ ] `src/status.mjs` checks exactly 4 context files and the spine file list
- [ ] `src/init.mjs` resolves starter-pack from `__dirname/../starter-pack` (no invented paths)
- [ ] `src/fs-utils.mjs:copyDirSafe()` still skips existing files (never overwrites)
- [ ] No new dependency added to package.json
- [ ] `npm test` passes the full suite (1404 tests / 59 files at v2.9.0 — derive the current count from the run output, do not pin it)
- [ ] `npm run verify` exits 0
- [ ] Version claims match `package.json` (never a hardcoded version string)
- [ ] No canonical memory duplication introduced (no local re-implementation of `memory/` content)

## Reject criteria — automatic reject

A change is **automatically rejected** if it:

1. **Scaffolds files the product no longer treats as canonical.** If a role, schema, policy, or workflow is removed from the product definition but remains in starter-pack, init will scaffold a lie. Starter-pack must reflect current product truth.

2. **Reintroduces invented local memory.** Any file, variable, or data structure that stores repo facts, decisions, or treatment history outside of Claude project memory. Role OS reads memory; it never creates a parallel system.

3. **Weakens route/review/status truthfulness.** Any change that makes status report something other than filesystem truth. Any change that makes route recommend roles it cannot keyword-score without disclosing the limitation. Any change that makes review accept a verdict not in the enum.

4. **Expands role surface without synchronized coverage.** Adding a role to `starter-pack/agents/` without corresponding updates to routing-rules, tool-permissions, README role table, and handbook. Adding a keyword-scored role to route.mjs without a starter-pack contract.

5. **Changes starter-pack content without matching README/handbook/examples.** If the README states a role count that the starter-pack or catalog does not actually have, the bootstrap is a lie. If the handbook describes a workflow that starter-pack doesn't include, the documentation is a lie. Counts must be re-derived from source, not copied from another doc.

6. **Lets CLI and starter-pack drift apart.** If `src/packet.mjs:TYPES` adds a new type but starter-pack has no example for it. If `src/review.mjs:VERDICTS` adds a verdict but the schema doesn't document it. The CLI and the starter-pack are one product.

7. **Alters hardcoded enums without synchronized updates.** Changing TYPES, VERDICTS, CHAINS, ROLE_KEYWORDS, context file list, or spine file list without updating all consuming surfaces (code, tests, docs, starter-pack).

8. **Overrides init idempotence.** Any change that makes `roleos init` overwrite user-filled context files or previously scaffolded role contracts. Init must skip existing files.

## Doctrine references

- Starter-pack: `starter-pack/` (canonical bootstrap source)
- Routing rules: `starter-pack/policy/routing-rules.md` (every shipped role)
- Tool permissions: `starter-pack/policy/tool-permissions.md` (every shipped role)
- CLI enums: `src/packet.mjs:TYPES`, `src/packet.mjs:TYPICAL_CHAINS`, `src/review.mjs:VERDICTS`
- Memory integration: `starter-pack/handbook.md` (memory layer section)
- Lockdown doctrine: `role-os-rollout/DOCTRINE.md`
