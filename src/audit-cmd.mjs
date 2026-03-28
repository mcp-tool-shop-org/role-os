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
import { join, resolve } from "node:path";
import { getMission, suggestMission } from "./mission.mjs";
import {
  createRun,
  startNextStep,
  getRunPosition,
  getArtifactChain,
  generateCompletionReport,
  formatCompletionReport,
} from "./mission-run.mjs";
import {
  createPersistentRun, findActiveRun, listRuns, loadRun,
  startNext, explainRun, getPosition, saveRun,
} from "./run.mjs";

// ── Constants ────────────────────────────────────────────────────────────────

const MANIFEST_FILE = "audit-manifest.json";

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
      return cmdHelp();
    default:
      // If the first arg isn't a subcommand, treat everything as a task description
      if (!["run", "start", "manifest", "status", "verify", "help"].includes(sub)) {
        return cmdRun(args);
      }
      cmdHelp();
  }
}

// ── roleos audit [run] ───────────────────────────────────────────────────────

function cmdRun(extraArgs) {
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

  // Create a persistent run via the deep-audit mission
  const run = createPersistentRun(taskDesc, cwd, { forceMission: "deep-audit" });

  console.log(`\nDeep Audit Started`);
  console.log(`──────────────────`);
  console.log(`Run:        ${run.id}`);
  console.log(`Repo:       ${manifest.repo || "unknown"}`);
  console.log(`Components: ${manifest.components?.length || 0}`);
  console.log(`Boundaries: ${manifest.boundaries?.length || 0}`);
  console.log(`Steps:      ${run.steps.length}`);
  console.log(`\nThe audit will dispatch:`);
  console.log(`  - Component Auditor  ×${manifest.components?.length || 0}`);
  console.log(`  - Test Truth Auditor ×${manifest.components?.length || 0}`);
  console.log(`  - Seam Auditor       ×${manifest.boundaries?.length || 0}`);
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

  // Find the most recent deep-audit run
  const runs = listRuns(cwd);
  const auditRuns = runs.filter(r =>
    r.task.toLowerCase().includes("audit") ||
    r.level === "mission"
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

function cmdVerify() {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  if (!existsSync(manifestPath)) {
    console.log("\nNo audit-manifest.json found. Nothing to verify.\n");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const issues = validateManifest(manifest);

  console.log(`\nAudit Verification`);
  console.log(`──────────────────`);

  // 1. Manifest valid
  if (issues.length === 0) {
    console.log(`  [PASS] Manifest is valid`);
  } else {
    console.log(`  [FAIL] Manifest has ${issues.length} issue(s)`);
    for (const i of issues) console.log(`         - ${i}`);
  }

  // 2. Owned paths exist
  let pathsOk = 0;
  let pathsMissing = 0;
  for (const c of manifest.components || []) {
    for (const p of c.owned_paths || []) {
      if (existsSync(join(cwd, p))) {
        pathsOk++;
      } else {
        pathsMissing++;
        if (pathsMissing <= 5) {
          console.log(`  [WARN] Missing path: ${p} (${c.id})`);
        }
      }
    }
  }
  if (pathsMissing === 0) {
    console.log(`  [PASS] All ${pathsOk} owned paths exist`);
  } else {
    console.log(`  [WARN] ${pathsMissing} owned path(s) missing (${pathsOk} ok)`);
  }

  // 3. Check for audit output files
  const auditFiles = ["AUDIT-SUMMARY.md", "AUDIT-ACTION-PLAN.md", "AUDIT-CRITIC-VERDICT.md"];
  const existing = auditFiles.filter(f => existsSync(join(cwd, f)));
  if (existing.length === auditFiles.length) {
    console.log(`  [PASS] All audit output files present (${existing.length}/${auditFiles.length})`);
  } else if (existing.length > 0) {
    console.log(`  [WARN] Partial audit outputs (${existing.length}/${auditFiles.length})`);
    const missing = auditFiles.filter(f => !existsSync(join(cwd, f)));
    for (const f of missing) console.log(`         missing: ${f}`);
  } else {
    console.log(`  [INFO] No audit outputs yet — run 'roleos audit' first`);
  }

  // 4. Check parcel reports
  const parcelFiles = readdirSync(cwd).filter(f => f.startsWith("AUDIT-PARCEL-"));
  if (parcelFiles.length > 0) {
    console.log(`  [PASS] ${parcelFiles.length} parcel report(s) found`);
  } else {
    console.log(`  [INFO] No parcel reports yet`);
  }

  const healthy = issues.length === 0 && pathsMissing === 0;
  console.log(`\n${healthy ? "Audit infrastructure verified." : "Some issues found — fix before re-auditing."}\n`);
  if (!healthy) process.exit(1);
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
  roleos audit verify                 Verify manifest and audit outputs
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
  6. roleos audit verify                 Verify everything landed
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
