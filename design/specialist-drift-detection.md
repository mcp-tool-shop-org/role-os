# Specialist drift detection (S5 "later") — research-grounded design

**Status:** design locked 2026-06-13, grounded by a 4-agent research dispatch (run `wf_e7feeda2-061`).
Implements the S5 form layer's drift half: once a role accumulates field traffic, decide whether
its certification is going **stale** — i.e. it is now seeing inputs/producing outputs unlike what
it was certified on, in a way that warrants RE-CERTIFICATION (an expensive, attended GPU op).

The detector only SETS `record.divergence.status`; it never fires a GPU job. `stale` is an
advisory recommendation surfaced to the director, who owns the re-cert decision
([[role-os-dogfood-swarm-state]]). This keeps the whole layer safe to run unattended.

## Standards compliance

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 2 | Test (G-test/KS), α, K, bin scheme, sample thresholds are pinned constants in `drift.mjs`, not per-call knobs. The reducer is pinned to the specialist's own output (BBSDh). |
| ANDON_AUTHORITY | 2 | A degenerate/missing exam reference or N below floor returns an explicit `inconclusive`/`accumulating` status — never a fabricated verdict. The override arm halts silent degradation. |
| NAMED_COMPENSATORS | 3 | No irreversible action: the detector writes only a status field. The one GPU op it can *recommend* (re-cert) is the director's, gated by an attended decision; nothing here auto-fires. |
| DECOMPOSE_BY_SECRETS | 3 | `field-log.mjs` owns storage, `drift.mjs` owns the statistics, `record.mjs` owns presentation; the reducer/embedder is behind an interface so BBSDh→BBSDs→deep-kernel-MMD swaps without touching callers (Parnas). |
| UNCERTAINTY_GATED_HUMANS | 3 | `stale` is advisory; the C2ST explanation channel (v2) produces the contrastive "these field inputs are unlike your exam" readout that feeds the attended re-cert decision. N-power is reported, never hidden. |
| EXTERNAL_VERIFIER | 2 | The drift test compares the specialist's field outputs to its SEALED-exam outputs (the certification ground truth — a different, frozen reference), not the model judging itself live. Exams stay sovereign. |

## Research grounding (findings → design implication)

Full citations in run `wf_e7feeda2-061`. The load-bearing six:

1. **BBSD is the best reducer; raw-embedding MMD is the worst** (Rabanser, Günnemann, Lipton,
   *Failing Loudly*, NeurIPS 2019, arXiv:1810.11953). → Reduce each dispatch through the
   **specialist's own output** (verdict label / softmax), not an external embedder. Free, task-aligned.
2. **Multiple univariate KS + Bonferroni ≈ multivariate MMD, and is hyperparameter-free** (ibid).
   → Primary statistic is per-class KS/G-test + Bonferroni over the small verdict space; no kernel tuning.
3. **C2ST is the WORST method at ≤100 samples** (ibid; Lopez-Paz & Oquab, arXiv:1610.06545). →
   Do NOT train a discriminator at the 100-sample trigger. C2ST is a v2 *explanation* tool at high N.
4. **Gate on expected performance, not distance** (Guillory et al. DoC, arXiv:2107.03315; Garg et al.
   ATC, arXiv:2201.04234; Bayram et al., arXiv:2203.11070). → The calibration arm uses **ATC**
   (confidence-threshold accuracy estimate, label-free) + **ECE**; covariate-only drift is `watch`, not `stale`.
5. **N=100 only catches large shifts; a negative is inconclusive** (Rabanser power curves). → N≥100 = an
   actionable *positive*; a negative needs ~500–1000 before "no drift" is trustworthy. Never reset the
   stale-clock on a low-N negative.
6. **Small-N ECE is biased; use equal-mass bins + bootstrap CI; gate on the lower bound** (Guo et al.
   arXiv:1706.04599; Nixon et al. arXiv:1904.01685; Naeini et al. BBQ 2015). → ECE over ~10 equal-mass
   bins, min count per bin, bootstrap CI; the calibration arm trips on the lower CI bound vs exam baseline.

Joint-gating evidence: retraining gated on drift AND a reliability failure cuts false alarms vs
drift-alone (multi-criteria MLOps retraining, arXiv:2512.11541). → **two-arm AND-gate**.

## The detector (v1)

Both arms compute from dispatch receipts; both reduce through the specialist's own output. No
external embedder, no GPU at check-time.

### Drift arm — reducer chosen by the verdict type the role was certified on
The reducer is the specialist's own output; its FORM depends on whether the role is a classifier
or a regressor (`reference.reducer`):
- **`categorical`** (classifier, e.g. Tool-Call Conformance — verdict is a class): reduce each
  dispatch to its hard verdict label; test the label **marginal** field-vs-exam with a **G-test**
  (likelihood-ratio chi-square) over the K classes; report per-class contribution (the free "why").
  **Override** when the marginal total-variation distance ≥ `TV_OVERRIDE`. When soft outputs become
  available, switch to per-dimension KS + Bonferroni over the softmax (BBSDs).
- **`numeric`** (regressor, e.g. the budgeter — verdict is `{spend_weighted: <number>}`): the
  categorical test is degenerate (every value its own class), so reduce to the scalar output and run
  a **two-sample KS test** (BBSD's continuous analogue, Rabanser's per-dim KS at K=1) field-vs the
  exam output sample. **Override** when the KS statistic D ≥ `KS_OVERRIDE`.
- Both **fire** when p < α (α = 0.05).

### Performance/calibration arm — ATC + ECE
- **ATC**: at cert time, find the confidence threshold `t` on the sealed exam s.t. `frac(score ≥ t) =
  exam_accuracy`. Field predicted accuracy = `frac(field score ≥ t)`. The arm fires when
  `exam_accuracy − predicted_field_accuracy ≥ ACC_GAP_MARGIN`.
- **ECE** (where outcome labels exist — shadow-probe agreement is the sparse label source): equal-mass
  ~10 bins, min count per bin, bootstrap CI; fires when the field-ECE lower CI bound exceeds
  `exam_ece + ECE_MARGIN`.
- The arm trips on either sub-signal.

### Gate
```
N < N_FLOOR (100)                      -> "accumulating"   (S5-now; no test)
drift AND performance                  -> "stale"          (re-cert recommended; advisory)
drift-override (catastrophic)          -> "stale"          (regardless of perf arm)
drift only, not performance            -> "watch"          (benign covariate move; log, don't fire)
performance only, not drift            -> "watch"          (process/labeling issue, not staleness)
neither, N >= N_TRUST (500)            -> "monitored"      (trustworthy no-drift)
neither, N_FLOOR <= N < N_TRUST        -> "monitored-lowpower" (inconclusive; don't claim clean)
no exam reference                      -> "accumulating"   (cannot test yet; needs cert-time capture)
```

### Pinned constants (validate before trusting; tune against injected shifts)
`N_FLOOR = 100`, `N_TRUST = 500`, `ALPHA = 0.05`, `TV_OVERRIDE = 0.35`, `ACC_GAP_MARGIN = 0.10`,
`ECE_BINS = 10`, `ECE_MIN_PER_BIN = 5`, `ECE_MARGIN = 0.05`. These are the policy knobs; the research
is explicit that the absolute numbers for SHORT STRUCTURED TEXT are unvalidated and must be calibrated
empirically (exam-vs-exam null FPR + injected-shift power) before the `stale` verdict is trusted.

## The exam reference (the one GPU-attended piece)

The detector tests field outputs against the specialist's outputs ON THE SEALED EXAM. Certify
receipts hold only aggregates (per-rung acc/flip), NOT per-item outputs — so the reference must be
captured by a one-time eval that records, per exam item: `{id, verdict, score, correct}`. Format:

```json
{ "schema": "roleos-exam-reference/v1", "role": "...", "version_id": "...", "exam_hash": "...",
  "n_exam": 305, "classes": ["a","b"], "label_marginal": {"a":0.5,"b":0.5},
  "exam_accuracy": 0.918, "atc_threshold": 0.0, "exam_ece": 0.0 }
```

Going forward this capture should be a step of certification (the eval already runs; it just needs to
dump per-item outputs). For existing specialists it is a single attended eval per role. Until a
reference exists for a role, the detector returns `accumulating` (honest: cannot test yet).

## Serving prerequisites & per-specialist shapes (2026-06-13 findings)

Reading the live serving shims (`gpu-container/specialist-training/{verify_shim,conformance_shim}.py`)
surfaced two facts that bound what the detector can do today:

1. **The served `score` is a hardcoded constant** (`0.9`, or a low value on failure) — "informational
   only" per the gate contract; the shim calls the real model but discards logprobs. The performance
   arm (ATC + ECE) needs a REAL per-dispatch confidence, so it is **inert until serving returns one**
   (for a classifier: the verdict-token probability from the llama.cpp logprobs). Until then the gate
   produces `watch` / `monitored` / override-`stale`, but not both-arms-`stale`. The exam reference's
   `atc_threshold`/`exam_ece` are likewise meaningless until a real confidence exists, so capturing
   them must wait on this fix.
2. **The two existing specialists have different verdict shapes.** Conformance is a **classifier**
   (categorical verdict → `categorical` reducer, G-test). The budgeter is a **regressor** (verdict =
   a numeric spend estimate → `numeric` reducer, KS test). The drift arm now handles both; the
   **performance arm is classifier-shaped** (ATC = predicted classification accuracy), so a label-free
   performance proxy for the budgeter regressor is an OPEN design question (error-based, no field
   labels) — until resolved the budgeter runs drift-arm-only (`watch` / override-`stale`).

**Net:** the drift arm is live-ready for both roles once their exam references are captured; the
performance arm needs (a) real serving confidence and (b) a regressor performance proxy before it
contributes for the budgeter. None of this auto-fires anything — worst case the detector under-claims
(`watch` instead of `stale`), never over-acts.

## Phasing
- **v1 (this slice):** field-output logging + `drift.mjs` (BBSDh G-test, ATC, ECE, two-arm gate,
  sample discipline) + record wiring + tests (synthetic exam-vs-field incl. the exam-vs-exam null).
- **v1.1:** cert-time exam-reference capture (the attended eval) → detector goes live per role.
- **v2:** backend returns per-class softmax → BBSDs (per-dim KS+Bonferroni); C2ST explanation channel
  at high N (contrastive "these inputs are unlike your exam"); deep-kernel MMD (Liu 2020,
  arXiv:2002.09116) on penultimate hidden states; Mandoline slice-reweighting over route/source/length.
