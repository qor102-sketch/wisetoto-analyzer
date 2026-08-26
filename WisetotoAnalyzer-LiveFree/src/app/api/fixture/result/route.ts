// V13.2.1 validation-only result endpoint.
// This route is intentionally separate from the prediction path and is called
// only after the user explicitly locks the prediction and opens validation.

type AnyObj = Record<string, any>;

function num(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function directScorePair(node: any) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;

  const pairs = [
    ["homeScore", "awayScore"],
    ["home_score", "away_score"],
    ["scoreHome", "scoreAway"],
    ["homeGoals", "awayGoals"],
    ["homeRuns", "awayRuns"],
  ];

  for (const [homeKey, awayKey] of pairs) {
    const homeScore = num(node?.[homeKey]);
    const awayScore = num(node?.[awayKey]);
    if (homeScore !== null && awayScore !== null && homeScore >= 0 && awayScore >= 0) {
      return { homeScore, awayScore, pathHint: `${homeKey}/${awayKey}` };
    }
  }

  const score = node?.score ?? node?.scores ?? null;
  if (score && typeof score === "object" && !Array.isArray(score)) {
    const homeScore = num(score?.home ?? score?.homeScore ?? score?.localteam ?? score?.homeTeam);
    const awayScore = num(score?.away ?? score?.awayScore ?? score?.visitorteam ?? score?.awayTeam);
    if (homeScore !== null && awayScore !== null && homeScore >= 0 && awayScore >= 0) {
      return { homeScore, awayScore, pathHint: "score.home/away" };
    }
  }

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
      return Response.json({ ok: false, error: "SportsAPI Fixture 응답에서 최종 홈/원정 점수를 찾지 못했습니다.", fixtureId: id }, { status: 422 });
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
