/**
 * Brainstorm Renderers — v0.4
 *
 * Layer 2: Human-legible rendering of structural analyst artifacts.
 * Each renderer converts a dry role-native output into a distinct
 * human register — without contaminating the law layer.
 *
 * Rule: Synthesis consumes structural artifacts, NEVER rendered prose.
 * Rule: Users always have access to BOTH layers. Rendered is opt-in, not a replacement.
 *       Dev users may prefer the raw truth artifacts. Newer users get the rendered view.
 * Renderers exist for human legibility and debate presentation only.
 *
 * Five render formats:
 *   Context    → Boundary Memo (taxonomist)
 *   User Value → Field Notes (ethnographer)
 *   Mechanics  → System Sketch (whiteboard engineer)
 *   Positioning → Claim Brief (strategist)
 *   Contrarian → Cross-Exam Transcript (litigator)
 */

// ── Lexical bans per renderer ───────────────────────────────────────────────

/**
 * Words and phrases each renderer CANNOT use.
 * This is what kills "same senior engineer" voice.
 * Bans target the vocabulary of OTHER roles, preventing voice convergence.
 */
export const RENDERER_LEXICAL_BANS = {
  "Context Analyst": {
    banned: [
      "pain point", "adoption", "resonant", "resonance", "compelling",
      "users want", "users need", "developers prefer", "emotional",
      "friction", "willingness", "desire", "pull",
      "wedge", "positioning", "go-to-market", "competitive advantage",
      "loop", "cascade", "failure mode", "dependency chain",
    ],
    voice: "taxonomist — noun-heavy, classification-first, boundary-obsessed",
  },
  "User Value Analyst": {
    banned: [
      "structural", "surface area", "infrastructure", "substrate",
      "schema", "protocol", "specification", "taxonomy", "ontology",
      "category boundary", "lineage", "genealogy", "precedent class",
      "wedge", "claim timing", "market territory", "competitor",
      "attestation", "cryptographic", "sandbox", "dependency chain",
    ],
    voice: "ethnographer — behavior-first, situation-anchored, comfortable with ambiguity",
  },
  "Mechanics Analyst": {
    banned: [
      "brand", "story", "narrative", "messaging", "pitch",
      "emotional", "resonant", "compelling", "pain point",
      "users want", "users feel", "developers prefer",
      "wedge", "claim", "positioning", "territory", "timing",
      "category", "taxonomy", "lineage", "genealogy",
    ],
    voice: "systems designer at whiteboard — if/then, state transitions, failure cascades",
  },
  "Positioning Analyst": {
    banned: [
      "schema", "table", "database", "endpoint", "API design",
      "dependency chain", "failure mode", "cascade", "loop decomposition",
      "sandbox", "attestation record", "cryptographic binding",
      "taxonomy", "ontology", "genealogy", "precedent class",
      "pain point", "adoption friction", "willingness signal",
    ],
    voice: "strategist in war room — territorial claims, timing, what is legal to say now",
  },
  "Contrarian Analyst": {
    banned: [
      "I suggest", "we should", "a better approach", "consider building",
      "the product could", "my recommendation", "alternatively",
      "opportunity", "upside", "promising", "exciting",
      "users want", "users need", "the market",
    ],
    voice: "litigator — only questions and challenges, burden of proof on the claimant",
  },
};

// ── Render schema definitions ───────────────────────────────────────────────

/**
 * Each renderer produces a role-native document format.
 * These are NOT the structural artifacts (those feed synthesis).
 * These are human-readable presentations for debate transcripts.
 */
export const RENDER_SCHEMAS = {
  "Context Analyst": {
    format: "Boundary Memo",
    sections: [
      { name: "Classification", description: "What this is, stated as category membership" },
      { name: "Adjacent spaces", description: "What this is next to, with boundary precision" },
      { name: "Lineage", description: "Where this came from, stated as descent claims" },
      { name: "Exclusions", description: "What this is NOT, stated as hard boundaries" },
    ],
    style_rules: [
      "Open every section with a noun phrase, not a verb",
      "Use 'is' and 'is not' more than 'should' or 'could'",
      "Name categories before describing them",
      "Never explain why something matters — only what it is",
    ],
  },
  "User Value Analyst": {
    format: "Field Notes",
    sections: [
      { name: "Observed situations", description: "Concrete scenes where the behavior happens" },
      { name: "What they reach for", description: "Actions taken, tools grabbed, workarounds improvised" },
      { name: "What they avoid", description: "Behaviors conspicuously absent, doors not opened" },
      { name: "Signals of readiness", description: "Moments where they would act if something existed" },
    ],
    style_rules: [
      "Write in present tense, observational voice",
      "Anchor every claim in a concrete situation, not an abstraction",
      "Quote imagined developer speech in single quotes: 'is this safe?'",
      "Never name a system component — only name what a person does or feels",
      "Use short sentences. Sentence fragments are fine.",
    ],
  },
  "Mechanics Analyst": {
    format: "System Sketch",
    sections: [
      { name: "Core loops", description: "Named input→transform→output cycles" },
      { name: "Dependency map", description: "What must exist before what" },
      { name: "Break points", description: "Where the system fails and what cascades" },
      { name: "Irreducibles", description: "Mechanisms that cannot be deferred or simplified" },
    ],
    style_rules: [
      "Use arrows (→) for flow",
      "Name components before describing them",
      "State dependencies as 'X requires Y' not 'Y enables X'",
      "State failures as 'if X breaks, then Y' — always causal",
      "No adjectives. No adverbs. Only nouns and verbs.",
    ],
  },
  "Positioning Analyst": {
    format: "Claim Brief",
    sections: [
      { name: "Territory", description: "What claim this could own" },
      { name: "Current occupants", description: "Who holds adjacent territory now" },
      { name: "Timing", description: "When each claim becomes legal to make" },
      { name: "Forbidden claims", description: "What cannot be honestly said yet, and why" },
    ],
    style_rules: [
      "State claims as single declarative sentences",
      "Attach timing to every claim: 'legal now' / 'legal after X' / 'never legal'",
      "Name the risk of each claim in one phrase",
      "Never describe how to build — only what to say and when",
    ],
  },
  "Contrarian Analyst": {
    format: "Cross-Exam Transcript",
    sections: [
      { name: "Challenges", description: "Each challenge targets a specific claim ID" },
      { name: "Exposed assumptions", description: "Unstated premises the claims rest on" },
      { name: "Burden shifts", description: "Where the burden of proof should move" },
    ],
    style_rules: [
      "Address claims by ID: 'Regarding ctx-11:'",
      "State the challenge as a question when possible: 'On what basis...?'",
      "Never propose alternatives — only expose weakness",
      "End each challenge with what evidence would resolve it",
    ],
  },
};

// ── Lexical ban validator ───────────────────────────────────────────────────

/**
 * Validate rendered text against lexical bans for a role.
 *
 * @param {string} roleName
 * @param {string} renderedText
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validateRenderedText(roleName, renderedText) {
  const bans = RENDERER_LEXICAL_BANS[roleName];
  if (!bans) return { valid: true, violations: [] };

  const violations = [];
  const lower = renderedText.toLowerCase();

  for (const phrase of bans.banned) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push(`"${phrase}" — banned for ${roleName} (voice: ${bans.voice})`);
    }
  }

  return { valid: violations.length === 0, violations };
}

// ── Debate transcript generator ─────────────────────────────────────────────

/**
 * Generate a structured debate transcript from challenge/rebuttal edges.
 * This is the presentation layer — it makes the dispute graph readable
 * as a conversation between distinct voices.
 *
 * @param {Array} challenges - ChallengeEdge + cross-exam challenges
 * @param {Array} rebuttals - RebuttalEdge responses
 * @param {Array} atoms - Provenance atoms (for claim text lookup)
 * @returns {string} Formatted debate transcript
 */
export function generateDebateTranscript(challenges, rebuttals, atoms) {
  const atomMap = new Map(atoms.map(a => [a.id, a]));
  const rebuttalMap = new Map(rebuttals.map(r => [r.target_claim_id, r]));

  const lines = [];
  lines.push("## Debate Transcript");
  lines.push("");

  // Group challenges by target atom
  const byTarget = new Map();
  for (const c of challenges) {
    if (!byTarget.has(c.target_claim_id)) byTarget.set(c.target_claim_id, []);
    byTarget.get(c.target_claim_id).push(c);
  }

  for (const [atomId, atomChallenges] of byTarget) {
    const atom = atomMap.get(atomId);
    const claimText = atom ? atom.text : atomId;
    const sourceRole = atom ? atom.source_role : "unknown";

    lines.push(`### ${atomId} (${sourceRole})`);
    lines.push(`> ${claimText}`);
    lines.push("");

    for (const c of atomChallenges) {
      lines.push(`**${c.challenger_role}** [${c.challenge_type}]:`);
      lines.push(`${c.reason}`);
      lines.push("");
    }

    const rebuttal = rebuttalMap.get(atomId);
    if (rebuttal) {
      const verb = rebuttal.response === "defend" ? "DEFENDS"
        : rebuttal.response === "narrow" ? "NARROWS"
        : rebuttal.response === "retract" ? "RETRACTS"
        : "LEAVES UNRESOLVED";
      lines.push(`**${rebuttal.source_role}** ${verb}:`);
      lines.push(`${rebuttal.note}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // Summary stats
  const narrowed = rebuttals.filter(r => r.response === "narrow").length;
  const defended = rebuttals.filter(r => r.response === "defend").length;
  const retracted = rebuttals.filter(r => r.response === "retract").length;
  const unresolved = rebuttals.filter(r => r.response === "unresolved").length;

  lines.push("### Dispute Summary");
  lines.push(`- Challenges issued: ${challenges.length}`);
  lines.push(`- Claims narrowed: ${narrowed}`);
  lines.push(`- Claims defended: ${defended}`);
  lines.push(`- Claims retracted: ${retracted}`);
  lines.push(`- Claims unresolved: ${unresolved}`);

  return lines.join("\n");
}

// ── Render format validator ─────────────────────────────────────────────────

/**
 * Validate that a rendered document follows its role's format.
 * Checks for required sections and style rule compliance.
 *
 * @param {string} roleName
 * @param {string} renderedText
 * @returns {{ valid: boolean, missing_sections: string[], style_issues: string[] }}
 */
export function validateRenderFormat(roleName, renderedText) {
  const schema = RENDER_SCHEMAS[roleName];
  if (!schema) return { valid: true, missing_sections: [], style_issues: [] };

  const missing_sections = [];
  const lower = renderedText.toLowerCase();

  for (const section of schema.sections) {
    // Check for section header presence (flexible matching)
    const sectionLower = section.name.toLowerCase();
    if (!lower.includes(sectionLower)) {
      missing_sections.push(section.name);
    }
  }

  return {
    valid: missing_sections.length === 0,
    missing_sections,
    style_issues: [], // Style rules are guidance, not automated checks
  };
}

// ── Result formatter ─────────────────────────────────────────────────────────

/**
 * Format a complete brainstorm result as a saveable markdown document.
 *
 * Produces a single document with both layers, dispute summary, verdict,
 * and evidence trail — suitable for saving, diffing, and sharing.
 *
 * @param {object} opts
 * @param {object} opts.request - The BrainstormRequest
 * @param {object} opts.synthesisReport - SynthesisReport from synthesize phase
 * @param {object} opts.judgeReport - JudgeReport from judge phase
 * @param {object} opts.evidenceTrail - Evidence trail stats
 * @param {Array}  opts.challenges - ChallengeEdge array
 * @param {Array}  opts.rebuttals - RebuttalEdge array
 * @param {Array}  opts.atoms - Provenance atoms
 * @param {object} [opts.renderedArtifacts] - Map of roleName → rendered text (optional)
 * @param {string} [opts.layer] - "truth" | "render" | "both" (default: "both")
 * @returns {string} Formatted markdown document
 */
export function formatBrainstormResult(opts) {
  const {
    request,
    synthesisReport,
    judgeReport,
    evidenceTrail,
    challenges = [],
    rebuttals = [],
    atoms = [],
    renderedArtifacts = null,
    layer = "both",
  } = opts;

  const lines = [];

  // ── Header ──
  lines.push(`# Brainstorm: ${request.topic}`);
  lines.push("");
  lines.push(`**Objective:** ${request.objective}`);
  if (request.audience) lines.push(`**Audience:** ${request.audience}`);
  lines.push(`**Evidence mode:** ${request.evidence_mode} | **Breadth:** ${request.breadth} | **Depth:** ${request.depth}`);
  lines.push("");

  // ── Verdict ──
  lines.push("## Verdict");
  lines.push("");
  lines.push(`**Disposition:** ${judgeReport.disposition} | **Quality:** ${judgeReport.overall_quality}`);
  lines.push("");

  if (judgeReport.per_direction) {
    lines.push("| Direction | Verdict | Action |");
    lines.push("|-----------|---------|--------|");
    for (const d of judgeReport.per_direction) {
      lines.push(`| ${d.direction_id} | ${d.verdict} | ${d.action || "—"} |`);
    }
    lines.push("");
  }

  if (judgeReport.reasons) {
    for (const r of judgeReport.reasons) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  // ── Synthesis ──
  lines.push("## Directions");
  lines.push("");
  lines.push(`> ${synthesisReport.topic_model}`);
  lines.push("");

  if (synthesisReport.advancing_directions) {
    for (const dir of synthesisReport.advancing_directions) {
      lines.push(`### ${dir.name}`);
      lines.push("");
      lines.push(dir.thesis);
      lines.push("");
      if (dir.why_it_matters) lines.push(`**Why it matters:** ${dir.why_it_matters}`);
      if (dir.supporting_atoms && dir.supporting_atoms.length > 0) {
        lines.push(`**Evidence:** ${dir.supporting_atoms.join(", ")}`);
      }
      if (dir.risks && dir.risks.length > 0) {
        lines.push(`**Risks:** ${dir.risks.join("; ")}`);
      }
      lines.push("");
    }
  }

  if (synthesisReport.archived_directions && synthesisReport.archived_directions.length > 0) {
    lines.push("### Archived");
    lines.push("");
    for (const d of synthesisReport.archived_directions) {
      lines.push(`- **${d.name}** — ${d.reason}`);
    }
    lines.push("");
  }

  // ── Dispute graph ──
  if (challenges.length > 0) {
    lines.push("## Dispute");
    lines.push("");

    const narrowed = rebuttals.filter(r => r.response === "narrow").length;
    const defended = rebuttals.filter(r => r.response === "defend").length;
    const retracted = rebuttals.filter(r => r.response === "retract").length;
    const unresolved = rebuttals.filter(r => r.response === "unresolved").length;

    lines.push(`${challenges.length} challenges issued. ${narrowed} narrowed, ${defended} defended, ${retracted} retracted, ${unresolved} unresolved.`);
    lines.push("");

    const rebuttalMap = new Map(rebuttals.map(r => [r.target_claim_id, r]));
    for (const c of challenges) {
      const reb = rebuttalMap.get(c.target_claim_id);
      const outcome = reb
        ? reb.response === "narrow" ? "NARROWED"
        : reb.response === "defend" ? "DEFENDED"
        : reb.response === "retract" ? "RETRACTED"
        : "UNRESOLVED"
        : "no rebuttal";
      lines.push(`- **${c.target_claim_id}** [${c.challenge_type}] — ${outcome}`);
      lines.push(`  ${c.reason}`);
      if (reb) lines.push(`  → ${reb.note}`);
    }
    lines.push("");
  }

  // ── Tensions ──
  if (synthesisReport.tensions && synthesisReport.tensions.length > 0) {
    lines.push("## Tensions");
    lines.push("");
    for (const t of synthesisReport.tensions) {
      lines.push(`- ${t}`);
    }
    lines.push("");
  }

  // ── Rendered artifacts (Layer 2, opt-in) ──
  if ((layer === "both" || layer === "render") && renderedArtifacts) {
    lines.push("## Rendered Artifacts");
    lines.push("");
    for (const [role, text] of Object.entries(renderedArtifacts)) {
      const schema = RENDER_SCHEMAS[role];
      const format = schema ? schema.format : role;
      lines.push(`### ${format} (${role})`);
      lines.push("");
      lines.push(text);
      lines.push("");
    }
  }

  // ── Evidence trail ──
  lines.push("## Evidence Trail");
  lines.push("");
  if (evidenceTrail) {
    lines.push(`- Analysts: ${(evidenceTrail.scouts_run || []).join(", ")}`);
    lines.push(`- Atoms after normalize: ${evidenceTrail.atoms_after_normalize}`);
    lines.push(`- Directions considered: ${evidenceTrail.directions_considered} → advancing: ${evidenceTrail.directions_advancing}`);
    lines.push(`- Judge loops: ${evidenceTrail.judge_loops} → disposition: ${evidenceTrail.judge_disposition}`);
  }
  lines.push("");

  // ── Footer ──
  lines.push("---");
  lines.push(`*Generated by Role OS brainstorm mission (v0.4)*`);

  return lines.join("\n");
}
