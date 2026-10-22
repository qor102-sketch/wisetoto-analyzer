# Unattended PRE → result verification

This workflow calls the original production browser engine, not a shadow model.

- GitHub Actions checks Betman offers twice per hour.
- Chromium runs only for matches 10–100 minutes before kickoff or pending
  result validation more than 2 hours after kickoff.
- First PRE is frozen, and postmatch verification cannot change predictions.
- Source-quality and grade anomalies become GitHub Issues to review.
- There is NO automatic lambda tuning, code modification or main merge.

The user's browser localStorage is unavailable to GitHub Actions. Scheduled
runs maintain their own independent tracker in GitHub Actions artifacts.
Artifacts expire after 90 days; archive them for permanent backtests.
Scheduled GitHub jobs are not precise and may be delayed or skipped. Do not
backdate any missed PRE.


## V13.12.29 — public site results

- Dashboard: `https://wisetoto-analyzer.vercel.app/automation`.
- App API: `/api/automation/results` (read-only, no GitHub credentials).
- Automatic workflow publishes **only projected, non-sensitive records** to
  `automation-data:automation-history.json` (public branch). Full detailed
  automated PRE data still lives in private-to-automation Actions artifacts.
- This publishing step runs only after real headless-browser analysis or
  postmatch verification; during quiet periods, dashboard correctly shows
  the timestamp of the last completed run.
- Initial public records were seeded from the first *actual* successful run.
- The dashboard never merges into your browser's manual LIVE TRACKER.
- Only Actions' `main` workflow writes the data branch; site viewers can
  fetch it, but cannot mutate forecasts.
- **Caution:** GitHub branch history is durable but public. It contains
  fixture/pick summaries, not authentication tokens or raw localStorage.


## V13.12.31 — every ten minutes, all supported sports

- GitHub Actions cron: `3,13,23,33,43,53 * * * *` UTC (every 10 minutes,
  six times per hour, best effort; GitHub can delay or drop scheduled jobs).
- Each pass reads Betman's **entire** released game list and independently
  inspects football/soccer, basketball, baseball and volleyball; it does
  **not** follow the interactive page's single-sport filter.
- Candidates need real teams, actual decimal odds, 10–100 minutes before
  kickoff and no already-frozen pregame tracker record.
- Preflight logs the per-sport total and due counts even when no browser
  analysis is required. The automation bridge exposes live due counts per
  sport for browser regression checks.
- Analyze up to 24 upcoming fixtures per browser run, earliest kickoff
  first. Anything remaining is picked up at the **next** scheduled scan
  if still before kickoff. It is never backdated after kickoff.
- Betman may not publish some competitions or prices. Such unavailable
  fixtures are not fabricated or counted as captured predictions.
- Each run remains single-flight via Actions concurrency group to protect
  the immutable PRE archive. OOS result verification and public site
  `/automation` remain unchanged.
- New sports not supported by the prediction engine are excluded until
  the engine has verified identity/data handling.
