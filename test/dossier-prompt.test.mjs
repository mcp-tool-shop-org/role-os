import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDispatchManifest } from "../src/dispatch.mjs";
import { deriveProfile, derivePriorities, renderDossierBlock } from "../src/dossier-block.mjs";

// The dossier "Operating Posture" block is opt-in: roles with a dossier
// (src/role-dossiers.json) get their operating-profile instruction + derived priorities +
// tuned-aptitude posture injected; roles without one are byte-identical to before.
describe("dossier operating-posture block (schema v0.2)", () => {
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
    assert.ok(p.includes("Profile — **Builder**")); // backend-engineer's tuned profile
    assert.ok(p.includes("Tuned posture:"));
    assert.ok(p.includes("Backend Engineer"));
  });

  it("omits the block for an unknown role, and the prompt still builds", () => {
    const p = prompt("Nonexistent Zorp Role");
    assert.ok(!p.includes("## Operating Posture"));
    assert.ok(p.includes("## Your Role Contract"));
    assert.ok(p.includes("## Handoff Requirements"));
  });

  it("reflects each role's own operating profile", () => {
    assert.ok(prompt("Judge").includes("Profile — **Skeptic**"));
    assert.ok(prompt("Security Reviewer").includes("Profile — **Investigator**"));
    assert.ok(prompt("Critic Reviewer").includes("Profile — **Perfectionist**"));
  });

  it("injects derived priorities for high-set aptitudes", () => {
    // Judge: rigor 5, skepticism 5, candor 4 -> claim verification before evidence depth
    // (tie at 5 broken by canonical axis order: rigor first), candor last.
    const p = prompt("Judge");
    assert.ok(p.includes("Priorities: evidence depth; claim verification; explained reasoning."));
  });

  it("is deterministic for the same role", () => {
    assert.equal(prompt("Refactor Engineer"), prompt("Refactor Engineer"));
  });
});

describe("deriveProfile / derivePriorities (the shared honesty source)", () => {
  it("derives priorities from aptitudes only — highest first, axis order breaking ties", () => {
    assert.deepEqual(
      derivePriorities({ rigor: 4, pace: 0, range: 0, skepticism: 5, autonomy: 0, candor: 4 }),
      ["claim verification", "evidence depth", "explained reasoning"],
    );
    assert.deepEqual(derivePriorities({ rigor: 3, pace: 3, range: 3, skepticism: 3, autonomy: 3, candor: 3 }), []);
    assert.deepEqual(derivePriorities(null), []);
  });

  it("reads v0.2 (operatingProfile) and falls back to v0.1 (disposition)", () => {
    const v02 = deriveProfile({ operatingProfile: { active: "Skeptic", prompt_delta: "refute" }, aptitudes: { rigor: 5 } });
    assert.equal(v02.archetype, "Skeptic");
    assert.equal(v02.promptDelta, "refute");
    const v01 = deriveProfile({ disposition: { active: "Builder", prompt_delta: "build" }, aptitudes: {} });
    assert.equal(v01.archetype, "Builder");
    assert.equal(v01.promptDelta, "build");
    assert.deepEqual(deriveProfile(null).priorities, []);
  });

  it("renderDossierBlock output contains nothing but profile, priorities, and posture", () => {
    const block = renderDossierBlock("Judge");
    assert.ok(block.startsWith("## Operating Posture"));
    const lines = block.split("\n").slice(1);
    for (const line of lines) {
      assert.ok(
        /^(Profile — \*\*|Priorities: |Tuned posture: )/.test(line),
        `unexpected line in injected block: ${line}`,
      );
    }
  });
});

describe("dossier data honesty (v0.2 contract)", () => {
  it("ships no authored techniques and no fabricated grade bands", async () => {
    const { readFileSync } = await import("node:fs");
    const data = JSON.parse(readFileSync(new URL("../src/role-dossiers.json", import.meta.url), "utf8"));
    const ids = Object.keys(data);
    assert.ok(ids.length >= 64);
    for (const id of ids) {
      const d = data[id];
      assert.deepEqual(d.techniques, [], `${id}: techniques must be earned, never authored`);
      assert.equal(d.grade.basis, "assessed", `${id}: no certification pipeline has run yet`);
      assert.equal(d.grade.band, null, `${id}: band must stay null until measured`);
      assert.equal(d.reps.count, 0, `${id}: reps count from verified events only`);
      assert.deepEqual(d.reps.events, [], `${id}: no verified events recorded yet`);
      assert.ok(d.operatingProfile?.active, `${id}: operating profile present`);
    }
  });
});
