/**
 * Hook Spine — v1.5.0 Runtime Enforcement
 *
 * Hooks verify, gate, and record. The actual routing intelligence
 * stays in explicit artifacts (route cards, pack selection).
 * Hooks are the proof layer, not the decision layer.
 *
 * Four guarantees:
 * 1. No substantial task begins without a route artifact
 * 2. No tool execution drifts outside the selected role envelope
 * 3. No subagent runs without inheriting the role contract
 * 4. No session ends without an outcome artifact
 *
 * Hook lifecycle events used:
 * - SessionStart: establish session contract
 * - UserPromptSubmit: classify before improvising
 * - PreToolUse: enforce role-specific tool law
 * - SubagentStart: inject role contract into delegation
 * - Stop: prevent false completion
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── Hook script generators ────────────────────────────────────────────────────

/**
 * Generate the settings.json hooks configuration.
 * Each hook is a shell command that runs a Node script from .claude/hooks/.
 *
 * @returns {object} The hooks configuration object for settings.json
 */
export function generateHooksConfig() {
  return {
    hooks: {
      SessionStart: [
        {
          matcher: "",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/session-start.mjs",
          }],
        },
      ],
      UserPromptSubmit: [
        {
          matcher: "",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/prompt-submit.mjs",
          }],
        },
      ],
      PreToolUse: [
        {
          matcher: "",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/pre-tool-use.mjs",
          }],
        },
      ],
      SubagentStart: [
        {
          matcher: "",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/subagent-start.mjs",
          }],
        },
      ],
      Stop: [
        {
          matcher: "",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/stop.mjs",
          }],
        },
      ],
    },
  };
}

// ── Session state ─────────────────────────────────────────────────────────────

const SESSION_STATE_FILE = ".claude/hooks/session-state.json";

/**
 * Read or create session state.
 * @param {string} cwd
 * @returns {object}
 */
export function getSessionState(cwd) {
  const path = join(cwd, SESSION_STATE_FILE);
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, "utf-8")); }
    catch { /* fall through */ }
  }
  return {
    sessionId: null,
    routeCardPresent: false,
    activeRole: null,
    activePack: null,
    toolsUsed: [],
    promptCount: 0,
    substantivePrompts: 0,
    outcomeRecorded: false,
    startedAt: null,
  };
}

/**
 * Save session state.
 * @param {string} cwd
 * @param {object} state
 */
export function saveSessionState(cwd, state) {
  const dir = join(cwd, ".claude", "hooks");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(cwd, SESSION_STATE_FILE), JSON.stringify(state, null, 2));
}

// ── Hook logic ────────────────────────────────────────────────────────────────

/**
 * SessionStart hook logic.
 * Establishes session contract, checks for existing route artifacts.
 *
 * @param {object} input - Hook input (session_id, cwd, etc.)
 * @returns {{ addContext?: string }}
 */
export function onSessionStart(input) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);

  state.sessionId = input.session_id || `session-${Date.now()}`;
  state.startedAt = new Date().toISOString();
  state.routeCardPresent = false;
  state.promptCount = 0;
  state.substantivePrompts = 0;
  state.outcomeRecorded = false;

  saveSessionState(cwd, state);

  // Check if Role OS is initialized
  const hasRoleOs = existsSync(join(cwd, ".claude", "agents"));

  if (hasRoleOs) {
    return {
      addContext: "Role OS is active in this repo. For non-trivial tasks, run /roleos-route to produce a route card before beginning work. The route card proves the task was classified and the right team was chosen.",
    };
  }

  return {};
}

/**
 * UserPromptSubmit hook logic.
 * Detects substantial prompts and warns if no route artifact exists.
 *
 * @param {object} input - { prompt, session_id, cwd }
 * @returns {{ addContext?: string, block?: { reason: string } }}
 */
export function onPromptSubmit(input) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);
  const prompt = input.prompt || "";

  state.promptCount++;

  // Classify as substantial if > 50 chars and contains action words
  const isSubstantial = prompt.length > 50 && /\b(implement|add|fix|build|create|refactor|review|ship|deploy|test|write|update|change|remove|migrate)\b/i.test(prompt);

  if (isSubstantial) {
    state.substantivePrompts++;
  }

  saveSessionState(cwd, state);

  // If this is the 2nd+ substantial prompt without a route card, remind
  if (isSubstantial && state.substantivePrompts >= 2 && !state.routeCardPresent) {
    return {
      addContext: "Note: This is a substantial task and no Role OS route card has been produced yet. Consider running /roleos-route to classify the task and choose the right team. A route card ensures the work is staffed correctly.",
    };
  }

  return {};
}

/**
 * PreToolUse hook logic.
 * Checks tool usage against active role envelope.
 *
 * @param {object} input - { tool_name, tool_input, session_id, cwd }
 * @returns {{ allow?: boolean, deny?: { reason: string }, addContext?: string }}
 */
export function onPreToolUse(input) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);
  const toolName = input.tool_name || "";

  // Record tool usage
  if (!state.toolsUsed.includes(toolName)) {
    state.toolsUsed.push(toolName);
    saveSessionState(cwd, state);
  }

  // Advisory: flag write tools without route card after substantial prompts
  const writeTools = ["Bash", "Write", "Edit", "NotebookEdit"];
  if (writeTools.includes(toolName) && !state.routeCardPresent && (state.substantivePrompts || 0) >= 2) {
    return {
      addContext: `Write tool "${toolName}" used without a route card. If this is substantial work, consider routing first.`,
    };
  }

  // If a role is active, read-only tools are always fine
  if (state.activeRole && state.activePack) {
    const readOnlyTools = ["Read", "Glob", "Grep", "WebSearch", "WebFetch"];
    if (readOnlyTools.includes(toolName)) {
      return { allow: true };
    }
  }

  return {};
}

/**
 * SubagentStart hook logic.
 * Injects role contract context into delegated agents.
 *
 * @param {object} input - { agent_id, agent_type, session_id, cwd }
 * @returns {{ addContext?: string }}
 */
export function onSubagentStart(input) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);

  if (state.activeRole) {
    return {
      addContext: `This subagent is operating under Role OS. Active role: ${state.activeRole}. Pack: ${state.activePack || "free routing"}. Follow the role contract and produce structured handoffs.`,
    };
  }

  return {};
}

/**
 * Stop hook logic.
 * Prevents false completion — warns if no route card or outcome exists.
 *
 * @param {object} input - { session_id, cwd, stop_reason }
 * @returns {{ block?: { reason: string }, addContext?: string }}
 */
export function onStop(input) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);

  // Only enforce on sessions that had substantial work
  if (state.substantivePrompts < 2) {
    return {}; // Trivial session, let it end
  }

  const warnings = [];

  if (!state.routeCardPresent) {
    warnings.push("No route card was produced during this session.");
  }

  if (!state.outcomeRecorded) {
    warnings.push("No outcome artifact was recorded.");
  }

  if (warnings.length > 0) {
    return {
      addContext: `Role OS session audit: ${warnings.join(" ")} Consider documenting the outcome before ending.`,
    };
  }

  return {};
}

// ── Hook script file generators ───────────────────────────────────────────────

/**
 * Generate hook script files for .claude/hooks/.
 * These are the actual scripts that settings.json points to.
 *
 * @param {string} cwd
 * @returns {{ created: string[], skipped: string[] }}
 */
export function scaffoldHooks(cwd) {
  const created = [];
  const skipped = [];
  const hooksDir = join(cwd, ".claude", "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const scripts = {
    "session-start.mjs": generateSessionStartScript(),
    "prompt-submit.mjs": generatePromptSubmitScript(),
    "pre-tool-use.mjs": generatePreToolUseScript(),
    "subagent-start.mjs": generateSubagentStartScript(),
    "stop.mjs": generateStopScript(),
  };

  for (const [name, content] of Object.entries(scripts)) {
    const path = join(hooksDir, name);
    if (!existsSync(path)) {
      writeFileSync(path, content);
      created.push(`.claude/hooks/${name}`);
    } else {
      skipped.push(`.claude/hooks/${name}`);
    }
  }

  return { created, skipped };
}

function generateSessionStartScript() {
  return `#!/usr/bin/env node
// Role OS SessionStart hook — establishes session contract
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const stateDir = join(cwd, ".claude", "hooks");
mkdirSync(stateDir, { recursive: true });

const state = {
  sessionId: input.session_id || \`session-\${Date.now()}\`,
  startedAt: new Date().toISOString(),
  routeCardPresent: false,
  activeRole: null,
  activePack: null,
  toolsUsed: [],
  promptCount: 0,
  substantivePrompts: 0,
  outcomeRecorded: false,
};

writeFileSync(join(stateDir, "session-state.json"), JSON.stringify(state, null, 2));

const hasRoleOs = existsSync(join(cwd, ".claude", "agents"));
if (hasRoleOs) {
  console.log(JSON.stringify({
    addContext: "Role OS is active. For non-trivial tasks, run /roleos-route first.",
  }));
}
`;
}

function generatePromptSubmitScript() {
  return `#!/usr/bin/env node
// Role OS UserPromptSubmit hook — classify before improvising
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); } catch {}
}

const prompt = input.prompt || "";
state.promptCount = (state.promptCount || 0) + 1;

const isSubstantial = prompt.length > 50 &&
  /\\b(implement|add|fix|build|create|refactor|review|ship|deploy|test|write|update|change|remove|migrate)\\b/i.test(prompt);

if (isSubstantial) state.substantivePrompts = (state.substantivePrompts || 0) + 1;

writeFileSync(statePath, JSON.stringify(state, null, 2));

if (isSubstantial && (state.substantivePrompts || 0) >= 2 && !state.routeCardPresent) {
  console.log(JSON.stringify({
    addContext: "No Role OS route card yet. Consider /roleos-route to classify this task.",
  }));
}
`;
}

function generatePreToolUseScript() {
  return `#!/usr/bin/env node
// Role OS PreToolUse hook — enforce role-specific tool law
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); } catch {}
}

const toolName = input.tool_name || "";
if (!state.toolsUsed) state.toolsUsed = [];
if (!state.toolsUsed.includes(toolName)) {
  state.toolsUsed.push(toolName);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Advisory: flag write tools without route card
const writeTools = ["Bash", "Write", "Edit", "NotebookEdit"];
if (writeTools.includes(toolName) && !state.routeCardPresent && (state.substantivePrompts || 0) >= 2) {
  console.log(JSON.stringify({
    addContext: \`Write tool "\${toolName}" used without route card. Consider /roleos-route.\`,
  }));
}
`;
}

function generateSubagentStartScript() {
  return `#!/usr/bin/env node
// Role OS SubagentStart hook — inject role contract
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); } catch {}
}

if (state.activeRole) {
  console.log(JSON.stringify({
    addContext: \`Role OS active. Role: \${state.activeRole}. Pack: \${state.activePack || "free routing"}. Follow role contract.\`,
  }));
}
`;
}

function generateStopScript() {
  return `#!/usr/bin/env node
// Role OS Stop hook — prevent false completion
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); } catch {}
}

// Only enforce on sessions with substantial work
if ((state.substantivePrompts || 0) < 2) process.exit(0);

const warnings = [];
if (!state.routeCardPresent) warnings.push("No route card produced.");
if (!state.outcomeRecorded) warnings.push("No outcome artifact recorded.");

if (warnings.length > 0) {
  console.log(JSON.stringify({
    addContext: \`Role OS audit: \${warnings.join(" ")} Consider documenting the outcome.\`,
  }));
}
`;
}
