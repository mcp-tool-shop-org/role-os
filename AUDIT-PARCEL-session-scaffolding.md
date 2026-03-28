# AUDIT-PARCEL: session-scaffolding

**Auditor:** Component Auditor
**Files:** src/session.mjs, src/hooks.mjs, src/init.mjs, src/packet.mjs, src/status.mjs, src/prompts.mjs, src/fs-utils.mjs, bin/roleos.mjs
**Lines:** 1,563
**Date:** 2026-03-27

## Findings

### H-SS-1: `/dev/stdin` fails on Windows
- **Severity:** high | **Confidence:** certain | **Category:** correctness
- **File:** src/session.mjs (or related CLI entry)
- **Evidence:** Code references `/dev/stdin` for reading piped input. This path does not exist on Windows.
- **Impact:** CLI is unusable for piped input on Windows — the primary development platform per workspace config
- **Fix:** Use `process.stdin` or `fs.readFileSync(0)` for cross-platform stdin reading

### M-SS-2: `scaffoldClaude` writes to `.claude/` without checking existing content
- **Severity:** medium | **Confidence:** certain | **Category:** state
- **File:** src/session.mjs — `scaffoldClaude()`
- **Evidence:** Scaffold writes files to `.claude/` directory. If user has existing `.claude/CLAUDE.md` or settings, they may be overwritten.
- **Impact:** User's custom Claude configuration is silently replaced
- **Fix:** Check for existing files; merge or prompt before overwriting

### M-SS-3: `generateHooksConfig` produces hooks without validating tool names
- **Severity:** medium | **Confidence:** certain | **Category:** correctness
- **File:** src/session.mjs — `generateHooksConfig()`
- **Evidence:** Hook definitions reference tool names (Read, Write, Bash) as strings without validating against known Claude Code tools
- **Impact:** Invalid tool name in hook config silently fails to match any tool invocation
- **Fix:** Validate tool names against known Claude Code tool list

### M-SS-4: `generateSettings` in hooks.mjs doesn't escape special characters in paths
- **Severity:** medium | **Confidence:** likely | **Category:** correctness
- **File:** src/hooks.mjs — `generateSettings()`
- **Evidence:** File paths are interpolated into JSON settings without escaping backslashes
- **Impact:** Windows paths with backslashes produce invalid JSON
- **Fix:** Use `JSON.stringify()` for path values or normalize to forward slashes

### L-SS-5: `initRoleOS` doesn't verify Node.js version
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/init.mjs — `initRoleOS()`
- **Evidence:** Package requires Node.js 18+ but init doesn't check `process.version`
- **Impact:** Cryptic errors on Node.js < 18 (e.g., missing `node:test`)
- **Fix:** Add version check at init with clear error message

### L-SS-6: `createPacket` doesn't validate packet type
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/packet.mjs — `createPacket()`
- **Evidence:** Accepts any string as packet type; no enum validation
- **Impact:** Typo in packet type creates unrecognizable packets downstream
- **Fix:** Validate against known packet types

### L-SS-7: `parsePacket` fails silently on malformed input
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/packet.mjs — `parsePacket()`
- **Evidence:** Returns null for unparseable input without logging
- **Impact:** Debugging packet issues requires source code inspection
- **Fix:** Add optional verbose/debug mode for packet parsing

### L-SS-8: `showStatus` reads run state from disk on every call
- **Severity:** low | **Confidence:** likely | **Category:** performance
- **File:** src/status.mjs — `showStatus()`
- **Evidence:** Each status display reads the full run state from JSON file
- **Impact:** Slow status display for large run states; file I/O on every keystroke if used in watch mode
- **Fix:** Cache run state with TTL or only re-read on change

### L-SS-9: `readJSON` in fs-utils.mjs doesn't handle BOM
- **Severity:** low | **Confidence:** possible | **Category:** correctness
- **File:** src/fs-utils.mjs — `readJSON()`
- **Evidence:** `JSON.parse(fs.readFileSync(path, "utf8"))` — UTF-8 BOM prefix causes parse failure
- **Impact:** Windows-created JSON files with BOM fail to parse
- **Fix:** Strip BOM before parsing: `content.replace(/^\uFEFF/, "")`

### L-SS-10: `writeJSON` doesn't create parent directories
- **Severity:** low | **Confidence:** certain | **Category:** error-handling
- **File:** src/fs-utils.mjs — `writeJSON()`
- **Evidence:** Writes to path without ensuring parent directory exists
- **Impact:** Write fails with ENOENT if parent directory is missing
- **Fix:** Call `ensureDir` on parent before writing (ensureDir already exists in fs-utils)

### L-SS-11: `ensureDir` uses `mkdirSync` with `recursive: true` — acceptable but noisy
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/fs-utils.mjs — `ensureDir()`
- **Evidence:** `recursive: true` succeeds silently if directory exists — correct behavior
- **Impact:** None — this is the right approach
- **Fix:** None needed — marking as informational

### L-SS-12: CLI dispatch in `bin/roleos.mjs` uses string matching for commands
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** bin/roleos.mjs
- **Evidence:** Command dispatch uses if/else chain on `process.argv[2]`
- **Impact:** Fragile — adding commands requires editing the chain
- **Fix:** Consider command registry object mapping command names to handlers

### L-SS-13: `doctor` function checks are hardcoded
- **Severity:** low | **Confidence:** certain | **Category:** architecture
- **File:** src/session.mjs — `doctor()`
- **Evidence:** Health checks are inline; adding new checks requires editing the function
- **Impact:** Not extensible without code changes
- **Fix:** Consider check registry for extensibility

### I-SS-14: fs-utils.mjs is the most-imported utility module (6 dependents)
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **File:** src/fs-utils.mjs
- **Evidence:** Consumed by routing-roles, mission-entry, contracts-evidence, and session-scaffolding internals
- **Impact:** Changes to fs-utils ripple broadly
- **Fix:** None — documented in manifest as shared utility

### I-SS-15: `prompts.mjs` is consumed by only 2 modules
- **Severity:** info | **Confidence:** certain | **Category:** dependency
- **File:** src/prompts.mjs
- **Evidence:** Used by contracts-evidence and session-scaffolding
- **Impact:** Low blast radius — safe to evolve
- **Fix:** None

### L-SS-16: HOOK_DEFINITIONS in hooks.mjs don't document required Claude Code version
- **Severity:** low | **Confidence:** certain | **Category:** correctness
- **File:** src/hooks.mjs — HOOK_DEFINITIONS
- **Evidence:** Hooks reference Claude Code features (tool interception, status line) without noting minimum CC version required
- **Impact:** Users on older Claude Code versions get silent hook failures
- **Fix:** Add minimum CC version to hook definitions or to doctor checks

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 10 |
| Info | 2 |
| **Total** | **16** |

**Top risks:** The `/dev/stdin` Windows failure (H-SS-1) is a platform compatibility bug on the primary development platform. The scaffold overwrite issue (M-SS-2) could destroy user configuration.

**Blocking questions:** Is the primary target platform Windows, macOS, or both? The codebase has several Unix-isms that suggest Linux/macOS development but the workspace is Windows.

**Adjacent parcel risks:** fs-utils.mjs is consumed by 4 components — the BOM issue (L-SS-9) and missing parent dir issue (L-SS-10) could surface in any consumer.
