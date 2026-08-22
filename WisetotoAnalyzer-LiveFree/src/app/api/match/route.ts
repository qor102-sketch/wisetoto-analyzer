const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

const MAX_SEARCH_REQUESTS = 1;
const MAX_TEAM_REQUESTS = 2;
const UPCOMING_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * 무료 플랜 10 req/min을 기준으로
 * 기본 요청 간격을 약 6.5초로 유지합니다.
 */
const REQUEST_INTERVAL_MS = 6500;

/**
 * 429가 발생했을 때 최소한으로 기다릴 시간입니다.
 */
const MIN_429_WAIT_MS = 1000;

/**
 * API rate-limit reset 값은 API마다
 * seconds / timestamp / 문자열 등 형태가 다를 수 있으므로
 * 충분히 보수적으로 처리합니다.
 */
const DEFAULT_RESET_WAIT_MS = 60000;

/**
 * 프로세스 내부 요청 큐.
 *
 * 여러 GET 요청이 동시에 들어와도
 * 각 요청이 독립적으로 fetch를 실행하지 않고
 * 하나씩 순서대로 API를 호출하도록 합니다.
 *
 * 단, 서버리스 환경에서 인스턴스가 여러 개 생성되면
 * 인스턴스 간 공유는 되지 않습니다.
 */
let requestQueue: Promise<void> = Promise.resolve();

let lastRequestAt = 0;

/**
 * API 응답의 rate-limit 상태를
 * 프로세스 내부에서도 기억합니다.
 */
let rateLimitBlockedUntil = 0;

function arr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveNumber(value: any): number | null {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    return null;
  }

  return n;
}

/**
 * API가 내려주는 reset 값을 밀리초로 변환합니다.
 *
 * 일반적으로 SportsAPI 응답의 ratelimit-reset은
 * "몇 초 후 reset" 형태이므로 우선 seconds로 해석합니다.
 *
 * 비정상적으로 큰 값이 들어오는 경우에는
 * Unix timestamp(milliseconds/seconds)도 보정합니다.
 */
function parseResetMs(value: any): number | null {
  const n = toPositiveNumber(value);

  if (n === null) {
    return null;
  }

  /**
   * 일반적인 형태:
   * reset = 29
   * => 29초
   */
  if (n <= 3600) {
    return Math.max(n * 1000, MIN_429_WAIT_MS);
  }

  /**
   * Unix timestamp seconds
   */
  if (n < 10_000_000_000) {
    const timestampMs = n * 1000;
    const diff = timestampMs - Date.now();

    if (diff > 0) {
      return diff;
    }
  }

  /**
   * Unix timestamp milliseconds
   */
  if (n >= 10_000_000_000) {
    const diff = n - Date.now();

    if (diff > 0) {
      return diff;
    }
  }

  return null;
}

/**
 * Response header에서 rate-limit 정보를 읽습니다.
 */
function readRateLimitHeaders(response: Response) {
  return {
    limit:
      response.headers.get("ratelimit-limit"),

    remaining:
      response.headers.get("ratelimit-remaining"),

    reset:
      response.headers.get("ratelimit-reset"),
  };
}

/**
 * Retry-After 헤더를 안전하게 읽습니다.
 *
 * 지원:
 * - Retry-After: 10
 * - Retry-After: Wed, 21 Oct 2026 07:28:00 GMT
 */
function getRetryAfterMs(response: Response) {
  const retryAfter =
    response.headers.get("retry-after");

  if (!retryAfter) {
    return DEFAULT_RESET_WAIT_MS;
  }

  const seconds =
    Number(retryAfter);

  if (Number.isFinite(seconds)) {
    return Math.max(
      seconds * 1000,
      MIN_429_WAIT_MS
    );
  }

  const date =
    Date.parse(retryAfter);

  if (Number.isFinite(date)) {
    return Math.max(
      date - Date.now(),
      MIN_429_WAIT_MS
    );
  }

  return DEFAULT_RESET_WAIT_MS;
}

/**
 * API 응답의 remaining/reset을 기준으로
 * 다음 요청이 너무 빨리 나가지 않도록 합니다.
 *
 * remaining이 0이면 reset까지 기다립니다.
 */
async function waitForRateLimitSlot() {
  const now = Date.now();

  const queueWait =
    Math.max(
      0,
      lastRequestAt +
        REQUEST_INTERVAL_MS -
        now
    );

  const blockedWait =
    Math.max(
      0,
      rateLimitBlockedUntil -
        now
    );

  const waitMs =
    Math.max(
      queueWait,
      blockedWait
    );

  if (waitMs > 0) {
    await sleep(waitMs);
  }

  lastRequestAt = Date.now();
}

/**
 * API 호출을 직렬화합니다.
 *
 * 중요:
 * 기존 구현의 단순 global lastRequestAt만으로는
 * 동시에 GET 요청이 들어왔을 때
 *
 * request A -> wait
 * request B -> wait
 *
 * 이후 둘이 거의 동시에 fetch()
 *
 * 하는 상황이 발생할 수 있습니다.
 *
 * queue를 사용하면 이 문제를 막을 수 있습니다.
 */
async function enqueueRequest<T>(
  fn: () => Promise<T>
): Promise<T> {
  const previous =
    requestQueue;

  let release!: () => void;

  requestQueue =
    new Promise<void>(
      (resolve) => {
        release = resolve;
      }
    );

  await previous;

  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * SportsAPI 요청
 *
 * 429:
 * - 즉시 반복 호출하지 않음
 * - Retry-After 우선
 * - rate-limit reset도 반영
 * - 재시도하지 않음
 *
 * 따라서 한 번의 API 호출은
 * 최대 실제 HTTP 요청 1회입니다.
 */
async function api(
  path: string,
  key: string
) {
  return enqueueRequest(
    async () => {
      await waitForRateLimitSlot();

      const r =
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

      const headers =
        readRateLimitHeaders(r);

      /**
       * remaining이 숫자 0이면
       * reset 이후까지 다음 요청을 막습니다.
       */
      const remaining =
        toPositiveNumber(
          headers.remaining
        );

      const resetMs =
        parseResetMs(
          headers.reset
        );

      if (
        remaining === 0 &&
        resetMs !== null
      ) {
        rateLimitBlockedUntil =
          Math.max(
            rateLimitBlockedUntil,
            Date.now() +
              resetMs
          );
      }

      const text =
        await r.text();

      let j: any;

      try {
        j =
          JSON.parse(text);
      } catch {
        j = {
          raw: text,
        };
      }

      if (r.status === 429) {
        const retryAfterMs =
          getRetryAfterMs(r);

        const waitMs =
          Math.max(
            retryAfterMs,
            resetMs ?? 0,
            MIN_429_WAIT_MS
          );

        rateLimitBlockedUntil =
          Math.max(
            rateLimitBlockedUntil,
            Date.now() +
              waitMs
          );

        const error =
          new Error(
            j?.error?.message ||
              j?.message ||
              "SportsAPI rate limit exceeded"
          ) as Error & {
            status?: number;
            retryAfterMs?: number;
            rateLimit?: AnyObj;
          };

        error.status = 429;

        error.retryAfterMs =
          waitMs;

        error.rateLimit =
          headers;

        throw error;
      }

      if (!r.ok) {
        const error =
          new Error(
            j?.error?.message ||
              j?.message ||
              `SportsAPI ${r.status}`
          ) as Error & {
            status?: number;
            rateLimit?: AnyObj;
          };

        error.status =
          r.status;

        error.rateLimit =
          headers;

        throw error;
      }

      return {
        data:
          j?.data ?? j,

        meta:
          j?.meta ?? null,

        headers,
      };
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

function isFutureNotStartedFixture(
  fixture: AnyObj
) {
  if (!isNotStarted(fixture)) return false;

  const startTime = fixture?.startTime;
  if (!startTime) return false;

  const timestamp =
    new Date(startTime).getTime();

  return (
    Number.isFinite(timestamp) &&
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
      fixture?.startTime ?? null,

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
    new Map<number, AnyObj>();

  for (
    const team of teams
  ) {
    const id =
      Number(team?.id);

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

/**
 * 빠른 테스트 모드:
 * 검색 1회 + 팀 upcoming 최대 2회.
 * 후보 1개를 찾는 즉시 중단하고 detail은 이 route에서 호출하지 않습니다.
 *
 * 각 요청 사이에는 6.5초 이상 간격을 둡니다.
 */
async function discoverTeams(
  key: string
) {
  const queries = [
    "football",
    "basketball",
    "baseball",
    "volleyball",
  ];

  const shuffledQueries =
    [...queries].sort(
      () =>
        Math.random() - 0.5
    );

  const teams: AnyObj[] = [];
  const debug: AnyObj[] = [];

  for (
    const query of shuffledQueries.slice(
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

        rateLimit:
          result.headers,
      });

      teams.push(
        ...found
      );
    } catch (e: any) {
      debug.push({
        query,

        resultCount: 0,

        teamCount: 0,

        sample: [],

        error:
          e?.message ||
          "검색 실패",

        status:
          e?.status ??
          null,

        retryAfterMs:
          e?.retryAfterMs ??
          null,

        rateLimit:
          e?.rateLimit ??
          null,
      });

      /**
       * 429이면 검색을 더 진행하지 않습니다.
       */
      if (
        e?.status === 429
      ) {
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
 * 팀별 upcoming fixture는
 * page=0 딱 한 번만 조회합니다.
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
        e?.status ??
        null,

      retryAfterMs:
        e?.retryAfterMs ??
        null,

      rateLimit:
        e?.rateLimit ??
        null,
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

  for (
    const fixture of fixtures
  ) {
    const id =
      Number(fixture?.id);

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
  return [...fixtures].sort(
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

/**
 * 후보 팀을 랜덤하게 섞되
 * 가능한 경우 서로 다른 스포츠를 우선합니다.
 */
function selectTeams(
  teams: AnyObj[],
  count: number
) {
  const shuffled =
    [...teams].sort(
      () =>
        Math.random() -
        0.5
    );

  const selected: AnyObj[] = [];

  const usedSports =
    new Set<string>();

  /**
   * 1차:
   * 서로 다른 스포츠 우선
   */
  for (
    const team of shuffled
  ) {
    if (
      selected.length >=
      count
    ) {
      break;
    }

    const sport =
      String(
        team?.sport || ""
      ).toLowerCase();

    if (
      sport &&
      !usedSports.has(
        sport
      )
    ) {
      selected.push(
        team
      );

      usedSports.add(
        sport
      );
    }
  }

  /**
   * 2차:
   * 부족하면 남은 팀 추가
   */
  for (
    const team of shuffled
  ) {
    if (
      selected.length >=
      count
    ) {
      break;
    }

    const teamId =
      Number(team?.id);

    if (
      selected.some(
        (x) =>
          Number(x?.id) ===
          teamId
      )
    ) {
      continue;
    }

    selected.push(
      team
    );
  }

  return selected;
}

/**
 * Fixture detail.
 *
 * 선택된 fixture에 대해서만
 * 정확히 한 번 호출합니다.
 *
 * detail이 429여도
 * fixture 자체의 성공 결과는 유지합니다.
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

      retryAfterMs: null,

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
        e?.status ??
        null,

      retryAfterMs:
        e?.retryAfterMs ??
        null,

      rateLimit:
        e?.rateLimit ??
        null,
    };
  }
}



async function readJsonOrThrow(
  response: Response,
  label: string
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const text =
    await response.text();

  let data: any =
    null;

  if (
    contentType.includes(
      "application/json"
    ) ||
    text.trim().startsWith("{") ||
    text.trim().startsWith("[")
  ) {
    try {
      data =
        JSON.parse(text);
    } catch {
      const error =
        new Error(
          `${label} JSON 해석 실패 · HTTP ${response.status} · ${text.slice(
            0,
            200
          )}`
        ) as Error & {
          status?: number;
        };

      error.status =
        response.status;

      throw error;
    }
  } else {
    const preview =
      text
        .replace(/\s+/g, " ")
        .slice(0, 200);

    const error =
      new Error(
        `${label} 비JSON 응답 · HTTP ${response.status} · content-type=${contentType || "-"} · ${preview}`
      ) as Error & {
        status?: number;
      };

    error.status =
      response.status;

    throw error;
  }

  return data;
}

function normalizeMatchName(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\b(fc|cf|bc|bk|sc|club)\b/gi, "")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function similarity(a: any, b: any) {
  const x = normalizeMatchName(a);
  const y = normalizeMatchName(b);

  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;

  const grams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      set.add(s.slice(i, i + 2));
    }
    return set;
  };

  const aSet = grams(x);
  const bSet = grams(y);

  if (!aSet.size || !bSet.size) return 0;

  let common = 0;
  aSet.forEach((v) => {
    if (bSet.has(v)) common++;
  });

  return (2 * common) / (aSet.size + bSet.size);
}

function betmanGameTimeMs(game: AnyObj) {
  const raw =
    game?.gameDateMs ??
    game?.gameDate ??
    game?.startTime ??
    null;

  const n = Number(raw);

  if (Number.isFinite(n) && n > 10_000_000_000) {
    return n;
  }

  const parsed =
    new Date(raw).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : NaN;
}

function isBetmanWithin72Hours(game: AnyObj) {
  const start =
    betmanGameTimeMs(game);

  if (!Number.isFinite(start)) {
    return false;
  }

  const now = Date.now();
  const max =
    now + 72 * 60 * 60 * 1000;

  return (
    start > now &&
    start <= max
  );
}

async function findSportsFixtureForBetman(
  betmanGame: AnyObj,
  key: string
) {
  const home =
    String(
      betmanGame?.home ?? ""
    );

  const away =
    String(
      betmanGame?.away ?? ""
    );

  if (!home || !away) {
    return {
      fixture: null,
      debug: {
        error:
          "Betman 팀명이 없습니다.",
      },
    };
  }

  const searchQueries = [
    home,
    away,
  ];

  const checkedTeams: AnyObj[] = [];
  const debug: AnyObj[] = [];

  for (const query of searchQueries) {
    let searchResult: any;

    try {
      searchResult =
        await api(
          `/search?q=${encodeURIComponent(
            query
          )}`,
          key
        );
    } catch (e: any) {
      debug.push({
        query,
        stage: "search",
        error:
          e?.message ??
          "검색 실패",
      });

      continue;
    }

    const teams =
      extractTeams(
        searchResult.data
      ).slice(0, 3);

    debug.push({
      query,
      stage: "search",
      teamCount:
        teams.length,
      teams:
        teams.map((x) => ({
          id: x?.id ?? null,
          name:
            x?.name ?? null,
          sport:
            x?.sport ?? null,
        })),
    });

    for (const team of teams) {
      const teamId =
        Number(team?.id);

      if (
        !Number.isFinite(
          teamId
        )
      ) {
        continue;
      }

      if (
        checkedTeams.some(
          (x) =>
            Number(x?.id) ===
            teamId
        )
      ) {
        continue;
      }

      checkedTeams.push(team);

      const upcoming =
        await getUpcoming(
          teamId,
          key
        );

      const fixtures =
        upcoming.fixtures.filter(
          isFutureNotStartedFixture
        );

      let bestFixture: AnyObj | null =
        null;

      let bestScore =
        0;

      for (const fixture of fixtures) {
        const f =
          summarizeFixture(
            fixture
          );

        const direct =
          similarity(
            home,
            f.home
          ) *
            0.45 +
          similarity(
            away,
            f.away
          ) *
            0.45;

        const reverse =
          (
            similarity(
              home,
              f.away
            ) *
              0.45 +
            similarity(
              away,
              f.home
            ) *
              0.45
          ) *
          0.85;

        const fixtureTime =
          new Date(
            f.startTime
          ).getTime();

        const betmanTime =
          betmanGameTimeMs(
            betmanGame
          );

        const timeDiffHours =
          Number.isFinite(
            fixtureTime
          ) &&
          Number.isFinite(
            betmanTime
          )
            ? Math.abs(
                fixtureTime -
                  betmanTime
              ) /
              3_600_000
            : 999;

        const timeScore =
          timeDiffHours <= 2
            ? 0.1
            : timeDiffHours <= 12
              ? 0.06
              : timeDiffHours <= 24
                ? 0.02
                : 0;

        const score =
          Math.max(
            direct,
            reverse
          ) +
          timeScore;

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          bestFixture =
            fixture;
        }
      }

      debug.push({
        query,
        stage:
          "upcoming",
        teamId,
        fixtureCount:
          fixtures.length,
        bestScore,
        bestFixture:
          bestFixture
            ? summarizeFixture(
                bestFixture
              )
            : null,
      });

      if (
        bestFixture &&
        bestScore >= 0.62
      ) {
        return {
          fixture:
            bestFixture,
          debug: {
            matched: true,
            score:
              Number(
                bestScore.toFixed(
                  3
                )
              ),
            attempts:
              debug,
          },
        };
      }
    }
  }

  return {
    fixture: null,
    debug: {
      matched: false,
      attempts:
        debug,
    },
  };
}

async function runSelectedMode(
  req: Request,
  key: string
) {
  const url = new URL(req.url);
  const home = String(url.searchParams.get("home") || "");
  const away = String(url.searchParams.get("away") || "");
  const sport = String(url.searchParams.get("sport") || "");
  const gameDateMs = Number(url.searchParams.get("gameDateMs"));

  if (!home || !away) {
    return Response.json({ ok:false, mode:"selected", matched:false, error:"선택 경기의 홈/원정 팀명이 없습니다." }, { status:400 });
  }

  const result = await findSportsFixtureForBetman({
    home,
    away,
    sport,
    gameDateMs: Number.isFinite(gameDateMs) ? gameDateMs : null,
  }, key);

  if (!result.fixture) {
    return Response.json({
      ok:false,
      mode:"selected",
      matched:false,
      error:"선택한 Betman 경기를 SportsAPI에서 자동매칭하지 못했습니다.",
      selectedBetman:{ home, away, sport, gameDateMs:Number.isFinite(gameDateMs) ? gameDateMs : null },
      debug:result.debug,
    });
  }

  const fixture = result.fixture;
  const fixtureId = Number(fixture?.id);

  return Response.json({
    ok:true,
    mode:"selected",
    matched:true,
    fixtureId,
    selectedFixture:summarizeFixture(fixture),
    fixture,
    detail:null,
    lineups:null,
    statistics:null,
    h2h:null,
    debug:{ message:"사용자가 선택한 Betman 경기를 SportsAPI에서 매칭했습니다.", sportsApi:result.debug },
  });
}

async function runRealMode(
  req: Request,
  key: string
) {
  const betmanUrl =
    new URL(
      "/api/betman",
      req.url
    );

  const betmanResponse =
    await fetch(
      betmanUrl,
      {
        cache:
          "no-store",
        headers: {
          Accept:
            "application/json",
        },
      }
    );

  const betmanPayload =
    await readJsonOrThrow(
      betmanResponse,
      "내부 Betman API"
    );

  if (
    !betmanResponse.ok ||
    !betmanPayload?.ok
  ) {
    return Response.json(
      {
        ok: false,
        mode:
          "real",
        error:
          betmanPayload?.error ||
          "Betman 발매경기 수집 실패",
      },
      {
        status: 502,
      }
    );
  }

  const games =
    Array.isArray(
      betmanPayload?.games
    )
      ? betmanPayload.games
      : [];

  const candidates =
    games
      .filter(
        isBetmanWithin72Hours
      )
      .sort(
        (a: AnyObj, b: AnyObj) =>
          betmanGameTimeMs(a) -
          betmanGameTimeMs(b)
      );

  if (!candidates.length) {
    return Response.json({
      ok: false,
      mode:
        "real",
      error:
        "Betman에서 현재부터 72시간 이내의 미시작 발매경기를 찾지 못했습니다.",
      betmanCount:
        games.length,
    });
  }

  const maxBetmanChecks =
    Math.min(
      3,
      candidates.length
    );

  const attempts: AnyObj[] =
    [];

  for (
    let i = 0;
    i < maxBetmanChecks;
    i++
  ) {
    const betmanGame =
      candidates[i];

    const result =
      await findSportsFixtureForBetman(
        betmanGame,
        key
      );

    attempts.push({
      betman: {
        home:
          betmanGame?.home ??
          null,
        away:
          betmanGame?.away ??
          null,
        sport:
          betmanGame?.sport ??
          null,
        league:
          betmanGame?.league ??
          null,
        gameDate:
          betmanGame?.gameDate ??
          null,
        gameDateMs:
          betmanGame?.gameDateMs ??
          null,
      },
      sportsApi:
        result.debug,
    });

    if (result.fixture) {
      const fixture =
        result.fixture;

      const fixtureId =
        Number(
          fixture?.id
        );

      return Response.json({
        ok: true,
        mode:
          "real",
        matched: true,
        fixtureId,
        selectedFixture:
          summarizeFixture(
            fixture
          ),
        fixture,
        betmanMatch:
          betmanGame,
        detail: null,
        lineups: null,
        statistics: null,
        h2h: null,
        debug: {
          message:
            "Betman 72시간 발매경기에서 SportsAPI 동일경기를 찾았습니다.",
          betmanCandidateCount:
            candidates.length,
          checkedBetmanCount:
            i + 1,
          attempts,
        },
      });
    }
  }

  return Response.json({
    ok: false,
    mode:
      "real",
    matched:
      false,
    error:
      "Betman 72시간 발매경기는 찾았지만 SportsAPI 동일경기 자동매칭에 실패했습니다.",
    betmanCandidateCount:
      candidates.length,
    checkedBetmanCount:
      maxBetmanChecks,
    attempts,
  });
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
    mode !== "random" &&
    mode !== "real" &&
    mode !== "selected"
  ) {
    return Response.json({
      ok: false,

      error:
        "지원 모드는 mode=random, mode=real, mode=selected 입니다.",

      usage:
        [
          "/api/match?mode=random",
          "/api/match?mode=real",
          "/api/match?mode=selected&home=홈팀&away=원정팀&gameDateMs=시간",
        ],
    });
  }

  if (mode === "selected") {
    try {
      return await runSelectedMode(req, key);
    } catch (e: any) {
      return Response.json({
        ok:false,
        mode:"selected",
        matched:false,
        error: typeof e?.message === "string" ? e.message : "선택 경기 자동매칭 실패",
        status:e?.status ?? null,
        retryAfterMs:e?.retryAfterMs ?? null,
      }, { status:e?.status === 429 ? 429 : 502 });
    }
  }

  if (mode === "real") {
    try {
      return await runRealMode(
        req,
        key
      );
    } catch (e: any) {
      return Response.json(
        {
          ok: false,
          mode: "real",
          matched: false,
          error:
            e?.message ||
            "실전 경기 자동매칭 실패",
          status:
            e?.status ??
            null,
          retryAfterMs:
            e?.retryAfterMs ??
            null,
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

  try {
    /**
     * ---------------------------------------------
     * 1. 팀 검색
     * ---------------------------------------------
     *
     * 최대 4 requests
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
          discoveredTeamCount: 0,

          checkedTeamCount: 0,

          candidateCount: 0,

          search:
            discovered.debug,
        },
      });
    }

    /**
     * ---------------------------------------------
     * 2. 검사할 팀 선택
     * ---------------------------------------------
     *
     * 최대 4팀.
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
     * ---------------------------------------------
     * 3. 팀별 upcoming fixture
     * ---------------------------------------------
     */
    for (
      const team of selectedTeams
    ) {
      const teamId =
        Number(team?.id);

      if (
        !Number.isFinite(
          teamId
        )
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

      const windowFixtures =
        fixtures.filter(
          isFutureNotStartedFixture
        );

      if (
        windowFixtures.length
      ) {
        allFixtures.push(
          ...windowFixtures
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

        futureNotStartedCount:
          windowFixtures.length,

        futureNotStartedSample:
          windowFixtures
            .slice(0, 5)
            .map(
              summarizeFixture
            ),

        apiDebug:
          result.debug,
      });

      // 테스트 모드에서는 미시작 미래 경기 후보 1개만 확보되면 즉시 중단합니다.
      if (allFixtures.length > 0) {
        break;
      }

      /**
       * 모든 팀을 무조건 검사하지 않고,
       * 충분한 후보가 확보되면
       * 현재 단계에서는 여기서 멈춥니다.
       *
       * 다만 현재 random 선택의 다양성을 위해
       * selectedTeams 자체는 최대 4개이고,
       * 이미 앞의 팀에서 fixture가 있어도
       * 나머지 팀을 계속 조회합니다.
       *
       * 즉 총 team request 수는 최대 4회입니다.
       */
    }

    /**
     * ---------------------------------------------
     * 4. Fixture 후보 정리
     * ---------------------------------------------
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
          "빠른 테스트에서 미시작 미래 경기를 찾지 못했습니다. 버튼을 한 번 더 눌러 다른 스포츠를 테스트해주세요.",

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
     * ---------------------------------------------
     * 5. 빠른 테스트: 가장 가까운 미시작 경기 선택
     * ---------------------------------------------
     */
    const fixture =
      candidates[0];

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

    /**
     * 빠른 테스트 모드에서는 여기서 detail을 호출하지 않습니다.
     * 경기 기본정보를 즉시 반환한 뒤 page.tsx가 /api/match/{fixtureId}로
     * H2H / 최근 Form을 별도 조회합니다.
     */
    const detailResult = {
      ok: false,
      data: null,
      error: "빠른 테스트 모드에서는 초기 detail 호출 생략",
      status: null,
      retryAfterMs: null,
      rateLimit: null,
    };

    /**
     * ---------------------------------------------
     * 7. 최종 응답
     * ---------------------------------------------
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
            ? "빠른 테스트 경기 탐색 성공"
            : "가장 가까운 미시작 미래 경기 기본정보를 즉시 반환했습니다.",

        discoveredTeamCount:
          teams.length,

        checkedTeamCount:
          selectedTeams.length,

        candidateCount:
          candidates.length,

        selectionMode:
          "nearest-future",

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
    const status =
      e?.status ?? null;

    const is429 =
      status === 429;

    return Response.json(
      {
        ok: false,

        mode:
          "random",

        matched:
          false,

        error:
          is429
            ? "SportsAPI 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요."
            : e?.message ||
              "random fixture lookup failed",

        status,

        retryAfterMs:
          e?.retryAfterMs ??
          null,

        rateLimit:
          e?.rateLimit ??
          null,
      },
      {
        status:
          is429
            ? 429
            : 502,
      }
    );
  }
}
