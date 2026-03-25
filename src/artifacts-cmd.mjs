/**
 * CLI surface for artifact contracts — roleos artifacts
 *
 * Subcommands:
 * - artifacts (bare) — list all roles with contracts
 * - artifacts show <role> — display artifact contract
 * - artifacts validate <role> <file> — validate file against contract
 * - artifacts chain <pack> — show pack handoff flow
 */

import { readFileSync, existsSync } from "node:fs";
import {
  ROLE_ARTIFACT_CONTRACTS,
  PACK_HANDOFF_CONTRACTS,
  validateArtifact,
  getArtifactContract,
  getHandoffContract,
  formatArtifactValidation,
  formatPackChain,
  validatePackChain,
} from "./artifacts.mjs";

/**
 * Main command handler.
 * @param {string[]} args
 */
export async function artifactsCommand(args) {
  const sub = args[0];

  if (!sub || sub === "list") {
    runList();
  } else if (sub === "show") {
    runShow(args.slice(1));
  } else if (sub === "validate") {
    runValidate(args.slice(1));
  } else if (sub === "chain") {
    runChain(args.slice(1));
  } else {
    const err = new Error(`Unknown artifacts subcommand: "${sub}"`);
    err.exitCode = 1;
    err.hint = "Valid subcommands: list, show <role>, validate <role> <file>, chain <pack>";
    throw err;
  }
}

function runList() {
  const roles = Object.entries(ROLE_ARTIFACT_CONTRACTS);
  console.log(`\nRole artifact contracts (${roles.length} roles)\n`);
  console.log(`${"Role".padEnd(25)} ${"Artifact Type".padEnd(22)} ${"Required".padEnd(8)} Consumed By`);
  console.log(`${"─".repeat(25)} ${"─".repeat(22)} ${"─".repeat(8)} ${"─".repeat(30)}`);

  for (const [role, contract] of roles) {
    const consumers = contract.consumedBy.length > 0 ? contract.consumedBy.join(", ") : "terminal";
    console.log(
      `${role.padEnd(25)} ${contract.artifactType.padEnd(22)} ${String(contract.requiredSections.length).padEnd(8)} ${consumers}`
    );
  }
}

function runShow(args) {
  if (args.length === 0) {
    const err = new Error("Missing role name.");
    err.exitCode = 1;
    err.hint = "Usage: roleos artifacts show <role-name>";
    throw err;
  }

  const input = args.join(" ");
  const roleName = resolveRoleName(input);
  if (!roleName) {
    const err = new Error(`No artifact contract for role "${input}".`);
    err.exitCode = 1;
    err.hint = `Available roles: ${Object.keys(ROLE_ARTIFACT_CONTRACTS).join(", ")}`;
    throw err;
  }

  const contract = getArtifactContract(roleName);

  console.log(`\nArtifact Contract — ${roleName}\n`);
  console.log(`Type: ${contract.artifactType}`);
  console.log(`Required sections: ${contract.requiredSections.join(", ")}`);
  if (contract.optionalSections.length > 0) {
    console.log(`Optional sections: ${contract.optionalSections.join(", ")}`);
  }
  if (contract.requiredEvidence.length > 0) {
    console.log(`Required evidence: ${contract.requiredEvidence.join(", ")}`);
  }
  console.log(`Consumed by: ${contract.consumedBy.length > 0 ? contract.consumedBy.join(", ") : "terminal (no downstream consumer)"}`);
  console.log(`Completion rule: ${contract.completionRule}`);
}

function runValidate(args) {
  if (args.length < 2) {
    const err = new Error("Missing arguments.");
    err.exitCode = 1;
    err.hint = "Usage: roleos artifacts validate <role-name> <file-path>";
    throw err;
  }

  // Last arg is the file, everything before is the role name
  const filePath = args[args.length - 1];
  const roleArgs = args.slice(0, -1);
  const roleName = resolveRoleName(roleArgs.join(" "));

  if (!roleName) {
    const err = new Error(`Unknown role: "${roleArgs.join(" ")}".`);
    err.exitCode = 1;
    err.hint = `Available roles: ${Object.keys(ROLE_ARTIFACT_CONTRACTS).join(", ")}`;
    throw err;
  }

  if (!existsSync(filePath)) {
    const err = new Error(`File not found: "${filePath}".`);
    err.exitCode = 1;
    err.hint = "Provide a path to the artifact file to validate.";
    throw err;
  }

  const content = readFileSync(filePath, "utf-8");
  const validation = validateArtifact(roleName, content);
  console.log(formatArtifactValidation(roleName, validation));

  if (!validation.valid) {
    process.exitCode = 1;
  }
}

function runChain(args) {
  const packName = args[0];
  if (!packName) {
    const err = new Error("Missing pack name.");
    err.exitCode = 1;
    err.hint = `Usage: roleos artifacts chain <pack-name>. Available: ${Object.keys(PACK_HANDOFF_CONTRACTS).join(", ")}`;
    throw err;
  }

  const contract = getHandoffContract(packName);
  if (!contract) {
    const err = new Error(`No handoff contract for pack "${packName}".`);
    err.exitCode = 1;
    err.hint = `Available packs: ${Object.keys(PACK_HANDOFF_CONTRACTS).join(", ")}`;
    throw err;
  }

  console.log(`\nHandoff Contract — ${packName} pack\n`);
  console.log(`${"Step".padEnd(5)} ${"Role".padEnd(25)} ${"Produces".padEnd(22)} Consumed By`);
  console.log(`${"─".repeat(5)} ${"─".repeat(25)} ${"─".repeat(22)} ${"─".repeat(25)}`);

  contract.flow.forEach((step, i) => {
    const consumer = step.consumedBy || "terminal";
    console.log(
      `${String(i + 1).padEnd(5)} ${step.role.padEnd(25)} ${step.produces.padEnd(22)} ${consumer}`
    );
  });
}

/**
 * Resolve a role name from user input.
 * Handles both exact names ("Product Strategist") and slug forms ("product-strategist").
 */
function resolveRoleName(input) {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // Exact match
  if (ROLE_ARTIFACT_CONTRACTS[trimmed]) return trimmed;

  // Case-insensitive match
  for (const role of Object.keys(ROLE_ARTIFACT_CONTRACTS)) {
    if (role.toLowerCase() === trimmed.toLowerCase()) return role;
  }

  // Slug match (product-strategist → Product Strategist)
  const slugToName = trimmed.replace(/-/g, " ");
  for (const role of Object.keys(ROLE_ARTIFACT_CONTRACTS)) {
    if (role.toLowerCase() === slugToName.toLowerCase()) return role;
  }

  return null;
}
