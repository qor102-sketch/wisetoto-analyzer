const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

async function api(path: string, key: string) {
  try {
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
      j = { raw: text };
    }

    if (!r.ok) {
      return {
        ok: false,
        data: null,
        error:
          j?.error?.message ||
          j?.message ||
          `SportsAPI ${r.status}`,
      };
    }

    return {
      ok: true,
      data: j?.data ?? j,
      error: null,
    };
  } catch (e: any) {
    return {
      ok: false,
      data: null,
      error:
        e?.message ||
        "SportsAPI 요청 실패",
    };
  }
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

  const startTime = fixture?.startTime;

  if (!startTime) {
    return false;
  }

  const timestamp = new Date(
    startTime
  ).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

function summarizeFixture(fixture: AnyObj) {
  return {
    id: fixture?.id ?? null,
    startTime: fixture?.startTime ?? null,
    status: fixture?.status ?? null,

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

function uniqueTeams(teams: AnyObj[]) {
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

async function discoverTeams(key: string) {
  const queries = [
    "baseball",
    "football",
    "basketball",
    "volleyball",
    "soccer",
    "MLB",
    "NBA",
    "NFL",
    "NHL",
  ];

  const teams: AnyObj[] = [];
  const debug: AnyObj[] = [];

  for (const query of queries) {
    const result = await api(
      `/search?q=${encodeURIComponent(query)}`,
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
      });

      continue;
    }

    const raw = result.data;
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
            (team: AnyObj) => ({
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
  const pages = [0, 1];

  for (const page of pages) {
    const result =
      await api(
        `/teams/${teamId}/fixtures?type=upcoming&page=${page}`,
        key
      );

    if (!result.ok) {
      continue;
    }

    const fixtures =
      arr(result.data);

    if (fixtures.length > 0) {
      return fixtures;
    }
  }

  return [];
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

    for (
      const team of selectedTeams
    ) {
      const teamId =
        Number(team?.id);

      if (
        !Number.isFinite(teamId)
      ) {
        continue;
      }

      const fixtures =
        await getUpcoming(
          teamId,
          key
        );

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
      });
    }

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
     * SportsAPI detail endpoint는
     * /fixture/:id 를 사용합니다.
     *
     * 기존의 /fixtures/:id 가 아니라
     * 단수형 /fixture/:id 로 호출합니다.
     */
    const detailResult =
      await api(
        `/fixture/${fixtureId}`,
        key
      );

    const detail:
      AnyObj | null =
      detailResult.ok
        ? detailResult.data ?? null
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
