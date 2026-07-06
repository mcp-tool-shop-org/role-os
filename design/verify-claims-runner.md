# Claims-Verification Gate — `roleos verify-claims`

**Status:** shipped (this document rides the commit that adds the verb).
**Seam:** `src/verify-claims.mjs` (gate + MCP stdio client) · `src/verify-claims-cmd.mjs` (CLI) ·
peer to `src/verify-citations.mjs` / `design/citation-verification-runner.md`.
**External verifier:** `ollama_verify_claims` (ollama-intern-mcp ≥ 2.9) — a cross-family Ollama
Cloud flagship panel (default deepseek / kimi / glm, disjoint vendor families) that adjudicates
caller-supplied claims CONFIRMED / REFUTED / UNCERTAIN, lone-dissent-never-decides, with a
served-model check per juror and a `weak` flag when the panel thins. The worked pattern is the
intern repo's `docs/design/cross-family-verify-recipe.md` (local review → cloud adjudication →
durable artifact).

## Standards compliance

| # | Standard | Score | Evidence |
|---|----------|-------|----------|
| 1 | PIN_PER_STEP | **3 — EXEMPLARY** | The receipt pins both directions of the wire: `request_sha256` digests the exact tool arguments sent (claims, `source_paths`, `reference`, panel override, `min_refute_votes`) and `envelope_sha256` digests everything the verifier said (seats requested-vs-served, per-juror votes, degradation flags), with `chain_sha256 = sha256(claims\|request\|envelope\|verdict)`. Proven by the chain-recompute and reference-drift tests. Honest boundary, named: `source_paths` pin the path LIST, not file contents — the intern reads files server-side at call time, so an edit to a listed file surfaces only through the envelope side of the chain. |
| 2 | ANDON_AUTHORITY | **3 — EXEMPLARY** | The gate halts the pipeline through its exit codes: `20` blocking (REFUTED under `--strict-refuted`), `30` escalate, `10` revise — any non-zero stops a mission step or CI job. Enforced in `exitCodeFor` + `gateClaims`, documented in the CLI header, and proven by `test/verify-claims.test.mjs` ("strictRefuted turns a REFUTED into a blocking refuse", "maps the tiers"). |
| 3 | NAMED_COMPENSATORS | **2 — PRESENT** | The verb performs **no irreversible external calls**: the verifier tool is read-only adjudication (its cloud egress of claims/evidence is deliberate disclosure, documented in the intern's SECURITY.md #13, not a mutation). The only write is the local receipt JSON; it overwrites a prior receipt at the same path (same behavior as verify-citations) — compensator = restore from VCS or pass `--receipt <fresh-path>`; `--no-receipt` skips the write entirely. No skip is being claimed: the compensator table is this cell. |
| 4 | DECOMPOSE_BY_SECRETS | **3 — EXEMPLARY** | The sibling-verb decision IS this standard: citations/prism and claims/intern wire formats change independently, so they live in separate modules rather than one flag-switched flow. Within the module, the MCP transport (`callInternTool`), the verdict doctrine (`gateClaims`, pure), and the receipt chain (`buildReceipt`) are separately-testable units; the transport is injectable (`options.callTool`) so doctrine tests never touch a process boundary. |
| 5 | UNCERTAINTY_GATED_HUMANS | **3 — EXEMPLARY** | The escalate tier is exactly the uncertainty-gated human checkpoint: `weak_panel` (<2 cloud-served jurors), `needs_review` (the panel could not settle), and `verifier_unreachable`/`cloud_not_configured` (closed gate) all exit 30 for a human, with contrastive `reason — detail` strings naming why. Certainty does not page a human: a full-panel all-CONFIRMED passes, a REFUTED routes to revise with the juror rationales printed. |
| 6 | EXTERNAL_VERIFIER | **3 — EXEMPLARY** | The verifier is a different model family from the generator by construction (disjoint-family cloud panel; role-os dispatches Anthropic models), and reasoning-stripped by construction — the tool's claim schema is `strict()`, so a reasoning channel structurally cannot exist. The served-model check (enforced tool-side, recorded receipt-side) prevents a silent local fallback from masquerading as the cross-family jury. role-os never grades its own homework. |

## The three-tier mapping (failure-source doctrine)

| Panel outcome | Gate verdict | Why |
|---|---|---|
| `weak: true` (<2 cloud-served jurors) | **escalate** (30) | The tool's own contract: every verdict on a thin panel is needs-review-grade — including a kill. Weak dominates REFUTED, even in strict mode. |
| any REFUTED (≥ `min_refute_votes`, cross-family) | **revise** (10) — `--strict-refuted` ⇒ **refuse** (20, blocking) | Model consensus, not determinism; the citations gate reserves blocking for deterministic evidence (a paper that does not resolve), and the intern's own recipe warns the panel over-flags. Hard-andon pipelines opt in. |
| any NEEDS_REVIEW | **escalate** (30) | A human owns what the panel could not settle. |
| all CONFIRMED, full panel | **accept** (0) | Still evidence, not proof (arXiv:2509.17995) — a CONFIRMED on frontier-authored claims is weak evidence by design. |
| verifier unreachable / `CLOUD_NOT_CONFIGURED` / unparseable | **escalate** (30) | An unreachable gate is a closed gate; never default-accept. |

Zero adjudicated claims can never be trusted as accept, and >20 claims refuses loudly without
calling the tool — a partially-verified set presenting as fully verified is the exact failure
mode this gate exists to stop (split and run per batch).

## Transport

`callInternTool` spawns the intern MCP server and speaks newline-delimited JSON-RPC over stdio
(`initialize` → `notifications/initialized` → `tools/call ollama_verify_claims`), then kills the
child. Resolution order: `--intern-cmd` / `INTERN_MCP_CMD` → a locally-installed
`ollama-intern-mcp` package run under the current node (no Windows `.cmd`-shim problem) → bare
`ollama-intern-mcp` on PATH. This deliberately uses the intern's PUBLIC MCP contract rather than
deep-importing its handler: importing would require constructing the intern's internal
`RunContext` and couples role-os to unexported wiring. `OLLAMA_API_KEY` must be present in the
environment (the tool is cloud-required; without it the gate escalates `cloud_not_configured`
with the intern's own hint).

## Receipt (`roleos-claims-receipt/v1`)

`claims_sha256` (the normalized claim set) + `request_sha256` (the exact wire request —
claims, `source_paths`, `reference`, panel override, `min_refute_votes`) + `envelope_sha256`
(the verifier's full reply, panel seats and juror votes included) +
`chain_sha256 = sha256(claims|request|envelope|verdict)`. Drift-detectable on re-run like the
prism chain — a changed evidence set or jury cannot silently reuse a prior verdict; the
per-seat `raw_sample` (intern v2.9.1) rides into the receipt so a thinned panel is diagnosable
from the receipt alone. (The chain gained `request_sha256` before any npm release carried the
verb, so the schema id stays `/v1`.)
