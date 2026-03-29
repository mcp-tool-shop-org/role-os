import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectRepoType,
  generateSwarmManifest,
  validateSwarmManifest,
} from "../src/swarm/domain-detect.mjs";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), "swarm-test-"));
}

function writePackage(dir, pkg) {
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
}

// ── detectRepoType ──────────────────────────────────────────────────────────

describe("detectRepoType", () => {
  it("detects Node CLI (package.json, no web deps)", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-cli", dependencies: {} });
    assert.equal(detectRepoType(dir), "cli");
    rmSync(dir, { recursive: true });
  });

  it("detects web app (react-dom dependency)", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-app", dependencies: { "react-dom": "^18.0.0" } });
    assert.equal(detectRepoType(dir), "web");
    rmSync(dir, { recursive: true });
  });

  it("detects desktop app (Tauri)", () => {
    const dir = makeTmpDir();
    const tauriDir = join(dir, "src-tauri");
    mkdirSync(tauriDir);
    writeFileSync(join(tauriDir, "tauri.conf.json"), "{}");
    writePackage(dir, { name: "my-desktop", dependencies: {} });
    assert.equal(detectRepoType(dir), "desktop");
    rmSync(dir, { recursive: true });
  });

  it("detects MCP server (@modelcontextprotocol/sdk)", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-mcp", dependencies: { "@modelcontextprotocol/sdk": "^1.0.0" } });
    assert.equal(detectRepoType(dir), "mcp");
    rmSync(dir, { recursive: true });
  });

  it("detects monorepo (workspaces)", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-mono", workspaces: ["packages/*"] });
    assert.equal(detectRepoType(dir), "monorepo");
    rmSync(dir, { recursive: true });
  });

  it("defaults to cli for empty directory", () => {
    const dir = makeTmpDir();
    assert.equal(detectRepoType(dir), "cli");
    rmSync(dir, { recursive: true });
  });

  it("detects Rust CLI (Cargo.toml without Tauri)", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "Cargo.toml"), "[package]\nname = \"my-cli\"\n");
    assert.equal(detectRepoType(dir), "cli");
    rmSync(dir, { recursive: true });
  });

  it("detects Python CLI (pyproject.toml)", () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "pyproject.toml"), "[project]\nname = \"my-cli\"\n");
    assert.equal(detectRepoType(dir), "cli");
    rmSync(dir, { recursive: true });
  });
});

// ── generateSwarmManifest ───────────────────────────────────────────────────

describe("generateSwarmManifest", () => {
  it("generates manifest for CLI repo with 3 domains", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-cli" });
    const manifest = generateSwarmManifest(dir);
    assert.equal(manifest.repoType, "cli");
    assert.equal(manifest.domains.length, 3);
    assert.equal(manifest.domains[0].id, "backend");
    assert.equal(manifest.domains[1].id, "tests");
    assert.equal(manifest.domains[2].id, "infra");
    rmSync(dir, { recursive: true });
  });

  it("generates manifest for web repo with 4 domains", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "my-web", dependencies: { "react-dom": "^18.0.0" } });
    const manifest = generateSwarmManifest(dir);
    assert.equal(manifest.repoType, "web");
    assert.equal(manifest.domains.length, 4);
    rmSync(dir, { recursive: true });
  });

  it("generates manifest for desktop repo with 5 domains", () => {
    const dir = makeTmpDir();
    const tauriDir = join(dir, "src-tauri");
    mkdirSync(tauriDir);
    writeFileSync(join(tauriDir, "tauri.conf.json"), "{}");
    writePackage(dir, { name: "my-desktop" });
    const manifest = generateSwarmManifest(dir);
    assert.equal(manifest.repoType, "desktop");
    assert.equal(manifest.domains.length, 5);
    rmSync(dir, { recursive: true });
  });

  it("includes stages array", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "test" });
    const manifest = generateSwarmManifest(dir);
    assert.deepEqual(manifest.stages, ["health-a", "health-b", "health-c", "feature"]);
    rmSync(dir, { recursive: true });
  });

  it("includes exclusiveOwnership config", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "test" });
    const manifest = generateSwarmManifest(dir);
    assert.equal(manifest.exclusiveOwnership.mode, "strict");
    rmSync(dir, { recursive: true });
  });

  it("allows repo type override", () => {
    const dir = makeTmpDir();
    writePackage(dir, { name: "test" });
    const manifest = generateSwarmManifest(dir, { repoType: "web" });
    assert.equal(manifest.repoType, "web");
    assert.equal(manifest.domains.length, 4);
    rmSync(dir, { recursive: true });
  });
});

// ── validateSwarmManifest ───────────────────────────────────────────────────

describe("validateSwarmManifest", () => {
  it("validates a correct manifest", () => {
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains: [
        { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**"] },
      ],
      stages: ["health-a"],
    });
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it("rejects null manifest", () => {
    const result = validateSwarmManifest(null);
    assert.equal(result.valid, false);
  });

  it("rejects empty domains", () => {
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains: [],
      stages: ["health-a"],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some(i => i.includes("No domains")));
  });

  it("rejects more than 10 domains", () => {
    const domains = Array.from({ length: 11 }, (_, i) => ({
      id: `d${i}`, role: "Swarm Backend Agent", patterns: [`${i}/**`],
    }));
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains,
      stages: ["health-a"],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some(i => i.includes("Too many")));
  });

  it("rejects duplicate domain IDs", () => {
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains: [
        { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**"] },
        { id: "backend", role: "Swarm Bridge Agent", patterns: ["lib/**"] },
      ],
      stages: ["health-a"],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some(i => i.includes("Duplicate")));
  });

  it("detects duplicate patterns across domains", () => {
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains: [
        { id: "a", role: "Swarm Backend Agent", patterns: ["src/**"] },
        { id: "b", role: "Swarm Bridge Agent", patterns: ["src/**"] },
      ],
      stages: ["health-a"],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some(i => i.includes("Pattern")));
  });

  it("rejects domain without patterns", () => {
    const result = validateSwarmManifest({
      version: "1.0",
      repo: "test",
      domains: [
        { id: "backend", role: "Swarm Backend Agent", patterns: [] },
      ],
      stages: ["health-a"],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.some(i => i.includes("no patterns")));
  });
});
