const BASE = "https://api.sportsapi.app/v2";

function arr(x: any): any[] {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
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

async function searchTeam(name: string, key: string) {
  const variants = [
    name,
    name === "콜로라도" ? "Colorado Rockies" : name,
    name === "클리블랜드" ? "Cleveland Guardians" : name,
  ];

  const attempts: any[] = [];

  for (const q of [...new Set(variants)]) {
    try {
      const raw = await api(
        `/search?q=${encodeURIComponent(q)}`,
        key
      );

      const results = arr(raw);

      const teams = results.filter(
        (x: any) => x.type === "team"
      );

      attempts.push({
        query: q,
        totalResults: results.length,
        teams: teams.slice(0, 10).map((x: any) => ({
          id: x.id,
          name: x.name,
          type: x.type,
          sport: x.sport,
          league: x.league,
        })),
      });

      if (teams.length) {
        return {
          team: teams[0],
          attempts,
        };
      }
    } catch (e: any) {
      attempts.push({
        query: q,
        error: e?.message || "검색 오류",
      });
    }
  }

  return {
    team: null,
    attempts,
  };
}

function namesMatch(f: any, h: any, a: any) {
  const homeId = f?.home?.id;
  const awayId = f?.away?.id;

  return (
    (homeId === h.id && awayId === a.id) ||
    (homeId === a.id && awayId === h.id)
  );
}

function score(f: any, side: "home" | "away") {
  const s =
    f?.[side + "Score"] ||
    f?.score?.[side] ||
    {};

  return (
    s?.current ??
    s?.display ??
    s?.normaltime ??
    null
  );
}

function summarizeFixture(f: any) {
  return {
    id: f?.id ?? null,
    startTime: f?.startTime ?? null,
    status: f?.status ?? null,
    home: f?.home?.name ?? null,
    homeId: f?.home?.id ?? null,
    away: f?.away?.name ?? null,
    awayId: f?.away?.id ?? null,
    homeScore: score(f, "home"),
    awayScore: score(f, "away"),
  };
}

export async function GET(req: Request) {
  const key = process.env.SPORTSAPI_KEY;

  if (!key) {
    return Response.json(
      {
        ok: false,
        error: "SPORTSAPI_KEY가 설정되지 않았습니다.",
      },
      { status: 503 }
    );
  }

  const u = new URL(req.url);

  const home =
    u.searchParams.get("home") || "";

  const away =
    u.searchParams.get("away") || "";

  const sport =
    u.searchParams.get("sport") || "";

  if (!home || !away) {
    return Response.json(
      {
        ok: false,
        error: "home/away가 필요합니다.",
      },
      { status: 400 }
    );
  }

  try {
    // 1. 팀 검색
    const [homeSearch, awaySearch] =
      await Promise.all([
        searchTeam(home, key),
        searchTeam(away, key),
      ]);

    const ht = homeSearch.team;
    const at = awaySearch.team;

    if (!ht || !at) {
      return Response.json({
        ok: false,
        matched: false,
        error:
          "SportsAPI에서 두 팀을 정확하게 찾지 못했습니다.",
        requested: {
          home,
          away,
          sport,
        },
        debug: {
          homeSearch: homeSearch.attempts,
          awaySearch: awaySearch.attempts,
        },
      });
    }

    // 2. 각 팀의 예정 경기 조회
    const [hf, af] =
      await Promise.all([
        api(
          `/teams/${ht.id}/fixtures?type=upcoming&page=0`,
          key
        ),
        api(
          `/teams/${at.id}/fixtures?type=upcoming&page=0`,
          key
        ),
      ]);

    const homeUpcoming = arr(hf);
    const awayUpcoming = arr(af);

    // 3. 두 팀이 서로 상대하는 경기 찾기
    const candidates = [
      ...homeUpcoming,
      ...awayUpcoming,
    ]
      .filter((f: any) =>
        namesMatch(f, ht, at)
      )
      .sort((a: any, b: any) =>
        String(a?.startTime || "").localeCompare(
          String(b?.startTime || "")
        )
      );

    let fixture =
      candidates[0] || null;

    // 4. 예정 경기에서 못 찾으면 live 경기 확인
    let liveMatches: any[] = [];

    if (!fixture) {
      try {
        const live = await api(
          `/livescores${
            sport
              ? `?sport=${encodeURIComponent(sport)}`
              : ""
          }`,
          key
        );

        const liveGames = arr(live);

        liveMatches = liveGames.filter(
          (f: any) =>
            namesMatch(f, ht, at)
        );

        fixture =
          liveMatches[0] || null;
      } catch (e: any) {
        liveMatches = [
          {
            error:
              e?.message ||
              "livescores 조회 실패",
          },
        ];
      }
    }

    // 5. 경기 매칭 실패
    if (!fixture) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "두 팀 사이의 예정/진행 경기를 SportsAPI에서 찾지 못했습니다.",

        requested: {
          home,
          away,
          sport,
        },

        teams: {
          home: {
            id: ht.id,
            name: ht.name,
            sport: ht.sport,
            league: ht.league,
          },

          away: {
            id: at.id,
            name: at.name,
            sport: at.sport,
            league: at.league,
          },
        },

        debug: {
          homeUpcomingCount:
            homeUpcoming.length,

          awayUpcomingCount:
            awayUpcoming.length,

          matchingCandidates:
            candidates.map(
              summarizeFixture
            ),

          liveMatches:
            liveMatches.map(
              summarizeFixture
            ),

          homeUpcomingSample:
            homeUpcoming
              .slice(0, 10)
              .map(summarizeFixture),

          awayUpcomingSample:
            awayUpcoming
              .slice(0, 10)
              .map(summarizeFixture),
        },
      });
    }

    // 6. 실제 fixture 상세 데이터 수집
    const id = fixture.id;

    const [
      detail,
      lineups,
      statistics,
      h2h,
      homeRecent,
      awayRecent,
    ] = await Promise.all([
      api(`/fixtures/${id}`, key).catch(
        () => null
      ),

      api(
        `/fixtures/${id}/lineups`,
        key
      ).catch(() => null),

      api(
        `/fixtures/${id}/statistics`,
        key
      ).catch(() => null),

      api(
        `/fixtures/${id}/h2h`,
        key
      ).catch(() => null),

      api(
        `/teams/${ht.id}/fixtures?type=recent&page=0`,
        key
      ).catch(() => null),

      api(
        `/teams/${at.id}/fixtures?type=recent&page=0`,
        key
      ).catch(() => null),
    ]);

    // 7. 최근 경기 요약
    const homeRecentList =
      arr(homeRecent)
        .slice(0, 20)
        .map(summarizeFixture);

    const awayRecentList =
      arr(awayRecent)
        .slice(0, 20)
        .map(summarizeFixture);

    // 8. 정상 응답
    return Response.json({
      ok: true,
      matched: true,

      fixtureId: id,

      sport,

      requested: {
        home,
        away,
      },

      teams: {
        home: ht,
        away: at,
      },

      fixture,

      detail,

      lineups,

      statistics,

      h2h,

      recent: {
        home: arr(homeRecent).slice(
          0,
          20
        ),

        away: arr(awayRecent).slice(
          0,
          20
        ),
      },

      recentSummary: {
        home: homeRecentList,
        away: awayRecentList,
      },

      debug: {
        homeUpcomingCount:
          homeUpcoming.length,

        awayUpcomingCount:
          awayUpcoming.length,

        matchingCandidates:
          candidates.map(
            summarizeFixture
          ),
      },
    });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        matched: false,

        error:
          e?.message ||
          "match lookup failed",

        requested: {
          home,
          away,
          sport,
        },
      },
      { status: 502 }
    );
  }
}
