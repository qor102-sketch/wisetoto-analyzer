const BASE = "https://api.sportsapi.app/v2";

function arr(x: any): any[] {
  return Array.isArray(x)
    ? x
    : Array.isArray(x?.data)
      ? x.data
      : [];
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

function normalizeName(name: any) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function sportMatches(team: any, sport: string) {
  const wanted = String(sport || "").toLowerCase();

  const value = String(
    team?.sport ||
    team?.sportType ||
    team?.category ||
    ""
  ).toLowerCase();

  if (!wanted) return true;

  const aliases: Record<string, string[]> = {
    baseball: ["baseball"],
    football: ["football", "soccer"],
    basketball: ["basketball"],
    volleyball: ["volleyball"],
  };

  return (aliases[wanted] || [wanted]).some(
    x => value.includes(x)
  );
}

/*
 * 검색 결과에서 팀 후보를 찾는다.
 *
 * 중요한 점:
 * 특정 팀명을 코드에 넣지 않는다.
 *
 * 먼저:
 *   "콜로라도 MLB"
 * 를 검색하고,
 * 안 나오면:
 *   "콜로라도"
 * 를 검색한다.
 */
async function searchTeam(
  name: string,
  sport: string,
  league: string,
  key: string
) {
  const queries = [
    `${name} ${league}`,
    `${name} ${sport}`,
    name,
  ];

  const attempts: any[] = [];

  for (const q of [...new Set(queries)]) {
    try {
      const raw = await api(
        `/search?q=${encodeURIComponent(q)}`,
        key
      );

      const results = arr(raw);

      const teams = results.filter(
        (x: any) => x?.type === "team"
      );

      const sportTeams = teams.filter(
        (x: any) =>
          sportMatches(x, sport)
      );

      attempts.push({
        query: q,
        totalResults: results.length,

        teams: teams.slice(0, 30).map(
          (x: any) => ({
            id: x?.id,
            name: x?.name,
            sport: x?.sport,
            league:
              x?.league?.name ??
              x?.league ??
              null,
          })
        ),

        sportTeams:
          sportTeams.slice(0, 30).map(
            (x: any) => ({
              id: x?.id,
              name: x?.name,
              sport: x?.sport,
              league:
                x?.league?.name ??
                x?.league ??
                null,
            })
          ),
      });

      if (sportTeams.length > 0) {
        const target =
          normalizeName(name);

        sportTeams.sort(
          (a: any, b: any) => {
            const an =
              normalizeName(a?.name);

            const bn =
              normalizeName(b?.name);

            const aExact =
              an === target ? 1 : 0;

            const bExact =
              bn === target ? 1 : 0;

            return bExact - aExact;
          }
        );

        return {
          team: sportTeams[0],
          attempts,
        };
      }
    } catch (e: any) {
      attempts.push({
        query: q,
        error:
          e?.message ||
          "검색 오류",
      });
    }
  }

  return {
    team: null,
    attempts,
  };
}

function isNotStarted(f: any) {
  const status = f?.status;

  if (!status) return false;

  const type =
    String(
      status?.type || ""
    ).toLowerCase();

  const description =
    String(
      status?.description || ""
    ).toLowerCase();

  return (
    type === "notstarted" ||
    type === "scheduled" ||
    type === "pending" ||
    description.includes("not started") ||
    description.includes("scheduled") ||
    Number(status?.code) === 0
  );
}

function namesMatch(
  f: any,
  homeTeam: any,
  awayTeam: any
) {
  const homeId =
    f?.home?.id;

  const awayId =
    f?.away?.id;

  return (
    (homeId === homeTeam.id &&
      awayId === awayTeam.id) ||
    (homeId === awayTeam.id &&
      awayId === homeTeam.id)
  );
}

function leagueMatches(
  f: any,
  league: string
) {
  if (!league) return true;

  const target =
    normalizeName(league);

  const values = [
    f?.league?.name,
    f?.league?.slug,
    f?.tournament?.name,
    f?.tournament?.slug,
  ]
    .filter(Boolean)
    .map(normalizeName);

  return values.some(
    x =>
      x === target ||
      x.includes(target) ||
      target.includes(x)
  );
}

function score(
  f: any,
  side: "home" | "away"
) {
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

    league:
      f?.league?.name ??
      f?.league ??
      null,

    homeScore:
      score(f, "home"),

    awayScore:
      score(f, "away"),
  };
}

export async function GET(req: Request) {
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

  const u =
    new URL(req.url);

  const home =
    u.searchParams.get("home") || "";

  const away =
    u.searchParams.get("away") || "";

  const sport =
    u.searchParams.get("sport") || "";

  const league =
    u.searchParams.get("league") || "";

  if (!home || !away) {
    return Response.json(
      {
        ok: false,
        error:
          "home/away가 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (!sport) {
    return Response.json(
      {
        ok: false,
        error:
          "sport가 필요합니다.",
      },
      { status: 400 }
    );
  }

  try {
    /*
     * 1. 팀 자동 검색
     *
     * 검색:
     *   팀명 + 리그
     *   팀명 + 스포츠
     *   팀명
     */
    const [
      homeSearch,
      awaySearch,
    ] = await Promise.all([
      searchTeam(
        home,
        sport,
        league,
        key
      ),

      searchTeam(
        away,
        sport,
        league,
        key
      ),
    ]);

    const ht =
      homeSearch.team;

    const at =
      awaySearch.team;

    if (!ht || !at) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "SportsAPI에서 해당 스포츠의 두 팀을 찾지 못했습니다.",

        requested: {
          home,
          away,
          sport,
          league,
        },

        debug: {
          homeSearch:
            homeSearch.attempts,

          awaySearch:
            awaySearch.attempts,
        },
      });
    }

    /*
     * 2. 두 팀의 예정 경기 가져오기
     */
    const [
      homeFixturesRaw,
      awayFixturesRaw,
    ] = await Promise.all([
      api(
        `/teams/${ht.id}/fixtures?type=upcoming&page=0`,
        key
      ),

      api(
        `/teams/${at.id}/fixtures?type=upcoming&page=0`,
        key
      ),
    ]);

    const homeFixtures =
      arr(homeFixturesRaw);

    const awayFixtures =
      arr(awayFixturesRaw);

    /*
     * 3. 두 팀이 실제로 맞붙는
     *    경기만 남긴다.
     */
    const matching =
      [
        ...homeFixtures,
        ...awayFixtures,
      ]
        .filter(
          (f: any) =>
            namesMatch(
              f,
              ht,
              at
            )
        );

    /*
     * 4. 리그가 전달된 경우
     *    리그도 확인한다.
     */
    const leagueCandidates =
      matching.filter(
        (f: any) =>
          leagueMatches(
            f,
            league
          )
      );

    /*
     * 5. 시작 전 경기만 사용
     */
    const candidates =
      leagueCandidates
        .filter(
          (f: any) =>
            isNotStarted(f)
        )
        .sort(
          (a: any, b: any) =>
            String(
              a?.startTime || ""
            ).localeCompare(
              String(
                b?.startTime || ""
              )
            )
        );

    const fixture =
      candidates[0] || null;

    if (!fixture) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "두 팀 사이에 현재 분석 가능한 경기(아직 시작하지 않은 경기)를 찾지 못했습니다.",

        requested: {
          home,
          away,
          sport,
          league,
        },

        teams: {
          home: {
            id: ht.id,
            name: ht.name,
            sport: ht.sport,
          },

          away: {
            id: at.id,
            name: at.name,
            sport: at.sport,
          },
        },

        debug: {
          homeUpcomingCount:
            homeFixtures.length,

          awayUpcomingCount:
            awayFixtures.length,

          allMatching:
            matching.map(
              summarizeFixture
            ),

          leagueCandidates:
            leagueCandidates.map(
              summarizeFixture
            ),

          finalCandidates:
            candidates.map(
              summarizeFixture
            ),
        },
      });
    }

    /*
     * 6. 실제 경기 상세 데이터
     */
    const id =
      fixture.id;

    const [
      detail,
      lineups,
      statistics,
      h2h,
      homeRecent,
      awayRecent,
    ] = await Promise.all([
      api(
        `/fixtures/${id}`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${id}/lineups`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${id}/statistics`,
        key
      ).catch(
        () => null
      ),

      api(
        `/fixtures/${id}/h2h`,
        key
      ).catch(
        () => null
      ),

      api(
        `/teams/${ht.id}/fixtures?type=recent&page=0`,
        key
      ).catch(
        () => null
      ),

      api(
        `/teams/${at.id}/fixtures?type=recent&page=0`,
        key
      ).catch(
        () => null
      ),
    ]);

    const homeRecentList =
      arr(homeRecent)
        .slice(0, 20)
        .map(
          summarizeFixture
        );

    const awayRecentList =
      arr(awayRecent)
        .slice(0, 20)
        .map(
          summarizeFixture
        );

    return Response.json({
      ok: true,

      matched: true,

      fixtureId: id,

      sport,

      league,

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
        home:
          arr(homeRecent)
            .slice(0, 20),

        away:
          arr(awayRecent)
            .slice(0, 20),
      },

      recentSummary: {
        home:
          homeRecentList,

        away:
          awayRecentList,
      },

      debug: {
        selectedHomeTeam: {
          id: ht.id,
          name: ht.name,
          sport: ht.sport,
        },

        selectedAwayTeam: {
          id: at.id,
          name: at.name,
          sport: at.sport,
        },

        requestedLeague:
          league,

        candidateCount:
          candidates.length,
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
          league,
        },
      },
      { status: 502 }
    );
  }
}
