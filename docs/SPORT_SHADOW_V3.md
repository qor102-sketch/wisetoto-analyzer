# Sport shadow v3 — prospective accuracy experiment
Five workstreams, all isolated from official PRE/TOP1 and v2. No new external
requests, paid plan, server functions, or historical prediction rewrite.
Same prospective cohort as v2 (old pilot end to +28 days). If merged after
start, no backfill. Fresh feed only; lock at T-30 to T-10 once per fixture.

1. Lineup: exact sport/league/team/kickoff match to collection ledger, complete
   confirmed starters and timestamp <= quote time. Compare with up to five
   prior verified matches with known lineups; regular starter = at least
   three appearances and 60% of available lineups (min three). Count regulars
   not starting, and known baseball starter change. This does NOT prove
   injury, suspension, player quality or individual contribution. Unknown
   lineups or insufficient historical lineups never become zero changes.
   Player weights, injuries, xG, possession efficiency, bullpen and volleyball
   skill stats are intentionally not fabricated; require audited source data
   and a separately registered experiment.
2. Form: same sport/league exact team identity, prior 120 days, 5/10 latest
   independently VERIFIED scores available strictly before the odds quote;
   60/40 recent-five/ten blend (min five per team). No duplicate identities.
3. Sport models: exploratory soccer independent Poisson score probabilities;
   basketball point margin, baseball run margin and volleyball set margin
   logistic with fixed scales 16/5/2.2. Compare raw model, market favorite and
   fixed 70/30 market/model distribution on identical outcomes.
4. Miss audit: report denominators, hits, misses, and rates for pre-registered
   cohorts (lineup unknown, rotation unknown/changed, market disagreement,
   low confidence, fewer than ten matches). Not causal explanations.
5. TOP1: experimental only, require same favorite, mixed >=60%, >=1 point
   above market and known rotation with <=1 regular missing per side and
   no known changed starting pitcher. First qualifying scan per KST kickoff
   day, deterministic tie-break. No retrospective replacement; no pick if
   none qualify. This stringent gate may produce few or zero picks.

The additive sportShadow report contains overall/by-sport metrics, matched
market on the exact selected cohort, Wilson 90% interval, multiclass Brier,
log loss, historical unit ROI and coverage. Public JSON only; no dashboard
UI changes yet. No claim of accuracy improvement until new graded samples
(target >=100 per arm), day clustering/uncertainty and independent review.
No official promotion or automatic threshold tuning.
