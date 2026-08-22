import { useMemo, useState } from "react";

type Sport =
  | "전체"
  | "축구"
  | "야구"
  | "농구"
  | "배구";

type M = {
  id: number;
  sport: Exclude<Sport, "전체">;
  league: string;
  home: string;
  away: string;
  time: string;
  venue: string;
};

const I = {
  축구: "⚽",
  야구: "⚾",
  농구: "🏀",
  배구: "🏐",
};

const DEMO: M[] = [
  {
    id: 1001,
    sport: "축구",
    league: "축구",
    home: "랜덤 경기",
    away: "SportsAPI",
    time: "-",
    venue: "-",
  },
  {
    id: 6101,
    sport: "농구",
    league: "농구",
    home: "랜덤 경기",
    away: "SportsAPI",
    time: "-",
    venue: "-",
  },
  {
    id: 7201,
    sport: "배구",
    league: "배구",
    home: "랜덤 경기",
    away: "SportsAPI",
    time: "-",
    venue: "-",
  },
];

function picks(m: M) {
  if (m.sport === "야구") {
    return [
      ["일반 승패", "홈 승", 61.8],
      ["핸디캡 -2.5", "원정 +2.5", 70.1],
      ["U/O", "UNDER", 56.1],
    ];
  }

  if (m.sport === "축구") {
    return [
      ["승무패", "홈 승", 64.2],
      ["핸디캡", "원정 +1", 67.1],
      ["U/O 2.5", "UNDER", 55.8],
    ];
  }

  if (m.sport === "농구") {
    return [
      ["승패", "홈 승", 67.4],
      ["핸디캡", "홈 -3.5", 58.2],
      ["U/O", "UNDER", 55.4],
    ];
  }

  return [
    ["승패", "홈 승", 68.7],
    ["세트 핸디", "홈 -1.5", 57.8],
    ["U/O", "UNDER", 54.9],
  ];
}

function koreanSport(
  sport: string | null | undefined
): Exclude<Sport, "전체"> {
  const value =
    String(sport || "").toLowerCase();

  if (
    value === "football" ||
    value === "soccer"
  ) {
    return "축구";
  }

  if (value === "baseball") {
    return "야구";
  }

  if (value === "basketball") {
    return "농구";
  }

  if (value === "volleyball") {
    return "배구";
  }

  return "축구";
}

function formatKST(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default function Home() {
  const [
    sport,
    setSport,
  ] =
    useState<Sport>(
      "전체"
    );

  const [
    active,
    setActive,
  ] =
    useState(1001);

  const [
    selected,
    setSelected,
  ] =
    useState<number[]>([
      1001,
    ]);

  const [
    status,
    setStatus,
  ] =
    useState(
      "준비"
    );

  const [
    matched,
    setMatched,
  ] =
    useState<any>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const list =
    useMemo(
      () =>
        DEMO.filter(
          (x) =>
            sport ===
              "전체" ||
            x.sport ===
              sport
        ),
      [sport]
    );

  const demoMatch =
    DEMO.find(
      (x) =>
        x.id ===
        active
    ) ??
    DEMO[0];

  const selectedFixture =
    matched?.selectedFixture ??
    null;

  const detail =
    matched?.detail ??
    null;

  const currentSport =
    selectedFixture
      ? koreanSport(
          selectedFixture.sport
        )
      : demoMatch.sport;

  const currentMatch: M =
    selectedFixture
      ? {
          id:
            matched?.fixtureId ??
            0,

          sport:
            currentSport,

          league:
            selectedFixture
              ?.league ??
            detail?.league
              ?.name ??
            "-",

          home:
            selectedFixture
              ?.home ??
            "-",

          away:
            selectedFixture
              ?.away ??
            "-",

          time:
            formatKST(
              selectedFixture
                ?.startTime
            ),

          venue:
            detail?.venue
              ?.name ??
            matched?.fixture
              ?.venue
              ?.name ??
            "-",
        }
      : demoMatch;

  const ps =
    picks(
      currentMatch
    );

  const best =
    Math.max(
      ...ps.map(
        (x) =>
          x[2] as number
      )
    );

  async function collect() {
    if (loading) {
      return;
    }

    setLoading(true);

    setStatus(
      "SportsAPI에서 미래 경기 찾는 중…"
    );

    setMatched(
      null
    );

    try {
      const r =
        await fetch(
          "/api/match?mode=random",
          {
            cache:
              "no-store",
          }
        );

      const j =
        await r.json();

      if (
        !r.ok ||
        !j.ok
      ) {
        const detail =
          j?.debug
            ? "\n\n[DEBUG]\n" +
              JSON.stringify(
                j.debug,
                null,
                2
              )
            : "";

        throw new Error(
          (j?.error ||
            "랜덤 경기 수집 실패") +
            detail
        );
      }

      setMatched(j);

      const fixture =
        j.selectedFixture;

      setStatus(
        `수집 완료 · Fixture #${j.fixtureId} · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
      );
    } catch (
      e: any
    ) {
      setStatus(
        e?.message ||
          "수집 실패"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  const lineups =
    matched?.lineups;

  const statistics =
    matched?.statistics;

  const h2h =
    matched?.h2h;

  const venue =
    detail?.venue;

  return (
    <main className="app">
      <div className="top">
        <div>
          <div className="title">
            Wisetoto Analyzer · Live Free v2
          </div>

          <div className="sub">
            SportsAPI 미래 경기 자동 탐색 · 랜덤 테스트 분석
          </div>
        </div>

        <div className="bar">
          <b>
            랜덤 경기 테스트
          </b>

          <button
            className="btn primary"
            onClick={
              collect
            }
            disabled={
              loading
            }
          >
            {loading
              ? "⏳ 수집 중"
              : "🎲 랜덤 경기 수집"}
          </button>

          <button
            className="btn light"
            onClick={() =>
              alert(
                selected.length +
                  "개 경기 분석"
              )
            }
          >
            📊 선택 경기 분석
          </button>

          <span className="small">
            {status}
          </span>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            "전체",
            "축구",
            "야구",
            "농구",
            "배구",
          ] as Sport[]
        ).map(
          (s) => (
            <button
              key={s}
              className={
                "tab " +
                (sport ===
                s
                  ? "active"
                  : "")
              }
              onClick={() =>
                setSport(
                  s
                )
              }
            >
              {s !==
                "전체" &&
                I[s] +
                  " "}
              {s}
            </button>
          )
        )}
      </div>

      <div className="layout">
        <section className="panel">
          <h3>
            테스트
          </h3>

          {list.map(
            (x) => (
              <div
                key={
                  x.id
                }
                className={
                  "match " +
                  (x.id ===
                  active
                    ? "sel"
                    : "")
                }
                onClick={() =>
                  setActive(
                    x.id
                  )
                }
              >
                <input
                  type="checkbox"
                  checked={selected.includes(
                    x.id
                  )}
                  onChange={(
                    e
                  ) =>
                    setSelected(
                      (
                        v
                      ) =>
                        e
                          .target
                          .checked
                          ? [
                              ...v,
                              x.id,
                            ]
                          : v.filter(
                              (
                                y
                              ) =>
                                y !==
                                x.id
                            )
                    )
                  }
                  onClick={(
                    e
                  ) =>
                    e.stopPropagation()
                  }
                />

                <div className="sport">
                  {
                    I[
                      x
                        .sport
                    ]
                  }
                </div>

                <div className="grow">
                  <b>
                    {
                      x.id
                    }{" "}
                    ·{" "}
                    {
                      x.home
                    }{" "}
                    vs{" "}
                    {
                      x.away
                    }
                  </b>

                  <div className="small">
                    {
                      x.league
                    }{" "}
                    ·{" "}
                    {
                      x.time
                    }{" "}
                    ·{" "}
                    {
                      x.venue
                    }
                  </div>
                </div>
              </div>
            )
          )}
        </section>

        <section className="panel">
          <div className="hero">
            <div>
              <div className="small">
                {
                  I[
                    currentMatch
                      .sport
                  ]
                }{" "}
                {
                  currentMatch
                    .league
                }

                {matched &&
                  ` · Fixture #${matched.fixtureId}`}
              </div>

              <h2>
                {
                  currentMatch
                    .home
                }{" "}
                vs{" "}
                {
                  currentMatch
                    .away
                }
              </h2>

              <div className="big">
                {
                  currentMatch
                    .time
                }
              </div>

              <div className="small">
                경기장:{" "}
                {
                  currentMatch
                    .venue
                }
              </div>

              {venue?.city && (
                <div className="small">
                  도시:{" "}
                  {
                    venue.city
                  }
                </div>
              )}

              {matched && (
                <div className="ok">
                  ✓ SportsAPI 실제 미래 경기 매칭 완료
                </div>
              )}
            </div>

            <div className="right">
              <div className="small">
                테스트 최고 픽
              </div>

              <div className="big">
                {
                  ps.find(
                    (x) =>
                      x[2] ===
                      best
                  )?.[1]
                }
              </div>

              <div className="pct">
                {best}%
              </div>
            </div>
          </div>

          <div className="cards">
            <div className="card">
              데이터 공급원
              <b>
                SportsAPI
              </b>
            </div>

            <div className="card">
              경기 매칭
              <b>
                {matched
                  ? "완료"
                  : "대기"}
              </b>
            </div>

            <div className="card">
              Detail
              <b>
                {matched?.detail
                  ? "수신"
                  : "대기"}
              </b>
            </div>
          </div>

          <div className="section">
            <h3>
              게임유형별 최적 픽{" "}
              <span className="small">
                ※ 아직 데모 확률
              </span>
            </h3>

            {ps.map(
              (x) => (
                <div
                  className={
                    "pick " +
                    (x[2] ===
                    best
                      ? "best"
                      : "")
                  }
                  key={
                    x[0] as string
                  }
                >
                  <div>
                    <b>
                      {
                        x[0]
                      }
                    </b>

                    <div className="small">
                      {
                        x[1]
                      }
                    </div>
                  </div>

                  <div className="pct">
                    {Number(
                      x[2]
                    ).toFixed(
                      1
                    )}
                    %
                  </div>
                </div>
              )
            )}
          </div>

          {matched && (
            <div className="section">
              <h3>
                수집된 분석 재료
              </h3>

              <div className="cards">
                <div className="card">
                  Detail
                  <b>
                    {matched
                      ?.detail
                      ? "수신"
                      : "없음"}
                  </b>
                </div>

                <div className="card">
                  Lineups
                  <b>
                    {lineups
                      ? "수신"
                      : "아직 미수집"}
                  </b>
                </div>

                <div className="card">
                  Statistics
                  <b>
                    {statistics
                      ? "수신"
                      : "아직 미수집"}
                  </b>
                </div>

                <div className="card">
                  H2H
                  <b>
                    {h2h
                      ? "수신"
                      : "아직 미수집"}
                  </b>
                </div>
              </div>
            </div>
          )}

          {matched && (
            <div className="section">
              <h3>
                실제 매칭 원천 데이터
              </h3>

              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                  fontSize:
                    12,
                  background:
                    "#f6f8fa",
                  padding:
                    12,
                  borderRadius:
                    10,
                  maxHeight:
                    360,
                  overflow:
                    "auto",
                }}
              >
                {JSON.stringify(
                  {
                    fixtureId:
                      matched.fixtureId,

                    selectedFixture:
                      matched.selectedFixture,

                    fixture:
                      matched.fixture,

                    detail:
                      matched.detail,

                    lineups:
                      matched.lineups,

                    statistics:
                      matched.statistics,

                    h2h:
                      matched.h2h,

                    endpointStatus:
                      matched
                        ?.debug
                        ?.endpointStatus,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div className="notice">
            현재 테스트 버전은 SportsAPI에서 아직 시작하지 않은 미래 경기들을 찾고,
            그중 하나를 무작위로 선택합니다. 경기 시작 후의 경기는 분석 후보에서
            제외됩니다. 현재 확률과 픽은 아직 데모이며, 다음 단계에서 실제 분석
            데이터를 연결합니다.
          </div>
        </section>
      </div>
    </main>
  );
}
