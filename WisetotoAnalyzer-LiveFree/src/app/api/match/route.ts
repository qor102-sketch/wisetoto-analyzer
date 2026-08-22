const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

const SEARCH_QUERIES = [
  "basketball",
  "football",
  "baseball",
  "volleyball",
  "soccer",
  "MLB",
  "NBA",
  "NFL",
  "NHL",
];

const MAX_TEAMS_TO_CHECK = 8;
const DETAIL_RETRIES = 2;
const RATE_LIMIT_DELAY = 800;

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;

  if (Array.isArray(x?.data)) {
    return x.data;
  }

  return [];
}

function getErrorMessage(
  data: any,
  status: number
) {
  return (
    data?.error?.message ||
    data?.message ||
    `SportsAPI ${status}`
  );
}

async function api(
  path: string,
  key: string,
  options?: {
    retries?: number;
    retryDelay?: number;
  }
) {
  const retries =
    options?.retries ?? 0;

  const retryDelay =
    options?.retryDelay ??
    RATE_LIMIT_DELAY;

  let lastError: AnyObj | null =
    null;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    const r = await fetch(
      BASE + path,
      {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );

    const text = await r.text();

    let j: any;

    try {
      j = JSON.parse(text);
    } catch {
      j = {
        raw: text,
      };
    }

    if (r.ok) {
      return {
        ok: true,
        status: r.status,
        data: j?.data ?? j,
        error: null,
        attempts: attempt + 1,
      };
    }

    lastError = {
      ok: false,
      status: r.status,
      error: getErrorMessage(
        j,
        r.status
      ),
      data: null,
      attempts: attempt + 1,
    };

    /*
     * 429일 때만 재시도.
     * 404 같은 오류는 재시도할 필요가 없음.
     */
    if (
      r.status === 429 &&
      attempt < retries
    ) {
      await sleep(
        retryDelay *
          (attempt + 1)
      );

      continue;
    }

    break;
  }

  return (
    lastError ?? {
      ok: false,
      status: 500,
      error: "SportsAPI 요청 실패",
      data: null,
      attempts: retries + 1,
    }
  );
}

function isNotStarted(
  fixture: AnyObj
) {
  const status =
    fixture?.status;

  if (!status) {
    return false;
  }

  const type = String(
    status?.type || ""
  ).toLowerCase();

  const description =
    String(
      status?.description || ""
    ).toLowerCase();

  const code = Number(
    status?.code
  );

  return (
    type === "notstarted" ||
    type === "scheduled" ||
    type === "pending" ||
    description.includes(
      "not started"
    ) ||
    description.includes(
      "scheduled"
    ) ||
    code === 0
  );
}

function isFutureFixture(
  fixture: AnyObj
) {
  if (
    !isNotStarted(fixture)
  ) {
    return false;
  }

  const startTime =
    fixture?.startTime;

  if (!startTime) {
    return false;
  }

  const timestamp =
    new Date(
      startTime
    ).getTime();

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return false;
  }

  return (
    timestamp > Date.now()
  );
}

function summarizeFixture(
  fixture: AnyObj
) {
  return {
    id:
      fixture?.id ?? null,

    startTime:
      fixture?.startTime ??
      null,

    status:
      fixture?.status ?? null,

    home:
      fixture?.home?.name ??
      null,

    homeId:
      fixture?.home?.id ??
      null,

    away:
      fixture?.away?.name ??
      null,

    awayId:
      fixture?.away?.id ??
      null,

    sport:
      fixture?.sport ?? null,

    league:
      fixture?.league?.name ??
      null,
  };
}

function extractTeams(
  raw: any
) {
  return arr(raw).filter(
    (item: AnyObj) =>
      item?.type === "team"
  );
}

function uniqueTeams(
  teams: AnyObj[]
) {
  const map =
    new Map<
      number,
      AnyObj
    >();

  for (
    const team of teams
  ) {
    const id = Number(
      team?.id
    );

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(
        id,
        team
      );
    }
  }

  return [
    ...map.values(),
  ];
}

async function discoverTeams(
  key: string
) {
  const teams: AnyObj[] =
    [];

  const debug: AnyObj[] =
    [];

  /*
   * 검색 API는 여러 번 호출되므로
   * 검색 사이에도 약간의 간격을 둔다.
   */
  for (
    let i = 0;
    i < SEARCH_QUERIES.length;
    i++
  ) {
    const query =
      SEARCH_QUERIES[i];

    const result =
      await api(
        `/search?q=${encodeURIComponent(
          query
        )}`,
        key,
        {
          retries: 1,
          retryDelay:
            RATE_LIMIT_DELAY,
        }
      );

    if (!result.ok) {
      debug.push({
        query,

        resultCount: 0,

        teamCount: 0,

        error:
          result.error,

        status:
          result.status,

        attempts:
          result.attempts,
      });

      await sleep(
        RATE_LIMIT_DELAY
      );

      continue;
    }

    const raw =
      result.data;

    const found =
      extractTeams(raw);

    debug.push({
      query,

      resultCount:
        arr(raw).length,

      teamCount:
        found.length,

      sample:
        found
          .slice(0, 10)
          .map(
            (
              team: AnyObj
            ) => ({
              id:
                team?.id ??
                null,

              name:
                team?.name ??
                null,

              sport:
                team?.sport ??
                null,
            })
          ),
    });

    teams.push(
      ...found
    );

    /*
     * 검색 API를 너무 빠르게 연속 호출하지 않도록 한다.
     */
    if (
      i <
      SEARCH_QUERIES.length -
        1
    ) {
      await sleep(300);
    }
  }

  return {
    teams:
      uniqueTeams(
        teams
      ),

    debug,
  };
}

async function getUpcoming(
  teamId: number,
  key: string
) {
  /*
   * 중요:
   *
   * 기존에는 page=0, page=1을
   * 모두 호출했는데 page=0에서
   * 이미 충분한 데이터를 가져오므로
   * page=1을 제거한다.
   *
   * 이게 429를 크게 줄이는 핵심이다.
   */
  const result =
    await api(
      `/teams/${teamId}/fixtures?type=upcoming&page=0`,
      key,
      {
        retries: 1,
        retryDelay:
          RATE_LIMIT_DELAY,
      }
    );

  if (!result.ok) {
    return {
      fixtures: [],
      debug: [
        {
          page: 0,

          ok: false,

          count: 0,

          error:
            result.error,

          status:
            result.status,

          attempts:
            result.attempts,
        },
      ],
    };
  }

  const fixtures =
    arr(result.data);

  return {
    fixtures,

    debug: [
      {
        page: 0,

        ok: true,

        count:
          fixtures.length,

        status:
          result.status,

        attempts:
          result.attempts,
      },
    ],
  };
}

function uniqueFixtures(
  fixtures: AnyObj[]
) {
  const map =
    new Map<
      number,
      AnyObj
    >();

  for (
    const fixture of fixtures
  ) {
    const id = Number(
      fixture?.id
    );

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(
        id,
        fixture
      );
    }
  }

  return [
    ...map.values(),
  ];
}

function sortByStartTime(
  fixtures: AnyObj[]
) {
  return fixtures.sort(
    (a, b) => {
      const aTime =
        new Date(
          a?.startTime
        ).getTime();

      const bTime =
        new Date(
          b?.startTime
        ).getTime();

      return (
        aTime - bTime
      );
    }
  );
}

async function getDetail(
  fixtureId: number,
  key: string
) {
  /*
   * detail은 429가 자주 발생할 수 있으므로
   * 최대 2번 재시도한다.
   *
   * 총 최대 3회:
   * 1차 → 429
   * 800ms 대기
   * 2차 → 429
   * 1600ms 대기
   * 3차
   */
  const result =
    await api(
      `/fixtures/${fixtureId}`,
      key,
      {
        retries:
          DETAIL_RETRIES,

        retryDelay:
          RATE_LIMIT_DELAY,
      }
    );

  if (!result.ok) {
    return {
      ok: false,

      data: null,

      error:
        result.error,

      status:
        result.status,

      attempts:
        result.attempts,
    };
  }

  return {
    ok: true,

    data:
      result.data,

    error: null,

    status:
      result.status,

    attempts:
      result.attempts,
  };
}

export async function GET(
  req: Request
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

  const url =
    new URL(req.url);

  const mode =
    url.searchParams.get(
      "mode"
    ) || "";

  if (
    mode !== "random"
  ) {
    return Response.json({
      ok: false,

      error:
        "현재 테스트 모드는 mode=random 입니다.",

      usage:
        "/api/match?mode=random",
    });
  }

  try {
    /*
     * --------------------------------------------------
     * 1. 팀 검색
     * --------------------------------------------------
     */
    const discovered =
      await discoverTeams(
        key
      );

    const teams =
      discovered.teams;

    if (
      !teams.length
    ) {
      return Response.json({
        ok: false,

        error:
          "SportsAPI에서 테스트할 팀 후보를 찾지 못했습니다.",

        debug: {
          search:
            discovered.debug,
        },
      });
    }

    /*
     * --------------------------------------------------
     * 2. 팀 후보 섞기
     * --------------------------------------------------
     */
    const shuffledTeams =
      [...teams].sort(
        () =>
          Math.random() -
          0.5
      );

    /*
     * 기존 20개 → 8개
     *
     * API 호출량을 줄여서 429 방지.
     */
    const selectedTeams =
      shuffledTeams.slice(
        0,
        MAX_TEAMS_TO_CHECK
      );

    const allFixtures:
      AnyObj[] = [];

    const teamDebug:
      AnyObj[] = [];

    /*
     * --------------------------------------------------
     * 3. 팀별 upcoming 조회
     * --------------------------------------------------
     */
    for (
      const team of selectedTeams
    ) {
      const teamId =
        Number(
          team?.id
        );

      if (
        !Number.isFinite(
          teamId
        )
      ) {
        continue;
      }

      const upcoming =
        await getUpcoming(
          teamId,
          key
        );

      const fixtures =
        upcoming.fixtures;

      const futureFixtures =
        fixtures.filter(
          isFutureFixture
        );

      if (
        futureFixtures.length
      ) {
        allFixtures.push(
          ...futureFixtures
        );
      }

      teamDebug.push({
        team: {
          id:
            team?.id ??
            null,

          name:
            team?.name ??
            null,

          sport:
            team?.sport ??
            null,
        },

        upcomingCount:
          fixtures.length,

        futureCount:
          futureFixtures.length,

        futureSample:
          futureFixtures
            .slice(0, 5)
            .map(
              summarizeFixture
            ),

        apiDebug:
          upcoming.debug,
      });

      /*
       * 팀 API 호출 사이에 간격
       */
      await sleep(500);
    }

    /*
     * --------------------------------------------------
     * 4. 중복 제거 + 시간순 정렬
     * --------------------------------------------------
     */
    const candidates =
      sortByStartTime(
        uniqueFixtures(
          allFixtures
        )
      );

    if (
      !candidates.length
    ) {
      return Response.json({
        ok: false,

        error:
          "현재 확인한 팀들에서 앞으로 시작할 경기를 찾지 못했습니다.",

        debug: {
          discoveredTeamCount:
            teams.length,

          checkedTeamCount:
            selectedTeams.length,

          candidateCount: 0,

          teamDebug,

          search:
            discovered.debug,
        },
      });
    }

    /*
     * --------------------------------------------------
     * 5. 랜덤 경기 선택
     * --------------------------------------------------
     */
    const randomIndex =
      Math.floor(
        Math.random() *
          candidates.length
      );

    const fixture =
      candidates[
        randomIndex
      ];

    const fixtureId =
      Number(
        fixture?.id
      );

    if (
      !Number.isFinite(
        fixtureId
      )
    ) {
      return Response.json({
        ok: false,

        error:
          "선택된 Fixture의 ID가 올바르지 않습니다.",

        debug: {
          fixture,
        },
      });
    }

    /*
     * --------------------------------------------------
     * 6. detail 조회
     * --------------------------------------------------
     */
    /*
     * 마지막 fixtures 요청 직후 바로 detail을
     * 때리지 않도록 잠깐 기다린다.
     */
    await sleep(
      RATE_LIMIT_DELAY
    );

    const detailResult =
      await getDetail(
        fixtureId,
        key
      );

    const detail =
      detailResult.ok
        ? detailResult.data
        : null;

    /*
     * --------------------------------------------------
     * 7. 최종 응답
     * --------------------------------------------------
     */
    return Response.json({
      ok: true,

      mode:
        "random",

      matched:
        true,

      fixtureId,

      selectedFixture:
        summarizeFixture(
          fixture
        ),

      fixture,

      detail,

      lineups: null,

      statistics: null,

      h2h: null,

      debug: {
        message:
          detailResult.ok
            ? "경기 탐색 및 상세 데이터 조회 성공."
            : "경기 탐색은 성공했지만 detail 데이터는 API 상태에 따라 제공되지 않았습니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          selectedTeams.length,

        maxTeamsToCheck:
          MAX_TEAMS_TO_CHECK,

        candidateCount:
          candidates.length,

        randomIndex,

        selectedFixture:
          summarizeFixture(
            fixture
          ),

        candidateSample:
          candidates
            .slice(0, 30)
            .map(
              summarizeFixture
            ),

        endpointStatus: {
          detail: {
            ok:
              detailResult.ok,

            data:
              detailResult.ok
                ? detail
                : null,

            error:
              detailResult.error,

            status:
              detailResult.status,

            attempts:
              detailResult.attempts,
          },

          lineups: {
            ok: false,

            data: null,

            error:
              "이번 단계에서는 호출하지 않음",
          },

          statistics: {
            ok: false,

            data: null,

            error:
              "이번 단계에서는 호출하지 않음",
          },

          h2h: {
            ok: false,

            data: null,

            error:
              "이번 단계에서는 호출하지 않음",
          },
        },

        search:
          discovered.debug,

        teamDebug,
      },
    });
  } catch (
    e: any
  ) {
    return Response.json(
      {
        ok: false,

        mode:
          "random",

        matched:
          false,

        error:
          e?.message ||
          "random fixture lookup failed",
      },
      {
        status: 502,
      }
    );
  }
}
