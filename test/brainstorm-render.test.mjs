import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RENDERER_LEXICAL_BANS,
  RENDER_SCHEMAS,
  validateRenderedText,
  validateRenderFormat,
  generateDebateTranscript,
  formatBrainstormResult,
} from "../src/brainstorm-render.mjs";

// ── Lexical bans ────────────────────────────────────────────────────────────

describe("Renderer lexical bans", () => {
  it("defines bans for all 5 roles", () => {
    const roles = ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst", "Contrarian Analyst"];
    for (const r of roles) {
      assert.ok(RENDERER_LEXICAL_BANS[r], `Missing bans for ${r}`);
      assert.ok(RENDERER_LEXICAL_BANS[r].banned.length > 5, `${r} has too few bans`);
      assert.ok(RENDERER_LEXICAL_BANS[r].voice, `${r} missing voice description`);
    }
  });

  it("Context Analyst cannot say 'pain point' or 'adoption'", () => {
    const result = validateRenderedText("Context Analyst",
      "The pain point of adoption is the main friction in the category."
    );
    assert.ok(!result.valid);
    assert.ok(result.violations.some(v => v.includes("pain point")));
    assert.ok(result.violations.some(v => v.includes("adoption")));
  });

  it("Context Analyst CAN say 'category boundary' and 'lineage'", () => {
    const result = validateRenderedText("Context Analyst",
      "The category boundary sits between registry and marketplace. The lineage traces to npm."
    );
    assert.ok(result.valid);
  });

  it("User Value Analyst cannot say 'structural' or 'infrastructure'", () => {
    const result = validateRenderedText("User Value Analyst",
      "The structural infrastructure of the schema creates surface area."
    );
    assert.ok(!result.valid);
    assert.ok(result.violations.length >= 2);
  });

  it("User Value Analyst CAN say 'friction' and 'desire'", () => {
    const result = validateRenderedText("User Value Analyst",
      "The friction is real. The desire for safety drives the first action."
    );
    assert.ok(result.valid);
  });

  it("Mechanics Analyst cannot say 'brand' or 'narrative'", () => {
    const result = validateRenderedText("Mechanics Analyst",
      "The brand narrative positions this as a compelling story."
    );
    assert.ok(!result.valid);
  });

  it("Mechanics Analyst CAN say 'dependency chain' and 'failure mode'", () => {
    const result = validateRenderedText("Mechanics Analyst",
      "The dependency chain breaks at the attestation step. This failure mode cascades."
    );
    assert.ok(result.valid);
  });

  it("Positioning Analyst cannot say 'schema' or 'dependency chain'", () => {
    const result = validateRenderedText("Positioning Analyst",
      "The schema dependency chain creates a failure mode in the attestation record."
    );
    assert.ok(!result.valid);
  });

  it("Positioning Analyst CAN say 'claim' and 'timing' and 'territory'", () => {
    const result = validateRenderedText("Positioning Analyst",
      "The claim is legal now. The timing is right. The territory is uncontested."
    );
    assert.ok(result.valid);
  });

  it("Contrarian cannot say 'I suggest' or 'opportunity'", () => {
    const result = validateRenderedText("Contrarian Analyst",
      "I suggest this is a promising opportunity we should consider."
    );
    assert.ok(!result.valid);
    assert.ok(result.violations.length >= 2);
  });

  it("Contrarian CAN say 'on what basis' and 'overstated'", () => {
    const result = validateRenderedText("Contrarian Analyst",
      "On what basis is this claim made? The evidence is overstated."
    );
    assert.ok(result.valid);
  });

  it("bans are cross-role: Context bans User Value vocabulary", () => {
    // Context has "friction" and "willingness" banned (User Value words)
    const result = validateRenderedText("Context Analyst",
      "The friction of the willingness signal drives adoption."
    );
    assert.ok(!result.valid);
  });

  it("bans are cross-role: User Value bans Mechanics vocabulary", () => {
    // User Value has "attestation" and "sandbox" banned (Mechanics words)
    const result = validateRenderedText("User Value Analyst",
      "The attestation sandbox provides cryptographic binding."
    );
    assert.ok(!result.valid);
  });

  it("bans are cross-role: Mechanics bans Positioning vocabulary", () => {
    // Mechanics has "wedge" and "claim" banned (Positioning words)
    const result = validateRenderedText("Mechanics Analyst",
      "The wedge claim positions the territory."
    );
    assert.ok(!result.valid);
  });
});

// ── Render schemas ──────────────────────────────────────────────────────────

describe("Render schemas", () => {
  it("defines schemas for all 5 roles", () => {
    const roles = ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst", "Contrarian Analyst"];
    for (const r of roles) {
      assert.ok(RENDER_SCHEMAS[r], `Missing schema for ${r}`);
      assert.ok(RENDER_SCHEMAS[r].format, `${r} missing format name`);
      assert.ok(RENDER_SCHEMAS[r].sections.length >= 3, `${r} too few sections`);
      assert.ok(RENDER_SCHEMAS[r].style_rules.length >= 2, `${r} too few style rules`);
    }
  });

  it("Context renders as Boundary Memo", () => {
    assert.equal(RENDER_SCHEMAS["Context Analyst"].format, "Boundary Memo");
  });

  it("User Value renders as Field Notes", () => {
    assert.equal(RENDER_SCHEMAS["User Value Analyst"].format, "Field Notes");
  });

  it("Mechanics renders as System Sketch", () => {
    assert.equal(RENDER_SCHEMAS["Mechanics Analyst"].format, "System Sketch");
  });

  it("Positioning renders as Claim Brief", () => {
    assert.equal(RENDER_SCHEMAS["Positioning Analyst"].format, "Claim Brief");
  });

  it("Contrarian renders as Cross-Exam Transcript", () => {
    assert.equal(RENDER_SCHEMAS["Contrarian Analyst"].format, "Cross-Exam Transcript");
  });

  it("all render formats are distinct", () => {
    const formats = Object.values(RENDER_SCHEMAS).map(s => s.format);
    assert.equal(new Set(formats).size, formats.length, "Render formats must be unique");
  });
});

// ── Render format validation ────────────────────────────────────────────────

describe("validateRenderFormat", () => {
  it("passes when all sections present", () => {
    const text = `
## Classification
MCP server marketplace is a discovery layer.

## Adjacent spaces
Package registries, plugin directories.

## Lineage
Descends from supply-chain security.

## Exclusions
This is NOT a package manager.
    `;
    const result = validateRenderFormat("Context Analyst", text);
    assert.ok(result.valid, `Missing: ${result.missing_sections.join(", ")}`);
  });

  it("fails when sections missing", () => {
    const text = "## Classification\nJust one section.";
    const result = validateRenderFormat("Context Analyst", text);
    assert.ok(!result.valid);
    assert.ok(result.missing_sections.length >= 2);
  });

  it("User Value requires observed situations, reach for, avoid, signals", () => {
    const result = validateRenderFormat("User Value Analyst", "## Observed situations\n## What they reach for\n## What they avoid\n## Signals of readiness");
    assert.ok(result.valid);
  });

  it("unknown role passes (no schema)", () => {
    const result = validateRenderFormat("Unknown Role", "anything");
    assert.ok(result.valid);
  });
});

// ── Debate transcript generation ────────────────────────────────────────────

describe("generateDebateTranscript", () => {
  const atoms = [
    { id: "ctx-11", text: "NOT a package manager", source_role: "Context Analyst" },
    { id: "uv-8", text: "confidence score", source_role: "User Value Analyst" },
    { id: "pos-7", text: "objective quality signals", source_role: "Positioning Analyst" },
  ];

  const challenges = [
    { target_claim_id: "ctx-11", challenger_role: "Contrarian Analyst", challenge_type: "unsupported", reason: "If you index packages and surface install paths, the distinction is hollow." },
    { target_claim_id: "uv-8", challenger_role: "Mechanics Analyst", challenge_type: "mechanically_blocked", reason: "Schema fragmentation makes inputs inconsistent." },
    { target_claim_id: "pos-7", challenger_role: "Context Analyst", challenge_type: "unsupported", reason: "'Objective' is imprecise — attestations are claims, not measurements." },
  ];

  const rebuttals = [
    { target_claim_id: "uv-8", source_role: "User Value Analyst", response: "narrow", note: "Narrowed to: confidence score where manifest data is available." },
    { target_claim_id: "pos-7", source_role: "Positioning Analyst", response: "narrow", note: "Revised to: open, auditable quality signals." },
  ];

  it("generates a formatted transcript", () => {
    const transcript = generateDebateTranscript(challenges, rebuttals, atoms);
    assert.ok(transcript.includes("## Debate Transcript"));
    assert.ok(transcript.includes("ctx-11"));
    assert.ok(transcript.includes("uv-8"));
    assert.ok(transcript.includes("pos-7"));
  });

  it("includes challenge reasons", () => {
    const transcript = generateDebateTranscript(challenges, rebuttals, atoms);
    assert.ok(transcript.includes("Schema fragmentation"));
    assert.ok(transcript.includes("distinction is hollow"));
  });

  it("includes rebuttals with verb labels", () => {
    const transcript = generateDebateTranscript(challenges, rebuttals, atoms);
    assert.ok(transcript.includes("NARROWS"));
    assert.ok(transcript.includes("open, auditable quality signals"));
  });

  it("includes dispute summary stats", () => {
    const transcript = generateDebateTranscript(challenges, rebuttals, atoms);
    assert.ok(transcript.includes("Challenges issued: 3"));
    assert.ok(transcript.includes("Claims narrowed: 2"));
  });

  it("handles missing atoms gracefully", () => {
    const badChallenges = [{ target_claim_id: "nonexistent", challenger_role: "Contrarian", challenge_type: "unsupported", reason: "test" }];
    const transcript = generateDebateTranscript(badChallenges, [], []);
    assert.ok(transcript.includes("nonexistent"));
  });

  it("handles challenges with no rebuttal", () => {
    const transcript = generateDebateTranscript(challenges, [], atoms);
    assert.ok(transcript.includes("ctx-11"));
    assert.ok(!transcript.includes("NARROWS")); // no rebuttals
  });
});

// ── Result formatter ─────────────────────────────────────────────────────────

describe("formatBrainstormResult", () => {
  const request = {
    topic: "MCP server marketplace",
    objective: "Find the highest-leverage direction",
    audience: "Developer tool builders",
    evidence_mode: "mixed",
    breadth: 3,
    depth: 1,
  };

  const synthesisReport = {
    topic_model: "Discovery is a trust problem masquerading as a search problem.",
    advancing_directions: [
      {
        id: "dir-1", name: "Attestation-ready discovery",
        thesis: "Registry + attestation format first.",
        why_it_matters: "Every other feature depends on verifiable claims.",
        supporting_atoms: ["atom-ctx-1", "atom-mech-3"],
        risks: ["Adoption chicken-and-egg"],
      },
      {
        id: "dir-2", name: "Confidence scoring",
        thesis: "Multi-signal score with graceful degradation.",
        why_it_matters: "Developers need fast trust signals.",
        supporting_atoms: ["atom-uv-1", "atom-uv-6"],
        risks: ["Gaming", "Schema fragmentation"],
      },
      {
        id: "dir-3", name: "Zero-config install",
        thesis: "Under 60 seconds from search to working.",
        why_it_matters: "Discovery without activation is dead.",
        supporting_atoms: ["atom-uv-7", "atom-mech-1"],
        risks: ["Cross-client compatibility"],
      },
    ],
    archived_directions: [
      { name: "Full marketplace", reason: "Violates no-centralized-hosting constraint" },
    ],
    tensions: [
      "Attestation without adoption vs attestation as only durable wedge",
    ],
  };

  const judgeReport = {
    disposition: "accept",
    overall_quality: "strong",
    per_direction: [
      { direction_id: "dir-1", verdict: "ready_to_advance", action: "build_now", reasons: ["Survived Contrarian"] },
      { direction_id: "dir-2", verdict: "ready_to_advance", action: "build_now", reasons: ["Addresses top friction"] },
      { direction_id: "dir-3", verdict: "needs_incubation", action: "hold_for_followon", reasons: ["Depends on dir-1"] },
    ],
    reasons: ["All directions grounded in multi-role evidence", "Dispute graph healthy"],
  };

  const evidenceTrail = {
    scouts_run: ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst"],
    atoms_after_normalize: 20,
    directions_considered: 5,
    directions_advancing: 3,
    judge_loops: 1,
    judge_disposition: "accept",
  };

  const challenges = [
    { target_claim_id: "atom-ctx-8", challenger_role: "Contrarian", challenge_type: "unsupported", reason: "Boundary is hollow." },
  ];

  const rebuttals = [
    { target_claim_id: "atom-ctx-8", source_role: "Context Analyst", response: "narrow", note: "Revised to functional boundary." },
  ];

  it("produces a non-empty markdown document", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail, challenges, rebuttals });
    assert.ok(doc.length > 500, "Document should be substantial");
    assert.ok(doc.startsWith("# Brainstorm:"), "Should start with topic heading");
  });

  it("includes verdict section with disposition and per-direction table", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("## Verdict"));
    assert.ok(doc.includes("accept"));
    assert.ok(doc.includes("dir-1"));
    assert.ok(doc.includes("ready_to_advance"));
  });

  it("includes all advancing directions with evidence and risks", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("## Directions"));
    assert.ok(doc.includes("Attestation-ready discovery"));
    assert.ok(doc.includes("Confidence scoring"));
    assert.ok(doc.includes("Zero-config install"));
    assert.ok(doc.includes("atom-ctx-1"));
    assert.ok(doc.includes("Adoption chicken-and-egg"));
  });

  it("includes archived directions", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("### Archived"));
    assert.ok(doc.includes("Full marketplace"));
  });

  it("includes dispute summary when challenges present", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail, challenges, rebuttals });
    assert.ok(doc.includes("## Dispute"));
    assert.ok(doc.includes("1 challenges issued"));
    assert.ok(doc.includes("NARROWED"));
    assert.ok(doc.includes("Revised to functional boundary"));
  });

  it("includes tensions", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("## Tensions"));
    assert.ok(doc.includes("Attestation without adoption"));
  });

  it("includes evidence trail", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("## Evidence Trail"));
    assert.ok(doc.includes("Atoms after normalize: 20"));
    assert.ok(doc.includes("disposition: accept"));
  });

  it("includes rendered artifacts when provided", () => {
    const rendered = {
      "Context Analyst": "## Classification\nThis is a discovery layer.",
    };
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail, renderedArtifacts: rendered });
    assert.ok(doc.includes("## Rendered Artifacts"));
    assert.ok(doc.includes("Boundary Memo (Context Analyst)"));
    assert.ok(doc.includes("discovery layer"));
  });

  it("omits rendered artifacts when layer='truth'", () => {
    const rendered = { "Context Analyst": "some text" };
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail, renderedArtifacts: rendered, layer: "truth" });
    assert.ok(!doc.includes("## Rendered Artifacts"));
  });

  it("includes audience when present", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("Developer tool builders"));
  });

  it("ends with Role OS attribution", () => {
    const doc = formatBrainstormResult({ request, synthesisReport, judgeReport, evidenceTrail });
    assert.ok(doc.includes("Role OS brainstorm mission (v0.4)"));
  });
});
