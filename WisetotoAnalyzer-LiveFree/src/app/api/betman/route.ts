const BETMAN_PROXY_URL =
  "https://association-robertson-jefferson-enormous.trycloudflare.com/betman";

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


type ArrayDebug = {
  path: string;
  length: number;
  scheduleLikeCount: number;
};

function isScheduleLikeRow(
  value: any
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const hasTeams =
    Boolean(
      text(value?.homeName) &&
      text(value?.awayName)
    );

  const hasMatchSeq =
    num(value?.matchSeq) !== null;

  const hasOdds =
    [
      value?.winAllot,
      value?.drawAllot,
      value?.loseAllot,
    ].some(
      (odds) => {
        const n =
          num(odds);

        return (
          n !== null &&
          n > 0
        );
      }
    );

  const hasMarketInfo =
    Boolean(
      text(value?.betNm) ||
      text(value?.betTypNm) ||
      value?.betId != null ||
      value?.betTypId != null
    );

  /*
   * Betman 경기/배당 행으로 판단:
   * 팀명 + 경기번호 + (배당 또는 마켓정보)
   */
  return (
    hasTeams &&
    hasMatchSeq &&
    (
      hasOdds ||
      hasMarketInfo
    )
  );
}

function collectAllScheduleRows(
  root: any
) {
  const rows: AnyObj[] =
    [];

  const arrays:
    ArrayDebug[] =
    [];

  const seenObjects =
    new Set<any>();

  const seenRows =
    new Set<string>();

  function rowKey(
    row: AnyObj
  ) {
    return [
      row?.matchSeq ?? "",
      row?.gameDate ?? "",
      row?.homeId ??
        row?.homeName ??
        "",
      row?.awayId ??
        row?.awayName ??
        "",
      row?.betId ?? "",
      row?.betTypId ?? "",
      row?.betNm ?? "",
      row?.winHandi ?? "",
      row?.drawHandi ?? "",
      row?.loseHandi ?? "",
    ].join("|");
  }

  function addRow(
    row: AnyObj
  ) {
    const key =
      rowKey(row);

    if (
      seenRows.has(key)
    ) {
      return;
    }

    seenRows.add(key);
    rows.push(row);
  }

  function walk(
    value: any,
    path: string,
    depth: number
  ) {
    if (
      value == null ||
      depth > 12
    ) {
      return;
    }

    if (
      typeof value !==
      "object"
    ) {
      return;
    }

    if (
      seenObjects.has(value)
    ) {
      return;
    }

    seenObjects.add(value);

    if (
      Array.isArray(value)
    ) {
      let scheduleLikeCount =
        0;

      for (
        let i = 0;
        i < value.length;
        i++
      ) {
        const item =
          value[i];

        if (
          isScheduleLikeRow(
            item
          )
        ) {
          scheduleLikeCount++;
          addRow(item);
        }

        walk(
          item,
          `${path}[${i}]`,
          depth + 1
        );
      }

      arrays.push({
        path,
        length:
          value.length,
        scheduleLikeCount,
      });

      return;
    }

    if (
      isScheduleLikeRow(
        value
      )
    ) {
      addRow(value);
    }

    for (
      const [
        key,
        child,
      ] of Object.entries(
        value
      )
    ) {
      walk(
        child,
        path
          ? `${path}.${key}`
          : key,
        depth + 1
      );
    }
  }

  walk(
    root,
    "root",
    0
  );

  arrays.sort(
    (a, b) =>
      b.scheduleLikeCount -
        a.scheduleLikeCount ||
      b.length -
        a.length
  );

  return {
    rows,
    arrays,
  };
}

async function fetchBetman() {
  const response =
    await fetch(
      BETMAN_PROXY_URL,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json, text/plain, */*",
        },

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
      `Betman 프록시 응답을 JSON으로 해석하지 못했습니다. HTTP ${response.status}: ${raw.slice(
        0,
        300
      )}`
    );
  }

  if (!response.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        `Betman 프록시 HTTP ${response.status}`
    );
  }

  if (!json?.ok) {
    throw new Error(
      json?.error ||
        "Betman 프록시가 실패 응답을 반환했습니다."
    );
  }

  const betmanData =
    json?.data;

  if (!betmanData) {
    throw new Error(
      "Betman 프록시 응답에 data가 없습니다."
    );
  }

  return betmanData;
}

export async function GET(
  req: Request
) {
  try {
    const url =
      new URL(req.url);

    const raw =
      await fetchBetman();

    /*
     * 예전에는 raw.schedulesList 하나만 읽었습니다.
     * 이제는 Betman 원본 JSON 전체를 재귀 탐색해서
     * matchSeq + 홈/원정 + 배당/마켓 정보가 있는 모든 행을 수집합니다.
     */
    const collected =
      collectAllScheduleRows(
        raw
      );

    const schedules =
      collected.rows;

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
        BETMAN_PROXY_URL,

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

      sourceArrayCount:
        collected.arrays.length,

      sourceArrays:
        collected.arrays
          .filter(
            (x) =>
              x.scheduleLikeCount >
              0
          )
          .slice(0, 50),

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
          "Betman 원본 JSON 전체에서 경기/배당 행을 재귀 수집한 뒤 경기별로 묶고 승패/핸디캡/UO 마켓으로 분류했습니다.",

        usage: [
          "/api/betman",
          "/api/betman?sport=soccer",
          "/api/betman?market=handicap",
          "/api/betman?market=total",
          "/api/betman?home=아스널&away=리즈",
        ],

        notes: [
          "핸디캡은 Betman 안내에 따라 홈팀 기준으로 해석합니다.",
          "언더오버 기준값은 수집된 경기행의 winHandi/loseHandi에서 읽습니다.",
          "같은 실제 경기에 여러 핸디캡/UO 기준값이 존재할 수 있으므로 배열로 보존합니다.",
          "배당은 Betman 원본에서 발견한 모든 경기행의 winAllot/drawAllot/loseAllot 값을 그대로 사용합니다.",
          "schedulesList 하나만 보지 않고 원본 JSON의 모든 중첩 배열을 검사합니다.",
          "응답의 sourceArrays를 보면 실제로 어느 배열에서 몇 개의 경기행을 찾았는지 확인할 수 있습니다.",
        ],
      },
    });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,

        source:
          "Betman",

        error:
          e?.message ||
          "Betman 데이터 수집 실패",
      },
      {
        status: 502,
      }
    );
  }
}
