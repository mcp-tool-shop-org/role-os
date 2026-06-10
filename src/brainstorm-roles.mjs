/**
 * Brainstorm Role Contracts — v0.3
 *
 * Real role specialization means each analyst:
 * - Sees a filtered slice of the brief (input partition)
 * - Answers only permitted questions (method contract)
 * - Cannot reason about forbidden topics (blindspot enforcement)
 * - Emits a role-native output schema (not shared prose)
 * - Gets validated for out-of-lens claims (boundary validator)
 *
 * Pipeline: Frame → Analyze (role-native) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge → Return
 */

// ── Role-native output schemas ──────────────────────────────────────────────

/**
 * Context Analyst: What is this, what is it next to, and what is it not?
 * Method: terminology genealogy, adjacency map, category boundary map
 */
const CONTEXT_MAP_SCHEMA = {
  role: "Context Analyst",
  fields: {
    terms: { type: "array", items: { term: "string", meaning: "string", adjacent_to: "string[]" }, required: true, minItems: 3 },
    category_map: { type: "array", items: { category: "string", examples: "string[]" }, required: true, minItems: 2 },
    lineage_claims: { type: "array", items: { claim: "string", precedent: "string[]" }, required: true, minItems: 1 },
    boundary_claims: { type: "array", items: "string", required: true, minItems: 1 },
  },
};

/**
 * User Value Analyst: Where is the felt pull or pain?
 * Method: jobs-to-be-done, pain/relief map, willingness/avoidance signals
 */
const USER_VALUE_MAP_SCHEMA = {
  role: "User Value Analyst",
  fields: {
    jobs: { type: "array", items: { actor: "string", situation: "string", desired_outcome: "string" }, required: true, minItems: 2 },
    frictions: { type: "array", items: { friction: "string", severity: "enum:high|medium|low" }, required: true, minItems: 2 },
    unmet_desires: { type: "array", items: "string", required: true, minItems: 1 },
    willingness_signals: { type: "array", items: "string", required: true, minItems: 1 },
  },
};

/**
 * Mechanics Analyst: What has to be true for this to work?
 * Method: loop decomposition, dependency chain, failure-mode analysis
 */
const MECHANICS_MAP_SCHEMA = {
  role: "Mechanics Analyst",
  fields: {
    loops: { type: "array", items: { name: "string", input: "string[]", transform: "string[]", output: "string[]" }, required: true, minItems: 1 },
    dependencies: { type: "array", items: { component: "string", depends_on: "string[]" }, required: true, minItems: 1 },
    failure_points: { type: "array", items: "string", required: true, minItems: 1 },
    irreducible_mechanisms: { type: "array", items: "string", required: true, minItems: 1 },
  },
};

/**
 * Positioning Analyst: What claim could this own, and when is it legal to make it?
 * Method: substitute comparison, wedge identification, claim timing analysis
 */
const POSITIONING_MAP_SCHEMA = {
  role: "Positioning Analyst",
  fields: {
    substitutes: { type: "array", items: { name: "string", overlap: "string", gap: "string" }, required: true, minItems: 1 },
    wedge_candidates: { type: "array", items: { claim: "string", timing: "string", risk: "string" }, required: true, minItems: 1 },
    category_frame: { type: "string", required: true },
    forbidden_claims: { type: "array", items: { claim: "string", reason: "string" }, required: false },
  },
};

/**
 * Contrarian Analyst: Which specific claims are overstated, premature, or structurally false?
 * Method: targeted challenge only, claim-by-claim attack, contradiction exposure
 */
const CHALLENGE_SET_SCHEMA = {
  role: "Contrarian Analyst",
  fields: {
    challenges: { type: "array", items: {
      target_claim_id: "string",
      source_role: "string",
      challenge_type: "enum:out_of_scope|unsupported|premature|mechanically_blocked|market_invisible|user_misaligned",
      argument: "string",
      evidence_grade: "enum:grounded|mixed|speculative",
      confidence: "enum:high|medium|low",
    }, required: true, minItems: 1 },
  },
};

export const ROLE_NATIVE_SCHEMAS = {
  "Context Analyst": CONTEXT_MAP_SCHEMA,
  "User Value Analyst": USER_VALUE_MAP_SCHEMA,
  "Mechanics Analyst": MECHANICS_MAP_SCHEMA,
  "Positioning Analyst": POSITIONING_MAP_SCHEMA,
  "Contrarian Analyst": CHALLENGE_SET_SCHEMA,
};

// ── Input partitioning ──────────────────────────────────────────────────────

/**
 * Each role sees a filtered view of the brief. Not guidance — structural partition.
 * Fields not in the permitted set are stripped before the role receives the brief.
 */
export const INPUT_PARTITIONS = {
  "Context Analyst": {
    permitted: ["topic", "constraints", "search_axes"],
    forbidden: ["audience", "novelty_bias"],
    rationale: "Context Analyst maps the space, not the people in it. Audience awareness biases toward user-centric framing.",
  },
  "User Value Analyst": {
    permitted: ["topic", "objective", "audience", "constraints"],
    forbidden: ["search_axes", "novelty_bias"],
    rationale: "User Value Analyst needs audience and constraints but not category-shaping axes that belong to Context.",
  },
  "Mechanics Analyst": {
    permitted: ["topic", "objective", "constraints"],
    forbidden: ["audience", "novelty_bias", "search_axes"],
    rationale: "Mechanics Analyst reasons about what has to be true structurally. Audience and novelty are irrelevant to mechanism.",
  },
  "Positioning Analyst": {
    permitted: ["topic", "objective", "audience", "constraints"],
    forbidden: ["search_axes"],
    rationale: "Positioning needs audience and constraints but should not see search axes that pre-frame the category.",
  },
  "Contrarian Analyst": {
    permitted: [],  // Contrarian sees ONLY claim atoms from other roles, not the original brief
    forbidden: ["topic", "objective", "audience", "constraints", "search_axes", "novelty_bias"],
    rationale: "Contrarian operates on claims, not the brief. Seeing the brief creates alignment bias.",
  },
};

/**
 * Partition a BrainstormRequest for a specific role.
 * Returns only the fields the role is permitted to see.
 *
 * @param {object} request - Full BrainstormRequest
 * @param {string} roleName - Role to partition for
 * @returns {object} Filtered request with only permitted fields
 */
export function partitionBrief(request, roleName) {
  const partition = INPUT_PARTITIONS[roleName];
  if (!partition) {
    // Unknown roles receive only the topic — minimal brief, not full access
    return request.topic !== undefined ? { topic: request.topic } : {};
  }

  const filtered = {};
  for (const field of partition.permitted) {
    if (request[field] !== undefined) {
      filtered[field] = request[field];
    }
  }
  return filtered;
}

// ── Forbidden topics / blindspot enforcement ────────────────────────────────

/**
 * Each role has forbidden vocabulary — words and phrases that indicate
 * the role is reasoning outside its lens. These are rejection criteria,
 * not guidance.
 */
export const ROLE_BLINDSPOTS = {
  "Context Analyst": {
    forbidden_phrases: [
      "users want", "users need", "developers prefer", "audience desires",
      "should build", "recommend building", "the product should",
      "market opportunity", "revenue", "pricing", "go-to-market",
      "competitive advantage", "positioning",
    ],
    forbidden_claim_kinds: ["need", "desire", "positioning", "mechanism"],
    permitted_claim_kinds: ["definition", "category", "lineage", "boundary", "adjacency"],
    rejection_reason: "Context Analyst cannot infer user desire, rank commercial opportunity, or recommend product scope.",
  },
  "User Value Analyst": {
    forbidden_phrases: [
      "architecture should", "implement using", "the system requires",
      "dependency on", "infrastructure", "database", "API design",
      "competitor ranks", "market share", "positioning against",
      "category definition", "adjacent to", "lineage of",
    ],
    forbidden_claim_kinds: ["definition", "category", "lineage", "mechanism", "positioning"],
    permitted_claim_kinds: ["need", "desire", "friction", "willingness", "avoidance"],
    rejection_reason: "User Value Analyst cannot compare competitors, propose architecture, or infer technical feasibility.",
  },
  "Mechanics Analyst": {
    forbidden_phrases: [
      "users want", "users feel", "emotional resonance",
      "brand", "messaging", "positioning", "go-to-market",
      "pricing", "revenue model", "customer psychology",
      "market appetite", "competitive advantage",
    ],
    forbidden_claim_kinds: ["need", "desire", "positioning", "category"],
    permitted_claim_kinds: ["mechanism", "dependency", "constraint", "failure_mode", "loop"],
    rejection_reason: "Mechanics Analyst cannot decide messaging, estimate emotional resonance, or assert user willingness.",
  },
  "Positioning Analyst": {
    forbidden_phrases: [
      "implement using", "architecture should", "database",
      "API design", "dependency chain", "failure mode",
      "the system requires", "infrastructure",
      "terminology genealogy", "adjacent space", "category boundary",
    ],
    forbidden_claim_kinds: ["mechanism", "dependency", "definition", "lineage"],
    permitted_claim_kinds: ["positioning", "wedge", "substitute", "timing", "category_frame"],
    rejection_reason: "Positioning Analyst cannot design implementation or map ontology.",
  },
  "Contrarian Analyst": {
    forbidden_phrases: [
      "I suggest", "we should", "the product could", "a better approach",
      "my recommendation", "consider building",
    ],
    forbidden_claim_kinds: ["need", "desire", "mechanism", "positioning", "definition"],
    permitted_claim_kinds: ["challenge", "contradiction", "overstatement", "gap"],
    rejection_reason: "Contrarian Analyst cannot generate original ideas, only challenge existing claims by ID.",
  },
};

// ── Boundary validators ─────────────────────────────────────────────────────

/**
 * Validate a role-native output against its blindspot contract.
 * Returns violations — any forbidden phrase or claim kind found in the output.
 *
 * @param {string} roleName
 * @param {string} outputText - The full text of the role's output (stringified)
 * @returns {{ valid: boolean, violations: Array<{type: string, detail: string}> }}
 */
export function validateRoleBoundary(roleName, outputText) {
  const blindspot = ROLE_BLINDSPOTS[roleName];
  if (!blindspot) return { valid: true, violations: [] };

  const violations = [];
  const lower = outputText.toLowerCase();

  for (const phrase of blindspot.forbidden_phrases) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push({
        type: "forbidden_phrase",
        detail: `"${phrase}" — ${blindspot.rejection_reason}`,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate that a role's output claims are within its permitted claim kinds.
 *
 * @param {string} roleName
 * @param {Array<{kind: string}>} claims - Claims with kind field
 * @returns {{ valid: boolean, violations: Array<{claim_index: number, kind: string, detail: string}> }}
 */
export function validateClaimKinds(roleName, claims) {
  const blindspot = ROLE_BLINDSPOTS[roleName];
  if (!blindspot) return { valid: true, violations: [] };

  const violations = [];
  for (let i = 0; i < claims.length; i++) {
    if (blindspot.forbidden_claim_kinds.includes(claims[i].kind)) {
      violations.push({
        claim_index: i,
        kind: claims[i].kind,
        detail: `Claim kind "${claims[i].kind}" is forbidden for ${roleName}. ${blindspot.rejection_reason}`,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

// ── Role-native output validators ───────────────────────────────────────────

/**
 * Validate a role-native output against its schema.
 *
 * @param {string} roleName
 * @param {object} output - The role-native output object
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateRoleNativeOutput(roleName, output) {
  const schema = ROLE_NATIVE_SCHEMAS[roleName];
  if (!schema) return { valid: false, issues: [`No schema defined for role "${roleName}"`] };

  const issues = [];

  if (!output) return { valid: false, issues: ["Output is null"] };

  for (const [fieldName, spec] of Object.entries(schema.fields)) {
    const value = output[fieldName];

    if (spec.required && (value === undefined || value === null)) {
      issues.push(`${fieldName} is required`);
      continue;
    }

    if (value === undefined) continue;

    if (spec.type === "array") {
      if (!Array.isArray(value)) {
        issues.push(`${fieldName} must be an array`);
        continue;
      }
      if (spec.minItems && value.length < spec.minItems) {
        issues.push(`${fieldName} must have at least ${spec.minItems} items (got ${value.length})`);
      }
      // Validate item shape for object items
      if (typeof spec.items === "object" && !Array.isArray(spec.items)) {
        for (let i = 0; i < value.length; i++) {
          // Guard malformed (null / non-object) items — the validator must
          // report bad LLM output, not crash on it.
          if (value[i] === null || typeof value[i] !== "object" || Array.isArray(value[i])) {
            issues.push(`${fieldName}[${i}] must be an object`);
            continue;
          }
          for (const [itemField, itemType] of Object.entries(spec.items)) {
            if (value[i][itemField] === undefined) {
              issues.push(`${fieldName}[${i}].${itemField} is required`);
            }
          }
        }
      }
    } else if (spec.type === "string") {
      if (typeof value !== "string" || value.trim().length === 0) {
        issues.push(`${fieldName} must be a non-empty string`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Cross-examination schemas ───────────────────────────────────────────────

const VALID_CHALLENGE_TYPES = [
  "out_of_scope",
  "unsupported",
  "premature",
  "mechanically_blocked",
  "market_invisible",
  "user_misaligned",
];

const VALID_REBUTTAL_RESPONSES = ["defend", "narrow", "retract", "unresolved"];

/**
 * Validate a ChallengeEdge.
 */
export function validateChallengeEdge(edge) {
  const issues = [];
  if (!edge.target_claim_id) issues.push("target_claim_id is required");
  if (!edge.challenger_role) issues.push("challenger_role is required");
  if (!edge.reason) issues.push("reason is required");
  if (!VALID_CHALLENGE_TYPES.includes(edge.challenge_type)) {
    issues.push(`challenge_type must be one of: ${VALID_CHALLENGE_TYPES.join(", ")}`);
  }
  return { valid: issues.length === 0, issues };
}

/**
 * Validate a RebuttalEdge.
 */
export function validateRebuttalEdge(edge) {
  const issues = [];
  if (!edge.target_claim_id) issues.push("target_claim_id is required");
  if (!edge.source_role) issues.push("source_role is required");
  if (!VALID_REBUTTAL_RESPONSES.includes(edge.response)) {
    issues.push(`response must be one of: ${VALID_REBUTTAL_RESPONSES.join(", ")}`);
  }
  if (!edge.note) issues.push("note is required");
  return { valid: issues.length === 0, issues };
}

/**
 * Cross-examination permission matrix.
 * Each role can only challenge claims from specific other roles.
 * This prevents all-vs-all noise and enforces structured debate.
 */
export const CROSS_EXAM_PERMISSIONS = {
  "Context Analyst": {
    can_challenge: ["Positioning Analyst"],  // Can challenge category framing
    cannot_challenge: ["User Value Analyst", "Mechanics Analyst", "Contrarian Analyst"],
  },
  "User Value Analyst": {
    can_challenge: ["Context Analyst"],  // Can challenge category claims that overstate importance vs felt need
    cannot_challenge: ["Mechanics Analyst", "Positioning Analyst", "Contrarian Analyst"],
  },
  "Mechanics Analyst": {
    can_challenge: ["User Value Analyst", "Positioning Analyst"],  // Can challenge claims assuming impossible behavior
    cannot_challenge: ["Context Analyst", "Contrarian Analyst"],
  },
  "Positioning Analyst": {
    can_challenge: ["Mechanics Analyst"],  // Can challenge claims that are true but not market-visible
    cannot_challenge: ["Context Analyst", "User Value Analyst", "Contrarian Analyst"],
  },
  "Contrarian Analyst": {
    can_challenge: ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst"],  // Can challenge any, but only by ID with grounds
    cannot_challenge: [],
  },
};

/**
 * Check if a challenger is permitted to challenge a target role's claims.
 *
 * @param {string} challengerRole
 * @param {string} targetRole
 * @returns {boolean}
 */
export function canChallenge(challengerRole, targetRole) {
  const perms = CROSS_EXAM_PERMISSIONS[challengerRole];
  if (!perms) return false;
  return perms.can_challenge.includes(targetRole);
}

// ── Analyst role definitions (for role catalog integration) ─────────────────

export const ANALYST_ROLES = [
  {
    name: "Context Analyst",
    question: "What is this, what is it next to, and what is it not?",
    method: "terminology genealogy, adjacency map, category boundary map",
    output_type: "ContextMap",
  },
  {
    name: "User Value Analyst",
    question: "Where is the felt pull or pain?",
    method: "jobs-to-be-done, pain/relief map, willingness/avoidance signals",
    output_type: "UserValueMap",
  },
  {
    name: "Mechanics Analyst",
    question: "What has to be true for this to work?",
    method: "loop decomposition, dependency chain, failure-mode analysis",
    output_type: "MechanicsMap",
  },
  {
    name: "Positioning Analyst",
    question: "What claim could this own, and when is it legal to make it?",
    method: "substitute comparison, wedge identification, claim timing analysis",
    output_type: "PositioningMap",
  },
  {
    name: "Contrarian Analyst",
    question: "Which specific claims are overstated, premature, or structurally false?",
    method: "targeted challenge only, claim-by-claim attack, contradiction exposure",
    output_type: "ChallengeSet",
  },
];

// ── Provenance-preserving atom translation ──────────────────────────────────

/**
 * Claim kinds per role-native artifact type.
 * When Normalize translates a role-native output into atoms,
 * each atom carries these so cross-examine knows what's legal to challenge.
 */
const ARTIFACT_CLAIM_KINDS = {
  ContextMap: ["definition", "category", "lineage", "boundary", "adjacency"],
  UserValueMap: ["need", "desire", "friction", "willingness", "avoidance"],
  MechanicsMap: ["mechanism", "dependency", "constraint", "failure_mode", "loop"],
  PositioningMap: ["positioning", "wedge", "substitute", "timing", "category_frame"],
  ChallengeSet: ["challenge", "contradiction", "overstatement", "gap"],
};

/**
 * Translate a role-native output into provenance-preserving claim atoms.
 * Each atom carries: source_role, source_artifact_type, claim_kind, allowed_challengers.
 *
 * Normalize must NOT flatten these fields. They are the identity of the claim.
 *
 * @param {string} roleName
 * @param {object} roleOutput - The role-native output object
 * @returns {Array<{id: string, text: string, claim_kind: string, source_role: string, source_artifact_type: string, allowed_challengers: string[]}>}
 */
export function translateToAtoms(roleName, roleOutput) {
  const role = ANALYST_ROLES.find(r => r.name === roleName);
  if (!role) return [];

  const artifactType = role.output_type;
  const allowedKinds = ARTIFACT_CLAIM_KINDS[artifactType] || [];

  // Determine who can challenge this role's claims
  const allowed_challengers = [];
  for (const [challenger, perms] of Object.entries(CROSS_EXAM_PERMISSIONS)) {
    if (perms.can_challenge.includes(roleName)) {
      allowed_challengers.push(challenger);
    }
  }

  const atoms = [];
  let seq = 0;

  switch (artifactType) {
    case "ContextMap": {
      // Terms → definition atoms
      if (roleOutput.terms) {
        for (const t of roleOutput.terms) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `${t.term}: ${t.meaning} (adjacent to: ${(t.adjacent_to || []).join(", ")})`,
            claim_kind: "definition",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Category map → category atoms
      if (roleOutput.category_map) {
        for (const c of roleOutput.category_map) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `Category "${c.category}": ${(c.examples || []).join(", ")}`,
            claim_kind: "category",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Lineage claims
      if (roleOutput.lineage_claims) {
        for (const l of roleOutput.lineage_claims) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `${l.claim} (precedent: ${(l.precedent || []).join(", ")})`,
            claim_kind: "lineage",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Boundary claims
      if (roleOutput.boundary_claims) {
        for (const b of roleOutput.boundary_claims) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: b,
            claim_kind: "boundary",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      break;
    }

    case "UserValueMap": {
      // Jobs → need atoms
      if (roleOutput.jobs) {
        for (const j of roleOutput.jobs) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `When ${j.actor} is ${j.situation}, they want ${j.desired_outcome}`,
            claim_kind: "need",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Frictions → friction atoms
      if (roleOutput.frictions) {
        for (const f of roleOutput.frictions) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `Friction (${f.severity}): ${f.friction}`,
            claim_kind: "friction",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Unmet desires
      if (roleOutput.unmet_desires) {
        for (const d of roleOutput.unmet_desires) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: d,
            claim_kind: "desire",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Willingness signals
      if (roleOutput.willingness_signals) {
        for (const w of roleOutput.willingness_signals) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: w,
            claim_kind: "willingness",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      break;
    }

    case "MechanicsMap": {
      // Loops → loop atoms
      if (roleOutput.loops) {
        for (const l of roleOutput.loops) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `Loop "${l.name}": ${(l.input || []).join(", ")} → ${(l.transform || []).join(", ")} → ${(l.output || []).join(", ")}`,
            claim_kind: "loop",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Dependencies
      if (roleOutput.dependencies) {
        for (const d of roleOutput.dependencies) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `${d.component} depends on: ${(d.depends_on || []).join(", ")}`,
            claim_kind: "dependency",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Failure points
      if (roleOutput.failure_points) {
        for (const f of roleOutput.failure_points) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: f,
            claim_kind: "failure_mode",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Irreducible mechanisms
      if (roleOutput.irreducible_mechanisms) {
        for (const m of roleOutput.irreducible_mechanisms) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: m,
            claim_kind: "mechanism",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      break;
    }

    case "PositioningMap": {
      // Substitutes
      if (roleOutput.substitutes) {
        for (const s of roleOutput.substitutes) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `Substitute "${s.name}": overlaps on ${s.overlap}, gap at ${s.gap}`,
            claim_kind: "substitute",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Wedge candidates
      if (roleOutput.wedge_candidates) {
        for (const w of roleOutput.wedge_candidates) {
          atoms.push({
            id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
            text: `Wedge: "${w.claim}" — timing: ${w.timing}, risk: ${w.risk}`,
            claim_kind: "wedge",
            source_role: roleName,
            source_artifact_type: artifactType,
            allowed_challengers,
          });
        }
      }
      // Category frame
      if (roleOutput.category_frame) {
        atoms.push({
          id: `atom-${roleName.toLowerCase().replace(/\s+/g, "-")}-${++seq}`,
          text: roleOutput.category_frame,
          claim_kind: "category_frame",
          source_role: roleName,
          source_artifact_type: artifactType,
          allowed_challengers,
        });
      }
      break;
    }

    case "ChallengeSet": {
      // Challenges are NOT translated into atoms — they become ChallengeEdges
      // in the cross-examine phase. Contrarian output feeds cross-exam directly.
      break;
    }
  }

  return atoms;
}

/**
 * Map from specific claim_kind (atom layer) to broad statement kind (scout layer).
 * This bridges the two naming conventions:
 *   - Scout findings use `.kind` ∈ {"claim", "opportunity", "risk", "tension", "unknown"}
 *   - Translated atoms use `.claim_kind` with specific types per role
 */
export const CLAIM_KIND_TO_STATEMENT_KIND = {
  // Context Analyst → claim
  definition: "claim", category: "claim", lineage: "claim", boundary: "claim",
  // User Value Analyst → opportunity or claim
  need: "opportunity", desire: "opportunity", friction: "risk", willingness: "claim",
  // Mechanics Analyst → claim or risk
  loop: "claim", dependency: "claim", failure_mode: "risk", mechanism: "claim",
  // Positioning Analyst → opportunity
  substitute: "tension", wedge: "opportunity", category_frame: "claim",
  positioning: "claim", timing: "opportunity",
  // Contrarian Analyst → tension
  challenge: "tension", contradiction: "tension", overstatement: "tension", gap: "risk",
  // Normalizer
  adjacency: "claim", avoidance: "risk", constraint: "claim",
};

/**
 * Normalize an atom to include both `.claim_kind` (specific) and `.kind` (broad).
 * Ensures atoms are compatible with both the scout validation layer and
 * the cross-examination layer.
 *
 * @param {object} atom - Atom with claim_kind
 * @returns {object} Atom with both claim_kind and kind fields
 */
export function normalizeAtomKind(atom) {
  if (atom.kind && !atom.claim_kind) {
    return { ...atom, claim_kind: atom.kind };
  }
  if (atom.claim_kind && !atom.kind) {
    return { ...atom, kind: CLAIM_KIND_TO_STATEMENT_KIND[atom.claim_kind] || "unknown" };
  }
  return atom;
}

/**
 * Validate that a translated atom preserves all required provenance fields.
 *
 * @param {object} atom
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateAtomProvenance(atom) {
  const issues = [];
  if (!atom.id) issues.push("id is required");
  if (!atom.text) issues.push("text is required");
  if (!atom.claim_kind) issues.push("claim_kind is required");
  if (!atom.source_role) issues.push("source_role is required");
  if (!atom.source_artifact_type) issues.push("source_artifact_type is required");
  if (!Array.isArray(atom.allowed_challengers)) issues.push("allowed_challengers must be an array");
  return { valid: issues.length === 0, issues };
}

/**
 * Filter challenge edges to only those permitted by the cross-exam matrix.
 *
 * @param {Array} challenges - ChallengeEdge candidates
 * @param {Array} atoms - Translated atoms with source_role
 * @returns {{ permitted: Array, rejected: Array<{challenge: object, reason: string}> }}
 */
export function filterChallenges(challenges, atoms) {
  const atomMap = new Map(atoms.map(a => [a.id, a]));
  const permitted = [];
  const rejected = [];

  for (const c of challenges) {
    const targetAtom = atomMap.get(c.target_claim_id);
    if (!targetAtom) {
      rejected.push({ challenge: c, reason: `Target atom "${c.target_claim_id}" not found` });
      continue;
    }
    if (!canChallenge(c.challenger_role, targetAtom.source_role)) {
      rejected.push({
        challenge: c,
        reason: `${c.challenger_role} is not permitted to challenge ${targetAtom.source_role} claims`,
      });
      continue;
    }
    permitted.push(c);
  }

  return { permitted, rejected };
}

export { ARTIFACT_CLAIM_KINDS };

// ── Updated pipeline definition ─────────────────────────────────────────────

export const BRAINSTORM_V03_PIPELINE = [
  "frame",
  "analyze",        // Role-native outputs (replaces "scout")
  "normalize",      // Translate role-native → shared atoms
  "cross_examine",  // Targeted challenges between roles
  "rebut",          // Original roles defend/narrow/retract
  "synthesize",     // Now has real dispute graph, not parallel notes
  "expand",
  "judge",
  "return",
];

// ── Exports ─────────────────────────────────────────────────────────────────

export {
  VALID_CHALLENGE_TYPES,
  VALID_REBUTTAL_RESPONSES,
};
