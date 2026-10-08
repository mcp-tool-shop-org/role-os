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
| `controls[]` | — | `name`, `status` (`passed`, `failed`, `not-run`, `unresolved`), optional free-text `result`, optional `measure` |
| `results[]`, `pins`, `references` | — | Results with intervals; every pinned model, prompt and tool version; links to the research |

`roleos recipe check` reports **errors** (the card cannot be used) and **gaps** (the card can be
registered, but the role's evidence is incomplete). The gaps it names: one generator family;
an unpinned generator; no error taxonomy; no final, held-out-generator or natural-error split;
pairwise data without order randomisation; missing licences; no pins; standard controls
that are missing, failed, or unresolved; a passed control with no `measure`; and a
method rule that was not followed (see below). Unresolved is not a pass. A note, such as
the shuffled-labels permutation floor, is not a gap.

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
| `reversed-correction` | A critic that is only an edit detector. The edited copy is the corrected, stronger one |
| `held-out-generator` | An attribute that does not transfer to an unseen generator family |
| `natural-errors` | A critic that finds planted errors but not real ones |

## Measure

A control may carry an optional `measure`. A free-text `result` stays valid. A passed
control with no `measure` is a gap, not an error. `not-run` with no measure is not a gap.

```json
{
  "name": "shuffled-labels",
  "status": "passed",
  "result": "",
  "measure": {
    "metric": "accuracy",
    "point": 0.5,
    "ci": [0.4, 0.6],
    "n": 100,
    "clusters": "prompt",
    "method": "balanced-permutation",
    "p": 0.05,
    "nulls": 19,
    "methods": []
  }
}
```

| Field | Meaning |
|---|---|
| `metric` | What the point estimates, such as `accuracy` or `edit-rate` |
| `point` | The point estimate. It must lie inside `ci` |
| `ci` | `[low, high]`. Low above high is an error |
| `n` | How many items entered the estimate |
| `clusters` | The cluster unit, for example `prompt` |
| `p`, `nulls` | Permutation test. `p` must be in (0, 1]. `nulls` must be an integer ≥ 1 |
| `method` | How the control was run. Required by the three rules below |
| `paraphrase_median`, `error_median` | Edit-size match for `same-generator-no-error` |
| `methods[]` | Extra method records, same fields. Both edit methods live here plus the primary `method` |

`methods[]` is how one control records two edit methods. Each entry is
`{ method, ci, point, paraphrase_median, error_median }`. The primary fields are the
first method. A second entry records the other.

## Method rules

Checked when `measure` is present. With no measure, the same rule is a gap (one gap,
not a second one piled on "passed without a measure").

**shuffled-labels.** `method` must be `"balanced-permutation"`: exactly half of each
cluster's labels are flipped (Ojala & Garriga 2010). Any other method, including a
plain random shuffle, is a gap. A consistent edit direction makes the shuffle
imbalance set the sign, so an unbalanced shuffle can pass for the wrong reason.
A status of `passed` also needs `p` and `nulls`, and `p ≥ 1/(nulls+1)`. That floor
is the smallest p a permutation test can report. `recipe check` prints it. When the
pass sits on the floor, the note says the observed result beat every null. A p below
the floor with status `passed` is an error. Twenty nulls print the floor `1/21`.

**same-generator-no-error.** `method` must be `"word-swap"` or `"sentence-rewrite"`,
and both medians must be recorded. A gap if the paraphrase median exceeds 2× the
error median (on the primary measure and on each `methods[]` entry). A pass needs
the edit-rate CI to include 0.5, and the same for every recorded method CI. If both
methods are recorded and their CIs do not overlap (they overlap when the intervals
touch), status must be `"unresolved"`. Anything else is an error. Overlapping CIs
may still be marked unresolved. That is the conservative reading, and the jury still
does not treat it as passed.

**reversed-correction.** Pairs where the edited copy is the corrected, stronger one.
Passed only when the accuracy CI lies entirely above 0.5 (`ci` low > 0.5). An
interval that touches 0.5 is not above. A pass with no CI, or with a low end at or
below 0.5, is an error.

`unresolved` is a status, not a pass. `recipe check` lists it beside failed controls.
The jury leaves a critic out when any standard control is failed or unresolved.

## Hash

The SHA-256 is taken over canonical JSON (keys sorted at every level), so reformatting a card
does not change its hash but any change of content does. A registry version pins
`{ "id", "sha256", "path" }`. Change the card, and the next version gets a new hash.
