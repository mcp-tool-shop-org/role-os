import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_CATALOG,
  scoreRole,
  detectType,
  assembleChain,
  assessConfidence,
  MIN_SCORE_THRESHOLD,
} from "../src/route.mjs";

// ── Catalog completeness ──────────────────────────────────────────────────────

describe("ROLE_CATALOG", () => {
  it("has exactly 31 roles (Information Architect merged into Docs Architect)", () => {
    assert.equal(ROLE_CATALOG.length, 31);
  });

  it("every role has required fields", () => {
    for (const role of ROLE_CATALOG) {
      assert.ok(role.name, `role missing name`);
      assert.ok(role.pack, `${role.name} missing pack`);
      assert.ok(typeof role.phase === "number", `${role.name} missing phase`);
      assert.ok(Array.isArray(role.keywords), `${role.name} missing keywords`);
      assert.ok(Array.isArray(role.triggers), `${role.name} missing triggers`);
    }
  });

  it("has exactly 2 always-include roles (Orchestrator + Critic Reviewer)", () => {
    const always = ROLE_CATALOG.filter(r => r.alwaysInclude);
    assert.equal(always.length, 2);
    assert.ok(always.some(r => r.name === "Orchestrator"));
    assert.ok(always.some(r => r.name === "Critic Reviewer"));
  });

  it("has no duplicate role names", () => {
    const names = ROLE_CATALOG.map(r => r.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("non-always-include roles have at least 3 keywords", () => {
    for (const role of ROLE_CATALOG) {
      if (role.alwaysInclude) continue;
      assert.ok(
        role.keywords.length >= 3,
        `${role.name} has only ${role.keywords.length} keywords (need ≥3)`
      );
    }
  });
});

// ── Scoring ───────────────────────────────────────────────────────────────────

describe("scoreRole", () => {
  it("scores 0 for unrelated content", () => {
    const role = ROLE_CATALOG.find(r => r.name === "Security Reviewer");
    const result = scoreRole(role, "Build a simple hello world page", "feature", null);
    assert.equal(result.score, 0);
  });

  it("scores keywords for matching content", () => {
    const role = ROLE_CATALOG.find(r => r.name === "Security Reviewer");
    const result = scoreRole(role, "Review for injection and auth vulnerabilities in the API", "feature", null);
    assert.ok(result.score >= 2, `expected ≥2, got ${result.score}`);
    assert.ok(result.matched.length >= 2);
  });

  it("gives trigger bonus for strong signals", () => {
    const role = ROLE_CATALOG.find(r => r.name === "Performance Engineer");
    const kwOnly = scoreRole(role, "check the performance and benchmark", "feature", null);
    const withTrigger = scoreRole(role, "check the performance and benchmark for performance regression", "feature", null);
    assert.ok(withTrigger.score > kwOnly.score, "trigger should add bonus");
  });

  it("always-include roles score Infinity", () => {
    const orch = ROLE_CATALOG.find(r => r.name === "Orchestrator");
    const result = scoreRole(orch, "anything", "feature", null);
    assert.equal(result.score, Infinity);
  });

  it("type bias adds score", () => {
    const be = ROLE_CATALOG.find(r => r.name === "Backend Engineer");
    const noType = scoreRole(be, "build an endpoint", "identity", null);
    const withType = scoreRole(be, "build an endpoint", "integration", null);
    assert.ok(withType.score > noType.score, "integration type should bias Backend Engineer");
  });
});

// ── Role surfacing — the key acceptance tests ─────────────────────────────────

describe("role surfacing (all 32 reachable)", () => {
  function rolesAboveThreshold(content, type = "feature") {
    return ROLE_CATALOG
      .filter(r => !r.alwaysInclude)
      .map(r => ({ name: r.name, ...scoreRole(r, content, type, null) }))
      .filter(r => r.score >= MIN_SCORE_THRESHOLD)
      .map(r => r.name);
  }

  it("translation packet → Repo Translator", () => {
    const roles = rolesAboveThreshold("Translate the README and docs to Japanese. Needs localization and multilingual polyglot support.");
    assert.ok(roles.includes("Repo Translator"), `got: ${roles.join(", ")}`);
  });

  it("profiling packet → Performance Engineer", () => {
    const roles = rolesAboveThreshold("Profile the hot path for latency. There is a performance regression in the benchmark suite.");
    assert.ok(roles.includes("Performance Engineer"), `got: ${roles.join(", ")}`);
  });

  it("release packet → Release Engineer", () => {
    const roles = rolesAboveThreshold("Bump the version, update the changelog, tag, and publish the npm package for release.");
    assert.ok(roles.includes("Release Engineer"), `got: ${roles.join(", ")}`);
  });

  it("deploy verification packet → Deployment Verifier", () => {
    const roles = rolesAboveThreshold("Verify the deployment. Check the landing page is live, badges resolve, and translations are spot-checked.");
    assert.ok(roles.includes("Deployment Verifier"), `got: ${roles.join(", ")}`);
  });

  it("security packet → Security Reviewer", () => {
    const roles = rolesAboveThreshold("Run a security review. Check for injection, auth issues, secrets exposure, and owasp patterns.");
    assert.ok(roles.includes("Security Reviewer"), `got: ${roles.join(", ")}`);
  });

  it("dependency packet → Dependency Auditor", () => {
    const roles = rolesAboveThreshold("Audit dependencies for vulnerability and supply chain risk. Check for stale and outdated packages.");
    assert.ok(roles.includes("Dependency Auditor"), `got: ${roles.join(", ")}`);
  });

  it("refactor packet → Refactor Engineer", () => {
    const roles = rolesAboveThreshold("Refactor this module to reduce duplication and simplify the boundary between components.");
    assert.ok(roles.includes("Refactor Engineer"), `got: ${roles.join(", ")}`);
  });

  it("brand identity packet → Brand Guardian", () => {
    const roles = rolesAboveThreshold("Audit for identity contamination and fork residue. Check terminology consistency and naming.");
    assert.ok(roles.includes("Brand Guardian"), `got: ${roles.join(", ")}`);
  });

  it("docs packet → Docs Architect", () => {
    const roles = rolesAboveThreshold("Create a handbook with Starlight. Set up the documentation site with tutorial and reference sections.");
    assert.ok(roles.includes("Docs Architect"), `got: ${roles.join(", ")}`);
  });

  it("metadata packet → Metadata Curator", () => {
    const roles = rolesAboveThreshold("Audit the package.json manifest, update badges, fix homepage URL, align registry metadata.");
    assert.ok(roles.includes("Metadata Curator"), `got: ${roles.join(", ")}`);
  });

  it("coverage packet → Coverage Auditor", () => {
    const roles = rolesAboveThreshold("Assess test coverage. Identify false confidence and untested edge cases. Find missing defenses.");
    assert.ok(roles.includes("Coverage Auditor"), `got: ${roles.join(", ")}`);
  });

  it("repo research packet → Repo Researcher", () => {
    const roles = rolesAboveThreshold("Map the repo structure. Find entrypoints, seams, and build commands. Verify the architecture.");
    assert.ok(roles.includes("Repo Researcher"), `got: ${roles.join(", ")}`);
  });

  it("launch packet → Launch Strategist", () => {
    const roles = rolesAboveThreshold("Plan the launch with channel selection, timing, proof packaging, and success criteria for go-to-market.");
    assert.ok(roles.includes("Launch Strategist"), `got: ${roles.join(", ")}`);
  });

  it("competitive analysis packet → Competitive Analyst", () => {
    const roles = rolesAboveThreshold("Map the competitive landscape. Assess differentiation and positioning against alternatives and competitors.");
    assert.ok(roles.includes("Competitive Analyst"), `got: ${roles.join(", ")}`);
  });

  it("spec writing packet → Spec Writer", () => {
    const roles = rolesAboveThreshold("Write an execution-grade spec with acceptance criteria, edge case enumeration, and non-functional requirements.");
    assert.ok(roles.includes("Spec Writer"), `got: ${roles.join(", ")}`);
  });

  it("roadmap packet → Roadmap Prioritizer", () => {
    const roles = rolesAboveThreshold("Prioritize the backlog. Sequence by leverage and dependency. Identify what we should stop doing.");
    assert.ok(roles.includes("Roadmap Prioritizer"), `got: ${roles.join(", ")}`);
  });

  it("community packet → Community Manager", () => {
    const roles = rolesAboveThreshold("Triage community issues and discussions. Draft responses to contributor questions. Assess community health.");
    assert.ok(roles.includes("Community Manager"), `got: ${roles.join(", ")}`);
  });

  it("UX research packet → UX Researcher", () => {
    const roles = rolesAboveThreshold("Evaluate usability and user flow friction. Run heuristic evaluation on the user experience.");
    assert.ok(roles.includes("UX Researcher"), `got: ${roles.join(", ")}`);
  });
});

// ── Chain assembly ────────────────────────────────────────────────────────────

describe("assembleChain", () => {
  it("Orchestrator is first, Critic Reviewer is last", () => {
    const roles = ROLE_CATALOG.filter(r =>
      ["Orchestrator", "Backend Engineer", "Test Engineer", "Critic Reviewer"].includes(r.name)
    ).map(r => ({ role: r, score: r.alwaysInclude ? Infinity : 3, matched: [], reasons: [] }));

    const chain = assembleChain(roles);
    assert.equal(chain[0].role.name, "Orchestrator");
    assert.equal(chain[chain.length - 1].role.name, "Critic Reviewer");
  });

  it("research/product roles come before engineering roles", () => {
    const roles = ROLE_CATALOG.filter(r =>
      ["Orchestrator", "UX Researcher", "Backend Engineer", "Critic Reviewer"].includes(r.name)
    ).map(r => ({ role: r, score: r.alwaysInclude ? Infinity : 3, matched: [], reasons: [] }));

    const chain = assembleChain(roles);
    const names = chain.map(r => r.role.name);
    const researchIdx = names.indexOf("UX Researcher");
    const engIdx = names.indexOf("Backend Engineer");
    assert.ok(researchIdx < engIdx, `research (${researchIdx}) should be before engineering (${engIdx})`);
  });

  it("treatment-late roles (release, deploy) come after engineering", () => {
    const roles = ROLE_CATALOG.filter(r =>
      ["Orchestrator", "Backend Engineer", "Release Engineer", "Critic Reviewer"].includes(r.name)
    ).map(r => ({ role: r, score: r.alwaysInclude ? Infinity : 3, matched: [], reasons: [] }));

    const chain = assembleChain(roles);
    const names = chain.map(r => r.role.name);
    const engIdx = names.indexOf("Backend Engineer");
    const releaseIdx = names.indexOf("Release Engineer");
    assert.ok(engIdx < releaseIdx, `engineering (${engIdx}) should be before release (${releaseIdx})`);
  });
});

// ── Confidence ────────────────────────────────────────────────────────────────

describe("assessConfidence", () => {
  it("low when no roles score above threshold", () => {
    const scored = ROLE_CATALOG.map(r => ({
      role: r,
      score: r.alwaysInclude ? Infinity : 0,
      matched: [],
      reasons: [],
    }));
    assert.equal(assessConfidence(scored), "low");
  });

  it("high when 3+ roles score above threshold", () => {
    const scored = ROLE_CATALOG.map((r, i) => ({
      role: r,
      score: r.alwaysInclude ? Infinity : (i < 5 ? 3 : 0),
      matched: [],
      reasons: [],
    }));
    assert.equal(assessConfidence(scored), "high");
  });
});

// ── Type detection ────────────────────────────────────────────────────────────

describe("detectType", () => {
  it("detects identity from contamination keywords", () => {
    assert.equal(detectType("fix contamination from forked residue"), "identity");
  });

  it("detects integration from wiring keywords", () => {
    assert.equal(detectType("wire the bridge between these two services"), "integration");
  });

  it("defaults to feature", () => {
    assert.equal(detectType("build a new dashboard"), "feature");
  });

  it("reads explicit packet type header", () => {
    assert.equal(detectType("## Packet Type\nintegration\n\nWire things"), "integration");
  });
});

// ── Disambiguation pressure tests ─────────────────────────────────────────────
// Ambiguous packets that must resolve to the RIGHT role, not a near-neighbor.

describe("role disambiguation (Pass 3)", () => {
  function topRole(content, type = "feature") {
    const scored = ROLE_CATALOG
      .filter(r => !r.alwaysInclude)
      .map(r => ({ name: r.name, ...scoreRole(r, content, type, null) }))
      .filter(r => r.score >= MIN_SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.name || null;
  }

  it("Product Strategist wins over Spec Writer for scope framing", () => {
    const top = topRole("We need to frame the product problem and decide scope. Prioritize tradeoffs and user value.");
    assert.equal(top, "Product Strategist");
  });

  it("Spec Writer wins over Product Strategist for acceptance criteria", () => {
    const top = topRole("Write an execution-grade spec with acceptance criteria, edge cases, and non-functional requirements.");
    assert.equal(top, "Spec Writer");
  });

  it("Roadmap Prioritizer wins for sequencing/backlog", () => {
    const top = topRole("Sequence the backlog by leverage and dependency. What should we stop doing?");
    assert.equal(top, "Roadmap Prioritizer");
  });

  it("Test Engineer wins over Coverage Auditor for implementation testing", () => {
    const top = topRole("Write tests for this new API endpoint. Cover edge cases and verify regression defense.");
    assert.equal(top, "Test Engineer");
  });

  it("Coverage Auditor wins over Test Engineer for test quality audit", () => {
    const top = topRole("Assess test coverage truthfully. Find false confidence and untested paths. Identify missing defense.");
    assert.equal(top, "Coverage Auditor");
  });

  it("Docs Architect wins for documentation AND information structure", () => {
    const top = topRole("Restructure the documentation. Fix navigation hierarchy, improve findability, and build a Starlight handbook.");
    assert.equal(top, "Docs Architect");
  });

  it("Launch Strategist wins over Launch Copywriter for launch planning", () => {
    const top = topRole("Plan the launch with channel selection, timing, proof packaging, and success criteria for go-to-market.");
    assert.equal(top, "Launch Strategist");
  });

  it("Launch Copywriter wins over Launch Strategist for writing copy", () => {
    const top = topRole("Write the release notes copy, positioning messaging, and announcement text for the new version.");
    assert.equal(top, "Launch Copywriter");
  });

  it("Performance Engineer wins for profiling, not general Backend", () => {
    const top = topRole("Profile the hot path for latency regression. Run benchmarks and check the performance budget.");
    assert.equal(top, "Performance Engineer");
  });

  it("Security Reviewer wins for security, not general Backend", () => {
    const top = topRole("Security review: check for injection, auth bypass, secrets exposure, and OWASP patterns.");
    assert.equal(top, "Security Reviewer");
  });

  it("Brand Guardian wins for identity contamination, not Metadata Curator", () => {
    const top = topRole("Audit for identity contamination and fork residue. Check terminology consistency and replacement doctrine.");
    assert.equal(top, "Brand Guardian");
  });

  it("Metadata Curator wins for package metadata, not Brand Guardian", () => {
    const top = topRole("Audit the package.json manifest, fix badges, update homepage and registry metadata.");
    assert.equal(top, "Metadata Curator");
  });
});
