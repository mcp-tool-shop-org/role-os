/**
 * `roleos verify-citations <dispatch.md|.json>` — run the citation gate and report.
 *
 * Exit codes: 0 accept · 20 blocking (a cited paper did not resolve — likely fabricated) · 30
 * escalate (verifier unreachable / low-confidence — a closed gate; NEVER accept) · 10 revise ·
 * 2 no resolvable citations found. Non-zero = needs attention, so a mission step, CI job, or
 * operator can branch on it.
 */

import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { runCitationGate } from "./verify-citations.mjs";

export async function verifyCitationsCommand(args) {
  const { flags, positional } = parseArgs(args);
  const dispatch = positional[0];

  if (!dispatch) {
    const err = new Error(
      "Usage: roleos verify-citations <dispatch.md|.json> [--provider ollama] [--intent <text>] [--local-panel] [--panel-seats <csv>] [--llamaswap-base <url>] [--json] [--receipt <path>]",
    );
    err.exitCode = 1;
    err.hint =
      "Provide a research dispatch — markdown with a Research-grounding section, or a citations JSON array.";
    throw err;
  }

  // The CLI positional is a dispatch FILE (inline-markdown input is the library API). Validate it
  // up front: a missing file or odd extension must fail loudly — never silently degrade into
  // scanning the path STRING for citations and reporting "no citations found".
  if (!existsSync(dispatch)) {
    const err = new Error(`dispatch file not found: ${dispatch}`);
    err.exitCode = 1;
    err.hint = "Pass the path to an existing research dispatch (.md, .markdown, or .json).";
    throw err;
  }
  if (!/\.(md|markdown|json)$/i.test(dispatch)) {
    const err = new Error(`unsupported dispatch file extension: ${dispatch}`);
    err.exitCode = 1;
    err.hint = "Supported extensions: .md, .markdown, .json (matched case-insensitively).";
    throw err;
  }

  const result = runCitationGate(dispatch, {
    provider: flags.provider || "ollama",
    ...(typeof flags.intent === "string" ? { intent: flags.intent } : {}),
    // --local-panel: add the family-different offload entailment panel as a second seat (local,
    // zero-cost). Re-checks prism's `supported` citations; monotone-tightening (escalates on
    // disagreement, never loosens). Needs llama-swap up + offload.py on the rig.
    localPanel: flags["local-panel"] === true,
    ...(typeof flags["offload-script"] === "string" ? { offloadScript: flags["offload-script"] } : {}),
    ...(typeof flags["llamaswap-base"] === "string" ? { llamaswapBase: flags["llamaswap-base"] } : {}),
    // --panel-seats: CSV of second-seat models -> offload's OFFLOAD_PANEL_SEATS. Pair with
    // --llamaswap-base http://localhost:11434 to run the panel on Ollama's OpenAI-compat endpoint.
    ...(typeof flags["panel-seats"] === "string" ? { panelSeats: flags["panel-seats"] } : {}),
  });

  // Persist the chained receipt (audit trail) unless --no-receipt.
  if (result.receipt && flags["no-receipt"] !== true) {
    const out =
      typeof flags.receipt === "string"
        ? resolve(flags.receipt)
        : resolve(dirname(dispatch), `${basename(dispatch).replace(/\.[^.]+$/, "")}.citation-receipt.json`);
    try {
      writeFileSync(out, JSON.stringify(result.receipt, null, 2));
      result.receipt_path = out;
    } catch (err) {
      console.error(`warning: could not write the citation receipt to ${out}: ${err.message}`);
    }
  }

  if (flags.json === true) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(dispatch, result);
  }

  process.exit(exitCodeFor(result));
}

/**
 * Map a gate result to the shell exit code (the gate's machine contract). Blocking is checked
 * FIRST so a (contradictory) accept can never shadow the hard halt.
 *   20 = blocking (a fabricated citation) · 0 = accept · 2 = no citations ·
 *   30 = escalate (verifier unreachable / low-confidence — a closed gate) · 10 = revise.
 */
export function exitCodeFor(result) {
  if (result.blocking) return 20;
  if (result.pass) return 0;
  if (result.reason === "no_citations") return 2;
  if (result.verdict === "escalate") return 30;
  return 10;
}

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[name] = next;
        i += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function printReport(dispatch, r) {
  const tag = r.pass ? "ACCEPT" : r.blocking ? "REFUSE (blocking)" : "NEEDS REVIEW";
  console.log(`\nroleos verify-citations — ${tag}\n`);
  console.log(`Dispatch: ${dispatch}`);
  console.log(`Verdict:  ${r.verdict}  (${r.citations.length} citation(s) checked, ${r.duration}ms)`);
  if (r.reason) console.log(`Reason:   ${r.reason} — ${r.detail || ""}`);

  // Full groundedness distribution — SUPPORTED citations must be visible. The per-citation list below
  // prints only the problems (accept/supported are skipped), which read as "every citation failed"
  // when most were actually supported; this line is the honest denominator (14 supported · 8 ...).
  printFindingsDistribution(r.citations);

  for (const c of r.citations) {
    if (c.verdict === "accept") continue;
    const mark = c.existence === "fabricated" ? "DROP" : (c.action || c.verdict);
    console.log(`  - [${mark}] ${c.identifier || c.id} — ${c.detail || c.finding_match || c.existence}`);
    if (c.span) console.log(`      source span: ${c.span}`);
  }

  if (r.unparsed && r.unparsed.length) {
    console.log(
      `\n  ${r.unparsed.length} item(s) looked like citations but had no resolvable arXiv/DOI id (verify manually):`,
    );
    for (const u of r.unparsed.slice(0, 10)) console.log(`    ? ${u.slice(0, 120)}`);
  }

  if (r.local_panel) {
    const p = r.local_panel;
    const seats = p.seats && p.seats.length ? p.seats.join(", ") : "(none reached)";
    console.log(`\nLocal panel: ${p.checked} citation(s) re-checked by [${seats}]${p.reachable ? "" : " — UNREACHABLE"}`);
    for (const d of p.disagreements || []) {
      console.log(`  - [DISAGREE] ${d.identifier || d.id} — prism: ${d.prism}, panel: ${d.panel}`);
    }
  }

  if (r.receipt_path) console.log(`\nReceipt: ${r.receipt_path}`);

  if (r.blocking) {
    console.log(
      `\nBLOCKING: a cited paper did not resolve in arXiv/Crossref (likely fabricated). Reject the dispatch.`,
    );
  } else if (r.advisory) {
    console.log(
      `\nADVISORY: citations resolved but need revision / human review — accept-with-notes or escalate per the items above.`,
    );
  }
}

/**
 * Print the per-citation groundedness distribution (e.g. "Findings: 14 supported · 8 not_addressed").
 * Keyed on finding_match, falling back to existence for citations that never reached the lens
 * (fabricated / unresolvable / metadata_mismatch). Ordered worst-last so `supported` leads.
 */
function printFindingsDistribution(citations) {
  if (!citations || citations.length === 0) return;
  const dist = {};
  for (const c of citations) {
    const key = c.finding_match || c.existence || "unknown";
    dist[key] = (dist[key] || 0) + 1;
  }
  const order = [
    "supported",
    "not_addressed",
    "contradicted",
    "metadata_mismatch",
    "unresolvable",
    "fabricated",
  ];
  const rank = (k) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  const parts = Object.entries(dist)
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([k, n]) => `${n} ${k}`);
  console.log(`Findings: ${parts.join(" · ")}`);
}
