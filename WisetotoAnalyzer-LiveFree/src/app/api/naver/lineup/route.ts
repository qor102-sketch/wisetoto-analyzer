// DEPLOY_MARKER_V13_8_16_NAVER_TODAY_LINEUP_20260829

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
  { code: "HI", aliases: ["히로시마", "hiroshimacarp", "hiroshimatoYocarp", "hiroshimotoyocarp", "hiroshima"] },
  { code: "YA", aliases: ["야쿠르트", "tokyoyakultswallows", "yakultswallows", "yakult"] },
  { code: "HS", aliases: ["한신", "hanshintigers", "hanshin"] },
  { code: "YO", aliases: ["요미우리", "yomiurigiants", "yomiuri"] },
  { code: "NH", aliases: ["닛폰햄", "니혼햄", "nipponhamfighters", "hokkaidonipponhamfighters", "nipponham"] },
  { code: "JL", aliases: ["지바롯데", "치바롯데", "chibalottemarines", "lottemarines", "chibalotte"] },
];

function norm(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s._'’\-–—()\[\]{}]/g, "")
    .replace(/buffaloes|hawks|lions|eagles|dragons|swallows|tigers|giants|fighters|marines|baystars/g, "");
}

function teamCode(name: string) {
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

function normalizePlayers(players: any) {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const home = url.searchParams.get("home") ?? "";
    const away = url.searchParams.get("away") ?? "";
    const date = dateKey(url.searchParams.get("date") ?? "");
    const homeCode = teamCode(home);
    const awayCode = teamCode(away);

    if (!date || !homeCode || !awayCode) {
      return Response.json({
        ok: false,
        error: "네이버 NPB gameId 생성에 필요한 날짜/팀 코드 매칭 실패",
        debug: { date, home, away, homeCode, awayCode },
      }, { status: 400 });
    }

    // Naver NPB gameId = YYYYMMDD + awayTeamCode + homeTeamCode + 0
    const gameId = `${date}${awayCode}${homeCode}0`;
    const endpoint = `${NAVER_API}/${gameId}/game-polling`;
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        referer: `https://m.sports.naver.com/game/${gameId}`,
        "user-agent": "Mozilla/5.0 WisetotoAnalyzer/13.8.16",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || payload?.code !== 200) {
      return Response.json({
        ok: false,
        error: `네이버 game-polling 응답 실패 (${response.status})`,
        gameId,
        debug: { endpoint, responseCode: payload?.code ?? null },
      }, { status: 502 });
    }

    const result = payload?.result ?? {};
    const baseInfo = result?.textRelayData?.baseInfo ?? {};
    const batterLineup = baseInfo?.batterLineup ?? {};
    const homeLineup = normalizePlayers(batterLineup?.home);
    const awayLineup = normalizePlayers(batterLineup?.away);
    const game = result?.game ?? {};

    return Response.json({
      ok: true,
      source: "sports.naver.com",
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
        homeStarterName: game?.homeStarterName ?? baseInfo?.homePitcher ?? null,
        awayStarterName: game?.awayStarterName ?? baseInfo?.awayPitcher ?? null,
        weatherInfo: game?.weatherInfo ?? null,
      },
      homeStarter: baseInfo?.homePitcher ? {
        name: baseInfo.homePitcher,
        playerId: String(baseInfo?.homePitcherId ?? "").trim() || null,
        pcode: String(baseInfo?.homePitcherId ?? "").trim() || null,
        status: "CONFIRMED",
        source: "NAVER_GAME_POLLING",
      } : null,
      awayStarter: baseInfo?.awayPitcher ? {
        name: baseInfo.awayPitcher,
        playerId: String(baseInfo?.awayPitcherId ?? "").trim() || null,
        pcode: String(baseInfo?.awayPitcherId ?? "").trim() || null,
        status: "CONFIRMED",
        source: "NAVER_GAME_POLLING",
      } : null,
      home: homeLineup,
      away: awayLineup,
      coverage: {
        home: homeLineup.length,
        away: awayLineup.length,
        total: homeLineup.length + awayLineup.length,
      },
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error?.message || "네이버 당일 라인업 수집 중 오류",
    }, { status: 500 });
  }
}
