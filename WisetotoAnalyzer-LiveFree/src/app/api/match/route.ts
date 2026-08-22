const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

/**
 * SportsAPI 공통 호출 함수
 *
 * - 429 Rate Limit 정보를 그대로 전달
 * - JSON이 아니어도 안전하게 처리
 */
async function api(path: string, key: string) {
  const r = await fetch(BASE + path, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  const text = await r.text();

  let j: any;

  try {
    j = JSON.parse(text);
  } catch {
    j = {
      raw: text,
    };
  }

  if (!r.ok) {
    const error = new Error(
      j?.error?.message ||
        j?.message ||
        `SportsAPI ${r.status}`
    );

    (error as any).status = r.status;

    throw error;
  }

  return j?.data ?? j;
}

/**
 * 429 발생 시 잠시 기다린 후 재시도
 *
 * 현재는 최대 2회 재시도.
 */
async function apiWithRetry(
  path: string,
  key: string,
  retries = 2
) {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await api(path, key);
    } catch (e: any) {
      lastError = e;

      const status = Number(e?.status);

      if (status !== 429) {
        throw e;
      }

      if (attempt >= retries) {
        throw e;
      }

      const delay =
        800 * Math.pow(2, attempt);

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw lastError;
}

/**
 * 요청 사이에 짧은 간격을 둬서
 * API Rate Limit에 걸릴 가능성을 낮춘다.
 */
async function sleep(ms: number) {
  await new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function isNotStarted(fixture: AnyObj) {
  const status = fixture?.status;

  if (!status) return false;

  const type = String(
    status?.type || ""
  ).toLowerCase();

  const description = String(
    status?.description || ""
  ).toLowerCase();

  const code = Number(
    status?.code
  );

  return (
    type === "notstarted" ||
    type === "scheduled" ||
    type === "pending" ||
    description.includes("not started") ||
    description.includes("scheduled") ||
    code === 0
  );
}

function isFutureFixture(fixture: AnyObj) {
  if (!isNotStarted(fixture)) {
    return false;
  }

  const startTime =
    fixture?.startTime;

  if (!startTime) {
    return false;
  }

  const timestamp =
    new Date(startTime).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

function summarizeFixture(
  fixture: AnyObj
) {
  return {
    id:
      fixture?.id ?? null,

    startTime:
      fixture?.startTime ?? null,

    status:
      fixture?.status ?? null,

    home:
      fixture?.home?.name ?? null,

    homeId:
      fixture?.home?.id ?? null,

    away:
      fixture?.away?.name ?? null,

    awayId:
      fixture?.away?.id ?? null,

    sport:
      fixture?.sport ?? null,

    league:
      fixture?.league?.name ?? null,
  };
}

function extractTeams(raw: any) {
  return arr(raw).filter(
    (item: AnyObj) =>
      item?.type === "team"
  );
}

function uniqueTeams(
  teams: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

  for (const team of teams) {
    const id = Number(
      team?.id
    );

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(id, team);
    }
  }

  return [...map.values()];
}

/**
 * 검색 결과에서 실제 경기 일정이 있는
 * 팀을 찾는다.
 *
 * 검색어를 너무 많이 사용하면 API 호출량이
 * 증가하므로 현재처럼 최소한의 검색어만 유지한다.
 */
async function discoverTeams(
  key: string
) {
  const queries = [
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

  const teams: AnyObj[] = [];
  const debug: AnyObj[] = [];

  for (
    let i = 0;
    i < queries.length;
    i++
  ) {
    const query = queries[i];

    try {
      const raw =
        await apiWithRetry(
          `/search?q=${encodeURIComponent(
            query
          )}`,
          key
        );

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
                  team?.id ?? null,

                name:
                  team?.name ?? null,

                sport:
                  team?.sport ?? null,
              })
            ),
      });

      teams.push(...found);

      /**
       * 검색 API도 너무 빠르게 연속 호출하지 않는다.
       */
      await sleep(250);
    } catch (e: any) {
      debug.push({
        query,

        error:
          e?.message ||
          "검색 실패",

        status:
          e?.status ?? null,
      });

      /**
       * 429라면 다음 검색까지 조금 더 기다린다.
       */
      if (
        Number(e?.status) === 429
      ) {
        await sleep(1500);
      }
    }
  }

  return {
    teams:
      uniqueTeams(teams),

    debug,
  };
}

/**
 * 팀의 upcoming fixture 조회
 *
 * 핵심 변경:
 *
 * 기존:
 *   page=0
 *   page=1
 *
 * 무조건 두 번 호출
 *
 * 변경:
 *   page=0만 먼저 호출
 *
 * 첫 페이지에서 경기가 있으면 즉시 반환.
 *
 * 이렇게 해야 20팀 × 2페이지로 인한
 * 불필요한 429를 크게 줄일 수 있다.
 */
async function getUpcoming(
  teamId: number,
  key: string
) {
  const debug: AnyObj[] = [];

  try {
    const raw =
      await apiWithRetry(
        `/teams/${teamId}/fixtures?type=upcoming&page=0`,
        key
      );

    const fixtures =
      arr(raw);

    debug.push({
      page: 0,
      ok: true,
      count: fixtures.length,
    });

    /**
     * 첫 페이지에 결과가 있으면
     * 여기서 바로 종료.
     */
    if (fixtures.length > 0) {
      return {
        fixtures,
        debug,
      };
    }

    /**
     * 첫 페이지가 비어있는 경우에만
     * page=1을 한 번 시도한다.
     *
     * 단, API 호출량을 줄이기 위해
     * 잠시 기다린 후 호출한다.
     */
    await sleep(700);

    try {
      const rawPage1 =
        await apiWithRetry(
          `/teams/${teamId}/fixtures?type=upcoming&page=1`,
          key,
          1
        );

      const page1Fixtures =
        arr(rawPage1);

      debug.push({
        page: 1,
        ok: true,
        count:
          page1Fixtures.length,
      });

      return {
        fixtures:
          page1Fixtures,

        debug,
      };
    } catch (e: any) {
      debug.push({
        page: 1,
        ok: false,
        count: 0,
        error:
          e?.message ||
          "page=1 조회 실패",
        status:
          e?.status ?? null,
      });

      return {
        fixtures: [],
        debug,
      };
    }
  } catch (e: any) {
    debug.push({
      page: 0,
      ok: false,
      count: 0,
      error:
        e?.message ||
        "upcoming 조회 실패",
      status:
        e?.status ?? null,
    });

    return {
      fixtures: [],
      debug,
    };
  }
}

function uniqueFixtures(
  fixtures: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

  for (const fixture of fixtures) {
    const id = Number(
      fixture?.id
    );

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(id, fixture);
    }
  }

  return [...map.values()];
}

function sortByStartTime(
  fixtures: AnyObj[]
) {
  return fixtures.sort(
    (a, b) => {
      return (
        new Date(
          a?.startTime
        ).getTime() -
        new Date(
          b?.startTime
        ).getTime()
      );
    }
  );
}

/**
 * Fixture 상세 조회
 *
 * 현재 SportsAPI에서
 * /fixtures/:id 가 404를 반환하고 있으므로
 * detail 조회 실패 때문에 전체 경기를 실패시키지 않는다.
 *
 * 현재 로그:
 *
 *   /fixtures/201552
 *   -> Not Found
 *
 * 따라서 실패하면:
 *
 *   {
 *     ok: false,
 *     data: null,
 *     error: "Not Found"
 *   }
 *
 * 형태로 반환한다.
 */
async function getFixtureDetail(
  fixtureId: number,
  key: string
) {
  try {
    const data =
      await apiWithRetry(
        `/fixtures/${fixtureId}`,
        key,
        1
      );

    return {
      ok: true,
      data: data ?? null,
      error: null,
    };
  } catch (e: any) {
    return {
      ok: false,
      data: null,
      error:
        e?.message ||
        "detail 조회 실패",
      status:
        e?.status ?? null,
    };
  }
}

export async function GET(
  req: Request
) {
  const key =
    process.env.SPORTSAPI_KEY;

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

  if (mode !== "random") {
    return Response.json({
      ok: false,

      error:
        "현재 테스트 모드는 mode=random 입니다.",

      usage:
        "/api/match?mode=random",
    });
  }

  try {
    /**
     * ------------------------------------------------
     * 1. 팀 검색
     * ------------------------------------------------
     */
    const discovered =
      await discoverTeams(key);

    const teams =
      discovered.teams;

    if (!teams.length) {
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

    /**
     * ------------------------------------------------
     * 2. 랜덤 팀 선택
     * ------------------------------------------------
     *
     * 기존 20팀 유지.
     *
     * 단, fixture 조회 사이에 딜레이를 넣어
     * 429 가능성을 낮춘다.
     */
    const shuffledTeams =
      [...teams].sort(
        () =>
          Math.random() - 0.5
      );

    const selectedTeams =
      shuffledTeams.slice(
        0,
        20
      );

    const allFixtures:
      AnyObj[] = [];

    const teamDebug:
      AnyObj[] = [];

    /**
     * ------------------------------------------------
     * 3. 팀별 upcoming 조회
     * ------------------------------------------------
     */
    for (
      let i = 0;
      i < selectedTeams.length;
      i++
    ) {
      const team =
        selectedTeams[i];

      const teamId =
        Number(team?.id);

      if (
        !Number.isFinite(teamId)
      ) {
        continue;
      }

      /**
       * 첫 번째 팀 이후에는 요청 사이에
       * 짧은 간격을 둔다.
       */
      if (i > 0) {
        await sleep(400);
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
            team?.id ?? null,

          name:
            team?.name ?? null,

          sport:
            team?.sport ?? null,
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
    }

    /**
     * ------------------------------------------------
     * 4. Fixture 후보 정리
     * ------------------------------------------------
     */
    const candidates =
      sortByStartTime(
        uniqueFixtures(
          allFixtures
        )
      );

    if (!candidates.length) {
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

          search:
            discovered.debug,

          teamDebug,
        },
      });
    }

    /**
     * ------------------------------------------------
     * 5. 랜덤 Fixture 선택
     * ------------------------------------------------
     */
    const randomIndex =
      Math.floor(
        Math.random() *
          candidates.length
      );

    const fixture =
      candidates[randomIndex];

    const fixtureId =
      Number(fixture?.id);

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

    /**
     * ------------------------------------------------
     * 6. 기본 fixture 정보
     * ------------------------------------------------
     */
    const selectedFixture =
      summarizeFixture(
        fixture
      );

    /**
     * ------------------------------------------------
     * 7. 상세 조회
     * ------------------------------------------------
     *
     * 중요:
     *
     * detail 조회가 404여도
     * 경기 자체는 성공으로 반환한다.
     */
    const detailResult =
      await getFixtureDetail(
        fixtureId,
        key
      );

    const detail =
      detailResult.ok
        ? detailResult.data
        : null;

    /**
     * ------------------------------------------------
     * 8. 최종 응답
     * ------------------------------------------------
     */
    return Response.json({
      ok: true,

      mode: "random",

      matched: true,

      fixtureId,

      selectedFixture,

      fixture,

      detail,

      lineups: null,

      statistics: null,

      h2h: null,

      debug: {
        message:
          "경기 탐색 성공. 상세 데이터는 API 상태에 따라 제공됩니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          selectedTeams.length,

        candidateCount:
          candidates.length,

        randomIndex,

        selectedFixture,

        candidateSample:
          candidates
            .slice(0, 30)
            .map(
              summarizeFixture
            ),

        endpointStatus: {
          detail:
            detailResult.ok
              ? {
                  ok: true,

                  data:
                    detail,

                  error: null,
                }
              : {
                  ok: false,

                  data: null,

                  error:
                    detailResult.error ??
                    "detail 조회 실패",

                  status:
                    detailResult.status ??
                    null,
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
  } catch (e: any) {
    return Response.json(
      {
        ok: false,

        mode: "random",

        matched: false,

        error:
          e?.message ||
          "random fixture lookup failed",

        status:
          e?.status ?? null,
      },
      {
        status: 502,
      }
    );
  }
}
