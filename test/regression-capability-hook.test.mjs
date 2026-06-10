/**
 * Stage A regression — contract C6: self-contained capability-gate PreToolUse hook.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   - The generated PreToolUse hook script is SELF-CONTAINED stdlib-only — it must not
 *     import the "role-os/src/..." bare specifier (which resolves in no npx/global install).
 *   - On internal failure it emits a one-time stderr warning — never a silent catch.
 *   - With ROLEOS_CAPABILITY_GATE=1 and an ungranted gated command, the hook exits 2.
 *
 * Provenance: SPECIALIST-005, promoted to HIGH in verify-stage-a.json (package.json has no
 * `exports` field, so the generated hook's role-os import always failed and the FAIL-CLOSED
 * control silently degraded to fail-open on the documented install path).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffoldHooks } from "../src/hooks.mjs";

const TEST_DIR = join(tmpdir(), `roleos-regr-cap-hook-${process.pid}`);
const HOOK = join(TEST_DIR, ".claude", "hooks", "pre-tool-use.mjs");

function runHook({ command, env = {} }) {
  const input = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command },
    cwd: TEST_DIR,
  });
  // The scaffolded hook lives outside any node_modules tree (OS tmpdir), exactly like an
  // npx/global-install consumer repo — a bare "role-os/..." import CANNOT resolve here.
  return spawnSync("node", [HOOK], {
    encoding: "utf-8",
    input,
    timeout: 15000,
    env: { ...process.env, ROLEOS_CAPABILITY_GATE: undefined, ...env },
  });
}

describe("C6 — generated PreToolUse hook is self-contained", () => {
  before(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
    scaffoldHooks(TEST_DIR);
    assert.ok(existsSync(HOOK), "scaffold must generate .claude/hooks/pre-tool-use.mjs");
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("contains no bare role-os import specifier (stdlib-only)", () => {
    const src = readFileSync(HOOK, "utf-8");
    assert.doesNotMatch(src, /["'`]role-os\//,
      "the generated hook must not import role-os/src/... — it resolves in no consumer repo");
  });

  it("contains no silent (empty or comment-only) catch around the gate", () => {
    const src = readFileSync(HOOK, "utf-8");
    assert.doesNotMatch(src, /catch\s*\{\s*(?:\/\*[\s\S]*?\*\/\s*)?\}/,
      "internal failure must emit a warning, never a silent no-op catch");
  });

  it("exits 2 on an ungranted gated command when ROLEOS_CAPABILITY_GATE=1 (fail-closed)", () => {
    const r = runHook({ command: "npm publish --access public", env: { ROLEOS_CAPABILITY_GATE: "1" } });
    assert.equal(r.status, 2,
      `ungranted npm publish must be DENIED with exit 2 (got ${r.status}; stderr: ${r.stderr})`);
    assert.ok((r.stderr || "").length > 0, "the deny reason must be written to stderr");
  });

  it("exits 0 when the capability is granted", () => {
    const capDir = join(TEST_DIR, ".claude", "role-os");
    mkdirSync(capDir, { recursive: true });
    writeFileSync(join(capDir, "capabilities.json"),
      JSON.stringify({ "npm:publish": { granted: true } }));
    try {
      const r = runHook({ command: "npm publish", env: { ROLEOS_CAPABILITY_GATE: "1" } });
      assert.equal(r.status, 0, `granted publish must pass (stderr: ${r.stderr})`);
    } finally {
      rmSync(join(capDir, "capabilities.json"), { force: true });
    }
  });

  it("exits 0 for a non-gated command even with the gate enabled", () => {
    const r = runHook({ command: "ls -la && git status", env: { ROLEOS_CAPABILITY_GATE: "1" } });
    assert.equal(r.status, 0, `benign command must never be blocked (stderr: ${r.stderr})`);
  });

  it("exits 0 (no-op) when the gate is disabled — the default", () => {
    const r = runHook({ command: "npm publish" });
    assert.equal(r.status, 0, "gate is opt-in: default OFF must not block anything");
  });
});
