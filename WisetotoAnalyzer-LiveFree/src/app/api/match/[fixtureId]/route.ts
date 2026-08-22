const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

const REQUEST_INTERVAL_MS = 6500;
const RECENT_LIMIT = 5;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

let lastRequestAt = 0;

async function waitForRateLimitSlot() {
  const now = Date.now();

  const elapsed =
    now - lastRequestAt;

  if (
    elapsed <
    REQUEST_INTERVAL_MS
  ) {
    await sleep(
      REQUEST_INTERVAL_MS -
        elapsed
    );
  }

  lastRequestAt =
    Date.now();
}

function getRetryAfterMs(
  response: Response
) {
  const retryAfter =
    response.headers.get(
      "retry-after"
    );

  if (!retryAfter) {
    return 60000;
  }

  const seconds =
    Number(retryAfter);

  if (
    Number.isFinite(
      seconds
    )
  ) {
    return Math.max(
      seconds * 1000,
      1000
    );
  }

  const date =
    Date.parse(
      retryAfter
    );

  if (
    Number.isFinite(
      date
    )
  ) {
    return Math.max(
      date - Date.now(),
      1000
    );
  }

  return 60000;
}

async function api(
  path: string,
  key: string
) {
  await waitForRateLimitSlot();

  const response =
    await fetch(
      BASE + path,
      {
        headers: {
          Authorization:
            `Bearer ${key}`,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      }
    );

  const text =
    await response.text();

  let json: any;

  try {
    json =
      JSON.parse(text);
  } catch {
    json = {
      raw: text,
    };
  }

  const rateLimit = {
    limit:
      response.headers.get(
        "ratelimit-limit"
      ),

    remaining:
      response.headers.get(
        "ratelimit-remaining"
      ),

    reset:
      response.headers.get(
        "ratelimit-reset"
      ),
  };

  if (
    response.status ===
    429
  ) {
    const error =
      new Error(
        json?.error
          ?.message ||
          json?.message ||
          "SportsAPI rate limit exceeded"
      ) as Error & {
        status?: number;
        retryAfterMs?: number;
        rateLimit?: AnyObj;
      };

    error.status = 429;

    error.retryAfterMs =
      getRetryAfterMs(
        response
      );

    error.rateLimit =
      rateLimit;

    throw error;
  }

  if (!response.ok) {
    const error =
      new Error(
        json?.error
          ?.message ||
          json?.message ||
          `SportsAPI ${response.status}`
      ) as Error & {
        status?: number;
        rateLimit?: AnyObj;
      };

    error.status =
      response.status;

    error.rateLimit =
      rateLimit;

    throw error;
  }

  return {
    data:
      json?.data ??
      json,

    meta:
      json?.meta ??
      null,

    rateLimit,
  };
}

function isFutureFixture(
  fixture: AnyObj
) {
  const status =
    fixture?.status;

  if (!status) {
    return false;
  }

  const type =
    String(
      status?.type ||
        ""
    ).toLowerCase();

  const description =
    String(
      status
        ?.description ||
        ""
    ).toLowerCase();

  const code =
    Number(
      status?.code
    );

  const notStarted =
    type ===
      "notstarted" ||
    type ===
      "scheduled" ||
    type ===
      "pending" ||
    description.includes(
      "not started"
    ) ||
    description.includes(
      "scheduled"
    ) ||
    code === 0;

  if (!notStarted) {
    return false;
  }

  const timestamp =
    new Date(
      fixture
        ?.startTime
    ).getTime();

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return false;
  }

  return (
    timestamp >
    Date.now()
  );
}

function summarizeFixture(
  fixture: AnyObj
) {
  return {
    id:
      fixture?.id ??
      null,

    startTime:
      fixture
        ?.startTime ??
      null,

    status:
      fixture?.status ??
      null,

    home:
      fixture?.home
        ?.name ??
      null,

    homeId:
      fixture?.home
        ?.id ??
      null,

    away:
      fixture?.away
        ?.name ??
      null,

    awayId:
      fixture?.away
        ?.id ??
      null,

    sport:
      fixture?.sport ??
      null,

    league:
      fixture?.league
        ?.name ??
      null,
  };
}

async function optionalEndpoint(
  path: string,
  key: string,
  label: string
) {
  try {
    const result =
      await api(
        path,
        key
      );

    return {
      data:
        result.data,

      status: {
        ok: true,
        error: null,
        httpStatus: 200,

        rateLimit:
          result.rateLimit,
      },
    };
  } catch (e: any) {
    console.error(
      `${label} 조회 실패:`,
      e?.message
    );

    return {
      data: null,

      status: {
        ok: false,

        error:
          e?.message ||
          `${label} 조회 실패`,

        httpStatus:
          e?.status ??
          null,

        retryAfterMs:
          e?.retryAfterMs ??
          null,

        rateLimit:
          e?.rateLimit ??
          null,
      },
    };
  }
}

/*
 * --------------------------------------------------
 * 최근 경기에서 팀의 W / D / L 판정
 * --------------------------------------------------
 */
function getTeamResult(
  fixture: AnyObj,
  teamId: number
):
  | "W"
  | "D"
  | "L"
  | null {
  const homeId =
    Number(
      fixture?.home?.id
    );

  const awayId =
    Number(
      fixture?.away?.id
    );

  const homeScore =
    Number(
      fixture?.homeScore
        ?.current
    );

  const awayScore =
    Number(
      fixture?.awayScore
        ?.current
    );

  if (
    !Number.isFinite(
      homeScore
    ) ||
    !Number.isFinite(
      awayScore
    )
  ) {
    return null;
  }

  if (
    homeScore ===
    awayScore
  ) {
    return "D";
  }

  if (
    teamId ===
    homeId
  ) {
    return homeScore >
      awayScore
      ? "W"
      : "L";
  }

  if (
    teamId ===
    awayId
  ) {
    return awayScore >
      homeScore
      ? "W"
      : "L";
  }

  return null;
}

/*
 * --------------------------------------------------
 * 최근 경기 한 경기 요약
 * --------------------------------------------------
 */
function summarizeRecentFixture(
  fixture: AnyObj,
  teamId: number
) {
  return {
    id:
      fixture?.id ??
      null,

    startTime:
      fixture
        ?.startTime ??
      null,

    league:
      fixture?.league
        ?.name ??
      null,

    home:
      fixture?.home
        ?.name ??
      null,

    homeId:
      fixture?.home
        ?.id ??
      null,

    away:
      fixture?.away
        ?.name ??
      null,

    awayId:
      fixture?.away
        ?.id ??
      null,

    homeScore:
      fixture
        ?.homeScore
        ?.current ??
      null,

    awayScore:
      fixture
        ?.awayScore
        ?.current ??
      null,

    result:
      getTeamResult(
        fixture,
        teamId
      ),
  };
}

/*
 * --------------------------------------------------
 * 최근 N경기 성적 요약
 * --------------------------------------------------
 */
function summarizeForm(
  fixtures: AnyObj[],
  teamId: number
) {
  let wins = 0;
  let draws = 0;
  let losses = 0;

  let scored = 0;
  let conceded = 0;

  let counted = 0;

  for (
    const fixture
    of fixtures
  ) {
    const result =
      getTeamResult(
        fixture,
        teamId
      );

    if (!result) {
      continue;
    }

    const homeId =
      Number(
        fixture
          ?.home?.id
      );

    const homeScore =
      Number(
        fixture
          ?.homeScore
          ?.current
      );

    const awayScore =
      Number(
        fixture
          ?.awayScore
          ?.current
      );

    if (
      !Number.isFinite(
        homeScore
      ) ||
      !Number.isFinite(
        awayScore
      )
    ) {
      continue;
    }

    counted++;

    if (
      result === "W"
    ) {
      wins++;
    }

    if (
      result === "D"
    ) {
      draws++;
    }

    if (
      result === "L"
    ) {
      losses++;
    }

    if (
      teamId ===
      homeId
    ) {
      scored +=
        homeScore;

      conceded +=
        awayScore;
    } else {
      scored +=
        awayScore;

      conceded +=
        homeScore;
    }
  }

  const points =
    wins * 3 +
    draws;

  const maxPoints =
    counted * 3;

  const formPercent =
    maxPoints > 0
      ? Number(
          (
            (points /
              maxPoints) *
            100
          ).toFixed(1)
        )
      : null;

  return {
    played:
      counted,

    wins,

    draws,

    losses,

    scored,

    conceded,

    goalDifference:
      scored -
      conceded,

    points,

    formPercent,
  };
}

/*
 * --------------------------------------------------
 * 팀 최근 경기 조회
 *
 * 공식 endpoint:
 * /teams/{id}/fixtures?type=recent&page=0
 * --------------------------------------------------
 */
async function getRecentFixtures(
  teamId: number,
  key: string,
  label: string
) {
  const result =
    await optionalEndpoint(
      `/teams/${teamId}/fixtures?type=recent&page=0`,
      key,
      label
    );

  if (!result.data) {
    return {
      fixtures: [],
      summary:
        summarizeForm(
          [],
          teamId
        ),
      status:
        result.status,
    };
  }

  const rawFixtures =
    arr(
      result.data
    );

  /*
   * 최신 경기부터 정렬한 뒤
   * 최근 5경기만 사용
   */
  const fixtures =
    [...rawFixtures]
      .sort(
        (a, b) =>
          new Date(
            b?.startTime
          ).getTime() -
          new Date(
            a?.startTime
          ).getTime()
      )
      .filter(
        (fixture) =>
          getTeamResult(
            fixture,
            teamId
          ) !== null
      )
      .slice(
        0,
        RECENT_LIMIT
      );

  return {
    fixtures:
      fixtures.map(
        (fixture) =>
          summarizeRecentFixture(
            fixture,
            teamId
          )
      ),

    summary:
      summarizeForm(
        fixtures,
        teamId
      ),

    status:
      result.status,
  };
}

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      fixtureId: string;
    }>;
  }
) {
  const key =
    process.env
      .SPORTSAPI_KEY;

  if (!key) {
    return Response.json(
      {
        ok: false,

        error:
          "SPORTSAPI_KEY가 설정되지 않았습니다.",
      },
      {
        status: 503,
      }
    );
  }

  const {
    fixtureId,
  } =
    await context.params;

  const id =
    Number(
      fixtureId
    );

  if (
    !Number.isInteger(
      id
    ) ||
    id <= 0
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "올바른 fixtureId가 필요합니다.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /*
     * ==========================================
     * 1. FIXTURE DETAIL
     * ==========================================
     */

    const detailResult =
      await api(
        `/fixtures/${id}`,
        key
      );

    const fixture =
      detailResult.data;

    if (!fixture) {
      return Response.json(
        {
          ok: false,

          fixtureId:
            id,

          error:
            "Fixture 데이터를 찾지 못했습니다.",
        },
        {
          status: 404,
        }
      );
    }

    const future =
      isFutureFixture(
        fixture
      );

    const homeId =
      Number(
        fixture
          ?.home?.id
      );

    const awayId =
      Number(
        fixture
          ?.away?.id
      );

    /*
     * ==========================================
     * 2. H2H
     * ==========================================
     */

    const h2hResult =
      await optionalEndpoint(
        `/fixtures/${id}/h2h`,
        key,
        "H2H"
      );

    /*
     * ==========================================
     * 3. 홈팀 최근 경기
     * ==========================================
     */

    let homeRecent = {
      fixtures:
        [] as AnyObj[],

      summary:
        summarizeForm(
          [],
          homeId
        ),

      status: {
        ok: false,
        error:
          "홈팀 ID 없음",
        httpStatus:
          null,
      } as AnyObj,
    };

    if (
      Number.isFinite(
        homeId
      )
    ) {
      homeRecent =
        await getRecentFixtures(
          homeId,
          key,
          "Home Recent"
        );
    }

    /*
     * ==========================================
     * 4. 원정팀 최근 경기
     * ==========================================
     */

    let awayRecent = {
      fixtures:
        [] as AnyObj[],

      summary:
        summarizeForm(
          [],
          awayId
        ),

      status: {
        ok: false,
        error:
          "원정팀 ID 없음",
        httpStatus:
          null,
      } as AnyObj,
    };

    if (
      Number.isFinite(
        awayId
      )
    ) {
      awayRecent =
        await getRecentFixtures(
          awayId,
          key,
          "Away Recent"
        );
    }

    /*
     * ==========================================
     * 5. STATISTICS
     * ==========================================
     *
     * 미래 경기는 현재 호출하지 않음
     */

    const statisticsResult = {
      data: null,

      status: {
        ok: false,

        error:
          "현재 미래 경기에서는 호출하지 않음",

        httpStatus:
          null,
      },
    };

    /*
     * ==========================================
     * 6. LINEUPS
     * ==========================================
     *
     * 미래 경기는 현재 호출하지 않음
     */

    const lineupsResult = {
      data: null,

      status: {
        ok: false,

        error:
          "현재 미래 경기에서는 호출하지 않음",

        httpStatus:
          null,
      },
    };

    /*
     * ==========================================
     * 7. RESPONSE
     * ==========================================
     */

    return Response.json({
      ok: true,

      fixtureId:
        id,

      future,

      selectedFixture:
        summarizeFixture(
          fixture
        ),

      fixture,

      lineups:
        lineupsResult.data,

      statistics:
        statisticsResult.data,

      h2h:
        h2hResult.data,

      /*
       * 새로 추가된 최근 경기 데이터
       */
      recentSummary: {
        home: {
          teamId:
            homeId,

          teamName:
            fixture
              ?.home
              ?.name ??
            null,

          fixtures:
            homeRecent
              .fixtures,

          form:
            homeRecent
              .summary,
        },

        away: {
          teamId:
            awayId,

          teamName:
            fixture
              ?.away
              ?.name ??
            null,

          fixtures:
            awayRecent
              .fixtures,

          form:
            awayRecent
              .summary,
        },
      },

      debug: {
        message:
          "fixture detail + H2H + 홈/원정 최근 경기 조회 완료",

        endpointStatus: {
          detail: {
            ok: true,

            httpStatus:
              200,

            rateLimit:
              detailResult
                .rateLimit,
          },

          h2h:
            h2hResult
              .status,

          homeRecent:
            homeRecent
              .status,

          awayRecent:
            awayRecent
              .status,

          statistics:
            statisticsResult
              .status,

          lineups:
            lineupsResult
              .status,
        },

        note:
          "최근 경기 Form은 각 팀의 recent fixture 중 실제 점수 판정이 가능한 최신 5경기를 기준으로 계산합니다.",
      },
    });
  } catch (e: any) {
    const status =
      e?.status ??
      502;

    return Response.json(
      {
        ok: false,

        fixtureId:
          id,

        error:
          e?.message ||
          "fixture detail 조회 실패",

        status,

        retryAfterMs:
          e
            ?.retryAfterMs ??
          null,

        rateLimit:
          e?.rateLimit ??
          null,
      },
      {
        status:
          status ===
          429
            ? 429
            : 502,
      }
    );
  }
}
