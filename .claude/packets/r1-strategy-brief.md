## Problem Framing
Role-OS has 20 artifact contracts and 7 pack handoff contracts, but no CLI surface to inspect or validate them. Operators cannot check what a role should produce or verify handoff completeness without reading source code.

## Scope
- `roleos artifacts show <role>` — display artifact contract (type, sections, evidence, consumers, completion rule)
- `roleos artifacts validate <role> <file>` — validate a file against the contract
- `roleos artifacts chain <pack>` — show pack handoff flow with artifact types
- Bare `roleos artifacts` lists all roles with contracts

## Non-Goals
- Not generating artifacts (that's execution)
- Not modifying contracts at runtime
- Not adding --json output (can be added later)

## Tradeoffs
- Could integrate into `roleos packs show` instead of a separate command, but artifact inspection is broader than packs — it applies to free-routing too
- Could validate semantically (not just structurally), but that would require LLM calls — keeping it structural-only for v1
