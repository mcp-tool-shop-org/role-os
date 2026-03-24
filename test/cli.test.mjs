import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");
const TMP = join(__dirname, "..", ".test-sandbox");

function run(args, { input, cwd } = {}) {
  const opts = {
    encoding: "utf-8",
    cwd: cwd || TMP,
    timeout: 10000,
  };
  if (input) opts.input = input;
  return execFileSync("node", [CLI, ...args], opts);
}

describe("roleos CLI", () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  describe("help", () => {
    it("prints usage", () => {
      const out = run(["help"]);
      assert.match(out, /roleos v1\.0\.0/);
      assert.match(out, /roleos init/);
      assert.match(out, /roleos packet new/);
      assert.match(out, /roleos route/);
      assert.match(out, /roleos review/);
    });

    it("prints version", () => {
      const out = run(["--version"]);
      assert.match(out, /roleos v1\.0\.0/);
    });
  });

  describe("init", () => {
    it("scaffolds .claude/ with all spine files", () => {
      const out = run(["init"]);
      assert.match(out, /Created \(27\)/);

      const claude = join(TMP, ".claude");
      assert.ok(existsSync(join(claude, "handbook.md")));
      assert.ok(existsSync(join(claude, "agents", "core", "orchestrator.md")));
      assert.ok(existsSync(join(claude, "agents", "core", "critic-reviewer.md")));
      assert.ok(existsSync(join(claude, "schemas", "task-packet.md")));
      assert.ok(existsSync(join(claude, "policy", "done-definition.md")));
      assert.ok(existsSync(join(claude, "workflows", "ship-feature.md")));
      assert.ok(existsSync(join(claude, "context", "product-brief.md")));
    });

    it("skips existing files on re-run", () => {
      const out = run(["init"]);
      assert.match(out, /Skipped \(27/);
      assert.match(out, /already scaffolded/);
    });
  });

  describe("packet new", () => {
    it("creates a feature packet", () => {
      const input = "Test feature\nBuild the thing\nJust this\nNot that\nNone\nREADME.md\n";
      const out = run(["packet", "new", "feature"], { input });
      assert.match(out, /Created:.*test-feature\.md/);

      const packets = join(TMP, ".claude", "packets");
      assert.ok(existsSync(packets));
    });

    it("rejects unknown type", () => {
      assert.throws(
        () => run(["packet", "new", "bogus"]),
        /Unknown packet type/
      );
    });

    it("requires .claude/ to exist", () => {
      const emptyDir = join(TMP, "empty");
      mkdirSync(emptyDir, { recursive: true });
      assert.throws(
        () => run(["packet", "new", "feature"], { cwd: emptyDir, input: "x\nx\n\n\n\n\n" }),
        /Run 'roleos init' first/
      );
      rmSync(emptyDir, { recursive: true });
    });
  });

  describe("route", () => {
    it("detects feature type and shows chain", () => {
      const packetsDir = join(TMP, ".claude", "packets");
      const packetFiles = readdirSync(packetsDir);
      const packetFile = packetFiles.find(f => f.includes("test-feature"));
      assert.ok(packetFile, "test-feature packet should exist");

      const packetPath = join(".claude", "packets", packetFile);
      const out = run(["route", packetPath]);
      assert.match(out, /Detected type: feature/);
      assert.match(out, /Orchestrator/);
      assert.match(out, /Critic Reviewer/);
    });

    it("fails on missing packet", () => {
      assert.throws(
        () => run(["route", "nonexistent.md"]),
        /not found/
      );
    });
  });

  describe("review", () => {
    it("records an accept verdict", () => {
      const packetsDir = join(TMP, ".claude", "packets");
      const packetFiles = readdirSync(packetsDir).filter(f => !f.includes("verdict"));
      const packetFile = packetFiles[0];
      const packetPath = join(".claude", "packets", packetFile);

      const input = "Critic Reviewer\nAll checks passed\nDone\ny\ny\ny\ny\ny\n";
      const out = run(["review", packetPath, "accept"], { input });
      assert.match(out, /Verdict recorded/);

      // Verify verdict file exists
      const verdictFile = packetFile.replace(".md", ".verdict.md");
      assert.ok(existsSync(join(packetsDir, verdictFile)));

      // Verify verdict content
      const verdict = readFileSync(join(packetsDir, verdictFile), "utf-8");
      assert.match(verdict, /## Verdict\naccept/);
      assert.match(verdict, /Critic Reviewer/);
    });

    it("rejects unknown verdict", () => {
      assert.throws(
        () => run(["review", "file.md", "maybe"]),
        /Unknown verdict/
      );
    });
  });
});
