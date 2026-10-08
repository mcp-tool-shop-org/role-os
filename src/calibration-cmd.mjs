/**
 * `roleos calibration` — what recorded runs say about packs and role sets.
 *
 * An empty ledger prints "no recorded runs yet". It does not print zeros.
 * Below five runs a combination says "insufficient data" and has no rate.
 */

import {
  computeCalibration,
  computeCombinationStats,
  formatCalibrationReport,
  formatCombinationTable,
  readOutcomes,
} from "./calibration.mjs";

export async function calibrationCommand(args) {
  const rest = Array.isArray(args) ? args : [];
  let json = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "help" || arg === "--help" || arg === "-h") {
      printHelp();
      return;
    }
    if (typeof arg === "string" && arg.startsWith("--")) {
      const err = new Error(`Unknown flag: ${arg}`);
      err.exitCode = 1;
      err.hint = "Usage: roleos calibration [--json]";
      throw err;
    }
    const err = new Error(`Unexpected argument: ${arg}`);
    err.exitCode = 1;
    err.hint = "Usage: roleos calibration [--json]";
    throw err;
  }

  const outcomes = readOutcomes(process.cwd());
  if (outcomes.length === 0) {
    if (json) {
      console.log(JSON.stringify({ recorded: false, message: "no recorded runs yet" }));
    } else {
      console.log("no recorded runs yet");
    }
    return;
  }

  const report = computeCalibration(outcomes);
  const combinations = computeCombinationStats(outcomes);
  if (json) {
    console.log(JSON.stringify({ recorded: true, report, combinations }, null, 2));
    return;
  }
  console.log(formatCalibrationReport(report));
  console.log(formatCombinationTable(combinations));
}

function printHelp() {
  console.log(`
roleos calibration — what recorded runs say about packs and role sets

  roleos calibration [--json]
      Print the calibration report and the per-combination table.
      An empty ledger says "no recorded runs yet".
      Below 5 runs a combination says "insufficient data" and has no rate.

The pack boost is the existing clean-completion boost, and it applies only
after a pack has 5 recorded outcomes. ROLEOS_NO_CALIBRATION=1 turns that
boost off. Keyword scores only.

See starter-pack/schemas/outcome-ledger.md for the ledger line.
`);
}
