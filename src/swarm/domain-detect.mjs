/**
 * Domain Detection — Repo type detection and swarm manifest generation.
 *
 * Detects the repo type from directory structure and package metadata,
 * then generates a swarm-manifest.json with non-overlapping domain assignments.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ── Repo type detection ───────────────────────────────────────────────────────

const REPO_TYPE_SIGNALS = {
  desktop: {
    files: ["src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"],
    deps: ["@tauri-apps/api", "electron", "electron-builder"],
    dirs: ["src-tauri"],
  },
  web: {
    files: ["next.config.js", "next.config.mjs", "nuxt.config.ts", "vite.config.ts", "vite.config.js", "astro.config.mjs"],
    deps: ["react-dom", "next", "nuxt", "vue", "@angular/core", "svelte", "astro"],
    dirs: ["pages", "app", "views"],
  },
  mcp: {
    files: [],
    deps: ["@modelcontextprotocol/sdk"],
    dirs: [],
  },
  cli: {
    files: [],
    deps: [],
    dirs: [],
    // CLI is the default fallback
  },
};

/**
 * Detect the repo type from directory structure and package metadata.
 * @param {string} cwd - Repository root directory
 * @returns {"desktop"|"web"|"mcp"|"cli"|"monorepo"}
 */
export function detectRepoType(cwd) {
  // Check for monorepo signals first
  const hasWorkspaces = hasPackageWorkspaces(cwd);
  const hasLerna = existsSync(join(cwd, "lerna.json"));
  if (hasWorkspaces || hasLerna) return "monorepo";

  const pkg = readPackageJson(cwd);
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Check each type in priority order
  for (const type of ["desktop", "web", "mcp"]) {
    const signals = REPO_TYPE_SIGNALS[type];

    // Check files
    for (const f of signals.files) {
      if (existsSync(join(cwd, f))) return type;
    }

    // Check dependencies
    for (const dep of signals.deps) {
      if (allDeps[dep]) return type;
    }

    // Check directories
    for (const dir of signals.dirs) {
      if (existsSync(join(cwd, dir)) && statSync(join(cwd, dir)).isDirectory()) return type;
    }
  }

  // Check for Rust CLI (Cargo.toml without Tauri)
  if (existsSync(join(cwd, "Cargo.toml")) && !existsSync(join(cwd, "src-tauri"))) return "cli";

  // Check for Python CLI
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "setup.py"))) return "cli";

  // Check for Go
  if (existsSync(join(cwd, "go.mod"))) return "cli";

  return "cli";
}

// ── Domain assignment ─────────────────────────────────────────────────────────

/**
 * Default domain templates per repo type.
 * Each domain defines glob patterns for file ownership.
 */
const DOMAIN_TEMPLATES = {
  cli: [
    { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**", "lib/**", "bin/**", "*.mjs", "*.js", "*.ts", "*.py", "*.rs", "*.go"] },
    { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**", "tests/**", "spec/**", "__tests__/**", "*.test.*", "*.spec.*"] },
    { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**", "*.md", "*.json", "*.yaml", "*.yml", "*.toml", ".eslintrc*", ".prettierrc*", "Makefile", "Dockerfile"] },
  ],
  web: [
    { id: "backend", role: "Swarm Backend Agent", patterns: ["src/server/**", "src/api/**", "src/lib/**", "server/**", "api/**"] },
    { id: "frontend", role: "Swarm Frontend Agent", patterns: ["src/components/**", "src/pages/**", "src/app/**", "src/views/**", "src/styles/**", "public/**", "*.css", "*.html"] },
    { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**", "tests/**", "spec/**", "__tests__/**", "*.test.*", "*.spec.*", "e2e/**", "cypress/**"] },
    { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**", "*.md", "*.json", "*.yaml", "*.yml", "*.toml", ".eslintrc*", ".prettierrc*", "Makefile", "Dockerfile", "*.config.*"] },
  ],
  desktop: [
    { id: "backend", role: "Swarm Backend Agent", patterns: ["src-tauri/**", "src/lib/**", "src/server/**"] },
    { id: "bridge", role: "Swarm Bridge Agent", patterns: ["src/bridge/**", "src/ipc/**", "src/commands/**"] },
    { id: "frontend", role: "Swarm Frontend Agent", patterns: ["src/components/**", "src/pages/**", "src/app/**", "src/views/**", "src/styles/**", "public/**"] },
    { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**", "tests/**", "spec/**", "__tests__/**", "*.test.*", "*.spec.*"] },
    { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**", "*.md", "*.json", "*.yaml", "*.yml", "*.toml", ".eslintrc*", ".prettierrc*", "Makefile", "Dockerfile"] },
  ],
  mcp: [
    { id: "backend", role: "Swarm Backend Agent", patterns: ["src/**", "lib/**", "*.mjs", "*.js", "*.ts"] },
    { id: "tests", role: "Swarm Tests Agent", patterns: ["test/**", "tests/**", "spec/**", "__tests__/**", "*.test.*", "*.spec.*"] },
    { id: "infra", role: "Swarm Infra Agent", patterns: [".github/**", "*.md", "*.json", "*.yaml", "*.yml", "*.toml", ".eslintrc*", ".prettierrc*"] },
  ],
};

/**
 * Generate a swarm manifest for the given repo.
 * @param {string} cwd - Repository root directory
 * @param {object} [options]
 * @param {string} [options.repoType] - Override auto-detected repo type
 * @returns {object} Swarm manifest
 */
export function generateSwarmManifest(cwd, options = {}) {
  const repoType = options.repoType || detectRepoType(cwd);
  const templates = DOMAIN_TEMPLATES[repoType] || DOMAIN_TEMPLATES.cli;

  // Build domains from templates
  const domains = templates.map((tmpl, idx) => ({
    id: tmpl.id,
    role: tmpl.role,
    patterns: tmpl.patterns,
    agentSlot: idx,
  }));

  // Read repo metadata
  const pkg = readPackageJson(cwd);
  const repoName = pkg.name || cwd.split(/[/\\]/).pop();

  return {
    version: "1.0",
    repo: repoName,
    repoType,
    domains,
    stages: ["health-a", "health-b", "health-c", "feature", "treatment"],
    exclusiveOwnership: {
      mode: "strict",
      maxAgentsPerWave: domains.length,
    },
  };
}

/**
 * Validate a swarm manifest for correctness.
 * @param {object} manifest
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateSwarmManifest(manifest) {
  const issues = [];

  if (!manifest) {
    issues.push("Manifest is null or undefined");
    return { valid: false, issues };
  }

  if (!manifest.version) issues.push("Missing version");
  if (!manifest.repo) issues.push("Missing repo");
  if (!Array.isArray(manifest.domains)) {
    issues.push("Missing or invalid domains array");
    return { valid: false, issues };
  }

  if (manifest.domains.length === 0) {
    issues.push("No domains defined — need at least 1");
  }

  if (manifest.domains.length > 10) {
    issues.push(`Too many domains (${manifest.domains.length}) — max 10`);
  }

  // Check for empty domains
  for (const domain of manifest.domains) {
    if (!domain.id) issues.push("Domain missing id");
    if (!domain.role) issues.push(`Domain ${domain.id || "?"} missing role`);
    if (!Array.isArray(domain.patterns) || domain.patterns.length === 0) {
      issues.push(`Domain ${domain.id || "?"} has no patterns`);
    }
  }

  // Check for duplicate domain IDs
  const ids = manifest.domains.map(d => d.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    issues.push("Duplicate domain IDs found");
  }

  // Check for pattern overlaps (simple heuristic — exact pattern match)
  const allPatterns = [];
  for (const domain of manifest.domains) {
    for (const pattern of domain.patterns || []) {
      const existing = allPatterns.find(p => p.pattern === pattern);
      if (existing) {
        issues.push(`Pattern "${pattern}" claimed by both ${existing.domain} and ${domain.id}`);
      }
      allPatterns.push({ pattern, domain: domain.id });
    }
  }

  // Check stages
  if (!Array.isArray(manifest.stages) || manifest.stages.length === 0) {
    issues.push("Missing or empty stages array");
  }

  return { valid: issues.length === 0, issues };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readPackageJson(cwd) {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return {};
  }
}

function hasPackageWorkspaces(cwd) {
  const pkg = readPackageJson(cwd);
  return Array.isArray(pkg.workspaces) || (pkg.workspaces && pkg.workspaces.packages);
}
