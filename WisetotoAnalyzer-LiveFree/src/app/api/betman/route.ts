const BETMAN_URL =
  "https://www.betman.co.kr/matchinfo/inqMainGameInfo.do";

type AnyObj = Record<string, any>;

type MarketType =
  | "moneyline"
  | "handicap"
  | "total"
  | "other";

function arr(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

function text(x: any) {
  return String(x ?? "").trim();
}

function num(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(value: any) {
  return text(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[().,\-_/]/g, "");
}

function marketType(row: AnyObj): MarketType {
  const betNm = text(row?.betNm);
  const betTypNm = text(row?.betTypNm);

  if (
    betNm.includes("언더오버") ||
    betTypNm.includes("언더오버")
  ) {
    return "total";
  }

  if (
    betNm.includes("핸디캡") ||
    betTypNm.includes("핸디캡")
  ) {
    return "handicap";
  }

  if (
    betNm.includes("승패") ||
    betNm.includes("승무패") ||
    betNm.includes("승1패") ||
    betTypNm.includes("승패") ||
    betTypNm.includes("승무패") ||
    betTypNm.includes("승N패")
  ) {
    return "moneyline";
  }

  return "other";
}

function getSport(row: AnyObj) {
  return (
    row?.sportsItem?.sportsItemEngName ??
    row?.itemCode ??
    null
  );
}

function getMarketLine(row: AnyObj) {
  const type = marketType(row);

  if (type === "total") {
    return (
      num(row?.winHandi) ??
      num(row?.loseHandi) ??
      null
    );
  }

  if (type === "handicap") {
    // Betman 안내상 모든 핸디캡은 홈팀 기준.
    // 일정 데이터에서는 winHandi가 홈 기준값으로 사용되는 행이 확인됨.
    return num(row?.winHandi);
  }

  return null;
}

function getSelections(row: AnyObj) {
  return [
    {
      side: "win",
      label: text(row?.winTxt) || null,
      odds: num(row?.winAllot),
      line: num(row?.winHandi),
    },
    {
      side: "draw",
      label: text(row?.drawTxt) || null,
      odds: num(row?.drawAllot),
      line: num(row?.drawHandi),
    },
    {
      side: "lose",
      label: text(row?.loseTxt) || null,
      odds: num(row?.loseAllot),
      line: num(row?.loseHandi),
    },
  ].filter((x) => {
    if (x.label && x.label !== "-") return true;
    if (x.odds !== null && x.odds > 0) return true;
    return false;
  });
}

function summarizeRow(row: AnyObj) {
  const type = marketType(row);

  return {
    matchSeq: num(row?.matchSeq),

    gameKey: row?.gameKey ?? null,

    gameDate:
      num(row?.gameDate) !== null
        ? new Date(Number(row.gameDate)).toISOString()
        : null,

    gameDateMs: num(row?.gameDate),

    gameDateStr: row?.gameDateStr ?? null,

    sport: getSport(row),

    sportName:
      row?.sportsItem?.sportsItemName ??
      null,

    leagueCode:
      row?.leagueCode ?? null,

    league:
      row?.leagueName ?? null,

    homeId:
      row?.homeId ?? null,

    home:
      row?.homeName ?? null,

    awayId:
      row?.awayId ?? null,

    away:
      row?.awayName ?? null,

    stadium:
      row?.meetStadiumFullName ??
      row?.meetStadium ??
      null,

    market: {
      type,

      betId:
        row?.betId ?? null,

      betName:
        row?.betNm ?? null,

      betTypeId:
        row?.betTypId ?? null,

      betTypeName:
        row?.betTypNm ?? null,

      line:
        getMarketLine(row),

      homeBased:
        type === "handicap",

      rawHandiCode:
        num(row?.handi),

      selections:
        getSelections(row),
    },

    status: {
      live:
        row?.live ?? null,

      matchState:
        row?.matchState ?? null,

      protoStatus:
        row?.protoStatus ?? null,

      gameReject:
        row?.gameReject ?? null,

      buyReject:
        row?.buyReject ?? null,

      single:
        row?.sgl ?? null,
    },
  };
}

function groupSchedules(rows: AnyObj[]) {
  const groups = new Map<string, AnyObj>();

  for (const raw of rows) {
    const row = summarizeRow(raw);

    const key = [
      normalizeName(row.home),
      normalizeName(row.away),
      row.gameDateMs ?? "",
      row.sport ?? "",
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        gameKey: row.gameKey,
        gameDate: row.gameDate,
        gameDateMs: row.gameDateMs,
        gameDateStr: row.gameDateStr,

        sport: row.sport,
        sportName: row.sportName,

        leagueCode: row.leagueCode,
        league: row.league,

        homeId: row.homeId,
        home: row.home,

        awayId: row.awayId,
        away: row.away,

        stadium: row.stadium,

        markets: [],
      });
    }

    const group = groups.get(key);

    if (!group) {
      continue;
    }

    group.markets.push({
      matchSeq: row.matchSeq,
      ...row.market,
      status: row.status,
    });
  }

  return [...groups.values()].map((game) => {
    const markets = arr(game.markets);

    return {
      ...game,

      moneyline:
        markets.filter(
          (x) => x?.type === "moneyline"
        ),

      handicaps:
        markets.filter(
          (x) => x?.type === "handicap"
        ),

      totals:
        markets.filter(
          (x) => x?.type === "total"
        ),

      otherMarkets:
        markets.filter(
          (x) => x?.type === "other"
        ),
    };
  });
}

function matchesText(
  actual: any,
  wanted: string | null
) {
  if (!wanted) return true;

  const a = normalizeName(actual);
  const w = normalizeName(wanted);

  return (
    a.includes(w) ||
    w.includes(a)
  );
}

function filterGames(
  games: AnyObj[],
  url: URL
) {
  const home =
    url.searchParams.get("home");

  const away =
    url.searchParams.get("away");

  const sport =
    url.searchParams.get("sport");

  const league =
    url.searchParams.get("league");

  const market =
    url.searchParams.get("market");

  return games.filter((game) => {
    if (
      home &&
      !matchesText(game?.home, home)
    ) {
      return false;
    }

    if (
      away &&
      !matchesText(game?.away, away)
    ) {
      return false;
    }

    if (sport) {
      const actual =
        normalizeName(game?.sport);

      const wanted =
        normalizeName(sport);

      if (
        actual !== wanted &&
        !actual.includes(wanted) &&
        !wanted.includes(actual)
      ) {
        return false;
      }
    }

    if (
      league &&
      !matchesText(game?.league, league)
    ) {
      return false;
    }

    if (market) {
      const wanted =
        market.toLowerCase();

      if (
        wanted === "handicap" &&
        !game?.handicaps?.length
      ) {
        return false;
      }

      if (
        (wanted === "total" ||
          wanted === "ou") &&
        !game?.totals?.length
      ) {
        return false;
      }

      if (
        wanted === "moneyline" &&
        !game?.moneyline?.length
      ) {
        return false;
      }
    }

    return true;
  });
}

async function fetchBetman() {
  const response =
    await fetch(
      BETMAN_URL,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json, text/plain, */*",

          "Content-Type":
            "application/json;charset=UTF-8",

          Origin:
            "https://www.betman.co.kr",

          Referer:
            "https://www.betman.co.kr/",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        },

        body:
          JSON.stringify({
            _sbmInfo: {
              debugMode:
                "false",
            },
          }),

        cache:
          "no-store",
      }
    );

  const raw =
    await response.text();

  let json: any;

  try {
    json =
      JSON.parse(raw);
  } catch {
    throw new Error(
      `Betman 응답을 JSON으로 해석하지 못했습니다. HTTP ${response.status}: ${raw.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        `Betman HTTP ${response.status}`
    );
  }

  return json;
}

export async function GET(
  req: Request
) {
  try {
    const url =
      new URL(req.url);

    const raw =
      await fetchBetman();

    const schedules =
      arr(
        raw?.schedulesList
      );

    const games =
      groupSchedules(
        schedules
      );

    const filtered =
      filterGames(
        games,
        url
      );

    const currentLottery =
      raw?.currentLottery ??
      null;

    return Response.json({
      ok: true,

      source:
        "Betman",

      endpoint:
        BETMAN_URL,

      fetchedAt:
        new Date().toISOString(),

      round: {
        gmId:
          currentLottery
            ?.gmId ??
          null,

        gameName:
          currentLottery
            ?.gameName ??
          null,

        gmTs:
          currentLottery
            ?.gmTs ??
          null,

        roundNumber:
          currentLottery
            ?.gmOsidTs ??
          null,

        year:
          currentLottery
            ?.gmOsidTsYear ??
          null,

        saleStatus:
          currentLottery
            ?.saleStatus ??
          null,

        saleStartDate:
          currentLottery
            ?.saleStartDate
            ? new Date(
                Number(
                  currentLottery
                    .saleStartDate
                )
              ).toISOString()
            : null,

        saleEndDate:
          currentLottery
            ?.saleEndDate
            ? new Date(
                Number(
                  currentLottery
                    .saleEndDate
                )
              ).toISOString()
            : null,
      },

      count:
        filtered.length,

      rawScheduleCount:
        schedules.length,

      filters: {
        home:
          url.searchParams.get(
            "home"
          ),

        away:
          url.searchParams.get(
            "away"
          ),

        sport:
          url.searchParams.get(
            "sport"
          ),

        league:
          url.searchParams.get(
            "league"
          ),

        market:
          url.searchParams.get(
            "market"
          ),
      },

      games:
        filtered,

      debug: {
        message:
          "Betman schedulesList를 경기별로 묶고 승패/핸디캡/UO 마켓으로 분류했습니다.",

        usage: [
          "/api/betman",
          "/api/betman?sport=soccer",
          "/api/betman?market=handicap",
          "/api/betman?market=total",
          "/api/betman?home=아스널&away=리즈",
        ],

        notes: [
          "핸디캡은 Betman 안내에 따라 홈팀 기준으로 해석합니다.",
          "언더오버 기준값은 schedulesList의 winHandi/loseHandi에서 읽습니다.",
          "같은 실제 경기에 여러 핸디캡/UO 기준값이 존재할 수 있으므로 배열로 보존합니다.",
          "배당은 schedulesList의 winAllot/drawAllot/loseAllot 실수값을 그대로 사용합니다.",
        ],
      },
    });
  } catch (e: any) {
    const cause = e?.cause;

    return Response.json(
      {
        ok: false,

        source:
          "Betman",

        stage:
          "betman-fetch",

        error:
          e?.message ||
          "Betman 데이터 수집 실패",

        errorName:
          e?.name ?? null,

        cause: cause
          ? {
              name:
                cause?.name ?? null,

              message:
                cause?.message ??
                String(cause),

              code:
                cause?.code ?? null,

              errno:
                cause?.errno ?? null,

              syscall:
                cause?.syscall ?? null,

              hostname:
                cause?.hostname ?? null,

              address:
                cause?.address ?? null,

              port:
                cause?.port ?? null,
            }
          : null,

        url:
          BETMAN_URL,

        runtime: {
          node:
            process.version,

          vercelRegion:
            process.env.VERCEL_REGION ??
            null,
        },
      },
      {
        status: 502,
      }
    );
  }
}
