import { resolve, dirname, basename } from "node:path";
import { readFileSafe, writeFileSafe } from "./fs-utils.mjs";
import { askRequired, askWithDefault, closePrompts } from "./prompts.mjs";
import { resolveBlocked, resolveRejected, formatEscalation } from "./escalation.mjs";

const VERDICTS = ["accept", "accept-with-notes", "reject", "blocked"];

export async function reviewCommand(args) {
  const packetFile = args[0];
  const verdict = args[1];

  if (!packetFile || !verdict) {
    const err = new Error(`Usage: roleos review <packet-file> <verdict>\nVerdicts: ${VERDICTS.join(" | ")}`);
    err.exitCode = 1;
    err.hint = "Provide a packet file and a verdict.";
    throw err;
  }

  if (!VERDICTS.includes(verdict)) {
    const err = new Error(`Unknown verdict: ${verdict}\nVerdicts: ${VERDICTS.join(" | ")}`);
    err.exitCode = 1;
    err.hint = `Valid verdicts: ${VERDICTS.join(", ")}`;
    throw err;
  }

  const content = readFileSafe(packetFile);
  if (content === null) {
    const err = new Error(`Packet not found: ${packetFile}`);
    err.exitCode = 1;
    err.hint = "Check the file path and try again.";
    throw err;
  }

  // Extract task ID from the packet
  const taskIdMatch = content.match(/## Task ID\n(.+)/);
  const taskId = taskIdMatch ? taskIdMatch[1].trim() : basename(packetFile, ".md");

  console.log(`\nroleos review — ${verdict}\n`);
  console.log(`Packet: ${packetFile}`);
  console.log(`Task ID: ${taskId}\n`);

  const reviewer = await askWithDefault("Reviewer role", "Critic Reviewer");
  const reason = await askRequired("Reason (tied to contract/evidence)");

  let corrections = "";
  if (verdict === "reject" || verdict === "accept-with-notes") {
    corrections = await askRequired("Required corrections");
  }

  const nextOwner = await askWithDefault("Next owner", verdict === "accept" ? "None — done" : "");

  // Contract check
  console.log("\nContract check (y/n for each):");
  const scopeRespected = await askWithDefault("  Scope respected?", "y");
  const outputComplete = await askWithDefault("  Output shape complete?", "y");
  const qualityMet = await askWithDefault("  Quality bar met?", "y");
  const risksSurfaced = await askWithDefault("  Risks surfaced honestly?", "y");
  const readyForNext = await askWithDefault("  Ready for next stage?", verdict === "accept" ? "y" : "n");

  const verdictContent = `# Review Verdict

## Reviewer
${reviewer}

## Task ID
${taskId}

## Verdict
${verdict}

## Why
${reason}

## Contract Check
- Scope respected? ${scopeRespected}
- Output shape complete? ${outputComplete}
- Quality bar met? ${qualityMet}
- Risks surfaced honestly? ${risksSurfaced}
- Ready for next stage? ${readyForNext}

${corrections ? `## Required Corrections\n${corrections}\n` : ""}## Next Owner
${nextOwner}
`;

  closePrompts();

  // Write verdict as companion file
  const packetBase = basename(packetFile, ".md");
  const verdictPath = resolve(dirname(packetFile), `${packetBase}.verdict.md`);

  const wrote = writeFileSafe(verdictPath, verdictContent, { force: true });
  if (wrote) {
    console.log(`\nVerdict recorded: ${verdictPath}`);
  }

  // ── Escalation auto-routing for blocked/rejected verdicts ──
  if (verdict === "blocked") {
    const escalation = resolveBlocked(reason);
    console.log(`\nEscalation (auto-routed):`);
    console.log(formatEscalation(escalation));
  } else if (verdict === "reject") {
    const escalation = resolveRejected(reason, reviewer);
    console.log(`\nEscalation (auto-routed):`);
    console.log(formatEscalation(escalation));
  }
}
