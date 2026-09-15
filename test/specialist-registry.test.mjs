import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadRegistry,
  saveRegistry,
  validateRegistry,
  resolveActiveVersion,
  emptyRegistry,
  isClaudeFamily,
  REGISTRY_SCHEMA,
} from "../src/specialist/registry.mjs";

// ── Fixtures ───────────────────────────────────────────────────────────────────────────────────

function freshVersion(over = {}) {
  return {
    id: "v1",
    adapter_id: "test-adapter-2026-06-04",
    base_model: "Qwen/Qwen3-7B",
    gate_threshold: 0.75,
    certified_level: "L1",
    exam_hash: "abcd1234",
    field_audit_window: 200,
    created_at: "2026-06-04T00:00:00Z",
    ...over,
  };
}

function freshEntry(over = {}) {
  return {
    role: "Verifier",
    backend_url: "http://localhost:8000",
    fallback: "claude",
    workload_quota: 0.7,
    active_version: "v1",
    versions: [freshVersion()],
    ...over,
  };
}

function freshRegistry(specialists = [freshEntry()]) {
  return { schema: REGISTRY_SCHEMA, specialists };
}

function tmpFile(name = "specialists.json") {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-reg-"));
  const path = join(dir, name);
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ── loadRegistry: missing file is empty, not error ────────────────────────────────────────────

describe("loadRegistry", () => {
  it("returns an empty registry when the file does not exist (default state, no error)", () => {
    const { registry, byRole, errors } = loadRegistry("/nonexistent/path/specialists.json");
    assert.deepEqual(registry.specialists, []);
    assert.equal(byRole.size, 0);
    assert.deepEqual(errors, []);
  });

  it("reports parse errors and returns empty byRole", () => {
    const { path, cleanup } = tmpFile();
    try {
      writeFileSync(path, "{ not json", "utf8");
      const { byRole, errors } = loadRegistry(path);
      assert.equal(byRole.size, 0);
      assert.equal(errors.length, 1);
      assert.match(errors[0], /parse error/);
    } finally { cleanup(); }
  });

  it("loads a valid registry into a byRole Map", () => {
    const { path, cleanup } = tmpFile();
    try {
      writeFileSync(path, JSON.stringify(freshRegistry()), "utf8");
      const { byRole, errors } = loadRegistry(path);
      assert.deepEqual(errors, []);
      assert.equal(byRole.size, 1);
      assert.equal(byRole.get("Verifier").backend_url, "http://localhost:8000");
    } finally { cleanup(); }
  });
});

// ── R1: same-family base is refused ───────────────────────────────────────────────────────────

describe("validateRegistry — R1 (cross-family base)", () => {
  it("rejects a Claude-family base_model — claude-* prefix", () => {
    const reg = freshRegistry([freshEntry({ versions: [freshVersion({ base_model: "claude-haiku-4-5" })] })]);
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R1.*Claude-family/.test(e)));
  });

  it("rejects an anthropic/ prefix", () => {
    const reg = freshRegistry([freshEntry({ versions: [freshVersion({ base_model: "anthropic/claude-opus" })] })]);
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R1/.test(e)));
  });

  // Production ids named by F-e760d961. Prefix-only startswith("claude-"|"anthropic/"|"anthropic.")
  // misses the first three; a test file that only pins claude-* / anthropic/ stays green on revert.
  const PRODUCTION_CLAUDE_IDS = [
    "us.anthropic.claude-3-5-sonnet",
    "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
    "projects/demo/locations/us-central1/publishers/anthropic/models/claude-3-5-sonnet",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
  ];

  it("rejects Bedrock geo, ARN, Vertex publisher, and anthropic. dotted ids", () => {
    for (const base_model of PRODUCTION_CLAUDE_IDS) {
      const reg = freshRegistry([freshEntry({ versions: [freshVersion({ base_model })] })]);
      const { ok, errors } = validateRegistry(reg);
      assert.equal(ok, false, `expected R1 reject for ${base_model}`);
      assert.ok(
        errors.some((e) => /R1.*Claude-family/.test(e)),
        `expected R1 Claude-family error for ${base_model}, got: ${errors.join(" | ")}`,
      );
    }
  });

  it("accepts Qwen3 / Gemma / Mistral", () => {
    for (const model of ["Qwen/Qwen3-7B", "google/gemma-3-9b", "mistralai/Mistral-7B"]) {
      const reg = freshRegistry([freshEntry({ versions: [freshVersion({ base_model: model })] })]);
      const { ok } = validateRegistry(reg);
      assert.equal(ok, true, `expected ${model} to pass R1`);
    }
  });

  it("isClaudeFamily helper", () => {
    assert.equal(isClaudeFamily("claude-opus-4-7"), true);
    assert.equal(isClaudeFamily("Claude-Opus-4-7"), true); // case-insensitive
    assert.equal(isClaudeFamily("Qwen/Qwen3-7B"), false);
    assert.equal(isClaudeFamily(undefined), false);
    for (const id of PRODUCTION_CLAUDE_IDS) {
      assert.equal(isClaudeFamily(id), true, `expected ${id} to be Claude-family`);
    }
  });

  it("META: startswith(claude-|anthropic/|anthropic.) misses geo/ARN/Vertex — reverting isClaudeFamily goes RED", () => {
    function prefixOnly(baseModel) {
      if (typeof baseModel !== "string") return false;
      const m = baseModel.toLowerCase();
      return m.startsWith("claude-") || m.startsWith("anthropic/") || m.startsWith("anthropic.");
    }
    const bypass = PRODUCTION_CLAUDE_IDS.filter((id) => !prefixOnly(id));
    assert.deepEqual(bypass, [
      "us.anthropic.claude-3-5-sonnet",
      "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
      "projects/demo/locations/us-central1/publishers/anthropic/models/claude-3-5-sonnet",
    ]);
    for (const id of bypass) {
      assert.equal(isClaudeFamily(id), true, `infix matcher must catch ${id}; reverting to startswith would go RED here`);
    }
  });
});

// ── R2: uncertified active_version is refused ─────────────────────────────────────────────────

describe("validateRegistry — R2 (uncertified active_version)", () => {
  it("rejects active_version pointing at an L0 version", () => {
    const reg = freshRegistry([freshEntry({
      active_version: "v1",
      versions: [freshVersion({ certified_level: "L0" })],
    })]);
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R2.*L0/.test(e)));
  });

  it("accepts active_version: null (an all-L0 registry is valid; it just routes everything to Claude)", () => {
    const reg = freshRegistry([freshEntry({
      active_version: null,
      versions: [freshVersion({ certified_level: "L0" })],
    })]);
    const { ok } = validateRegistry(reg);
    assert.equal(ok, true);
  });
});

// ── R3: id collisions inside versions[] ────────────────────────────────────────────────────────

describe("validateRegistry — R3 (id collisions)", () => {
  it("rejects two versions with the same id within a role", () => {
    const reg = freshRegistry([freshEntry({
      active_version: "v1",
      versions: [freshVersion({ id: "v1" }), freshVersion({ id: "v1", adapter_id: "different" })],
    })]);
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R3.*duplicate/.test(e)));
  });

  it("accepts different ids", () => {
    const reg = freshRegistry([freshEntry({
      active_version: "v1",
      versions: [freshVersion({ id: "v1" }), freshVersion({ id: "v2" })],
    })]);
    assert.equal(validateRegistry(reg).ok, true);
  });
});

// ── R4: dangling active_version ────────────────────────────────────────────────────────────────

describe("validateRegistry — R4 (dangling active_version)", () => {
  it("rejects an active_version that doesn't appear in versions[]", () => {
    const reg = freshRegistry([freshEntry({ active_version: "ghost", versions: [freshVersion({ id: "v1" })] })]);
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R4.*not found/.test(e)));
  });
});

// ── R5: gate_threshold out of range ────────────────────────────────────────────────────────────

describe("validateRegistry — R5 (gate_threshold range)", () => {
  it("rejects gate_threshold below 0", () => {
    const reg = freshRegistry([freshEntry({ versions: [freshVersion({ gate_threshold: -0.1 })] })]);
    assert.equal(validateRegistry(reg).ok, false);
  });
  it("rejects gate_threshold above 1", () => {
    const reg = freshRegistry([freshEntry({ versions: [freshVersion({ gate_threshold: 1.1 })] })]);
    assert.equal(validateRegistry(reg).ok, false);
  });
  it("accepts gate_threshold at 0 and 1", () => {
    for (const t of [0, 0.5, 1]) {
      const reg = freshRegistry([freshEntry({ versions: [freshVersion({ gate_threshold: t })] })]);
      assert.equal(validateRegistry(reg).ok, true, `expected ${t} to pass R5`);
    }
  });
});

// ── R6: workload_quota out of range ────────────────────────────────────────────────────────────

describe("validateRegistry — R6 (workload_quota range)", () => {
  it("rejects workload_quota of 0", () => {
    const reg = freshRegistry([freshEntry({ workload_quota: 0 })]);
    assert.equal(validateRegistry(reg).ok, false);
  });
  it("rejects workload_quota above 1", () => {
    const reg = freshRegistry([freshEntry({ workload_quota: 1.5 })]);
    assert.equal(validateRegistry(reg).ok, false);
  });
  it("accepts workload_quota in (0, 1]", () => {
    for (const q of [0.01, 0.5, 1]) {
      const reg = freshRegistry([freshEntry({ workload_quota: q })]);
      assert.equal(validateRegistry(reg).ok, true, `expected ${q} to pass R6`);
    }
  });
});

// ── R7: schema major version mismatch ──────────────────────────────────────────────────────────

describe("validateRegistry — R7 (schema)", () => {
  it("rejects a different schema id", () => {
    const reg = { schema: "roleos-specialist-registry/v0", specialists: [] };
    const { ok, errors } = validateRegistry(reg);
    assert.equal(ok, false);
    assert.ok(errors.some((e) => /R7/.test(e)));
  });
});

// ── Reports all errors, not just the first ────────────────────────────────────────────────────

describe("validateRegistry — totality", () => {
  it("reports all violations in one pass", () => {
    const reg = {
      schema: "wrong",
      specialists: [
        freshEntry({
          fallback: "openai",
          workload_quota: 1.5,
          active_version: "v1",
          versions: [freshVersion({ base_model: "claude-opus", gate_threshold: 2 })],
        }),
      ],
    };
    const { errors } = validateRegistry(reg);
    // R7 + fallback + R6 + R1 + R5 = 5 distinct messages
    assert.ok(errors.length >= 5, `expected >=5 errors, got ${errors.length}: ${errors.join(" | ")}`);
  });
});

// ── resolveActiveVersion ──────────────────────────────────────────────────────────────────────

describe("resolveActiveVersion", () => {
  it("returns the active version object when set", () => {
    const v = resolveActiveVersion(freshEntry());
    assert.equal(v.id, "v1");
  });
  it("returns null when active_version is null", () => {
    const v = resolveActiveVersion(freshEntry({ active_version: null }));
    assert.equal(v, null);
  });
  it("throws REGISTRY_DANGLING_POINTER when the pointer is invalid", () => {
    assert.throws(
      () => resolveActiveVersion({ ...freshEntry({ active_version: "ghost" }) }),
      (err) => err.code === "REGISTRY_DANGLING_POINTER",
    );
  });
});

// ── saveRegistry refuses to write an invalid registry ─────────────────────────────────────────

describe("saveRegistry", () => {
  it("refuses to write an invalid registry (no half-broken file on disk)", () => {
    const { path, cleanup } = tmpFile();
    try {
      const bad = freshRegistry([freshEntry({ versions: [freshVersion({ base_model: "claude-opus" })] })]);
      assert.throws(() => saveRegistry(path, bad), (err) => err.code === "REGISTRY_INVALID");
    } finally { cleanup(); }
  });

  it("round-trips a valid registry", () => {
    const { path, cleanup } = tmpFile();
    try {
      const reg = freshRegistry();
      saveRegistry(path, reg);
      const { byRole, errors } = loadRegistry(path);
      assert.deepEqual(errors, []);
      assert.equal(byRole.get("Verifier").versions[0].id, "v1");
    } finally { cleanup(); }
  });
});

// ── emptyRegistry is valid ─────────────────────────────────────────────────────────────────────

describe("emptyRegistry", () => {
  it("passes validation", () => {
    assert.equal(validateRegistry(emptyRegistry()).ok, true);
  });
});
