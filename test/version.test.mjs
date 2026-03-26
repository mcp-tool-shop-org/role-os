"use strict";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf-8");

describe("version consistency", () => {
  it("package.json version is semver", () => {
    assert.match(pkg.version, /^\d+\.\d+\.\d+/);
  });

  it("package.json version is >= 1.0.0", () => {
    const major = parseInt(pkg.version.split(".")[0], 10);
    assert.ok(major >= 1, `expected major >= 1, got ${major}`);
  });

  it("CHANGELOG mentions current version", () => {
    assert.ok(
      changelog.includes(pkg.version),
      `CHANGELOG missing ${pkg.version}`
    );
  });

  it("roleos help prints the version", () => {
    const out = execFileSync("node", [join(root, "bin/roleos.mjs"), "help"], {
      encoding: "utf-8",
    });
    assert.ok(out.includes(pkg.version), `expected ${pkg.version} in help output`);
  });
});
