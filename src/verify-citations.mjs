/**
 * Citation-Verification Gate — verifies a research dispatch's citations via the external
 * `prism verify` CLI (a family-different, reasoning-stripped verifier) and gates the dispatch
 * on the verdict. role-os is the GENERATOR; prism is the sound external CRITIC (LLM-Modulo,
 * Kambhampati 2024 arXiv:2402.01817) — role-os never grades its own homework.
 *
 * Three tiers keyed to the FAILURE SOURCE (study-swarm wf_20651368-297):
 *   - existence `fabricated` (deterministic arXiv/Crossref miss) -> BLOCKING hard halt
 *   - metadata / numeric / groundedness `contradicted`           -> advisory: revise
 *   - `unresolvable` / `not_addressed` / verifier-low-confidence  -> advisory: escalate (human)
 *   - all `accept`                                                -> pass
 * An unreachable verifier ESCALATES, never default-accepts ("an unreachable gate is a closed
 * gate"). See design/citation-verification-runner.md. Peer to src/swarm/build-gate.mjs.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

// ── Identifier patterns (copy-only — the extractor never invents an identifier) ──────────────
const ARXIV =
  /arxiv[:\s/]+(?:abs\/)?(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?)/i;
const DOI = /\b(10\.\d{4,9}\/[^\s)\]}"'<>]+)/;

/**
 * @typedef {{ id: string|null, identifier: string, claim: string, authors: string, year: string }} Citation
 */

// ── Extraction ───────────────────────────────────────────────────────────────────────────────

/**
 * Extract citation records from a research dispatch (our Step-3 template prose).
 * Deterministic and COPY-ONLY: it lifts the identifier + claim + authors verbatim and NEVER
 * completes a missing field from memory (Khraisha 2024 — LLM-generated citations are fabricated
 * at extreme rates). Only arXiv / DOI identifiers (what prism can resolve) become citations;
 * items that look like a citation but carry no resolvable id are returned in `unparsed` so misses
 * are visible, never silently dropped.
 *
 * @param {string} markdown
 * @returns {{ citations: Citation[], unparsed: string[] }}
 */
export function extractCitations(markdown) {
  const citations = [];
  const unparsed = [];
  let n = 0;
  for (const raw of splitItems(String(markdown))) {
    const identifier = matchIdentifier(raw);
    if (!identifier) {
      if (looksLikeCitation(raw)) unparsed.push(oneLine(raw));
      continue;
    }
    n += 1;
    citations.push({
      id: `c${n}`,
      identifier,
      claim: extractClaim(raw),
      authors: extractAuthors(raw),
      year: extractYear(raw),
    });
  }
  return { citations, unparsed };
}

/** Match the first resolvable identifier (arXiv first, then DOI). Returns null if none. */
function matchIdentifier(text) {
  const a = text.match(ARXIV);
  if (a) return `arXiv:${a[1]}`;
  const d = text.match(DOI);
  if (d) return d[1].replace(/[.,;]+$/, "");
  return null;
}

/** Group lines into logical items: break at list markers and blank lines. */
function splitItems(markdown) {
  const lines = markdown.split(/\r?\n/);
  const isMarker = (l) => /^\s*(?:\d+[.)]|[-*+])\s+/.test(l);
  const items = [];
  let cur = [];
  const flush = () => {
    if (cur.length) items.push(cur.join(" ").trim());
    cur = [];
  };
  for (const line of lines) {
    if (line.trim() === "") flush();
    else if (isMarker(line)) {
      flush();
      cur.push(line);
    } else cur.push(line);
  }
  flush();
  return items.filter(Boolean);
}

function stripMarkers(raw) {
  return raw
    .replace(/^\s*(?:\d+[.)]|[-*+])\s+/, "")
    .replace(/[*`_]/g, "")
    .trim();
}

/** Collapse an item to a single display line (drops the list marker, keeps the text). */
function oneLine(raw) {
  return raw.replace(/^\s*(?:\d+[.)]|[-*+])\s+/, "").replace(/\s+/g, " ").trim();
}

/** Claim = the bold finding if present, else the first sentence (capped). Always non-empty. */
function extractClaim(raw) {
  const bold = raw.match(/\*\*(.+?)\*\*/);
  if (bold && bold[1].trim()) return bold[1].trim().slice(0, 500);
  const cleaned = stripMarkers(raw);
  const sentence = cleaned.match(/^(.{8,260}?[.!?])(?:\s|$)/);
  const claim = (sentence ? sentence[1] : cleaned).slice(0, 500).trim();
  return claim || cleaned.slice(0, 120).trim() || "(no claim text)";
}

function extractYear(raw) {
  const m = raw.match(/\b(?:19|20)\d{2}\b/);
  return m ? m[0] : "";
}

/** Best-effort authors (metadata only — prism resolves by identifier, not by this). */
function extractAuthors(raw) {
  const beforeYear = stripMarkers(raw)
    .replace(/\*\*(.+?)\*\*/g, "")
    .split(/\b(?:19|20)\d{2}\b/)[0] || "";
  const m = beforeYear.match(/([A-Z][\w.'-]+(?:[\s,]+(?:et al\.?|&|and|[A-Z][\w.'-]+)){0,6})\s*$/);
  return (m ? m[1] : "").replace(/[,\s]+$/, "").trim().slice(0, 120);
}

function looksLikeCitation(raw) {
  return (
    /\b(?:19|20)\d{2}\b/.test(raw) &&
    /(et al\.?|\bdoi\b|\brfc\b|arxiv|https?:\/\/|[A-Z][a-z]+\s+(?:&|and|et al))/i.test(raw)
  );
}

// ── Gate (maps prism's verdict to the three tiers) ─────────────────────────────────────────────

/**
 * @typedef {object} GateResult
 * @property {string} verdict           accept | revise | refuse | escalate
 * @property {boolean} pass             true iff verdict === "accept"
 * @property {boolean} blocking         true iff any citation failed the deterministic existence floor
 * @property {boolean} advisory         needs attention but not a fabrication (revise/escalate)
 * @property {object[]} citations       per-citation result
 * @property {string} [reason]
 * @property {string} [detail]
 */

/**
 * Map a parsed `prism verify` response to the three-tier gate.
 * @param {object} prismResponse  parsed VerifyResponse JSON, or `{ error: {...} }`
 * @returns {GateResult}
 */
export function gateCitations(prismResponse) {
  if (!prismResponse || typeof prismResponse !== "object") {
    return blockedResult("escalate", "malformed_verifier_output", "verifier returned no object");
  }
  if (prismResponse.error) {
    // prism refused to verify at all (e.g. INVALID_ARTIFACT, VERIFIER_UNAVAILABLE) -> escalate.
    return {
      verdict: "escalate",
      pass: false,
      blocking: false,
      advisory: true,
      reason: prismResponse.error.reason || "verifier_error",
      detail: prismResponse.error.detail || "",
      citations: [],
    };
  }
  const verdict = prismResponse.verdict || "escalate";
  const citations = (prismResponse.citation_results || []).map((cr) => ({
    id: cr.citation_id ?? null,
    identifier: cr.identifier ?? null,
    existence: cr.existence,
    finding_match: cr.finding_match,
    verdict: cr.verdict,
    action: cr.action,
    detail: cr.detail,
    span: cr.supporting_span ?? null,
  }));
  const blocking = citations.some((c) => c.existence === "fabricated");
  const pass = verdict === "accept";
  return { verdict, pass, blocking, advisory: !pass && !blocking, citations };
}

function blockedResult(verdict, reason, detail) {
  return { verdict, pass: false, blocking: false, advisory: true, reason, detail, citations: [] };
}

// ── Runner (orchestrates extract -> shell prism -> gate -> receipt) ────────────────────────────

/**
 * Run the citation gate over a dispatch (file path .md/.json, or a markdown string).
 *
 * @param {string} input
 * @param {object} [options]
 * @param {string} [options.prismCmd]        default: env PRISM_CMD || "prism"
 * @param {string} [options.provider]        default: "ollama" (local, zero-cost)
 * @param {string} [options.callerFamily]    default: "anthropic" (excluded from the verifier)
 * @param {string} [options.intent]
 * @param {number} [options.timeout]         per-call ms (default 120000)
 * @param {number} [options.retries]         transient retries (default 1)
 * @param {Function} [options.exec]          injectable (cmd, args, {timeout, cwd}) -> {status, stdout, stderr}
 * @param {string} [options.cwd]
 * @returns {GateResult & { unparsed: string[], receipt?: object, duration: number }}
 */
export function runCitationGate(input, options = {}) {
  const {
    prismCmd = process.env.PRISM_CMD || "prism",
    provider = "ollama",
    callerFamily = "anthropic",
    intent = "verify each citation exists and the finding matches the source",
    timeout = 120_000,
    retries = 1,
    exec = defaultExec,
    cwd = process.cwd(),
  } = options;

  const start = Date.now();
  const { citations, unparsed } = loadCitations(input);

  if (citations.length === 0) {
    return {
      ...blockedResult("escalate", "no_citations", "no resolvable arXiv/DOI citations were extracted"),
      unparsed,
      duration: Date.now() - start,
    };
  }

  const artifact = citations.map((c) => ({
    id: c.id,
    identifier: c.identifier,
    claim: c.claim,
    authors: c.authors || "",
    year: c.year || "",
  }));

  const dir = mkdtempSync(join(tmpdir(), "roleos-cite-"));
  const file = join(dir, "citations.json");
  let result;
  try {
    writeFileSync(file, JSON.stringify(artifact));
    result = shellPrism({ prismCmd, file, intent, callerFamily, provider, timeout, retries, exec, cwd });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (!result.ok) {
    // An unreachable gate is a closed gate -> escalate, NEVER default-accept.
    return {
      ...blockedResult("escalate", "verifier_unreachable", result.detail),
      unparsed,
      duration: Date.now() - start,
    };
  }

  const gate = gateCitations(result.response);
  const receipt = buildReceipt({ input, artifact, response: result.response, gate });
  return { ...gate, unparsed, receipt, duration: Date.now() - start };
}

function loadCitations(input) {
  if (
    typeof input === "string" &&
    (input.endsWith(".md") || input.endsWith(".json")) &&
    existsSync(input)
  ) {
    const content = readFileSync(input, "utf8");
    if (extname(input) === ".json") {
      let arr;
      try {
        arr = JSON.parse(content);
      } catch {
        return { citations: [], unparsed: ["(.json file was not valid JSON)"] };
      }
      const citations = (Array.isArray(arr) ? arr : []).map(normalizeJsonCitation).filter(Boolean);
      return { citations, unparsed: [] };
    }
    return extractCitations(content);
  }
  return extractCitations(String(input));
}

function normalizeJsonCitation(c) {
  if (!c || typeof c !== "object") return null;
  const claim = (c.claim || c.finding || "").toString().trim();
  if (!claim) return null;
  const idText = [c.identifier, c.url, c.doi, c.arxiv].filter(Boolean).join(" ");
  const identifier = matchIdentifier(idText) || matchIdentifier(claim);
  if (!identifier) return null;
  return {
    id: (c.id || null),
    identifier,
    claim: claim.slice(0, 500),
    authors: (c.authors || "").toString(),
    year: (c.year || "").toString(),
  };
}

function shellPrism({ prismCmd, file, intent, callerFamily, provider, timeout, retries, exec, cwd }) {
  const args = [
    "verify", "-a", `@${file}`, "--type", "citations",
    "-i", intent, "--caller-family", callerFamily, "--provider", provider,
  ];
  let detail = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = exec(prismCmd, args, { timeout, cwd });
    } catch (err) {
      detail = `failed to run ${prismCmd}: ${err.code || err.message}`;
      if (err.code === "ENOENT") break; // missing binary -> escalate, do not retry
      continue;
    }
    const parsed = tryParseJson((res.stdout || "").toString());
    if (parsed) return { ok: true, response: parsed, exitCode: res.status ?? 0 };
    detail = `prism produced no parseable JSON (exit ${res.status}): ${(res.stderr || res.stdout || "").toString().slice(0, 300)}`;
  }
  return { ok: false, detail };
}

/** Default exec — execFileSync, capturing stdout even when prism exits non-zero (refuse/error). */
function defaultExec(cmd, args, { timeout, cwd }) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd,
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
      shell: process.platform === "win32", // resolve .cmd/.exe shims on Windows; args are ours
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    if (err.code === "ENOENT") throw err; // missing binary -> shellPrism escalates
    return {
      status: err.status ?? 1,
      stdout: (err.stdout || "").toString(),
      stderr: (err.stderr || "").toString(),
    };
  }
}

function tryParseJson(text) {
  const s = (text || "").trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildReceipt({ input, artifact, response, gate }) {
  const citationsHash = sha256(JSON.stringify(artifact));
  const prismReceipt = response.receipt || {};
  const pins = Array.isArray(prismReceipt.retrieval_pins) ? prismReceipt.retrieval_pins : [];
  const chain = sha256([citationsHash, prismReceipt.signature || "", gate.verdict].join("|"));
  return {
    schema: "roleos-citation-receipt/v1",
    kind: "citation-verification",
    tool: "roleos verify-citations",
    input: typeof input === "string" && input.length < 256 ? input : "(inline)",
    verdict: gate.verdict,
    blocking: gate.blocking,
    advisory: gate.advisory,
    citations_sha256: citationsHash,
    // Chain to prism's inner HMAC receipt: verifying prism's signature is what lets role-os
    // trust a verdict it did not itself compute (separate keys; Haber-Stornetta 1991).
    prism_receipt: {
      id: prismReceipt.id || null,
      signature: prismReceipt.signature || null,
      verdict: response.verdict || null,
    },
    // Per-citation retrieval pins enable drift detection on re-run (compare source_sha256).
    retrieval_pins: pins.map((p) => ({
      id: p.id,
      identifier: p.identifier,
      query: p.query,
      source_sha256: p.source_sha256,
      existence: p.existence,
    })),
    chain_sha256: chain,
  };
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}
