/**
 * Specialist event log — append-only JSONL of operator actions (promote, rollback, halt,
 * clear-halt) and shadow-probe outcomes. Default path:
 * `<repo>/.role-os/specialist-events.jsonl`. Override with `ROLEOS_SPECIALIST_EVENTS_PATH`.
 *
 * Hides one secret family: the history representation. Operators read the log; the rest of
 * the tier sees `appendEvent` / `readEvents` and does not parse JSONL.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * @typedef {object} SpecialistEvent
 * @property {string} kind         one of: promote | rollback | halt | clear-halt | shadow-probe
 * @property {string} role
 * @property {string} ts           ISO-8601
 * @property {object} [data]       kind-specific payload
 */

/** Append a single event to the log. Creates the parent directory if needed. */
export function appendEvent(path, event) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(event) + "\n", "utf8");
}

/**
 * Read events from the log, optionally filtered. Returns events in file order (oldest
 * first). Lines that don't parse as JSON are skipped silently — the log is operator-edited
 * in a pinch.
 *
 * @param {string} path
 * @param {object} [filter]
 * @param {string} [filter.role]
 * @param {string|string[]} [filter.kind]
 * @returns {SpecialistEvent[]}
 */
export function readEvents(path, filter = {}) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const kindSet = filter.kind
    ? new Set(Array.isArray(filter.kind) ? filter.kind : [filter.kind])
    : null;
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    let ev;
    try { ev = JSON.parse(s); } catch { continue; }
    if (!ev || typeof ev !== "object") continue;
    if (filter.role && ev.role !== filter.role) continue;
    if (kindSet && !kindSet.has(ev.kind)) continue;
    out.push(ev);
  }
  return out;
}
