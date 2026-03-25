/**
 * Run CLI Commands — Phase U (v2.0.0)
 *
 * roleos run "<task>"              — create and start a run
 * roleos run list                  — list all runs
 * roleos run show <id>             — show run detail
 * roleos resume                    — resume the active run
 * roleos next                      — start the next step (or show what's next)
 * roleos explain                   — explain current run state
 * roleos complete <artifact> [note] — complete the active step
 * roleos fail <partial|failed> <reason> — fail the active step
 * roleos retry <step-index>        — retry a failed step
 * roleos reroute <step-index> <role> <reason> — reroute a step
 * roleos escalate <from> <to> <trigger> <action> — escalate
 * roleos block <step-index> <reason> — block a step
 * roleos reopen <step-index> <reason> — reopen a completed step
 * roleos report                    — generate completion report
 * roleos friction                  — measure operator friction
 */

import {
  createPersistentRun, startNext, completeCurrentStep, failCurrentStep,
  pauseRun, resumeRun, reroute, escalate, retry, blockStep, reopenStep,
  getPosition, explainRun, formatNext, generateReport, formatReport,
  loadRun, listRuns, findActiveRun, measureFriction, saveRun,
} from "./run.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCwd() {
  return process.cwd();
}

function requireActiveRun(cwd) {
  const run = findActiveRun(cwd);
  if (!run) {
    const err = new Error("No active run found. Start one with: roleos run \"<task>\"");
    err.exitCode = 1;
    throw err;
  }
  return run;
}

// ── roleos run ───────────────────────────────────────────────────────────────

export async function runCommand(args) {
  const cwd = getCwd();

  if (!args || args.length === 0) {
    console.log("Usage: roleos run \"<task description>\"");
    console.log("       roleos run list");
    console.log("       roleos run show <id>");
    return;
  }

  const sub = args[0];

  // roleos run list
  if (sub === "list") {
    const runs = listRuns(cwd);
    if (runs.length === 0) {
      console.log("No runs found.");
      return;
    }
    console.log("Runs:");
    for (const r of runs) {
      const statusIcon = r.status === "completed" ? "[x]" :
                          r.status === "running"   ? "[>]" :
                          r.status === "paused"    ? "[=]" :
                          r.status === "failed"    ? "[!]" :
                          r.status === "partial"   ? "[~]" : "[ ]";
      const task = r.task.length > 60 ? r.task.slice(0, 57) + "..." : r.task;
      console.log(`  ${statusIcon} ${r.id}  ${r.level}  ${task}`);
    }
    return;
  }

  // roleos run show <id>
  if (sub === "show") {
    const id = args[1];
    if (!id) {
      const err = new Error("Usage: roleos run show <run-id>");
      err.exitCode = 1;
      throw err;
    }
    const run = loadRun(cwd, id);
    if (!run) {
      const err = new Error(`Run "${id}" not found`);
      err.exitCode = 1;
      throw err;
    }
    console.log(explainRun(run));
    return;
  }

  // roleos run "<task>"
  const task = args.join(" ");
  const opts = {};

  // Parse --mission= and --pack= flags
  for (const arg of args) {
    if (arg.startsWith("--mission=")) {
      opts.forceMission = arg.slice("--mission=".length);
    } else if (arg.startsWith("--pack=")) {
      opts.forcePack = arg.slice("--pack=".length);
    }
  }

  // Strip flags from task description
  const taskText = args.filter(a => !a.startsWith("--")).join(" ");

  const run = createPersistentRun(taskText, cwd, opts);

  console.log(`Created run: ${run.id}`);
  console.log(`Entry: ${run.entryLevel.toUpperCase()}`);
  if (run.missionKey) console.log(`Mission: ${run.missionKey}`);
  if (run.packKey) console.log(`Pack: ${run.packKey}`);
  console.log(`Steps: ${run.steps.length}`);
  console.log("");

  // Auto-start the first step
  const step = startNext(run, cwd);
  if (step) {
    console.log(`Started step 0: ${step.role} → ${step.produces}`);
    console.log("");
    if (step.guidance) console.log(step.guidance);
  }
}

// ── roleos resume ────────────────────────────────────────────────────────────

export async function resumeCommand(args) {
  const cwd = getCwd();

  let run;
  if (args && args[0]) {
    run = loadRun(cwd, args[0]);
    if (!run) {
      const err = new Error(`Run "${args[0]}" not found`);
      err.exitCode = 1;
      throw err;
    }
  } else {
    run = requireActiveRun(cwd);
  }

  if (run.status === "paused") {
    const step = resumeRun(run, cwd);
    console.log(`Resumed run: ${run.id}`);
    if (step) {
      console.log(`Active: step ${step.index} — ${step.role} → ${step.produces}`);
      if (step.guidance) {
        console.log("");
        console.log(step.guidance);
      }
    }
  } else if (run.status === "running") {
    const pos = getPosition(run);
    if (pos.activeStep) {
      console.log(`Run already active: step ${pos.activeStep.index} — ${pos.activeStep.role}`);
      if (pos.activeStep.guidance) {
        console.log("");
        console.log(pos.activeStep.guidance);
      }
    }
  } else {
    console.log(`Run is "${run.status}" — cannot resume.`);
  }
}

// ── roleos next ──────────────────────────────────────────────────────────────

export async function nextCommand(args) {
  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const pos = getPosition(run);

  // If there's an active step, just show it
  if (pos.activeStep) {
    console.log(formatNext(run));
    return;
  }

  // If there's a next pending step, start it
  if (pos.nextStep) {
    const step = startNext(run, cwd);
    if (step) {
      console.log(`Started step ${step.index}: ${step.role} → ${step.produces}`);
      console.log(`Progress: ${pos.completedCount + 0}/${pos.totalSteps}`);
      if (step.guidance) {
        console.log("");
        console.log(step.guidance);
      }
    }
    return;
  }

  console.log(formatNext(run));
}

// ── roleos explain ───────────────────────────────────────────────────────────

export async function explainCommand(args) {
  const cwd = getCwd();

  let run;
  if (args && args[0]) {
    run = loadRun(cwd, args[0]);
    if (!run) {
      const err = new Error(`Run "${args[0]}" not found`);
      err.exitCode = 1;
      throw err;
    }
  } else {
    run = requireActiveRun(cwd);
  }

  console.log(explainRun(run));
}

// ── roleos complete ──────────────────────────────────────────────────────────

export async function completeCommand(args) {
  if (!args || args.length === 0) {
    const err = new Error("Usage: roleos complete <artifact-reference> [note]");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const artifact = args[0];
  const note = args.slice(1).join(" ") || null;

  const step = completeCurrentStep(run, artifact, note, cwd);
  console.log(`Completed step ${step.index}: ${step.role} → ${step.produces}`);

  const pos = getPosition(run);
  if (pos.nextStep) {
    console.log(`Next: step ${pos.nextStep.index} — ${pos.nextStep.role} → ${pos.nextStep.produces}`);
    console.log(`Run \`roleos next\` to start.`);
  } else if (run.status === "completed") {
    console.log("All steps completed. Run `roleos report` for the completion report.");
  }
}

// ── roleos fail ──────────────────────────────────────────────────────────────

export async function failCommand(args) {
  if (!args || args.length < 2) {
    const err = new Error("Usage: roleos fail <partial|failed> <reason>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const status = args[0];
  const reason = args.slice(1).join(" ");

  const step = failCurrentStep(run, status, reason, cwd);
  console.log(`Step ${step.index} (${step.role}): ${status}`);
  console.log(`Reason: ${reason}`);

  const blocked = run.steps.filter(s => s.status === "blocked");
  if (blocked.length > 0) {
    console.log(`Blocked ${blocked.length} downstream step(s).`);
  }
}

// ── Intervention commands ────────────────────────────────────────────────────

export async function retryCommand(args) {
  if (!args || args.length === 0) {
    const err = new Error("Usage: roleos retry <step-index>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const stepIndex = parseInt(args[0], 10);

  retry(run, stepIndex, cwd);
  console.log(`Retried step ${stepIndex} (${run.steps[stepIndex].role}). Run \`roleos next\` to start.`);
}

export async function rerouteCommand(args) {
  if (!args || args.length < 3) {
    const err = new Error("Usage: roleos reroute <step-index> <new-role> <reason>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const stepIndex = parseInt(args[0], 10);
  const newRole = args[1];
  const reason = args.slice(2).join(" ");

  reroute(run, stepIndex, newRole, reason, cwd);
  console.log(`Rerouted step ${stepIndex} to ${newRole}.`);
}

export async function escalateCommand(args) {
  if (!args || args.length < 4) {
    const err = new Error("Usage: roleos escalate <from-role> <to-role> <trigger> <action>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const [from, to, trigger, ...rest] = args;
  const action = rest.join(" ");

  const result = escalate(run, from, to, trigger, action, cwd);
  if (result.reopened) {
    console.log(`Escalated: ${from} → ${to}. Step re-opened for ${trigger}.`);
  } else {
    console.log(`Escalation recorded: ${from} → ${to}.`);
    if (result.warning) console.log(`Warning: ${result.warning}`);
  }
}

export async function blockCommand(args) {
  if (!args || args.length < 2) {
    const err = new Error("Usage: roleos block <step-index> <reason>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const stepIndex = parseInt(args[0], 10);
  const reason = args.slice(1).join(" ");

  blockStep(run, stepIndex, reason, cwd);
  console.log(`Blocked step ${stepIndex} (${run.steps[stepIndex].role}): ${reason}`);
}

export async function reopenCommand(args) {
  if (!args || args.length < 2) {
    const err = new Error("Usage: roleos reopen <step-index> <reason>");
    err.exitCode = 1;
    throw err;
  }

  const cwd = getCwd();
  const run = requireActiveRun(cwd);
  const stepIndex = parseInt(args[0], 10);
  const reason = args.slice(1).join(" ");

  reopenStep(run, stepIndex, reason, cwd);
  console.log(`Re-opened step ${stepIndex} (${run.steps[stepIndex].role}): ${reason}`);
}

// ── roleos report ────────────────────────────────────────────────────────────

export async function reportCommand(args) {
  const cwd = getCwd();
  let run;

  if (args && args[0]) {
    run = loadRun(cwd, args[0]);
    if (!run) {
      const err = new Error(`Run "${args[0]}" not found`);
      err.exitCode = 1;
      throw err;
    }
  } else {
    run = requireActiveRun(cwd);
  }

  const report = generateReport(run);
  saveRun(cwd, run);
  console.log(formatReport(report));
}

// ── roleos friction ──────────────────────────────────────────────────────────

export async function frictionCommand(args) {
  const cwd = getCwd();
  let run;

  if (args && args[0]) {
    run = loadRun(cwd, args[0]);
    if (!run) {
      const err = new Error(`Run "${args[0]}" not found`);
      err.exitCode = 1;
      throw err;
    }
  } else {
    run = requireActiveRun(cwd);
  }

  const friction = measureFriction(run);
  console.log("# Friction Report");
  console.log(`Total touches: ${friction.totalTouches}`);
  console.log(`  Interventions: ${friction.interventions}`);
  console.log(`  Escalations: ${friction.escalations}`);
  console.log(`  Manual steps: ${friction.manualSteps}`);
  console.log(`  Steps with notes: ${friction.stepsWithNotes}`);
  console.log(`Friction score: ${friction.frictionScore.toUpperCase()}`);
}
