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

## How Role OS integrates

When Role OS routes a full treatment:

1. Verify shipcheck passes first
2. Load the canonical 7-phase protocol from Claude project memory
3. Route each phase through the appropriate role chain
4. Claude project memory is the continuity layer — Role OS does not duplicate it
5. Critic reviews treatment completeness against the canonical protocol, not a local copy

## What Role OS adds

- Role contracts for each phase (who owns what)
- Structured handoffs between phases
- Review gate on treatment completeness
- Routing and escalation law

## What Role OS does not own

- The treatment protocol itself
- The shipcheck gate
- Claude project memory
- Treatment history and repo facts (those live in Claude project memory)
