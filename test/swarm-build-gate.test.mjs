import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectBuildSystem } from "../src/swarm/build-gate.mjs";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), "build-gate-test-"));
}

// ── detectBuildSystem ───────────────────────────────────────────────────────

describe("detectBuildSystem", () => {
  it("detects Node.js with npm scripts", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      scripts: { lint: "eslint .", typecheck: "tsc --noEmit", test: "vitest" },
    }));
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "node");
    assert.equal(bs.lintCmd, "npm run lint");
    assert.equal(bs.typecheckCmd, "npm run typecheck");
    assert.equal(bs.testCmd, "npm test");
    rmSync(dir, { recursive: true });
  });

  it("handles missing scripts gracefully", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "node");
    assert.equal(bs.lintCmd, null);
    assert.equal(bs.typecheckCmd, null);
    assert.equal(bs.testCmd, null);
    rmSync(dir, { recursive: true });
  });

  it("detects Rust build system from Cargo.toml", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "Cargo.toml"), "[package]\nname = \"test\"\n");
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "rust");
    assert.ok(bs.lintCmd.includes("clippy"));
    assert.ok(bs.typecheckCmd.includes("cargo check"));
    assert.ok(bs.testCmd.includes("cargo test"));
    rmSync(dir, { recursive: true });
  });

  it("detects Python build system from pyproject.toml", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "pyproject.toml"), "[project]\nname = \"test\"\n");
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "python");
    assert.equal(bs.testCmd, "pytest");
    rmSync(dir, { recursive: true });
  });

  it("detects Python with ruff", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "pyproject.toml"), "[project]\nname = \"test\"\n\n[tool.ruff]\nline-length = 120\n");
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "python");
    assert.ok(bs.lintCmd.includes("ruff"));
    rmSync(dir, { recursive: true });
  });

  it("detects Go build system from go.mod", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "go.mod"), "module test\n\ngo 1.21\n");
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "go");
    assert.ok(bs.testCmd.includes("go test"));
    rmSync(dir, { recursive: true });
  });

  it("returns unknown for empty directory", () => {
    const dir = makeTmpDir();
    const bs = detectBuildSystem(dir);
    assert.equal(bs.type, "unknown");
    assert.equal(bs.lintCmd, null);
    assert.equal(bs.typecheckCmd, null);
    assert.equal(bs.testCmd, null);
    rmSync(dir, { recursive: true });
  });

  it("detects type-check script as alternative to typecheck", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      scripts: { "type-check": "tsc --noEmit" },
    }));
    const bs = detectBuildSystem(dir);
    assert.equal(bs.typecheckCmd, "npm run type-check");
    rmSync(dir, { recursive: true });
  });
});
