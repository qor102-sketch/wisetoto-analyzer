# API-Football fixture matching diagnostics (free-tier safe)

## Why this exists
A successful HTTP response means that fixture data arrived, not that the
original Betman game was verified. We must distinguish an unavailable
competition, a translated team name, a kickoff mismatch, and a match that is
not officially FT. No fuzzy matching, time shifting, forced result or PRE
backfill is allowed to turn a diagnostic into verified evidence.

## How to inspect
1. Go to GitHub Actions for **Wisetoto auto PRE and postmatch verification**,
   select a completed main-branch `auto-audit` job, and search the job log
   for `API_FOOTBALL_MATCH_DIAGNOSTICS`.
2. `reasonCounts` gives all analyzed failures in this run, grouped by a
   stable code. `samples` contains up to **6** bounded examples with
   `kind` (PRE/FINAL), `stage`, `expected` Betman league/home/away,
   `candidate` official league/country/teams/ID/status, and
   `kickoffDeltaMinutes`. A sample is **not** matched evidence or a
   substitute for the original provider fixture ID.
3. The public `collect-first-public.json` operational report stores only
   `latest.final.apiFootballDiagnosed` and
   `latest.final.apiFootballReasonCounts`; it never publishes raw team
   comparison examples. Recent scans are visible in the same report.

## Failure categories
- `API_FOOTBALL_LEAGUE_NOT_FOUND`: no valid source league matches and no
  competing league holds an exactly identified same-time team pair
- `API_FOOTBALL_LEAGUE_MISMATCH`: both teams and time match but the official
  competition/country label does not
- `API_FOOTBALL_KICKOFF_MISMATCH`: official league and both teams agree, but
  the source kickoff differs by more than the strict 45-minute tolerance;
  the minute difference is **diagnostic only**, never auto-applied
- `API_FOOTBALL_NO_KICKOFF_CANDIDATE`: official league exists, but the
  exact team pair does not appear near the original kickoff
- `API_FOOTBALL_HOME_TEAM_MISMATCH`,
  `API_FOOTBALL_AWAY_TEAM_MISMATCH`,
  `API_FOOTBALL_BOTH_TEAMS_MISMATCH`: one or both original team names do
  not match source teams at the same league and kickoff
- `API_FOOTBALL_AMBIGUOUS_FIXTURE`, `DUPLICATE_FIXTURE`,
  `INVALID_SOURCE_IDS`: no uniquely identified real source fixture
- `API_FOOTBALL_NOT_REGULATION_FINAL`: provider status is NS, HT, LIVE,
  postponed, AET, PEN or another state, not an explicit regulation FT;
  source status is recorded, but no result is confirmed
- `API_FOOTBALL_FINAL_SCORE_UNCONFIRMED`: full-time and goals do not agree,
  score is missing, invalid or implausible
- `API_FOOTBALL_LINEUP_*`: genuine PRE player and team ID validation failed,
  including unpublished 11+11 starters
- `API_FOOTBALL_HTTP_*`, `NETWORK`, `LOCAL_QUOTA_BLOCK`,
  `RETRY_COOLDOWN`: transport, quota or guarded retry failure, not an
  identity mismatch.

## Safeguards
- Diagnostics reuse the existing API responses and never issue requests,
  adjust quota limits or extend retries. Free-tier hard ceilings remain
  **60 requests per UTC day** and **3 per scan**.
- Raw JSON, API keys, request headers, auth tokens, full lineups, betting
  odds and frozen picks are never logged in diagnostic output.
- Source strings are stripped of control characters and truncated to 52
  characters. Only six samples per scan are included in GitHub log output.
- Public history exposes **counts by stable reason codes only**, not raw
  expected or candidate team names.
- Existing verified FINAL, original Betman IDs, PRE/TOP1 and NBA rules are
  unchanged. A failed exact match remains PENDING/UNAVAILABLE.
- Do not add an unreviewed Korean-English alias solely from a diagnostic
  example. Require separately corroborated official team identity first.

No Vercel billable runtime, paid API account or new storage is required.
