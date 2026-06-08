#!/usr/bin/env node
/**
 * Wedge #1 PreToolUse hook — Tool-Call Conformance ADVISORY (deterministic floor; advisory + fail-open).
 * role-os dogfoods its own seam: this reads .claude/role-os/tool-contracts.json from the session cwd, runs
 * the schema floor (L1-L3) + computable contract floor (L4) against the proposed call, and — only when the
 * floor PROVES a violation — injects an advisory into context via the Claude Code hook protocol
 * ({hookSpecificOutput:{hookEventName:"PreToolUse", additionalContext}}). It NEVER blocks (always exit 0)
 * and NEVER throws — any error is a silent no-op, because a hook must not break a tool call.
 *
 * Import path note: this imports the floor by RELATIVE path (../../src/hooks.mjs) because the hook lives in
 * role-os's own repo. (A consumer repo that installs role-os via npm would import "role-os/src/hooks.mjs".)
 */
import { readFileSync } from "node:fs";

let input = {};
try { input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}"); } catch { /* no stdin */ }

try {
  const { conformanceAdvisory } = await import("../../src/hooks.mjs");
  const note = conformanceAdvisory(input.cwd || process.cwd(), input.tool_name || "", input.tool_input);
  if (note) {
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: note },
    }));
  }
} catch { /* role-os not resolvable here, or internal error -> no-op (never block a tool call) */ }

process.exit(0);
