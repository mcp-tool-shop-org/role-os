import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  consultBudgetForManifest,
  budgetInputForStep,
  deterministicBudget,
  budgetAgree,
  budgetConsultEnabled,
  BUDGET_ROLE,
} from "../src/specialist/budget-consult.mjs";

const FORCE_SPECIALIST = { scoreFn: () => 1.0, oodFn: () => false };

const REGISTRY_SPECIALISTS = [
  {
    role: BUDGET_ROLE,
    backend_url: "http://localhost:8000",
    fallback: "claude",
    workload_quota: 1.0,
    active_version: "v1",
    versions: [
      {
        id: "v1",
        adapter_id: "budgeter-14b600-soup",
        base_model: "Qwen/Qwen3-14B",
        gate_threshold: 0.6,
        certified_level: "L5",
        exam_hash: "fixture-exam-hash",
        field_audit_window: 200,
        created_at: "2026-06-05T00:00:00Z",
        ood_floor: 0.4,
      },
    ],
  },
];

// Every mkdtemp dir is tracked and removed at the end of the file's run.
const FIXTURE_DIRS = [];
after(() => {
  for (const dir of FIXTURE_DIRS) rmSync(dir, { recursive: true, force: true });
});

function fixturePaths(specialists = REGISTRY_SPECIALISTS) {
  const dir = mkdtempSync(join(tmpdir(), "roleos-budget-"));
  FIXTURE_DIRS.push(dir);
  const registry = join(dir, "specialists.json");
  writeFileSync(registry, JSON.stringify({ schema: "roleos-specialist-registry/v1", specialists }));
  return { registry, state: join(dir, "state.json"), events: join(dir, "events.jsonl") };
}

function fakeManifest() {
  return {
    runId: "run-test",
    steps: [
      { stepIndex: 0, packetId: "run-test-step-0", role: "Researcher", systemPrompt: "x".repeat(7000), maxTurns: 10 },
      { stepIndex: 1, packetId: "run-test-step-1", role: "Writer", systemPrompt: "y".repeat(3500), maxTurns: 4 },
    ],
  };
}

const okHttp = (spend) => async () => ({
  ok: true,
  status: 200,
  error: null,
  json: {
    verdict: { spend_weighted: spend },
    score: 0.9,
    adapter_id: "budgeter-14b600-soup",
    base_model: "Qwen/Qwen3-14B",
    duration_ms: 5,
  },
});
const downHttp = async () => ({ ok: false, status: 0, json: null, error: "ECONNREFUSED" });
const throwHttp = async () => {
  throw new Error("boom");
};

describe("budget-consult helpers", () => {
  it("deterministicBudget = max(ctx*1.5, 50000)", () => {
    assert.equal(deterministicBudget({ context_tokens: 20000 }).spend_weighted, 50000); // 30000 < floor
    assert.equal(deterministicBudget({ context_tokens: 100000 }).spend_weighted, 150000);
    assert.equal(deterministicBudget({ context_tokens: 1 }).source, "deterministic-baseline");
  });

  it("budgetInputForStep derives ctx tokens + output estimate", () => {
    const inp = budgetInputForStep({ systemPrompt: "z".repeat(3500), maxTurns: 5 }, 3);
    assert.equal(inp.context_tokens, 1000); // 3500 / 3.5
    assert.equal(inp.steps, 3);
    assert.equal(inp.output_estimate, 1500); // 5 * 300
  });

  it("budgetAgree: specialist within 25% of the baseline", () => {
    assert.equal(budgetAgree({ spend_weighted: 120 }, { spend_weighted: 100 }), true);
    assert.equal(budgetAgree({ spend_weighted: 200 }, { spend_weighted: 100 }), false);
    assert.equal(budgetAgree({ verdict: { spend_weighted: 110 } }, { spend_weighted: 100 }), true);
  });

  it("budgetConsultEnabled reads the flag (default OFF)", () => {
    const prev = process.env.ROLEOS_BUDGET_CONSULT;
    try {
      delete process.env.ROLEOS_BUDGET_CONSULT;
      assert.equal(budgetConsultEnabled(), false);
      process.env.ROLEOS_BUDGET_CONSULT = "1";
      assert.equal(budgetConsultEnabled(), true);
    } finally {
      // Restore even when an assertion throws, so env state never leaks to later tests.
      if (prev === undefined) delete process.env.ROLEOS_BUDGET_CONSULT;
      else process.env.ROLEOS_BUDGET_CONSULT = prev;
    }
  });
});

describe("consultBudgetForManifest", () => {
  it("is a no-op when disabled (the default — production dispatch unchanged)", async () => {
    const m = fakeManifest();
    const out = await consultBudgetForManifest(m, { enabled: false });
    assert.equal(out, m);
    assert.ok(!m.steps[0].budgetReceipt && !m.steps[0].budgetForecast);
  });

  it("attaches a specialist forecast + receipt per step when enabled", async () => {
    const m = fakeManifest();
    await consultBudgetForManifest(m, {
      enabled: true,
      paths: fixturePaths(),
      nowIso: "2026-06-05T18:00:00Z",
      httpFn: okHttp(42000),
      classifier: FORCE_SPECIALIST,
    });
    for (const step of m.steps) {
      assert.equal(step.budgetReceipt.schema, "roleos-specialist-receipt/v1");
      assert.equal(step.budgetReceipt.role, BUDGET_ROLE);
      assert.equal(step.budgetReceipt.source, "specialist");
      assert.equal(step.budgetForecast.spend_weighted, 42000);
    }
  });

  it("fails open to the DETERMINISTIC baseline when the backend is down", async () => {
    const m = fakeManifest();
    await consultBudgetForManifest(m, {
      enabled: true,
      paths: fixturePaths(),
      nowIso: "2026-06-05T18:00:00Z",
      httpFn: downHttp,
      classifier: FORCE_SPECIALIST,
    });
    for (const step of m.steps) {
      assert.equal(step.budgetReceipt.source, "claude"); // gate routed specialist; call failed -> claudeFn
      assert.equal(step.budgetForecast.source, "deterministic-baseline");
    }
  });

  it("fails open to deterministic when no specialist is registered", async () => {
    const m = fakeManifest();
    await consultBudgetForManifest(m, {
      enabled: true,
      paths: fixturePaths([]),
      nowIso: "2026-06-05T18:00:00Z",
    });
    for (const step of m.steps) {
      assert.equal(step.budgetForecast.source, "deterministic-baseline");
    }
  });

  it("NEVER throws — an unexpected error leaves a receipt, dispatch unaffected", async () => {
    const m = fakeManifest();
    await assert.doesNotReject(
      consultBudgetForManifest(m, {
        enabled: true,
        paths: fixturePaths(),
        nowIso: "2026-06-05T18:00:00Z",
        httpFn: throwHttp,
        classifier: FORCE_SPECIALIST,
      })
    );
    for (const step of m.steps) {
      assert.ok(step.budgetReceipt); // consult-error or failed-open — never undefined
    }
  });
});
