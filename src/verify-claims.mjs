/**
 * Claims-Verification Gate — adjudicates caller-supplied claims/findings via the external
 * `ollama_verify_claims` MCP tool (ollama-intern-mcp ≥ 2.9): a cross-family Ollama Cloud
 * flagship panel (default deepseek / kimi / glm — disjoint vendor families) votes
 * CONFIRMED / REFUTED / UNCERTAIN per claim, lone-dissent-never-decides. role-os is the
 * GENERATOR; the disjoint-family panel is the sound external CRITIC (EXTERNAL_VERIFIER,
 * workflow standard #6) — reasoning-stripped by construction: the tool's claim schema is
 * strict, so the generator's argument structurally cannot ride into a juror prompt.
 *
 * Sibling to verify-citations.mjs (the CITATIONS gate via prism). Same three-tier contract,
 * keyed to FAILURE SOURCE:
 *   - weak panel (<2 cloud-served jurors)      -> advisory: escalate — every verdict on a
 *     thin panel is needs-review-grade, INCLUDING a kill; weak dominates refuted
 *   - any REFUTED (≥ min_refute_votes)         -> advisory: revise — cross-family model
 *     consensus, not determinism (the panel over-flags; re-read with the rationales in
 *     hand). `strictRefuted` opts into a blocking refuse for hard-andon pipelines.
 *   - any NEEDS_REVIEW                         -> advisory: escalate (a human owns it)
 *   - all CONFIRMED on a full panel            -> pass — still evidence, not proof
 * An unreachable verifier (no server, CLOUD_NOT_CONFIGURED, unparseable output) ESCALATES,
 * never default-accepts ("an unreachable gate is a closed gate").
 *
 * Unlike the citations gate, `blocking` here is OPT-IN (strictRefuted): the citations gate
 * reserves blocking for deterministic evidence (a paper that does not resolve); a REFUTED
 * is strong model judgment, and the doctrine keys tiers to the failure source.
 *
 * See design/verify-claims-runner.md (standards compliance + seam notes).
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

/** Max claims per call — the tool's own schema bound. More must be split, never truncated. */
export const MAX_CLAIMS = 20;
/** The tool's `reference` schema cap. */
const MAX_REFERENCE_CHARS = 20_000;
const TOOL_NAME = "ollama_verify_claims";

// ── Claim loading / normalization ────────────────────────────────────────────────────────────

/**
 * Normalize caller input into the tool's claim shape. Accepts an array of strings or of
 * objects carrying `statement` (or `claim` / `finding`). Ids are kept when present, minted
 * (`c1`, `c2`, …) when absent. Items with no usable statement are surfaced in `invalid` so a
 * malformed entry is visible, never silently dropped.
 *
 * @param {unknown} raw
 * @returns {{ claims: {id: string, statement: string}[], invalid: string[] }}
 */
export function normalizeClaims(raw) {
  const claims = [];
  const invalid = [];
  if (!Array.isArray(raw)) return { claims, invalid: ["(input is not a JSON array)"] };
  let n = 0;
  for (const item of raw) {
    let id = null;
    let statement = "";
    if (typeof item === "string") {
      statement = item.trim();
    } else if (item && typeof item === "object") {
      statement = String(item.statement ?? item.claim ?? item.finding ?? "").trim();
      if (item.id !== undefined && item.id !== null) id = String(item.id).slice(0, 64);
    }
    if (!statement) {
      invalid.push(JSON.stringify(item).slice(0, 120));
      continue;
    }
    n += 1;
    claims.push({ id: id || `c${n}`, statement: statement.slice(0, 4000) });
  }
  // Duplicate ids are refused by the tool's schema — dedupe deterministically here so a
  // caller file with repeated ids fails visibly at OUR boundary, not as a wire error.
  const seen = new Set();
  for (const c of claims) {
    if (seen.has(c.id)) invalid.push(`(duplicate claim id: ${c.id})`);
    seen.add(c.id);
  }
  return { claims, invalid };
}

// ── Gate (maps the tool's aggregate verdicts to the three tiers) ─────────────────────────────

/**
 * @typedef {object} ClaimsGateResult
 * @property {string} verdict           accept | revise | refuse | escalate
 * @property {boolean} pass             true iff verdict === "accept"
 * @property {boolean} blocking         true iff strictRefuted turned a REFUTED into refuse
 * @property {boolean} advisory         needs attention but not blocking (revise/escalate)
 * @property {object[]} claims          per-claim result (verdict, votes, jurors + rationales)
 * @property {string} [reason]
 * @property {string} [detail]
 */

/**
 * Map an `ollama_verify_claims` result (envelope.result) to the three-tier gate.
 * Precedence: malformed/empty -> escalate; weak -> escalate (dominates refuted — a thin
 * panel must not decide anything, including a kill); refuted -> revise (or refuse under
 * strictRefuted); needs_review -> escalate; else accept.
 *
 * @param {object} verifyResult  the tool's VerifyClaimsResult ({claims, panel, weak, …})
 * @param {{strictRefuted?: boolean}} [opts]
 * @returns {ClaimsGateResult}
 */
export function gateClaims(verifyResult, opts = {}) {
  const strictRefuted = opts.strictRefuted === true;
  if (!verifyResult || typeof verifyResult !== "object" || !Array.isArray(verifyResult.claims)) {
    return escalateResult("malformed_verifier_output", "verifier returned no claims array", []);
  }
  const claims = verifyResult.claims.map((c) => ({
    id: c.id ?? null,
    statement: c.statement ?? "",
    verdict: c.verdict,
    confidence: c.confidence,
    refute_votes: c.refute_votes ?? 0,
    confirm_votes: c.confirm_votes ?? 0,
    uncertain_votes: c.uncertain_votes ?? 0,
    jurors: Array.isArray(c.jurors)
      ? c.jurors.map((j) => ({
          model: j.model,
          verdict: j.verdict,
          severity: j.severity,
          rationale: j.rationale,
        }))
      : [],
  }));
  // An "accept" carrying ZERO adjudicated claims is not trusted (the wire is an untrusted
  // boundary input — same discipline as the citations gate).
  if (claims.length === 0) {
    return escalateResult("no_adjudicated_claims", "verifier returned zero adjudicated claims", claims);
  }
  // Weak dominates everything, including a REFUTED kill: the tool's own contract says a
  // <2-juror panel makes every verdict needs-review-grade.
  if (verifyResult.weak === true) {
    return escalateResult(
      "weak_panel",
      verifyResult.summary || "fewer than 2 jurors were cloud-served — verdicts are needs-review-grade",
      claims,
    );
  }
  const refuted = claims.filter((c) => c.verdict === "REFUTED");
  if (refuted.length > 0) {
    if (strictRefuted) {
      return {
        verdict: "refuse",
        pass: false,
        blocking: true,
        advisory: false,
        reason: "refuted_claims",
        detail: `${refuted.length} claim(s) REFUTED by the cross-family panel (strict mode)`,
        claims,
      };
    }
    return {
      verdict: "revise",
      pass: false,
      blocking: false,
      advisory: true,
      reason: "refuted_claims",
      detail: `${refuted.length} claim(s) REFUTED — re-read with the juror rationales in hand (the panel over-flags)`,
      claims,
    };
  }
  const needsReview = claims.filter((c) => c.verdict === "NEEDS_REVIEW");
  if (needsReview.length > 0) {
    return escalateResult(
      "needs_review",
      `${needsReview.length} claim(s) the panel could not settle`,
      claims,
    );
  }
  return { verdict: "accept", pass: true, blocking: false, advisory: false, claims };
}

function escalateResult(reason, detail, claims) {
  return { verdict: "escalate", pass: false, blocking: false, advisory: true, reason, detail, claims };
}

// ── MCP stdio transport (the external verifier stays an external PROCESS) ────────────────────

/**
 * Resolve how to spawn the intern MCP server. Order:
 *   1. explicit `internCmd` option / INTERN_MCP_CMD env — path to an executable, spawned
 *      with no args (the server speaks MCP on stdio by default)
 *   2. a locally-installed `ollama-intern-mcp` package — run its dist entry under the
 *      current node (works on every platform; no .cmd-shim problem)
 *   3. bare `ollama-intern-mcp` on PATH (POSIX; on Windows the npm shim is a .cmd that
 *      spawn cannot exec — use option 1 or 2 there)
 * @returns {{cmd: string, args: string[]} | null}
 */
export function resolveInternCmd(internCmd) {
  const explicit = internCmd || process.env.INTERN_MCP_CMD;
  if (explicit) {
    // A .js/.mjs entry runs under the current node — Windows cannot exec a
    // script file directly, and this lets a dev repo's dist/index.js serve.
    return /\.(mjs|cjs|js)$/i.test(explicit)
      ? { cmd: process.execPath, args: [explicit] }
      : { cmd: explicit, args: [] };
  }
  try {
    const req = createRequire(import.meta.url);
    const entry = req.resolve("ollama-intern-mcp/dist/index.js");
    return { cmd: process.execPath, args: [entry] };
  } catch {
    /* not installed locally — fall through to PATH */
  }
  return { cmd: "ollama-intern-mcp", args: [] };
}

/**
 * Minimal MCP stdio client: spawn the server, initialize, tools/call once, kill.
 * Newline-delimited JSON-RPC (the MCP stdio framing). Any failure — spawn error, timeout,
 * protocol error, tool isError — returns `{ok:false, code?, detail}`; the caller escalates.
 *
 * @param {object} args
 * @param {string} args.toolName
 * @param {object} args.toolArgs
 * @param {string} [args.internCmd]
 * @param {number} [args.timeoutMs]
 * @param {object} [args.env]        extra env for the child (inherits process.env)
 * @returns {Promise<{ok: true, envelope: object} | {ok: false, code?: string, detail: string}>}
 */
export function callInternTool({ toolName, toolArgs, internCmd, timeoutMs = 240_000, env = {} }) {
  const resolved = resolveInternCmd(internCmd);
  return new Promise((resolveP) => {
    let child;
    try {
      child = spawn(resolved.cmd, resolved.args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...env },
      });
    } catch (err) {
      resolveP({ ok: false, detail: `failed to spawn ${resolved.cmd}: ${err.code || err.message}` });
      return;
    }
    let settled = false;
    let buf = "";
    let stderrTail = "";
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* already dead */
      }
      resolveP(result);
    };
    const timer = setTimeout(() => {
      finish({
        ok: false,
        detail: `intern MCP call timed out after ${timeoutMs}ms (cloud jury calls are slow; raise --timeout if the panel legitimately needs longer)`,
      });
    }, timeoutMs);

    child.on("error", (err) => {
      const hint =
        err.code === "ENOENT"
          ? ` — ollama-intern-mcp not found. Install it (npm i -g ollama-intern-mcp, or as a dependency) or set INTERN_MCP_CMD / --intern-cmd to the server executable.`
          : "";
      finish({ ok: false, detail: `failed to spawn ${resolved.cmd}: ${err.code || err.message}${hint}` });
    });
    child.on("exit", (code) => {
      if (!settled) {
        finish({
          ok: false,
          detail: `intern MCP server exited (code ${code}) before answering. stderr: ${stderrTail.slice(0, 300)}`,
        });
      }
    });
    child.stderr.on("data", (c) => {
      stderrTail += c.toString("utf8");
      if (stderrTail.length > 4000) stderrTail = stderrTail.slice(-4000);
    });
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue; // non-JSON stdout noise — ignore
        }
        if (msg.id !== 1) continue; // only the tools/call response matters
        if (msg.error) {
          finish({ ok: false, detail: `JSON-RPC error: ${msg.error.message || JSON.stringify(msg.error)}` });
          return;
        }
        const content = msg.result?.content;
        const text = Array.isArray(content) && content[0]?.type === "text" ? content[0].text : null;
        if (typeof text !== "string" || text.length === 0) {
          finish({ ok: false, detail: "tools/call returned no text content" });
          return;
        }
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          finish({ ok: false, detail: `tools/call content was not JSON: ${text.slice(0, 200)}` });
          return;
        }
        if (msg.result?.isError) {
          // Structured intern error ({code, message, hint}) — surface the code so the gate
          // can name CLOUD_NOT_CONFIGURED distinctly.
          finish({
            ok: false,
            code: payload.code || "TOOL_ERROR",
            detail: [payload.message, payload.hint].filter(Boolean).join(" — ").slice(0, 500) || text.slice(0, 300),
          });
          return;
        }
        finish({ ok: true, envelope: payload });
      }
    });

    const send = (obj) => child.stdin.write(`${JSON.stringify(obj)}\n`);
    send({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "roleos-verify-claims", version: "1" },
      },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: toolArgs } });
  });
}

// ── Runner (orchestrates load -> tools/call -> gate -> receipt) ──────────────────────────────

/**
 * Run the claims gate over a claims file (.json array) or an in-memory array.
 *
 * @param {string|Array} input           path to a .json claims file, or the array itself
 * @param {object} [options]
 * @param {string[]} [options.sources]        file paths -> the tool's source_paths (shared evidence)
 * @param {string} [options.reference]        ground truth (test output, lint, measured facts)
 * @param {string[]} [options.panel]          juror override (Ollama Cloud model ids)
 * @param {number} [options.minRefuteVotes]   the tool's min_refute_votes
 * @param {boolean} [options.strictRefuted]   REFUTED becomes blocking refuse (default false)
 * @param {string} [options.internCmd]        server executable (default: resolveInternCmd order)
 * @param {number} [options.timeoutMs]        per-call ms (default 240000 — a cloud jury is slow)
 * @param {Function} [options.callTool]       injectable ({toolName, toolArgs, ...}) -> {ok, envelope|detail}
 * @returns {Promise<ClaimsGateResult & { invalid: string[], receipt?: object, duration: number }>}
 */
export async function runClaimsGate(input, options = {}) {
  const {
    sources,
    reference,
    panel,
    minRefuteVotes,
    strictRefuted = false,
    internCmd,
    timeoutMs = 240_000,
    callTool = callInternTool,
  } = options;
  const start = Date.now();

  const loaded = loadClaims(input);
  if (loaded.error) {
    return {
      ...escalateResult("invalid_input", loaded.error, []),
      invalid: loaded.invalid ?? [],
      duration: Date.now() - start,
    };
  }
  const { claims, invalid } = loaded;
  if (claims.length === 0) {
    return {
      ...escalateResult("no_claims", "no usable claims were found in the input", []),
      reason: "no_claims",
      invalid,
      duration: Date.now() - start,
    };
  }
  if (claims.length > MAX_CLAIMS) {
    // Refuse loudly rather than silently truncating — a partially-verified claim set
    // presenting as fully verified is exactly the failure mode this gate exists to stop.
    return {
      ...escalateResult(
        "too_many_claims",
        `${claims.length} claims exceed the tool's ${MAX_CLAIMS}-claim bound — split the set and run per batch`,
        [],
      ),
      invalid,
      duration: Date.now() - start,
    };
  }

  const toolArgs = {
    claims,
    ...(Array.isArray(sources) && sources.length > 0 ? { source_paths: sources } : {}),
    ...(typeof reference === "string" && reference.trim().length > 0
      ? { reference: reference.slice(0, MAX_REFERENCE_CHARS) }
      : {}),
    ...(Array.isArray(panel) && panel.length > 0 ? { panel } : {}),
    ...(Number.isInteger(minRefuteVotes) ? { min_refute_votes: minRefuteVotes } : {}),
  };

  const res = await callTool({ toolName: TOOL_NAME, toolArgs, internCmd, timeoutMs });
  if (!res.ok) {
    // An unreachable gate is a closed gate -> escalate, NEVER default-accept.
    const reason = res.code === "CLOUD_NOT_CONFIGURED" ? "cloud_not_configured" : "verifier_unreachable";
    return {
      ...escalateResult(reason, res.detail, []),
      invalid,
      duration: Date.now() - start,
    };
  }

  const envelope = res.envelope;
  const gate = gateClaims(envelope?.result, { strictRefuted });
  const receipt = buildReceipt({ input, claims, envelope, gate, strictRefuted });
  return { ...gate, invalid, receipt, duration: Date.now() - start };
}

function loadClaims(input) {
  if (Array.isArray(input)) return normalizeClaims(input);
  if (typeof input === "string") {
    if (!existsSync(input)) return { error: `claims file not found: ${input}` };
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(input, "utf8"));
    } catch (err) {
      return { error: `claims file is not valid JSON: ${err.message}` };
    }
    return normalizeClaims(parsed);
  }
  return { error: "claims input must be a .json file path or an array" };
}

// ── Receipt (chained, drift-detectable — peer to roleos-citation-receipt/v1) ─────────────────

function buildReceipt({ input, claims, envelope, gate, strictRefuted }) {
  const claimsHash = sha256(JSON.stringify(claims));
  // The FULL envelope digest chains the verdict to everything the verifier said — panel
  // seats, served models, per-juror votes, degradation flags. Re-running with a drifted
  // panel (retired juror, local fallback, substituted model) changes the digest.
  const envelopeHash = sha256(JSON.stringify(envelope ?? null));
  const chain = sha256([claimsHash, envelopeHash, gate.verdict].join("|"));
  const result = envelope?.result ?? {};
  return {
    schema: "roleos-claims-receipt/v1",
    kind: "claims-verification",
    tool: "roleos verify-claims",
    input: typeof input === "string" && input.length < 256 ? input : "(inline)",
    verdict: gate.verdict,
    blocking: gate.blocking,
    advisory: gate.advisory,
    strict_refuted: strictRefuted === true,
    claims_sha256: claimsHash,
    envelope_sha256: envelopeHash,
    // Verifier provenance (PIN_PER_STEP): the run/call correlation ids the intern stamps on
    // every envelope, backend + served-model evidence, and the panel-thinning flags.
    intern: {
      run_id: envelope?.run_id ?? null,
      call_id: envelope?.call_id ?? null,
      tier_used: envelope?.tier_used ?? null,
      model: envelope?.model ?? null,
      backend: envelope?.backend ?? null,
      degraded: envelope?.degraded ?? false,
      degrade_reason: envelope?.degrade_reason ?? null,
      weak: result.weak ?? null,
      min_refute_votes: result.min_refute_votes ?? null,
      summary: result.summary ?? null,
    },
    // The seats as the tool reported them: requested vs served model per juror, exclusions
    // (incl. the bounded raw_sample on no_valid_verdicts seats, v2.9.1) — the served-model
    // discipline that makes a degraded jury drift-detectable from the receipt alone.
    panel: Array.isArray(result.panel) ? result.panel : [],
    per_claim: gate.claims,
    chain_sha256: chain,
  };
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}
