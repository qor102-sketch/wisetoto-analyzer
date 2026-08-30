// DEPLOY_MARKER_V13_8_21_MLB_GAME_POLLING_LINEUP_20260830

const NAVER_API = "https://api-gw.sports.naver.com/schedule/games";

type AnyObj = Record<string, any>;
type TeamCodeEntry = { code: string; aliases: string[] };

const NPB_TEAM_CODES: TeamCodeEntry[] = [
  { code: "SE", aliases: ["세이부", "saitamaseibulions", "seibulions", "seibu"] },
  { code: "RT", aliases: ["라쿠텐", "tohokurakutengoldeneagles", "rakutengoldeneagles", "rakuten"] },
  { code: "OX", aliases: ["오릭스", "orixbuffaloes", "orix"] },
  { code: "SF", aliases: ["소프트뱅크", "후쿠오카소프트뱅크", "fukuokasoftbankhawks", "softbankhawks", "softbank"] },
  { code: "YK", aliases: ["요코하마", "dena", "yokohamadenabaystars", "yokohama"] },
  { code: "JN", aliases: ["주니치", "chunichidragons", "chunichi"] },
  { code: "HI", aliases: ["히로시마", "hiroshimacarp", "hiroshimatoyocarp", "hiroshima"] },
  { code: "YA", aliases: ["야쿠르트", "tokyoyakultswallows", "yakultswallows", "yakult"] },
  { code: "HS", aliases: ["한신", "hanshintigers", "hanshin"] },
  { code: "YO", aliases: ["요미우리", "yomiurigiants", "yomiuri"] },
  { code: "NH", aliases: ["닛폰햄", "니혼햄", "nipponhamfighters", "hokkaidonipponhamfighters", "nipponham"] },
  { code: "JL", aliases: ["지바롯데", "치바롯데", "chibalottemarines", "lottemarines", "chibalotte"] },
];

const KBO_TEAM_ALIASES: Record<string, string[]> = {
  LG: ["lg", "lg트윈스", "엘지", "엘지트윈스"],
  DO: ["두산", "두산베어스", "doosan", "doosanbears"],
  KT: ["kt", "ktwiz", "kt위즈", "케이티", "케이티위즈"],
  SS: ["삼성", "삼성라이온즈", "samsung", "samsunglions"],
  LT: ["롯데", "롯데자이언츠", "lotte", "lottegiants"],
  HH: ["한화", "한화이글스", "hanwha", "hanwhaeagles"],
  NC: ["nc", "nc다이노스", "엔씨", "엔씨다이노스", "ncdinos"],
  SK: ["ssg", "ssg랜더스", "에스에스지", "에스에스지랜더스", "ssglanders", "sk"],
  WO: ["키움", "키움히어로즈", "kiwoom", "kiwoomheroes", "wo"],
  HT: ["kia", "kia타이거즈", "기아", "기아타이거즈", "kiatigers", "ht"],
};

const MLB_TEAM_ALIASES: Record<string, string[]> = {
  AZ: ["애리조나", "애리조나다이아몬드백스", "arizona", "arizonadiamondbacks", "diamondbacks"],
  AT: ["애틀랜타", "애틀랜타브레이브스", "atlanta", "atlantabraves", "braves"],
  BA: ["볼티모어", "볼티모어오리올스", "baltimore", "baltimoreorioles", "orioles"],
  BO: ["보스턴", "보스턴레드삭스", "boston", "bostonredsox", "redsox"],
  CC: ["시카고컵스", "시카고컵스", "chicagocubs", "cubs"],
  CW: ["시카고화이트삭스", "시카고w", "화이트삭스", "chicagowhitesox", "whitesox"],
  CI: ["신시내티", "신시내티레즈", "cincinnati", "cincinnatireds", "reds"],
  CL: ["클리블랜드", "클리블랜드가디언스", "cleveland", "clevelandguardians", "guardians"],
  CO: ["콜로라도", "콜로라도로키스", "colorado", "coloradorockies", "rockies"],
  DE: ["디트로이트", "디트로이트타이거스", "디트로이트타이거즈", "detroit", "detroittigers"],
  HO: ["휴스턴", "휴스턴애스트로스", "houston", "houstonastros", "astros"],
  KC: ["캔자스시티", "캔자스시티로열스", "kansascity", "kansascityroyals", "royals"],
  LA: ["la다저스", "la다저스", "로스앤젤레스다저스", "losangelesdodgers", "ladodgers", "dodgers"],
  AA: ["la에인절스", "에인절스", "로스앤젤레스에인절스", "losangelesangels", "laangels", "angels"],
  MI: ["밀워키", "밀워키브루어스", "milwaukee", "milwaukeebrewers", "brewers"],
  MN: ["미네소타", "미네소타트윈스", "minnesota", "minnesotatwins", "twins"],
  NM: ["뉴욕메츠", "뉴욕메츠", "newyorkmets", "nymets", "mets"],
  NY: ["뉴욕양키스", "뉴욕양키스", "newyorkyankees", "nyyankees", "yankees"],
  OA: ["오클랜드", "오클랜드애슬레틱스", "oakland", "oaklandathletics", "athletics", "as"],
  PH: ["필라델피아", "필라델피아필리스", "philadelphia", "philadelphiaphillies", "phillies"],
  PI: ["피츠버그", "피츠버그파이리츠", "pittsburgh", "pittsburghpirates", "pirates"],
  SD: ["샌디에이고", "샌디에이고파드리스", "sandiego", "sandiegopadres", "padres"],
  SF: ["샌프란시스코", "샌프란시스코자이언츠", "sanfrancisco", "sanfranciscogiants"],
  SE: ["시애틀", "시애틀매리너스", "seattle", "seattlemariners", "mariners"],
  SL: ["세인트루이스", "세인트루이스카디널스", "stlouis", "stlouiscardinals", "cardinals"],
  TB: ["탬파베이", "탬파베이레이스", "tampabay", "tampabayrays", "rays"],
  TE: ["텍사스", "텍사스레인저스", "texas", "texasrangers", "rangers"],
  TO: ["토론토", "토론토블루제이스", "toronto", "torontobluejays", "bluejays"],
  MO: ["워싱턴", "워싱턴내셔널스", "washington", "washingtonnationals", "nationals"],
  FL: ["마이애미", "마이애미말린스", "miami", "miamimarlins", "marlins"],
};

function norm(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s._'’\-–—()\[\]{}]/g, "")
    .replace(/buffaloes|hawks|lions|eagles|dragons|swallows|tigers|giants|fighters|marines|baystars|bears|twins|wiz|dinos|landers|heroes/g, "");
}

function npbTeamCode(name: string) {
  const target = norm(name);
  if (!target) return null;
  for (const entry of NPB_TEAM_CODES) {
    for (const alias of entry.aliases) {
      const a = norm(alias);
      if (target === a || target.includes(a) || a.includes(target)) return entry.code;
    }
  }
  return null;
}

function normalizedKboName(name: string) {
  const target = norm(name);
  for (const [code, aliases] of Object.entries(KBO_TEAM_ALIASES)) {
    if (aliases.some((alias) => {
      const a = norm(alias);
      return target === a || target.includes(a) || a.includes(target);
    })) return code;
  }
  return null;
}

function normalizedMlbName(name: string) {
  const target = norm(name);
  for (const [code, aliases] of Object.entries(MLB_TEAM_ALIASES)) {
    if (aliases.some((alias) => {
      const a = norm(alias);
      return target === a || target.includes(a) || a.includes(target);
    })) return code;
  }
  return null;
}

function dateKey(value: string) {
  const raw = String(value ?? "").trim();
  if (/T/.test(raw) && /(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const parsed = new Date(raw);
    if (Number.isFinite(parsed.getTime())) {
      const kst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
      return kst.toISOString().slice(0, 10).replace(/-/g, "");
    }
  }
  const m = raw.match(/(20\d{2})[-/.]?(\d{2})[-/.]?(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 1_000_000_000) {
    const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    const d = new Date(ms + 9 * 60 * 60 * 1000);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10).replace(/-/g, "");
  }
  return null;
}

function isoDate(key: string) {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

function requestedStartMs(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let d: Date;
  if (/T/.test(raw) && /(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) d = new Date(raw);
  else if (/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) d = new Date(`${raw}+09:00`);
  else return null;
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function naverLocalGameMs(value: any) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}+09:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function allObjects(value: any, out: AnyObj[] = []) {
  if (!value || typeof value !== "object") return out;
  if (!Array.isArray(value)) out.push(value);
  if (Array.isArray(value)) {
    for (const item of value) allObjects(item, out);
  } else {
    for (const child of Object.values(value)) allObjects(child, out);
  }
  return out;
}

function teamMatches(candidate: string, requested: string) {
  const c = norm(candidate);
  const r = norm(requested);
  if (!c || !r) return false;
  if (c === r || c.includes(r) || r.includes(c)) return true;
  const kc = normalizedKboName(candidate);
  const kr = normalizedKboName(requested);
  if (kc && kr && kc === kr) return true;
  const mc = normalizedMlbName(candidate);
  const mr = normalizedMlbName(requested);
  return Boolean(mc && mr && mc === mr);
}

async function resolveKboGameId(date: string, home: string, away: string) {
  const d = isoDate(date);
  const endpoint = `${NAVER_API}?upperCategoryId=kbaseball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://m.sports.naver.com/kbaseball/schedule/index",
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.21",
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) return { gameId: null, endpoint, status: response.status };

  const candidates = allObjects(payload).filter((obj) => {
    const gameId = String(obj?.gameId ?? obj?.game_id ?? "").trim();
    if (!gameId || !gameId.startsWith(date)) return false;
    const category = String(obj?.categoryId ?? obj?.category ?? obj?.upperCategoryId ?? "").toLowerCase();
    if (category && !/kbo|kbaseball/.test(category)) return false;
    const h = String(obj?.homeTeamName ?? obj?.homeTeamShortName ?? obj?.homeTeamFullName ?? obj?.homeName ?? "");
    const a = String(obj?.awayTeamName ?? obj?.awayTeamShortName ?? obj?.awayTeamFullName ?? obj?.awayName ?? "");
    return teamMatches(h, home) && teamMatches(a, away);
  });

  return {
    gameId: candidates.length === 1 ? String(candidates[0].gameId ?? candidates[0].game_id) : null,
    endpoint,
    status: response.status,
    candidateCount: candidates.length,
  };
}

async function resolveMlbGameId(date: string, home: string, away: string, startRaw: string) {
  const d = isoDate(date);
  const endpoint = `${NAVER_API}?upperCategoryId=wbaseball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://m.sports.naver.com/wbaseball/schedule/index",
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.21",
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) return { gameId: null, endpoint, status: response.status };

  const homeCode = normalizedMlbName(home);
  const awayCode = normalizedMlbName(away);
  const candidates = allObjects(payload).filter((obj) => {
    const gameId = String(obj?.gameId ?? obj?.game_id ?? "").trim();
    if (!gameId || !gameId.startsWith(date)) return false;
    const category = String(obj?.categoryId ?? obj?.category ?? obj?.upperCategoryId ?? "").toLowerCase();
    if (category && !/mlb|wbaseball/.test(category)) return false;
    const h = String(obj?.homeTeamName ?? obj?.homeTeamShortName ?? obj?.homeTeamFullName ?? obj?.homeName ?? "");
    const a = String(obj?.awayTeamName ?? obj?.awayTeamShortName ?? obj?.awayTeamFullName ?? obj?.awayName ?? "");
    const hCode = String(obj?.homeTeamCode ?? obj?.hCode ?? "").trim().toUpperCase();
    const aCode = String(obj?.awayTeamCode ?? obj?.aCode ?? "").trim().toUpperCase();
    const homeOk = teamMatches(h, home) || Boolean(homeCode && hCode === homeCode);
    const awayOk = teamMatches(a, away) || Boolean(awayCode && aCode === awayCode);
    return homeOk && awayOk;
  });

  const requestedMs = requestedStartMs(startRaw);
  let selected: AnyObj | null = candidates.length === 1 ? candidates[0] : null;
  let closestDiffMinutes: number | null = null;
  if (!selected && candidates.length > 1 && requestedMs !== null) {
    const ranked = candidates
      .map((obj) => {
        const candidateMs = naverLocalGameMs(obj?.gameDateTime);
        return { obj, diff: candidateMs === null ? Number.POSITIVE_INFINITY : Math.abs(candidateMs - requestedMs) };
      })
      .sort((a, b) => a.diff - b.diff);
    if (ranked[0] && Number.isFinite(ranked[0].diff)) {
      selected = ranked[0].obj;
      closestDiffMinutes = Math.round(ranked[0].diff / 60000);
    }
  }

  return {
    gameId: selected ? String(selected.gameId ?? selected.game_id) : null,
    endpoint,
    status: response.status,
    candidateCount: candidates.length,
    closestDiffMinutes,
    homeCode,
    awayCode,
  };
}

function normalizeNpbPlayers(players: any) {
  return Array.isArray(players)
    ? players.slice(0, 9).map((p: AnyObj, index: number) => ({
        battingOrder: index + 1,
        position: String(p?.position ?? "").trim() || null,
        pcode: String(p?.pCode ?? p?.pcode ?? "").trim() || null,
        playerId: String(p?.pCode ?? p?.pcode ?? "").trim() || null,
        name: String(p?.name ?? "").trim() || null,
        source: "NAVER_GAME_POLLING",
      })).filter((p: AnyObj) => Boolean(p.name))
    : [];
}

function normalizeKboPlayers(players: any) {
  return Array.isArray(players)
    ? players
        .filter((p: AnyObj) => Number(p?.batOrder ?? 0) >= 1 && Number(p?.batOrder ?? 0) <= 9)
        .sort((a: AnyObj, b: AnyObj) => Number(a?.batOrder ?? 99) - Number(b?.batOrder ?? 99))
        .slice(0, 9)
        .map((p: AnyObj) => ({
          battingOrder: Number(p?.batOrder ?? 0) || null,
          position: String(p?.posName ?? p?.position ?? "").trim() || null,
          pcode: String(p?.pcode ?? p?.pCode ?? "").trim() || null,
          playerId: String(p?.pcode ?? p?.pCode ?? "").trim() || null,
          name: String(p?.name ?? "").trim() || null,
          hitType: String(p?.hitType ?? p?.hittype ?? "").trim() || null,
          backnum: String(p?.backnum ?? "").trim() || null,
          currentSeasonStats: {
            avg: Number.isFinite(Number(p?.seasonHra)) ? Number(p.seasonHra) : null,
            opponentAvg: Number.isFinite(Number(p?.vsHra)) ? Number(p.vsHra) : null,
          },
          source: "NAVER_GAME_POLLING_KBO",
        }))
        .filter((p: AnyObj) => Boolean(p.name))
    : [];
}

function mlbSeasonStatsMap(rows: any) {
  const out = new Map<string, AnyObj>();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const id = String(row?.pCode ?? row?.pcode ?? "").trim();
    if (id && !out.has(id)) out.set(id, row);
  }
  return out;
}

function normalizeMlbPlayers(players: any, seasonRows: any) {
  if (!Array.isArray(players)) return [];
  const season = mlbSeasonStatsMap(seasonRows);
  const byOrder = new Map<number, AnyObj>();
  for (const p of players) {
    const order = Number(p?.batOrder ?? 0);
    if (order < 1 || order > 9) continue;
    const existing = byOrder.get(order);
    const seq = Number(p?.seqno ?? 99);
    const existingSeq = Number(existing?.seqno ?? 99);
    if (!existing || seq < existingSeq) byOrder.set(order, p);
  }
  return Array.from(byOrder.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([order, p]) => {
      const id = String(p?.pCode ?? p?.pcode ?? "").trim() || null;
      const stats = id ? season.get(id) : null;
      const avgRaw = stats?.hra ?? p?.hra;
      const obpRaw = stats?.bra ?? null;
      return {
        battingOrder: order,
        position: String(p?.posName ?? p?.pos ?? "").trim() || null,
        pcode: id,
        playerId: id,
        name: String(p?.firstName ?? p?.name ?? "").trim() || null,
        shortName: String(p?.name ?? "").trim() || null,
        hitType: String(p?.hitType ?? "").trim() || null,
        backnum: String(p?.backnum ?? "").trim() || null,
        currentSeasonStats: {
          avg: Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null,
          obp: Number.isFinite(Number(obpRaw)) ? Number(obpRaw) : null,
          ab: Number.isFinite(Number(stats?.ab)) ? Number(stats?.ab) : null,
          hit: Number.isFinite(Number(stats?.hit)) ? Number(stats?.hit) : null,
          rbi: Number.isFinite(Number(stats?.rbi)) ? Number(stats?.rbi) : null,
          hr: Number.isFinite(Number(stats?.hr)) ? Number(stats?.hr) : null,
        },
        source: "NAVER_MLB_PREVIEW",
      };
    })
    .filter((p: AnyObj) => Boolean(p.name));
}


function normalizeMlbPollingPlayers(players: any, seasonRows: any) {
  const season = mlbSeasonStatsMap(seasonRows);
  return Array.isArray(players)
    ? players.slice(0, 9).map((p: AnyObj, index: number) => {
        const id = String(p?.pCode ?? p?.pcode ?? "").trim() || null;
        const stats = id ? season.get(id) : null;
        const avgRaw = stats?.hra ?? null;
        const obpRaw = stats?.bra ?? null;
        return {
          battingOrder: index + 1,
          position: String(p?.position ?? "").trim() || null,
          pcode: id,
          playerId: id,
          name: String(p?.name ?? "").trim() || null,
          currentSeasonStats: {
            avg: Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null,
            obp: Number.isFinite(Number(obpRaw)) ? Number(obpRaw) : null,
            ab: Number.isFinite(Number(stats?.ab)) ? Number(stats?.ab) : null,
            hit: Number.isFinite(Number(stats?.hit)) ? Number(stats?.hit) : null,
            rbi: Number.isFinite(Number(stats?.rbi)) ? Number(stats?.rbi) : null,
            hr: Number.isFinite(Number(stats?.hr)) ? Number(stats?.hr) : null,
          },
          source: "NAVER_GAME_POLLING_MLB",
        };
      }).filter((p: AnyObj) => Boolean(p.name))
    : [];
}

function normalizeMlbPollingStarter(nameRaw: any, idRaw: any, previewStarter: any, confirmed: boolean) {
  const name = String(nameRaw ?? "").trim();
  if (!name) return null;
  const id = String(idRaw ?? "").trim() || null;
  const previewName = String(previewStarter?.playerInfo?.firstName ?? "").trim();
  const samePitcher = !previewName || teamMatches(previewName, name) || norm(previewName) === norm(name);
  const season = samePitcher ? (previewStarter?.currentSeasonStats ?? {}) : {};
  const recent = samePitcher ? (previewStarter?.latelyGamePitcherStat ?? null) : null;
  return {
    name,
    playerId: id,
    pcode: id,
    era: Number.isFinite(Number(season?.era)) ? Number(season.era) : null,
    status: confirmed ? "CONFIRMED" : "EXPECTED",
    latestStart: recent ? {
      date: recent?.gdate ?? null,
      opponent: recent?.name ?? null,
      innings: recent?.inn ?? null,
      era: Number.isFinite(Number(recent?.era)) ? Number(recent.era) : null,
      earnedRuns: Number.isFinite(Number(recent?.er)) ? Number(recent.er) : null,
      decision: recent?.wls ?? null,
    } : null,
    currentSeasonStats: {
      era: Number.isFinite(Number(season?.era)) ? Number(season.era) : null,
      games: Number.isFinite(Number(season?.gameCount)) ? Number(season.gameCount) : null,
      wins: Number.isFinite(Number(season?.w)) ? Number(season.w) : null,
      losses: Number.isFinite(Number(season?.l)) ? Number(season.l) : null,
      innings: season?.inn ?? null,
      strikeouts: Number.isFinite(Number(season?.kk)) ? Number(season.kk) : null,
      walks: Number.isFinite(Number(season?.bb)) ? Number(season.bb) : null,
    },
    source: "NAVER_GAME_POLLING_MLB",
  };
}

function normalizeMlbStarter(starter: any, fallbackName: any, lineupPitchers: any, confirmed: boolean) {
  const info = starter?.playerInfo ?? {};
  const firstPitcher = Array.isArray(lineupPitchers) ? lineupPitchers.find((p: AnyObj) => Number(p?.seqno ?? 99) === 1) ?? lineupPitchers[0] : null;
  const name = String(info?.firstName ?? firstPitcher?.firstName ?? firstPitcher?.name ?? fallbackName ?? "").trim();
  if (!name) return null;
  const id = String(info?.pCode ?? firstPitcher?.pCode ?? firstPitcher?.pcode ?? "").trim() || null;
  const season = starter?.currentSeasonStats ?? {};
  const recent = starter?.latelyGamePitcherStat ?? null;
  return {
    name,
    playerId: id,
    pcode: id,
    era: Number.isFinite(Number(season?.era ?? firstPitcher?.seasonEra)) ? Number(season?.era ?? firstPitcher?.seasonEra) : null,
    status: confirmed ? "CONFIRMED" : "EXPECTED",
    latestStart: recent ? {
      date: recent?.gdate ?? null,
      opponent: recent?.name ?? null,
      innings: recent?.inn ?? null,
      era: Number.isFinite(Number(recent?.era)) ? Number(recent.era) : null,
      earnedRuns: Number.isFinite(Number(recent?.er)) ? Number(recent.er) : null,
      decision: recent?.wls ?? null,
    } : null,
    currentSeasonStats: {
      era: Number.isFinite(Number(season?.era)) ? Number(season.era) : null,
      games: Number.isFinite(Number(season?.gameCount)) ? Number(season.gameCount) : null,
      wins: Number.isFinite(Number(season?.w)) ? Number(season.w) : null,
      losses: Number.isFinite(Number(season?.l)) ? Number(season.l) : null,
      innings: season?.inn ?? null,
      strikeouts: Number.isFinite(Number(season?.kk)) ? Number(season.kk) : null,
      walks: Number.isFinite(Number(season?.bb)) ? Number(season.bb) : null,
    },
    source: "NAVER_MLB_PREVIEW",
  };
}

function summarizeMlbPreviousGames(rows: any, teamName: string) {
  const games = Array.isArray(rows) ? rows.slice(0, 5) : [];
  const wins = games.filter((g: AnyObj) => String(g?.result ?? "").trim() === "승").length;
  const losses = games.filter((g: AnyObj) => String(g?.result ?? "").trim() === "패").length;
  const played = games.length;
  let scored = 0;
  let conceded = 0;
  const fixtures = games.map((g: AnyObj) => {
    const homeScore = Number.isFinite(Number(g?.hScore)) ? Number(g.hScore) : null;
    const awayScore = Number.isFinite(Number(g?.aScore)) ? Number(g.aScore) : null;
    const isHome = teamMatches(String(g?.hName ?? ""), teamName);
    if (homeScore !== null && awayScore !== null) {
      scored += isHome ? homeScore : awayScore;
      conceded += isHome ? awayScore : homeScore;
    }
    const rawDate = String(g?.gdate ?? "");
    const date = /^20\d{6}$/.test(rawDate)
      ? `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}T00:00:00+09:00`
      : rawDate || null;
    return {
      gameId: g?.gameId ?? g?.ognGameId ?? null,
      date,
      startTime: date,
      result: g?.result ?? null,
      home: g?.hName ?? null,
      away: g?.aName ?? null,
      homeScore,
      awayScore,
      score: { home: homeScore, away: awayScore },
      source: "NAVER_MLB_PREVIEW",
    };
  });
  return {
    teamName,
    form: {
      played,
      wins,
      draws: Math.max(0, played - wins - losses),
      losses,
      scored,
      conceded,
      goalDifference: scored - conceded,
      formPercent: played > 0 ? wins / played : 0,
    },
    fixtures,
    games: fixtures,
  };
}

function normalizeKboStarter(value: any, fallbackName: any) {
  const p = Array.isArray(value) ? value[0] : null;
  const name = String(p?.name ?? fallbackName ?? "").trim();
  if (!name) return null;
  const id = String(p?.pcode ?? p?.pCode ?? "").trim() || null;
  return {
    name,
    playerId: id,
    pcode: id,
    era: Number.isFinite(Number(p?.seasonEra)) ? Number(p.seasonEra) : null,
    opponentEra: Number.isFinite(Number(p?.vsEra)) ? Number(p.vsEra) : null,
    status: "CONFIRMED",
    source: "NAVER_GAME_POLLING_KBO",
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const home = url.searchParams.get("home") ?? "";
    const away = url.searchParams.get("away") ?? "";
    const startRaw = url.searchParams.get("date") ?? "";
    const date = dateKey(startRaw);
    if (!date || !home || !away) {
      return Response.json({ ok: false, error: "네이버 gameId 생성에 필요한 날짜/팀 정보 없음", debug: { date, home, away } }, { status: 400 });
    }

    const homeNpb = npbTeamCode(home);
    const awayNpb = npbTeamCode(away);
    const homeMlb = normalizedMlbName(home);
    const awayMlb = normalizedMlbName(away);
    let league: "NPB" | "KBO" | "MLB" = homeNpb && awayNpb ? "NPB" : homeMlb && awayMlb ? "MLB" : "KBO";
    let gameId: string | null = null;
    let resolverDebug: any = null;

    if (league === "NPB") {
      gameId = `${date}${awayNpb}${homeNpb}0`;
    } else if (league === "MLB") {
      const resolved = await resolveMlbGameId(date, home, away, startRaw);
      gameId = resolved.gameId;
      resolverDebug = resolved;
      if (!gameId) {
        return Response.json({
          ok: false,
          error: "네이버 MLB 당일 일정에서 경기 gameId 자동매칭 실패",
          debug: { date, home, away, resolver: resolved },
        }, { status: 404 });
      }
    } else {
      const resolved = await resolveKboGameId(date, home, away);
      gameId = resolved.gameId;
      resolverDebug = resolved;
      if (!gameId) {
        return Response.json({
          ok: false,
          error: "네이버 KBO 당일 일정에서 경기 gameId 자동매칭 실패",
          debug: { date, home, away, resolver: resolved },
        }, { status: 404 });
      }
    }

    const endpoint = `${NAVER_API}/${gameId}/game-polling`;
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        referer: `https://m.sports.naver.com/game/${gameId}`,
        "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.21",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || payload?.code !== 200) {
      return Response.json({
        ok: false,
        error: `네이버 game-polling 응답 실패 (${response.status})`,
        gameId,
        debug: { endpoint, responseCode: payload?.code ?? null, league, resolver: resolverDebug },
      }, { status: 502 });
    }

    const result = payload?.result ?? {};
    const game = result?.game ?? {};
    const detectedCategory = String(result?.textRelayData?.category ?? game?.categoryId ?? "").toLowerCase();
    if (detectedCategory === "kbo") league = "KBO";
    if (detectedCategory === "mlb") league = "MLB";

    let previewData: AnyObj | null = null;
    let previewEndpoint: string | null = null;
    let previewStatus: number | null = null;
    if (league === "MLB") {
      previewEndpoint = `${NAVER_API}/${gameId}/preview`;
      const previewResponse = await fetch(previewEndpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `https://m.sports.naver.com/game/${gameId}`,
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.21",
        },
      });
      previewStatus = previewResponse.status;
      const previewPayload = await previewResponse.json().catch(() => null);
      if (previewResponse.ok && previewPayload?.success && previewPayload?.code === 200) {
        previewData = previewPayload?.result?.previewData ?? null;
      }
    }

    let homeLineup: AnyObj[] = [];
    let awayLineup: AnyObj[] = [];
    let homeStarter: AnyObj | null = null;
    let awayStarter: AnyObj | null = null;

    if (league === "MLB") {
      const baseInfo = result?.textRelayData?.baseInfo ?? {};
      const pollingLineup = baseInfo?.batterLineup ?? {};
      const pollingHome = normalizeMlbPollingPlayers(pollingLineup?.home, previewData?.homeBattersSeasonStats);
      const pollingAway = normalizeMlbPollingPlayers(pollingLineup?.away, previewData?.awayBattersSeasonStats);
      const previewHome = normalizeMlbPlayers(previewData?.homeTeamLineUp?.batter, previewData?.homeBattersSeasonStats);
      const previewAway = normalizeMlbPlayers(previewData?.awayTeamLineUp?.batter, previewData?.awayBattersSeasonStats);
      homeLineup = pollingHome.length >= 7 ? pollingHome : previewHome;
      awayLineup = pollingAway.length >= 7 ? pollingAway : previewAway;
      const confirmed = homeLineup.length >= 9 && awayLineup.length >= 9;

      // MLB 당일 확정 선발은 game-polling baseInfo를 최우선으로 사용한다.
      // preview는 시즌/직전등판 수치 보강에만 사용하고, 홈/원정 이름을 덮어쓰지 않는다.
      homeStarter = normalizeMlbPollingStarter(
        baseInfo?.homePitcher ?? game?.homeStarterName,
        baseInfo?.homePitcherId,
        previewData?.homeStarter,
        confirmed,
      );
      awayStarter = normalizeMlbPollingStarter(
        baseInfo?.awayPitcher ?? game?.awayStarterName,
        baseInfo?.awayPitcherId,
        previewData?.awayStarter,
        confirmed,
      );
    } else if (league === "KBO") {
      homeLineup = normalizeKboPlayers(result?.textRelayData?.homeLineup?.batter);
      awayLineup = normalizeKboPlayers(result?.textRelayData?.awayLineup?.batter);
      homeStarter = normalizeKboStarter(result?.textRelayData?.homeLineup?.pitcher, game?.homeStarterName);
      awayStarter = normalizeKboStarter(result?.textRelayData?.awayLineup?.pitcher, game?.awayStarterName);
    } else {
      const baseInfo = result?.textRelayData?.baseInfo ?? {};
      const batterLineup = baseInfo?.batterLineup ?? {};
      homeLineup = normalizeNpbPlayers(batterLineup?.home);
      awayLineup = normalizeNpbPlayers(batterLineup?.away);
      homeStarter = baseInfo?.homePitcher ? {
        name: baseInfo.homePitcher,
        playerId: String(baseInfo?.homePitcherId ?? "").trim() || null,
        pcode: String(baseInfo?.homePitcherId ?? "").trim() || null,
        status: "CONFIRMED",
        source: "NAVER_GAME_POLLING",
      } : null;
      awayStarter = baseInfo?.awayPitcher ? {
        name: baseInfo.awayPitcher,
        playerId: String(baseInfo?.awayPitcherId ?? "").trim() || null,
        pcode: String(baseInfo?.awayPitcherId ?? "").trim() || null,
        status: "CONFIRMED",
        source: "NAVER_GAME_POLLING",
      } : null;
    }

    return Response.json({
      ok: true,
      source: "sports.naver.com",
      league,
      categoryId: game?.categoryId ?? detectedCategory ?? null,
      capturedAt: Date.now(),
      endpoint,
      previewEndpoint,
      gameId,
      game: {
        gameDateTime: game?.gameDateTime ?? null,
        stadium: game?.stadium ?? null,
        statusCode: game?.statusCode ?? null,
        statusInfo: game?.statusInfo ?? null,
        homeTeamName: game?.homeTeamName ?? home,
        awayTeamName: game?.awayTeamName ?? away,
        homeStarterName: game?.homeStarterName ?? homeStarter?.name ?? null,
        awayStarterName: game?.awayStarterName ?? awayStarter?.name ?? null,
        weatherInfo: game?.weatherInfo ?? null,
      },
      homeStarter,
      awayStarter,
      home: homeLineup,
      away: awayLineup,
      recentSummary: league === "MLB" && previewData ? {
        home: summarizeMlbPreviousGames(previewData?.homeTeamPreviousGames, String(previewData?.gameInfo?.hName ?? game?.homeTeamName ?? home)),
        away: summarizeMlbPreviousGames(previewData?.awayTeamPreviousGames, String(previewData?.gameInfo?.aName ?? game?.awayTeamName ?? away)),
      } : null,
      mlbPreview: league === "MLB" ? {
        ok: Boolean(previewData),
        status: previewStatus,
        generatedDate: previewData?.generateDate ?? null,
        homeSeasonBatters: Array.isArray(previewData?.homeBattersSeasonStats) ? previewData.homeBattersSeasonStats.length : 0,
        awaySeasonBatters: Array.isArray(previewData?.awayBattersSeasonStats) ? previewData.awayBattersSeasonStats.length : 0,
        homePreviousGames: Array.isArray(previewData?.homeTeamPreviousGames) ? previewData.homeTeamPreviousGames.length : 0,
        awayPreviousGames: Array.isArray(previewData?.awayTeamPreviousGames) ? previewData.awayTeamPreviousGames.length : 0,
        gamePollingLineup: {
          home: Array.isArray(result?.textRelayData?.baseInfo?.batterLineup?.home) ? result.textRelayData.baseInfo.batterLineup.home.length : 0,
          away: Array.isArray(result?.textRelayData?.baseInfo?.batterLineup?.away) ? result.textRelayData.baseInfo.batterLineup.away.length : 0,
        },
      } : null,
      coverage: {
        home: homeLineup.length,
        away: awayLineup.length,
        total: homeLineup.length + awayLineup.length,
        homeStats: homeLineup.filter((p: AnyObj) => p?.currentSeasonStats?.avg !== null && p?.currentSeasonStats?.avg !== undefined).length,
        awayStats: awayLineup.filter((p: AnyObj) => p?.currentSeasonStats?.avg !== null && p?.currentSeasonStats?.avg !== undefined).length,
        starters: Number(Boolean(homeStarter)) + Number(Boolean(awayStarter)),
      },
      debug: resolverDebug ? { resolver: resolverDebug } : undefined,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "네이버 당일 라인업 수집 중 오류" }, { status: 500 });
  }
}
