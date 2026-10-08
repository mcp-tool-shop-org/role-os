# Outcome ledger (`.claude/calibration/outcome-ledger.jsonl`)

One JSON object per line. A run writes a line when it ends, and only then.
The same `runId` does not write again. The first end state stays, including
after a later reopen.

```json
{
  "runId": "run-1",
  "timestamp": "2026-10-08T12:00:00.000Z",
  "packetFile": null,
  "detectedType": null,
  "suggestedPack": "feature",
  "suggestedConfidence": "medium",
  "selectedPack": "bugfix",
  "missionKey": null,
  "operatorOverride": true,
  "mismatchRedirect": false,
  "mismatchFrom": null,
  "mismatchTo": null,
  "chainLength": 2,
  "escalations": 0,
  "rejectedVerdicts": 0,
  "corrections": 0,
  "completionStatus": "completed",
  "rolesUsed": ["Backend Engineer", "Critic Reviewer"],
  "recordedAt": "2026-10-08T12:00:01.000Z"
}
```

| Field | Meaning |
|---|---|
| `runId` | Run id. The idempotency key. A line with no id is still appended. |
| `timestamp` | When the run ended (`completedAt`), or the time of recording. |
| `suggestedPack` | Pack the entry decision suggested, or the pack the run used when the decision had none. |
| `suggestedConfidence` | `high`, `medium`, `low`, or null when the decision had no score. |
| `selectedPack` | Pack the run actually used. Null for free routing. A mission run records that mission's pack, including when the run's own pack key is empty. An explicit pack key is kept. |
| `missionKey` | Mission key when the run had one. Otherwise null. The combination table prefers this over the pack. |
| `operatorOverride` | True when the run was forced onto a different mission or pack than the entry decision. |
| `rolesUsed` | Sorted unique roles of steps that are not pending and not skipped. |
| `escalations` | How many escalation records the run stored. |
| `corrections` | Interventions of type `reroute`, `retry`, or `reopen`. |
| `rejectedVerdicts` | Interventions of type `reject`, plus step notes that start with "reject". |
| `completionStatus` | `completed`, `partial`, `failed`, `blocked`, or `abandoned`. |
| `recordedAt` | When this line was appended. |

`completionStatus: "blocked"` is written when a blocked step leaves nothing pending or active. The run's own status field is not changed to `blocked`. `partial` is a real end: the failed step was partial, and downstream steps were blocked.

A clean run, for the combination table and the printed clean rate, is `completed` with `corrections` 0 and `rejectedVerdicts` 0. The pack boost is the older rule: +0.5 for each completed run with `corrections` 0, capped at 2. It does not look at rejected verdicts. The boost is applied to keyword scores only after that pack has at least 5 lines. Below 5, the rate is not printed.

`ROLEOS_NO_CALIBRATION=1` does not stop recording. It stops the boost. Routing then uses keyword scores only.

`roleos calibration` on an empty file says "no recorded runs yet". It does not print a zero report. A combination with fewer than 5 runs says "insufficient data" and has no rate. The rate that is printed is a Wilson 95% interval.

The ledger is runtime data. It is not part of the product tree.
