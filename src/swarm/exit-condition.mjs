/**
 * Exit-condition evaluation — coordinator gates and Phase 9 verify.
 *
 * `exitCondition` is a control, not metadata. Completing a gate (and
 * `roleos swarm verify`) parses same-stage wave-report artifacts via
 * resolveArtifactContent + persist-bridge deriveVerdict/sevUpper and
 * refuses while open CRITICAL/HIGH remain. Treatment additionally
 * requires shipcheck-equivalent evidence.
 */

import { resolveArtifactContent } from "../artifacts.mjs";
import { deriveVerdict, sevUpper } from "./persist-bridge.mjs";

function isClosed(f) {
  const s = String((f && f.status) || "").toLowerCase();
  return s === "fixed" || s === "accepted_risk";
}

function isFindingLike(f) {
  return f && typeof f === "object" && (f.severity || f.id || f.finding_id);
}

/**
 * Parse findings from a wave-report body (agent-output JSON or markdown).
 * @param {string} body
 * @returns {{ severity?: string, status?: string, id?: string, description?: string }[]}
 */
export function parseWaveReportFindings(body) {
  if (typeof body !== "string" || !body.trim()) return [];
  const text = body.replace(/\r\n/g, "\n");

  const fromJson = findingsFromJsonText(text.trim());
  if (fromJson) return fromJson;

  const fence = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fence) {
    const fenced = findingsFromJsonText(fence[1].trim());
    if (fenced) return fenced;
  }

  const section = text.match(/## findings\n([\s\S]*?)(?=\n## |$)/i);
  if (section) {
    const asJson = findingsFromJsonText(section[1].trim());
    if (asJson) return asJson;
    return parseMarkdownFindings(section[1]);
  }

  return parseMarkdownFindings(text);
}

function findingsFromJsonText(raw) {
  if (!raw || (raw[0] !== "{" && raw[0] !== "[")) return null;
  try {
    const parsed = JSON.parse(raw);
    return findingsFromParsed(parsed);
  } catch {
    return null;
  }
}

function findingsFromParsed(parsed) {
  if (!parsed) return null;
  if (Array.isArray(parsed)) {
    const rows = parsed.filter(isFindingLike);
    return rows.length ? rows : null;
  }
  if (typeof parsed !== "object") return null;
  if (Array.isArray(parsed.findings)) return parsed.findings;
  if (parsed.report && Array.isArray(parsed.report.findings)) return parsed.report.findings;
  if (parsed.output && Array.isArray(parsed.output.findings)) return parsed.output.findings;
  return null;
}

function parseMarkdownFindings(section) {
  const findings = [];
  for (const line of String(section).split("\n")) {
    const sev = line.match(/\b(CRITICAL|HIGH|MEDIUM|LOW)\b/i);
    if (!sev) continue;
    const idMatch = line.match(/\b(F-[A-Za-z0-9-]+)\b/);
    const statusMatch = line.match(/\bstatus:\s*(fixed|accepted_risk|open|unverified)\b/i)
      || line.match(/\((fixed|accepted_risk)\)/i);
    findings.push({
      id: idMatch ? idMatch[1] : undefined,
      severity: sev[1].toUpperCase(),
      description: line.trim(),
      status: statusMatch ? statusMatch[1].toLowerCase() : "open",
    });
  }
  return findings;
}

/**
 * Collect findings from completed wave-report steps.
 * @param {object[]} steps
 * @param {string|null} stage - same-stage filter; null/undefined = all stages
 * @param {string} [cwd]
 * @returns {{ findings: object[], reports: object[] }}
 */
export function collectStageWaveFindings(steps, stage, cwd) {
  const findings = [];
  const reports = [];
  for (const step of steps || []) {
    if (step.produces !== "wave-report") continue;
    if (stage && step.stage !== stage) continue;
    if (step.status !== "completed") continue;
    if (!step.artifact) continue;
    const body = resolveArtifactContent(step.artifact, cwd);
    const parsed = parseWaveReportFindings(typeof body === "string" ? body : "");
    reports.push({
      domain: step.domain || "unknown",
      stage: step.stage || stage || "unknown",
      findings: parsed,
    });
    for (const f of parsed) {
      findings.push({ ...f, domain: step.domain, stage: step.stage });
    }
  }
  return { findings, reports };
}

/**
 * Open findings at CRITICAL (and HIGH when includeHigh).
 * @param {object[]} findings
 * @param {{ includeHigh?: boolean, includeCritical?: boolean }} [opts]
 */
export function openBlockingFindings(findings, opts = {}) {
  const includeHigh = opts.includeHigh !== false;
  const includeCritical = opts.includeCritical !== false;
  return (findings || []).filter((f) => {
    if (isClosed(f)) return false;
    const sev = sevUpper(f);
    if (includeCritical && sev === "CRITICAL") return true;
    if (includeHigh && sev === "HIGH") return true;
    return false;
  });
}

/**
 * What an exitCondition string actually requires.
 * @param {string} exitCondition
 */
export function parseExitConditionRequirements(exitCondition) {
  const text = String(exitCondition || "");
  return {
    wantsZeroCritical: /0\s*CRITICAL/i.test(text),
    wantsZeroHigh: /0\s*HIGH/i.test(text),
    wantsShipcheck: /shipcheck/i.test(text),
    wantsUserApproval: /user approve/i.test(text),
  };
}

const SHIPCHECK_PASS_RE =
  /shipcheck[\s\S]{0,120}?(exit(?:s|ed)?\s*0|pass(?:ed|es)?|\bok\b|\bclean\b)/i;

function shipcheckFromParsed(parsed) {
  if (!parsed || typeof parsed !== "object") return false;
  if (parsed.shipcheck === true || parsed.shipcheck === "pass") return true;
  if (parsed.shipcheck && typeof parsed.shipcheck === "object") {
    if (parsed.shipcheck.pass === true) return true;
    if (parsed.shipcheck.exitCode === 0 || parsed.shipcheck.exits === 0) return true;
  }
  if (parsed.shipcheckExitCode === 0 || parsed.shipcheck_exit === 0) return true;
  return false;
}

function bodyHasShipcheckEvidence(body) {
  if (typeof body !== "string" || !body.trim()) return false;
  const text = body.replace(/\r\n/g, "\n");
  if (SHIPCHECK_PASS_RE.test(text)) return true;
  try {
    const trimmed = text.trim();
    if (trimmed[0] === "{" || trimmed[0] === "[") {
      if (shipcheckFromParsed(JSON.parse(trimmed))) return true;
    }
  } catch { /* not JSON */ }
  const fence = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fence) {
    try {
      if (shipcheckFromParsed(JSON.parse(fence[1]))) return true;
    } catch { /* ignore */ }
  }
  return false;
}

/**
 * Treatment (and any shipcheck-named condition) needs artifact evidence
 * that shipcheck passed. Presence of SHIP_GATE.md in the repo is not evidence.
 * @param {object[]} steps
 * @param {string|null} stage
 * @param {string} [cwd]
 * @param {string} [gateArtifact]
 */
export function hasShipcheckEvidence(steps, stage, cwd, gateArtifact) {
  if (bodyHasShipcheckEvidence(resolveArtifactContent(gateArtifact, cwd))) return true;
  for (const step of steps || []) {
    if (step.status !== "completed" || !step.artifact) continue;
    if (stage && step.stage && step.stage !== stage) continue;
    const body = resolveArtifactContent(step.artifact, cwd);
    if (bodyHasShipcheckEvidence(typeof body === "string" ? body : "")) return true;
    if (typeof step.note === "string" && SHIPCHECK_PASS_RE.test(step.note)) return true;
  }
  return false;
}

/**
 * Evaluate an exitCondition against completed wave-report artifacts.
 * @param {object} args
 * @param {string} args.exitCondition
 * @param {object[]} [args.steps]
 * @param {string|null} [args.stage]
 * @param {string} [args.cwd]
 * @param {string} [args.artifact] - gate artifact being submitted
 * @returns {{ pass: boolean, reason: string|null, blocking: object[], findings: object[], verdict: string, exitCondition: string, shipcheck: { required: boolean, present: boolean } }}
 */
export function evaluateExitCondition({
  exitCondition,
  steps = [],
  stage = null,
  cwd,
  artifact,
} = {}) {
  const req = parseExitConditionRequirements(exitCondition);
  const { findings } = collectStageWaveFindings(steps, stage, cwd);
  const verdict = deriveVerdict(findings);

  const blocking = (req.wantsZeroCritical || req.wantsZeroHigh)
    ? openBlockingFindings(findings, {
      includeCritical: req.wantsZeroCritical,
      includeHigh: req.wantsZeroHigh,
    })
    : [];

  const shipcheckRequired = req.wantsShipcheck;
  const shipcheckPresent = shipcheckRequired
    ? hasShipcheckEvidence(steps, stage, cwd, artifact)
    : false;

  const parts = [];
  if (blocking.length) {
    const crit = blocking.filter((f) => sevUpper(f) === "CRITICAL").length;
    const high = blocking.filter((f) => sevUpper(f) === "HIGH").length;
    parts.push(`${crit} CRITICAL + ${high} HIGH open (need ${exitCondition})`);
  }
  if (shipcheckRequired && !shipcheckPresent) {
    parts.push("shipcheck-equivalent evidence missing (need shipcheck audit exits 0)");
  }

  return {
    pass: parts.length === 0,
    reason: parts.length ? parts.join("; ") : null,
    blocking,
    findings,
    verdict,
    exitCondition: exitCondition || "",
    shipcheck: { required: shipcheckRequired, present: shipcheckPresent },
  };
}

/**
 * Format blocking findings for the operator.
 * @param {object[]} blocking
 */
export function formatBlockingFindings(blocking) {
  return (blocking || []).map((f) => {
    const id = f.id || f.finding_id || "";
    const domain = f.domain ? ` ${f.domain}` : "";
    const desc = String(f.description || f.detail || "").replace(/\s+/g, " ").slice(0, 160);
    return `  [${sevUpper(f) || "OPEN"}]${domain}${id ? ` ${id}` : ""}${desc ? `: ${desc}` : ""}`;
  }).join("\n");
}

/**
 * Operator-facing report (printed before throw / verify FAIL).
 * @param {ReturnType<typeof evaluateExitCondition>} result
 */
export function formatExitConditionReport(result) {
  const lines = [
    `Exit condition: ${result.pass ? "pass" : "fail"} (${result.exitCondition || "unset"})`,
  ];
  if (result.reason) lines.push(`  ${result.reason}`);
  if (result.blocking && result.blocking.length) {
    lines.push(formatBlockingFindings(result.blocking));
  }
  if (result.shipcheck?.required && !result.shipcheck.present) {
    lines.push("  shipcheck: missing evidence");
  }
  return lines.join("\n");
}

/**
 * Refuse gate completion when exitCondition is not met.
 * @param {{ step: object, run?: object, cwd?: string, artifact?: string }} args
 * @returns {ReturnType<typeof evaluateExitCondition>|{ pass: true, skipped: true }}
 */
export function enforceExitCondition({ step, run, cwd, artifact } = {}) {
  if (!step?.isGate || !step.exitCondition) {
    return { pass: true, skipped: true };
  }
  if (!run || !Array.isArray(run.steps)) {
    const err = new Error(
      `Cannot complete ${step.stage || "coordinator"} gate: exitCondition cannot be evaluated without run steps`
    );
    err.exitCode = 1;
    throw err;
  }
  const result = evaluateExitCondition({
    exitCondition: step.exitCondition,
    steps: run.steps,
    stage: step.stage || null,
    cwd,
    artifact,
  });
  if (!result.pass) {
    const printed = formatExitConditionReport(result);
    console.log(printed);
    const err = new Error(
      `Cannot complete ${step.stage || "coordinator"} gate: ${result.reason}`
    );
    err.exitCode = 1;
    err.blockingFindings = result.blocking;
    err.exitConditionResult = result;
    throw err;
  }
  return result;
}
