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
      j?.error?.message || `SportsAPI ${r.status}`
    );
  }

  return j?.data ?? j;
}

/*
 * 경기 시작 전인지 확인
 */
function isNotStarted(f: AnyObj) {
  const status = f?.status;

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

/*
 * 이미 시작된 경기 방지
 *
 * status가 명확하지 않으면 안전하게 제외
 */
function isFutureFixture(f: AnyObj) {
  if (!isNotStarted(f)) return false;

  const start = f?.startTime;

  if (!start) return false;

  const time =
    new Date(start).getTime();

  if (!Number.isFinite(time)) {
    return false;
  }

  return time > Date.now();
}

/*
 * Fixture 요약
 */
function summarize(f: AnyObj) {
  return {
    id: f?.id ?? null,

    startTime:
      f?.startTime ?? null,

    status:
      f?.status ?? null,

    home:
      f?.home?.name ?? null,

    homeId:
      f?.home?.id ?? null,

    away:
      f?.away?.name ?? null,

    awayId:
      f?.away?.id ?? null,
  };
}

/*
 * 검색 결과에서 팀만 추출
 */
function extractTeams(raw: any) {
  return arr(raw).filter(
    (x: AnyObj) =>
      x?.type === "team"
  );
}

/*
 * 중복 팀 제거
 */
function uniqueTeams(
  teams: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

  for (const team of teams) {
    const id =
      Number(team?.id);

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(id, team);
    }
  }

  return [...map.values()];
}

/*
 * 여러 일반 검색어를 사용해서
 * SportsAPI의 팀 후보를 확보한다.
 *
 * 특정 팀 이름은 사용하지 않는다.
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

  const teams: AnyObj[] = [];

  const debug: AnyObj[] = [];

  for (const q of queries) {
    try {
      const raw =
        await api(
          `/search?q=${encodeURIComponent(q)}`,
          key
        );

      const found =
        extractTeams(raw);

      debug.push({
        query: q,
        resultCount:
          arr(raw).length,
        teamCount:
          found.length,
      });

      teams.push(...found);
    } catch (e: any) {
      debug.push({
        query: q,
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

/*
 * 특정 팀의 upcoming 경기 조회
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
 * Fixture ID 중복 제거
 */
function uniqueFixtures(
  fixtures: AnyObj[]
) {
  const map =
    new Map<number, AnyObj>();

  for (const f of fixtures) {
    const id =
      Number(f?.id);

    if (
      Number.isFinite(id) &&
      !map.has(id)
    ) {
      map.set(id, f);
    }
  }

  return [...map.values()];
}

/*
 * 최근 날짜순이 아니라
 * 실제 경기 시작시간 기준 정렬
 */
function sortByStartTime(
  fixtures: AnyObj[]
) {
  return fixtures.sort(
    (a, b) =>
      new Date(
        a.startTime
      ).getTime() -
      new Date(
        b.startTime
      ).getTime()
  );
}

/*
 * GET
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
      { status: 503 }
    );
  }

  const url =
    new URL(req.url);

  const mode =
    url.searchParams.get(
      "mode"
    ) || "";

  /*
   * 이번 단계는 RANDOM 테스트만 처리
   */
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
    /*
     * --------------------------------
     * 1. 팀 후보 확보
     * --------------------------------
     */
    const discovered =
      await discoverTeams(
        key
      );

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

    /*
     * --------------------------------
     * 2. 너무 많은 API 호출을
     * 방지하기 위해 팀을 섞고
     * 제한된 수만 검사한다.
     * --------------------------------
     */
    const shuffledTeams =
      [...teams]
        .sort(
          () => Math.random() - 0.5
        );

    /*
     * 한 번의 테스트에서
     * 최대 30팀만 검사
     */
    const selectedTeams =
      shuffledTeams.slice(
        0,
        30
      );

    const allFixtures: AnyObj[] =
      [];

    const teamDebug: AnyObj[] =
      [];

    /*
     * --------------------------------
     * 3. 각 팀의 upcoming 조회
     * --------------------------------
     */
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

      const future =
        fixtures.filter(
          isFutureFixture
        );

      if (future.length) {
        allFixtures.push(
          ...future
        );
      }

      teamDebug.push({
        team: {
          id: team?.id,
          name: team?.name,
          sport: team?.sport,
        },

        upcomingCount:
          fixtures.length,

        futureCount:
          future.length,

        futureSample:
          future
            .slice(0, 5)
            .map(summarize),
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
     * 5. 후보 없음
     * --------------------------------
     */
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

          candidates: 0,

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
     * 7. 선택된 Fixture 상세
     * --------------------------------
     */
    const [
      detail,
      lineups,
      statistics,
      h2h,
    ] = await Promise.all([
      api(
        `/fixtures/${fixtureId}`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${fixtureId}/lineups`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${fixtureId}/statistics`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${fixtureId}/h2h`,
        key
      ).catch(
        () => null
      ),
    ]);

    /*
     * --------------------------------
     * 8. 성공
     * --------------------------------
     */
    return Response.json({
      ok: true,

      mode: "random",

      matched: true,

      fixtureId,

      selectedFixture:
        summarize(
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
            .map(summarize),

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

        error:
          e?.message ||
          "random fixture lookup failed",
      },
      { status: 502 }
    );
  }
}
