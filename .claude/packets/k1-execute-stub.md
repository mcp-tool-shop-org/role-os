# Task Packet

## Task ID
2026-03-25-execute-stub

## Title
Add a `roleos execute` command that reads a dispatch manifest and prints the execution plan

## Requested Outcome
A new CLI command that takes a dispatch manifest JSON file and shows what would happen: which roles run in what order, what tools each gets, what budgets are set.

## Packet Type
feature

## Scope
- Read dispatch manifest from file
- Print execution plan (roles, tools, budgets, dependencies)
- No actual execution — display only for v1
- Error on invalid manifest

## Non-Goals
- Actually running workers via multi-claude SDK
- Live execution state tracking
- Budget enforcement

## Inputs
- src/dispatch.mjs (manifest builder)
- src/packs.mjs (pack definitions)

## Deliverable Type
Code
