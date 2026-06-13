/**
 * field-log.mjs — append-only JSONL of the inputs a role actually sees in the field, so the
 * field-vs-exam drift check (S5) has a distribution to test against. Default path is the
 * sibling of the events ledger: `<.role-os>/specialist-field-log.jsonl`.
 *
 * Hides one secret family: how a field input is REPRESENTED for drift. Today that is a bounded
 * raw snapshot plus a full-input sha256. The representation-level two-sample test (Rabanser et
 * al. 2019, arXiv:1810.11953) embeds these lazily at ANALYSIS time, with the same embedder used
 * on the sealed exam items — so no embedder choice is pinned in the dispatch hot path (Parnas:
 * the volatile decision stays out of the receipt schema, and out of this module's interface).
 * Consumers call logDispatchInput / readFieldInputs / summarizeFieldInputs and never parse the
 * JSONL themselves.
 *
 * The drift VERDICT (fresh vs stale) is deliberately NOT computed here yet — summarizeFieldInputs
 * reports honest accumulation counts only. The verdict lands once enough field inputs exist and
 * the two-sample test is wired (S5 "later"); until then "monitored"/"stale" are absent by design,
 * not faked (honesty contract, record.mjs findings 16-17).
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

/** Field inputs needed before the two-sample drift test is meaningful (Rabanser 2019). */
export const DRIFT_MIN_SAMPLES = 100;

/** Cap on the stored raw snapshot; the sha256 is always over the FULL canonical input. */
export const FIELD_INPUT_MAX_CHARS = 4000;

/** Canonicalize any input to a stable string (objects via key-sorted JSON, so the sha is order-stable). */
function canonical(input) {
  if (typeof input === "string") return input;
  try { return stableStringify(input); } catch { return String(input); }
}

function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

/** Reduce a verdict to a short categorical label (the BBSDh reducer's class). */
function verdictLabel(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.slice(0, 64);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v).slice(0, 64); } catch { return null; }
}

/**
 * Append one field observation. Best-effort by contract: the caller wraps this so a logging
 * failure never breaks a dispatch. The OUTPUT (verdict + score) is logged alongside the input so
 * the drift detector can reduce each dispatch through the specialist's own output (BBSD — the
 * empirically best reducer, Rabanser et al. 2019) without re-running the model. See
 * design/specialist-drift-detection.md.
 *
 * @param {string} path
 * @param {object} obs
 * @param {string} obs.role
 * @param {string} obs.ts        ISO-8601
 * @param {string} obs.traceId
 * @param {string} obs.route     gate decision: specialist | claude
 * @param {string} obs.source    realized source: specialist | claude
 * @param {*}      obs.input      the dispatch input (any shape)
 * @param {*}      [obs.verdict]  the realized result/verdict (reduced to a categorical label)
 * @param {number} [obs.score]    the specialist's self-reported confidence in [0,1] (specialist source only)
 */
export function logDispatchInput(path, { role, ts, traceId, route, source, input, verdict, score }) {
  const text = canonical(input);
  const truncated = text.length > FIELD_INPUT_MAX_CHARS;
  const label = verdictLabel(verdict);
  const record = {
    role,
    ts,
    trace_id: traceId,
    route,
    source,
    input_sha256: createHash("sha256").update(text).digest("hex"),
    input_len: text.length,
    input: truncated ? text.slice(0, FIELD_INPUT_MAX_CHARS) : text,
    ...(truncated ? { input_truncated: true } : {}),
    ...(label !== null ? { verdict: label } : {}),
    ...(typeof score === "number" ? { score } : {}),
  };
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(record) + "\n", "utf8");
}

/**
 * Read field-input observations, optionally filtered by role. File order (oldest first).
 * Non-parsing lines are skipped (operator-editable in a pinch), matching events.mjs.
 *
 * @param {string} path
 * @param {object} [filter]
 * @param {string} [filter.role]
 */
export function readFieldInputs(path, filter = {}) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    let rec;
    try { rec = JSON.parse(s); } catch { continue; }
    if (!rec || typeof rec !== "object") continue;
    if (filter.role && rec.role !== filter.role) continue;
    out.push(rec);
  }
  return out;
}

/**
 * Accumulation summary for the Record's divergence field — honest counts only, no drift verdict
 * (that lands with the two-sample test once `samples >= minSamples`). Status ladder:
 *   "unmonitored"  — no field inputs logged yet (matches the pre-S5 placeholder)
 *   "accumulating" — collecting toward the test threshold; `test_ready` flips at minSamples
 * The "monitored"/"stale" verdict states are intentionally future work, not emitted here.
 *
 * @param {string} path
 * @param {object} [opts]
 * @param {string} [opts.role]
 * @param {number} [opts.minSamples]  threshold the drift test needs; default DRIFT_MIN_SAMPLES
 */
export function summarizeFieldInputs(path, { role, minSamples = DRIFT_MIN_SAMPLES } = {}) {
  const rows = readFieldInputs(path, { role });
  if (!rows.length) {
    return { status: "unmonitored", samples: 0, min_samples: minSamples, note: "no field inputs logged yet" };
  }
  const distinct = new Set(rows.map((r) => r.input_sha256)).size;
  const ready = rows.length >= minSamples;
  return {
    status: "accumulating",
    samples: rows.length,
    distinct_inputs: distinct,
    specialist_routed: rows.filter((r) => r.source === "specialist").length,
    min_samples: minSamples,
    test_ready: ready,
    last_seen: rows[rows.length - 1].ts,
    note: ready
      ? `${rows.length} field inputs (>= ${minSamples}) — ready for the field-vs-exam two-sample test`
      : `${rows.length}/${minSamples} field inputs toward the drift test`,
  };
}
