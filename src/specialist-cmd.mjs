/**
 * `roleos specialist <subcommand>` — the operator surface for the specialist tier.
 *
 * Subcommands:
 *   list                           — show all roles in the registry + active version + cert level
 *   status [--role <role>]         — registry + halt state + quota state, per role
 *   register <role> <version.json> — add a new version to a role's versions[] (or create role)
 *   promote <role> <version-id>    — set active_version (refused if version is L0 — Reject 2)
 *   rollback <role> <version-id>   — set active_version to a prior certified version (the
 *                                    NAMED COMPENSATOR; pure pointer swap, no retrain)
 *   clear-halt <role> [--reason]   — clear a shadow-probe halt
 *
 * All mutating subcommands write a receipt to the events log.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadRegistry,
  saveRegistry,
  emptyRegistry,
  resolveActiveVersion,
} from "./specialist/registry.mjs";
import {
  loadState,
  saveState,
  emptyState,
  getHalt,
  setHalt,
  quotaStateFor,
} from "./specialist/state.mjs";
import {
  appendEvent,
  readEvents,
} from "./specialist/events.mjs";
import { appendClearHaltEvent } from "./specialist/shadow.mjs";
import { markFor } from "./crew-cmd.mjs";
import { readFileSafe } from "./fs-utils.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY_PATH = ".role-os/specialists.json";
const DEFAULT_STATE_PATH = ".role-os/specialist-state.json";
const DEFAULT_EVENTS_PATH = ".role-os/specialist-events.jsonl";

export async function specialistCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":       return listSpecialists(rest);
    case "status":     return statusSpecialists(rest);
    case "register":   return registerSpecialist(rest);
    case "promote":    return promoteSpecialist(rest);
    case "rollback":   return rollbackSpecialist(rest);
    case "clear-halt": return clearHaltSpecialist(rest);
    case undefined:
    case "--help":
    case "-h":
    case "help":
      return printHelp();
    default: {
      const err = new Error(`Unknown specialist subcommand: ${sub}`);
      err.exitCode = 1;
      err.hint = "Run 'roleos specialist help' for usage.";
      throw err;
    }
  }
}

function printHelp() {
  console.log(`
roleos specialist — manage the specialist tier (trained adapters fronted by a fail-open gate).

Usage:
  roleos specialist list
  roleos specialist status [--role <role>] [--json]
  roleos specialist register <role> <version.json>
  roleos specialist promote <role> <version-id> [--operator <name>]
  roleos specialist rollback <role> <version-id> [--operator <name>] [--reason <text>]
  roleos specialist clear-halt <role> [--operator <name>] [--reason <text>]

Paths (overridable via env):
  registry: ROLEOS_SPECIALISTS_PATH         (default ${DEFAULT_REGISTRY_PATH})
  state:    ROLEOS_SPECIALIST_STATE_PATH    (default ${DEFAULT_STATE_PATH})
  events:   ROLEOS_SPECIALIST_EVENTS_PATH   (default ${DEFAULT_EVENTS_PATH})

Notes:
  - 'promote' is refused if the target version is L0 (uncertified) — Reject 2.
  - 'rollback' is the named compensator: a pure pointer swap, no retrain, no adapter delete.
  - All mutating subcommands append an event to the events log.
  - See starter-pack/policy/specialist-tier.md for the dispatch law and reject conditions.
`);
}

// ── list ────────────────────────────────────────────────────────────────────────────────────

function listSpecialists(args) {
  const { flags } = parseArgs(args);
  const registryPath = flags.registry ? resolve(flags.registry) : registryPathFromEnv();
  const { registry, byRole, errors } = loadRegistry(registryPath);
  if (errors.length) {
    console.error("Registry errors:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  if (registry.specialists.length === 0) {
    console.log(`(no specialists registered at ${registryPath})`);
    return;
  }
  console.log(`Registry: ${registryPath}`);
  console.log(``);
  for (const entry of registry.specialists) {
    const active = entry.active_version
      ? entry.versions.find((v) => v.id === entry.active_version)
      : null;
    const activeStr = active
      ? `active=${active.id} (${active.certified_level})`
      : `active=null (no certified specialist routed for this role)`;
    console.log(`  ${entry.role}  —  ${activeStr}, quota=${entry.workload_quota}, versions=${entry.versions.length}`);
    for (const v of entry.versions) {
      const tag = v.id === entry.active_version ? "*" : " ";
      console.log(`    ${tag} ${v.id}  ${v.certified_level}  base=${v.base_model}  adapter=${v.adapter_id}`);
    }
  }
}

// ── status ──────────────────────────────────────────────────────────────────────────────────

function statusSpecialists(args) {
  const { flags } = parseArgs(args);
  const registryPath = flags.registry ? resolve(flags.registry) : registryPathFromEnv();
  const statePath = flags.state ? resolve(flags.state) : statePathFromEnv();
  const eventsPath = flags.events ? resolve(flags.events) : eventsPathFromEnv();
  const windowSize = Number.isFinite(Number(flags.window)) ? Number(flags.window) : 200;

  const { byRole, errors } = loadRegistry(registryPath);
  if (errors.length) {
    console.error("Registry errors:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  let state;
  try { state = loadState(statePath); }
  catch (err) {
    console.error(`State load error: ${err.message}`);
    state = emptyState();
  }

  const roles = flags.role ? [flags.role] : [...byRole.keys()];
  const report = roles.map((role) => {
    const entry = byRole.get(role);
    if (!entry) return { role, error: "no_registry_entry" };
    const active = entry.active_version
      ? entry.versions.find((v) => v.id === entry.active_version)
      : null;
    const quota = quotaStateFor(state, role, windowSize);
    const halt = getHalt(state, role);
    return {
      role,
      backend_url: entry.backend_url,
      active_version: entry.active_version,
      certified_level: active ? active.certified_level : null,
      quota: { used: quota.used, window: quota.window, share: quota.used / quota.window, cap: entry.workload_quota },
      halt: halt.halted ? { halted: true, reason: halt.reason, since: halt.since } : { halted: false },
    };
  });

  if (flags.json === true) {
    console.log(JSON.stringify({ registry: registryPath, state: statePath, events: eventsPath, roles: report }, null, 2));
    return;
  }
  console.log(`Registry: ${registryPath}`);
  console.log(`State:    ${statePath}`);
  console.log(`Events:   ${eventsPath}`);
  console.log(``);
  for (const r of report) {
    if (r.error) {
      console.log(`  ${r.role}: ERROR ${r.error}`);
      continue;
    }
    const haltStr = r.halt.halted ? `HALTED — ${r.halt.reason}` : "ok";
    console.log(`  ${r.role}:`);
    console.log(`    active:  ${r.active_version || "(none)"} (${r.certified_level || "-"})`);
    console.log(`    quota:   ${r.quota.used}/${r.quota.window}  (share=${(r.quota.share * 100).toFixed(1)}%, cap=${(r.quota.cap * 100).toFixed(0)}%)`);
    console.log(`    backend: ${r.backend_url}`);
    console.log(`    halt:    ${haltStr}`);
  }
}

// ── register ────────────────────────────────────────────────────────────────────────────────

function registerSpecialist(args) {
  const { flags, positional } = parseArgs(args);
  const role = positional[0];
  const versionFile = positional[1];
  if (!role || !versionFile) {
    throwUsage("register <role> <version.json>");
  }
  if (!existsSync(versionFile)) {
    throwUsage(`version file not found: ${versionFile}`);
  }
  let version;
  try { version = JSON.parse(readFileSync(versionFile, "utf8")); }
  catch (err) { throwUsage(`version file not valid JSON: ${err.message}`); }
  const registryPath = flags.registry ? resolve(flags.registry) : registryPathFromEnv();
  const { registry: loaded, errors } = loadRegistry(registryPath);
  if (errors.length) {
    console.error("Registry errors (refusing to register):");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  const registry = loaded.specialists ? loaded : emptyRegistry();
  let entry = registry.specialists.find((s) => s.role === role);
  if (!entry) {
    if (typeof flags["backend-url"] !== "string") {
      throwUsage(`new role "${role}": pass --backend-url <url>`);
    }
    entry = {
      role,
      backend_url: flags["backend-url"],
      fallback: "claude",
      workload_quota: Number.isFinite(Number(flags["workload-quota"])) ? Number(flags["workload-quota"]) : 0.7,
      active_version: null,
      versions: [],
    };
    registry.specialists.push(entry);
  }
  if (entry.versions.find((v) => v.id === version.id)) {
    throwUsage(`version id "${version.id}" already exists for role "${role}" (R3)`);
  }
  entry.versions.push(version);

  saveRegistry(registryPath, registry); // re-validates the whole file; R1/R3/R4/R5/R6/R7 enforced here

  const eventsPath = flags.events ? resolve(flags.events) : eventsPathFromEnv();
  appendEvent(eventsPath, {
    kind: "register",
    role,
    ts: new Date().toISOString(),
    data: { version_id: version.id, certified_level: version.certified_level, operator: flags.operator || "(unknown)" },
  });
  console.log(`registered ${role}/${version.id} (${version.certified_level}) — active_version unchanged (${entry.active_version || "null"}).`);
}

// ── promote ─────────────────────────────────────────────────────────────────────────────────

function promoteSpecialist(args) {
  const { flags, positional } = parseArgs(args);
  const role = positional[0];
  const versionId = positional[1];
  if (!role || !versionId) throwUsage("promote <role> <version-id>");
  return pointerSwap({ role, versionId, flags, kind: "promote" });
}

// ── rollback ────────────────────────────────────────────────────────────────────────────────

function rollbackSpecialist(args) {
  const { flags, positional } = parseArgs(args);
  const role = positional[0];
  const versionId = positional[1];
  if (!role || !versionId) throwUsage("rollback <role> <version-id>");
  return pointerSwap({ role, versionId, flags, kind: "rollback" });
}

/**
 * Shared pointer-swap routine for promote and rollback. The mechanism is identical (set
 * active_version); the SEMANTICS differ:
 *   - promote: a NEW version becomes active (forward); typically gated by certification.
 *   - rollback: a PRIOR version becomes active (backward); the NAMED COMPENSATOR.
 * The event log records the kind so the audit trail distinguishes them.
 */
function pointerSwap({ role, versionId, flags, kind }) {
  const registryPath = flags.registry ? resolve(flags.registry) : registryPathFromEnv();
  const { registry, errors } = loadRegistry(registryPath);
  if (errors.length) {
    console.error("Registry errors (refusing to mutate):");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(2);
  }
  const entry = registry.specialists.find((s) => s.role === role);
  if (!entry) {
    throwUsage(`role "${role}" not found in registry`);
  }
  const version = entry.versions.find((v) => v.id === versionId);
  if (!version) {
    throwUsage(`version "${versionId}" not found for role "${role}" (R4)`);
  }
  if (version.certified_level === "L0") {
    const err = new Error(`refusing to ${kind} an L0 (uncertified) version: ${role}/${versionId}`);
    err.exitCode = 2;
    err.hint = "Reject 2: an uncertified specialist cannot be active. Train and certify first.";
    throw err;
  }
  const previous = entry.active_version;
  entry.active_version = versionId;
  saveRegistry(registryPath, registry);

  const eventsPath = flags.events ? resolve(flags.events) : eventsPathFromEnv();
  appendEvent(eventsPath, {
    kind,
    role,
    ts: new Date().toISOString(),
    data: {
      from_version: previous,
      to_version: versionId,
      certified_level: version.certified_level,
      operator: flags.operator || "(unknown)",
      reason: flags.reason || "",
    },
  });

  const arrow = kind === "rollback" ? "←" : "→";
  console.log(`${kind} ${role}: ${previous || "(none)"} ${arrow} ${versionId} (${version.certified_level})`);

  // The quiet ceremony (design/specialists-layer.md): on certification the mark prints once
  // with a one-line record. No fanfare — the instrument confirms; the reward is the new
  // capability in action and the record it leaves.
  if (kind === "promote") {
    const mark = markFor(dossierCrewFor(role));
    console.log("");
    console.log(`  ${mark}  ${role} — ${version.certified_level} certified · ${versionId}${version.exam_hash ? ` · exam ${version.exam_hash.slice(0, 12)}` : ""}`);
  }
}

/** Crew pack for the ceremony mark, when the role has a dossier (registry-only roles get the default mark). */
function dossierCrewFor(role) {
  const raw = readFileSafe(join(dirname(fileURLToPath(import.meta.url)), "role-dossiers.json"));
  if (!raw) return null;
  try {
    const dossiers = JSON.parse(raw);
    const id = String(role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return dossiers[id]?.crew || null;
  } catch { return null; }
}

// ── clear-halt ──────────────────────────────────────────────────────────────────────────────

function clearHaltSpecialist(args) {
  const { flags, positional } = parseArgs(args);
  const role = positional[0];
  if (!role) throwUsage("clear-halt <role>");
  const statePath = flags.state ? resolve(flags.state) : statePathFromEnv();
  const eventsPath = flags.events ? resolve(flags.events) : eventsPathFromEnv();
  let state;
  try { state = loadState(statePath); }
  catch { state = emptyState(); }
  const halt = getHalt(state, role);
  if (!halt.halted) {
    console.log(`role "${role}" was not halted; no action taken.`);
    return;
  }
  setHalt(state, role, null);
  saveState(statePath, state);
  const ts = new Date().toISOString();
  appendClearHaltEvent(eventsPath, {
    role,
    ts,
    operator: flags.operator || "(unknown)",
    reason: flags.reason || "",
  });
  console.log(`cleared halt for "${role}". previous reason: ${halt.reason}`);
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────

function registryPathFromEnv() {
  return resolve(process.env.ROLEOS_SPECIALISTS_PATH || DEFAULT_REGISTRY_PATH);
}
function statePathFromEnv() {
  return resolve(process.env.ROLEOS_SPECIALIST_STATE_PATH || DEFAULT_STATE_PATH);
}
function eventsPathFromEnv() {
  return resolve(process.env.ROLEOS_SPECIALIST_EVENTS_PATH || DEFAULT_EVENTS_PATH);
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

function throwUsage(detail) {
  const err = new Error(`usage: ${detail}`);
  err.exitCode = 1;
  err.hint = "Run 'roleos specialist help' for the full subcommand list.";
  throw err;
}
