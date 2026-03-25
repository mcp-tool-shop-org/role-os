#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "../src/init.mjs";
import { packetCommand } from "../src/packet.mjs";
import { routeCommand } from "../src/route.mjs";
import { reviewCommand } from "../src/review.mjs";
import { statusCommand } from "../src/status.mjs";
import { packsCommand } from "../src/packs-cmd.mjs";
import { scaffoldClaude, doctor, formatDoctor } from "../src/session.mjs";
import { artifactsCommand } from "../src/artifacts-cmd.mjs";
import { missionCommand } from "../src/mission-cmd.mjs";
import { startCommand } from "../src/entry-cmd.mjs";
import {
  runCommand, resumeCommand, nextCommand, explainCommand,
  completeCommand, failCommand, retryCommand, rerouteCommand,
  escalateCommand, blockCommand, reopenCommand, reportCommand,
  frictionCommand,
} from "../src/run-cmd.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")).version;

function printHelp() {
  console.log(`
roleos v${VERSION} — Role OS bootstrap CLI

Usage:
  roleos start <task>                 Decide entry path: mission, pack, or free routing
  roleos run "<task>"                Create and start a persistent run
  roleos run list                    List all runs
  roleos run show <id>               Show run detail
  roleos resume [id]                 Resume an interrupted run
  roleos next                        Start the next step (or show what's next)
  roleos explain [id]                Explain current run state
  roleos complete <artifact> [note]  Complete the active step
  roleos fail <partial|failed> <reason>  Fail the active step
  roleos retry <step-index>          Retry a failed step
  roleos reroute <step> <role> <reason>  Reroute a step to a different role
  roleos escalate <from> <to> <trigger> <action>  Escalate between roles
  roleos block <step-index> <reason> Block a step
  roleos reopen <step-index> <reason> Reopen a completed step
  roleos report [id]                 Generate completion report
  roleos friction [id]               Measure operator friction
  roleos init                        Scaffold Role OS into .claude/
  roleos init --force                Update canonical files (protects context/)
  roleos packet new <type>           Create a new packet (feature|integration|identity)
  roleos route <packet-file> [--verbose]  Recommend the smallest valid chain
  roleos review <packet-file> <verdict>  Record a review verdict
  roleos status                      Show active work, verdicts, and health
  roleos status --write              Write .claude/status/index.md
  roleos status --json               Output as JSON
  roleos packs list                  List all available team packs
  roleos packs suggest <packet-file> Suggest a pack for a packet
  roleos packs show <pack-key>       Show full detail for a named pack
  roleos artifacts                   List all role artifact contracts
  roleos artifacts show <role>       Show artifact contract for a role
  roleos artifacts validate <role> <file>  Validate a file against a contract
  roleos artifacts chain <pack>      Show pack handoff flow
  roleos mission list                List all missions
  roleos mission show <key>          Show full mission detail
  roleos mission suggest <text>      Suggest a mission for a task
  roleos mission validate [key]      Validate mission wiring
  roleos doctor                      Verify repo is wired for Role OS sessions
  roleos help                        Show this help

Verdicts: accept | accept-with-notes | reject | blocked
`);
}

/**
 * Structured error output. Matches shipcheck error shape:
 * code, message, hint, cause?, retryable?
 */
function handleError(err) {
  const isUserError = err.exitCode === 1;
  const code = isUserError ? "USER_ERROR" : "RUNTIME_ERROR";
  const exitCode = isUserError ? 1 : 2;

  if (process.argv.includes("--debug")) {
    console.error(err.stack || err);
  } else {
    console.error(JSON.stringify({
      code,
      message: err.message,
      hint: err.hint || null,
      retryable: false,
    }));
  }

  process.exit(exitCode);
}

const command = process.argv[2] || "help";
const args = process.argv.slice(3);

try {
  switch (command) {
    case "start":
      await startCommand(args);
      break;
    case "init":
      if (args[0] === "claude") {
        const force = args.includes("--force");
        const result = scaffoldClaude(process.cwd(), { force });
        if (result.created.length > 0) {
          console.log(`Created:`);
          result.created.forEach(f => console.log(`  + ${f}`));
        }
        if (result.skipped.length > 0) {
          console.log(`Skipped:`);
          result.skipped.forEach(f => console.log(`  ~ ${f}`));
        }
        console.log(`\nDone. Claude Code will now use Role OS for routing.\nRun: roleos doctor  to verify.`);
      } else {
        await initCommand(args);
      }
      break;
    case "doctor": {
      const result = doctor(process.cwd());
      console.log(formatDoctor(result));
      if (!result.healthy) process.exit(1);
      break;
    }
    case "packet":
      await packetCommand(args);
      break;
    case "route":
      await routeCommand(args);
      break;
    case "review":
      await reviewCommand(args);
      break;
    case "status":
      await statusCommand(args);
      break;
    case "packs":
      await packsCommand(args);
      break;
    case "artifacts":
      await artifactsCommand(args);
      break;
    case "run":
      await runCommand(args);
      break;
    case "resume":
      await resumeCommand(args);
      break;
    case "next":
      await nextCommand(args);
      break;
    case "explain":
      await explainCommand(args);
      break;
    case "complete":
      await completeCommand(args);
      break;
    case "fail":
      await failCommand(args);
      break;
    case "retry":
      await retryCommand(args);
      break;
    case "reroute":
      await rerouteCommand(args);
      break;
    case "escalate":
      await escalateCommand(args);
      break;
    case "block":
      await blockCommand(args);
      break;
    case "reopen":
      await reopenCommand(args);
      break;
    case "report":
      await reportCommand(args);
      break;
    case "friction":
      await frictionCommand(args);
      break;
    case "mission":
      await missionCommand(args);
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "--version":
    case "-v":
      console.log(`roleos v${VERSION}`);
      break;
    default: {
      const err = new Error(`Unknown command: ${command}`);
      err.exitCode = 1;
      err.hint = "Run 'roleos help' for usage.";
      throw err;
    }
  }
} catch (err) {
  handleError(err);
}
