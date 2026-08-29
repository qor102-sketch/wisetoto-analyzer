// DEPLOY_MARKER_V13_7_6_PAST_FIXTURE_PAGINATION_20260829
// DEPLOY_MARKER_V12_9_STARTER_BAYESIAN_20260825
// WISETOTO_MATCH_SELECTED_V1_20260823
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


function safeTeamShape(value: any) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    keys: Object.keys(value).slice(0, 20),
    id:
      value?.id ??
      value?.teamId ??
      value?.team?.id ??
      null,
    name:
      value?.name ??
      value?.teamName ??
      value?.team?.name ??
      null,
  };
}

function safeFixtureTeamDebug(fixture: any) {
  if (!fixture || typeof fixture !== "object") {
    return null;
  }

  return {
    fixtureKeys:
      Object.keys(fixture).slice(0, 30),
    home:
      safeTeamShape(
        fixture?.home ??
        fixture?.homeTeam ??
        fixture?.teams?.home ??
        null
      ),
    away:
      safeTeamShape(
        fixture?.away ??
        fixture?.awayTeam ??
        fixture?.teams?.away ??
        null
      ),
    participants:
      Array.isArray(fixture?.participants)
        ? fixture.participants
            .slice(0, 4)
            .map((item: any) => ({
              keys:
                item && typeof item === "object"
                  ? Object.keys(item).slice(0, 20)
                  : [],
              id:
                item?.id ??
                item?.teamId ??
                item?.team?.id ??
                null,
              name:
                item?.name ??
                item?.teamName ??
                item?.team?.name ??
                null,
              side:
                item?.side ??
                item?.homeAway ??
                item?.position ??
                null,
            }))
        : [],
  };
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
      sportsApiSportKey(fixture?.sport) || null,

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
 * 팀별 fixture는 page=0 딱 한 번만 조회합니다.
 * SportsAPI 공식 규격: type=recent | upcoming.
 */
async function getTeamFixtures(
  teamId: number,
  key: string,
  type: "recent" | "upcoming" = "upcoming",
  options?: {
    targetTimeMs?: number | null;
    maxPages?: number;
  }
) {
  const debug: AnyObj[] = [];
  const fixtures: AnyObj[] = [];

  const targetTimeMs =
    Number.isFinite(Number(options?.targetTimeMs))
      ? Number(options?.targetTimeMs)
      : null;

  /*
   * upcoming은 기존처럼 page=0 한 번만 조회한다.
   * recent는 과거 백테스트 날짜가 page=0의 최근 30경기보다 오래될 수 있으므로
   * 목표 경기시각을 찾을 때까지만 페이지를 뒤로 넘긴다.
   *
   * SportsAPI 호출량 보호:
   * - 기본 recent 최대 4페이지
   * - selected backtest는 호출부에서 최대 6페이지 허용
   * - 목표 날짜보다 충분히 오래된 fixture가 나오면 즉시 중단
   */
  const maxPages =
    type === "recent"
      ? Math.max(
          1,
          Math.min(
            6,
            Number(options?.maxPages ?? 4)
          )
        )
      : 1;

  for (
    let page = 0;
    page < maxPages;
    page += 1
  ) {
    try {
      const result =
        await api(
          `/teams/${teamId}/fixtures?type=${type}&page=${page}`,
          key
        );

      const pageFixtures =
        arr(result.data);

      fixtures.push(
        ...pageFixtures
      );

      const pageTimes =
        pageFixtures
          .map(
            (fixture: AnyObj) =>
              new Date(
                summarizeFixture(
                  fixture
                ).startTime
              ).getTime()
          )
          .filter(
            (value: number) =>
              Number.isFinite(
                value
              )
          );

      const newestTime =
        pageTimes.length
          ? Math.max(
              ...pageTimes
            )
          : null;

      const oldestTime =
        pageTimes.length
          ? Math.min(
              ...pageTimes
            )
          : null;

      debug.push({
        page,
        ok: true,
        count:
          pageFixtures.length,
        newestTime:
          newestTime === null
            ? null
            : new Date(
                newestTime
              ).toISOString(),
        oldestTime:
          oldestTime === null
            ? null
            : new Date(
                oldestTime
              ).toISOString(),
        targetTime:
          targetTimeMs === null
            ? null
            : new Date(
                targetTimeMs
              ).toISOString(),
        rateLimit:
          result.headers,
      });

      /*
       * 빈 페이지면 더 이상 과거 fixture가 없다.
       */
      if (
        pageFixtures.length === 0
      ) {
        break;
      }

      /*
       * 과거 fixture는 보통 최신 → 과거 순이다.
       * 현재 페이지의 가장 오래된 경기가 목표시각보다 12시간 이상 과거라면
       * 목표 날짜 구간을 이미 통과한 것이므로 추가 API 호출을 중단한다.
       *
       * 12시간 여유는 SportsAPI/Betman 시간대 표기 차이를 흡수하기 위한 범위다.
       */
      if (
        type === "recent" &&
        targetTimeMs !== null &&
        oldestTime !== null &&
        oldestTime <
          targetTimeMs -
            12 *
              60 *
              60 *
              1000
      ) {
        break;
      }

      /*
       * page 크기보다 적게 반환되면 다음 페이지가 없다고 본다.
       */
      if (
        pageFixtures.length <
        30
      ) {
        break;
      }
    } catch (e: any) {
      debug.push({
        page,
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

      /*
       * rate limit은 즉시 중단.
       * 그 외 페이지 오류도 뒤 페이지 연속 호출을 하지 않는다.
       */
      break;
    }
  }

  return {
    fixtures:
      uniqueFixtures(
        fixtures
      ),
    debug,
  };
}

async function getUpcoming(
  teamId: number,
  key: string
) {
  return getTeamFixtures(teamId, key, "upcoming");
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

/**
 * SportsAPI 공식 fixture lineups endpoint.
 *
 * GET /v2/fixtures/{id}/lineups
 *
 * 과거경기 백테스트에서는 이 데이터를 "경기 전 공개 정보" 후보로 사용합니다.
 * statistics/events/result는 여기서 호출하지 않습니다.
 */

function sportsApiDiagnosticUrl(
  path: string
) {
  return `${BASE}${path}`;
}

type FixtureLineupsResult = {
  ok: boolean;
  data: any;
  error: string | null;
  status: number | null;
  retryAfterMs: number | null;
  rateLimit: any;
};

async function getFixtureLineups(
  fixtureId: number,
  key: string
): Promise<FixtureLineupsResult> {
  try {
    const result =
      await api(
        `/fixtures/${fixtureId}/lineups`,
        key
      );

    return {
      ok: true,
      data:
        result.data,
      error: null,
      status: 200,
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
        "lineups 조회 실패",
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


function sportsApiSportKey(value: any) {
  const raw =
    typeof value === "object" && value
      ? value?.slug ?? value?.name ?? value?.type ?? value?.id ?? ""
      : value;

  const v = String(raw ?? "").toLowerCase().trim();

  if (["soccer", "football", "축구", "sc", "1"].includes(v)) return "soccer";
  if (["baseball", "야구", "bs", "2"].includes(v)) return "baseball";
  if (["basketball", "농구", "bk", "bb", "3"].includes(v)) return "basketball";
  if (["volleyball", "배구", "vl", "vb", "4"].includes(v)) return "volleyball";

  return v;
}

function sportsCompatible(wanted: any, actual: any) {
  const w = sportsApiSportKey(wanted);
  const a = sportsApiSportKey(actual);

  if (!w) return true;
  if (!a) return true;

  // SportsAPI가 축구를 football 또는 soccer로 내려줄 수 있으므로 같은 종목으로 취급.
  if (w === "soccer" && (a === "soccer" || a === "football")) return true;
  return w === a;
}

const TEAM_SEARCH_ALIASES: Record<string, string[]> = {
  // KBO
  "lg": ["LG Twins", "LG Twins Baseball Club", "LG"],
  "lg트윈스": ["LG Twins", "LG Twins Baseball Club", "LG"],
  "엘지": ["LG Twins", "LG Twins Baseball Club", "LG"],
  "엘지트윈스": ["LG Twins", "LG Twins Baseball Club", "LG"],

  "nc": ["NC Dinos", "NC Dinos Baseball Club", "NC"],
  "nc다이노스": ["NC Dinos", "NC Dinos Baseball Club", "NC"],
  "엔씨": ["NC Dinos", "NC Dinos Baseball Club", "NC"],
  "엔씨다이노스": ["NC Dinos", "NC Dinos Baseball Club", "NC"],

  "두산": ["Doosan Bears", "Doosan", "Doosan Bears Baseball Club"],
  "두산베어스": ["Doosan Bears", "Doosan", "Doosan Bears Baseball Club"],

  "롯데": ["Lotte Giants", "Lotte", "Lotte Giants Baseball Club"],
  "롯데자이언츠": ["Lotte Giants", "Lotte", "Lotte Giants Baseball Club"],

  "삼성": ["Samsung Lions", "Samsung", "Samsung Lions Baseball Club"],
  "삼성라이온즈": ["Samsung Lions", "Samsung", "Samsung Lions Baseball Club"],

  "kt": ["KT Wiz", "KT Wiz Baseball Club", "KT"],
  "kt위즈": ["KT Wiz", "KT Wiz Baseball Club", "KT"],
  "케이티": ["KT Wiz", "KT Wiz Baseball Club", "KT"],
  "케이티위즈": ["KT Wiz", "KT Wiz Baseball Club", "KT"],

  "ssg": ["SSG Landers", "SSG Landers Baseball Club", "SSG"],
  "ssg랜더스": ["SSG Landers", "SSG Landers Baseball Club", "SSG"],

  "kia": ["KIA Tigers", "Kia Tigers", "KIA Tigers Baseball Club", "KIA"],
  "kia타이거즈": ["KIA Tigers", "Kia Tigers", "KIA Tigers Baseball Club", "KIA"],
  "기아": ["KIA Tigers", "Kia Tigers", "KIA Tigers Baseball Club", "KIA"],
  "기아타이거즈": ["KIA Tigers", "Kia Tigers", "KIA Tigers Baseball Club", "KIA"],

  "한화": ["Hanwha Eagles", "Hanwha", "Hanwha Eagles Baseball Club"],
  "한화이글스": ["Hanwha Eagles", "Hanwha", "Hanwha Eagles Baseball Club"],

  "키움": ["Kiwoom Heroes", "Kiwoom", "Kiwoom Heroes Baseball Club"],
  "키움히어로즈": ["Kiwoom Heroes", "Kiwoom", "Kiwoom Heroes Baseball Club"],

  // K League
  "대전하나시티즌": ["Daejeon Hana Citizen", "Daejeon Citizen"],
  "강원": ["Gangwon FC", "Gangwon"],
  "강원fc": ["Gangwon FC", "Gangwon"],
  "광주fc": ["Gwangju FC", "Gwangju"],
  "광주": ["Gwangju FC", "Gwangju"],
  "인천유나이티드": ["Incheon United", "Incheon United FC"],

  // England - Championship / Premier League
  "웨스트브로미치앨비언": ["West Bromwich Albion", "West Brom", "WBA"],
  "웨스트브로미치": ["West Bromwich Albion", "West Brom", "WBA"],
  "번리": ["Burnley", "Burnley FC"],
  "브라이턴호브앨비언": ["Brighton & Hove Albion", "Brighton", "Brighton and Hove Albion"],
  "브라이튼호브앨비언": ["Brighton & Hove Albion", "Brighton", "Brighton and Hove Albion"],
  "애스턴빌라": ["Aston Villa", "Aston Villa FC"],
  "아스톤빌라": ["Aston Villa", "Aston Villa FC"],
  "맨체스터시티": ["Manchester City", "Man City", "Manchester City FC"],
  "맨시티": ["Manchester City", "Man City", "Manchester City FC"],
  "afc본머스": ["AFC Bournemouth", "Bournemouth"],
  "본머스": ["AFC Bournemouth", "Bournemouth"],

  // Netherlands
  "psv에인트호번": ["PSV Eindhoven", "PSV"],
  "psv아인트호벤": ["PSV Eindhoven", "PSV"],
  "흐로닝언": ["FC Groningen", "Groningen"],
  "흐로닝겐": ["FC Groningen", "Groningen"],
};

function teamAliases(name: string) {
  const normalized = normalizeMatchName(name);
  const aliases = TEAM_SEARCH_ALIASES[normalized] ?? [];
  return [name, ...aliases].filter(Boolean);
}

function searchQueryForTeam(name: string, aliases: string[]) {
  // SportsAPI 검색은 영문 팀명에서 가장 안정적이므로 alias가 있으면 첫 영문명을 우선.
  // alias가 없을 때만 Betman 원문 팀명을 사용합니다.
  return aliases.length > 1
    ? aliases[1]
    : aliases[0] ?? name;
}

function bestNameSimilarity(wantedAliases: string[], actual: any) {
  let best = 0;
  for (const alias of wantedAliases) {
    best = Math.max(best, similarity(alias, actual));
  }
  return best;
}

function chooseBestSearchedTeam(
  teams: AnyObj[],
  wantedAliases: string[],
  wantedSport: string
) {
  let best: AnyObj | null = null;
  let bestScore = 0;

  for (const team of teams) {
    if (!sportsCompatible(wantedSport, team?.sport)) continue;

    const score = bestNameSimilarity(wantedAliases, team?.name);
    if (score > bestScore) {
      best = team;
      bestScore = score;
    }
  }

  return best && bestScore >= 0.45
    ? { team: best, score: bestScore }
    : null;
}

function fixtureMatchScore(
  fixture: AnyObj,
  homeAliases: string[],
  awayAliases: string[],
  wantedSport: string,
  betmanTime: number
) {
  const f = summarizeFixture(fixture);

  if (!sportsCompatible(wantedSport, f.sport)) {
    return { score: 0, timeDiffMinutes: 999999, direct: 0, reverse: 0 };
  }

  const homeToHome = bestNameSimilarity(homeAliases, f.home);
  const awayToAway = bestNameSimilarity(awayAliases, f.away);
  const homeToAway = bestNameSimilarity(homeAliases, f.away);
  const awayToHome = bestNameSimilarity(awayAliases, f.home);

  const direct = homeToHome * 0.46 + awayToAway * 0.46;
  const reverse = (homeToAway * 0.46 + awayToHome * 0.46) * 0.82;

  const fixtureTime = new Date(f.startTime).getTime();
  const timeDiffMinutes =
    Number.isFinite(fixtureTime) && Number.isFinite(betmanTime)
      ? Math.abs(fixtureTime - betmanTime) / 60000
      : 999999;

  // 선택 경기 매칭은 시간도 강한 조건으로 사용한다.
  // 과거 Betman/SportsAPI 시간대 표기 차이를 고려해 최대 12시간까지만 허용한다.
  // 양 팀 이름 유사도 조건은 그대로 유지되므로 날짜만 비슷한 다른 경기는 통과하지 않는다.
  if (timeDiffMinutes > 720) {
    return { score: 0, timeDiffMinutes, direct, reverse };
  }

  const timeScore =
    timeDiffMinutes <= 15
      ? 0.08
      : timeDiffMinutes <= 60
        ? 0.06
        : timeDiffMinutes <= 120
          ? 0.04
          : 0.015;

  return {
    score: Math.max(direct, reverse) + timeScore,
    timeDiffMinutes,
    direct,
    reverse,
  };
}

async function findSportsFixtureForBetman(
  betmanGame: AnyObj,
  key: string
) {
  const home = String(betmanGame?.home ?? "").trim();
  const away = String(betmanGame?.away ?? "").trim();
  const wantedSport = sportsApiSportKey(betmanGame?.sport);
  const betmanTime = betmanGameTimeMs(betmanGame);

  if (!home || !away) {
    return {
      fixture: null,
      debug: { error: "Betman 팀명이 없습니다." },
    };
  }

  const homeAliases = teamAliases(home);
  const awayAliases = teamAliases(away);

  // KBO의 LG / NC / KT / SSG / KIA 같은 약칭도
  // teamAliases()에서 SportsAPI 영문 정식명으로 변환한 뒤 검색합니다.
  // 홈/원정 방향과 경기시간 검증은 아래 fixtureMatchScore에서 그대로 유지됩니다.

  // 한국어 팀명만 검색하면 SportsAPI 검색 결과가 비어 있을 수 있으므로
  // 알려진 영문 표기가 있으면 영문 alias를 우선 검색한다.
  const plans = [
    { side: "home", aliases: homeAliases, query: searchQueryForTeam(home, homeAliases) },
    { side: "away", aliases: awayAliases, query: searchQueryForTeam(away, awayAliases) },
  ];

  const debug: AnyObj[] = [];
  const checkedTeamIds = new Set<number>();

  for (const plan of plans) {
    let searchResult: any;

    try {
      searchResult = await api(
        `/search?q=${encodeURIComponent(plan.query)}`,
        key
      );
    } catch (e: any) {
      debug.push({
        stage: "search",
        side: plan.side,
        query: plan.query,
        error: e?.message ?? "검색 실패",
        status: e?.status ?? null,
      });

      if (e?.status === 429) break;
      continue;
    }

    const searchedTeams = extractTeams(searchResult.data);
    const chosen = chooseBestSearchedTeam(
      searchedTeams,
      plan.aliases,
      wantedSport
    );

    debug.push({
      stage: "search",
      side: plan.side,
      query: plan.query,
      wantedSport,
      resultTeamCount: searchedTeams.length,
      chosenTeam: chosen
        ? {
            id: chosen.team?.id ?? null,
            name: chosen.team?.name ?? null,
            sport: chosen.team?.sport ?? null,
            nameScore: Number(chosen.score.toFixed(3)),
          }
        : null,
      sample: searchedTeams.slice(0, 5).map((x: AnyObj) => ({
        id: x?.id ?? null,
        name: x?.name ?? null,
        sport: x?.sport ?? null,
      })),
      rateLimit: searchResult.headers,
    });

    if (!chosen) continue;

    const teamId = Number(chosen.team?.id);
    if (!Number.isFinite(teamId) || checkedTeamIds.has(teamId)) continue;
    checkedTeamIds.add(teamId);

    // selected 모드는 Betman 경기시각을 기준으로 과거/미래 fixture 소스를 분리한다.
    // 과거 백테스트에서는 결과/점수/winner를 매칭 점수에 사용하지 않는다.
    const isPastSelectedGame =
      Number.isFinite(betmanTime) && betmanTime < Date.now();
    const fixtureType: "recent" | "upcoming" =
      isPastSelectedGame ? "recent" : "upcoming";

    const teamFixtures =
      await getTeamFixtures(
        teamId,
        key,
        fixtureType,
        fixtureType === "recent"
          ? {
              targetTimeMs:
                betmanTime,
              maxPages: 6,
            }
          : undefined
      );
    const fixtures =
      fixtureType === "upcoming"
        ? teamFixtures.fixtures.filter(isFutureNotStartedFixture)
        : teamFixtures.fixtures;

    let bestFixture: AnyObj | null = null;
    let bestScore = 0;
    let bestTimeDiffMinutes = 999999;

    for (const fixture of fixtures) {
      const result = fixtureMatchScore(
        fixture,
        homeAliases,
        awayAliases,
        wantedSport,
        betmanTime
      );

      if (result.score > bestScore) {
        bestFixture = fixture;
        bestScore = result.score;
        bestTimeDiffMinutes = result.timeDiffMinutes;
      }
    }

    debug.push({
      stage: fixtureType,
      fixtureType,
      side: plan.side,
      teamId,
      teamName: chosen.team?.name ?? null,
      fixtureCount: fixtures.length,
      bestScore: Number(bestScore.toFixed(3)),
      bestTimeDiffMinutes:
        Number.isFinite(bestTimeDiffMinutes)
          ? Number(bestTimeDiffMinutes.toFixed(1))
          : null,
      bestFixture: bestFixture ? summarizeFixture(bestFixture) : null,
      apiDebug: teamFixtures.debug,
    });

    // 양 팀 이름 + 종목 + 시작시간을 함께 만족해야 확정한다.
    if (bestFixture && bestScore >= 0.68) {
      return {
        fixture: bestFixture,
        debug: {
          matched: true,
          score: Number(bestScore.toFixed(3)),
          timeDiffMinutes: Number(bestTimeDiffMinutes.toFixed(1)),
          wantedSport,
          homeAliases,
          awayAliases,
          attempts: debug,
        },
      };
    }
  }

  return {
    fixture: null,
    debug: {
      matched: false,
      wantedSport,
      homeAliases,
      awayAliases,
      attempts: debug,
    },
  };
}


const NAVER_SPORTS_BASE =
  "https://api-gw.sports.naver.com";

type NaverPregameCandidate = {
  gameId: string;
  homeName: string | null;
  awayName: string | null;
  homeCode: string | null;
  awayCode: string | null;
  normalizedHome: string;
  normalizedAway: string;
};

type NaverPregameResult = {
  ok: boolean;
  gameId: string | null;
  lineups: any;
  error: string | null;
  scheduleStatus: number | null;
  previewStatus: number | null;
  matchedGame: any;
  candidates: NaverPregameCandidate[];
  previewAudit: NaverPreviewAudit | null;
  batterStatsDiagnostic: NaverBatterStatsDiagnostic | null;
};

function normalizeNaverTeamName(value: unknown) {
  const raw =
    String(value ?? "")
      .toLowerCase()
      .replace(/[.\-_()]/g, "")
      .replace(/\s+/g, "");

  const aliases: Array<
    [RegExp, string]
  > = [
    [/^(nc|ncdinos|nc다이노스|엔씨|엔씨다이노스|다이노스)$/i, "nc"],
    [/^(삼성|삼성라이온즈|samsung|samsunglions|라이온즈)$/i, "삼성"],
    [/^(lg|lg트윈스|엘지|엘지트윈스|twins)$/i, "lg"],
    [/^(kia|기아|기아타이거즈|타이거즈|kiatigers)$/i, "kia"],
    [/^(kt|ktwiz|케이티|케이티위즈|wiz)$/i, "kt"],
    [/^(한화|한화이글스|이글스|hanwha|hanwhaeagles)$/i, "한화"],
    [/^(ssg|ssg랜더스|랜더스|landers)$/i, "ssg"],
    [/^(롯데|롯데자이언츠|자이언츠|lotte|lottegiants)$/i, "롯데"],
    [/^(두산|두산베어스|베어스|doosan|doosanbears)$/i, "두산"],
    [/^(키움|키움히어로즈|히어로즈|kiwoom|kiwoomheroes)$/i, "키움"],
  ];

  for (
    const [
      pattern,
      normalized,
    ] of aliases
  ) {
    if (
      pattern.test(raw)
    ) {
      return normalized;
    }
  }

  return raw
    .replace(/다이노스|dinos/g, "nc")
    .replace(/라이온즈|lions/g, "삼성")
    .replace(/트윈스|twins/g, "lg")
    .replace(/타이거즈|tigers/g, "kia")
    .replace(/위즈|wiz/g, "kt")
    .replace(/이글스|eagles/g, "한화")
    .replace(/랜더스|landers/g, "ssg")
    .replace(/자이언츠|giants/g, "롯데")
    .replace(/베어스|bears/g, "두산")
    .replace(/히어로즈|heroes/g, "키움");
}

function kstDateString(ms: number) {
  const date =
    new Date(ms + 9 * 60 * 60 * 1000);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function collectNaverGameObjects(
  value: any,
  out: any[] = [],
  depth = 0
) {
  if (
    value === null ||
    value === undefined ||
    depth > 8
  ) {
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectNaverGameObjects(
        item,
        out,
        depth + 1
      );
    }
    return out;
  }

  if (typeof value !== "object") {
    return out;
  }

  const gameId =
    value?.gameId ??
    value?.id ??
    value?.game?.gameId ??
    null;

  const homeName =
    value?.homeTeamName ??
    value?.homeTeam?.name ??
    value?.home?.name ??
    value?.homeName ??
    null;

  const awayName =
    value?.awayTeamName ??
    value?.awayTeam?.name ??
    value?.away?.name ??
    value?.awayName ??
    null;

  if (
    gameId !== null &&
    (homeName || awayName)
  ) {
    out.push({
      raw: value,
      gameId: String(gameId),
      homeName:
        homeName === null
          ? null
          : String(homeName),
      awayName:
        awayName === null
          ? null
          : String(awayName),
      homeCode:
        String(
          value?.homeTeamCode ??
          value?.homeTeam?.code ??
          value?.home?.code ??
          value?.homeTeamId ??
          value?.homeTeam?.id ??
          value?.home?.id ??
          ""
        ).trim() || null,
      awayCode:
        String(
          value?.awayTeamCode ??
          value?.awayTeam?.code ??
          value?.away?.code ??
          value?.awayTeamId ??
          value?.awayTeam?.id ??
          value?.away?.id ??
          ""
        ).trim() || null,
    });
  }

  for (const child of Object.values(value)) {
    if (
      child &&
      typeof child === "object"
    ) {
      collectNaverGameObjects(
        child,
        out,
        depth + 1
      );
    }
  }

  return out;
}

async function naverJson(
  path: string
): Promise<{
  ok: boolean;
  status: number | null;
  data: any;
  error: string | null;
}> {
  try {
    const response =
      await fetch(
        `${NAVER_SPORTS_BASE}${path}`,
        {
          cache: "no-store",
          headers: {
            accept: "application/json, text/plain, */*",
            "user-agent":
              "Mozilla/5.0 (compatible; WiseTotoAnalyzer/12.1)",
            referer:
              "https://m.sports.naver.com/",
          },
        }
      );

    const text =
      await response.text();

    let data: any = null;

    try {
      data =
        text
          ? JSON.parse(text)
          : null;
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data !== null,
      status: response.status,
      data,
      error:
        response.ok
          ? data === null
            ? "JSON 응답 아님"
            : null
          : `Naver Sports HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: null,
      data: null,
      error:
        typeof error?.message === "string"
          ? error.message
          : "Naver Sports 요청 실패",
    };
  }
}


type NaverPreviewStructureRow = {
  path: string;
  type: "object" | "array";
  keys: string[];
  length: number | null;
  sampleName: string | null;
  sampleRole: string | null;
  samplePosition: string | null;
  sampleOrder: number | null;
};

type NaverPreviewAudit = {
  rootKeys: string[];
  rowCount: number;
  rows: NaverPreviewStructureRow[];
};

function inspectNaverPreviewStructure(
  payload: any
): NaverPreviewAudit {
  const auditPayload = unwrapNaverPreviewPayload(payload);

  const rootKeys =
    auditPayload &&
    typeof auditPayload === "object" &&
    !Array.isArray(auditPayload)
      ? Object.keys(auditPayload).slice(0, 80)
      : [];

  const rows:
    NaverPreviewStructureRow[] =
      [];

  const seen =
    new Set<any>();

  const interestingKey =
    /lineup|line-up|line_up|starter|starting|pitcher|player|athlete|batter|batting|order|position|home|away|roster|entry|member|currentseasonstats|seasonstats/i;

  // V12.5.2: currentSeasonStats는 경기 전 시즌 누적 투수지표 후보이므로
  // generic statistics 차단 규칙과 분리합니다. 경기 결과/이닝/boxscore 계열은 계속 차단합니다.
  const isBlockedKey = (key: string) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === "currentseasonstats" || normalized === "seasonstats") return false;
    return /score|winner|statistics|statistic|boxscore|finalscore|gameresult|matchresult|resultscore|record|inning|runs|hits|errors|pitchcount/i.test(key);
  };

  const pushRow = (
    path: string,
    value: any
  ) => {
    if (
      rows.length >= 120
    ) {
      return;
    }

    if (
      Array.isArray(value)
    ) {
      rows.push({
        path,
        type: "array",
        keys: [],
        length: value.length,
        sampleName: null,
        sampleRole: null,
        samplePosition: null,
        sampleOrder: null,
      });
      return;
    }

    if (
      !value ||
      typeof value !== "object"
    ) {
      return;
    }

    const keys =
      Object.keys(value)
        .filter(
          (key) =>
            !isBlockedKey(key)
        )
        .slice(0, 40);

    const sampleName =
      String(
        value?.playerName ??
        value?.name ??
        value?.player?.name ??
        value?.athlete?.name ??
        value?.memberName ??
        ""
      ).trim() || null;

    const sampleRole =
      String(
        value?.role ??
        value?.type ??
        value?.designation ??
        ""
      ).trim() || null;

    const samplePosition =
      String(
        value?.position ??
        value?.positionName ??
        value?.pos ??
        ""
      ).trim() || null;

    const orderRaw =
      value?.order ??
      value?.battingOrder ??
      value?.lineupOrder ??
      value?.slot ??
      null;

    const order =
      Number(orderRaw);

    rows.push({
      path,
      type: "object",
      keys,
      length: null,
      sampleName,
      sampleRole,
      samplePosition,
      sampleOrder:
        Number.isFinite(order)
          ? order
          : null,
    });
  };

  const visit = (
    value: any,
    path: string,
    depth = 0
  ) => {
    if (
      value === null ||
      value === undefined ||
      depth > 9 ||
      rows.length >= 120
    ) {
      return;
    }

    if (
      typeof value === "object" &&
      seen.has(value)
    ) {
      return;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      seen.add(value);
    }

    if (
      Array.isArray(value)
    ) {
      if (
        interestingKey.test(path)
      ) {
        pushRow(
          path,
          value
        );
      }

      for (
        let index = 0;
        index < Math.min(
          value.length,
          5
        );
        index += 1
      ) {
        visit(
          value[index],
          `${path}[${index}]`,
          depth + 1
        );
      }

      return;
    }

    if (
      typeof value !== "object"
    ) {
      return;
    }

    const keys =
      Object.keys(value);

    const safeInterestingKeys =
      keys.filter(
        (key) =>
          interestingKey.test(key) &&
          !isBlockedKey(key)
      );

    if (
      interestingKey.test(path) ||
      safeInterestingKeys.length > 0
    ) {
      pushRow(
        path,
        value
      );
    }

    for (
      const [
        key,
        child,
      ] of Object.entries(value)
    ) {
      if (
        isBlockedKey(key)
      ) {
        continue;
      }

      if (
        child &&
        typeof child === "object"
      ) {
        visit(
          child,
          `${path}.${key}`,
          depth + 1
        );
      }
    }
  };

  visit(
    auditPayload,
    "preview.result",
    0
  );

  return {
    rootKeys,
    rowCount:
      rows.length,
    rows,
  };
}


type NaverParsedPlayer = {
  name: string;
  playerName: string;
  side: "home" | "away";
  homeAway: "home" | "away";
  position: string | null;
  positionName: string | null;
  role: string | null;
  order: number | null;
  battingOrder: number | null;
  starter: boolean;
  sourcePath: string;
  currentSeasonStats?: any;
};

type NaverParsedLineups = {
  provider: "NAVER_PREVIEW";
  parsed: true;
  home: { starter: NaverParsedPlayer | null; lineup: NaverParsedPlayer[] };
  away: { starter: NaverParsedPlayer | null; lineup: NaverParsedPlayer[] };
  players: NaverParsedPlayer[];
  sourceRootKeys: string[];
};

function unwrapNaverPreviewPayload(payload: any) {
  // Naver gateway commonly wraps the useful payload as { code, success, result }.
  // Only unwrap transport envelopes; never walk into score/result-statistics branches.
  if (!payload || typeof payload !== "object") return payload;
  if (payload.result && typeof payload.result === "object") return payload.result;
  if (payload.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function naverSideFromText(value: unknown): "home" | "away" | null {
  const text = String(value ?? "").toLowerCase();
  if (/(^|[^a-z])(home|홈)([^a-z]|$)/i.test(text)) return "home";
  if (/(^|[^a-z])(away|visitor|원정)([^a-z]|$)/i.test(text)) return "away";
  return null;
}

function parseNaverPreviewLineups(payload: any): NaverParsedLineups | null {
  const root = unwrapNaverPreviewPayload(payload);
  if (!root || typeof root !== "object") return null;

  const isBlockedKey = (key: string) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === "currentseasonstats" || normalized === "seasonstats") return false;
    return /score|winner|statistics|statistic|boxscore|final|gameresult|matchresult|resultscore|inning|runs|hits|errors|pitchcount/i.test(key);
  };
  const playerContext = /lineup|line-up|line_up|starter|starting|pitcher|player|athlete|batter|batting|order|roster|entry|member/i;
  const seen = new Set<any>();
  const rows: NaverParsedPlayer[] = [];

  const visit = (value: any, path: string, inheritedSide: "home" | "away" | null, depth = 0) => {
    if (value == null || depth > 10) return;
    if (Array.isArray(value)) {
      value.slice(0, 60).forEach((item, index) => visit(item, `${path}[${index}]`, inheritedSide, depth + 1));
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    const side =
      naverSideFromText(value?.homeAway ?? value?.side ?? value?.teamSide ?? value?.location) ??
      naverSideFromText(path) ??
      inheritedSide;

    const name = String(
      value?.playerName ?? value?.name ?? value?.memberName ?? value?.athleteName ??
      value?.displayName ?? value?.shortName ?? value?.player?.name ??
      value?.athlete?.name ?? value?.member?.name ?? ""
    ).trim();
    const position = String(
      value?.positionName ?? value?.position ?? value?.pos ?? value?.player?.position ?? ""
    ).trim() || null;
    const role = String(
      value?.role ?? value?.type ?? value?.designation ?? value?.status ?? ""
    ).trim() || null;
    const orderRaw = value?.battingOrder ?? value?.lineupOrder ?? value?.order ?? value?.slot ?? value?.batOrder ?? null;
    const orderNum = Number(orderRaw);
    const order = Number.isFinite(orderNum) && orderNum >= 0 && orderNum <= 20 ? orderNum : null;
    const starterText = `${path} ${role ?? ""} ${position ?? ""} ${String(value?.starter ?? "")} ${String(value?.starting ?? "")}`.toLowerCase();
    const isPitcher = /pitcher|투수|(^|\s)p(\s|$)|sp/.test(starterText);
    const starter = Boolean(value?.starter === true || value?.starting === true || /starter|starting|probable|선발/.test(starterText) || (isPitcher && /lineup|entry/.test(path.toLowerCase())));
    const keyText = Object.keys(value).join(" ").toLowerCase();
    const hasPlayerSignal = playerContext.test(`${path} ${keyText}`) && Boolean(name) && Boolean(side);

    if (hasPlayerSignal && side) {
      rows.push({
        name,
        playerName: name,
        side,
        homeAway: side,
        position,
        positionName: position,
        role,
        order,
        battingOrder: order,
        starter,
        sourcePath: path,
        // 원본 시즌 누적 지표를 보존해 클라이언트의 ERA/WHIP deep parser가
        // 실제 키 구조를 그대로 읽을 수 있게 합니다.
        currentSeasonStats:
          value?.currentSeasonStats ??
          value?.seasonStats ??
          value?.player?.currentSeasonStats ??
          value?.athlete?.currentSeasonStats ??
          null,
      });
    }

    for (const [key, child] of Object.entries(value)) {
      if (isBlockedKey(key) || !child || typeof child !== "object") continue;
      const childSide = naverSideFromText(key) ?? side;
      visit(child, `${path}.${key}`, childSide, depth + 1);
    }
  };

  visit(root, "preview.result", null, 0);

  const unique = new Map<string, NaverParsedPlayer>();
  for (const row of rows) {
    const key = `${row.side}|${normalizeNaverTeamName(row.name)}|${row.order ?? ""}|${row.position ?? ""}`;
    const old = unique.get(key);
    if (!old || (!old.starter && row.starter)) unique.set(key, row);
  }
  const players = [...unique.values()];
  const bySide = (side: "home" | "away") => players.filter((p) => p.side === side);
  const lineup = (side: "home" | "away") => bySide(side)
    .filter((p) => p.order !== null || !/pitcher|투수/i.test(`${p.position ?? ""} ${p.role ?? ""}`))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const starterFor = (side: "home" | "away") =>
    bySide(side).find((p) => p.starter && /pitcher|투수|(^|\s)p(\s|$)|sp/i.test(`${p.position ?? ""} ${p.role ?? ""} ${p.sourcePath}`)) ??
    bySide(side).find((p) => p.starter) ?? null;

  const homeLineup = lineup("home");
  const awayLineup = lineup("away");
  const homeStarter = starterFor("home");
  const awayStarter = starterFor("away");
  if (!players.length && !homeStarter && !awayStarter) return null;

  return {
    provider: "NAVER_PREVIEW",
    parsed: true,
    home: { starter: homeStarter, lineup: homeLineup },
    away: { starter: awayStarter, lineup: awayLineup },
    players,
    sourceRootKeys: Object.keys(root).slice(0, 80),
  };
}


type NaverBatterStatsDiagnostic = {
  season: string;
  path: string;
  status: number | null;
  fetched: number;
  lineupBatters: number;
  playerIdResolved: number;
  matched: number;
  coverage: number;
  matchById: number;
  matchByNameTeam: number;
  unmatched: Array<{
    side: "home" | "away";
    name: string;
    playerId: string | null;
    teamCode: string | null;
  }>;
  error: string | null;
};

function naverPlayerId(value: any): string | null {
  const raw =
    value?.pcode ??
    value?.playerCode ??
    value?.playerId ??
    value?.playerID ??
    value?.id ??
    value?.player?.pcode ??
    value?.player?.playerCode ??
    value?.player?.playerId ??
    value?.player?.id ??
    null;

  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text || null;
}

function naverPlayerName(value: any): string {
  return String(
    value?.name ??
    value?.playerName ??
    value?.playerNm ??
    value?.displayName ??
    value?.player?.name ??
    ""
  ).trim();
}

function naverTeamCode(value: any): string | null {
  const raw =
    value?.teamCode ??
    value?.team?.code ??
    value?.teamId ??
    value?.team?.id ??
    null;
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text || null;
}

function unwrapNaverResult(value: any) {
  if (!value || typeof value !== "object") return value;
  if (value?.result && typeof value.result === "object") return value.result;
  if (value?.data && typeof value.data === "object") return value.data;
  return value;
}

function naverPreviewData(value: any) {
  const root = unwrapNaverPreviewPayload(value);
  return root?.previewData ?? root;
}

function naverDeclaredBatters(
  previewPayload: any,
  side: "home" | "away"
) {
  const data = naverPreviewData(previewPayload);
  const branch =
    side === "home"
      ? data?.homeTeamLineUp ?? data?.homeTeamLineup
      : data?.awayTeamLineUp ?? data?.awayTeamLineup;

  const full =
    branch?.fullLineUp ??
    branch?.fullLineup ??
    branch?.startingLineUp ??
    branch?.startingLineup ??
    [];

  if (!Array.isArray(full)) return [];

  // Naver KBO preview fullLineUp[0] is the starting pitcher.
  return full
    .slice(1, 10)
    .filter((player: any) => Boolean(naverPlayerName(player)));
}

function extractSeasonPlayerStats(payload: any): any[] {
  const root = unwrapNaverResult(payload);
  const candidates = [
    root?.seasonPlayerStats,
    root?.players,
    root?.playerStats,
    payload?.result?.seasonPlayerStats,
    payload?.seasonPlayerStats,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizedPlayerName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function enrichPreviewWithSeasonBattingStats(
  previewPayload: any,
  seasonRows: any[],
  homeTeamCode: string | null,
  awayTeamCode: string | null
) {
  const root = unwrapNaverPreviewPayload(previewPayload);
  const data = root?.previewData ?? root;

  const homeBatters = naverDeclaredBatters(previewPayload, "home");
  const awayBatters = naverDeclaredBatters(previewPayload, "away");

  const idMap = new Map<string, any>();
  const nameTeamMap = new Map<string, any>();
  const nameOnlyMap = new Map<string, any[]>();

  for (const row of seasonRows) {
    const id = naverPlayerId(row);
    const name = normalizedPlayerName(naverPlayerName(row));
    const team = String(naverTeamCode(row) ?? "").toUpperCase();

    if (id) idMap.set(id, row);
    if (name && team) nameTeamMap.set(`${name}|${team}`, row);

    if (name) {
      const list = nameOnlyMap.get(name) ?? [];
      list.push(row);
      nameOnlyMap.set(name, list);
    }
  }

  let playerIdResolved = 0;
  let matched = 0;
  let matchById = 0;
  let matchByNameTeam = 0;
  const unmatched: NaverBatterStatsDiagnostic["unmatched"] = [];

  const attach = (
    player: any,
    side: "home" | "away",
    expectedTeamCode: string | null
  ) => {
    const id = naverPlayerId(player);
    const name = naverPlayerName(player);
    const normalizedName = normalizedPlayerName(name);
    const playerTeam =
      String(
        naverTeamCode(player) ??
        expectedTeamCode ??
        ""
      ).toUpperCase();

    if (id) playerIdResolved += 1;

    let row: any = null;
    let method: "ID" | "NAME_TEAM" | null = null;

    if (id && idMap.has(id)) {
      row = idMap.get(id);
      method = "ID";
    }

    if (!row && normalizedName && playerTeam) {
      row = nameTeamMap.get(`${normalizedName}|${playerTeam}`) ?? null;
      if (row) method = "NAME_TEAM";
    }

    // If team code is absent in one source, accept name-only only when unique.
    if (!row && normalizedName) {
      const sameName = nameOnlyMap.get(normalizedName) ?? [];
      if (sameName.length === 1) {
        row = sameName[0];
        method = "NAME_TEAM";
      }
    }

    if (row) {
      matched += 1;
      if (method === "ID") matchById += 1;
      else matchByNameTeam += 1;

      // Preserve original player object and attach only pregame season cumulative row.
      player.currentSeasonStats = {
        ...(player?.currentSeasonStats && typeof player.currentSeasonStats === "object"
          ? player.currentSeasonStats
          : {}),
        ...row,
      };
      player.seasonStatsSource = "NAVER_SEASON_PLAYERS";
      player.seasonStatsMatch = method;
      player.resolvedPlayerId =
        naverPlayerId(row) ??
        id ??
        null;
    } else {
      unmatched.push({
        side,
        name,
        playerId: id,
        teamCode: playerTeam || null,
      });
    }
  };

  const homeBranch =
    data?.homeTeamLineUp ?? data?.homeTeamLineup;
  const awayBranch =
    data?.awayTeamLineUp ?? data?.awayTeamLineup;

  const homeFull =
    homeBranch?.fullLineUp ??
    homeBranch?.fullLineup ??
    homeBranch?.startingLineUp ??
    homeBranch?.startingLineup;

  const awayFull =
    awayBranch?.fullLineUp ??
    awayBranch?.fullLineup ??
    awayBranch?.startingLineUp ??
    awayBranch?.startingLineup;

  if (Array.isArray(homeFull)) {
    homeFull.slice(1, 10).forEach((player: any) =>
      attach(player, "home", homeTeamCode)
    );
  }

  if (Array.isArray(awayFull)) {
    awayFull.slice(1, 10).forEach((player: any) =>
      attach(player, "away", awayTeamCode)
    );
  }

  return {
    root,
    lineupBatters: homeBatters.length + awayBatters.length,
    playerIdResolved,
    matched,
    matchById,
    matchByNameTeam,
    unmatched,
  };
}

async function getNaverSeasonBatters(
  season: string
) {
  const params =
    new URLSearchParams({
      playerType: "HITTER",
      field: "HRA",
      direction: "DESC",
      pageSize: "500",
      page: "1",
    });

  const path =
    `/statistics/categories/kbo/seasons/${encodeURIComponent(season)}/players?${params.toString()}`;

  const result =
    await naverJson(path);

  return {
    ...result,
    path,
    rows:
      result.ok
        ? extractSeasonPlayerStats(result.data)
        : [],
  };
}

async function getNaverPregameLineups(args: {
  home: string;
  away: string;
  gameDateMs: number;
}): Promise<NaverPregameResult> {
  const date =
    kstDateString(args.gameDateMs);

  const schedulePath =
    `/schedule/games?upperCategoryId=kbaseball&categoryId=kbo&fromDate=${encodeURIComponent(date)}&toDate=${encodeURIComponent(date)}`;

  const schedule =
    await naverJson(schedulePath);

  if (!schedule.ok) {
    return {
      ok: false,
      gameId: null,
      lineups: null,
      error:
        `네이버 일정 조회 실패: ${schedule.error ?? "unknown"}`,
      scheduleStatus:
        schedule.status,
      previewStatus: null,
      matchedGame: null,
      candidates: [],
      previewAudit: null,
      batterStatsDiagnostic: null,
    };
  }

  const targetHome =
    normalizeNaverTeamName(args.home);

  const targetAway =
    normalizeNaverTeamName(args.away);

  const candidates =
    collectNaverGameObjects(
      schedule.data
    );

  const candidateDiagnostics:
    NaverPregameCandidate[] =
      candidates.map(
        (game) => ({
          gameId:
            game.gameId,
          homeName:
            game.homeName,
          awayName:
            game.awayName,
          homeCode:
            game.homeCode ??
            null,
          awayCode:
            game.awayCode ??
            null,
          normalizedHome:
            normalizeNaverTeamName(
              game.homeName
            ),
          normalizedAway:
            normalizeNaverTeamName(
              game.awayName
            ),
        })
      );

  const matched =
    candidates.find(
      (game) => {
        const h =
          normalizeNaverTeamName(
            game.homeName
          );

        const a =
          normalizeNaverTeamName(
            game.awayName
          );

        return (
          (h === targetHome &&
            a === targetAway) ||
          (h === targetAway &&
            a === targetHome)
        );
      }
    ) ?? null;

  if (!matched) {
    return {
      ok: false,
      gameId: null,
      lineups: null,
      error:
        `네이버 일정에서 동일경기 매칭 실패 · 후보 ${candidates.length}개`,
      scheduleStatus:
        schedule.status,
      previewStatus: null,
      matchedGame: null,
      candidates:
        candidateDiagnostics,
      previewAudit: null,
      batterStatsDiagnostic: null,
    };
  }

  const preview =
    await naverJson(
      `/schedule/games/${encodeURIComponent(matched.gameId)}/preview`
    );

  if (!preview.ok) {
    return {
      ok: false,
      gameId:
        matched.gameId,
      lineups: null,
      error:
        `네이버 preview 조회 실패: ${preview.error ?? "unknown"}`,
      scheduleStatus:
        schedule.status,
      previewStatus:
        preview.status,
      matchedGame:
        matched.raw,
      candidates:
        candidateDiagnostics,
      previewAudit: null,
      batterStatsDiagnostic: null,
    };
  }

  const previewAudit =
    inspectNaverPreviewStructure(
      preview.data
    );

  const season =
    String(
      new Date(args.gameDateMs + 9 * 60 * 60 * 1000)
        .getUTCFullYear()
    );

  const batterStats =
    await getNaverSeasonBatters(
      season
    );

  const enriched =
    batterStats.ok
      ? enrichPreviewWithSeasonBattingStats(
          preview.data,
          batterStats.rows,
          matched.homeCode ?? null,
          matched.awayCode ?? null
        )
      : {
          root:
            unwrapNaverPreviewPayload(preview.data),
          lineupBatters:
            naverDeclaredBatters(preview.data, "home").length +
            naverDeclaredBatters(preview.data, "away").length,
          playerIdResolved: 0,
          matched: 0,
          matchById: 0,
          matchByNameTeam: 0,
          unmatched: [
            ...naverDeclaredBatters(preview.data, "home").map((player: any) => ({
              side: "home" as const,
              name: naverPlayerName(player),
              playerId: naverPlayerId(player),
              teamCode: matched.homeCode ?? null,
            })),
            ...naverDeclaredBatters(preview.data, "away").map((player: any) => ({
              side: "away" as const,
              name: naverPlayerName(player),
              playerId: naverPlayerId(player),
              teamCode: matched.awayCode ?? null,
            })),
          ],
        };

  const parsedLineups =
    parseNaverPreviewLineups(
      preview.data
    );

  /*
   * Keep the explicit previewData branch so the client can use the real
   * fullLineUp while also retaining normalized parser output.
   */
  const enrichedLineups = {
    ...(parsedLineups ?? {}),
    previewData:
      enriched.root?.previewData ??
      enriched.root,
    provider: "NAVER_PREVIEW",
    parsed: true,
  };

  const coverage =
    enriched.lineupBatters > 0
      ? enriched.matched / enriched.lineupBatters
      : 0;

  return {
    ok: true,
    gameId:
      matched.gameId,
    lineups:
      enrichedLineups,
    error: null,
    scheduleStatus:
      schedule.status,
    previewStatus:
      preview.status,
    matchedGame:
      matched.raw,
    candidates:
      candidateDiagnostics,
    previewAudit,
    batterStatsDiagnostic: {
      season,
      path:
        batterStats.path,
      status:
        batterStats.status,
      fetched:
        batterStats.rows.length,
      lineupBatters:
        enriched.lineupBatters,
      playerIdResolved:
        enriched.playerIdResolved,
      matched:
        enriched.matched,
      coverage:
        Number(
          coverage.toFixed(4)
        ),
      matchById:
        enriched.matchById,
      matchByNameTeam:
        enriched.matchByNameTeam,
      unmatched:
        enriched.unmatched.slice(0, 18),
      error:
        batterStats.error,
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

  const lineupsResult:
    FixtureLineupsResult =
      Number.isFinite(fixtureId)
        ? await getFixtureLineups(
            fixtureId,
            key
          )
        : {
            ok: false,
            data: null,
            error:
              "fixtureId 없음",
            status: null,
            retryAfterMs: null,
            rateLimit: null,
          };

  const naverPregame =
    sport === "야구" &&
    Number.isFinite(gameDateMs)
      ? await getNaverPregameLineups({
          home,
          away,
          gameDateMs,
        })
      : {
          ok: false,
          gameId: null,
          lineups: null,
          error:
            "야구 또는 유효한 경기시각이 아님",
          scheduleStatus: null,
          previewStatus: null,
          matchedGame: null,
          candidates: [],
          previewAudit: null,
          batterStatsDiagnostic: null,
        };

  // V12.3: HTTP/endpoint success is not enough.
  // SportsAPI only gets priority when its payload contains an actual named player record.
  const sportsApiLineupsUsable =
    lineupsResult.ok &&
    (() => {
      const stack: any[] =
        [lineupsResult.data];
      const seen =
        new Set<any>();

      while (stack.length > 0) {
        const value =
          stack.pop();

        if (
          !value ||
          typeof value !== "object" ||
          seen.has(value)
        ) {
          continue;
        }

        seen.add(value);

        if (Array.isArray(value)) {
          stack.push(...value);
          continue;
        }

        const keyText =
          Object.keys(value)
            .join(" ")
            .toLowerCase();

        const playerName =
          String(
            value?.playerName ??
            value?.player?.name ??
            value?.athlete?.name ??
            (
              /player|athlete|batter|pitcher|starter|roster|lineup/.test(
                keyText
              )
                ? value?.name
                : ""
            ) ??
            ""
          ).trim();

        if (
          playerName &&
          /player|athlete|batter|pitcher|starter|roster|lineup|position|batting|order/.test(
            keyText
          )
        ) {
          return true;
        }

        for (
          const child of
            Object.values(value)
        ) {
          if (
            child &&
            typeof child === "object"
          ) {
            stack.push(child);
          }
        }
      }

      return false;
    })();

  const selectedLineups =
    sportsApiLineupsUsable
      ? lineupsResult.data
      : naverPregame.ok
        ? naverPregame.lineups
        : null;

  const selectedLineupsSource =
    sportsApiLineupsUsable
      ? "SPORTSAPI"
      : naverPregame.ok
        ? "NAVER_PREVIEW"
        : "NONE";

  return Response.json({
    ok:true,
    mode:"selected",
    matched:true,
    fixtureId,
    selectedFixture:summarizeFixture(fixture),
    fixture,
    detail:null,
    lineups:
      selectedLineups,
    lineupsSource:
      selectedLineupsSource,
    sportsApiLineupsUsable,
    naverPregame: {
      ok:
        naverPregame.ok,
      gameId:
        naverPregame.gameId,
      error:
        naverPregame.error,
      scheduleStatus:
        naverPregame.scheduleStatus,
      previewStatus:
        naverPregame.previewStatus,
      candidates:
        naverPregame.candidates,
      previewAudit:
        naverPregame.previewAudit,
      batterStatsDiagnostic:
        naverPregame.batterStatsDiagnostic,
    },
    statistics:null,
    h2h:null,
    debug:{
      message:
        selectedLineupsSource === "SPORTSAPI"
          ? "선택 경기 매칭 + SportsAPI 공식 lineups 조회 완료"
          : selectedLineupsSource === "NAVER_PREVIEW"
            ? "선택 경기 매칭 + 네이버스포츠 경기전 preview 선발/라인업 복원"
            : "선택 경기 매칭 완료 · 선발/라인업 미수신",
      sportsApi:result.debug,
      sportsApiRuntime:{
        baseUrl:
          BASE,
        fixtureDetailPath:
          `/fixtures/${fixtureId}`,
        fixtureDetailUrl:
          sportsApiDiagnosticUrl(
            `/fixtures/${fixtureId}`
          ),
        lineupsPath:
          `/fixtures/${fixtureId}/lineups`,
        lineupsUrl:
          sportsApiDiagnosticUrl(
            `/fixtures/${fixtureId}/lineups`
          ),
        selectedFixtureTopKeys:
          fixture &&
          typeof fixture === "object"
            ? Object.keys(
                fixture
              ).slice(0, 60)
            : [],
      },
      naverPregame:{
        ok:
          naverPregame.ok,
        gameId:
          naverPregame.gameId,
        error:
          naverPregame.error,
        scheduleStatus:
          naverPregame.scheduleStatus,
        previewStatus:
          naverPregame.previewStatus,
        candidates:
          naverPregame.candidates,
        previewAudit:
          naverPregame.previewAudit,
        batterStatsDiagnostic:
          naverPregame.batterStatsDiagnostic,
        source:
          "https://api-gw.sports.naver.com",
        schedulePath:
          Number.isFinite(gameDateMs)
            ? `/schedule/games?upperCategoryId=kbaseball&categoryId=kbo&fromDate=${kstDateString(gameDateMs)}&toDate=${kstDateString(gameDateMs)}`
            : null,
        previewPath:
          naverPregame.gameId
            ? `/schedule/games/${naverPregame.gameId}/preview`
            : null,
      },
      lineups:{
        ok:
          selectedLineups !== null,
        source:
          selectedLineupsSource,
        sportsApiOk:
          lineupsResult.ok,
        error:
          lineupsResult.error,
        status:
          lineupsResult.status,
        path:
          `/fixtures/${fixtureId}/lineups`,
        url:
          sportsApiDiagnosticUrl(
            `/fixtures/${fixtureId}/lineups`
          ),
        rateLimit:
          lineupsResult.rateLimit,
        dataType:
          Array.isArray(
            lineupsResult.data
          )
            ? "array"
            : lineupsResult.data &&
                typeof lineupsResult.data === "object"
              ? "object"
              : typeof lineupsResult.data,
        topKeys:
          lineupsResult.data &&
          typeof lineupsResult.data === "object" &&
          !Array.isArray(lineupsResult.data)
            ? Object.keys(
                lineupsResult.data
              ).slice(0, 30)
            : [],
        arrayCount:
          Array.isArray(
            lineupsResult.data
          )
            ? lineupsResult.data.length
            : null,
      },
      runtimeShape:{
        selectedFixture:
          safeFixtureTeamDebug(fixture),
      },
    },
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
          runtimeShape:{
            selectedFixture:
              safeFixtureTeamDebug(fixture),
          },
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
