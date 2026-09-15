/**
 * Audit CLI — Deep Audit entry point.
 *
 * roleos audit                       Run deep audit on current repo
 * roleos audit manifest              Show or generate the audit manifest
 * roleos audit status                Show audit run progress
 * roleos audit verify                Re-verify findings against current code
 *
 * This is a first-class shortcut into the deep-audit mission.
 * Under the hood it creates a mission run with dynamic dispatch.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  createPersistentRun, listRuns, loadRun, getPosition,
} from "./run.mjs";

// ── Constants ────────────────────────────────────────────────────────────────

const MANIFEST_FILE = "audit-manifest.json";

/** Terminal synthesizer/critic outputs. Missing or empty = verify FAIL. */
export const TERMINAL_AUDIT_OUTPUTS = [
  "AUDIT-SUMMARY.md",
  "AUDIT-ACTION-PLAN.md",
  "AUDIT-CRITIC-VERDICT.md",
];

const TERMINAL_CONTENT_RE = {
  "AUDIT-SUMMARY.md": /verdict/i,
  "AUDIT-ACTION-PLAN.md": /\bP[0-3]\b|priority|action plan/i,
  "AUDIT-CRITIC-VERDICT.md": /verdict/i,
};

const CITED_PATH_RE = /(?:src|test|bin|tools|starter-pack|site|dossier)\/[A-Za-z0-9_./+\-*?]+?\.(?:mjs|js|cjs|ts|tsx|md|json|py)/gi;
const FINDING_ID_RE = /^[A-Z][A-Za-z0-9]*-[A-Za-z0-9-]+$/;

// ── Main dispatch ────────────────────────────────────────────────────────────

/**
 * @param {string[]} args
 */
export async function auditCommand(args) {
  const sub = args[0] || "run";

  switch (sub) {
    case "run":
    case "start":
      return cmdRun(args.slice(1));
    case "manifest":
      return cmdManifest(args.slice(1));
    case "status":
      return cmdStatus();
    case "verify":
      return cmdVerify();
    case "help":
    case "--help":
    case "-h":
      return cmdHelp();
    default:
      // If the first arg isn't a subcommand, treat everything as a task description
      if (!["run", "start", "manifest", "status", "verify", "help", "--help", "-h"].includes(sub)) {
        return cmdRun(args);
      }
      cmdHelp();
  }
}

// ── roleos audit [run] ───────────────────────────────────────────────────────

async function cmdRun(extraArgs) {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  // Check if manifest exists
  if (!existsSync(manifestPath)) {
    console.log("\nNo audit-manifest.json found in current directory.");
    console.log("Generate one first with: roleos audit manifest --generate\n");
    console.log("The manifest defines your repo's components and boundaries.");
    console.log("Deep audit uses it to dispatch one auditor per component.\n");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // Validate manifest shape
  const issues = validateManifest(manifest);
  if (issues.length > 0) {
    console.log("\nAudit manifest has issues:\n");
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    console.log("\nFix the manifest and re-run.\n");
    process.exit(1);
  }

  const taskDesc = extraArgs.length > 0
    ? extraArgs.join(" ")
    : `Deep audit of ${manifest.repo || "current repo"}`;

  // Create a persistent run via the deep-audit mission.
  // Forwarding the manifest routes step construction through buildDynamicSteps,
  // so auditor steps scale with components/boundaries instead of the static flow.
  const run = await createPersistentRun(taskDesc, cwd, {
    forceMission: "deep-audit",
    manifest,
  });

  const componentCount = manifest.components?.length || 0;
  const boundaryCount = manifest.boundary_clusters?.length ?? manifest.boundaries?.length ?? 0;

  console.log(`\nDeep Audit Started`);
  console.log(`──────────────────`);
  console.log(`Run:        ${run.id}`);
  console.log(`Repo:       ${manifest.repo || "unknown"}`);
  console.log(`Components: ${componentCount}`);
  console.log(`Boundaries: ${boundaryCount}`);
  console.log(`Steps:      ${run.steps.length}`);
  console.log(`\nThe audit will dispatch:`);
  console.log(`  - Component Auditor  ×${componentCount}`);
  console.log(`  - Test Truth Auditor ×${componentCount}`);
  console.log(`  - Seam Auditor       ×${boundaryCount}`);
  console.log(`  - Audit Synthesizer  ×1`);
  console.log(`  - Critic Reviewer    ×1`);
  console.log(`\nRun 'roleos next' to begin the first step.`);
  console.log(`Run 'roleos audit status' to check progress.\n`);
}

// ── roleos audit manifest ────────────────────────────────────────────────────

function cmdManifest(args) {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  if (args.includes("--generate") || args.includes("-g")) {
    return generateManifest(cwd, manifestPath);
  }

  if (!existsSync(manifestPath)) {
    console.log("\nNo audit-manifest.json found.");
    console.log("Run 'roleos audit manifest --generate' to create one.\n");
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const issues = validateManifest(manifest);

  console.log(`\nAudit Manifest: ${manifest.repo || "unknown"}`);
  console.log(`──────────────────────────────────────────`);
  console.log(`Version:    ${manifest.version || "unknown"}`);
  console.log(`Language:   ${manifest.language || "unknown"}`);
  console.log(`Source:     ${manifest.total_source_lines || "?"} lines`);
  console.log(`Tests:      ${manifest.total_test_lines || "?"} lines`);
  console.log(`Components: ${manifest.components?.length || 0}`);
  console.log(`Boundaries: ${manifest.boundaries?.length || 0}`);

  if (manifest.components?.length > 0) {
    console.log(`\nComponents:`);
    for (const c of manifest.components) {
      const paths = c.owned_paths?.length || 0;
      console.log(`  - ${c.id}: ${c.description || ""} (${paths} paths)`);
    }
  }

  if (manifest.boundaries?.length > 0) {
    console.log(`\nBoundaries:`);
    for (const b of manifest.boundaries) {
      const label = b.id || `${b.from} → ${b.to}`;
      console.log(`  - ${label}: ${b.contract || b.description || ""}`);
    }
  }

  if (issues.length > 0) {
    console.log(`\nIssues:`);
    for (const issue of issues) {
      console.log(`  ! ${issue}`);
    }
  } else {
    console.log(`\nManifest is valid.`);
  }

  console.log("");
}

function generateManifest(cwd, manifestPath) {
  if (existsSync(manifestPath)) {
    console.log(`\nManifest already exists at ${MANIFEST_FILE}.`);
    console.log("Edit it manually or delete it to regenerate.\n");
    return;
  }

  // Build a skeleton manifest by scanning src/
  const srcDir = join(cwd, "src");
  const components = [];

  if (existsSync(srcDir)) {
    const files = readdirSync(srcDir).filter(f => f.endsWith(".mjs") || f.endsWith(".js") || f.endsWith(".ts"));
    // Group by common prefix
    const seen = new Set();
    for (const f of files) {
      const base = f.replace(/(-cmd)?\.m?[jt]s$/, "");
      if (seen.has(base)) continue;
      seen.add(base);

      const paths = files.filter(ff => ff.startsWith(base)).map(ff => `src/${ff}`);
      components.push({
        id: base,
        description: `TODO: describe ${base}`,
        owned_paths: paths,
        forbidden_paths: [],
        upstream_deps: [],
        downstream_consumers: [],
        public_interfaces: [],
      });
    }
  }

  const manifest = {
    repo: "TODO: org/repo-name",
    version: "0.0.0",
    timestamp: new Date().toISOString(),
    language: "TODO",
    runtime: "TODO",
    total_source_lines: 0,
    total_test_lines: 0,
    external_dependencies: 0,
    components,
    boundaries: [],
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nGenerated skeleton ${MANIFEST_FILE} with ${components.length} components.`);
  console.log("Edit the manifest to:");
  console.log("  1. Fill in repo, version, language, runtime");
  console.log("  2. Write real descriptions for each component");
  console.log("  3. Define boundaries between components");
  console.log("  4. Set upstream_deps and downstream_consumers");
  console.log(`\nThen run 'roleos audit' to start the audit.\n`);
}

// ── roleos audit status ──────────────────────────────────────────────────────

function cmdStatus() {
  const cwd = process.cwd();

  // Find the most recent deep-audit run.
  // missionKey is authoritative; task keywords cover legacy runs created
  // before missionKey was exposed by listRuns.
  const runs = listRuns(cwd);
  const auditRuns = runs.filter(r =>
    r.missionKey === "deep-audit" ||
    r.task.toLowerCase().includes("audit")
  );

  if (auditRuns.length === 0) {
    console.log("\nNo audit runs found. Start one with: roleos audit\n");
    return;
  }

  // Show the most recent
  const latest = auditRuns[0];
  console.log(`\nLatest Audit Run`);
  console.log(`────────────────`);
  console.log(`ID:      ${latest.id}`);
  console.log(`Task:    ${latest.task}`);
  console.log(`Status:  ${latest.status.toUpperCase()}`);
  console.log(`Created: ${latest.createdAt}`);

  const full = loadRun(cwd, latest.id);
  if (full) {
    const pos = getPosition(full);
    console.log(`Progress: ${pos.progress}`);

    const byStatus = {};
    for (const s of full.steps) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }
    console.log(`\nSteps:`);
    for (const [status, count] of Object.entries(byStatus)) {
      const icon = status === "completed" ? "[x]" :
                   status === "active"    ? "[>]" :
                   status === "failed"    ? "[!]" :
                   status === "blocked"   ? "[-]" : "[ ]";
      console.log(`  ${icon} ${status}: ${count}`);
    }
  }

  console.log(`\nRun 'roleos explain ${latest.id}' for full detail.\n`);
}

// ── roleos audit verify ──────────────────────────────────────────────────────

function readOptionalFile(cwd, name) {
  const p = join(cwd, name);
  if (!existsSync(p)) return { missing: true, text: "" };
  let text = "";
  try {
    text = readFileSync(p, "utf-8");
  } catch {
    return { unreadable: true, text: "" };
  }
  if (!String(text).trim()) return { empty: true, text: "" };
  return { text: String(text) };
}

function extractCitedPaths(text) {
  const paths = [];
  const seen = new Set();
  CITED_PATH_RE.lastIndex = 0;
  for (const m of String(text).matchAll(CITED_PATH_RE)) {
    const p = m[0].replace(/\\/g, "/");
    if (!seen.has(p)) {
      seen.add(p);
      paths.push(p);
    }
  }
  return paths;
}

function extractSymbols(text) {
  const symbols = [];
  for (const m of String(text).matchAll(/`([^`]+)`/g)) {
    const ident = m[1].trim().replace(/\(.*$/, "").replace(/\[.*$/, "");
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(ident) && ident.length >= 2) {
      symbols.push(ident);
    }
  }
  const afterDash = String(text).split(/—|--/).slice(1).join(" ");
  for (const m of afterDash.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
    if (m[1] !== "FILE" && m[1] !== "TODO") symbols.push(m[1]);
  }
  return [...new Set(symbols)];
}

function extractLineNumber(text) {
  const m = String(text).match(/line\s*~?\s*(\d+)/i)
    || String(text).match(/:(\d+)(?:-\d+)?\b/);
  return m ? Number(m[1]) : null;
}

function expandCitedPath(cwd, cited) {
  const rel = cited.replace(/\\/g, "/");
  if (!/[*?]/.test(rel)) return [rel];
  const slash = rel.lastIndexOf("/");
  const dir = slash >= 0 ? rel.slice(0, slash) : ".";
  const pat = slash >= 0 ? rel.slice(slash + 1) : rel;
  const absDir = join(cwd, dir);
  if (!existsSync(absDir)) return [];
  let names = [];
  try { names = readdirSync(absDir); } catch { return []; }
  const re = new RegExp(
    "^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return names.filter(n => re.test(n)).map(n => (dir === "." ? n : `${dir}/${n}`));
}

function sourceHasSymbol(src, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:[^A-Za-z0-9_]|$)`).test(src);
}

function parcelDeclaresNoFindings(text) {
  if (/\bno findings\b|\b0 findings\b|findings:\s*none/i.test(text)) return true;
  const section = text.match(/##\s*findings\b([\s\S]*?)(?=\n##\s|\s*$)/i);
  if (!section) return false;
  if (/^###\s+/m.test(section[1])) return false;
  return /none|n\/a|empty|clean/i.test(section[1]);
}

/**
 * Parse finding blocks from an AUDIT-PARCEL / SEAM / TESTS markdown report.
 * @param {string} text
 * @returns {{ id: string, title: string, files: string[], symbols: string[], line: number|null, noIssues: boolean }[]}
 */
export function parseAuditParcelFindings(text) {
  const findings = [];
  if (typeof text !== "string" || !text.trim()) return findings;
  const normalized = text.replace(/\r\n/g, "\n");
  const re = /^###\s+(\S+):\s*(.+)$/gm;
  const matches = [...normalized.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const id = m[1];
    if (!FINDING_ID_RE.test(id)) continue;
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    const block = normalized.slice(start, end);
    const title = m[2].trim();
    const fileLine = block.match(/^\s*-\s*\*\*Files?:\*\*\s*(.+)$/m);
    const fileText = fileLine ? fileLine[1] : "";
    findings.push({
      id,
      title,
      files: fileText ? extractCitedPaths(fileText) : [],
      symbols: fileText ? extractSymbols(fileText) : extractSymbols(title),
      line: extractLineNumber(fileText || title),
      noIssues: /no issues|clean boundary/i.test(title),
    });
  }
  return findings;
}

function listCwdNames(cwd) {
  try { return readdirSync(cwd); } catch { return []; }
}

function pushCheck(checks, ok, message) {
  checks.push({ ok, level: ok ? "PASS" : "FAIL", message });
}

/**
 * Evaluate `roleos audit verify` against cwd.
 * Fail-closed: missing/empty terminal outputs, missing/empty parcels, or
 * findings that cannot be re-checked against current source.
 * @param {string} cwd
 */
export function evaluateAuditVerify(cwd) {
  const checks = [];
  const stale = [];

  const manifestPath = join(cwd, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    pushCheck(checks, false, "No audit-manifest.json found. Nothing to verify.");
    return { pass: false, checks, findings: [], stale };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (err) {
    pushCheck(checks, false, `audit-manifest.json is not valid JSON: ${err.message}`);
    return { pass: false, checks, findings: [], stale };
  }

  const issues = validateManifest(manifest);
  if (issues.length === 0) {
    pushCheck(checks, true, "Manifest is valid");
  } else {
    pushCheck(checks, false, `Manifest has ${issues.length} issue(s)`);
    for (const i of issues) pushCheck(checks, false, `- ${i}`);
  }

  let pathsOk = 0;
  let pathsMissing = 0;
  for (const c of manifest.components || []) {
    for (const p of c.owned_paths || []) {
      if (existsSync(join(cwd, p))) {
        pathsOk++;
      } else {
        pathsMissing++;
        if (pathsMissing <= 5) pushCheck(checks, false, `Missing path: ${p} (${c.id})`);
      }
    }
  }
  if (pathsMissing === 0) {
    pushCheck(checks, true, `All ${pathsOk} owned paths exist`);
  } else {
    pushCheck(checks, false, `${pathsMissing} owned path(s) missing (${pathsOk} ok)`);
  }

  // Terminal outputs: FAIL (not INFO/WARN) when missing or empty.
  for (const name of TERMINAL_AUDIT_OUTPUTS) {
    const got = readOptionalFile(cwd, name);
    if (got.missing) {
      pushCheck(checks, false, `Missing required audit output: ${name}`);
    } else if (got.empty || got.unreadable) {
      pushCheck(checks, false, `Required audit output is empty: ${name}`);
    } else if (TERMINAL_CONTENT_RE[name] && !TERMINAL_CONTENT_RE[name].test(got.text)) {
      pushCheck(checks, false, `Required audit output lacks expected content (${name})`);
    } else {
      pushCheck(checks, true, `${name} present and non-empty`);
    }
  }

  const components = manifest.components || [];
  const names = listCwdNames(cwd);
  const parcelFiles = names.filter(f => f.startsWith("AUDIT-PARCEL-") && f.endsWith(".md"));
  const extraReports = names.filter(f => /^(AUDIT-SEAM-|AUDIT-TESTS-).+\.md$/i.test(f));

  if (components.length > 0 && parcelFiles.length === 0) {
    pushCheck(checks, false, "No AUDIT-PARCEL-* reports — run 'roleos audit' first");
  } else if (parcelFiles.length > 0) {
    pushCheck(checks, true, `${parcelFiles.length} parcel report(s) found`);
  }

  for (const c of components) {
    const expected = `AUDIT-PARCEL-${c.id}.md`;
    const got = readOptionalFile(cwd, expected);
    if (got.missing) {
      pushCheck(checks, false, `Missing parcel for component '${c.id}': ${expected}`);
    } else if (got.empty || got.unreadable) {
      pushCheck(checks, false, `Empty parcel for component '${c.id}': ${expected}`);
    }
  }

  for (const name of extraReports) {
    const got = readOptionalFile(cwd, name);
    if (got.empty || got.unreadable) {
      pushCheck(checks, false, `Empty audit output: ${name}`);
    }
  }

  const reportFiles = [...new Set([
    ...parcelFiles,
    ...extraReports,
    ...components.map(c => `AUDIT-PARCEL-${c.id}.md`),
  ])];

  const findings = [];
  let hollowParcels = 0;
  let declaredEmpty = 0;
  for (const name of reportFiles) {
    const got = readOptionalFile(cwd, name);
    if (got.missing || got.empty) continue;
    const parsed = parseAuditParcelFindings(got.text);
    if (parsed.length === 0) {
      if (parcelDeclaresNoFindings(got.text)) declaredEmpty++;
      else if (name.startsWith("AUDIT-PARCEL-")) hollowParcels++;
    }
    for (const f of parsed) findings.push({ ...f, source: name });
  }

  if (hollowParcels > 0) {
    pushCheck(checks, false, `${hollowParcels} parcel report(s) have no parseable findings (not re-verified)`);
  }

  const checkable = findings.filter(f => !f.noIssues);
  const withFiles = checkable.filter(f => f.files.length > 0);

  if (parcelFiles.length > 0 && findings.length === 0 && declaredEmpty === 0 && hollowParcels === 0) {
    pushCheck(checks, false, "No findings parsed from parcel reports — cannot re-verify against current code");
  }

  if (checkable.length > 0 && withFiles.length === 0) {
    pushCheck(checks, false, `${checkable.length} finding(s) have no file citations — cannot re-verify against current code`);
  }

  let verifiedCount = 0;
  for (const f of withFiles) {
    const reasons = [];
    const bodies = [];
    for (const cited of f.files) {
      const resolved = expandCitedPath(cwd, cited);
      if (resolved.length === 0) {
        reasons.push(`cited path missing: ${cited}`);
        continue;
      }
      for (const rel of resolved) {
        const abs = join(cwd, rel);
        if (!existsSync(abs)) {
          reasons.push(`cited path missing: ${rel}`);
          continue;
        }
        let src = "";
        try {
          src = readFileSync(abs, "utf-8");
        } catch {
          reasons.push(`cited path unreadable: ${rel}`);
          continue;
        }
        bodies.push({ rel, src });
      }
    }
    if (bodies.length === 0 && reasons.length === 0) {
      reasons.push("cited paths missing");
    } else if (bodies.length > 0) {
      if (f.line && !bodies.some(b => b.src.split(/\r?\n/).length >= f.line)) {
        reasons.push(`cited line ${f.line} past end of ${bodies.map(b => b.rel).join(", ")}`);
      }
      for (const sym of f.symbols) {
        if (!bodies.some(b => sourceHasSymbol(b.src, sym))) {
          reasons.push(`stale: \`${sym}\` not found in ${bodies.map(b => b.rel).join(", ")}`);
        }
      }
    }
    const findingOk = reasons.length === 0;
    if (findingOk) {
      verifiedCount++;
    } else {
      const reason = reasons[0] || "stale against current source";
      stale.push({ id: f.id, reason });
      if (stale.length <= 8) {
        pushCheck(checks, false, `Finding ${f.id} not re-verified: ${reason}`);
      }
    }
  }

  if (stale.length > 8) {
    pushCheck(checks, false, `${stale.length - 8} more stale finding(s)`);
  }

  if (withFiles.length > 0 && verifiedCount === withFiles.length && stale.length === 0) {
    pushCheck(checks, true, `${verifiedCount} finding(s) re-verified against current code`);
  } else if (withFiles.length > 0 && verifiedCount === 0) {
    pushCheck(checks, false, `0 of ${withFiles.length} finding(s) re-verified against current code`);
  }

  const pass = checks.every(c => c.ok);
  return { pass, checks, findings, stale };
}

function cmdVerify() {
  const result = evaluateAuditVerify(process.cwd());

  console.log(`\nAudit Verification`);
  console.log(`──────────────────`);
  for (const c of result.checks) {
    console.log(`  [${c.level}] ${c.message}`);
  }

  if (result.pass) {
    console.log(`\nAudit findings re-verified against current code.\n`);
  } else {
    console.log(`\nAudit verification failed — missing/empty outputs or findings not re-verified against current code.\n`);
    process.exit(1);
  }
}

// ── Help ─────────────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`
roleos audit — Deep Audit CLI

Usage:
  roleos audit                        Start a deep audit on the current repo
  roleos audit manifest               Show the audit manifest
  roleos audit manifest --generate    Generate a skeleton manifest from src/
  roleos audit status                 Show audit run progress
  roleos audit verify                 Re-verify findings against current code (fails if outputs missing/empty or findings stale)
  roleos audit help                   Show this help

The deep audit decomposes a repo into bounded components, dispatches one
auditor per component, inspects seams between components, checks test truth,
then synthesizes into a ranked action plan.

Workflow:
  1. roleos audit manifest --generate    Create audit-manifest.json
  2. Edit the manifest                   Define components and boundaries
  3. roleos audit                        Start the audit run
  4. roleos next                         Step through each auditor
  5. roleos audit status                 Check progress
  6. roleos audit verify                 Re-verify findings against current code
`);
}

// ── Manifest validation ──────────────────────────────────────────────────────

function validateManifest(manifest) {
  const issues = [];

  if (!manifest.components || !Array.isArray(manifest.components)) {
    issues.push("components must be an array");
  } else {
    if (manifest.components.length === 0) {
      issues.push("components array is empty — add at least one component");
    }
    for (let i = 0; i < manifest.components.length; i++) {
      const c = manifest.components[i];
      if (!c.id) issues.push(`components[${i}] missing id`);
      if (!c.owned_paths || c.owned_paths.length === 0) {
        issues.push(`components[${i}] (${c.id || "?"}) has no owned_paths`);
      }
    }
  }

  if (!manifest.boundaries || !Array.isArray(manifest.boundaries)) {
    issues.push("boundaries must be an array");
  }

  return issues;
}

export { validateManifest };
