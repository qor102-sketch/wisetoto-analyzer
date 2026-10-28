# Pregame evidence → experimental TOP1 (v1)

**Research lane, not a rewrite of LIVE TRACKER.** Never change prior PRE records, probabilities, lambda, Poisson or existing official picks. Never create a TOP1 after kickoff.

## Why
Chromium-heavy analysis times out on busy matchdays. This lightweight Node lane collects real Betman odds for all four supported sports **before** the expensive browser job, so its source observations persist even when the browser fails. Snapshot collection uses only already-fetched, valid, ≤5-minute-old official offers.

## Pipeline
1. At each existing approximately 10-minute GitHub scan, restore the gzipped `research-state.json.gz` archive from the `automation-data` branch.
2. Identify each offered match by sport + actual startMs + normalized home and away teams. Only observe fixtures more than **10 minutes before kickoff** and no more than 7 days ahead.
3. Support **ordinary full-time moneyline only**. For soccer this is 1X2, for basketball/baseball/volleyball ordinary 2-way. Exclude handicap, total, SUM, 5-point/1-point specials, malformed sides and invalid overround. Do not falsely treat market implied probability as a model prediction.
4. Retain each authentic price snapshot with source-fetch timestamp at most every 30 minutes, max 24 snapshots per match, bounded rolling 120-day/800-fixture archive. A two-snapshot, ≥30-min, ≥2-percentage-point movement can create **WATCH** observation, not a betting recommendation.
5. Link **only independently VERIFIED final scores** with exact fixture identity and pre-kickoff locked provenance. Archive research direction before kickoff. Train a separate per-sport/probability-bin posterior on **previous** frozen research candidates only. Require ≥40 prior verified fixtures in the bin, use 40 pseudo-observations at the current market's no-vig baseline and a 90% one-sided conservative confidence bound. Experimental `RESEARCH_TOP1` requires conservative expected value above +3%; otherwise HOLD/WATCH.
6. Publish compressed `research-state.json.gz` and sanitized `research-public.json` separately from automation-history, plus a read-only `/api/automation/research` and visual section under `/automation`. The comparison probabilities are **bookmaker-market-normalized**, not independently validated win odds. Never merge research with the official TOP1.
7. New data stops at kickoff. Known future results cannot update prior direction; result settlement remains a later, separate stage.

## Caveats
- It will initially show **COLLECTING / HOLD / WATCH**, **not guaranteed live RESEARCH_TOP1**. A minimum statistical history has to accrue first. The probability calibration is an experimental approximation and its confidence bound is not a proof of profit.
- Market odds from a single bookmaker and biased coverage of independently verified results limit predictive power; later perform strictly time-ordered, league-aware calibration and out-of-sample reliability analysis before considering any official recommendation.
- No paid database or API. A gzip-compressed GitHub branch file avoids Contents API size problems and repeated 90-day Actions artifact storage; the Actions workflow and original production engine remain unchanged until approved.
- Data-only `automation-data` branch must have Vercel deploys disabled first (dependent PR #34) to prevent exceeding the Hobby deployment quota.
- This PR is **dependent on** PR #34; neither should be merged/deployed automatically or without owner approval.
