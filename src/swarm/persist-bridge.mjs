/**
 * Evidence Persistence Bridge — Optional connection to dogfood-lab/testing-os.
 *
 * Converts swarm wave results into dogfood submission format and audit DB
 * payloads. The core swarm mission works without this — it's activated by
 * the --persist-evidence flag on `roleos swarm`.
 *
 * This mirrors the logic from dogfood-lab/testing-os/packages/dogfood-swarm/persist-results.js
 * but produces the payloads without requiring testing-os to be present.
 */

// ── Surface mapping ─────────────────────────────────────────────────────────

/**
 * Map a domain ID to a product surface string for dogfood submissions.
 * @param {string} domainId - e.g. "backend", "frontend", "tests"
 * @returns {string}
 */
export function surfaceFromDomain(domainId) {
  const map = {
    backend: "cli",
    bridge: "cli",
    tests: "cli",
    infra: "cli",
    frontend: "web",
  };
  return map[domainId] || "cli";
}

// ── Verdict derivation ──────────────────────────────────────────────────────

/**
 * Derive a verdict from findings.
 * @param {{ severity: string, status?: string }[]} findings
 * @returns {"pass"|"partial"|"fail"}
 */
export function deriveVerdict(findings) {
  if (!findings || findings.length === 0) return "pass";

  const open = findings.filter(f => f.status !== "fixed" && f.status !== "accepted_risk");
  const hasCritical = open.some(f => f.severity === "critical");
  const hasHigh = open.some(f => f.severity === "high");

  if (hasCritical) return "fail";
  if (hasHigh) return "partial";
  return "pass";
}

// ── Scenario results ────────────────────────────────────────────────────────

/**
 * Build per-domain scenario results from wave reports.
 * @param {object[]} waveReports - Array of { domain, stage, findings, remediations }
 * @returns {object[]}
 */
export function buildScenarioResults(waveReports) {
  // Group by domain
  const byDomain = {};
  for (const wr of waveReports) {
    if (!byDomain[wr.domain]) byDomain[wr.domain] = [];
    byDomain[wr.domain].push(wr);
  }

  return Object.entries(byDomain).map(([domain, reports]) => {
    const allFindings = reports.flatMap(r => r.findings || []);
    const allRemediations = reports.flatMap(r => r.remediations || []);

    return {
      scenario_id: `swarm-${domain}`,
      product_surface: surfaceFromDomain(domain),
      verdict: deriveVerdict(allFindings),
      step_results: [
        { step: "audit", status: allFindings.length > 0 ? "pass" : "pass" },
        { step: "remediate", status: allRemediations.length > 0 ? "pass" : "skip" },
      ],
      evidence: {
        total_findings: allFindings.length,
        open_findings: allFindings.filter(f => f.status !== "fixed").length,
        fixed: allFindings.filter(f => f.status === "fixed").length,
        severities: {
          critical: allFindings.filter(f => f.severity === "critical").length,
          high: allFindings.filter(f => f.severity === "high").length,
          medium: allFindings.filter(f => f.severity === "medium").length,
          low: allFindings.filter(f => f.severity === "low").length,
        },
      },
    };
  });
}

// ── Overall verdict ─────────────────────────────────────────────────────────

/**
 * Compute overall verdict from scenario results.
 * @param {object[]} scenarioResults
 * @returns {"pass"|"partial"|"fail"}
 */
export function computeOverallVerdict(scenarioResults) {
  if (scenarioResults.some(s => s.verdict === "fail")) return "fail";
  if (scenarioResults.some(s => s.verdict === "partial")) return "partial";
  return "pass";
}

// ── Dogfood submission payload ──────────────────────────────────────────────

/**
 * Build a testing-os-compatible submission payload.
 * @param {object} manifest - Swarm manifest
 * @param {object[]} waveReports - All wave reports from the run
 * @param {object} meta - { commitSha, branch, startedAt, completedAt }
 * @returns {object} Dogfood submission payload
 */
export function buildSubmission(manifest, waveReports, meta = {}) {
  const scenarios = buildScenarioResults(waveReports);
  const overall = computeOverallVerdict(scenarios);

  return {
    repo: manifest.repo || "unknown",
    product_surface: surfaceFromDomain(manifest.domains?.[0]?.id || "backend"),
    execution_mode: "automated",
    overall_verdict: overall,
    scenario_results: scenarios,
    metadata: {
      commit_sha: meta.commitSha || "unknown",
      branch: meta.branch || "unknown",
      started_at: meta.startedAt || new Date().toISOString(),
      completed_at: meta.completedAt || new Date().toISOString(),
      tool: "role-os-swarm",
      tool_version: "1.0.0",
    },
  };
}

// ── Audit DB payload ────────────────────────────────────────────────────────

/**
 * Build an audit-DB-compatible payload from wave reports.
 * @param {object} manifest - Swarm manifest
 * @param {object[]} waveReports - All wave reports
 * @param {object} meta - { commitSha, branch }
 * @returns {object}
 */
export function buildAuditPayload(manifest, waveReports, meta = {}) {
  const allFindings = waveReports.flatMap(r => r.findings || []);
  const fixed = allFindings.filter(f => f.status === "fixed").length;

  const severities = {
    critical: allFindings.filter(f => f.severity === "critical").length,
    high: allFindings.filter(f => f.severity === "high").length,
    medium: allFindings.filter(f => f.severity === "medium").length,
    low: allFindings.filter(f => f.severity === "low").length,
  };

  const scenarios = buildScenarioResults(waveReports);
  const overall = computeOverallVerdict(scenarios);

  return {
    run: {
      slug: `swarm-${manifest.repo || "unknown"}`,
      commit_sha: meta.commitSha || "unknown",
      scope_level: "full",
      overall_status: fixed === allFindings.length ? "pass" : overall,
      overall_posture: overall,
      blocking_release: severities.critical > 0 || severities.high > 0,
    },
    findings: allFindings,
    metrics: {
      total_findings: allFindings.length,
      ...severities,
      fixed,
      pass_rate: allFindings.length > 0 ? Math.round((fixed / allFindings.length) * 100) : 100,
    },
  };
}
