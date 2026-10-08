# Jury (`roleos-jury-validation/v1`, `roleos-jury-panel/v1`)

A jury is a panel of trained critics. Critics that learned the same mistakes vote
like one critic, so a panel has to beat the best single critic on held-out groups
before role-os will keep it. Otherwise the verdict is the best critic, or
"insufficient data" when the validation set is too small to support either claim.

```bash
roleos jury check validation.json
roleos jury select validation.json --seed 0 --out panel.json
roleos jury score panel.json items.json
```

No network and no model call. The inputs are files. The same file and the same
seed produce the same numbers. A missing measurement is printed as "unmeasured".
The tool does not print a panel it cannot support.

## Validation file

```json
{
  "schema": "roleos-jury-validation/v1",
  "items": [{ "id": "p1", "group": "prompt-17", "truth": 1 }],
  "critics": {
    "auditor-attn-s42": { "kind": "pointwise", "threshold": 0, "scores": { "p1": 1.3 } },
    "kev-4b-ft-s0": { "kind": "pairwise", "threshold": 0.5, "scores": { "p1": 0.97 } }
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | `roleos-jury-validation/v1` |
| `items[].id` | yes | Unique item id |
| `items[].group` | yes for `check` and `select` | Cluster id. Items from the same prompt are not independent, and every bootstrap and every fold keeps a group together. |
| `items[].truth` | yes for `check` and `select` | `0` or `1`. Omitted for `score`. |
| `critics.<id>.threshold` | yes | Finite number. A score above it is a yes, a score below it is a no, and a score exactly equal to it is an abstention. |
| `critics.<id>.scores` | yes | Map of item id to a finite score. **Higher means "truth = 1".** |
| `critics.<id>.kind` | — | Label only (`pointwise`, `pairwise`, …). It does not change the maths. |

A score that is absent is left out of that critic's accuracy and out of coverage
(`scored / items`). It is not treated as a zero, and it is not treated as a wrong
answer. A score exactly equal to the threshold is an abstention too: it is left
out of accuracy, and it still counts in coverage, because the critic did score
the item. It is not a no. `decided` is how many items became a yes or a no.
Accuracy is `correct / decided`. An inverted critic (accuracy interval entirely
below 0.5) is reported and left out of selection. Its scores are never flipped.

`check` and `select` refuse a file that is missing groups, truths, thresholds, or
the schema. `score` accepts the same shape with `truth` omitted.

## What `check` measures

For each critic:

- **Accuracy.** Share of yes/no decisions that match `truth`. A threshold tie is not a decision.
- **95% interval.** Group-clustered bootstrap of that accuracy. Groups are drawn with replacement,
  default 2000 draws, seed 0 for `check`. The interval is the 2.5 and 97.5
  percentiles with linear interpolation. `select --seed` uses that seed for this
  interval too.
- **Coverage.** Share of items the critic scored, including threshold ties. `scored` is that count. `decided` is the accuracy denominator.

For every pair, on items both decided (a threshold tie is an abstention for that critic):

- **Error consistency.** Cohen's kappa on the right/wrong vectors. Expected
  agreement comes from the two accuracies on those items:
  `accA * accB + (1 - accA) * (1 - accB)`. This is the error-consistency measure
  in Geirhos, Meding, and Wichmann, NeurIPS 2020. Kappa is "unmeasured" when the
  pair decided nothing in common, or when expected agreement is already 1.
- **Double fault.** Share of those items both get wrong.
- **Disagreement.** Share of those items whose decisions differ.

A pair with error consistency ≥ 0.9 is flagged `duplicates` (one critic counted
twice). **0.9 is this studio's rule, not a value from the papers.** The flag does
not drop either critic. Selection still adds a critic only when the addition
raises panel accuracy, so an exact copy does not get a second seat unless a
second vote changes the outcome.

## What `select` adds

1. Stop with `insufficient-data` when there are fewer than 30 items or fewer than
   10 groups. No panel file is written. The per-critic table is still printed,
   because those are measurements, not a recommendation.
2. Drop inverted critics.
3. **Greedy selection** (Caruana, Niculescu-Mizil, Crew, and Ksikes, ICML 2004).
   Start from the best single critic. Repeatedly add the critic, allowing the
   same critic again, that most raises panel accuracy. Stop when no addition
   raises it, or at `--max-size` slots (default 5). Ties break toward the
   lexicographically smaller id.
4. **Bagging.** Run that greedy selection on `--bags` group-bootstrap resamples
   (default 50). Keep critics chosen in at least half the bags. A kept critic's
   count is the lower median of its counts on the bags that chose it.
5. **Nested estimate.** Split groups into `--folds` (default 5). On each training
   side, run the same bagged selection and score that panel on the held-out
   groups. Do the same for the best single critic chosen on the training side.
   Report both out-of-fold accuracies and a paired group-clustered bootstrap
   interval of panel minus best single. The text lists every fold. A skipped
   fold says why: the training side was empty, the held-out side was empty,
   no critic had a measured accuracy, or bagging kept nobody. A fold that ran
   says how many held-out items entered the comparison and which were left out
   because the panel or the best single abstained. `--json` includes the same
   `per_fold` records. `n` can be smaller than the validation set for that reason.

Standardisation is fit on the items used for that selection (the full validation
set for the saved panel, the training fold for the nested estimate). Each member's
scores are z-scored with the population standard deviation (divide by n), then
centred on that member's threshold. The panel score is the equal-weight mean of
those centred values, and a member picked twice casts two votes. The decision is
`panel score > 0`. A panel score of exactly 0 is an abstention, not a no.
A constant critic (standard deviation 0) votes +1 or −1 from the sign of
`score - threshold`, and abstains on a tie. A member who abstains on an item,
including by landing exactly on the threshold, is left out of that item's mean.
If every member abstains, the item is unmeasured.

### Verdict

| Verdict | When | `--out` |
|---|---|---|
| `panel` | The nested interval lies entirely above 0, and bagging kept at least one critic | Writes `roleos-jury-panel/v1` |
| `best-single` | Otherwise, and at least one critic is eligible | Writes nothing. Names the critic. |
| `insufficient-data` | Too few items or groups, no measured critic, or every measured critic is inverted | Writes nothing. Names no winner. |

"Entirely above 0" means the lower end of the interval is greater than 0. An
interval that touches 0 is not a panel.

## Panel file

Written only for verdict `panel`.

```json
{
  "schema": "roleos-jury-panel/v1",
  "members": [
    { "critic": "auditor-attn-s42", "count": 1, "mean": 0.12, "sd": 0.84, "threshold": 0 }
  ],
  "selected_on": {
    "validation_sha256": "<sha256 of the validation file's canonical JSON>",
    "seed": 0,
    "max_size": 5,
    "bags": 50,
    "folds": 5,
    "bootstrap": 2000
  },
  "verdict": "panel",
  "nested": {
    "panel_accuracy": 0.81,
    "best_single_accuracy": 0.72,
    "difference": 0.09,
    "difference_ci": [0.03, 0.15],
    "n": 400
  }
}
```

`validation_sha256` is the SHA-256 of canonical JSON (keys sorted at every level),
the same canonical form as a recipe card. Reformatting the validation file does
not change the hash. Changing a score does.

`roleos jury score` applies these stored means, standard deviations, thresholds,
and counts to new items. It does not refit them on the new items. New items use
the validation schema; `truth` is optional. The decision on a new item is the
same rule: above 0 is a yes, below 0 is a no, and exactly 0 is an abstention.
Text prints that abstention as `abstain`, and a missing score as `unmeasured`.

## Why a panel has to earn it

LLM judges' errors are highly correlated. A panel of them can look like a vote
and still be one opinion repeated. Greedy selection with replacement and equal
weights is the ensemble-selection procedure in Caruana et al. 2004; bagging the
selection is the remedy for a hill-climb that overfits the validation set. The
nested interval is there so a small gap on a few hundred items is not mistaken
for a win.
