/**
 * Stage A regression — contract C1: swarm/audit CLI runs.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   - `roleos swarm` in a scaffolded dir exits 0 and prints a real run id.
 *   - Persisted swarm-run steps carry stage + domain metadata (domain-execution steps),
 *     and at least one step has isGate === true && userApproval === true.
 *   - `roleos swarm status` groups by stage.
 *   - `roleos audit` with a valid manifest creates Component Auditor steps equal to the
 *     manifest's component count (total steps = 2N + K + 3 for N components, K boundary clusters).
 *
 * Provenance: BACKEND-001..004 (unawaited createPersistentRun crash; manifest never wired
 * into run construction), verified live in verify-stage-a.json.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");

const SWARM_DIR = join(tmpdir(), `roleos-regr-swarm-${process.pid}`);
const AUDIT_DIR = join(tmpdir(), `roleos-regr-audit-${process.pid}`);

function run(args, cwd) {
  // execFileSync throws on non-zero exit, so a return implies exit 0.
  return execFileSync("node", [CLI, ...args], { encoding: "utf-8", cwd, timeout: 30000 });
}

function loadLatestRun(cwd) {
  const runsDir = join(cwd, ".claude", "runs");
  assert.ok(existsSync(runsDir), "run should be persisted under .claude/runs");
  const files = readdirSync(runsDir).filter(f => f.endsWith(".json"));
  assert.ok(files.length >= 1, "at least one persisted run file");
  files.sort();
  return JSON.parse(readFileSync(join(runsDir, files[files.length - 1]), "utf-8"));
}

function scaffoldFixtureRepo(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "test"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "swarm-fixture", version: "1.0.0" }));
  writeFileSync(join(dir, "src", "index.mjs"), "export const x = 1;\n");
  writeFileSync(join(dir, "test", "index.test.mjs"), "// fixture test file\n");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
}

describe("C1 — roleos swarm CLI", () => {
  let swarmOut;

  before(() => {
    scaffoldFixtureRepo(SWARM_DIR);
    // One real CLI invocation shared by the assertions below.
    swarmOut = run(["swarm"], SWARM_DIR);
  });

  after(() => {
    rmSync(SWARM_DIR, { recursive: true, force: true });
  });

  it("exits 0 and prints a real run id", () => {
    assert.match(swarmOut, /Run:\s+run-\d+/, "must print the persisted run id, not 'undefined'");
    assert.doesNotMatch(swarmOut, /Run:\s+undefined/);
  });

  it("persisted steps carry stage + domain metadata on domain-execution steps", () => {
    const persisted = loadLatestRun(SWARM_DIR);
    assert.equal(persisted.missionKey, "dogfood-swarm");

    const domainSteps = persisted.steps.filter(s => s.produces === "wave-report");
    assert.ok(domainSteps.length > 0, "swarm run must contain domain-execution steps");
    for (const s of domainSteps) {
      assert.ok(s.stage, `domain step (${s.role}) must carry a stage`);
      assert.ok(s.domain, `domain step (${s.role}) must carry a domain`);
    }
  });

  it("at least one step is a user-approval gate (isGate && userApproval)", () => {
    const persisted = loadLatestRun(SWARM_DIR);
    const gate = persisted.steps.find(s => s.isGate === true && s.userApproval === true);
    assert.ok(gate, "swarm run must contain at least one user-approval gate step");
  });

  it("step count scales with the generated manifest (domains × stages + gates + final 2)", () => {
    const manifest = JSON.parse(readFileSync(join(SWARM_DIR, "swarm-manifest.json"), "utf-8"));
    const persisted = loadLatestRun(SWARM_DIR);
    const domains = manifest.domains.length;
    const stages = (manifest.stages && manifest.stages.length) || 5;
    const expected = (domains * stages) + stages + 2; // per-stage agents + per-stage gate + synth + critic
    assert.equal(persisted.steps.length, expected,
      `expected ${expected} steps for ${domains} domains × ${stages} stages`);
  });

  it("swarm status groups by stage (no 'unknown' bucket)", () => {
    const out = run(["swarm", "status"], SWARM_DIR);
    assert.match(out, /health-a/, "status must show real stage buckets");
    assert.doesNotMatch(out, /unknown:/, "no step may fall into the 'unknown' stage bucket");
  });
});

describe("C1 — roleos audit CLI", () => {
  const N = 3; // components
  const K = 1; // boundary clusters

  before(() => {
    rmSync(AUDIT_DIR, { recursive: true, force: true });
    mkdirSync(AUDIT_DIR, { recursive: true });
    writeFileSync(join(AUDIT_DIR, "audit-manifest.json"), JSON.stringify({
      repo: "audit-fixture",
      version: "1.0.0",
      components: [
        { id: "core", owned_paths: ["src/core/**"] },
        { id: "api", owned_paths: ["src/api/**"] },
        { id: "cli", owned_paths: ["src/cli/**"] },
      ],
      boundaries: [
        { from: "core", to: "api" },
      ],
    }, null, 2));
  });

  after(() => {
    rmSync(AUDIT_DIR, { recursive: true, force: true });
  });

  it("exits 0, prints a real run id, and scales steps 2N + K + 3 from the manifest", () => {
    const out = run(["audit"], AUDIT_DIR);
    assert.match(out, /Run:\s+run-\d+/, "must print the persisted run id, not 'undefined'");
    assert.doesNotMatch(out, /Run:\s+undefined/);

    const persisted = loadLatestRun(AUDIT_DIR);
    assert.equal(persisted.missionKey, "deep-audit");

    const componentSteps = persisted.steps.filter(s => s.role === "Component Auditor");
    assert.equal(componentSteps.length, N,
      "one Component Auditor step per manifest component");
    assert.equal(persisted.steps.filter(s => s.role === "Test Truth Auditor").length, N);
    assert.equal(persisted.steps.filter(s => s.role === "Seam Auditor").length, K);
    assert.equal(persisted.steps.length, (2 * N) + K + 3,
      "total steps must follow the 2N + K + 3 dispatch formula");
  });
});
