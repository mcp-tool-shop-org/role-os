/**
 * `roleos jury` — measure trained critics and score with a panel that earned its place.
 *
 *   check <validation.json> [--json]
 *   select <validation.json> [--max-size 5] [--bags 50] [--folds 5] [--seed 0]
 *           [--out panel.json] [--json]
 *   score <panel.json> <items.json> [--json]
 *
 * The CLI reads files, calls the pure core, and prints. It does not call a model.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DEFAULT_BAGS,
  DEFAULT_FOLDS,
  DEFAULT_MAX_SIZE,
  DEFAULT_SEED,
  buildPanelFile,
  hashValidation,
  juryCheck,
  jurySelect,
  parsePanel,
  parseValidation,
  scoreItems,
} from "./specialist/jury.mjs";

export async function juryCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "check": return checkValidation(rest);
    case "select": return selectPanel(rest);
    case "score": return scoreNew(rest);
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      throwUsage(`unknown subcommand "${sub}"`);
  }
}

function printHelp() {
  console.log(`
roleos jury — measure critics, and keep a panel only when it beats the best one

  roleos jury check <validation.json> [--json]
      Per-critic accuracy, group-clustered 95% interval, coverage, and the
      error-consistency matrix. Flags inverted critics and near-duplicates.

  roleos jury select <validation.json> [--max-size 5] [--bags 50] [--folds 5]
                       [--seed 0] [--out panel.json] [--json]
      Everything check prints, plus bagged selection, the nested estimate,
      and a verdict. --out writes a panel file only when the verdict is "panel".

  roleos jury score <panel.json> <items.json> [--json]
      Apply a saved panel to new items. A missing score is an abstention.

The same seed repeats the same numbers. Absent data is printed as "unmeasured".
`);
}

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[a.slice(2)] = next;
        i += 1;
      } else {
        flags[a.slice(2)] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function throwUsage(detail) {
  const err = new Error(detail);
  err.exitCode = 1;
  err.hint = "Run 'roleos jury help' for usage.";
  throw err;
}

function failParse(errors) {
  const err = new Error(errors.join("; "));
  err.exitCode = 1;
  err.hint = "See starter-pack/schemas/jury.md for the file format.";
  throw err;
}

function readJson(file, label) {
  if (!file) throwUsage(`${label} path is required`);
  if (!existsSync(file)) throwUsage(`${label} not found: ${file}`);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    throwUsage(`could not read ${file}: ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throwUsage(`${file} is not valid JSON: ${err.message}`);
  }
}

function requireInt(flags, name, fallback, min, max) {
  if (flags[name] === undefined) return fallback;
  if (typeof flags[name] !== "string" || !/^-?\d+$/.test(flags[name])) {
    throwUsage(`--${name} must be an integer`);
  }
  const n = Number(flags[name]);
  if (n < min || n > max) throwUsage(`--${name} must be between ${min} and ${max}`);
  return n;
}

function fmt(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "unmeasured";
  return Number(value).toFixed(4);
}

function fmtCi(ci) {
  if (!ci) return "unmeasured";
  return `[${fmt(ci.low)}, ${fmt(ci.high)}]`;
}

function selectionOpts(flags) {
  return {
    seed: requireInt(flags, "seed", DEFAULT_SEED, -2147483648, 2147483647),
    maxSize: requireInt(flags, "max-size", DEFAULT_MAX_SIZE, 1, 100),
    bags: requireInt(flags, "bags", DEFAULT_BAGS, 1, 1000),
    folds: requireInt(flags, "folds", DEFAULT_FOLDS, 2, 50),
  };
}

function loadValidation(file, requireTruth) {
  const doc = readJson(file, requireTruth ? "validation file" : "items file");
  const parsed = parseValidation(doc, { requireTruth });
  if (!parsed.ok) failParse(parsed.errors);
  return { doc, ...parsed };
}

function reportBody(report) {
  return {
    items: report.items,
    groups: report.groups,
    seed: report.seed,
    bootstrap: report.bootstrap,
    critics: report.critics.map((c) => ({
      id: c.id,
      kind: c.kind,
      threshold: c.threshold,
      accuracy: c.accuracy,
      ci: c.ci,
      coverage: c.coverage,
      scored: c.scored,
      total: c.total,
    })),
    pairs: report.pairs.map((p) => ({
      a: p.a,
      b: p.b,
      error_consistency: p.errorConsistency,
      double_fault: p.doubleFault,
      disagreement: p.disagreement,
      n: p.n,
    })),
    inverted: report.inverted,
    duplicates: report.duplicates.map((d) => ({
      a: d.a,
      b: d.b,
      error_consistency: d.errorConsistency,
    })),
  };
}

function nestedBody(nested) {
  if (!nested) return null;
  return {
    folds: nested.folds,
    n: nested.n,
    panel_accuracy: nested.panelAccuracy,
    best_single_accuracy: nested.bestSingleAccuracy,
    difference: nested.difference,
    difference_ci: nested.differenceCi
      ? { low: nested.differenceCi.low, high: nested.differenceCi.high }
      : null,
    per_fold: nested.perFold,
  };
}

function baggedBody(bagged) {
  if (!bagged) return null;
  return {
    bags: bagged.bags,
    seed: bagged.seed,
    members: bagged.members.map((m) => ({
      critic: m.critic,
      count: m.count,
      mean: m.mean,
      sd: m.sd,
      threshold: m.threshold,
      bags_present: m.bagsPresent,
    })),
  };
}

function renderCheck(report) {
  const lines = [];
  lines.push(`jury — ${report.items} items, ${report.groups} groups, seed ${report.seed}, bootstrap ${report.bootstrap}`);
  lines.push("critics");
  for (let i = 0; i < report.critics.length; i++) {
    const c = report.critics[i];
    const kind = c.kind ? `${c.kind}, ` : "";
    lines.push(`  ${c.id}  accuracy ${fmt(c.accuracy)}  CI ${fmtCi(c.ci)}  coverage ${fmt(c.coverage)}  (${kind}threshold ${c.threshold})`);
  }
  lines.push("inverted (accuracy interval entirely below 0.5; scores are not flipped)");
  lines.push(report.inverted.length === 0 ? "  none" : `  ${report.inverted.join(", ")}`);
  lines.push("duplicates (error consistency ≥ 0.9; this cutoff is the studio's rule, not a literature value)");
  if (report.duplicates.length === 0) lines.push("  none");
  else {
    for (let i = 0; i < report.duplicates.length; i++) {
      const d = report.duplicates[i];
      lines.push(`  ${d.a}  ${d.b}  ${fmt(d.errorConsistency)}`);
    }
  }
  lines.push("error consistency");
  if (report.pairs.length === 0) lines.push("  none");
  for (let i = 0; i < report.pairs.length; i++) {
    const p = report.pairs[i];
    lines.push(`  ${p.a}  ${p.b}  kappa ${fmt(p.errorConsistency)}  double-fault ${fmt(p.doubleFault)}  disagreement ${fmt(p.disagreement)}  n ${p.n}`);
  }
  return lines;
}

function renderSelect(report) {
  const lines = renderCheck(report);
  if (!report.bagged) {
    lines.push("selection not run");
  } else {
    lines.push(`bagged panel (${report.bagged.bags} bags, seed ${report.bagged.seed}; kept when chosen in at least half)`);
    if (report.bagged.members.length === 0) lines.push("  none");
    for (let i = 0; i < report.bagged.members.length; i++) {
      const m = report.bagged.members[i];
      lines.push(`  ${m.critic}  × ${m.count}  mean ${fmt(m.mean)}  sd ${fmt(m.sd)}  threshold ${m.threshold}  bags ${m.bagsPresent}`);
    }
  }
  if (!report.nested) {
    lines.push("nested estimate not run");
  } else {
    const n = report.nested;
    lines.push(`nested ${n.folds}-fold, grouped, n ${n.n}`);
    lines.push(`  panel out-of-fold accuracy       ${fmt(n.panelAccuracy)}`);
    lines.push(`  best single out-of-fold accuracy ${fmt(n.bestSingleAccuracy)}`);
    lines.push(`  difference                       ${fmt(n.difference)}  CI ${fmtCi(n.differenceCi)}`);
  }
  const v = report.verdict;
  if (v.decision === "best-single") lines.push(`verdict: best-single (${v.critic})`);
  else lines.push(`verdict: ${v.decision}`);
  lines.push(`  ${v.reason}`);
  return lines;
}

function checkValidation(args) {
  const { flags, positional } = parseArgs(args);
  const loaded = loadValidation(positional[0], true);
  const report = juryCheck(loaded.critics, loaded.items, { seed: DEFAULT_SEED });
  if (flags.json) console.log(JSON.stringify(reportBody(report), null, 2));
  else console.log(renderCheck(report).join("\n"));
}

function selectPanel(args) {
  const { flags, positional } = parseArgs(args);
  const loaded = loadValidation(positional[0], true);
  const opts = selectionOpts(flags);
  const report = jurySelect(loaded.critics, loaded.items, opts);
  const body = {
    ...reportBody(report),
    seed: report.seed,
    verdict: report.verdict,
    bagged: baggedBody(report.bagged),
    nested: nestedBody(report.nested),
    panel_written: false,
  };
  if (typeof flags.out === "string") {
    if (report.verdict.decision !== "panel") {
      body.panel_written = false;
      body.panel_not_written = `verdict is "${report.verdict.decision}". A panel file is written only when the verdict is "panel".`;
    } else {
      const panel = buildPanelFile({
        members: report.bagged.members,
        validationSha256: hashValidation(loaded.doc),
        seed: opts.seed,
        maxSize: opts.maxSize,
        bags: opts.bags,
        folds: opts.folds,
        bootstrap: report.bootstrap,
        nested: report.nested,
      });
      try {
        writeFileSync(flags.out, `${JSON.stringify(panel, null, 2)}\n`);
      } catch (err) {
        throwUsage(`could not write ${flags.out}: ${err.message}`);
      }
      body.panel_written = true;
      body.panel_path = flags.out;
    }
  }
  if (flags.json) {
    console.log(JSON.stringify(body, null, 2));
  } else {
    const lines = renderSelect(report);
    if (typeof flags.out === "string" && report.verdict.decision === "panel") {
      lines.push(`wrote ${flags.out}`);
    } else if (typeof flags.out === "string") {
      lines.push(`not written: verdict is "${report.verdict.decision}". A panel file is written only when the verdict is "panel".`);
    }
    console.log(lines.join("\n"));
  }
}

function scoreNew(args) {
  const { flags, positional } = parseArgs(args);
  const panelDoc = readJson(positional[0], "panel file");
  const panel = parsePanel(panelDoc);
  if (!panel.ok) failParse(panel.errors);
  const loaded = loadValidation(positional[1], false);
  const rows = scoreItems(panel.members, loaded.items, loaded.critics);
  if (flags.json) {
    console.log(JSON.stringify({
      items: rows.map((row) => ({ id: row.id, score: row.score, decision: row.decision })),
    }, null, 2));
    return;
  }
  const lines = ["jury score"];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    lines.push(`  ${row.id}  score ${fmt(row.score)}  decision ${row.decision === null ? "unmeasured" : row.decision}`);
  }
  console.log(lines.join("\n"));
}
