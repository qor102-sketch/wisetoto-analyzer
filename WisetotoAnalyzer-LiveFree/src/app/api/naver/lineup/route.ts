// DEPLOY_MARKER_V13_8_17_KBO_LIVE_DATA_20260829

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

function dateKey(value: string) {
  const raw = String(value ?? "").trim();
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
  const cc = normalizedKboName(candidate);
  const rr = normalizedKboName(requested);
  return Boolean(cc && rr && cc === rr);
}

async function resolveKboGameId(date: string, home: string, away: string) {
  const d = isoDate(date);
  const endpoint = `${NAVER_API}?upperCategoryId=kbaseball&fromDate=${encodeURIComponent(d)}&toDate=${encodeURIComponent(d)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      accept: "application/json, text/plain, */*",
      referer: "https://m.sports.naver.com/kbaseball/schedule/index",
      "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.17",
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
    const date = dateKey(url.searchParams.get("date") ?? "");
    if (!date || !home || !away) {
      return Response.json({ ok: false, error: "네이버 gameId 생성에 필요한 날짜/팀 정보 없음", debug: { date, home, away } }, { status: 400 });
    }

    const homeNpb = npbTeamCode(home);
    const awayNpb = npbTeamCode(away);
    let league: "NPB" | "KBO" = homeNpb && awayNpb ? "NPB" : "KBO";
    let gameId: string | null = null;
    let resolverDebug: any = null;

    if (league === "NPB") {
      gameId = `${date}${awayNpb}${homeNpb}0`;
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
        "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.17",
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

    let homeLineup: AnyObj[] = [];
    let awayLineup: AnyObj[] = [];
    let homeStarter: AnyObj | null = null;
    let awayStarter: AnyObj | null = null;

    if (league === "KBO") {
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
      coverage: {
        home: homeLineup.length,
        away: awayLineup.length,
        total: homeLineup.length + awayLineup.length,
        homeStats: homeLineup.filter((p: AnyObj) => p?.currentSeasonStats?.avg !== null && p?.currentSeasonStats?.avg !== undefined).length,
        awayStats: awayLineup.filter((p: AnyObj) => p?.currentSeasonStats?.avg !== null && p?.currentSeasonStats?.avg !== undefined).length,
      },
      debug: resolverDebug ? { kboResolver: resolverDebug } : undefined,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || "네이버 당일 라인업 수집 중 오류" }, { status: 500 });
  }
}
