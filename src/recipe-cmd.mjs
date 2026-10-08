/**
 * `roleos recipe <subcommand>` — dataset recipe cards for trained roles.
 *
 *   init <role> [--out <file>] [--id <id>]   write a starting card (every standard control not-run)
 *   check <card.json> [--json]               validate; print errors, evidence gaps, control coverage, hash
 *   hash <card.json>                         print the card's sha256 (what a registry version pins)
 *   controls                                 list the standard controls and what each guards
 *
 * A card is linked to a specialist version with
 *   roleos specialist register <role> <version.json> --recipe <card.json>
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseRecipeCard, recipeTemplate, STANDARD_CONTROLS } from "./specialist/recipe-card.mjs";

export async function recipeCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "init": return initCard(rest);
    case "check": return checkCard(rest);
    case "hash": return hashCard(rest);
    case "controls": return listControls();
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      throwUsage(`unknown subcommand "${sub}"`);
  }
}

function printHelp() {
  console.log(`
roleos recipe — dataset recipe cards for trained roles

  roleos recipe init <role> [--out <file>] [--id <id>]   Write a starting card
  roleos recipe check <card.json> [--json]               Validate; show gaps, notes, controls and hash
  roleos recipe hash <card.json>                         Print the card's sha256
  roleos recipe controls                                 List the standard controls

A passed control without a measure is a gap, not an error. An inconsistent
measure (CI low above high, a point outside its CI, p outside (0, 1], nulls
below 1) is an error. shuffled-labels prints its permutation floor
1/(nulls+1), and says when a pass means the result beat every null.
same-generator-no-error can be "unresolved" when two edit methods disagree.
reversed-correction is a standard control: a pass needs the accuracy CI
entirely above 0.5. unresolved is not a pass.

Link a card to a specialist version:
  roleos specialist register <role> <version.json> --recipe <card.json>
`);
}

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) { flags[a.slice(2)] = next; i += 1; }
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

function throwUsage(detail) {
  const err = new Error(`usage: ${detail}`);
  err.exitCode = 1;
  err.hint = "Run 'roleos recipe help' for the subcommands.";
  throw err;
}

function readCard(file) {
  if (!file) throwUsage("check <card.json>");
  if (!existsSync(file)) throwUsage(`card not found: ${file}`);
  return parseRecipeCard(readFileSync(file, "utf8"));
}

function initCard(args) {
  const { flags, positional } = parseArgs(args);
  const role = positional[0];
  if (!role) throwUsage("init <role> [--out <file>]");
  const card = recipeTemplate(role, typeof flags.id === "string" ? flags.id : "");
  const text = JSON.stringify(card, null, 2) + "\n";
  if (typeof flags.out === "string") {
    if (existsSync(flags.out) && !flags.force) throwUsage(`${flags.out} exists (pass --force to overwrite)`);
    writeFileSync(flags.out, text);
    console.log(`wrote ${flags.out} — fill it in, then: roleos recipe check ${flags.out}`);
  } else {
    process.stdout.write(text);
  }
}

function checkCard(args) {
  const { flags, positional } = parseArgs(args);
  const r = readCard(positional[0]);
  if (flags.json) {
    console.log(JSON.stringify({
      ok: r.ok,
      errors: r.errors,
      warnings: r.warnings,
      notes: r.notes,
      controls: r.controls,
      sha256: r.sha256,
    }, null, 2));
  } else {
    console.log(`${r.ok ? "✓" : "✗"} ${positional[0]}${r.card?.id ? ` (${r.card.id}, role ${r.card.role})` : ""}`);
    for (const e of r.errors) console.log(`  error    ${e}`);
    for (const w of r.warnings) console.log(`  gap      ${w}`);
    for (const n of r.notes) console.log(`  note     ${n}`);
    const failed = r.controls.failed.length ? `; failed: ${r.controls.failed.join(", ")}` : "";
    const unresolved = r.controls.unresolved.length ? `; unresolved: ${r.controls.unresolved.join(", ")}` : "";
    console.log(`  controls ${r.controls.coverage} standard controls passed${failed}${unresolved}`);
    if (r.sha256) console.log(`  sha256   ${r.sha256}`);
  }
  if (!r.ok) process.exitCode = 2;
}

function hashCard(args) {
  const { positional } = parseArgs(args);
  const r = readCard(positional[0]);
  if (!r.ok) {
    console.error(`card is invalid; run 'roleos recipe check ${positional[0]}'`);
    process.exitCode = 2;
    return;
  }
  console.log(r.sha256);
}

function listControls() {
  for (const c of STANDARD_CONTROLS) console.log(`  ${c.name.padEnd(26)} ${c.guards}`);
}
