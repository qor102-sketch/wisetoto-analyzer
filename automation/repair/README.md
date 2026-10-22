# V13.12.32 OOS Safe Auto Repair

The workflow **Wisetoto OOS safe auto-repair** starts when the main-branch
auto PRE/postmatch workflow completes successfully.

## Stages

1. Download the source run's immutable frozen tracker and audit result.
2. Inspect only newly VERIFIED fixtures. A HIT or MISS alone is *not* a bug.
3. Independently compare full-time 3-way handicaps and explicit total-goal
   lines with verified scores. Record data coverage, identity and prekickoff
   timestamp defects separately.
4. With GitHub Models (models:read permission), perform cautious Korean
   postmatch analysis with hypotheses explicitly separated from verified
   facts. Deterministic analysis remains available if AI is unavailable.
5. For independently reproduced settlement mismatches only, ask the model
   for an exact localized source change. Guarded allowlist: existing
   settlement functions in the dashboard code, no model parameters.
6. Run unit regression, Next.js production build, and Chromium smoke.
7. Open a **DRAFT** pull request. Poll GitHub deployment status to confirm
   a Vercel Preview for that exact commit; probe Preview dashboard/API.
8. Owner must review the evidence, reproduced issue, CI, Preview and
   explicitly approve merging. Nothing in the workflow merges to main.

Source/grade issues with incomplete evidence generate review issues instead
of guessed fixes. No past frozen PRE probabilities, lambda, timestamps,
TOP1 or snapshots are ever rewritten. No outcome-fitted weight changes.

## Operator checklist

- GitHub Settings > Actions > General > Workflow permissions must allow
  GitHub Actions to create pull requests for automatic draft creation.
- GitHub Models must be available to the repository/account. The workflow
  uses the built-in token with models:read; no extra API key is assumed.
  If unavailable, only deterministic diagnostics run.
- A bot-created PR may require a human to approve its PR Actions checks.
- Existing GitHub→Vercel integration must publish deployment status.
  If Preview is unavailable or protection blocks testing, the PR remains
  Draft with PREVIEW_NOT_CONFIRMED. Never report this as success.
- Saved reports are in the wisetoto-safe-repair-audit Actions artifact,
  retained for 90 days.
- Manual workflow_dispatch accepts a prior trusted successful source run ID.

## Human approval checklist

- Verify original home/away league and actual final score
- Verify original Betman line, market type and settlement rules
- Verify an old-code regression fails and the proposed patch fixes it
- Verify frozen PRE, lambda/Poisson, TOP1 and saved timestamps stay unchanged
- Verify unit/build/Chromium and Vercel Preview API for the candidate commit
- Review the draft PR and manually merge only if all of the above pass

**Never auto-merge or release a model change from a single game result.**
