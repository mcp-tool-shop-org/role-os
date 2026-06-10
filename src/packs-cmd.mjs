import { listPacks, getPack, suggestPack, TEAM_PACKS } from "./packs.mjs";
import { readFileSafe } from "./fs-utils.mjs";
import { basename } from "node:path";

// ── List ──────────────────────────────────────────────────────────────────────

function runList() {
  const packs = listPacks();
  console.log(`\nroleos packs — ${packs.length} packs available\n`);
  for (const p of packs) {
    const key = p.key.padEnd(12);
    const name = p.name.padEnd(30);
    const count = `(${p.roleCount} roles)`.padEnd(12);
    console.log(`  ${key}${name}${count}${p.description}`);
  }
  console.log();
}

// ── Suggest ───────────────────────────────────────────────────────────────────

function runSuggest(packetFile) {
  if (!packetFile) {
    const err = new Error("Usage: roleos packs suggest <packet-file>");
    err.exitCode = 1;
    err.hint = "Provide the path to a packet file.";
    throw err;
  }

  const content = readFileSafe(packetFile);
  if (content === null) {
    const err = new Error(`Packet not found: ${packetFile}`);
    err.exitCode = 1;
    err.hint = "Check the file path and try again.";
    throw err;
  }

  const result = suggestPack(content);
  const filename = basename(packetFile);

  console.log(`\nroleos packs suggest — ${filename}\n`);

  if (!result) {
    console.log("No pack match found for this packet.");
    console.log("  The packet has no recognizable keyword signals.");
    console.log("  Add context or task description to improve routing.\n");
    return;
  }

  console.log(`Suggested pack: ${result.pack}`);
  console.log(`Confidence:     ${result.confidence}`);

  if (Object.keys(result.scores).length > 0) {
    console.log("\nScores:");
    const sorted = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
    for (const [packKey, score] of sorted) {
      console.log(`  ${packKey.padEnd(14)}${score}`);
    }
  }

  console.log(`\nNext: roleos route ${packetFile} --pack=${result.pack}\n`);
}

// ── Show ──────────────────────────────────────────────────────────────────────

function runShow(key) {
  if (!key) {
    const err = new Error("Usage: roleos packs show <pack-key>");
    err.exitCode = 1;
    err.hint = "Provide a pack key. Run 'roleos packs list' for options.";
    throw err;
  }

  const pack = getPack(key);
  if (!pack) {
    const validKeys = Object.keys(TEAM_PACKS).join(", ");
    const err = new Error(`Unknown pack: ${key}`);
    err.exitCode = 1;
    err.hint = `Valid pack keys: ${validKeys}`;
    throw err;
  }

  console.log(`\nroleos packs show — ${key}\n`);
  console.log(`${pack.name}`);
  console.log(`${pack.description}\n`);

  console.log(`Roles (${pack.roles.length}):`);
  pack.roles.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  console.log();

  if (pack.optionalRoles.length > 0) {
    console.log("Optional roles:");
    for (const r of pack.optionalRoles) console.log(`  - ${r}`);
  } else {
    console.log("Optional roles: None");
  }
  console.log();

  console.log(`Chain order:\n  ${pack.chainOrder}\n`);

  console.log("Required artifacts:");
  for (const a of pack.requiredArtifacts) console.log(`  - ${a}`);
  console.log();

  console.log("Stop conditions:");
  for (const s of pack.stopConditions) console.log(`  - ${s}`);
  console.log();

  console.log(`Escalation owner: ${pack.escalationOwner}\n`);

  const d = pack.dispatchDefaults;
  console.log("Dispatch defaults:");
  console.log(`  model:        ${d.model}`);
  console.log(`  maxTurns:     ${d.maxTurns}`);
  console.log(`  maxBudgetUsd: $${d.maxBudgetUsd.toFixed(2)}`);
  console.log();

  console.log(`Trial evidence: ${pack.trialEvidence}\n`);
}

// ── Command entry point ───────────────────────────────────────────────────────

export async function packsCommand(args) {
  const sub = args[0];

  switch (sub) {
    case undefined:
    case "list":
      runList();
      break;
    case "suggest":
      runSuggest(args[1]);
      break;
    case "show":
      runShow(args[1]);
      break;
    default: {
      const err = new Error(`Unknown packs subcommand: ${sub}`);
      err.exitCode = 1;
      err.hint = "Run 'roleos packs list' for available subcommands.";
      throw err;
    }
  }
}
