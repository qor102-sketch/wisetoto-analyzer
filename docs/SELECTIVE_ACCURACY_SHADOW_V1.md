# Selective accuracy v1 — next 28-day prospective shadow

## Scope and fixed clock
The existing first 28-day Wisetoto research pilot starts at
`state.pilot.startedAt` and continues unchanged until
`pilot.startedAt + 28 * 86,400,000ms`. This implementation is a **separate
research-only shadow**, scheduled to start exactly at that end timestamp
(**2026-11-25 09:51 KST**, subject to the stored original pilot clock).
It runs for the subsequent 28 days. It does not backfill predictions from
the earlier pilot or silently revise any prior TOP1, odds or results.

For every valid real fixture it accepts only pre-kickoff two-snapshot
moneyline evidence that was already collected at least 30 minutes apart.
It requires a **fresh actual snapshot**, a safe market hold and a
timestamp before kickoff. Decisions are frozen individually at their FIRST
qualifying fresh observation, not after results arrive. Every strategy
has an independent first-qualifying timestamp; a later larger shift can
start Strategy B, but may never replace an already frozen Strategy A.
NBA remains excluded.

## Fixed strategies (no tuning on the 2026 pilot)
| ID | Ex-ante condition | Prediction status |
|---|---|---|
| BASE_2P | First genuine selected-market shift >=2 percentage points | PICK |
| STRONG_4P | First selected-market shift >=4 percentage points | PICK / otherwise NO_PICK |
| SELECTIVE_4P | Shift >=4pp, verified Betman normal moneyline hold <=8%, selected side's no-vig p >=55% | PICK / otherwise NO_PICK |
| BLEND_80_20 | 80% current no-vig selected-side market p + 20% shrinkage estimate from **previously verified** same-sport, similar-probability historical selected sides. Require >=20 prior results, p>=50%, forecast p minus raw 1/odds >=2pp | PICK or NO_PICK forecast; otherwise insufficient prior |
| BLEND_60_40 | Same model, market 60% + prior empirical shrinkage 40%, identical gates | PICK or NO_PICK forecast; otherwise insufficient prior |

The empirical shrinkage estimate is:
`(historic wins + 40 * current market p)/(historic count + 40)`;
previous outcomes must have been verified **before** the current frozen
observation and their own selections frozen before their kickoffs.
This is a **simple historical calibration hypothesis**, NOT an independent
validated winning probability. C strategies can generate no predictions
if they cannot demonstrate data readiness. Do not substitute
post-kickoff starters or results for model inputs.

The selection strategy is designed to abstain; a higher hit rate caused
by choosing fewer large favorites is not by itself an improvement in value.

## Truth, evaluation and sample integrity
Original outcome truth may be used only **after** an independently verified
final score, for scoring an already-frozen selection. No result-only or
untrained record is used for apparent accuracy. No fixture is included
before its actual final is verifiably settled. A NO_PICK is NOT a loss,
win or placed wager.

For each strategy and sport the public projection reports:
- selected, settled, hits, misses, hit rate, Wilson 90% two-sided interval
- one-unit ROI and unit profit at the original frozen pregame odds
- selected-side **binary** Brier and binary log loss, compared with
  the original same-time no-vig market forecast on identical selections
- selection coverage among graded **first-baseline eligible** fixtures
- **paired** original BASE_2P hit rate and ROI on exactly those fixtures
  that each new strategy selected (not full-cohort comparisons)
- C-forecast Brier vs same-time market Brier, including frozen
  forecast-only (NO_PICK) comparisons.

The view is read-only under the existing /automation dashboard;
`research-public.json.accuracyShadow` includes up to eight future
frozen selections with the other strategies visibly NO_PICK.
It never turns those research observations into official TOP1 picks.

## Promotion gate
Minimum **100 genuinely new graded picks for a candidate**, simultaneous
market/baseline comparisons on the same time-ordered cohort, credible
calibration improvement and practical ROI without unacceptable coverage
loss. With multiple candidate strategies, require independent review and
uncertainty analysis rather than selecting the luckiest sample.
Automatic promotion is **disabled** (`canPromote:false`) even when a
short-term score looks promising.

## Operational safeguards
- No new provider calls, GitHub cron jobs, paid storage or Vercel functions.
- The current research-state.json.gz archive carries the tiny frozen
  `accuracyShadowV1` field per fixture, and the current public projection
  adds a separate accuracyShadow report; existing state schema and
  first-pilot report are unchanged.
- All old NBA exclusions, score verification, market/odds validation,
  original PRE and existing official LIVE TRACKER TOP1 stay unchanged.
- No retrospective changes to observed probabilities, model outputs,
  original odds, results or previous research pilot statistics.
