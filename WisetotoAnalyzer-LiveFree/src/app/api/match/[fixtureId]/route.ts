const BASE = "https://api.sportsapi.app/v2";

type AnyObj = Record<string, any>;

const REQUEST_INTERVAL_MS = 6500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestAt = 0;

async function waitForRateLimitSlot() {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < REQUEST_INTERVAL_MS) {
    await sleep(REQUEST_INTERVAL_MS - elapsed);
  }

  lastRequestAt = Date.now();
}

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

async function api(path: string, key: string) {
  await waitForRateLimitSlot();

  const response = await fetch(BASE + path, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    json = {
      raw: text,
    };
  }

  const rateLimit = {
    limit: response.headers.get("ratelimit-limit"),
    remaining: response.headers.get("ratelimit-remaining"),
    reset: response.headers.get("ratelimit-reset"),
  };

  if (response.status === 429) {
    const error = new Error(
      json?.error?.message ||
        json?.message ||
        "SportsAPI rate limit exceeded"
    ) as Error & {
      status?: number;
      retryAfterMs?: number;
    };

    error.status = 429;
    error.retryAfterMs = getRetryAfterMs(response);

    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      json?.error?.message ||
        json?.message ||
        `SportsAPI ${response.status}`
    ) as Error & {
      status?: number;
    };

    error.status = response.status;

    throw error;
  }

  return {
    data: json?.data ?? json,
    meta: json?.meta ?? null,
    rateLimit,
  };
}

function isFutureFixture(fixture: AnyObj) {
  const status = fixture?.status;

  if (!status) {
    return false;
  }

  const type = String(
    status?.type || ""
  ).toLowerCase();

  const description = String(
    status?.description || ""
  ).toLowerCase();

  const code = Number(status?.code);

  const notStarted =
    type === "notstarted" ||
    type === "scheduled" ||
    type === "pending" ||
    description.includes("not started") ||
    description.includes("scheduled") ||
    code === 0;

  if (!notStarted) {
    return false;
  }

  const timestamp = new Date(
    fixture?.startTime
  ).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

function summarizeFixture(fixture: AnyObj) {
  return {
    id: fixture?.id ?? null,

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

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      fixtureId: string;
    }>;
  }
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

  const { fixtureId } =
    await context.params;

  const id = Number(fixtureId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "올바른 fixtureId가 필요합니다.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /**
     * ================================================
     * 1. FIXTURE DETAIL
     * ================================================
     */

    const result = await api(
      `/fixtures/${id}`,
      key
    );

    const fixture = result.data;

    if (!fixture) {
      return Response.json(
        {
          ok: false,
          fixtureId: id,
          error:
            "Fixture 데이터를 찾지 못했습니다.",
        },
        {
          status: 404,
        }
      );
    }

    const future =
      isFutureFixture(fixture);

    /**
     * ================================================
     * 2. H2H
     * ================================================
     */

    let h2h: any = null;

    let h2hStatus: AnyObj = {
      ok: false,
      error: null,
    };

    try {
      const h2hResult = await api(
        `/fixtures/${id}/h2h`,
        key
      );

      h2h = h2hResult.data;

      h2hStatus = {
        ok: true,
        error: null,
        rateLimit:
          h2hResult.rateLimit,
      };
    } catch (e: any) {
      console.error(
        "H2H 조회 실패:",
        e?.message
      );

      h2hStatus = {
        ok: false,
        error:
          e?.message ||
          "H2H 조회 실패",
        status:
          e?.status ?? null,
        retryAfterMs:
          e?.retryAfterMs ?? null,
      };
    }

    /**
     * ================================================
     * 3. STATISTICS
     * ================================================
     */

    let statistics: any = null;

    let statisticsStatus: AnyObj = {
      ok: false,
      error: null,
    };

    try {
      const statisticsResult =
        await api(
          `/fixtures/${id}/statistics`,
          key
        );

      statistics =
        statisticsResult.data;

      statisticsStatus = {
        ok: true,
        error: null,
        rateLimit:
          statisticsResult.rateLimit,
      };
    } catch (e: any) {
      console.error(
        "Statistics 조회 실패:",
        e?.message
      );

      statisticsStatus = {
        ok: false,
        error:
          e?.message ||
          "Statistics 조회 실패",
        status:
          e?.status ?? null,
        retryAfterMs:
          e?.retryAfterMs ?? null,
      };
    }

    /**
     * ================================================
     * 4. LINEUPS
     * ================================================
     *
     * 아직 호출하지 않습니다.
     * API 요청량을 줄이기 위해 다음 단계에서 추가합니다.
     */

    const lineups = null;

    /**
     * ================================================
     * 5. RESPONSE
     * ================================================
     */

    return Response.json({
      ok: true,

      fixtureId: id,

      future,

      selectedFixture:
        summarizeFixture(
          fixture
        ),

      fixture,

      lineups,

      statistics,

      h2h,

      debug: {
        message:
          "fixture detail + H2H + statistics 조회 완료",

        endpoint:
          `/v2/fixtures/${id}`,

        endpointStatus: {
          detail: {
            ok: true,
            rateLimit:
              result.rateLimit,
          },

          h2h:
            h2hStatus,

          statistics:
            statisticsStatus,

          lineups: {
            ok: false,
            error:
              "아직 호출하지 않음",
          },
        },

        nextStep:
          "statistics 확인 후 lineups 추가",
      },
    });
  } catch (e: any) {
    const status =
      e?.status ?? 502;

    return Response.json(
      {
        ok: false,

        fixtureId: id,

        error:
          e?.message ||
          "fixture detail 조회 실패",

        status,

        retryAfterMs:
          e?.retryAfterMs ?? null,
      },
      {
        status:
          status === 429
            ? 429
            : 502,
      }
    );
  }
}
