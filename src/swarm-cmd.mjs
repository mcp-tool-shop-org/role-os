/**
 * Swarm CLI — Dogfood Swarm entry point.
 *
 * roleos swarm                        Run dogfood swarm on current repo
 * roleos swarm manifest               Show the swarm manifest
 * roleos swarm manifest --generate    Auto-detect domains and generate manifest
 * roleos swarm status                 Show swarm run progress
 * roleos swarm findings               List findings captured from wave reports
 * roleos swarm approve                Approve the current user gate
 * roleos swarm verify                 Phase 9: require a run, fail on open CRITICAL/HIGH, run build gate
 *
 * This is a first-class shortcut into the dogfood-swarm mission.
 * Under the hood it creates a mission run with dynamic domain dispatch.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPersistentRun, listRuns, loadRun, getPosition, saveRun,
} from "./run.mjs";
import {
  generateSwarmManifest, validateSwarmManifest,
} from "./swarm/domain-detect.mjs";
import { resolveArtifactContent } from "./artifacts.mjs";
import { runBuildGate, formatBuildGateStatus } from "./swarm/build-gate.mjs";
import {
  evaluateExitCondition,
  formatExitConditionReport,
} from "./swarm/exit-condition.mjs";

// ── Constants ────────────────────────────────────────────────────────────────

const MANIFEST_FILE = "swarm-manifest.json";
const DEFAULT_STAGES = ["health-a", "health-b", "health-c", "feature", "treatment"];

/**
 * Read swarm-manifest.json. Missing files still throw ENOENT (callers existsSync first).
 * Truncated/corrupt JSON becomes a named USER_ERROR with the path — never a raw SyntaxError.
 */
function readSwarmManifest(manifestPath) {
  let raw;
  try {
    raw = readFileSync(manifestPath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") throw err;
    const wrapped = new Error(`Swarm manifest unreadable: ${manifestPath} — delete or restore it`);
    wrapped.exitCode = 1;
    wrapped.code = "MANIFEST_UNREADABLE";
    wrapped.hint = "Delete or restore swarm-manifest.json, then retry.";
    throw wrapped;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error(`Swarm manifest unreadable: ${manifestPath} — delete or restore it`);
    err.exitCode = 1;
    err.code = "MANIFEST_UNREADABLE";
    err.hint = "Delete or restore swarm-manifest.json, then retry.";
    throw err;
  }
}

/**
 * Filter listRuns output down to swarm runs.
 * missionKey is authoritative; task keywords cover legacy runs.
 */
function filterSwarmRuns(runs) {
  return runs.filter(r =>
    r.missionKey === "dogfood-swarm" ||
    r.task.toLowerCase().includes("swarm") ||
    r.task.toLowerCase().includes("dogfood")
  );
}

// ── Main dispatch ────────────────────────────────────────────────────────────

/**
 * @param {string[]} args
 */
export async function swarmCommand(args) {
  const sub = args[0] || "run";

  switch (sub) {
    case "run":
    case "start":
      return cmdRun(args.slice(1));
    case "manifest":
      return cmdManifest(args.slice(1));
    case "status":
      return cmdStatus();
    case "findings":
      return cmdFindings();
    case "approve":
      return cmdApprove();
    case "verify":
      return cmdVerify();
    case "help":
    case "--help":
    case "-h":
      return cmdHelp();
    default:
      if (!["run", "start", "manifest", "status", "findings", "approve", "verify", "help", "--help", "-h"].includes(sub)) {
        return cmdRun(args);
      }
      cmdHelp();
  }
}

// ── roleos swarm [run] ──────────────────────────────────────────────────────

async function cmdRun(extraArgs) {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  // Auto-generate manifest if missing
  if (!existsSync(manifestPath)) {
    console.log("\nNo swarm-manifest.json found — generating from repo structure...");
    const manifest = generateSwarmManifest(cwd);
    const validation = validateSwarmManifest(manifest);

    if (!validation.valid) {
      console.log("\nGenerated manifest has issues:");
      for (const issue of validation.issues) {
        console.log(`  - ${issue}`);
      }
      console.log("\nFix and re-run, or run 'roleos swarm manifest --generate' to customize.\n");
      process.exit(1);
    }

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Generated ${MANIFEST_FILE} (${manifest.domains.length} domains, type: ${manifest.repoType})`);
  }

  const manifest = readSwarmManifest(manifestPath);
  const validation = validateSwarmManifest(manifest);

  if (!validation.valid) {
    console.log("\nSwarm manifest has issues:\n");
    for (const issue of validation.issues) {
      console.log(`  - ${issue}`);
    }
    console.log("\nFix the manifest and re-run.\n");
    process.exit(1);
  }

  const taskDesc = extraArgs.length > 0
    ? extraArgs.join(" ")
    : `Dogfood swarm of ${manifest.repo || "current repo"}`;

  // Create persistent run via the dogfood-swarm mission.
  // Forwarding the manifest routes step construction through buildSwarmSteps,
  // so steps carry stage/domain/gate metadata and scale with the domains.
  const run = await createPersistentRun(taskDesc, cwd, {
    forceMission: "dogfood-swarm",
    manifest,
  });

  const domainCount = manifest.domains?.length || 0;
  const stages = Array.isArray(manifest.stages) && manifest.stages.length > 0
    ? manifest.stages
    : DEFAULT_STAGES;

  console.log(`\nDogfood Swarm Started`);
  console.log(`─────────────────────`);
  console.log(`Run:      ${run.id}`);
  console.log(`Repo:     ${manifest.repo || "unknown"}`);
  console.log(`Type:     ${manifest.repoType || "unknown"}`);
  console.log(`Domains:  ${domainCount}`);
  console.log(`Stages:   ${stages.length} (${stages.join(" → ")})`);
  console.log(`Steps:    ${run.steps.length}`);
  console.log(`\nDomain Agents:`);
  for (const d of manifest.domains || []) {
    console.log(`  - ${d.id}: ${d.role} (${d.patterns.length} patterns)`);
  }
  console.log(`\nStage Pipeline:`);
  console.log(`  1. Health-A   Bug/Security Fix      (loop until 0 CRITICAL + 0 HIGH)`);
  console.log(`  2. Health-B   Proactive Hardening   (user review gate)`);
  console.log(`  3. Health-C   Humanization          (loop until 0 CRITICAL + 0 HIGH)`);
  console.log(`  4. Feature    Capability Audit      (user approval gate)`);
  console.log(`  5. Treatment  Full Treatment        (shipcheck, docs, handbook — user gate)`);
  console.log(`  6. Final      Synthesis + Verdict`);
  console.log(`\nRun 'roleos next' to begin the first wave.`);
  console.log(`Run 'roleos swarm status' to check progress.\n`);
}

// ── roleos swarm manifest ───────────────────────────────────────────────────

function cmdManifest(args) {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  if (args.includes("--generate") || args.includes("-g")) {
    return generateManifestFile(cwd, manifestPath);
  }

  if (!existsSync(manifestPath)) {
    console.log("\nNo swarm-manifest.json found.");
    console.log("Run 'roleos swarm manifest --generate' to create one.\n");
    return;
  }

  const manifest = readSwarmManifest(manifestPath);
  const validation = validateSwarmManifest(manifest);

  console.log(`\nSwarm Manifest: ${manifest.repo || "unknown"}`);
  console.log(`──────────────────────────────────────────`);
  console.log(`Version:  ${manifest.version || "unknown"}`);
  console.log(`Type:     ${manifest.repoType || "unknown"}`);
  console.log(`Domains:  ${manifest.domains?.length || 0}`);
  console.log(`Stages:   ${manifest.stages?.length || 0}`);

  if (manifest.domains?.length > 0) {
    console.log(`\nDomains:`);
    for (const d of manifest.domains) {
      console.log(`  - ${d.id}: ${d.role}`);
      for (const p of d.patterns || []) {
        console.log(`      ${p}`);
      }
    }
  }

  if (!validation.valid) {
    console.log(`\nIssues:`);
    for (const issue of validation.issues) {
      console.log(`  ! ${issue}`);
    }
  } else {
    console.log(`\nManifest is valid.`);
  }

  console.log("");
}

function generateManifestFile(cwd, manifestPath) {
  if (existsSync(manifestPath)) {
    console.log(`\nManifest already exists at ${MANIFEST_FILE}.`);
    console.log("Delete it to regenerate, or edit manually.\n");
    return;
  }

  const manifest = generateSwarmManifest(cwd);
  const validation = validateSwarmManifest(manifest);

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nGenerated ${MANIFEST_FILE}`);
  console.log(`  Repo type: ${manifest.repoType}`);
  console.log(`  Domains:   ${manifest.domains.length}`);

  for (const d of manifest.domains) {
    console.log(`    - ${d.id}: ${d.patterns.length} patterns`);
  }

  if (!validation.valid) {
    console.log(`\nWarnings:`);
    for (const issue of validation.issues) {
      console.log(`  ! ${issue}`);
    }
  }

  console.log(`\nEdit the manifest to customize domain boundaries.`);
  console.log(`Then run 'roleos swarm' to start.\n`);
}

// ── roleos swarm status ─────────────────────────────────────────────────────

function cmdStatus() {
  const cwd = process.cwd();
  const swarmRuns = filterSwarmRuns(listRuns(cwd));

  if (swarmRuns.length === 0) {
    console.log("\nNo swarm runs found. Start one with: roleos swarm\n");
    return;
  }

  const latest = swarmRuns[0];
  console.log(`\nLatest Swarm Run`);
  console.log(`────────────────`);
  console.log(`ID:      ${latest.id}`);
  console.log(`Task:    ${latest.task}`);
  console.log(`Status:  ${latest.status.toUpperCase()}`);
  console.log(`Created: ${latest.createdAt}`);

  const full = loadRun(cwd, latest.id);
  if (full) {
    const pos = getPosition(full);
    console.log(`Progress: ${pos.progress}`);

    // Group by stage
    const stageStats = {};
    for (const s of full.steps) {
      const stage = s.stage || "unknown";
      if (!stageStats[stage]) stageStats[stage] = { total: 0, completed: 0, active: 0, pending: 0, failed: 0 };
      stageStats[stage].total++;
      stageStats[stage][s.status] = (stageStats[stage][s.status] || 0) + 1;
    }

    console.log(`\nStages:`);
    for (const [stage, stats] of Object.entries(stageStats)) {
      const icon = stats.failed > 0 ? "[!]" :
                   stats.completed === stats.total ? "[x]" :
                   stats.active > 0 ? "[>]" : "[ ]";
      console.log(`  ${icon} ${stage}: ${stats.completed}/${stats.total} complete`);
    }

    const active = full.steps.find(s => s.status === "active");
    if (active?.isGate) {
      if (active.buildGate) {
        console.log(`\nBuild gate: lint + typecheck + test will run on complete (blocks on fail or vacuous skip).`);
      }
      if (active.userApproval && active.userApprovalStatus !== "approved") {
        console.log(`User approval required: run 'roleos swarm approve' before complete.`);
      } else if (active.userApproval && active.userApprovalStatus === "approved") {
        console.log(`User approval: recorded. Complete the gate step to advance.`);
      }
    }
  }

  console.log(`\nRun 'roleos explain ${latest.id}' for full detail.\n`);
}

// ── roleos swarm findings ───────────────────────────────────────────────────

function cmdFindings() {
  const cwd = process.cwd();
  const swarmRuns = filterSwarmRuns(listRuns(cwd));

  if (swarmRuns.length === 0) {
    console.log("\nNo swarm runs found.\n");
    return;
  }

  const full = loadRun(cwd, swarmRuns[0].id);
  if (!full) {
    console.log("\nCouldn't load run.\n");
    return;
  }

  // Extract findings from wave-report artifacts.
  // step.artifact is usually a short reference (often a file path) — when it
  // points at a readable file under cwd, scan the file content instead of the reference.
  const findings = [];
  for (const step of full.steps) {
    if (step.produces === "wave-report" && step.artifact) {
      const body = resolveArtifactContent(step.artifact, cwd);

      // Normalize line endings so CRLF artifacts parse on Windows checkouts
      const match = body.replace(/\r\n/g, "\n").match(/## findings\n([\s\S]*?)(?=\n## |$)/i);
      if (match) {
        findings.push({
          domain: step.domain || "unknown",
          stage: step.stage || "unknown",
          content: match[1].trim(),
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log("\nNo findings captured yet. Run waves first.");
    console.log("Findings are read from each wave-report artifact's '## Findings' section");
    console.log("(complete steps with a wave-report file path to make them scannable).\n");
    return;
  }

  console.log(`\nSwarm Findings (${findings.length} domains with findings)`);
  console.log(`──────────────────────────────────────────────────────`);
  for (const f of findings) {
    console.log(`\n[${f.stage}] ${f.domain}:`);
    console.log(f.content);
  }
  console.log("");
}

// ── roleos swarm approve ────────────────────────────────────────────────────

function cmdApprove() {
  const cwd = process.cwd();
  const swarmRuns = filterSwarmRuns(listRuns(cwd));

  if (swarmRuns.length === 0) {
    console.log("\nNo swarm runs found.\n");
    return;
  }

  const full = loadRun(cwd, swarmRuns[0].id);
  if (!full) {
    console.log("\nCouldn't load run.\n");
    return;
  }

  // Find the next gate step waiting for approval (not yet approved)
  const gateStep = full.steps.find(s =>
    s.isGate && s.userApproval && s.status === "active" &&
    s.userApprovalStatus !== "approved"
  );

  if (!gateStep) {
    console.log("\nNo gate currently waiting for approval.");
    console.log("The swarm either hasn't reached a user gate yet, or has already been approved.\n");
    return;
  }

  // Record the approval on the persisted run — an approval that isn't
  // saved is not a control.
  const approvedAt = new Date().toISOString();
  gateStep.userApprovalStatus = "approved";
  gateStep.approvedAt = approvedAt;
  gateStep.note = gateStep.note
    ? `${gateStep.note}; user approved ${gateStep.stage} gate`
    : `User approved ${gateStep.stage} gate`;
  full.interventions = full.interventions || [];
  full.interventions.push({
    type: "gate-approval",
    stepIndex: gateStep.index,
    stage: gateStep.stage,
    timestamp: approvedAt,
  });
  saveRun(cwd, full);

  console.log(`\nApproved: ${gateStep.stage} gate (recorded at ${approvedAt})`);
  console.log(`The swarm will proceed to the next stage.`);
  console.log(`Complete the gate step with 'roleos complete <swarm-gate-artifact>' to advance.\n`);
}

// ── roleos swarm verify ─────────────────────────────────────────────────────

function cmdVerify() {
  const cwd = process.cwd();
  const manifestPath = join(cwd, MANIFEST_FILE);

  if (!existsSync(manifestPath)) {
    console.log("\nNo swarm-manifest.json found. Nothing to verify.\n");
    process.exit(1);
  }

  const manifest = readSwarmManifest(manifestPath);
  const validation = validateSwarmManifest(manifest);

  console.log(`\nSwarm Verification (Phase 9)`);
  console.log(`────────────────────────────`);

  let healthy = true;

  // 1. Manifest valid
  if (validation.valid) {
    console.log(`  [PASS] Manifest is valid`);
  } else {
    healthy = false;
    console.log(`  [FAIL] Manifest has ${validation.issues.length} issue(s)`);
    for (const i of validation.issues) console.log(`         - ${i}`);
  }

  // 2. Domain count
  const domainCount = manifest.domains?.length || 0;
  if (domainCount >= 1 && domainCount <= 10) {
    console.log(`  [PASS] ${domainCount} domains (within 1-10 range)`);
  } else {
    healthy = false;
    console.log(`  [FAIL] ${domainCount} domains (must be 1-10)`);
  }

  // 3. A swarm run must exist — a valid manifest with zero runs is not Phase 9.
  const swarmRuns = filterSwarmRuns(listRuns(cwd));
  let full = null;

  if (swarmRuns.length === 0) {
    healthy = false;
    console.log(`  [FAIL] No swarm run — Phase 9 cannot verify an empty tree. Run 'roleos swarm' first.`);
  } else {
    const latest = swarmRuns[0];
    full = loadRun(cwd, latest.id);
    if (!full) {
      healthy = false;
      console.log(`  [FAIL] Could not load swarm run ${latest.id}`);
    } else {
      const completed = full.steps.filter(s => s.status === "completed").length;
      const total = full.steps.length;
      console.log(`  [PASS] Swarm run present: ${completed}/${total} steps complete`);
    }
  }

  // 4. Wave-report findings + exitCondition (same helper as gate complete)
  if (full) {
    const floor = evaluateExitCondition({
      exitCondition: "0 CRITICAL + 0 HIGH findings open",
      steps: full.steps,
      stage: null,
      cwd,
    });
    if (floor.pass) {
      console.log(`  [PASS] 0 CRITICAL + 0 HIGH findings open`);
    } else {
      healthy = false;
      console.log(`  [FAIL] ${floor.reason}`);
      console.log(formatExitConditionReport(floor));
    }

    const gate = full.steps.find(s => s.isGate && s.status === "active")
      || [...full.steps].reverse().find(s => s.isGate && s.status === "completed");
    if (gate?.exitCondition && gate.exitCondition !== "0 CRITICAL + 0 HIGH findings open") {
      const extra = evaluateExitCondition({
        exitCondition: gate.exitCondition,
        steps: full.steps,
        stage: gate.stage || null,
        cwd,
        artifact: gate.artifact,
      });
      if (extra.pass) {
        console.log(`  [PASS] Gate exitCondition (${gate.stage}): ${gate.exitCondition}`);
      } else {
        healthy = false;
        console.log(`  [FAIL] Gate exitCondition (${gate.stage}): ${extra.reason}`);
        console.log(formatExitConditionReport(extra));
      }
    }
  }

  // 5. Build gate — Phase 9 actually runs it (fail/vacuous = fail)
  const bg = runBuildGate(cwd);
  console.log(formatBuildGateStatus(bg));
  if (!bg.pass || bg.vacuous) {
    healthy = false;
    console.log(`  [FAIL] Build gate ${bg.vacuous ? "vacuous — ran nothing" : "failed"}`);
  } else {
    console.log(`  [PASS] Build gate`);
  }

  console.log(`\n${healthy ? "Phase 9 verification passed." : "Phase 9 verification failed — fix the issues above and re-run."}\n`);
  if (!healthy) process.exit(1);
}

// ── Help ────────────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`
Dogfood Swarm — Multi-pass convergence mission

Usage:
  roleos swarm                     Start a dogfood swarm on the current repo
  roleos swarm manifest            Show the swarm manifest
  roleos swarm manifest --generate Auto-detect domains and generate manifest
  roleos swarm status              Show swarm run progress
  roleos swarm findings            List findings captured from wave reports
  roleos swarm approve             Approve the current user gate
  roleos swarm verify              Phase 9: require a run, fail on open CRITICAL/HIGH, run build gate
  roleos swarm help                Show this help

The swarm runs 5 stages in sequence:
  1. Health-A   Bug/Security Fix      (loops until 0 CRITICAL + 0 HIGH)
  2. Health-B   Proactive Hardening   (user review gate)
  3. Health-C   Humanization          (loops until 0 CRITICAL + 0 HIGH)
  4. Feature    Capability Audit      (user approval before execution)
  5. Treatment  Full Treatment        (shipcheck, docs, handbook — user gate)

Each stage dispatches parallel domain agents with exclusive file ownership.
A build gate (lint + typecheck + test) runs when completing a coordinator
gate step (buildGate:true) and on 'roleos swarm verify', and blocks on fail
or vacuous skip. Coordinator gates evaluate exitCondition against same-stage
wave-reports and refuse complete while open CRITICAL/HIGH remain (treatment
needs shipcheck-equivalent evidence). User-approval gates (health-b, feature,
treatment) require 'roleos swarm approve' before 'roleos complete'.
`);
}
