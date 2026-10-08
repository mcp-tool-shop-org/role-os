---
title: Jury
description: How a panel of trained critics earns its seat, and a worked select on a synthetic file.
sidebar:
  order: 3.8
---

A jury is a panel of trained critics. Critics that learned the same mistakes vote like one critic. Role OS keeps a panel only when it beats the best single critic on held-out groups. Otherwise the verdict is that critic, or `insufficient-data` when the file is too small to support either claim.

No network and no model call. The inputs are files. The same file and the same seed produce the same numbers. A missing measurement is printed as `unmeasured`. The tool does not print a panel it cannot support.

The schema is `starter-pack/schemas/jury.md`.

## The validation file

`roleos-jury-validation/v1` names the items and the critics.

Each item has an id, a group, and a truth of 0 or 1. Items from the same prompt share a group. Every bootstrap and every fold keeps a group together, because those items are not independent.

Each critic has a threshold and a score per item. A higher score means "truth = 1". A score above the threshold is a yes. A score below it is a no. A score exactly equal to the threshold is an abstention: left out of accuracy, still counted in coverage, not a no. An absent score is left out of both. It is not a zero, and it is not a wrong answer.

`kind` (`pointwise`, `pairwise`, and so on) is a label. It does not change the maths.

A critic may name `recipe: { path, sha256 }`. The path is relative to the validation file. The sha256 is the card's canonical hash. A hash that does not match the file is an error, and the check stops.

## What check measures

Accuracy is the share of yes/no decisions that match truth. A threshold tie is not a decision.

The 95% interval is a group-clustered bootstrap of that accuracy. Groups are drawn with replacement, 2000 draws by default. The interval is the 2.5 and 97.5 percentiles. `select --seed` uses that seed for this interval too. `check` uses seed 0.

Coverage is the share of items the critic scored, including threshold ties.

For every pair, on the items both decided:

- **Error consistency** is Cohen's kappa on the right/wrong vectors. Expected agreement comes from the two accuracies on those items: each critic's accuracy times the other's, plus each critic's error rate times the other's. That is the error-consistency measure in Geirhos, Meding, and Wichmann, NeurIPS 2020. Kappa is `unmeasured` when the pair decided nothing in common, or when expected agreement is already 1.
- **Double fault** is the share of those items both get wrong.
- **Disagreement** is the share of those items whose decisions differ.

A pair with error consistency at or above 0.9 is flagged `duplicates`. **0.9 is this studio's rule, not a value from the papers.** The flag does not drop either critic. Selection still adds a critic only when the addition raises panel accuracy, so an exact copy does not get a second seat unless a second vote changes the outcome.

An inverted critic has an accuracy interval that lies entirely below 0.5. It is reported and left out of selection. Its scores are never flipped.

## How select builds a panel

1. Stop with `insufficient-data` below 30 items or 10 groups. No panel file is written. The per-critic table is still printed, because those are measurements, not a recommendation.
2. Drop inverted critics.
3. Drop a critic whose recipe card has any failed or unresolved standard control, and list the reason. `--allow-unproven` admits that critic, and the panel file records the flag. A critic with no card is admitted and printed as `unproven: no recipe card`. `--require-recipe` leaves that critic out. A gap on the card, including a wrong shuffle method, does not by itself exclude the critic. `--allow-unproven` does not forgive a hash mismatch, a missing file, an invalid card, or an unreadable path. Exclusion happens before selection.
4. **Greedy selection** (Caruana, Niculescu-Mizil, Crew, and Ksikes, ICML 2004). Start from the best single critic. Repeatedly add the critic, allowing the same critic again, that most raises panel accuracy. Stop when no addition raises it, or at `--max-size` (default 5). Ties break toward the lexicographically smaller id.
5. **Bagging.** Run that selection on `--bags` group-bootstrap resamples (default 50). Keep critics chosen in at least half the bags. A kept critic's count is the lower median of its counts on the bags that chose it.
6. **Nested estimate.** Split groups into `--folds` (default 5). On each training side, run the same bagged selection and score that panel on the held-out groups. Do the same for the best single critic chosen on the training side. Report both out-of-fold accuracies and a paired group-clustered bootstrap interval of panel minus best single. The text lists every fold. A skipped fold says why. A fold that ran says how many held-out items entered the comparison.

Standardisation is fit on the items used for that selection. Each member's scores are z-scored, then centred on that member's threshold. The panel score is the equal-weight mean of those centred values. A member picked twice casts two votes. The decision is panel score above 0. A panel score of exactly 0 is an abstention, not a no. If every member abstains, the item is unmeasured.

| Verdict | When |
|---|---|
| `panel` | The nested interval lies entirely above 0, and bagging kept at least one critic. `--out` writes `roleos-jury-panel/v1`. |
| `best-single` | Otherwise, when at least one critic is eligible. Names the critic. Writes nothing. |
| `insufficient-data` | Too few items or groups, no measured critic, every measured critic is inverted, or every measured critic is excluded by its recipe card. Names no winner. Writes nothing. |

Entirely above 0 means the lower end is greater than 0. An interval that touches 0 is not a panel.

`roleos jury score` applies the stored means, standard deviations, thresholds, and counts to new items. It does not refit them. Above 0 is a yes, below 0 is a no, and exactly 0 is `abstain`. A missing score is `unmeasured`.

## A worked select

`starter-pack/examples/jury-validation.json` is synthetic. Thirty items, ten groups, three critics. `sharp` names the synthetic recipe card from the recipe-cards page, and that card's nine controls passed, so the gate does not exclude it. `echo` makes the same mistakes as `sharp`. `blur` makes different ones. `echo` and `blur` name no card.

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

```
jury — 30 items, 10 groups, seed 0, bootstrap 2000
critics
  blur  accuracy 0.8667  CI [0.7667, 0.9667]  coverage 1.0000  decided 30/30  (pointwise, threshold 0)
  echo  accuracy 0.9333  CI [0.8333, 1.0000]  coverage 1.0000  decided 30/30  (pointwise, threshold 0)
  sharp  accuracy 0.9333  CI [0.8333, 1.0000]  coverage 1.0000  decided 30/30  (pointwise, threshold 0)
inverted (accuracy interval entirely below 0.5; scores are not flipped)
  none
duplicates (error consistency ≥ 0.9; this cutoff is the studio's rule, not a literature value)
  echo  sharp  1.0000
error consistency
  blur  echo  kappa -0.0976  double-fault 0.0000  disagreement 0.2000  n 30
  blur  sharp  kappa -0.0976  double-fault 0.0000  disagreement 0.2000  n 30
  echo  sharp  kappa 1.0000  double-fault 0.0667  disagreement 0.0000  n 30
recipes
  blur  unproven: no recipe card
  echo  unproven: no recipe card
  sharp  passed: positive-marker, graded-marker, shuffled-labels, partial-input, generator-identity-probe, same-generator-no-error, reversed-correction, held-out-generator, natural-errors  failed: none  unresolved: none  gaps: 0
excluded by recipe (failed or unresolved standard controls are left out unless --allow-unproven)
  none
bagged panel (50 bags, seed 0; kept when chosen in at least half)
  echo  × 1  mean 0.0000  sd 1.0000  threshold 0  bags 48
nested 5-fold, grouped, n 30 of 30
  panel out-of-fold accuracy       0.9000
  best single out-of-fold accuracy 0.9333
  difference                       -0.0333  CI [-0.1000, 0.0000]
  fold 0: n 6 of 6
  fold 1: n 6 of 6
  fold 2: n 6 of 6
  fold 3: n 6 of 6
  fold 4: n 6 of 6
verdict: best-single (echo)
  the nested paired interval of panel minus best single does not lie entirely above 0
```

Read it from the bottom. The nested interval is [-0.1000, 0.0000]. It touches 0, so it does not lie entirely above 0. The out-of-fold panel is worse than the best single critic (0.9000 against 0.9333). The verdict is `best-single (echo)`.

echo and sharp have the same accuracy. The tie breaks toward the smaller id, which is echo. Their error consistency is 1.0000, so the duplicate flag names them, and selection still seats one. Bagging kept echo in 48 of 50 bags, with count 1. A second copy of the same mistakes did not earn a panel.

The command above does not pass `--out`. `--out` writes a panel file only when the verdict is `panel`. This file's verdict is not.

The recipe block is the gate. sharp's card passed 9 of 9 controls and has no gaps, so sharp is eligible. echo and blur are `unproven: no recipe card` and still eligible, because this command did not pass `--require-recipe`. Nobody is under "excluded by recipe".
