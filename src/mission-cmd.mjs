/**
 * Mission CLI — Phase S (v1.8.0)
 *
 * roleos mission list              List all missions
 * roleos mission show <key>        Show full mission detail
 * roleos mission suggest <text>    Suggest a mission for a task
 * roleos mission validate          Validate all missions are properly wired
 * roleos mission validate <key>    Validate a specific mission
 */

import {
  listMissions,
  getMission,
  suggestMission,
  validateMission,
  validateAllMissions,
  MISSIONS,
} from "./mission.mjs";

/**
 * @param {string[]} args
 */
export async function missionCommand(args) {
  const sub = args[0];

  switch (sub) {
    case "list":
      return cmdList();
    case "show":
      return cmdShow(args[1]);
    case "suggest":
      return cmdSuggest(args.slice(1).join(" "));
    case "validate":
      return cmdValidate(args[1]);
    default: {
      const err = new Error(
        `Usage: roleos mission <list|show|suggest|validate>\n` +
        `  list              List all missions\n` +
        `  show <key>        Show full mission detail\n` +
        `  suggest <text>    Suggest a mission for a task description\n` +
        `  validate [key]    Validate mission wiring`
      );
      err.exitCode = 1;
      err.hint = "Run 'roleos mission list' to see available missions.";
      throw err;
    }
  }
}

function cmdList() {
  const missions = listMissions();
  console.log("\nMission Library\n");
  console.log("  Key                  Pack        Roles  Description");
  console.log("  " + "-".repeat(78));
  for (const m of missions) {
    const key = m.key.padEnd(20);
    const pack = m.pack.padEnd(10);
    const roles = String(m.roleCount).padEnd(6);
    console.log(`  ${key} ${pack} ${roles} ${m.description}`);
  }
  console.log(`\n  ${missions.length} missions. Run 'roleos mission show <key>' for details.\n`);
}

function cmdShow(key) {
  if (!key) {
    const err = new Error("Usage: roleos mission show <key>");
    err.exitCode = 1;
    err.hint = `Available: ${Object.keys(MISSIONS).join(", ")}`;
    throw err;
  }

  const mission = getMission(key);
  if (!mission) {
    const err = new Error(`Mission "${key}" not found`);
    err.exitCode = 1;
    err.hint = `Available: ${Object.keys(MISSIONS).join(", ")}`;
    throw err;
  }

  console.log(`\n# ${mission.name}`);
  console.log(`\n${mission.description}`);
  console.log(`\nPack: ${mission.pack}`);
  console.log(`Entry: ${mission.entryPath}`);

  console.log("\n## Role Chain");
  for (let i = 0; i < mission.roleChain.length; i++) {
    const arrow = i < mission.roleChain.length - 1 ? " →" : "";
    console.log(`  ${i + 1}. ${mission.roleChain[i]}${arrow}`);
  }

  console.log("\n## Artifact Flow");
  for (const step of mission.artifactFlow) {
    const to = step.consumedBy ? ` → ${step.consumedBy}` : " (terminal)";
    console.log(`  ${step.role} produces "${step.produces}"${to}`);
  }

  console.log("\n## Escalation Branches");
  for (const branch of mission.escalationBranches) {
    console.log(`  [${branch.trigger}] ${branch.from} → ${branch.to}: ${branch.action}`);
  }

  console.log("\n## Honest Partial");
  console.log(`  ${mission.honestPartial}`);

  console.log("\n## Stop Conditions");
  for (const cond of mission.stopConditions) {
    console.log(`  - ${cond}`);
  }

  console.log(`\n## Dispatch Defaults`);
  const d = mission.dispatchDefaults;
  console.log(`  Model: ${d.model} | Max turns: ${d.maxTurns} | Budget: $${d.maxBudgetUsd}`);

  if (mission.trialEvidence) {
    console.log(`\n## Trial Evidence`);
    console.log(`  ${mission.trialEvidence}`);
  }

  console.log("");
}

function cmdSuggest(text) {
  if (!text) {
    const err = new Error("Usage: roleos mission suggest <task description>");
    err.exitCode = 1;
    err.hint = "Describe what you want to do and I'll suggest a mission.";
    throw err;
  }

  const suggestion = suggestMission(text);
  if (!suggestion) {
    console.log("\nNo mission matched. Task may need manual routing.\n");
    console.log("Available missions:");
    for (const key of Object.keys(MISSIONS)) {
      console.log(`  - ${key}: ${MISSIONS[key].description}`);
    }
    console.log("");
    return;
  }

  const mission = getMission(suggestion.mission);
  console.log(`\nSuggested mission: ${suggestion.mission}`);
  console.log(`Name: ${mission.name}`);
  console.log(`Confidence: ${suggestion.confidence}`);
  console.log(`Reason: ${suggestion.reason}`);
  console.log(`Pack: ${mission.pack}`);
  console.log(`Chain: ${mission.roleChain.join(" → ")}`);
  console.log(`\nRun 'roleos mission show ${suggestion.mission}' for full details.\n`);
}

function cmdValidate(key) {
  if (key) {
    const result = validateMission(key);
    if (result.valid) {
      console.log(`\n[PASS] Mission "${key}" is properly wired.\n`);
    } else {
      console.log(`\n[FAIL] Mission "${key}" has issues:`);
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
      console.log("");
      process.exit(1);
    }
  } else {
    const { allValid, results } = validateAllMissions();
    console.log("\nMission Validation\n");
    for (const [k, r] of Object.entries(results)) {
      const icon = r.valid ? "[PASS]" : "[FAIL]";
      console.log(`  ${icon} ${k}`);
      if (!r.valid) {
        for (const issue of r.issues) {
          console.log(`         - ${issue}`);
        }
      }
    }
    console.log(`\n  ${Object.keys(results).length} missions checked. ${allValid ? "All valid." : "Some issues found."}\n`);
    if (!allValid) process.exit(1);
  }
}
