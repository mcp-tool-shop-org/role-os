#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "../src/init.mjs";
import { packetCommand } from "../src/packet.mjs";
import { routeCommand } from "../src/route.mjs";
import { reviewCommand } from "../src/review.mjs";
import { statusCommand } from "../src/status.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")).version;

function printHelp() {
  console.log(`
roleos v${VERSION} — Role OS bootstrap CLI

Usage:
  roleos init                        Scaffold Role OS into .claude/
  roleos init --force                Update canonical files (protects context/)
  roleos packet new <type>           Create a new packet (feature|integration|identity)
  roleos route <packet-file>         Recommend the smallest valid chain
  roleos review <packet-file> <verdict>  Record a review verdict
  roleos status                      Show active work, verdicts, and health
  roleos status --write              Write .claude/status/index.md
  roleos status --json               Output as JSON
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
    case "init":
      await initCommand(args);
      break;
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
