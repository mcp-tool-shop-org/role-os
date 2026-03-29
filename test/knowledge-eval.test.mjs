import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeArtifactEvidence } from "../src/knowledge/analyze-artifact-evidence.mjs";

// ═══════════════════════════════════════════════════════════════════
// FIXTURE ARTIFACTS
// Simulated role outputs for overlapping tasks.
// These are what a role would produce given its knowledge block.
// ═══════════════════════════════════════════════════════════════════

// ── Shared Retrieval Bundle Fixtures ────────────────────────────────

function makeChunk({ chunk_id, title, source_id, content, trust_tier, freshness, domain, document_type, tags }) {
  return {
    chunk_id,
    document_id: `doc-${chunk_id}`,
    source_id,
    source_type: "internal-document",
    title,
    content,
    content_type: "paragraph",
    scores: { lexical: 0.7, semantic: 0.6, metadata: 1.0, rerank: 0.5, final: 0.7 },
    reasons_selected: ["test"],
    overlay_hits: ["test"],
    metadata: {
      trust_tier: trust_tier ?? "preferred",
      freshness: { status: freshness ?? "fresh" },
      tags: tags ?? [],
      document_type: document_type ?? "test",
      domain: domain ?? "test",
    },
    citation: { reference: `${title} [${source_id}]`, locator: chunk_id },
  };
}

// ── Security Reviewer Bundle ────────────────────────────────────────

const SECURITY_BUNDLE = {
  version: "1.0",
  role_id: "security-reviewer",
  query: { task_text: "Review this launch plan", lexical_query: [], semantic_query: [], applied_overlay_rules: [], applied_filters: [], generated_at: "2026-03-28T00:00:00Z" },
  summary: { total_candidates: 20, selected_count: 3, stale_count: 0, forbidden_hits: 2, trust_tier_breakdown: { authoritative: 1, preferred: 2, general: 0, untrusted: 0 }, source_breakdown: {}, rerank_strategy: "overlay-weighted" },
  selected: [
    makeChunk({ chunk_id: "owasp-a01", title: "OWASP Top 10 — A01", source_id: "owasp-guide", content: "Broken access control is the most critical web security risk. 94% of applications tested had access control flaws.", trust_tier: "authoritative", domain: "security", document_type: "advisory" }),
    makeChunk({ chunk_id: "auth-review-01", title: "Auth Middleware Review Q1", source_id: "internal-review", content: "Session tokens stored in localStorage without HttpOnly flag create XSS attack vectors.", domain: "security", document_type: "security-audit" }),
    makeChunk({ chunk_id: "threat-api-01", title: "API Threat Model v2.1", source_id: "threat-model", content: "Trust boundary at API gateway. Internal service-to-service mTLS shares single CA.", domain: "security", document_type: "threat-model" }),
  ],
  rejected: [],
  provenance: { source_ids: ["owasp-guide", "internal-review", "threat-model"], document_ids: [], trust_posture: "strong", freshness_posture: "fresh" },
  warnings: [],
  diagnostics: { latency_ms: 10, candidate_pool_size: 20, deduped_count: 0, dropped_forbidden_count: 2, dropped_stale_count: 0 },
};

const SECURITY_ARTIFACT = `## Security Review — Launch Plan Assessment

### Risk Summary
The launch plan has three critical security concerns that must be addressed before release.

### Findings

1. **Broken Access Control** (HIGH)
   Per OWASP Top 10 — A01 [owasp-guide], broken access control remains the most prevalent risk.
   The current auth middleware stores session tokens in localStorage, making them vulnerable to XSS
   as documented in the Auth Middleware Review Q1 [internal-review].

2. **Trust Boundary Weakness** (MEDIUM)
   According to the API Threat Model v2.1 [threat-model], the API gateway trust boundary uses a
   shared CA for mTLS, creating lateral movement risk if any service certificate is compromised.

3. **Missing CSRF Protection** (HIGH)
   Four state-changing endpoints lack CSRF validation. This is an exploit path that enables
   cross-site request forgery attacks on authenticated sessions.

### Mitigation Requirements
- Migrate session tokens to HttpOnly secure cookies
- Implement per-service certificate pinning for mTLS
- Add CSRF token validation on all POST endpoints

### Risk Posture
Overall security risk: HIGH. Launch should be gated on items 1 and 3.
`;

// ── Product Strategist Bundle ───────────────────────────────────────

const STRATEGY_BUNDLE = {
  ...SECURITY_BUNDLE,
  role_id: "product-strategist",
  selected: [
    makeChunk({ chunk_id: "brief-collab", title: "Product Brief Q1 2026", source_id: "product-brief", content: "Real-time collaboration is the highest-leverage feature for Q2. 68% of target users work in teams.", trust_tier: "authoritative", domain: "product", document_type: "product-brief" }),
    makeChunk({ chunk_id: "research-friction", title: "User Research — Collab Needs", source_id: "user-research", content: "Teams currently export, email, and re-import. Average round-trip 23 minutes per cycle.", domain: "product", document_type: "user-research" }),
    makeChunk({ chunk_id: "decision-api", title: "Decision Log D-2025-08", source_id: "decision-log", content: "Ship API before UI for all new features. CLI users converted 3.2x faster.", trust_tier: "authoritative", domain: "product", document_type: "decision-record" }),
  ],
};

const STRATEGY_ARTIFACT = `## Strategic Assessment — Launch Plan

### Opportunity
The launch plan targets real-time collaboration, which the Product Brief Q1 2026 [product-brief]
identifies as the highest-leverage feature. User value is clear: 68% of target users work in teams
of 3-8, and the current collaboration workflow has 23-minute round-trips per cycle
(User Research — Collab Needs [user-research]).

### Tradeoffs
- Building collaboration delays CLI improvements by one quarter
- CLI power users represent 22% of base but 48% of revenue — churn risk
- Decision Log D-2025-08 [decision-log] established API-first as policy; collaboration
  should follow this precedent for adoption leverage

### Scope Recommendation
Ship async collaboration first (conflict-free merging), not real-time cursors.
This addresses the core user value (version conflicts) without the infrastructure cost
of WebSocket scaling ($40K/year deferred from Q4).

### Adoption Leverage
API-first launch gives CLI power users immediate access, matching the 3.2x faster
conversion observed in prior API-first launches.
`;

// ── Competitive Analyst Bundle ──────────────────────────────────────

const COMPETITIVE_BUNDLE = {
  ...SECURITY_BUNDLE,
  role_id: "competitive-analyst",
  selected: [
    makeChunk({ chunk_id: "comp-figma", title: "Competitive Landscape — Figma", source_id: "competitive-analysis", content: "Figma dominates real-time collaboration in design tools with multiplayer cursors and network effect moat.", domain: "market", document_type: "competitive-analysis" }),
    makeChunk({ chunk_id: "comp-notion", title: "Competitive Landscape — Notion", source_id: "competitive-analysis", content: "Notion async-first model. Free personal, $10/user/mo teams. Weakness: poor offline and slow on large workspaces.", domain: "market", document_type: "competitive-analysis" }),
    makeChunk({ chunk_id: "pricing-01", title: "Pricing Comparison 2026", source_id: "pricing-data", content: "GitHub Copilot $19/mo, Cursor $20/mo, Notion $10/user/mo, Linear $8/user/mo. Our current: $0.", domain: "market", document_type: "pricing-data" }),
  ],
};

const COMPETITIVE_ARTIFACT = `## Competitive Analysis — Launch Plan

### Competitor Landscape
The collaboration space has entrenched incumbents with established moats.

**Figma** (Competitive Landscape — Figma [competitive-analysis]) dominates real-time design
collaboration through multiplayer cursors and deep ecosystem lock-in. Their network effect moat
makes switching costs extreme. Honest disadvantage for us: we have zero multiplayer infrastructure.

**Notion** (Competitive Landscape — Notion [competitive-analysis]) took an async-first approach
at $10/user/mo. Key weakness: poor offline support and performance degradation on large workspaces.

### Market Positioning
Per the Pricing Comparison 2026 [pricing-data], competitor pricing ranges $8-39/user/mo.
Our $0 open-source model creates a differentiation wedge but also an enterprise credibility gap —
buyers equate price with reliability.

### Honest Disadvantages
- No multiplayer infrastructure (Figma has years of investment)
- Free pricing may signal "not enterprise-ready" to procurement
- Late to market on collaboration vs. established substitutes

### Recommendation
Position around async-first collaboration (where Notion is weak on performance)
rather than competing with Figma on real-time. The switching cost moat in real-time
is too deep for a new entrant.
`;

// ── Docs Architect Bundle ───────────────────────────────────────────

const DOCS_BUNDLE = {
  ...SECURITY_BUNDLE,
  role_id: "docs-architect",
  selected: [
    makeChunk({ chunk_id: "handbook-nav", title: "Handbook Structure Guide", source_id: "docs-handbook", content: "Effective handbook navigation follows the 3-click rule. Avoid deep nesting.", domain: "docs", document_type: "documentation" }),
    makeChunk({ chunk_id: "support-lost", title: "Support Patterns Q4", source_id: "support-data", content: "Top support topic: auth config buried under Settings > Advanced > Security > Auth Provider. 34% of tickets.", domain: "docs", document_type: "support-pattern" }),
    makeChunk({ chunk_id: "style-task", title: "Documentation Style Guide", source_id: "docs-handbook", content: "All documentation should be task-oriented. Every page answers: what can the user DO?", domain: "docs", document_type: "style-guide" }),
  ],
};

const DOCS_ARTIFACT = `## Documentation Architecture — Launch Plan Handbook

### Structure Recommendation
Following the Handbook Structure Guide [docs-handbook], the launch documentation should
use a flat hierarchy with the 3-click rule: any page reachable within 3 clicks from landing.

### Proposed Sections
1. **Getting Started** — task-oriented setup (per Documentation Style Guide [docs-handbook]:
   every page must answer "what can the user DO?")
2. **Core Concepts** — collaboration model, conflict resolution, async vs sync
3. **Guides** — common workflows, team setup, migration from current flow
4. **API Reference** — endpoints, auth, rate limits
5. **Troubleshooting** — common issues, cross-referenced from support patterns

### Navigation Gaps to Fix
The Support Patterns Q4 [support-data] shows auth configuration is the #1 support topic (34%)
because it's buried 4 levels deep. The new handbook must surface auth setup in the Getting Started
section with progressive disclosure — not hidden under Advanced settings.

### Cross-Reference Design
Each Guide section should link to relevant API Reference pages.
Each Troubleshooting entry should link back to the Guide it relates to.
`;

// ── Critic Reviewer Bundle ──────────────────────────────────────────

const CRITIC_BUNDLE = {
  ...SECURITY_BUNDLE,
  role_id: "critic-reviewer",
  selected: [
    makeChunk({ chunk_id: "quality-accept", title: "Quality Standards v2.0", source_id: "quality-standard", content: "Acceptance criteria: every claim must cite evidence. No artifact may skip required sections.", trust_tier: "authoritative", domain: "quality", document_type: "quality-standard" }),
    makeChunk({ chunk_id: "precedent-drift", title: "Review Precedent R-2026-04", source_id: "review-precedent", content: "REJECTED. Security Reviewer included feature prioritization outside mandate. Strip and resubmit.", domain: "quality", document_type: "review-verdict" }),
    makeChunk({ chunk_id: "failure-stamp", title: "Failure Pattern F-001", source_id: "failure-patterns", content: "Rubber-stamp review. Critic accepts without checking evidence chain. Verdict says 'looks good' without citing specifics.", domain: "quality", document_type: "failure-pattern" }),
  ],
};

const CRITIC_ARTIFACT = `## Critic Review — Launch Plan Artifacts

### Verdict: ACCEPT WITH NOTES

### Evidence Assessment
Per Quality Standards v2.0 [quality-standard], every claim must cite evidence and no artifact
may skip required sections. The launch plan meets these criteria with the following notes.

### Findings

1. **Strategy artifact: PASS**
   Scope is well-bounded. Tradeoff analysis cites user research and decision precedent.
   No scope drift detected.

2. **Security review: PASS WITH NOTE**
   Thorough and role-correct. Per Review Precedent R-2026-04 [review-precedent], security
   reviewers must not include product roadmap recommendations. The current artifact stays
   within mandate — no drift violation.

3. **Completeness check**
   All required sections present. Evidence chain is intact. No claims without backing.
   This avoids the Failure Pattern F-001 [failure-patterns] rubber-stamp — every finding
   is specifically cited.

### Quality Bar
Meets the acceptance criteria. The launch plan can proceed to the next stage with
minor documentation fixes noted above.
`;

// ── Weak Posture Artifact ───────────────────────────────────────────

const WEAK_ARTIFACT = `## Strategic Assessment — Launch Plan (Limited Evidence)

### Note on Evidence Quality
The available evidence is partial and may not cover the full picture. The following
assessment should be treated as preliminary rather than definitive.

### Observations
Based on limited evidence, the collaboration feature appears to have user value,
but we lack sufficient data to confirm adoption projections. The evidence is
insufficient to make strong claims about market timing.

### Recommendation
Escalate uncertainty to product leadership before committing to the Q2 timeline.
Gather additional user research before finalizing scope.
`;

// ── Stale Posture Artifact ──────────────────────────────────────────

const STALE_ARTIFACT = `## Strategic Assessment — Launch Plan (Outdated Evidence)

### Staleness Warning
The retrieved evidence may be outdated. The strategy memo referenced below dates
from early 2024 and the market has shifted significantly since then. Treat
conclusions as directional, not current truth.

### Observations (as of prior analysis)
The mobile-first strategy was abandoned in Q3 2024 after mobile DAU plateaued.
This older analysis may no longer reflect current user behavior patterns.

### Recommendation
Before acting on this assessment, refresh the underlying data. The dated evidence
suggests a direction but should not be taken as current market reality.
`;

// ── Conflicted Posture Artifact ─────────────────────────────────────

const CONFLICTED_ARTIFACT = `## Strategic Assessment — Launch Plan (Conflicting Evidence)

### Evidence Conflict
Sources disagree on the optimal collaboration approach. The user research supports
async-first (users prefer merging when ready), while the product brief emphasizes
real-time collaboration as highest-leverage. These sources present contradicting
signals that cannot be cleanly resolved from evidence alone.

### Divergent Perspectives
- **Async advocates**: 4 of 12 users explicitly prefer solo work with merge-on-ready
- **Real-time advocates**: 68% work in teams, suggesting synchronous value

### Recommendation
Do not flatten this conflict into false consensus. Present both perspectives to
stakeholders and let the decision be made with contested evidence acknowledged.
`;

// ── None Posture Artifact ───────────────────────────────────────────

const NONE_ARTIFACT = `## Strategic Assessment — Launch Plan

### Overview
The launch plan proposes adding real-time collaboration features in Q2.
This assessment evaluates scope, timing, and strategic fit.

### Key Considerations
- Team collaboration is a common user request
- Infrastructure costs need to be evaluated
- Timeline is aggressive but achievable with focused scope

### Recommendation
Proceed with scoped async collaboration first, evaluate real-time later.
`;

// ═══════════════════════════════════════════════════════════════════
// SLICE 4A — ARTIFACT EVIDENCE ANALYZER
// ═══════════════════════════════════════════════════════════════════

describe("analyzeArtifactEvidence", () => {
  describe("reference tracking", () => {
    it("detects used references in security artifact", () => {
      const report = analyzeArtifactEvidence({
        role_id: "security-reviewer",
        task_id: "launch-plan-review",
        artifact_text: SECURITY_ARTIFACT,
        packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
      });

      assert.ok(report.references_used >= 2, `Expected >=2 references used, got ${report.references_used}`);
      assert.ok(report.reference_use_ratio > 0.5, `Expected use ratio > 0.5, got ${report.reference_use_ratio}`);
    });

    it("detects used references in strategy artifact", () => {
      const report = analyzeArtifactEvidence({
        role_id: "product-strategist",
        task_id: "launch-plan-review",
        artifact_text: STRATEGY_ARTIFACT,
        packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "strong" },
      });

      assert.ok(report.references_used >= 2);
    });

    it("reports zero references for none posture", () => {
      const report = analyzeArtifactEvidence({
        role_id: "product-strategist",
        task_id: "launch-plan-review",
        artifact_text: NONE_ARTIFACT,
        packet_knowledge: { retrieval_bundle: null, status: "none" },
      });

      assert.equal(report.references_available, 0);
      assert.equal(report.references_used, 0);
    });

    it("catches low reference use", () => {
      // Artifact that doesn't cite anything from the bundle
      const badArtifact = "## Review\nThis looks fine. No issues found. Ship it.";
      const report = analyzeArtifactEvidence({
        role_id: "security-reviewer",
        task_id: "launch-plan-review",
        artifact_text: badArtifact,
        packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
      });

      assert.equal(report.references_used, 0);
      assert.ok(report.verdict === "fail" || report.verdict === "warn");
    });
  });

  describe("evidence chain integrity", () => {
    it("all 5 roles produce passing reports with their artifacts", () => {
      const cases = [
        { role_id: "security-reviewer", bundle: SECURITY_BUNDLE, artifact: SECURITY_ARTIFACT },
        { role_id: "product-strategist", bundle: STRATEGY_BUNDLE, artifact: STRATEGY_ARTIFACT },
        { role_id: "competitive-analyst", bundle: COMPETITIVE_BUNDLE, artifact: COMPETITIVE_ARTIFACT },
        { role_id: "docs-architect", bundle: DOCS_BUNDLE, artifact: DOCS_ARTIFACT },
        { role_id: "critic-reviewer", bundle: CRITIC_BUNDLE, artifact: CRITIC_ARTIFACT },
      ];

      for (const { role_id, bundle, artifact } of cases) {
        const report = analyzeArtifactEvidence({
          role_id,
          task_id: "launch-plan-review",
          artifact_text: artifact,
          packet_knowledge: { retrieval_bundle: bundle, status: "strong" },
        });

        assert.ok(
          report.verdict === "pass" || report.verdict === "warn",
          `${role_id} should pass or warn, got ${report.verdict}: ${report.reasons.join("; ")}`,
        );
        assert.ok(
          report.references_used > 0,
          `${role_id} should use at least one reference, got ${report.references_used}`,
        );
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SLICE 4B — DISTINCTIVENESS EVAL
// ═══════════════════════════════════════════════════════════════════

describe("role distinctiveness", () => {
  const ALL_ARTIFACTS = {
    "security-reviewer": SECURITY_ARTIFACT,
    "product-strategist": STRATEGY_ARTIFACT,
    "competitive-analyst": COMPETITIVE_ARTIFACT,
    "docs-architect": DOCS_ARTIFACT,
    "critic-reviewer": CRITIC_ARTIFACT,
  };

  const ALL_BUNDLES = {
    "security-reviewer": SECURITY_BUNDLE,
    "product-strategist": STRATEGY_BUNDLE,
    "competitive-analyst": COMPETITIVE_BUNDLE,
    "docs-architect": DOCS_BUNDLE,
    "critic-reviewer": CRITIC_BUNDLE,
  };

  it("each role has distinctiveness signals present", () => {
    for (const [roleId, artifact] of Object.entries(ALL_ARTIFACTS)) {
      const report = analyzeArtifactEvidence({
        role_id: roleId,
        task_id: "launch-plan-review",
        artifact_text: artifact,
        packet_knowledge: { retrieval_bundle: ALL_BUNDLES[roleId], status: "strong" },
      });

      const hitCount = report.distinctiveness_signals.filter((s) => s.present).length;
      const totalSignals = report.distinctiveness_signals.length;

      assert.ok(
        hitCount / totalSignals >= 0.3,
        `${roleId} distinctiveness too low: ${hitCount}/${totalSignals} signals (${(hitCount / totalSignals * 100).toFixed(0)}%)`,
      );
    }
  });

  it("security-reviewer uses security language, not product language", () => {
    const report = analyzeArtifactEvidence({
      role_id: "security-reviewer",
      task_id: "launch-plan-review",
      artifact_text: SECURITY_ARTIFACT,
      packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
    });

    const securitySignals = report.distinctiveness_signals.filter(
      (s) => s.present && ["vulnerability", "threat", "exploit", "attack", "risk", "mitigation", "security"].includes(s.signal)
    );
    assert.ok(securitySignals.length >= 3, `Expected >=3 security signals, got ${securitySignals.length}`);
  });

  it("product-strategist uses strategy language, not security language", () => {
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "launch-plan-review",
      artifact_text: STRATEGY_ARTIFACT,
      packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "strong" },
    });

    const strategySignals = report.distinctiveness_signals.filter(
      (s) => s.present && ["user value", "tradeoff", "scope", "adoption", "leverage", "strategic", "outcome"].includes(s.signal)
    );
    assert.ok(strategySignals.length >= 3, `Expected >=3 strategy signals, got ${strategySignals.length}`);
  });

  it("competitive-analyst uses market language", () => {
    const report = analyzeArtifactEvidence({
      role_id: "competitive-analyst",
      task_id: "launch-plan-review",
      artifact_text: COMPETITIVE_ARTIFACT,
      packet_knowledge: { retrieval_bundle: COMPETITIVE_BUNDLE, status: "strong" },
    });

    const marketSignals = report.distinctiveness_signals.filter(
      (s) => s.present && ["competitor", "market", "differentiation", "pricing", "moat", "disadvantage", "switching cost"].includes(s.signal)
    );
    assert.ok(marketSignals.length >= 3, `Expected >=3 market signals, got ${marketSignals.length}`);
  });

  it("docs-architect uses docs language", () => {
    const report = analyzeArtifactEvidence({
      role_id: "docs-architect",
      task_id: "launch-plan-review",
      artifact_text: DOCS_ARTIFACT,
      packet_knowledge: { retrieval_bundle: DOCS_BUNDLE, status: "strong" },
    });

    const docsSignals = report.distinctiveness_signals.filter(
      (s) => s.present && ["structure", "navigation", "hierarchy", "handbook", "documentation", "progressive disclosure", "cross-reference"].includes(s.signal)
    );
    assert.ok(docsSignals.length >= 3, `Expected >=3 docs signals, got ${docsSignals.length}`);
  });

  it("critic-reviewer uses quality gate language", () => {
    const report = analyzeArtifactEvidence({
      role_id: "critic-reviewer",
      task_id: "launch-plan-review",
      artifact_text: CRITIC_ARTIFACT,
      packet_knowledge: { retrieval_bundle: CRITIC_BUNDLE, status: "strong" },
    });

    const criticSignals = report.distinctiveness_signals.filter(
      (s) => s.present && ["verdict", "accept", "reject", "quality bar", "evidence", "contract", "precedent", "drift"].includes(s.signal)
    );
    assert.ok(criticSignals.length >= 3, `Expected >=3 critic signals, got ${criticSignals.length}`);
  });

  it("no role has excessive drift violations on its own artifact", () => {
    for (const [roleId, artifact] of Object.entries(ALL_ARTIFACTS)) {
      const report = analyzeArtifactEvidence({
        role_id: roleId,
        task_id: "launch-plan-review",
        artifact_text: artifact,
        packet_knowledge: { retrieval_bundle: ALL_BUNDLES[roleId], status: "strong" },
      });

      assert.ok(
        report.drift_violations.length <= 2,
        `${roleId} has ${report.drift_violations.length} drift violations: ${report.drift_violations.map((d) => d.violation).join("; ")}`,
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// SLICE 4C — POSTURE COMPLIANCE
// ═══════════════════════════════════════════════════════════════════

describe("posture compliance", () => {
  it("strong posture: artifact cites evidence and makes claims", () => {
    const report = analyzeArtifactEvidence({
      role_id: "security-reviewer",
      task_id: "posture-test",
      artifact_text: SECURITY_ARTIFACT,
      packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
    });

    assert.ok(report.posture_compliance.compliant, "Strong posture should be compliant");
  });

  it("weak posture: artifact hedges and acknowledges insufficiency", () => {
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: WEAK_ARTIFACT,
      packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "weak" },
    });

    assert.ok(report.posture_compliance.compliant, "Weak posture should be compliant when hedging");
    assert.ok(
      report.posture_compliance.found_signals.length > 0,
      "Should find weakness signals",
    );
  });

  it("stale posture: artifact notes dated evidence", () => {
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: STALE_ARTIFACT,
      packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "stale" },
    });

    assert.ok(report.posture_compliance.compliant, "Stale posture should be compliant when noting age");
  });

  it("conflicted posture: artifact surfaces disagreement", () => {
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: CONFLICTED_ARTIFACT,
      packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "conflicted" },
    });

    assert.ok(report.posture_compliance.compliant, "Conflicted posture should be compliant when surfacing disagreement");
  });

  it("none posture: artifact does not claim retrieval-backed authority", () => {
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: NONE_ARTIFACT,
      packet_knowledge: null,
    });

    assert.ok(report.posture_compliance.compliant, "None posture should be compliant");
  });

  it("bad weak artifact fails posture check", () => {
    // Artifact that sounds confident despite weak posture
    const badWeak = "## Analysis\nThe data clearly shows this is the right path. We are certain the collaboration feature will succeed based on strong market evidence.";
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: badWeak,
      packet_knowledge: { retrieval_bundle: STRATEGY_BUNDLE, status: "weak" },
    });

    // Should flag missing weakness signals
    assert.ok(
      !report.posture_compliance.compliant || report.posture_compliance.found_signals.length === 0,
      "Confident artifact with weak posture should fail or have no weakness signals",
    );
  });

  it("bad none artifact fails if claiming retrieval authority", () => {
    const badNone = "## Analysis\nAccording to retrieved evidence from the knowledge base, this is clearly the right approach.";
    const report = analyzeArtifactEvidence({
      role_id: "product-strategist",
      task_id: "posture-test",
      artifact_text: badNone,
      packet_knowledge: null,
    });

    assert.ok(
      !report.posture_compliance.compliant,
      "Artifact claiming retrieval authority with none posture should fail",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// VERDICT SUMMARY
// ═══════════════════════════════════════════════════════════════════

describe("verdict logic", () => {
  it("verdict is pass for well-formed artifact with evidence", () => {
    const report = analyzeArtifactEvidence({
      role_id: "security-reviewer",
      task_id: "test",
      artifact_text: SECURITY_ARTIFACT,
      packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
    });
    assert.ok(report.verdict === "pass" || report.verdict === "warn");
  });

  it("verdict is fail for empty artifact with strong bundle", () => {
    const report = analyzeArtifactEvidence({
      role_id: "security-reviewer",
      task_id: "test",
      artifact_text: "Looks good, ship it.",
      packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
    });
    assert.equal(report.verdict, "fail");
  });

  it("report includes actionable reasons", () => {
    const report = analyzeArtifactEvidence({
      role_id: "security-reviewer",
      task_id: "test",
      artifact_text: "Ship it.",
      packet_knowledge: { retrieval_bundle: SECURITY_BUNDLE, status: "strong" },
    });
    assert.ok(report.reasons.length > 0);
    assert.ok(report.reasons.some((r) => r.includes("unused") || r.includes("distinctiveness")));
  });
});
