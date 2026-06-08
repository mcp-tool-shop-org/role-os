# Live conformance catalog — mint receipt (wedge #1 internal-first rollout)

**What:** `.claude/role-os/tool-contracts.json` — the live, real-tool conformance catalog that
`src/hooks.mjs#conformanceAdvisory` reads at runtime. Keyed by REAL tool names (Claude Code built-ins +
ollama-intern MCP tools), so the deterministic floor now runs on the studio's OWN dispatches and emits an
ADVISORY verdict on a provably-nonconformant call. Authored 2026-06-07.

**Why this is the moat (per `oversight-specialist-mint-strategy.md`):** not the weights, not the recipe —
the **leakage-audited, guard-certified PROCESS with held-out receipts**. This file is one such receipt.

## Coverage (15 real tools)

- **11 Claude Code built-ins:** Read, Edit, Write, Bash, PowerShell, Grep, Glob, AskUserQuestion, ToolSearch, Skill, Agent
- **4 ollama-intern MCP tools:** ollama_chat, ollama_classify, ollama_corpus_search, ollama_summarize_fast
- All 15 are catalogued (so the SCHEMA floor — L1 type / L2 required / L3 enum/max — runs live on every one).
- **10 tools carry computable CONTRACT constraints (25 total):** numeric bounds (Read limit>0/offset≥0,
  Bash/PowerShell timeout, Grep 6× context counts, classify/corpus_search/summarize numeric ranges),
  cardinality (AskUserQuestion questions 1–4, ollama_chat messages≥1), a-≠-b (Edit old≠new), and a
  mutual-exclusion exactly-one-of (classify text|source_path|items).

## The mint process (reproducible, decorrelated)

1. **Ground truth** — `tools.json`: REAL tool param schemas transcribed from the actual tool definitions
   (params are FACTS; they drive the schema floor). Authored by the advisor, faithful to built reality.
2. **Blind authoring** — workflow `wf_721b6bef-1b9` (30 agents): one fan blind-authored DSL constraints
   from the contract prose + params; a SECOND, independent fan blind-authored example calls (conformant
   incl. boundary-valid edge cases + known violations) WITHOUT seeing the constraints. → `raw.json`, `corpus.json`.
   - Build-author added 6 numeric-range constraints (corpus_search top_k/preview_chars, summarize max_words)
     the agents omitted because the ground-truth params lacked a `max` and the schema floor has no min
     support — mechanical transcriptions of the real MCP schema min/max, validated downstream like any other.
3. **Deterministic guard** — `build_live_contracts.mjs` runs the REAL `schemaFloor`/`contractFloor` (the same
   code that runs live): drops any constraint that flags a schema-valid conformant call; the corpus pattern
   from `build_tool_constraints.mjs`. **Result: 25 kept, 0 dropped.**
4. **Independent adversarial refutation (EXTERNAL_VERIFIER)** — workflow `wf_85b15fb0-93e` (10 skeptics, a
   different agent set than the authors, generator reasoning hidden): each tried to construct a CONFORMANT
   call the floor would wrongly flag, with explicit attention to the `present` exactly-one-of and cmp
   boundary-inclusivity. **Result: all 10 `sound: true`, 0 valid refutations.**
5. **CI guard** — `test/live-tool-contracts.test.mjs`: known DSL kinds, non-empty, and the SAFETY INVARIANT
   (0 false-positives on every conformant fixture). Committed + CI-enforced so no mis-authored constraint
   can land.

## Results

- **Safety invariant: 0 false-positives** across **84 conformant fixtures** (build gate + CI test + 10 skeptics).
- **Coverage: 71/78 (91%)** of known violations caught deterministically by schema+contract floors.
- **7 uncaught gaps are all correct:** relative-path (open-set string, not computable → LLM ceiling);
  invented-param on Write/Glob/Skill (the schema floor INTENTIONALLY tolerates unknown args for
  forward-compat); ToolSearch max_results (the real schema enforces no min/integer bound — not a real contract).
- **Full role-os suite: 1381/1381 pass** (`npm run verify` green; node 18 path will match in CI).

## Reproduce

```
cd tools/conformance-dataset/live-tools
node prep_inputs.mjs <wf_721b6bef-1b9 output.json>   # -> raw.json + corpus.json (+ the 6 range adds)
node build_live_contracts.mjs                        # -> ../../../.claude/role-os/tool-contracts.json, FP gate
cd ../../.. && node --test test/live-tool-contracts.test.mjs
```

## Standards compliance (the six — per `.claude/rules/workflow-standards.md`)

- **PIN_PER_STEP — 3.** Each agent step pins model (inherited session model) + a fixed prompt + a
  StructuredOutput schema; workflow scripts are persisted (`wf_721b6bef-1b9`, `wf_85b15fb0-93e`) and
  resumable; the deterministic build is pure over committed inputs (`tools.json`/`raw.json`/`corpus.json`).
- **ANDON_AUTHORITY — 3.** The build's FP gate `process.exit(1)` halts on any conformant false-positive;
  the CI test fails the suite on the same invariant. A defect cannot propagate to a shipped catalog.
- **NAMED_COMPENSATORS — 2 (skip: no irreversible tool call performed here).** This run writes only
  working-tree files; nothing published, pushed, or tagged. Compensator for the live catalog: `git checkout
  -- .claude/role-os/tool-contracts.json` (or delete the file → loadToolContracts returns {} → dormant). The
  seam is advisory + fail-open, so even a live catalog cannot block a call. The actual irreversible steps
  (commit/push, hook install) are explicitly Mike-gated and out of this artifact's scope.
- **DECOMPOSE_BY_SECRETS — 3.** Params (facts that change with the tool's API) are separated from constraints
  (the contract encoding) which are separated from example calls (the guard fixtures) — each in its own file,
  authored by independent agents; a tool's API change touches only `tools.json`.
- **UNCERTAINTY_GATED_HUMANS — 3.** Human (Mike) gates exactly the uncertain/irreversible decisions
  (commit, hook install, go-live, second repo), framed contrastively in the handoff; the mechanical,
  certain steps ran autonomously. The build LOGS every drop + mislabeled example + coverage gap for review.
- **EXTERNAL_VERIFIER — 3.** The refutation pass (`wf_85b15fb0-93e`) is a different agent set than the
  authors, sees only the constraints (author reasoning hidden), and is tasked to refute — and the FINAL
  arbiter is the deterministic floor (a non-model checker), not any model's self-assessment.

## Mike-gated next steps (NOT done here)

1. Review + **commit** the catalog, fixtures, builder, and CI test.
2. **Install the generated hooks** (`scaffoldHooks` + `generateHooksConfig` → `.claude/hooks/` + settings.json
   PreToolUse) in role-os so the advisory actually FIRES on this repo's traffic. (Changes live session behavior.)
3. Optionally replicate the catalog into a **second repo** (gpu-container) — the built-in surface is identical.
4. Fast-follow: extend to more ollama-intern MCP tools + repo-specific servers via the same pipeline.
