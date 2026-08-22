"use client";

import { useMemo, useState } from "react";

type Sport =
  | "전체"
  | "축구"
  | "야구"
  | "농구"
  | "배구";

type Match = {
  id: number;
  sport: Exclude<Sport, "전체">;
  league: string;
  home: string;
  away: string;
  time: string;
  venue: string;
};

type Pick = [
  string,
  string,
  number
];

const I = {
  축구: "⚽",
  야구: "⚾",
  농구: "🏀",
  배구: "🏐",
};

const DEMO: Match[] = [
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

function picks(
  match: Match
): Pick[] {
  if (
    match.sport ===
    "야구"
  ) {
    return [
      [
        "일반 승패",
        "홈 승",
        61.8,
      ],
      [
        "핸디캡 -2.5",
        "원정 +2.5",
        70.1,
      ],
      [
        "U/O",
        "UNDER",
        56.1,
      ],
    ];
  }

  if (
    match.sport ===
    "축구"
  ) {
    return [
      [
        "승무패",
        "홈 승",
        64.2,
      ],
      [
        "핸디캡",
        "원정 +1",
        67.1,
      ],
      [
        "U/O 2.5",
        "UNDER",
        55.8,
      ],
    ];
  }

  if (
    match.sport ===
    "농구"
  ) {
    return [
      [
        "승패",
        "홈 승",
        67.4,
      ],
      [
        "핸디캡",
        "홈 -3.5",
        58.2,
      ],
      [
        "U/O",
        "UNDER",
        55.4,
      ],
    ];
  }

  return [
    [
      "승패",
      "홈 승",
      68.7,
    ],
    [
      "세트 핸디",
      "홈 -1.5",
      57.8,
    ],
    [
      "U/O",
      "UNDER",
      54.9,
    ],
  ];
}

function koreanSport(
  sport:
    | string
    | null
    | undefined
): Exclude<
  Sport,
  "전체"
> {
  const value =
    String(
      sport || ""
    ).toLowerCase();

  if (
    value ===
      "football" ||
    value ===
      "soccer"
  ) {
    return "축구";
  }

  if (
    value ===
    "baseball"
  ) {
    return "야구";
  }

  if (
    value ===
    "basketball"
  ) {
    return "농구";
  }

  if (
    value ===
    "volleyball"
  ) {
    return "배구";
  }

  return "축구";
}

function formatKST(
  value:
    | string
    | null
    | undefined
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
      timeZone:
        "Asia/Seoul",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
      hour:
        "2-digit",
      minute:
        "2-digit",
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
    useState("준비");

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
    matched
      ?.selectedFixture ??
    null;

  const detail =
    matched?.detail ??
    null;

  const currentSport =
    selectedFixture
      ? koreanSport(
          selectedFixture
            .sport
        )
      : demoMatch.sport;

  const currentMatch: Match =
    selectedFixture
      ? {
          id:
            matched
              ?.fixtureId ??
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
          x[2]
      )
    );

  async function collect() {
    if (loading) {
      return;
    }

    setLoading(true);

    setMatched(null);

    setStatus(
      "SportsAPI에서 미래 경기 찾는 중…"
    );

    try {
      /*
       * --------------------------------
       * 1. 랜덤 미래 경기 선택
       * --------------------------------
       */
      const randomResponse =
        await fetch(
          "/api/match?mode=random",
          {
            cache:
              "no-store",
          }
        );

      const randomData =
        await randomResponse.json();

      if (
        !randomResponse.ok ||
        !randomData?.ok
      ) {
        throw new Error(
          randomData?.error ||
            "랜덤 경기 수집 실패"
        );
      }

      const fixtureId =
        Number(
          randomData
            ?.fixtureId
        );

      /*
       * 일단 랜덤 경기 자체는
       * 바로 화면에 표시할 수 있도록 저장
       */
      setMatched(
        randomData
      );

      if (
        !Number.isFinite(
          fixtureId
        )
      ) {
        setStatus(
          "경기 수집 완료 · 상세 Fixture ID 없음"
        );

        return;
      }

      setStatus(
        `Fixture #${fixtureId} 선택 완료 · H2H 불러오는 중…`
      );

      /*
       * --------------------------------
       * 2. 선택된 fixture의
       * Detail + H2H 조회
       * --------------------------------
       *
       * 이 API에서 실제 H2H가 들어옴.
       */
      try {
        const detailResponse =
          await fetch(
            `/api/match/${fixtureId}`,
            {
              cache:
                "no-store",
            }
          );

        const detailData =
          await detailResponse.json();

        /*
         * 상세 API가 성공하면
         * 랜덤 API 결과에 합친다.
         */
        if (
          detailResponse.ok &&
          detailData?.ok
        ) {
          const combined =
            {
              ...randomData,

              fixture:
                detailData
                  ?.fixture ??
                randomData
                  ?.fixture,

              detail:
                detailData
                  ?.fixture ??
                randomData
                  ?.detail,

              selectedFixture:
                detailData
                  ?.selectedFixture ??
                randomData
                  ?.selectedFixture,

              h2h:
                detailData
                  ?.h2h ??
                null,

              statistics:
                detailData
                  ?.statistics ??
                null,

              lineups:
                detailData
                  ?.lineups ??
                null,

              detailDebug:
                detailData
                  ?.debug ??
                null,
            };

          setMatched(
            combined
          );

          const fixture =
            combined
              .selectedFixture;

          setStatus(
            `수집 완료 · Fixture #${fixtureId} · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
          );

          return;
        }

        /*
         * 상세 API 실패 시에도
         * 랜덤 경기 결과는 유지
         */
        const fixture =
          randomData
            ?.selectedFixture;

        setStatus(
          `경기 수집 완료 · Fixture #${fixtureId} · H2H 조회 실패 · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
        );
      } catch (
        detailError: any
      ) {
        /*
         * H2H/detail API가
         * 429 등으로 실패해도
         * 랜덤 경기 자체는 버리지 않음.
         */
        const fixture =
          randomData
            ?.selectedFixture;

        setStatus(
          `경기 수집 완료 · Fixture #${fixtureId} · 상세 데이터 일부 미수신 · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
        );

        console.error(
          "Fixture 상세 조회 실패:",
          detailError
            ?.message
        );
      }
    } catch (
      e: any
    ) {
      setStatus(
        e?.message ||
          "수집 실패"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * 중복 선언 없이
   * 각각 한 번만 선언
   */
  const lineups =
    matched?.lineups;

  const statistics =
    matched?.statistics;

  const h2h =
    matched?.h2h;

  const venue =
    detail?.venue;

  const hasH2H =
    h2h &&
    (
      Number.isFinite(
        Number(
          h2h?.homeWins
        )
      ) ||
      Number.isFinite(
        Number(
          h2h?.awayWins
        )
      ) ||
      Number.isFinite(
        Number(
          h2h?.draws
        )
      )
    );

  return (
    <main className="app">
      <div className="top">
        <div>
          <div className="title">
            Wisetoto Analyzer · Live Free v2
          </div>

          <div className="sub">
            SportsAPI 미래 경기 자동 탐색 · 실제 H2H · 랜덤 테스트 분석
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
                  checked={
                    selected.includes(
                      x.id
                    )
                  }
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
                    {x.id} ·{" "}
                    {x.home} vs{" "}
                    {x.away}
                  </b>

                  <div className="small">
                    {x.league} ·{" "}
                    {x.time} ·{" "}
                    {x.venue}
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
                    x[0]
                  }
                >
                  <div>
                    <b>
                      {x[0]}
                    </b>

                    <div className="small">
                      {x[1]}
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
                      : "현재 미제공"}
                  </b>
                </div>

                <div className="card">
                  Statistics
                  <b>
                    {statistics
                      ? "수신"
                      : "현재 미제공"}
                  </b>
                </div>

                <div className="card">
                  H2H
                  <b>
                    {hasH2H
                      ? "수신"
                      : "없음"}
                  </b>
                </div>
              </div>
            </div>
          )}

          {matched &&
            hasH2H && (
              <div className="section">
                <h3>
                  실제 상대전적 H2H
                </h3>

                <div className="cards">
                  <div className="card">
                    {
                      currentMatch
                        .home
                    }
                    <b>
                      {Number(
                        h2h
                          ?.homeWins ??
                          0
                      )}
                      승
                    </b>
                  </div>

                  <div className="card">
                    무승부
                    <b>
                      {Number(
                        h2h
                          ?.draws ??
                          0
                      )}
                    </b>
                  </div>

                  <div className="card">
                    {
                      currentMatch
                        .away
                    }
                    <b>
                      {Number(
                        h2h
                          ?.awayWins ??
                          0
                      )}
                      승
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
                      matched
                        .fixtureId,

                    selectedFixture:
                      matched
                        .selectedFixture,

                    fixture:
                      matched
                        .fixture,

                    detail:
                      matched
                        .detail,

                    lineups:
                      matched
                        .lineups,

                    statistics:
                      matched
                        .statistics,

                    h2h:
                      matched
                        .h2h,

                    randomEndpointStatus:
                      matched
                        ?.debug
                        ?.endpointStatus,

                    fixtureEndpointStatus:
                      matched
                        ?.detailDebug
                        ?.endpointStatus,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div className="notice">
            현재 테스트 버전은 SportsAPI에서 아직 시작하지 않은 미래 경기를 찾고,
            그중 하나를 무작위로 선택합니다. 선택된 경기의 Fixture 상세정보와 실제
            H2H 상대전적을 추가로 조회합니다. Statistics와 Lineups는 현재 미래
            경기에서 제공되지 않는 경우 호출하지 않습니다. 현재 픽과 확률은 아직
            데모이며 이후 실제 분석 로직으로 교체합니다.
          </div>
        </section>
      </div>
    </main>
  );
}
