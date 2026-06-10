import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  capabilityGate,
  capabilityGateEnabled,
  loadCapabilities,
  GATED_ACTIONS,
  CAPABILITIES_FILE,
} from "../src/specialist/capability-gate.mjs";
import { onPreToolUse } from "../src/hooks.mjs";

const bash = (command) => ({ command });

// Every mkdtemp dir is tracked and removed at the end of the file's run.
const TEMP_DIRS = [];
after(() => {
  for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-cap-"));
  TEMP_DIRS.push(dir);
  return dir;
}

test("disabled by default -> never denies, even an irreversible action", () => {
  const prev = process.env.ROLEOS_CAPABILITY_GATE;
  try {
    delete process.env.ROLEOS_CAPABILITY_GATE;
    const r = capabilityGate("/x", "Bash", bash("npm publish"));
    assert.equal(r.denied, false);
  } finally {
    // Restore even when an assertion throws, so env state never leaks to later tests.
    if (prev !== undefined) process.env.ROLEOS_CAPABILITY_GATE = prev;
  }
});

test("enabled (force) + no grant -> npm publish DENIED (fail-closed)", () => {
  const r = capabilityGate("/x", "Bash", bash("npm publish --access public"), {
    force: true,
    capabilities: {},
  });
  assert.equal(r.denied, true);
  assert.equal(r.action, "npm:publish");
  assert.match(r.reason, /irreversible/i);
  assert.match(r.reason, new RegExp(CAPABILITIES_FILE.replace(/[.]/g, "\\.")));
});

test("enabled + matching grant -> allowed", () => {
  const r = capabilityGate("/x", "Bash", bash("npm publish"), {
    force: true,
    capabilities: { "npm:publish": { granted: true } },
  });
  assert.equal(r.denied, false);
});

test("granted:false is not a grant -> denied", () => {
  const r = capabilityGate("/x", "Bash", bash("npm publish"), {
    force: true,
    capabilities: { "npm:publish": { granted: false } },
  });
  assert.equal(r.denied, true);
});

test("non-gated tool (Read) is never denied", () => {
  const r = capabilityGate("/x", "Read", { file_path: "/a" }, { force: true, capabilities: {} });
  assert.equal(r.denied, false);
});

test("benign bash command is not gated", () => {
  const r = capabilityGate("/x", "Bash", bash("ls -la && git status"), {
    force: true,
    capabilities: {},
  });
  assert.equal(r.denied, false);
});

test("git push and gh release create are gated", () => {
  const push = capabilityGate("/x", "Bash", bash("git push -u origin main"), {
    force: true,
    capabilities: {},
  });
  assert.equal(push.action, "git:push");
  assert.equal(push.denied, true);
  const rel = capabilityGate("/x", "Bash", bash("gh release create v1.0.0"), {
    force: true,
    capabilities: {},
  });
  assert.equal(rel.action, "gh:release");
  assert.equal(rel.denied, true);
});

test("expired grant -> denied; unexpired grant -> allowed", () => {
  const at = Date.parse("2026-06-08");
  const expired = capabilityGate("/x", "Bash", bash("git push"), {
    force: true,
    capabilities: { "git:push": { granted: true, expires: "2020-01-01" } },
    now: at,
  });
  assert.equal(expired.denied, true);
  const live = capabilityGate("/x", "Bash", bash("git push"), {
    force: true,
    capabilities: { "git:push": { granted: true, expires: "2030-01-01" } },
    now: at,
  });
  assert.equal(live.denied, false);
});

test("every GATED_ACTIONS entry has a stable id + label + test fn", () => {
  for (const a of GATED_ACTIONS) {
    assert.equal(typeof a.id, "string");
    assert.equal(typeof a.label, "string");
    assert.equal(typeof a.test, "function");
  }
});

test("capabilityGateEnabled reads the env flag", () => {
  const prev = process.env.ROLEOS_CAPABILITY_GATE;
  try {
    process.env.ROLEOS_CAPABILITY_GATE = "1";
    assert.equal(capabilityGateEnabled(), true);
    process.env.ROLEOS_CAPABILITY_GATE = "0";
    assert.equal(capabilityGateEnabled(), false);
  } finally {
    // Restore even when an assertion throws, so env state never leaks to later tests.
    if (prev === undefined) delete process.env.ROLEOS_CAPABILITY_GATE;
    else process.env.ROLEOS_CAPABILITY_GATE = prev;
  }
});

test("loadCapabilities returns {} for a missing manifest", () => {
  const dir = tempDir();
  assert.deepEqual(loadCapabilities(dir), {});
});

test("onPreToolUse denies a gated action when enabled + ungranted (fail-closed)", () => {
  const dir = tempDir();
  const r = onPreToolUse(
    { tool_name: "Bash", tool_input: bash("npm publish"), cwd: dir },
    { force: true, capabilities: {} },
  );
  assert.ok(r.deny, "expected a deny");
  assert.match(r.deny.reason, /Capability gate/);
});

test("onPreToolUse allows a granted gated action", () => {
  const dir = tempDir();
  const r = onPreToolUse(
    { tool_name: "Bash", tool_input: bash("npm publish"), cwd: dir },
    { force: true, capabilities: { "npm:publish": { granted: true } } },
  );
  assert.equal(r.deny, undefined);
});
