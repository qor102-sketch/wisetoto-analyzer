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

/*
 * WiseToto에서 사용하는 스포츠 이름과
 * SportsAPI 검색 결과의 스포츠 이름을 연결한다.
 */
function sportMatches(team: any, sport: string) {
  const wanted = String(sport || "").toLowerCase();

  const values = [
    team?.sport,
    team?.sportType,
    team?.category,
    team?.league?.sport,
    team?.league?.name,
    team?.tournament?.sport,
  ]
    .filter(Boolean)
    .map((x: any) =>
      String(x).toLowerCase()
    );

  if (!wanted) return true;

  const aliases: Record<string, string[]> = {
    baseball: [
      "baseball",
      "야구",
      "mlb",
      "npb",
      "kbo",
      "baseball league",
    ],

    football: [
      "football",
      "soccer",
      "축구",
    ],

    basketball: [
      "basketball",
      "농구",
      "nba",
    ],

    volleyball: [
      "volleyball",
      "배구",
    ],
  };

  const allowed = aliases[wanted] || [wanted];

  return values.some((value) =>
    allowed.some((keyword) =>
      value.includes(keyword)
    )
  );
}

/*
 * 검색 결과의 팀 이름을 비교하기 위한 정규화
 */
function normalizeName(name: any) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣]/g, "");
}

/*
 * 검색 결과에서 스포츠가 일치하는 팀을 선택한다.
 *
 * 특정 팀 이름을 코드에 넣지 않는다.
 */
async function searchTeam(
  name: string,
  sport: string,
  key: string
) {
  const queries = [
    name,
    name
      .replace("FC", "")
      .replace("FC", "")
      .trim(),
  ];

  const attempts: any[] = [];

  for (const q of [
    ...new Set(queries),
  ]) {
    try {
      const raw = await api(
        `/search?q=${encodeURIComponent(q)}`,
        key
      );

      const results = arr(raw);

      const teams = results.filter(
        (x: any) =>
          x?.type === "team"
      );

      const sportTeams =
        teams.filter((x: any) =>
          sportMatches(x, sport)
        );

      attempts.push({
        query: q,
        totalResults: results.length,

        allTeams: teams
          .slice(0, 20)
          .map((x: any) => ({
            id: x?.id,
            name: x?.name,
            sport: x?.sport,
            sportType: x?.sportType,
            category: x?.category,
            league:
              x?.league?.name ??
              x?.league ??
              null,
          })),

        sportTeams:
          sportTeams
            .slice(0, 20)
            .map((x: any) => ({
              id: x?.id,
              name: x?.name,
              sport: x?.sport,
              sportType: x?.sportType,
              category: x?.category,
              league:
                x?.league?.name ??
                x?.league ??
                null,
            })),
      });

      if (sportTeams.length) {
        /*
         * 검색어와 팀 이름이 가장 비슷한 결과를 우선한다.
         */
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

/*
 * 경기 상태가 실제로 시작 전인지 확인한다.
 */
function isNotStarted(f: any) {
  const status = f?.status;

  if (!status) {
    /*
     * 상태가 없는 경우에는 안전하게
     * 분석 대상으로 사용하지 않는다.
     */
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
    Number(status?.code);

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
 * 두 팀의 ID가 정확히 서로 상대하는 경기인지 확인한다.
 */
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

function summarizeFixture(
  f: any
) {
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

    homeScore:
      score(f, "home"),

    awayScore:
      score(f, "away"),
  };
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
      { status: 503 }
    );
  }

  const u =
    new URL(req.url);

  const home =
    u.searchParams.get("home") ||
    "";

  const away =
    u.searchParams.get("away") ||
    "";

  const sport =
    u.searchParams.get("sport") ||
    "";

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
     * 1.
     * 스포츠에 맞는 실제 팀을 자동 검색
     */
    const [
      homeSearch,
      awaySearch,
    ] = await Promise.all([
      searchTeam(
        home,
        sport,
        key
      ),

      searchTeam(
        away,
        sport,
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
     * 2.
     * 실제 팀 ID를 이용해서 예정 경기 조회
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
     * 3.
     * 두 팀이 맞붙는 경기 중
     * 아직 시작하지 않은 경기만 선택
     */
    const candidates = [
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
      )
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

    let fixture =
      candidates[0] ||
      null;

    /*
     * 4.
     * 예정 경기 목록에서 못 찾은 경우
     * live 경기는 분석 대상으로 사용하지 않는다.
     *
     * 따라서 여기서는 livescores를
     * 분석 경기로 사용하지 않는다.
     */
    if (!fixture) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "두 팀 사이에 현재 분석 가능한 경기(아직 시작하지 않은 경기)를 SportsAPI에서 찾지 못했습니다.",

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

          matchingCandidates:
            candidates.map(
              summarizeFixture
            ),

          homeUpcomingSample:
            homeFixtures
              .slice(0, 20)
              .map(
                summarizeFixture
              ),

          awayUpcomingSample:
            awayFixtures
              .slice(0, 20)
              .map(
                summarizeFixture
              ),
        },
      });
    }

    /*
     * 5.
     * 실제 Fixture ID 확보
     */
    const id =
      fixture.id;

    /*
     * 6.
     * 상세 데이터 수집
     */
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

    /*
     * 7.
     * 최근 경기 요약
     */
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

    /*
     * 8.
     * 정상 응답
     */
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
        },
      },
      { status: 502 }
    );
  }
}
