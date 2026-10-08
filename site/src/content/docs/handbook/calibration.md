---
title: Calibration
description: What a finished run records, the five-outcome gate, the pack boost, and the kill switch.
sidebar:
  order: 3.9
---

A finished run leaves one line in `.claude/calibration/outcome-ledger.jsonl`. That file is runtime data. It is not part of the product tree. The schema is `starter-pack/schemas/outcome-ledger.md`.

The line is written when the run ends: completed, failed, partial, abandoned, or blocked with nothing left pending or active. The same run id does not write a second line. The first end state stays, including after a later reopen. A line with no id is still appended.

## What is recorded

The line names the run, when it ended, the pack the entry decision suggested, the confidence of that suggestion, and the pack the run actually used. A mission run records that mission's pack, including when the run's own pack key is empty. An explicit pack key is kept. Free routing leaves the selected pack empty.

It also records whether the operator overrode the suggestion, how long the chain was, how many escalations fired, how many verdicts were rejected, how many corrections were made, the completion status, and the roles that actually ran. Corrections are the interventions `reroute`, `retry`, and `reopen`. Rejected verdicts are `reject` interventions, plus step notes that start with "reject".

`roleos abandon`, with an optional run id, gives up on a run that has not already ended. The ledger keeps that end state.

## The five-outcome gate

`roleos calibration` groups runs by mission key, or by pack when there is no mission, and by the sorted roles. A clean run, for that table, is completed, with corrections 0 and rejected verdicts 0.

Below 5 runs the row says `insufficient data` and prints no rate. At 5 or more, the clean rate is a Wilson 95% interval: an interval for that share that does not collapse to a point when every run is clean or every run is not. The constant in the interval is the 95% normal quantile, not a rounded 1.96.

## The boost

Pack choice still starts from keyword hits. After a pack has at least 5 recorded outcomes, each completed run with corrections 0 adds +0.5 to that pack, capped at +2. The boost does not look at rejected verdicts. It does not create keywords. It never adds a pack the keywords did not already match. A boosted pack with zero keyword hits is not suggested.

Confidence is computed from the keyword score, before the boost. Three keyword hits is high. Two is medium. Below that is low. Role weights do not change. Confidence thresholds do not change.

The calibration report may suggest looking at the keyword cutoff when high-confidence suggestions have been a poor guide. That sentence is a suggestion. Role OS does not apply it.

`roleos route --verbose` and `roleos explain` print the boost, the run count, and the clean rate when the ledger has them. An empty ledger prints `Calibration: no recorded runs yet` on those commands.

## The kill switch

`ROLEOS_NO_CALIBRATION=1` turns the boost off. Recording continues. Routing then uses keyword scores only. Those commands print `Calibration off (ROLEOS_NO_CALIBRATION=1). Keyword scores only.`

## An empty ledger

```bash
roleos calibration
```

In a directory with no outcome ledger, that prints:

```
no recorded runs yet
```

It does not print a zero report. `--json` on that same empty ledger prints `{"recorded":false,"message":"no recorded runs yet"}`.
