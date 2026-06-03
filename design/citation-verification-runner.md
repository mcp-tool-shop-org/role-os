# Citation-Verification Runner — design

A deterministic **gate** that verifies the citations in a research dispatch before role-os lets
it advance — wiring the shipped `prism verify` CLI (the external, family-different citation
verifier) into role-os's research/Critic-Reviewer flow. It replaces the manual ollama-intern
"stopgap" the research-grounded-advisor protocol used while prism's citation layer was unbuilt.

## Why a gate, not a step

role-os is **orchestration-only**: `mission-run.mjs` is explicit that *"the runner does NOT
execute code — it orchestrates the contract chain and tracks state."* The *only* place role-os
shells out is `src/swarm/build-gate.mjs` (`execSync` running lint/typecheck/test after each swarm
wave). The citation check follows that precedent exactly: a standalone deterministic **gate
module** (`src/verify-citations.mjs`, peer to `build-gate.mjs`) + a `roleos verify-citations`
CLI, invoked at the **Critic Reviewer** point of the `research-launch` mission. Critic *consumes*
the structured verdict + receipt as evidence; the shell-out is deterministic, not in a prompt.

## Architecture

```
dispatch.md (Research grounding prose)
  -> EXTRACT (deterministic template parser; copy-only) -> citations.json
  -> SHELL  prism verify --type citations -a @citations.json --caller-family anthropic --provider ollama
  -> PARSE  structured verdict (JSON + exit code), never regex prose
  -> GATE   three tiers keyed to the FAILURE SOURCE
  -> RECEIPT role-os record chained to prism's HMAC receipt (drift-detectable)
```

## Research grounding (study-swarm `wf_20651368-297`, 4 parallel agents)

### Extraction (Q1)
1. **Deterministic-floor hybrid, not an LLM extractor.** A CRF reference parser hits ~0.96 F1,
   is replayable, and *cannot* hallucinate a DOI; LLMs only win on out-of-distribution layouts,
   so the benchmark authors recommend a hybrid router. Zhu/Colavizza/Romanello 2026
   (arXiv:2603.13651); Prasad/Kaur/Kan 2018 (DOI:10.1007/s00799-018-0242-1). → **v1 extractor is
   a deterministic parser of *our own* dispatch template; LLM fallback is reserved for
   off-template bullets (deferred to v2).**
2. **The extractor may only COPY strings from the prose — never complete a missing identifier
   from parametric memory.** Only 13.4% of GPT-4's generated references existed (Khraisha 2024,
   DOI:10.1002/jrsm.1715). → **Extraction copies the identifier/claim verbatim; prism's
   arXiv/Crossref resolution is the sole authority — a parse is "accepted" only if it resolves
   and the metadata matches, turning field-extraction errors into *visible* resolution misses,
   not silent passes.** Unparsed items are reported, never dropped.
3. **Forcing one-shot structured output degrades correctness** (Tam 2024 arXiv:2408.02442;
   JSONSchemaBench Geng 2025 arXiv:2501.10868 — constrained decoding yields valid-but-*wrong*).
   → if/when the LLM fallback lands, it runs two-stage (free-form, then normalize), and schema
   validity is never trusted as semantic correctness.
4. **Model claim↔source as SciFact's 3-way** SUPPORTS / REFUTES / NOT-ENOUGH-INFO with a
   rationale (Wadden 2020 arXiv:2004.14974) — NOT-ENOUGH-INFO (real paper, unsupported claim) is
   the dominant real failure and the key revise signal. prism's groundedness lens already does
   this (supported / contradicted / not_addressed).

### Gating (Q2) — three tiers keyed to the failure source
5. **Hard-halt ONLY on the deterministic existence floor.** A citation unresolvable in
   arXiv/Crossref is a near-zero-false-positive fabrication signal; blocking *only* on that floor
   keeps the false-refuse rate near zero, which is the precondition for the gate being respected
   rather than suppressed (Alfadel FSE 2025 DOI:10.1145/3715729 — alert-fatigue; false positives
   are the #1 suppression cause). A jidoka halt also carries the defect + owner, not a dead stop
   (TPS / Ohno).
6. **Do NOT hard-block on the noisy LLM groundedness lens** — that manufactures alert-fatigue.
   A "revise" (exists, weak match) is *advisory*: surface fix-notes (v2: bounded auto-revise +
   re-verify; Horvitz 1999 DOI:10.1145/302979.303030).
7. **Escalate to a human only on the verifier's own low confidence** — the abstain band of
   selective prediction (Hendrickx 2024 arXiv:2107.11277). Keep it rare (Parasuraman & Manzey
   2010 DOI:10.1177/0018720810376055 — complacency hits experts and can't be trained away), make
   it a **cognitive forcing function** (the source span unlocks before accept; Buçinca 2021
   arXiv:2102.09692), and frame it **contrastively** (Buçinca 2024 arXiv:2410.04253 — the literal
   source behind workflow-standard #5): *"this dispatch treats source X as supporting claim C;
   the source does not mention C."*
8. **No silent auto-pass + determinism.** Every verdict emits a replayable receipt, and a flaky
   verdict gets re-run-until-green then ignored (Ge/Zhang 2026 arXiv:2602.02307) — so the step is
   pinned (PIN_PER_STEP).

### External-verifier integration (Q3)
9. **LLM-Modulo literally** (Kambhampati 2024 arXiv:2402.01817): role-os generates, prism is the
   external sound critic, the dispatch halts at its architectural lock until prism returns
   accept. Self-check *collapses* performance (Stechly 2024 arXiv:2402.08115; Huang 2023
   arXiv:2310.01798) and an LLM can't soundly check its own citations — so role-os must never
   grade its own homework. Same-family / self-recognition inflates accept rates (Panickssery 2024
   arXiv:2404.13076; Wataoka 2024 arXiv:2410.21819) — prism's L1 family-different routing handles
   this by construction.
10. **Parse a STRUCTURED verdict (JSON + distinct exit codes), never regex prose** (Sigdel/Baral
    2026 arXiv:2603.13404). prism verify is read-only ⇒ idempotent (RFC 9110 §9.2.2), so the
    shell wrapper may safely retry with bounded jittered backoff + a circuit breaker (Atomix
    2026 arXiv:2602.14849).
11. **An unreachable gate is a closed gate.** A verifier timeout / crash / missing-binary maps to
    **escalate**, NEVER default-accept. (This is the single most important runtime invariant.)
12. **The deterministic floor is non-gameable** (Amodei 2016 arXiv:1606.06565 / Goodhart): a model
    can't make arXiv return a paper that doesn't exist. The existence floor dominates; never let a
    soft groundedness score override a hard existence FAIL.

### Reproducibility / receipt chaining (Q4)
13. **The live-API step is a decaying liability** — 74% of un-pinned research artifacts fail to
    re-run (Trisovic 2022 DOI:10.1038/s41597-022-01143-6). prism's v0.3 receipt already
    content-hashes each retrieved source (`retrieval_pins`: query + `source_sha256`), so **drift
    is already detectable**: re-run, compare the hash; a mismatch is an andon drift event, not a
    silent flip. Pin **version-pinned** identifiers (arXiv:…vN; versions are immutable).
14. **Chain receipts, don't nest them** (Haber & Stornetta 1991 DOI:10.1007/BF00196791). The
    role-os receipt embeds prism's HMAC-receipt id + signature and content-hashes over
    (citations-hash + prism-signature + verdict), so neither the extracted citations nor prism's
    verdict can be altered without breaking the chain. Model the lineage in W3C PROV terms —
    orchestrator Agent ≠ verifier Agent, explicit at the provenance layer. **v1 RECORDS** prism's
    receipt id + signature into a hash-chained role-os receipt (chain-of-custody); trust rests on
    role-os having *spawned* the prism process locally — it does **not** cryptographically verify
    prism's signature (that needs a shared key, RFC 2104). **Cryptographic inner-HMAC verification +
    a separately-keyed outer receipt is v2** — the v1 receipt does not overstate its tamper-evidence.

## Locked design (v1)

**`src/verify-citations.mjs`** (pure, testable; mirrors `build-gate.mjs`):
- `extractCitations(markdown) -> { citations: Citation[], unparsed: string[] }` — deterministic
  parse of our dispatch template; copies `identifier` (arXiv / DOI / RFC), `claim` (the finding),
  and `authors`/`year` verbatim. Items with no resolvable identifier go to `unparsed` (visible).
- `gateCitations(prismResponse) -> GateResult` — maps prism's per-citation results to the three
  tiers: existence `fabricated` ⇒ **blocking**; metadata-mismatch / numeric / groundedness
  `contradicted` ⇒ **advisory: revise**; `unresolvable` / `not_addressed` / prism `escalate` ⇒
  **advisory: escalate (human)**; all `accept` ⇒ **pass**. `pass = (verdict === "accept")`;
  `blocking = any existence-fabricated`.
- `runCitationGate(input, options) -> GateResult` — load (.md ⇒ extract, .json ⇒ passthrough) →
  write temp citations.json → shell prism (injectable `options.exec` for tests; configurable
  `options.prismCmd`, default `prism`; per-call `timeout`, bounded retries) → parse JSON verdict →
  `gateCitations` → emit the chained role-os receipt. **prism unreachable/timeout/crash ⇒
  escalate, never accept.**

**`roleos verify-citations <dispatch.md|.json> [--intent ...] [--provider ollama] [--json]`** —
prints a human or JSON report; **exit codes: 0 accept · 20 blocking (fabricated) · 30 escalate
(verifier unreachable / low-confidence — a closed gate) · 10 revise · 2 no-citations**. Blocking is
evaluated before accept (in `gateCitations` AND at the exit boundary) so the floor can never be
shadowed by a drifted/contradictory top-level verdict.

**Critic Reviewer** (`.claude/agents/core/critic-reviewer.md`) gains a checklist clause: for a
research dispatch with a Research-grounding section, run `roleos verify-citations`; `blocking`
⇒ **reject**, `advisory` ⇒ **accept-with-notes / escalate** per the per-citation actions.

**prism enhancement (paired):** verdict-specific CLI exit codes (`0`/`10`/`20`/`30` =
accept/revise/refuse/escalate) so the shell gate branches cleanly.

## Local-panel seat (added v2.5.0) — a second family-different verifier, local + free

prism is the family-different verifier of record (retrieval: the deterministic existence floor +
its own groundedness lens). `--local-panel` adds a SECOND seat decorrelated from BOTH the Claude
generator AND prism's single groundedness model: a 3-seat conservative-majority entailment panel
running entirely on local models (the `offload` CLI — `qwen3-4b` + `qwen3-14b` + `mistral-nemo-12b`
on llama-swap). It re-judges each citation prism marked `supported`, using prism's OWN retrieved
evidence (`source_title` + `supporting_span`) as the source — so if even prism's best span does not
entail the claim under a strict panel, that is the false-confirm worth catching.

- **Monotone-tightening (the safety invariant).** The panel can only downgrade a *passing* gate to
  `escalate` (`local_panel_disagreement`); it never loosens, never overrides the existence floor
  (blocking dominates), and never runs on an already non-passing gate. A requested-but-unreachable
  panel escalates (`local_panel_unreachable`) — the closed-gate rule, applied to the seat.
- **Why it is sound to add (not just more models).** The panel's measured property (tensor-engine-
  knowledge #156, re-proven wave-6 on a real arXiv set in `verifier/citation-panel-receipt.json`) is
  **zero false-confirms**: a 3-seat conservative majority never stamps a false claim "supported,"
  even when a single seat slips (on that set `mistral-nemo-12b` solo false-confirmed a refuted claim
  inverting arXiv:2404.13076; the panel held it at `insufficient`). So a panel disagreement on a
  prism `supported` is a real signal, and routing it to a human with a contrastive message is exactly
  UNCERTAINTY_GATED_HUMANS. This realizes `multi-lens ≥ 3` with a *decorrelated mechanism* (an
  entailment panel) rather than redundant copies of prism's own lens.
- **Receipt.** A `local_panel` block records the exact seat models (PIN_PER_STEP), per-citation panel
  verdicts, and disagreements; the panel digest + the (possibly-downgraded) verdict fold into the
  receipt hash chain.
- **Module.** `src/citation-panel.mjs` — pure/injectable (`offloadExec`), mirroring verify-citations'
  exec discipline. Off by default. Evidence is presently prism's single span; surfacing prism's full
  retrieved abstract would strengthen the panel (a prism follow-up).

## Standards compliance

Scored against the six workflow standards (this gate IS a new workflow).

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 3 | The gate pins the prism CLI invocation (command + caller-family + provider) and emits a receipt chaining prism's HMAC receipt (id + signature) + the citations content-hash; prism's `retrieval_pins` (query + `source_sha256`) make the retrieval replayable + drift-detectable. The local-panel `local_panel` receipt block pins the exact seat models that ran; the eval receipt also pins the offload verify-prompt hash + each source abstract's `sha256`. |
| ANDON_AUTHORITY | 3 | `blocking` (existence-fabricated) halts the dispatch before its architectural lock; an unreachable verifier escalates, never default-accepts. The halt carries the defect (which citation, why) + owner. |
| NAMED_COMPENSATORS | **skip** | Read-only: extraction reads the dispatch, prism verify is a read-only GET-backed call, the receipt is git-reversible. No irreversible world-touching write ⇒ no compensator (documented skip, per the rule's own example). |
| DECOMPOSE_BY_SECRETS | 3 | `verify-citations.mjs` hides extraction + the prism shell-out + the tiering; the CLI command hides arg/output formatting; prism hides verification. One secret per module (Parnas). |
| UNCERTAINTY_GATED_HUMANS | 3 | The Tier-3 **escalate** path is a genuine uncertainty-gated human checkpoint (gated on the verifier's own low confidence, not step count), with a **contrastive** message and a forcing function (view the source span before accepting). This is where role-os — the interactive layer — implements the standard prism (non-interactive) could only defer. |
| EXTERNAL_VERIFIER | 3 | The whole point: role-os (generator) defers citation adjudication to prism, a **different model family**, reasoning-stripped, by construction (L1 routing). role-os never grades its own dispatch — and enforces prism's existence floor *itself* (blocking dominates accept). It **records** prism's signed receipt (chain-of-custody; cryptographic inner-HMAC verification is a v2 item). **v2.5.0 adds `--local-panel`: a SECOND family-different seat (a 3-seat Qwen+Mistral entailment panel, no Anthropic model, decorrelated from both Claude and prism) with a measured 0-false-confirm property and a receipt of it catching a real single-model false-confirm — multi-lens ≥ 3, runnable locally for free.** |

### Irreversible actions & compensators
None. The gate **reads** a dispatch, **shells a read-only verifier** (prism verify resolves
citations + emits a receipt; no writes), and **writes a receipt file** (git-reversible). The
retrieval oracle inside prism is the read-only external dependency already documented in prism's
`design/03-compensators.md`. No compensator table is required.

## v1 scope vs deferred (v2)

**v1:** deterministic template extraction; shell prism + parse structured verdict; three-tier
gate; chained content-hash receipt with drift detection; `roleos verify-citations` CLI; Critic
Reviewer checklist clause; prism verdict exit codes; tests against a mocked prism.

**v2:** LLM extraction fallback for off-template bullets (two-stage); bounded auto-revise loop on
the soft groundedness tier; **cryptographic verification of prism's inner HMAC** (needs a shared
key) + a separately-keyed outer HMAC receipt + VCR-style request/response cassette for full offline
replay; a formal `citationGate` stage in the mission state machine.
