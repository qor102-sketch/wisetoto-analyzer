// Deterministic, read-only scheduling/audit helpers. Never tune live model values.
export const TRACKER_KEY = "wisetoto_v13_8_1_live_tracker";
export const APPEND_KEY = "wisetoto_v13_8_66_live_tracker_append_only";
export const STATE_FILE = "automation-state/state.json";
export const minute = 60_000;
const matchKey = (value) => String(value ?? "").toLowerCase().replace(/[\s._\-]/g, "");
export const getRecords = (state) => {
  try {
    const v = JSON.parse(state?.localStorage?.[TRACKER_KEY] ?? "[]");
    return Array.isArray(v) ? v : Array.isArray(v?.records) ? v.records : [];
  } catch { return []; }
};
export function dueGames(games, records, now = Date.now()) {
  return (Array.isArray(games) ? games : []).filter((game) => {
    const start = Number(game.gameDateMs ?? new Date(game.gameDate).getTime());
    if (!Number.isFinite(start) || start - now < 10 * minute || start - now > 100 * minute) return false;
    if (!Array.isArray(game.markets) || !game.markets.some(m => m.selections?.some(x => Number(x.odds) > 1))) return false;
    return !records.some(r => Number(r.startMs) === start && matchKey(r.home) === matchKey(game.home) && matchKey(r.away) === matchKey(game.away) && Number(r.capturedAt) < start);
  });
}
export function dueVerifications(records, now = Date.now()) {
  return records.filter(r => r.verificationStatus === "PENDING" && Number(r.startMs) <= now - 2 * 60 * minute && Number(r.startMs) > now - 7 * 24 * 60 * minute);
}
function immutablePick(p) {
  return [p?.key, p?.market, p?.pick, p?.probability, p?.odds, p?.expectedValue, p?.marketProbability, p?.recommendationScore, p?.modelSnapshot, p?.marketSnapshot];
}
function freezeRecord(before, after) {
  // Results/verification fields may change; original PRE fields must not.
  const immutable = ["id","fixtureId","fixtureKey","betmanIdentity","home","away","league","sport","startMs","capturedAt","gateVersion","recommendationEngineVersion","decision","footballPre","baseballReadyHold"];
  const protectedRecord = { ...after };
  for (const key of immutable) if (key in before) protectedRecord[key] = before[key];
  for (const key of ["picks","marketResults"]) {
    if (!Array.isArray(before[key])) continue;
    const later = new Map((Array.isArray(after[key]) ? after[key] : []).map(x => [x.key, x]));
    protectedRecord[key] = before[key].map(original => {
      const updated = later.get(original.key);
      return {
        ...original,
        resultStatus: updated?.resultStatus ?? original.resultStatus,
        actualLabel: updated?.actualLabel ?? original.actualLabel,
        resultNote: updated?.resultNote ?? original.resultNote,
      };
    });
  }
  return protectedRecord;
}
export function preserveFrozenRecords(before, after) {
  const previous = new Map(before.map(r => [String(r.id), r]));
  const combined = [];
  for (const next of after) {
    const old = previous.get(String(next.id));
    combined.push(old ? freezeRecord(old, next) : next);
    previous.delete(String(next.id));
  }
  // Fail-safe: append previous rows if the UI didn't restore them.
  return [...combined, ...previous.values()].slice(0, 300);
}
export function auditChanges(before, after, now = Date.now()) {
  const prior = new Map(before.map(r => [String(r.id), r]));
  const created = after.filter(r => !prior.has(String(r.id)));
  const verified = after.filter(r => r.verificationStatus === "VERIFIED" && prior.get(String(r.id))?.verificationStatus !== "VERIFIED");
  const suspicious = [];
  for (const row of created) {
    const pre = row.footballPre;
    const isSoccer = /축구|football|soccer/i.test(String(row.sport));
    if (isSoccer && pre && (Number(pre.homeRecentSample ?? 0) === 0 || Number(pre.awayRecentSample ?? 0) === 0)) {
      suspicious.push({ game: row.home + " vs " + row.away, reason: "경기 전 Form 부분/전체 미수신", stage: "DATA_SOURCE", at: row.capturedAt });
    }
    if (row.picks?.some(p => (p.grade === "VALUE" || p.grade === "STRONG VALUE") && !(Number(p.expectedValue) > 0))) {
      suspicious.push({ game: row.home + " vs " + row.away, reason: "비양수 EV인데 VALUE 등급", stage: "GRADE_GATE", at: row.capturedAt });
    }
  }
  const missed = verified.filter(r => r.picks?.some(p => p.resultStatus === "MISS")).length;
  const rows = verified.map(row => ({
    id: row.id, game: row.home + " vs " + row.away, kickoff: new Date(row.startMs).toISOString(),
    predictedAt: new Date(row.capturedAt).toISOString(), actual: row.result ? String(row.result.homeScore) + ":" + String(row.result.awayScore) : "미확인",
    picks: (row.picks ?? []).map(p => ({ market: p.market, pick: p.pick, probability: p.probability, ev: p.expectedValue, grade: p.grade, outcome: p.resultStatus })),
    // Immutable original expected goals only. No re-estimation from results.
    expected: row.footballPre ? [row.footballPre.expectedHome, row.footballPre.expectedAway] : null,
  }));
  return { generatedAt: new Date(now).toISOString(), created: created.length, verified: rows, missed, suspicious, note: "OOS only; original PRE/λ/Poisson/TOP1 remain frozen. Result-based auto tuning and main merge disabled." };
}
