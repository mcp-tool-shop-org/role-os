#!/usr/bin/env node

import { initCommand } from "../src/init.mjs";
import { packetCommand } from "../src/packet.mjs";
import { routeCommand } from "../src/route.mjs";
import { reviewCommand } from "../src/review.mjs";

const VERSION = "1.0.0";

function printHelp() {
  console.log(`
roleos v${VERSION} — Role OS bootstrap CLI

Usage:
  roleos init                        Scaffold Role OS into .claude/
  roleos packet new <type>           Create a new packet (feature|integration|identity)
  roleos route <packet-file>         Recommend the smallest valid chain
  roleos review <packet-file> <verdict>  Record a review verdict
  roleos help                        Show this help

Verdicts: accept | accept-with-notes | reject | blocked
`);
}

const command = process.argv[2] || "help";
const args = process.argv.slice(3);

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
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  case "--version":
  case "-v":
    console.log(`roleos v${VERSION}`);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
