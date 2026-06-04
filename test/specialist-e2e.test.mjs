/**
 * End-to-end: dispatch a request through the specialist tier against a REAL local HTTP
 * server (the stub backend) and verify the whole chain works. No mocks for the transport
 * layer — this is the proof that the v0.1 control plane is wired correctly.
 *
 * The stub backend is a tiny Node http server that echoes the adapter_id and returns a
 * canned verdict per the Specialist HTTP contract in policy/specialist-tier.md.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { dispatchSpecialist } from "../src/specialist/dispatch.mjs";
import { saveRegistry, REGISTRY_SCHEMA } from "../src/specialist/registry.mjs";

/**
 * Start a stub specialist backend. Returns `{ url, stop, requests }` — `requests` is an array
 * of the JSON bodies we received (so the test can assert on what we sent).
 *
 * @param {object} options
 * @param {(body:object) => object} options.verdictFn   maps request body → response body
 * @param {number} [options.failStatus]   if set, respond with this status code (no body)
 */
function startStubBackend({ verdictFn, failStatus } = {}) {
  const requests = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      let body = null;
      try { body = JSON.parse(raw); } catch { /* ignored */ }
      if (body) requests.push(body);
      if (failStatus) {
        res.writeHead(failStatus, { "Content-Type": "application/json" });
        res.end("");
        return;
      }
      const verdict = verdictFn(body || {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(verdict));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        stop: () => new Promise((r) => server.close(() => r())),
        requests,
      });
    });
  });
}

function tmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "roleos-specialist-e2e-"));
  return {
    dir,
    paths: {
      registry: join(dir, "specialists.json"),
      state: join(dir, "state.json"),
      events: join(dir, "events.jsonl"),
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function writeRegistry(path, backendUrl) {
  saveRegistry(path, {
    schema: REGISTRY_SCHEMA,
    specialists: [
      {
        role: "Verifier",
        backend_url: backendUrl,
        fallback: "claude",
        workload_quota: 0.7,
        active_version: "v1",
        versions: [
          {
            id: "v1",
            adapter_id: "verifier-l4-stub-2026-06-04",
            base_model: "Qwen/Qwen3-7B",
            gate_threshold: 0.6,
            certified_level: "L1",
            exam_hash: "e",
            field_audit_window: 200,
            created_at: "2026-06-04T00:00:00Z",
          },
        ],
      },
    ],
  });
}

const PASS_CLASSIFIER = { scoreFn: () => 0.99, oodFn: () => false };
const NOW = "2026-06-04T00:00:00Z";

describe("E2E — dispatch against a real local stub backend", () => {
  it("happy path: gate routes → POST /verify → backend returns verdict → dispatcher returns it", async () => {
    const { paths, cleanup } = tmpDir();
    const backend = await startStubBackend({
      verdictFn: (body) => ({
        verdict: { entailment: "supported", evidence_id: "abs:42" },
        score: 0.91,
        adapter_id: body.adapter_id,
        base_model: "Qwen/Qwen3-7B",
        duration_ms: 33,
      }),
    });
    try {
      writeRegistry(paths.registry, backend.url);
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: { claim: "LLMs cannot self-verify", evidence: "Title: …" },
        claudeFn: async () => { throw new Error("Claude should not be called on happy path"); },
        traceId: "e2e-1",
        nowIso: NOW,
        paths,
        classifier: PASS_CLASSIFIER,
      });
      assert.deepEqual(result, { entailment: "supported", evidence_id: "abs:42" });
      assert.equal(receipt.route, "specialist");
      assert.equal(receipt.source, "specialist");
      assert.equal(receipt.specialist_call.adapter_id, "verifier-l4-stub-2026-06-04");
      assert.equal(receipt.specialist_call.base_model, "Qwen/Qwen3-7B");

      assert.equal(backend.requests.length, 1);
      assert.equal(backend.requests[0].role, "Verifier");
      assert.equal(backend.requests[0].adapter_id, "verifier-l4-stub-2026-06-04");
      assert.equal(backend.requests[0].trace_id, "e2e-1");
      assert.equal(backend.requests[0].input.claim, "LLMs cannot self-verify");
    } finally {
      await backend.stop();
      cleanup();
    }
  });

  it("backend 500 → fail-open to Claude", async () => {
    const { paths, cleanup } = tmpDir();
    const backend = await startStubBackend({ failStatus: 500, verdictFn: () => ({}) });
    try {
      writeRegistry(paths.registry, backend.url);
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-fallback",
        traceId: "e2e-2",
        nowIso: NOW,
        paths,
        classifier: PASS_CLASSIFIER,
      });
      assert.equal(result, "claude-fallback");
      assert.equal(receipt.route, "specialist");
      assert.equal(receipt.source, "claude");
      assert.equal(receipt.specialist_call.ok, false);
      assert.equal(receipt.specialist_call.error, "http_500");
    } finally {
      await backend.stop();
      cleanup();
    }
  });

  it("backend echoes a WRONG adapter_id → fail-open (safety check)", async () => {
    const { paths, cleanup } = tmpDir();
    const backend = await startStubBackend({
      verdictFn: () => ({
        verdict: "supported",
        adapter_id: "MALICIOUS-DIFFERENT-ADAPTER",
        base_model: "Qwen/Qwen3-7B",
      }),
    });
    try {
      writeRegistry(paths.registry, backend.url);
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-safe",
        traceId: "e2e-3",
        nowIso: NOW,
        paths,
        classifier: PASS_CLASSIFIER,
      });
      assert.equal(result, "claude-safe");
      assert.equal(receipt.source, "claude");
      assert.equal(receipt.specialist_call.error, "adapter_id_mismatch");
    } finally {
      await backend.stop();
      cleanup();
    }
  });

  it("backend unreachable (port closed) → fail-open to Claude", async () => {
    const { paths, cleanup } = tmpDir();
    try {
      // A high port number not in use. (Closed-port refusal returns ECONNREFUSED.)
      writeRegistry(paths.registry, "http://127.0.0.1:1");
      const { result, receipt } = await dispatchSpecialist({
        role: "Verifier",
        input: {},
        claudeFn: async () => "claude-fallback",
        traceId: "e2e-4",
        nowIso: NOW,
        paths,
        classifier: PASS_CLASSIFIER,
        timeoutMs: 2000,
      });
      assert.equal(result, "claude-fallback");
      assert.equal(receipt.source, "claude");
      assert.equal(receipt.specialist_call.ok, false);
    } finally { cleanup(); }
  });
});
