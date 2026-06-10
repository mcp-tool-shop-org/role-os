# Ship Gate

> No repo is "done" until every applicable line is checked.
> Copy this into your repo root. Check items off per-release.

**Tags:** `[all]` every repo · `[npm]` `[pypi]` `[vsix]` `[desktop]` `[container]` published artifacts · `[mcp]` MCP servers · `[cli]` CLI tools

---

## A. Security Baseline

- [x] `[all]` SECURITY.md exists (report email, supported versions, response timeline) (2026-06-10) — supported-versions table covers 2.x; opt-in network paths enumerated
- [x] `[all]` README includes threat model paragraph (data touched, data NOT touched, permissions required) (2026-06-10) — default local-only + the three opt-in network features named
- [x] `[all]` No secrets, tokens, or credentials in source or diagnostics output (2026-03-24)
- [x] `[all]` No telemetry by default — state it explicitly even if obvious (2026-03-24)

### Default safety posture

- [x] `[cli|mcp|desktop]` Dangerous actions (kill, delete, restart) require explicit `--allow-*` flag (2026-03-24) — init uses skip-if-exists, no destructive operations
- [x] `[cli|mcp|desktop]` File operations constrained to known directories (2026-03-24) — writes only to .claude/ under cwd
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[mcp]` SKIP: not an MCP server

## B. Error Handling

- [x] `[all]` Errors follow the Structured Error Shape: `code`, `message`, `hint`, `cause?`, `retryable?` (2026-03-24)
- [x] `[cli]` Exit codes: 0 ok · 1 user error · 2 runtime error · 3 partial success (2026-03-24)
- [x] `[cli]` No raw stack traces without `--debug` (2026-03-24)
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[desktop]` SKIP: not a desktop app
- [ ] `[vscode]` SKIP: not a VS Code extension

## C. Operator Docs

- [x] `[all]` README is current: what it does, install, usage, supported platforms + runtime versions (2026-06-10) — install step added, role table sums to 61, test count 1404/59; English source only — locale READMEs regenerate at next translation pass. NOTE: README-touching releases invalidate this check date.
- [x] `[all]` CHANGELOG.md (Keep a Changelog format) (2026-03-24)
- [x] `[all]` LICENSE file present and repo states support status (2026-03-24)
- [x] `[cli]` `--help` output accurate for all commands and flags (2026-03-24)
- [ ] `[cli|mcp|desktop]` SKIP: no logging levels — CLI outputs structured results or plain text, no log framework
- [ ] `[mcp]` SKIP: not an MCP server
- [ ] `[complex]` SKIP: not a complex tool with operational surface

## D. Shipping Hygiene

- [x] `[all]` `verify` script exists (test + build + smoke in one command) (2026-03-24)
- [x] `[all]` Version in manifest matches git tag (2026-06-09) — package.json 2.9.0 == release tag v2.9.0
- [x] `[all]` Dependency scanning runs in CI (ecosystem-appropriate) (2026-03-24) — zero runtime deps, npm audit in CI
- [ ] `[all]` SKIP: no runtime dependencies to update — zero-dependency CLI
- [x] `[npm]` `npm pack --dry-run` includes: dist/, README.md, CHANGELOG.md, LICENSE (2026-03-24) — includes bin/, src/, starter-pack/
- [x] `[npm]` `engines.node` set (2026-03-24) — >=18.0.0
- [x] `[npm]` Lockfile committed (2026-03-24)
- [ ] `[vsix]` SKIP: not a VS Code extension
- [ ] `[desktop]` SKIP: not a desktop app

## E. Identity (soft gate — does not block ship)

- [x] `[all]` Logo in README header (2026-03-24)
- [x] `[all]` Translations (polyglot-mcp, 8 languages) (2026-06-09) — en + 7 locales via TranslateGemma, ja verified non-degenerate
- [x] `[org]` Landing page (@mcptoolshop/site-theme) (2026-06-09) — live at mcp-tool-shop-org.github.io/role-os/ + Starlight handbook
- [x] `[all]` GitHub repo metadata: description, homepage, topics (2026-06-09)

---

## Gate Rules

**Hard gate (A–D):** Must pass before any version is tagged or published.
If a section doesn't apply, mark `SKIP:` with justification — don't leave it unchecked.

**Soft gate (E):** Should be done. Product ships without it, but isn't "whole."

**Checking off:**
```
- [x] `[all]` SECURITY.md exists (2026-02-27)
```

**Skipping:**
```
- [ ] `[pypi]` SKIP: not a Python project
```
