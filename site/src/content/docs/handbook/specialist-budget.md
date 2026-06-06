---
title: Token Budget Analyst
description: Consult a budget specialist for each dispatch step — an advisory, opt-in, fail-open forecast attached to the manifest. Default off.
sidebar:
  order: 3.5
---

Role OS can consult a **Token Budget Analyst** specialist for every step of a dispatch manifest and
attach an advisory spend forecast plus an audit receipt to each step. It is opt-in, advisory, and
fail-open — designed to be safe to land long before you decide to turn it on.

Three properties make it safe:

- **Opt-in, default off.** With the flag off, a budget-aware build returns *exactly* what a normal
  build returns — production dispatch is byte-identical until you flip it.
- **Advisory.** The forecast and receipt are attached to each step for the audit trail. The budgeter
  forecasts spend; it never blocks or gates a dispatch.
- **Fail-open.** If the specialist is unreachable or errors, the consult falls back to a deterministic
  baseline and records the error in a receipt — it can never break manifest assembly.

## Enable it

```bash
export ROLEOS_BUDGET_CONSULT=1     # or "true". Default off.
```

## How it works

For most users the environment variable is the whole interface — Role OS's dispatch assembly does the
rest. Internally, two functions in `src/specialist/budget-consult.mjs` wire the consult in (imported by
a relative path within the package):

```js
import {
  consultBudgetForManifest,
  buildDispatchManifestWithBudget,
} from "./src/specialist/budget-consult.mjs";

// Build, then enrich each step with a budget forecast + receipt:
const manifest = await buildDispatchManifestWithBudget(options);

// …or enrich a manifest you already built:
await consultBudgetForManifest(manifest);
```

`buildDispatchManifestWithBudget` is the single production entry point Role OS calls in place of
`buildDispatchManifest` once the consult is on; with the flag off it returns the same manifest
unchanged. On success each step gains two fields:

- **`budgetForecast`** — the specialist's spend estimate for that step.
- **`budgetReceipt`** — a `roleos-specialist-receipt/v1` audit record of the consult.

If a consult errors, the step still gets a `budgetReceipt` (`source: "consult-error"`) but **no**
`budgetForecast` — so treat `budgetForecast` as optional and `budgetReceipt` as always present.

## Fail-open baseline

When the specialist cannot answer, the consult uses a **deterministic** baseline — never a Claude
call:

```
spend_weighted = max(round(context_tokens × 1.5), 50000)
```

(`context_tokens` is itself estimated from the step's prompt size, ~3.5 chars/token.)

A shadow-probe check confirms the specialist's forecast stays within 25% of this baseline; a forecast
that drifts further is the signal to investigate the adapter. If the consult itself throws, the step's
`budgetReceipt` records a `consult-error` and assembly continues — a budget consult can never halt a
dispatch.

## Rolling back a bad adapter

The consult depends on a served, registered specialist. If a promoted adapter regresses, revert to the
previous version with the named compensator:

```bash
roleos specialist rollback <role> <version>
```

This is the budgeter analogue of prism's verifier-rollback: a version pointer swap, no retrain. Turning
the consult **on in production is a release decision** — the default stays off until then.
