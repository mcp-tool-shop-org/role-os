/**
 * training-programs.mjs — the S6 prerequisite curriculum graph builder (consumer side).
 * Research-grounded contract: design/specialist-training-programs.md (study-swarm wf_9b6208e9-b97).
 *
 * Reads a PUBLISHED `curriculum.json` export from the training-knowledge KB (NOT the .db directly —
 * the KB owns its schema and exports raw signals; role-os COMPUTES the graph, keeping this layer
 * free of any sqlite dependency, the same Parnas split the `engine_recipe_ref` seam already uses).
 *
 * Hides one secret family: the GRAPH MATH — directional witness scoring, acyclicity + transitive
 * reduction, thin-evidence classification, cheapest-chain solve. Callers see `buildCurriculum()` /
 * `loadCurriculum()` → a validated graph of nodes + classified edges; they never compute witnesses.
 *
 * Honesty contract (findings 1, 12, 15, 16): an edge earns the tree only with a directional witness;
 * an edge with no receipt-backed outcome delta renders `unverified` (provisional), never as a
 * confident shortcut. The builder SETS structure + evidence state only — it triggers no training.
 *
 * curriculum.json contract (roleos-curriculum/v1) — the producer/consumer interface:
 *   { schema:"roleos-curriculum/v1", generated:"<iso>",
 *     techniques:[ { id, slug, name, lane, evidence_strength, engine_recipe_ref?, rig_fit?, studio_fit? } ],
 *     edges:[ { from, to, signals:{ explicit_predecessor?:bool, stage_chain?:bool,
 *                                   shared_datasets?:int, shared_sources?:int },
 *              outcome_delta?:{ steps_saved_frac?:number, n_receipts?:int } } ] }
 * `outcome_delta` is the S6.3 (GPU) field; absent in S6.1 → every edge is `unverified`.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Pinned witness weights (PIN_PER_STEP). Directional signals dominate; co-occurrence corroborates. */
export const WITNESS_WEIGHTS = {
  explicit_predecessor: 0.6, // B's predecessor pointer == A — the strongest directional signal
  stage_chain: 0.25,         // same pipeline, stage_order(A) < stage_order(B) — directional
  shared_datasets: 0.1,      // A and B share training datasets — co-occurrence (corroborating)
  shared_sources: 0.05,      // shared citation backing — weak corroboration
};

/** An edge is `confirmed` only with a receipt-backed outcome delta over >= this many receipts. */
export const MIN_OUTCOME_RECEIPTS = 1;
/** Below this directional witness an edge is too thin to draw. */
export const THIN_WITNESS = 0.6;

/** Directional witness in [0,1] fusing the available signals (RefD-style asymmetry, finding 12/13). */
export function edgeWitness(signals = {}) {
  let w = 0;
  if (signals.explicit_predecessor) w += WITNESS_WEIGHTS.explicit_predecessor;
  if (signals.stage_chain) w += WITNESS_WEIGHTS.stage_chain;
  if (signals.shared_datasets > 0) w += WITNESS_WEIGHTS.shared_datasets;
  if (signals.shared_sources > 0) w += WITNESS_WEIGHTS.shared_sources;
  return Math.min(1, Math.round(w * 1e4) / 1e4);
}

/**
 * Classify an edge's evidence state (the honesty ladder):
 *  - "spurious"   : witness < THIN_WITNESS and no explicit predecessor → not drawn (correlation only)
 *  - "unverified" : a real directional witness but NO receipt-backed outcome delta (S6.1 default)
 *  - "confirmed"  : witness AND an outcome delta over >= MIN_OUTCOME_RECEIPTS receipts (S6.3)
 */
function classifyEdge(witness, outcomeDelta) {
  const hasDelta = outcomeDelta && typeof outcomeDelta.steps_saved_frac === "number"
    && (outcomeDelta.n_receipts || 0) >= MIN_OUTCOME_RECEIPTS;
  if (hasDelta) return "confirmed";
  if (witness < THIN_WITNESS) return "spurious";
  return "unverified";
}

// ── DAG validation: cycle detection + transitive reduction ───────────────────────────────────────

/** Return the set of edge keys "from->to" that are transitively implied (A→B and a longer A→…→B). */
function transitiveImplied(adj, nodes) {
  // Reachability excluding the direct edge, per source (DFS).
  const implied = new Set();
  for (const s of nodes) {
    const direct = adj.get(s) || new Set();
    for (const t of direct) {
      // Is t reachable from s via a path of length >= 2 (not using the direct s->t edge)?
      const seen = new Set();
      const stack = [...(adj.get(s) || [])].filter((x) => x !== t);
      while (stack.length) {
        const n = stack.pop();
        if (n === t) { implied.add(`${s}->${t}`); break; }
        if (seen.has(n)) continue;
        seen.add(n);
        for (const m of adj.get(n) || []) stack.push(m);
      }
    }
  }
  return implied;
}

/** Detect a cycle; return the offending back-edge keys (so they can be dropped, not drawn). */
function findCycleEdges(adj, nodes) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(nodes.map((n) => [n, WHITE]));
  const back = new Set();
  const dfs = (u) => {
    color.set(u, GRAY);
    for (const v of adj.get(u) || []) {
      if (color.get(v) === GRAY) back.add(`${u}->${v}`);
      else if (color.get(v) === WHITE) dfs(v);
    }
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n);
  return back;
}

/**
 * Build the curriculum graph from a curriculum.json object (or null).
 * @param {object|null} curriculum  roleos-curriculum/v1
 * @param {object} [config]         { thinWitness, minReceipts }
 * @returns {object} { status, n_techniques, techniques, edges, roots, counts, note }
 */
export function buildCurriculum(curriculum, config = {}) {
  if (!curriculum || !Array.isArray(curriculum.techniques)) {
    return { status: "unavailable", note: "no curriculum export (KB has not published one yet)", techniques: [], edges: [] };
  }
  const thin = config.thinWitness ?? THIN_WITNESS;
  const ids = new Set(curriculum.techniques.map((t) => t.id));
  const rawEdges = (curriculum.edges || []).filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

  // Score + classify every candidate edge.
  let scored = rawEdges.map((e) => {
    const witness = edgeWitness(e.signals);
    const klass = classifyEdge(witness, e.outcome_delta);
    return { from: e.from, to: e.to, witness, evidence: klass, signals: e.signals || {}, outcome_delta: e.outcome_delta || null };
  });

  // Drop spurious (correlation-only) edges — not drawn.
  const dropped = scored.filter((e) => e.evidence === "spurious");
  scored = scored.filter((e) => e.evidence !== "spurious");

  // Acyclicity gate: drop back-edges that would create a cycle (a tech tree is a DAG, finding 14).
  const adj = new Map(curriculum.techniques.map((t) => [t.id, new Set()]));
  for (const e of scored) adj.get(e.from).add(e.to);
  const nodes = curriculum.techniques.map((t) => t.id);
  const backEdges = findCycleEdges(adj, nodes);
  if (backEdges.size) {
    scored = scored.filter((e) => !backEdges.has(`${e.from}->${e.to}`));
    adj.forEach((s) => s.clear());
    for (const e of scored) adj.get(e.from).add(e.to);
  }

  // Transitive reduction: tag (don't delete) closure-implied edges so cost math doesn't double-count.
  const implied = transitiveImplied(adj, nodes);
  for (const e of scored) e.closure_implied = implied.has(`${e.from}->${e.to}`);

  // Roots = techniques with no incoming (non-implied) edge — the curriculum entry points.
  const hasIncoming = new Set(scored.filter((e) => !e.closure_implied).map((e) => e.to));
  const roots = nodes.filter((n) => !hasIncoming.has(n));

  const counts = {
    confirmed: scored.filter((e) => e.evidence === "confirmed").length,
    unverified: scored.filter((e) => e.evidence === "unverified").length,
    closure_implied: scored.filter((e) => e.closure_implied).length,
    dropped_spurious: dropped.length,
    dropped_cyclic: backEdges.size,
  };

  return {
    status: counts.confirmed > 0 ? "graph" : "provisional", // "provisional" = machinery valid, edges await S6.3 deltas
    n_techniques: curriculum.techniques.length,
    techniques: curriculum.techniques,
    edges: scored,
    roots,
    counts,
    note: counts.confirmed === 0
      ? `${counts.unverified} prerequisite edges, all unverified (no receipt-backed transfer deltas yet — S6.3)`
      : `${counts.confirmed} confirmed + ${counts.unverified} unverified prerequisite edges`,
  };
}

/**
 * Cheapest prerequisite chain to a target technique (max measured steps-saved). Uses confirmed
 * outcome deltas as edge weights; falls back to structural depth when deltas are absent (and marks
 * the chain `unverified` so callers don't present a phantom saving).
 * @returns {{ chain:number[], steps_saved_frac:number|null, verified:boolean }|null}
 */
export function cheapestChain(graph, targetId) {
  if (!graph || !Array.isArray(graph.edges)) return null;
  const incoming = new Map();
  for (const e of graph.edges) {
    if (e.closure_implied) continue;
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to).push(e);
  }
  // Walk prerequisites back from the target (structural; the graph is a DAG).
  const chain = [];
  let verified = true, saved = 0, cur = targetId;
  const guard = new Set();
  while (incoming.has(cur) && !guard.has(cur)) {
    guard.add(cur);
    // pick the highest-witness incoming prerequisite
    const best = incoming.get(cur).slice().sort((a, b) => b.witness - a.witness)[0];
    chain.unshift(best.from);
    if (best.evidence === "confirmed" && best.outcome_delta) saved += best.outcome_delta.steps_saved_frac;
    else verified = false;
    cur = best.from;
  }
  return chain.length ? { chain, steps_saved_frac: verified ? Math.round(saved * 1e4) / 1e4 : null, verified } : null;
}

/**
 * Resolve the curriculum.json path (first existing wins), so `roleos crew --programs` works by
 * default on the standard sibling workspace layout (role-os and readouts both under .../AI/):
 *   1. ROLEOS_CURRICULUM_PATH — explicit override, used verbatim (missing → unavailable; lets tests force it)
 *   2. <cwd>/.role-os/curriculum.json — a repo-local vendored copy, if any
 *   3. <role-os repo>/../readouts/training-knowledge/curriculum.json — the sibling KB export (the default)
 */
function resolveCurriculumPath(cwd) {
  if (process.env.ROLEOS_CURRICULUM_PATH) return process.env.ROLEOS_CURRICULUM_PATH;
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  for (const c of [
    join(cwd, ".role-os", "curriculum.json"),
    join(repoRoot, "..", "readouts", "training-knowledge", "curriculum.json"),
  ]) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Load + build the curriculum from a published export. Absent export → "unavailable" (honest).
 * @param {object} [opts] { cwd, path }  (path overrides resolution entirely)
 */
export function loadCurriculum({ cwd = process.cwd(), path } = {}) {
  const p = path || resolveCurriculumPath(cwd);
  if (!p || !existsSync(p)) {
    return {
      status: "unavailable",
      note: "no curriculum.json export found — point ROLEOS_CURRICULUM_PATH at the KB's gen_curriculum.py output, or vendor it at .role-os/curriculum.json",
      techniques: [], edges: [],
    };
  }
  let doc;
  try { doc = JSON.parse(readFileSync(p, "utf8")); }
  catch { return { status: "unavailable", note: "curriculum.json unreadable", techniques: [], edges: [] }; }
  return buildCurriculum(doc);
}
