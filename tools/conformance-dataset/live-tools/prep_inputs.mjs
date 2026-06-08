/**
 * Extract the Workflow-1 output into raw.json (blind-authored constraints) + corpus.json (blind-authored
 * example calls), and apply the two PROVENANCE-MARKED additions: numeric range constraints the authors
 * omitted because the ground-truth params lacked a `max` (the schema floor has no min support and only
 * checks max when set), so they assumed schema-floor coverage that did not exist. The added bounds are
 * mechanical transcriptions of the REAL MCP schemas (top_k 1..100, preview_chars 0..500, max_words 10..400)
 * and are still validated downstream by the guard + the independent adversarial refutation pass.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2];
if (!OUT) { console.error("usage: node prep_inputs.mjs <workflow-output.json>"); process.exit(1); }

const payload = JSON.parse(readFileSync(OUT, "utf-8"));
const result = payload.result || payload;
const authored = result.authored;
const examples = result.examples;
if (!Array.isArray(authored) || !Array.isArray(examples)) { console.error("bad payload shape"); process.exit(1); }

const ADD = {
  "mcp__ollama-intern__ollama_corpus_search": [
    { kind: "cmp", op: "ge", left: "top_k", right: 1, _added: "real-schema minimum:1" },
    { kind: "cmp", op: "le", left: "top_k", right: 100, _added: "real-schema maximum:100" },
    { kind: "cmp", op: "ge", left: "preview_chars", right: 0, _added: "real-schema minimum:0" },
    { kind: "cmp", op: "le", left: "preview_chars", right: 500, _added: "real-schema maximum:500" },
  ],
  "mcp__ollama-intern__ollama_summarize_fast": [
    { kind: "cmp", op: "ge", left: "max_words", right: 10, _added: "real-schema minimum:10" },
    { kind: "cmp", op: "le", left: "max_words", right: 400, _added: "real-schema maximum:400" },
  ],
};

let addedCount = 0;
for (const a of authored) {
  if (ADD[a.tool]) {
    a.constraints = [...(a.constraints || []), ...ADD[a.tool]];
    a.notes = (a.notes || "") + ` [build-author added ${ADD[a.tool].length} range constraint(s) from the real MCP schema min/max; the schema floor lacks min support and no max was set on these params.]`;
    addedCount += ADD[a.tool].length;
  }
}

writeFileSync(join(HERE, "raw.json"), JSON.stringify(authored, null, 2) + "\n");
writeFileSync(join(HERE, "corpus.json"), JSON.stringify(examples, null, 2) + "\n");
const totalC = authored.reduce((n, a) => n + (a.constraints ? a.constraints.length : 0), 0);
const totalConf = examples.reduce((n, e) => n + (e.conformant_args ? e.conformant_args.length : 0), 0);
const totalViol = examples.reduce((n, e) => n + (e.violation_args ? e.violation_args.length : 0), 0);
console.log(`raw.json: ${authored.length} tools, ${totalC} constraints (incl ${addedCount} added range bounds)`);
console.log(`corpus.json: ${examples.length} tools, ${totalConf} conformant calls, ${totalViol} violation calls`);
