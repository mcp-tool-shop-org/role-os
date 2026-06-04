/**
 * Specialist CLI tests — `roleos specialist <subcommand>`.
 *
 * Uses execSync to invoke the real CLI. Each test uses its own tmp dir for the registry /
 * state / events files via env vars so the tests don't collide.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { saveRegistry, REGISTRY_SCHEMA, loadRegistry } from "../src/specialist/registry.mjs";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "roleos.mjs");

function tmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-cmd-"));
  return {
    dir,
    paths: {
      registry: join(dir, "specialists.json"),
      state: join(dir, "state.json"),
      events: join(dir, "events.jsonl"),
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** Run roleos with env pointing to the tmp dir. */
function run(paths, args, opts = {}) {
  return execSync(`node "${BIN}" specialist ${args}`, {
    encoding: "utf8",
    timeout: 15000,
    env: {
      ...process.env,
      ROLEOS_SPECIALISTS_PATH: paths.registry,
      ROLEOS_SPECIALIST_STATE_PATH: paths.state,
      ROLEOS_SPECIALIST_EVENTS_PATH: paths.events,
    },
    ...opts,
  });
}

/** Run roleos and capture the error (non-zero exit). Returns { stdout, stderr, status }. */
function runFail(paths, args) {
  try {
    const stdout = run(paths, args, { stdio: ["ignore", "pipe", "pipe"] });
    return { stdout, stderr: "", status: 0 };
  } catch (err) {
    return {
      stdout: (err.stdout || "").toString(),
      stderr: (err.stderr || "").toString(),
      status: err.status,
    };
  }
}

const V_L1 = {
  id: "v1-l1",
  adapter_id: "verifier-2026-06-04",
  base_model: "Qwen/Qwen3-7B",
  gate_threshold: 0.75,
  certified_level: "L1",
  exam_hash: "abc",
  field_audit_window: 200,
  created_at: "2026-06-04T00:00:00Z",
};

const V_L2 = {
  ...V_L1,
  id: "v2-l2",
  certified_level: "L2",
  created_at: "2026-06-05T00:00:00Z",
};

const V_L0 = {
  ...V_L1,
  id: "v3-l0",
  certified_level: "L0",
  created_at: "2026-06-06T00:00:00Z",
};

function makeRegistry(paths, versions = [V_L1], active = "v1-l1") {
  saveRegistry(paths.registry, {
    schema: REGISTRY_SCHEMA,
    specialists: [
      {
        role: "Verifier",
        backend_url: "http://localhost:8000",
        fallback: "claude",
        workload_quota: 0.7,
        active_version: active,
        versions,
      },
    ],
  });
}

// ── help / unknown subcommand ─────────────────────────────────────────────────────────────────

describe("roleos specialist — help & unknown", () => {
  it("specialist help prints usage", () => {
    const out = execSync(`node "${BIN}" specialist help`, { encoding: "utf8" });
    assert.match(out, /roleos specialist/);
    assert.match(out, /rollback/);
    assert.match(out, /clear-halt/);
  });

  it("unknown subcommand exits 1", () => {
    const { paths, cleanup } = tmpDir();
    try {
      const { status } = runFail(paths, "frobnicate");
      assert.equal(status, 1);
    } finally { cleanup(); }
  });

  it("main help lists specialist commands", () => {
    const out = execSync(`node "${BIN}" help`, { encoding: "utf8" });
    assert.match(out, /roleos specialist/);
    assert.match(out, /NAMED COMPENSATOR/);
  });
});

// ── list ──────────────────────────────────────────────────────────────────────────────────────

describe("roleos specialist list", () => {
  it("prints 'no specialists registered' on an empty/missing registry", () => {
    const { paths, cleanup } = tmpDir();
    try {
      const out = run(paths, "list");
      assert.match(out, /no specialists registered/);
    } finally { cleanup(); }
  });

  it("lists roles + versions + marks active with '*'", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L2], "v2-l2");
      const out = run(paths, "list");
      assert.match(out, /Verifier/);
      assert.match(out, /\* v2-l2/);
      assert.match(out, /  v1-l1/);
    } finally { cleanup(); }
  });
});

// ── status ────────────────────────────────────────────────────────────────────────────────────

describe("roleos specialist status", () => {
  it("prints per-role report with quota + halt fields", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const out = run(paths, "status");
      assert.match(out, /Verifier/);
      assert.match(out, /quota:/);
      assert.match(out, /halt:\s+ok/);
    } finally { cleanup(); }
  });

  it("--json emits a parseable JSON object", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const out = run(paths, "status --json");
      const data = JSON.parse(out);
      assert.equal(data.roles[0].role, "Verifier");
      assert.equal(data.roles[0].active_version, "v1-l1");
      assert.equal(data.roles[0].halt.halted, false);
    } finally { cleanup(); }
  });
});

// ── promote ───────────────────────────────────────────────────────────────────────────────────

describe("roleos specialist promote", () => {
  it("promotes a certified (non-L0) version, updates active_version, writes event", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L2], "v1-l1");
      const out = run(paths, "promote Verifier v2-l2 --operator mike");
      assert.match(out, /promote Verifier/);
      assert.match(out, /v1-l1.*→.*v2-l2/);
      const { byRole } = loadRegistry(paths.registry);
      assert.equal(byRole.get("Verifier").active_version, "v2-l2");
      const events = readFileSync(paths.events, "utf8");
      assert.match(events, /"kind":"promote"/);
      assert.match(events, /"operator":"mike"/);
    } finally { cleanup(); }
  });

  it("refuses to promote an L0 version (Reject 2)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L0], "v1-l1");
      const { stderr, status } = runFail(paths, "promote Verifier v3-l0");
      assert.equal(status, 2);
      assert.match(stderr, /L0/);
      // Active didn't change
      const { byRole } = loadRegistry(paths.registry);
      assert.equal(byRole.get("Verifier").active_version, "v1-l1");
    } finally { cleanup(); }
  });

  it("refuses on missing version (R4)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const { stderr, status } = runFail(paths, "promote Verifier ghost");
      assert.notEqual(status, 0);
      assert.match(stderr, /ghost/);
    } finally { cleanup(); }
  });
});

// ── rollback (the named compensator) ──────────────────────────────────────────────────────────

describe("roleos specialist rollback — the named compensator", () => {
  it("swaps active_version back to a prior certified version, writes event", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L2], "v2-l2");
      const out = run(paths, "rollback Verifier v1-l1 --operator mike --reason regression");
      assert.match(out, /rollback Verifier/);
      assert.match(out, /v2-l2.*←.*v1-l1/);
      const { byRole } = loadRegistry(paths.registry);
      assert.equal(byRole.get("Verifier").active_version, "v1-l1");
      const events = readFileSync(paths.events, "utf8");
      assert.match(events, /"kind":"rollback"/);
      assert.match(events, /"from_version":"v2-l2"/);
      assert.match(events, /"to_version":"v1-l1"/);
      assert.match(events, /"reason":"regression"/);
    } finally { cleanup(); }
  });

  it("refuses to roll back to an L0 (uncertified) version (Reject 2)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L0], "v1-l1");
      const { stderr, status } = runFail(paths, "rollback Verifier v3-l0");
      assert.equal(status, 2);
      assert.match(stderr, /L0/);
    } finally { cleanup(); }
  });

  it("preserves the previously-active version in versions[] (so it stays rollback-targetable)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths, [V_L1, V_L2], "v2-l2");
      run(paths, "rollback Verifier v1-l1");
      const { byRole } = loadRegistry(paths.registry);
      const ids = byRole.get("Verifier").versions.map((v) => v.id).sort();
      assert.deepEqual(ids, ["v1-l1", "v2-l2"]);
    } finally { cleanup(); }
  });
});

// ── register ──────────────────────────────────────────────────────────────────────────────────

describe("roleos specialist register", () => {
  it("registers a new version into an existing role; active_version unchanged", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const versionFile = join(paths.registry, "..", "v2.json");
      writeFileSync(versionFile, JSON.stringify(V_L2), "utf8");
      const out = run(paths, `register Verifier "${versionFile}"`);
      assert.match(out, /registered Verifier\/v2-l2/);
      const { byRole } = loadRegistry(paths.registry);
      assert.equal(byRole.get("Verifier").versions.length, 2);
      assert.equal(byRole.get("Verifier").active_version, "v1-l1"); // unchanged
    } finally { cleanup(); }
  });

  it("refuses a duplicate version id (R3)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const versionFile = join(paths.registry, "..", "dup.json");
      writeFileSync(versionFile, JSON.stringify(V_L1), "utf8"); // same id "v1-l1"
      const { stderr, status } = runFail(paths, `register Verifier "${versionFile}"`);
      assert.notEqual(status, 0);
      assert.match(stderr, /already exists|R3/);
    } finally { cleanup(); }
  });

  it("creates a new role when --backend-url is provided", () => {
    const { paths, cleanup } = tmpDir();
    try {
      const versionFile = join(paths.registry, "..", "v1.json");
      writeFileSync(versionFile, JSON.stringify(V_L1), "utf8");
      const out = run(paths, `register Budgeter "${versionFile}" --backend-url http://localhost:9000 --workload-quota 0.5`);
      assert.match(out, /registered Budgeter\/v1-l1/);
      const { byRole } = loadRegistry(paths.registry);
      const entry = byRole.get("Budgeter");
      assert.equal(entry.backend_url, "http://localhost:9000");
      assert.equal(entry.workload_quota, 0.5);
      assert.equal(entry.active_version, null);
    } finally { cleanup(); }
  });

  it("refuses to write a version with a Claude-family base_model (R1)", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const bad = { ...V_L2, base_model: "claude-opus-4-7" };
      const versionFile = join(paths.registry, "..", "bad.json");
      writeFileSync(versionFile, JSON.stringify(bad), "utf8");
      const { stderr, status } = runFail(paths, `register Verifier "${versionFile}"`);
      assert.notEqual(status, 0);
      assert.match(stderr, /R1|Claude-family/);
      // Registry on disk should still have just the original v1-l1
      const { byRole } = loadRegistry(paths.registry);
      assert.equal(byRole.get("Verifier").versions.length, 1);
    } finally { cleanup(); }
  });
});

// ── clear-halt ────────────────────────────────────────────────────────────────────────────────

describe("roleos specialist clear-halt", () => {
  it("no-op when role was not halted", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      const out = run(paths, "clear-halt Verifier");
      assert.match(out, /was not halted/);
    } finally { cleanup(); }
  });

  it("clears an existing halt and writes a clear-halt event", () => {
    const { paths, cleanup } = tmpDir();
    try {
      makeRegistry(paths);
      // Seed a halt into the state file directly.
      writeFileSync(paths.state, JSON.stringify({
        schema: "roleos-specialist-state/v1",
        roles: {
          Verifier: {
            dispatch_timestamps: [],
            probe_counter: 0,
            halt: { reason: "drift", since: "2026-06-04T00:00:00Z" },
          },
        },
      }), "utf8");
      const out = run(paths, "clear-halt Verifier --operator mike --reason 'reviewed false alarm'");
      assert.match(out, /cleared halt for "Verifier"/);
      const events = readFileSync(paths.events, "utf8");
      assert.match(events, /"kind":"clear-halt"/);
      assert.match(events, /"operator":"mike"/);
    } finally { cleanup(); }
  });
});

