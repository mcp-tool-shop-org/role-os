# Specialist — role schema extension + registry entry

This schema is **additive and non-breaking**. A role without a `specialist:` block behaves
exactly as today (Claude-backed). A role with the block declares a trained adapter that the
gate may route to per dispatch — see `policy/specialist-tier.md` for the law.

There are two related but distinct shapes:

1. **The `specialist:` block on a role** — declares that the role has a specialist available,
   and where to find it.
2. **The registry entry** — the on-disk record (`.role-os/specialists.json`) that the gate
   loads. The registry holds the version history; the role block points into it.

## 1. The `specialist:` block on a role

A role may include a `specialist:` block. The block is consumed by the gate; the role's
behavior definition (its `.md` file under `starter-pack/agents/`) does not change.

```json
{
  "role": "<existing role name>",
  "specialist": {
    "backend_url":   "<string — e.g. http://localhost:8000>",
    "adapter_id":    "<string — the pinned adapter the backend should serve>",
    "gate_threshold": <number in [0, 1] — OvA score below this fails open to Claude>,
    "fallback":      "claude",
    "workload_quota": <number in (0, 1] — max share of dispatches per window>,
    "certified_level": "<string — e.g. L0 (uncertified), L1, L2…>"
  }
}
```

Field meanings:

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `backend_url` | string | yes | Base URL of the HTTP service implementing the [Specialist HTTP contract](../policy/specialist-tier.md#specialist-http-contract). v0.1 contract: `POST <backend_url>/verify`. |
| `adapter_id` | string | yes | The trained adapter pin. The backend must echo it; mismatch fails open. |
| `gate_threshold` | number | yes | OvA score floor. `score < gate_threshold` fails open to Claude. v0.1 default in code: 0.75. |
| `fallback` | string | yes | Must be `"claude"` in v0.1. Reserved for future families. |
| `workload_quota` | number | yes | Max share of dispatches per window. v0.1 window default: 200 dispatches. |
| `certified_level` | string | yes | The current certification level. `"L0"` means uncertified; the gate refuses to route to an uncertified specialist (see Reject 2 in the policy). |

A role without a `specialist:` block — or with `specialist: null` — is Claude-backed
throughout. Removing the block is a valid way to disable specialist dispatch for a role.

## 2. The registry entry

The registry lives at `.role-os/specialists.json` (overridable via `ROLEOS_SPECIALISTS_PATH`).
It is the on-disk record the gate loads at boot.

```json
{
  "schema": "roleos-specialist-registry/v1",
  "specialists": [
    {
      "role": "<existing role name>",
      "backend_url": "<string>",
      "fallback": "claude",
      "workload_quota": <number>,
      "active_version": "<string — id from versions[]>",
      "versions": [
        {
          "id":              "<string — opaque version id>",
          "adapter_id":      "<string>",
          "base_model":      "<string — must NOT be a Claude-family id>",
          "gate_threshold":  <number in [0, 1]>,
          "certified_level": "<string — L0 / L1 / L2 / …>",
          "exam_hash":       "<string — sha256 of the certification exam this version was scored against>",
          "field_audit_window": <number — rolling window for field audit (e.g. 200 dispatches)>,
          "created_at":      "<ISO-8601 timestamp>",
          "notes":           "<string — optional, operator-facing>"
        }
      ]
    }
  ]
}
```

Field meanings (registry-specific — block fields above carry the same meaning):

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `schema` | string | yes | Schema id with a major version. v0.1 = `roleos-specialist-registry/v1`. |
| `specialists[].active_version` | string \| null | yes | The `versions[].id` that the gate currently routes to, or `null` if no version is currently active. An all-L0 registry starts at `null`. Promotion is the only way this changes from `null` to a version id. |
| `versions[].id` | string | yes | Opaque to the gate; usually a content-addressable id. Unique within `versions[]`. |
| `versions[].base_model` | string | yes | The base model the adapter sits on. **Rejected at load** if it resolves to a Claude-family id (see Reject 1). |
| `versions[].exam_hash` | string | yes | SHA-256 of the certification exam this version was scored against. Two versions with different `exam_hash` cannot be compared without recomputing — the eval gate enforces this. |
| `versions[].field_audit_window` | number | yes | The rolling-window size for field audit. The eval harness writes outcomes against this. |
| `versions[].created_at` | string | yes | When this version entered the registry. Used for ordering, not for any decision. |

## Reject conditions enforced at registry load

(Mirrors the policy's reject conditions, applied at the registry layer.)

- **R1.** `base_model` resolves to a Claude-family id → entry refused.
- **R2.** `active_version` is set to a version with `certified_level: "L0"` → promotion
  refused. (A registry shipped with all-L0 specialists is valid; promotion is the gate.)
- **R3.** Two versions with the same `id` in `versions[]` → registry refused (id collision).
- **R4.** `active_version` does not appear in `versions[]` → registry refused (dangling
  pointer).
- **R5.** `gate_threshold` outside `[0, 1]` → entry refused.
- **R6.** `workload_quota` outside `(0, 1]` → entry refused.
- **R7.** `schema` does not match the supported major version → registry refused.

R1, R3, and R4 are correctness invariants — there is no flag to bypass them.

## What is NOT in the registry

- **Adapter binaries.** The registry references adapters by `adapter_id`; the binaries live
  with the serving substrate (gpu-container's vLLM container in v1). A registry without
  matching backend artifacts is valid — calls will fail open at dispatch time, not at load.
- **Eval harness state.** The certification exam and the field audit data live in the eval
  harness (built in the training kickoffs). The registry only holds `exam_hash` and
  `field_audit_window` as pins.
- **Shadow-probe history.** The shadow-probe log is its own append-only log
  (`.role-os/specialist-shadow-probes.jsonl`). It is not in the registry — registries are
  pointer state, logs are history.
- **Operator state.** Halt-clear receipts and rollback receipts live in
  `.role-os/specialist-events.jsonl`, not in the registry itself.

## Example registry (one role, one uncertified version, no active version)

```json
{
  "schema": "roleos-specialist-registry/v1",
  "specialists": [
    {
      "role": "Verifier",
      "backend_url": "http://localhost:8000",
      "fallback": "claude",
      "workload_quota": 0.7,
      "active_version": null,
      "versions": [
        {
          "id": "v0-stub",
          "adapter_id": "verifier-l4-stub-2026-06-04",
          "base_model": "Qwen/Qwen3-7B",
          "gate_threshold": 0.75,
          "certified_level": "L0",
          "exam_hash": "0000000000000000000000000000000000000000000000000000000000000000",
          "field_audit_window": 200,
          "created_at": "2026-06-04T00:00:00Z",
          "notes": "v0.1 stub entry — uncertified, not yet promoted to active."
        }
      ]
    }
  ]
}
```

The role has a version on file, but `active_version` is `null` — so every dispatch for this
role goes to Claude. The L0 version cannot be promoted (Reject 2); a certified L1+ version
would be added to `versions[]` by the eval harness and then promoted via `roleos specialist
promote <role> <version>`.
