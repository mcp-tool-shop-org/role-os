---
title: Recipe cards
description: The data record for a trained critic, the nine controls on that record, and a worked check.
sidebar:
  order: 3.7
---

A trained critic learned its job from data. A persona prompt is not that record. A recipe card is: the attribute, the generators, the splits, and the controls that say whether the critic learned the attribute or learned a shortcut.

Comparing two critics means comparing those records. DataComp held the model and the compute fixed and varied the data recipe. Role OS keeps the same habit. The card is the thing you can diff.

Generators leave fingerprints. A critic trained on one model's planted errors can learn that model's editing style. The card names every generator, and the controls below are there to catch the fingerprint.

The research behind the fields lives in the R&D library (mcp-tool-shop-org/rnd), in the dataset-recipe study and its three follow-ups. The schema those fields implement is `starter-pack/schemas/recipe-card.md`. This page is how to read a card and how to check one.

## Fields

| Field | What it is for |
|---|---|
| `schema` | `roleos-recipe-card/v1` |
| `id`, `role` | The card's id, and the role it trains |
| `attribute` | The thing the role should learn, in one line |
| `target_failures`, `out_of_scope` | The failures it is for, and the jobs it was not built to do |
| `format.kind` | `pointwise`, `pairwise`, `rubric`, `generative`, or `other`. Train one format per run. Mixing pointwise and pairwise in one run did worse than training them apart and merging (Prometheus 2). |
| `format.order_randomised` | Pairwise data needs a randomised order. Swap augmentation cut position bias (JudgeLM). |
| `sources[]` | `name`, `licence`, and `provenance` for every input |
| `negatives.construction` | `planted-edit`, `human-inserted`, `rewrite`, `natural`, `mixed`, or `other` |
| `negatives.generators[]` | `model`, `family`, and `revision` for every model that made the negatives. Required unless the construction is `natural` or `human-inserted`. |
| `negatives.error_taxonomy` | Error types, so a later result can be sliced |
| `splits.train`, `splits.validation` | The training data, and the set used for selection and for these controls |
| `splits.final` | A set never used to train, select, or tune |
| `splits.held_out_generator` | A generator family the training data never saw |
| `splits.natural_errors` | Real errors, not planted ones |
| `controls[]` | `name`, `status`, an optional free-text `result`, and an optional `measure` |
| `pins` | Every model, prompt, and tool version the recipe used |

`roleos recipe check` reports two different things. An **error** means the card cannot be used. A **gap** means the card can be registered, and the evidence is incomplete. A **note** is a fact. The permutation floor below is a note, not a gap.

## Controls

Nine standard controls, cheapest first. `roleos recipe controls` prints them:

```
  positive-marker            the pipeline can learn at all (a known marker must be learned)
  graded-marker              the features can see an edit as small as a real one
  shuffled-labels            the features carry nothing label-correlated besides the attribute
  partial-input              half the input (edit span only, one side only) does not already solve it
  generator-identity-probe   which model made the data is not trivially recoverable
  same-generator-no-error    an edit by the same generator without an error reads as clean
  reversed-correction        the critic is not just an edit detector: the edited copy is the corrected, stronger one
  held-out-generator         the attribute transfers to data from a family it never saw
  natural-errors             the critic finds real, unplanted errors, not only planted ones
```

Status is `passed`, `failed`, `not-run`, or `unresolved`. A control that is missing is not an error. The check lists it as not recorded. `unresolved` is not a pass. The jury leaves a critic out when any standard control is failed or unresolved.

A measure is optional. A passed control with no measure is a gap. `not-run` with no measure is not a gap. The measure carries a metric, a point, an interval, how many items entered it, and the cluster unit. These are errors, not gaps: an interval whose low end is above its high end, a point outside its interval, a `p` outside (0, 1], or a `nulls` that is not an integer of at least 1.

## Method rules

Three controls have a method, and the method is part of the evidence.

**shuffled-labels.** The method must be `balanced-permutation`: exactly half of each cluster's labels are flipped (Ojala & Garriga 2010). Any other method, including a plain shuffle, is a gap. The status can stay `passed`, and the jury can still seat the critic. A consistent edit direction lets an unbalanced shuffle set the sign, so the shuffle can pass for the wrong reason.

A pass also needs `p` and `nulls`, and `p` at or above `1/(nulls+1)`. That floor is the smallest p a permutation test can report. A p below the floor with status `passed` is an error. When the pass sits on the floor, the check says the observed result beat every null. Twenty nulls print the floor `1/21`. Nineteen nulls print `1/20`.

**same-generator-no-error.** The method must be `word-swap` or `sentence-rewrite`, and both the paraphrase median and the error median must be recorded. A paraphrase median above twice the error median is a gap. A median equal to twice the error median is not. A pass needs the edit-rate interval to include 0.5, on the primary measure and on every extra method.

Record both methods when you have them. If their intervals do not overlap, the status must be `unresolved`. Anything else is an error. Intervals that touch do overlap. Overlapping intervals may still be marked `unresolved`. That is the conservative reading, and the jury still does not treat it as passed.

**reversed-correction.** The edited copy is the corrected, stronger one, so a critic that only detects "something was edited" should fail. A pass needs the accuracy interval entirely above 0.5. The low end must be greater than 0.5. An interval that touches 0.5 is not above. A pass with no interval, or with a low end at or below 0.5, is an error. A card that does not record this control gets the usual "not recorded" gap, never an error.

## Hash

The SHA-256 is taken over canonical JSON, keys sorted at every level. Reformatting a card does not change the hash. Changing a field does. A specialist version pins `{ id, sha256, path }`. Change the card, and the next version gets a new hash.

## A worked check

`starter-pack/examples/auditor-recipe-card.json` is a filled synthetic card. It is not a trained critic. `roleos recipe init` writes a starting card whose nine controls are `not-run`. Checking that starting card reports gaps. This file is filled in so the check can show a pass and the floor note.

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

The shuffled-labels control on that card uses `balanced-permutation`, 19 nulls, and `p` of 0.05, which is `1/20`. The note says the result beat every null. There is no gap line, because the card records two generator families, a taxonomy, the held-out and natural splits, a licence, pins, and a measure on every passed control. A thinner card prints one `gap` line per missing piece and can still be registered.

`roleos specialist register` takes `--recipe` and refuses a card that has errors. Gaps are listed. They do not block the pin.
