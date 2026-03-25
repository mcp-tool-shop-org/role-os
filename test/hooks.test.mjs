import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateHooksConfig,
  getSessionState,
  saveSessionState,
  onSessionStart,
  onPromptSubmit,
  onPreToolUse,
  onSubagentStart,
  onStop,
  scaffoldHooks,
} from "../src/hooks.mjs";

const __dirname = import.meta.dirname || dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-hooks");

function cleanup() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
}

function setup() {
  cleanup();
  mkdirSync(join(TEST_DIR, ".claude", "hooks"), { recursive: true });
  mkdirSync(join(TEST_DIR, ".claude", "agents"), { recursive: true });
}

// ── Config generation ─────────────────────────────────────────────────────────

describe("generateHooksConfig", () => {
  it("generates config with all 5 lifecycle hooks", () => {
    const config = generateHooksConfig();
    assert.ok(config.hooks.SessionStart);
    assert.ok(config.hooks.UserPromptSubmit);
    assert.ok(config.hooks.PreToolUse);
    assert.ok(config.hooks.SubagentStart);
    assert.ok(config.hooks.Stop);
  });

  it("each hook has a command entry", () => {
    const config = generateHooksConfig();
    for (const [event, matchers] of Object.entries(config.hooks)) {
      assert.ok(matchers[0].hooks[0].command, `${event} missing command`);
      assert.ok(matchers[0].hooks[0].command.includes(".claude/hooks/"), `${event} command path wrong`);
    }
  });
});

// ── Session state ─────────────────────────────────────────────────────────────

describe("session state", () => {
  before(setup);
  afterEach(cleanup);

  it("returns empty state when no file exists", () => {
    setup();
    const state = getSessionState(TEST_DIR);
    assert.equal(state.routeCardPresent, false);
    assert.equal(state.promptCount, 0);
  });

  it("saves and reads state", () => {
    setup();
    const state = { routeCardPresent: true, activeRole: "Test Engineer", promptCount: 5 };
    saveSessionState(TEST_DIR, state);
    const loaded = getSessionState(TEST_DIR);
    assert.equal(loaded.routeCardPresent, true);
    assert.equal(loaded.activeRole, "Test Engineer");
  });
});

// ── SessionStart ──────────────────────────────────────────────────────────────

describe("onSessionStart", () => {
  before(setup);
  afterEach(cleanup);

  it("initializes session state", () => {
    setup();
    onSessionStart({ cwd: TEST_DIR, session_id: "test-123" });
    const state = getSessionState(TEST_DIR);
    assert.equal(state.sessionId, "test-123");
    assert.ok(state.startedAt);
    assert.equal(state.routeCardPresent, false);
  });

  it("adds context when Role OS is initialized", () => {
    setup();
    const result = onSessionStart({ cwd: TEST_DIR });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("Role OS"));
  });

  it("returns empty when Role OS is not initialized", () => {
    cleanup();
    mkdirSync(TEST_DIR, { recursive: true });
    const result = onSessionStart({ cwd: TEST_DIR });
    assert.equal(result.addContext, undefined);
  });
});

// ── UserPromptSubmit ──────────────────────────────────────────────────────────

describe("onPromptSubmit", () => {
  before(setup);
  afterEach(cleanup);

  it("increments prompt count", () => {
    setup();
    saveSessionState(TEST_DIR, { promptCount: 0, substantivePrompts: 0 });
    onPromptSubmit({ cwd: TEST_DIR, prompt: "hello" });
    const state = getSessionState(TEST_DIR);
    assert.equal(state.promptCount, 1);
  });

  it("classifies substantial prompts", () => {
    setup();
    saveSessionState(TEST_DIR, { promptCount: 0, substantivePrompts: 0 });
    onPromptSubmit({ cwd: TEST_DIR, prompt: "implement the roleos execute command that reads dispatch manifests and shows the plan" });
    const state = getSessionState(TEST_DIR);
    assert.equal(state.substantivePrompts, 1);
  });

  it("does not classify short prompts as substantial", () => {
    setup();
    saveSessionState(TEST_DIR, { promptCount: 0, substantivePrompts: 0 });
    onPromptSubmit({ cwd: TEST_DIR, prompt: "what is this?" });
    const state = getSessionState(TEST_DIR);
    assert.equal(state.substantivePrompts, 0);
  });

  it("warns on 2nd substantial prompt without route card", () => {
    setup();
    saveSessionState(TEST_DIR, { promptCount: 1, substantivePrompts: 1, routeCardPresent: false });
    const result = onPromptSubmit({ cwd: TEST_DIR, prompt: "now implement the second feature with tests and full documentation updates" });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("route card"));
  });

  it("does not warn when route card is present", () => {
    setup();
    saveSessionState(TEST_DIR, { promptCount: 1, substantivePrompts: 1, routeCardPresent: true });
    const result = onPromptSubmit({ cwd: TEST_DIR, prompt: "implement the feature with tests and full documentation updates please" });
    assert.equal(result.addContext, undefined);
  });
});

// ── PreToolUse ────────────────────────────────────────────────────────────────

describe("onPreToolUse", () => {
  before(setup);
  afterEach(cleanup);

  it("records tool usage", () => {
    setup();
    saveSessionState(TEST_DIR, { toolsUsed: [], substantivePrompts: 0 });
    onPreToolUse({ cwd: TEST_DIR, tool_name: "Read" });
    const state = getSessionState(TEST_DIR);
    assert.ok(state.toolsUsed.includes("Read"));
  });

  it("flags write tools without route card after substantial work", () => {
    setup();
    saveSessionState(TEST_DIR, { toolsUsed: [], routeCardPresent: false, substantivePrompts: 3 });
    const result = onPreToolUse({ cwd: TEST_DIR, tool_name: "Bash" });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("Bash"));
  });

  it("does not flag read-only tools", () => {
    setup();
    saveSessionState(TEST_DIR, { toolsUsed: [], routeCardPresent: false, activeRole: "Test", activePack: "feature", substantivePrompts: 3 });
    const result = onPreToolUse({ cwd: TEST_DIR, tool_name: "Read" });
    assert.ok(!result.addContext || result.allow);
  });
});

// ── SubagentStart ─────────────────────────────────────────────────────────────

describe("onSubagentStart", () => {
  before(setup);
  afterEach(cleanup);

  it("injects role context when active", () => {
    setup();
    saveSessionState(TEST_DIR, { activeRole: "Backend Engineer", activePack: "feature" });
    const result = onSubagentStart({ cwd: TEST_DIR });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("Backend Engineer"));
  });

  it("returns empty when no active role", () => {
    setup();
    saveSessionState(TEST_DIR, { activeRole: null });
    const result = onSubagentStart({ cwd: TEST_DIR });
    assert.equal(result.addContext, undefined);
  });
});

// ── Stop ──────────────────────────────────────────────────────────────────────

describe("onStop", () => {
  before(setup);
  afterEach(cleanup);

  it("warns when substantial session ends without route card", () => {
    setup();
    saveSessionState(TEST_DIR, { substantivePrompts: 3, routeCardPresent: false, outcomeRecorded: false });
    const result = onStop({ cwd: TEST_DIR });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("route card"));
  });

  it("warns when no outcome recorded", () => {
    setup();
    saveSessionState(TEST_DIR, { substantivePrompts: 3, routeCardPresent: true, outcomeRecorded: false });
    const result = onStop({ cwd: TEST_DIR });
    assert.ok(result.addContext);
    assert.ok(result.addContext.includes("outcome"));
  });

  it("does not warn for trivial sessions", () => {
    setup();
    saveSessionState(TEST_DIR, { substantivePrompts: 1, routeCardPresent: false, outcomeRecorded: false });
    const result = onStop({ cwd: TEST_DIR });
    assert.equal(result.addContext, undefined);
  });

  it("passes clean when both artifacts present", () => {
    setup();
    saveSessionState(TEST_DIR, { substantivePrompts: 5, routeCardPresent: true, outcomeRecorded: true });
    const result = onStop({ cwd: TEST_DIR });
    assert.equal(result.addContext, undefined);
  });
});

// ── scaffoldHooks ─────────────────────────────────────────────────────────────

describe("scaffoldHooks", () => {
  before(setup);
  afterEach(cleanup);

  it("creates all 5 hook scripts", () => {
    setup();
    const result = scaffoldHooks(TEST_DIR);
    assert.equal(result.created.length, 5);
    assert.ok(existsSync(join(TEST_DIR, ".claude", "hooks", "session-start.mjs")));
    assert.ok(existsSync(join(TEST_DIR, ".claude", "hooks", "prompt-submit.mjs")));
    assert.ok(existsSync(join(TEST_DIR, ".claude", "hooks", "pre-tool-use.mjs")));
    assert.ok(existsSync(join(TEST_DIR, ".claude", "hooks", "subagent-start.mjs")));
    assert.ok(existsSync(join(TEST_DIR, ".claude", "hooks", "stop.mjs")));
  });

  it("does not overwrite existing scripts", () => {
    setup();
    scaffoldHooks(TEST_DIR);
    const result = scaffoldHooks(TEST_DIR);
    assert.equal(result.created.length, 0);
    assert.equal(result.skipped.length, 5);
  });
});
