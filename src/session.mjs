/**
 * Session Spine — Phase Q (v1.4.0)
 *
 * Makes Role-OS the session substrate, not just a package.
 * Scaffolds CLAUDE.md instructions, skills, and hooks so that
 * Claude Code enters every session through role-os routing.
 *
 * Extension points used:
 * - CLAUDE.md: project instructions loaded at session start
 * - .claude/commands/: slash commands (skills) invokable by user or auto-matched
 * - Hooks: lifecycle events configured in settings
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileSafe } from "./fs-utils.mjs";
import { scaffoldHooks, generateHooksConfig } from "./hooks.mjs";

// ── roleos init claude ────────────────────────────────────────────────────────

/**
 * Scaffold Claude Code integration files into a repo.
 * Creates: CLAUDE.md addition, /roleos-route command, and session guidance.
 *
 * @param {string} cwd - Working directory
 * @param {object} [options]
 * @param {boolean} [options.force] - Overwrite existing files
 * @returns {{ created: string[], skipped: string[] }}
 */
export function scaffoldClaude(cwd, options = {}) {
  const created = [];
  const skipped = [];

  // 1. CLAUDE.md — session entry instructions
  const claudeMd = join(cwd, "CLAUDE.md");
  const claudeContent = generateClaudeMd();
  if (!existsSync(claudeMd) || options.force) {
    writeFileSync(claudeMd, claudeContent);
    created.push("CLAUDE.md");
  } else {
    // Append role-os section if not already present
    const existing = readFileSync(claudeMd, "utf-8");
    if (!existing.includes("## Role OS")) {
      writeFileSync(claudeMd, existing + "\n\n" + claudeContent);
      created.push("CLAUDE.md (appended)");
    } else {
      skipped.push("CLAUDE.md (Role OS section already present)");
    }
  }

  // 2. Slash command: /roleos-route
  const cmdDir = join(cwd, ".claude", "commands");
  mkdirSync(cmdDir, { recursive: true });
  const routeCmd = join(cmdDir, "roleos-route.md");
  if (!existsSync(routeCmd) || options.force) {
    writeFileSync(routeCmd, generateRouteCommand());
    created.push(".claude/commands/roleos-route.md");
  } else {
    skipped.push(".claude/commands/roleos-route.md");
  }

  // 3. Slash command: /roleos-review
  const reviewCmd = join(cmdDir, "roleos-review.md");
  if (!existsSync(reviewCmd) || options.force) {
    writeFileSync(reviewCmd, generateReviewCommand());
    created.push(".claude/commands/roleos-review.md");
  } else {
    skipped.push(".claude/commands/roleos-review.md");
  }

  // 4. Slash command: /roleos-status
  const statusCmd = join(cmdDir, "roleos-status.md");
  if (!existsSync(statusCmd) || options.force) {
    writeFileSync(statusCmd, generateStatusCommand());
    created.push(".claude/commands/roleos-status.md");
  } else {
    skipped.push(".claude/commands/roleos-status.md");
  }

  // 5. Hook scripts
  const hookResult = scaffoldHooks(cwd);
  created.push(...hookResult.created);
  skipped.push(...hookResult.skipped);

  // 6. Settings.json with hooks config
  const settingsPath = join(cwd, ".claude", "settings.local.json");
  if (!existsSync(settingsPath) || options.force) {
    const hooksConfig = generateHooksConfig();
    writeFileSync(settingsPath, JSON.stringify(hooksConfig, null, 2));
    created.push(".claude/settings.local.json");
  } else {
    // Check if hooks are already configured
    try {
      const existing = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (!existing.hooks) {
        const hooksConfig = generateHooksConfig();
        existing.hooks = hooksConfig.hooks;
        writeFileSync(settingsPath, JSON.stringify(existing, null, 2));
        created.push(".claude/settings.local.json (hooks added)");
      } else {
        skipped.push(".claude/settings.local.json (hooks already configured)");
      }
    } catch {
      skipped.push(".claude/settings.local.json (could not parse existing)");
    }
  }

  return { created, skipped };
}

// ── roleos doctor ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DoctorCheck
 * @property {string} name
 * @property {"pass"|"fail"|"warn"} status
 * @property {string} detail
 */

/**
 * Verify that a repo is correctly wired for Role-OS session integration.
 *
 * @param {string} cwd
 * @returns {{ checks: DoctorCheck[], healthy: boolean }}
 */
export function doctor(cwd) {
  const checks = [];

  // Check 1: .claude/ directory exists
  const claudeDir = join(cwd, ".claude");
  checks.push({
    name: ".claude/ directory",
    status: existsSync(claudeDir) ? "pass" : "fail",
    detail: existsSync(claudeDir) ? "exists" : "missing — run roleos init first",
  });

  // Check 2: CLAUDE.md exists and has Role OS section
  const claudeMd = join(cwd, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    const content = readFileSync(claudeMd, "utf-8");
    if (content.includes("## Role OS")) {
      checks.push({ name: "CLAUDE.md Role OS section", status: "pass", detail: "present" });
    } else {
      checks.push({ name: "CLAUDE.md Role OS section", status: "warn", detail: "CLAUDE.md exists but has no Role OS section — run roleos init claude" });
    }
  } else {
    checks.push({ name: "CLAUDE.md", status: "fail", detail: "missing — run roleos init claude" });
  }

  // Check 3: /roleos-route command exists
  const routeCmd = join(cwd, ".claude", "commands", "roleos-route.md");
  checks.push({
    name: "/roleos-route command",
    status: existsSync(routeCmd) ? "pass" : "fail",
    detail: existsSync(routeCmd) ? "exists" : "missing — run roleos init claude",
  });

  // Check 4: Context files exist
  const contextDir = join(cwd, ".claude", "context");
  const contextFiles = ["product-brief.md", "repo-map.md", "brand-rules.md", "current-priorities.md"];
  const filledContext = contextFiles.filter(f => {
    const path = join(contextDir, f);
    if (!existsSync(path)) return false;
    const content = readFileSync(path, "utf-8");
    // Check if it's still a template (all comments, no real content)
    const lines = content.split("\n").filter(l => l.trim() && !l.trim().startsWith("#") && !l.trim().startsWith("<!--") && !l.trim().startsWith("//"));
    return lines.length > 2;
  });

  if (filledContext.length === 4) {
    checks.push({ name: "context files", status: "pass", detail: "all 4 filled" });
  } else if (filledContext.length > 0) {
    checks.push({ name: "context files", status: "warn", detail: `${filledContext.length}/4 filled — empty context reduces routing quality` });
  } else {
    checks.push({ name: "context files", status: "fail", detail: "no context files filled — routing will be low-confidence" });
  }

  // Check 5: Role contracts exist
  const agentsDir = join(cwd, ".claude", "agents");
  if (existsSync(agentsDir)) {
    checks.push({ name: "role contracts", status: "pass", detail: "agents/ directory exists" });
  } else {
    checks.push({ name: "role contracts", status: "fail", detail: "no agents/ directory — run roleos init first" });
  }

  // Check 6: Packets directory exists
  const packetsDir = join(cwd, ".claude", "packets");
  checks.push({
    name: "packets directory",
    status: existsSync(packetsDir) ? "pass" : "warn",
    detail: existsSync(packetsDir) ? "exists" : "no packets yet — run roleos packet new",
  });

  // Check 7: Hook scripts exist
  const hooksDir = join(cwd, ".claude", "hooks");
  const hookFiles = ["session-start.mjs", "prompt-submit.mjs", "pre-tool-use.mjs", "subagent-start.mjs", "stop.mjs"];
  const existingHooks = hookFiles.filter(f => existsSync(join(hooksDir, f)));
  if (existingHooks.length === hookFiles.length) {
    checks.push({ name: "hook scripts", status: "pass", detail: `all ${hookFiles.length} hooks present` });
  } else if (existingHooks.length > 0) {
    checks.push({ name: "hook scripts", status: "warn", detail: `${existingHooks.length}/${hookFiles.length} hooks present` });
  } else {
    checks.push({ name: "hook scripts", status: "warn", detail: "no hooks — run roleos init claude for runtime enforcement" });
  }

  // Check 8: Settings has hooks configured
  const settingsPath = join(cwd, ".claude", "settings.local.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (settings.hooks) {
        checks.push({ name: "hooks in settings", status: "pass", detail: "configured" });
      } else {
        checks.push({ name: "hooks in settings", status: "warn", detail: "settings.local.json exists but no hooks section" });
      }
    } catch {
      checks.push({ name: "hooks in settings", status: "warn", detail: "settings.local.json exists but could not parse" });
    }
  } else {
    checks.push({ name: "hooks in settings", status: "warn", detail: "no settings.local.json — hooks not active" });
  }

  const healthy = checks.every(c => c.status !== "fail");

  return { checks, healthy };
}

// ── Route card ────────────────────────────────────────────────────────────────

/**
 * Generate a route card — the session header artifact that proves
 * role-os was engaged.
 *
 * @param {object} routeResult
 * @returns {string} Markdown route card
 */
export function generateRouteCard(routeResult) {
  const lines = [
    `## Route Card`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Task type | ${routeResult.type || "unknown"} |`,
    `| Pack | ${routeResult.pack || "free routing"} |`,
    `| Pack confidence | ${routeResult.packConfidence || "n/a"} |`,
    `| Composite | ${routeResult.isComposite ? "yes — " + routeResult.compositeReason : "no"} |`,
    `| Chain | ${routeResult.chain || "pending"} |`,
    `| Confidence | ${routeResult.confidence || "unknown"} |`,
    `| Routed at | ${new Date().toISOString()} |`,
  ];

  if (routeResult.mismatch) {
    lines.push(`| Mismatch | ${routeResult.mismatch} |`);
  }

  lines.push(``);
  lines.push(`**Why:** ${routeResult.reason || "Scored against packet content."}`);

  if (routeResult.successArtifact) {
    lines.push(``);
    lines.push(`**Success artifact:** ${routeResult.successArtifact}`);
  }

  return lines.join("\n");
}

// ── Format doctor output ──────────────────────────────────────────────────────

/**
 * @param {{ checks: DoctorCheck[], healthy: boolean }} result
 * @returns {string}
 */
export function formatDoctor(result) {
  const lines = [
    `\nRole OS Doctor`,
    `──────────────`,
  ];

  for (const check of result.checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
    lines.push(`  ${icon} ${check.name}: ${check.detail}`);
  }

  lines.push(``);
  lines.push(result.healthy
    ? `Healthy — Role OS is wired correctly.`
    : `Unhealthy — run roleos init claude to fix.`
  );

  return lines.join("\n");
}

// ── Generators ────────────────────────────────────────────────────────────────

function generateClaudeMd() {
  return `## Role OS

Before starting non-trivial work in this repo, route the task through Role OS:

1. Run \`/roleos-route\` or \`roleos route <packet-file>\` to classify the task
2. Follow the recommended pack or role chain
3. Use structured handoffs between roles
4. Review with evidence-based verdicts

Role OS provides 31 specialized roles across 8 packs (engineering, design, product, research, growth, treatment, marketing, core). It detects broken chains, auto-routes recovery, and requires structured evidence in every verdict.

If the task is composite (feature + docs + launch), Role OS will recommend splitting into child packets with dependency ordering.

**Route card required:** Every substantial task should produce a route card at the start showing task type, chosen pack/role, confidence, and expected success artifact. If no route card exists, Role OS was not engaged.
`;
}

function generateRouteCommand() {
  return `# Route Task Through Role OS

Classify the current task and recommend the right team.

## Steps

1. Read the task description or packet file
2. Run \`roleos route\` against it (or reason through the routing logic)
3. Emit a **route card** with:
   - Task type (feature / bugfix / docs / research / security / launch / treatment)
   - Recommended pack or free-routing chain
   - Why this pack/chain was chosen
   - Whether the task is composite (needs splitting)
   - Expected success artifact
   - Confidence level

## Route card format

\`\`\`
## Route Card

| Field | Value |
|-------|-------|
| Task type | feature |
| Pack | feature (high confidence) |
| Composite | no |
| Chain | Product Strategist → Spec Writer → Backend Engineer → Test Engineer → Critic Reviewer |
| Confidence | high |

**Why:** Packet contains implementation scope with clear deliverable type.
**Success artifact:** Working implementation with tests and Critic verdict.
\`\`\`

## Rules
- If confidence is low, say so — do not force a pack
- If composite, recommend splitting before execution
- If the task is trivial (< 3 steps), skip routing and just do it
- The route card is the proof Role OS was engaged
`;
}

function generateReviewCommand() {
  return `# Review Work Through Role OS

Review the completed work using Role OS structured verdict.

## Steps

1. Identify which role should review (usually Critic Reviewer)
2. Check the work against the original packet's done definition
3. Produce a structured verdict:
   - **Verdict:** accept / accept-with-notes / reject / blocked
   - **Evidence:** specific items supporting the verdict
   - **Gaps:** what's missing, if anything
   - **Next owner:** who receives this next

## Rules
- Tie every verdict to specific evidence, not impressions
- If evidence is insufficient to judge, say so
- Reject honestly — do not approve weak work to be nice
- For reject/blocked: state what must change and who should do it
`;
}

function generateStatusCommand() {
  return `# Role OS Status

Check the current state of Role OS work in this repo.

## Steps

1. Run \`roleos status\` to see active packets, verdicts, and context health
2. Report:
   - Active/blocked/completed packets
   - Recent verdicts
   - Context file health
   - Any conflicts or escalations

## If no packets exist
Role OS has not been engaged in this session. Consider running \`/roleos-route\` first.
`;
}
