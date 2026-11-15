// Cross-scan outage memory for the read-only Naver PRE lineup fallback.
// Saved in the existing collect-first ledger, never in a separate mutable file.
// It must not alter official final verification, frozen PRE/TOP1 or ESPN feeds.
const M = 60_000;
export const NAVER_LINEUP_CIRCUIT_SCHEMA = "wisetoto-naver-lineup-circuit-v1";
export const NAVER_LINEUP_RECOVERY_MS = 60 * M;
export const NAVER_LINEUP_URGENT_PROBE_MS = 30 * M;
export const NAVER_LINEUP_FAILURE_WINDOW_MS = 30 * M;
const MAX_AGE_MS = 24 * 60 * M;
const groups = new Set([
  "football:kfootball", "football:jfootball", "football:wfootball",
  "baseball:kbaseball", "baseball:npb", "baseball:mlb", "baseball:other",
]);

// The provider category, not the match/fixture ID, scopes the outage.
// A failing domestic schedule must not silence another league or baseball.
export function naverLineupCircuitGroup(row) {
  const league = String(row?.league ?? "").toLowerCase().replace(/\s/g, "");
  if (row?.sport === "축구") {
    if (/k리그|kleague|k-league/.test(league)) return "football:kfootball";
    if (/j리그|jleague|j-league|일본.*축구/.test(league)) return "football:jfootball";
    return "football:wfootball";
  }
  if (row?.sport === "야구") {
    if (/kbo|한국프로야구/.test(league)) return "baseball:kbaseball";
    if (/npb|일본프로야구/.test(league)) return "baseball:npb";
    if (/mlb|메이저리그/.test(league)) return "baseball:mlb";
    return "baseball:other";
  }
  return null;
}

export function isNaverLineupTransientFailure(reason) {
  return /^LINEUP_NETWORK:|^LINEUP_UPSTREAM_UNAVAILABLE$|^LINEUP_HTTP_(?:429|500|502|503|504)$/.test(String(reason ?? ""));
}

// Untrusted/malformed old counters must never create a permanent outage.
// Only seven fixed provider categories can be saved; old entries expire.
export function restoreNaverLineupCircuit(raw, now) {
  const state = { schema: NAVER_LINEUP_CIRCUIT_SCHEMA, groups: {} };
  if (!raw || raw.schema !== NAVER_LINEUP_CIRCUIT_SCHEMA || !raw.groups ||
      typeof raw.groups !== "object" || Array.isArray(raw.groups)) return state;
  for (const [group, entry] of Object.entries(raw.groups)) {
    if (!groups.has(group) || !entry || typeof entry !== "object") continue;
    const { failures, retryAt, lastFailureAt, lastAttemptAt } = entry;
    if (![failures, retryAt, lastFailureAt, lastAttemptAt].every(Number.isFinite) ||
        failures < 1 || failures > 3 || retryAt < 0 || lastFailureAt < 0 ||
        lastAttemptAt < 0 || lastAttemptAt > now + M ||
        lastFailureAt > now + M || now - lastFailureAt > MAX_AGE_MS) continue;
    state.groups[group] = { failures, retryAt, lastFailureAt, lastAttemptAt };
  }
  return state;
}

// One recovery attempt after 60m, or one carefully bounded urgent probe
// after >=30m without Naver traffic in this same provider category.
// The per-scan guard prevents re-probing on every fixture.
export function naverLineupProbeGate(state, group, now, startMs, probedThisScan) {
  const e = group ? state.groups[group] : null;
  if (!e || e.failures < 2 || e.retryAt <= 0)
    return { allow: true, probe: false, reason: "CLOSED" };
  if (probedThisScan?.has(group))
    return { allow: false, probe: false, reason: "ONE_RECOVERY_PROBE_PER_SCAN" };
  if (now >= e.retryAt)
    return { allow: true, probe: true, reason: "RECOVERY_DUE" };
  if (Number.isFinite(startMs) && startMs > now && startMs - now <= 15 * M &&
      now - e.lastAttemptAt >= NAVER_LINEUP_URGENT_PROBE_MS)
    return { allow: true, probe: true, reason: "URGENT_PREGAME" };
  return { allow: false, probe: false, reason: "UPSTREAM_COOLDOWN" };
}

export function recordNaverLineupAttempt(state, group, reason, at) {
  if (!group || !groups.has(group)) return state;
  const entries = { ...state.groups };
  if (!isNaverLineupTransientFailure(reason)) {
    // A genuine source response, even with an unconfirmed XI, shows the
    // network is back. It cannot certify an XI or a fixture by itself.
    delete entries[group];
  } else {
    const before = entries[group];
    const consecutive = before && at - before.lastFailureAt <= NAVER_LINEUP_FAILURE_WINDOW_MS
      ? before.failures : 0;
    const failures = Math.min(3, consecutive + 1);
    const previouslyOpen = Boolean(before && before.retryAt > 0 && before.failures >= 2);
    entries[group] = {
      failures,
      retryAt: failures >= 2 || previouslyOpen ? at + NAVER_LINEUP_RECOVERY_MS : 0,
      lastFailureAt: at,
      lastAttemptAt: at,
    };
  }
  return { schema: NAVER_LINEUP_CIRCUIT_SCHEMA, groups: entries };
}
