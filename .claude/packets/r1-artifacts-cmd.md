# Task Packet

## Task ID
2026-03-25-artifacts-cmd

## Title
Add a `roleos artifacts` CLI command that shows artifact contracts, validates handoffs, and checks pack chain completeness

## Requested Outcome
A new CLI command with subcommands:
- `roleos artifacts show <role>` — show the artifact contract for a role
- `roleos artifacts validate <role> <file>` — validate a file against a role's artifact contract
- `roleos artifacts chain <pack>` — show the handoff contract for a pack

## Packet Type
feature

## Scope
- Wire artifacts.mjs into a CLI surface
- 3 subcommands: show, validate, chain
- Structured error output matching existing CLI patterns
- Tests for all paths

## Non-Goals
- Not building artifact generation (that's execution, not inspection)
- Not changing existing artifact contracts

## Deliverable Type
Code
