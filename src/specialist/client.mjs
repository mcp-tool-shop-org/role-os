/**
 * Specialist HTTP client — POST to `<backend_url>/verify` per the Specialist HTTP contract in
 * `starter-pack/policy/specialist-tier.md`.
 *
 * Hides one secret family (Parnas): the vLLM HTTP wire format and the fail-open mapping from
 * (timeout | non-200 | malformed JSON | adapter_id mismatch) to a result the dispatcher can
 * use to fail open without leaking transport details upward.
 *
 * The `httpFn` is injectable so tests do not need a live server. Production default uses the
 * global `fetch` (Node 18+, required by package.json engines).
 */

/**
 * @typedef {object} SpecialistCallResult
 * @property {boolean} ok
 * @property {object}  [verdict]      role-specific opaque verdict from the backend
 * @property {number}  [score]        backend self-reported score in [0, 1] (INFORMATIONAL only)
 * @property {string}  [adapter_id]   echo of the adapter pin
 * @property {string}  [base_model]   echo of the base model
 * @property {number}  [duration_ms]  backend-reported duration
 * @property {string}  [error]        on !ok — fail-open reason
 * @property {string}  [detail]       on !ok — human-readable detail
 * @property {number}  [status]       HTTP status (when relevant)
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Default httpFn: a thin wrapper over global fetch that returns the same shape as the
 * injectable contract — { ok, status, json|null, error|null }.
 */
async function defaultHttpFn(url, { method, headers, body, timeoutMs }) {
  // AbortController is available on Node 18+ (engines: >=18.0.0).
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, headers, body, signal: ac.signal });
    let json = null;
    let parseError = null;
    try { json = await res.json(); }
    catch (err) { parseError = err.message; }
    return { ok: res.ok, status: res.status, json, error: parseError };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, status: 0, json: null, error: "timeout" };
    return { ok: false, status: 0, json: null, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Call the specialist backend. Always returns a result object; never throws on transport
 * failure. A failed call returns `{ ok: false, error, detail }` and the dispatcher fails open
 * to Claude — that's the contract.
 *
 * @param {object} params
 * @param {string} params.backendUrl
 * @param {string} params.adapterId
 * @param {string} params.role
 * @param {*}      params.input
 * @param {string} params.traceId
 * @param {number} [params.timeoutMs=10000]
 * @param {Function} [params.httpFn]  injectable for tests: (url, opts) => Promise<{ok,status,json,error}>
 * @returns {Promise<SpecialistCallResult>}
 */
export async function callSpecialist({
  backendUrl,
  adapterId,
  role,
  input,
  traceId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  httpFn = defaultHttpFn,
}) {
  if (typeof backendUrl !== "string" || !backendUrl) {
    return { ok: false, error: "no_backend_url", detail: "backendUrl is required" };
  }
  if (typeof adapterId !== "string" || !adapterId) {
    return { ok: false, error: "no_adapter_id", detail: "adapterId is required" };
  }
  const url = `${backendUrl.replace(/\/+$/, "")}/verify`;
  const body = JSON.stringify({ adapter_id: adapterId, role, input, trace_id: traceId });
  const t0 = Date.now();
  const res = await httpFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    timeoutMs,
  });
  const wireMs = Date.now() - t0;

  if (!res.ok) {
    // Prefer http_<status> when the backend gave us a status (e.g. 500 with no body —
    // the parse error is incidental, the HTTP status is what matters). Fall back to the
    // transport error string only when there's no status to report (status === 0 = no
    // response, e.g. timeout / ECONNREFUSED).
    const error = res.status > 0 ? `http_${res.status}` : (res.error || "transport_error");
    return {
      ok: false,
      error,
      detail: `specialist backend at ${url} returned status=${res.status || 0}${res.error ? ` (${res.error})` : ""}`,
      status: res.status || 0,
    };
  }
  if (!res.json || typeof res.json !== "object") {
    return { ok: false, error: "malformed_response", detail: "backend response was not a JSON object", status: res.status };
  }
  const { verdict, score, adapter_id: echoedAdapterId, base_model, duration_ms } = res.json;
  if (verdict === undefined) {
    return { ok: false, error: "missing_verdict", detail: "backend response had no `verdict` field", status: res.status };
  }
  if (typeof echoedAdapterId !== "string" || echoedAdapterId !== adapterId) {
    // Adapter-id echo mismatch: the backend served a different adapter than we pinned.
    // This is a load-bearing safety check — the registry's `adapter_id` is the pin, and a
    // different adapter could be a different specialist entirely. Fail open.
    return {
      ok: false,
      error: "adapter_id_mismatch",
      detail: `pinned adapter_id="${adapterId}", backend echoed "${echoedAdapterId}"`,
      status: res.status,
    };
  }
  return {
    ok: true,
    verdict,
    score: typeof score === "number" ? score : undefined,
    adapter_id: echoedAdapterId,
    base_model: typeof base_model === "string" ? base_model : undefined,
    duration_ms: typeof duration_ms === "number" ? duration_ms : wireMs,
  };
}
