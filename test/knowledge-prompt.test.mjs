import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  renderKnowledgeBlock,
  knowledgeManifestSummary,
} from "../src/knowledge/render-knowledge-block.mjs";
import { buildDispatchManifest } from "../src/dispatch.mjs";

// ── Fixture Builders ────────────────────────────────────────────────

function makeChunk(overrides = {}) {
  return {
    chunk_id: overrides.chunk_id ?? "chunk-001",
    document_id: "doc-001",
    source_id: "test-source",
    source_type: "internal-document",
    title: overrides.title ?? "Test Document",
    content: overrides.content ?? "This is test evidence content for the retrieval bundle.",
    content_type: "paragraph",
    scores: { lexical: 0.8, semantic: 0.6, metadata: 1.2, rerank: 0.3, final: 0.75 },
    reasons_selected: ["test match"],
    overlay_hits: ["boost:test"],
    metadata: {
      trust_tier: overrides.trust_tier ?? "preferred",
      freshness: { status: overrides.freshness ?? "fresh", updated_at: "2026-01-15T00:00:00Z" },
      tags: ["test"],
      document_type: "test-doc",
      domain: "test",
    },
    citation: { reference: overrides.citation ?? "Test Document [test-source]", locator: "chunk-001" },
    ...overrides,
  };
}

function makeBundle(overrides = {}) {
  return {
    version: "1.0",
    role_id: overrides.role_id ?? "test-role",
    query: { task_text: "test task", lexical_query: [], semantic_query: [], applied_overlay_rules: [], applied_filters: [], generated_at: "2026-03-28T00:00:00Z" },
    summary: { total_candidates: 10, selected_count: 3, stale_count: 0, forbidden_hits: 0, trust_tier_breakdown: { authoritative: 1, preferred: 2, general: 0, untrusted: 0 }, source_breakdown: {}, rerank_strategy: "overlay-weighted" },
    selected: overrides.selected ?? [
      makeChunk({ chunk_id: "c1", title: "OWASP Top 10", trust_tier: "authoritative" }),
      makeChunk({ chunk_id: "c2", title: "Internal Review" }),
      makeChunk({ chunk_id: "c3", title: "API Threat Model" }),
    ],
    rejected: [],
    provenance: overrides.provenance ?? { source_ids: ["owasp", "internal"], document_ids: ["d1", "d2"], trust_posture: "strong", freshness_posture: "fresh" },
    warnings: overrides.warnings ?? [],
    diagnostics: { latency_ms: 12, candidate_pool_size: 10, deduped_count: 1, dropped_forbidden_count: 0, dropped_stale_count: 0 },
  };
}

function makePacketKnowledge(status, bundleOverrides = {}) {
  return {
    retrieval_bundle: makeBundle(bundleOverrides),
    status,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SLICE 3A — RENDER KNOWLEDGE BLOCK
// ═══════════════════════════════════════════════════════════════════

describe("renderKnowledgeBlock", () => {
  // ── Strong Status ───────────────────────────────────────────────

  describe("strong status", () => {
    const block = renderKnowledgeBlock(makePacketKnowledge("strong"));

    it("renders non-null block", () => {
      assert.ok(block);
    });

    it("includes knowledge status line", () => {
      assert.ok(block.includes("Knowledge status: **strong**"));
    });

    it("includes evidence section", () => {
      assert.ok(block.includes("### Evidence"));
    });

    it("includes citations", () => {
      assert.ok(block.includes("Test Document [test-source]"));
    });

    it("includes trust and freshness labels", () => {
      assert.ok(block.includes("[authoritative | fresh]"));
      assert.ok(block.includes("[preferred | fresh]"));
    });

    it("includes usage law for strong", () => {
      assert.ok(block.includes("### Knowledge Use Rules"));
      assert.ok(block.includes("Prioritize retrieved evidence"));
      assert.ok(block.includes("Cite retrieved references"));
    });

    it("does not include uncertainty guidance", () => {
      assert.ok(!block.includes("overclaiming"));
      assert.ok(!block.includes("staleness"));
      assert.ok(!block.includes("fake consensus"));
    });
  });

  // ── Weak Status ─────────────────────────────────────────────────

  describe("weak status", () => {
    const block = renderKnowledgeBlock(makePacketKnowledge("weak", {
      warnings: [{ code: "NO_HIGH_TRUST_MATCH", message: "No high trust match" }],
    }));

    it("includes weak posture", () => {
      assert.ok(block.includes("Knowledge status: **weak**"));
    });

    it("includes uncertainty guidance", () => {
      assert.ok(block.includes("partial"));
      assert.ok(block.includes("overclaiming"));
      assert.ok(block.includes("Escalate uncertainty"));
    });

    it("includes warning about limited evidence", () => {
      assert.ok(block.includes("No authoritative sources matched"));
    });
  });

  // ── Stale Status ────────────────────────────────────────────────

  describe("stale status", () => {
    const block = renderKnowledgeBlock(makePacketKnowledge("stale", {
      selected: [makeChunk({ freshness: "stale" })],
      warnings: [{ code: "STALE_DOMINANT", message: "Most evidence is stale" }],
    }));

    it("includes stale posture", () => {
      assert.ok(block.includes("Knowledge status: **stale**"));
    });

    it("includes staleness caveat in usage law", () => {
      assert.ok(block.includes("outdated"));
      assert.ok(block.includes("staleness"));
    });

    it("includes stale warning", () => {
      assert.ok(block.includes("Most retrieved evidence is outdated"));
    });

    it("shows stale freshness label on evidence", () => {
      assert.ok(block.includes("| stale]"));
    });
  });

  // ── Conflicted Status ───────────────────────────────────────────

  describe("conflicted status", () => {
    const block = renderKnowledgeBlock(makePacketKnowledge("conflicted", {
      warnings: [{ code: "CONFLICTING_EVIDENCE", message: "Sources disagree on auth approach" }],
    }));

    it("includes conflicted posture", () => {
      assert.ok(block.includes("Knowledge status: **conflicted**"));
    });

    it("includes conflict acknowledgment law", () => {
      assert.ok(block.includes("conflicting evidence"));
      assert.ok(block.includes("fake consensus"));
    });

    it("includes specific conflict warning", () => {
      assert.ok(block.includes("Sources disagree on auth approach"));
    });
  });

  // ── None Status ─────────────────────────────────────────────────

  describe("none status", () => {
    it("returns null for none status", () => {
      assert.equal(renderKnowledgeBlock(makePacketKnowledge("none")), null);
    });

    it("returns null for null input", () => {
      assert.equal(renderKnowledgeBlock(null), null);
    });

    it("returns null for undefined input", () => {
      assert.equal(renderKnowledgeBlock(undefined), null);
    });
  });

  // ── Bounded Size ────────────────────────────────────────────────

  describe("bounded size", () => {
    it("limits to 6 evidence chunks", () => {
      const manyChunks = Array.from({ length: 10 }, (_, i) =>
        makeChunk({ chunk_id: `c${i}`, title: `Doc ${i}`, citation: `Doc ${i} [src]` })
      );
      const block = renderKnowledgeBlock(makePacketKnowledge("strong", { selected: manyChunks }));
      // Count numbered evidence lines
      const evidenceLines = block.match(/^\d+\.\s+\[/gm);
      assert.equal(evidenceLines.length, 6);
    });

    it("truncates long excerpts", () => {
      const longContent = "A".repeat(500);
      const block = renderKnowledgeBlock(makePacketKnowledge("strong", {
        selected: [makeChunk({ content: longContent })],
      }));
      // Should contain truncation marker
      assert.ok(block.includes("..."));
      // Full 500-char content should NOT appear
      assert.ok(!block.includes(longContent));
    });
  });

  // ── Warning Filtering ───────────────────────────────────────────

  describe("warning filtering", () => {
    it("does not render FORBIDDEN_SOURCE_HIT as user-facing warning", () => {
      const block = renderKnowledgeBlock(makePacketKnowledge("strong", {
        warnings: [{ code: "FORBIDDEN_SOURCE_HIT", message: "2 forbidden sources removed" }],
      }));
      // FORBIDDEN_SOURCE_HIT is governance working, not user-facing
      assert.ok(!block.includes("forbidden"));
    });

    it("renders meaningful warnings", () => {
      const block = renderKnowledgeBlock(makePacketKnowledge("weak", {
        warnings: [
          { code: "LOW_DIVERSITY", message: "Single source" },
          { code: "NO_HIGH_TRUST_MATCH", message: "No high trust" },
        ],
      }));
      assert.ok(block.includes("single source"));
      assert.ok(block.includes("authoritative sources"));
    });
  });

  // ── Idempotency ─────────────────────────────────────────────────

  describe("idempotency", () => {
    it("same input produces same output", () => {
      const pk = makePacketKnowledge("strong");
      const a = renderKnowledgeBlock(pk);
      const b = renderKnowledgeBlock(pk);
      assert.equal(a, b);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SLICE 3C — MANIFEST SUMMARY
// ═══════════════════════════════════════════════════════════════════

describe("knowledgeManifestSummary", () => {
  it("returns null for none status", () => {
    assert.equal(knowledgeManifestSummary(makePacketKnowledge("none")), null);
  });

  it("returns null for null input", () => {
    assert.equal(knowledgeManifestSummary(null), null);
  });

  it("returns compact summary for strong bundle", () => {
    const summary = knowledgeManifestSummary(makePacketKnowledge("strong"));
    assert.equal(summary.status, "strong");
    assert.equal(summary.selected_count, 3);
    assert.equal(summary.trust_posture, "strong");
    assert.equal(summary.freshness_posture, "fresh");
    assert.ok(Array.isArray(summary.warning_codes));
  });

  it("includes warning codes", () => {
    const summary = knowledgeManifestSummary(makePacketKnowledge("conflicted", {
      warnings: [{ code: "CONFLICTING_EVIDENCE", message: "test" }],
    }));
    assert.ok(summary.warning_codes.includes("CONFLICTING_EVIDENCE"));
  });
});

// ═══════════════════════════════════════════════════════════════════
// SLICE 3B — buildRolePrompt INTEGRATION
// ═══════════════════════════════════════════════════════════════════

describe("buildRolePrompt with knowledge", () => {
  const chainRoles = [
    { role: { name: "Security Reviewer", pack: "security" } },
    { role: { name: "Critic Reviewer", pack: "core" } },
  ];

  it("prompt includes knowledge block when strong", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("strong"),
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(prompt.includes("## Retrieved Knowledge"));
    assert.ok(prompt.includes("Knowledge status: **strong**"));
    assert.ok(prompt.includes("### Evidence"));
    assert.ok(prompt.includes("### Knowledge Use Rules"));
  });

  it("prompt excludes knowledge block when none", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("none"),
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(!prompt.includes("## Retrieved Knowledge"));
    assert.ok(!prompt.includes("### Evidence"));
  });

  it("prompt excludes knowledge block when null", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: null,
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(!prompt.includes("## Retrieved Knowledge"));
  });

  it("prompt still builds normally without knowledge", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(prompt.includes("Security Reviewer"));
    assert.ok(prompt.includes("## Your Role Contract"));
    assert.ok(prompt.includes("## Handoff Requirements"));
  });

  it("weak status includes uncertainty guidance in prompt", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("weak"),
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(prompt.includes("Knowledge status: **weak**"));
    assert.ok(prompt.includes("overclaiming"));
  });

  it("conflicted status includes conflict law in prompt", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("conflicted", {
        warnings: [{ code: "CONFLICTING_EVIDENCE", message: "Sources disagree" }],
      }),
    });
    const prompt = manifest.steps[0].systemPrompt;
    assert.ok(prompt.includes("Knowledge status: **conflicted**"));
    assert.ok(prompt.includes("fake consensus"));
  });
});

// ═══════════════════════════════════════════════════════════════════
// MANIFEST TRUTH
// ═══════════════════════════════════════════════════════════════════

describe("manifest knowledge posture", () => {
  const chainRoles = [
    { role: { name: "Security Reviewer", pack: "security" } },
  ];

  it("manifest step includes knowledge summary when present", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("strong"),
    });
    const step = manifest.steps[0];
    assert.ok(step.knowledge);
    assert.equal(step.knowledge.status, "strong");
    assert.equal(step.knowledge.selected_count, 3);
    assert.equal(step.knowledge.trust_posture, "strong");
  });

  it("manifest step has null knowledge when none", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: null,
    });
    assert.equal(manifest.steps[0].knowledge, null);
  });

  it("manifest step records warning codes", () => {
    const manifest = buildDispatchManifest({
      packetFile: "test.md",
      packetContent: "Test packet",
      chainRoles,
      cwd: ".",
      packetKnowledge: makePacketKnowledge("stale", {
        warnings: [{ code: "STALE_DOMINANT", message: "test" }],
      }),
    });
    assert.ok(manifest.steps[0].knowledge.warning_codes.includes("STALE_DOMINANT"));
  });
});
