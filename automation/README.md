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
