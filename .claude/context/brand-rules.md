# Brand Rules — role-os

## Tone

Operational. Precise. No ceremony. Role OS tells you what role to assign, what chain to use, and whether the work passed review. It does not motivate, celebrate, or soften rejection.

## Domain language

| Term | Meaning | Never say instead |
|------|---------|-------------------|
| role | A specialized contract with mission, boundaries, and escalation triggers | "agent", "worker", "assistant" |
| packet | A scoped unit of work with type, chain, inputs, and done definition | "task", "ticket", "issue" |
| chain | An ordered sequence of roles for a packet | "pipeline", "workflow" (workflow means something else here) |
| verdict | The Critic's binding judgment: accept, accept-with-notes, reject, blocked | "feedback", "review", "opinion" |
| handoff | Structured output from one role to the next | "transition", "pass-off" |
| spine | The set of scaffolded files (agents, schemas, policies, workflows) | "skeleton", "boilerplate", "template" |
| starter-pack | The canonical set of files copied by `roleos init` | "template", "scaffold" |
| context files | The 4 repo-specific truth files (product-brief, repo-map, brand-rules, current-priorities) | "config files", "settings" |
| contamination | Cross-project residue (imagery, terminology, UI motifs from a different product) | "influence", "inspiration" |
| drift | When work silently departs from packet scope or product law | "evolution", "iteration" |
| false completion | Claiming done when gaps, hidden assumptions, or untested paths remain | "partial completion" |

## Forbidden metaphors

- No "AI team" language. Roles are contracts, not personalities. Do not personify them.
- No "autonomous" language. Role OS routes work — it does not decide what to build.
- No "intelligent" language. Keyword scoring is substring matching, not AI. Don't oversell it.
- No "flexible framework" language. The starter-pack is the standard. Customization is context files, not framework extension.
- No "best practices." Role OS defines required practices via contracts.

## Truth constraints

1. **Role count must be exact.** README says 32 roles across 8 packs. Starter-pack must have exactly 32 agent files. If the count changes, README, routing-rules, tool-permissions, and handbook must all update.
2. **Route limitations must be documented.** `roleos route` keyword-scores 6 roles. It does not know about 26 others. This must be stated wherever routing is described.
3. **Verdict enum is closed.** 4 verdicts only. No "soft reject", no "conditional accept", no "defer."
4. **Packet types are closed.** 3 types only. No "maintenance", no "hotfix", no custom types.
5. **Init does not update.** Re-running init skips existing files. This must be documented — users expect updates to flow through.

## Enforcement language bans

1. **No "smart routing."** Route uses substring keyword matching. It is not smart. It is deterministic and limited.
2. **No "automatically handles."** Role OS scaffolds and routes. It does not handle anything automatically.
3. **No "comprehensive coverage."** Route covers 6 of 32 roles. Policy files cover all 32. Be specific about which surface does what.
4. **No advisory verdicts.** A reject is a reject. Do not soften it with "consider revising" or "might want to look at."
5. **No implied orchestrator intelligence.** The orchestrator contract says what the orchestrator does. It does not "figure out" anything.

## Contamination risks

- **Memory duplication drift.** Role OS must never re-implement what Claude project memory does. The moment Role OS starts storing repo facts, decisions, or treatment history, it has become a parallel memory system.
- **Role personality drift.** Roles are contracts. The moment a role file starts describing personality, communication style, or emotional state, it has drifted from operational precision.
- **Framework extensibility drift.** The moment Role OS adds plugin hooks, custom role registration, or config files, it has become a framework instead of a standard.

## Interaction law

- CLI output is structured: headers, lists, warnings. No progress bars, no emoji, no color for decoration.
- Error output uses structured shape: `{code, message, hint, retryable}`.
- Exit codes: 1=user error, 2=runtime error.
- `--debug` shows stack traces. Default hides them.
- `--json` outputs JSON. Default outputs human-readable text.
- `--write` outputs markdown to file. Default outputs to terminal.
