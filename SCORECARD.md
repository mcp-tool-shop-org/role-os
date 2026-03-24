# Scorecard

> Score a repo before remediation. Fill this out first, then use SHIP_GATE.md to fix.

**Repo:** mcp-tool-shop-org/role-os
**Date:** 2026-03-24
**Type tags:** `[all]` `[npm]` `[cli]`

## Post-Remediation

| Category | Score | Notes |
|----------|-------|-------|
| A. Security | 10/10 | SECURITY.md, threat model, no secrets, no telemetry, safe file ops |
| B. Error Handling | 10/10 | Structured JSON errors, exit codes 0/1/2, --debug for stacks |
| C. Operator Docs | 10/10 | README current, CHANGELOG, LICENSE, --help accurate |
| D. Shipping Hygiene | 10/10 | verify script, clean npm pack, engines.node, lockfile |
| E. Identity (soft) | 7/10 | Logo present, GitHub metadata set. Translations and landing page pending |
| **Overall** | **47/50** | Hard gates A-D: all pass. Soft gate E: 2 items remaining |

## Remaining Soft Gate Items

1. Translations (polyglot-mcp, 8 languages)
2. Landing page (@mcptoolshop/site-theme)
