const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

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
    j = { raw: text };
  }

  if (!r.ok) {
    throw new Error(
      j?.error?.message ||
        j?.message ||
        `SportsAPI ${r.status}`
    );
  }

  return j?.data ?? j;
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
    try {
      const raw = await api(
        `/search?q=${encodeURIComponent(query)}`,
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
    } catch (e: any) {
      debug.push({
        query,

        error:
          e?.message ||
          "검색 실패",
      });
    }
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
  try {
    const raw = await api(
      `/teams/${teamId}/fixtures?type=upcoming&page=0`,
      key
    );

    return arr(raw);
  } catch {
    return [];
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

    let detail: any = null;

    const detailResult:
      AnyObj = {
        ok: false,

        data: null,

        error: null,
      };

    try {
      detail =
        await api(
          `/fixtures/${fixtureId}`,
          key
        );

      detailResult.ok = true;
      detailResult.data =
        detail;
    } catch (e: any) {
      detailResult.error =
        e?.message ||
        "detail 조회 실패";
    }

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
          "경기 탐색 성공. 현재 단계에서는 detail endpoint만 호출했습니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          selectedTeams.length,

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
          detail:
            detailResult,

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
