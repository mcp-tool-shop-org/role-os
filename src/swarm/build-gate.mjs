/**
 * Build Gate — Detects build system and runs lint/typecheck/test verification.
 *
 * After every swarm wave, the build gate runs to ensure changes didn't break anything.
 * Auto-detects the build system from project files and runs appropriate commands.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// ── Build system detection ──────────────────────────────────────────────────

/**
 * Detect the build system and available verification commands.
 * @param {string} cwd - Repository root directory
 * @returns {{ type: string, lintCmd: string|null, typecheckCmd: string|null, testCmd: string|null }}
 */
export function detectBuildSystem(cwd) {
  // Node.js (package.json)
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const scripts = pkg.scripts || {};
      return {
        type: "node",
        lintCmd: scripts.lint ? "npm run lint" : null,
        typecheckCmd: scripts.typecheck ? "npm run typecheck" : (scripts["type-check"] ? "npm run type-check" : null),
        testCmd: scripts.test ? "npm test" : null,
      };
    } catch {
      // Fall through
    }
  }

  // Rust (Cargo.toml)
  if (existsSync(join(cwd, "Cargo.toml"))) {
    return {
      type: "rust",
      lintCmd: "cargo clippy --all-targets -- -D warnings",
      typecheckCmd: "cargo check",
      testCmd: "cargo test",
    };
  }

  // Python (pyproject.toml or setup.py)
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "setup.py"))) {
    const hasRuff = existsSync(join(cwd, "pyproject.toml")) &&
      readFileSync(join(cwd, "pyproject.toml"), "utf8").includes("[tool.ruff]");
    return {
      type: "python",
      lintCmd: hasRuff ? "ruff check ." : null,
      typecheckCmd: null,
      testCmd: "pytest",
    };
  }

  // Go (go.mod)
  if (existsSync(join(cwd, "go.mod"))) {
    return {
      type: "go",
      lintCmd: "golangci-lint run",
      typecheckCmd: "go vet ./...",
      testCmd: "go test ./...",
    };
  }

  return { type: "unknown", lintCmd: null, typecheckCmd: null, testCmd: null };
}

// ── Build gate execution ────────────────────────────────────────────────────

/**
 * Run the build gate: lint → typecheck → test.
 * @param {string} cwd - Repository root directory
 * @param {object} [options]
 * @param {object} [options.buildSystem] - Override auto-detected build system
 * @param {number} [options.timeout] - Per-command timeout in ms (default: 120000)
 * @returns {{ pass: boolean, vacuous: boolean, reason: string|null, lint: StepResult, typecheck: StepResult, test: StepResult, duration: number }}
 *
 * @typedef {{ status: "pass"|"fail"|"skip", output: string, duration: number }} StepResult
 */
export function runBuildGate(cwd, options = {}) {
  const bs = options.buildSystem || detectBuildSystem(cwd);
  const timeout = options.timeout || 120_000;
  const start = Date.now();

  const lint = runStep(bs.lintCmd, cwd, timeout);
  const typecheck = runStep(bs.typecheckCmd, cwd, timeout);
  const test = runStep(bs.testCmd, cwd, timeout);

  // A gate that ran nothing verified nothing — fail loudly instead of
  // passing vacuously, so an undetected build system can't silently
  // disable the after-every-wave safety check (ANDON_AUTHORITY).
  const vacuous = lint.status === "skip" && typecheck.status === "skip" && test.status === "skip";
  const pass = !vacuous &&
    lint.status !== "fail" && typecheck.status !== "fail" && test.status !== "fail";

  return {
    pass,
    vacuous,
    reason: vacuous
      ? `No verification commands found (build system: ${bs.type}) — the gate could not verify anything. Add lint/typecheck/test commands or pass options.buildSystem.`
      : null,
    lint,
    typecheck,
    test,
    duration: Date.now() - start,
  };
}

/**
 * Run a single build step.
 * @param {string|null} cmd
 * @param {string} cwd
 * @param {number} timeout
 * @returns {StepResult}
 */
function runStep(cmd, cwd, timeout) {
  if (!cmd) return { status: "skip", output: "", duration: 0 };

  const start = Date.now();
  try {
    const output = execSync(cmd, {
      cwd,
      timeout,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: "pass", output: output.slice(0, 2000), duration: Date.now() - start };
  } catch (err) {
    const output = (err.stdout || "") + "\n" + (err.stderr || "");
    return { status: "fail", output: output.slice(0, 2000), duration: Date.now() - start };
  }
}
