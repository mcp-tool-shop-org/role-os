import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateEvidencePair,
  validateFindingStatements,
  validateRequest,
  resolveFrame,
  validateScoutFinding,
  validateNormalizedFindingSet,
  validateSynthesisReport,
  validateExpandedConcept,
  validateJudgeReport,
  validateBrainstormResult,
  EVIDENCE_CONSTRAINTS,
  VALID_EVIDENCE_MODES,
  VALID_OUTPUT_MODES,
  VALID_NOVELTY_BIAS,
  VALID_STATEMENT_KINDS,
  VALID_DISPOSITIONS,
  VALID_FAILING_CRITERIA,
  VALID_JUDGE_ACTIONS,
  V01_SCOUT_ROSTER,
  EXPANDER_ROSTER,
  REQUEST_DEFAULTS,
  BREADTH_MIN,
  BREADTH_MAX,
  DEPTH_MIN,
  DEPTH_MAX,
} from "../src/brainstorm.mjs";

// ── Evidence mode constraint matrix ─────────────────────────────────────────

describe("Evidence mode constraints", () => {
  it("defines constraints for all 3 modes", () => {
    for (const mode of VALID_EVIDENCE_MODES) {
      assert.ok(EVIDENCE_CONSTRAINTS[mode], `Missing constraints for ${mode}`);
    }
  });

  it("strict: allows grounded at all confidence levels", () => {
    assert.ok(validateEvidencePair("strict", "grounded", "high").valid);
    assert.ok(validateEvidencePair("strict", "grounded", "medium").valid);
    assert.ok(validateEvidencePair("strict", "grounded", "low").valid);
  });

  it("strict: rejects mixed and speculative grades", () => {
    assert.ok(!validateEvidencePair("strict", "mixed", "medium").valid);
    assert.ok(!validateEvidencePair("strict", "mixed", "low").valid);
    assert.ok(!validateEvidencePair("strict", "speculative", "low").valid);
    assert.ok(!validateEvidencePair("strict", "speculative", "medium").valid);
  });

  it("mixed: allows grounded at all levels", () => {
    assert.ok(validateEvidencePair("mixed", "grounded", "high").valid);
    assert.ok(validateEvidencePair("mixed", "grounded", "medium").valid);
    assert.ok(validateEvidencePair("mixed", "grounded", "low").valid);
  });

  it("mixed: allows mixed at medium and low only", () => {
    assert.ok(!validateEvidencePair("mixed", "mixed", "high").valid);
    assert.ok(validateEvidencePair("mixed", "mixed", "medium").valid);
    assert.ok(validateEvidencePair("mixed", "mixed", "low").valid);
  });

  it("mixed: speculative only at low", () => {
    assert.ok(!validateEvidencePair("mixed", "speculative", "high").valid);
    assert.ok(!validateEvidencePair("mixed", "speculative", "medium").valid);
    assert.ok(validateEvidencePair("mixed", "speculative", "low").valid);
  });

  it("speculative: speculative capped at medium", () => {
    assert.ok(!validateEvidencePair("speculative", "speculative", "high").valid);
    assert.ok(validateEvidencePair("speculative", "speculative", "medium").valid);
    assert.ok(validateEvidencePair("speculative", "speculative", "low").valid);
  });

  it("high confidence for grounded is legal in all modes", () => {
    for (const mode of VALID_EVIDENCE_MODES) {
      assert.ok(validateEvidencePair(mode, "grounded", "high").valid, `${mode}/grounded/high should be valid`);
    }
  });

  it("speculative/high is illegal in ALL modes — even invention has this floor", () => {
    for (const mode of VALID_EVIDENCE_MODES) {
      assert.ok(!validateEvidencePair(mode, "speculative", "high").valid, `${mode}/speculative/high should be invalid`);
    }
  });

  it("mixed/high is illegal in strict, mixed, speculative — only invention allows it", () => {
    assert.ok(!validateEvidencePair("strict", "mixed", "high").valid);
    assert.ok(!validateEvidencePair("mixed", "mixed", "high").valid);
    assert.ok(!validateEvidencePair("speculative", "mixed", "high").valid);
    assert.ok(validateEvidencePair("invention", "mixed", "high").valid);
  });

  it("rejects invalid modes, grades, and confidence levels", () => {
    assert.ok(!validateEvidencePair("invalid", "grounded", "high").valid);
    assert.ok(!validateEvidencePair("strict", "invalid", "high").valid);
    assert.ok(!validateEvidencePair("strict", "grounded", "invalid").valid);
  });

  it("returns reason on failure", () => {
    const result = validateEvidencePair("strict", "speculative", "high");
    assert.ok(!result.valid);
    assert.ok(result.reason.length > 0);
  });
});

describe("validateFindingStatements", () => {
  it("passes valid statements under mixed mode", () => {
    const statements = [
      { id: "s1", evidence_grade: "grounded", confidence: "high" },
      { id: "s2", evidence_grade: "mixed", confidence: "medium" },
      { id: "s3", evidence_grade: "speculative", confidence: "low" },
    ];
    const result = validateFindingStatements("mixed", statements);
    assert.ok(result.valid);
    assert.equal(result.violations.length, 0);
  });

  it("flags violations", () => {
    const statements = [
      { id: "s1", evidence_grade: "speculative", confidence: "high" },
    ];
    const result = validateFindingStatements("mixed", statements);
    assert.ok(!result.valid);
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].statementId, "s1");
  });

  it("uses index-based IDs when id missing", () => {
    const statements = [
      { evidence_grade: "speculative", confidence: "high" },
    ];
    const result = validateFindingStatements("strict", statements);
    assert.equal(result.violations[0].statementId, "statement-0");
  });
});

// ── BrainstormRequest validation ────────────────────────────────────────────

describe("validateRequest", () => {
  const validRequest = {
    topic: "AI-native music workspace",
    objective: "find product directions that feel like a DAW",
    output_mode: "concepts",
    breadth: 3,
    depth: 1,
    novelty_bias: "medium",
    evidence_mode: "mixed",
  };

  it("accepts a valid request", () => {
    const result = validateRequest(validRequest);
    assert.ok(result.valid);
    assert.equal(result.issues.length, 0);
  });

  it("rejects null", () => {
    assert.ok(!validateRequest(null).valid);
  });

  it("requires topic", () => {
    const result = validateRequest({ ...validRequest, topic: "" });
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("topic")));
  });

  it("requires objective", () => {
    const result = validateRequest({ ...validRequest, objective: undefined });
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("objective")));
  });

  it("rejects invalid output_mode", () => {
    const result = validateRequest({ ...validRequest, output_mode: "invalid" });
    assert.ok(!result.valid);
  });

  it("rejects breadth out of range", () => {
    assert.ok(!validateRequest({ ...validRequest, breadth: 0 }).valid);
    assert.ok(!validateRequest({ ...validRequest, breadth: 8 }).valid);
    assert.ok(!validateRequest({ ...validRequest, breadth: 1.5 }).valid);
  });

  it("rejects depth out of range", () => {
    assert.ok(!validateRequest({ ...validRequest, depth: 0 }).valid);
    assert.ok(!validateRequest({ ...validRequest, depth: 4 }).valid);
  });

  it("rejects invalid novelty_bias", () => {
    assert.ok(!validateRequest({ ...validRequest, novelty_bias: "extreme" }).valid);
  });

  it("rejects invalid evidence_mode", () => {
    assert.ok(!validateRequest({ ...validRequest, evidence_mode: "wild" }).valid);
  });

  it("accepts minimal request (topic + objective only)", () => {
    const result = validateRequest({ topic: "X", objective: "Y" });
    assert.ok(result.valid);
  });

  it("rejects non-array constraints", () => {
    const result = validateRequest({ ...validRequest, constraints: "not-array" });
    assert.ok(!result.valid);
  });
});

// ── Frame resolver ──────────────────────────────────────────────────────────

describe("resolveFrame", () => {
  it("applies defaults for minimal input", () => {
    const { request } = resolveFrame({ topic: "X", objective: "Y" });
    assert.equal(request.output_mode, REQUEST_DEFAULTS.output_mode);
    assert.equal(request.breadth, REQUEST_DEFAULTS.breadth);
    assert.equal(request.depth, REQUEST_DEFAULTS.depth);
    assert.equal(request.novelty_bias, REQUEST_DEFAULTS.novelty_bias);
    assert.equal(request.evidence_mode, REQUEST_DEFAULTS.evidence_mode);
  });

  it("preserves explicit values", () => {
    const { request } = resolveFrame({
      topic: "X",
      objective: "Y",
      breadth: 5,
      depth: 2,
      evidence_mode: "strict",
    });
    assert.equal(request.breadth, 5);
    assert.equal(request.depth, 2);
    assert.equal(request.evidence_mode, "strict");
  });

  it("v03 mode (default) returns 4 analyst roster", () => {
    const { scoutRoster, executionPlan } = resolveFrame({ topic: "X", objective: "Y" });
    assert.equal(scoutRoster.length, 4);
    assert.ok(scoutRoster.includes("Context Analyst"));
    assert.ok(scoutRoster.includes("Positioning Analyst"));
    assert.equal(executionPlan.roleMode, "v03");
  });

  it("v01 mode returns legacy 3 scout roster", () => {
    const { scoutRoster } = resolveFrame({ topic: "X", objective: "Y", role_mode: "v01" });
    assert.deepEqual(scoutRoster, V01_SCOUT_ROSTER);
    assert.equal(scoutRoster.length, 3);
  });

  it("expander roster scales with depth", () => {
    const d1 = resolveFrame({ topic: "X", objective: "Y", depth: 1 });
    assert.equal(d1.expanderRoster.length, 1);
    assert.equal(d1.expanderRoster[0], "Product Expander");

    const d2 = resolveFrame({ topic: "X", objective: "Y", depth: 2 });
    assert.equal(d2.expanderRoster.length, 2);
    assert.equal(d2.expanderRoster[1], "Scenario Expander");

    const d3 = resolveFrame({ topic: "X", objective: "Y", depth: 3 });
    assert.equal(d3.expanderRoster.length, 3);
    assert.equal(d3.expanderRoster[2], "Moat Expander");
  });

  it("v03 execution plan includes cross_examine and rebut stages", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", breadth: 3, depth: 1 });
    const phaseNames = executionPlan.phases.map(p => p.phase);
    assert.ok(phaseNames.includes("cross_examine"), "should have cross_examine");
    assert.ok(phaseNames.includes("rebut"), "should have rebut");
    assert.ok(phaseNames.includes("analyze"), "should have analyze, not scout");
  });

  it("v01 execution plan does NOT include cross_examine", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", role_mode: "v01", breadth: 3, depth: 1 });
    const phaseNames = executionPlan.phases.map(p => p.phase);
    assert.ok(!phaseNames.includes("cross_examine"));
    assert.ok(phaseNames.includes("scout"));
    // v01: frame(1) + scouts(3) + normalize(1) + synthesize(1) + expand(3) + judge(1) + return(1) = 11
    assert.equal(executionPlan.totalSteps, 11);
  });

  it("v03 step count includes cross_examine and rebut", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", breadth: 3, depth: 1 });
    // frame(1) + analyze(4) + normalize(1) + cross_examine(5) + rebut(4) + synthesize(1) + expand(3) + judge(1) + return(1) = 21
    assert.equal(executionPlan.totalSteps, 21);
  });

  it("analyze phase is marked parallel", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y" });
    const analyzePhase = executionPlan.phases.find(p => p.phase === "analyze");
    assert.equal(analyzePhase.parallel, true);
  });

  it("max judge loops is 3", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y" });
    assert.equal(executionPlan.maxJudgeLoops, 3);
  });
});

// ── Scout finding validation ────────────────────────────────────────────────

describe("validateScoutFinding", () => {
  const validFinding = {
    id: "sf-context-001",
    role: "Context Scout",
    axis: "landscape",
    statements: [
      { id: "s1", text: "Claim one", kind: "claim", evidence_grade: "grounded", confidence: "high" },
      { id: "s2", text: "Risk one", kind: "risk", evidence_grade: "mixed", confidence: "medium" },
      { id: "s3", text: "Opportunity one", kind: "opportunity", evidence_grade: "grounded", confidence: "medium" },
    ],
  };

  it("accepts valid finding", () => {
    const result = validateScoutFinding(validFinding, "mixed");
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("rejects null", () => {
    assert.ok(!validateScoutFinding(null, "mixed").valid);
  });

  it("requires at least 3 statements", () => {
    const finding = { ...validFinding, statements: [validFinding.statements[0]] };
    assert.ok(!validateScoutFinding(finding, "mixed").valid);
  });

  it("rejects more than 12 statements", () => {
    const statements = Array.from({ length: 13 }, (_, i) => ({
      id: `s${i}`, text: `Statement ${i}`, kind: "claim",
      evidence_grade: "grounded", confidence: "medium",
    }));
    const finding = { ...validFinding, statements };
    assert.ok(!validateScoutFinding(finding, "mixed").valid);
  });

  it("validates evidence mode per statement", () => {
    const finding = {
      ...validFinding,
      statements: [
        { id: "s1", text: "A", kind: "claim", evidence_grade: "speculative", confidence: "high" },
        { id: "s2", text: "B", kind: "claim", evidence_grade: "grounded", confidence: "high" },
        { id: "s3", text: "C", kind: "claim", evidence_grade: "grounded", confidence: "medium" },
      ],
    };
    const result = validateScoutFinding(finding, "mixed");
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("s1") || i.includes("statements[0]")));
  });

  it("requires id, role, axis", () => {
    const noId = { ...validFinding, id: undefined };
    assert.ok(!validateScoutFinding(noId, "mixed").valid);

    const noRole = { ...validFinding, role: undefined };
    assert.ok(!validateScoutFinding(noRole, "mixed").valid);

    const noAxis = { ...validFinding, axis: undefined };
    assert.ok(!validateScoutFinding(noAxis, "mixed").valid);
  });

  it("rejects invalid statement kind", () => {
    const finding = {
      ...validFinding,
      statements: [
        { id: "s1", text: "A", kind: "invalid", evidence_grade: "grounded", confidence: "high" },
        { id: "s2", text: "B", kind: "claim", evidence_grade: "grounded", confidence: "medium" },
        { id: "s3", text: "C", kind: "claim", evidence_grade: "grounded", confidence: "medium" },
      ],
    };
    assert.ok(!validateScoutFinding(finding, "mixed").valid);
  });
});

// ── Normalized finding set validation ───────────────────────────────────────

describe("validateNormalizedFindingSet", () => {
  const validSet = {
    atoms: [
      {
        id: "fa-001", statement: "Test atom", kind: "claim",
        source_roles: ["Context Scout"], source_statement_ids: ["s1"],
        support_count: 2, challenge_count: 0,
        evidence_grade: "grounded", confidence: "high",
      },
    ],
    conflicts: [],
    duplicates_collapsed: 2,
    unsupported_high_confidence_flags: [],
    stats: {
      total_source_statements: 9,
      total_atoms: 7,
      grounded_count: 5,
      mixed_count: 1,
      speculative_count: 1,
    },
  };

  it("accepts valid finding set", () => {
    const result = validateNormalizedFindingSet(validSet);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("rejects null", () => {
    assert.ok(!validateNormalizedFindingSet(null).valid);
  });

  it("validates atom fields", () => {
    const bad = {
      ...validSet,
      atoms: [{ id: "fa-001" }], // missing most fields
    };
    const result = validateNormalizedFindingSet(bad);
    assert.ok(!result.valid);
    assert.ok(result.issues.length > 3);
  });

  it("validates conflict fields", () => {
    const bad = {
      ...validSet,
      conflicts: [{ id: "c1" }], // missing fields
    };
    const result = validateNormalizedFindingSet(bad);
    assert.ok(!result.valid);
  });

  it("requires stats", () => {
    const bad = { ...validSet, stats: undefined };
    assert.ok(!validateNormalizedFindingSet(bad).valid);
  });

  it("requires duplicates_collapsed", () => {
    const bad = { ...validSet, duplicates_collapsed: undefined };
    assert.ok(!validateNormalizedFindingSet(bad).valid);
  });
});

// ── Synthesis report validation ─────────────────────────────────────────────

describe("validateSynthesisReport", () => {
  const validReport = {
    topic_model: "This space is about X",
    major_themes: ["theme1", "theme2", "theme3"],
    tensions: [],
    advancing_directions: [
      {
        id: "dir-001", name: "Direction A", thesis: "Do X",
        why_it_matters: "Because Y", supporting_atoms: ["fa-001", "fa-002"],
        risks: ["risk1"], open_questions: [],
      },
      {
        id: "dir-002", name: "Direction B", thesis: "Do Z",
        why_it_matters: "Because W", supporting_atoms: ["fa-003", "fa-004"],
        risks: [], open_questions: [],
      },
      {
        id: "dir-003", name: "Direction C", thesis: "Do Q",
        why_it_matters: "Because R", supporting_atoms: ["fa-005", "fa-006"],
        risks: [], open_questions: [],
      },
    ],
    archived_directions: [
      { name: "Bad idea", reason: "Too generic" },
    ],
  };

  it("accepts valid report with breadth=3", () => {
    const result = validateSynthesisReport(validReport, 3);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("enforces exact breadth", () => {
    const result = validateSynthesisReport(validReport, 5);
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("exactly 5")));
  });

  it("requires at least 2 supporting atoms per direction", () => {
    const bad = {
      ...validReport,
      advancing_directions: [
        { id: "d1", name: "A", thesis: "X", why_it_matters: "Y", supporting_atoms: ["fa-001"], risks: [] },
      ],
    };
    const result = validateSynthesisReport(bad, 1);
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("at least 2")));
  });

  it("requires at least 3 major themes", () => {
    const bad = { ...validReport, major_themes: ["one", "two"] };
    assert.ok(!validateSynthesisReport(bad, 3).valid);
  });

  it("requires archived directions to have reasons", () => {
    const bad = {
      ...validReport,
      archived_directions: [{ name: "X" }], // missing reason
    };
    assert.ok(!validateSynthesisReport(bad, 3).valid);
  });
});

// ── Expanded concept validation ─────────────────────────────────────────────

describe("validateExpandedConcept", () => {
  const validConcept = {
    direction_id: "dir-001",
    direction_name: "AI DAW",
    thesis: "A music workspace that thinks like a producer",
    product_shape: {
      target_user: "indie game composers",
      core_mechanism: "AI-assisted arrangement",
      features: ["auto-harmony", "loop generation", "stem separation"],
      core_loop: "sketch → arrange → refine → export",
      smallest_proof: "Single-track loop generator with AI harmony suggestions",
      key_risks: ["latency", "creative uncanny valley"],
    },
  };

  it("accepts valid concept", () => {
    const result = validateExpandedConcept(validConcept);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("requires product_shape", () => {
    const bad = { ...validConcept, product_shape: undefined };
    assert.ok(!validateExpandedConcept(bad).valid);
  });

  it("requires product_shape fields", () => {
    const bad = { ...validConcept, product_shape: { target_user: "X" } };
    const result = validateExpandedConcept(bad);
    assert.ok(!result.valid);
    assert.ok(result.issues.length >= 3);
  });

  it("validates optional scenarios when present", () => {
    const withScenarios = {
      ...validConcept,
      scenarios: [{ situation: "A" }], // missing user_action, outcome
    };
    assert.ok(!validateExpandedConcept(withScenarios).valid);
  });

  it("validates optional moat when present", () => {
    const withMoat = {
      ...validConcept,
      moat: { differentiation: "X" }, // missing other fields
    };
    assert.ok(!validateExpandedConcept(withMoat).valid);
  });

  it("accepts concept with all optional fields", () => {
    const full = {
      ...validConcept,
      scenarios: [
        { situation: "composing a game boss theme", user_action: "select mood", outcome: "AI generates 3 variations" },
      ],
      moat: {
        differentiation: "game-audio-native",
        stickiness: "project format lock-in",
        competitive_response: "generic DAWs won't specialize",
        phase_plan: ["loop gen MVP", "arrangement assist", "full score mode"],
      },
    };
    assert.ok(validateExpandedConcept(full).valid);
  });
});

// ── Judge report validation ─────────────────────────────────────────────────

describe("validateJudgeReport", () => {
  const validJudge = {
    disposition: "accept",
    overall_quality: "strong",
    per_direction: [
      { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["well-supported"] },
    ],
    reasons: ["All directions pass quality threshold"],
  };

  it("accepts valid accept report", () => {
    assert.ok(validateJudgeReport(validJudge).valid);
  });

  it("rejects invalid disposition", () => {
    assert.ok(!validateJudgeReport({ ...validJudge, disposition: "maybe" }).valid);
  });

  it("requires revision_targets for revise dispositions", () => {
    const revise = {
      ...validJudge,
      disposition: "revise_expand",
      revision_targets: undefined,
    };
    assert.ok(!validateJudgeReport(revise).valid);
  });

  it("accepts revise with targets", () => {
    const revise = {
      ...validJudge,
      disposition: "revise_expand",
      revision_targets: ["dir-001"],
      revision_guidance: "expand with more concrete scenarios",
    };
    assert.ok(validateJudgeReport(revise).valid);
  });

  it("validates failing_criteria values", () => {
    const bad = {
      ...validJudge,
      per_direction: [
        { direction_id: "d1", verdict: "needs_incubation", reasons: ["bad"], failing_criteria: ["invalid_criterion"] },
      ],
    };
    assert.ok(!validateJudgeReport(bad).valid);
  });

  it("accepts all valid failing criteria", () => {
    const good = {
      ...validJudge,
      per_direction: [
        { direction_id: "d1", verdict: "needs_incubation", reasons: ["bad"], failing_criteria: VALID_FAILING_CRITERIA },
      ],
    };
    assert.ok(validateJudgeReport(good).valid);
  });
});

// ── Brainstorm result validation ────────────────────────────────────────────

describe("validateBrainstormResult", () => {
  const validResult = {
    core_read: "This brainstorm found 3 viable directions for an AI music workspace.",
    opportunity_map: [
      {
        direction_id: "dir-001", name: "AI DAW", thesis: "X",
        why_it_matters: "Y", expanded_concept: {}, judge_verdict: "ready_to_advance",
        supporting_evidence_count: 5,
      },
    ],
    unresolved_tensions: [],
    open_questions: ["How to handle latency?"],
    evidence_trail: {
      scouts_run: ["Context Scout", "User Value Scout", "Creative Leap Scout"],
      total_findings: 9,
      atoms_after_normalize: 7,
      directions_considered: 5,
      directions_advancing: 3,
      expansion_passes: 3,
      judge_loops: 1,
      judge_disposition: "accept",
    },
    request: { topic: "X", objective: "Y" },
    pipeline_duration_steps: 11,
  };

  it("accepts valid result", () => {
    const result = validateBrainstormResult(validResult);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("rejects null", () => {
    assert.ok(!validateBrainstormResult(null).valid);
  });

  it("requires core_read", () => {
    const bad = { ...validResult, core_read: undefined };
    assert.ok(!validateBrainstormResult(bad).valid);
  });

  it("requires non-empty opportunity_map", () => {
    const bad = { ...validResult, opportunity_map: [] };
    assert.ok(!validateBrainstormResult(bad).valid);
  });

  it("requires evidence_trail fields", () => {
    const bad = { ...validResult, evidence_trail: {} };
    const result = validateBrainstormResult(bad);
    assert.ok(!result.valid);
    assert.ok(result.issues.length >= 5);
  });

  it("requires request", () => {
    const bad = { ...validResult, request: undefined };
    assert.ok(!validateBrainstormResult(bad).valid);
  });
});

// ── Constants ───────────────────────────────────────────────────────────────

describe("Brainstorm constants", () => {
  it("v0.1 scout roster has 3 scouts", () => {
    assert.equal(V01_SCOUT_ROSTER.length, 3);
    assert.ok(V01_SCOUT_ROSTER.includes("Context Scout"));
    assert.ok(V01_SCOUT_ROSTER.includes("User Value Scout"));
    assert.ok(V01_SCOUT_ROSTER.includes("Creative Leap Scout"));
  });

  it("expander roster has 3 expanders", () => {
    assert.equal(EXPANDER_ROSTER.length, 3);
    assert.equal(EXPANDER_ROSTER[0], "Product Expander");
    assert.equal(EXPANDER_ROSTER[1], "Scenario Expander");
    assert.equal(EXPANDER_ROSTER[2], "Moat Expander");
  });

  it("breadth range is 1-7", () => {
    assert.equal(BREADTH_MIN, 1);
    assert.equal(BREADTH_MAX, 7);
  });

  it("depth range is 1-3", () => {
    assert.equal(DEPTH_MIN, 1);
    assert.equal(DEPTH_MAX, 3);
  });

  it("all statement kinds defined", () => {
    assert.equal(VALID_STATEMENT_KINDS.length, 5);
  });

  it("all dispositions defined", () => {
    assert.equal(VALID_DISPOSITIONS.length, 4);
  });

  it("all judge actions defined", () => {
    assert.equal(VALID_JUDGE_ACTIONS.length, 3);
    assert.ok(VALID_JUDGE_ACTIONS.includes("build_now"));
    assert.ok(VALID_JUDGE_ACTIONS.includes("hold_for_followon"));
    assert.ok(VALID_JUDGE_ACTIONS.includes("archive_but_retain"));
  });

  it("evidence modes include invention", () => {
    assert.equal(VALID_EVIDENCE_MODES.length, 4);
    assert.ok(VALID_EVIDENCE_MODES.includes("invention"));
  });

  it("defaults are sane", () => {
    assert.equal(REQUEST_DEFAULTS.breadth, 3);
    assert.equal(REQUEST_DEFAULTS.depth, 1);
    assert.equal(REQUEST_DEFAULTS.evidence_mode, "mixed");
    assert.equal(REQUEST_DEFAULTS.output_mode, "concepts");
    assert.equal(REQUEST_DEFAULTS.novelty_bias, "medium");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v0.2 — Invention mode, Incubation bucket, Judge actions
// ═══════════════════════════════════════════════════════════════════════════

describe("Invention evidence mode (v0.2)", () => {
  it("allows mixed/high — where new ideas get full confidence", () => {
    assert.ok(validateEvidencePair("invention", "mixed", "high").valid);
    assert.ok(validateEvidencePair("invention", "mixed", "medium").valid);
    assert.ok(validateEvidencePair("invention", "mixed", "low").valid);
  });

  it("allows speculative/medium — speculative ideas get developed not just flagged", () => {
    assert.ok(validateEvidencePair("invention", "speculative", "medium").valid);
    assert.ok(validateEvidencePair("invention", "speculative", "low").valid);
  });

  it("still forbids speculative/high — even invention has a floor", () => {
    assert.ok(!validateEvidencePair("invention", "speculative", "high").valid);
  });

  it("allows grounded at all levels", () => {
    assert.ok(validateEvidencePair("invention", "grounded", "high").valid);
    assert.ok(validateEvidencePair("invention", "grounded", "medium").valid);
    assert.ok(validateEvidencePair("invention", "grounded", "low").valid);
  });

  it("is strictly more permissive than mixed mode", () => {
    // Everything legal in mixed must be legal in invention
    for (const grade of ["grounded", "mixed", "speculative"]) {
      for (const conf of ["high", "medium", "low"]) {
        const mixedResult = validateEvidencePair("mixed", grade, conf);
        const inventionResult = validateEvidencePair("invention", grade, conf);
        if (mixedResult.valid) {
          assert.ok(inventionResult.valid, `invention should allow ${grade}/${conf} since mixed does`);
        }
      }
    }
  });

  it("is distinct from speculative mode — mixed/high is the key difference", () => {
    // mixed/high: invention allows, speculative does not
    assert.ok(validateEvidencePair("invention", "mixed", "high").valid);
    assert.ok(!validateEvidencePair("speculative", "mixed", "high").valid);
  });

  it("validates scout findings under invention mode", () => {
    const finding = {
      id: "sf-test",
      role: "Creative Leap Scout",
      axis: "novel",
      statements: [
        { id: "s1", text: "Bold claim with mixed evidence", kind: "opportunity", evidence_grade: "mixed", confidence: "high" },
        { id: "s2", text: "Speculative at medium", kind: "opportunity", evidence_grade: "speculative", confidence: "medium" },
        { id: "s3", text: "Grounded baseline", kind: "claim", evidence_grade: "grounded", confidence: "high" },
      ],
    };
    const result = validateScoutFinding(finding, "invention");
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("same finding fails under mixed mode — proving invention is needed", () => {
    const finding = {
      id: "sf-test",
      role: "Creative Leap Scout",
      axis: "novel",
      statements: [
        { id: "s1", text: "Bold claim with mixed evidence", kind: "opportunity", evidence_grade: "mixed", confidence: "high" },
        { id: "s2", text: "Speculative at medium", kind: "opportunity", evidence_grade: "speculative", confidence: "medium" },
        { id: "s3", text: "Grounded baseline", kind: "claim", evidence_grade: "grounded", confidence: "high" },
      ],
    };
    const result = validateScoutFinding(finding, "mixed");
    assert.ok(!result.valid);
    assert.equal(result.issues.length, 2); // s1 and s2 both violate mixed mode
  });
});

describe("Incubation directions in SynthesisReport (v0.2)", () => {
  const baseReport = {
    topic_model: "Test space",
    major_themes: ["theme1", "theme2", "theme3"],
    tensions: [],
    advancing_directions: [
      { id: "dir-001", name: "A", thesis: "T", why_it_matters: "W", supporting_atoms: ["fa-001", "fa-002"], risks: [] },
    ],
    archived_directions: [{ name: "Dead", reason: "Too weak" }],
  };

  it("accepts report without incubation (backwards compatible)", () => {
    const result = validateSynthesisReport(baseReport, 1);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("accepts valid incubation directions", () => {
    const report = {
      ...baseReport,
      incubation_directions: [
        {
          id: "inc-001",
          name: "Transparency logs for MCP",
          thesis: "Append-only behavioral audit",
          why_it_matters: "Decentralized trust verification",
          supporting_atoms: ["fa-020"],
          advancement_criteria: "Working prototype with 3 servers logging to a shared append-only store",
        },
      ],
    };
    const result = validateSynthesisReport(report, 1);
    assert.ok(result.valid, result.issues.join(", "));
  });

  it("requires advancement_criteria — what would make this real", () => {
    const report = {
      ...baseReport,
      incubation_directions: [
        {
          id: "inc-001",
          name: "X",
          thesis: "Y",
          why_it_matters: "Z",
          supporting_atoms: ["fa-001"],
          // missing advancement_criteria
        },
      ],
    };
    const result = validateSynthesisReport(report, 1);
    assert.ok(!result.valid);
    assert.ok(result.issues.some(i => i.includes("advancement_criteria")));
  });

  it("incubation needs only 1 supporting atom (lower threshold than advancing)", () => {
    const report = {
      ...baseReport,
      incubation_directions: [
        {
          id: "inc-001",
          name: "X",
          thesis: "Y",
          why_it_matters: "Z",
          supporting_atoms: ["fa-001"],
          advancement_criteria: "Proof of concept",
        },
      ],
    };
    assert.ok(validateSynthesisReport(report, 1).valid);
  });

  it("incubation with empty supporting_atoms fails", () => {
    const report = {
      ...baseReport,
      incubation_directions: [
        {
          id: "inc-001",
          name: "X",
          thesis: "Y",
          why_it_matters: "Z",
          supporting_atoms: [],
          advancement_criteria: "Something",
        },
      ],
    };
    assert.ok(!validateSynthesisReport(report, 1).valid);
  });
});

describe("Judge action field (v0.2)", () => {
  const baseJudge = {
    disposition: "accept",
    overall_quality: "strong",
    per_direction: [
      { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["well-supported"] },
    ],
    reasons: ["All pass"],
  };

  it("accepts judge without action (backwards compatible)", () => {
    assert.ok(validateJudgeReport(baseJudge).valid);
  });

  it("accepts valid action: build_now", () => {
    const report = {
      ...baseJudge,
      per_direction: [
        { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["r"], action: "build_now" },
      ],
    };
    assert.ok(validateJudgeReport(report).valid);
  });

  it("accepts valid action: hold_for_followon", () => {
    const report = {
      ...baseJudge,
      per_direction: [
        { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["r"], action: "hold_for_followon" },
      ],
    };
    assert.ok(validateJudgeReport(report).valid);
  });

  it("accepts valid action: archive_but_retain", () => {
    const report = {
      ...baseJudge,
      per_direction: [
        { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["r"], action: "archive_but_retain" },
      ],
    };
    assert.ok(validateJudgeReport(report).valid);
  });

  it("rejects invalid action", () => {
    const report = {
      ...baseJudge,
      per_direction: [
        { direction_id: "dir-001", verdict: "ready_to_advance", reasons: ["r"], action: "maybe_later" },
      ],
    };
    assert.ok(!validateJudgeReport(report).valid);
  });
});

describe("Frame resolver incubation expand (v0.2)", () => {
  it("adds incubation_expand phase when novelty_bias is high", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", novelty_bias: "high" });
    assert.ok(executionPlan.incubationExpand);
    const incPhase = executionPlan.phases.find(p => p.phase === "incubation_expand");
    assert.ok(incPhase, "incubation_expand phase should exist");
    assert.equal(incPhase.speculative, true);
  });

  it("does NOT add incubation_expand when novelty_bias is medium", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", novelty_bias: "medium" });
    assert.ok(!executionPlan.incubationExpand);
    const incPhase = executionPlan.phases.find(p => p.phase === "incubation_expand");
    assert.ok(!incPhase);
  });

  it("does NOT add incubation_expand when novelty_bias is low", () => {
    const { executionPlan } = resolveFrame({ topic: "X", objective: "Y", novelty_bias: "low" });
    assert.ok(!executionPlan.incubationExpand);
  });

  it("incubation adds 1 step to total", () => {
    const withInc = resolveFrame({ topic: "X", objective: "Y", novelty_bias: "high", breadth: 3, depth: 1 });
    const without = resolveFrame({ topic: "X", objective: "Y", novelty_bias: "medium", breadth: 3, depth: 1 });
    assert.equal(withInc.executionPlan.totalSteps, without.executionPlan.totalSteps + 1);
  });
});

describe("BrainstormResult incubation concepts (v0.2)", () => {
  const validResult = {
    core_read: "Found 3 directions.",
    opportunity_map: [{ direction_id: "dir-001", name: "X", thesis: "T", why_it_matters: "W", expanded_concept: {}, judge_verdict: "ready_to_advance", supporting_evidence_count: 5 }],
    unresolved_tensions: [],
    open_questions: [],
    evidence_trail: {
      scouts_run: ["Context Scout"], total_findings: 9, atoms_after_normalize: 7,
      directions_considered: 5, directions_advancing: 3, expansion_passes: 3,
      judge_loops: 1, judge_disposition: "accept",
    },
    request: { topic: "X", objective: "Y" },
  };

  it("accepts result without incubation_concepts (backwards compatible)", () => {
    assert.ok(validateBrainstormResult(validResult).valid);
  });

  it("accepts valid incubation concepts", () => {
    const result = {
      ...validResult,
      incubation_concepts: [
        {
          name: "Transparency logs",
          thesis: "Append-only behavioral audit for MCP",
          speculative_shape: "A local daemon that logs tool calls to a Merkle tree",
          advancement_criteria: "3 servers logging to shared store, tamper detected in test",
        },
      ],
    };
    assert.ok(validateBrainstormResult(result).valid);
  });

  it("requires all incubation concept fields", () => {
    const result = {
      ...validResult,
      incubation_concepts: [{ name: "X" }], // missing thesis, speculative_shape, advancement_criteria
    };
    const r = validateBrainstormResult(result);
    assert.ok(!r.valid);
    assert.ok(r.issues.length >= 3);
  });
});
