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
 * WiseToto 스포츠 → SportsAPI 스포츠
 */
function normalizeSport(sport: string) {
  const s = String(sport || "").toLowerCase();

  if (
    s === "야구" ||
    s === "baseball" ||
    s === "mlb" ||
    s === "npb" ||
    s === "kbo"
  ) {
    return "baseball";
  }

  if (
    s === "축구" ||
    s === "football" ||
    s === "soccer"
  ) {
    return "football";
  }

  if (
    s === "농구" ||
    s === "basketball" ||
    s === "nba"
  ) {
    return "basketball";
  }

  if (
    s === "배구" ||
    s === "volleyball"
  ) {
    return "volleyball";
  }

  return s;
}

/*
 * 팀의 스포츠 확인
 */
function teamSport(team: AnyObj) {
  return String(
    team?.sport ||
    team?.sportType ||
    team?.category?.sport ||
    team?.league?.sport ||
    ""
  ).toLowerCase();
}

/*
 * 스포츠가 같은 팀인지 확인
 */
function isSameSport(
  team: AnyObj,
  wantedSport: string
) {
  const actual = teamSport(team);
  const wanted = normalizeSport(wantedSport);

  if (!actual) return false;

  if (wanted === "baseball") {
    return (
      actual.includes("baseball")
    );
  }

  if (wanted === "football") {
    return (
      actual.includes("football") ||
      actual.includes("soccer")
    );
  }

  if (wanted === "basketball") {
    return actual.includes("basketball");
  }

  if (wanted === "volleyball") {
    return actual.includes("volleyball");
  }

  return actual === wanted;
}

/*
 * 팀 이름 정규화
 */
function normalizeName(name: any) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣]/g, "");
}

/*
 * Fixture 상태
 *
 * 우리는 경기 시작 전만 분석한다.
 */
function isNotStarted(fixture: AnyObj) {
  const status = fixture?.status;

  if (!status) return false;

  const type =
    String(status?.type || "")
      .toLowerCase();

  const description =
    String(status?.description || "")
      .toLowerCase();

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
 * 두 팀이 실제로 맞붙는 Fixture인지 확인
 */
function teamsMatch(
  fixture: AnyObj,
  teamA: AnyObj,
  teamB: AnyObj
) {
  const homeId =
    fixture?.home?.id;

  const awayId =
    fixture?.away?.id;

  const a = Number(teamA?.id);
  const b = Number(teamB?.id);

  return (
    (homeId === a && awayId === b) ||
    (homeId === b && awayId === a)
  );
}

/*
 * Fixture 간단 정보
 */
function summarizeFixture(
  fixture: AnyObj
) {
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
  };
}

/*
 * SportsAPI 검색
 *
 * 여기서는 검색 결과를 바로 선택하지 않는다.
 */
async function searchCandidates(
  name: string,
  sport: string,
  key: string
) {
  const queries = [
    name,

    name
      .replace(/FC/gi, "")
      .trim(),

    name
      .replace(/MLB/gi, "")
      .trim(),

    name
      .replace(/NPB/gi, "")
      .trim(),

    name
      .replace(/KBO/gi, "")
      .trim(),

    name
      .replace(/baseball/gi, "")
      .trim(),
  ];

  const uniqueQueries = [
    ...new Set(
      queries.filter(Boolean)
    ),
  ];

  const allCandidates: AnyObj[] = [];

  const debug: AnyObj[] = [];

  for (const q of uniqueQueries) {
    try {
      const result = await api(
        `/search?q=${encodeURIComponent(q)}`,
        key
      );

      const results = arr(result);

      const teams = results.filter(
        (x: AnyObj) =>
          x?.type === "team"
      );

      const sportTeams =
        teams.filter((team: AnyObj) =>
          isSameSport(
            team,
            sport
          )
        );

      for (const team of sportTeams) {
        if (
          !allCandidates.some(
            x => Number(x.id) === Number(team.id)
          )
        ) {
          allCandidates.push(team);
        }
      }

      debug.push({
        query: q,
        totalResults: results.length,

        teams: teams
          .slice(0, 20)
          .map((x: AnyObj) => ({
            id: x?.id,
            name: x?.name,
            sport: x?.sport,
          })),

        sportTeams:
          sportTeams
            .slice(0, 20)
            .map((x: AnyObj) => ({
              id: x?.id,
              name: x?.name,
              sport: x?.sport,
            })),
      });
    } catch (e: any) {
      debug.push({
        query: q,
        error:
          e?.message ||
          "검색 오류",
      });
    }
  }

  return {
    candidates: allCandidates,
    debug,
  };
}

/*
 * 후보 팀의 upcoming 경기 조회
 */
async function getUpcoming(
  teamId: number,
  key: string
) {
  const result = await api(
    `/teams/${teamId}/fixtures?type=upcoming&page=0`,
    key
  );

  return arr(result);
}

/*
 * 상대팀과 실제 예정 경기를 찾는다.
 *
 * 이것이 이번 코드의 핵심이다.
 */
async function findTeamByOpponent(
  teamCandidates: AnyObj[],
  opponentCandidates: AnyObj[],
  sport: string,
  key: string
) {
  const debug: AnyObj[] = [];

  for (const homeTeam of teamCandidates) {
    let fixtures: AnyObj[] = [];

    try {
      fixtures =
        await getUpcoming(
          Number(homeTeam.id),
          key
        );
    } catch (e: any) {
      debug.push({
        team: homeTeam,
        error:
          e?.message ||
          "upcoming 조회 실패",
      });

      continue;
    }

    for (const fixture of fixtures) {
      if (
        !isNotStarted(fixture)
      ) {
        continue;
      }

      /*
       * 후보 원정팀 중
       * Fixture의 상대팀과 일치하는 팀을 찾는다.
       */
      const opponent =
        opponentCandidates.find(
          (candidate: AnyObj) =>
            teamsMatch(
              fixture,
              homeTeam,
              candidate
            )
        );

      if (opponent) {
        return {
          homeTeam,
          awayTeam: opponent,
          fixture,

          debug: [
            ...debug,

            {
              selected: true,

              homeTeam: {
                id: homeTeam.id,
                name: homeTeam.name,
              },

              awayTeam: {
                id: opponent.id,
                name: opponent.name,
              },

              fixture:
                summarizeFixture(
                  fixture
                ),
            },
          ],
        };
      }
    }

    debug.push({
      team: {
        id: homeTeam.id,
        name: homeTeam.name,
      },

      upcomingCount:
        fixtures.length,

      upcomingSample:
        fixtures
          .slice(0, 10)
          .map(
            summarizeFixture
          ),
    });
  }

  return {
    homeTeam: null,
    awayTeam: null,
    fixture: null,
    debug,
  };
}

function score(
  fixture: AnyObj,
  side: "home" | "away"
) {
  const s =
    fixture?.[
      side + "Score"
    ] ||
    fixture?.score?.[side] ||
    {};

  return (
    s?.current ??
    s?.display ??
    s?.normaltime ??
    null
  );
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

  const url =
    new URL(req.url);

  const home =
    url.searchParams.get(
      "home"
    ) || "";

  const away =
    url.searchParams.get(
      "away"
    ) || "";

  const sport =
    url.searchParams.get(
      "sport"
    ) || "";

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
     * --------------------------------
     * 1. 홈팀 후보 검색
     * --------------------------------
     */
    const homeSearch =
      await searchCandidates(
        home,
        sport,
        key
      );

    /*
     * --------------------------------
     * 2. 원정팀 후보 검색
     * --------------------------------
     */
    const awaySearch =
      await searchCandidates(
        away,
        sport,
        key
      );

    /*
     * --------------------------------
     * 검색 결과가 없으면
     * 잘못된 팀을 임의 선택하지 않는다.
     * --------------------------------
     */
    if (
      homeSearch.candidates.length === 0 ||
      awaySearch.candidates.length === 0
    ) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "SportsAPI에서 해당 스포츠의 팀 후보를 충분히 찾지 못했습니다.",

        requested: {
          home,
          away,
          sport,
        },

        debug: {
          homeSearch:
            homeSearch.debug,

          awaySearch:
            awaySearch.debug,

          homeCandidateCount:
            homeSearch.candidates.length,

          awayCandidateCount:
            awaySearch.candidates.length,
        },
      });
    }

    /*
     * --------------------------------
     * 3. 후보 팀들의 실제 예정 경기에서
     * 상대팀을 찾는다.
     * --------------------------------
     */
    const match =
      await findTeamByOpponent(
        homeSearch.candidates,
        awaySearch.candidates,
        sport,
        key
      );

    /*
     * --------------------------------
     * 4. 실제 경기 못 찾음
     * --------------------------------
     */
    if (!match.fixture) {
      return Response.json({
        ok: false,
        matched: false,

        error:
          "두 팀 후보 중 실제로 서로 맞붙는 경기(경기 시작 전)를 찾지 못했습니다.",

        requested: {
          home,
          away,
          sport,
        },

        debug: {
          homeCandidates:
            homeSearch.candidates.map(
              (x: AnyObj) => ({
                id: x.id,
                name: x.name,
                sport: x.sport,
              })
            ),

          awayCandidates:
            awaySearch.candidates.map(
              (x: AnyObj) => ({
                id: x.id,
                name: x.name,
                sport: x.sport,
              })
            ),

          matching:
            match.debug,
        },
      });
    }

    const fixture =
      match.fixture;

    const fixtureId =
      fixture.id;

    /*
     * --------------------------------
     * 5. 실제 Fixture 상세 데이터
     * --------------------------------
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

      getUpcoming(
        Number(
          match.homeTeam.id
        ),
        key
      ).catch(
        () => []
      ),

      api(
        `/teams/${match.awayTeam.id}/fixtures?type=recent&page=0`,
        key
      ).catch(
        () => []
      ),
    ]);

    /*
     * --------------------------------
     * 6. 최근 경기 요약
     * --------------------------------
     */
    const recentHome =
      arr(homeRecent)
        .slice(0, 20)
        .map(
          (f: AnyObj) => ({
            id: f?.id,
            startTime:
              f?.startTime,

            status:
              f?.status,

            home:
              f?.home?.name,

            away:
              f?.away?.name,

            homeScore:
              score(
                f,
                "home"
              ),

            awayScore:
              score(
                f,
                "away"
              ),
          })
        );

    const recentAway =
      arr(awayRecent)
        .slice(0, 20)
        .map(
          (f: AnyObj) => ({
            id: f?.id,
            startTime:
              f?.startTime,

            status:
              f?.status,

            home:
              f?.home?.name,

            away:
              f?.away?.name,

            homeScore:
              score(
                f,
                "home"
              ),

            awayScore:
              score(
                f,
                "away"
              ),
          })
        );

    /*
     * --------------------------------
     * 7. 성공
     * --------------------------------
     */
    return Response.json({
      ok: true,
      matched: true,

      fixtureId,

      requested: {
        home,
        away,
        sport,
      },

      teams: {
        home: {
          id:
            match.homeTeam.id,

          name:
            match.homeTeam.name,

          sport:
            match.homeTeam.sport,
        },

        away: {
          id:
            match.awayTeam.id,

          name:
            match.awayTeam.name,

          sport:
            match.awayTeam.sport,
        },
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
          recentHome,

        away:
          recentAway,
      },

      debug: {
        message:
          "검색 후보 → 실제 상대 경기 → 시작 전 Fixture 순서로 매칭되었습니다.",

        selectedFixture:
          summarizeFixture(
            fixture
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
      },
      { status: 502 }
    );
  }
}
