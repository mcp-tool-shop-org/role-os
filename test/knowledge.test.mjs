import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  resolveOverlay,
  hasOverlay,
  retrieveForDispatch,
  attachBundleToPacket,
  hasKnowledge,
  getKnowledgeStatus,
  provenanceFromChunk,
  attachProvenance,
  reconcileEvidenceWithBundle,
  applyFallbackPolicy,
} from "../src/knowledge/index.mjs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const KNOWLEDGE_CORE_ROLES = resolve(
  __dirname,
  "..",
  "..",
  "knowledge-core",
  "knowledge",
  "roles"
);

const HAS_KNOWLEDGE_CORE = existsSync(KNOWLEDGE_CORE_ROLES);

// ── Overlay Resolution ──────────────────────────────────────────────
// These tests require the knowledge-core sibling checkout.
// In CI (no sibling), they skip gracefully.

describe("resolveOverlay", () => {
  it("resolves security-reviewer overlay", (t) => {
    if (!HAS_KNOWLEDGE_CORE) return t.skip("knowledge-core sibling not checked out");
    const result = resolveOverlay("security-reviewer", { searchPaths: [KNOWLEDGE_CORE_ROLES] });
    assert.ok(result, "should find overlay");
    assert.equal(result.overlay.role_id, "security-reviewer");
    assert.equal(result.overlay.version, "1.0");
  });

  it("resolves all 5 pilot overlays", (t) => {
    if (!HAS_KNOWLEDGE_CORE) return t.skip("knowledge-core sibling not checked out");
    const pilots = [
      "product-strategist",
      "security-reviewer",
      "competitive-analyst",
      "docs-architect",
      "critic-reviewer",
    ];
    for (const roleId of pilots) {
      const result = resolveOverlay(roleId, { searchPaths: [KNOWLEDGE_CORE_ROLES] });
      assert.ok(result, `should find overlay for ${roleId}`);
      assert.equal(result.overlay.role_id, roleId);
    }
  });

  it("returns null for unknown role", () => {
    const result = resolveOverlay("nonexistent-role", { searchPaths: [KNOWLEDGE_CORE_ROLES] });
    assert.equal(result, null);
  });
});

describe("hasOverlay", () => {
  it("returns true for pilot role", (t) => {
    if (!HAS_KNOWLEDGE_CORE) return t.skip("knowledge-core sibling not checked out");
    assert.equal(hasOverlay("security-reviewer", { searchPaths: [KNOWLEDGE_CORE_ROLES] }), true);
  });

  it("returns false for unknown role", () => {
    assert.equal(hasOverlay("nonexistent", { searchPaths: [KNOWLEDGE_CORE_ROLES] }), false);
  });
});

// ── Retrieve For Dispatch ───────────────────────────────────────────

describe("retrieveForDispatch", () => {
  it("returns stub bundle when no corpus configured", async () => {
    const result = await retrieveForDispatch({
      roleId: "security-reviewer",
      taskText: "Review auth middleware for injection risks",
    });
    assert.ok(result.bundle);
    assert.equal(result.bundle.version, "1.0");
    assert.equal(result.bundle.role_id, "security-reviewer");
    assert.equal(result.bundle.summary.rerank_strategy, "stub-no-corpus");
  });

  it("returns status 'none' for role without overlay", async () => {
    const result = await retrieveForDispatch({
      roleId: "nonexistent-role",
      taskText: "some task",
    });
    assert.equal(result.status, "none");
    assert.equal(result.fallback.state, "no_overlay");
  });

  it("bundle has correct query trace", async () => {
    const result = await retrieveForDispatch({
      roleId: "product-strategist",
      taskText: "Assess real-time collaboration feature",
    });
    assert.equal(result.bundle.query.task_text, "Assess real-time collaboration feature");
    assert.ok(result.bundle.query.generated_at);
  });

  it("bundle has stub warning when no corpus", async () => {
    const result = await retrieveForDispatch({
      roleId: "security-reviewer",
      taskText: "test",
    });
    const codes = result.bundle.warnings.map((w) => w.code);
    assert.ok(codes.includes("ONLY_SHARED_CORPUS"));
  });
});

// ── Packet Attachment ───────────────────────────────────────────────

describe("attachBundleToPacket", () => {
  it("attaches knowledge to packet", () => {
    const packet = { task: "test" };
    const bundle = { version: "1.0", role_id: "test", selected: [] };
    attachBundleToPacket(packet, bundle, "strong");
    assert.ok(packet.knowledge);
    assert.equal(packet.knowledge.status, "strong");
    assert.equal(packet.knowledge.retrieval_bundle, bundle);
  });
});

describe("hasKnowledge", () => {
  it("returns true for packet with knowledge", () => {
    assert.equal(hasKnowledge({ knowledge: { status: "strong", retrieval_bundle: {} } }), true);
  });

  it("returns false for packet without knowledge", () => {
    assert.equal(hasKnowledge({}), false);
  });

  it("returns false for status 'none'", () => {
    assert.equal(hasKnowledge({ knowledge: { status: "none" } }), false);
  });
});

describe("getKnowledgeStatus", () => {
  it("returns status from packet", () => {
    assert.equal(getKnowledgeStatus({ knowledge: { status: "weak" } }), "weak");
  });

  it("returns 'none' for missing knowledge", () => {
    assert.equal(getKnowledgeStatus({}), "none");
  });
});

// ── Evidence Provenance ─────────────────────────────────────────────

describe("provenanceFromChunk", () => {
  it("extracts provenance from a chunk", () => {
    const chunk = {
      source_id: "owasp-guide",
      document_id: "owasp-top10-2025",
      chunk_id: "owasp-auth-001",
      metadata: { trust_tier: "authoritative", freshness: { status: "fresh" } },
      citation: { reference: "OWASP Top 10 — A01" },
    };
    const prov = provenanceFromChunk(chunk);
    assert.equal(prov.source_id, "owasp-guide");
    assert.equal(prov.trust_tier, "authoritative");
    assert.equal(prov.freshness_status, "fresh");
    assert.equal(prov.citation_reference, "OWASP Top 10 — A01");
  });

  it("handles missing metadata gracefully", () => {
    const chunk = { source_id: "x", document_id: "y", chunk_id: "z" };
    const prov = provenanceFromChunk(chunk);
    assert.equal(prov.trust_tier, "general");
    assert.equal(prov.freshness_status, "undated");
  });
});

describe("attachProvenance", () => {
  it("attaches provenance to evidence item", () => {
    const item = { kind: "reference", claim: "test" };
    const chunk = {
      source_id: "src", document_id: "doc", chunk_id: "chk",
      metadata: { trust_tier: "preferred", freshness: { status: "aging" } },
      citation: { reference: "Test Ref" },
    };
    attachProvenance(item, chunk);
    assert.ok(item.provenance);
    assert.equal(item.provenance.trust_tier, "preferred");
  });
});

describe("reconcileEvidenceWithBundle", () => {
  it("matches evidence to chunks by reference", () => {
    const items = [
      { reference: "OWASP Top 10 — A01", claim: "broken access control" },
      { reference: "Unknown Ref", claim: "something else" },
    ];
    const bundle = {
      selected: [
        {
          source_id: "owasp", document_id: "top10", chunk_id: "c1",
          metadata: { trust_tier: "authoritative", freshness: { status: "fresh" } },
          citation: { reference: "OWASP Top 10 — A01" },
        },
      ],
    };
    reconcileEvidenceWithBundle(items, bundle);
    assert.ok(items[0].provenance, "matched item should have provenance");
    assert.equal(items[0].provenance.source_id, "owasp");
    assert.ok(!items[1].provenance, "unmatched item should not have provenance");
  });

  it("handles empty bundle gracefully", () => {
    const items = [{ reference: "test" }];
    reconcileEvidenceWithBundle(items, { selected: [] });
    assert.ok(!items[0].provenance);
  });

  it("handles null bundle gracefully", () => {
    const items = [{ reference: "test" }];
    reconcileEvidenceWithBundle(items, null);
    assert.ok(!items[0].provenance);
  });
});

// ── Fallback Policy ─────────────────────────────────────────────────

describe("applyFallbackPolicy", () => {
  const makeBundle = (overrides = {}) => ({
    role_id: "test",
    selected: [{ chunk_id: "c1" }],
    summary: { selected_count: 1, stale_count: 0, forbidden_hits: 0 },
    provenance: { trust_posture: "strong", freshness_posture: "fresh" },
    warnings: [],
    ...overrides,
  });

  it("returns healthy for good bundle with overlay", () => {
    const result = applyFallbackPolicy(makeBundle(), { version: "1.0" });
    assert.equal(result.state, "healthy");
    assert.equal(result.action, "continue");
  });

  it("returns no_overlay when overlay is null", () => {
    const result = applyFallbackPolicy(makeBundle(), null);
    assert.equal(result.state, "no_overlay");
    assert.equal(result.action, "continue");
  });

  it("returns no_strong_match for empty selected", () => {
    const result = applyFallbackPolicy(
      makeBundle({ selected: [], summary: { selected_count: 0, stale_count: 0, forbidden_hits: 0 } }),
      { version: "1.0" }
    );
    assert.equal(result.state, "no_strong_match");
    assert.equal(result.action, "warn");
  });

  it("returns forbidden_hit when forbidden sources removed", () => {
    const result = applyFallbackPolicy(
      makeBundle({ summary: { selected_count: 1, stale_count: 0, forbidden_hits: 3 } }),
      { version: "1.0" }
    );
    assert.equal(result.state, "forbidden_hit");
    assert.equal(result.action, "continue");
  });

  it("returns stale_dominant when majority stale", () => {
    const result = applyFallbackPolicy(
      makeBundle({ summary: { selected_count: 2, stale_count: 4, forbidden_hits: 0 } }),
      { version: "1.0" }
    );
    assert.equal(result.state, "stale_dominant");
    assert.equal(result.action, "warn");
  });

  it("returns conflicting for CONFLICTING_EVIDENCE warning", () => {
    const result = applyFallbackPolicy(
      makeBundle({
        summary: { selected_count: 2, stale_count: 0, forbidden_hits: 0 },
        warnings: [{ code: "CONFLICTING_EVIDENCE", message: "Two sources disagree on auth approach" }],
      }),
      { version: "1.0" }
    );
    assert.equal(result.state, "conflicting");
    assert.equal(result.action, "warn");
  });

  it("returns no_strong_match for weak trust posture", () => {
    const result = applyFallbackPolicy(
      makeBundle({
        summary: { selected_count: 2, stale_count: 0, forbidden_hits: 0 },
        provenance: { trust_posture: "weak" },
      }),
      { version: "1.0" }
    );
    assert.equal(result.state, "no_strong_match");
    assert.equal(result.action, "warn");
  });
});
