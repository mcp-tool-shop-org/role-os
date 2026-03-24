import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { readFileSafe } from "./fs-utils.mjs";
import { detectConflicts } from "./conflicts.mjs";

// ── Full 32-Role Catalog ─────────────────────────────────────────────────────
// Every role in the OS is scoreable. Keywords from routing-rules.md + contracts.
// Triggers are strong multi-word signals worth bonus points.

export const ROLE_CATALOG = [
  // ── CORE ──
  {
    name: "Orchestrator", pack: "core", phase: 0,
    alwaysInclude: true,
    keywords: [],
    triggers: ["multi-step", "cross-functional", "decomposition", "sequencing"],
    excludeWhen: [],
  },
  {
    name: "Product Strategist", pack: "product", phase: 1,
    keywords: ["product", "scope", "intent", "prioritize", "tradeoff", "framing", "user value", "feature shaping"],
    triggers: ["problem framing", "scope definition", "tradeoff decision"],
    excludeWhen: [],
    deliverableAffinity: ["Plan"],
  },
  {
    name: "Critic Reviewer", pack: "core", phase: 99,
    alwaysInclude: true,
    keywords: [],
    triggers: ["final acceptance", "quality gate", "truthful rejection"],
    excludeWhen: [],
  },

  // ── DESIGN ──
  {
    name: "UI Designer", pack: "design", phase: 2,
    keywords: ["ui", "screen", "layout", "hierarchy", "interaction", "visual", "design", "flow", "component", "wireframe"],
    triggers: ["information hierarchy", "user flow", "interaction design", "screen structure"],
    excludeWhen: ["no user interface", "cli only", "backend only"],
    deliverableAffinity: ["Design"],
  },
  {
    name: "Brand Guardian", pack: "design", phase: 2,
    keywords: ["brand", "identity", "terminology", "tone", "contamination", "fork", "residue", "purge", "naming"],
    triggers: ["identity contamination", "fork residue", "terminology consistency", "replacement doctrine"],
    excludeWhen: ["no brand concern", "internal tooling only"],
  },

  // ── ENGINEERING ──
  {
    name: "Backend Engineer", pack: "engineering", phase: 3,
    keywords: ["api", "server", "data", "persistence", "contract", "model", "migration", "bridge", "wiring", "session", "state", "database", "endpoint"],
    triggers: ["server-side", "data flow", "system contract"],
    excludeWhen: ["frontend only", "docs only"],
    deliverableAffinity: ["Code"],
  },
  {
    name: "Frontend Developer", pack: "engineering", phase: 3,
    keywords: ["frontend", "render", "component", "client", "tui", "display", "view", "react", "css", "html", "dom"],
    triggers: ["ui implementation", "client state", "interaction wiring", "frontend integration"],
    excludeWhen: ["backend only", "no ui"],
    deliverableAffinity: ["Code"],
  },
  {
    name: "Test Engineer", pack: "engineering", phase: 4,
    keywords: ["test", "verify", "regression", "coverage", "assertion", "edge case", "vitest", "jest", "spec"],
    triggers: ["test plan", "regression defense", "verification coverage"],
    excludeWhen: [],
    deliverableAffinity: ["Test"],
  },
  {
    name: "Performance Engineer", pack: "engineering", phase: 3,
    keywords: ["performance", "profiling", "latency", "memory", "benchmark", "optimization", "hot path", "budget", "slow", "bottleneck"],
    triggers: ["performance regression", "hot path analysis", "performance budget"],
    excludeWhen: ["no performance concern"],
  },
  {
    name: "Refactor Engineer", pack: "engineering", phase: 3,
    keywords: ["refactor", "duplication", "boundary", "complexity", "cleanup", "modularize", "split", "extract", "simplify"],
    triggers: ["structure cleanup", "module boundary", "complexity reduction", "duplication elimination"],
    excludeWhen: ["new feature", "behavior change required"],
    deliverableAffinity: ["Code"],
  },
  {
    name: "Security Reviewer", pack: "engineering", phase: 3,
    keywords: ["security", "injection", "auth", "authentication", "authorization", "secrets", "owasp", "threat", "vulnerability", "xss", "csrf", "sanitize"],
    triggers: ["security review", "threat model", "owasp pattern", "secret scanning"],
    excludeWhen: ["no security surface"],
    deliverableAffinity: ["Review"],
  },
  {
    name: "Dependency Auditor", pack: "engineering", phase: 3,
    keywords: ["dependency", "dependencies", "vulnerability", "supply chain", "stale", "outdated", "audit", "npm audit", "dependabot"],
    triggers: ["dependency health", "supply-chain risk", "vulnerability scanning"],
    excludeWhen: ["no external dependencies"],
  },

  // ── TREATMENT ──
  {
    name: "Repo Researcher", pack: "treatment", phase: 1,
    keywords: ["repo structure", "entrypoint", "seam", "build command", "test command", "codebase", "architecture", "map"],
    triggers: ["repo structure mapping", "entrypoint discovery", "dependency verification"],
    excludeWhen: ["repo already well understood"],
  },
  {
    name: "Repo Translator", pack: "treatment", phase: 5,
    keywords: ["translate", "translation", "localize", "localization", "i18n", "multilingual", "language", "readme translation", "polyglot"],
    triggers: ["readme translation", "docs translation", "cross-audience adaptation"],
    excludeWhen: ["english only", "no translation needed"],
  },
  {
    name: "Docs Architect", pack: "treatment", phase: 3,
    keywords: ["documentation", "handbook", "docs", "starlight", "guide", "tutorial", "reference", "api docs"],
    triggers: ["handbook creation", "docs site", "starlight setup", "documentation restructuring"],
    excludeWhen: ["no docs needed"],
    deliverableAffinity: ["Plan"],
  },
  {
    name: "Metadata Curator", pack: "treatment", phase: 5,
    keywords: ["metadata", "manifest", "package.json", "badge", "topic", "homepage", "description", "registry", "npm"],
    triggers: ["package manifest audit", "badge verification", "registry metadata"],
    excludeWhen: ["no package metadata"],
  },
  {
    name: "Coverage Auditor", pack: "treatment", phase: 4,
    keywords: ["coverage", "test coverage", "uncovered", "false confidence", "missing test", "untested"],
    triggers: ["coverage assessment", "false confidence detection", "missing defense"],
    excludeWhen: ["no test suite"],
  },
  {
    name: "Deployment Verifier", pack: "treatment", phase: 6,
    keywords: ["deploy", "deployment", "live", "landing page", "published", "badge", "verify live", "spot check"],
    triggers: ["post-deploy verification", "landing page check", "badge resolution", "translation spot-check"],
    excludeWhen: ["not yet deployed"],
  },
  {
    name: "Release Engineer", pack: "treatment", phase: 5,
    keywords: ["release", "version", "changelog", "tag", "publish", "package", "bump", "npm publish", "staging"],
    triggers: ["version bump", "changelog update", "publish readiness", "release execution"],
    excludeWhen: ["not releasing"],
  },

  // ── GROWTH ──
  {
    name: "Launch Strategist", pack: "growth", phase: 6,
    keywords: ["launch", "go-to-market", "channel", "timing", "proof", "success criteria", "announcement"],
    triggers: ["launch planning", "proof packaging", "channel selection", "success criteria"],
    excludeWhen: ["internal tool", "not launching"],
  },
  {
    name: "Content Strategist", pack: "growth", phase: 6,
    keywords: ["content", "article", "blog", "case study", "tutorial", "marketing content", "content calendar"],
    triggers: ["content planning", "technical article", "case study angle", "docs-to-marketing bridge"],
    excludeWhen: ["no content needed"],
  },
  {
    name: "Community Manager", pack: "growth", phase: 6,
    keywords: ["community", "issue triage", "discussion", "contribution", "contributor", "feedback loop", "open source"],
    triggers: ["community response", "contribution guidance", "community health"],
    excludeWhen: ["private repo", "no community"],
  },
  {
    name: "Support Triage Lead", pack: "growth", phase: 6,
    keywords: ["support", "triage", "bug report", "user error", "recurring", "priority assignment"],
    triggers: ["support classification", "bug vs user error", "recurring pattern"],
    excludeWhen: ["no support surface"],
  },

  // ── MARKETING ──
  {
    name: "Launch Copywriter", pack: "marketing", phase: 6,
    keywords: ["copy", "messaging", "positioning", "release notes", "announcement", "conversion"],
    triggers: ["launch messaging", "release notes", "positioning copy"],
    excludeWhen: ["internal tool", "not launching"],
    deliverableAffinity: ["Copy"],
  },

  // ── PRODUCT ──
  {
    name: "Feedback Synthesizer", pack: "product", phase: 1,
    keywords: ["feedback", "signal", "cluster", "theme", "complaint", "user signal", "sentiment"],
    triggers: ["signal clustering", "theme extraction", "complaint-to-action"],
    excludeWhen: ["no user feedback available"],
  },
  {
    name: "Information Architect", pack: "product", phase: 2,
    keywords: ["navigation", "hierarchy", "findability", "labeling", "taxonomy", "information structure", "sitemap"],
    triggers: ["navigation design", "content organization", "cross-surface consistency"],
    excludeWhen: ["no information structure concern"],
  },
  {
    name: "Roadmap Prioritizer", pack: "product", phase: 1,
    keywords: ["roadmap", "prioritize", "backlog", "sequence", "leverage", "dependency", "stop doing"],
    triggers: ["work sequencing", "backlog ordering", "dependency mapping", "stop doing"],
    excludeWhen: ["single task", "no prioritization needed"],
  },
  {
    name: "Spec Writer", pack: "product", phase: 2,
    keywords: ["spec", "specification", "acceptance criteria", "edge case", "requirements", "nfr", "non-functional"],
    triggers: ["execution-grade spec", "acceptance criteria", "edge case enumeration"],
    excludeWhen: ["spec already exists"],
    deliverableAffinity: ["Plan"],
  },

  // ── RESEARCH ──
  {
    name: "UX Researcher", pack: "research", phase: 1,
    keywords: ["usability", "friction", "heuristic", "user flow", "ux", "user experience", "pain point"],
    triggers: ["user flow friction", "heuristic evaluation", "usability issue"],
    excludeWhen: ["no user interface", "cli only"],
  },
  {
    name: "Competitive Analyst", pack: "research", phase: 1,
    keywords: ["competitive", "competitor", "differentiation", "positioning", "landscape", "alternative"],
    triggers: ["competitive landscape", "differentiation assessment", "positioning gap"],
    excludeWhen: ["no competitors"],
  },
  {
    name: "Trend Researcher", pack: "research", phase: 1,
    keywords: ["trend", "ecosystem", "adoption", "market", "emerging", "signal"],
    triggers: ["technology trend", "ecosystem signal", "adoption timing"],
    excludeWhen: ["no trend relevance"],
  },
  {
    name: "User Interview Synthesizer", pack: "research", phase: 1,
    keywords: ["interview", "mental model", "unmet need", "user research", "synthesis", "qualitative"],
    triggers: ["interview theme", "mental model mapping", "unmet needs ranking"],
    excludeWhen: ["no interview data"],
  },
];

// ── Deliverable type → role affinity ──────────────────────────────────────────

const DELIVERABLE_TYPES = ["Plan", "Design", "Code", "Test", "Copy", "Review"];

// ── Packet type → role score bias ─────────────────────────────────────────────
// These boost relevant roles by packet type, but don't lock the chain.

const TYPE_BIAS = {
  feature: ["Product Strategist", "UI Designer", "Backend Engineer", "Frontend Developer", "Test Engineer"],
  integration: ["Backend Engineer", "Frontend Developer", "Test Engineer", "Refactor Engineer"],
  identity: ["Brand Guardian", "Metadata Curator", "UI Designer", "Frontend Developer"],
};

// ── Phase ordering (for chain assembly) ───────────────────────────────────────
// Lower phase = earlier in chain. Same phase = sorted by pack then name.

function phaseOf(role) {
  return role.phase ?? 3;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const MIN_SCORE_THRESHOLD = 2; // Minimum score to be included in chain

function scoreRole(role, content, packetType, deliverableType) {
  if (role.alwaysInclude) return { score: Infinity, reasons: ["always included"], matched: [] };

  const lower = content.toLowerCase();
  let score = 0;
  const matched = [];

  // Keyword hits (1 point each)
  for (const kw of role.keywords) {
    if (lower.includes(kw)) {
      score += 1;
      matched.push(kw);
    }
  }

  // Trigger phrase bonus (2 points each — strong signals)
  for (const trigger of role.triggers) {
    if (lower.includes(trigger)) {
      score += 2;
      if (!matched.includes(trigger)) matched.push(`[trigger] ${trigger}`);
    }
  }

  // Packet type bias (+1 if role is in the type's preferred set)
  const biased = TYPE_BIAS[packetType] || [];
  if (biased.includes(role.name)) {
    score += 1;
    matched.push(`[type-bias] ${packetType}`);
  }

  // Deliverable type affinity (+1)
  if (deliverableType && role.deliverableAffinity?.includes(deliverableType)) {
    score += 1;
    matched.push(`[deliverable] ${deliverableType}`);
  }

  return { score, reasons: matched.length > 0 ? matched : [], matched };
}

// ── Type detection ────────────────────────────────────────────────────────────

function detectType(content) {
  const typeMatch = content.match(/## Packet Type\n(\w+)/);
  if (typeMatch && ["feature", "integration", "identity"].includes(typeMatch[1])) {
    return typeMatch[1];
  }

  const lower = content.toLowerCase();
  if (lower.includes("contamination") || lower.includes("residue") || lower.includes("purge")) {
    return "identity";
  }
  if (lower.includes("wiring") || lower.includes("bridge") || lower.includes("integration") || lower.includes("seam")) {
    return "integration";
  }
  return "feature";
}

// ── Deliverable type extraction ───────────────────────────────────────────────

function extractDeliverableType(content) {
  const match = content.match(/## Deliverable Type\n(\w+)/);
  if (match && DELIVERABLE_TYPES.includes(match[1])) return match[1];
  return null;
}

// ── Chain assembly ────────────────────────────────────────────────────────────
// Scored roles → ordered chain. Phase-sorted, not template-locked.

function assembleChain(scoredRoles) {
  // Sort by phase, then pack, then name
  const chain = scoredRoles.sort((a, b) => {
    const pa = phaseOf(a.role);
    const pb = phaseOf(b.role);
    if (pa !== pb) return pa - pb;
    if (a.role.pack !== b.role.pack) return a.role.pack.localeCompare(b.role.pack);
    return a.role.name.localeCompare(b.role.name);
  });

  return chain;
}

// ── Confidence assessment ─────────────────────────────────────────────────────

function assessConfidence(scoredRoles) {
  const strongRoles = scoredRoles.filter(r => !r.role.alwaysInclude && r.score >= MIN_SCORE_THRESHOLD);
  if (strongRoles.length >= 3) return "high";
  if (strongRoles.length >= 1) return "medium";
  return "low";
}

// ── File reference extraction ─────────────────────────────────────────────────

function extractFileRefs(content, packetDir) {
  const refs = [];
  const inputsMatch = content.match(/## Inputs\n([\s\S]*?)(?=\n## |\n---)/);
  if (!inputsMatch) return refs;

  const inputsSection = inputsMatch[1];
  const pathPattern = /(?:^|\s|`)((?:\.\/|\.\.\/|[a-zA-Z][\w\-]*\/)[^\s`\n,)]+\.\w+)/gm;
  let match;
  while ((match = pathPattern.exec(inputsSection)) !== null) {
    const ref = match[1];
    const resolved = resolve(dirname(packetDir), "..", "..", ref);
    refs.push({ ref, resolved, exists: existsSync(resolved) });
  }

  return refs;
}

// ── Handoff hints ─────────────────────────────────────────────────────────────

const HANDOFF_HINTS = {
  "Orchestrator": "decomposes into role-owned packets with verified dependencies",
  "Product Strategist": "hands off: scope doc, prioritized requirements, tradeoff decisions",
  "UI Designer": "hands off: screen structure, interaction flow, visual direction",
  "Brand Guardian": "hands off: terminology audit, contamination report, replacement rules",
  "Backend Engineer": "hands off: implemented APIs, data contracts, migration scripts",
  "Frontend Developer": "hands off: implemented UI, client state, integration wiring",
  "Test Engineer": "hands off: test results, coverage report, edge case findings",
  "Performance Engineer": "hands off: profiling results, identified hot paths, optimization plan",
  "Refactor Engineer": "hands off: restructured code, boundary changes, diff summary",
  "Security Reviewer": "hands off: threat model, flagged patterns, recommended mitigations",
  "Dependency Auditor": "hands off: audit report, vulnerability triage, update recommendations",
  "Repo Researcher": "hands off: repo map, entrypoints, build/test commands, seam inventory",
  "Repo Translator": "hands off: translated files, verification notes, degenerate output flags",
  "Docs Architect": "hands off: docs structure, handbook setup, navigation hierarchy",
  "Metadata Curator": "hands off: updated manifests, badge status, registry alignment report",
  "Coverage Auditor": "hands off: coverage report, false confidence inventory, missing defenses",
  "Deployment Verifier": "hands off: verification checklist, live artifact status, broken links",
  "Release Engineer": "hands off: versioned package, changelog, tag, publish confirmation",
  "Launch Strategist": "hands off: launch plan, channel selection, success criteria, timing",
  "Content Strategist": "hands off: content plan, article outlines, calendar",
  "Community Manager": "hands off: triage report, response drafts, health assessment",
  "Support Triage Lead": "hands off: classified tickets, priority assignments, recurring patterns",
  "Launch Copywriter": "hands off: release notes, positioning copy, announcement drafts",
  "Feedback Synthesizer": "hands off: signal clusters, themes, actionable insights",
  "Information Architect": "hands off: navigation structure, labeling recommendations, hierarchy",
  "Roadmap Prioritizer": "hands off: sequenced backlog, dependency map, stop-doing list",
  "Spec Writer": "hands off: execution-grade spec, acceptance criteria, edge cases, NFRs",
  "UX Researcher": "hands off: friction inventory, heuristic findings, design input",
  "Competitive Analyst": "hands off: landscape map, differentiation analysis, positioning gaps",
  "Trend Researcher": "hands off: trend report, impact assessment, timing recommendations",
  "User Interview Synthesizer": "hands off: theme report, mental models, unmet needs ranking",
  "Critic Reviewer": "accepts, rejects, or blocks based on contract and evidence",
};

// ── Main route command ────────────────────────────────────────────────────────

export async function routeCommand(args) {
  const packetFile = args[0];

  if (!packetFile) {
    const err = new Error("Usage: roleos route <packet-file>");
    err.exitCode = 1;
    err.hint = "Provide the path to a packet file.";
    throw err;
  }

  const content = readFileSafe(packetFile);
  if (content === null) {
    const err = new Error(`Packet not found: ${packetFile}`);
    err.exitCode = 1;
    err.hint = "Check the file path and try again.";
    throw err;
  }

  const type = detectType(content);
  const deliverableType = extractDeliverableType(content);

  // Score all 32 roles
  const allScored = ROLE_CATALOG.map(role => ({
    role,
    ...scoreRole(role, content, type, deliverableType),
  }));

  // Partition: always-include + above-threshold + considered + not-triggered
  const alwaysInclude = allScored.filter(r => r.role.alwaysInclude);
  const recommended = allScored.filter(r => !r.role.alwaysInclude && r.score >= MIN_SCORE_THRESHOLD);
  const considered = allScored.filter(r => !r.role.alwaysInclude && r.score > 0 && r.score < MIN_SCORE_THRESHOLD);
  const notTriggered = allScored.filter(r => !r.role.alwaysInclude && r.score === 0);

  // Assemble chain from always-include + recommended
  const chainRoles = assembleChain([...alwaysInclude, ...recommended]);
  const confidence = assessConfidence(allScored);
  const fileRefs = extractFileRefs(content, resolve(packetFile));

  // Chain size warning
  const chainWarning = chainRoles.length > 7
    ? "\n  ⚠ Large chain (>7 roles). Consider splitting into sub-packets."
    : "";

  // ── Output ──

  console.log(`\nroleos route — ${packetFile}\n`);
  console.log(`Detected type: ${type}`);
  if (deliverableType) console.log(`Deliverable type: ${deliverableType}`);
  console.log(`Routing confidence: ${confidence}`);

  if (confidence === "low") {
    console.log(`  ↳ Few strong role signals detected. Consider reviewing the packet for missing context.`);
  }

  console.log(`\nRecommended chain (${chainRoles.length} roles):${chainWarning}`);
  chainRoles.forEach((r, i) => {
    const hint = HANDOFF_HINTS[r.role.name] || "";
    const reason = r.role.alwaysInclude
      ? "always included"
      : `${r.matched.join(", ")} (score: ${r.score})`;
    console.log(`  ${i + 1}. ${r.role.name}`);
    console.log(`     why: ${reason}`);
    if (hint) console.log(`     handoff: ${hint}`);
  });

  if (considered.length > 0) {
    console.log(`\nAlso considered (scored but below threshold of ${MIN_SCORE_THRESHOLD}):`);
    for (const r of considered.sort((a, b) => b.score - a.score)) {
      console.log(`  - ${r.role.name}: ${r.matched.join(", ")} (score: ${r.score})`);
    }
  }

  console.log(`\nNot triggered: ${notTriggered.length} roles with 0 keyword signals`);

  // ── Conflict detection ──
  const conflicts = detectConflicts(chainRoles);
  if (conflicts.length > 0) {
    console.log(`\nConflict detection (${conflicts.length} finding${conflicts.length > 1 ? "s" : ""}):`);
    for (const f of conflicts) {
      const icon = f.severity === "error" ? "✗" : "!";
      console.log(`  ${icon} [${f.type}] ${f.message}`);
      console.log(`    repair: ${f.repair}`);
    }
  } else {
    console.log(`\nConflict detection: clean — no conflicts found.`);
  }

  if (fileRefs.length > 0) {
    console.log(`\nDependency verification:`);
    let hasIssues = false;
    for (const ref of fileRefs) {
      const status = ref.exists ? "OK" : "MISSING";
      const marker = ref.exists ? "+" : "!";
      console.log(`  ${marker} ${ref.ref} — ${status}`);
      if (!ref.exists) hasIssues = true;
    }
    if (hasIssues) {
      console.log(`\n  WARNING: Some referenced files are missing. Verify before proceeding.`);
    }
  }

  // Stop conditions
  console.log(`\nStop conditions:`);
  console.log(`  • If any role produces a "blocked" verdict → escalate to Orchestrator`);
  console.log(`  • If Critic Reviewer rejects → loop back to the responsible role`);
  if (chainWarning) console.log(`  • Chain is large — consider decomposing the packet`);

  console.log(`\nNext: assign roles and begin execution, or adjust the chain.`);
}

// ── Exports for testing ───────────────────────────────────────────────────────

export { scoreRole, detectType, assembleChain, assessConfidence, extractFileRefs, extractDeliverableType, MIN_SCORE_THRESHOLD };
