import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { readFileSafe } from "./fs-utils.mjs";

const ROLE_KEYWORDS = {
  "Product Strategist": [
    "product", "scope", "intent", "prioritize", "tradeoff", "framing",
    "feature shaping", "user value",
  ],
  "UI Designer": [
    "ui", "screen", "layout", "hierarchy", "interaction", "visual",
    "design", "flow", "component",
  ],
  "Backend Engineer": [
    "api", "server", "data", "persistence", "contract", "model",
    "migration", "bridge", "wiring", "session", "state",
  ],
  "Frontend Developer": [
    "frontend", "render", "component", "client", "tui", "display",
    "view", "screen implementation",
  ],
  "Test Engineer": [
    "test", "verify", "regression", "coverage", "assertion", "edge case",
  ],
  "Launch Copywriter": [
    "release notes", "launch", "messaging", "copy", "positioning",
    "announcement",
  ],
};

const CHAINS = {
  feature: [
    "Orchestrator", "Product Strategist", "UI Designer",
    "Backend Engineer", "Frontend Developer", "Test Engineer",
    "Critic Reviewer",
  ],
  integration: [
    "Orchestrator", "Backend Engineer", "Frontend Developer",
    "Test Engineer", "Critic Reviewer",
  ],
  identity: [
    "Orchestrator", "Product Strategist", "UI Designer",
    "Frontend Developer", "Test Engineer", "Critic Reviewer",
  ],
};

function detectType(content) {
  const lower = content.toLowerCase();

  const typeMatch = content.match(/## Packet Type\n(\w+)/);
  if (typeMatch && CHAINS[typeMatch[1]]) {
    return typeMatch[1];
  }

  if (lower.includes("contamination") || lower.includes("residue") || lower.includes("identity") || lower.includes("purge")) {
    return "identity";
  }
  if (lower.includes("wiring") || lower.includes("bridge") || lower.includes("integration") || lower.includes("seam")) {
    return "integration";
  }
  return "feature";
}

function scoreRoles(content) {
  const lower = content.toLowerCase();
  const scores = {};

  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[role] = score;
  }

  return scores;
}

function recommendChain(type, scores) {
  const base = CHAINS[type] || CHAINS.feature;
  const relevant = new Set(Object.keys(scores));

  // Always keep Orchestrator and Critic Reviewer
  const chain = base.filter((role) => {
    if (role === "Orchestrator" || role === "Critic Reviewer") return true;
    if (relevant.has(role)) return true;
    // Keep roles in the base chain even without keyword hits —
    // the type-based chain is the proven default
    return true;
  });

  return chain;
}

function extractFileRefs(content, packetDir) {
  const refs = [];
  const inputsMatch = content.match(/## Inputs\n([\s\S]*?)(?=\n## |\n---)/);
  if (!inputsMatch) return refs;

  const inputsSection = inputsMatch[1];
  // Match file paths — look for patterns like path/to/file.ext or ./path/to/file
  const pathPattern = /(?:^|\s|`)((?:\.\/|\.\.\/|[a-zA-Z][\w\-]*\/)[^\s`\n,)]+\.\w+)/gm;
  let match;
  while ((match = pathPattern.exec(inputsSection)) !== null) {
    const ref = match[1];
    const resolved = resolve(dirname(packetDir), "..", "..", ref);
    refs.push({
      ref,
      resolved,
      exists: existsSync(resolved),
    });
  }

  return refs;
}

export async function routeCommand(args) {
  const packetFile = args[0];

  if (!packetFile) {
    console.error("Usage: roleos route <packet-file>");
    process.exit(1);
  }

  const content = readFileSafe(packetFile);
  if (content === null) {
    console.error(`Packet not found: ${packetFile}`);
    process.exit(1);
  }

  const type = detectType(content);
  const scores = scoreRoles(content);
  const chain = recommendChain(type, scores);
  const fileRefs = extractFileRefs(content, resolve(packetFile));

  console.log(`\nroleos route — ${packetFile}\n`);
  console.log(`Detected type: ${type}`);
  console.log(`\nRecommended chain (${chain.length} roles):`);
  chain.forEach((role, i) => {
    console.log(`  ${i + 1}. ${role}`);
  });

  if (Object.keys(scores).length > 0) {
    console.log(`\nRole signals:`);
    for (const [role, score] of Object.entries(scores).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${role}: ${score} keyword hit${score > 1 ? "s" : ""}`);
    }
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

  console.log(`\nNext: assign roles and begin execution, or adjust the chain.`);
}
