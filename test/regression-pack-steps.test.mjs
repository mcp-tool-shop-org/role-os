/**
 * Stage A regression — contract C2: pack-level run steps.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   - Every pack-level run step's role is an exact ROLE_CATALOG name (never a chainOrder
 *     prose fragment like "Normalizer (rebut)" or "[5 domain agents parallel]").
 *   - `produces` is resolved by ROLE LOOKUP into the PACK_HANDOFF_CONTRACTS flow,
 *     never by index alignment.
 *   - Final gate per pack: Critic Reviewer producing "verdict" for 9 packs,
 *     Judge producing "judge-report" for brainstorm.
 *
 * Provenance: BACKEND-005/006 (chainOrder prose parsed into pseudo-role steps; Critic
 * verdict step missing from pack runs), verified live in verify-stage-a.json.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPersistentRun } from "../src/run.mjs";
import { TEAM_PACKS } from "../src/packs.mjs";
import { ROLE_CATALOG } from "../src/route.mjs";
import { PACK_HANDOFF_CONTRACTS } from "../src/artifacts.mjs";

const TEST_CWD = join(tmpdir(), `roleos-regr-pack-steps-${process.pid}`);
const CATALOG_NAMES = new Set(ROLE_CATALOG.map(r => r.name));

function setup() {
  rmSync(TEST_CWD, { recursive: true, force: true });
  mkdirSync(TEST_CWD, { recursive: true });
}

function teardown() {
  rmSync(TEST_CWD, { recursive: true, force: true });
}

async function packRun(packKey) {
  return createPersistentRun(`pack-level regression run for ${packKey}`, TEST_CWD, {
    forcePack: packKey,
  });
}

describe("C2 — pack-level run steps", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("every step role in every pack run is an exact ROLE_CATALOG name", async () => {
    for (const packKey of Object.keys(TEAM_PACKS)) {
      const run = await packRun(packKey);
      assert.ok(run.steps.length > 0, `${packKey} run has steps`);
      for (const step of run.steps) {
        assert.ok(CATALOG_NAMES.has(step.role),
          `${packKey}: step role "${step.role}" must be an exact ROLE_CATALOG name`);
        // Known pre-fix pseudo-role shapes must never reappear.
        assert.doesNotMatch(step.role, /[()\[\]→×+]/,
          `${packKey}: step role "${step.role}" looks like chainOrder prose`);
      }
    }
  });

  it("produces is resolved by role lookup into the handoff flow, never index alignment", async () => {
    for (const packKey of Object.keys(TEAM_PACKS)) {
      const flow = PACK_HANDOFF_CONTRACTS[packKey]?.flow || [];
      const run = await packRun(packKey);
      for (const step of run.steps) {
        const flowEntries = flow.filter(f => f.role === step.role);
        if (flowEntries.length === 0) continue; // role not in the flow — produces is a fallback
        assert.ok(flowEntries.some(f => f.produces === step.produces),
          `${packKey}: ${step.role} produces "${step.produces}" but the handoff flow ` +
          `defines [${flowEntries.map(f => f.produces).join(", ")}] for that role`);
      }
    }
  });

  it("final gate is Critic Reviewer producing verdict (Judge/judge-report for brainstorm)", async () => {
    for (const packKey of Object.keys(TEAM_PACKS)) {
      const run = await packRun(packKey);
      const last = run.steps[run.steps.length - 1];
      if (packKey === "brainstorm") {
        assert.equal(last.role, "Judge",
          "brainstorm's designed verdict-bearer is the Judge");
        assert.equal(last.produces, "judge-report");
      } else {
        assert.equal(last.role, "Critic Reviewer",
          `${packKey}: pack run must end with the Critic Reviewer gate`);
        assert.equal(last.produces, "verdict",
          `${packKey}: the final gate must produce the verdict artifact`);
      }
    }
  });

  it("a pack-level run reached via natural entry scoring also gets catalog-valid steps", async () => {
    // "explore possibilities for X" scores the brainstorm pack at medium confidence —
    // the natural (non-forced) pack-level entry path proven in the wave-2 repro.
    const run = await createPersistentRun(
      "explore possibilities for the inventory system", TEST_CWD);
    assert.ok(run.steps.length > 0);
    for (const step of run.steps) {
      assert.ok(CATALOG_NAMES.has(step.role),
        `natural-entry step role "${step.role}" must be an exact ROLE_CATALOG name`);
    }
  });
});
