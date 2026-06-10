/**
 * Stage A regression — contract C3: reject-verdict escalation routing.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   A reject verdict in reviewCommand escalates to the role parsed from the packet's
 *   "## Assigned Role" section (the PRODUCER), falling back to "Orchestrator" when the
 *   section is absent — never to the reviewer.
 *
 * Provenance: BACKEND-008 (resolveRejected was handed the reviewer, so every default-path
 * reject routed the retry to the reviewer themselves), verified live in verify-stage-a.json.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "bin", "roleos.mjs");
const TEST_DIR = join(tmpdir(), `roleos-regr-review-${process.pid}`);

// Interactive answers, in prompt order:
//   Reviewer role [Critic Reviewer] -> default
//   Reason                          -> generic reject reason (routes via the "previous" rule)
//   Required corrections            -> text
//   Next owner / 5 contract checks  -> defaults
const STDIN_ANSWERS = "\nthe output is sloppy and unconvincing\nredo with evidence\n\n\n\n\n\n\n";

function reviewReject(packetPath) {
  // Prompts write to stderr; stdout carries the verdict + escalation block only.
  return execFileSync("node", [CLI, "review", packetPath, "reject"], {
    encoding: "utf-8",
    cwd: TEST_DIR,
    timeout: 15000,
    input: STDIN_ANSWERS,
  });
}

describe("C3 — reject verdict escalation routing", () => {
  before(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("routes the retry to the packet's Assigned Role (the producer), never the reviewer", () => {
    const packetPath = join(TEST_DIR, "packet-with-role.md");
    writeFileSync(packetPath, [
      "# Work Packet",
      "",
      "## Task ID",
      "regr-c3-1",
      "",
      "## Assigned Role",
      "Backend Engineer",
      "",
      "## Objective",
      "Implement the save handler fix.",
      "",
    ].join("\n"));

    const out = reviewReject(packetPath);
    assert.match(out, /Escalation \(auto-routed\):/);
    assert.match(out, /→ Backend Engineer/,
      "the escalation target must be the producing role from '## Assigned Role'");
    assert.doesNotMatch(out, /→ Critic Reviewer/,
      "the escalation must never route the retry to the reviewer");
  });

  it("falls back to Orchestrator when the packet has no Assigned Role section", () => {
    const packetPath = join(TEST_DIR, "packet-without-role.md");
    writeFileSync(packetPath, [
      "# Work Packet",
      "",
      "## Task ID",
      "regr-c3-2",
      "",
      "## Objective",
      "Mystery work with no assigned producer.",
      "",
    ].join("\n"));

    const out = reviewReject(packetPath);
    assert.match(out, /Escalation \(auto-routed\):/);
    assert.match(out, /→ Orchestrator/,
      "absent producer must fall back to Orchestrator");
    assert.doesNotMatch(out, /→ Critic Reviewer/,
      "the escalation must never route the retry to the reviewer");
  });
});
