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

type FormData = {
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  scored?: number;
  conceded?: number;
  goalDifference?: number;
  points?: number;
  formPercent?: number | null;
};

type RecentTeam = {
  teamId?: number | null;
  teamName?: string | null;
  fixtures?: any[];
  form?: FormData | null;
};

type RecentSummary = {
  home?: RecentTeam | null;
  away?: RecentTeam | null;
};

type AnalysisFactors = {
  hasRealData: boolean;

  homeForm: number | null;
  awayForm: number | null;

  homeH2H: number | null;
  awayH2H: number | null;

  homeProbability: number | null;
  awayProbability: number | null;

  formUsed: boolean;
  h2hUsed: boolean;
};

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

function demoPicks(
  match: Match
): Pick[] {
  if (match.sport === "야구") {
    return [
      ["일반 승패", "홈 승", 61.8],
      ["핸디캡 -2.5", "원정 +2.5", 70.1],
      ["U/O", "UNDER", 56.1],
    ];
  }

  if (match.sport === "축구") {
    return [
      ["승무패", "홈 승", 64.2],
      ["핸디캡", "원정 +1", 67.1],
      ["U/O 2.5", "UNDER", 55.8],
    ];
  }

  if (match.sport === "농구") {
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
  const value = String(
    sport || ""
  ).toLowerCase();

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

  const date = new Date(value);

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

function formatShortDate(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

/**
 * 실제 분석:
 *
 * 최근 Form 50%
 * H2H        30%
 * 홈 이점    20%
 *
 * Form/H2H 데이터가 없는 경우에는
 * 사용 가능한 요소만으로 다시 정규화합니다.
 *
 * 핸디캡/UO는 아직 실제 통계 데이터가 없으므로
 * 기존 데모값을 유지합니다.
 */
function buildAnalysis(
  basePicks: Pick[],
  h2h: any,
  recentSummary:
    | RecentSummary
    | null
    | undefined
) {
  const homeFormRaw =
    Number(
      recentSummary
        ?.home
        ?.form
        ?.formPercent
    );

  const awayFormRaw =
    Number(
      recentSummary
        ?.away
        ?.form
        ?.formPercent
    );

  const homePlayed =
    Number(
      recentSummary
        ?.home
        ?.form
        ?.played ??
        0
    );

  const awayPlayed =
    Number(
      recentSummary
        ?.away
        ?.form
        ?.played ??
        0
    );

  const formUsed =
    homePlayed > 0 &&
    awayPlayed > 0 &&
    Number.isFinite(
      homeFormRaw
    ) &&
    Number.isFinite(
      awayFormRaw
    );

  const homeWins =
    Number(
      h2h?.homeWins ??
      0
    );

  const awayWins =
    Number(
      h2h?.awayWins ??
      0
    );

  const draws =
    Number(
      h2h?.draws ??
      0
    );

  const h2hTotal =
    homeWins +
    awayWins +
    draws;

  const h2hUsed =
    h2hTotal > 0;

  const homeForm =
    formUsed
      ? clamp(
          homeFormRaw,
          0,
          100
        )
      : null;

  const awayForm =
    formUsed
      ? clamp(
          awayFormRaw,
          0,
          100
        )
      : null;

  let homeH2H:
    | number
    | null = null;

  let awayH2H:
    | number
    | null = null;

  if (h2hUsed) {
    const decisionGames =
      homeWins +
      awayWins;

    if (
      decisionGames > 0
    ) {
      homeH2H =
        (
          homeWins /
          decisionGames
        ) *
        100;

      awayH2H =
        (
          awayWins /
          decisionGames
        ) *
        100;
    } else {
      homeH2H = 50;
      awayH2H = 50;
    }
  }

  const hasRealData =
    formUsed ||
    h2hUsed;

  if (!hasRealData) {
    return {
      picks:
        basePicks,

      factors: {
        hasRealData:
          false,

        homeForm:
          null,

        awayForm:
          null,

        homeH2H:
          null,

        awayH2H:
          null,

        homeProbability:
          null,

        awayProbability:
          null,

        formUsed:
          false,

        h2hUsed:
          false,
      } as AnalysisFactors,
    };
  }

  let homeScore = 0;
  let awayScore = 0;
  let totalWeight = 0;

  /*
   * 최근 Form 50%
   */
  if (formUsed) {
    homeScore +=
      (homeForm ?? 50) *
      0.5;

    awayScore +=
      (awayForm ?? 50) *
      0.5;

    totalWeight +=
      0.5;
  }

  /*
   * H2H 30%
   */
  if (h2hUsed) {
    homeScore +=
      (homeH2H ?? 50) *
      0.3;

    awayScore +=
      (awayH2H ?? 50) *
      0.3;

    totalWeight +=
      0.3;
  }

  /*
   * 홈 경기 이점 20%
   *
   * 아직 경기장/리그별 실제 홈 어드밴티지
   * 통계가 없으므로 55 : 45의 완만한 보정만 적용.
   */
  homeScore +=
    55 *
    0.2;

  awayScore +=
    45 *
    0.2;

  totalWeight +=
    0.2;

  if (totalWeight > 0) {
    homeScore /=
      totalWeight;

    awayScore /=
      totalWeight;
  }

  const scoreTotal =
    homeScore +
    awayScore;

  let homeProbability =
    scoreTotal > 0
      ? (
          homeScore /
          scoreTotal
        ) *
        100
      : 50;

  let awayProbability =
    100 -
    homeProbability;

  /*
   * 지나치게 강한 확률 표현 방지.
   *
   * 현재는 H2H + 최근 5경기라는
   * 제한된 정보만 사용하므로
   * 80% 이상은 표시하지 않음.
   */
  homeProbability =
    clamp(
      homeProbability,
      20,
      80
    );

  awayProbability =
    100 -
    homeProbability;

  const winnerLabel =
    homeProbability >=
    awayProbability
      ? "홈 승"
      : "원정 승";

  const winnerProbability =
    Math.max(
      homeProbability,
      awayProbability
    );

  const picks =
    basePicks.map(
      (
        [
          type,
          label,
          probability,
        ]
      ): Pick => {
        if (
          type === "승패" ||
          type ===
            "승무패" ||
          type ===
            "일반 승패"
        ) {
          return [
            type,
            winnerLabel,
            Number(
              winnerProbability
                .toFixed(1)
            ),
          ];
        }

        return [
          type,
          label,
          probability,
        ];
      }
    );

  return {
    picks,

    factors: {
      hasRealData:
        true,

      homeForm,

      awayForm,

      homeH2H:
        homeH2H ===
        null
          ? null
          : Number(
              homeH2H.toFixed(
                1
              )
            ),

      awayH2H:
        awayH2H ===
        null
          ? null
          : Number(
              awayH2H.toFixed(
                1
              )
            ),

      homeProbability:
        Number(
          homeProbability.toFixed(
            1
          )
        ),

      awayProbability:
        Number(
          awayProbability.toFixed(
            1
          )
        ),

      formUsed,

      h2hUsed,
    } as AnalysisFactors,
  };
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
    matched
      ?.selectedFixture ??
    null;

  const detail =
    matched
      ?.detail ??
    null;

  const lineups =
    matched
      ?.lineups ??
    null;

  const statistics =
    matched
      ?.statistics ??
    null;

  const h2h =
    matched
      ?.h2h ??
    null;

  const recentSummary:
    | RecentSummary
    | null =
    matched
      ?.recentSummary ??
    null;

  const venue =
    detail?.venue ??
    matched
      ?.fixture
      ?.venue ??
    null;

  const currentSport =
    selectedFixture
      ? koreanSport(
          selectedFixture
            ?.sport
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
            detail
              ?.league
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
            venue?.name ??
            "-",
        }
      : demoMatch;

  const basePicks =
    demoPicks(
      currentMatch
    );

  const analysis =
    buildAnalysis(
      basePicks,
      h2h,
      recentSummary
    );

  const analysisPicks =
    analysis.picks;

  const analysisFactors =
    analysis.factors;

  const best =
    Math.max(
      ...analysisPicks.map(
        (x) =>
          x[2]
      )
    );

  const bestPick =
    analysisPicks.find(
      (x) =>
        x[2] ===
        best
    );

  const hasH2H =
    h2h &&
    (
      Number(
        h2h
          ?.homeWins ??
          0
      ) +
        Number(
          h2h
            ?.awayWins ??
            0
        ) +
        Number(
          h2h
            ?.draws ??
            0
        ) >
      0
    );

  const homeForm =
    recentSummary
      ?.home
      ?.form ??
    null;

  const awayForm =
    recentSummary
      ?.away
      ?.form ??
    null;

  const homeRecent =
    recentSummary
      ?.home
      ?.fixtures ??
    [];

  const awayRecent =
    recentSummary
      ?.away
      ?.fixtures ??
    [];

  const hasRecent =
    homeRecent.length >
      0 ||
    awayRecent.length >
      0;

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
       * =========================================
       * 1. 랜덤 경기 선택
       * =========================================
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
          randomData
            ?.error ||
            "랜덤 경기 수집 실패"
        );
      }

      const fixtureId =
        Number(
          randomData
            ?.fixtureId
        );

      /*
       * 랜덤 결과를 먼저 표시
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
          "경기 수집 완료 · Fixture ID 없음"
        );

        return;
      }

      setStatus(
        `Fixture #${fixtureId} 선택 · H2H/최근 경기 조회 중…`
      );

      /*
       * =========================================
       * 2. Detail + H2H + Recent Form
       * =========================================
       */
      try {
        const extraResponse =
          await fetch(
            `/api/match/${fixtureId}`,
            {
              cache:
                "no-store",
            }
          );

        const extraData =
          await extraResponse.json();

        if (
          extraResponse.ok &&
          extraData?.ok
        ) {
          const combined = {
            ...randomData,

            fixture:
              extraData
                ?.fixture ??
              randomData
                ?.fixture,

            detail:
              extraData
                ?.fixture ??
              randomData
                ?.detail,

            selectedFixture:
              extraData
                ?.selectedFixture ??
              randomData
                ?.selectedFixture,

            h2h:
              extraData
                ?.h2h ??
              null,

            recentSummary:
              extraData
                ?.recentSummary ??
              null,

            statistics:
              extraData
                ?.statistics ??
              null,

            lineups:
              extraData
                ?.lineups ??
              null,

            detailDebug:
              extraData
                ?.debug ??
              null,
          };

          setMatched(
            combined
          );

          const fixture =
            combined
              ?.selectedFixture;

          setStatus(
            `수집 완료 · Fixture #${fixtureId} · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
          );

          return;
        }

        const fixture =
          randomData
            ?.selectedFixture;

        setStatus(
          `경기 수집 완료 · Fixture #${fixtureId} · 추가 분석 데이터 미수신 · ${fixture?.home ?? "-"} vs ${fixture?.away ?? "-"}`
        );
      } catch (
        detailError: any
      ) {
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
      setLoading(
        false
      );
    }
  }

  return (
    <main className="app">
      <div className="top">
        <div>
          <div className="title">
            Wisetoto Analyzer · Live Free v2
          </div>

          <div className="sub">
            SportsAPI 미래 경기 자동 탐색 · H2H + 최근 5경기 Form 분석
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
                현재 최고 픽
              </div>

              <div className="big">
                {
                  bestPick?.[1]
                }
              </div>

              <div className="pct">
                {best.toFixed(
                  1
                )}
                %
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
              분석 데이터
              <b>
                {analysisFactors
                  .hasRealData
                  ? "실데이터 반영"
                  : "대기"}
              </b>
            </div>
          </div>

          <div className="section">
            <h3>
              게임유형별 분석 픽{" "}
              <span className="small">
                {analysisFactors
                  .hasRealData
                  ? "※ 승패: H2H + 최근 Form 반영"
                  : "※ 아직 데모 확률"}
              </span>
            </h3>

            {analysisPicks.map(
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
                  H2H
                  <b>
                    {hasH2H
                      ? "수신"
                      : "없음"}
                  </b>
                </div>

                <div className="card">
                  최근 Form
                  <b>
                    {hasRecent
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
              </div>
            </div>
          )}

          {analysisFactors
            .hasRealData && (
            <div className="section">
              <h3>
                실제 분석 점수
              </h3>

              <div className="cards">
                <div className="card">
                  {
                    currentMatch
                      .home
                  }
                  <b>
                    {analysisFactors
                      .homeProbability
                      ?.toFixed(1) ??
                      "-"}
                    %
                  </b>
                </div>

                <div className="card">
                  {
                    currentMatch
                      .away
                  }
                  <b>
                    {analysisFactors
                      .awayProbability
                      ?.toFixed(1) ??
                      "-"}
                    %
                  </b>
                </div>

                <div className="card">
                  Form 반영
                  <b>
                    {analysisFactors
                      .formUsed
                      ? "50%"
                      : "미사용"}
                  </b>
                </div>

                <div className="card">
                  H2H 반영
                  <b>
                    {analysisFactors
                      .h2hUsed
                      ? "30%"
                      : "미사용"}
                  </b>
                </div>

                <div className="card">
                  홈 이점
                  <b>
                    20%
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

          {matched &&
            hasRecent && (
              <div className="section">
                <h3>
                  최근 5경기 Form
                </h3>

                <div className="cards">
                  <div className="card">
                    {
                      recentSummary
                        ?.home
                        ?.teamName ??
                      currentMatch
                        .home
                    }
                    <b>
                      {homeForm
                        ?.wins ??
                        0}
                      승{" "}
                      {homeForm
                        ?.draws ??
                        0}
                      무{" "}
                      {homeForm
                        ?.losses ??
                        0}
                      패
                    </b>

                    <div className="small">
                      득점{" "}
                      {homeForm
                        ?.scored ??
                        0}
                      {" / "}
                      실점{" "}
                      {homeForm
                        ?.conceded ??
                        0}
                    </div>

                    <div className="pct">
                      Form{" "}
                      {homeForm
                        ?.formPercent ??
                        "-"}
                      %
                    </div>
                  </div>

                  <div className="card">
                    {
                      recentSummary
                        ?.away
                        ?.teamName ??
                      currentMatch
                        .away
                    }
                    <b>
                      {awayForm
                        ?.wins ??
                        0}
                      승{" "}
                      {awayForm
                        ?.draws ??
                        0}
                      무{" "}
                      {awayForm
                        ?.losses ??
                        0}
                      패
                    </b>

                    <div className="small">
                      득점{" "}
                      {awayForm
                        ?.scored ??
                        0}
                      {" / "}
                      실점{" "}
                      {awayForm
                        ?.conceded ??
                        0}
                    </div>

                    <div className="pct">
                      Form{" "}
                      {awayForm
                        ?.formPercent ??
                        "-"}
                      %
                    </div>
                  </div>
                </div>
              </div>
            )}

          {matched &&
            homeRecent.length >
              0 && (
              <div className="section">
                <h3>
                  {
                    currentMatch
                      .home
                  }{" "}
                  최근 경기
                </h3>

                {homeRecent.map(
                  (
                    game: any
                  ) => (
                    <div
                      className="pick"
                      key={
                        game?.id
                      }
                    >
                      <div>
                        <b>
                          {
                            game
                              ?.home
                          }{" "}
                          {
                            game
                              ?.homeScore
                          }
                          {" : "}
                          {
                            game
                              ?.awayScore
                          }{" "}
                          {
                            game
                              ?.away
                          }
                        </b>

                        <div className="small">
                          {formatShortDate(
                            game
                              ?.startTime
                          )}{" "}
                          ·{" "}
                          {
                            game
                              ?.league
                          }
                        </div>
                      </div>

                      <div className="pct">
                        {
                          game
                            ?.result ??
                          "-"
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          {matched &&
            awayRecent.length >
              0 && (
              <div className="section">
                <h3>
                  {
                    currentMatch
                      .away
                  }{" "}
                  최근 경기
                </h3>

                {awayRecent.map(
                  (
                    game: any
                  ) => (
                    <div
                      className="pick"
                      key={
                        game?.id
                      }
                    >
                      <div>
                        <b>
                          {
                            game
                              ?.home
                          }{" "}
                          {
                            game
                              ?.homeScore
                          }
                          {" : "}
                          {
                            game
                              ?.awayScore
                          }{" "}
                          {
                            game
                              ?.away
                          }
                        </b>

                        <div className="small">
                          {formatShortDate(
                            game
                              ?.startTime
                          )}{" "}
                          ·{" "}
                          {
                            game
                              ?.league
                          }
                        </div>
                      </div>

                      <div className="pct">
                        {
                          game
                            ?.result ??
                          "-"
                        }
                      </div>
                    </div>
                  )
                )}
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

                    h2h:
                      matched
                        .h2h,

                    recentSummary:
                      matched
                        .recentSummary,

                    lineups:
                      matched
                        .lineups,

                    statistics:
                      matched
                        .statistics,

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
            현재 분석은 실제 SportsAPI 경기 정보, H2H 상대전적,
            양 팀 최근 5경기 Form을 사용합니다. 승패 방향은 최근
            Form 50%, H2H 30%, 기본 홈 이점 20%를 조합한 테스트
            분석입니다. 핸디캡과 U/O는 아직 실제 배당·세부 통계가
            연결되지 않아 데모 수치입니다.
          </div>
        </section>
      </div>
    </main>
  );
}
