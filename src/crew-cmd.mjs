/**
 * crew-cmd.mjs — `roleos crew`: the crew report. A scientific-instrument readout over the
 * dossier config (src/role-dossiers.json) merged with the live Record
 * (src/specialist/record.mjs). Read-only; renders real state only — measurement bases are
 * always labelled, unmeasured values say so, and the operating profile is shown VERBATIM as
 * dispatch injects it (design/specialists-layer.md: findings 16-17, 20-21).
 *
 *   roleos crew              roster: mark, grade·basis, band, form, reps, profile
 *   roleos crew <role>       full sheet for one crew member
 *   roleos crew --programs   the curriculum tech tree (training-knowledge KB; S6 training programs)
 *   roleos crew --preview <technique>   the recipe preview for one technique (predicted outcome + forgetting)
 *
 * Marks are deterministic per crew pack — typographic placeholders until the GlyphStudio
 * glyphs land (design open item). The quiet ceremony (mark + one-line record on
 * certification) lives in specialist-cmd's promote path.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSafe } from "./fs-utils.mjs";
import { deriveProfile, renderDossierBlock } from "./dossier-block.mjs";
import { buildRecord } from "./specialist/record.mjs";
import { loadCurriculum, recipePreview } from "./specialist/training-programs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// Placeholder marks until GlyphStudio glyphs land — deterministic by crew pack.
const MARKS = {
  core: "◆", engineering: "▲", design: "◇", marketing: "●", product: "■",
  research: "✦", growth: "▷", treatment: "◈", "deep-audit": "⬡",
  brainstorm: "✺", swarm: "⬢",
};
const DEFAULT_MARK = "·";

export function markFor(crew) {
  const pack = (Array.isArray(crew) ? crew[0]?.pack : crew) || "";
  return MARKS[String(pack).toLowerCase()] || DEFAULT_MARK;
}

function loadDossiers() {
  const raw = readFileSafe(join(HERE, "role-dossiers.json"));
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function loadRegistryRoles(cwd) {
  const raw = readFileSafe(join(cwd, ".role-os", "specialists.json"));
  if (!raw) return [];
  try { return (JSON.parse(raw)?.specialists || []).map((s) => s.role); } catch { return []; }
}

function toId(roleName) {
  return String(roleName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function gradeLine(dossier, record) {
  // The Record outranks the static sheet: a registry certification is measured truth.
  if (record.certification.basis === "certified") {
    const c = record.certification.current;
    return `${c.certified_level} · certified — band unmeasured (interval pipeline pending)`;
  }
  const g = dossier?.grade;
  if (!g) return "ungraded";
  const band = g.band ? `band ${g.band.floor}–${g.band.ceiling}` : "band unmeasured";
  return `${g.level} ${g.label || ""} · ${g.basis || "assessed"} — ${band}`.replace(/\s+/g, " ");
}

function repsLine(dossier, record) {
  const n = record.repsEvents.length;
  const unit = dossier?.reps?.unit || "verified events";
  return `${n} verified event${n === 1 ? "" : "s"}${unit !== "verified events" ? ` (${unit})` : ""}`;
}

function formLine(record) {
  const d = record.divergence || {};
  const n = d.samples ?? d.n;
  switch (d.status) {
    case "unmonitored":
      return "unmonitored (drift checks land in S5)";
    case "accumulating":
      return `accumulating (${n}/${d.min_samples} field inputs${d.test_ready ? ", drift test ready" : ""})`;
    case "stale":
      return `STALE — re-certification recommended (${d.reason || "output drift + degraded performance"})`;
    case "watch":
      return `watch — ${d.reason || "covariate drift; performance holding"} (n=${n})`;
    case "monitored":
      return `monitored — no drift, adequate power (n=${n})`;
    case "monitored-lowpower":
      return `monitored — no drift but low power (n=${n}; inconclusive)`;
    default:
      return d.status || "unknown";
  }
}

function indent(text, prefix) {
  return String(text).split("\n").map((l) => `${prefix}${l}`).join("\n");
}

function rosterRow(name, dossier, record) {
  const mark = markFor(dossier?.crew || null);
  const grade = gradeLine(dossier, record).split(" — ")[0];
  const profile = dossier ? (dossier.operatingProfile?.active || "—") : "registry specialist";
  const reps = record.repsEvents.length;
  const tech = record.techniques.length;
  return `  ${mark} ${name.padEnd(28)} ${grade.padEnd(22)} reps ${String(reps).padStart(3)}  techniques ${tech}  ${profile}`;
}

function renderSheet(name, dossier, record) {
  const lines = [];
  const mark = markFor(dossier?.crew || null);
  const title = dossier
    ? `${mark} ${name} — ${dossier.function || ""}${dossier.specialization ? ` · ${dossier.specialization}` : ""}`
    : `${mark} ${name} — registry specialist (no dossier)`;
  lines.push(title);
  if (dossier?.crew?.length) {
    lines.push(`  crew: ${dossier.crew.map((c) => `${c.pack}${c.role_in_pack ? ` (${c.role_in_pack})` : ""}`).join(", ")}`);
  }
  lines.push("");
  lines.push(`  GRADE   ${gradeLine(dossier, record)}`);
  lines.push(`  REPS    ${repsLine(dossier, record)}`);
  lines.push(`  FORM    ${formLine(record)}`);
  lines.push("");

  const injected = dossier ? renderDossierBlock(dossier.role || name) : null;
  if (injected) {
    lines.push("  OPERATING PROFILE — as dispatched (verbatim: what you read is what the model gets)");
    lines.push(indent(injected, "  | "));
    lines.push("");
  } else if (dossier) {
    const p = deriveProfile(dossier);
    if (p.archetype) lines.push(`  OPERATING PROFILE  ${p.archetype}`, "");
  }

  lines.push("  RECORD");
  if (record.certification.current) {
    const c = record.certification.current;
    lines.push(`  certification: ${c.certified_level} (${c.version_id}), certified ${c.certified_at || "—"}, exam ${c.exam_hash ? c.exam_hash.slice(0, 12) : "—"}`);
    if (c.lineage) lines.push(`  lineage: ${c.lineage.parents.join(" × ")} → ${c.version_id} (${c.lineage.method})`);
    for (const e of record.certification.ledger) {
      lines.push(`    ${e.ts}  ${e.kind}${e?.data?.to_version ? ` → ${e.data.to_version}` : ""}${e?.data?.backfilled ? " (backfilled)" : ""}`);
    }
  } else {
    lines.push("  certification: none on the registry (basis: assessed)");
  }
  if (record.field.perTask.length) {
    for (const t of record.field.perTask) {
      lines.push(`  field: ${t.produces} — ${t.complete} complete / ${t.failed} failed / ${t.blocked} blocked`);
    }
  } else {
    lines.push("  field: no run history in this repo");
  }
  lines.push(`  probes: ${record.field.probes ? `${record.field.probes.agreed}/${record.field.probes.count} agreed` : "—"}`);
  if (record.field.outcomes) {
    const o = record.field.outcomes;
    lines.push(`  outcomes: ${o.completed}/${o.runs} runs completed, ${o.corrections} correction${o.corrections === 1 ? "" : "s"}`);
  }
  lines.push("");

  lines.push("  TECHNIQUES");
  if (record.techniques.length) {
    for (const t of record.techniques) {
      lines.push(`  ◆ ${t.name} — ${t.desc}`);
      for (const r of t.receipts) lines.push(`      receipt: ${r}`);
    }
  } else {
    lines.push("  none earned yet — techniques derive from certification and field receipts; they cannot be authored");
  }

  if (dossier?.charter) {
    lines.push("", "  CHARTER", indent(dossier.charter, "  "));
  }
  if (dossier?.guards?.length) {
    lines.push("", "  GUARDS");
    for (const g of dossier.guards) lines.push(`  ▲ ${g}`);
  }
  return lines.join("\n");
}

/**
 * Render the curriculum tech tree (S6 training programs) — a studio-global instrument readout, not
 * a per-role view. Honest by construction: status, an evidence tag per edge, and an explicit
 * "unverified until S6.3" footer whenever no receipt-backed transfer deltas exist yet.
 */
export function renderCurriculum(graph) {
  const lines = ["Training programs — curriculum tech tree (training-knowledge KB)", ""];
  if (!graph || graph.status === "unavailable") {
    lines.push(`  ${(graph && graph.note) || "no curriculum export found"}.`);
    lines.push("  The KB publishes curriculum.json (its gen_curriculum.py export); point");
    lines.push("  ROLEOS_CURRICULUM_PATH at it, or place it at .role-os/curriculum.json.");
    return lines.join("\n");
  }
  const byId = new Map(graph.techniques.map((t) => [t.id, t]));
  const name = (id) => byId.get(id)?.name || `#${id}`;
  const c = graph.counts;
  lines.push(`  status: ${graph.status} — ${graph.note}`);
  lines.push(`  ${graph.n_techniques} techniques · ${graph.edges.length} edges ` +
    `(${c.confirmed} confirmed, ${c.unverified} unverified, ${c.closure_implied} closure-implied) · ` +
    `dropped ${c.dropped_spurious + c.dropped_cyclic} (${c.dropped_spurious} spurious, ${c.dropped_cyclic} cyclic)`);
  lines.push("", "  ROOTS (entry-point techniques — no prerequisite)");
  if (graph.roots.length) {
    for (const id of graph.roots) {
      const t = byId.get(id);
      lines.push(`    ◆ ${name(id)}${t?.lane ? ` (${t.lane})` : ""}${t?.evidence_strength ? ` [${t.evidence_strength}]` : ""}`);
    }
  } else {
    lines.push("    — every technique has a prerequisite (check for a cycle)");
  }
  lines.push("", "  PREREQUISITES (foundation → advanced)");
  if (graph.edges.length) {
    for (const e of graph.edges.slice().sort((a, b) => b.witness - a.witness)) {
      const tags = [e.evidence];
      if (e.closure_implied) tags.push("closure-implied");
      lines.push(`    ${name(e.from)} → ${name(e.to)}   witness ${e.witness.toFixed(2)}  ${tags.join(", ")}`);
    }
  } else {
    lines.push("    — none");
  }
  if (c.confirmed === 0 && c.unverified > 0) {
    lines.push("", "  Edges are UNVERIFIED until S6.3 measures the cheaper-after-foundation delta on the rig.");
  }
  return lines.join("\n");
}

/** Render a single technique's recipe preview (S6.2) — predicted outcome + forgetting + replay. */
export function renderPreview(preview) {
  const lines = [`Recipe preview — ${preview.name || preview.technique || "(unknown technique)"}`, ""];
  if (preview.difficulty_signal) lines.push(`  difficulty signal: ${preview.difficulty_signal}`);
  if (preview.engine_recipe_ref) lines.push(`  engine recipe: ${preview.engine_recipe_ref}  (measured numbers live in tensor-engine-knowledge)`);
  if (preview.difficulty_signal || preview.engine_recipe_ref) lines.push("");
  if (preview.status === "unavailable") {
    lines.push(`  ${preview.note}`);
    return lines.join("\n");
  }
  if (preview.predicted_outcome) {
    const o = preview.predicted_outcome;
    lines.push("  PREDICTED OUTCOME");
    lines.push(`    tier ${o.tier} · confidence ${o.confidence}`);
    if (o.predicted_loss != null) lines.push(`    predicted loss: ${o.predicted_loss}`);
    if (o.predicted_steps_to_cert != null) lines.push(`    predicted steps to certify: ${o.predicted_steps_to_cert}`);
    if (o.calibration) lines.push(`    calibrated at ${o.calibration.params} params / ${o.calibration.tokens ?? "?"} tokens`);
    lines.push("");
  }
  if (preview.forgetting) {
    const f = preview.forgetting;
    lines.push("  FORGETTING RISK");
    if (f.recommended_replay_fraction != null) lines.push(`    recommended replay: ${Math.round(f.recommended_replay_fraction * 100)}%`);
    if (f.measured_forgetting != null) lines.push(`    measured forgetting: ${f.measured_forgetting}`);
    lines.push(`    ${f.note}`);
  }
  return lines.join("\n");
}

export async function crewCommand(args, cwd = process.cwd()) {
  if (args.includes("--programs")) {
    console.log(renderCurriculum(loadCurriculum({ cwd })));
    return;
  }
  if (args.includes("--preview")) {
    const slug = args.filter((a) => !a.startsWith("--")).join(" ").trim();
    const graph = loadCurriculum({ cwd });
    if (graph.status === "unavailable") { console.log(renderCurriculum(graph)); return; }
    const t = (graph.techniques || []).find(
      (x) => x.slug === slug || String(x.name).toLowerCase() === slug.toLowerCase());
    if (!t) {
      const err = new Error(`No technique matches "${slug || "(none given)"}"`);
      err.exitCode = 1;
      err.hint = "Run 'roleos crew --programs' for the tech tree, then pass a technique name or slug.";
      throw err;
    }
    console.log(renderPreview(recipePreview(t)));
    return;
  }
  const dossiers = loadDossiers();
  const query = args.filter((a) => !a.startsWith("--")).join(" ").trim();

  if (!query) {
    const names = Object.values(dossiers).map((d) => d.role);
    const registryOnly = loadRegistryRoles(cwd).filter((r) => !dossiers[toId(r)]);
    console.log(`Crew report — ${names.length + registryOnly.length} members (${registryOnly.length} registry specialist${registryOnly.length === 1 ? "" : "s"})`);
    console.log("");
    for (const r of registryOnly.sort()) {
      console.log(rosterRow(r, null, buildRecord(r, { cwd })));
    }
    for (const d of Object.values(dossiers).sort((a, b) => a.role.localeCompare(b.role))) {
      console.log(rosterRow(d.role, d, buildRecord(d.role, { cwd })));
    }
    console.log("");
    console.log("roleos crew <role> — full sheet · grades labelled by basis (assessed | certified) · bands appear when measured");
    return;
  }

  const id = toId(query);
  const dossier = dossiers[id] || Object.values(dossiers).find((d) => d.role.toLowerCase() === query.toLowerCase()) || null;
  const registryRoles = loadRegistryRoles(cwd);
  const registryName = registryRoles.find((r) => toId(r) === id || r.toLowerCase() === query.toLowerCase()) || null;

  if (!dossier && !registryName) {
    const err = new Error(`No crew member matches "${query}"`);
    err.exitCode = 1;
    err.hint = "Run 'roleos crew' for the roster.";
    throw err;
  }

  const name = dossier?.role || registryName;
  console.log(renderSheet(name, dossier, buildRecord(name, { cwd })));
}
