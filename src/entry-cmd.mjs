/**
 * Entry CLI — Phase T (v1.9.0)
 *
 * roleos start <task description>     Decide best entry path automatically
 * roleos start --json <text>          Output as JSON
 */

import { decideEntry, formatEntryDecision } from "./entry.mjs";

/**
 * @param {string[]} args
 */
export async function startCommand(args) {
  const isJson = args.includes("--json");
  const textArgs = args.filter(a => a !== "--json");
  const text = textArgs.join(" ").trim();

  if (!text) {
    const err = new Error(
      "Usage: roleos start <task description>\n" +
      "  Decides whether to route through a mission, pack, or free routing.\n\n" +
      "Examples:\n" +
      '  roleos start "fix the crash in save handler"\n' +
      '  roleos start "add a new export command"\n' +
      '  roleos start "run the full treatment before publishing"'
    );
    err.exitCode = 1;
    err.hint = "Describe the task you want to accomplish.";
    throw err;
  }

  const decision = decideEntry(text);

  if (isJson) {
    console.log(JSON.stringify(decision, null, 2));
  } else {
    console.log("");
    console.log(formatEntryDecision(decision));
    console.log("");

    // Action guidance
    if (decision.level === "mission") {
      console.log("Next steps:");
      console.log(`  1. roleos mission show ${decision.mission.key}     # review the mission`);
      console.log(`  2. Create a packet and start working through the mission steps`);
      console.log(`  3. Use the mission runner to track progress and artifacts`);
    } else if (decision.level === "pack") {
      console.log("Next steps:");
      console.log(`  1. roleos packs show ${decision.pack.key}          # review the pack`);
      console.log(`  2. roleos packet new feature                       # create a packet`);
      console.log(`  3. roleos route <packet> --pack=${decision.pack.key}   # route with pack`);
    } else {
      console.log("Next steps:");
      console.log("  1. roleos packet new feature                       # create a packet");
      console.log("  2. roleos route <packet>                           # free routing");
    }
    console.log("");
  }
}
