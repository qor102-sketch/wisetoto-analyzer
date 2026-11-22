# Prospective accuracy and calibration research plan — 2026-11-22

## Why not rewrite the existing official TOP1 now?
The frozen 28-day pilot began 2026-10-28 and is scheduled to finish on
2026-11-25 (09:51 KST). At the last inspected report (Nov 22 09:24 KST):
- 153 **graded** decisions, 81 correct / 72 incorrect, 52.94% hit rate.
- -15.95 stake units and -10.42% historical unit ROI (no indication of
  future returns).
- Walk-forward model Brier 0.2236 versus market Brier 0.2164: **no proven
  improvement over the market**.
- Soccer 64/119 hit; volleyball 12/15; basketball 4/17; baseball 1/2.
  These sport cohorts are small and highly uncertain; volleyball's 80%
  on 15 decisions must not be projected as a reliable future rate.
- Existing strong-shift 4% candidate 34/62, ROI -12.35%; also not an
  evidence-based recommendation to switch now.
Never revise historical picks, their timestamps, recorded odds or original
PRE lineup. Do not grade result-only or pending matches as predictions.

## First: restore coverage without distorting outcomes
1. Treat API-Sports HTTP 200 with a populated `errors.plan` or
   `errors.access` as a failed entitlement check, not a successful result.
   The free plan is not assumed to include current-season fixture access.
   Observe bounded 24h cooling to avoid wasting 60/day free API requests.
2. Use scarce scan capacity on independent ESPN and audited official
   sources when Naver is disabled. A provider's `FT` and both official
   teams/fixture kickoff/source ID must agree before verifying.
3. Track **verified results with genuine PRE captured before kickoff**,
   number of overdue unresolved matches, coverage by league, source
   mismatch reasons and runtime duration. Source reliability is not
   a prediction win.

## Pre-register separate shadow alternatives for the *next* validation period
Run candidates in parallel on future fixtures only. Freeze their rules
*before* those kickoffs. Use identical chronological slices and the same
time-stamped pregame data as the incumbent baseline.

- **Market-anchored probability calibration**: compare incumbent model
  with 80% / 20% and 60% / 40% market/model convex mixes; weights are
  fixed in advance and must not be optimized on evaluation days. Recompute
  predicted outcome from the calibrated probabilities using only odds
  actually available at decision time.
- **Abstention/coverage control**: test a fixed minimum margin from
  pregame market probability (2 percentage points and 4 percentage points
  are pre-registered). Return `NO_PICK` below the threshold rather
  than changing a recorded bet. Report decisions covered and their
  baseline-matched hit rate: filtering easy favorites inflates hit rate
  superficially and does not prove monetary edge.
- **Data-confidence gate**: optionally require a trustworthy fixture ID,
  pre-kickoff odds timestamp and independently confirmed lineups when the
  lineup was truly published before kickoff. Treat unavailable lineups as
  a separate cohort; do NOT backfill final/late lineups as PRE.
- **Sport-level check**: compare soccer, volleyball, KBL and baseball
  separately, but never claim the observed 12/15 volleyball record
  establishes a reliable permanent edge, or delete already frozen
  mistakes from the baseline.

## Success gate
For every candidate, publish **raw graded n, hit rate, 90% confidence
interval, unit ROI, Brier, log loss, and selection coverage**, and compare
against the market-only and incumbent baselines on the *same* matches.
Require a fresh, time-ordered prospective holdout with sufficient graded
samples (target >=100 per proposal, no selective historical backfill).
Use cluster/bootstrap intervals by calendar day where feasible, and
correct interpretation for multiple candidate comparisons.
Only consider an official strategy revision after statistically credible
out-of-sample improvement in calibration AND practical ROI, without
unacceptable coverage loss. Any revision requires a new reviewed PR and
a new separately time-stamped pilot. Never promise a guaranteed hit-rate gain.

## Important separation
This research plan does **not** change the live model, picks, odds,
frozen PRE/TOP1, original IDs, historical outcomes or billing.
The API access fix and provider-backed backlog scheduling are operational
reliability improvements only, not backtested prediction improvements.
