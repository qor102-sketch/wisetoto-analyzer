# Naver lineup read-only function budget (Issue #59)

The old \`/api/naver/lineup\` route waited on several Naver, NPB, MLB and
official-football upstreams without consistent time limits. A historic Vercel
runtime error group recorded 31 invocations reaching 300 seconds; this does
not establish the request rate or billable GB-hours.

## Scope of the separate change

- \`route.ts\` sets a 50-second Vercel \`maxDuration\` (below the Hobby Fluid
  300-second default), with an independent 40-second cooperative total budget.
- Existing upstream \`fetch()\` call sites now resolve to one imported
  request-scoped adapter. Each fetch is limited to 8 seconds or the remaining
  total time, whichever is shorter. Smaller source-specific timeouts win.
- Node \`AsyncLocalStorage\` isolates budgets from parallel users; already
  aborted client requests cannot start new upstream work.
- If the overall deadline expires, return explicit HTTP 504 and
  \`LINEUP_BUDGET_EXCEEDED\` with \`Cache-Control: no-store\`, never a
  fabricated verified XI or a successful response with missing evidence.
- All original sport, league, fixture identity, source verification,
  existing field extraction and model inputs remain unchanged.
  GitHub Actions collection, NBA exclusion, immutable PRE/TOP1 and
  28-day pilot data are not touched.

## Testing and deployment gate

1. Run \`node --test automation/research/naver-lineup-budget.test.mjs\`.
   This checks successful fast reads, upstream/source-specific cancellations,
   concurrent isolation, client disconnects and fail-closed 504 responses.
2. Run the regular repository CI: unit tests, TypeScript/build and browser smoke.
3. On Vercel Preview test representative KBO, NPB, MLB, domestic football
   and basketball fixtures with real identities (not generated fixture IDs).
   Confirm normal fast responses still retain the original source evidence.
   Slow/blocked upstreams must return an explicit unavailable status rather
   than inventing starters.
4. After **separately approved** Production deployment, compare the
   \`/api/naver/lineup\` timeout count and billed Fluid Provisioned Memory
   GB-hours with comparable traffic. A code cap does not establish actual
   GB-hour savings or guarantee indefinite Hobby eligibility.

The cap intentionally trades some unusually slow sources for a bounded,
explicit unavailable response. Do not broaden cache TTL for current game
lineups or backfill post-kickoff PRE/TOP1 from later evidence.

## Rollback

Revert only this PR's import, route deadline and budget helper. Preserve
separately shipped CDN dashboard and independent official-final repairs.
