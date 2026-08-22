const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

const MAX_SEARCH_REQUESTS = 4;
const MAX_TEAM_REQUESTS = 4;
const REQUEST_INTERVAL_MS = 6500;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 서버 프로세스 내부에서 API 요청 간격을 강제로 둡니다.
 *
 * 무료 플랜이 10 req/min이므로
 * 약 6.5초 간격으로 요청합니다.
 */
let lastRequestAt = 0;

async function waitForRateLimitSlot() {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < REQUEST_INTERVAL_MS) {
    await sleep(REQUEST_INTERVAL_MS - elapsed);
  }

  lastRequestAt = Date.now();
}

/**
 * Retry-After 헤더를 안전하게 읽습니다.
 */
function getRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");

  if (!retryAfter) {
    return 60000;
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds)) {
    return Math.max(seconds * 1000, 1000);
  }

  const date = Date.parse(retryAfter);

  if (Number.isFinite(date)) {
    return Math.max(date - Date.now(), 1000);
  }

  return 60000;
}

/**
 * SportsAPI 요청
 *
 * 중요:
 * - 429를 여러 번 연속 재시도하지 않습니다.
 * - Retry-After를 존중합니다.
 * - page=1 같은 불필요한 재호출을 하지 않습니다.
 */
async function api(path: string, key: string) {
  await waitForRateLimitSlot();

  const r = await fetch(BASE + path, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
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

  if (r.status === 429) {
    const retryAfterMs = getRetryAfterMs(r);

    const error = new Error(
      j?.error?.message ||
        j?.message ||
        "SportsAPI rate limit exceeded"
    ) as Error & {
      status?: number;
      retryAfterMs?: number;
    };

    error.status = 429;
    error.retryAfterMs = retryAfterMs;

    throw error;
  }

  if (!r.ok) {
    const error = new Error(
      j?.error?.message ||
        j?.message ||
        `SportsAPI ${r.status}`
    ) as Error & {
      status?: number;
    };

    error.status = r.status;

    throw error;
  }

  return {
    data: j?.data ?? j,
    meta: j?.meta ?? null,
    headers: {
      limit:
        r.headers.get("ratelimit-limit"),

      remaining:
        r.headers.get("ratelimit-remaining"),

      reset:
        r.headers.get("ratelimit-reset"),
    },
  };
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

/**
 * 검색 요청 수를 크게 줄였습니다.
 *
 * 기존:
 * baseball
 * football
 * basketball
 * volleyball
 * soccer
 * MLB
 * NBA
 * NFL
 * NHL
 *
 * = 9회
 *
 * 변경:
 * football
 * basketball
 * baseball
 * tennis
 *
 * = 4회
 *
 * 검색 결과 자체가 여러 팀을 반환하므로
 * 이 정도로도 후보를 충분히 확보할 수 있습니다.
 */
async function discoverTeams(
  key: string
) {
  const queries = [
    "football",
    "basketball",
    "baseball",
    "tennis",
  ];

  const teams: AnyObj[] = [];
  const debug: AnyObj[] = [];

  for (
    const query of queries.slice(
      0,
      MAX_SEARCH_REQUESTS
    )
  ) {
    try {
      const result =
        await api(
          `/search?q=${encodeURIComponent(
            query
          )}`,
          key
        );

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
              (team: AnyObj) => ({
                id:
                  team?.id ?? null,

                name:
                  team?.name ?? null,

                sport:
                  team?.sport ?? null,
              })
            ),

        rateLimit:
          result.headers,
      });

      teams.push(...found);
    } catch (e: any) {
      debug.push({
        query,

        error:
          e?.message ||
          "검색 실패",

        status:
          e?.status ?? null,

        retryAfterMs:
          e?.retryAfterMs ?? null,
      });

      /**
       * 검색에서 429가 발생하면
       * 더 이상 검색을 계속하지 않습니다.
       *
       * 계속 호출하면 429만 누적됩니다.
       */
      if (e?.status === 429) {
        break;
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
 * 팀의 upcoming fixture를 딱 한 번만 가져옵니다.
 *
 * 기존:
 * page 0
 * page 1
 *
 * 변경:
 * page 0 한 번만
 *
 * 현재 API가 30개를 반환하므로
 * random fixture 테스트에는 충분합니다.
 */
async function getUpcoming(
  teamId: number,
  key: string
) {
  const debug: AnyObj[] = [];

  try {
    const result =
      await api(
        `/teams/${teamId}/fixtures?type=upcoming&page=0`,
        key
      );

    const fixtures =
      arr(result.data);

    debug.push({
      page: 0,

      ok: true,

      count:
        fixtures.length,

      rateLimit:
        result.headers,
    });

    return {
      fixtures,

      debug,
    };
  } catch (e: any) {
    debug.push({
      page: 0,

      ok: false,

      count: 0,

      error:
        e?.message ||
        "fixture 조회 실패",

      status:
        e?.status ?? null,

      retryAfterMs:
        e?.retryAfterMs ?? null,
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
    const id =
      Number(fixture?.id);

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
 * 후보 팀을 섞되,
 * 스포츠가 한 종목에 몰리지 않도록
 * 가능하면 서로 다른 스포츠를 우선합니다.
 */
function selectTeams(
  teams: AnyObj[],
  count: number
) {
  const shuffled =
    [...teams].sort(
      () =>
        Math.random() - 0.5
    );

  const selected: AnyObj[] = [];
  const usedSports =
    new Set<string>();

  /**
   * 1차:
   * 서로 다른 sport 우선
   */
  for (const team of shuffled) {
    if (selected.length >= count) {
      break;
    }

    const sport =
      String(
        team?.sport || ""
      ).toLowerCase();

    if (
      sport &&
      !usedSports.has(sport)
    ) {
      selected.push(team);
      usedSports.add(sport);
    }
  }

  /**
   * 2차:
   * 부족하면 아무 팀 추가
   */
  for (const team of shuffled) {
    if (selected.length >= count) {
      break;
    }

    if (
      selected.some(
        (x) =>
          Number(x?.id) ===
          Number(team?.id)
      )
    ) {
      continue;
    }

    selected.push(team);
  }

  return selected;
}

/**
 * Fixture detail
 *
 * 공식 문서상 endpoint:
 * /v2/fixtures/{id}
 */
async function getFixtureDetail(
  fixtureId: number,
  key: string
) {
  try {
    const result =
      await api(
        `/fixtures/${fixtureId}`,
        key
      );

    return {
      ok: true,

      data:
        result.data,

      error: null,

      status: null,

      rateLimit:
        result.headers,
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

      retryAfterMs:
        e?.retryAfterMs ?? null,

      rateLimit: null,
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
     *
     * 최대 4 requests
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
     * 2. 팀 선택
     * ------------------------------------------------
     *
     * 최대 4팀만 검사합니다.
     *
     * 4 search
     * + 4 team fixture
     * + 1 detail
     *
     * = 최대 9 requests
     *
     * 무료 플랜 10 req/min보다
     * 한 단계 여유를 둡니다.
     */
    const selectedTeams =
      selectTeams(
        teams,
        Math.min(
          MAX_TEAM_REQUESTS,
          teams.length
        )
      );

    const allFixtures:
      AnyObj[] = [];

    const teamDebug:
      AnyObj[] = [];

    /**
     * ------------------------------------------------
     * 3. upcoming fixture 조회
     * ------------------------------------------------
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

      const result =
        await getUpcoming(
          teamId,
          key
        );

      const fixtures =
        result.fixtures;

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
          result.debug,
      });
    }

    /**
     * ------------------------------------------------
     * 4. 후보 fixture 정리
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

          teamDebug,

          search:
            discovered.debug,
        },
      });
    }

    /**
     * ------------------------------------------------
     * 5. 랜덤 fixture 선택
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
      !Number.isFinite(fixtureId)
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
     * 6. Detail 조회
     * ------------------------------------------------
     *
     * 여기까지 성공했다면
     *
     * search <= 4
     * team <= 4
     *
     * 최대 8 requests이므로
     * detail을 9번째 요청으로 사용할 수 있습니다.
     */
    const detailResult =
      await getFixtureDetail(
        fixtureId,
        key
      );

    /**
     * ------------------------------------------------
     * 7. 최종 응답
     * ------------------------------------------------
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
        detailResult.ok
          ? detailResult.data
          : null,

      lineups: null,

      statistics: null,

      h2h: null,

      debug: {
        message:
          detailResult.ok
            ? "경기 탐색 및 detail 조회 성공"
            : "경기 탐색 성공. detail 조회는 API 상태에 따라 실패할 수 있습니다.",

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

        status:
          e?.status ?? null,

        retryAfterMs:
          e?.retryAfterMs ?? null,
      },
      {
        status:
          e?.status === 429
            ? 429
            : 502,
      }
    );
  }
}
