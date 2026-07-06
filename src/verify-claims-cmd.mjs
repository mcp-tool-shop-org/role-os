/**
 * `roleos verify-claims <claims.json>` — run the claims gate and report.
 *
 * Adjudicates caller-supplied claims/findings with the ollama-intern cross-family Ollama
 * Cloud flagship panel (`ollama_verify_claims`, ollama-intern-mcp ≥ 2.9). Requires
 * OLLAMA_API_KEY in the environment (the tool is cloud-required and refuses without it —
 * which this gate reports as an escalate, never an accept).
 *
 * Exit codes (same contract as verify-citations): 0 accept · 20 blocking (a REFUTED claim
 * under --strict-refuted) · 30 escalate (weak panel / needs-review / verifier unreachable —
 * a closed gate; NEVER accept) · 10 revise (REFUTED, advisory) · 2 no usable claims.
 * Non-zero = needs attention, so a mission step, CI job, or operator can branch on it.
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { runClaimsGate } from "./verify-claims.mjs";

export async function verifyClaimsCommand(args) {
  const { flags, positional } = parseArgs(args);
  const claimsFile = positional[0];

  if (!claimsFile) {
    const err = new Error(
      "Usage: roleos verify-claims <claims.json> [--sources <csv-paths>] [--reference <file>] [--panel <csv-models>] [--min-refute-votes N] [--strict-refuted] [--intern-cmd <exe>] [--timeout <ms>] [--json] [--receipt <path>]",
    );
    err.exitCode = 1;
    err.hint =
      "Provide a claims JSON file — an array of {id, statement} objects (or bare statement strings). Max 20 claims per call; split larger sets.";
    throw err;
  }
  // Validate the positional up front — a typo'd path must fail loudly, never degrade.
  if (!existsSync(claimsFile)) {
    const err = new Error(`claims file not found: ${claimsFile}`);
    err.exitCode = 1;
    err.hint = "Pass the path to an existing claims .json file.";
    throw err;
  }
  if (!/\.json$/i.test(claimsFile)) {
    const err = new Error(`unsupported claims file extension: ${claimsFile}`);
    err.exitCode = 1;
    err.hint = "Claims are a .json array — there is no deterministic way to extract claims from prose.";
    throw err;
  }

  // --reference is a FILE path (test output, lint results, measured facts); read it here so
  // the library stays filesystem-input agnostic about the reference channel.
  let reference;
  if (typeof flags.reference === "string") {
    if (!existsSync(flags.reference)) {
      const err = new Error(`reference file not found: ${flags.reference}`);
      err.exitCode = 1;
      err.hint = "Pass the path to a file containing ground truth (e.g. captured test-runner output).";
      throw err;
    }
    reference = readFileSync(flags.reference, "utf8");
  }

  const minRefuteVotes =
    typeof flags["min-refute-votes"] === "string" ? Number.parseInt(flags["min-refute-votes"], 10) : undefined;
  const timeoutMs = typeof flags.timeout === "string" ? Number.parseInt(flags.timeout, 10) : undefined;

  const result = await runClaimsGate(claimsFile, {
    ...(typeof flags.sources === "string" ? { sources: splitCsv(flags.sources) } : {}),
    ...(reference !== undefined ? { reference } : {}),
    ...(typeof flags.panel === "string" ? { panel: splitCsv(flags.panel) } : {}),
    ...(Number.isInteger(minRefuteVotes) ? { minRefuteVotes } : {}),
    strictRefuted: flags["strict-refuted"] === true,
    ...(typeof flags["intern-cmd"] === "string" ? { internCmd: flags["intern-cmd"] } : {}),
    ...(Number.isInteger(timeoutMs) ? { timeoutMs } : {}),
  });

  // Persist the chained receipt (audit trail) unless --no-receipt.
  if (result.receipt && flags["no-receipt"] !== true) {
    const out =
      typeof flags.receipt === "string"
        ? resolve(flags.receipt)
        : resolve(dirname(claimsFile), `${basename(claimsFile).replace(/\.[^.]+$/, "")}.claims-receipt.json`);
    try {
      writeFileSync(out, JSON.stringify(result.receipt, null, 2));
      result.receipt_path = out;
    } catch (err) {
      console.error(`warning: could not write the claims receipt to ${out}: ${err.message}`);
    }
  }

  if (flags.json === true) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(claimsFile, result);
  }

  process.exit(exitCodeFor(result));
}

/**
 * Map a gate result to the shell exit code (the gate's machine contract). Blocking is
 * checked FIRST so nothing can shadow the hard halt.
 *   20 = blocking (REFUTED under --strict-refuted) · 0 = accept · 2 = no usable claims ·
 *   30 = escalate (weak / needs-review / unreachable — a closed gate) · 10 = revise.
 */
export function exitCodeFor(result) {
  if (result.blocking) return 20;
  if (result.pass) return 0;
  if (result.reason === "no_claims") return 2;
  if (result.verdict === "escalate") return 30;
  return 10;
}

function splitCsv(s) {
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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

function printReport(claimsFile, r) {
  const tag = r.pass ? "ACCEPT" : r.blocking ? "REFUSE (blocking)" : "NEEDS REVIEW";
  console.log(`\nroleos verify-claims — ${tag}\n`);
  console.log(`Claims:   ${claimsFile}`);
  console.log(`Verdict:  ${r.verdict}  (${r.claims.length} claim(s) adjudicated, ${r.duration}ms)`);
  if (r.reason) console.log(`Reason:   ${r.reason} — ${r.detail || ""}`);

  printVerdictDistribution(r.claims);

  // Per-claim problems (CONFIRMED claims are counted above, not listed).
  for (const c of r.claims) {
    if (c.verdict === "CONFIRMED") continue;
    console.log(`  - [${c.verdict}] ${c.id} — ${String(c.statement).slice(0, 100)}`);
    for (const j of c.jurors || []) {
      if (j.verdict === "CONFIRMED") continue;
      console.log(`      ${j.model}: [${j.verdict}/${j.severity}] ${j.rationale}`);
    }
  }

  if (r.invalid && r.invalid.length) {
    console.log(`\n  ${r.invalid.length} input item(s) had no usable statement (fix and re-run):`);
    for (const u of r.invalid.slice(0, 10)) console.log(`    ? ${u.slice(0, 120)}`);
  }

  // Panel provenance — the served-model discipline, visible on every run.
  if (r.receipt && Array.isArray(r.receipt.panel) && r.receipt.panel.length > 0) {
    const served = r.receipt.panel.filter((s) => s.included).length;
    console.log(`\nPanel: ${served}/${r.receipt.panel.length} jurors cloud-served`);
    for (const s of r.receipt.panel) {
      if (s.included) {
        console.log(`  - ${s.model} (served: ${s.served_model ?? "?"}, ${s.verdicts_returned} verdict(s))`);
      } else {
        console.log(`  - ${s.model} EXCLUDED: ${s.exclude_reason}${s.raw_sample ? ` — raw: ${s.raw_sample.slice(0, 80)}` : ""}`);
      }
    }
    if (r.receipt.intern?.weak) console.log(`  WEAK panel — every verdict is needs-review-grade.`);
  }

  if (r.receipt_path) console.log(`\nReceipt: ${r.receipt_path}`);

  if (r.blocking) {
    console.log(`\nBLOCKING: the cross-family panel REFUTED claim(s) under --strict-refuted. Halt per andon.`);
  } else if (r.advisory) {
    console.log(
      `\nADVISORY: not a clean pass — revise the refuted claims or escalate the unsettled ones per the items above.`,
    );
  }
}

/** Print the aggregate distribution (e.g. "Verdicts: 5 CONFIRMED · 1 REFUTED"), best-first. */
function printVerdictDistribution(claims) {
  if (!claims || claims.length === 0) return;
  const dist = {};
  for (const c of claims) dist[c.verdict ?? "unknown"] = (dist[c.verdict ?? "unknown"] || 0) + 1;
  const order = ["CONFIRMED", "NEEDS_REVIEW", "REFUTED"];
  const rank = (k) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  const parts = Object.entries(dist)
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([k, n]) => `${n} ${k}`);
  console.log(`Verdicts: ${parts.join(" · ")}`);
}
