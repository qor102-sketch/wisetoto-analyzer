# Betman 502 relay incident runbook

## Verified incident, 2026-10-31 KST

The deployed `/api/betman` route returned 502. Its configured primary relay
returned HTTP 502 with an empty body. The legacy Cloudflare ephemeral URL was
unreachable in a Preview probe; the Betman public homepage also did not return
within the bounded timeout. **This is a relay/tunnel connectivity failure, not
a Betman odds parser bug.** GitHub runner retries cannot restart a remote
machine or public tunnel.

## Safe recovery (relay operator)

1. Inspect the actual machine hosting the already configured Betman relay:
   verify the local service is running and responds at its bound `/betman`
   endpoint with current, real Betman JSON `{ "ok": true, "data": ... }`.
   Do not use cached fixture snapshots as a substitute.
2. If using a Tailscale Funnel/public relay, inspect its service and tunnel
   status and routing, then restart the **authorized** service/tunnel as
   appropriate. A 502 from a public tunnel can mean the tunnel is alive but
   its local upstream service is unreachable.
3. Confirm the existing `BETMAN_PROXY_URL` in Vercel points to the healthy
   HTTPS relay. If an **independently operating, authorized backup relay**
   exists, configure `BETMAN_PROXY_FALLBACK_URL` in Production and Preview;
   do not use the same tunnel under another hostname.
4. Redeploy the relevant Vercel environment after changing environment
   variables. Verify `/api/betman?health=1` returns 200 and
   `{ "ok": true, "fresh": true }` from the real upstream. Verify the full
   `/api/betman?scope=all` reports actual games and odds. Do not place
   relay credentials, tokens, or raw URL query strings into public logs.
5. Confirm the next GitHub automatic scan logs a fresh `feedOrigin` and
   `sourceOk:true`; the `collect-first-public.json` feed timestamp
   should advance and `pregameCaptured` should only increase for
   legitimately captured pre-kickoff Betman odds.

## How the deployed code behaves during an outage

- A primary 502 or malformed response is rejected immediately; an optional
  different configured backup relay is tried. Without a working backup the
  request returns 502 with safe upstream error codes.
- No stale feed is silently reused for new PRE, no invented odds are created,
  and historical fixed predictions remain untouched.
- Result verification from independent FINAL providers and genuine pre-kickoff
  lineup checks continue, even if the Betman source preflight is marked failed.
- Failed source preflight makes the workflow visibly unhealthy, rather than
  reporting success only because a separate historical verifier ran.
