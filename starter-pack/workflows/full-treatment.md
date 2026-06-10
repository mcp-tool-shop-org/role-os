# Full Treatment

Every tool repo gets the full treatment before it's "whole." This is the complete 7-phase protocol — not a pointer to an external file.

> **Adapting this workflow:** this protocol was written for the MCP Tool Shop org. Steps
> marked **[org-internal]** reference that org's private infrastructure (brand repo,
> repo-knowledge database, translation tooling). Substitute your own equivalents or skip
> those steps — the phase structure and role owners are the portable part.

## Gate: Shipcheck runs first

Full treatment does not start until shipcheck passes. Shipcheck is the 31-item quality gate (hard gates A-D block release).

Order: `npx @mcptoolshop/shipcheck audit` → exits 0 → then full treatment.

No v1.0.0 bump without passing hard gates A-D.

## Phase 1 — Pre-flight + finalize README + hand off translations

a) Clone repo, verify Pages source is "GitHub Actions", enable if not. Check for existing site/ and pages.yml.
b) Note whether root package.json has "private": true (controls npm badge/link decisions).
c) **[org-internal]** Push logo to your brand repo (e.g. `<org>/brand/logos/<slug>/readme.png`), regenerate the manifest, commit+push. Min 530x530px.
d) Update README: brand logo raw URL (e.g. `https://raw.githubusercontent.com/<org>/brand/main/logos/<slug>/readme.png`), width="400", centered.
e) Badges (after logo, centered): CI status, Codecov coverage, MIT license, Landing Page. Only if published: npm/PyPI version badges.
f) If logo contains product name, remove redundant `<h1>`.
g) Update footer: `Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>`
h) README is now final — run the translation step.

Translation step **[org-internal]**: translations run on a local model (e.g. TranslateGemma
via Ollama — zero API cost, ~2-4 min/README) using your translation tooling:
```
node <path-to-translation-tooling>/translate-all.mjs <path-to-repo>/README.md
```
Monorepos: chain with semicolons. Large monorepos: batch into groups of 5-7.

Translations must land BEFORE `npm publish` and BEFORE the GitHub release is tagged —
release tags are immutable, and a tag cut before translations leaves stale locale READMEs
on that tag forever. If you have no translation tooling, skip this step.

### Role owners
- **Repo Researcher** — verify repo state, Pages config, package.json
- **Brand Guardian** — verify logo, README identity, footer
- **Repo Translator** — hand off and verify translations

## Phase 2 — Scaffold landing page (while translations run)

a) `npx @mcptoolshop/site-theme init` from repo root
b) Add to .gitignore: site/.astro/, site/dist/, site/node_modules/, .polyglot-cache.json
c) `cd site && npm install`
d) Verify site/astro.config.mjs base matches `/<repo-name>/` (case-sensitive)
e) Write site/src/site-config.ts (typed as SiteConfig). Description from root package.json.
f) pages.yml does NOT count toward "max 2 workflow files" rule

### Role owners
- **Docs Architect** — site-theme init, site-config.ts
- **Frontend Developer** — landing page content and build
- **Brand Guardian** — verify brand alignment

## Phase 3 — Handbook (Starlight docs)

a) `cd <repo>/site && npm install @astrojs/starlight`
b) Replace astro.config.mjs (social must be array, disable404Route: true)
c) Create content.config.ts in site/src/:
```ts
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
export const collections = { docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }) };
```
d) Create starlight-custom.css (derive accent from global.css):

| Accent | --sl-color-accent-low | --sl-color-accent | --sl-color-accent-high |
|--------|----------------------|-------------------|------------------------|
| emerald (default) | #022c22 | #34d399 | #6ee7b7 |
| amber | #451a03 | #d97706 | #fbbf24 |
| blue | #1e1b4b | #3b82f6 | #93c5fd |
| rose | #4c0519 | #f43f5e | #fb7185 |
| violet | #2e1065 | #8b5cf6 | #a78bfa |
| cyan | #083344 | #06b6d4 | #67e8f9 |
| pink | #500724 | #ec4899 | #f9a8d4 |

Dark background vars: `--sl-color-bg: #09090b`, `--sl-color-hairline: #27272a`, etc.

e) Create handbook pages in site/src/content/docs/handbook/ (min 3: index, getting-started, reference)

| Source | File | Order |
|--------|------|-------|
| Welcome | index.md | 0 |
| Install/Quick Start | getting-started.md | 1 |
| Usage | usage.md | 2 |
| Config/Options | configuration.md | 3 |
| API/Commands | reference.md | 4 |
| Architecture | architecture.md | 5 |
| Security | security.md | 6 |

Minimum 3 pages. Rich repos get 5-7. Expand README content — don't just copy-paste.

f) Update landing page CTA in site-config.ts: `secondaryCta: { href: 'handbook/', label: 'Read the Handbook' }`
g) Build and verify: `cd site && npm run build` — check dist/index.html + dist/handbook/

### Role owners
- **Docs Architect** — Starlight setup, page structure, content
- **Repo Translator** — docs translation if applicable

## Phase 4 — Repo metadata + coverage

a) Set GitHub metadata:
```
gh repo edit <org>/<repo> --description "<from package.json>" --homepage "https://<org>.github.io/<repo-name>/"
gh repo edit <org>/<repo> --add-topic <tags>
```
b) Code coverage: add coverage dep, coverage CI step (one matrix entry), codecov upload, badge in README
c) Verify site builds, .gitignore complete, logo renders at brand URL
d) Review README for typos, broken links, stale content

### Role owners
- **Metadata Curator** — GitHub metadata, badges, manifest
- **Coverage Auditor** — test coverage assessment, CI integration

## Phase 5 — Repo Knowledge DB entry **[org-internal]**

Every treated repo gets a proper entry in the repo-knowledge database. This is NOT optional
inside the org; consumers without a repo-knowledge deployment substitute their own
catalog/inventory system or skip.

a) Sync the repo if not already in the DB:
```
rk sync --owners <org>
```

b) Add required notes using MCP tools or CLI:
- **thesis** — what the repo is and why it exists (1-2 sentences)
- **architecture** — how it's built, key components, data flow
- At least one **relationship** mapped (depends_on, related_to, shares_domain_with, etc.)

c) Add recommended notes where applicable:
- **convention** — important patterns/rules specific to this repo
- **next_step** — what should happen next
- **warning** or **drift_risk** — known issues or things that could break
- **command** — key commands to build/test/deploy

d) Verify the entry:
```
rk show <slug>
```
Confirm: thesis present, architecture present, relationships mapped, tech detected, docs indexed.

### Role owners
- **Repo Researcher** — thesis, architecture, relationships
- **Metadata Curator** — verify entry completeness

## Phase 6 — Commit and deploy

Stage explicitly: `git add site/ .github/workflows/pages.yml .gitignore README.md README.*.md`
WARNING: Use `README.*.md` glob — NEVER hand-type individual filenames.
Never `git add .` — translated READMEs may have CRLF drift on Windows.
Push to main. Verify landing page + handbook render.

### Role owners
- **Release Engineer** — staging, version, tag, push

## Phase 7 — Post-deploy verification

- Landing page renders at `https://<org>.github.io/<repo-name>/`
- Handbook renders at `.../handbook/`
- Pagefind search works in handbook
- Translations are complete (check ja for degenerate output)
- Coverage badge shows real data
- **[org-internal]** `rk show <slug>` returns complete knowledge entry
- **[org-internal]** Repo-knowledge DB has thesis, architecture, and relationships

### Role owners
- **Deployment Verifier** — landing page, handbook, package, badges, translations

### Final gate
- **Critic Reviewer** — accept or reject treatment completeness

## Do NOT

- Copy or modify theme components locally
- Add extra Astro pages beyond index.astro unless requested
- Skip the init CLI and scaffold manually
- Add npm badges for private/unpublished repos
- Skip the repo-knowledge DB entry (org-internal) — it's part of the treatment
- Tag a release or publish before translations land — release tags are immutable
- Reference "memory/" paths without absolute paths — protocols must be self-contained
- Hardcode machine-specific paths in this workflow — it ships to other people's repos
