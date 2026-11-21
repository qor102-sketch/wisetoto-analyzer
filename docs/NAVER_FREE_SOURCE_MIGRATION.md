# Naver-independent read-only PRE + final collection

## Scope
GitHub Actions run-collect-first.mjs controls pregame and postmatch evidence. Its
workflow explicitly sets NAVER_PROVIDER_MODE=disabled. The scheduled collector
will not call Naver for soccer/baseball lineup, soccer/basketball/baseball
finals or volleyball finals. Existing Naver API routes remain for unrelated
client use and an explicit legacy rollback. No verified result or frozen
PRE/TOP1 is cleared or rewritten. ESPN and all independent official leagues
remain available.

## J1 / J2 official starting XI
- Use real official daily schedules at /en/j1/match/search-list/ and
  /en/j2/match/search-list/. Accept one provider match only with league,
  both sides, JST day/kickoff, numeric official match ID and full detail link.
- Fetch that exact official lineup page only before kickoff. Never invent
  an ID or backfill a postkickoff lineup as PRE.
- Accept exactly 11 named unique starting players per side (one GK each).
  Missing markup, ambiguity and late responses fail closed.
- Existing ESPN pregame XI can still work independently.

## Optional API-Football v3
The provider publishes a free 100 requests/day, 10 requests/minute tier.
This implementation is intentionally tighter: 60 requests per UTC day, at
most 3 per scan; 20-minute shared-day fixture cooldown and 15-minute
per-ID lineup cooldown. Request counters persist alongside the existing
compressed collection ledger. Requests run on GitHub, not Vercel.

To enable:
1. Create a free account at https://dashboard.api-football.com/ and check
   2026 fixture and lineup coverage on the free plan.
2. Store the API key in the GitHub Actions repository secret
   API_FOOTBALL_KEY. Do not paste the key into code, PR, chat or logs.
3. The scheduled scan automatically detects the secret. Without it the API
   is disabled, never simulated. The token is never saved in ledger state.

Validation requires competition/country, both teams, one numeric match ID,
and kickoff within 45 minutes. Postmatch must show explicit FT and identical
plausible fulltime/goals for a 90-minute regulation game. Pregame lineup must
have correct independent team IDs and 11+11 distinct starting player IDs
and names, captured strictly before kickoff.

## Testing and rollout
- Pure Node unit tests cover identities, spoofed leagues, score state,
  rejected late PRE, missing starters, URL provenance and free quota.
- The PR smoke workflow runs a read-only official J1/J2 historical page
  probe, reporting markup support but never persisting historical PRE.
- All PRE/TOP1, original Betman IDs and 28-day research remain unchanged.
- Track source-confirmed coverage, remaining PENDING, API request counts
  and Vercel Fluid Provisioned Memory after any approved Production rollout.
- This PR is Draft pending real-source format validation, green CI and
  explicit Production approval; no billing upgrade or new storage.
