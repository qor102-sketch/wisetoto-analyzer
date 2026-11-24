# Prospective accuracy shadow v2

Research only. Existing 28-day pilot and official PRE/TOP1 remain unchanged.
The new fixed 28-day cohort starts at the old pilot's exact end, not the PR
date. First valid fresh 2% market-shift observation during the cohort is
locked once per fixture at least 10 minutes before kickoff. No retrospective
decisions, no outcome-derived selection, no extra external requests. A late
deployment leaves missed observations missing.

A: market probability for the locked candidate; B: 4% shift subset;
C: same-side experimental sport/near-probability calibration (prior pilot only,
>=20 verified prior candidates, +/-0.15 probability band, 20 market pseudo
observations), with 80:20 and 60:40 market/model blends. These are binary
calibration comparisons, not new multiclass pick generators. D: NO_PICK
unless the 60:40 estimate is >=0.60 and exceeds the market by 2 or 4 points.
These thresholds are pre-registered exploratory hypotheses, not evidence of
a profitable strategy. No sport is excluded based on the old small samples;
NBA exclusion remains. Lineup-conditioned experiments remain a separate
follow-up until timestamped pregame provenance is available to this lane.

Public research JSON gains an additive accuracyShadow object: overall and
sport-level graded n, hits, Wilson 90% interval, Brier, log loss, unit ROI,
selection coverage relative to A, and matched-market metrics on identical
selected rows. Pending fixtures are not scored. All selection decisions
are frozen before kickoff; later independently verified truth is used only
to score. No automatic promotion, even if the experimental metrics improve.
Require a separate review with adequate new samples (target >=100 per arm),
uncertainty/day-clustering and coverage analysis before any official change.
No extra Vercel functions or paid APIs. Existing research archive retains the
additional fixture field; no historical state migration or rewrite required.
