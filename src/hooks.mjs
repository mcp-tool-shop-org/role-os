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
import { schemaFloor, contractFloor } from "./specialist/conformance-consult.mjs";
import { capabilityGate } from "./specialist/capability-gate.mjs";

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
  const defaults = {
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
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8"));
      // Merge over the default shape: a PARTIAL state file (e.g. created from {} by the generated
      // prompt-submit script when SessionStart never ran) must not crash the library hook functions
      // — the generated scripts guard field-by-field; the library tolerates the same files.
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...defaults, ...parsed };
      }
    } catch { /* fall through */ }
  }
  return defaults;
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

const TOOL_CONTRACTS_FILE = ".claude/role-os/tool-contracts.json";

/**
 * Load the Tool-Call Conformance contract catalog from the repo (the rollout's per-tool knowledge base):
 * { "<tool_name>": { contract, params, constraints, state_struct? } }. Fail-safe — a missing or malformed
 * file yields {} (conformance simply does not run), so this never breaks a tool call.
 * @param {string} cwd
 * @returns {Record<string, object>}
 */
export function loadToolContracts(cwd) {
  try {
    const p = join(cwd, TOOL_CONTRACTS_FILE);
    if (!existsSync(p)) return {};
    return JSON.parse(readFileSync(p, "utf-8")) || {};
  } catch {
    return {};
  }
}

/**
 * Deterministic conformance ADVISORY for a tool call — wedge #1's live seam. Runs the schema floor
 * (L1-L3) + the computable contract floor (L4) against the catalogued tool. Returns an advisory string
 * only when the floor PROVES a violation; otherwise null. Never throws, never denies — the watcher is
 * advisory + fail-open by design (a false "conformant" is the costly error, never a blocked good call).
 */
export function conformanceAdvisory(cwd, toolName, toolInput, opts = {}) {
  try {
    const catalog = opts.toolContracts || loadToolContracts(cwd);
    const entry = catalog && catalog[toolName];
    if (!entry) return null;
    const tool = { name: toolName, contract: entry.contract, params: entry.params || [], constraints: entry.constraints || [] };
    const call = toolInput && typeof toolInput === "object" ? toolInput : {};
    const v = [...schemaFloor(tool, call).violations, ...contractFloor(tool, call, entry.state_struct || null).violations];
    if (!v.length) return null;
    return `Tool-Call Conformance (advisory): the "${toolName}" call appears NONCONFORMANT — ${v.join("; ")}. The deterministic floor proved this; review before relying on the result.`;
  } catch {
    return null; // a hook must never break a tool call
  }
}

/**
 * PreToolUse hook logic.
 * Records tool usage, flags write tools without a route card, and (wedge #1) attaches an ADVISORY
 * Tool-Call Conformance verdict from the deterministic floor when the tool is catalogued. Advisory only
 * — it never denies a call.
 *
 * @param {object} input - { tool_name, tool_input, session_id, cwd }
 * @param {object} [opts] - { toolContracts } to inject a catalog (tests); defaults to loadToolContracts(cwd)
 * @returns {{ allow?: boolean, deny?: { reason: string }, addContext?: string }}
 */
export function onPreToolUse(input, opts = {}) {
  const cwd = input.cwd || process.cwd();
  const state = getSessionState(cwd);
  const toolName = input.tool_name || "";

  // Record tool usage
  if (!state.toolsUsed.includes(toolName)) {
    state.toolsUsed.push(toolName);
    saveSessionState(cwd, state);
  }

  // Capability gate (opt-in via ROLEOS_CAPABILITY_GATE, fail-closed): an irreversible action without
  // a granted capability is DENIED — bounds what a wrong verdict (honest or adversarial) can DO
  // (POLA / CaMeL). Default OFF => pure no-op. Distinct from the advisory conformance floor below.
  const cap = capabilityGate(cwd, toolName, input.tool_input, opts);
  if (cap.denied) return { deny: { reason: cap.reason } };

  const notes = [];

  // Advisory: flag write tools without route card after substantial prompts
  const writeTools = ["Bash", "Write", "Edit", "NotebookEdit"];
  if (writeTools.includes(toolName) && !state.routeCardPresent && (state.substantivePrompts || 0) >= 2) {
    notes.push(`Write tool "${toolName}" used without a route card. If this is substantial work, consider routing first.`);
  }

  // Wedge #1: deterministic conformance floor (advisory, fail-open) on the proposed call
  const conf = conformanceAdvisory(cwd, toolName, input.tool_input, opts);
  if (conf) notes.push(conf);

  // If a role is active, read-only tools are always fine
  if (state.activeRole && state.activePack) {
    const readOnlyTools = ["Read", "Glob", "Grep", "WebSearch", "WebFetch"];
    if (readOnlyTools.includes(toolName)) {
      return notes.length ? { allow: true, addContext: notes.join(" ") } : { allow: true };
    }
  }

  return notes.length ? { addContext: notes.join(" ") } : {};
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

const input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}");
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
  // SessionStart wire protocol (current Claude Code): hookSpecificOutput.additionalContext + exit 0.
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "Role OS is active. For non-trivial tasks, run /roleos-route first.",
    },
  }));
}
process.exit(0);
`;
}

function generatePromptSubmitScript() {
  return `#!/usr/bin/env node
// Role OS UserPromptSubmit hook — classify before improvising
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}");
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
  // UserPromptSubmit wire protocol (current Claude Code): hookSpecificOutput.additionalContext + exit 0.
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "No Role OS route card yet. Consider /roleos-route to classify this task.",
    },
  }));
}
process.exit(0);
`;
}

function generatePreToolUseScript() {
  return `#!/usr/bin/env node
// Role OS PreToolUse hook — role tool law + capability gate (fail-closed) + conformance floor (advisory).
// SELF-CONTAINED: stdlib-only. A bare role-os import specifier resolves in NO npx/global-install
// consumer repo (the package has no "exports" self-reference), so the fail-closed gate logic is
// INLINED below — a security control must never depend on a best-effort import. Internal failures
// warn on stderr (once per repo, marker-file throttled); they are never a silent catch.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");
const toolName = input.tool_name || "";

// One-time stderr warning: degraded hook behavior must be VISIBLE, but must not spam every call.
function warnOnce(key, message) {
  let line = "[role-os hook] " + message;
  try {
    const marker = join(cwd, ".claude", "hooks", "." + key + ".warned");
    if (existsSync(marker)) return; // already surfaced in this repo
    writeFileSync(marker, new Date().toISOString() + " " + message + "\\n");
  } catch (err) {
    line += " (warn-marker write failed: " + err.message + ")";
  }
  process.stderr.write(line + "\\n");
}

// ── Capability gate (opt-in via ROLEOS_CAPABILITY_GATE, FAIL-CLOSED) ─────────────────────────────
// Inlined gated set + grant law — keep in sync with src/specialist/capability-gate.mjs in the
// role-os repo. A gated irreversible action (NAMED_COMPENSATORS list) with no matching grant in
// .claude/role-os/capabilities.json is DENIED (exit 2 blocks). Default OFF => pure no-op. The
// patterns allow flags between command word and verb without crossing a shell separator; an
// unparseable "expires" DENIES (a typo'd date must never become a permanent grant).
const gateEnabled = process.env.ROLEOS_CAPABILITY_GATE === "1" || process.env.ROLEOS_CAPABILITY_GATE === "true";
if (gateEnabled && toolName === "Bash") {
  const command = (input.tool_input && typeof input.tool_input.command === "string") ? input.tool_input.command : "";
  const GATED = [
    { id: "npm:publish", label: "npm/pnpm/yarn publish", re: /\\b(?:npm|pnpm|yarn)\\b[^|;&\\n]*\\bpublish\\b/ },
    { id: "pypi:publish", label: "PyPI publish (twine/uv)", re: /\\btwine\\b[^|;&\\n]*\\bupload\\b|\\buv\\b[^|;&\\n]*\\bpublish\\b/ },
    { id: "gh:release", label: "gh release create", re: /\\bgh\\b[^|;&\\n]*\\brelease\\b[^|;&\\n]*\\bcreate\\b/ },
    { id: "gh:pr-create", label: "gh pr create", re: /\\bgh\\b[^|;&\\n]*\\bpr\\b[^|;&\\n]*\\bcreate\\b/ },
    { id: "gh:repo-edit", label: "gh repo edit/delete", re: /\\bgh\\b[^|;&\\n]*\\brepo\\b[^|;&\\n]*\\b(?:edit|delete)\\b/ },
    { id: "git:push", label: "git push", re: /\\bgit\\b[^|;&\\n]*\\bpush\\b/ },
    { id: "pages:deploy", label: "GitHub Pages / gh-pages deploy", re: /\\bgh-pages\\b|\\bpages\\b[^|;&\\n]*\\bdeploy\\b/ },
  ];
  const action = command ? GATED.find((a) => a.re.test(command)) : undefined;
  if (action) {
    let problem = null;
    try {
      const capPath = join(cwd, ".claude", "role-os", "capabilities.json");
      const manifest = existsSync(capPath) ? JSON.parse(readFileSync(capPath, "utf-8")) : {};
      const g = manifest && typeof manifest === "object" ? manifest[action.id] : undefined;
      if (!g || typeof g !== "object" || g.granted !== true) {
        problem = 'No capability "' + action.id + '" is granted in .claude/role-os/capabilities.json';
      } else if (typeof g.expires === "string") {
        const t = Date.parse(g.expires);
        if (Number.isNaN(t)) {
          problem = 'the grant for "' + action.id + '" has an unparseable "expires" ("' + g.expires + '") — an invalid expiry DENIES (fail-closed), it never extends the grant; fix the date';
        } else if (t < Date.now()) {
          problem = 'the grant for "' + action.id + '" expired at ' + g.expires;
        }
      }
    } catch (err) {
      // FAIL CLOSED: a gated action whose grant cannot be evaluated is denied, with the cause named.
      problem = "the grant could not be evaluated (" + err.message + ") — failing closed on an irreversible action";
    }
    if (problem) {
      process.stderr.write(
        'Capability gate: "' + action.label + '" is an irreversible action requiring an explicit grant. ' +
        problem + '. To authorize it, the director adds {"' + action.id + '": {"granted": true}} to ' +
        '.claude/role-os/capabilities.json, optionally with an "expires" date. (The gate enforces only ' +
        '"granted"/"expires" — a grant authorizes ALL matching ' + action.label + ' calls; a "scope" field is informational only.)\\n'
      );
      process.exit(2);
    }
  }
}

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); }
  catch (err) {
    warnOnce("session-state-unreadable", "session-state.json was unreadable (" + err.message + ") — continuing with fresh session state.");
    state = {};
  }
}

if (!state.toolsUsed) state.toolsUsed = [];
if (!state.toolsUsed.includes(toolName)) {
  state.toolsUsed.push(toolName);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

const notes = [];
const writeTools = ["Bash", "Write", "Edit", "NotebookEdit"];
if (writeTools.includes(toolName) && !state.routeCardPresent && (state.substantivePrompts || 0) >= 2) {
  notes.push(\`Write tool "\${toolName}" used without route card. Consider /roleos-route.\`);
}

// Tool-Call Conformance floor (advisory, deterministic, fail-open). Runs only when this tool has a
// .claude/role-os/tool-contracts.json catalog entry AND the role-os library is installed where this
// repo can resolve it (local node_modules). Unlike the inlined capability gate above (fail-closed),
// the advisory floor may degrade — but it must SAY so once on stderr, never silently no-op.
try {
  const catPath = join(cwd, ".claude", "role-os", "tool-contracts.json");
  if (existsSync(catPath)) {
    const catalog = JSON.parse(readFileSync(catPath, "utf-8"));
    const entry = catalog && catalog[toolName];
    if (entry) {
      const libPath = join(cwd, "node_modules", "role-os", "src", "specialist", "conformance-consult.mjs");
      if (!existsSync(libPath)) {
        warnOnce("conformance-lib-unresolvable", "tool-contracts.json catalogs this tool but the role-os library is not installed locally (" + libPath + " not found) — the advisory conformance floor is OFF. Run: npm i -D role-os");
      } else {
        const { schemaFloor, contractFloor } = await import(pathToFileURL(libPath).href);
        const tool = { name: toolName, contract: entry.contract, params: entry.params || [], constraints: entry.constraints || [] };
        const call = (input.tool_input && typeof input.tool_input === "object") ? input.tool_input : {};
        const v = [...schemaFloor(tool, call).violations, ...contractFloor(tool, call, entry.state_struct || null).violations];
        if (v.length) notes.push(\`Tool-Call Conformance (advisory): "\${toolName}" appears NONCONFORMANT — \${v.join("; ")}.\`);
      }
    }
  }
} catch (err) {
  // Advisory stays fail-open (never blocks a call) but never SILENT: surface the failure once.
  warnOnce("conformance-floor-error", "Tool-Call Conformance advisory errored (" + err.message + ") — the advisory floor was skipped.");
}

// PreToolUse wire protocol (current Claude Code): inject advisory context via
// hookSpecificOutput.additionalContext + exit 0. A bare { addContext } is IGNORED; exit 2 would BLOCK.
if (notes.length) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: notes.join(" ") },
  }));
}
process.exit(0);
`;
}

function generateSubagentStartScript() {
  return `#!/usr/bin/env node
// Role OS SubagentStart hook — inject role contract
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}");
const cwd = input.cwd || process.cwd();
const statePath = join(cwd, ".claude", "hooks", "session-state.json");

let state = {};
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, "utf-8")); } catch {}
}

if (state.activeRole) {
  // SubagentStart wire protocol (current Claude Code): hookSpecificOutput.additionalContext + exit 0.
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: \`Role OS active. Role: \${state.activeRole}. Pack: \${state.activePack || "free routing"}. Follow role contract.\`,
    },
  }));
}
process.exit(0);
`;
}

function generateStopScript() {
  return `#!/usr/bin/env node
// Role OS Stop hook — prevent false completion
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync(0, "utf-8").toString() || "{}");
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
  // Stop wire protocol (current Claude Code): advisory context via hookSpecificOutput.additionalContext
  // + exit 0 lets the session end with a note. { decision: "block" } would PREVENT stopping (not wanted here).
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: \`Role OS audit: \${warnings.join(" ")} Consider documenting the outcome.\`,
    },
  }));
}
process.exit(0);
`;
}
