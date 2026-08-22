const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;

  if (Array.isArray(x?.data)) {
    return x.data;
  }

  return [];
}

async function api(
  path: string,
  key: string
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
    throw new Error(
      j?.error?.message ||
        j?.message ||
        `SportsAPI ${r.status}`
    );
  }

  return j?.data ?? j;
}

/*
 * 경기 상태가 아직 시작 전인지 확인
 */
function isNotStarted(
  fixture: AnyObj
) {
  const status =
    fixture?.status;

  if (!status) {
    return false;
  }

  const type =
    String(
      status?.type || ""
    ).toLowerCase();

  const description =
    String(
      status?.description || ""
    ).toLowerCase();

  const code =
    Number(
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

/*
 * 실제 현재 시각보다 미래인 경기인지 확인
 */
function isFutureFixture(
  fixture: AnyObj
) {
  if (
    !isNotStarted(
      fixture
    )
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

/*
 * Fixture 요약
 */
function summarizeFixture(
  fixture: AnyObj
) {
  return {
    id:
      fixture?.id ??
      null,

    startTime:
      fixture?.startTime ??
      null,

    status:
      fixture?.status ??
      null,

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
      fixture?.sport ??
      null,

    league:
      fixture?.league?.name ??
      null,
  };
}

/*
 * 검색 결과에서 팀만 추출
 */
function extractTeams(
  raw: any
) {
  return arr(raw).filter(
    (item: AnyObj) =>
      item?.type === "team"
  );
}

/*
 * 팀 ID 기준 중복 제거
 */
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
    const id =
      Number(
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

/*
 * SportsAPI 검색을 이용해서
 * 테스트 가능한 팀 후보를 찾는다.
 *
 * 특정 팀 이름은 넣지 않는다.
 */
async function discoverTeams(
  key: string
) {
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

  const teams: AnyObj[] =
    [];

  const debug: AnyObj[] =
    [];

  for (
    const query of queries
  ) {
    try {
      const raw =
        await api(
          `/search?q=${encodeURIComponent(
            query
          )}`,
          key
        );

      const found =
        extractTeams(
          raw
        );

      debug.push({
        query,

        resultCount:
          arr(raw).length,

        teamCount:
          found.length,
      });

      teams.push(
        ...found
      );
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
      uniqueTeams(
        teams
      ),

    debug,
  };
}

/*
 * 특정 팀의 예정 경기 조회
 */
async function getUpcoming(
  teamId: number,
  key: string
) {
  try {
    const raw =
      await api(
        `/teams/${teamId}/fixtures?type=upcoming&page=0`,
        key
      );

    return arr(raw);
  } catch {
    return [];
  }
}

/*
 * Fixture ID 기준 중복 제거
 */
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
    const id =
      Number(
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

/*
 * 경기 시작 시간 순으로 정렬
 */
function sortByStartTime(
  fixtures: AnyObj[]
) {
  return fixtures.sort(
    (
      a,
      b
    ) => {
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

/*
 * GET /api/match?mode=random
 */
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
    new URL(
      req.url
    );

  const mode =
    url.searchParams.get(
      "mode"
    ) || "";

  /*
   * 현재는 랜덤 테스트 모드만 사용
   */
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
     * --------------------------------
     * 1. 팀 후보 검색
     * --------------------------------
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
     * --------------------------------
     * 2. 팀 후보를 랜덤하게 섞는다.
     * --------------------------------
     */
    const shuffledTeams =
      [...teams].sort(
        () =>
          Math.random() -
          0.5
      );

    /*
     * API 호출량 제한을 고려하여
     * 최대 30개 팀만 검사
     */
    const selectedTeams =
      shuffledTeams.slice(
        0,
        30
      );

    const allFixtures:
      AnyObj[] = [];

    const teamDebug:
      AnyObj[] = [];

    /*
     * --------------------------------
     * 3. 각 팀의 upcoming 조회
     * --------------------------------
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
      });
    }

    /*
     * --------------------------------
     * 4. 중복 Fixture 제거
     * --------------------------------
     */
    const candidates =
      sortByStartTime(
        uniqueFixtures(
          allFixtures
        )
      );

    /*
     * --------------------------------
     * 5. 예정 경기가 없으면 종료
     * --------------------------------
     */
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

          candidateCount:
            0,

          teamDebug,
        },
      });
    }

    /*
     * --------------------------------
     * 6. 랜덤 경기 선택
     * --------------------------------
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
      fixture?.id;

    /*
     * --------------------------------
     * 7. 선택된 Fixture 상세 조회
     *
     * 각 API의 실제 오류를 숨기지 않는다.
     * --------------------------------
     */

    const detailResult =
      await api(
        `/fixtures/${fixtureId}`,
        key
      )
        .then(
          (data) => ({
            ok: true,

            data,

            error:
              null,
          })
        )
        .catch(
          (e: any) => ({
            ok: false,

            data: null,

            error:
              e?.message ||
              "detail 조회 실패",
          })
        );

    const detail =
      detailResult.data;

    const lineupsResult =
      await api(
        `/fixtures/${fixtureId}/lineups`,
        key
      )
        .then(
          (data) => ({
            ok: true,

            data,

            error:
              null,
          })
        )
        .catch(
          (e: any) => ({
            ok: false,

            data: null,

            error:
              e?.message ||
              "lineups 조회 실패",
          })
        );

    const lineups =
      lineupsResult.data;

    const statisticsResult =
      await api(
        `/fixtures/${fixtureId}/statistics`,
        key
      )
        .then(
          (data) => ({
            ok: true,

            data,

            error:
              null,
          })
        )
        .catch(
          (e: any) => ({
            ok: false,

            data: null,

            error:
              e?.message ||
              "statistics 조회 실패",
          })
        );

    const statistics =
      statisticsResult.data;

    const h2hResult =
      await api(
        `/fixtures/${fixtureId}/h2h`,
        key
      )
        .then(
          (data) => ({
            ok: true,

            data,

            error:
              null,
          })
        )
        .catch(
          (e: any) => ({
            ok: false,

            data: null,

            error:
              e?.message ||
              "h2h 조회 실패",
          })
        );

    const h2h =
      h2hResult.data;

    /*
     * --------------------------------
     * 8. 결과 반환
     * --------------------------------
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

      lineups,

      statistics,

      h2h,

      debug: {
        message:
          "경기 시작 전 Fixture 후보 중 무작위로 1경기를 선택했습니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          selectedTeams.length,

        candidateCount:
          candidates.length,

        randomIndex,

        candidateSample:
          candidates
            .slice(0, 20)
            .map(
              summarizeFixture
            ),

        /*
         * 각 endpoint가 성공했는지와
         * 실패했다면 실제 오류를 표시
         */
        endpointStatus: {
          detail:
            detailResult,

          lineups:
            lineupsResult,

          statistics:
            statisticsResult,

          h2h:
            h2hResult,
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
