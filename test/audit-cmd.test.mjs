/**
 * Audit CLI tests — verifies the roleos audit command.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { validateManifest } from "../src/audit-cmd.mjs";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "roleos.mjs");
const TEST_DIR = join(__dirname, "..", ".test-audit-cmd");

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
}

function run(args) {
  return execSync(`node "${BIN}" ${args}`, {
    cwd: TEST_DIR,
    encoding: "utf-8",
    timeout: 10000,
  });
}

// ── CLI wiring ───────────────────────────────────────────────────────────────

describe("roleos audit CLI", () => {
  it("audit help prints usage", () => {
    // Run from repo root (no need for test dir)
    const output = execSync(`node "${BIN}" audit help`, { encoding: "utf-8" });
    assert.ok(output.includes("roleos audit"), "Should contain audit usage");
    assert.ok(output.includes("manifest"), "Should mention manifest");
    assert.ok(output.includes("verify"), "Should mention verify");
  });

  it("help includes audit commands", () => {
    const output = execSync(`node "${BIN}" help`, { encoding: "utf-8" });
    assert.ok(output.includes("roleos audit"), "Main help should list audit");
  });
});

// ── Manifest validation ──────────────────────────────────────────────────────

describe("validateManifest", () => {
  it("passes for valid manifest", () => {
    const manifest = {
      components: [
        { id: "core", owned_paths: ["src/core.mjs"] },
      ],
      boundaries: [],
    };
    const issues = validateManifest(manifest);
    assert.equal(issues.length, 0);
  });

  it("rejects manifest without components", () => {
    const issues = validateManifest({});
    assert.ok(issues.length > 0);
    assert.ok(issues.some(i => i.includes("components")));
  });

  it("rejects empty components array", () => {
    const issues = validateManifest({ components: [], boundaries: [] });
    assert.ok(issues.some(i => i.includes("empty")));
  });

  it("rejects component without id", () => {
    const issues = validateManifest({
      components: [{ owned_paths: ["src/foo.mjs"] }],
      boundaries: [],
    });
    assert.ok(issues.some(i => i.includes("id")));
  });

  it("rejects component without owned_paths", () => {
    const issues = validateManifest({
      components: [{ id: "foo" }],
      boundaries: [],
    });
    assert.ok(issues.some(i => i.includes("owned_paths")));
  });

  it("rejects manifest without boundaries", () => {
    const issues = validateManifest({
      components: [{ id: "foo", owned_paths: ["src/foo.mjs"] }],
    });
    assert.ok(issues.some(i => i.includes("boundaries")));
  });
});

// ── Manifest generation ──────────────────────────────────────────────────────

describe("audit manifest --generate", () => {
  afterEach(cleanup);

  it("generates a skeleton manifest", () => {
    mkdirSync(join(TEST_DIR, "src"), { recursive: true });
    writeFileSync(join(TEST_DIR, "src", "core.mjs"), "export const x = 1;");
    writeFileSync(join(TEST_DIR, "src", "utils.mjs"), "export const y = 2;");

    const output = run("audit manifest --generate");
    assert.ok(output.includes("Generated skeleton"));

    const manifest = JSON.parse(readFileSync(join(TEST_DIR, "audit-manifest.json"), "utf-8"));
    assert.ok(Array.isArray(manifest.components));
    assert.ok(manifest.components.length >= 2);
    assert.ok(manifest.components.some(c => c.id === "core"));
    assert.ok(manifest.components.some(c => c.id === "utils"));
  });
});

// ── Verify command ───────────────────────────────────────────────────────────

describe("audit verify", () => {
  afterEach(cleanup);

  it("fails when no manifest exists", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    try {
      run("audit verify");
      assert.fail("Should have exited non-zero");
    } catch (err) {
      assert.ok(err.stderr?.includes("No audit-manifest.json") || err.stdout?.includes("No audit-manifest.json"));
    }
  });

  it("passes for valid manifest with existing paths", () => {
    mkdirSync(join(TEST_DIR, "src"), { recursive: true });
    writeFileSync(join(TEST_DIR, "src", "core.mjs"), "export const x = 1;");
    const manifest = {
      components: [{ id: "core", owned_paths: ["src/core.mjs"] }],
      boundaries: [],
    };
    writeFileSync(join(TEST_DIR, "audit-manifest.json"), JSON.stringify(manifest));

    const output = run("audit verify");
    assert.ok(output.includes("[PASS]"));
    assert.ok(output.includes("Audit infrastructure verified"));
  });
});
