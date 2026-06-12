/**
 * Specialist registry — load + validate `.role-os/specialists.json`.
 *
 * Hides one secret family (Parnas CACM 1972): the on-disk schema and the reject conditions
 * R1-R7 from `starter-pack/schemas/specialist.md`. Callers see a Map<role, entry> and the
 * resolved active version; they never parse the file themselves.
 *
 * Reject 1 (same-family base) and R3/R4 (id collisions / dangling pointer) are correctness
 * invariants — no bypass flag. R2 (uncertified active) is also a load-time reject so a
 * misedited file cannot route to L0.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const REGISTRY_SCHEMA = "roleos-specialist-registry/v1";

/** Known Claude-family base-model prefixes — refused by R1 at load. Conservative; widen as needed. */
const CLAUDE_FAMILY_PREFIXES = [
  "claude-",
  "anthropic/",
  "anthropic.",
];

export function isClaudeFamily(baseModel) {
  if (typeof baseModel !== "string") return false;
  const m = baseModel.toLowerCase();
  return CLAUDE_FAMILY_PREFIXES.some((p) => m.startsWith(p));
}

/**
 * @typedef {object} SpecialistVersion
 * @property {string} id
 * @property {string} adapter_id
 * @property {string} base_model
 * @property {number} gate_threshold
 * @property {string} certified_level
 * @property {string} exam_hash
 * @property {number} field_audit_window
 * @property {string} created_at
 * @property {string} [notes]
 * @property {number[]} [exam_centroid]      optional pre-computed centroid for embedding-similarity scoring
 */

/**
 * @typedef {object} SpecialistEntry
 * @property {string} role
 * @property {string} backend_url
 * @property {string} fallback           must be "claude" in v0.1
 * @property {number} workload_quota     in (0, 1]
 * @property {string|null} active_version  id from versions[], or null
 * @property {SpecialistVersion[]} versions
 */

/**
 * @typedef {object} Registry
 * @property {string} schema
 * @property {SpecialistEntry[]} specialists
 */

/**
 * Load a registry from disk. Returns `{ registry, byRole, errors }`.
 *
 * - If the file does not exist, returns an empty registry (`{ specialists: [] }`) with no
 *   errors — the framework's default state is "no specialists deployed", and that must not
 *   fail load.
 * - If the file exists but fails validation, returns `errors[]` populated and `byRole` empty
 *   (a partial registry is not a registry).
 */
export function loadRegistry(path) {
  if (!existsSync(path)) {
    return { registry: emptyRegistry(), byRole: new Map(), errors: [] };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return {
      registry: emptyRegistry(),
      byRole: new Map(),
      errors: [`registry parse error: ${err.message}`],
    };
  }
  const { ok, errors } = validateRegistry(raw);
  if (!ok) return { registry: emptyRegistry(), byRole: new Map(), errors };
  const byRole = new Map();
  for (const e of raw.specialists) byRole.set(e.role, e);
  return { registry: raw, byRole, errors: [] };
}

/** Persist a registry to disk. Creates the parent directory if needed. Atomic-ish write. */
export function saveRegistry(path, raw) {
  const { ok, errors } = validateRegistry(raw);
  if (!ok) {
    const err = new Error(`refusing to save invalid registry: ${errors.join("; ")}`);
    err.code = "REGISTRY_INVALID";
    err.errors = errors;
    throw err;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(raw, null, 2) + "\n", "utf8");
}

export function emptyRegistry() {
  return { schema: REGISTRY_SCHEMA, specialists: [] };
}

/**
 * Validate a parsed registry against R1-R7 (see schema doc). Returns `{ ok, errors }`.
 * Validation is total — every error is reported, not just the first.
 */
export function validateRegistry(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["registry is not an object"] };
  }
  // R7: schema major version
  if (raw.schema !== REGISTRY_SCHEMA) {
    errors.push(`R7: schema mismatch — got "${raw.schema}", expected "${REGISTRY_SCHEMA}"`);
  }
  if (!Array.isArray(raw.specialists)) {
    errors.push("registry.specialists must be an array");
    return { ok: false, errors };
  }
  const seenRoles = new Set();
  for (let i = 0; i < raw.specialists.length; i++) {
    const e = raw.specialists[i];
    const tag = `specialists[${i}]${e && e.role ? ` (role="${e.role}")` : ""}`;
    if (!e || typeof e !== "object") {
      errors.push(`${tag}: not an object`);
      continue;
    }
    if (typeof e.role !== "string" || !e.role) errors.push(`${tag}: role must be a non-empty string`);
    if (e.role && seenRoles.has(e.role)) errors.push(`${tag}: duplicate role`);
    if (e.role) seenRoles.add(e.role);
    if (typeof e.backend_url !== "string" || !e.backend_url) errors.push(`${tag}: backend_url must be a non-empty string`);
    if (e.fallback !== "claude") errors.push(`${tag}: fallback must be "claude" in v0.1 (got "${e.fallback}")`);
    // R6
    if (typeof e.workload_quota !== "number" || !(e.workload_quota > 0 && e.workload_quota <= 1)) {
      errors.push(`${tag}: R6 — workload_quota must be in (0, 1] (got ${e.workload_quota})`);
    }
    if (!Array.isArray(e.versions)) {
      errors.push(`${tag}: versions must be an array`);
      continue;
    }
    // R3: id collisions inside versions[]
    const seenIds = new Set();
    for (let j = 0; j < e.versions.length; j++) {
      const v = e.versions[j];
      const vtag = `${tag}.versions[${j}]${v && v.id ? ` (id="${v.id}")` : ""}`;
      const vErrors = validateVersion(v, vtag);
      errors.push(...vErrors);
      if (v && typeof v.id === "string") {
        if (seenIds.has(v.id)) errors.push(`${vtag}: R3 — duplicate version id within role`);
        seenIds.add(v.id);
      }
    }
    // R4: active_version must appear in versions[] (or be null)
    if (e.active_version !== null && e.active_version !== undefined) {
      if (typeof e.active_version !== "string") {
        errors.push(`${tag}: active_version must be a string or null`);
      } else if (!seenIds.has(e.active_version)) {
        errors.push(`${tag}: R4 — active_version "${e.active_version}" not found in versions[]`);
      } else {
        // R2: active_version must point to a certified (non-L0) version
        const active = e.versions.find((v) => v && v.id === e.active_version);
        if (active && active.certified_level === "L0") {
          errors.push(`${tag}: R2 — active_version "${e.active_version}" is L0 (uncertified); cannot be active`);
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateVersion(v, tag) {
  const errors = [];
  if (!v || typeof v !== "object") return [`${tag}: not an object`];
  if (typeof v.id !== "string" || !v.id) errors.push(`${tag}: id must be a non-empty string`);
  if (typeof v.adapter_id !== "string" || !v.adapter_id) errors.push(`${tag}: adapter_id must be a non-empty string`);
  if (typeof v.base_model !== "string" || !v.base_model) {
    errors.push(`${tag}: base_model must be a non-empty string`);
  } else if (isClaudeFamily(v.base_model)) {
    // R1: same-family base is a correctness regression, not a routing preference.
    errors.push(`${tag}: R1 — base_model "${v.base_model}" is Claude-family; specialists must be cross-family`);
  }
  // R5
  if (typeof v.gate_threshold !== "number" || !(v.gate_threshold >= 0 && v.gate_threshold <= 1)) {
    errors.push(`${tag}: R5 — gate_threshold must be in [0, 1] (got ${v.gate_threshold})`);
  }
  if (typeof v.certified_level !== "string" || !v.certified_level) {
    errors.push(`${tag}: certified_level must be a non-empty string (e.g. "L0", "L1", …)`);
  }
  if (typeof v.exam_hash !== "string" || !v.exam_hash) errors.push(`${tag}: exam_hash must be a non-empty string`);
  if (typeof v.field_audit_window !== "number" || v.field_audit_window <= 0) {
    errors.push(`${tag}: field_audit_window must be a positive number`);
  }
  if (typeof v.created_at !== "string" || !v.created_at) errors.push(`${tag}: created_at must be a non-empty ISO-8601 string`);
  if (v.exam_centroid !== undefined && !Array.isArray(v.exam_centroid)) {
    errors.push(`${tag}: exam_centroid, if present, must be an array of numbers`);
  }
  // lineage: cross-trained versions record their ancestry (specialists layer S4) — the
  // parents are version ids (possibly from other roles' entries) and method names the merge.
  if (v.lineage !== undefined) {
    const l = v.lineage;
    if (!l || typeof l !== "object" || !Array.isArray(l.parents) || l.parents.length < 2
        || !l.parents.every((p) => typeof p === "string" && p)
        || typeof l.method !== "string" || !l.method) {
      errors.push(`${tag}: lineage, if present, must be { parents: [>=2 version-id strings], method: string }`);
    }
  }
  // ood_floor feeds defaultOodFn directly (gate.mjs): a string silently falls back to the 0.4
  // default and a value outside cosine range disables routing entirely — both must fail loudly
  // at load time, mirroring the R5 gate_threshold check.
  if (v.ood_floor !== undefined && (typeof v.ood_floor !== "number" || !(v.ood_floor >= -1 && v.ood_floor <= 1))) {
    errors.push(`${tag}: R5 — ood_floor, if present, must be a number in [-1, 1] (cosine range; got ${JSON.stringify(v.ood_floor)})`);
  }
  return errors;
}

/**
 * Resolve the active version for a registry entry. Returns the version object, or null if
 * `active_version` is null. Throws if the registry was malformed (which loadRegistry would
 * have already rejected, so callers should not normally see this).
 */
export function resolveActiveVersion(entry) {
  if (!entry || !entry.active_version) return null;
  const v = entry.versions.find((x) => x && x.id === entry.active_version);
  if (!v) {
    const err = new Error(`active_version "${entry.active_version}" not found in versions[]`);
    err.code = "REGISTRY_DANGLING_POINTER";
    throw err;
  }
  return v;
}
