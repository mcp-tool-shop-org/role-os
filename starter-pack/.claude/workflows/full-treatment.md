# Full Treatment

Role OS does not own or redefine the full treatment protocol. The canonical protocol lives in Claude project memory (`memory/full-treatment.md`) and is a 7-phase polish + publish playbook.

## Canonical source

The full treatment is defined in Claude project memory as a 7-phase protocol:

1. Pre-flight + finalize README + hand off translations
2. Scaffold landing page (Astro site-theme)
3. Handbook (Starlight docs)
4. Repo metadata + coverage
5. Repo Knowledge DB entry
6. Commit and deploy
7. Post-deploy verification

Read `memory/full-treatment.md` and `memory/handbook-playbook.md` before starting.

## Gate: Shipcheck runs first

Full treatment does not start until shipcheck passes. Shipcheck is the 31-item quality gate (hard gates A-D block release). The canonical shipcheck reference lives in Claude project memory (`memory/shipcheck.md`).

Order: `npx @mcptoolshop/shipcheck audit` → exits 0 → then full treatment.

No v1.0.0 bump without passing hard gates A-D.

## Role chain per phase

Each treatment phase maps to specific roles:

### Phase 1 — Pre-flight + README + translations
- **Repo Researcher** — verify repo state, Pages config, package.json
- **Brand Guardian** — verify logo, README identity, footer
- **Repo Translator** — hand off and verify translations

### Phase 2 — Scaffold landing page
- **Docs Architect** — site-theme init, site-config.ts
- **Frontend Developer** — landing page content and build
- **Brand Guardian** — verify brand alignment

### Phase 3 — Handbook (Starlight docs)
- **Docs Architect** — Starlight setup, page structure, content
- **Repo Translator** — docs translation if applicable

### Phase 4 — Repo metadata + coverage
- **Metadata Curator** — GitHub metadata, badges, manifest
- **Coverage Auditor** — test coverage assessment, CI integration

### Phase 5 — Repo Knowledge DB entry
- **Repo Researcher** — thesis, architecture, relationships
- **Metadata Curator** — verify entry completeness

### Phase 6 — Commit and deploy
- **Release Engineer** — staging, version, tag, push

### Phase 7 — Post-deploy verification
- **Deployment Verifier** — landing page, handbook, package, badges, translations

### Final gate
- **Critic Reviewer** — accept or reject treatment completeness

## What Role OS adds

- Explicit role ownership for each treatment phase
- Structured handoffs between phases
- Review gate on treatment completeness
- Routing and escalation law

## What Role OS does not own

- The treatment protocol itself
- The shipcheck gate
- Claude project memory
- Treatment history and repo facts (those live in Claude project memory)
