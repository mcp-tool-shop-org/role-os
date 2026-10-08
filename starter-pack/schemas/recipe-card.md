# Recipe card (`roleos-recipe-card/v1`)

A specialist's role comes from the data it was trained on, not from its prompt. A recipe card
records that data's design, so the role can be reproduced, compared with other recipes and
audited. A registry version points at its card by id and SHA-256 (`versions[].recipe_card`),
so every certified role traces back to the recipe that made it.

```bash
roleos recipe init Auditor --out recipes/auditor-v1.json   # a starting card
roleos recipe check recipes/auditor-v1.json                 # errors, evidence gaps, controls, hash
roleos specialist register Auditor version.json --recipe recipes/auditor-v1.json
```

## Why a card

- **Roles come from data or protocol.** Persona prompts did not raise accuracy in a 162-persona
  test. The judging roles with evidence behind them were trained: critics on inserted bugs,
  verifiers against sneaky provers, and per-attribute reward heads.
- **The recipe is the unit of study.** DataComp held the model and compute fixed and varied only
  the data recipe. Comparing roles means comparing recipes, which needs them written down.
- **Generators leave fingerprints.** A critic trained on one model's planted errors can learn
  that model's editing style instead of the error. The card names its generators and the
  controls that rule this out.

Research: R&D library entries `2026-10-08-dataset-recipes-for-critic-jury-roles-designing-roles-by-dat`
and `2026-10-08-three-follow-up-studies-for-critic-recipes-hard-pairs-two-pl`
(mcp-tool-shop-org/rnd).

## Fields

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | `roleos-recipe-card/v1` |
| `id`, `role` | yes | The card's id, and the role it trains |
| `attribute` | yes | What the role should learn, e.g. "finds the error in one answer" |
| `target_failures`, `out_of_scope` | — | The failures it targets, and the uses it was not made for |
| `format.kind` | yes | `pointwise`, `pairwise`, `rubric`, `generative` or `other`. Train one format per run: mixing pointwise and pairwise data in one run did worse than training them apart and merging (Prometheus 2). |
| `format.order_randomised`, `swap_augmented`, `reference_answer`, `rationale` | — | Pairwise data needs randomised order; swap augmentation cut position bias (JudgeLM) |
| `sources[]` | — | `name`, `licence`, `provenance` for every input |
| `negatives.construction` | yes | `planted-edit`, `human-inserted`, `rewrite`, `natural`, `mixed` or `other` |
| `negatives.generators[]` | yes, unless natural or human-inserted | `model`, `family`, `revision`: every model that made the negatives |
| `negatives.error_taxonomy`, `edit_stats`, `seed`, `code_hash` | — | Error types (so results can be sliced), edit-size statistics, and how to rebuild the data |
| `filtering[]` | — | Each filter: name, rule, kept, dropped (e.g. a difficulty filter: kept if the current critic misses it) |
| `mixture` | — | Counts per error type and per generator |
| `splits.train`, `splits.validation` | yes | Training data, and the set used for selection and role checks |
| `splits.final`, `held_out_generator`, `natural_errors` | — | A set never used to tune; data from a generator family never seen in training; real, unplanted errors |
| `controls[]` | — | `name`, `status` (`passed`, `failed`, `not-run`), `result` |
| `results[]`, `pins`, `references` | — | Results with intervals; every pinned model, prompt and tool version; links to the research |

`roleos recipe check` reports **errors** (the card cannot be used) and **gaps** (the card can be
registered, but the role's evidence is incomplete). The gaps it names: one generator family;
an unpinned generator; no error taxonomy; no final, held-out-generator or natural-error split;
pairwise data without order randomisation; missing licences; no pins; and standard controls
that are missing or failed.

## Standard controls

Cheapest first. Each guards a different way a critic can look good without having learned its
attribute (`roleos recipe controls`):

| Control | Guards against |
|---|---|
| `positive-marker` | A broken pipeline: a known marker must be learned |
| `graded-marker` | Features that cannot see an edit as small as a real one |
| `shuffled-labels` | Features carrying something label-correlated besides the attribute |
| `partial-input` | Half the input (the edit span alone, one side alone) already solving it |
| `generator-identity-probe` | Which model made the data being trivially recoverable |
| `same-generator-no-error` | An edit with no error, by the same generator, reading as an error |
| `held-out-generator` | An attribute that does not transfer to an unseen generator family |
| `natural-errors` | A critic that finds planted errors but not real ones |

## Hash

The SHA-256 is taken over canonical JSON (keys sorted at every level), so reformatting a card
does not change its hash but any change of content does. A registry version pins
`{ "id", "sha256", "path" }`. Change the card, and the next version gets a new hash.
