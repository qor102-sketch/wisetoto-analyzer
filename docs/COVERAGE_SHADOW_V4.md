# Coverage and calibration shadow V4
Separate fresh experiment; starts at first actual scan after deployment and ends at existing V2/V3 end. No backfill. V2/V3, official PRE/TOP1 and historical records unchanged.
- Existing verified ledger indexed by exact sport/league/team, 120-day history. Reject duplicate identities, unverified or future outcomes. Allow three prior results per team with at least ten league matches; shrink recent 5/10 means toward league average (five pseudo games), weights 60/40. No cross-competition matching or new source acquisition.
- Wait until T-20 if lineup unknown; lock T-30..T-10 with a fresh quote <=5min. Lineup must precede actual decision; compare latest prior confirmed lineup, 80% continuity experimental gate. No injury or player quality inference.
- Compare market, raw form, fixed 90/10 and 80/20 market/model mixtures, 55% and 60% agreement gates, known-lineup and continuity subsets. No threshold tuning during evaluation.
- Publish same-fixture market, paired Brier and hit differences, rejected subset market, sample counts, coverage, Wilson 90% intervals, and sport-specific audit cohorts. Overlapping associations, not causal findings. No auto promotion, extra API or Vercel calls.
- New verified historical sources, non-soccer lineups and UI remain separate tasks. Sparse-model coverage and late-lineup changes are hypotheses, not guaranteed gains.
