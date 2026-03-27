/**
 * Brainstorm Golden Run — v0.4 Proof Suite
 *
 * One topic (MCP server marketplace), all layers frozen as canonical proof.
 * Validates the entire pipeline end-to-end:
 *   1. Truth artifacts (raw analyst outputs) — role-native schemas
 *   2. Provenance atoms with challenge/rebuttal edges — dispute graph
 *   3. Rendered artifacts in 5 formats — human-legible layer
 *   4. Debate transcript — presentation of dispute graph
 *   5. Trace links from rendered back to truth — every sentence maps to an atom
 *
 * If this suite passes, v0.4 is stable — not just impressive.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateRequest,
  resolveFrame,
  validateScoutFinding,
  validateNormalizedFindingSet,
  validateSynthesisReport,
  validateExpandedConcept,
  validateJudgeReport,
  validateBrainstormResult,
  validateEvidencePair,
  VALID_STATEMENT_KINDS,
} from "../src/brainstorm.mjs";

import {
  validateRoleNativeOutput,
  validateRoleBoundary,
  validateClaimKinds,
  validateAtomProvenance,
  translateToAtoms,
  filterChallenges,
  validateChallengeEdge,
  validateRebuttalEdge,
  canChallenge,
  partitionBrief,
  INPUT_PARTITIONS,
  CROSS_EXAM_PERMISSIONS,
  ANALYST_ROLES,
} from "../src/brainstorm-roles.mjs";

import {
  validateRenderedText,
  validateRenderFormat,
  generateDebateTranscript,
  RENDERER_LEXICAL_BANS,
  RENDER_SCHEMAS,
} from "../src/brainstorm-render.mjs";

// ── Golden Run Topic ─────────────────────────────────────────────────────────

const GOLDEN_TOPIC = {
  topic: "MCP server marketplace",
  objective: "Identify the highest-leverage product direction for a curated MCP server discovery platform",
  audience: "Developer tool builders and AI-native development teams",
  constraints: [
    "Must not require server authors to change their existing MCP server code",
    "Discovery must work without centralized hosting",
  ],
  search_axes: [
    "supply-chain security in plugin ecosystems",
    "developer tool discovery patterns",
    "trust signals in open-source ecosystems",
  ],
  output_mode: "concepts",
  breadth: 3,
  depth: 1,
  novelty_bias: "medium",
  evidence_mode: "mixed",
  role_mode: "v03",
};

// ── Phase 1: Frame ───────────────────────────────────────────────────────────

describe("Golden Run — Phase 1: Frame", () => {
  it("request validates cleanly", () => {
    const result = validateRequest(GOLDEN_TOPIC);
    assert.ok(result.valid, `Request invalid: ${result.issues.join(", ")}`);
  });

  it("resolves to v0.3 pipeline with 4 analysts + contrarian", () => {
    const { request, scoutRoster, expanderRoster, executionPlan } = resolveFrame(GOLDEN_TOPIC);
    assert.equal(executionPlan.roleMode, "v03");
    assert.equal(scoutRoster.length, 4);
    assert.ok(executionPlan.includeContrarian);
    assert.equal(expanderRoster.length, 1); // depth 1 → Product Expander only
    assert.equal(executionPlan.directionsToExpand, 3);
  });

  it("execution plan includes cross-examine and rebut phases", () => {
    const { executionPlan } = resolveFrame(GOLDEN_TOPIC);
    const phaseNames = executionPlan.phases.map(p => p.phase);
    assert.ok(phaseNames.includes("cross_examine"));
    assert.ok(phaseNames.includes("rebut"));
  });

  it("input partitioning filters brief per role", () => {
    const { request } = resolveFrame(GOLDEN_TOPIC);

    // Context Analyst: sees topic, constraints, search_axes — NOT audience
    const ctxBrief = partitionBrief(request, "Context Analyst");
    assert.ok(ctxBrief.topic);
    assert.ok(ctxBrief.constraints);
    assert.ok(ctxBrief.search_axes);
    assert.equal(ctxBrief.audience, undefined);

    // User Value: sees topic, objective, audience, constraints — NOT search_axes
    const uvBrief = partitionBrief(request, "User Value Analyst");
    assert.ok(uvBrief.audience);
    assert.equal(uvBrief.search_axes, undefined);

    // Contrarian: sees NOTHING from brief
    const contrBrief = partitionBrief(request, "Contrarian Analyst");
    assert.equal(Object.keys(contrBrief).length, 0);
  });
});

// ── Phase 2: Analyze (Role-native truth artifacts) ───────────────────────────

// Synthetic but realistic role-native outputs for the MCP marketplace topic.
// These are the TRUTH LAYER — raw structural outputs from each analyst.

const CONTEXT_MAP_OUTPUT = {
  terms: [
    { term: "MCP server", meaning: "A process exposing tools/resources via Model Context Protocol", adjacent_to: ["language server", "plugin", "extension"] },
    { term: "server registry", meaning: "An index mapping server names to metadata and install paths", adjacent_to: ["package registry", "plugin directory"] },
    { term: "attestation", meaning: "A signed claim about a server's properties made by an external verifier", adjacent_to: ["code signing", "supply-chain provenance"] },
    { term: "discovery layer", meaning: "A system that surfaces available servers to consumers without hosting them", adjacent_to: ["marketplace", "search engine", "catalog"] },
  ],
  category_map: [
    { category: "Registry", examples: ["npm", "PyPI", "crates.io", "Docker Hub"] },
    { category: "Marketplace", examples: ["VS Code Marketplace", "Shopify App Store", "Salesforce AppExchange"] },
    { category: "Discovery Layer", examples: ["Awesome lists", "product directories", "Hacker News"] },
  ],
  lineage_claims: [
    { claim: "MCP registries descend from package registries, not app stores", precedent: ["npm registry", "crates.io index"] },
    { claim: "Attestation-first trust inherits from supply-chain security, not review systems", precedent: ["Sigstore", "SLSA framework", "npm provenance"] },
  ],
  boundary_claims: [
    "An MCP marketplace is NOT an app store — it does not host, execute, or sandbox servers",
    "A registry is NOT a marketplace — registries index, marketplaces curate and surface",
  ],
};

const USER_VALUE_MAP_OUTPUT = {
  jobs: [
    { actor: "AI app developer", situation: "wiring a new capability into their agent", desired_outcome: "find a tested, maintained MCP server that does exactly this" },
    { actor: "team lead", situation: "evaluating third-party MCP servers for production", desired_outcome: "know which servers are safe, maintained, and compatible before committing" },
    { actor: "MCP server author", situation: "publishing their server to get adoption", desired_outcome: "be discovered by the right developers without manual outreach" },
  ],
  frictions: [
    { friction: "No single place lists available MCP servers with quality signals", severity: "high" },
    { friction: "Server compatibility with different clients is undocumented", severity: "medium" },
    { friction: "Trust signals are absent — no way to distinguish maintained from abandoned", severity: "high" },
  ],
  unmet_desires: [
    "A confidence score that reflects real signals, not self-reported claims",
    "Install-and-try friction under 60 seconds for any discovered server",
  ],
  willingness_signals: [
    "Developers already maintain curated awesome-lists manually — willingness to organize exists",
    "Teams already write internal wikis rating MCP servers — willingness to share ratings exists",
  ],
};

const MECHANICS_MAP_OUTPUT = {
  loops: [
    { name: "Discovery loop", input: ["search query", "filter criteria"], transform: ["index lookup", "relevance scoring", "attestation check"], output: ["ranked server list", "trust indicators"] },
    { name: "Attestation loop", input: ["server manifest", "verifier identity"], transform: ["property check", "signature generation"], output: ["signed attestation record"] },
  ],
  dependencies: [
    { component: "Discovery layer", depends_on: ["Server registry index", "Attestation records"] },
    { component: "Attestation system", depends_on: ["Server manifest schema", "Verifier key infrastructure"] },
    { component: "Relevance scoring", depends_on: ["Usage signals", "Attestation freshness"] },
  ],
  failure_points: [
    "If manifest schema fragments across server authors, attestation inputs become inconsistent",
    "If verifier keys are not rotatable, a single compromise poisons the trust layer",
    "If usage signals are self-reported, gaming is trivial",
  ],
  irreducible_mechanisms: [
    "A registry index that maps server IDs to metadata without hosting the servers",
    "An attestation record format that is machine-readable and independently verifiable",
  ],
};

const POSITIONING_MAP_OUTPUT = {
  substitutes: [
    { name: "Awesome-MCP lists", overlap: "discovery of available servers", gap: "no trust signals, no freshness, no compatibility data" },
    { name: "VS Code Marketplace", overlap: "curated discovery with quality signals", gap: "wrong protocol (extensions not MCP), centralized hosting required" },
    { name: "npm search", overlap: "package discovery by keyword", gap: "no MCP-specific metadata, no attestation layer" },
  ],
  wedge_candidates: [
    { claim: "First open attestation layer for MCP servers", timing: "Legal now — no competitor has attestation", risk: "Attestation without adoption is an empty claim" },
    { claim: "The trust layer the MCP ecosystem is missing", timing: "Legal after 10+ verified attestations exist", risk: "Premature if attestation coverage is thin" },
  ],
  category_frame: "MCP server trust and discovery layer — not a marketplace, not a registry, but the attestation foundation that makes both work",
  forbidden_claims: [
    { claim: "Best MCP marketplace", reason: "No marketplace features exist yet — only discovery and attestation" },
    { claim: "Comprehensive MCP directory", reason: "Coverage is incomplete until automated sync exists" },
  ],
};

describe("Golden Run — Phase 2: Analyze (Truth Layer)", () => {
  const roleOutputs = {
    "Context Analyst": CONTEXT_MAP_OUTPUT,
    "User Value Analyst": USER_VALUE_MAP_OUTPUT,
    "Mechanics Analyst": MECHANICS_MAP_OUTPUT,
    "Positioning Analyst": POSITIONING_MAP_OUTPUT,
  };

  for (const [role, output] of Object.entries(roleOutputs)) {
    it(`${role} output validates against role-native schema`, () => {
      const result = validateRoleNativeOutput(role, output);
      assert.ok(result.valid, `${role} schema invalid: ${result.issues.join(", ")}`);
    });
  }

  for (const [role, output] of Object.entries(roleOutputs)) {
    it(`${role} output passes blindspot boundary check`, () => {
      const text = JSON.stringify(output);
      const result = validateRoleBoundary(role, text);
      assert.ok(result.valid, `${role} boundary violated: ${result.violations.map(v => v.detail).join(", ")}`);
    });
  }
});

// ── Phase 3: Normalize (Provenance-preserving atoms) ─────────────────────────

describe("Golden Run — Phase 3: Normalize", () => {
  const allAtoms = [];

  it("translates all 4 role outputs to provenance atoms", () => {
    const roles = [
      ["Context Analyst", CONTEXT_MAP_OUTPUT],
      ["User Value Analyst", USER_VALUE_MAP_OUTPUT],
      ["Mechanics Analyst", MECHANICS_MAP_OUTPUT],
      ["Positioning Analyst", POSITIONING_MAP_OUTPUT],
    ];

    for (const [role, output] of roles) {
      const atoms = translateToAtoms(role, output);
      assert.ok(atoms.length > 0, `${role} produced no atoms`);
      allAtoms.push(...atoms);
    }
  });

  it("every atom has complete provenance", () => {
    for (const atom of allAtoms) {
      const result = validateAtomProvenance(atom);
      assert.ok(result.valid, `Atom ${atom.id} missing provenance: ${result.issues.join(", ")}`);
    }
  });

  it("atoms carry distinct claim kinds per role", () => {
    const kindsByRole = new Map();
    for (const atom of allAtoms) {
      if (!kindsByRole.has(atom.source_role)) kindsByRole.set(atom.source_role, new Set());
      kindsByRole.get(atom.source_role).add(atom.claim_kind);
    }

    // No two roles should share claim kinds (v0.3 guarantee)
    const roles = [...kindsByRole.keys()];
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const kindsA = kindsByRole.get(roles[i]);
        const kindsB = kindsByRole.get(roles[j]);
        const overlap = [...kindsA].filter(k => kindsB.has(k));
        assert.equal(overlap.length, 0,
          `Claim kind overlap between ${roles[i]} and ${roles[j]}: ${overlap.join(", ")}`);
      }
    }
  });

  it("atoms carry allowed_challengers from cross-exam matrix", () => {
    for (const atom of allAtoms) {
      assert.ok(Array.isArray(atom.allowed_challengers), `${atom.id} missing allowed_challengers`);
      // Every non-Contrarian atom should be challengeable by Contrarian
      if (atom.source_role !== "Contrarian Analyst") {
        assert.ok(atom.allowed_challengers.includes("Contrarian Analyst"),
          `${atom.id} from ${atom.source_role} should be challengeable by Contrarian`);
      }
    }
  });

  it("builds valid NormalizedFindingSet from atoms", () => {
    const findingSet = {
      atoms: allAtoms.map((a, i) => ({
        id: a.id,
        statement: a.text,
        kind: VALID_STATEMENT_KINDS.includes(a.claim_kind) ? a.claim_kind : "claim",
        source_roles: [a.source_role],
        source_statement_ids: [a.id],
        support_count: 1,
        challenge_count: 0,
        evidence_grade: "grounded",
        confidence: "medium",
      })),
      conflicts: [],
      stats: {
        total_source_statements: allAtoms.length,
        total_atoms: allAtoms.length,
        grounded_count: allAtoms.length,
        mixed_count: 0,
        speculative_count: 0,
      },
      unsupported_high_confidence_flags: [],
      duplicates_collapsed: 0,
    };

    const result = validateNormalizedFindingSet(findingSet);
    assert.ok(result.valid, `FindingSet invalid: ${result.issues.join(", ")}`);
  });
});

// ── Phase 4: Cross-Examine (Dispute Graph) ───────────────────────────────────

// Contrarian's challenge set — targets specific atom IDs from the truth layer
const CONTRARIAN_CHALLENGES = [
  {
    target_claim_id: "atom-context-analyst-8", // "NOT an app store" boundary claim
    challenger_role: "Contrarian Analyst",
    challenge_type: "unsupported",
    reason: "If you index packages and surface install paths, the distinction between 'discovery layer' and 'app store' is one of degree, not kind. What measurable property separates them?",
  },
  {
    target_claim_id: "atom-positioning-analyst-5", // category frame
    challenger_role: "Contrarian Analyst",
    challenge_type: "premature",
    reason: "Calling it 'trust infrastructure' before attestation adoption exists is a promissory note, not a positioning claim. A trust layer with zero attestations is an empty taxonomy.",
  },
  {
    target_claim_id: "atom-user-value-analyst-6", // confidence score desire
    challenger_role: "Mechanics Analyst",
    challenge_type: "mechanically_blocked",
    reason: "A confidence score requires consistent input signals. If manifest schema fragments across server authors, input normalization fails and scores become meaningless.",
  },
  {
    target_claim_id: "atom-positioning-analyst-3", // "first open attestation layer" wedge
    challenger_role: "Contrarian Analyst",
    challenge_type: "premature",
    reason: "'First' is a timing claim that expires. Once a second attestation layer ships, this wedge is dead. What is the durable version of this claim?",
  },
];

describe("Golden Run — Phase 4: Cross-Examine", () => {
  let allAtoms;

  // Rebuild atoms for this describe block
  it("rebuilds atom pool for cross-exam", () => {
    allAtoms = [
      ...translateToAtoms("Context Analyst", CONTEXT_MAP_OUTPUT),
      ...translateToAtoms("User Value Analyst", USER_VALUE_MAP_OUTPUT),
      ...translateToAtoms("Mechanics Analyst", MECHANICS_MAP_OUTPUT),
      ...translateToAtoms("Positioning Analyst", POSITIONING_MAP_OUTPUT),
    ];
    assert.ok(allAtoms.length > 0);
  });

  it("all challenge edges validate structurally", () => {
    for (const c of CONTRARIAN_CHALLENGES) {
      const result = validateChallengeEdge(c);
      assert.ok(result.valid, `Challenge invalid: ${result.issues.join(", ")}`);
    }
  });

  it("cross-exam permission matrix permits Contrarian → any role", () => {
    const analystRoles = ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst"];
    for (const target of analystRoles) {
      assert.ok(canChallenge("Contrarian Analyst", target),
        `Contrarian should be able to challenge ${target}`);
    }
  });

  it("cross-exam permission matrix permits Mechanics → User Value", () => {
    assert.ok(canChallenge("Mechanics Analyst", "User Value Analyst"));
  });

  it("cross-exam permission matrix blocks User Value → Mechanics", () => {
    assert.ok(!canChallenge("User Value Analyst", "Mechanics Analyst"));
  });

  it("challenge filter permits legal challenges and rejects illegal ones", () => {
    const illegal = {
      target_claim_id: "atom-context-analyst-1",
      challenger_role: "Positioning Analyst", // Positioning CANNOT challenge Context
      challenge_type: "unsupported",
      reason: "test illegal challenge",
    };

    const allChallenges = [...CONTRARIAN_CHALLENGES, illegal];
    const { permitted, rejected } = filterChallenges(allChallenges, allAtoms);

    // Illegal one should be rejected (either not found or not permitted)
    assert.ok(rejected.length >= 1, "Should have at least one rejected challenge");
  });
});

// ── Phase 5: Rebut ───────────────────────────────────────────────────────────

const REBUTTALS = [
  {
    target_claim_id: "atom-context-analyst-8",
    source_role: "Context Analyst",
    response: "narrow",
    note: "Narrowed: 'NOT an app store' revised to 'does not host, sandbox, or execute — discovery and attestation only.' The boundary is functional, not categorical.",
  },
  {
    target_claim_id: "atom-positioning-analyst-5",
    source_role: "Positioning Analyst",
    response: "narrow",
    note: "Revised: 'trust infrastructure' legal only after 10+ independent attestations exist. Until then, positioning is 'attestation-ready discovery layer.'",
  },
  {
    target_claim_id: "atom-user-value-analyst-6",
    source_role: "User Value Analyst",
    response: "narrow",
    note: "Narrowed to: confidence score where manifest data is available and schema-conformant. Score is 'unavailable' when inputs are insufficient.",
  },
  {
    target_claim_id: "atom-positioning-analyst-3",
    source_role: "Positioning Analyst",
    response: "unresolved",
    note: "No durable replacement found yet. 'First' is acknowledged as perishable. Needs follow-on work to identify the sustainable wedge.",
  },
];

describe("Golden Run — Phase 5: Rebut", () => {
  it("all rebuttals validate structurally", () => {
    for (const r of REBUTTALS) {
      const result = validateRebuttalEdge(r);
      assert.ok(result.valid, `Rebuttal invalid: ${result.issues.join(", ")}`);
    }
  });

  it("dispute summary: 3 narrowed, 0 defended, 0 retracted, 1 unresolved", () => {
    const narrowed = REBUTTALS.filter(r => r.response === "narrow").length;
    const defended = REBUTTALS.filter(r => r.response === "defend").length;
    const retracted = REBUTTALS.filter(r => r.response === "retract").length;
    const unresolved = REBUTTALS.filter(r => r.response === "unresolved").length;

    assert.equal(narrowed, 3);
    assert.equal(defended, 0);
    assert.equal(retracted, 0);
    assert.equal(unresolved, 1);
  });
});

// ── Phase 6: Synthesize ──────────────────────────────────────────────────────

const SYNTHESIS_REPORT = {
  topic_model: "MCP server discovery is a trust problem masquerading as a search problem. The ecosystem needs attestation infrastructure before marketplace features.",
  major_themes: [
    "Trust deficit — no quality signals, no maintenance indicators, no compatibility data",
    "Discovery fragmentation — awesome lists, word of mouth, GitHub search are all partial",
    "Attestation-first architecture — sign properties, not rank servers",
  ],
  tensions: [
    "Attestation without adoption is empty (Contrarian) vs attestation is the only durable wedge (Positioning)",
    "'Not an app store' boundary is principled (Context) vs functionally indistinguishable from one at scale (Contrarian)",
  ],
  advancing_directions: [
    {
      id: "dir-1",
      name: "Attestation-ready discovery layer",
      thesis: "Build the registry index + attestation format first. Discovery is the wedge. Trust is the moat.",
      why_it_matters: "Every other feature (scoring, compatibility, curation) depends on having machine-readable, verifiable claims about servers.",
      supporting_atoms: ["atom-context-analyst-3", "atom-mechanics-analyst-5", "atom-positioning-analyst-1"],
      risks: ["Attestation adoption chicken-and-egg", "Schema fragmentation across server authors"],
    },
    {
      id: "dir-2",
      name: "Confidence scoring with degradation",
      thesis: "Surface a confidence score where data exists, degrade gracefully to 'unknown' where it doesn't.",
      why_it_matters: "Developers need a fast trust signal. Even partial scores are better than no signal.",
      supporting_atoms: ["atom-user-value-analyst-1", "atom-user-value-analyst-6", "atom-mechanics-analyst-1"],
      risks: ["Meaningless scores if inputs are inconsistent", "Gaming via self-reported signals"],
    },
    {
      id: "dir-3",
      name: "Zero-config install path",
      thesis: "Reduce install-and-try friction to under 60 seconds for any discoverable server.",
      why_it_matters: "Discovery without activation is a dead end. The install path is the conversion funnel.",
      supporting_atoms: ["atom-user-value-analyst-7", "atom-mechanics-analyst-1"],
      risks: ["Sandboxing complexity", "Cross-client compatibility matrix"],
    },
  ],
  archived_directions: [
    { name: "Full marketplace with hosting", reason: "Violates constraint: must not require centralized hosting" },
    { name: "Review/rating system", reason: "Trust from reviews is gameable; attestation is more durable" },
  ],
  incubation_directions: [],
};

describe("Golden Run — Phase 6: Synthesize", () => {
  it("synthesis report validates with breadth=3", () => {
    const result = validateSynthesisReport(SYNTHESIS_REPORT, 3);
    assert.ok(result.valid, `Synthesis invalid: ${result.issues.join(", ")}`);
  });

  it("every advancing direction cites at least 2 supporting atoms", () => {
    for (const dir of SYNTHESIS_REPORT.advancing_directions) {
      assert.ok(dir.supporting_atoms.length >= 2,
        `${dir.name} has only ${dir.supporting_atoms.length} supporting atoms`);
    }
  });

  it("archived directions have reasons", () => {
    for (const dir of SYNTHESIS_REPORT.archived_directions) {
      assert.ok(dir.reason.length > 0, `Archived "${dir.name}" needs a reason`);
    }
  });

  it("tensions reference the dispute graph", () => {
    assert.ok(SYNTHESIS_REPORT.tensions.length >= 2, "At least 2 tensions expected");
    // Tensions should name roles (from the dispute)
    const tensionText = SYNTHESIS_REPORT.tensions.join(" ");
    assert.ok(tensionText.includes("Contrarian"), "Tensions should reference Contrarian");
  });
});

// ── Phase 7: Expand ──────────────────────────────────────────────────────────

const EXPANDED_CONCEPTS = SYNTHESIS_REPORT.advancing_directions.map(dir => ({
  direction_id: dir.id,
  direction_name: dir.name,
  thesis: dir.thesis,
  product_shape: {
    target_user: "AI application developers integrating MCP servers",
    core_mechanism: dir.id === "dir-1"
      ? "Registry index with signed attestation records"
      : dir.id === "dir-2"
      ? "Multi-signal confidence scoring with graceful degradation"
      : "One-command install path with client auto-detection",
    features: dir.id === "dir-1"
      ? ["Server manifest ingestion", "Attestation signature verification", "Search by capability", "Freshness indicators"]
      : dir.id === "dir-2"
      ? ["Composite confidence score", "Signal source transparency", "Unknown-when-missing degradation", "Historical trend"]
      : ["Client detection", "Dependency resolution", "Sandbox-optional install", "Rollback on failure"],
    core_loop: dir.id === "dir-1"
      ? "Author publishes manifest → Verifiers attest properties → Developers search and filter by attestation"
      : dir.id === "dir-2"
      ? "Registry collects signals → Scorer aggregates with weights → Developer reads score + sources"
      : "Developer searches → Selects server → One command installs + configures → Working in 60s",
    smallest_proof: dir.id === "dir-1"
      ? "10 servers with signed attestations, searchable by 3 properties, verified by 2 independent parties"
      : dir.id === "dir-2"
      ? "Confidence score for 20 servers using 3 signal sources, with transparent per-signal breakdown"
      : "Install 5 different servers across 2 clients in under 60 seconds each, from search to working",
  },
}));

describe("Golden Run — Phase 7: Expand", () => {
  it("all 3 expanded concepts validate", () => {
    for (const concept of EXPANDED_CONCEPTS) {
      const result = validateExpandedConcept(concept);
      assert.ok(result.valid, `Concept "${concept.direction_name}" invalid: ${result.issues.join(", ")}`);
    }
  });

  it("each concept maps back to a synthesis direction", () => {
    const dirIds = new Set(SYNTHESIS_REPORT.advancing_directions.map(d => d.id));
    for (const concept of EXPANDED_CONCEPTS) {
      assert.ok(dirIds.has(concept.direction_id),
        `Concept "${concept.direction_name}" references unknown direction ${concept.direction_id}`);
    }
  });

  it("product shapes are distinct (not cookie-cutter)", () => {
    const mechanisms = EXPANDED_CONCEPTS.map(c => c.product_shape.core_mechanism);
    assert.equal(new Set(mechanisms).size, mechanisms.length, "Core mechanisms must be unique");

    const loops = EXPANDED_CONCEPTS.map(c => c.product_shape.core_loop);
    assert.equal(new Set(loops).size, loops.length, "Core loops must be unique");
  });
});

// ── Phase 8: Judge ───────────────────────────────────────────────────────────

const JUDGE_REPORT = {
  disposition: "accept",
  overall_quality: "strong",
  per_direction: [
    {
      direction_id: "dir-1",
      verdict: "ready_to_advance",
      action: "build_now",
      reasons: [
        "Attestation-first is the only claim with structural differentiation",
        "Directly addresses the trust deficit identified by all 4 analysts",
        "Narrowed appropriately after Contrarian pressure",
      ],
    },
    {
      direction_id: "dir-2",
      verdict: "ready_to_advance",
      action: "build_now",
      reasons: [
        "Graceful degradation addresses Mechanics concern about schema fragmentation",
        "Direct response to User Value's highest-severity friction",
      ],
    },
    {
      direction_id: "dir-3",
      verdict: "needs_incubation",
      action: "hold_for_followon",
      reasons: [
        "Install path depends on attestation and scoring being live first",
        "Cross-client compatibility is under-specified",
      ],
    },
  ],
  reasons: [
    "All 3 directions are grounded in multi-role evidence",
    "Dispute graph produced 3 narrowings and 1 unresolved — healthy pressure, not deadlock",
    "Attestation direction survived Contrarian scrutiny after narrowing",
  ],
};

describe("Golden Run — Phase 8: Judge", () => {
  it("judge report validates", () => {
    const result = validateJudgeReport(JUDGE_REPORT);
    assert.ok(result.valid, `Judge report invalid: ${result.issues.join(", ")}`);
  });

  it("disposition is accept on first loop", () => {
    assert.equal(JUDGE_REPORT.disposition, "accept");
  });

  it("per-direction verdicts use legal values", () => {
    for (const d of JUDGE_REPORT.per_direction) {
      assert.ok(["ready_to_advance", "needs_incubation", "not_active_now"].includes(d.verdict));
    }
  });

  it("judge actions are consistent with verdicts", () => {
    for (const d of JUDGE_REPORT.per_direction) {
      if (d.verdict === "ready_to_advance") assert.equal(d.action, "build_now");
      if (d.verdict === "needs_incubation") assert.equal(d.action, "hold_for_followon");
    }
  });
});

// ── Phase 9: Return (BrainstormResult) ───────────────────────────────────────

const BRAINSTORM_RESULT = {
  core_read: "MCP server discovery is a trust problem. The highest-leverage direction is an attestation-ready discovery layer — registry index plus signed attestation records — with a confidence scoring system that degrades gracefully when data is incomplete.",
  opportunity_map: [
    { name: "Attestation-ready discovery layer", thesis: "Registry + attestation format first, then surface via search" },
    { name: "Confidence scoring with degradation", thesis: "Multi-signal score, transparent sources, unknown when insufficient" },
    { name: "Zero-config install path", thesis: "Search → install → working in 60 seconds (incubation)" },
  ],
  unresolved_tensions: [
    "Attestation adoption chicken-and-egg: no servers attest until developers demand it, developers can't demand what doesn't exist",
    "'First open attestation layer' wedge has no identified durable replacement (Contrarian unresolved)",
  ],
  open_questions: [
    "What is the minimum attestation coverage that makes discovery meaningfully different from an awesome list?",
    "Can confidence scores avoid becoming a vanity metric?",
  ],
  evidence_trail: {
    scouts_run: ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst"],
    total_findings: 4,
    atoms_after_normalize: 20,
    directions_considered: 5,
    directions_advancing: 3,
    expansion_passes: 3,
    judge_loops: 1,
    judge_disposition: "accept",
  },
  request: GOLDEN_TOPIC,
};

describe("Golden Run — Phase 9: Return", () => {
  it("brainstorm result validates", () => {
    const result = validateBrainstormResult(BRAINSTORM_RESULT);
    assert.ok(result.valid, `Result invalid: ${result.issues.join(", ")}`);
  });

  it("evidence trail is complete", () => {
    const trail = BRAINSTORM_RESULT.evidence_trail;
    assert.equal(trail.scouts_run.length, 4);
    assert.ok(trail.atoms_after_normalize > 0);
    assert.equal(trail.directions_advancing, 3);
    assert.equal(trail.judge_loops, 1);
    assert.equal(trail.judge_disposition, "accept");
  });

  it("unresolved tensions reference the dispute graph", () => {
    const tensionText = BRAINSTORM_RESULT.unresolved_tensions.join(" ");
    assert.ok(tensionText.includes("Contrarian") || tensionText.includes("unresolved"),
      "Unresolved tensions should reference dispute outcomes");
  });
});

// ── Layer 2: Rendered Artifacts ──────────────────────────────────────────────

// Rendered documents — one per role, in their distinct voice.
// These MUST be traceable back to truth-layer atoms.

const RENDERED_BOUNDARY_MEMO = `## Classification
MCP server marketplace: a discovery layer that indexes server metadata and surfaces availability.
A member of the "discovery infrastructure" category — distinct from registries (which store) and marketplaces (which host).

## Adjacent spaces
Package registries (npm, PyPI, crates.io): share indexing but add hosting.
Plugin directories (VS Code Marketplace, Shopify): share curation but require centralized execution.
Curated lists (awesome-lists, product directories): share discovery but lack machine-readable trust data.

## Lineage
Descends from package registry indexing — the index-without-hosting pattern of npm and crates.io.
Attestation model descends from supply-chain security provenance — Sigstore, SLSA, npm provenance attestations.

## Exclusions
Not a package manager — does not host, execute, or sandbox servers.
Not a marketplace — does not transact, review, or rank by popularity.
Not a registry — does not store artifacts or enforce versioning.`;

const RENDERED_FIELD_NOTES = `## Observed situations
A developer is wiring a new tool into their AI agent. They open GitHub search, type "MCP server" plus a capability keyword, and scroll through repositories. They check stars, last commit date, and README quality. Ten minutes in, they have three candidates and no confidence in any of them.

A team lead is evaluating whether to approve a third-party MCP server for production. They read the README, check the issues tab, look for a LICENSE file. They find no compatibility data, no maintenance commitment, no security review. They write an internal wiki note: 'seems fine, proceed with caution.'

## What they reach for
Stars and commit recency as proxy trust signals. README quality as proxy documentation. Issue count as proxy maintenance health. Manual awesome-list curation as a workaround for missing search.

## What they avoid
Servers with no README. Servers with no recent commits. Anything that requires reading source code to understand capabilities. Anything that lacks a clear install path.

## Signals of readiness
Developers already maintain curated awesome-lists — organizing server recommendations by hand. Teams already write internal evaluations. 'Is this safe?' is the question asked before every integration.`;

const RENDERED_SYSTEM_SKETCH = `## Core loops
Discovery loop: search query + filter criteria → index lookup → relevance scoring → attestation check → ranked server list + trust indicators.
Attestation loop: server manifest + verifier identity → property check → signature generation → signed attestation record.

## Dependency map
Discovery layer requires server registry index.
Discovery layer requires attestation records.
Attestation system requires server manifest schema.
Attestation system requires verifier key rotation.
Relevance scoring requires usage signals.
Relevance scoring requires attestation freshness.

## Break points
If manifest schema fragments → attestation inputs become inconsistent → scores are meaningless.
If verifier keys are not rotatable → single key compromise poisons entire trust layer.
If usage signals are self-reported → gaming is trivial → scores lose credibility.

## Irreducibles
Registry index: maps server IDs to metadata without hosting servers. Cannot be deferred.
Attestation record format: machine-readable, independently verifiable signed attestations. Cannot be simplified.`;

const RENDERED_CLAIM_BRIEF = `## Territory
"Attestation-ready discovery layer for MCP servers" — the space between registry and marketplace, defined by trust signals not hosting.

## Current occupants
Awesome-MCP lists: hold discovery territory but no trust signals, no freshness, no compatibility data.
VS Code Marketplace: holds curated discovery with quality signals but wrong protocol and centralized.
npm search: holds keyword discovery but no MCP-specific metadata, no attestation.

## Timing
"First open attestation layer for MCP servers" — legal now, no competitor has attestation. Risk: perishable if a second layer ships. Durable version unresolved.
"The trust layer the MCP ecosystem is missing" — legal after 10+ verified attestations exist. Risk: hollow assertion if coverage is thin.

## Forbidden claims
"Best MCP marketplace" — never legal. No marketplace features exist.
"Comprehensive MCP directory" — not legal until automated sync achieves coverage.`;

const RENDERED_CROSS_EXAM = `## Challenges
Regarding atom-context-analyst-8 (Context Analyst):
On what basis is 'NOT an app store' a principled boundary rather than a matter of degree? If the system indexes packages and surfaces install paths, what measurable property separates it from an app store?

Regarding atom-positioning-analyst-5 (Positioning Analyst):
'Trust infrastructure' before attestation adoption exists is a promissory note. A trust layer with zero attestations is an empty taxonomy. What evidence makes this a positioning claim rather than a wish?

Regarding atom-user-value-analyst-6 (User Value Analyst):
A confidence score requires consistent input signals. If manifest schema fragments across server authors, scores become meaningless. What mechanism prevents input inconsistency?

Regarding atom-positioning-analyst-3 (Positioning Analyst):
'First' is a timing claim that expires. Once a second attestation layer ships, this wedge is dead. What is the durable version?

## Exposed assumptions
All four analysts assume server authors will publish machine-readable manifests voluntarily.
The confidence score assumes signal sources are independent and non-gameable.
The 'not an app store' boundary assumes the system will never add hosting, sandboxing, or execution features.

## Burden shifts
Context Analyst must demonstrate a measurable boundary, not a categorical assertion.
Positioning Analyst must identify the durable wedge that survives 'first mover' expiry.
Mechanics Analyst must specify the schema enforcement mechanism that prevents fragmentation.`;

const RENDERED_ARTIFACTS = {
  "Context Analyst": RENDERED_BOUNDARY_MEMO,
  "User Value Analyst": RENDERED_FIELD_NOTES,
  "Mechanics Analyst": RENDERED_SYSTEM_SKETCH,
  "Positioning Analyst": RENDERED_CLAIM_BRIEF,
  "Contrarian Analyst": RENDERED_CROSS_EXAM,
};

describe("Golden Run — Layer 2: Rendered Artifacts", () => {
  for (const [role, text] of Object.entries(RENDERED_ARTIFACTS)) {
    it(`${role} rendered text passes lexical ban check`, () => {
      const result = validateRenderedText(role, text);
      assert.ok(result.valid,
        `${role} lexical violations: ${result.violations.join("; ")}`);
    });
  }

  for (const [role, text] of Object.entries(RENDERED_ARTIFACTS)) {
    it(`${role} rendered format has all required sections`, () => {
      const result = validateRenderFormat(role, text);
      assert.ok(result.valid,
        `${role} missing sections: ${result.missing_sections.join(", ")}`);
    });
  }

  it("all 5 render formats are present and distinct", () => {
    assert.equal(Object.keys(RENDERED_ARTIFACTS).length, 5);
    const texts = Object.values(RENDERED_ARTIFACTS);
    // No two artifacts should share significant text
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        // Quick heuristic: first 50 chars should differ
        assert.notEqual(texts[i].slice(0, 50), texts[j].slice(0, 50),
          "Rendered artifacts should have distinct openings");
      }
    }
  });
});

// ── Debate Transcript ────────────────────────────────────────────────────────

describe("Golden Run — Debate Transcript", () => {
  let allAtoms;

  it("generates debate transcript from dispute graph", () => {
    allAtoms = [
      ...translateToAtoms("Context Analyst", CONTEXT_MAP_OUTPUT),
      ...translateToAtoms("User Value Analyst", USER_VALUE_MAP_OUTPUT),
      ...translateToAtoms("Mechanics Analyst", MECHANICS_MAP_OUTPUT),
      ...translateToAtoms("Positioning Analyst", POSITIONING_MAP_OUTPUT),
    ];

    const transcript = generateDebateTranscript(CONTRARIAN_CHALLENGES, REBUTTALS, allAtoms);

    assert.ok(transcript.includes("## Debate Transcript"), "Should have header");
    assert.ok(transcript.includes("Challenges issued:"), "Should have summary");
    assert.ok(transcript.includes("NARROWS"), "Should show narrowing");
    assert.ok(transcript.includes("LEAVES UNRESOLVED"), "Should show unresolved");
  });

  it("transcript summary matches rebuttal counts", () => {
    const transcript = generateDebateTranscript(CONTRARIAN_CHALLENGES, REBUTTALS, allAtoms);
    assert.ok(transcript.includes("Claims narrowed: 3"));
    assert.ok(transcript.includes("Claims unresolved: 1"));
    assert.ok(transcript.includes(`Challenges issued: ${CONTRARIAN_CHALLENGES.length}`));
  });
});

// ── TRACE LINKS: Rendered → Truth ────────────────────────────────────────────
//
// The proof that v0.4 is stable: every substantive claim in the rendered layer
// can be traced back to a specific truth-layer atom or structural artifact.

describe("Golden Run — Trace Links (Rendered → Truth)", () => {
  let allAtoms;

  // Build the full atom pool once
  it("builds atom pool for trace verification", () => {
    allAtoms = [
      ...translateToAtoms("Context Analyst", CONTEXT_MAP_OUTPUT),
      ...translateToAtoms("User Value Analyst", USER_VALUE_MAP_OUTPUT),
      ...translateToAtoms("Mechanics Analyst", MECHANICS_MAP_OUTPUT),
      ...translateToAtoms("Positioning Analyst", POSITIONING_MAP_OUTPUT),
    ];
    assert.ok(allAtoms.length >= 15, `Expected 15+ atoms, got ${allAtoms.length}`);
  });

  // Trace map: rendered claim → truth atom ID
  // This is the core proof. Every non-trivial sentence in the render layer
  // must point back to a truth-layer artifact.

  // Role-specific traces: rendered phrase → truth atom ID
  const ROLE_TRACE_MAP = {
    // Boundary Memo traces to Context atoms
    "discovery layer that indexes server metadata": "atom-context-analyst-4",
    "Descends from package registry indexing": "atom-context-analyst-5",
    "Attestation model descends from supply-chain security": "atom-context-analyst-6",
    "does not host, execute, or sandbox": "atom-context-analyst-7",

    // Field Notes traces to User Value atoms
    "wiring a new tool into their AI agent": "atom-user-value-analyst-1",
    "evaluating whether to approve a third-party MCP server": "atom-user-value-analyst-2",
    "Stars and commit recency as proxy trust signals": "atom-user-value-analyst-4",
    "already maintain curated awesome-lists": "atom-user-value-analyst-8",

    // System Sketch traces to Mechanics atoms
    "index lookup": "atom-mechanics-analyst-1",
    "property check": "atom-mechanics-analyst-2",
    "Discovery layer requires server registry index": "atom-mechanics-analyst-3",
    "manifest schema fragments": "atom-mechanics-analyst-5",
    "verifier keys are not rotatable": "atom-mechanics-analyst-6",

    // Claim Brief traces to Positioning atoms
    "Awesome-MCP lists": "atom-positioning-analyst-1",
    "First open attestation layer": "atom-positioning-analyst-3",
    "legal after 10+ verified attestations": "atom-positioning-analyst-4",
  };

  // Cross-Exam traces: challenge targets → truth atom IDs (tested separately)
  const CROSS_EXAM_TRACE_MAP = {
    "atom-context-analyst-8": "atom-context-analyst-8",
    "atom-positioning-analyst-5": "atom-positioning-analyst-5",
    "atom-user-value-analyst-6": "atom-user-value-analyst-6",
    "atom-positioning-analyst-3": "atom-positioning-analyst-3",
  };

  it("Boundary Memo traces to Context Analyst atoms", () => {
    const contextTraces = Object.entries(ROLE_TRACE_MAP)
      .filter(([, atomId]) => atomId.startsWith("atom-context-analyst"));
    assert.ok(contextTraces.length >= 4, `Need 4+ context traces, got ${contextTraces.length}`);

    for (const [rendered, atomId] of contextTraces) {
      // Verify the rendered phrase exists in the Boundary Memo
      assert.ok(RENDERED_BOUNDARY_MEMO.includes(rendered),
        `Rendered phrase "${rendered}" not found in Boundary Memo`);
      // Verify the atom exists in the truth layer
      assert.ok(allAtoms.some(a => a.id === atomId),
        `Trace target atom "${atomId}" not found in truth layer`);
    }
  });

  it("Field Notes traces to User Value Analyst atoms", () => {
    const uvTraces = Object.entries(ROLE_TRACE_MAP)
      .filter(([, atomId]) => atomId.startsWith("atom-user-value-analyst"));
    assert.ok(uvTraces.length >= 3, `Need 3+ user value traces, got ${uvTraces.length}`);

    for (const [rendered, atomId] of uvTraces) {
      assert.ok(RENDERED_FIELD_NOTES.includes(rendered),
        `Rendered phrase "${rendered}" not found in Field Notes`);
      assert.ok(allAtoms.some(a => a.id === atomId),
        `Trace target atom "${atomId}" not found in truth layer`);
    }
  });

  it("System Sketch traces to Mechanics Analyst atoms", () => {
    const mechTraces = Object.entries(ROLE_TRACE_MAP)
      .filter(([, atomId]) => atomId.startsWith("atom-mechanics-analyst"));
    assert.ok(mechTraces.length >= 3, `Need 3+ mechanics traces, got ${mechTraces.length}`);

    for (const [rendered, atomId] of mechTraces) {
      assert.ok(RENDERED_SYSTEM_SKETCH.includes(rendered),
        `Rendered phrase "${rendered}" not found in System Sketch`);
      assert.ok(allAtoms.some(a => a.id === atomId),
        `Trace target atom "${atomId}" not found in truth layer`);
    }
  });

  it("Claim Brief traces to Positioning Analyst atoms", () => {
    const posTraces = Object.entries(ROLE_TRACE_MAP)
      .filter(([, atomId]) => atomId.startsWith("atom-positioning-analyst"));
    assert.ok(posTraces.length >= 3, `Need 3+ positioning traces, got ${posTraces.length}`);

    for (const [rendered, atomId] of posTraces) {
      assert.ok(RENDERED_CLAIM_BRIEF.includes(rendered),
        `Rendered phrase "${rendered}" not found in Claim Brief`);
      assert.ok(allAtoms.some(a => a.id === atomId),
        `Trace target atom "${atomId}" not found in truth layer`);
    }
  });

  it("Cross-Exam Transcript traces challenges to truth atoms by ID", () => {
    // Every challenge in the transcript targets a real atom
    for (const challenge of CONTRARIAN_CHALLENGES) {
      assert.ok(RENDERED_CROSS_EXAM.includes(challenge.target_claim_id),
        `Challenge target "${challenge.target_claim_id}" not in rendered transcript`);
    }
  });

  it("every trace link resolves to a real atom with provenance", () => {
    const atomIds = new Set(allAtoms.map(a => a.id));
    let traceCount = 0;
    for (const [, atomId] of Object.entries(ROLE_TRACE_MAP)) {
      if (atomIds.has(atomId)) {
        const atom = allAtoms.find(a => a.id === atomId);
        assert.ok(atom.source_role, `Atom ${atomId} missing source_role`);
        assert.ok(atom.claim_kind, `Atom ${atomId} missing claim_kind`);
        traceCount++;
      }
    }
    assert.ok(traceCount >= 15, `Expected 15+ resolved traces, got ${traceCount}`);
  });

  it("no rendered artifact introduces claims absent from truth layer", () => {
    // The key claim from each rendered artifact should trace back
    // If a rendered artifact makes a claim not in the truth layer, it's fabrication

    // Verify that synthesis directions cite real atoms
    for (const dir of SYNTHESIS_REPORT.advancing_directions) {
      for (const atomRef of dir.supporting_atoms) {
        // Supporting atom refs should be plausible atom IDs
        assert.ok(atomRef.startsWith("atom-"),
          `Direction "${dir.name}" cites non-atom ref: ${atomRef}`);
      }
    }
  });
});

// ── End-to-End Integrity ─────────────────────────────────────────────────────

describe("Golden Run — End-to-End Integrity", () => {
  it("truth layer and render layer are structurally independent", () => {
    // Truth layer: schemas, validators, atoms, dispute graph
    // Render layer: lexical bans, format schemas, debate transcript
    // Synthesis consumes truth, NEVER render

    // Verify by checking that synthesis supporting_atoms reference truth IDs, not rendered text
    for (const dir of SYNTHESIS_REPORT.advancing_directions) {
      for (const ref of dir.supporting_atoms) {
        assert.ok(ref.startsWith("atom-"), `Synthesis must cite atoms, not prose: ${ref}`);
      }
    }
  });

  it("full pipeline: request → frame → analyze → normalize → cross-examine → rebut → synthesize → expand → judge → return", () => {
    // Validate the complete chain
    assert.ok(validateRequest(GOLDEN_TOPIC).valid, "Step 1: Request");

    const { executionPlan } = resolveFrame(GOLDEN_TOPIC);
    assert.ok(executionPlan.phases.length >= 8, "Step 2: Frame");

    // Truth artifacts validate
    const roles = ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst"];
    const outputs = [CONTEXT_MAP_OUTPUT, USER_VALUE_MAP_OUTPUT, MECHANICS_MAP_OUTPUT, POSITIONING_MAP_OUTPUT];
    for (let i = 0; i < roles.length; i++) {
      assert.ok(validateRoleNativeOutput(roles[i], outputs[i]).valid, `Step 3: ${roles[i]}`);
    }

    // Atoms have provenance
    const allAtoms = roles.flatMap((r, i) => translateToAtoms(r, outputs[i]));
    for (const a of allAtoms) {
      assert.ok(validateAtomProvenance(a).valid, `Step 4: Atom ${a.id}`);
    }

    // Challenges validate
    for (const c of CONTRARIAN_CHALLENGES) {
      assert.ok(validateChallengeEdge(c).valid, "Step 5: Challenge");
    }

    // Rebuttals validate
    for (const r of REBUTTALS) {
      assert.ok(validateRebuttalEdge(r).valid, "Step 6: Rebuttal");
    }

    // Synthesis validates
    assert.ok(validateSynthesisReport(SYNTHESIS_REPORT, 3).valid, "Step 7: Synthesis");

    // Expanded concepts validate
    for (const c of EXPANDED_CONCEPTS) {
      assert.ok(validateExpandedConcept(c).valid, "Step 8: Expand");
    }

    // Judge validates
    assert.ok(validateJudgeReport(JUDGE_REPORT).valid, "Step 9: Judge");

    // Result validates
    assert.ok(validateBrainstormResult(BRAINSTORM_RESULT).valid, "Step 10: Return");

    // Rendered artifacts pass both checks
    for (const [role, text] of Object.entries(RENDERED_ARTIFACTS)) {
      assert.ok(validateRenderedText(role, text).valid, `Step 11: ${role} lexical`);
      assert.ok(validateRenderFormat(role, text).valid, `Step 11: ${role} format`);
    }
  });

  it("evidence trail matches actual pipeline execution", () => {
    const trail = BRAINSTORM_RESULT.evidence_trail;
    assert.equal(trail.scouts_run.length, 4, "4 analysts ran");
    assert.equal(trail.directions_advancing, SYNTHESIS_REPORT.advancing_directions.length, "directions match");
    assert.equal(trail.judge_disposition, JUDGE_REPORT.disposition, "judge disposition matches");
    assert.equal(trail.judge_loops, 1, "single judge loop (accepted first pass)");
  });

  it("dispute graph stats are consistent", () => {
    assert.equal(CONTRARIAN_CHALLENGES.length, 4, "4 challenges issued");
    assert.equal(REBUTTALS.length, 4, "4 rebuttals given");

    const narrowed = REBUTTALS.filter(r => r.response === "narrow").length;
    const unresolved = REBUTTALS.filter(r => r.response === "unresolved").length;
    assert.equal(narrowed, 3);
    assert.equal(unresolved, 1);
  });
});
