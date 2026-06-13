/**
 * record.mjs — the Record: a role's verified performance ledger, assembled read-only from
 * the receipts that actually exist (specialist registry, events ledger, dispatch state,
 * run history, outcome ledger). The Record is a reliance-calibration instrument: it teaches
 * the director when to trust which crew member (design/specialists-layer.md, finding 21).
 *
 * Honesty contract: absent ledgers yield explicit empty states ("unmeasured", null, []) —
 * never invented numbers (findings 16-17). Techniques are EARNED: derived from
 * receipt-backed predicates only, never authored, never farmable (finding 5). Reps count
 * verified events — certifications, exams, accepted field work — never calendar units or
 * raw activity volume (findings 2, 4).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readEvents } from "./events.mjs";
import { summarizeFieldInputs } from "./field-log.mjs";
import { assessDriftFromLog } from "./drift.mjs";
import { loadState, quotaStateFor, DEFAULT_WINDOW } from "./state.mjs";
import { readOutcomes } from "../calibration.mjs";

const REGISTRY_PATH = ".role-os/specialists.json";
const STATE_PATH = ".role-os/specialist-state.json";
const EVENTS_PATH = ".role-os/specialist-events.jsonl";
const FIELD_LOG_PATH = ".role-os/specialist-field-log.jsonl";
const EXAM_REF_DIR = ".role-os/exam-references";
const RUNS_DIR = ".claude/runs";

/** Shadow-probe streak required before the shadow-verified technique is earned. */
export const SHADOW_VERIFIED_MIN_PROBES = 25;

// ── ledger readers (each tolerant of absence) ──────────────────────────────────

function readRegistryEntry(role, cwd) {
  const path = join(cwd, REGISTRY_PATH);
  if (!existsSync(path)) return null;
  let reg;
  try { reg = JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
  const entry = (reg?.specialists || []).find((s) => s.role === role);
  if (!entry) return null;
  const active = (entry.versions || []).find((v) => v.id === entry.active_version) || null;
  return { entry, active };
}

function readRoleEvents(role, cwd) {
  const path = join(cwd, EVENTS_PATH);
  if (!existsSync(path)) return [];
  try { return readEvents(path, { role }); } catch { return []; }
}

/** Role display name → exam-reference filename slug. */
function examRefSlug(role) {
  return String(role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The sealed-exam reference (roleos-exam-reference/v1) for a role, or null if not captured yet. */
function readExamReference(role, cwd) {
  const path = join(cwd, EXAM_REF_DIR, `${examRefSlug(role)}.json`);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

/**
 * Field-vs-exam drift state (S5). Two regimes:
 *  - No sealed-exam reference yet → accumulation counts only (the reference is a cert-time
 *    capture; until it exists the detector cannot test). Absent log → "unmonitored", matching the
 *    pre-S5 placeholder so the crew sheet and the empty-state contract are unchanged at zero traffic.
 *  - Reference present → the two-arm staleness detector (drift.mjs): status in
 *    {accumulating, watch, stale, monitored, monitored-lowpower}. `stale` is advisory only.
 */
function readDivergence(role, cwd) {
  const logPath = join(cwd, FIELD_LOG_PATH);
  const reference = readExamReference(role, cwd);
  if (!reference) {
    try { return summarizeFieldInputs(logPath, { role }); }
    catch { return { status: "unmonitored", samples: 0, note: "field log unreadable" }; }
  }
  try { return assessDriftFromLog(logPath, { role, reference }); }
  catch { return { status: "unmonitored", note: "drift assessment failed" }; }
}

function readDispatchWindow(cwd) {
  const path = join(cwd, STATE_PATH);
  if (!existsSync(path)) return null;
  let state;
  try { state = loadState(path); } catch { return null; }
  const { used, window } = quotaStateFor(state, DEFAULT_WINDOW);
  const total = Math.min(state.dispatches.length, window);
  return {
    scope: "repo-shared", // the v2 window is the repo's dispatch ledger, not per-role
    window,
    recorded: total,
    specialist: used,
    claude: total - used,
  };
}

function readRunSteps(role, cwd) {
  const dir = join(cwd, RUNS_DIR);
  if (!existsSync(dir)) return [];
  const steps = [];
  let files;
  try { files = readdirSync(dir).filter((f) => f.endsWith(".json")); } catch { return []; }
  for (const f of files) {
    let run;
    try { run = JSON.parse(readFileSync(join(dir, f), "utf8")); } catch { continue; }
    for (const s of run?.steps || []) {
      if (s?.role === role) steps.push({ run: run.id || f, produces: s.produces || null, status: s.status || "unknown", completedAt: s.completedAt || null });
    }
  }
  return steps;
}

function readRoleOutcomes(role, cwd) {
  let rows;
  try { rows = readOutcomes(cwd); } catch { return null; }
  const mine = rows.filter((o) => Array.isArray(o.rolesUsed) && o.rolesUsed.includes(role));
  if (!mine.length) return null;
  const by = (status) => mine.filter((o) => o.completionStatus === status).length;
  return {
    runs: mine.length,
    completed: by("completed"),
    blocked: by("blocked"),
    failed: by("failed"),
    abandoned: by("abandoned"),
    corrections: mine.reduce((n, o) => n + (o.corrections || 0), 0),
    rejectedVerdicts: mine.reduce((n, o) => n + (o.rejectedVerdicts || 0), 0),
  };
}

// ── derived views ───────────────────────────────────────────────────────────────

function probeSummary(events) {
  // Probes since the last clear-halt: the operator boundary — see shadow.mjs.
  const relevant = events.filter((e) => e.kind === "shadow-probe" || e.kind === "clear-halt");
  const lastClear = relevant.map((e) => e.kind).lastIndexOf("clear-halt");
  const probes = relevant.slice(lastClear + 1).filter((e) => e.kind === "shadow-probe");
  if (!probes.length) return null;
  const agreed = probes.filter((e) => e?.data?.agreed === true).length;
  return { count: probes.length, agreed, disagreed: probes.length - agreed };
}

/**
 * Verified events feeding reps (design: reps = training/exam/field receipts, never
 * calendar units). Sources: certification-ledger events + accepted run steps.
 */
function verifiedEvents(events, runSteps) {
  const out = [];
  for (const e of events) {
    if (e.kind === "register" || e.kind === "promote" || e.kind === "rollback") {
      out.push({ t: e.ts, kind: e.kind === "register" ? "certification" : e.kind, ref: e?.data?.version_id || e?.data?.to_version || null });
    } else if (e.kind === "certification-attempt") {
      // A failed attempt is still a verified exam event — every attempt counts (finding 16).
      out.push({ t: e.ts, kind: "exam-attempt", ref: e?.data?.candidate || null });
    }
  }
  for (const s of runSteps) {
    if (s.status === "complete") out.push({ t: s.completedAt, kind: "field", ref: `${s.run}:${s.produces || "step"}` });
  }
  return out.sort((a, b) => String(a.t).localeCompare(String(b.t)));
}

/**
 * Techniques are earned distinctions derived from receipt-backed predicates — every rule
 * names the receipts that earned it, and there is no rule a repeatable low-value action can
 * advance (finding 5: non-farmable by construction).
 */
export function deriveTechniques({ certification, events, versions = [], activeVersionId = null }) {
  const techniques = [];

  // Clean promotion: certified + promoted with zero rollback/halt receipts on the ledger.
  const promotes = events.filter((e) => e.kind === "promote");
  const blemishes = events.filter((e) => e.kind === "rollback" || e.kind === "halt");
  if (certification?.current && promotes.length > 0 && blemishes.length === 0) {
    techniques.push({
      id: "clean-promotion",
      name: "Clean promotion",
      desc: "Certified and fielded with no rollback or halt on the ledger.",
      earned: promotes[promotes.length - 1].ts,
      receipts: promotes.map((e) => `promote:${e?.data?.to_version || "?"}@${e.ts}`),
    });
  }

  // Shadow-verified: a long unbroken streak of reference-agreement probes.
  const probes = probeSummary(events);
  if (probes && probes.count >= SHADOW_VERIFIED_MIN_PROBES && probes.disagreed === 0) {
    techniques.push({
      id: "shadow-verified",
      name: "Shadow-verified",
      desc: `${probes.count} consecutive shadow probes agreed with the reference model since the last operator boundary.`,
      earned: null,
      receipts: [`shadow-probes:${probes.count} agreed:${probes.agreed}`],
    });
  }

  // Cross-trained: a CERTIFIED version was born by merging certified parents and passed BOTH
  // parents' exams — lineage only enters the registry through the exam gate (S4). The distinction
  // is earned at that gate, NOT at promotion: a cross-trained version that was registered but never
  // promoted to active still earned it (clean-promotion above is the promotion-scoped technique).
  // So derive from the full version list — preferring the active version for the served receipts —
  // not only certification.current, which would hide a registered-but-not-promoted soup (S4c-2).
  const xQualifies = (v) =>
    v?.lineage?.parents?.length >= 2 && v.certified_level && v.certified_level !== "L0";
  const xVersions = versions.filter(xQualifies);
  if (xVersions.length) {
    const v = xVersions.find((x) => x.id === activeVersionId)
      || [...xVersions].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    const isActive = v.id === activeVersionId;
    techniques.push({
      id: "cross-trained",
      name: "Cross-trained",
      desc: `Born from ${v.lineage.parents.join(" × ")} via ${v.lineage.method}; certified on every parent's exam${isActive ? "" : " — registered, not the active version"}.`,
      earned: v.created_at || null,
      receipts: [
        ...v.lineage.parents.map((p) => `parent:${p}`),
        `exam:${v.exam_hash ? v.exam_hash.slice(0, 12) : "?"}`,
        `version:${v.id} (${isActive ? "active" : "registered"})`,
      ],
    });
  }

  return techniques;
}

/**
 * Cross-training compatibility — the parent task-vector cosine cross_train.py already wrote to the
 * ledger, surfaced as a pre-run interference FLAG (S6 finding 21, Ilharco 2023). Near-orthogonal task
 * vectors compose with low interference; a negative cosine predicts interference. Honest caveat: S4d
 * showed cosine alone is NOT decisive (untraining collapsed despite cos 0.074) — a flag, not a proof.
 * Pure reuse of the compatibility block on certification-attempt events; null when none exist.
 */
function readCompatibility(events) {
  const withCompat = events.filter((e) => e.kind === "certification-attempt" && e?.data?.compatibility);
  if (!withCompat.length) return null;
  const a = withCompat[withCompat.length - 1]; // most recent readout for this role
  const c = a.data.compatibility;
  const cos = typeof c.mean_cosine === "number" ? c.mean_cosine : null;
  const reading = cos === null ? "unmeasured"
    : cos < 0 ? "negative — predicted interference"
    : cos < 0.2 ? "near-orthogonal — composes with low interference (a flag, not a proof — see S4d)"
    : "related — reinforcing direction";
  return {
    parents: a.data.lineage?.parents || null,
    method: a.data.lineage?.method || null,
    mean_cosine: cos,
    sign_agreement: typeof c.sign_agreement_on_overlap === "number" ? c.sign_agreement_on_overlap : null,
    overlap_jaccard: typeof c.mean_overlap_jaccard === "number" ? c.mean_overlap_jaccard : null,
    reading,
  };
}

/**
 * Assemble the Record for a role. Read-only; every field traces to a ledger or is an
 * explicit empty state.
 *
 * @param {string} role  display name, e.g. "Token Budget Analyst"
 * @param {{cwd?: string}} [opts]
 */
export function buildRecord(role, { cwd = process.cwd() } = {}) {
  const reg = readRegistryEntry(role, cwd);
  const events = readRoleEvents(role, cwd);
  const runSteps = readRunSteps(role, cwd);

  const certification = {
    current: reg?.active
      ? {
          version_id: reg.active.id,
          certified_level: reg.active.certified_level,
          exam_hash: reg.active.exam_hash || null,
          exam_artifact: reg.active.exam_artifact || null,
          certified_at: reg.active.created_at || null,
          lineage: reg.active.lineage || null,
        }
      : null,
    basis: reg?.active ? "certified" : "assessed",
    band: null, // conservative skill interval — null until the exam pipeline emits one
    ledger: events.filter((e) => ["register", "promote", "rollback", "halt", "clear-halt", "certification-attempt"].includes(e.kind)),
  };

  const perTaskMap = new Map();
  for (const s of runSteps) {
    const key = s.produces || "(unspecified)";
    const row = perTaskMap.get(key) || { produces: key, complete: 0, failed: 0, blocked: 0, other: 0 };
    if (s.status === "complete") row.complete++;
    else if (s.status === "failed") row.failed++;
    else if (s.status === "blocked") row.blocked++;
    else row.other++;
    perTaskMap.set(key, row);
  }

  const record = {
    role,
    certification,
    field: {
      dispatchWindow: readDispatchWindow(cwd),
      probes: probeSummary(events),
      perTask: [...perTaskMap.values()],
      outcomes: readRoleOutcomes(role, cwd),
      overrides: null, // override-was-right/wrong is not instrumented yet — honest null
    },
    calibration: null, // ECE lands with forecast-receipt instrumentation (finding 18)
    divergence: readDivergence(role, cwd),
    compatibility: readCompatibility(events), // S6.2 pre-run interference flag (reused cross-train cosine)
    repsEvents: verifiedEvents(events, runSteps),
    events,
  };
  record.techniques = deriveTechniques({
    certification,
    events,
    versions: reg?.entry?.versions || [],
    activeVersionId: reg?.entry?.active_version || null,
  });
  return record;
}
