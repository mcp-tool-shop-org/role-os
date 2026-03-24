# Repo Map — role-os

## Stack

- Runtime: Node.js >= 18.0.0 (ESM only)
- Dependencies: zero (intentional)
- Test framework: Node.js built-in `node --test`
- Site: Astro + Starlight (in site/ subdirectory, separate deps)

## Structure

```
bin/
  roleos.mjs             # CLI entry point (91 lines, dispatch + error handling)
src/
  init.mjs               # Init command — copies starter-pack to .claude/ (36 lines)
  packet.mjs             # Packet creation — prompts user, writes packet (144 lines)
  route.mjs              # Route recommendation — keyword scoring + chain (169 lines)
  review.mjs             # Review command — verdict recording (94 lines)
  status.mjs             # Status command — filesystem-truthful health report (352 lines)
  prompts.mjs            # Readline prompts helper (77 lines)
  fs-utils.mjs           # File copy/read/write utilities (61 lines)
starter-pack/
  agents/                # 32 role contracts across 8 packs
  context/               # 4 context file templates
  schemas/               # task-packet, handoff, review-verdict templates
  policy/                # routing-rules, tool-permissions, escalation-rules, done-definition
  workflows/             # ship-feature, fix-bug, launch-update + full-treatment
  examples/              # feature, integration, identity packet examples
  handbook.md            # Operational field manual
  README.md              # Starter-pack intro
test/
  cli.test.mjs           # 18 test cases (Node built-in test runner)
site/                    # Astro/Starlight landing page + handbook docs
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
| Starter-pack agents | 32 role contracts (name, mission, boundaries) | `starter-pack/agents/` (34 files) |
| README role table | 32 roles across 8 packs | `README.md` |
| Routing rules | When to use each of 32 roles | `starter-pack/policy/routing-rules.md` |
| Tool permissions | May/must-not for each of 32 roles | `starter-pack/policy/tool-permissions.md` |
| CLI route keywords | Keyword scoring for 6 roles only | `src/route.mjs:ROLE_KEYWORDS` |
| CLI route chains | Default chains for 3 packet types | `src/route.mjs:CHAINS` |
| CLI packet types | 3 valid types | `src/packet.mjs:TYPES` |
| CLI verdict enum | 4 valid verdicts | `src/review.mjs:VERDICTS` |
| Handbook | Operational guide | `starter-pack/handbook.md` |

A change to any one surface without updating all others is a contract breach.

**Known limitation:** `roleos route` keyword-scores only 6 of 32 roles. The remaining 26 are documented in routing-rules.md but invisible to CLI routing. This is by design — orchestrator manually assigns them.

## Key files and their invariants

| File | Invariant |
|------|-----------|
| `src/init.mjs` | Copies starter-pack to `.claude/` via `copyDirSafe()`. Skips existing files (idempotent). Does NOT customize, interpolate, or inject — pure copy. |
| `src/packet.mjs:TYPES` | Hardcoded: `["feature", "integration", "identity"]`. CLI rejects unknown types. |
| `src/packet.mjs:TYPICAL_CHAINS` | Hardcoded chains per type. For display only — not auto-assigned. |
| `src/route.mjs:ROLE_KEYWORDS` | 6 roles with keyword arrays. Only these 6 are scored. |
| `src/route.mjs:CHAINS` | 3 base chains (feature, integration, identity). Orchestrator + Critic always included. |
| `src/review.mjs:VERDICTS` | Hardcoded: `["accept", "accept-with-notes", "reject", "blocked"]`. CLI rejects unknown verdicts. |
| `src/status.mjs` | Reads all state from filesystem. Checks 4 context files + 5 spine files. No cache, no memory. |
| `src/fs-utils.mjs:copyDirSafe()` | Skips existing files. Never overwrites. Returns created/skipped counts. |
| `bin/roleos.mjs:VERSION` | Hardcoded `1.0.0` (note: package.json says 1.0.1 — known drift). |

## Secondary seams

### 1. Packet parsing (regex-based)
Route, review, and status all parse packet markdown via regex (`/## ${heading}\n([\s\S]*?)(?=\n## |\n---|$)/`). Sensitive to header format — a typo like `## Task id` (lowercase) silently breaks parsing.

### 2. Init idempotence without update path
`roleos init` skips existing files. If starter-pack changes (new role, updated policy), existing users don't get updates by re-running init. No `--force` flag exists.

### 3. Verdict overwrite without history
`roleos review` force-writes verdict files. Multiple reviewers overwrite each other. No locking, no merge, no history.

## Validation law

- `npm test` runs 18 test cases covering all 5 commands + error cases
- `npm run verify` smoke-tests the CLI
- CI runs on Node 18 + 22 (matrix)
- All validation is terminal-based. No browser, no visual verification.
- No network access. All operations are local filesystem.
