/**
 * Stage A regression — contract C4: specialist workload-quota sliding window.
 *
 * Contract (swarm-1781065638-70d5, wave 3):
 *   - State schema id becomes "roleos-specialist-state/v2".
 *   - recordDispatch(state, route) with route in {"specialist","claude"} records EVERY
 *     dispatch as { t, route } (trimmed to windowSize entries).
 *   - quotaStateFor counts route === "specialist" entries among the last windowSize.
 *   - v1 state files migrate tolerantly (old bare timestamps -> route "specialist").
 *   - At quota 1.0 over >2× windowSize dispatches the specialist share is SUSTAINED and the
 *     role RECOVERS after quota exhaustion (the v1 window never slid: permanent lockout after
 *     windowSize × quota dispatches).
 *
 * Provenance: SPECIALIST-001, verified live in verify-stage-a.json (quota 1.0 / window 200 /
 * 1000 dispatches -> 200 specialist + 800 claude under the v1 code, never recovering).
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  STATE_SCHEMA,
  emptyState,
  loadState,
  recordDispatch,
  quotaStateFor,
} from "../src/specialist/state.mjs";
import { gate } from "../src/specialist/gate.mjs";

const ROLE = "Verifier";
const FORCE_IN_DISTRIBUTION = { scoreFn: () => 1.0, oodFn: () => false };

function registryEntry(quota) {
  return {
    role: ROLE,
    workload_quota: quota,
    active_version: "v1",
    versions: [
      { id: "v1", certified_level: "L2", gate_threshold: 0.6 },
    ],
  };
}

/**
 * Simulate `total` dispatches wired exactly like dispatch.mjs: gate decides the route from
 * the current quota view; EVERY dispatch (both routes) is recorded back into the window.
 */
function simulate({ quota, windowSize, total }) {
  const state = emptyState();
  const entry = registryEntry(quota);
  const routes = [];
  for (let i = 0; i < total; i++) {
    const quotaState = quotaStateFor(state, ROLE, windowSize);
    const decision = gate({
      role: ROLE,
      input: {},
      registryEntry: entry,
      quotaState,
      haltState: { halted: false },
      classifier: FORCE_IN_DISTRIBUTION,
    });
    routes.push(decision.route);
    recordDispatch(state, decision.route, windowSize, 1_000_000 + i);
  }
  return { state, routes };
}

const TEMP_DIRS = [];
after(() => {
  for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
});

describe("C4 — state schema + dispatch records", () => {
  it("state schema id is roleos-specialist-state/v2", () => {
    assert.equal(STATE_SCHEMA, "roleos-specialist-state/v2");
    assert.equal(emptyState().schema, "roleos-specialist-state/v2");
  });

  it("recordDispatch records EVERY dispatch as { t, route } and trims to windowSize", () => {
    const state = emptyState();
    recordDispatch(state, "specialist", 3, 1000);
    recordDispatch(state, "claude", 3, 2000);
    recordDispatch(state, "specialist", 3, 3000);

    assert.deepEqual(state.dispatches, [
      { t: 1000, route: "specialist" },
      { t: 2000, route: "claude" },
      { t: 3000, route: "specialist" },
    ]);

    recordDispatch(state, "claude", 3, 4000);
    assert.equal(state.dispatches.length, 3, "window must trim to windowSize entries");
    assert.equal(state.dispatches[0].t, 2000, "oldest entry rolls out first");
  });

  it("quotaStateFor counts only route === 'specialist' among the last windowSize", () => {
    const state = emptyState();
    // 5 claude then 5 specialist, stored window large enough to keep all 10.
    for (let i = 0; i < 5; i++) recordDispatch(state, "claude", 100, 1000 + i);
    for (let i = 0; i < 5; i++) recordDispatch(state, "specialist", 100, 2000 + i);

    const full = quotaStateFor(state, ROLE, 10);
    assert.equal(full.used, 5, "specialist count over the whole window");
    assert.equal(full.window, 10);

    const tail = quotaStateFor(state, ROLE, 4);
    assert.equal(tail.used, 4, "only the last 4 entries (all specialist) are counted");
  });
});

describe("C4 — v1 state migration", () => {
  it("loads a v1 state file tolerantly: bare timestamps become specialist routes", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-regr-quota-"));
    TEMP_DIRS.push(dir);
    const path = join(dir, "specialist-state.json");
    writeFileSync(path, JSON.stringify({
      schema: "roleos-specialist-state/v1",
      roles: {
        [ROLE]: {
          dispatch_timestamps: [1000, 2000, 3000],
          probe_counter: 7,
          halt: null,
        },
      },
    }));

    const state = loadState(path); // must not throw
    assert.equal(state.schema, "roleos-specialist-state/v2");
    assert.equal(quotaStateFor(state, ROLE, 200).used, 3,
      "migrated bare timestamps count as specialist dispatches");
    assert.equal(state.roles[ROLE].probe_counter, 7, "role slots survive migration");
  });
});

describe("C4 — sustained share + post-exhaustion recovery", () => {
  it("quota 1.0 / window 200 / 1000 dispatches: share is sustained, not locked out", () => {
    const { routes } = simulate({ quota: 1.0, windowSize: 200, total: 1000 });
    const specTotal = routes.filter(r => r === "specialist").length;

    // v1 behavior was exactly 200 specialist then 800 claude. The rolled window keeps the
    // specialist at ~full share with only an occasional claude dispatch at the cap edge.
    assert.ok(specTotal >= 950,
      `specialist must keep receiving its share (got ${specTotal}/1000; v1 gave 200)`);

    // Recovery: AFTER the first quota_exhausted the specialist must still be dispatched.
    const firstClaude = routes.indexOf("claude");
    assert.ok(firstClaude !== -1, "the cap edge should produce at least one claude routing");
    const tail = routes.slice(-100);
    assert.ok(tail.filter(r => r === "specialist").length >= 90,
      "the final 100 dispatches must still be overwhelmingly specialist-routed (no lockout)");
  });

  it("quota 0.5 (live registry value) / window 200 / 2000 dispatches: ~half share, no permanent lockout", () => {
    const { routes } = simulate({ quota: 0.5, windowSize: 200, total: 2000 });
    const specTotal = routes.filter(r => r === "specialist").length;

    // v1 behavior: 100 specialist then permanent lockout (5%). The contract demands the
    // documented sustained ~0.5 share.
    assert.ok(specTotal >= 800 && specTotal <= 1100,
      `sustained share must approximate the 0.5 quota (got ${specTotal}/2000; v1 gave 100)`);

    const tail = routes.slice(-200);
    const tailSpec = tail.filter(r => r === "specialist").length;
    assert.ok(tailSpec >= 60,
      `specialist must still be routed near the end of the run (got ${tailSpec}/200 in the tail)`);
  });
});
