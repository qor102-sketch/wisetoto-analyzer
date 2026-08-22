const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.fixtures)) return x.fixtures;
  if (Array.isArray(x?.events)) return x.events;
  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function api(
  path: string,
  key: string,
  retries = 2
) {
  let lastError =
    "SportsAPI 요청 실패";

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    try {
      const r = await fetch(
        BASE + path,
        {
          headers: {
            Authorization: `Bearer ${key}`,
          },
          cache: "no-store",
        }
      );

      const text =
        await r.text();

      let j: any;

      try {
        j = JSON.parse(text);
      } catch {
        j = {
          raw: text,
        };
      }

      if (!r.ok) {
        lastError =
          j?.error?.message ||
          j?.error ||
          j?.message ||
          `SportsAPI ${r.status}`;

        if (
          r.status === 429 &&
          attempt < retries
        ) {
          await sleep(
            1000 * (attempt + 1)
          );

          continue;
        }

        return {
          ok: false,
          data: null,
          error: lastError,
          status: r.status,
        };
      }

      return {
        ok: true,
        data:
          j?.data ?? j,
        error: null,
        status: r.status,
      };
    } catch (e: any) {
      lastError =
        e?.message ||
        "SportsAPI 요청 실패";

      if (attempt < retries) {
        await sleep(
          500 * (attempt + 1)
        );

        continue;
      }
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError,
    status: 0,
  };
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
    !Number.isFinite(timestamp)
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
      fixture?.status ??
      null,

    home:
      fixture?.home?.name ??
      fixture?.homeTeam?.name ??
      fixture?.home?.team?.name ??
      null,

    homeId:
      fixture?.home?.id ??
      fixture?.homeTeam?.id ??
      fixture?.home?.team?.id ??
      null,

    away:
      fixture?.away?.name ??
      fixture?.awayTeam?.name ??
      fixture?.away?.team?.name ??
      null,

    awayId:
      fixture?.away?.id ??
      fixture?.awayTeam?.id ??
      fixture?.away?.team?.id ??
      null,

    sport:
      fixture?.sport ??
      null,

    league:
      fixture?.league?.name ??
      fixture?.tournament?.name ??
      null,
  };
}

function extractTeams(
  raw: any
) {
  return arr(raw).filter(
    (item: AnyObj) =>
      item?.type === "team" ||
      item?.entityType === "team"
  );
}

function uniqueTeams(
  teams: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

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

  const teams: AnyObj[] =
    [];

  const debug: AnyObj[] =
    [];

  for (
    const query of queries
  ) {
    const result =
      await api(
        `/search?q=${encodeURIComponent(
          query
        )}`,
        key
      );

    if (!result.ok) {
      debug.push({
        query,

        resultCount: 0,

        teamCount: 0,

        sample: [],

        error:
          result.error ||
          "검색 실패",

        status:
          result.status ??
          null,
      });

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
     * SportsAPI rate limit을
     * 불필요하게 빠르게 소모하지 않도록
     * 검색 사이에 짧게 대기합니다.
     */
    await sleep(150);
  }

  return {
    teams:
      uniqueTeams(teams),

    debug,
  };
}

async function getUpcoming(
  teamId: number,
  key: string
) {
  const pages = [
    0,
    1,
  ];

  const debug: AnyObj[] =
    [];

  const allFixtures:
    AnyObj[] = [];

  for (
    const page of pages
  ) {
    const result =
      await api(
        `/teams/${teamId}/fixtures?type=upcoming&page=${page}`,
        key
      );

    if (!result.ok) {
      debug.push({
        page,

        ok: false,

        count: 0,

        error:
          result.error ??
          "upcoming 조회 실패",

        status:
          result.status ??
          null,
      });

      /*
       * Rate limit이면 다음 페이지를
       * 바로 호출하지 않습니다.
       */
      if (
        result.status === 429
      ) {
        await sleep(1200);
      }

      continue;
    }

    const fixtures =
      arr(result.data);

    debug.push({
      page,

      ok: true,

      count:
        fixtures.length,
    });

    if (
      fixtures.length
    ) {
      allFixtures.push(
        ...fixtures
      );
    }

    await sleep(150);
  }

  return {
    fixtures:
      uniqueFixtures(
        allFixtures
      ),

    debug,
  };
}

function uniqueFixtures(
  fixtures: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

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
     * 우선 실제 경기 데이터가 잘 나오는
     * 팀을 발견할 수 있도록 팀을 섞습니다.
     */
    const shuffledTeams =
      [...teams].sort(
        () =>
          Math.random() -
          0.5
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
       * 팀 하나 조회 후에도 너무 빠르게
       * 다음 팀을 요청하지 않도록 대기합니다.
       */
      await sleep(200);
    }

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

          search:
            discovered.debug,

          teamDebug,
        },
      });
    }

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

    const selectedFixture =
      summarizeFixture(
        fixture
      );

    const candidateSample =
      candidates
        .slice(0, 30)
        .map(
          summarizeFixture
        );

    /*
     * 중요:
     *
     * detail endpoint는
     *
     * /fixture/:id
     *
     * 를 사용합니다.
     *
     * 기존 /fixtures/:id가 아닙니다.
     */
    const detailResult =
      await api(
        `/fixture/${fixtureId}`,
        key
      );

    const detail:
      AnyObj | null =
      detailResult.ok
        ? detailResult.data ??
          null
        : null;

    return Response.json({
      ok: true,

      mode:
        "random",

      matched:
        true,

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

        candidateSample,

        endpointStatus: {
          detail:
            detailResult.ok
              ? {
                  ok: true,

                  data:
                    detail,

                  error:
                    null,
                }
              : {
                  ok: false,

                  data: null,

                  error:
                    detailResult.error ??
                    "detail 조회 실패",
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
