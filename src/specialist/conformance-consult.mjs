/**
 * Conformance consult — the production seam that checks a proposed tool CALL against its TOOL's schema
 * and documented contract, attaching an ADVISORY conformance verdict + receipt. Oversight wedge #1.
 *
 * Two-stage, mirroring prism's deterministic-floor + LLM-ceiling design:
 *   1. DETERMINISTIC schema floor (L1 type / L2 required / L3 enum-range) — mechanical + infallible,
 *      NO model. A floor violation short-circuits to `nonconformant` with the offending clause; the
 *      LLM is never consulted for something a validator can prove.
 *   2. LLM specialist (L4 semantic-contract / L5 intent-vs-action) via the proven dispatchSpecialist
 *      fail-open gate — only when the floor passes.
 *
 * Safe by construction:
 *   - OPT-IN, default OFF (ROLEOS_CONFORMANCE_CONSULT). Disabled => `{verdict: null}`, a pure no-op.
 *   - ADVISORY. It returns a verdict + receipt; it never blocks a dispatch (callers decide).
 *   - FAIL-OPEN to ABSTAIN (escalate), NEVER to `conformant`. The cost-asymmetric error is a false
 *     `conformant` (a bad call waved through), so an unavailable/erroring LLM degrades to "I can't
 *     verify the semantics — escalate", never to "looks fine".
 */

import { dispatchSpecialist } from "./dispatch.mjs";

export const CONFORMANCE_ROLE = "Tool-Call Conformance";

const _TYPE_OK = {
  string: (v) => typeof v === "string",
  integer: (v) => Number.isInteger(v),
  number: (v) => typeof v === "number",
  boolean: (v) => typeof v === "boolean",
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
};

/**
 * Deterministic schema floor (L1-L3). Returns { verdict: "nonconformant"|null, violations: string[] }.
 * `null` verdict = no mechanical violation found -> defer to the LLM for the semantic contract.
 */
export function schemaFloor(tool, call) {
  const params = Array.isArray(tool?.params) ? tool.params : [];
  const args = call && typeof call === "object" ? call : {};
  const byName = Object.fromEntries(params.map((p) => [p.name, p]));
  const violations = [];
  for (const p of params) {                                   // L2 required
    if (p.required && !(p.name in args)) violations.push(`missing required '${p.name}'`);
  }
  for (const [k, v] of Object.entries(args)) {                // L1 type + L3 enum/range
    const p = byName[k];
    if (!p) continue;                                         // unknown arg: not floor-fatal (leave to contract)
    if (p.type && _TYPE_OK[p.type] && !_TYPE_OK[p.type](v)) violations.push(`'${k}' should be ${p.type}`);
    if (Array.isArray(p.enum) && !p.enum.includes(v)) violations.push(`'${k}' not in enum ${JSON.stringify(p.enum)}`);
    if (typeof p.max === "number" && typeof v === "number" && v > p.max) violations.push(`'${k}' exceeds max ${p.max}`);
  }
  return violations.length ? { verdict: "nonconformant", violations } : { verdict: null, violations: [] };
}

/**
 * Resolve a constraint OPERAND against the call args and (optional) structured state.
 *  - a bare string  -> a CALL field reference (the common case)
 *  - { value }      -> a literal
 *  - { field }      -> an explicit call-field reference
 *  - { state }      -> a structured-state key (object state only; prose state can't resolve -> undefined)
 *  - { len }        -> the length of an array/object call field (cardinality)
 *  - { enum }       -> a literal array
 *  - anything else  -> the literal itself (number/array/boolean)
 */
export function resolveOperand(op, call, state) {
  if (op && typeof op === "object" && !Array.isArray(op)) {
    if ("value" in op) return op.value;
    if ("state" in op) return state && typeof state === "object" ? state[op.state] : undefined;
    if ("field" in op) return call ? call[op.field] : undefined;
    if ("len" in op) {
      const a = call ? call[op.len] : undefined;
      if (Array.isArray(a)) return a.length;
      if (a && typeof a === "object") return Object.keys(a).length;
      return undefined;
    }
    if ("enum" in op) return op.enum;
  }
  if (typeof op === "string") return call ? call[op] : undefined; // bare = call field ref
  return op; // numeric / array / boolean literal
}

const _NUM = (x) =>
  typeof x === "number" ? x : (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x)) ? Number(x) : NaN);
const _EPS = 1e-9;
const _EQ = (a, b) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < _EPS : a === b);
const _CMP = {
  lt: (a, b) => a < b, le: (a, b) => a <= b, gt: (a, b) => a > b, ge: (a, b) => a >= b,
  eq: _EQ, ne: (a, b) => !_EQ(a, b),
};
const _opLabel = (op) =>
  op && typeof op === "object" ? ("len" in op ? `len(${op.len})` : "value" in op ? JSON.stringify(op.value) : "state" in op ? `state.${op.state}` : "field" in op ? op.field : JSON.stringify(op)) : String(op);

function _collectSum(of, call) {
  if (typeof of === "string") {
    const v = call ? call[of] : undefined;
    const arr = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : null;
    if (!arr) return null;
    const nums = arr.map(_NUM);
    return nums.some(Number.isNaN) ? null : nums;
  }
  if (Array.isArray(of)) { // a list of scalar field names to add
    const nums = of.map((f) => _NUM(call ? call[f] : undefined));
    return nums.some(Number.isNaN) ? null : nums;
  }
  return null;
}

/**
 * Deterministic CONTRACT floor (computable L4). Evaluates `tool.constraints` — a small structured DSL
 * for the relational/arithmetic contracts a 14B LLM does UNRELIABLY (summation, additive bounds,
 * cardinality, ordering, mutual-exclusion) but a checker does perfectly. v0.3: the diagnosis from the
 * v0.2 OOD dogfood was that the residual false-conformants are ALL computable — so they belong here,
 * not in the model. A constraint that cannot be evaluated from (call + state) is SKIPPED (deferred to
 * the LLM); the floor only ever PROVES a violation, never asserts conformance.
 * Returns { verdict: "nonconformant"|null, violations: string[] }.
 */
export function contractFloor(tool, call, state) {
  const constraints = Array.isArray(tool?.constraints) ? tool.constraints : [];
  const args = call && typeof call === "object" ? call : {};
  const v = [];
  for (const c of constraints) {
    if (!c || typeof c !== "object") continue;
    switch (c.kind) {
      case "cmp": {
        const a = resolveOperand(c.left, args, state), b = resolveOperand(c.right, args, state);
        if (a === undefined || b === undefined) break;
        const fn = _CMP[c.op]; if (!fn) break;
        if (["lt", "le", "gt", "ge"].includes(c.op)) {
          const na = _NUM(a), nb = _NUM(b);
          if (Number.isNaN(na) || Number.isNaN(nb)) break;
          if (!fn(na, nb)) v.push(`${_opLabel(c.left)}(${na}) not ${c.op} ${_opLabel(c.right)}(${nb})`);
        } else if (!fn(a, b)) {
          v.push(`${_opLabel(c.left)}(${JSON.stringify(a)}) not ${c.op} ${_opLabel(c.right)}(${JSON.stringify(b)})`);
        }
        break;
      }
      case "sum": {
        const vals = _collectSum(c.of, args);
        const cap = _NUM(resolveOperand(c.vs, args, state));
        if (vals === null || Number.isNaN(cap)) break;
        const s = vals.reduce((x, y) => x + y, 0);
        const fn = _CMP[c.op] || _CMP.eq;
        if (!fn(s, cap)) v.push(`sum(${_opLabel(c.of)})=${s} not ${c.op} ${cap}`);
        break;
      }
      case "present": { // exactly `count` (default 1) of the listed optional fields present
        const want = c.count == null ? 1 : c.count;
        const cnt = (c.fields || []).filter((f) => f in args).length;
        if (cnt !== want) v.push(`expected exactly ${want} of [${(c.fields || []).join(", ")}] present, got ${cnt}`);
        break;
      }
      case "requires": { // conditional co-requirement
        const w = c.when || {};
        const val = args[w.field];
        const hit = "equals" in w ? val === w.equals : Array.isArray(w.in) ? w.in.includes(val) : w.field in args;
        if (hit) {
          const missing = (c.require || []).filter((f) => !(f in args));
          if (missing.length) v.push(`when ${w.field}=${JSON.stringify(val)} requires [${missing.join(", ")}] present`);
        }
        break;
      }
      case "distinct": {
        const vals = (c.fields || []).map((f) => args[f]);
        if (vals.some((x) => x === undefined)) break;
        const seen = new Set();
        for (const x of vals) {
          const k = x && typeof x === "object" ? JSON.stringify(x) : String(x);
          if (seen.has(k)) { v.push(`fields [${(c.fields || []).join(", ")}] must be distinct (duplicate ${k})`); break; }
          seen.add(k);
        }
        break;
      }
      case "member": {
        const val = args[c.field], set = resolveOperand(c.in, args, state);
        if (val === undefined || !Array.isArray(set)) break;
        if (!set.includes(val)) v.push(`'${c.field}'=${JSON.stringify(val)} not in ${JSON.stringify(set)}`);
        break;
      }
      case "char_at": {
        // `offset` (default 0) adjusts for index bases — e.g. offset:-1 for a 1-based `position`.
        const s = args[c.string], want = resolveOperand(c.equals, args, state);
        const idx = _NUM(resolveOperand(c.index, args, state)) + (typeof c.offset === "number" ? c.offset : 0);
        if (typeof s !== "string" || Number.isNaN(idx) || want === undefined) break;
        const got = s.substr(idx, String(want).length);
        if (got !== want) v.push(`${c.string}[${idx}..]='${got}' != expected '${want}'`);
        break;
      }
      default:
        break; // unknown kind: ignore (forward-compatible), never assert conformance
    }
  }
  return v.length ? { verdict: "nonconformant", violations: v } : { verdict: null, violations: [] };
}

/** Read the wiring flag. Default OFF — flipping it on is a Mike-gated release decision. */
export function conformanceConsultEnabled() {
  const v = process.env.ROLEOS_CONFORMANCE_CONSULT;
  return v === "1" || v === "true";
}

/** Serialize a tool (+intent, +state) into the EVIDENCE shape the watcher was TRAINED on. */
export function evidenceFor(tool, intent, state) {
  const schema = {};
  for (const p of Array.isArray(tool?.params) ? tool.params : []) {
    const { name, ...rest } = p;
    schema[name] = rest;
  }
  let ev = `TOOL: ${tool?.name}\nCONTRACT: ${tool?.contract}\nPARAMS (JSON schema): ${JSON.stringify(schema)}`;
  const st = state ?? tool?.state;
  if (st) ev += `\nSTATE: ${typeof st === "string" ? st : JSON.stringify(st)}`;
  if (intent) ev += `\nINTENT: ${intent}`;
  return ev;
}

/** Serialize the proposed CALL into the trained CLAIM shape. */
export function claimFor(tool, call) {
  return `CALL: ${tool?.name}(${JSON.stringify(call ?? {})})`;
}

/**
 * Enrich a tool definition with its constraints (+ structured state) from a rollout CATALOG keyed by
 * tool name (tools/conformance-dataset/tool-constraints.json). The production gate calls this before
 * consultConformance so the deterministic contract floor applies to any catalogued tool. A tool's own
 * inline `constraints` win if present; an inline `state` is not overwritten.
 */
export function withToolConstraints(tool, catalog) {
  const entry = tool && catalog ? catalog[tool.name] : null;
  if (!entry) return tool;
  return {
    ...tool,
    constraints: tool.constraints && tool.constraints.length ? tool.constraints : entry.constraints || [],
    ...(entry.state_struct && tool.state == null ? { state: entry.state_struct } : {}),
  };
}

/** Verdict comparator for shadow probes — normalizes string|{verdict} and compares the label. */
export function conformanceAgree(s, c) {
  const norm = (v) => (v && typeof v === "object" ? v.verdict : v);
  return norm(s) === norm(c);
}

/**
 * Check one tool-call's conformance. Deterministic floor first, then the LLM specialist via the
 * fail-open gate. Advisory + opt-in + NEVER throws.
 *
 * @param {object} args
 * @param {object} args.tool    { name, contract, params:[{name,type,required,enum?,max?}] }
 * @param {object} args.call    the proposed arguments
 * @param {string} [args.intent] the stated goal (enables the L5 intent check)
 * @param {object} [opts]
 * @param {boolean} [opts.enabled]   default: conformanceConsultEnabled()
 * @param {object}  [opts.paths]     { registry, state, events } for dispatchSpecialist
 * @param {string}  [opts.nowIso]
 * @param {string}  [opts.traceId]
 * @param {Function}[opts.httpFn]    injectable HTTP for the specialist call (tests)
 * @param {object}  [opts.classifier]
 * @param {object}  [opts.shadow]
 * @returns {Promise<{verdict: string|null, source: string, receipt?: object, floor?: object}>}
 */
export async function consultConformance({ tool, call, intent, state } = {}, opts = {}) {
  const { enabled = conformanceConsultEnabled(), paths, nowIso, traceId, httpFn, classifier, shadow } = opts;
  if (!enabled) return { verdict: null, source: "disabled" };

  const ts = nowIso || new Date().toISOString();
  const st = state ?? tool?.state;

  // 1) Deterministic floor — a PROVABLE violation never needs the LLM. Two rungs:
  //    1a schema (L1 type / L2 required / L3 enum-range), 1b computable contract (relational/arithmetic
  //    L4: ordering, sum-to-cap, additive bounds, cardinality, mutual-exclusion, ...). Either proving a
  //    violation short-circuits to `nonconformant`; both only ever PROVE, never assert conformance.
  let floor;
  try {
    const schema = schemaFloor(tool, call);
    const contract = contractFloor(tool, call, st);
    const violations = [...schema.violations, ...contract.violations];
    floor = { verdict: violations.length ? "nonconformant" : null, violations,
              schema: schema.violations, contract: contract.violations };
  } catch (err) {
    floor = { verdict: null, violations: [], error: String(err && err.message ? err.message : err) };
  }
  if (floor.verdict === "nonconformant") {
    const reason = floor.contract && floor.contract.length && !(floor.schema && floor.schema.length)
      ? "contract_violation" : "schema_violation";
    return {
      verdict: "nonconformant",
      source: "floor",
      floor,
      receipt: {
        schema: "roleos-specialist-receipt/v1", role: CONFORMANCE_ROLE, ts, source: "floor",
        decision: { route: "floor", reason, detail: floor.violations.join("; ") },
      },
    };
  }

  // 2) Floor passed -> consult the LLM specialist (residual semantic-contract + L5 intent).
  try {
    const { result, receipt } = await dispatchSpecialist({
      role: CONFORMANCE_ROLE,
      input: { tool, call, intent, state: st, evidence: evidenceFor(tool, intent, st), claim: claimFor(tool, call) },
      // SAFE fail-open: never "conformant" — an unverifiable semantic check escalates, not waves through.
      claudeFn: async () => ({ verdict: "abstain", source: "floor-pass-llm-unavailable" }),
      agreeFn: conformanceAgree,
      traceId: traceId || `conformance-${ts}`,
      nowIso: ts,
      ...(paths ? { paths } : {}),
      ...(httpFn ? { httpFn } : {}),
      ...(classifier ? { classifier } : {}),
      ...(shadow ? { shadow } : {}),
    });
    const verdict = result && typeof result === "object" && "verdict" in result ? result.verdict : result;
    return { verdict: verdict ?? "abstain", source: receipt.source, receipt, floor };
  } catch (err) {
    // A conformance consult must never break the caller — escalate (abstain), never wave through.
    return {
      verdict: "abstain", source: "consult-error", floor,
      receipt: {
        schema: "roleos-specialist-receipt/v1", role: CONFORMANCE_ROLE, ts, source: "consult-error",
        error: String(err && err.message ? err.message : err),
      },
    };
  }
}
