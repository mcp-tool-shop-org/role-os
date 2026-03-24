import { join } from "node:path";
import { existsSync } from "node:fs";
import { writeFileSafe } from "./fs-utils.mjs";
import { askRequired, askWithDefault, closePrompts } from "./prompts.mjs";

const TYPES = ["feature", "integration", "identity"];

const TYPICAL_CHAINS = {
  feature:
    "Orchestrator → Product Strategist → UI Designer → Backend Engineer → Frontend Developer → Test Engineer → Critic Reviewer",
  integration:
    "Orchestrator → Backend Engineer → Frontend Developer → Test Engineer → Critic Reviewer",
  identity:
    "Orchestrator → Product Strategist → UI Designer → Frontend Developer → Test Engineer → Critic Reviewer",
};

const DELIVERABLE_DEFAULTS = {
  feature: "Code",
  integration: "Code",
  identity: "Code",
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function packetCommand(args) {
  const subcommand = args[0];
  const type = args[1];

  if (subcommand !== "new") {
    console.error(`Usage: roleos packet new <type>`);
    console.error(`Types: ${TYPES.join(", ")}`);
    process.exit(1);
  }

  if (!type || !TYPES.includes(type)) {
    console.error(`Unknown packet type: ${type || "(none)"}`);
    console.error(`Types: ${TYPES.join(", ")}`);
    process.exit(1);
  }

  const claudeDir = join(".", ".claude");
  if (!existsSync(claudeDir)) {
    console.error("No .claude/ directory found. Run 'roleos init' first.");
    process.exit(1);
  }

  console.log(`\nroleos packet new ${type}\n`);

  const title = await askRequired("Title");
  const outcome = await askRequired("Requested outcome");
  const scope = await askWithDefault("Scope", "See requested outcome");
  const nonGoals = await askWithDefault("Non-goals", "None specified");
  const constraints = await askWithDefault("Constraints", "None specified");
  const inputs = await askWithDefault("Key inputs (files, docs)", "See repo map");

  const slug = slugify(title);
  const taskId = `${today()}-${slug}`;
  const chain = TYPICAL_CHAINS[type];
  const deliverable = DELIVERABLE_DEFAULTS[type];

  const content = `# Task Packet

## Task ID
${taskId}

## Title
${title}

## Requested Outcome
${outcome}

## User Intent
<!-- Why does this matter? Fill in after creation if needed. -->

## Scope
${scope}

## Non-Goals
${nonGoals}

## Inputs
${inputs}

**Verification requirement:** All referenced files, classes, and modules must be verified as live and relevant to the current product before the packet is finalized.

## Constraints
${constraints}

## Deliverable Type
${deliverable}

## Assigned Role
<!-- Assigned during routing -->

## Upstream Dependencies
<!-- Fill during routing or execution -->

**Verification requirement:** Each dependency must be confirmed against repo truth.

## Done Definition
<!-- Define concrete success criteria -->

## Open Questions
<!-- Unknowns that may block execution -->

---

## Packet Type
${type}

## Typical Chain
${chain}
`;

  const packetsDir = join(claudeDir, "packets");
  const filePath = join(packetsDir, `${taskId}.md`);

  closePrompts();

  const wrote = writeFileSafe(filePath, content);
  if (wrote) {
    console.log(`\nCreated: .claude/packets/${taskId}.md`);
    console.log(`\nNext: roleos route .claude/packets/${taskId}.md`);
  } else {
    console.error(`\nPacket already exists: ${filePath}`);
    process.exit(1);
  }
}
