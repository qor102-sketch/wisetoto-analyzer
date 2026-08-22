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

  scoringUsed: boolean;

  homeAvgScored: number | null;
  homeAvgConceded: number | null;

  awayAvgScored: number | null;
  awayAvgConceded: number | null;

  expectedHomeScore: number | null;
  expectedAwayScore: number | null;
  expectedTotal: number | null;
  expectedMargin: number | null;

  handicapLine: number | null;
  handicapLabel: string | null;
  handicapProbability: number | null;

  totalLine: number | null;
  totalLabel: string | null;
  totalProbability: number | null;
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

function roundHalf(
  value: number
) {
  return (
    Math.round(
      value * 2
    ) / 2
  );
}

function safeAverage(
  total:
    | number
    | null
    | undefined,
  played:
    | number
    | null
    | undefined
) {
  const t =
    Number(total);

  const p =
    Number(played);

  if (
    !Number.isFinite(t) ||
    !Number.isFinite(p) ||
    p <= 0
  ) {
    return null;
  }

  return t / p;
}

function getDefaultTotalLine(
  sport: Exclude<
    Sport,
    "전체"
  >,
  expectedTotal: number
) {
  if (sport === "축구") {
    return 2.5;
  }

  if (sport === "야구") {
    return Math.max(
      5.5,
      roundHalf(
        expectedTotal
      )
    );
  }

  if (sport === "농구") {
    return Math.max(
      100.5,
      roundHalf(
        expectedTotal
      )
    );
  }

  return clamp(
    roundHalf(
      expectedTotal
    ),
    3.5,
    5.5
  );
}

function getHandicapStep(
  sport: Exclude<
    Sport,
    "전체"
  >
) {
  if (sport === "축구") {
    return 0.5;
  }

  if (sport === "야구") {
    return 1.5;
  }

  if (sport === "농구") {
    return 0.5;
  }

  return 0.5;
}

function handicapConfidence(
  sport: Exclude<
    Sport,
    "전체"
  >,
  margin: number
) {
  const abs =
    Math.abs(margin);

  let scale = 4;

  if (sport === "축구") {
    scale = 13;
  }

  if (sport === "야구") {
    scale = 6;
  }

  if (sport === "농구") {
    scale = 1.6;
  }

  if (sport === "배구") {
    scale = 10;
  }

  return clamp(
    50 +
      abs *
        scale,
    50.1,
    74
  );
}

function totalConfidence(
  sport: Exclude<
    Sport,
    "전체"
  >,
  expectedTotal: number,
  line: number
) {
  const diff =
    Math.abs(
      expectedTotal -
        line
    );

  let scale = 8;

  if (sport === "축구") {
    scale = 14;
  }

  if (sport === "야구") {
    scale = 7;
  }

  if (sport === "농구") {
    scale = 1.3;
  }

  if (sport === "배구") {
    scale = 12;
  }

  return clamp(
    50 +
      diff *
        scale,
    50.1,
    72
  );
}

function buildAnalysis(
  sport: Exclude<
    Sport,
    "전체"
  >,
  h2h: any,
  recentSummary:
    | RecentSummary
    | null
    | undefined
) {
  const homeFormData =
    recentSummary
      ?.home
      ?.form;

  const awayFormData =
    recentSummary
      ?.away
      ?.form;

  const homePlayed =
    Number(
      homeFormData
        ?.played ??
        0
    );

  const awayPlayed =
    Number(
      awayFormData
        ?.played ??
        0
    );

  const homeFormRaw =
    Number(
      homeFormData
        ?.formPercent
    );

  const awayFormRaw =
    Number(
      awayFormData
        ?.formPercent
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

  const homeAvgScored =
    safeAverage(
      homeFormData
        ?.scored,
      homePlayed
    );

  const homeAvgConceded =
    safeAverage(
      homeFormData
        ?.conceded,
      homePlayed
    );

  const awayAvgScored =
    safeAverage(
      awayFormData
        ?.scored,
      awayPlayed
    );

  const awayAvgConceded =
    safeAverage(
      awayFormData
        ?.conceded,
      awayPlayed
    );

  const scoringUsed =
    homeAvgScored !== null &&
    homeAvgConceded !== null &&
    awayAvgScored !== null &&
    awayAvgConceded !== null;

  let expectedHomeScore:
    | number
    | null = null;

  let expectedAwayScore:
    | number
    | null = null;

  let expectedTotal:
    | number
    | null = null;

  let expectedMargin:
    | number
    | null = null;

  if (scoringUsed) {
    expectedHomeScore =
      (
        homeAvgScored! +
        awayAvgConceded!
      ) /
      2;

    expectedAwayScore =
      (
        awayAvgScored! +
        homeAvgConceded!
      ) /
      2;

    /*
     * 아주 약한 홈 보정.
     * 승패 분석의 홈 이점과
     * 동일한 방향이지만
     * 점수를 과도하게 변경하지 않음.
     */
    if (sport === "축구") {
      expectedHomeScore +=
        0.1;
    }

    if (sport === "야구") {
      expectedHomeScore +=
        0.15;
    }

    if (sport === "농구") {
      expectedHomeScore +=
        1.5;
    }

    if (sport === "배구") {
      expectedHomeScore +=
        0.05;
    }

    expectedTotal =
      expectedHomeScore +
      expectedAwayScore;

    expectedMargin =
      expectedHomeScore -
      expectedAwayScore;
  }

  /*
   * ========================================
   * 승패 분석
   * Form 50 + H2H 30 + 홈이점 20
   * ========================================
   */

  const hasRealData =
    formUsed ||
    h2hUsed ||
    scoringUsed;

  let homeProbability =
    50;

  let awayProbability =
    50;

  if (hasRealData) {
    let homeScore = 0;
    let awayScore = 0;
    let weight = 0;

    if (formUsed) {
      homeScore +=
        (homeForm ?? 50) *
        0.5;

      awayScore +=
        (awayForm ?? 50) *
        0.5;

      weight += 0.5;
    }

    if (h2hUsed) {
      homeScore +=
        (homeH2H ?? 50) *
        0.3;

      awayScore +=
        (awayH2H ?? 50) *
        0.3;

      weight += 0.3;
    }

    homeScore +=
      55 * 0.2;

    awayScore +=
      45 * 0.2;

    weight +=
      0.2;

    if (weight > 0) {
      homeScore /=
        weight;

      awayScore /=
        weight;
    }

    const total =
      homeScore +
      awayScore;

    if (total > 0) {
      homeProbability =
        (
          homeScore /
          total
        ) *
        100;

      awayProbability =
        100 -
        homeProbability;
    }

    homeProbability =
      clamp(
        homeProbability,
        20,
        80
      );

    awayProbability =
      100 -
      homeProbability;
  }

  /*
   * ========================================
   * 승패 Pick
   * ========================================
   */

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

  /*
   * ========================================
   * Handicap
   * 최근 평균 득점/실점 기반 예상 점수차
   * ========================================
   */

  let handicapLine:
    | number
    | null = null;

  let handicapLabel:
    | string
    | null = null;

  let handicapProbability:
    | number
    | null = null;

  if (
    scoringUsed &&
    expectedMargin !== null
  ) {
    const step =
      getHandicapStep(
        sport
      );

    if (
      expectedMargin >= 0
    ) {
      let raw =
        Math.max(
          step,
          Math.abs(
            expectedMargin
          ) *
            0.55
        );

      if (sport === "야구") {
        raw = 1.5;
      }

      handicapLine =
        roundHalf(
          raw
        );

      if (
        handicapLine <
        step
      ) {
        handicapLine =
          step;
      }

      handicapLabel =
        `홈 -${handicapLine}`;

      handicapProbability =
        handicapConfidence(
          sport,
          expectedMargin
        );
    } else {
      let raw =
        Math.max(
          step,
          Math.abs(
            expectedMargin
          ) *
            0.55
        );

      if (sport === "야구") {
        raw = 1.5;
      }

      handicapLine =
        roundHalf(
          raw
        );

      if (
        handicapLine <
        step
      ) {
        handicapLine =
          step;
      }

      handicapLabel =
        `원정 -${handicapLine}`;

      handicapProbability =
        handicapConfidence(
          sport,
          expectedMargin
        );
    }
  }

  /*
   * ========================================
   * U/O
   * 최근 실제 득실점 평균 기반
   * ========================================
   */

  let totalLine:
    | number
    | null = null;

  let totalLabel:
    | string
    | null = null;

  let totalProbability:
    | number
    | null = null;

  if (
    scoringUsed &&
    expectedTotal !== null
  ) {
    totalLine =
      getDefaultTotalLine(
        sport,
        expectedTotal
      );

    totalLabel =
      expectedTotal >=
      totalLine
        ? "OVER"
        : "UNDER";

    totalProbability =
      totalConfidence(
        sport,
        expectedTotal,
        totalLine
      );
  }

  const winMarket =
    sport === "축구"
      ? "승무패"
      : sport === "야구"
        ? "일반 승패"
        : "승패";

  const handicapMarket =
    sport === "배구"
      ? "세트 핸디"
      : "핸디캡";

  const totalMarket =
    totalLine !== null
      ? `U/O ${totalLine}`
      : "U/O";

  const picks: Pick[] = [
    [
      winMarket,
      winnerLabel,
      Number(
        winnerProbability
          .toFixed(1)
      ),
    ],

    [
      handicapMarket,
      handicapLabel ??
        "분석 데이터 부족",
      Number(
        (
          handicapProbability ??
          50
        ).toFixed(1)
      ),
    ],

    [
      totalMarket,
      totalLabel ??
        "분석 데이터 부족",
      Number(
        (
          totalProbability ??
          50
        ).toFixed(1)
      ),
    ],
  ];

  return {
    picks,

    factors: {
      hasRealData,

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

      scoringUsed,

      homeAvgScored:
        homeAvgScored ===
        null
          ? null
          : Number(
              homeAvgScored.toFixed(
                2
              )
            ),

      homeAvgConceded:
        homeAvgConceded ===
        null
          ? null
          : Number(
              homeAvgConceded.toFixed(
                2
              )
            ),

      awayAvgScored:
        awayAvgScored ===
        null
          ? null
          : Number(
              awayAvgScored.toFixed(
                2
              )
            ),

      awayAvgConceded:
        awayAvgConceded ===
        null
          ? null
          : Number(
              awayAvgConceded.toFixed(
                2
              )
            ),

      expectedHomeScore:
        expectedHomeScore ===
        null
          ? null
          : Number(
              expectedHomeScore.toFixed(
                2
              )
            ),

      expectedAwayScore:
        expectedAwayScore ===
        null
          ? null
          : Number(
              expectedAwayScore.toFixed(
                2
              )
            ),

      expectedTotal:
        expectedTotal ===
        null
          ? null
          : Number(
              expectedTotal.toFixed(
                2
              )
            ),

      expectedMargin:
        expectedMargin ===
        null
          ? null
          : Number(
              expectedMargin.toFixed(
                2
              )
            ),

      handicapLine,

      handicapLabel,

      handicapProbability:
        handicapProbability ===
        null
          ? null
          : Number(
              handicapProbability.toFixed(
                1
              )
            ),

      totalLine,

      totalLabel,

      totalProbability:
        totalProbability ===
        null
          ? null
          : Number(
              totalProbability.toFixed(
                1
              )
            ),
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

  const analysis =
    buildAnalysis(
      currentSport,
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
        h2h?.homeWins ??
          0
      ) +
        Number(
          h2h?.awayWins ??
            0
        ) +
        Number(
          h2h?.draws ??
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
            SportsAPI 미래 경기 자동 탐색 · H2H + 최근 Form + 득실점 분석
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
                  .scoringUsed
                  ? "※ 승패 + 핸디캡 + U/O 실제 최근 득실점 반영"
                  : analysisFactors
                      .hasRealData
                    ? "※ 승패에 H2H/Form 반영"
                    : "※ 데이터 수집 전"}
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
                  득실점 분석
                  <b>
                    {analysisFactors
                      .scoringUsed
                      ? "적용"
                      : "데이터 부족"}
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
                승패 분석 점수
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
                  Form
                  <b>
                    {analysisFactors
                      .formUsed
                      ? "50%"
                      : "미사용"}
                  </b>
                </div>

                <div className="card">
                  H2H
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

          {analysisFactors
            .scoringUsed && (
            <div className="section">
              <h3>
                실제 득실점 기반 예상
              </h3>

              <div className="cards">
                <div className="card">
                  {
                    currentMatch
                      .home
                  }{" "}
                  평균 득점
                  <b>
                    {analysisFactors
                      .homeAvgScored
                      ?.toFixed(2)}
                  </b>
                </div>

                <div className="card">
                  {
                    currentMatch
                      .away
                  }{" "}
                  평균 득점
                  <b>
                    {analysisFactors
                      .awayAvgScored
                      ?.toFixed(2)}
                  </b>
                </div>

                <div className="card">
                  예상 점수
                  <b>
                    {analysisFactors
                      .expectedHomeScore
                      ?.toFixed(1)}
                    {" : "}
                    {analysisFactors
                      .expectedAwayScore
                      ?.toFixed(1)}
                  </b>
                </div>

                <div className="card">
                  예상 총점
                  <b>
                    {analysisFactors
                      .expectedTotal
                      ?.toFixed(1)}
                  </b>
                </div>

                <div className="card">
                  자체 핸디캡
                  <b>
                    {analysisFactors
                      .handicapLabel ??
                      "-"}
                  </b>
                </div>

                <div className="card">
                  자체 U/O
                  <b>
                    {analysisFactors
                      .totalLine ??
                      "-"}{" "}
                    {analysisFactors
                      .totalLabel ??
                      ""}
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

                    analysisFactors,

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
            현재 승패 분석은 실제 SportsAPI H2H와 최근 5경기 Form을 사용합니다.
            핸디캡과 U/O는 양 팀의 최근 5경기 실제 득점·실점 평균을 이용해
            예상 점수와 예상 총점을 계산한 자체 분석값입니다. 스포츠북의 실제
            배당 또는 공식 핸디캡/UO 기준점이 연결된 것은 아니므로 시장 배당과
            직접 동일한 값으로 해석하면 안 됩니다.
          </div>
        </section>
      </div>
    </main>
  );
}
