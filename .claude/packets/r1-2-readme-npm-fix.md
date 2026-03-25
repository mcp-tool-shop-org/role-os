# Task Packet

## Task ID
2026-03-25-readme-npm-fix

## Title
Fix npm showing README.zh.md as primary README instead of README.md

## Requested Outcome
When publishing to npm, the Chinese translation README.zh.md is being picked up as the primary readme, causing npmjs.com to display Chinese content on the package page. Fix the publish process so README.md is always the primary.

## Packet Type
feature

## Scope
- Diagnose why npm picks README.zh.md
- Fix the root cause (likely file ordering in `files` array or alphabetical sort)
- Verify fix with `npm pack --dry-run`
- Add a regression check

## Inputs
- package.json (files array)
- Trial findings: Metadata Curator + Deployment Verifier both flagged this
