// DEPLOY_MARKER_V13_8_64_J1_ACTUAL_SCHEDULE_API_20260906
// DEPLOY_MARKER_V13_8_63_J1_CATEGORY_RESOLVER_20260906
// DEPLOY_MARKER_V13_8_62_LEAGUE_ADAPTER_VERIFY_READY_20260906
// DEPLOY_MARKER_V13_8_58_FOOTBALL_LINEUP_SNAPSHOT_AUDIT_20260906
// DEPLOY_MARKER_V13_8_56_FOOTBALL_NAVER_PLAYERS_SESSION_PRIMARY_20260906
// DEPLOY_MARKER_V13_8_50_FOOTBALL_NAVER_RESOLVER_RECENT_FORM_V2_20260906
// DEPLOY_MARKER_V13_8_33_KBO_RECORD_PITCHER_BOXSCORE_20260903
// DEPLOY_MARKER_V13_8_30_NAVER_STARTER_BULLPEN_WORKLOAD_V1_20260903

// DEPLOY_MARKER_V13_8_34_NAVER_RECENT_BATTING_V1_20260903
const NAVER_API = "https://api-gw.sports.naver.com/schedule/games";
const NAVER_STATISTICS_API = "https://api-gw.sports.naver.com/statistics/categories";

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


type FootballAdapterId = "J1_JP" | "MLS_US" | "EUROPE_GENERIC" | "FOOTBALL_GENERIC";

const FOOTBALL_ADAPTER_ALIASES: Record<FootballAdapterId, Record<string, string[]>> = {
  J1_JP: {
    VISSEL_KOBE: ["비셀고베", "비셀 고베", "visselkobe", "vissel kobe", "고베"],
    V_VAREN_NAGASAKI: ["v바렌나가사키", "v-바렌나가사키", "v바렌 나가사키", "vvaren nagasaki", "v-varennagasaki", "나가사키"],
    KASHIWA_REYSOL: ["가시와레이솔", "가시와 레이솔", "kashiwareysol", "kashiwa reysol", "가시와"],
    YOKOHAMA_F_MARINOS: ["요코하마f마리노스", "요코하마 f마리노스", "요코하마fm", "yokohamafmarinos", "yokohama f marinos", "fmarinos"],
    KASHIMA_ANTLERS: ["가시마앤틀러스", "가시마 앤틀러스", "kashimaantlers", "kashima antlers", "가시마"],
    URAWA_REDS: ["우라와레즈", "우라와 레즈", "urawareddiamonds", "urawa reds", "우라와"],
    JEF_CHIBA: ["제프유나이티드지바", "제프 지바", "jefunitedchiba", "jef chiba", "지바"],
    GAMBA_OSAKA: ["감바오사카", "감바 오사카", "gambaosaka", "gamba osaka"],
    NAGOYA_GRAMPUS: ["나고야그램퍼스", "나고야 그램퍼스", "nagoyagrampus", "nagoya grampus", "나고야"],
    MACHIDA_ZELVIA: ["마치다젤비아", "마치다 젤비아", "machidazelvia", "machida zelvia", "마치다"],
    FAGIANO_OKAYAMA: ["파지아노오카야마", "파지아노 오카야마", "fagianookayama", "fagiano okayama", "오카야마"],
    SANFRECCE_HIROSHIMA: ["산프레체히로시마", "산프레체 히로시마", "sanfreccehiroshima", "sanfrecce hiroshima", "히로시마"],
  },
  MLS_US: {
    REAL_SALT_LAKE: ["레알솔트레이크", "리얼솔트레이크", "레알솔트레이크fc", "realsaltlake", "realsaltlakefc", "rsl"],
    LAFC: ["lafc", "la fc", "로스앤젤레스fc", "losangelesfc", "losangelesfootballclub"],
  },
  EUROPE_GENERIC: {
    FEYENOORD: ["페예노르트", "페예노르", "feyenoord", "feyenoordrotterdam"],
    ADO_DEN_HAAG: ["ado덴하그", "ado덴하흐", "덴하그", "덴하흐", "adodenhaag", "denhaag"],
  },
  FOOTBALL_GENERIC: {},
};

function footballAdapterId(leagueRaw: string): FootballAdapterId {
  const league = String(leagueRaw ?? "").toLowerCase().replace(/\s/g, "");
  if (/j1|j리그|일본.*축구|일본j/.test(league)) return "J1_JP";
  if (/mls|미국.*축구|메이저리그사커/.test(league)) return "MLS_US";
  if (/에레디비시|네덜란드|epl|프리미어|라리가|분데스|세리에|리그1|유럽/.test(league)) return "EUROPE_GENERIC";
  return "FOOTBALL_GENERIC";
}

function footballCategoryIdForAdapter(adapterId: FootballAdapterId): string | null {
  if (adapterId === "J1_JP") return "jleague";
  if (adapterId === "MLS_US") return "mls";
  return null;
}

function footballAliasesFor(adapterId: FootballAdapterId) {
  return {
    ...FOOTBALL_ADAPTER_ALIASES.EUROPE_GENERIC,
    ...FOOTBALL_ADAPTER_ALIASES.MLS_US,
    ...FOOTBALL_ADAPTER_ALIASES.J1_JP,
    ...FOOTBALL_ADAPTER_ALIASES[adapterId],
  };
}

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

function normalizedFootballName(name: string, adapterId: FootballAdapterId = "FOOTBALL_GENERIC") {
  const target = normMlb(name);
  if (!target) return null;
  for (const [code, aliases] of Object.entries(footballAliasesFor(adapterId))) {
    if (aliases.some((alias) => {
      const a = normMlb(alias);
      return a === target || (a.length >= 4 && target.length >= 4 && (a.includes(target) || target.includes(a)));
    })) return code;
  }
  return target;
}

function footballTeamMatches(candidate: string, requested: string, adapterId: FootballAdapterId = "FOOTBALL_GENERIC") {
  const c = normalizedFootballName(candidate, adapterId);
  const r = normalizedFootballName(requested, adapterId);
  if (!c || !r) return false;
  return c === r || (c.length >= 4 && r.length >= 4 && (c.includes(r) || r.includes(c)));
}

async function resolveFootballGameId(date: string, home: string, away: string, startRaw: string, adapterId: FootballAdapterId) {
  const d = isoDate(date);
  const exactCategoryId = footballCategoryIdForAdapter(adapterId);
  const j1MonthFrom = `${d.slice(0, 8)}01`;
  const j1MonthTo = (() => {
    const [year, month] = d.split("-").map(Number);
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${d.slice(0, 8)}${String(last).padStart(2, "0")}`;
  })();
  const j1ActualFields = "basic%2Cschedule%2CmatchRound%2CroundTournamentInfo%2CphaseCode%2CgroupName%2Cleg%2ChasPtSore%2ChomePtScore%2CawayPtScore%2Cleague%2CleagueName%2CaggregateWinner%2CneutralGround%2Cpostponed%2CmanualRelayUrl";
  const endpoints = [
    adapterId === "J1_JP"
      ? `${NAVER_API}?fields=${j1ActualFields}&upperCategoryId=kfootball&categoryId=jleague&fromDate=${encodeURIComponent(j1MonthFrom)}&toDate=${encodeURIComponent(j1MonthTo)}&roundCodes=&size=500`
      : exactCategoryId
        ? `${NAVER_API}?fields=basic%2Cschedule%2Cfootball&upperCategoryId=wfootball&categoryId=${encodeURIComponent(exactCategoryId)}&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}&size=500`
        : null,
    `${NAVER_API}?fields=basic%2Cschedule%2Cfootball&upperCategoryId=wfootball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}&size=500`,
  ].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v as string) === i);

  const attempts: Array<{ endpoint: string; status: number | null; scheduleCount: number }> = [];
  let mergedRows: AnyObj[] = [];
  let lastStatus = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: adapterId === "J1_JP"
            ? `https://m.sports.naver.com/kfootball/schedule/index?category=jleague&date=${encodeURIComponent(d)}`
            : exactCategoryId
              ? `https://m.sports.naver.com/wfootball/schedule/index?category=${encodeURIComponent(exactCategoryId)}`
              : "https://m.sports.naver.com/wfootball/schedule/index",
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.64",
        },
      });
      lastStatus = response.status;
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        attempts.push({ endpoint, status: response.status, scheduleCount: 0 });
        continue;
      }

      const directRows = Array.isArray(payload?.result?.games) ? payload.result.games : [];
      const discoveredRows = allObjects(payload);
      const localById = new Map<string, AnyObj>();
      for (const obj of [...directRows, ...discoveredRows]) {
        const gameId = String(obj?.gameId ?? obj?.game_id ?? "").trim();
        if (!gameId) continue;
        const gameDate = dateKey(String(obj?.gameDateTime ?? obj?.gameDate ?? obj?.startTime ?? ""));
        // 축구 gameId는 MLS/J1 모두 opaque ID일 수 있으므로 gameId 앞 8자리로 날짜를 추정하지 않는다.
        if (gameDate && gameDate !== date) continue;
        if (!localById.has(gameId)) localById.set(gameId, obj);
      }
      const localRows = Array.from(localById.values());
      attempts.push({ endpoint, status: response.status, scheduleCount: localRows.length });
      mergedRows.push(...localRows);
      // 리그 전용 schedule 응답에서 실제 행을 확보했으면 generic 결과와 섞지 않는다.
      if (exactCategoryId && localRows.length > 0 && endpoint.includes(`categoryId=${encodeURIComponent(exactCategoryId)}`)) break;
    } catch {
      attempts.push({ endpoint, status: null, scheduleCount: 0 });
    }
  }

  const byId = new Map<string, AnyObj>();
  for (const obj of mergedRows) {
    const gameId = String(obj?.gameId ?? obj?.game_id ?? "").trim();
    if (gameId && !byId.has(gameId)) byId.set(gameId, obj);
  }
  const all = Array.from(byId.values());

  let candidates = all.filter((obj) => {
    const category = String(obj?.categoryId ?? obj?.category ?? obj?.upperCategoryId ?? "").trim().toLowerCase();
    if (exactCategoryId && category && category !== exactCategoryId && category !== "wfootball") return false;
    const h = String(obj?.homeTeamName ?? obj?.homeTeamShortName ?? obj?.homeTeamFullName ?? obj?.homeName ?? "");
    const a = String(obj?.awayTeamName ?? obj?.awayTeamShortName ?? obj?.awayTeamFullName ?? obj?.awayName ?? "");
    return footballTeamMatches(h, home, adapterId) && footballTeamMatches(a, away, adapterId);
  });

  const requestedMs = requestedStartMs(startRaw);
  if (candidates.length === 0 && requestedMs !== null) {
    const sameTime = all.filter((obj) => {
      const category = String(obj?.categoryId ?? obj?.category ?? obj?.upperCategoryId ?? "").trim().toLowerCase();
      if (exactCategoryId && category && category !== exactCategoryId && category !== "wfootball") return false;
      const ms = naverLocalGameMs(obj?.gameDateTime ?? obj?.startTime ?? obj?.gameTime);
      return ms !== null && Math.abs(ms - requestedMs) <= 5 * 60 * 1000;
    });
    // 팀명 매칭이 실패해도 같은 리그/같은 시각 후보가 정확히 1경기일 때만 안전하게 사용한다.
    if (sameTime.length === 1) candidates = sameTime;
  }

  let selected: AnyObj | null = candidates.length === 1 ? candidates[0] : null;
  let closestDiffMinutes: number | null = null;
  if (!selected && candidates.length > 1 && requestedMs !== null) {
    const ranked = candidates.map((obj) => {
      const ms = naverLocalGameMs(obj?.gameDateTime ?? obj?.startTime ?? obj?.gameTime);
      return { obj, diff: ms === null ? Number.POSITIVE_INFINITY : Math.abs(ms - requestedMs) };
    }).sort((a, b) => a.diff - b.diff);
    if (ranked[0] && Number.isFinite(ranked[0].diff) && (ranked[1]?.diff ?? Number.POSITIVE_INFINITY) !== ranked[0].diff) {
      selected = ranked[0].obj;
      closestDiffMinutes = Math.round(ranked[0].diff / 60000);
    }
  }

  const selectedCategoryId = String(selected?.categoryId ?? selected?.category ?? exactCategoryId ?? "").trim() || null;
  return {
    gameId: selected ? String(selected?.gameId ?? selected?.game_id) : null,
    endpoint: attempts[0]?.endpoint ?? endpoints[0] ?? null,
    status: attempts[0]?.status ?? lastStatus,
    scheduleCount: all.length,
    candidateCount: candidates.length,
    closestDiffMinutes,
    selectedCategoryId,
    exactCategoryId,
    selectedGame: selected ?? null,
    attempts,
    candidateTeams: all.slice(0, 40).map((obj) => ({
      gameId: String(obj?.gameId ?? obj?.game_id ?? ""),
      categoryId: obj?.categoryId ?? obj?.category ?? null,
      home: String(obj?.homeTeamName ?? obj?.homeTeamShortName ?? obj?.homeName ?? ""),
      away: String(obj?.awayTeamName ?? obj?.awayTeamShortName ?? obj?.awayName ?? ""),
      gameDateTime: obj?.gameDateTime ?? obj?.startTime ?? null,
    })),
    adapterId,
    build: "V13.8.64_J1_ACTUAL_SCHEDULE_API",
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

function footballPlayerSubstituteValue(player: AnyObj) {
  const raw = player?.substitute ?? player?.isSubstitute ?? player?.bench ?? player?.isBench;
  if (typeof raw === "boolean") return raw;
  const text = String(raw ?? "").trim().toLowerCase();
  if (["true", "1", "y", "yes", "sub", "bench"].includes(text)) return true;
  if (["false", "0", "n", "no", "starter", "start"].includes(text)) return false;
  const playType = String(player?.playerPlayType ?? player?.playType ?? "").trim().toLowerCase();
  if (/sub|bench|교체|후보/.test(playType)) return true;
  if (/start|starter|선발/.test(playType)) return false;
  return null;
}

function footballPlayerTeamCode(player: AnyObj) {
  return String(
    player?.teamId ?? player?.teamCode ?? player?.team?.id ?? player?.team?.teamId ?? player?.team?.code ?? ""
  ).trim();
}

function footballPlayerTeamName(player: AnyObj) {
  return String(
    player?.teamName ?? player?.team?.name ?? player?.team?.teamName ?? player?.clubName ?? ""
  ).trim();
}

function isFootballPlayerLike(p: AnyObj) {
  if (!p || typeof p !== "object") return false;
  const name = String(p?.playerName ?? p?.name ?? p?.player?.name ?? "").trim();
  const id = String(p?.playerId ?? p?.id ?? p?.player?.id ?? "").trim();
  const position = String(p?.position ?? p?.positionName ?? p?.player?.position ?? "").trim();
  const team = footballPlayerTeamCode(p) || footballPlayerTeamName(p);
  const sub = footballPlayerSubstituteValue(p);
  // 팀/선발/포지션 중 하나 이상이 동반된 실제 선수형 객체만 허용한다.
  return Boolean((name || id) && (team || sub !== null || position));
}

function extractFootballPlayers(payload: any) {
  const directCandidates = [
    payload?.result?.players,
    payload?.result?.playerList,
    payload?.result?.lineups,
    payload?.result?.lineup?.players,
    payload?.result?.data?.players,
    payload?.result?.football?.players,
    payload?.players,
  ];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      const rows = candidate.filter((p: AnyObj) => isFootballPlayerLike(p));
      if (rows.length >= 11) return rows;
    }
  }
  const arrays: AnyObj[][] = [];
  const visit = (value: any) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      const rows = value.filter((p: AnyObj) => isFootballPlayerLike(p));
      if (rows.length >= 11) arrays.push(rows);
      value.forEach(visit);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(payload);
  return arrays.sort((a, b) => b.length - a.length)[0] ?? [];
}

function cookieHeaderFromSetCookie(raw: string | null) {
  if (!raw) return "";
  // Multiple Set-Cookie headers may be collapsed into one string by fetch.
  // Split only where a new cookie name begins, then keep name=value.
  return raw
    .split(/,(?=[^;,\s]+=)/g)
    .map((chunk) => chunk.trim().split(";", 1)[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function fetchFootballPlayersFromNaverSession(gameId: string, categoryId: string | null) {
  const lineupPage = `https://m.sports.naver.com/game/${encodeURIComponent(gameId)}/lineup`;
  // V13.8.57: Chrome Network에서 확인된 실제 라인업 XHR 경로.
  // schedule/games/{gameId}/players 가 아니라 statistics/categories/{categoryId}/games/{gameId}/players 이다.
  const normalizedCategoryId = String(categoryId ?? "").trim().toLowerCase();
  const playersEndpoint = normalizedCategoryId
    ? `${NAVER_STATISTICS_API}/${encodeURIComponent(normalizedCategoryId)}/games/${encodeURIComponent(gameId)}/players`
    : `${NAVER_API}/${encodeURIComponent(gameId)}/players`;
  const desktopUa =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

  const pageResponse = await fetch(lineupPage, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
      "user-agent": desktopUa,
    },
  }).catch(() => null);

  const setCookie = pageResponse?.headers?.get("set-cookie") ?? null;
  const cookie = cookieHeaderFromSetCookie(setCookie);
  // Consume the body so the warm-up navigation is completed before the XHR-style request.
  if (pageResponse) await pageResponse.text().catch(() => "");

  const xhrHeaders: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "accept-language": "es-ES,es;q=0.9,ko;q=0.8",
    origin: "https://m.sports.naver.com",
    priority: "u=1, i",
    referer: lineupPage,
    "sec-ch-ua": '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": desktopUa,
  };
  if (cookie) xhrHeaders.cookie = cookie;

  const playersResponse = await fetch(playersEndpoint, {
    cache: "no-store",
    redirect: "follow",
    headers: xhrHeaders,
  }).catch(() => null);
  const playersPayload = playersResponse?.ok
    ? await playersResponse.json().catch(() => null)
    : null;

  return {
    pageStatus: pageResponse?.status ?? null,
    pageOk: Boolean(pageResponse?.ok),
    cookieCount: cookie ? cookie.split(";").filter(Boolean).length : 0,
    endpoint: playersEndpoint,
    status: playersResponse?.status ?? null,
    ok: Boolean(playersResponse?.ok),
    payload: playersPayload,
  };
}

function normalizeFootballPlayers(
  players: any,
  teamCode: any,
  substitute: boolean,
  teamName = ""
) {
  const code = String(teamCode ?? "").trim();
  if (!Array.isArray(players)) return [];
  return players
    .filter((p: AnyObj) => {
      const pCode = footballPlayerTeamCode(p);
      const pName = footballPlayerTeamName(p);
      const teamOk = code ? pCode === code : (teamName ? footballTeamMatches(pName, teamName) : false);
      if (!teamOk) return false;
      const subValue = footballPlayerSubstituteValue(p);
      return subValue === substitute;
    })
    .sort((a: AnyObj, b: AnyObj) => Number(a?.formationPlace ?? a?.formationOrder ?? 99) - Number(b?.formationPlace ?? b?.formationOrder ?? 99))
    .map((p: AnyObj) => ({
      playerId: String(p?.playerId ?? p?.id ?? "").trim() || null,
      pcode: String(p?.playerId ?? p?.id ?? "").trim() || null,
      name: String(p?.playerName ?? p?.name ?? "").trim() || null,
      position: String(p?.position ?? p?.positionName ?? "").trim() || null,
      formationPlace: Number.isFinite(Number(p?.formationPlace ?? p?.formationOrder)) ? Number(p?.formationPlace ?? p?.formationOrder) : null,
      shirtNumber: Number.isFinite(Number(p?.shirtNumber ?? p?.backNumber)) ? Number(p?.shirtNumber ?? p?.backNumber) : null,
      substitute,
      matchPlayed: Boolean(p?.matchPlayed),
      playerPlayType: String(p?.playerPlayType ?? p?.playType ?? "").trim() || null,
      countryName: String(p?.countryName ?? p?.country?.name ?? "").trim() || null,
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

function normalizeKboPreviewPlayers(fullLineUp: any) {
  if (!Array.isArray(fullLineUp)) return [];
  return fullLineUp
    .filter((p: AnyObj) => Number(p?.batorder ?? 0) >= 1 && Number(p?.batorder ?? 0) <= 9)
    .sort((a: AnyObj, b: AnyObj) => Number(a?.batorder ?? 99) - Number(b?.batorder ?? 99))
    .slice(0, 9)
    .map((p: AnyObj) => {
      const id = String(p?.playerCode ?? p?.pCode ?? p?.pcode ?? "").trim() || null;
      return {
        battingOrder: Number(p?.batorder ?? 0) || null,
        position: String(p?.positionName ?? p?.position ?? "").trim() || null,
        pcode: id,
        playerId: id,
        name: String(p?.playerName ?? p?.name ?? "").trim() || null,
        hitType: String(p?.hitType ?? "").trim() || null,
        backnum: String(p?.backnum ?? "").trim() || null,
        currentSeasonStats: { avg: null },
        source: "NAVER_KBO_PREVIEW",
      };
    })
    .filter((p: AnyObj) => Boolean(p.name));
}

function parseKboSeasonInnings(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return null;

  const fractionMatch = raw.match(/^(-?\d+)(?:\s+)?([⅓⅔])$/);
  if (fractionMatch) {
    const whole = Number(fractionMatch[1]);
    if (!Number.isFinite(whole)) return null;
    return whole + (fractionMatch[2] === "⅓" ? 1 / 3 : 2 / 3);
  }

  const slashMatch = raw.match(/^(-?\d+)(?:\s+)?([12])\/3$/);
  if (slashMatch) {
    const whole = Number(slashMatch[1]);
    const frac = Number(slashMatch[2]);
    if (!Number.isFinite(whole) || !Number.isFinite(frac)) return null;
    return whole + frac / 3;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function validatedKboStarterSeasonSample(season: any) {
  const gamesRaw = Number(season?.gameCount ?? season?.games ?? season?.g);
  const startsRaw = Number(season?.gamesStarted ?? season?.gameStarted ?? season?.starts ?? season?.gs);
  const games = Number.isFinite(gamesRaw) && gamesRaw >= 0 && gamesRaw <= 100 ? gamesRaw : null;
  const starts = Number.isFinite(startsRaw) && startsRaw >= 0 && startsRaw <= 40 ? startsRaw : null;

  // inn/innings/ip 계열을 우선하고 inn2는 마지막 후보로만 사용한다.
  const candidates = [
    season?.inningsPitched,
    season?.inningPitched,
    season?.innings,
    season?.ip,
    season?.inn,
    season?.inn2,
  ]
    .map(parseKboSeasonInnings)
    .filter((v): v is number => v !== null);

  let innings = candidates.find((v) => {
    if (v > 350) return false;
    if (games !== null && games >= 3 && v < games * 0.5) return false;
    return true;
  }) ?? null;

  // 표본 필드끼리 명백히 모순되면 잘못된 시즌 표본을 모델에 넣지 않는다.
  const inconsistentStarts =
    (Number.isFinite(startsRaw) && (startsRaw < 0 || startsRaw > 40)) ||
    (starts !== null && games !== null && starts > games);
  const inconsistentInnings =
    (candidates.length > 0 && innings === null && games !== null && games >= 3) ||
    (innings !== null && games !== null && games >= 3 && innings < games * 0.5);
  const sampleValid = !inconsistentStarts && !inconsistentInnings;

  if (!sampleValid) innings = null;

  return {
    innings,
    games: sampleValid ? games : null,
    gamesStarted: sampleValid ? starts : null,
    sampleValid,
    raw: {
      inn: season?.inn ?? null,
      inn2: season?.inn2 ?? null,
      innings: season?.innings ?? null,
      ip: season?.ip ?? null,
      gameCount: season?.gameCount ?? null,
      games: season?.games ?? null,
      g: season?.g ?? null,
      gamesStarted: season?.gamesStarted ?? null,
      gameStarted: season?.gameStarted ?? null,
      starts: season?.starts ?? null,
      gs: season?.gs ?? null,
    },
  };
}

function normalizeKboPreviewStarter(previewStarter: any, fullLineUp: any, fallbackName: any) {
  const lineupStarter = Array.isArray(fullLineUp)
    ? fullLineUp.find((p: AnyObj) => String(p?.positionName ?? "").includes("선발투수"))
    : null;
  const info = previewStarter?.playerInfo ?? {};
  const season = previewStarter?.currentSeasonStats ?? {};
  const seasonSample = validatedKboStarterSeasonSample(season);
  const name = String(info?.name ?? lineupStarter?.playerName ?? fallbackName ?? "").trim();
  if (!name) return null;
  const id = String(info?.pCode ?? lineupStarter?.playerCode ?? "").trim() || null;
  return {
    name,
    playerId: id,
    pcode: id,
    era: Number.isFinite(Number(season?.era)) ? Number(season.era) : null,
    whip: Number.isFinite(Number(season?.whip)) ? Number(season.whip) : null,
    innings: seasonSample.innings,
    games: seasonSample.games,
    gamesStarted: seasonSample.gamesStarted,
    seasonSampleValid: seasonSample.sampleValid,
    seasonSampleRaw: seasonSample.raw,
    wins: Number.isFinite(Number(season?.w)) ? Number(season.w) : null,
    losses: Number.isFinite(Number(season?.l)) ? Number(season.l) : null,
    strikeouts: Number.isFinite(Number(season?.kk)) ? Number(season.kk) : null,
    walks: Number.isFinite(Number(season?.bb)) ? Number(season.bb) : null,
    opponentEra: Number.isFinite(Number(previewStarter?.currentSeasonStatsOnOpponents?.era))
      ? Number(previewStarter.currentSeasonStatsOnOpponents.era) : null,
    status: "CONFIRMED",
    source: "NAVER_KBO_PREVIEW",
  };
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


function naverScheduleScoreNumber(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "number" || typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) return n;
      continue;
    }
    if (typeof value === "object") {
      const nested = naverScheduleScoreNumber(
        value?.current,
        value?.final,
        value?.display,
        value?.value,
        value?.score,
        value?.runs,
        value?.total,
      );
      if (nested !== null) return nested;
    }
  }
  return null;
}

function naverScheduleFinalScore(game: AnyObj) {
  const home = naverScheduleScoreNumber(
    game?.homeTeamScore,
    game?.homeScore,
    game?.hScore,
    game?.score?.home,
    game?.scores?.home,
    game?.result?.home,
    game?.home?.score,
  );
  const away = naverScheduleScoreNumber(
    game?.awayTeamScore,
    game?.awayScore,
    game?.aScore,
    game?.score?.away,
    game?.scores?.away,
    game?.result?.away,
    game?.away?.score,
  );
  return home !== null && away !== null ? { home, away } : null;
}

function naverFootballGameCompleted(game: AnyObj) {
  const statusText = [game?.statusCode, game?.statusInfo, game?.gameStatus, game?.status]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  if (/cancel|postpon|suspend|scheduled|before|live|진행|예정|취소|연기|중단/.test(statusText)) return false;
  if (/final|finish|ended|end|result|종료/.test(statusText)) return true;
  const score = naverScheduleFinalScore(game);
  if (!score) return false;
  const ms = naverLocalGameMs(game?.gameDateTime ?? game?.startTime ?? game?.gameDate);
  return ms !== null && ms < Date.now() - 3 * 60 * 60 * 1000;
}

function summarizeFootballScheduleTeam(rows: AnyObj[], teamName: string, adapterId: FootballAdapterId) {
  const fixtures: AnyObj[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let scored = 0;
  let conceded = 0;
  let formPlayed = 0;

  for (const g of rows) {
    if (fixtures.length >= 20) break;
    if (!naverFootballGameCompleted(g)) continue;
    const score = naverScheduleFinalScore(g);
    if (!score) continue;
    const isHome = footballTeamMatches(String(g?.homeTeamName ?? g?.home ?? ""), teamName, adapterId);
    const isAway = footballTeamMatches(String(g?.awayTeamName ?? g?.away ?? ""), teamName, adapterId);
    if (!isHome && !isAway) continue;
    const teamScored = isHome ? score.home : score.away;
    const teamConceded = isHome ? score.away : score.home;
    if (formPlayed < 5) {
      scored += teamScored;
      conceded += teamConceded;
      if (teamScored > teamConceded) wins += 1;
      else if (teamScored < teamConceded) losses += 1;
      else draws += 1;
      formPlayed += 1;
    }
    const date = g?.gameDateTime ?? g?.gameDate ?? g?.startTime ?? null;
    fixtures.push({
      gameId: g?.gameId ?? null,
      date,
      startTime: date,
      home: g?.homeTeamName ?? g?.home ?? null,
      away: g?.awayTeamName ?? g?.away ?? null,
      homeScore: score.home,
      awayScore: score.away,
      score: { home: score.home, away: score.away },
      teamSide: isHome ? "home" : "away",
      venue: isHome ? "home" : "away",
      teamName,
      source: "NAVER_FOOTBALL_SCHEDULE",
    });
  }
  return {
    teamName,
    form: { played: formPlayed, wins, draws, losses, scored, conceded },
    fixtures,
  };
}

function naverVerifyGameCompleted(game: AnyObj) {
  const statusText = [game?.statusCode, game?.statusInfo, game?.gameStatus, game?.status]
    .map((v) => String(v ?? "").toLowerCase())
    .join(" ");
  if (/cancel|postpon|suspend|scheduled|before|live|진행|예정|취소|연기|중단/.test(statusText)) return false;
  if (/final|finish|finished|ended|end|result|종료|경기종료/.test(statusText)) return true;
  return false;
}

async function collectFootballRecentSummary(date: string, home: string, away: string, adapterId: FootballAdapterId) {
  const fromDate = isoDayOffset(date, -40);
  const toDate = isoDayOffset(date, -1);
  const j1ActualFields = "basic%2Cschedule%2CmatchRound%2CroundTournamentInfo%2CphaseCode%2CgroupName%2Cleg%2ChasPtSore%2ChomePtScore%2CawayPtScore%2Cleague%2CleagueName%2CaggregateWinner%2CneutralGround%2Cpostponed%2CmanualRelayUrl";
  const endpoint = adapterId === "J1_JP"
    ? `${NAVER_API}?fields=${j1ActualFields}&upperCategoryId=kfootball&categoryId=jleague&fromDate=${fromDate}&toDate=${toDate}&roundCodes=&size=500`
    : `${NAVER_API}?fields=basic%2Cschedule%2Cfootball&upperCategoryId=wfootball&fromDate=${fromDate}&toDate=${toDate}&size=500`;
  const scheduleResult = await fetchNaverJsonCached(
    endpoint,
    adapterId === "J1_JP"
      ? `https://m.sports.naver.com/kfootball/schedule/index?category=jleague&date=${encodeURIComponent(date)}`
      : "https://m.sports.naver.com/wfootball/schedule/index",
    true,
  );
  const directRows = Array.isArray(scheduleResult?.payload?.result?.games) ? scheduleResult.payload.result.games : [];
  const discoveredRows = allObjects(scheduleResult?.payload ?? {});
  const byId = new Map<string, AnyObj>();
  for (const row of [...directRows, ...discoveredRows]) {
    const gameId = String(row?.gameId ?? row?.game_id ?? "").trim();
    if (!gameId || byId.has(gameId)) continue;
    const rowDate = dateKey(String(row?.gameDateTime ?? row?.gameDate ?? gameId.slice(0, 8) ?? ""));
    if (!rowDate || rowDate >= date) continue;
    byId.set(gameId, row);
  }
  const rows = Array.from(byId.values()).sort((a, b) =>
    String(b?.gameDateTime ?? b?.gameDate ?? "").localeCompare(String(a?.gameDateTime ?? a?.gameDate ?? ""))
  );
  const teamGames = (team: string) => rows.filter((g) =>
    footballTeamMatches(String(g?.homeTeamName ?? g?.home ?? ""), team, adapterId) ||
    footballTeamMatches(String(g?.awayTeamName ?? g?.away ?? ""), team, adapterId)
  );
  const recentSummary = {
    home: summarizeFootballScheduleTeam(teamGames(home), home, adapterId),
    away: summarizeFootballScheduleTeam(teamGames(away), away, adapterId),
  };
  return {
    recentSummary,
    endpoint,
    status: scheduleResult.status,
    cacheHit: scheduleResult.cacheHit,
    scheduleGames: rows.length,
  };
}

function summarizeNaverScheduleTeam(rows: AnyObj[], teamName: string) {
  /*
   * V13.8.44:
   * - Form 집계는 기존과 동일하게 최신 완료 5경기만 사용.
   * - 장소표본은 그 5경기에 원하는 venue가 없을 수 있으므로 fixture pool은
   *   최근 40일 범위에서 최대 20경기까지 전달한다. page.tsx가 이 중 최근
   *   home/away 최대 5개를 별도로 가중 집계한다.
   */
  const fixtures: AnyObj[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let scored = 0;
  let conceded = 0;
  let formPlayed = 0;

  for (const g of rows) {
    if (fixtures.length >= 20) break;
    const score = naverScheduleFinalScore(g);
    if (!score) continue;

    const isHome = teamMatches(String(g?.homeTeamName ?? g?.home ?? ""), teamName);
    const isAway = teamMatches(String(g?.awayTeamName ?? g?.away ?? ""), teamName);
    if (!isHome && !isAway) continue;

    const teamScored = isHome ? score.home : score.away;
    const teamConceded = isHome ? score.away : score.home;

    // Form은 최신 완료 5경기까지만 집계한다.
    if (formPlayed < 5) {
      scored += teamScored;
      conceded += teamConceded;
      if (teamScored > teamConceded) wins += 1;
      else if (teamScored < teamConceded) losses += 1;
      else draws += 1;
      formPlayed += 1;
    }

    const date = g?.gameDateTime ?? g?.gameDate ?? null;
    fixtures.push({
      gameId: g?.gameId ?? null,
      date,
      startTime: date,
      home: g?.homeTeamName ?? g?.home ?? null,
      away: g?.awayTeamName ?? g?.away ?? null,
      homeScore: score.home,
      awayScore: score.away,
      score: { home: score.home, away: score.away },
      teamSide: isHome ? "home" : "away",
      venue: isHome ? "home" : "away",
      teamName,
      source: "NAVER_SCHEDULE",
    });
  }

  return {
    teamName,
    form: {
      played: formPlayed,
      wins,
      draws,
      losses,
      scored,
      conceded,
      goalDifference: scored - conceded,
      formPercent: formPlayed > 0 ? Number(((wins / formPlayed) * 100).toFixed(1)) : null,
    },
    fixtures,
    games: fixtures,
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
  if (!raw) return 0;

  // Naver KBO completed-game /record uses baseball fractions such as
  // "2 ⅓", "1 ⅔" (and some feeds use "2 1/3" / "1.2").
  const normalized = raw
    .replace(/⅓/g, " 1/3")
    .replace(/⅔/g, " 2/3")
    .replace(/\s+/g, " ")
    .trim();

  const mixed = normalized.match(/^(\d+)\s+([12])\/3$/);
  if (mixed) return Number(mixed[1]) * 3 + Number(mixed[2]);

  const fractionOnly = normalized.match(/^([12])\/3$/);
  if (fractionOnly) return Number(fractionOnly[1]);

  const decimal = normalized.match(/^(\d+)(?:\.(\d))?$/);
  if (!decimal) return 0;
  const whole = Number(decimal[1]);
  const frac = Number(decimal[2] ?? 0);
  return whole * 3 + Math.min(2, Math.max(0, frac));
}

function recordPitchers(recordData: AnyObj | null, side: "home" | "away") {
  const boxscore = recordData?.pitchersBoxscore?.[side];
  if (Array.isArray(boxscore)) return boxscore;

  // Compatibility fallback for NPB/MLB or older Naver record shapes.
  const legacy = side === "home" ? recordData?.homePitcher : recordData?.awayPitcher;
  return Array.isArray(legacy) ? legacy : [];
}

function recordBatters(recordData: AnyObj | null, side: "home" | "away") {
  const boxscore = recordData?.battersBoxscore?.[side];
  return Array.isArray(boxscore) ? boxscore : [];
}

function batterRowSummary(row: AnyObj, game: AnyObj, side: "home" | "away") {
  const id = String(row?.playerCode ?? row?.playerId ?? row?.pcode ?? row?.pCode ?? "").trim() || null;
  return {
    gameId: String(game?.gameId ?? "") || null,
    date: game?.gameDate ?? null,
    gameDateTime: game?.gameDateTime ?? null,
    opponent: side === "home" ? game?.awayTeamName ?? null : game?.homeTeamName ?? null,
    name: String(row?.name ?? row?.playerName ?? "").trim() || null,
    playerId: id,
    atBats: Number.isFinite(Number(row?.ab)) ? Number(row.ab) : 0,
    hits: Number.isFinite(Number(row?.hit)) ? Number(row.hit) : 0,
    runs: Number.isFinite(Number(row?.run ?? row?.r)) ? Number(row?.run ?? row?.r) : 0,
    rbi: Number.isFinite(Number(row?.rbi)) ? Number(row.rbi) : 0,
    homeRuns: Number.isFinite(Number(row?.hr)) ? Number(row.hr) : 0,
    walks: Number.isFinite(Number(row?.bb)) ? Number(row.bb) : 0,
    strikeouts: Number.isFinite(Number(row?.kk ?? row?.so)) ? Number(row?.kk ?? row?.so) : 0,
  };
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
  homeLineup?: AnyObj[];
  awayLineup?: AnyObj[];
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

  const recentSummary = {
    home: summarizeNaverScheduleTeam(teamGames(args.home), args.home),
    away: summarizeNaverScheduleTeam(teamGames(args.away), args.away),
  };

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
      const pitchers = recordPitchers(rec.recordData, isHome ? "home" : "away");
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
      const pitchers = recordPitchers(rec.recordData, isHome ? "home" : "away");
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

  async function recentBatting(team: string, lineup: AnyObj[]) {
    const ids = new Set(lineup.map((p: AnyObj) => String(p?.playerId ?? p?.pcode ?? "").trim()).filter(Boolean));
    const names = new Set(lineup.map((p: AnyObj) => normalizePerson(p?.name)).filter(Boolean));
    const recentGames = teamGames(team).slice(0, 5);
    const byPlayer = new Map<string, AnyObj>();
    let gamesWithData = 0;

    for (const g of recentGames) {
      const rec = await fetchHistoricalRecord(String(g?.gameId ?? ""));
      const isHome = teamMatches(String(g?.homeTeamName ?? ""), team);
      const batters = recordBatters(rec.recordData, isHome ? "home" : "away");
      if (batters.length) gamesWithData += 1;
      for (const row of batters) {
        const summary = batterRowSummary(row, g, isHome ? "home" : "away");
        const normalizedName = normalizePerson(summary.name);
        if (!ids.has(String(summary.playerId ?? "")) && !names.has(normalizedName)) continue;
        const key = String(summary.playerId || normalizedName || "");
        if (!key) continue;
        const current = byPlayer.get(key) ?? {
          playerId: summary.playerId,
          name: summary.name,
          games: 0, atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0,
          gameLogs: [],
        };
        current.games += 1;
        current.atBats += summary.atBats;
        current.hits += summary.hits;
        current.runs += summary.runs;
        current.rbi += summary.rbi;
        current.homeRuns += summary.homeRuns;
        current.walks += summary.walks;
        current.strikeouts += summary.strikeouts;
        current.gameLogs.push(summary);
        byPlayer.set(key, current);
      }
    }

    const players = Array.from(byPlayer.values()).map((p: AnyObj) => ({
      ...p,
      avg: p.atBats > 0 ? Number((p.hits / p.atBats).toFixed(3)) : null,
    }));
    const totals = players.reduce((acc: AnyObj, p: AnyObj) => {
      acc.games += Number(p.games ?? 0); acc.atBats += Number(p.atBats ?? 0); acc.hits += Number(p.hits ?? 0);
      acc.runs += Number(p.runs ?? 0); acc.rbi += Number(p.rbi ?? 0); acc.homeRuns += Number(p.homeRuns ?? 0);
      acc.walks += Number(p.walks ?? 0); acc.strikeouts += Number(p.strikeouts ?? 0); return acc;
    }, { games: 0, atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 });
    return {
      gamesChecked: recentGames.length,
      gamesWithData,
      lineupPlayers: lineup.length,
      playersMatched: players.length,
      players,
      summary: {
        ...totals,
        avg: totals.atBats > 0 ? Number((totals.hits / totals.atBats).toFixed(3)) : null,
      },
    };
  }

  const [homeStarterRecent, awayStarterRecent, homeBullpen, awayBullpen, homeRecentBatting, awayRecentBatting] = await Promise.all([
    starterRecent(args.home, args.homeStarter),
    starterRecent(args.away, args.awayStarter),
    bullpen(args.home),
    bullpen(args.away),
    recentBatting(args.home, args.homeLineup ?? []),
    recentBatting(args.away, args.awayLineup ?? []),
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
    recentBatting: { home: homeRecentBatting, away: awayRecentBatting },
    recentSummary,
    coverage: {
      scheduleGames: games.length,
      starterRecentStarts: Number(homeStarterRecent.startsFound) + Number(awayStarterRecent.startsFound),
      bullpenGames: Number(homeBullpen.gamesChecked) + Number(awayBullpen.gamesChecked),
      recentBattingPlayers: Number(homeRecentBatting.playersMatched) + Number(awayRecentBatting.playersMatched),
      recentBattingGames: Number(homeRecentBatting.gamesWithData) + Number(awayRecentBatting.gamesWithData),
    },
  };
}

// DEPLOY_MARKER_V13_8_76_NPB_OFFICIAL_DATA_ADAPTER_AUDIT_ONLY_20260915
// DEPLOY_MARKER_V13_8_79_NPB_OFFICIAL_STARTER_BULLPEN_AUDIT_FIX_20260916
// DEPLOY_MARKER_V13_8_77_MLB_OFFICIAL_STATSAPI_ADAPTER_AUDIT_ONLY_20260916
type NpbOfficialTeamMeta = {
  code: string;
  slug: string;
  shortJa: string;
  fullJa: string;
  aliases: string[];
};

const NPB_OFFICIAL_TEAMS: NpbOfficialTeamMeta[] = [
  { code: "SE", slug: "l", shortJa: "西武", fullJa: "埼玉西武ライオンズ", aliases: ["세이부", "사이타마세이부", "seibu", "saitama seibu", "埼玉西武", "西武"] },
  { code: "RT", slug: "e", shortJa: "楽天", fullJa: "東北楽天ゴールデンイーグルス", aliases: ["라쿠텐", "rakuten", "東北楽天", "楽天"] },
  { code: "OX", slug: "b", shortJa: "オリックス", fullJa: "オリックス・バファローズ", aliases: ["오릭스", "orix", "オリックス"] },
  { code: "SF", slug: "h", shortJa: "ソフトバンク", fullJa: "福岡ソフトバンクホークス", aliases: ["소프트뱅크", "후쿠오카소프트뱅크", "softbank", "福岡ソフトバンク", "ソフトバンク"] },
  { code: "YK", slug: "db", shortJa: "DeNA", fullJa: "横浜DeNAベイスターズ", aliases: ["요코하마", "dena", "yokohama", "横浜dena", "DeNA"] },
  { code: "JN", slug: "d", shortJa: "中日", fullJa: "中日ドラゴンズ", aliases: ["주니치", "chunichi", "中日"] },
  { code: "HI", slug: "c", shortJa: "広島", fullJa: "広島東洋カープ", aliases: ["히로시마", "hiroshima", "広島"] },
  { code: "YA", slug: "s", shortJa: "ヤクルト", fullJa: "東京ヤクルトスワローズ", aliases: ["야쿠르트", "yakult", "東京ヤクルト", "ヤクルト"] },
  { code: "HS", slug: "t", shortJa: "阪神", fullJa: "阪神タイガース", aliases: ["한신", "hanshin", "阪神"] },
  { code: "YO", slug: "g", shortJa: "巨人", fullJa: "読売ジャイアンツ", aliases: ["요미우리", "요미우리자이언츠", "yomiuri", "giants", "読売", "巨人"] },
  { code: "NH", slug: "f", shortJa: "日本ハム", fullJa: "北海道日本ハムファイターズ", aliases: ["닛폰햄", "니혼햄", "nipponham", "日本ハム", "北海道日本ハム"] },
  { code: "JL", slug: "m", shortJa: "ロッテ", fullJa: "千葉ロッテマリーンズ", aliases: ["지바롯데", "치바롯데", "롯데", "lotte", "千葉ロッテ", "ロッテ"] },
];

function npbOfficialTeamMeta(name: string): NpbOfficialTeamMeta | null {
  const code = npbTeamCode(name);
  if (code) {
    const direct = NPB_OFFICIAL_TEAMS.find((team) => team.code === code);
    if (direct) return direct;
  }
  const target = norm(name);
  if (!target) return null;
  return NPB_OFFICIAL_TEAMS.find((team) =>
    [team.shortJa, team.fullJa, ...team.aliases].some((alias) => {
      const normalized = norm(alias);
      return normalized && (normalized === target || normalized.includes(target) || target.includes(normalized));
    })
  ) ?? null;
}

type NpbHtmlCacheEntry = { at: number; status: number; text: string };
const npbHtmlCache = new Map<string, NpbHtmlCacheEntry>();
const npbHtmlInflight = new Map<string, Promise<{ ok: boolean; status: number; text: string; cacheHit: boolean }>>();

async function fetchNpbHtmlCached(url: string, historical = true) {
  if (historical) {
    const cached = npbHtmlCache.get(url);
    if (cached && Date.now() - cached.at < HIST_TTL_MS) {
      return { ok: cached.status >= 200 && cached.status < 300, status: cached.status, text: cached.text, cacheHit: true };
    }
    const inflight = npbHtmlInflight.get(url);
    if (inflight) return inflight;
  }

  const task = (async () => {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "ja,en-US;q=0.8,en;q=0.7",
          referer: "https://npb.jp/",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 WisetotoAnalyzer/13.8.76",
        },
      });
      const body = await response.text().catch(() => "");
      if (historical && response.ok && body) {
        npbHtmlCache.set(url, { at: Date.now(), status: response.status, text: body });
      }
      return { ok: response.ok && Boolean(body), status: response.status, text: body, cacheHit: false };
    } catch {
      return { ok: false, status: 0, text: "", cacheHit: false };
    } finally {
      if (historical) npbHtmlInflight.delete(url);
    }
  })();

  if (historical) npbHtmlInflight.set(url, task);
  return task;
}

function decodeHtmlEntityText(value: string) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|table|thead|tbody|tfoot)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function npbTableRows(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  for (const rowHtml of rowMatches) {
    const cells = (rowHtml.match(/<(?:th|td)\b[\s\S]*?<\/(?:th|td)>/gi) ?? [])
      .map((cell) => decodeHtmlEntityText(cell).replace(/\s+/g, " ").trim());
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function npbHeaderIndex(headers: string[], ...candidates: string[]) {
  const normalized = headers.map((h) => h.replace(/\s+/g, ""));
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h === candidate || h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function npbParseNumber(value: any) {
  const cleaned = String(value ?? "").replace(/[^\d.+-]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function npbParseBattingTable(tableHtml: string) {
  const rows = npbTableRows(tableHtml);
  const headerIndex = rows.findIndex((row) => row.some((c) => c.includes("選手")) && row.some((c) => c.includes("打数")));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex];
  const nameIdx = npbHeaderIndex(headers, "選手");
  const abIdx = npbHeaderIndex(headers, "打数");
  const runIdx = npbHeaderIndex(headers, "得点");
  const hitIdx = npbHeaderIndex(headers, "安打");
  const rbiIdx = npbHeaderIndex(headers, "打点");
  const stealIdx = npbHeaderIndex(headers, "盗塁");

  return rows.slice(headerIndex + 1).flatMap((cells) => {
    const name = String(cells[nameIdx] ?? "").trim();
    if (!name || /チーム計|選手/.test(name)) return [];
    const firstCell = String(cells[0] ?? "").trim();
    const eventCells = cells.slice(Math.max(stealIdx + 1, 7));
    const walks = eventCells.filter((v) => /四球|敬遠/.test(v)).length;
    const strikeouts = eventCells.filter((v) => /三振/.test(v)).length;
    const homeRuns = eventCells.filter((v) => /本(?:①|②|③|満|$)|本塁打/.test(v)).length;
    return [{
      order: /^\d+$/.test(firstCell) ? Number(firstCell) : null,
      name,
      normalizedName: normalizePerson(name),
      atBats: abIdx >= 0 ? npbParseNumber(cells[abIdx]) : 0,
      runs: runIdx >= 0 ? npbParseNumber(cells[runIdx]) : 0,
      hits: hitIdx >= 0 ? npbParseNumber(cells[hitIdx]) : 0,
      rbi: rbiIdx >= 0 ? npbParseNumber(cells[rbiIdx]) : 0,
      homeRuns,
      walks,
      strikeouts,
    }];
  });
}

function npbParsePitchingTable(tableHtml: string) {
  const rows = npbTableRows(tableHtml);
  const headerIndex = rows.findIndex((row) => row.some((c) => c.includes("投手")) && row.some((c) => c.includes("投球回")));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex];
  const nameIdx = npbHeaderIndex(headers, "投手");
  const pitchIdx = npbHeaderIndex(headers, "投球数");
  const innIdx = npbHeaderIndex(headers, "投球回");
  const hitIdx = npbHeaderIndex(headers, "安打");
  const hrIdx = npbHeaderIndex(headers, "本塁打");
  const bbIdx = npbHeaderIndex(headers, "四球");
  const soIdx = npbHeaderIndex(headers, "三振");
  const runIdx = npbHeaderIndex(headers, "失点");
  const erIdx = npbHeaderIndex(headers, "自責点");

  return rows.slice(headerIndex + 1).flatMap((cells) => {
    const name = String(cells[nameIdx] ?? "").trim();
    if (!name || /チーム計|投手/.test(name)) return [];
    const innings = String(cells[innIdx] ?? "").replace(/\s+/g, "").trim();
    return [{
      name,
      normalizedName: normalizePerson(name),
      innings,
      outs: inningsToOuts(innings),
      pitches: pitchIdx >= 0 ? npbParseNumber(cells[pitchIdx]) : null,
      hits: hitIdx >= 0 ? npbParseNumber(cells[hitIdx]) : 0,
      homeRuns: hrIdx >= 0 ? npbParseNumber(cells[hrIdx]) : 0,
      walks: bbIdx >= 0 ? npbParseNumber(cells[bbIdx]) : 0,
      strikeouts: soIdx >= 0 ? npbParseNumber(cells[soIdx]) : 0,
      runs: runIdx >= 0 ? npbParseNumber(cells[runIdx]) : 0,
      earnedRuns: erIdx >= 0 ? npbParseNumber(cells[erIdx]) : 0,
    }];
  });
}

function npbParseBoxHtml(html: string) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  const battingTables = tables.filter((table) => {
    const tableText = decodeHtmlEntityText(table);
    return tableText.includes("選手") && tableText.includes("打数") && tableText.includes("安打") && !tableText.includes("投球回");
  });
  const pitchingTables = tables.filter((table) => {
    const tableText = decodeHtmlEntityText(table);
    return tableText.includes("投手") && tableText.includes("投球回") && tableText.includes("自責点");
  });
  const plain = decodeHtmlEntityText(html);
  const startMatch = plain.match(/◇開始\s*(\d{1,2}):(\d{2})/);
  return {
    completed: /試合終了/.test(plain),
    startTime: startMatch ? `${String(Number(startMatch[1])).padStart(2, "0")}:${startMatch[2]}` : null,
    batting: {
      away: battingTables[0] ? npbParseBattingTable(battingTables[0]) : [],
      home: battingTables[1] ? npbParseBattingTable(battingTables[1]) : [],
    },
    pitching: {
      away: pitchingTables[0] ? npbParsePitchingTable(pitchingTables[0]) : [],
      home: pitchingTables[1] ? npbParsePitchingTable(pitchingTables[1]) : [],
    },
    tableCounts: { batting: battingTables.length, pitching: pitchingTables.length },
  };
}

function npbScheduleMonthUrl(year: number, month: number) {
  return `https://npb.jp/games/${year}/schedule_${String(month).padStart(2, "0")}_detail.html`;
}

function npbPrevMonth(year: number, month: number) {
  if (month > 1) return { year, month: month - 1 };
  return { year: year - 1, month: 12 };
}

function npbExtractGameLinks(html: string, base = "https://npb.jp") {
  const links = new Set<string>();
  const regex = /href\s*=\s*["']([^"']*\/scores\/(\d{4})\/(\d{4})\/([a-z0-9]+-[a-z0-9]+-\d+)\/?(?:index\.html|box\.html)?[^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], base);
      const pathMatch = absolute.pathname.match(/\/scores\/(\d{4})\/(\d{4})\/([a-z0-9]+-[a-z0-9]+-\d+)\//i);
      if (!pathMatch) continue;
      links.add(`https://npb.jp/scores/${pathMatch[1]}/${pathMatch[2]}/${pathMatch[3]}/`);
    } catch {
      // ignore malformed href
    }
  }
  return Array.from(links);
}

function npbGameLinkMeta(url: string) {
  const match = String(url).match(/\/scores\/(\d{4})\/(\d{4})\/([a-z0-9]+)-([a-z0-9]+)-(\d+)\//i);
  if (!match) return null;
  return {
    year: Number(match[1]),
    mmdd: match[2],
    dateKey: `${match[1]}${match[2]}`,
    homeSlug: match[3].toLowerCase(),
    awaySlug: match[4].toLowerCase(),
    seriesNo: Number(match[5]),
    rootUrl: `https://npb.jp/scores/${match[1]}/${match[2]}/${match[3]}-${match[4]}-${match[5]}/`,
    boxUrl: `https://npb.jp/scores/${match[1]}/${match[2]}/${match[3]}-${match[4]}-${match[5]}/box.html`,
  };
}

function npbOfficialGameMs(dateKeyRaw: string, startTime: string | null) {
  const match = String(dateKeyRaw).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const time = String(startTime ?? "18:00").match(/^(\d{1,2}):(\d{2})$/);
  const hh = time ? Number(time[1]) : 18;
  const mm = time ? Number(time[2]) : 0;
  const ms = Date.parse(`${match[1]}-${match[2]}-${match[3]}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+09:00`);
  return Number.isFinite(ms) ? ms : null;
}


function npbExtractStarterPairFromScheduleRow(
  html: string,
  game: NonNullable<ReturnType<typeof npbGameLinkMeta>> | null,
) {
  if (!html || !game) return null;
  const pathToken = `/scores/${game.year}/${game.mmdd}/${game.homeSlug}-${game.awaySlug}-${game.seriesNo}/`;
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const rowHtml = rows.find((row) => row.includes(pathToken)) ?? null;
  if (!rowHtml) return null;

  const playerNames: string[] = [];
  const playerAnchor = /<a\b[^>]*href\s*=\s*["'][^"']*\/bis\/players\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = playerAnchor.exec(rowHtml)) !== null) {
    const name = decodeHtmlEntityText(match[1]).replace(/\s+/g, " ").trim();
    if (name && !playerNames.some((value) => normalizePerson(value) === normalizePerson(name))) playerNames.push(name);
  }
  if (playerNames.length < 2) return null;
  return {
    home: playerNames[0],
    away: playerNames[1],
    source: "NPB_SCHEDULE_DETAIL_CURRENT_GAME",
    rowText: decodeHtmlEntityText(rowHtml).replace(/\s+/g, " ").trim(),
  };
}

function npbTeamResultsUrl(team: NpbOfficialTeamMeta, month: number | "index") {
  const suffix = month === "index" ? "index" : String(month).padStart(2, "0");
  return `https://npb.jp/bis/teams/results_${team.slug}_${suffix}.html`;
}

function npbParseTeamStarterRows(html: string, year: number, monthHint: number) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  const table = tables.find((candidate) => {
    const text = decodeHtmlEntityText(candidate);
    return text.includes("月日") && text.includes("先発投手");
  });
  if (!table) return [] as Array<{ dateKey: string; starterName: string }>;

  const rows = npbTableRows(table);
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.includes("月日")) && row.some((cell) => cell.includes("先発投手")));
  if (headerIndex < 0) return [] as Array<{ dateKey: string; starterName: string }>;
  const headers = rows[headerIndex];
  const dateIdx = npbHeaderIndex(headers, "月日");
  const starterIdx = npbHeaderIndex(headers, "先発投手");
  if (dateIdx < 0 || starterIdx < 0) return [] as Array<{ dateKey: string; starterName: string }>;

  let month = monthHint;
  const out: Array<{ dateKey: string; starterName: string }> = [];
  for (const cells of rows.slice(headerIndex + 1)) {
    const rawDate = String(cells[dateIdx] ?? "").replace(/\s+/g, "").trim();
    const rawStarter = String(cells[starterIdx] ?? "").replace(/\s+/g, " ").trim();
    if (!rawDate || !rawStarter || /先発投手/.test(rawStarter)) continue;
    let day: number | null = null;
    const md = rawDate.match(/^(\d{1,2})\/(\d{1,2})/);
    if (md) {
      month = Number(md[1]);
      day = Number(md[2]);
    } else {
      const d = rawDate.match(/^(\d{1,2})/);
      if (d) day = Number(d[1]);
    }
    if (!day || !month) continue;
    const starterName = rawStarter.replace(/^[○●△\-－–—\s]+/, "").trim();
    if (!starterName) continue;
    out.push({ dateKey: `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`, starterName });
  }
  return out;
}

async function npbStarterGameMetas(args: {
  team: NpbOfficialTeamMeta;
  starterName: string | null;
  date: string;
  year: number;
  month: number;
  allMetas: NonNullable<ReturnType<typeof npbGameLinkMeta>>[];
}) {
  if (!normalizePerson(args.starterName)) {
    return { metas: [] as NonNullable<ReturnType<typeof npbGameLinkMeta>>[], resultRows: 0, statuses: [] as AnyObj[] };
  }
  const prev = npbPrevMonth(args.year, args.month);
  const urlDefs = [
    { url: npbTeamResultsUrl(args.team, "index"), monthHint: args.month },
    { url: npbTeamResultsUrl(args.team, args.month), monthHint: args.month },
    { url: npbTeamResultsUrl(args.team, prev.month), monthHint: prev.month },
  ];
  const results = await Promise.all(urlDefs.map((item) => fetchNpbHtmlCached(item.url, true)));
  const rows = results.flatMap((result, index) => result.ok ? npbParseTeamStarterRows(result.text, args.year, urlDefs[index].monthHint) : []);
  const matchingDates = Array.from(new Set(rows
    .filter((row) => row.dateKey < args.date && personMatches(row.starterName, args.starterName))
    .map((row) => row.dateKey)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 5);
  const metas = matchingDates.flatMap((dateKey) => {
    const meta = args.allMetas.find((game) => game.dateKey === dateKey && (game.homeSlug === args.team.slug || game.awaySlug === args.team.slug));
    return meta ? [meta] : [];
  });
  return {
    metas,
    resultRows: rows.length,
    statuses: results.map((result, index) => ({ url: urlDefs[index].url, status: result.status, cacheHit: result.cacheHit })),
  };
}

function npbExtractStarterFromAnnouncement(html: string, team: NpbOfficialTeamMeta | null) {
  if (!html || !team) return null;
  const anchorPattern = /<a\b[^>]*href\s*=\s*["'][^"']*\/bis\/players\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;
  const teamNames = [team.fullJa, team.shortJa].filter(Boolean);
  const positions = teamNames
    .flatMap((name) => {
      const out: number[] = [];
      let idx = html.indexOf(name);
      while (idx >= 0) {
        out.push(idx);
        idx = html.indexOf(name, idx + name.length);
      }
      return out;
    })
    .sort((a, b) => a - b);

  for (const pos of positions) {
    const chunk = html.slice(pos, pos + 1400);
    anchorPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = anchorPattern.exec(chunk)) !== null) {
      const name = decodeHtmlEntityText(match[1]).replace(/\s+/g, " ").trim();
      if (name && !teamNames.some((teamName) => name.includes(teamName))) return name;
    }
  }
  return null;
}

function npbAggregateBatting(rowsByGame: { game: any; rows: any[] }[], currentLineupNames: string[]) {
  const lineupSet = new Set(currentLineupNames.map((name) => normalizePerson(name)).filter(Boolean));
  const byPlayer = new Map<string, AnyObj>();
  let gamesWithData = 0;
  const teamTotals = { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 };

  for (const entry of rowsByGame) {
    if (entry.rows.length) gamesWithData += 1;
    for (const row of entry.rows) {
      teamTotals.atBats += Number(row.atBats ?? 0);
      teamTotals.hits += Number(row.hits ?? 0);
      teamTotals.runs += Number(row.runs ?? 0);
      teamTotals.rbi += Number(row.rbi ?? 0);
      teamTotals.homeRuns += Number(row.homeRuns ?? 0);
      teamTotals.walks += Number(row.walks ?? 0);
      teamTotals.strikeouts += Number(row.strikeouts ?? 0);

      if (lineupSet.size > 0 && !lineupSet.has(normalizePerson(row.name))) continue;
      const key = normalizePerson(row.name);
      if (!key) continue;
      const current = byPlayer.get(key) ?? {
        playerId: null,
        name: row.name,
        games: 0,
        atBats: 0,
        hits: 0,
        runs: 0,
        rbi: 0,
        homeRuns: 0,
        walks: 0,
        strikeouts: 0,
        gameLogs: [],
      };
      current.games += 1;
      current.atBats += Number(row.atBats ?? 0);
      current.hits += Number(row.hits ?? 0);
      current.runs += Number(row.runs ?? 0);
      current.rbi += Number(row.rbi ?? 0);
      current.homeRuns += Number(row.homeRuns ?? 0);
      current.walks += Number(row.walks ?? 0);
      current.strikeouts += Number(row.strikeouts ?? 0);
      current.gameLogs.push({ date: entry.game.dateKey, name: row.name, atBats: row.atBats, hits: row.hits });
      byPlayer.set(key, current);
    }
  }

  const lineupPlayers = Array.from(lineupSet);
  const matchedPlayers = Array.from(byPlayer.values()).filter((player) => lineupSet.size === 0 || lineupSet.has(normalizePerson(player.name)));
  const selectedTotals = lineupSet.size > 0
    ? matchedPlayers.reduce((acc: AnyObj, p: AnyObj) => {
        acc.atBats += Number(p.atBats ?? 0);
        acc.hits += Number(p.hits ?? 0);
        acc.runs += Number(p.runs ?? 0);
        acc.rbi += Number(p.rbi ?? 0);
        acc.homeRuns += Number(p.homeRuns ?? 0);
        acc.walks += Number(p.walks ?? 0);
        acc.strikeouts += Number(p.strikeouts ?? 0);
        return acc;
      }, { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 })
    : teamTotals;

  return {
    mode: lineupSet.size > 0 ? "OFFICIAL_LINEUP_RECENT" : "TEAM_RECENT_AUDIT",
    gamesChecked: rowsByGame.length,
    gamesWithData,
    lineupPlayers: lineupPlayers.length,
    playersMatched: lineupSet.size > 0 ? matchedPlayers.length : 0,
    players: lineupSet.size > 0 ? matchedPlayers.map((p: AnyObj) => ({
      ...p,
      avg: p.atBats > 0 ? Number((p.hits / p.atBats).toFixed(3)) : null,
    })) : [],
    summary: {
      ...selectedTotals,
      avg: selectedTotals.atBats > 0 ? Number((selectedTotals.hits / selectedTotals.atBats).toFixed(3)) : null,
      teamAtBats: teamTotals.atBats,
      teamHits: teamTotals.hits,
      teamAvg: teamTotals.atBats > 0 ? Number((teamTotals.hits / teamTotals.atBats).toFixed(3)) : null,
    },
  };
}

function npbStarterRecentFromGames(
  rowsByGame: { game: any; rows: any[] }[],
  starterName: string | null,
  source = "NPB_TEAM_BOX_SCAN",
) {
  const target = normalizePerson(starterName);
  if (!target) return { source, startsFound: 0, candidateGames: rowsByGame.length, games: [], summary: null };
  const found: AnyObj[] = [];
  for (const entry of rowsByGame) {
    const row = entry.rows.find((pitcher) => personMatches(pitcher.name, starterName));
    if (!row) continue;
    found.push({ date: entry.game.dateKey, ...row });
  }
  const totals = found.reduce((acc, row) => {
    acc.outs += inningsToOuts(row.innings);
    acc.pitches += Number(row.pitches ?? 0);
    acc.earnedRuns += Number(row.earnedRuns ?? 0);
    acc.strikeouts += Number(row.strikeouts ?? 0);
    acc.walks += Number(row.walks ?? 0);
    return acc;
  }, { outs: 0, pitches: 0, earnedRuns: 0, strikeouts: 0, walks: 0 });
  return {
    source,
    startsFound: found.length,
    candidateGames: rowsByGame.length,
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

function npbBullpenFromGames(rowsByGame: { game: any; rows: any[]; gameMs: number | null }[], currentMs: number | null) {
  const appearances: AnyObj[] = [];
  let parsedPitchingRows = 0;
  let parsedPitchingOuts = 0;
  for (const entry of rowsByGame) {
    const hoursAgo = currentMs !== null && entry.gameMs !== null ? (currentMs - entry.gameMs) / 3600000 : null;
    parsedPitchingRows += entry.rows.length;
    parsedPitchingOuts += entry.rows.reduce((sum, row) => sum + Number(row?.outs ?? inningsToOuts(row?.innings)), 0);
    entry.rows.slice(1).forEach((row) => appearances.push({
      ...row,
      outs: Number(row?.outs ?? inningsToOuts(row?.innings)),
      date: entry.game.dateKey,
      hoursAgo,
    }));
  }

  function windowSummary(hours: number) {
    const rows = appearances.filter((row) => row.hoursAgo === null || (Number(row.hoursAgo) > 0 && Number(row.hoursAgo) <= hours));
    const uniquePitchers = new Set(rows.map((row) => normalizePerson(row.name)).filter(Boolean));
    const outs = rows.reduce((sum, row) => sum + Number(row?.outs ?? inningsToOuts(row.innings)), 0);
    const pitches = rows.reduce((sum, row) => sum + Number(row.pitches ?? 0), 0);
    return { appearances: rows.length, pitchersUsed: uniquePitchers.size, innings: outsToInnings(outs), outs, pitches: pitches || null };
  }

  const byPitcher = new Map<string, number>();
  appearances.forEach((row) => {
    const key = normalizePerson(row.name);
    if (key) byPitcher.set(key, (byPitcher.get(key) ?? 0) + 1);
  });

  const parsedBullpenOuts = appearances.reduce((sum, row) => sum + Number(row?.outs ?? inningsToOuts(row?.innings)), 0);
  return {
    source: "NPB_OFFICIAL_BOX_PITCHING",
    gamesChecked: rowsByGame.length,
    pitchingRows: parsedPitchingRows,
    pitchingOuts: parsedPitchingOuts,
    bullpenAppearances: appearances.length,
    bullpenOuts: parsedBullpenOuts,
    parserOk: rowsByGame.length === 0 ? null : parsedPitchingRows > 0 && parsedPitchingOuts > 0,
    windows: { h24: windowSummary(24), h48: windowSummary(48), h72: windowSummary(72) },
    multiGamePitchers: Array.from(byPitcher.values()).filter((count) => count >= 2).length,
    games: rowsByGame.map((entry) => ({ date: entry.game.dateKey, url: entry.game.rootUrl, pitchers: entry.rows.length })),
  };
}

async function collectNpbOfficialAudit(args: {
  date: string;
  home: string;
  away: string;
  startRaw: string;
  naverHomeStarterName?: string | null;
  naverAwayStarterName?: string | null;
}) {
  const homeTeam = npbOfficialTeamMeta(args.home);
  const awayTeam = npbOfficialTeamMeta(args.away);
  if (!homeTeam || !awayTeam) {
    return {
      ok: false,
      source: "NPB_OFFICIAL",
      modelApplied: false,
      auditOnly: true,
      error: `NPB official team resolver 실패 · home=${args.home} away=${args.away}`,
      coverage: { scheduleLinks: 0, boxScores: 0, starterRecentStarts: 0, bullpenGames: 0, recentBattingGames: 0, recentBattingPlayers: 0, currentLineupPlayers: 0 },
    };
  }

  const year = Number(args.date.slice(0, 4));
  const month = Number(args.date.slice(4, 6));
  const prev = npbPrevMonth(year, month);
  const scheduleUrls = [npbScheduleMonthUrl(year, month), npbScheduleMonthUrl(prev.year, prev.month)];
  const scheduleResults = await Promise.all(scheduleUrls.map((url) => fetchNpbHtmlCached(url, true)));
  const allLinks = Array.from(new Set(scheduleResults.flatMap((result) => result.ok ? npbExtractGameLinks(result.text) : [])));
  const metas = allLinks.map(npbGameLinkMeta).filter(Boolean) as NonNullable<ReturnType<typeof npbGameLinkMeta>>[];

  const currentGame = metas.find((game) =>
    game.dateKey === args.date &&
    game.homeSlug === homeTeam.slug &&
    game.awaySlug === awayTeam.slug
  ) ?? null;

  const recentFor = (team: NpbOfficialTeamMeta, limit = 5) => metas
    .filter((game) => game.dateKey < args.date && (game.homeSlug === team.slug || game.awaySlug === team.slug))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.seriesNo - a.seriesNo)
    .slice(0, limit);

  const homeRecentMetas = recentFor(homeTeam, 5);
  const awayRecentMetas = recentFor(awayTeam, 5);
  const boxMetaByUrl = new Map<string, NonNullable<ReturnType<typeof npbGameLinkMeta>>>();
  [...homeRecentMetas, ...awayRecentMetas].forEach((meta) => boxMetaByUrl.set(meta.boxUrl, meta));
  const currentBoxUrl = currentGame?.boxUrl ?? null;
  if (currentGame) boxMetaByUrl.set(currentGame.boxUrl, currentGame);

  const boxEntries = new Map<string, AnyObj>();
  const fetchedBoxes = await Promise.all(
    Array.from(boxMetaByUrl.entries()).map(async ([boxUrl, meta]) => {
      const response = await fetchNpbHtmlCached(boxUrl, true);
      const parsed = response.ok ? npbParseBoxHtml(response.text) : null;
      return [boxUrl, { meta, response, parsed }] as const;
    })
  );
  fetchedBoxes.forEach(([boxUrl, entry]) => boxEntries.set(boxUrl, entry));

  const currentBox = currentBoxUrl ? boxEntries.get(currentBoxUrl) : null;
  const currentHomeLineup = (currentBox?.parsed?.batting?.home ?? [])
    .filter((row: AnyObj) => Number.isFinite(Number(row.order)) && Number(row.order) >= 1 && Number(row.order) <= 9)
    .map((row: AnyObj) => row.name);
  const currentAwayLineup = (currentBox?.parsed?.batting?.away ?? [])
    .filter((row: AnyObj) => Number.isFinite(Number(row.order)) && Number(row.order) >= 1 && Number(row.order) <= 9)
    .map((row: AnyObj) => row.name);

  const scheduleStarterPair = scheduleResults[0]?.ok
    ? npbExtractStarterPairFromScheduleRow(scheduleResults[0].text, currentGame)
    : null;
  const announcementUrl = "https://npb.jp/announcement/starter/";
  const announcement = scheduleStarterPair ? { ok: false, status: 0, text: "" } : await fetchNpbHtmlCached(announcementUrl, false);
  const announcementHomeFallback = announcement.ok ? npbExtractStarterFromAnnouncement(announcement.text, homeTeam) : null;
  const announcementAwayFallback = announcement.ok ? npbExtractStarterFromAnnouncement(announcement.text, awayTeam) : null;
  const announcedHomeStarter = scheduleStarterPair?.home ?? announcementHomeFallback;
  const announcedAwayStarter = scheduleStarterPair?.away ?? announcementAwayFallback;
  const starterIdentitySource = scheduleStarterPair?.source ?? (announcementHomeFallback || announcementAwayFallback ? "NPB_ANNOUNCEMENT_FALLBACK" : "UNAVAILABLE");

  function rowsForTeam(team: NpbOfficialTeamMeta, recentMetas: NonNullable<ReturnType<typeof npbGameLinkMeta>>[]) {
    return recentMetas.map((meta) => {
      const entry = boxEntries.get(meta.boxUrl);
      const side = meta.homeSlug === team.slug ? "home" : "away";
      return {
        game: meta,
        batting: entry?.parsed?.batting?.[side] ?? [],
        pitching: entry?.parsed?.pitching?.[side] ?? [],
        startTime: entry?.parsed?.startTime ?? null,
        completed: Boolean(entry?.parsed?.completed),
        status: Number(entry?.response?.status ?? 0),
      };
    }).filter((entry) => entry.completed && (entry.batting.length > 0 || entry.pitching.length > 0));
  }

  let homeRows = rowsForTeam(homeTeam, homeRecentMetas);
  let awayRows = rowsForTeam(awayTeam, awayRecentMetas);
  const battingHome = npbAggregateBatting(homeRows.slice(0, 5).map((entry) => ({ game: entry.game, rows: entry.batting })), currentHomeLineup);
  const battingAway = npbAggregateBatting(awayRows.slice(0, 5).map((entry) => ({ game: entry.game, rows: entry.batting })), currentAwayLineup);

  const starterMetaHome = await npbStarterGameMetas({
    team: homeTeam,
    starterName: announcedHomeStarter,
    date: args.date,
    year,
    month,
    allMetas: metas,
  });
  const starterMetaAway = await npbStarterGameMetas({
    team: awayTeam,
    starterName: announcedAwayStarter,
    date: args.date,
    year,
    month,
    allMetas: metas,
  });
  const starterBoxMetas = [...starterMetaHome.metas, ...starterMetaAway.metas];
  const missingStarterMetas = starterBoxMetas.filter((meta) => !boxEntries.has(meta.boxUrl));
  if (missingStarterMetas.length) {
    const starterBoxes = await Promise.all(missingStarterMetas.map(async (meta) => {
      const response = await fetchNpbHtmlCached(meta.boxUrl, true);
      const parsed = response.ok ? npbParseBoxHtml(response.text) : null;
      return [meta.boxUrl, { meta, response, parsed }] as const;
    }));
    starterBoxes.forEach(([boxUrl, entry]) => boxEntries.set(boxUrl, entry));
  }

  const starterHomeRows = rowsForTeam(homeTeam, starterMetaHome.metas);
  const starterAwayRows = rowsForTeam(awayTeam, starterMetaAway.metas);
  const starterHome = npbStarterRecentFromGames(
    starterHomeRows.map((entry) => ({ game: entry.game, rows: entry.pitching })),
    announcedHomeStarter,
    "NPB_TEAM_RESULTS_STARTER+OFFICIAL_BOX",
  );
  const starterAway = npbStarterRecentFromGames(
    starterAwayRows.map((entry) => ({ game: entry.game, rows: entry.pitching })),
    announcedAwayStarter,
    "NPB_TEAM_RESULTS_STARTER+OFFICIAL_BOX",
  );

  // starter lookup uses targeted older games; batting/bullpen remain fixed to recent five team games.
  homeRows = rowsForTeam(homeTeam, homeRecentMetas);
  awayRows = rowsForTeam(awayTeam, awayRecentMetas);

  const currentMs = requestedStartMs(args.startRaw);
  const homeBullpenGames = homeRows
    .map((entry) => ({ game: entry.game, rows: entry.pitching, gameMs: npbOfficialGameMs(entry.game.dateKey, entry.startTime) }))
    .filter((entry) => currentMs === null || entry.gameMs === null || ((currentMs - entry.gameMs) / 3600000 > 0 && (currentMs - entry.gameMs) / 3600000 <= 72))
    .slice(0, 4);
  const awayBullpenGames = awayRows
    .map((entry) => ({ game: entry.game, rows: entry.pitching, gameMs: npbOfficialGameMs(entry.game.dateKey, entry.startTime) }))
    .filter((entry) => currentMs === null || entry.gameMs === null || ((currentMs - entry.gameMs) / 3600000 > 0 && (currentMs - entry.gameMs) / 3600000 <= 72))
    .slice(0, 4);
  const bullpenHome = npbBullpenFromGames(homeBullpenGames, currentMs);
  const bullpenAway = npbBullpenFromGames(awayBullpenGames, currentMs);

  const boxScores = Array.from(boxEntries.values()).filter((entry: AnyObj) => entry?.response?.ok && entry?.parsed).length;
  const currentLineupPlayers = currentHomeLineup.length + currentAwayLineup.length;

  return {
    ok: scheduleResults.some((result) => result.ok) && (homeRows.length > 0 || awayRows.length > 0),
    source: "NPB_OFFICIAL_BOX_SCORE",
    modelApplied: false,
    auditOnly: true,
    date: args.date,
    teams: {
      home: { code: homeTeam.code, slug: homeTeam.slug, name: homeTeam.fullJa },
      away: { code: awayTeam.code, slug: awayTeam.slug, name: awayTeam.fullJa },
    },
    schedule: {
      urls: scheduleUrls,
      status: scheduleResults.map((result, index) => ({ url: scheduleUrls[index], status: result.status, cacheHit: result.cacheHit })),
      links: metas.length,
      currentGameUrl: currentGame?.rootUrl ?? null,
      currentBoxUrl,
    },
    starterAnnouncement: {
      url: scheduleStarterPair ? scheduleUrls[0] : announcementUrl,
      status: scheduleStarterPair ? scheduleResults[0]?.status ?? 0 : announcement.status,
      source: starterIdentitySource,
      home: announcedHomeStarter,
      away: announcedAwayStarter,
      scheduleRow: scheduleStarterPair?.rowText ?? null,
      naverHome: args.naverHomeStarterName ?? null,
      naverAway: args.naverAwayStarterName ?? null,
    },
    starterLookup: {
      home: { resultRows: starterMetaHome.resultRows, matchedGames: starterMetaHome.metas.length, statuses: starterMetaHome.statuses },
      away: { resultRows: starterMetaAway.resultRows, matchedGames: starterMetaAway.metas.length, statuses: starterMetaAway.statuses },
    },
    currentLineup: {
      home: currentHomeLineup,
      away: currentAwayLineup,
      total: currentLineupPlayers,
      source: currentLineupPlayers > 0 ? "NPB_CURRENT_BOX" : "UNAVAILABLE_PRE_GAME",
    },
    starterRecent: { home: starterHome, away: starterAway },
    recentBatting: { home: battingHome, away: battingAway },
    bullpen: { home: bullpenHome, away: bullpenAway },
    coverage: {
      scheduleLinks: metas.length,
      boxScores,
      recentHomeGames: homeRows.length,
      recentAwayGames: awayRows.length,
      starterRecentStarts: Number(starterHome.startsFound) + Number(starterAway.startsFound),
      bullpenGames: Number(bullpenHome.gamesChecked) + Number(bullpenAway.gamesChecked),
      recentBattingGames: Number(battingHome.gamesWithData) + Number(battingAway.gamesWithData),
      recentBattingPlayers: Number(battingHome.playersMatched) + Number(battingAway.playersMatched),
      currentLineupPlayers,
    },
    note: "AUDIT ONLY · V13.8.79 NPB starter identity/recent-start/bullpen parser fix · Challenger/추천/λ 미반영",
  };
}


// DEPLOY_MARKER_V13_8_77_MLB_STATSAPI_AUDIT_ONLY_20260916
// DEPLOY_MARKER_V13_8_78_MLB_OFFICIAL_BCD_CHALLENGER_MODEL_OFF_20260916
const MLB_STATS_API = "https://statsapi.mlb.com/api/v1";
const mlbJsonCache = new Map<string, CacheEntry>();
const mlbJsonInflight = new Map<string, Promise<any>>();

async function fetchMlbJsonCached(endpoint: string, historical = true) {
  if (historical) {
    const cached = mlbJsonCache.get(endpoint);
    if (cached && Date.now() - cached.at < HIST_TTL_MS) {
      return { ok: true, status: 200, payload: cached.value, cacheHit: true };
    }
    const inflight = mlbJsonInflight.get(endpoint);
    if (inflight) return inflight;
  }

  const task = (async () => {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: "https://www.mlb.com/",
          "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.77",
        },
      });
      const payload = await response.json().catch(() => null);
      if (historical && response.ok && payload) mlbJsonCache.set(endpoint, { at: Date.now(), value: payload });
      return { ok: response.ok && Boolean(payload), status: response.status, payload, cacheHit: false };
    } catch {
      return { ok: false, status: 0, payload: null, cacheHit: false };
    } finally {
      if (historical) mlbJsonInflight.delete(endpoint);
    }
  })();

  if (historical) mlbJsonInflight.set(endpoint, task);
  return task;
}

function mlbScheduleGames(payload: any): AnyObj[] {
  return Array.isArray(payload?.dates)
    ? payload.dates.flatMap((dateRow: AnyObj) => Array.isArray(dateRow?.games) ? dateRow.games : [])
    : [];
}

function mlbGameIsFinal(game: AnyObj) {
  const abstractState = String(game?.status?.abstractGameState ?? "").toLowerCase();
  const detailedState = String(game?.status?.detailedState ?? "").toLowerCase();
  const coded = String(game?.status?.codedGameState ?? "").toUpperCase();
  return abstractState === "final" || coded === "F" || /final|game over|completed/.test(detailedState);
}

function mlbGameTimeMs(game: AnyObj): number | null {
  const raw = String(game?.gameDate ?? "").trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function mlbTeamSideForId(game: AnyObj, teamId: number): "home" | "away" | null {
  if (Number(game?.teams?.home?.team?.id) === teamId) return "home";
  if (Number(game?.teams?.away?.team?.id) === teamId) return "away";
  return null;
}

function mlbBoxPlayer(teamBox: AnyObj, playerId: any) {
  const id = String(playerId ?? "").replace(/^ID/, "");
  return teamBox?.players?.[`ID${id}`] ?? teamBox?.players?.[id] ?? null;
}

function mlbOfficialLineup(teamBox: AnyObj) {
  const battingOrder = Array.isArray(teamBox?.battingOrder) ? teamBox.battingOrder : [];
  return battingOrder.slice(0, 9).flatMap((rawId: any, index: number) => {
    const player = mlbBoxPlayer(teamBox, rawId);
    const name = String(player?.person?.fullName ?? "").trim();
    const id = Number(player?.person?.id ?? String(rawId ?? "").replace(/^ID/, ""));
    if (!name) return [];
    return [{
      battingOrder: index + 1,
      playerId: Number.isFinite(id) ? id : null,
      name,
      position: String(player?.position?.abbreviation ?? player?.position?.name ?? "").trim() || null,
    }];
  });
}

function mlbOfficialBattingRows(teamBox: AnyObj) {
  const players = teamBox?.players && typeof teamBox.players === "object" ? Object.values(teamBox.players) as AnyObj[] : [];
  return players.flatMap((player: AnyObj) => {
    const batting = player?.stats?.batting;
    const name = String(player?.person?.fullName ?? "").trim();
    if (!name || !batting || typeof batting !== "object") return [];
    const ab = Number(batting?.atBats ?? 0);
    const pa = Number(batting?.plateAppearances ?? 0);
    if (!(ab > 0 || pa > 0 || Number(batting?.hits ?? 0) > 0 || Number(batting?.baseOnBalls ?? 0) > 0)) return [];
    return [{
      playerId: Number.isFinite(Number(player?.person?.id)) ? Number(player.person.id) : null,
      name,
      atBats: Number.isFinite(ab) ? ab : 0,
      hits: Number.isFinite(Number(batting?.hits)) ? Number(batting.hits) : 0,
      runs: Number.isFinite(Number(batting?.runs)) ? Number(batting.runs) : 0,
      rbi: Number.isFinite(Number(batting?.rbi)) ? Number(batting.rbi) : 0,
      homeRuns: Number.isFinite(Number(batting?.homeRuns)) ? Number(batting.homeRuns) : 0,
      walks: Number.isFinite(Number(batting?.baseOnBalls)) ? Number(batting.baseOnBalls) : 0,
      strikeouts: Number.isFinite(Number(batting?.strikeOuts)) ? Number(batting.strikeOuts) : 0,
    }];
  });
}

function mlbOfficialPitchingRows(teamBox: AnyObj) {
  const pitcherIds = Array.isArray(teamBox?.pitchers) ? teamBox.pitchers : [];
  return pitcherIds.flatMap((rawId: any, index: number) => {
    const player = mlbBoxPlayer(teamBox, rawId);
    const pitching = player?.stats?.pitching;
    const name = String(player?.person?.fullName ?? "").trim();
    if (!name || !pitching || typeof pitching !== "object") return [];
    return [{
      playerId: Number.isFinite(Number(player?.person?.id)) ? Number(player.person.id) : null,
      name,
      isStarter: index === 0,
      innings: String(pitching?.inningsPitched ?? "0.0"),
      pitches: Number.isFinite(Number(pitching?.numberOfPitches)) ? Number(pitching.numberOfPitches) : null,
      hits: Number.isFinite(Number(pitching?.hits)) ? Number(pitching.hits) : 0,
      homeRuns: Number.isFinite(Number(pitching?.homeRuns)) ? Number(pitching.homeRuns) : 0,
      walks: Number.isFinite(Number(pitching?.baseOnBalls)) ? Number(pitching.baseOnBalls) : 0,
      strikeouts: Number.isFinite(Number(pitching?.strikeOuts)) ? Number(pitching.strikeOuts) : 0,
      runs: Number.isFinite(Number(pitching?.runs)) ? Number(pitching.runs) : 0,
      earnedRuns: Number.isFinite(Number(pitching?.earnedRuns)) ? Number(pitching.earnedRuns) : 0,
    }];
  });
}

function mlbAggregateBatting(
  rowsByGame: { game: AnyObj; rows: AnyObj[] }[],
  officialLineup: AnyObj[],
  naverLineup: AnyObj[],
) {
  const idSet = new Set(officialLineup.map((p) => String(p?.playerId ?? "")).filter(Boolean));
  const nameSet = new Set([
    ...officialLineup.map((p) => normalizePerson(p?.name)),
    ...naverLineup.map((p) => normalizePerson(p?.name)),
  ].filter(Boolean));
  const hasLineup = idSet.size > 0 || nameSet.size > 0;
  const byPlayer = new Map<string, AnyObj>();
  const teamTotals = { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 };
  let gamesWithData = 0;

  for (const entry of rowsByGame) {
    if (entry.rows.length) gamesWithData += 1;
    for (const row of entry.rows) {
      teamTotals.atBats += Number(row?.atBats ?? 0);
      teamTotals.hits += Number(row?.hits ?? 0);
      teamTotals.runs += Number(row?.runs ?? 0);
      teamTotals.rbi += Number(row?.rbi ?? 0);
      teamTotals.homeRuns += Number(row?.homeRuns ?? 0);
      teamTotals.walks += Number(row?.walks ?? 0);
      teamTotals.strikeouts += Number(row?.strikeouts ?? 0);

      const id = String(row?.playerId ?? "");
      const normalizedName = normalizePerson(row?.name);
      if (hasLineup && !idSet.has(id) && !nameSet.has(normalizedName)) continue;
      const key = id || normalizedName;
      if (!key) continue;
      const current = byPlayer.get(key) ?? {
        playerId: row?.playerId ?? null,
        name: row?.name ?? null,
        games: 0,
        atBats: 0,
        hits: 0,
        runs: 0,
        rbi: 0,
        homeRuns: 0,
        walks: 0,
        strikeouts: 0,
        gameLogs: [],
      };
      current.games += 1;
      current.atBats += Number(row?.atBats ?? 0);
      current.hits += Number(row?.hits ?? 0);
      current.runs += Number(row?.runs ?? 0);
      current.rbi += Number(row?.rbi ?? 0);
      current.homeRuns += Number(row?.homeRuns ?? 0);
      current.walks += Number(row?.walks ?? 0);
      current.strikeouts += Number(row?.strikeouts ?? 0);
      current.gameLogs.push({ gamePk: entry.game?.gamePk ?? null, gameDate: entry.game?.gameDate ?? null, atBats: row?.atBats ?? 0, hits: row?.hits ?? 0 });
      byPlayer.set(key, current);
    }
  }

  const players = Array.from(byPlayer.values()).map((p: AnyObj) => ({
    ...p,
    avg: p.atBats > 0 ? Number((p.hits / p.atBats).toFixed(3)) : null,
  }));
  const selectedTotals = hasLineup
    ? players.reduce((acc: AnyObj, p: AnyObj) => {
        acc.atBats += Number(p?.atBats ?? 0);
        acc.hits += Number(p?.hits ?? 0);
        acc.runs += Number(p?.runs ?? 0);
        acc.rbi += Number(p?.rbi ?? 0);
        acc.homeRuns += Number(p?.homeRuns ?? 0);
        acc.walks += Number(p?.walks ?? 0);
        acc.strikeouts += Number(p?.strikeouts ?? 0);
        return acc;
      }, { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, walks: 0, strikeouts: 0 })
    : teamTotals;

  return {
    mode: hasLineup ? "CURRENT_LINEUP_RECENT" : "TEAM_RECENT_AUDIT",
    gamesChecked: rowsByGame.length,
    gamesWithData,
    lineupPlayers: hasLineup ? Math.max(officialLineup.length, naverLineup.length) : 0,
    playersMatched: hasLineup ? players.length : 0,
    players: hasLineup ? players : [],
    summary: {
      ...selectedTotals,
      avg: selectedTotals.atBats > 0 ? Number((selectedTotals.hits / selectedTotals.atBats).toFixed(3)) : null,
      teamAtBats: teamTotals.atBats,
      teamHits: teamTotals.hits,
      teamAvg: teamTotals.atBats > 0 ? Number((teamTotals.hits / teamTotals.atBats).toFixed(3)) : null,
    },
  };
}

function mlbStarterRecent(
  rowsByGame: { game: AnyObj; rows: AnyObj[] }[],
  starterId: number | null,
  starterName: string | null,
) {
  const found: AnyObj[] = [];
  for (const entry of rowsByGame) {
    const starter = entry.rows.find((row: AnyObj) => Boolean(row?.isStarter));
    if (!starter) continue;
    const idMatch = starterId !== null && Number(starter?.playerId) === starterId;
    const nameMatch = starterName ? personMatches(starter?.name, starterName) : false;
    if (!idMatch && !nameMatch) continue;
    found.push({ gamePk: entry.game?.gamePk ?? null, gameDate: entry.game?.gameDate ?? null, ...starter });
    if (found.length >= 5) break;
  }
  const totals = found.reduce((acc, row) => {
    acc.outs += inningsToOuts(row?.innings);
    acc.pitches += Number(row?.pitches ?? 0);
    acc.earnedRuns += Number(row?.earnedRuns ?? 0);
    acc.strikeouts += Number(row?.strikeouts ?? 0);
    acc.walks += Number(row?.walks ?? 0);
    return acc;
  }, { outs: 0, pitches: 0, earnedRuns: 0, strikeouts: 0, walks: 0 });
  return {
    startsFound: found.length,
    candidateGames: rowsByGame.length,
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


function mlbStarterGameLogSplits(payload: any) {
  const blocks = Array.isArray(payload?.stats) ? payload.stats : [];
  const pitchingBlocks = blocks.filter((block: AnyObj) => {
    const group = String(block?.group?.displayName ?? block?.group ?? "").toLowerCase();
    const type = String(block?.type?.displayName ?? block?.type ?? "").toLowerCase();
    return (!group || group.includes("pitch")) && (!type || type.includes("gamelog") || type.includes("game log"));
  });
  const selected = pitchingBlocks.length ? pitchingBlocks : blocks;
  return selected.flatMap((block: AnyObj) => Array.isArray(block?.splits) ? block.splits : []);
}

function mlbStarterSummary(found: AnyObj[]) {
  const totals = found.reduce((acc, row) => {
    acc.outs += inningsToOuts(row?.innings);
    acc.pitches += Number(row?.pitches ?? 0);
    acc.earnedRuns += Number(row?.earnedRuns ?? 0);
    acc.strikeouts += Number(row?.strikeouts ?? 0);
    acc.walks += Number(row?.walks ?? 0);
    return acc;
  }, { outs: 0, pitches: 0, earnedRuns: 0, strikeouts: 0, walks: 0 });
  return found.length ? {
    innings: outsToInnings(totals.outs),
    pitches: totals.pitches || null,
    earnedRuns: totals.earnedRuns,
    strikeouts: totals.strikeouts,
    walks: totals.walks,
    era: totals.outs > 0 ? Number(((totals.earnedRuns * 27) / totals.outs).toFixed(2)) : null,
  } : null;
}

async function mlbStarterRecentFromGameLog(args: {
  playerId: number | null;
  playerName: string | null;
  season: number;
  currentDate: string;
  currentGamePk: number | null;
}) {
  if (args.playerId === null) {
    return {
      ok: false,
      source: "MLB_PERSON_GAMELOG",
      playerId: null,
      playerName: args.playerName,
      endpoint: null,
      status: 0,
      cacheHit: false,
      season: args.season,
      splitsFound: 0,
      startsAvailable: 0,
      startsFound: 0,
      candidateGames: 0,
      games: [],
      summary: null,
      error: "probable pitcher playerId missing",
    };
  }

  const endpoint = `${MLB_STATS_API}/people/${args.playerId}/stats?stats=gameLog&group=pitching&season=${args.season}&gameType=R`;
  const response = await fetchMlbJsonCached(endpoint, true);
  if (!response.ok) {
    return {
      ok: false,
      source: "MLB_PERSON_GAMELOG",
      playerId: args.playerId,
      playerName: args.playerName,
      endpoint,
      status: response.status,
      cacheHit: response.cacheHit,
      season: args.season,
      splitsFound: 0,
      startsAvailable: 0,
      startsFound: 0,
      candidateGames: 0,
      games: [],
      summary: null,
      error: `gameLog HTTP ${response.status}`,
    };
  }

  const splits = mlbStarterGameLogSplits(response.payload);
  const dated = splits.flatMap((split: AnyObj) => {
    const stat = split?.stat && typeof split.stat === "object" ? split.stat : {};
    const gamesStarted = Number(stat?.gamesStarted ?? 0);
    if (!(gamesStarted > 0)) return [];
    const gamePkRaw = split?.game?.gamePk ?? split?.game?.pk ?? split?.game?.id ?? null;
    const gamePk = Number.isFinite(Number(gamePkRaw)) ? Number(gamePkRaw) : null;
    if (args.currentGamePk !== null && gamePk === args.currentGamePk) return [];
    const rawDate = String(split?.date ?? split?.game?.gameDate ?? "").trim();
    const day = rawDate.slice(0, 10);
    if (day && args.currentDate && day > args.currentDate) return [];
    if (gamePk === null && day && args.currentDate && day === args.currentDate) return [];
    const innings = String(stat?.inningsPitched ?? "0.0");
    return [{
      gamePk,
      gameDate: rawDate || null,
      opponent: String(split?.opponent?.name ?? "").trim() || null,
      team: String(split?.team?.name ?? "").trim() || null,
      isHome: typeof split?.isHome === "boolean" ? split.isHome : null,
      playerId: args.playerId,
      name: args.playerName,
      isStarter: true,
      innings,
      pitches: Number.isFinite(Number(stat?.numberOfPitches ?? stat?.pitchesThrown)) ? Number(stat?.numberOfPitches ?? stat?.pitchesThrown) : null,
      hits: Number.isFinite(Number(stat?.hits)) ? Number(stat.hits) : 0,
      homeRuns: Number.isFinite(Number(stat?.homeRuns)) ? Number(stat.homeRuns) : 0,
      walks: Number.isFinite(Number(stat?.baseOnBalls)) ? Number(stat.baseOnBalls) : 0,
      strikeouts: Number.isFinite(Number(stat?.strikeOuts)) ? Number(stat.strikeOuts) : 0,
      runs: Number.isFinite(Number(stat?.runs)) ? Number(stat.runs) : 0,
      earnedRuns: Number.isFinite(Number(stat?.earnedRuns)) ? Number(stat.earnedRuns) : 0,
    }];
  });

  // V13.8.77.2.2: avoid Array.from(Map.values()) inference drifting to unknown[]
  // under the Next/Vercel TypeScript checker. Keep the collection explicitly AnyObj[].
  const dedupedByGame = new Map<string, AnyObj>();
  dated.forEach((row: AnyObj, index: number) => {
    const key = String(row?.gamePk ?? `${row?.gameDate ?? "date"}-${index}`);
    dedupedByGame.set(key, row);
  });
  const deduped: AnyObj[] = [];
  dedupedByGame.forEach((row: AnyObj) => {
    deduped.push(row);
  });
  deduped.sort((a: AnyObj, b: AnyObj) => {
    const dateCmp = String(b?.gameDate ?? "").localeCompare(String(a?.gameDate ?? ""));
    if (dateCmp !== 0) return dateCmp;
    return Number(b?.gamePk ?? 0) - Number(a?.gamePk ?? 0);
  });
  const found = deduped.slice(0, 5);

  return {
    ok: true,
    source: "MLB_PERSON_GAMELOG",
    playerId: args.playerId,
    playerName: args.playerName,
    endpoint,
    status: response.status,
    cacheHit: response.cacheHit,
    season: args.season,
    splitsFound: splits.length,
    startsAvailable: deduped.length,
    startsFound: found.length,
    candidateGames: splits.length,
    games: found,
    summary: mlbStarterSummary(found),
    error: null,
  };
}

function mlbBullpenFromGames(rowsByGame: { game: AnyObj; rows: AnyObj[] }[], currentMs: number | null) {
  const appearances: AnyObj[] = [];
  for (const entry of rowsByGame) {
    const gameMs = mlbGameTimeMs(entry.game);
    const hoursAgo = currentMs !== null && gameMs !== null ? (currentMs - gameMs) / 3600000 : null;
    entry.rows.filter((row: AnyObj) => !row?.isStarter).forEach((row: AnyObj) => appearances.push({ ...row, hoursAgo }));
  }

  function windowSummary(hours: number) {
    const rows = appearances.filter((row) => row.hoursAgo === null || (Number(row.hoursAgo) > 0 && Number(row.hoursAgo) <= hours));
    const uniquePitchers = new Set(rows.map((row) => String(row?.playerId ?? normalizePerson(row?.name) ?? "")).filter(Boolean));
    const outs = rows.reduce((sum, row) => sum + inningsToOuts(row?.innings), 0);
    const pitches = rows.reduce((sum, row) => sum + Number(row?.pitches ?? 0), 0);
    return { appearances: rows.length, pitchersUsed: uniquePitchers.size, innings: outsToInnings(outs), pitches: pitches || null };
  }

  const byPitcher = new Map<string, number>();
  appearances.forEach((row) => {
    const key = String(row?.playerId ?? normalizePerson(row?.name) ?? "");
    if (key) byPitcher.set(key, (byPitcher.get(key) ?? 0) + 1);
  });

  return {
    gamesChecked: rowsByGame.length,
    windows: { h24: windowSummary(24), h48: windowSummary(48), h72: windowSummary(72) },
    multiGamePitchers: Array.from(byPitcher.values()).filter((count) => count >= 2).length,
    games: rowsByGame.map((entry) => ({ gamePk: entry.game?.gamePk ?? null, gameDate: entry.game?.gameDate ?? null })),
  };
}

async function collectMlbStatsApiAudit(args: {
  date: string;
  home: string;
  away: string;
  startRaw: string;
  homeLineup: AnyObj[];
  awayLineup: AnyObj[];
}) {
  const currentStartDate = isoDayOffset(args.date, -1);
  const currentEndDate = isoDayOffset(args.date, 0);
  const currentScheduleEndpoint = `${MLB_STATS_API}/schedule?sportId=1&startDate=${currentStartDate}&endDate=${currentEndDate}&hydrate=probablePitcher,team`;
  const currentSchedule = await fetchMlbJsonCached(currentScheduleEndpoint, false);
  const currentGames = currentSchedule.ok ? mlbScheduleGames(currentSchedule.payload) : [];
  const homeCode = normalizedMlbName(args.home);
  const awayCode = normalizedMlbName(args.away);
  const candidates = currentGames.filter((game) => {
    const h = String(game?.teams?.home?.team?.name ?? "");
    const a = String(game?.teams?.away?.team?.name ?? "");
    return Boolean(homeCode && awayCode && normalizedMlbName(h) === homeCode && normalizedMlbName(a) === awayCode);
  });

  const requestedMs = requestedStartMs(args.startRaw);
  const ranked = candidates.map((game) => {
    const ms = mlbGameTimeMs(game);
    return { game, diff: requestedMs !== null && ms !== null ? Math.abs(requestedMs - ms) : Number.POSITIVE_INFINITY };
  }).sort((a, b) => a.diff - b.diff);
  const currentGame = candidates.length === 1 ? candidates[0] : ranked[0]?.game ?? null;
  const currentGamePk = Number.isFinite(Number(currentGame?.gamePk)) ? Number(currentGame.gamePk) : null;
  const homeTeamId = Number.isFinite(Number(currentGame?.teams?.home?.team?.id)) ? Number(currentGame.teams.home.team.id) : null;
  const awayTeamId = Number.isFinite(Number(currentGame?.teams?.away?.team?.id)) ? Number(currentGame.teams.away.team.id) : null;

  if (!currentGame || homeTeamId === null || awayTeamId === null || currentGamePk === null) {
    return {
      ok: false,
      source: "MLB_STATSAPI",
      auditOnly: true,
      modelApplied: false,
      error: `MLB StatsAPI current game resolve 실패 · home=${args.home} away=${args.away}`,
      schedule: { endpoint: currentScheduleEndpoint, status: currentSchedule.status, games: currentGames.length, candidates: candidates.length },
      coverage: { scheduleGames: currentGames.length, boxScores: 0, recentHomeGames: 0, recentAwayGames: 0, starterRecentStarts: 0, bullpenGames: 0, recentBattingGames: 0, recentBattingPlayers: 0, currentLineupPlayers: 0 },
    };
  }

  const currentBoxEndpoint = `${MLB_STATS_API}/game/${currentGamePk}/boxscore`;
  const currentBox = await fetchMlbJsonCached(currentBoxEndpoint, false);
  const currentHomeLineup = currentBox.ok ? mlbOfficialLineup(currentBox.payload?.teams?.home) : [];
  const currentAwayLineup = currentBox.ok ? mlbOfficialLineup(currentBox.payload?.teams?.away) : [];

  const lookbackStart = isoDayOffset(args.date, -18);
  const lookbackEnd = isoDayOffset(args.date, 0);
  async function teamRecent(teamId: number) {
    const endpoint = `${MLB_STATS_API}/schedule?sportId=1&teamId=${teamId}&startDate=${lookbackStart}&endDate=${lookbackEnd}&hydrate=team`;
    const response = await fetchMlbJsonCached(endpoint, true);
    const games = response.ok ? mlbScheduleGames(response.payload) : [];
    return {
      endpoint,
      status: response.status,
      cacheHit: response.cacheHit,
      games: games
        .filter((game) => Number(game?.gamePk) !== currentGamePk)
        .filter(mlbGameIsFinal)
        .filter((game) => {
          const ms = mlbGameTimeMs(game);
          return requestedMs === null || ms === null || ms < requestedMs;
        })
        .sort((a, b) => Number(mlbGameTimeMs(b) ?? 0) - Number(mlbGameTimeMs(a) ?? 0)),
    };
  }

  const [homeSchedule, awaySchedule] = await Promise.all([teamRecent(homeTeamId), teamRecent(awayTeamId)]);
  const recentGameMap = new Map<number, AnyObj>();
  [...homeSchedule.games.slice(0, 8), ...awaySchedule.games.slice(0, 8)].forEach((game) => {
    const pk = Number(game?.gamePk);
    if (Number.isFinite(pk)) recentGameMap.set(pk, game);
  });

  const boxEntries = new Map<number, { game: AnyObj; status: number; cacheHit: boolean; payload: any }>();
  const boxResults = await Promise.all(Array.from(recentGameMap.entries()).map(async ([gamePk, game]) => {
    const endpoint = `${MLB_STATS_API}/game/${gamePk}/boxscore`;
    const response = await fetchMlbJsonCached(endpoint, true);
    return [gamePk, { game, status: response.status, cacheHit: response.cacheHit, payload: response.ok ? response.payload : null }] as const;
  }));
  boxResults.forEach(([gamePk, entry]) => boxEntries.set(gamePk, entry));

  function rowsForTeam(teamId: number, games: AnyObj[]) {
    return games.slice(0, 8).flatMap((game) => {
      const gamePk = Number(game?.gamePk);
      const entry = boxEntries.get(gamePk);
      const side = mlbTeamSideForId(game, teamId);
      if (!entry?.payload || !side) return [];
      const teamBox = entry.payload?.teams?.[side];
      return [{
        game,
        batting: mlbOfficialBattingRows(teamBox),
        pitching: mlbOfficialPitchingRows(teamBox),
      }];
    });
  }

  const homeRows = rowsForTeam(homeTeamId, homeSchedule.games);
  const awayRows = rowsForTeam(awayTeamId, awaySchedule.games);
  const homeProbable = currentGame?.teams?.home?.probablePitcher ?? null;
  const awayProbable = currentGame?.teams?.away?.probablePitcher ?? null;
  const homeStarterId = Number.isFinite(Number(homeProbable?.id)) ? Number(homeProbable.id) : null;
  const awayStarterId = Number.isFinite(Number(awayProbable?.id)) ? Number(awayProbable.id) : null;
  const homeStarterName = String(homeProbable?.fullName ?? "").trim() || null;
  const awayStarterName = String(awayProbable?.fullName ?? "").trim() || null;
  const starterSeason = Number(String(args.date ?? "").slice(0, 4)) || new Date().getUTCFullYear();
  const [homeGameLog, awayGameLog] = await Promise.all([
    mlbStarterRecentFromGameLog({ playerId: homeStarterId, playerName: homeStarterName, season: starterSeason, currentDate: args.date, currentGamePk }),
    mlbStarterRecentFromGameLog({ playerId: awayStarterId, playerName: awayStarterName, season: starterSeason, currentDate: args.date, currentGamePk }),
  ]);
  const homeStarterFallback = mlbStarterRecent(
    homeRows.map((entry) => ({ game: entry.game, rows: entry.pitching })),
    homeStarterId,
    homeStarterName,
  );
  const awayStarterFallback = mlbStarterRecent(
    awayRows.map((entry) => ({ game: entry.game, rows: entry.pitching })),
    awayStarterId,
    awayStarterName,
  );
  const homeStarter = homeGameLog.ok ? homeGameLog : {
    ...homeStarterFallback,
    source: "TEAM_RECENT_BOXSCORE_FALLBACK",
    playerId: homeStarterId,
    playerName: homeStarterName,
    gameLogAudit: homeGameLog,
  };
  const awayStarter = awayGameLog.ok ? awayGameLog : {
    ...awayStarterFallback,
    source: "TEAM_RECENT_BOXSCORE_FALLBACK",
    playerId: awayStarterId,
    playerName: awayStarterName,
    gameLogAudit: awayGameLog,
  };

  const battingHome = mlbAggregateBatting(
    homeRows.slice(0, 5).map((entry) => ({ game: entry.game, rows: entry.batting })),
    currentHomeLineup,
    args.homeLineup,
  );
  const battingAway = mlbAggregateBatting(
    awayRows.slice(0, 5).map((entry) => ({ game: entry.game, rows: entry.batting })),
    currentAwayLineup,
    args.awayLineup,
  );
  const currentMs = requestedMs;
  const homeBullpenRows = homeRows
    .filter((entry) => {
      const ms = mlbGameTimeMs(entry.game);
      if (currentMs === null || ms === null) return true;
      const hours = (currentMs - ms) / 3600000;
      return hours > 0 && hours <= 72;
    })
    .slice(0, 4)
    .map((entry) => ({ game: entry.game, rows: entry.pitching }));
  const awayBullpenRows = awayRows
    .filter((entry) => {
      const ms = mlbGameTimeMs(entry.game);
      if (currentMs === null || ms === null) return true;
      const hours = (currentMs - ms) / 3600000;
      return hours > 0 && hours <= 72;
    })
    .slice(0, 4)
    .map((entry) => ({ game: entry.game, rows: entry.pitching }));
  const bullpenHome = mlbBullpenFromGames(homeBullpenRows, currentMs);
  const bullpenAway = mlbBullpenFromGames(awayBullpenRows, currentMs);

  const boxScores = Array.from(boxEntries.values()).filter((entry) => Boolean(entry.payload)).length + Number(currentBox.ok);
  const currentLineupPlayers = currentHomeLineup.length + currentAwayLineup.length;
  return {
    ok: Boolean(currentSchedule.ok && (homeRows.length > 0 || awayRows.length > 0)),
    source: "MLB_STATSAPI",
    modelApplied: false,
    auditOnly: false,
    challengerModelOffEligible: true,
    challengerInput: { starter: "MLB_PERSON_GAMELOG", batting: "MLB_STATSAPI_BOXSCORE", bullpen: "MLB_STATSAPI_BOXSCORE" },
    gamePk: currentGamePk,
    gameDate: currentGame?.gameDate ?? null,
    teams: {
      home: { id: homeTeamId, name: currentGame?.teams?.home?.team?.name ?? args.home },
      away: { id: awayTeamId, name: currentGame?.teams?.away?.team?.name ?? args.away },
    },
    schedule: {
      endpoint: currentScheduleEndpoint,
      status: currentSchedule.status,
      games: currentGames.length,
      candidates: candidates.length,
      currentGamePk,
      homeRecentEndpoint: homeSchedule.endpoint,
      awayRecentEndpoint: awaySchedule.endpoint,
      homeRecentStatus: homeSchedule.status,
      awayRecentStatus: awaySchedule.status,
    },
    currentBox: {
      endpoint: currentBoxEndpoint,
      status: currentBox.status,
      homeLineup: currentHomeLineup.length,
      awayLineup: currentAwayLineup.length,
    },
    probablePitcher: {
      home: { id: homeProbable?.id ?? null, name: homeProbable?.fullName ?? null },
      away: { id: awayProbable?.id ?? null, name: awayProbable?.fullName ?? null },
    },
    currentLineup: { home: currentHomeLineup, away: currentAwayLineup, total: currentLineupPlayers },
    starterRecent: { home: homeStarter, away: awayStarter },
    recentBatting: { home: battingHome, away: battingAway },
    bullpen: { home: bullpenHome, away: bullpenAway },
    coverage: {
      scheduleGames: currentGames.length,
      boxScores,
      recentHomeGames: homeRows.length,
      recentAwayGames: awayRows.length,
      starterRecentStarts: Number(homeStarter.startsFound) + Number(awayStarter.startsFound),
      starterGameLogSides: Number(homeStarter.source === "MLB_PERSON_GAMELOG") + Number(awayStarter.source === "MLB_PERSON_GAMELOG"),
      bullpenGames: Number(bullpenHome.gamesChecked) + Number(bullpenAway.gamesChecked),
      recentBattingGames: Number(battingHome.gamesWithData) + Number(battingAway.gamesWithData),
      recentBattingPlayers: Number(battingHome.playersMatched) + Number(battingAway.playersMatched),
      currentLineupPlayers,
    },
    note: "V13.8.78 · MLB StatsAPI 공개 피드 · B는 선수별 pitching gameLog, C/D는 공식 boxscore를 Challenger MODEL OFF 입력으로 사용 · CONTROL/추천/Gate/실전 λ 미반영",
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
    const requestedLeague = url.searchParams.get("league") ?? "";
    const date = dateKey(startRaw);
    if (!date || !home || !away) {
      return Response.json({ ok: false, error: "네이버 gameId 생성에 필요한 날짜/팀 정보 없음", debug: { date, home, away } }, { status: 400 });
    }

    const homeNpb = npbTeamCode(home);
    const awayNpb = npbTeamCode(away);
    const homeMlb = normalizedMlbName(home);
    const awayMlb = normalizedMlbName(away);
    const isFootball = /축구|football|soccer/i.test(String(sport));
    const footballAdapter = footballAdapterId(requestedLeague);
    let league: "NPB" | "KBO" | "MLB" | "FOOTBALL" = isFootball ? "FOOTBALL" : homeNpb && awayNpb ? "NPB" : homeMlb && awayMlb ? "MLB" : "KBO";
    let gameId: string | null = null;
    let resolverDebug: any = null;

    if (league === "FOOTBALL") {
      const resolved = await resolveFootballGameId(date, home, away, startRaw, footballAdapter);
      gameId = resolved.gameId;
      resolverDebug = resolved;
      if (!gameId) {
        return Response.json({
          ok: false,
          error: "네이버 해외축구 당일 일정에서 경기 gameId 자동매칭 실패",
          debug: { date, home, away, requestedLeague, footballAdapter, resolver: resolved },
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
    const pollingOk = Boolean(response.ok && payload?.success && payload?.code === 200);
    if (!pollingOk && league !== "FOOTBALL") {
      return Response.json({
        ok: false,
        error: `네이버 game-polling 응답 실패 (${response.status})`,
        gameId,
        debug: { endpoint, responseCode: payload?.code ?? null, league, resolver: resolverDebug },
      }, { status: 502 });
    }

    // 축구는 schedule → players가 핵심 경로다. game-polling이 비어도 schedule에서 확보한 팀코드로 players를 독립 수집한다.
    const result = pollingOk ? (payload?.result ?? {}) : {};
    const game = result?.game ?? resolverDebug?.selectedGame ?? {};
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
    let footballPlayersSource: string | null = null;
    let footballPlayersAttempts: Array<{ endpoint: string; status: number | null; source: string }> = [];
    if (league === "FOOTBALL") {
      // V13.8.57: Chrome Network에서 확인한 statistics/categories/{categoryId}/games/{gameId}/players를 PRIMARY로 사용한다.
      // 서버에서 바로 /players를 때리면 403이 발생했으므로, 먼저 동일 gameId의 /lineup 페이지를
      // 브라우저 navigation 형태로 warm-up하고 응답 쿠키를 이어받은 뒤 XHR 형태로 /players를 호출한다.
      // 이 PRIMARY가 실패한 경우에만 200 응답 후보를 진단/보조 fallback으로 확인한다.
      const footballCategoryId = String(
        resolverDebug?.selectedCategoryId ??
        resolverDebug?.selectedGame?.categoryId ??
        footballCategoryIdForAdapter(footballAdapter) ??
        ""
      ).trim() || null;
      const sessionPlayers = await fetchFootballPlayersFromNaverSession(gameId, footballCategoryId);
      footballPlayersAttempts.push({
        endpoint: `https://m.sports.naver.com/game/${encodeURIComponent(gameId)}/lineup`,
        status: sessionPlayers.pageStatus,
        source: `LINEUP_PAGE_WARMUP(cookie:${sessionPlayers.cookieCount})`,
      });
      footballPlayersAttempts.push({
        endpoint: sessionPlayers.endpoint,
        status: sessionPlayers.status,
        source: "PLAYERS_STATISTICS_PRIMARY",
      });
      footballPlayersEndpoint = sessionPlayers.endpoint;
      footballPlayersStatus = sessionPlayers.status;

      if (sessionPlayers.ok) {
        const extracted = extractFootballPlayers(sessionPlayers.payload);
        const known = extracted.filter((p: AnyObj) => footballPlayerSubstituteValue(p) !== null).length;
        if (extracted.length >= 11 && known >= 11) {
          footballPlayers = extracted;
          footballPlayersSource = "PLAYERS_STATISTICS_PRIMARY";
        }
      }

      if (footballPlayers.length === 0) {
        const browserHeaders = {
          accept: "application/json, text/plain, */*",
          "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          origin: "https://m.sports.naver.com",
          referer: `https://m.sports.naver.com/game/${gameId}/lineup`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        };
        const fallbackAttempts = [
          { endpoint: `${NAVER_API}/${gameId}/preview`, source: "GAME_PREVIEW_FALLBACK" },
          { endpoint: `${NAVER_API}/${gameId}/relay`, source: "GAME_RELAY_FALLBACK" },
          { endpoint: `${NAVER_API}/${gameId}/record`, source: "GAME_RECORD_FALLBACK" },
          { endpoint: `${NAVER_API}/${gameId}/game-polling?inning=1&isHighlight=false`, source: "GAME_POLLING_FALLBACK" },
        ];

        for (const attempt of fallbackAttempts) {
          const playersResponse = await fetch(attempt.endpoint, {
            cache: "no-store",
            headers: browserHeaders,
          }).catch(() => null);
          const status = playersResponse?.status ?? null;
          footballPlayersAttempts.push({ endpoint: attempt.endpoint, status, source: attempt.source });
          if (!playersResponse?.ok) continue;
          const playersPayload = await playersResponse.json().catch(() => null);
          const extracted = extractFootballPlayers(playersPayload);
          if (extracted.length < 11) continue;
          const known = extracted.filter((p: AnyObj) => footballPlayerSubstituteValue(p) !== null).length;
          if (known < 11) continue;
          footballPlayers = extracted;
          footballPlayersStatus = playersResponse.status;
          footballPlayersSource = attempt.source;
          footballPlayersEndpoint = attempt.endpoint;
          break;
        }
      }

      // schedule/polling embedded fallback 역시 실제 선수형 + 선발판정 조건을 모두 만족할 때만 사용한다.
      if (footballPlayers.length === 0) {
        for (const embedded of [
          { payload, source: "GAME_POLLING_EMBEDDED" },
          { payload: resolverDebug?.selectedGame, source: "SCHEDULE_EMBEDDED" },
        ]) {
          const rows = extractFootballPlayers(embedded.payload);
          const known = rows.filter((p: AnyObj) => footballPlayerSubstituteValue(p) !== null).length;
          if (rows.length >= 11 && known >= 11) {
            footballPlayers = rows;
            footballPlayersSource = embedded.source;
            break;
          }
        }
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
    if (league === "MLB" || league === "KBO") {
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
      const homeTeamCode = game?.homeTeamCode ?? game?.homeTeamId ?? game?.homeTeam?.id ?? game?.homeTeam?.teamId ?? null;
      const awayTeamCode = game?.awayTeamCode ?? game?.awayTeamId ?? game?.awayTeam?.id ?? game?.awayTeam?.teamId ?? null;
      homeLineup = normalizeFootballPlayers(footballPlayers, homeTeamCode, false, String(game?.homeTeamName ?? home)).slice(0, 11);
      awayLineup = normalizeFootballPlayers(footballPlayers, awayTeamCode, false, String(game?.awayTeamName ?? away)).slice(0, 11);
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
      // KBO pregame confirmed lineup is published in /preview before /record is populated.
      // Prefer preview fullLineUp (starter + batting order 1~9); keep game-polling as fallback.
      const previewHome = normalizeKboPreviewPlayers(previewData?.homeTeamLineUp?.fullLineUp);
      const previewAway = normalizeKboPreviewPlayers(previewData?.awayTeamLineUp?.fullLineUp);
      const pollingHome = normalizeKboPlayers(result?.textRelayData?.homeLineup?.batter);
      const pollingAway = normalizeKboPlayers(result?.textRelayData?.awayLineup?.batter);
      homeLineup = previewHome.length >= 7 ? previewHome : pollingHome;
      awayLineup = previewAway.length >= 7 ? previewAway : pollingAway;
      homeStarter = normalizeKboPreviewStarter(previewData?.homeStarter, previewData?.homeTeamLineUp?.fullLineUp, game?.homeStarterName)
        ?? normalizeKboStarter(result?.textRelayData?.homeLineup?.pitcher, game?.homeStarterName);
      awayStarter = normalizeKboPreviewStarter(previewData?.awayStarter, previewData?.awayTeamLineUp?.fullLineUp, game?.awayStarterName)
        ?? normalizeKboStarter(result?.textRelayData?.awayLineup?.pitcher, game?.awayStarterName);
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

    const footballRecent = league === "FOOTBALL"
      ? await collectFootballRecentSummary(date, home, away, footballAdapter).catch((error: any) => ({
          recentSummary: null,
          endpoint: null,
          status: null,
          cacheHit: false,
          scheduleGames: 0,
          error: error?.message ?? "football recent summary failed",
        }))
      : null;

    const naverPitcherWorkload = league === "FOOTBALL" ? null : await collectNaverPitcherWorkload({
      league,
      date,
      home,
      away,
      homeStarter,
      awayStarter,
      startRaw,
      homeLineup,
      awayLineup,
    });

    const mlbOfficialAudit = league === "MLB"
      ? await collectMlbStatsApiAudit({
          date,
          home,
          away,
          startRaw,
          homeLineup,
          awayLineup,
        }).catch((error: any) => ({
          ok: false,
          source: "MLB_STATSAPI",
          modelApplied: false,
          auditOnly: true,
          error: error?.message ?? "MLB StatsAPI audit failed",
          coverage: {
            scheduleGames: 0,
            boxScores: 0,
            recentHomeGames: 0,
            recentAwayGames: 0,
            starterRecentStarts: 0,
            bullpenGames: 0,
            recentBattingGames: 0,
            recentBattingPlayers: 0,
            currentLineupPlayers: 0,
          },
        }))
      : null;

    const npbOfficialAudit = league === "NPB"
      ? await collectNpbOfficialAudit({
          date,
          home,
          away,
          startRaw,
          naverHomeStarterName: String(homeStarter?.name ?? "").trim() || null,
          naverAwayStarterName: String(awayStarter?.name ?? "").trim() || null,
        }).catch((error: any) => ({
          ok: false,
          source: "NPB_OFFICIAL",
          modelApplied: false,
          auditOnly: true,
          error: error?.message ?? "NPB official audit failed",
          coverage: {
            scheduleLinks: 0,
            boxScores: 0,
            recentHomeGames: 0,
            recentAwayGames: 0,
            starterRecentStarts: 0,
            bullpenGames: 0,
            recentBattingGames: 0,
            recentBattingPlayers: 0,
            currentLineupPlayers: 0,
          },
        }))
      : null;

    const verifyFinalScore = naverScheduleFinalScore(game);
    const verifyCompleted = naverVerifyGameCompleted(game);

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
      finalScore: verifyFinalScore,
      completed: verifyCompleted,
      game: {
        gameDateTime: game?.gameDateTime ?? null,
        stadium: game?.stadium ?? null,
        statusCode: game?.statusCode ?? null,
        statusInfo: game?.statusInfo ?? null,
        homeScore: verifyFinalScore?.home ?? null,
        awayScore: verifyFinalScore?.away ?? null,
        finalScore: verifyFinalScore,
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
        home: normalizeFootballPlayers(
          footballPlayers,
          game?.homeTeamCode ?? game?.homeTeamId ?? game?.homeTeam?.id ?? game?.homeTeam?.teamId ?? null,
          true,
          String(game?.homeTeamName ?? home),
        ),
        away: normalizeFootballPlayers(
          footballPlayers,
          game?.awayTeamCode ?? game?.awayTeamId ?? game?.awayTeam?.id ?? game?.awayTeam?.teamId ?? null,
          true,
          String(game?.awayTeamName ?? away),
        ),
      } : null,
      footballPlayers: league === "FOOTBALL" ? {
        ok: footballPlayers.length > 0,
        status: footballPlayersStatus,
        source: footballPlayersSource,
        attempts: footballPlayersAttempts,
        total: footballPlayers.length,
        rawTeamCodes: Array.from(new Set(footballPlayers.map((p: AnyObj) => footballPlayerTeamCode(p)).filter(Boolean))),
        rawTeamNames: Array.from(new Set([
          ...footballPlayers.map((p: AnyObj) => footballPlayerTeamName(p)).filter(Boolean),
          ...footballPlayers.flatMap((p: AnyObj) => [String(p?.homeTeamName ?? "").trim(), String(p?.awayTeamName ?? "").trim()]).filter(Boolean),
        ])),
        homeTeamCode: String(footballPlayers?.[0]?.homeTeamCode ?? game?.homeTeamCode ?? game?.homeTeamId ?? game?.homeTeam?.id ?? game?.homeTeam?.teamId ?? "").trim() || null,
        awayTeamCode: String(footballPlayers?.[0]?.awayTeamCode ?? game?.awayTeamCode ?? game?.awayTeamId ?? game?.awayTeam?.id ?? game?.awayTeam?.teamId ?? "").trim() || null,
        homeTeamName: String(footballPlayers?.[0]?.homeTeamName ?? game?.homeTeamName ?? home ?? "").trim() || null,
        awayTeamName: String(footballPlayers?.[0]?.awayTeamName ?? game?.awayTeamName ?? away ?? "").trim() || null,
        substituteKnown: footballPlayers.filter((p: AnyObj) => footballPlayerSubstituteValue(p) !== null).length,
        startingHome: homeLineup.length,
        startingAway: awayLineup.length,
        startingTotal: homeLineup.length + awayLineup.length,
        pollingStatus: response.status,
        pollingOk,
        recentScheduleStatus: footballRecent?.status ?? null,
        recentScheduleGames: footballRecent?.scheduleGames ?? 0,
      } : null,
      pitcherWorkload: naverPitcherWorkload,
      mlbOfficial: mlbOfficialAudit,
      npbOfficial: npbOfficialAudit,
      recentSummary: league === "FOOTBALL"
        ? footballRecent?.recentSummary ?? null
        : league === "MLB" && previewData ? {
            home: summarizeMlbPreviousGames(previewData?.homeTeamPreviousGames, String(previewData?.gameInfo?.hName ?? game?.homeTeamName ?? home)),
            away: summarizeMlbPreviousGames(previewData?.awayTeamPreviousGames, String(previewData?.gameInfo?.aName ?? game?.awayTeamName ?? away)),
          } : naverPitcherWorkload?.recentSummary ?? null,
      npbRecord: league === "NPB" ? {
        ok: Boolean(npbRecordData),
        status: npbRecordStatus,
        homeBatters: Array.isArray(npbRecordData?.homeBatter) ? npbRecordData.homeBatter.length : 0,
        awayBatters: Array.isArray(npbRecordData?.awayBatter) ? npbRecordData.awayBatter.length : 0,
        starters: Number(Array.isArray(npbRecordData?.homePitcher) && npbRecordData.homePitcher.length > 0)
          + Number(Array.isArray(npbRecordData?.awayPitcher) && npbRecordData.awayPitcher.length > 0),
      } : null,
      kboPreview: league === "KBO" ? {
        ok: Boolean(previewData),
        status: previewStatus,
        generatedDate: previewData?.generateDate ?? null,
        homeLineup: normalizeKboPreviewPlayers(previewData?.homeTeamLineUp?.fullLineUp).length,
        awayLineup: normalizeKboPreviewPlayers(previewData?.awayTeamLineUp?.fullLineUp).length,
        homePreviousGames: Array.isArray(previewData?.homeTeamPreviousGames) ? previewData.homeTeamPreviousGames.length : 0,
        awayPreviousGames: Array.isArray(previewData?.awayTeamPreviousGames) ? previewData.awayTeamPreviousGames.length : 0,
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
        recentBattingPlayers: Number(naverPitcherWorkload?.coverage?.recentBattingPlayers ?? 0),
        recentBattingGames: Number(naverPitcherWorkload?.coverage?.recentBattingGames ?? 0),
        startingPlayers: league === "FOOTBALL" ? homeLineup.length + awayLineup.length : null,
      },
      debug: resolverDebug ? { resolver: resolverDebug } : undefined,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "네이버 당일 라인업 수집 중 오류" }, { status: 500 });
  }
}
