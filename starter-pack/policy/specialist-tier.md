# Specialist Tier — policy

This file is law, not description. It governs when Role OS routes a dispatch to a **specialist**
(a locally-served, trained low-rank adapter on a non-Claude base model) instead of to Claude. The
tier ships with reject conditions — a specialist that cannot be told "no" is not done
(role-os-lockdown-doctrine, §5).

v0.1 ships the FRAMEWORK only. No specialist is trained or deployed; the control plane is proven
end-to-end with a stub backend. Real specialists arrive through their own training kickoffs.

## Glossary (office language — no RPG terms)

| Term | Meaning |
|------|---------|
| role | a job a specialist can be trained for (existing Role OS concept) |
| specialist | a trained, versioned adapter deployed for a role |
| certification level | a training round that passed the eval gate (e.g. "Verifier, certified L2") |
| certification exam | the frozen labeled eval set |
| field audit | the rolling production-slice eval |
| dispatch criteria | the rule for when to use a specialist |
| cross-training | a specialist trained for two roles, dispatched in sequence (never fused weights) |
| version rollback | revert to a previous certified specialist version |
| workload quota | the maximum share of dispatches one specialist may take in a window |
| gate | the separate dispatcher that decides specialist-vs-Claude per dispatch |

The earlier RPG framing (class / character / XP / level / multiclass / party / respec) is dropped.
Use these office terms in code, policy, docs, and comments.

## Standards compliance (required — workflow-standards.md)

| # | Standard | Score | Evidence |
|---|----------|-------|----------|
| 1 | PIN_PER_STEP | 2 | A specialist dispatch pins `adapter_id`, `base_model`, `gate_threshold`, and `exam_hash` in the registry entry and the dispatch log; replayable. The v0.1 gate is deterministic + embedding-similarity (no model pin needed yet). Remediation to 3: when the gate becomes a trained classifier, pin `gate_model_id` + `gate_version` as well. Owner: tier maintainer. Target: later kickoff that introduces the trained gate. |
| 2 | ANDON_AUTHORITY | 3 | The gate fails open to Claude on any uncertainty (low OvA score ∨ OOD ∨ quota-exhausted ∨ backend unreachable). Shadow-probe disagreement above τ halts specialist dispatch for the affected role and emits an andon event consumed by `roleos specialist status`. The reject conditions are enforced in `src/specialist/gate.mjs`, not described in prose. |
| 3 | NAMED_COMPENSATORS | 3 | `roleos specialist rollback <role> <version>` is the named compensator — a pure pointer swap in the registry to a prior certified adapter, no retrain. Owner: tier maintainer. See the Compensators table below. v0.1 performs no irreversible external action — no publish, no release, no tag. |
| 4 | DECOMPOSE_BY_SECRETS | 3 | Four boundaries, each hiding one secret family (Parnas CACM 1972): `gate` hides routing math; `client` hides the vLLM HTTP wire format; `registry` hides the on-disk schema; `policy` hides the dispatch law. Changing one does not ripple. |
| 5 | UNCERTAINTY_GATED_HUMANS | 2 | Shadow-probe disagreement above τ writes a director checkpoint with a contrastive message ("the specialist said X; Claude said Y; I halted this role because the rolling window disagreement is Z > τ"). Held at 2 — v0.1 logs the checkpoint, it is not yet interactive. Remediation to 3: wire the checkpoint to the director-review channel. Owner: tier maintainer. Target: v0.2. |
| 6 | EXTERNAL_VERIFIER | 3 | The specialist base model is cross-family (Qwen3 / Gemma) by construction; satisfies #6 natively (Panickssery NeurIPS 2024, arXiv:2404.13076). When a specialist's verdict is consumed by a verifier (e.g. the Verifier specialist plugs into prism's L4 lens), prism's own family-different + submodularity + strip guards still wrap the call — the specialist does not get to bypass them. |

## Compensators (no skip)

v0.1 performs **no** irreversible external action: no `npm publish`, no `gh release create`, no
`git push <tag>`, no `gh repo edit`, no GitHub Pages deploy, no posted PR, no sent email, no
charged card, no external DB write. The only irreversible-ish action in this kickoff is a `git
commit`, undone by `git revert` or branch deletion.

The tier's in-product irreversible-ish actions and their compensators:

| Action | What it does | Compensator | Owner | Post-rollback state |
|--------|--------------|-------------|-------|---------------------|
| Promote a specialist to active for a role | Sets the registry's `active_version` pointer for the role | `roleos specialist rollback <role> <version>` — pointer swap to a prior certified version; no retrain, no adapter delete | tier maintainer | The role routes to the rolled-back specialist version on the next dispatch. The previously-active version remains in the registry's history and is itself rollback-targetable. |
| Workload-quota halt | Stops further specialist dispatches for a role this window | (no compensator needed — halt is a local in-memory cap that resets at the next window boundary) | tier maintainer | Next window opens with a fresh quota; no state needs unwinding. |
| Shadow-probe-disagreement halt (andon) | Stops further specialist dispatches for a role until cleared | `roleos specialist clear-halt <role> [--reason …]` — clears the halt, logs the operator + reason to the receipt | tier maintainer | The role resumes specialist dispatch on the next call. The halt event remains in the shadow-probe log. |

A specialist that cannot be rolled back is not certified. A role whose halt cannot be cleared is
not operable. Both compensators are pure pointer-state changes — no irreversible side effects.

## What a specialist is

A specialist is:

- A **low-rank adapter** (rank 8–16, α = 2r, q/v/o projections — see specialist-tier-architecture
  Lock 1) trained for one role.
- **Versioned** in the role-os specialist registry (`.role-os/specialists.json` by default).
- **Served** over HTTP by a vLLM multi-LoRA backend (or any HTTP service implementing the
  contract in [Specialist HTTP contract](#specialist-http-contract)). The protocol is
  language-agnostic; v0.1's stub backend is a local Node handler returning canned verdicts.
- **Base model cross-family from Claude** — Qwen3 / Gemma in v1 (Lock 5). A Claude-family base
  model is rejected at registry load time.
- **Subordinate to the consumer's own checks.** When the Verifier specialist plugs into
  prism's L4 lens, prism's family-different routing, reasoning strip, and submodularity guards
  still apply. The specialist tier does not grant any consumer permission to skip those.

A specialist is **not**:

- A general-purpose model. Specialists are narrow by design (Snell 2024, arXiv:2411.16035 —
  narrow fine-tunes phase-transition; capacity beyond the role is wasted).
- A judge of its own confidence. The dispatch decision belongs to a **separate gate** (Verma &
  Nalisnick ICML 2022, arXiv:2202.03673; Leng 2024, arXiv:2410.09724 — RLHF inflates verbalized
  confidence).
- A fused-multiclass blob. Two roles trained together stay as two specialists dispatched in
  sequence (Chen et al. 2025, arXiv:2506.13479; Zhang & Zhou 2025, arXiv:2505.22934). Multiclass
  is a v2 research bet behind an A/B gate.

## Dispatch criteria

For every dispatch where a role has an active certified specialist:

1. **OvA score**. The gate computes `P(specialist is right)` as a One-vs-All score, per
   specialist (Verma & Nalisnick ICML 2022). A joint softmax across roles is rejected — it
   couples specialists that are independently trained.
2. **OOD check**. The gate computes a deterministic out-of-distribution signal against the
   specialist's `exam_hash`-pinned input distribution. Any input outside the band is OOD.
3. **Workload quota**. The gate tracks the share of dispatches the specialist has taken in the
   current window. A specialist at or above its quota is treated as quota-exhausted.
4. **Route decision**:
   - `score > gate_threshold ∧ ¬OOD ∧ ¬quota-exhausted` → route to the specialist.
   - Any other case → route to Claude (the role's existing fallback).
5. **Shadow probe**. Every Kth specialist dispatch additionally runs the Claude path. The two
   results are compared and logged. Rolling-window disagreement above τ halts specialist
   dispatch for the role and emits an andon event.

The gate **fails open to Claude**. Any uncertainty, any backend failure, any malformed response,
any OOD input is a fail-open. A mis-routed specialist must never silently corrupt downstream
work.

## Reject conditions (the system must say no)

These are hard gates enforced in code, not guidelines. A new specialist that violates any of
them is rejected at registry load or at dispatch time.

1. **Same-family base.** If `base_model` resolves to a Claude-family identifier the registry
   refuses to load the entry. Workflow-standard #6 is satisfied by construction; same-family is
   a correctness regression, not a routing preference.
2. **Uncertified specialist promoted to active.** A specialist with no `certified_level` cannot
   be set as `active_version`. The registry refuses the promotion.
3. **Workload over quota.** If the rolling-window dispatch share for a specialist exceeds its
   declared `workload_quota`, the gate refuses to route to it until the window rolls. No
   bypass flag.
4. **OvA score under threshold.** If `score < gate_threshold`, the gate refuses to route to
   the specialist. No "low confidence override."
5. **OOD input.** If the gate's OOD check fires, the gate refuses to route. No "trust the
   specialist on OOD" flag.
6. **Backend unreachable.** If the specialist backend returns no parseable response within the
   per-call timeout, the gate refuses to use the result (fail-open to Claude). An unreachable
   gate is a closed gate — same invariant as the citation gate.
7. **Shadow-probe disagreement above τ.** If the rolling-window disagreement between the
   specialist and Claude exceeds τ on the same input distribution, dispatch to the specialist
   is halted for the role until operator clears via `roleos specialist clear-halt`.
8. **Consumer's own guards rejected the result.** If the consumer (e.g. prism on the Verifier
   specialist's L4 verdict) rejects the result via its own checks, the result is not accepted
   regardless of OvA score. The specialist tier does not override consumer-side guards.

## Workload quota

Each registry entry declares a `workload_quota` (a decimal in `(0, 1]`) — the maximum share of
dispatches the specialist may take in a sliding window. v0.1 defaults: window = 200 dispatches,
quota = 0.7. The quota is a hard cap; the gate refuses to route to a quota-exhausted specialist
until the window rolls (Switch Transformer load-balance pressure — Fedus et al. 2022,
arXiv:2101.03961).

The quota exists for two reasons:

- **Anti-collapse.** Without a cap, a slightly-better specialist takes 100% of dispatches and
  the production distribution drifts off the specialist's training distribution. The quota
  forces enough Claude traffic to keep the shadow-probe distribution honest.
- **Operator review.** A specialist at the quota limit is a signal that the role's load
  pattern matched the training distribution well — and that any quality slip will not be hidden
  in the noise of a small specialist sample.

The quota window resets on a sliding basis (not aligned to wall clock) so a burst of dispatches
cannot be timed against a window edge.

## Shadow probe

Every Kth specialist dispatch (default K = 20) additionally runs the Claude path. The two
results are logged with the dispatch id and an agreement bit. Over a rolling window of N probes
(default N = 50), if the agreement rate falls below `1 - τ` (default τ = 0.15), the role is
halted:

- Halt writes a contrastive director checkpoint: "the specialist said X; Claude said Y;
  rolling-window disagreement is Z > τ; specialist dispatch for role R halted; clear with
  `roleos specialist clear-halt R`."
- The halt is sticky — it survives across processes and is cleared only by explicit operator
  action.

Shadow probes do not affect the dispatch's user-visible result — Claude is called *in addition
to* the specialist, not instead. The user sees the specialist's verdict (or the gate's
fail-open verdict from Claude); the probe is a background quality check.

## Certification

A specialist is **certified at level N** only when:

1. **Certification exam** (the frozen labeled eval set) shows non-overlapping confidence
   intervals between this version and the previous certified version, in the direction of
   improvement.
2. **Field audit** (the rolling production-slice eval) agrees with the exam in the same
   direction over a configured window. Exam-vs-audit divergence is the overfitting /
   contamination alarm (DICE, Ye 2024).
3. **Two-seed replication.** The same training recipe with a different seed produces a
   specialist that hits the same level. Narrow fine-tunes show phase-transition behavior — a
   single-seed result is not a level.

Level is **monotone**: a specialist certified at L2 stays at L2 even if a later version fails.
A failed level attempt does not demote a prior version; it just means the new version did not
earn the new level.

The eval harness (certification exam + field audit + replication) is built by the training
kickoffs, not in v0.1. v0.1 specifies the contract.

## Version rollback

`roleos specialist rollback <role> <version>` swaps the registry's `active_version` pointer
for the role to the named prior version. No retrain. No adapter delete. No data migration.
Rollback is a pure pointer change.

The previously-active version stays in the registry's `versions` list — it is itself
rollback-targetable. A rollback emits a receipt with the operator, the from-version, the
to-version, and the reason.

A version that cannot be rolled back is not certified. A registry that does not preserve prior
versions is broken.

## Specialist HTTP contract

A specialist backend implements one endpoint:

```
POST <backend_url>/verify
Content-Type: application/json

Request:
{
  "adapter_id": "<string — the trained adapter pin>",
  "role":       "<string — the role name, for logging>",
  "input":      <object — role-specific schema, opaque to the gate>,
  "trace_id":   "<string — propagated for receipts>"
}

Response (200):
{
  "verdict":    <object — role-specific verdict, opaque to the gate>,
  "score":      <number in [0, 1] — the specialist's self-reported score, INFORMATIONAL>,
  "adapter_id": "<string — echo of the adapter pin>",
  "base_model": "<string — echo of the base model, for receipts>",
  "duration_ms": <number>
}
```

Notes:

- The specialist's self-reported `score` is **informational** — it does not enter the routing
  decision (the gate has its own OvA score). It is logged to the receipt for drift analysis.
- The `adapter_id` echo lets the gate verify the backend served the pinned adapter, not a
  different one with the same role.
- Non-200, non-JSON, or timeout = the gate fails open to Claude.
- The contract is language-agnostic. The v0.1 stub backend is a local Node handler returning
  canned verdicts; the v1 backend is vLLM multi-LoRA (S-LoRA, Sheng 2024) via gpu-container.

## What v0.1 is and is not

**v0.1 ships:**

- This policy file (the law).
- The role schema extension (the `specialist:` block).
- The registry (load + validate `.role-os/specialists.json`).
- The gate (OvA + OOD + quota + threshold + fail-open).
- The HTTP client (POST to `backend_url`, injectable for tests).
- The shadow-probe scheduler + halt.
- The `roleos specialist` CLI surface (status / list / rollback / clear-halt).
- Unit tests for each reject condition + one end-to-end test against an in-process stub backend.

**v0.1 does not ship:**

- Any trained adapter. The Verifier specialist (`KICKOFF-specialist-verifier-dataset.md`) and
  the Token Budget Analyst (`KICKOFF-specialist-token-budget-dataset.md`) build the corpora;
  training happens in `KICKOFF-specialist-training.md`.
- A trained gate classifier. The v0.1 gate is deterministic + embedding-similarity; a trained
  gate is an additive upgrade behind PIN_PER_STEP.
- Real vLLM serving. v0.1 talks to a stub backend over HTTP; the real vLLM backend lives in
  gpu-container.
- Ollama integration. Ollama cannot per-request hot-swap adapters (issue #9548); ollama-intern
  wiring is a later, separate concern (Lock 2 of specialist-tier-architecture).
- Fused multiclass. Sequential dispatch only (Lock 4).
- An interactive director checkpoint. v0.1 logs the contrastive message; v0.2 wires it to the
  review channel.

## References

- specialist-tier-architecture.md — the locked decisions this policy enforces.
- role-os-lockdown-doctrine.md — why this tier ships with reject conditions, not scaffolding.
- workflow-standards.md — the six standards every workflow must score.
- prism-verify design/01-research-grounding.md — Locks 1–4 the Verifier consumer enforces.
- Panickssery, Bowman & Feng — *LLM Evaluators Recognize and Favor Their Own Generations*,
  NeurIPS 2024, https://arxiv.org/abs/2404.13076 (cross-family base, #6).
- Verma & Nalisnick — *Calibration of Selective Classifiers via One-vs-All Scores*, ICML 2022,
  https://arxiv.org/abs/2202.03673 (OvA gate, no joint softmax).
- Leng et al. — *Taming Overconfidence in LLMs*, 2024, https://arxiv.org/abs/2410.09724
  (separate gate, no self-report).
- Fedus, Zoph & Shazeer — *Switch Transformers*, 2022, https://arxiv.org/abs/2101.03961
  (load-balance pressure → workload quota).
- Chen et al. 2025, https://arxiv.org/abs/2506.13479 — weight merging fails for adjacent
  narrow specialists (sequential dispatch, not fused multiclass).
- Snell et al. 2024, https://arxiv.org/abs/2411.16035 — narrow fine-tunes phase-transition
  (two-seed replication required for a certification level).
- Buçinca et al. — *Contrastive Explanations*, CHI 2025, https://arxiv.org/abs/2410.04253
  (the shadow-probe halt's contrastive message).
