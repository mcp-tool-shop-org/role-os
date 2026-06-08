---
title: Tool-call oversight
description: Deterministic conformance + capability-gating at the PreToolUse seam — an advisory floor and a fail-closed least-privilege gate.
sidebar:
  order: 3.6
---

Role OS verifies and gates tool calls at the Claude Code `PreToolUse` seam. Two deterministic layers
run there, with **no model on the hot path** — one advisory, one fail-closed.

## Conformance watcher (advisory, fail-open)

A deterministic floor checks a proposed tool call against its catalogued **tool-contract** and attaches
an advisory verdict when it can *prove* a nonconformance — it never blocks a call.

- **Schema floor (L1–L3)** — type, required, enum/range, mechanically.
- **Computable-contract floor (L4)** — cross-field relations it can compute (sum-to-cap, additive
  bounds, length / cardinality, set-membership-given-state, mutual-exclusion).
- A proven nonconformant call emits an advisory note via `hookSpecificOutput.additionalContext`
  (exit 0). The floor only ever *proves* a violation; an unevaluable constraint defers — it never
  false-flags and never asserts conformant.
- The catalogue lives in `.claude/role-os/tool-contracts.json`, keyed by real tool name.
- An opt-in LLM ceiling (`ROLEOS_CONFORMANCE_CONSULT`, family-different, fail-open to *abstain*)
  handles the genuinely-semantic residue. Default OFF; the hot path is model-free.

This is wedge #1 of the oversight fleet — *advisory*, because a false "conformant" is the costly error,
never a blocked good call.

## Capability gate (fail-closed, opt-in)

Where the conformance floor is advisory, the capability gate is **fail-closed** — for *irreversible*
actions only. It bounds what any tool call can DO, so a wrong step — an honest mistake or an injected
one — can't trigger an unauthorized irreversible action.

Gated actions (the named-compensator set): npm / PyPI publish, `gh release` / `pr create` /
`repo edit`, `git push`, GitHub Pages deploy.

```bash
export ROLEOS_CAPABILITY_GATE=1   # opt-in; default OFF (pure no-op)
```

A gated action is **denied** unless the director granted its capability in
`.claude/role-os/capabilities.json`:

```json
{
  "git:push": { "granted": true },
  "npm:publish": { "granted": true, "scope": "@mcptoolshop/role-os", "expires": "2026-07-01" }
}
```

Deterministic least-privilege (POLA), grounded in CaMeL — no model. It is the **preventive** half of
the named-compensator rule: capability-gating *stops* the unauthorized irreversible call; the
compensator *undoes* one that happened. Same action set, two halves. Default OFF; rollout = the flag
plus a per-repo `capabilities.json`.
