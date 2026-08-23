const BETMAN_PROXY_URL =
  process.env.BETMAN_PROXY_URL?.trim() ||
  "https://codes-int-pieces-continuously.trycloudflare.com/betman";

const BETMAN_FETCH_TIMEOUT_MS = 20_000;
const BETMAN_FETCH_RETRIES = 3;

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

function firstText(
  ...values: any[]
) {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }
  return "";
}

function rowHome(
  row: AnyObj
) {
  return firstText(
    row?.homeName,
    row?.homeTeamName,
    row?.home?.name,
    row?.homeTeam?.name
  );
}

function rowAway(
  row: AnyObj
) {
  return firstText(
    row?.awayName,
    row?.awayTeamName,
    row?.away?.name,
    row?.awayTeam?.name
  );
}

function rowMatchSeq(
  row: AnyObj
) {
  return (
    num(row?.matchSeq) ??
    num(row?.gameSeq) ??
    num(row?.scheduleSeq) ??
    num(row?.seqNo)
  );
}

function rowOdds(
  row: AnyObj,
  side:
    | "win"
    | "draw"
    | "lose"
) {
  const aliases =
    side === "win"
      ? [
          row?.winAllot,
          row?.homeAllot,
          row?.winOdds,
          row?.homeOdds,
        ]
      : side === "draw"
        ? [
            row?.drawAllot,
            row?.drawOdds,
          ]
        : [
            row?.loseAllot,
            row?.awayAllot,
            row?.loseOdds,
            row?.awayOdds,
          ];

  for (const value of aliases) {
    const n = num(value);
    if (n !== null) return n;
  }

  return null;
}


function marketType(row: AnyObj): MarketType {
  const betNm = text(row?.betNm);
  const betTypNm = text(row?.betTypNm);
  const combined =
    `${betNm} ${betTypNm}`.toLowerCase();

  if (
    combined.includes("언더오버") ||
    combined.includes("under") ||
    combined.includes("over")
  ) {
    return "total";
  }

  if (
    combined.includes("핸디캡") ||
    combined.includes("handicap")
  ) {
    return "handicap";
  }

  if (
    combined.includes("sum") ||
    combined.includes("홀짝") ||
    combined.includes("odd") ||
    combined.includes("even")
  ) {
    return "other";
  }

  if (
    combined.includes("승패") ||
    combined.includes("승무패") ||
    combined.includes("승1패") ||
    combined.includes("승n패") ||
    combined.includes("moneyline")
  ) {
    return "moneyline";
  }

  return "other";
}

function getSport(row: AnyObj) {
  return firstText(
    row?.sportsItem?.sportsItemEngName,
    row?.sportsItemEngName,
    row?.sport,
    row?.sportCode,
    row?.itemCode
  ) || null;
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
      label:
        text(row?.winTxt) ||
        text(row?.homeTxt) ||
        null,
      odds:
        rowOdds(
          row,
          "win"
        ),
      line:
        num(row?.winHandi),
    },
    {
      side: "draw",
      label:
        text(row?.drawTxt) ||
        null,
      odds:
        rowOdds(
          row,
          "draw"
        ),
      line:
        num(row?.drawHandi),
    },
    {
      side: "lose",
      label:
        text(row?.loseTxt) ||
        text(row?.awayTxt) ||
        null,
      odds:
        rowOdds(
          row,
          "lose"
        ),
      line:
        num(row?.loseHandi),
    },
  ].filter((x) => {
    if (
      x.label &&
      x.label !== "-"
    ) {
      return true;
    }

    if (
      x.odds !== null &&
      x.odds > 0
    ) {
      return true;
    }

    return false;
  });
}

function summarizeRow(row: AnyObj) {
  const type = marketType(row);

  return {
    matchSeq:
      rowMatchSeq(row),

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
      row?.leagueCode ??
      row?.league?.code ??
      row?.league?.id ??
      null,

    league:
      firstText(
        row?.leagueName,
        row?.league?.name,
        row?.meetName,
        row?.tournamentName
      ) || null,

    homeId:
      row?.homeId ??
      row?.home?.id ??
      row?.homeTeam?.id ??
      null,

    home:
      rowHome(row) ||
      null,

    awayId:
      row?.awayId ??
      row?.away?.id ??
      row?.awayTeam?.id ??
      null,

    away:
      rowAway(row) ||
      null,

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

      marketCode:
        row?.betCode ??
        row?.betTypCode ??
        row?.handi ??
        null,

      displayName:
        firstText(
          row?.betNm,
          row?.betTypNm
        ) || null,

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
      rowHome(value) &&
      rowAway(value)
    );

  const hasMatchSeq =
    rowMatchSeq(value) !==
    null;

  const hasOdds =
    (
      [
        "win",
        "draw",
        "lose",
      ] as const
    ).some(
      (side) => {
        const odds =
          rowOdds(
            value,
            side
          );

        return (
          odds !== null &&
          odds > 0
        );
      }
    );

  const hasMarketInfo =
    Boolean(
      text(value?.betNm) ||
      text(value?.betTypNm) ||
      value?.betId != null ||
      value?.betTypId != null ||
      value?.handi != null
    );

  return (
    hasTeams &&
    hasMatchSeq &&
    (
      hasOdds ||
      hasMarketInfo
    )
  );
}


function expandCompSchedules(
  raw: any
) {
  const comp =
    raw?.compSchedules;

  const keys =
    Array.isArray(
      comp?.keys
    )
      ? comp.keys
      : [];

  const datas =
    Array.isArray(
      comp?.datas
    )
      ? comp.datas
      : [];

  if (
    !keys.length ||
    !datas.length
  ) {
    return [];
  }

  const rows: AnyObj[] =
    [];

  for (
    const values of datas
  ) {
    if (
      !Array.isArray(
        values
      )
    ) {
      continue;
    }

    const row: AnyObj =
      {};

    for (
      let i = 0;
      i < keys.length;
      i++
    ) {
      const key =
        String(
          keys[i] ??
          ""
        );

      if (!key) {
        continue;
      }

      row[key] =
        values[i] ??
        null;
    }

    rows.push(row);
  }

  return rows;
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
        rowHome(row) ??
        "",
      row?.awayId ??
        rowAway(row) ??
        "",
      row?.betId ?? "",
      row?.betTypId ?? "",
      row?.betNm ?? "",
      row?.betTypNm ?? "",
      row?.handi ?? "",
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
  let lastError: Error | null = null;

  for (
    let attempt = 1;
    attempt <= BETMAN_FETCH_RETRIES;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        BETMAN_FETCH_TIMEOUT_MS
      );

    try {
      const response =
        await fetch(
          BETMAN_PROXY_URL,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json, text/plain, */*",
              "User-Agent":
                "WisetotoAnalyzer/1.0 Vercel",
              "Cache-Control":
                "no-cache",
            },

            cache:
              "no-store",

            signal:
              controller.signal,
          }
        );

      const raw =
        await response.text();

      let json: any = null;

      try {
        json = JSON.parse(raw);
      } catch {
        const preview =
          raw
            .replace(/\s+/g, " ")
            .slice(0, 300);

        throw new Error(
          `Betman 프록시가 JSON이 아닌 응답을 반환했습니다 · HTTP ${response.status} · ${preview || "응답 본문 없음"}`
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
            json?.message ||
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
    } catch (error: any) {
      const message =
        error?.name === "AbortError"
          ? `Betman 프록시 응답 시간 초과 (${BETMAN_FETCH_TIMEOUT_MS / 1000}초)`
          : error?.message ||
            "Betman 프록시 호출 실패";

      lastError =
        new Error(
          `시도 ${attempt}/${BETMAN_FETCH_RETRIES} · ${message}`
        );

      if (
        attempt < BETMAN_FETCH_RETRIES
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700 * attempt
            )
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw (
    lastError ??
    new Error(
      "Betman 프록시 호출 실패"
    )
  );
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
    /*
     * gameInfoInq.do 의 실제 전체 발매표는
     * raw.compSchedules.keys + raw.compSchedules.datas
     * 형태로 압축되어 내려옵니다.
     *
     * keys 배열을 컬럼명으로 사용해 datas의 각 배열을
     * 다시 객체(row)로 복원한 뒤, 기존 schedulesList 등에서
     * 발견한 객체형 행과 합칩니다.
     */
    const expandedCompSchedules =
      expandCompSchedules(
        raw
      );

    const collected =
      collectAllScheduleRows(
        raw
      );

    const mergedRows =
      [
        ...expandedCompSchedules,
        ...collected.rows,
      ];

    /*
     * compSchedules와 다른 배열에 같은 마켓 행이 동시에
     * 존재할 수 있으므로 경기번호 + 마켓 식별값 + 기준값/배당 조합으로
     * 완전히 같은 행만 중복 제거합니다.
     */
    const deduped =
      new Map<
        string,
        AnyObj
      >();

    for (
      const row of mergedRows
    ) {
      const matchSeq =
        rowMatchSeq(row);

      /*
       * matchSeq는 "실제 경기"를 가리키는 값이라 같은 경기의
       * 승패/승1패/핸디/UO/SUM 행에서 반복될 수 있습니다.
       * 따라서 matchSeq 하나만으로 중복 제거하면 서로 다른 마켓이
       * 사라질 수 있으므로, 마켓 식별값과 기준값/배당까지 함께 사용합니다.
       */
      const key = [
        matchSeq !== null
          ? `seq:${matchSeq}`
          : `teams:${normalizeName(rowHome(row))}:${normalizeName(rowAway(row))}`,
        row?.gameDate ?? "",
        row?.betId ?? "",
        row?.betTypId ?? "",
        row?.betNm ?? "",
        row?.betTypNm ?? "",
        row?.handi ?? "",
        row?.winHandi ?? "",
        row?.drawHandi ?? "",
        row?.loseHandi ?? "",
        row?.winAllot ?? row?.homeAllot ?? row?.winOdds ?? row?.homeOdds ?? "",
        row?.drawAllot ?? row?.drawOdds ?? "",
        row?.loseAllot ?? row?.awayAllot ?? row?.loseOdds ?? row?.awayOdds ?? "",
      ].join("|");

      /*
       * compSchedules 복원 행을 우선 보존합니다.
       * 앞에서 먼저 들어오기 때문에 동일 key가 있으면 덮지 않습니다.
       */
      if (
        !deduped.has(key)
      ) {
        deduped.set(
          key,
          row
        );
      }
    }

    const schedules =
      Array.from(
        deduped.values()
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

      compScheduleKeyCount:
        Array.isArray(
          raw?.compSchedules
            ?.keys
        )
          ? raw.compSchedules
              .keys.length
          : 0,

      compScheduleDataCount:
        Array.isArray(
          raw?.compSchedules
            ?.datas
        )
          ? raw.compSchedules
              .datas.length
          : 0,

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

      collectedSports:
        Array.from(
          new Set(
            games
              .map(
                (g: AnyObj) =>
                  g?.sportName ??
                  g?.sport ??
                  null
              )
              .filter(Boolean)
          )
        ),

      collectedLeagues:
        Array.from(
          new Set(
            games
              .map(
                (g: AnyObj) =>
                  g?.league ??
                  null
              )
              .filter(Boolean)
          )
        ),

      marketRowCount:
        games.reduce(
          (
            sum,
            game: AnyObj
          ) =>
            sum +
            arr(
              game?.markets
            ).length,
          0
        ),

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
          "Betman gameInfoInq.do의 compSchedules 압축 데이터를 복원하고 기타 경기행을 병합한 뒤 경기별/게임유형별로 분류했습니다.",

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
          "전체 발매표의 핵심 데이터는 compSchedules.keys + compSchedules.datas를 복원해서 사용합니다.",
          "schedulesList 등 객체형 경기행이 있으면 추가로 병합합니다.",
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

        proxyUrl:
          BETMAN_PROXY_URL,

        error:
          e?.message ||
          "Betman 데이터 수집 실패",

        fetchedAt:
          new Date().toISOString(),
      },
      {
        status: 502,
      }
    );
  }
}
