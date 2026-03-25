---
title: Team Packs
description: Pre-assembled role chains for common work types. Pick a pack, fill a packet, and route it in one command.
sidebar:
  order: 3
---

Team Packs are curated subsets of the Role Spine. Instead of selecting individual roles, you pick a named pack that already contains the right roles in the right order for a given class of work. The router validates the pack against your packet and builds the execution chain.

```bash
roleos route --pack <name> <packet-file>
```

The `--pack` flag constrains routing to the roles inside that pack. Conflict detection still runs. Roles outside the pack are not eligible unless escalation explicitly requires them.

## When to use a pack vs. individual routing

Use a pack when the work is well-scoped and the domain is clear. Use individual routing when the work cuts across domains or you need a custom chain. Packs save routing overhead on repeated work types — they do not relax any quality gates.

## Available packs

### 1. Docs Architect

Designs and structures documentation. Use for new doc sites, handbook sections, content reorganization, or information architecture decisions.

| | |
|---|---|
| **Roles** | Orchestrator, Product Strategist, Critic Reviewer |
| **Artifacts** | Page outline, section hierarchy, frontmatter spec, sidebar order, cross-link map |
| **Stop conditions** | Structure approved by Critic; all sections have owners and stated purpose |

```bash
roleos route --pack docs-architect .claude/packets/my-docs-task.md
```

---

### 2. Metadata Curator

Audits and corrects structured metadata. Use for frontmatter hygiene, schema validation, sidebar ordering, title/description consistency, and search-index correctness.

| | |
|---|---|
| **Roles** | Orchestrator, Test Engineer, Critic Reviewer |
| **Artifacts** | Metadata audit report, corrected frontmatter, flagged violations with line references |
| **Stop conditions** | All required fields present and schema-valid; no duplicated sidebar orders; Critic accepts |

```bash
roleos route --pack metadata-curator .claude/packets/my-metadata-task.md
```

---

### 3. Release Engineer

Prepares a release: version bump, changelog entry, tag, and publish gate. Use when shipping a new version of any Role OS component.

| | |
|---|---|
| **Roles** | Orchestrator, Backend Engineer, Test Engineer, Critic Reviewer |
| **Artifacts** | Bumped version in `package.json`, changelog entry, git tag, publish checklist |
| **Stop conditions** | Version consistent across all manifests; changelog entry written; CI passes; Critic accepts |

```bash
roleos route --pack release-engineer .claude/packets/my-release-task.md
```

---

### 4. Deployment Verifier

Verifies a build or deployment is correct and healthy. Use after publishing a site, shipping a CLI version, or deploying a service.

| | |
|---|---|
| **Roles** | Orchestrator, Test Engineer, Critic Reviewer |
| **Artifacts** | Build verification report, broken-link list, render check results, search-index status |
| **Stop conditions** | Build exits 0; no broken internal links; critical pages render; Critic accepts |

```bash
roleos route --pack deployment-verifier .claude/packets/my-deploy-task.md
```

---

### 5. Critic Reviewer

A single-role review gate. Use to run an isolated review pass over any prior output without re-executing the full upstream chain.

| | |
|---|---|
| **Roles** | Critic Reviewer |
| **Artifacts** | Structured verdict (accept / accept-with-notes / reject / blocked), evidence list, required corrections, next owner |
| **Stop conditions** | Verdict recorded with full contract-check fields; next owner named |

```bash
roleos route --pack critic-reviewer .claude/packets/my-review-task.md
```

---

## Pack reference

| Pack | Roles | Primary use |
|------|-------|-------------|
| `docs-architect` | Orchestrator, Product Strategist, Critic | Structure and hierarchy decisions |
| `metadata-curator` | Orchestrator, Test Engineer, Critic | Frontmatter and schema hygiene |
| `release-engineer` | Orchestrator, Backend, Test, Critic | Version bumps and publish gates |
| `deployment-verifier` | Orchestrator, Test Engineer, Critic | Post-deploy health checks |
| `critic-reviewer` | Critic | Isolated review of any prior output |

## Combining packs

Packs are not mutually exclusive. A docs change often runs `docs-architect` first, then `metadata-curator`, then `deployment-verifier`. The output of each pack is the input packet for the next. Use `roleos review` to record the verdict between packs before continuing.

## Adding custom packs

Custom packs are not yet supported by the CLI. Define the role chain manually in your packet's `constraints` field and route without the `--pack` flag. Pack definitions are planned for a future minor release.

## Related

- [Role Spine](/role-os/handbook/role-spine/) — the full 8-role catalog that packs draw from
- [Getting Started](/role-os/handbook/getting-started/) — `roleos route` without `--pack`
- [Reference](/role-os/handbook/reference/) — full CLI command reference
