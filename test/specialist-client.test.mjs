import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { callSpecialist } from "../src/specialist/client.mjs";

// ── A canned httpFn factory: returns a fixed response regardless of input ──────────────────────

const httpReturning = (res) => async () => res;

describe("callSpecialist — happy path", () => {
  it("posts to /verify and returns the verdict on a 200 JSON response", async () => {
    let seenUrl = null;
    let seenOptions = null;
    const httpFn = async (url, opts) => {
      seenUrl = url;
      seenOptions = opts;
      return {
        ok: true,
        status: 200,
        json: {
          verdict: "supported",
          score: 0.92,
          adapter_id: "adapter-1",
          base_model: "Qwen/Qwen3-7B",
          duration_ms: 420,
        },
        error: null,
      };
    };
    const r = await callSpecialist({
      backendUrl: "http://localhost:8000",
      adapterId: "adapter-1",
      role: "Verifier",
      input: { claim: "x", evidence: "y" },
      traceId: "t1",
      httpFn,
    });
    assert.equal(r.ok, true);
    assert.equal(r.verdict, "supported");
    assert.equal(r.score, 0.92);
    assert.equal(r.adapter_id, "adapter-1");
    assert.equal(r.base_model, "Qwen/Qwen3-7B");
    assert.equal(r.duration_ms, 420);
    assert.equal(seenUrl, "http://localhost:8000/verify");
    assert.equal(seenOptions.method, "POST");
    assert.equal(seenOptions.headers["Content-Type"], "application/json");

    const body = JSON.parse(seenOptions.body);
    assert.equal(body.adapter_id, "adapter-1");
    assert.equal(body.role, "Verifier");
    assert.equal(body.trace_id, "t1");
    assert.deepEqual(body.input, { claim: "x", evidence: "y" });
  });

  it("strips a trailing slash from backendUrl", async () => {
    let seenUrl = null;
    const httpFn = async (url) => {
      seenUrl = url;
      return { ok: true, status: 200, json: { verdict: "ok", adapter_id: "a" }, error: null };
    };
    await callSpecialist({ backendUrl: "http://localhost:8000///", adapterId: "a", role: "R", input: {}, traceId: "t", httpFn });
    assert.equal(seenUrl, "http://localhost:8000/verify");
  });
});

describe("callSpecialist — fail-open transport errors", () => {
  it("returns ok=false on timeout", async () => {
    const r = await callSpecialist({
      backendUrl: "http://x", adapterId: "a", role: "R", input: {}, traceId: "t",
      httpFn: httpReturning({ ok: false, status: 0, json: null, error: "timeout" }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "timeout");
  });

  it("returns ok=false on non-200 status", async () => {
    const r = await callSpecialist({
      backendUrl: "http://x", adapterId: "a", role: "R", input: {}, traceId: "t",
      httpFn: httpReturning({ ok: false, status: 500, json: null, error: null }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "http_500");
  });

  it("returns ok=false on malformed JSON", async () => {
    const r = await callSpecialist({
      backendUrl: "http://x", adapterId: "a", role: "R", input: {}, traceId: "t",
      httpFn: httpReturning({ ok: true, status: 200, json: null, error: "Unexpected token" }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "malformed_response");
  });

  it("returns ok=false when verdict field is missing", async () => {
    const r = await callSpecialist({
      backendUrl: "http://x", adapterId: "a", role: "R", input: {}, traceId: "t",
      httpFn: httpReturning({ ok: true, status: 200, json: { adapter_id: "a" }, error: null }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "missing_verdict");
  });

  it("returns ok=false on adapter_id echo mismatch (safety check)", async () => {
    const r = await callSpecialist({
      backendUrl: "http://x", adapterId: "expected-adapter", role: "R", input: {}, traceId: "t",
      httpFn: httpReturning({ ok: true, status: 200, json: { verdict: "ok", adapter_id: "DIFFERENT-adapter" }, error: null }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "adapter_id_mismatch");
    assert.match(r.detail, /expected-adapter/);
    assert.match(r.detail, /DIFFERENT-adapter/);
  });
});

describe("callSpecialist — input validation", () => {
  it("ok=false on missing backendUrl", async () => {
    const r = await callSpecialist({ backendUrl: "", adapterId: "a", role: "R", input: {}, traceId: "t" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_backend_url");
  });

  it("ok=false on missing adapterId", async () => {
    const r = await callSpecialist({ backendUrl: "http://x", adapterId: "", role: "R", input: {}, traceId: "t" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_adapter_id");
  });
});
