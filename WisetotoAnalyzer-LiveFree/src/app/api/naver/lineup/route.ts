// DEPLOY_MARKER_V13_8_30_NAVER_STARTER_BULLPEN_WORKLOAD_V1_20260903

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


const FOOTBALL_TEAM_ALIASES: Record<string, string[]> = {
  FEYENOORD: ["페예노르트", "페예노르", "feyenoord", "feyenoordrotterdam"],
  ADO_DEN_HAAG: ["ado덴하그", "ado덴하흐", "덴하그", "덴하흐", "adodenhaag", "denhaag"],
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
  AN: ["la에인절스", "에인절스", "로스앤젤레스에인절스", "losangelesangels", "laangels", "angels"],
  MI: ["밀워키", "밀워키브루어스", "milwaukee", "milwaukeebrewers", "brewers"],
  MN: ["미네소타", "미네소타트윈스", "minnesota", "minnesotatwins", "twins"],
  NM: ["뉴욕메츠", "뉴욕메츠", "newyorkmets", "nymets", "mets"],
  NY: ["뉴욕양키스", "뉴욕양키스", "newyorkyankees", "nyyankees", "yankees"],
  OA: ["애슬레틱스", "어슬레틱스", "오클랜드", "오클랜드애슬레틱스", "oakland", "oaklandathletics", "athletics", "as"],
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
      if (!a) continue;
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
      if (!a) return false;
      return target === a || target.includes(a) || a.includes(target);
    })) return code;
  }
  return null;
}

function normMlb(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s._'’\-–—()\[\]{}]/g, "");
}

function normalizedMlbName(name: string) {
  const target = normMlb(name);
  if (!target) return null;

  // MLB는 팀 별칭을 정확 일치 우선으로 판정한다.
  // 공용 norm()처럼 팀명 토큰(twins 등)을 제거하지 않아 다른 팀으로 오인하지 않는다.
  for (const [code, aliases] of Object.entries(MLB_TEAM_ALIASES)) {
    if (aliases.some((alias) => normMlb(alias) === target)) return code;
  }

  // 전체 구단명/도시명처럼 한쪽이 명확히 더 긴 경우에만 보조 매칭.
  const matches: string[] = [];
  for (const [code, aliases] of Object.entries(MLB_TEAM_ALIASES)) {
    const matched = aliases.some((alias) => {
      const a = normMlb(alias);
      if (!a || a.length < 4 || target.length < 4) return false;
      return target.includes(a) || a.includes(target);
    });
    if (matched) matches.push(code);
  }
  return matches.length === 1 ? matches[0] : null;
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

function normalizedFootballName(name: string) {
  const target = normMlb(name);
  if (!target) return null;
  for (const [code, aliases] of Object.entries(FOOTBALL_TEAM_ALIASES)) {
    if (aliases.some((alias) => {
      const a = normMlb(alias);
      return a === target || (a.length >= 4 && target.length >= 4 && (a.includes(target) || target.includes(a)));
    })) return code;
  }
  return target;
}

function footballTeamMatches(candidate: string, requested: string) {
  const c = normalizedFootballName(candidate);
  const r = normalizedFootballName(requested);
  if (!c || !r) return false;
  return c === r || (c.length >= 4 && r.length >= 4 && (c.includes(r) || r.includes(c)));
}

async function resolveFootballGameId(date: string, home: string, away: string, startRaw: string) {
  const d = isoDate(date);
  const endpoint = `${NAVER_API}?upperCategoryId=wfootball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://m.sports.naver.com/wfootball/schedule/index",
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.28",
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) return { gameId: null, endpoint, status: response.status, candidateCount: 0 };

  const all = allObjects(payload).filter((obj) => {
    const gameId = String(obj?.gameId ?? obj?.game_id ?? "").trim();
    const superCategory = String(obj?.superCategoryId ?? "").toLowerCase();
    const upperCategory = String(obj?.upperCategoryId ?? "").toLowerCase();
    const gameDate = String(obj?.gameDate ?? "").replace(/-/g, "");
    return Boolean(gameId) && gameDate === date && (superCategory === "football" || upperCategory === "wfootball");
  });

  let candidates = all.filter((obj) => {
    const h = String(obj?.homeTeamName ?? obj?.homeTeamShortName ?? obj?.homeTeamFullName ?? "");
    const a = String(obj?.awayTeamName ?? obj?.awayTeamShortName ?? obj?.awayTeamFullName ?? "");
    return footballTeamMatches(h, home) && footballTeamMatches(a, away);
  });

  const requestedMs = requestedStartMs(startRaw);
  if (candidates.length === 0 && requestedMs !== null) {
    const sameTime = all.filter((obj) => {
      const ms = naverLocalGameMs(obj?.gameDateTime);
      return ms !== null && Math.abs(ms - requestedMs) <= 5 * 60 * 1000;
    });
    // 시간만 같은 경기가 여러 개면 절대 임의 선택하지 않는다.
    if (sameTime.length === 1) candidates = sameTime;
  }

  let selected: AnyObj | null = candidates.length === 1 ? candidates[0] : null;
  let closestDiffMinutes: number | null = null;
  if (!selected && candidates.length > 1 && requestedMs !== null) {
    const ranked = candidates.map((obj) => {
      const ms = naverLocalGameMs(obj?.gameDateTime);
      return { obj, diff: ms === null ? Number.POSITIVE_INFINITY : Math.abs(ms - requestedMs) };
    }).sort((a, b) => a.diff - b.diff);
    if (ranked[0] && Number.isFinite(ranked[0].diff) && (ranked[1]?.diff ?? Number.POSITIVE_INFINITY) !== ranked[0].diff) {
      selected = ranked[0].obj;
      closestDiffMinutes = Math.round(ranked[0].diff / 60000);
    }
  }

  return {
    gameId: selected ? String(selected?.gameId ?? selected?.game_id) : null,
    endpoint,
    status: response.status,
    candidateCount: candidates.length,
    closestDiffMinutes,
    selectedCategoryId: selected?.categoryId ?? null,
    build: "V13.8.28_FOOTBALL_NAVER_LINEUP_V1",
  };
}

async function resolveKboGameId(date: string, home: string, away: string) {
  const d = isoDate(date);
  const endpoint = `${NAVER_API}?upperCategoryId=kbaseball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://m.sports.naver.com/kbaseball/schedule/index",
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.24",
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
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.24",
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

  // Naver schedule 응답이 비거나 팀명 표기가 달라도, MLB gameId 규칙
  // YYYYMMDD + awayCode + homeCode + (0/1/2)을 이용해 선택 경기만 안전하게 재확인한다.
  // 각 후보는 game-polling 응답의 날짜/홈/원정 코드가 모두 일치할 때만 채택한다.
  if (candidates.length === 0 && homeCode && awayCode) {
    const prefix = `${date}${awayCode}${homeCode}`;
    for (const suffix of ["0", "1", "2"]) {
      const probeGameId = `${prefix}${suffix}`;
      const probeEndpoint = `${NAVER_API}/${encodeURIComponent(probeGameId)}/game-polling?inning=1&isHighlight=false`;
      try {
        const probeResponse = await fetch(probeEndpoint, {
          cache: "no-store",
          headers: {
            accept: "application/json, text/plain, */*",
            referer: `https://m.sports.naver.com/game/${probeGameId}`,
            "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.24",
          },
        });
        if (!probeResponse.ok) continue;
        const probePayload = await probeResponse.json().catch(() => null);
        const game = probePayload?.result?.game;
        if (!game) continue;
        const probeDate = String(game?.gameDate ?? "").replace(/-/g, "");
        const probeHomeCode = String(game?.homeTeamCode ?? "").trim().toUpperCase();
        const probeAwayCode = String(game?.awayTeamCode ?? "").trim().toUpperCase();
        if (probeDate !== date || probeHomeCode !== homeCode || probeAwayCode !== awayCode) continue;
        candidates.push(game);
      } catch {
        // 후보 하나의 네트워크 실패는 다른 suffix 확인을 막지 않는다.
      }
    }
  }

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
    build: "V13.8.25_MLB_EXACT_ALIAS_RESOLVER",
  };
}

function normalizeFootballPlayers(players: any, teamCode: any, substitute: boolean) {
  const code = String(teamCode ?? "").trim();
  if (!Array.isArray(players) || !code) return [];
  return players
    .filter((p: AnyObj) => String(p?.teamId ?? "").trim() === code && Boolean(p?.substitute) === substitute)
    .sort((a: AnyObj, b: AnyObj) => Number(a?.formationPlace ?? 99) - Number(b?.formationPlace ?? 99))
    .map((p: AnyObj) => ({
      playerId: String(p?.playerId ?? "").trim() || null,
      pcode: String(p?.playerId ?? "").trim() || null,
      name: String(p?.playerName ?? "").trim() || null,
      position: String(p?.position ?? "").trim() || null,
      formationPlace: Number.isFinite(Number(p?.formationPlace)) ? Number(p.formationPlace) : null,
      shirtNumber: Number.isFinite(Number(p?.shirtNumber)) ? Number(p.shirtNumber) : null,
      substitute,
      matchPlayed: Boolean(p?.matchPlayed),
      playerPlayType: String(p?.playerPlayType ?? "").trim() || null,
      countryName: String(p?.countryName ?? "").trim() || null,
      source: "NAVER_FOOTBALL_PLAYERS",
    }))
    .filter((p: AnyObj) => Boolean(p.name));
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

function normalizeNpbRecordPlayers(players: any) {
  return Array.isArray(players)
    ? players
        .filter((p: AnyObj) => Number(p?.batOrder ?? 0) >= 1 && Number(p?.batOrder ?? 0) <= 9)
        .sort((a: AnyObj, b: AnyObj) => Number(a?.batOrder ?? 99) - Number(b?.batOrder ?? 99))
        .slice(0, 9)
        .map((p: AnyObj) => {
          const id = String(p?.playerId ?? p?.pCode ?? p?.pcode ?? "").trim() || null;
          return {
            battingOrder: Number(p?.batOrder ?? 0) || null,
            position: String(p?.posName ?? p?.position ?? "").trim() || null,
            pcode: id,
            playerId: id,
            name: String(p?.name ?? "").trim() || null,
            currentSeasonStats: {
              avg: Number.isFinite(Number(p?.avg)) ? Number(p.avg) : null,
            },
            source: "NAVER_RECORD_NPB",
          };
        })
        .filter((p: AnyObj) => Boolean(p.name))
    : [];
}

function normalizeNpbRecordStarter(value: any, fallbackName: any) {
  const p = Array.isArray(value) ? value[0] : value;
  const name = String(p?.name ?? fallbackName ?? "").trim();
  if (!name) return null;
  const id = String(p?.playerId ?? p?.pCode ?? p?.pcode ?? "").trim() || null;
  const era = Number.isFinite(Number(p?.era)) ? Number(p.era) : null;
  return {
    name,
    playerId: id,
    pcode: id,
    era,
    status: "CONFIRMED",
    currentSeasonStats: { era },
    source: "NAVER_RECORD_NPB",
  };
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



type CacheEntry = { at: number; value: any };
const HIST_TTL_MS = 6 * 60 * 60 * 1000;
const histJsonCache = new Map<string, CacheEntry>();
const histJsonInflight = new Map<string, Promise<any>>();

async function fetchNaverJsonCached(endpoint: string, referer: string, historical = false) {
  if (historical) {
    const cached = histJsonCache.get(endpoint);
    if (cached && Date.now() - cached.at < HIST_TTL_MS) return { ok: true, status: 200, payload: cached.value, cacheHit: true };
  }
  if (historical) {
    const inflight = histJsonInflight.get(endpoint);
    if (inflight) return inflight;
  }
  const task = (async () => {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer,
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.30",
        },
      });
      const payload = await response.json().catch(() => null);
      if (historical && response.ok && payload) histJsonCache.set(endpoint, { at: Date.now(), value: payload });
      return { ok: response.ok && Boolean(payload), status: response.status, payload, cacheHit: false };
    } catch {
      return { ok: false, status: 0, payload: null, cacheHit: false };
    } finally {
      if (historical) histJsonInflight.delete(endpoint);
    }
  })();
  if (historical) histJsonInflight.set(endpoint, task);
  return task;
}

function isoDayOffset(dateKeyRaw: string, days: number) {
  const y = Number(dateKeyRaw.slice(0, 4));
  const m = Number(dateKeyRaw.slice(4, 6));
  const d = Number(dateKeyRaw.slice(6, 8));
  const value = new Date(Date.UTC(y, m - 1, d + days));
  return value.toISOString().slice(0, 10);
}

function normalizePerson(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣ぁ-んァ-ヶ一-龥]/g, "");
}

function personMatches(a: any, b: any) {
  const x = normalizePerson(a);
  const y = normalizePerson(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)));
}

function exactCategoryForLeague(league: string) {
  if (league === "KBO") return "kbo";
  if (league === "MLB") return "mlb";
  if (league === "NPB") return "npb";
  return null;
}

function upperCategoryForLeague(league: string) {
  return league === "KBO" ? "kbaseball" : "wbaseball";
}

function pitcherRowSummary(row: AnyObj, game: AnyObj, side: "home" | "away") {
  const id = String(row?.playerId ?? row?.pcode ?? row?.pCode ?? "").trim() || null;
  const pitchRaw = row?.pitchCount ?? row?.pitches ?? row?.np ?? row?.pc ?? row?.pitchCnt;
  return {
    gameId: String(game?.gameId ?? "") || null,
    date: game?.gameDate ?? null,
    gameDateTime: game?.gameDateTime ?? null,
    opponent: side === "home" ? game?.awayTeamName ?? null : game?.homeTeamName ?? null,
    name: String(row?.name ?? row?.playerName ?? "").trim() || null,
    playerId: id,
    innings: row?.inn ?? null,
    pitches: Number.isFinite(Number(pitchRaw)) ? Number(pitchRaw) : null,
    hits: Number.isFinite(Number(row?.hit)) ? Number(row.hit) : null,
    homeRuns: Number.isFinite(Number(row?.hr)) ? Number(row.hr) : null,
    walks: Number.isFinite(Number(row?.bb)) ? Number(row.bb) : null,
    strikeouts: Number.isFinite(Number(row?.so ?? row?.kk)) ? Number(row?.so ?? row?.kk) : null,
    runs: Number.isFinite(Number(row?.r)) ? Number(row.r) : null,
    earnedRuns: Number.isFinite(Number(row?.er)) ? Number(row.er) : null,
  };
}

function inningsToOuts(value: any) {
  const raw = String(value ?? "").trim();
  const m = raw.match(/^(\d+)(?:\.(\d))?$/);
  if (!m) return 0;
  const whole = Number(m[1]);
  const frac = Number(m[2] ?? 0);
  return whole * 3 + Math.min(2, Math.max(0, frac));
}

function outsToInnings(outs: number) {
  const safe = Math.max(0, Math.round(outs));
  return `${Math.floor(safe / 3)}.${safe % 3}`;
}

async function fetchHistoricalRecord(gameId: string) {
  const endpoint = `${NAVER_API}/${encodeURIComponent(gameId)}/record`;
  const result = await fetchNaverJsonCached(endpoint, `https://m.sports.naver.com/game/${gameId}`, true);
  const recordData = result?.payload?.success && result?.payload?.code === 200 ? result.payload?.result?.recordData ?? null : null;
  return { endpoint, status: result.status, cacheHit: result.cacheHit, recordData };
}

async function collectNaverPitcherWorkload(args: {
  league: "NPB" | "KBO" | "MLB";
  date: string;
  home: string;
  away: string;
  homeStarter: AnyObj | null;
  awayStarter: AnyObj | null;
  startRaw: string;
}) {
  const categoryId = exactCategoryForLeague(args.league);
  const upperCategoryId = upperCategoryForLeague(args.league);
  if (!categoryId) return null;

  const fromDate = isoDayOffset(args.date, -40);
  const toDate = isoDayOffset(args.date, -1);
  const scheduleEndpoint = `${NAVER_API}?fields=basic%2Cschedule%2Cbaseball%2CmanualRelayUrl&upperCategoryId=${upperCategoryId}&fromDate=${fromDate}&toDate=${toDate}&size=500`;
  const scheduleResult = await fetchNaverJsonCached(
    scheduleEndpoint,
    args.league === "KBO" ? "https://m.sports.naver.com/kbaseball/schedule/index" : "https://m.sports.naver.com/wbaseball/schedule/index",
    true,
  );
  const rows = Array.isArray(scheduleResult?.payload?.result?.games) ? scheduleResult.payload.result.games : [];
  const games = rows
    .filter((g: AnyObj) => String(g?.categoryId ?? "").toLowerCase() === categoryId)
    .filter((g: AnyObj) => String(g?.gameDate ?? "").replace(/-/g, "") < args.date)
    .sort((a: AnyObj, b: AnyObj) => String(b?.gameDateTime ?? b?.gameDate ?? "").localeCompare(String(a?.gameDateTime ?? a?.gameDate ?? "")));

  function teamGames(team: string) {
    return games.filter((g: AnyObj) => teamMatches(String(g?.homeTeamName ?? ""), team) || teamMatches(String(g?.awayTeamName ?? ""), team));
  }

  async function starterRecent(team: string, starter: AnyObj | null) {
    const starterName = String(starter?.name ?? "").trim();
    const starterId = String(starter?.playerId ?? starter?.pcode ?? "").trim();
    if (!starterName && !starterId) return { startsFound: 0, games: [], summary: null, candidateGames: 0 };
    const candidates = teamGames(team)
      .filter((g: AnyObj) => {
        const isHome = teamMatches(String(g?.homeTeamName ?? ""), team);
        const scheduledStarter = isHome ? g?.homeStarterName : g?.awayStarterName;
        return starterName ? personMatches(scheduledStarter, starterName) : true;
      })
      .slice(0, 5);

    const found: AnyObj[] = [];
    for (const g of candidates) {
      const rec = await fetchHistoricalRecord(String(g?.gameId ?? ""));
      const isHome = teamMatches(String(g?.homeTeamName ?? ""), team);
      const pitchers = Array.isArray(isHome ? rec.recordData?.homePitcher : rec.recordData?.awayPitcher)
        ? (isHome ? rec.recordData.homePitcher : rec.recordData.awayPitcher)
        : [];
      const row = pitchers.find((p: AnyObj) => starterId
        ? String(p?.playerId ?? p?.pcode ?? p?.pCode ?? "").trim() === starterId
        : personMatches(p?.name ?? p?.playerName, starterName));
      if (row) found.push(pitcherRowSummary(row, g, isHome ? "home" : "away"));
    }
    const totals = found.reduce((acc, r) => {
      acc.outs += inningsToOuts(r.innings);
      acc.pitches += Number(r.pitches ?? 0);
      acc.earnedRuns += Number(r.earnedRuns ?? 0);
      acc.strikeouts += Number(r.strikeouts ?? 0);
      acc.walks += Number(r.walks ?? 0);
      return acc;
    }, { outs: 0, pitches: 0, earnedRuns: 0, strikeouts: 0, walks: 0 });
    return {
      startsFound: found.length,
      candidateGames: candidates.length,
      games: found,
      summary: found.length ? {
        innings: outsToInnings(totals.outs),
        pitches: totals.pitches || null,
        earnedRuns: totals.earnedRuns,
        strikeouts: totals.strikeouts,
        walks: totals.walks,
        era: totals.outs > 0 ? Number(((totals.earnedRuns * 27) / totals.outs).toFixed(2)) : null,
      } : null,
    };
  }

  async function bullpen(team: string) {
    const currentMs = requestedStartMs(args.startRaw);
    const allTeamGames = teamGames(team);
    const recentGames = allTeamGames.filter((g: AnyObj) => {
      if (currentMs === null) return true;
      const ms = naverLocalGameMs(g?.gameDateTime);
      if (ms === null) return false;
      const diffHours = (currentMs - ms) / 3600000;
      return diffHours > 0 && diffHours <= 72;
    }).slice(0, 4);
    const appearances: AnyObj[] = [];
    for (const g of recentGames) {
      const rec = await fetchHistoricalRecord(String(g?.gameId ?? ""));
      const isHome = teamMatches(String(g?.homeTeamName ?? ""), team);
      const pitchers = Array.isArray(isHome ? rec.recordData?.homePitcher : rec.recordData?.awayPitcher)
        ? (isHome ? rec.recordData.homePitcher : rec.recordData.awayPitcher)
        : [];
      const gameMs = naverLocalGameMs(g?.gameDateTime);
      const hoursAgo = currentMs !== null && gameMs !== null ? (currentMs - gameMs) / 3600000 : null;
      pitchers.slice(1).forEach((p: AnyObj) => appearances.push({ ...pitcherRowSummary(p, g, isHome ? "home" : "away"), hoursAgo }));
    }

    function windowSummary(hours: number) {
      const filtered = appearances.filter((a) => a.hoursAgo === null || (Number(a.hoursAgo) > 0 && Number(a.hoursAgo) <= hours));
      const uniquePitchers = new Set(filtered.map((a) => a.playerId || normalizePerson(a.name)).filter(Boolean));
      const outs = filtered.reduce((sum, a) => sum + inningsToOuts(a.innings), 0);
      const pitches = filtered.reduce((sum, a) => sum + Number(a.pitches ?? 0), 0);
      return {
        appearances: filtered.length,
        pitchersUsed: uniquePitchers.size,
        innings: outsToInnings(outs),
        pitches: pitches || null,
      };
    }

    const byPitcher = new Map<string, number>();
    appearances.forEach((a) => {
      const key = String(a.playerId || normalizePerson(a.name) || "");
      if (key) byPitcher.set(key, (byPitcher.get(key) ?? 0) + 1);
    });
    const multiGamePitchers = Array.from(byPitcher.values()).filter((count) => count >= 2).length;
    return {
      gamesChecked: recentGames.length,
      windows: { h24: windowSummary(24), h48: windowSummary(48), h72: windowSummary(72) },
      multiGamePitchers,
      games: recentGames.map((g: AnyObj) => ({ gameId: g?.gameId ?? null, date: g?.gameDate ?? null, gameDateTime: g?.gameDateTime ?? null, home: g?.homeTeamName ?? null, away: g?.awayTeamName ?? null })),
    };
  }

  const [homeStarterRecent, awayStarterRecent, homeBullpen, awayBullpen] = await Promise.all([
    starterRecent(args.home, args.homeStarter),
    starterRecent(args.away, args.awayStarter),
    bullpen(args.home),
    bullpen(args.away),
  ]);

  return {
    source: "NAVER_SCHEDULE_RECORD",
    modelApplied: false,
    scheduleEndpoint,
    scheduleStatus: scheduleResult.status,
    scheduleCacheHit: scheduleResult.cacheHit,
    lookbackDays: 40,
    starterRecent: { home: homeStarterRecent, away: awayStarterRecent },
    bullpen: { home: homeBullpen, away: awayBullpen },
    coverage: {
      scheduleGames: games.length,
      starterRecentStarts: Number(homeStarterRecent.startsFound) + Number(awayStarterRecent.startsFound),
      bullpenGames: Number(homeBullpen.gamesChecked) + Number(awayBullpen.gamesChecked),
    },
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
    const sport = url.searchParams.get("sport") ?? "";
    const date = dateKey(startRaw);
    if (!date || !home || !away) {
      return Response.json({ ok: false, error: "네이버 gameId 생성에 필요한 날짜/팀 정보 없음", debug: { date, home, away } }, { status: 400 });
    }

    const homeNpb = npbTeamCode(home);
    const awayNpb = npbTeamCode(away);
    const homeMlb = normalizedMlbName(home);
    const awayMlb = normalizedMlbName(away);
    const isFootball = /축구|football|soccer/i.test(String(sport));
    let league: "NPB" | "KBO" | "MLB" | "FOOTBALL" = isFootball ? "FOOTBALL" : homeNpb && awayNpb ? "NPB" : homeMlb && awayMlb ? "MLB" : "KBO";
    let gameId: string | null = null;
    let resolverDebug: any = null;

    if (league === "FOOTBALL") {
      const resolved = await resolveFootballGameId(date, home, away, startRaw);
      gameId = resolved.gameId;
      resolverDebug = resolved;
      if (!gameId) {
        return Response.json({
          ok: false,
          error: "네이버 해외축구 당일 일정에서 경기 gameId 자동매칭 실패",
          debug: { date, home, away, resolver: resolved },
        }, { status: 404 });
      }
    } else if (league === "NPB") {
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

    const endpoint = `${NAVER_API}/${gameId}/game-polling?inning=1&isHighlight=false`;
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        referer: `https://m.sports.naver.com/game/${gameId}`,
        "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.24",
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
    if (league !== "FOOTBALL" && detectedCategory === "kbo") league = "KBO";
    if (league !== "FOOTBALL" && detectedCategory === "mlb") league = "MLB";

    let previewData: AnyObj | null = null;
    let previewEndpoint: string | null = null;
    let previewStatus: number | null = null;
    let footballPlayers: AnyObj[] = [];
    let footballPlayersEndpoint: string | null = null;
    let footballPlayersStatus: number | null = null;
    let npbRecordData: AnyObj | null = null;
    let npbRecordEndpoint: string | null = null;
    let npbRecordStatus: number | null = null;
    if (league === "FOOTBALL") {
      footballPlayersEndpoint = `${NAVER_API}/${gameId}/players`;
      const playersResponse = await fetch(footballPlayersEndpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `https://m.sports.naver.com/game/${gameId}`,
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.28",
        },
      });
      footballPlayersStatus = playersResponse.status;
      const playersPayload = await playersResponse.json().catch(() => null);
      if (playersResponse.ok && playersPayload?.success && playersPayload?.code === 200 && Array.isArray(playersPayload?.result?.players)) {
        footballPlayers = playersPayload.result.players;
      }
    }
    if (league === "NPB") {
      npbRecordEndpoint = `${NAVER_API}/${gameId}/record`;
      const recordResponse = await fetch(npbRecordEndpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `https://m.sports.naver.com/game/${gameId}`,
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.27",
        },
      });
      npbRecordStatus = recordResponse.status;
      const recordPayload = await recordResponse.json().catch(() => null);
      if (recordResponse.ok && recordPayload?.success && recordPayload?.code === 200) {
        npbRecordData = recordPayload?.result?.recordData ?? null;
      }
    }
    if (league === "MLB") {
      previewEndpoint = `${NAVER_API}/${gameId}/preview`;
      const previewResponse = await fetch(previewEndpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: `https://m.sports.naver.com/game/${gameId}`,
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.24",
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

    if (league === "FOOTBALL") {
      homeLineup = normalizeFootballPlayers(footballPlayers, game?.homeTeamCode, false).slice(0, 11);
      awayLineup = normalizeFootballPlayers(footballPlayers, game?.awayTeamCode, false).slice(0, 11);
    } else if (league === "MLB") {
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
      // NPB pregame confirmed lineup lives in /record even while game-polling.textRelayData is null.
      // Prefer /record; retain the old game-polling shape only as a compatibility fallback.
      const recordHome = normalizeNpbRecordPlayers(npbRecordData?.homeBatter);
      const recordAway = normalizeNpbRecordPlayers(npbRecordData?.awayBatter);
      const baseInfo = result?.textRelayData?.baseInfo ?? {};
      const batterLineup = baseInfo?.batterLineup ?? {};
      homeLineup = recordHome.length >= 7 ? recordHome : normalizeNpbPlayers(batterLineup?.home);
      awayLineup = recordAway.length >= 7 ? recordAway : normalizeNpbPlayers(batterLineup?.away);
      homeStarter = normalizeNpbRecordStarter(npbRecordData?.homePitcher, game?.homeStarterName);
      awayStarter = normalizeNpbRecordStarter(npbRecordData?.awayPitcher, game?.awayStarterName);
      if (!homeStarter && baseInfo?.homePitcher) {
        homeStarter = {
          name: baseInfo.homePitcher,
          playerId: String(baseInfo?.homePitcherId ?? "").trim() || null,
          pcode: String(baseInfo?.homePitcherId ?? "").trim() || null,
          status: "CONFIRMED",
          source: "NAVER_GAME_POLLING",
        };
      }
      if (!awayStarter && baseInfo?.awayPitcher) {
        awayStarter = {
          name: baseInfo.awayPitcher,
          playerId: String(baseInfo?.awayPitcherId ?? "").trim() || null,
          pcode: String(baseInfo?.awayPitcherId ?? "").trim() || null,
          status: "CONFIRMED",
          source: "NAVER_GAME_POLLING",
        };
      }
    }

    const naverPitcherWorkload = league === "FOOTBALL" ? null : await collectNaverPitcherWorkload({
      league,
      date,
      home,
      away,
      homeStarter,
      awayStarter,
      startRaw,
    });

    return Response.json({
      ok: true,
      source: "sports.naver.com",
      league,
      categoryId: game?.categoryId ?? detectedCategory ?? null,
      capturedAt: Date.now(),
      endpoint,
      previewEndpoint,
      npbRecordEndpoint,
      footballPlayersEndpoint,
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
      bench: league === "FOOTBALL" ? {
        home: normalizeFootballPlayers(footballPlayers, game?.homeTeamCode, true),
        away: normalizeFootballPlayers(footballPlayers, game?.awayTeamCode, true),
      } : null,
      footballPlayers: league === "FOOTBALL" ? {
        ok: footballPlayers.length > 0,
        status: footballPlayersStatus,
        total: footballPlayers.length,
        startingHome: homeLineup.length,
        startingAway: awayLineup.length,
        startingTotal: homeLineup.length + awayLineup.length,
      } : null,
      pitcherWorkload: naverPitcherWorkload,
      recentSummary: league === "MLB" && previewData ? {
        home: summarizeMlbPreviousGames(previewData?.homeTeamPreviousGames, String(previewData?.gameInfo?.hName ?? game?.homeTeamName ?? home)),
        away: summarizeMlbPreviousGames(previewData?.awayTeamPreviousGames, String(previewData?.gameInfo?.aName ?? game?.awayTeamName ?? away)),
      } : null,
      npbRecord: league === "NPB" ? {
        ok: Boolean(npbRecordData),
        status: npbRecordStatus,
        homeBatters: Array.isArray(npbRecordData?.homeBatter) ? npbRecordData.homeBatter.length : 0,
        awayBatters: Array.isArray(npbRecordData?.awayBatter) ? npbRecordData.awayBatter.length : 0,
        starters: Number(Array.isArray(npbRecordData?.homePitcher) && npbRecordData.homePitcher.length > 0)
          + Number(Array.isArray(npbRecordData?.awayPitcher) && npbRecordData.awayPitcher.length > 0),
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
        starterRecentStarts: Number(naverPitcherWorkload?.coverage?.starterRecentStarts ?? 0),
        bullpenGames: Number(naverPitcherWorkload?.coverage?.bullpenGames ?? 0),
        startingPlayers: league === "FOOTBALL" ? homeLineup.length + awayLineup.length : null,
      },
      debug: resolverDebug ? { resolver: resolverDebug } : undefined,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "네이버 당일 라인업 수집 중 오류" }, { status: 500 });
  }
}
