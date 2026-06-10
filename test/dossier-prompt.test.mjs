import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDispatchManifest } from "../src/dispatch.mjs";

// The dossier "Operating Posture" block is opt-in: roles with a dossier
// (src/role-dossiers.json) get their disposition + tuned-aptitude posture injected;
// roles without one are byte-identical to before.
describe("dossier operating-posture block", () => {
  const prompt = (name, pack = "feature") =>
    buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles: [{ role: { name, pack } }],
      cwd: ".",
    }).steps[0].systemPrompt;

  it("injects the operating posture for a role that has a dossier", () => {
    const p = prompt("Backend Engineer");
    assert.ok(p.includes("## Operating Posture"));
    assert.ok(p.includes("Disposition — **Builder**")); // backend-engineer's tuned disposition
    assert.ok(p.includes("Tuned profile:"));
    assert.ok(p.includes("Backend Engineer"));
  });

  it("omits the block for an unknown role, and the prompt still builds", () => {
    const p = prompt("Nonexistent Zorp Role");
    assert.ok(!p.includes("## Operating Posture"));
    assert.ok(p.includes("## Your Role Contract"));
    assert.ok(p.includes("## Handoff Requirements"));
  });

  it("reflects each role's own disposition", () => {
    assert.ok(prompt("Judge").includes("Disposition — **Skeptic**"));
    assert.ok(prompt("Security Reviewer").includes("Disposition — **Investigator**"));
    assert.ok(prompt("Critic Reviewer").includes("Disposition — **Perfectionist**"));
  });

  it("is deterministic for the same role", () => {
    assert.equal(prompt("Refactor Engineer"), prompt("Refactor Engineer"));
  });
});
