# Hobby monthly-free operation: public dashboard off Vercel Functions

**Scope:** reduce billed provisioned-memory runtime on the public
\`/automation\` dashboard. Do **not** change automatic data collection,
official source verification, NBA exclusion, PRE/TOP1 decisions or the
immutable 28-day study.

## Why

As of November 2026, the Hobby allowance for Fluid Provisioned Memory is
**360 GB-hours/month**. The account was granted one 30-day exception at
3× that allowance. This does not permanently change Hobby limits.
Provisioned memory accrues while functions wait for upstream I/O; even a
mostly idle fetch to GitHub RAW reserves instance memory. Without changes,
the account can be paused again once the one-time exception expires.

## New public-data architecture

\`\`\`
GitHub Actions (existing scans, independent official grading, frozen PRE/TOP1)
                 |
                 v
GitHub automation-data branch --sanitized JSON projections only
                 |
                 v
Vercel CDN external-origin rewrites, TTL 90s + stale 90s
 /public-data/automation-history.json
 /public-data/automation-health.json
 /public-data/collect-first-public.json
 /public-data/research-public.json
                 |
                 v
React /automation dashboard: browser fetch, four parallel read-only sources
\`\`\`

The four **explicit allowlisted** URL rewrites live in
\`WisetotoAnalyzer-LiveFree/vercel.json\`. They use Vercel's external-origin
CDN path, not a Next.js Serverless Function. Do not replace them with
\`/api/...\` proxy functions or introduce per-request timestamp query strings.

Headers on \`/public-data/:path*\` enable caching on Vercel projects
created before its external-origin caching default changed. Browser cache
is 45s; Vercel edge cache is 90s with 90s stale-while-revalidate.
The underlying GitHub RAW cache may add some propagation delay. The UI
continues to show last scan time and stale-health warnings; delayed or
missing data is **not** a reason to infer verified results.

Three old \`/api/automation/results|collection|research\` routes remain
**read-only compatibility fallbacks**. The UI only calls a fallback if the
respective CDN route fails or has an invalid schema. Those legacy responses
now have 90s shared cache and bounded 2-minute upstream refresh keys.
They can still consume Vercel memory during an outage; if this becomes
frequent, diagnose the rewrite instead of increasing invocation frequency.
The health projection has no legacy function fallback.

## Verify before merging and after deploying

1. Pull-request CI: \`node --test automation/research/public-dashboard-cdn.test.mjs\`
   checks routes, caching opt-in, schema rejection, unique source IDs, and
   zero legacy calls on successful CDN responses. The regular unit test suite,
   Next.js build, TypeScript and browser smoke must also pass.
2. Preview: open \`/automation\`, inspect browser Network. The four
   \`/public-data/*.json\` requests should be **200** and contain matching
   public \`schema\` fields. In the healthy path there should be **no**
   \`/api/automation/results\`, \`collection\`, or \`research\` requests.
   The published timestamps must match actual Github Actions records.
3. In the Vercel Usage dashboard compare **Fluid Provisioned Memory
   GB-hours per day** before/after at similar traffic and check by
   function/route. This PR reduces dashboard-triggered function calls, but
   cannot guarantee free usage if other live routes remain expensive.
4. On Hobby, a sustainable target is below
   \`360 / billing_cycle_days\` GB-hours per day averaged across the team
   (**about 12 GB-hours/day on a 30-day cycle**); use lower internal
   thresholds and allow for traffic spikes. A temporary 3× allowance is not
   a safe future budget.
5. Confirm GitHub Actions \`automation-data\` publication still updates
   independently of Vercel, and there are no changes to pregame odds,
   \`VERIFIED\` rules, the pilot snapshot, or NBA policy.

## Recovery and longer-term zero-function dashboard

If Vercel is paused again despite this reduction, GitHub Actions
collection and verification continue independently, but **the Vercel
domain can stop serving the interface**. For a static-only dashboard,
create a separate Cloudflare Pages (or eligible GitHub Pages) site and
host a built static frontend that reads the same public projections.
A full static export of the *existing entire* Next.js app is **not**
compatible with its several live \`/api/match\`, \`/api/naver\`, and
\`/api/fixture\` routes. Do not set \`output:"export"\` on the current
Next app or put private API tokens into browser code.

The appropriate second phase, if measured memory stays too high, is to
move the dynamic analysis functions to a separately budgeted/free-cap
service with documented request limits, or provide a static read-only
alternative. A fully live API cannot be guaranteed unlimited free hosting
without measuring usage and respecting each provider's terms.

## Rollback

Revert the dashboard reader and the four explicit \`vercel.json\`
rewrites to restore the legacy read-only endpoints. Do **not** roll
back the separate GitHub Actions source-verification fixes or mutate
\`automation-data\`/PRE/TOP1. Never merge this cost-control PR to
Production without approval.
