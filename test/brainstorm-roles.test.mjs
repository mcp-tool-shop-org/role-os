import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_NATIVE_SCHEMAS,
  INPUT_PARTITIONS,
  ROLE_BLINDSPOTS,
  CROSS_EXAM_PERMISSIONS,
  ANALYST_ROLES,
  BRAINSTORM_V03_PIPELINE,
  partitionBrief,
  validateRoleBoundary,
  validateClaimKinds,
  validateRoleNativeOutput,
  validateChallengeEdge,
  validateRebuttalEdge,
  canChallenge,
  VALID_CHALLENGE_TYPES,
  VALID_REBUTTAL_RESPONSES,
  ARTIFACT_CLAIM_KINDS,
  translateToAtoms,
  validateAtomProvenance,
  filterChallenges,
} from "../src/brainstorm-roles.mjs";

// ── Role-native schemas ─────────────────────────────────────────────────────

describe("Role-native schemas", () => {
  it("defines schemas for all 5 analyst roles", () => {
    const roles = ["Context Analyst", "User Value Analyst", "Mechanics Analyst", "Positioning Analyst", "Contrarian Analyst"];
    for (const r of roles) {
      assert.ok(ROLE_NATIVE_SCHEMAS[r], `Missing schema for ${r}`);
      assert.ok(ROLE_NATIVE_SCHEMAS[r].fields, `${r} schema has no fields`);
    }
  });

  it("Context Analyst schema has terms, category_map, lineage_claims, boundary_claims", () => {
    const s = ROLE_NATIVE_SCHEMAS["Context Analyst"];
    assert.ok(s.fields.terms);
    assert.ok(s.fields.category_map);
    assert.ok(s.fields.lineage_claims);
    assert.ok(s.fields.boundary_claims);
  });

  it("User Value Analyst schema has jobs, frictions, unmet_desires, willingness_signals", () => {
    const s = ROLE_NATIVE_SCHEMAS["User Value Analyst"];
    assert.ok(s.fields.jobs);
    assert.ok(s.fields.frictions);
    assert.ok(s.fields.unmet_desires);
    assert.ok(s.fields.willingness_signals);
  });

  it("Mechanics Analyst schema has loops, dependencies, failure_points, irreducible_mechanisms", () => {
    const s = ROLE_NATIVE_SCHEMAS["Mechanics Analyst"];
    assert.ok(s.fields.loops);
    assert.ok(s.fields.dependencies);
    assert.ok(s.fields.failure_points);
    assert.ok(s.fields.irreducible_mechanisms);
  });

  it("Positioning Analyst schema has substitutes, wedge_candidates, category_frame", () => {
    const s = ROLE_NATIVE_SCHEMAS["Positioning Analyst"];
    assert.ok(s.fields.substitutes);
    assert.ok(s.fields.wedge_candidates);
    assert.ok(s.fields.category_frame);
  });

  it("Contrarian Analyst schema has challenges array", () => {
    const s = ROLE_NATIVE_SCHEMAS["Contrarian Analyst"];
    assert.ok(s.fields.challenges);
  });
});

// ── Input partitioning ──────────────────────────────────────────────────────

describe("Input partitioning", () => {
  const fullBrief = {
    topic: "test topic",
    objective: "test objective",
    audience: "test audience",
    constraints: ["c1"],
    search_axes: ["ax1"],
    novelty_bias: "high",
    evidence_mode: "mixed",
  };

  it("defines partitions for all 5 roles", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(INPUT_PARTITIONS[role.name], `Missing partition for ${role.name}`);
    }
  });

  it("Context Analyst sees topic, constraints, search_axes — NOT audience or novelty_bias", () => {
    const filtered = partitionBrief(fullBrief, "Context Analyst");
    assert.ok(filtered.topic);
    assert.ok(filtered.constraints);
    assert.ok(filtered.search_axes);
    assert.equal(filtered.audience, undefined, "Context Analyst should not see audience");
    assert.equal(filtered.novelty_bias, undefined, "Context Analyst should not see novelty_bias");
  });

  it("User Value Analyst sees topic, objective, audience, constraints — NOT search_axes", () => {
    const filtered = partitionBrief(fullBrief, "User Value Analyst");
    assert.ok(filtered.topic);
    assert.ok(filtered.objective);
    assert.ok(filtered.audience);
    assert.ok(filtered.constraints);
    assert.equal(filtered.search_axes, undefined);
  });

  it("Mechanics Analyst sees topic, objective, constraints — NOT audience or novelty_bias", () => {
    const filtered = partitionBrief(fullBrief, "Mechanics Analyst");
    assert.ok(filtered.topic);
    assert.ok(filtered.objective);
    assert.ok(filtered.constraints);
    assert.equal(filtered.audience, undefined);
    assert.equal(filtered.novelty_bias, undefined);
  });

  it("Contrarian Analyst sees NOTHING from the brief", () => {
    const filtered = partitionBrief(fullBrief, "Contrarian Analyst");
    assert.equal(Object.keys(filtered).length, 0, "Contrarian should see no brief fields");
  });

  it("unknown role gets minimal brief (topic only)", () => {
    const filtered = partitionBrief(fullBrief, "Unknown Role");
    assert.equal(filtered.topic, fullBrief.topic);
    assert.equal(filtered.audience, undefined, "Unknown role should not see audience");
    assert.equal(Object.keys(filtered).length, 1, "Unknown role should only see topic");
  });
});

// ── Blindspot enforcement ───────────────────────────────────────────────────

describe("Blindspot validators", () => {
  it("Context Analyst rejects 'users want' phrases", () => {
    const result = validateRoleBoundary("Context Analyst", "Based on the landscape, users want a simpler tool.");
    assert.ok(!result.valid);
    assert.ok(result.violations.some(v => v.detail.includes("users want")));
  });

  it("Context Analyst rejects 'should build' phrases", () => {
    const result = validateRoleBoundary("Context Analyst", "The team should build a registry first.");
    assert.ok(!result.valid);
  });

  it("Context Analyst rejects 'market opportunity' phrases", () => {
    const result = validateRoleBoundary("Context Analyst", "There is a significant market opportunity here.");
    assert.ok(!result.valid);
  });

  it("Context Analyst passes clean output", () => {
    const result = validateRoleBoundary("Context Analyst",
      "The term 'MCP server' is adjacent to 'plugin' and 'extension' in the ecosystem vocabulary. " +
      "The category boundary sits between package registries and runtime environments."
    );
    assert.ok(result.valid);
  });

  it("User Value Analyst rejects architecture language", () => {
    const result = validateRoleBoundary("User Value Analyst", "The system requires a database for persistence.");
    assert.ok(!result.valid);
  });

  it("User Value Analyst rejects competitor ranking", () => {
    const result = validateRoleBoundary("User Value Analyst", "Competitor ranks higher on this metric.");
    assert.ok(!result.valid);
  });

  it("User Value Analyst passes clean output", () => {
    const result = validateRoleBoundary("User Value Analyst",
      "Developers experience significant friction when evaluating trust signals. " +
      "The desire for quick time-to-value drives adoption decisions."
    );
    assert.ok(result.valid);
  });

  it("Mechanics Analyst rejects emotional language", () => {
    const result = validateRoleBoundary("Mechanics Analyst", "Users feel frustrated with the current approach.");
    assert.ok(!result.valid);
  });

  it("Mechanics Analyst rejects positioning language", () => {
    const result = validateRoleBoundary("Mechanics Analyst", "The go-to-market strategy should focus on developers.");
    assert.ok(!result.valid);
  });

  it("Mechanics Analyst passes clean output", () => {
    const result = validateRoleBoundary("Mechanics Analyst",
      "The core loop requires an input validation step before the transform phase. " +
      "A failure at the persistence layer cascades to all downstream components."
    );
    assert.ok(result.valid);
  });

  it("Positioning Analyst rejects implementation language", () => {
    const result = validateRoleBoundary("Positioning Analyst", "We should implement using SQLite for the database.");
    assert.ok(!result.valid);
  });

  it("Contrarian Analyst rejects original recommendations", () => {
    const result = validateRoleBoundary("Contrarian Analyst", "I suggest we take a different approach and build a registry.");
    assert.ok(!result.valid);
  });

  it("Contrarian Analyst passes targeted challenges", () => {
    const result = validateRoleBoundary("Contrarian Analyst",
      "Claim fa-003 overstates the severity of the attack surface. " +
      "The evidence cited does not support the confidence level assigned."
    );
    assert.ok(result.valid);
  });

  it("unknown role passes everything (no blindspot defined)", () => {
    const result = validateRoleBoundary("Unknown Role", "Users want to build a market opportunity database.");
    assert.ok(result.valid);
  });
});

// ── Claim kind validation ───────────────────────────────────────────────────

describe("Claim kind validation", () => {
  it("Context Analyst can emit definition, category, lineage claims", () => {
    const claims = [
      { kind: "definition" }, { kind: "category" }, { kind: "lineage" },
    ];
    assert.ok(validateClaimKinds("Context Analyst", claims).valid);
  });

  it("Context Analyst cannot emit need or desire claims", () => {
    const claims = [{ kind: "need" }, { kind: "desire" }];
    const result = validateClaimKinds("Context Analyst", claims);
    assert.ok(!result.valid);
    assert.equal(result.violations.length, 2);
  });

  it("User Value Analyst can emit need, desire, friction claims", () => {
    const claims = [
      { kind: "need" }, { kind: "desire" }, { kind: "friction" },
    ];
    assert.ok(validateClaimKinds("User Value Analyst", claims).valid);
  });

  it("User Value Analyst cannot emit mechanism or positioning claims", () => {
    const claims = [{ kind: "mechanism" }, { kind: "positioning" }];
    const result = validateClaimKinds("User Value Analyst", claims);
    assert.ok(!result.valid);
  });

  it("Mechanics Analyst can emit mechanism, dependency, constraint claims", () => {
    const claims = [
      { kind: "mechanism" }, { kind: "dependency" }, { kind: "constraint" },
    ];
    assert.ok(validateClaimKinds("Mechanics Analyst", claims).valid);
  });

  it("Contrarian Analyst can only emit challenge, contradiction, overstatement, gap", () => {
    const valid = [{ kind: "challenge" }, { kind: "contradiction" }, { kind: "gap" }];
    assert.ok(validateClaimKinds("Contrarian Analyst", valid).valid);

    const invalid = [{ kind: "need" }, { kind: "mechanism" }];
    assert.ok(!validateClaimKinds("Contrarian Analyst", invalid).valid);
  });
});

// ── Role-native output validation ───────────────────────────────────────────

describe("validateRoleNativeOutput", () => {
  it("validates a valid ContextMap", () => {
    const output = {
      terms: [{ term: "MCP", meaning: "Model Context Protocol", adjacent_to: ["plugin", "extension"] }],
      category_map: [{ category: "runtime", examples: ["Node", "Python"] }, { category: "transport", examples: ["stdio", "SSE"] }],
      lineage_claims: [{ claim: "MCP descends from LSP", precedent: ["LSP spec"] }],
      boundary_claims: ["MCP servers are not plugins"],
    };
    // Need at least 3 terms
    const result = validateRoleNativeOutput("Context Analyst", output);
    assert.ok(!result.valid); // Only 1 term, needs 3
  });

  it("validates a valid UserValueMap", () => {
    const output = {
      jobs: [
        { actor: "dev", situation: "evaluating tool", desired_outcome: "trust in 60s" },
        { actor: "lead", situation: "onboarding team", desired_outcome: "low handoff friction" },
      ],
      frictions: [
        { friction: "20min setup tax", severity: "high" },
        { friction: "no trust signals", severity: "medium" },
      ],
      unmet_desires: ["quick auditable trust signal"],
      willingness_signals: ["will install if README is specific"],
    };
    const result = validateRoleNativeOutput("User Value Analyst", output);
    assert.ok(result.valid, result.issues.join("; "));
  });

  it("validates a valid MechanicsMap", () => {
    const output = {
      loops: [{ name: "install loop", input: ["manifest"], transform: ["validate", "resolve"], output: ["installed server"] }],
      dependencies: [{ component: "validator", depends_on: ["schema", "sqlite-vec"] }],
      failure_points: ["embedding model unavailable"],
      irreducible_mechanisms: ["schema validation must precede install"],
    };
    const result = validateRoleNativeOutput("Mechanics Analyst", output);
    assert.ok(result.valid, result.issues.join("; "));
  });

  it("rejects null output", () => {
    assert.ok(!validateRoleNativeOutput("Context Analyst", null).valid);
  });

  it("rejects unknown role", () => {
    assert.ok(!validateRoleNativeOutput("Unknown", {}).valid);
  });

  it("rejects missing required fields", () => {
    const result = validateRoleNativeOutput("User Value Analyst", { jobs: [] });
    assert.ok(!result.valid);
    assert.ok(result.issues.length >= 3); // frictions, unmet_desires, willingness_signals missing
  });
});

// ── Cross-examination ───────────────────────────────────────────────────────

describe("Cross-examination", () => {
  it("defines permissions for all 5 roles", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(CROSS_EXAM_PERMISSIONS[role.name], `Missing permissions for ${role.name}`);
    }
  });

  it("Contrarian can challenge all 4 other roles", () => {
    assert.equal(CROSS_EXAM_PERMISSIONS["Contrarian Analyst"].can_challenge.length, 4);
    assert.ok(canChallenge("Contrarian Analyst", "Context Analyst"));
    assert.ok(canChallenge("Contrarian Analyst", "User Value Analyst"));
    assert.ok(canChallenge("Contrarian Analyst", "Mechanics Analyst"));
    assert.ok(canChallenge("Contrarian Analyst", "Positioning Analyst"));
  });

  it("nobody can challenge Contrarian", () => {
    for (const role of ANALYST_ROLES) {
      if (role.name !== "Contrarian Analyst") {
        assert.ok(!canChallenge(role.name, "Contrarian Analyst"), `${role.name} should not challenge Contrarian`);
      }
    }
  });

  it("User Value can challenge Context but not Mechanics", () => {
    assert.ok(canChallenge("User Value Analyst", "Context Analyst"));
    assert.ok(!canChallenge("User Value Analyst", "Mechanics Analyst"));
  });

  it("Mechanics can challenge User Value and Positioning", () => {
    assert.ok(canChallenge("Mechanics Analyst", "User Value Analyst"));
    assert.ok(canChallenge("Mechanics Analyst", "Positioning Analyst"));
    assert.ok(!canChallenge("Mechanics Analyst", "Context Analyst"));
  });

  it("Positioning can challenge Mechanics but not Context", () => {
    assert.ok(canChallenge("Positioning Analyst", "Mechanics Analyst"));
    assert.ok(!canChallenge("Positioning Analyst", "Context Analyst"));
  });

  it("Context can challenge Positioning but not User Value", () => {
    assert.ok(canChallenge("Context Analyst", "Positioning Analyst"));
    assert.ok(!canChallenge("Context Analyst", "User Value Analyst"));
  });
});

describe("ChallengeEdge validation", () => {
  it("accepts valid challenge", () => {
    const result = validateChallengeEdge({
      target_claim_id: "fa-001",
      challenger_role: "Contrarian Analyst",
      reason: "Overstates market size without evidence",
      challenge_type: "unsupported",
    });
    assert.ok(result.valid);
  });

  it("rejects missing fields", () => {
    const result = validateChallengeEdge({});
    assert.ok(!result.valid);
    assert.ok(result.issues.length >= 3);
  });

  it("rejects invalid challenge type", () => {
    const result = validateChallengeEdge({
      target_claim_id: "fa-001",
      challenger_role: "Contrarian Analyst",
      reason: "test",
      challenge_type: "bad_vibes",
    });
    assert.ok(!result.valid);
  });

  it("accepts all valid challenge types", () => {
    for (const ct of VALID_CHALLENGE_TYPES) {
      const result = validateChallengeEdge({
        target_claim_id: "fa-001",
        challenger_role: "Contrarian Analyst",
        reason: "test",
        challenge_type: ct,
      });
      assert.ok(result.valid, `${ct} should be valid`);
    }
  });
});

describe("RebuttalEdge validation", () => {
  it("accepts valid rebuttal", () => {
    const result = validateRebuttalEdge({
      target_claim_id: "fa-001",
      source_role: "Context Analyst",
      response: "narrow",
      note: "Narrowing claim to apply only to npm ecosystem",
    });
    assert.ok(result.valid);
  });

  it("rejects invalid response", () => {
    const result = validateRebuttalEdge({
      target_claim_id: "fa-001",
      source_role: "Context Analyst",
      response: "ignore",
      note: "test",
    });
    assert.ok(!result.valid);
  });

  it("accepts all valid responses", () => {
    for (const r of VALID_REBUTTAL_RESPONSES) {
      const result = validateRebuttalEdge({
        target_claim_id: "fa-001",
        source_role: "Context Analyst",
        response: r,
        note: "test",
      });
      assert.ok(result.valid, `${r} should be valid`);
    }
  });
});

// ── Pipeline definition ─────────────────────────────────────────────────────

describe("v0.3 pipeline", () => {
  it("has 9 stages", () => {
    assert.equal(BRAINSTORM_V03_PIPELINE.length, 9);
  });

  it("includes cross_examine and rebut between normalize and synthesize", () => {
    const normalizeIdx = BRAINSTORM_V03_PIPELINE.indexOf("normalize");
    const crossExamIdx = BRAINSTORM_V03_PIPELINE.indexOf("cross_examine");
    const rebutIdx = BRAINSTORM_V03_PIPELINE.indexOf("rebut");
    const synthesizeIdx = BRAINSTORM_V03_PIPELINE.indexOf("synthesize");

    assert.ok(normalizeIdx < crossExamIdx, "cross_examine must come after normalize");
    assert.ok(crossExamIdx < rebutIdx, "rebut must come after cross_examine");
    assert.ok(rebutIdx < synthesizeIdx, "synthesize must come after rebut");
  });

  it("replaces scout with analyze", () => {
    assert.ok(!BRAINSTORM_V03_PIPELINE.includes("scout"), "scout should be replaced by analyze");
    assert.ok(BRAINSTORM_V03_PIPELINE.includes("analyze"));
  });
});

// ── Analyst role definitions ────────────────────────────────────────────────

describe("Analyst roles", () => {
  it("defines 5 analyst roles", () => {
    assert.equal(ANALYST_ROLES.length, 5);
  });

  it("every role has name, question, method, output_type", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(role.name, "missing name");
      assert.ok(role.question, `${role.name} missing question`);
      assert.ok(role.method, `${role.name} missing method`);
      assert.ok(role.output_type, `${role.name} missing output_type`);
    }
  });

  it("every role has a corresponding schema", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(ROLE_NATIVE_SCHEMAS[role.name], `${role.name} has no schema`);
    }
  });

  it("every role has an input partition", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(INPUT_PARTITIONS[role.name], `${role.name} has no input partition`);
    }
  });

  it("every role has blindspot enforcement", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(ROLE_BLINDSPOTS[role.name], `${role.name} has no blindspot definition`);
    }
  });

  it("every role has cross-exam permissions", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(CROSS_EXAM_PERMISSIONS[role.name], `${role.name} has no cross-exam permissions`);
    }
  });

  it("every role's output_type has defined claim kinds", () => {
    for (const role of ANALYST_ROLES) {
      assert.ok(ARTIFACT_CLAIM_KINDS[role.output_type], `${role.output_type} has no claim kinds`);
      assert.ok(ARTIFACT_CLAIM_KINDS[role.output_type].length > 0);
    }
  });
});

// ── Atom translation with provenance ────────────────────────────────────────

describe("translateToAtoms", () => {
  it("translates ContextMap into atoms with provenance", () => {
    const output = {
      terms: [
        { term: "MCP", meaning: "Model Context Protocol", adjacent_to: ["LSP", "plugin"] },
        { term: "server", meaning: "installable unit", adjacent_to: ["extension"] },
        { term: "host", meaning: "client application", adjacent_to: ["IDE"] },
      ],
      category_map: [
        { category: "runtime", examples: ["Node", "Python"] },
        { category: "transport", examples: ["stdio", "SSE"] },
      ],
      lineage_claims: [{ claim: "MCP descends from LSP", precedent: ["LSP spec"] }],
      boundary_claims: ["MCP servers are not browser extensions"],
    };
    const atoms = translateToAtoms("Context Analyst", output);
    assert.ok(atoms.length >= 7, `Expected >= 7 atoms, got ${atoms.length}`);

    // Every atom has full provenance
    for (const a of atoms) {
      const prov = validateAtomProvenance(a);
      assert.ok(prov.valid, `Atom ${a.id}: ${prov.issues.join("; ")}`);
      assert.equal(a.source_role, "Context Analyst");
      assert.equal(a.source_artifact_type, "ContextMap");
      assert.ok(Array.isArray(a.allowed_challengers));
    }

    // Claim kinds should all be context-legal
    const contextKinds = ARTIFACT_CLAIM_KINDS.ContextMap;
    for (const a of atoms) {
      assert.ok(contextKinds.includes(a.claim_kind), `Unexpected claim kind: ${a.claim_kind}`);
    }
  });

  it("translates UserValueMap into atoms with provenance", () => {
    const output = {
      jobs: [{ actor: "dev", situation: "evaluating tool", desired_outcome: "trust in 60s" }],
      frictions: [{ friction: "20min setup tax", severity: "high" }],
      unmet_desires: ["quick trust signal"],
      willingness_signals: ["will install if README is specific"],
    };
    const atoms = translateToAtoms("User Value Analyst", output);
    assert.ok(atoms.length >= 4);
    for (const a of atoms) {
      assert.equal(a.source_role, "User Value Analyst");
      assert.equal(a.source_artifact_type, "UserValueMap");
    }
  });

  it("translates MechanicsMap into atoms with provenance", () => {
    const output = {
      loops: [{ name: "install", input: ["manifest"], transform: ["validate"], output: ["installed"] }],
      dependencies: [{ component: "validator", depends_on: ["schema"] }],
      failure_points: ["embedding model unavailable"],
      irreducible_mechanisms: ["schema validation before install"],
    };
    const atoms = translateToAtoms("Mechanics Analyst", output);
    assert.ok(atoms.length >= 4);
    for (const a of atoms) {
      assert.equal(a.source_role, "Mechanics Analyst");
    }
  });

  it("translates PositioningMap into atoms", () => {
    const output = {
      substitutes: [{ name: "SaaS X", overlap: "same task", gap: "no offline mode" }],
      wedge_candidates: [{ claim: "runs locally", timing: "now", risk: "low" }],
      category_frame: "infrastructure sovereignty, not developer tools",
    };
    const atoms = translateToAtoms("Positioning Analyst", output);
    assert.ok(atoms.length >= 3);
    for (const a of atoms) {
      assert.equal(a.source_role, "Positioning Analyst");
    }
  });

  it("ChallengeSet produces zero atoms (challenges are edges, not atoms)", () => {
    const output = {
      challenges: [{ target_claim_id: "fa-001", source_role: "Context Analyst", challenge_type: "unsupported", argument: "test" }],
    };
    const atoms = translateToAtoms("Contrarian Analyst", output);
    assert.equal(atoms.length, 0, "Challenges should not become atoms");
  });

  it("atoms carry allowed_challengers from cross-exam permissions", () => {
    const output = {
      terms: [
        { term: "A", meaning: "B", adjacent_to: [] },
        { term: "C", meaning: "D", adjacent_to: [] },
        { term: "E", meaning: "F", adjacent_to: [] },
      ],
      category_map: [{ category: "X", examples: ["Y"] }, { category: "Z", examples: ["W"] }],
      lineage_claims: [{ claim: "test", precedent: ["p"] }],
      boundary_claims: ["test boundary"],
    };
    const atoms = translateToAtoms("Context Analyst", output);
    // User Value Analyst and Contrarian Analyst can challenge Context Analyst
    for (const a of atoms) {
      assert.ok(a.allowed_challengers.includes("User Value Analyst"));
      assert.ok(a.allowed_challengers.includes("Contrarian Analyst"));
      assert.ok(!a.allowed_challengers.includes("Mechanics Analyst"));
    }
  });

  it("returns empty array for unknown role", () => {
    assert.deepEqual(translateToAtoms("Unknown", {}), []);
  });
});

describe("validateAtomProvenance", () => {
  it("accepts atom with all provenance fields", () => {
    const result = validateAtomProvenance({
      id: "atom-1",
      text: "claim text",
      claim_kind: "definition",
      source_role: "Context Analyst",
      source_artifact_type: "ContextMap",
      allowed_challengers: ["User Value Analyst"],
    });
    assert.ok(result.valid);
  });

  it("rejects atom missing provenance", () => {
    const result = validateAtomProvenance({ id: "atom-1", text: "claim" });
    assert.ok(!result.valid);
    assert.ok(result.issues.length >= 3);
  });
});

// ── Challenge filtering ─────────────────────────────────────────────────────

describe("filterChallenges", () => {
  const atoms = [
    { id: "a1", text: "t", claim_kind: "definition", source_role: "Context Analyst", source_artifact_type: "ContextMap", allowed_challengers: ["User Value Analyst", "Contrarian Analyst"] },
    { id: "a2", text: "t", claim_kind: "need", source_role: "User Value Analyst", source_artifact_type: "UserValueMap", allowed_challengers: ["Mechanics Analyst", "Contrarian Analyst"] },
    { id: "a3", text: "t", claim_kind: "mechanism", source_role: "Mechanics Analyst", source_artifact_type: "MechanicsMap", allowed_challengers: ["Positioning Analyst", "Contrarian Analyst"] },
  ];

  it("permits challenges from allowed roles", () => {
    const challenges = [
      { target_claim_id: "a1", challenger_role: "User Value Analyst", reason: "test", challenge_type: "user_misaligned" },
      { target_claim_id: "a1", challenger_role: "Contrarian Analyst", reason: "test", challenge_type: "unsupported" },
    ];
    const { permitted, rejected } = filterChallenges(challenges, atoms);
    assert.equal(permitted.length, 2);
    assert.equal(rejected.length, 0);
  });

  it("rejects challenges from non-permitted roles", () => {
    const challenges = [
      { target_claim_id: "a1", challenger_role: "Mechanics Analyst", reason: "test", challenge_type: "mechanically_blocked" },
    ];
    const { permitted, rejected } = filterChallenges(challenges, atoms);
    assert.equal(permitted.length, 0);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason.includes("not permitted"));
  });

  it("rejects challenges targeting nonexistent atoms", () => {
    const challenges = [
      { target_claim_id: "a999", challenger_role: "Contrarian Analyst", reason: "test", challenge_type: "unsupported" },
    ];
    const { permitted, rejected } = filterChallenges(challenges, atoms);
    assert.equal(permitted.length, 0);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0].reason.includes("not found"));
  });

  it("Contrarian can challenge any atom", () => {
    const challenges = atoms.map(a => ({
      target_claim_id: a.id,
      challenger_role: "Contrarian Analyst",
      reason: "test",
      challenge_type: "unsupported",
    }));
    const { permitted } = filterChallenges(challenges, atoms);
    assert.equal(permitted.length, 3);
  });

  it("mixed batch: some permitted, some rejected", () => {
    const challenges = [
      { target_claim_id: "a1", challenger_role: "User Value Analyst", reason: "ok", challenge_type: "user_misaligned" },
      { target_claim_id: "a2", challenger_role: "Context Analyst", reason: "bad", challenge_type: "out_of_scope" },
      { target_claim_id: "a3", challenger_role: "Positioning Analyst", reason: "ok", challenge_type: "market_invisible" },
    ];
    const { permitted, rejected } = filterChallenges(challenges, atoms);
    assert.equal(permitted.length, 2);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].challenge.challenger_role, "Context Analyst");
  });
});
