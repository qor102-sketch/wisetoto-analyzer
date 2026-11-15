# Naver PRE lineup: cross-scan outage circuit (Issue #59)

## Why this change
Vercel Hobby Production logs showed recurring 300-second /api/naver/lineup timeouts,
often two roughly every ten minutes. The GitHub Actions pregame collector invokes
the Vercel route with an 11-second *client* abort; that does not prove the server
function stops running. Previous per-scan naverFailures >= 2 state reset with
each GitHub Actions scan, causing repeated calls during a provider outage.

## Safety constraints
This PR changes only the GitHub Actions PRE lineup fallback caller.
It does **not** change the /api/naver/lineup server (separate Draft PR #60),
football/baseball fixture validation, official result settlement, frozen PRE/TOP1,
NBA collection exclusion or the 28-day research.
A failed or skipped Naver call never confirms an XI or fixture identity;
pre-existing partial/CONFIRMED records remain protected. Independent ESPN
and official postmatch requests are not blocked.

## Mechanism
- The existing compressed \`automation-data/collect-first-state.json.gz\`
  is restored *before* each scan and atomically published via the existing
  fail-closed GitHub workflow. A small \`naverLineupCircuit\` field rides
  alongside the same unchanged ledger schema; no new storage or paid service.
- Categorize failures by Naver provider type (K/J/other football;
  KBO/NPB/MLB/other baseball), not fixture ID. A league failure cannot
  disable NBA/ESPN, postmatch official scores or unrelated provider groups.
- Two consecutive transient network/HTTP 429/5xx failures inside 30 minutes
  open a **60-minute** category cooldown. Later scans skip that Naver
  call *without recording a fabricated provider attempt*.
- After cooldown, attempt **one recovery probe per category per scan**.
  A further transient failure reopens the cooldown, even if the previous
  failure was over 30 minutes ago. A genuine source response closes it.
- For a real fixture within 15 minutes of kickoff, an exceptional
  recovery check is allowed only after at least **30 minutes** without
  a probe in that category, and still at most once per scan.
- An HTTP 404 with nonempty resolver attempts where *every* upstream
  status is null/zero means the upstream is unavailable, rather than a
  genuine exact-identity mismatch; count this as a transient failure.
  A true no-match HTTP 404 does not trigger the outage circuit.
- Invalid stored counters and entries older than 24 hours expire.
  State is bounded to seven known provider groups.

## Verification
\`node --test automation/research/naver-lineup-circuit.test.mjs\` includes
persistent JSON round-trips across simulated ten-minute scans, no calls
during cooldown, a single expired recovery, failed probe re-opening,
healthy provider isolation, source-down HTTP 404 detection, urgent timing,
and corrupt/expired state recovery. The full immutable-record test,
type/build, and browser smoke suites must pass on the Draft PR.

## Measurement / rollout
The circuit saves attempted Naver *caller volume* during an outage.
It does not by itself cap **remaining** Vercel server invocations; that is
the separate bounded-runtime Draft PR #60. In particular, an 11-second
client timeout need not stop a server function that is already running.

After separately approved Production deployment, compare (a) Naver call
attempts, transient failures, skipped calls and recovery probes in
\`PREGAME_LINEUP_AUDIT\`; (b) \`/api/naver/lineup\` 300-second timeouts,
(c) confirmed PRE XI coverage and source recovery, and (d) Hobby team
Fluid Provisioned Memory usage over comparable days and traffic.
The 360 GB-hour monthly quota implies a rough 12 GB-hour/day *team-wide*
target over 30 days. Neither tests nor estimated call reductions are a
measurement of actual GB-hour savings or a promise of perpetual free use.

## Rollback
Revert this Draft PR only; the existing ledger continues to load because
the new field is optional and extra fields are ignored by previous code.
Never delete the source ledger or immutable records to reset this circuit.
