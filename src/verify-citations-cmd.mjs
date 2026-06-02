/**
 * `roleos verify-citations <dispatch.md|.json>` — run the citation gate and report.
 *
 * Exit codes: 0 accept · 20 blocking (a cited paper did not resolve — likely fabricated) · 30
 * escalate (verifier unreachable / low-confidence — a closed gate; NEVER accept) · 10 revise ·
 * 2 no resolvable citations found. Non-zero = needs attention, so a mission step, CI job, or
 * operator can branch on it.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { runCitationGate } from "./verify-citations.mjs";

export async function verifyCitationsCommand(args) {
  const { flags, positional } = parseArgs(args);
  const dispatch = positional[0];

  if (!dispatch) {
    const err = new Error(
      "Usage: roleos verify-citations <dispatch.md|.json> [--provider ollama] [--intent <text>] [--json] [--receipt <path>]",
    );
    err.exitCode = 1;
    err.hint =
      "Provide a research dispatch — markdown with a Research-grounding section, or a citations JSON array.";
    throw err;
  }

  const result = runCitationGate(dispatch, {
    provider: flags.provider || "ollama",
    ...(typeof flags.intent === "string" ? { intent: flags.intent } : {}),
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
