const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;

  if (Array.isArray(x?.data)) {
    return x.data;
  }

  return [];
}

/*
 * -----------------------------------------
 * SportsAPI 공통 호출
 * -----------------------------------------
 */
async function api(
  path: string,
  key: string,
  retry = 2
) {
  let lastError: any = null;

  for (
    let attempt = 0;
    attempt <= retry;
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
        throw new Error(
          j?.error?.message ||
            j?.message ||
            `SportsAPI ${r.status}`
        );
      }

      return j?.data ?? j;
    } catch (e: any) {
      lastError = e;

      /*
       * 잠깐 기다렸다가 재시도
       */
      if (attempt < retry) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500 * (attempt + 1)
            )
        );
      }
    }
  }

  throw lastError;
}

/*
 * -----------------------------------------
 * 경기 시작 전인지 확인
 * -----------------------------------------
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
 * -----------------------------------------
 * 실제 현재 시각 이후 경기인지 확인
 * -----------------------------------------
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
 * -----------------------------------------
 * Fixture 요약
 * -----------------------------------------
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
 * -----------------------------------------
 * 팀 검색 결과에서 team만 추출
 * -----------------------------------------
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
 * -----------------------------------------
 * 팀 ID 중복 제거
 * -----------------------------------------
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
 * -----------------------------------------
 * 가상/특수 팀 판별
 *
 * 실제 프로팀을 우선적으로 검사하기 위한
 * 우선순위 계산
 * -----------------------------------------
 */
function teamPriority(
  team: AnyObj
) {
  const name =
    String(
      team?.name || ""
    ).toLowerCase();

  let score = 100;

  const badWords = [
    "selection",
    "academy",
    "cyber",
    "u12",
    "u13",
    "u14",
    "u15",
    "u16",
    "u17",
    "u18",
    "u19",
    "u20",
    "u21",
    "u23",
    "u24",
    "g-league",
    "g league",
    "nba football",
    "juvenil",
    "youth",
    "women",
    "women's",
    "reserve",
    "reserves",
  ];

  for (
    const word of badWords
  ) {
    if (
      name.includes(word)
    ) {
      score -= 50;
    }
  }

  /*
   * 이름이 너무 짧은 특수 검색 결과도
   * 우선순위를 낮춘다.
   */
  if (
    name.length < 3
  ) {
    score -= 20;
  }

  return score;
}

/*
 * -----------------------------------------
 * 여러 스포츠 검색
 * -----------------------------------------
 *
 * 특정 팀을 코드에 넣지 않는다.
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

  const allTeams:
    AnyObj[] = [];

  const searchDebug:
    AnyObj[] = [];

  for (
    const query of queries
  ) {
    try {
      const raw =
        await api(
          `/search?q=${encodeURIComponent(
            query
          )}`,
          key,
          1
        );

      const found =
        extractTeams(
          raw
        );

      searchDebug.push({
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

      allTeams.push(
        ...found
      );
    } catch (e: any) {
      searchDebug.push({
        query,

        error:
          e?.message ||
          "검색 실패",
      });
    }
  }

  const teams =
    uniqueTeams(
      allTeams
    ).sort(
      (
        a,
        b
      ) =>
        teamPriority(b) -
        teamPriority(a)
    );

  return {
    teams,

    debug:
      searchDebug,
  };
}

/*
 * -----------------------------------------
 * 특정 팀의 upcoming 경기 조회
 * -----------------------------------------
 */
async function getUpcoming(
  teamId: number,
  key: string
) {
  try {
    const raw =
      await api(
        `/teams/${teamId}/fixtures?type=upcoming&page=0`,
        key,
        2
      );

    return arr(raw);
  } catch {
    return [];
  }
}

/*
 * -----------------------------------------
 * Fixture 중복 제거
 * -----------------------------------------
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
 * -----------------------------------------
 * 경기 시간순 정렬
 * -----------------------------------------
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
 * -----------------------------------------
 * 팀 5개씩 병렬 조회
 *
 * 너무 많은 요청을 한꺼번에 보내지 않는다.
 * -----------------------------------------
 */
async function collectFixtures(
  teams: AnyObj[],
  key: string
) {
  const allFixtures:
    AnyObj[] = [];

  const teamDebug:
    AnyObj[] = [];

  const batchSize = 5;

  for (
    let i = 0;
    i < teams.length;
    i += batchSize
  ) {
    const batch =
      teams.slice(
        i,
        i + batchSize
      );

    const results =
      await Promise.all(
        batch.map(
          async (
            team
          ) => {
            const teamId =
              Number(
                team?.id
              );

            if (
              !Number.isFinite(
                teamId
              )
            ) {
              return {
                team,

                fixtures:
                  [],

                future:
                  [],
              };
            }

            const fixtures =
              await getUpcoming(
                teamId,
                key
              );

            const future =
              fixtures.filter(
                isFutureFixture
              );

            return {
              team,

              fixtures,

              future,
            };
          }
        )
      );

    for (
      const result of results
    ) {
      if (
        result.future.length
      ) {
        allFixtures.push(
          ...result.future
        );
      }

      teamDebug.push({
        team: {
          id:
            result.team?.id ??
            null,

          name:
            result.team?.name ??
            null,

          sport:
            result.team?.sport ??
            null,
        },

        upcomingCount:
          result.fixtures.length,

        futureCount:
          result.future.length,

        futureSample:
          result.future
            .slice(0, 5)
            .map(
              summarizeFixture
            ),
      });
    }

    /*
     * API에 잠깐 쉬는 시간을 준다.
     */
    if (
      i + batchSize <
      teams.length
    ) {
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            300
          )
      );
    }

    /*
     * 이미 충분한 경기 후보가 있으면
     * 불필요한 API 호출을 중단한다.
     *
     * 50경기 이상 확보하면
     * 그중 랜덤 선택이 가능하다.
     */
    if (
      uniqueFixtures(
        allFixtures
      ).length >= 50
    ) {
      break;
    }
  }

  return {
    fixtures:
      uniqueFixtures(
        allFixtures
      ),

    teamDebug,
  };
}

/*
 * -----------------------------------------
 * Fixture 상세 endpoint 안전 조회
 * -----------------------------------------
 */
async function safeApi(
  path: string,
  key: string
) {
  try {
    const data =
      await api(
        path,
        key,
        1
      );

    return {
      ok: true,

      data,

      error:
        null,
    };
  } catch (e: any) {
    return {
      ok: false,

      data:
        null,

      error:
        e?.message ||
        "API 조회 실패",
    };
  }
}

/*
 * -----------------------------------------
 * GET
 *
 * /api/match?mode=random
 * -----------------------------------------
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
     * =====================================
     * 1. 여러 스포츠에서 팀 후보 발견
     * =====================================
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
     * =====================================
     * 2. 후보 팀 순서를 섞는다.
     *
     * 우선순위가 높은 실제 팀들이 먼저
     * 오지만, 같은 팀만 반복하지 않도록
     * 일부 랜덤성을 준다.
     * =====================================
     */
    const prioritized =
      [...teams].sort(
        (
          a,
          b
        ) =>
          teamPriority(b) -
          teamPriority(a)
      );

    /*
     * 상위 후보를 랜덤하게 섞는다.
     */
    const topCount =
      Math.min(
        40,
        prioritized.length
      );

    const topTeams =
      prioritized.slice(
        0,
        topCount
      );

    const shuffledTeams =
      [...topTeams].sort(
        () =>
          Math.random() -
          0.5
      );

    /*
     * =====================================
     * 3. 실제 예정 경기 수집
     * =====================================
     */
    const collected =
      await collectFixtures(
        shuffledTeams,
        key
      );

    const candidates =
      sortByStartTime(
        uniqueFixtures(
          collected.fixtures
        )
      );

    /*
     * =====================================
     * 4. 경기 없음
     * =====================================
     */
    if (
      !candidates.length
    ) {
      return Response.json({
        ok: false,

        error:
          "현재 SportsAPI에서 앞으로 시작할 경기를 찾지 못했습니다.",

        debug: {
          discoveredTeamCount:
            teams.length,

          checkedTeamCount:
            shuffledTeams.length,

          candidateCount:
            0,

          search:
            discovered.debug,

          teamDebug:
            collected.teamDebug,
        },
      });
    }

    /*
     * =====================================
     * 5. 앞으로 있을 경기 중 랜덤 선택
     * =====================================
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
          "랜덤으로 선택한 경기의 Fixture ID가 올바르지 않습니다.",

        debug: {
          fixture:
            summarizeFixture(
              fixture
            ),
        },
      });
    }

    /*
     * =====================================
     * 6. 상세 데이터 수집
     * =====================================
     *
     * 각 API가 실패하더라도
     * 전체 경기는 정상 반환한다.
     */
    const [
      detailResult,
      lineupsResult,
      statisticsResult,
      h2hResult,
    ] =
      await Promise.all([
        safeApi(
          `/fixtures/${fixtureId}`,
          key
        ),

        safeApi(
          `/fixtures/${fixtureId}/lineups`,
          key
        ),

        safeApi(
          `/fixtures/${fixtureId}/statistics`,
          key
        ),

        safeApi(
          `/fixtures/${fixtureId}/h2h`,
          key
        ),
      ]);

    /*
     * =====================================
     * 7. 정상 반환
     * =====================================
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

      detail:
        detailResult.data,

      lineups:
        lineupsResult.data,

      statistics:
        statisticsResult.data,

      h2h:
        h2hResult.data,

      debug: {
        message:
          "SportsAPI에서 앞으로 시작할 경기들을 수집한 뒤 무작위로 1경기를 선택했습니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          shuffledTeams.length,

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

            error:
              detailResult.error,
          },

          lineups: {
            ok:
              lineupsResult.ok,

            error:
              lineupsResult.error,
          },

          statistics: {
            ok:
              statisticsResult.ok,

            error:
              statisticsResult.error,
          },

          h2h: {
            ok:
              h2hResult.ok,

            error:
              h2hResult.error,
          },
        },

        search:
          discovered.debug,

        teamDebug:
          collected.teamDebug,
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
