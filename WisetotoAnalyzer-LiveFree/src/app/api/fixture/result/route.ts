// V13.3.9 validation-only result endpoint. PRE prediction must be locked before this route is called.
// This route is intentionally separate from the prediction path and is called
// only after the user explicitly locks the prediction and opens validation.

type AnyObj = Record<string, any>;

function num(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function directScorePair(node: any) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;

  const directPairs = [
    ["homeScore", "awayScore"],
    ["home_score", "away_score"],
    ["scoreHome", "scoreAway"],
    ["homeGoals", "awayGoals"],
    ["homeRuns", "awayRuns"],
    ["localteamScore", "visitorteamScore"],
  ];

  for (const [homeKey, awayKey] of directPairs) {
    const homeScore = num(node?.[homeKey]);
    const awayScore = num(node?.[awayKey]);
    if (homeScore !== null && awayScore !== null && homeScore >= 0 && awayScore >= 0) {
      return { homeScore, awayScore, pathHint: `${homeKey}/${awayKey}` };
    }
  }

  const pairFromContainer = (container: any, hint: string) => {
    if (!container || typeof container !== "object" || Array.isArray(container)) return null;

    const simplePairs = [
      ["home", "away"],
      ["localteam", "visitorteam"],
      ["homeTeam", "awayTeam"],
    ];

    for (const [homeKey, awayKey] of simplePairs) {
      const directHome = num(container?.[homeKey]);
      const directAway = num(container?.[awayKey]);
      if (directHome !== null && directAway !== null && directHome >= 0 && directAway >= 0) {
        return { homeScore: directHome, awayScore: directAway, pathHint: `${hint}.${homeKey}/${awayKey}` };
      }

      const homeNode = container?.[homeKey];
      const awayNode = container?.[awayKey];
      if (homeNode && awayNode && typeof homeNode === "object" && typeof awayNode === "object") {
        for (const key of ["total", "current", "overall", "score", "runs", "goals", "points"]) {
          const homeScore = num(homeNode?.[key]);
          const awayScore = num(awayNode?.[key]);
          if (homeScore !== null && awayScore !== null && homeScore >= 0 && awayScore >= 0) {
            return { homeScore, awayScore, pathHint: `${hint}.${homeKey}.${key}/${awayKey}.${key}` };
          }
        }
      }
    }

    return null;
  };

  for (const [key, hint] of [
    ["score", "score"],
    ["scores", "scores"],
    ["goals", "goals"],
    ["result", "result"],
    ["finalScore", "finalScore"],
    ["fullTime", "fullTime"],
    ["fulltime", "fulltime"],
  ] as const) {
    const pair = pairFromContainer(node?.[key], hint);
    if (pair) return pair;
  }

  const nestedFullTime =
    node?.score?.fullTime ??
    node?.score?.fulltime ??
    node?.scores?.fullTime ??
    node?.scores?.fulltime ??
    node?.result?.fullTime ??
    node?.result?.fulltime ??
    null;

  const fullTimePair = pairFromContainer(nestedFullTime, "fullTime");
  if (fullTimePair) return fullTimePair;

  return null;
}

function findFinalScore(root: any) {
  const seen = new Set<any>();
  const queue: Array<{ value: any; path: string; depth: number }> = [{ value: root, path: "root", depth: 0 }];
  const candidates: any[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (!current.value || typeof current.value !== "object" || seen.has(current.value) || current.depth > 7) continue;
    seen.add(current.value);

    const pair = directScorePair(current.value);
    if (pair) {
      const pathText = `${current.path} ${pair.pathHint}`.toLowerCase();
      const priority = /final|result|fixture|match|score/.test(pathText) ? 2 : 1;
      const penalty = /inning|period|quarter|half|set/.test(pathText) ? 2 : 0;
      candidates.push({ ...pair, path: current.path, rank: priority - penalty });
    }

    if (Array.isArray(current.value)) {
      current.value.slice(0, 80).forEach((child, index) => queue.push({ value: child, path: `${current.path}[${index}]`, depth: current.depth + 1 }));
    } else {
      for (const [key, child] of Object.entries(current.value as AnyObj)) {
        if (/lineup|statistics|player|odds|prediction/i.test(key)) continue;
        if (child && typeof child === "object") queue.push({ value: child, path: `${current.path}.${key}`, depth: current.depth + 1 });
      }
    }
  }

  return candidates.sort((a,b) => b.rank - a.rank)[0] ?? null;
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const key = process.env.SPORTSAPI_KEY;
  if (!key) return Response.json({ ok: false, error: "SPORTSAPI_KEY가 설정되지 않았습니다." }, { status: 503 });
  if (!id) return Response.json({ ok: false, error: "fixture id가 필요합니다." }, { status: 400 });

  try {
    const response = await fetch(`https://api.sportsapi.app/v2/fixtures/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const text = await response.text();
    let payload: any = null;
    try { payload = JSON.parse(text); } catch {}
    if (!response.ok || !payload) {
      return Response.json({ ok: false, error: `SportsAPI fixture 결과 조회 실패 · HTTP ${response.status}` }, { status: response.status || 502 });
    }

    const score = findFinalScore(payload);
    if (!score) {
      const rootKeys =
        payload && typeof payload === "object"
          ? Object.keys(payload).slice(0, 30)
          : [];
      const dataKeys =
        payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
          ? Object.keys(payload.data).slice(0, 30)
          : [];
      return Response.json({
        ok: false,
        error: "SportsAPI Fixture 응답에서 최종 홈/원정 점수를 찾지 못했습니다.",
        fixtureId: id,
        debug: {
          rootKeys,
          dataKeys,
          validationOnly: true,
        },
      }, { status: 422 });
    }

    return Response.json({
      ok: true,
      fixtureId: id,
      result: {
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        firstHalfHomeScore: null,
        firstHalfAwayScore: null,
      },
      audit: {
        validationOnly: true,
        resultReadAfterExplicitUserAction: true,
        scorePath: score.path,
      },
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message ?? "SportsAPI 결과 조회 실패" }, { status: 500 });
  }
}
