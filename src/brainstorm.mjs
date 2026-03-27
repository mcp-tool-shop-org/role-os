/**
 * Brainstorm Mission — v0.2
 *
 * Multi-perspective search + controlled compression + deliberate recombination.
 * A lawful thinking pipeline, not "parallel notes."
 *
 * Pipeline: Frame → Scout (parallel) → Normalize → Synthesize → Expand → Judge → Return
 *
 * v0.2 additions:
 *   - "invention" evidence mode: speculative at medium, mixed at high — where new ideas live
 *   - Incubation bucket in Synthesize: promising-but-under-evidenced directions get a lawful lane
 *   - Judge action field: build_now / hold_for_followon / archive_but_retain
 *   - Optional incubation expand pass when novelty_bias is high
 */

// ── Evidence mode constraint matrix ─────────────────────────────────────────

/**
 * Legal (evidence_grade, confidence) pairs per evidence mode.
 *
 * Rule: confidence 'high' is ONLY legal for evidence_grade 'grounded' — EXCEPT in invention mode.
 * Rule: 'strict' mode forbids all non-grounded claims.
 * Rule: 'speculative' mode allows speculative claims but caps at 'medium'.
 * Rule: 'invention' mode opens the gate — mixed claims can be high, speculative can be medium.
 *       This is where new ideas live. Following the herd gives you more of the same.
 */
const EVIDENCE_CONSTRAINTS = {
  strict: {
    grounded:    ["high", "medium", "low"],
    mixed:       [],
    speculative: [],
  },
  mixed: {
    grounded:    ["high", "medium", "low"],
    mixed:       ["medium", "low"],
    speculative: ["low"],
  },
  speculative: {
    grounded:    ["high", "medium", "low"],
    mixed:       ["medium", "low"],
    speculative: ["medium", "low"],
  },
  invention: {
    grounded:    ["high", "medium", "low"],
    mixed:       ["high", "medium", "low"],
    speculative: ["medium", "low"],
  },
};

const VALID_EVIDENCE_MODES = ["strict", "mixed", "speculative", "invention"];
const VALID_EVIDENCE_GRADES = ["grounded", "mixed", "speculative"];
const VALID_CONFIDENCE_LEVELS = ["high", "medium", "low"];
const VALID_OUTPUT_MODES = ["idea_set", "strategy", "concepts", "opportunity_map"];
const VALID_NOVELTY_BIAS = ["low", "medium", "high"];
const VALID_STATEMENT_KINDS = ["claim", "opportunity", "risk", "tension", "unknown"];

// ── Evidence mode validation ────────────────────────────────────────────────

/**
 * Check if a (grade, confidence) pair is legal under the given evidence mode.
 *
 * @param {string} mode - 'strict' | 'mixed' | 'speculative'
 * @param {string} grade - 'grounded' | 'mixed' | 'speculative'
 * @param {string} confidence - 'high' | 'medium' | 'low'
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateEvidencePair(mode, grade, confidence) {
  if (!VALID_EVIDENCE_MODES.includes(mode)) {
    return { valid: false, reason: `Invalid evidence mode: "${mode}"` };
  }
  if (!VALID_EVIDENCE_GRADES.includes(grade)) {
    return { valid: false, reason: `Invalid evidence grade: "${grade}"` };
  }
  if (!VALID_CONFIDENCE_LEVELS.includes(confidence)) {
    return { valid: false, reason: `Invalid confidence level: "${confidence}"` };
  }

  const allowed = EVIDENCE_CONSTRAINTS[mode][grade];
  if (!allowed.includes(confidence)) {
    return {
      valid: false,
      reason: `Evidence mode "${mode}" does not allow (grade: "${grade}", confidence: "${confidence}")`,
    };
  }

  return { valid: true };
}

/**
 * Validate all statements in a scout finding against the evidence mode.
 *
 * @param {string} mode - Evidence mode
 * @param {Array<{evidence_grade: string, confidence: string, id?: string}>} statements
 * @returns {{ valid: boolean, violations: Array<{statementId: string, grade: string, confidence: string, reason: string}> }}
 */
export function validateFindingStatements(mode, statements) {
  const violations = [];

  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];
    const result = validateEvidencePair(mode, s.evidence_grade, s.confidence);
    if (!result.valid) {
      violations.push({
        statementId: s.id || `statement-${i}`,
        grade: s.evidence_grade,
        confidence: s.confidence,
        reason: result.reason,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

// ── BrainstormRequest defaults & validation ─────────────────────────────────

const REQUEST_DEFAULTS = {
  output_mode: "concepts",
  breadth: 3,
  depth: 1,
  novelty_bias: "medium",
  evidence_mode: "mixed",
};

const BREADTH_MIN = 1;
const BREADTH_MAX = 7;
const DEPTH_MIN = 1;
const DEPTH_MAX = 3;

/**
 * Validate a BrainstormRequest object.
 *
 * @param {object} request
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateRequest(request) {
  const issues = [];

  if (!request) {
    return { valid: false, issues: ["Request is null or undefined"] };
  }

  // Required fields
  if (!request.topic || typeof request.topic !== "string" || request.topic.trim().length === 0) {
    issues.push("topic is required and must be a non-empty string");
  }
  if (!request.objective || typeof request.objective !== "string" || request.objective.trim().length === 0) {
    issues.push("objective is required and must be a non-empty string");
  }

  // Output mode
  if (request.output_mode && !VALID_OUTPUT_MODES.includes(request.output_mode)) {
    issues.push(`output_mode must be one of: ${VALID_OUTPUT_MODES.join(", ")}`);
  }

  // Breadth
  if (request.breadth !== undefined) {
    if (typeof request.breadth !== "number" || !Number.isInteger(request.breadth)) {
      issues.push("breadth must be an integer");
    } else if (request.breadth < BREADTH_MIN || request.breadth > BREADTH_MAX) {
      issues.push(`breadth must be between ${BREADTH_MIN} and ${BREADTH_MAX}`);
    }
  }

  // Depth
  if (request.depth !== undefined) {
    if (typeof request.depth !== "number" || !Number.isInteger(request.depth)) {
      issues.push("depth must be an integer");
    } else if (request.depth < DEPTH_MIN || request.depth > DEPTH_MAX) {
      issues.push(`depth must be between ${DEPTH_MIN} and ${DEPTH_MAX}`);
    }
  }

  // Novelty bias
  if (request.novelty_bias && !VALID_NOVELTY_BIAS.includes(request.novelty_bias)) {
    issues.push(`novelty_bias must be one of: ${VALID_NOVELTY_BIAS.join(", ")}`);
  }

  // Evidence mode
  if (request.evidence_mode && !VALID_EVIDENCE_MODES.includes(request.evidence_mode)) {
    issues.push(`evidence_mode must be one of: ${VALID_EVIDENCE_MODES.join(", ")}`);
  }

  // Optional arrays
  if (request.constraints && !Array.isArray(request.constraints)) {
    issues.push("constraints must be an array of strings");
  }
  if (request.search_axes && !Array.isArray(request.search_axes)) {
    issues.push("search_axes must be an array of strings");
  }

  // Audience
  if (request.audience !== undefined && typeof request.audience !== "string") {
    issues.push("audience must be a string");
  }

  return { valid: issues.length === 0, issues };
}

// ── Frame resolver ──────────────────────────────────────────────────────────

/**
 * Default scout roster for v0.1 (legacy — kept for backwards compatibility).
 */
const V01_SCOUT_ROSTER = [
  "Context Scout",
  "User Value Scout",
  "Creative Leap Scout",
];

/**
 * v0.3 analyst roster — structurally specialized roles with hard boundaries.
 * Each analyst has: role-native schema, input partition, forbidden topics, permitted claim kinds.
 */
const V03_ANALYST_ROSTER = [
  "Context Analyst",
  "User Value Analyst",
  "Mechanics Analyst",
  "Positioning Analyst",
];

/**
 * Expander roster by depth level.
 */
const EXPANDER_ROSTER = [
  "Product Expander",     // depth >= 1
  "Scenario Expander",    // depth >= 2
  "Moat Expander",        // depth >= 3
];

/**
 * Resolve a raw task description into a BrainstormRequest with defaults applied.
 *
 * In v0.1, this does simple extraction. In production, an LLM would parse
 * the task description into structured fields.
 *
 * @param {object} input - Partial BrainstormRequest (at minimum: topic + objective)
 * @returns {{ request: object, scoutRoster: string[], expanderRoster: string[], executionPlan: object }}
 */
export function resolveFrame(input) {
  const request = {
    topic: input.topic,
    objective: input.objective,
    audience: input.audience || null,
    constraints: input.constraints || [],
    search_axes: input.search_axes || [],
    output_mode: input.output_mode || REQUEST_DEFAULTS.output_mode,
    breadth: input.breadth ?? REQUEST_DEFAULTS.breadth,
    depth: input.depth ?? REQUEST_DEFAULTS.depth,
    novelty_bias: input.novelty_bias || REQUEST_DEFAULTS.novelty_bias,
    evidence_mode: input.evidence_mode || REQUEST_DEFAULTS.evidence_mode,
    role_mode: input.role_mode || "v03",  // "v01" for legacy scouts, "v03" for specialized analysts
  };

  // Determine analyst/scout roster based on role_mode
  const useV03 = request.role_mode === "v03";
  const analystRoster = useV03 ? [...V03_ANALYST_ROSTER] : [...V01_SCOUT_ROSTER];

  // v0.3: Contrarian Analyst runs after Normalize (sees atoms not brief)
  const includeContrarian = useV03;

  // Determine expander roster based on depth
  const expanderRoster = EXPANDER_ROSTER.slice(0, request.depth);

  // v0.2: Incubation expand pass when novelty_bias is high
  const incubationExpand = request.novelty_bias === "high";
  const incubationSteps = incubationExpand ? 1 : 0;

  // Build execution plan
  const phases = [
    { phase: "frame", steps: 1 },
    { phase: useV03 ? "analyze" : "scout", steps: analystRoster.length, parallel: true },
    { phase: "normalize", steps: 1 },
  ];

  if (useV03) {
    // v0.3 pipeline: cross-examine and rebut between normalize and synthesize
    phases.push(
      { phase: "cross_examine", steps: includeContrarian ? analystRoster.length + 1 : analystRoster.length, parallel: true },
      { phase: "rebut", steps: analystRoster.length, parallel: true },
    );
  }

  phases.push(
    { phase: "synthesize", steps: 1 },
    { phase: "expand", steps: request.breadth * expanderRoster.length, parallel: false },
  );

  if (incubationExpand) {
    phases.push({ phase: "incubation_expand", steps: 1, speculative: true });
  }

  phases.push(
    { phase: "judge", steps: 1 },
    { phase: "return", steps: 1 },
  );

  // Calculate total steps
  let totalSteps = 0;
  for (const p of phases) totalSteps += p.steps;

  const executionPlan = {
    phases,
    totalSteps,
    maxJudgeLoops: 3,
    analystCount: analystRoster.length,
    expanderCount: expanderRoster.length,
    directionsToExpand: request.breadth,
    incubationExpand,
    roleMode: request.role_mode,
    includeContrarian,
    // Legacy compat
    scoutCount: analystRoster.length,
  };

  return { request, scoutRoster: analystRoster, expanderRoster, executionPlan };
}

// ── Scout finding schema validation ─────────────────────────────────────────

/**
 * Validate a ScoutFinding object.
 *
 * @param {object} finding
 * @param {string} evidenceMode - The active evidence mode for constraint checking
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateScoutFinding(finding, evidenceMode) {
  const issues = [];

  if (!finding) return { valid: false, issues: ["Finding is null"] };

  if (!finding.id || typeof finding.id !== "string") {
    issues.push("id is required");
  }
  if (!finding.role || typeof finding.role !== "string") {
    issues.push("role is required");
  }
  if (!finding.axis || typeof finding.axis !== "string") {
    issues.push("axis is required");
  }

  if (!Array.isArray(finding.statements)) {
    issues.push("statements must be an array");
    return { valid: false, issues };
  }

  if (finding.statements.length < 3) {
    issues.push("statements must have at least 3 entries");
  }
  if (finding.statements.length > 12) {
    issues.push("statements must have at most 12 entries");
  }

  for (let i = 0; i < finding.statements.length; i++) {
    const s = finding.statements[i];
    const prefix = `statements[${i}]`;

    if (!s.id) issues.push(`${prefix}.id is required`);
    if (!s.text || typeof s.text !== "string") issues.push(`${prefix}.text is required`);
    if (!VALID_STATEMENT_KINDS.includes(s.kind)) {
      issues.push(`${prefix}.kind must be one of: ${VALID_STATEMENT_KINDS.join(", ")}`);
    }
    if (!VALID_EVIDENCE_GRADES.includes(s.evidence_grade)) {
      issues.push(`${prefix}.evidence_grade must be one of: ${VALID_EVIDENCE_GRADES.join(", ")}`);
    }
    if (!VALID_CONFIDENCE_LEVELS.includes(s.confidence)) {
      issues.push(`${prefix}.confidence must be one of: ${VALID_CONFIDENCE_LEVELS.join(", ")}`);
    }

    // Evidence mode constraint
    if (evidenceMode && s.evidence_grade && s.confidence) {
      const pair = validateEvidencePair(evidenceMode, s.evidence_grade, s.confidence);
      if (!pair.valid) {
        issues.push(`${prefix}: ${pair.reason}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Normalized finding set validation ───────────────────────────────────────

/**
 * Validate a NormalizedFindingSet object.
 *
 * @param {object} findingSet
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateNormalizedFindingSet(findingSet) {
  const issues = [];

  if (!findingSet) return { valid: false, issues: ["Finding set is null"] };

  // Atoms
  if (!Array.isArray(findingSet.atoms)) {
    issues.push("atoms must be an array");
  } else {
    for (let i = 0; i < findingSet.atoms.length; i++) {
      const a = findingSet.atoms[i];
      const p = `atoms[${i}]`;
      if (!a.id) issues.push(`${p}.id is required`);
      if (!a.statement) issues.push(`${p}.statement is required`);
      if (!VALID_STATEMENT_KINDS.includes(a.kind)) {
        issues.push(`${p}.kind must be one of: ${VALID_STATEMENT_KINDS.join(", ")}`);
      }
      if (!Array.isArray(a.source_roles) || a.source_roles.length === 0) {
        issues.push(`${p}.source_roles must be a non-empty array`);
      }
      if (!Array.isArray(a.source_statement_ids) || a.source_statement_ids.length === 0) {
        issues.push(`${p}.source_statement_ids must be a non-empty array`);
      }
      if (typeof a.support_count !== "number" || a.support_count < 0) {
        issues.push(`${p}.support_count must be a non-negative number`);
      }
      if (typeof a.challenge_count !== "number" || a.challenge_count < 0) {
        issues.push(`${p}.challenge_count must be a non-negative number`);
      }
      if (!VALID_EVIDENCE_GRADES.includes(a.evidence_grade)) {
        issues.push(`${p}.evidence_grade is invalid`);
      }
      if (!VALID_CONFIDENCE_LEVELS.includes(a.confidence)) {
        issues.push(`${p}.confidence is invalid`);
      }
    }
  }

  // Conflicts
  if (!Array.isArray(findingSet.conflicts)) {
    issues.push("conflicts must be an array");
  } else {
    for (let i = 0; i < findingSet.conflicts.length; i++) {
      const c = findingSet.conflicts[i];
      const p = `conflicts[${i}]`;
      if (!c.id) issues.push(`${p}.id is required`);
      if (!c.finding_a_id) issues.push(`${p}.finding_a_id is required`);
      if (!c.finding_b_id) issues.push(`${p}.finding_b_id is required`);
      if (!c.reason) issues.push(`${p}.reason is required`);
      if (!["hard", "soft"].includes(c.severity)) {
        issues.push(`${p}.severity must be "hard" or "soft"`);
      }
    }
  }

  // Stats
  if (!findingSet.stats) {
    issues.push("stats is required");
  } else {
    const s = findingSet.stats;
    if (typeof s.total_source_statements !== "number") issues.push("stats.total_source_statements must be a number");
    if (typeof s.total_atoms !== "number") issues.push("stats.total_atoms must be a number");
    if (typeof s.grounded_count !== "number") issues.push("stats.grounded_count must be a number");
    if (typeof s.mixed_count !== "number") issues.push("stats.mixed_count must be a number");
    if (typeof s.speculative_count !== "number") issues.push("stats.speculative_count must be a number");
  }

  // Flags
  if (!Array.isArray(findingSet.unsupported_high_confidence_flags)) {
    issues.push("unsupported_high_confidence_flags must be an array");
  }

  if (typeof findingSet.duplicates_collapsed !== "number") {
    issues.push("duplicates_collapsed must be a number");
  }

  return { valid: issues.length === 0, issues };
}

// ── Synthesis report validation ─────────────────────────────────────────────

/**
 * Validate a SynthesisReport object.
 *
 * @param {object} report
 * @param {number} expectedBreadth - How many advancing directions are required
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateSynthesisReport(report, expectedBreadth) {
  const issues = [];

  if (!report) return { valid: false, issues: ["Report is null"] };

  if (!report.topic_model || typeof report.topic_model !== "string") {
    issues.push("topic_model is required");
  }

  if (!Array.isArray(report.major_themes) || report.major_themes.length < 3) {
    issues.push("major_themes must have at least 3 entries");
  }

  if (!Array.isArray(report.tensions)) {
    issues.push("tensions must be an array");
  }

  // Breadth enforcement — exact match
  if (!Array.isArray(report.advancing_directions)) {
    issues.push("advancing_directions must be an array");
  } else {
    if (report.advancing_directions.length !== expectedBreadth) {
      issues.push(`advancing_directions must have exactly ${expectedBreadth} entries (got ${report.advancing_directions.length})`);
    }
    for (let i = 0; i < report.advancing_directions.length; i++) {
      const d = report.advancing_directions[i];
      const p = `advancing_directions[${i}]`;
      if (!d.id) issues.push(`${p}.id is required`);
      if (!d.name) issues.push(`${p}.name is required`);
      if (!d.thesis) issues.push(`${p}.thesis is required`);
      if (!d.why_it_matters) issues.push(`${p}.why_it_matters is required`);
      if (!Array.isArray(d.supporting_atoms) || d.supporting_atoms.length < 2) {
        issues.push(`${p}.supporting_atoms must cite at least 2 finding atoms`);
      }
      if (!Array.isArray(d.risks)) {
        issues.push(`${p}.risks must be an array`);
      }
    }
  }

  if (!Array.isArray(report.archived_directions)) {
    issues.push("archived_directions must be an array");
  } else {
    for (let i = 0; i < report.archived_directions.length; i++) {
      const d = report.archived_directions[i];
      if (!d.name) issues.push(`archived_directions[${i}].name is required`);
      if (!d.reason) issues.push(`archived_directions[${i}].reason is required`);
    }
  }

  // Incubation directions (v0.2) — optional third lane for promising-but-under-evidenced ideas
  if (report.incubation_directions !== undefined) {
    if (!Array.isArray(report.incubation_directions)) {
      issues.push("incubation_directions must be an array");
    } else {
      for (let i = 0; i < report.incubation_directions.length; i++) {
        const d = report.incubation_directions[i];
        const p = `incubation_directions[${i}]`;
        if (!d.id) issues.push(`${p}.id is required`);
        if (!d.name) issues.push(`${p}.name is required`);
        if (!d.thesis) issues.push(`${p}.thesis is required`);
        if (!d.why_it_matters) issues.push(`${p}.why_it_matters is required`);
        if (!Array.isArray(d.supporting_atoms) || d.supporting_atoms.length === 0) {
          issues.push(`${p}.supporting_atoms must cite at least 1 finding atom`);
        }
        if (!d.advancement_criteria || typeof d.advancement_criteria !== "string") {
          issues.push(`${p}.advancement_criteria is required — what evidence would advance this direction to the next pass`);
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Expanded concept validation ─────────────────────────────────────────────

/**
 * Validate an ExpandedConcept object.
 *
 * @param {object} concept
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateExpandedConcept(concept) {
  const issues = [];

  if (!concept) return { valid: false, issues: ["Concept is null"] };

  if (!concept.direction_id) issues.push("direction_id is required");
  if (!concept.direction_name) issues.push("direction_name is required");
  if (!concept.thesis) issues.push("thesis is required");

  // Product shape (required for v0.1 — Product Expander always runs)
  if (!concept.product_shape) {
    issues.push("product_shape is required");
  } else {
    const ps = concept.product_shape;
    if (!ps.target_user) issues.push("product_shape.target_user is required");
    if (!ps.core_mechanism) issues.push("product_shape.core_mechanism is required");
    if (!Array.isArray(ps.features) || ps.features.length === 0) {
      issues.push("product_shape.features must be a non-empty array");
    }
    if (!ps.core_loop) issues.push("product_shape.core_loop is required");
    if (!ps.smallest_proof) issues.push("product_shape.smallest_proof is required");
  }

  // Scenarios (optional — depth >= 2)
  if (concept.scenarios !== undefined) {
    if (!Array.isArray(concept.scenarios)) {
      issues.push("scenarios must be an array");
    } else {
      for (let i = 0; i < concept.scenarios.length; i++) {
        const s = concept.scenarios[i];
        if (!s.situation) issues.push(`scenarios[${i}].situation is required`);
        if (!s.user_action) issues.push(`scenarios[${i}].user_action is required`);
        if (!s.outcome) issues.push(`scenarios[${i}].outcome is required`);
      }
    }
  }

  // Moat (optional — depth >= 3)
  if (concept.moat !== undefined) {
    const m = concept.moat;
    if (!m.differentiation) issues.push("moat.differentiation is required");
    if (!m.stickiness) issues.push("moat.stickiness is required");
    if (!m.competitive_response) issues.push("moat.competitive_response is required");
    if (!Array.isArray(m.phase_plan) || m.phase_plan.length === 0) {
      issues.push("moat.phase_plan must be a non-empty array");
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Judge report validation ─────────────────────────────────────────────────

const VALID_DISPOSITIONS = ["accept", "revise_expand", "revise_synthesize", "reject"];
const VALID_QUALITY_LEVELS = ["strong", "adequate", "weak"];
const VALID_DIRECTION_VERDICTS = ["ready_to_advance", "needs_incubation", "not_active_now"];
const VALID_JUDGE_ACTIONS = ["build_now", "hold_for_followon", "archive_but_retain"];
const VALID_FAILING_CRITERIA = [
  "weak_differentiation",
  "low_evidence_support",
  "generic_expansion",
  "contradiction_unresolved",
  "poor_objective_alignment",
  "infeasible",
];

/**
 * Validate a JudgeReport object.
 *
 * @param {object} report
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateJudgeReport(report) {
  const issues = [];

  if (!report) return { valid: false, issues: ["Report is null"] };

  if (!VALID_DISPOSITIONS.includes(report.disposition)) {
    issues.push(`disposition must be one of: ${VALID_DISPOSITIONS.join(", ")}`);
  }
  if (!VALID_QUALITY_LEVELS.includes(report.overall_quality)) {
    issues.push(`overall_quality must be one of: ${VALID_QUALITY_LEVELS.join(", ")}`);
  }

  if (!Array.isArray(report.per_direction)) {
    issues.push("per_direction must be an array");
  } else {
    for (let i = 0; i < report.per_direction.length; i++) {
      const d = report.per_direction[i];
      const p = `per_direction[${i}]`;
      if (!d.direction_id) issues.push(`${p}.direction_id is required`);
      if (!VALID_DIRECTION_VERDICTS.includes(d.verdict)) {
        issues.push(`${p}.verdict must be one of: ${VALID_DIRECTION_VERDICTS.join(", ")}`);
      }
      if (!Array.isArray(d.reasons) || d.reasons.length === 0) {
        issues.push(`${p}.reasons must be a non-empty array`);
      }
      if (d.failing_criteria) {
        for (const fc of d.failing_criteria) {
          if (!VALID_FAILING_CRITERIA.includes(fc)) {
            issues.push(`${p}.failing_criteria contains invalid value: "${fc}"`);
          }
        }
      }
      // v0.2: action recommendation per direction
      if (d.action !== undefined && !VALID_JUDGE_ACTIONS.includes(d.action)) {
        issues.push(`${p}.action must be one of: ${VALID_JUDGE_ACTIONS.join(", ")}`);
      }
    }
  }

  if (!Array.isArray(report.reasons) || report.reasons.length === 0) {
    issues.push("reasons must be a non-empty array");
  }

  // Revision targets required for revise dispositions
  if (report.disposition === "revise_expand" || report.disposition === "revise_synthesize") {
    if (!Array.isArray(report.revision_targets) || report.revision_targets.length === 0) {
      issues.push("revision_targets required for revise dispositions");
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Brainstorm result validation ────────────────────────────────────────────

/**
 * Validate a BrainstormResult object.
 *
 * @param {object} result
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateBrainstormResult(result) {
  const issues = [];

  if (!result) return { valid: false, issues: ["Result is null"] };

  if (!result.core_read || typeof result.core_read !== "string") {
    issues.push("core_read is required");
  }

  if (!Array.isArray(result.opportunity_map) || result.opportunity_map.length === 0) {
    issues.push("opportunity_map must be a non-empty array");
  }

  if (!Array.isArray(result.unresolved_tensions)) {
    issues.push("unresolved_tensions must be an array");
  }

  if (!Array.isArray(result.open_questions)) {
    issues.push("open_questions must be an array");
  }

  // v0.2: Incubation concepts (optional — present when novelty_bias is high)
  if (result.incubation_concepts !== undefined) {
    if (!Array.isArray(result.incubation_concepts)) {
      issues.push("incubation_concepts must be an array");
    } else {
      for (let i = 0; i < result.incubation_concepts.length; i++) {
        const ic = result.incubation_concepts[i];
        const p = `incubation_concepts[${i}]`;
        if (!ic.name) issues.push(`${p}.name is required`);
        if (!ic.thesis) issues.push(`${p}.thesis is required`);
        if (!ic.speculative_shape) issues.push(`${p}.speculative_shape is required`);
        if (!ic.advancement_criteria) issues.push(`${p}.advancement_criteria is required`);
      }
    }
  }

  if (!result.evidence_trail) {
    issues.push("evidence_trail is required");
  } else {
    const t = result.evidence_trail;
    if (!Array.isArray(t.scouts_run)) issues.push("evidence_trail.scouts_run must be an array");
    if (typeof t.total_findings !== "number") issues.push("evidence_trail.total_findings must be a number");
    if (typeof t.atoms_after_normalize !== "number") issues.push("evidence_trail.atoms_after_normalize must be a number");
    if (typeof t.directions_considered !== "number") issues.push("evidence_trail.directions_considered must be a number");
    if (typeof t.directions_advancing !== "number") issues.push("evidence_trail.directions_advancing must be a number");
    if (typeof t.expansion_passes !== "number") issues.push("evidence_trail.expansion_passes must be a number");
    if (typeof t.judge_loops !== "number") issues.push("evidence_trail.judge_loops must be a number");
    if (!VALID_DISPOSITIONS.includes(t.judge_disposition)) {
      issues.push("evidence_trail.judge_disposition is invalid");
    }
  }

  if (!result.request) {
    issues.push("request is required");
  }

  return { valid: issues.length === 0, issues };
}

// ── Exports for constants ───────────────────────────────────────────────────

export {
  EVIDENCE_CONSTRAINTS,
  VALID_EVIDENCE_MODES,
  VALID_EVIDENCE_GRADES,
  VALID_CONFIDENCE_LEVELS,
  VALID_OUTPUT_MODES,
  VALID_NOVELTY_BIAS,
  VALID_STATEMENT_KINDS,
  VALID_DISPOSITIONS,
  VALID_QUALITY_LEVELS,
  VALID_DIRECTION_VERDICTS,
  VALID_FAILING_CRITERIA,
  VALID_JUDGE_ACTIONS,
  V01_SCOUT_ROSTER,
  V03_ANALYST_ROSTER,
  EXPANDER_ROSTER,
  REQUEST_DEFAULTS,
  BREADTH_MIN,
  BREADTH_MAX,
  DEPTH_MIN,
  DEPTH_MAX,
};
