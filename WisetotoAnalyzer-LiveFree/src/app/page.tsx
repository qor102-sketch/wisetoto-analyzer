"use client";

import { useEffect, useMemo, useState } from "react";

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

type BetmanMarket = { line?: number | string | null; handicap?: number | string | null; baseValue?: number | string | null; value?: number | string | null; [key: string]: any; };
type BetmanMatch = { home?: string | null; away?: string | null; homeTeam?: string | null; awayTeam?: string | null; handicaps?: BetmanMarket[]; totals?: BetmanMarket[]; markets?: BetmanMarket[]; [key: string]: any; };


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
  sport: string | number | null | undefined
): Exclude<Sport, "전체"> {
  const value = String(
    sport ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    value === "football" ||
    value === "soccer" ||
    value === "sc" ||
    value === "1" ||
    value === "축구"
  ) {
    return "축구";
  }

  if (
    value === "baseball" ||
    value === "bs" ||
    value === "2" ||
    value === "야구"
  ) {
    return "야구";
  }

  if (
    value === "basketball" ||
    value === "bk" ||
    value === "bb" ||
    value === "3" ||
    value === "농구"
  ) {
    return "농구";
  }

  if (
    value === "volleyball" ||
    value === "vl" ||
    value === "vb" ||
    value === "4" ||
    value === "배구"
  ) {
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

  const parts =
    new Intl.DateTimeFormat(
      "ko-KR",
      {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(date);

  const get =
    (type: string) =>
      parts.find(
        (part) =>
          part.type === type
      )?.value ?? "";

  return `${get("year")}.${get("month")}.${get("day")}(${get("weekday")}) ${get("hour")}:${get("minute")}`;
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




async function readApiResponse(
  response: Response,
  label: string
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const text =
    await response.text();

  let data: any =
    null;

  if (
    contentType.includes(
      "application/json"
    ) ||
    text.trim().startsWith("{") ||
    text.trim().startsWith("[")
  ) {
    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `${label} JSON 해석 실패 · HTTP ${response.status} · ${text.slice(
          0,
          180
        )}`
      );
    }
  } else {
    const preview =
      text
        .replace(/\s+/g, " ")
        .slice(0, 180);

    throw new Error(
      `${label}가 JSON 대신 HTML/텍스트를 반환했습니다 · HTTP ${response.status} · ${preview}`
    );
  }

  return data;
}

function normalizeTeamName(value: unknown) {
  return String(value ?? "").toLowerCase().normalize("NFKC")
    .replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "")
    .replace(/\b(fc|cf|bc|bk|sc|club)\b/gi, "")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function teamSimilarity(a: unknown, b: unknown) {
  const x = normalizeTeamName(a), y = normalizeTeamName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  const grams = (s: string) => {
    const z = new Set<string>();
    for (let i=0;i<s.length-1;i++) z.add(s.slice(i,i+2));
    return z;
  };
  const A=grams(x), B=grams(y);
  if (!A.size || !B.size) return 0;
  let common=0; A.forEach(v=>{ if(B.has(v)) common++; });
  return (2*common)/(A.size+B.size);
}

function getBetmanGames(payload: any): BetmanMatch[] {
  const root=payload?.data ?? payload;
  for (const key of ["games","matches","items","gameList","matchList","scheduleList"]) {
    if (Array.isArray(root?.[key])) return root[key];
  }
  if (Array.isArray(root)) return root;
  const found: BetmanMatch[]=[]; const seen=new Set<any>();
  const walk=(v:any,d:number)=>{
    if(!v || typeof v!=="object" || d>6 || seen.has(v)) return;
    seen.add(v);
    if(Array.isArray(v)){
      if(v.some(x=>x && typeof x==="object" && (x.home||x.homeTeam||x.away||x.awayTeam) && (x.handicaps||x.totals||x.markets))){
        found.push(...v); return;
      }
      v.forEach(x=>walk(x,d+1)); return;
    }
    Object.values(v).forEach(x=>walk(x,d+1));
  };
  walk(root,0); return found;
}

function betmanTeam(g: BetmanMatch, side:"home"|"away") {
  return side==="home"
    ? (g.home ?? g.homeTeam ?? g?.teams?.home?.name ?? g?.homeTeamName ?? "")
    : (g.away ?? g.awayTeam ?? g?.teams?.away?.name ?? g?.awayTeamName ?? "");
}

function matchBetmanGame(games: BetmanMatch[], home:string, away:string) {
  let game:BetmanMatch|null=null, score=0;
  for(const g of games){
    const direct=(teamSimilarity(home,betmanTeam(g,"home"))+teamSimilarity(away,betmanTeam(g,"away")))/2;
    const reverse=((teamSimilarity(home,betmanTeam(g,"away"))+teamSimilarity(away,betmanTeam(g,"home")))/2)*0.85;
    const s=Math.max(direct,reverse);
    if(s>score){ score=s; game=g; }
  }
  return score>=0.62 ? {game,score} : {game:null,score};
}

function marketNumber(m:any) {
  for(const v of [m?.line,m?.handicap,m?.baseValue,m?.value,m?.standard,m?.criterion,m?.point]){
    const n=Number(v); if(Number.isFinite(n)) return n;
  }
  return null;
}

function chooseBetmanHandicap(g:BetmanMatch|null|undefined) {
  if(!g) return null;
  const a=Array.isArray(g.handicaps)?g.handicaps:
    Array.isArray(g.markets)?g.markets.filter((m:any)=>/handi|핸디/i.test(String(m?.type??m?.marketType??m?.name??""))):[];
  for(const market of a){ const line=marketNumber(market); if(line!==null) return {line,market}; }
  return null;
}

function chooseBetmanTotal(g:BetmanMatch|null|undefined) {
  if(!g) return null;
  const a=Array.isArray(g.totals)?g.totals:
    Array.isArray(g.markets)?g.markets.filter((m:any)=>/total|over|under|u\/o|언더|오버/i.test(String(m?.type??m?.marketType??m?.name??""))):[];
  for(const market of a){ const line=marketNumber(market); if(line!==null) return {line,market}; }
  return null;
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
    | undefined,
  betmanMatch: BetmanMatch | null | undefined
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


  const betmanHandicap = chooseBetmanHandicap(betmanMatch);
  if (scoringUsed && expectedMargin !== null && betmanHandicap) {
    handicapLine = betmanHandicap.line;
    const adjustedHomeMargin = expectedMargin + handicapLine;
    handicapLabel = adjustedHomeMargin >= 0
      ? `홈 ${handicapLine >= 0 ? "+" : ""}${handicapLine}`
      : `원정 ${handicapLine >= 0 ? "-" : "+"}${Math.abs(handicapLine)}`;
    handicapProbability = handicapConfidence(sport, adjustedHomeMargin);
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


  const betmanTotal = chooseBetmanTotal(betmanMatch);
  if (scoringUsed && expectedTotal !== null && betmanTotal) {
    totalLine = betmanTotal.line;
    totalLabel = expectedTotal >= totalLine ? "OVER" : "UNDER";
    totalProbability = totalConfidence(sport, expectedTotal, totalLine);
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


type MarketPick = {
  key: string;
  market: string;
  pick: string;
  probability: number;
  odds: number | null;
  marketProbability: number | null;
  edge: number | null;
  confidenceScore: number;
  confidenceGrade: string;
  recommendationScore: number;
  detail: string;
};

function poissonPmf(lambda: number, k: number) {
  if (!Number.isFinite(lambda) || lambda < 0 || k < 0) return 0;
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
}

function soccerScoreGrid(homeLambda: number, awayLambda: number) {
  const rows: { home: number; away: number; p: number }[] = [];
  let total = 0;
  for (let h = 0; h <= 12; h++) {
    const hp = poissonPmf(homeLambda, h);
    for (let a = 0; a <= 12; a++) {
      const p = hp * poissonPmf(awayLambda, a);
      rows.push({ home: h, away: a, p });
      total += p;
    }
  }
  if (total > 0) rows.forEach((row) => { row.p /= total; });
  return rows;
}

function selectionLabel(selection: any) {
  return String(selection?.label ?? selection?.side ?? "").trim();
}

function selectionIdentity(selection: any) {
  const side = String(selection?.side ?? "").toLowerCase();
  const label = selectionLabel(selection).toLowerCase();

  if (side === "win" || /^(승|홈|home)$/i.test(label) || label.includes("home")) return "home";
  if (side === "draw" || /^(무|draw)$/i.test(label) || label.includes("draw")) return "draw";
  if (side === "lose" || /^(패|원정|away)$/i.test(label) || label.includes("away")) return "away";
  if (/오버|over/i.test(label)) return "over";
  if (/언더|under/i.test(label)) return "under";
  if (/홀|odd/i.test(label)) return "odd";
  if (/짝|even/i.test(label)) return "even";
  return side || label;
}

function bestSelection(
  market: any,
  probabilities: Record<string, number>
) {
  const selections = Array.isArray(market?.selections) ? market.selections : [];
  let best: { label: string; probability: number; selection: any; identity: string } | null = null;

  for (const selection of selections) {
    const identity = selectionIdentity(selection);
    const probability = probabilities[identity];

    if (Number.isFinite(probability)) {
      if (!best || probability > best.probability) {
        best = {
          label: selectionLabel(selection) || identity,
          probability,
          selection,
          identity,
        };
      }
    }
  }
  return best;
}

function fairMarketProbabilities(market: any) {
  const selections = Array.isArray(market?.selections) ? market.selections : [];
  const usable = selections
    .map((selection: any) => ({
      identity: selectionIdentity(selection),
      odds: Number(selection?.odds),
    }))
    .filter((x: any) => x.identity && Number.isFinite(x.odds) && x.odds > 1);

  const rawTotal = usable.reduce((sum: number, x: any) => sum + 1 / x.odds, 0);
  const probabilities: Record<string, number> = {};

  if (rawTotal > 0) {
    for (const x of usable) {
      probabilities[x.identity] = ((1 / x.odds) / rawTotal) * 100;
    }
  }

  return {
    probabilities,
    overround: rawTotal,
  };
}

function confidenceGrade(score: number) {
  if (score >= 82) return "A";
  if (score >= 74) return "B+";
  if (score >= 66) return "B";
  if (score >= 58) return "C+";
  return "C";
}

function marketConfidence(
  factors: AnalysisFactors,
  recentSummary: RecentSummary | null | undefined,
  h2h: any,
  market: any,
  overround: number
) {
  const homePlayed = Math.max(0, Number(recentSummary?.home?.form?.played ?? 0));
  const awayPlayed = Math.max(0, Number(recentSummary?.away?.form?.played ?? 0));
  const recentCoverage =
    ((Math.min(homePlayed, 5) + Math.min(awayPlayed, 5)) / 10) * 55;

  const h2hCount =
    Math.max(0, Number(h2h?.homeWins ?? 0)) +
    Math.max(0, Number(h2h?.awayWins ?? 0)) +
    Math.max(0, Number(h2h?.draws ?? 0));
  const h2hCoverage = (Math.min(h2hCount, 5) / 5) * 20;

  const scoringCoverage = factors.scoringUsed ? 20 : 0;

  // 시장 배당이 정상적으로 여러 선택지에서 형성돼 있을수록 소폭 가점.
  const marketQuality =
    Number.isFinite(overround) && overround > 0
      ? clamp(100 - Math.max(0, overround - 1) * 220, 45, 100)
      : 45;

  const betName = String(market?.betName ?? market?.displayName ?? "");
  const isFirstHalf = /전반|1st\s*half|first\s*half/i.test(betName);
  const isSpecial = /sum|홀짝|odd|even/i.test(betName);

  let score =
    recentCoverage +
    h2hCoverage +
    scoringCoverage +
    marketQuality * 0.05;

  if (isFirstHalf) score -= 8; // 전반은 현재 전체경기 득점 기반 근사치 사용
  if (isSpecial) score -= 8;   // 특수 마켓은 분포 민감도가 높아 보수적으로 처리

  return clamp(score, 35, 92);
}

function recommendationScore(
  modelProbability: number,
  edge: number | null,
  confidence: number
) {
  // 확률만 높은 픽보다 시장 대비 우위와 데이터 신뢰도를 함께 평가.
  const edgeScore =
    edge === null
      ? 50
      : clamp(50 + edge * 2.2, 0, 100);

  return clamp(
    modelProbability * 0.50 +
      edgeScore * 0.30 +
      confidence * 0.20,
    0,
    100
  );
}

function buildActualMarketPicks(
  game: BetmanMatch | null | undefined,
  sport: Exclude<Sport, "전체">,
  factors: AnalysisFactors,
  recentSummary: RecentSummary | null | undefined,
  h2h: any
): MarketPick[] {
  if (!game || !Array.isArray(game?.markets) || !factors.hasRealData) return [];

  const expectedHome = factors.expectedHomeScore;
  const expectedAway = factors.expectedAwayScore;
  const canScoreModel =
    expectedHome !== null && expectedAway !== null &&
    Number.isFinite(expectedHome) && Number.isFinite(expectedAway);

  const result: MarketPick[] = [];

  for (let index = 0; index < game.markets.length; index++) {
    const market: any = game.markets[index];
    const selections = Array.isArray(market?.selections) ? market.selections : [];
    if (!selections.some((s: any) => Number(s?.odds) > 1)) continue;

    const betName = String(market?.betName ?? market?.displayName ?? market?.betTypeName ?? "");
    const isFirstHalf = /전반|1st\s*half|first\s*half/i.test(betName);
    const type = String(market?.type ?? "").toLowerCase();
    const line = marketNumber(market);
    const label = marketLabelStandalone(market);
    const key = String(market?.betId ?? market?.betTypeId ?? `${betName}|${line ?? ""}|${index}`);
    const marketFair = fairMarketProbabilities(market);

    // 축구: 예상 득점 → Poisson 스코어 분포 → Betman 실제 기준별 확률.
    if (sport === "축구" && canScoreModel) {
      const periodFactor = isFirstHalf ? 0.45 : 1;
      const grid = soccerScoreGrid(
        Math.max(0.05, expectedHome! * periodFactor),
        Math.max(0.05, expectedAway! * periodFactor)
      );

      let home = 0, draw = 0, away = 0, over = 0, under = 0, push = 0, odd = 0, even = 0;

      for (const row of grid) {
        const adjustedHome = row.home + (type === "handicap" && line !== null ? line : 0);
        if (adjustedHome > row.away) home += row.p;
        else if (adjustedHome < row.away) away += row.p;
        else draw += row.p;

        if (line !== null) {
          const total = row.home + row.away;
          if (total > line) over += row.p;
          else if (total < line) under += row.p;
          else push += row.p;
        }

        if ((row.home + row.away) % 2 === 0) even += row.p;
        else odd += row.p;
      }

      let probs: Record<string, number> = {};
      if (type === "total") {
        const decided = over + under;
        probs = {
          over: decided > 0 ? (over / decided) * 100 : 50,
          under: decided > 0 ? (under / decided) * 100 : 50,
        };
      } else if (/sum|홀짝|odd|even/i.test(betName)) {
        probs = { odd: odd * 100, even: even * 100 };
      } else {
        probs = { home: home * 100, draw: draw * 100, away: away * 100 };
      }

      const best = bestSelection(market, probs);
      if (best) {
        const odds = Number(best.selection?.odds);
        const safeOdds = Number.isFinite(odds) && odds > 1 ? odds : null;
        const fair = marketFair.probabilities[best.identity];
        const marketProbability =
          Number.isFinite(fair) ? Number(fair.toFixed(1)) : null;
        const edge =
          marketProbability === null
            ? null
            : Number((best.probability - marketProbability).toFixed(1));

        const confidence = marketConfidence(
          factors,
          recentSummary,
          h2h,
          market,
          marketFair.overround
        );
        const recScore = recommendationScore(
          best.probability,
          edge,
          confidence
        );

        const periodText = isFirstHalf ? "전반 예상득점 근사" : "전체 예상득점";
        const lineText = line !== null ? ` · 기준 ${line >= 0 && type === "handicap" ? "+" : ""}${line}` : "";
        const pushText = push > 0.001 && type === "total" ? ` · 적중무효 ${(push * 100).toFixed(1)}% 제외` : "";

        result.push({
          key,
          market: label,
          pick: best.label,
          probability: Number(best.probability.toFixed(1)),
          odds: safeOdds,
          marketProbability,
          edge,
          confidenceScore: Number(confidence.toFixed(1)),
          confidenceGrade: confidenceGrade(confidence),
          recommendationScore: Number(recScore.toFixed(1)),
          detail: `${periodText}${lineText}${pushText}`,
        });
        continue;
      }
    }

    // 타 종목/미지원 마켓: 기존 모델 확률을 유지하되 시장 확률/엣지/신뢰도를 함께 표시.
    let fallbackProbability: number | null = null;
    let fallbackLabel: string | null = null;

    if (type === "handicap" && factors.handicapLabel && factors.handicapProbability !== null) {
      fallbackProbability = factors.handicapProbability;
      fallbackLabel = factors.handicapLabel;
    } else if (type === "total" && factors.totalLabel && factors.totalProbability !== null) {
      fallbackProbability = factors.totalProbability;
      fallbackLabel = factors.totalLabel;
    }

    if (fallbackProbability !== null && fallbackLabel) {
      const confidence = marketConfidence(
        factors,
        recentSummary,
        h2h,
        market,
        marketFair.overround
      );
      result.push({
        key,
        market: label,
        pick: fallbackLabel,
        probability: Number(fallbackProbability.toFixed(1)),
        odds: null,
        marketProbability: null,
        edge: null,
        confidenceScore: Number(confidence.toFixed(1)),
        confidenceGrade: confidenceGrade(confidence),
        recommendationScore: Number(
          recommendationScore(fallbackProbability, null, confidence).toFixed(1)
        ),
        detail: line !== null ? `Betman 기준 ${line}` : "Betman 실제 기준",
      });
      continue;
    }

    const fallbackBest = bestSelection(market, {
      home: factors.homeProbability ?? 50,
      away: factors.awayProbability ?? 50,
      draw: 0,
    });

    if (fallbackBest) {
      const fair = marketFair.probabilities[fallbackBest.identity];
      const marketProbability =
        Number.isFinite(fair) ? Number(fair.toFixed(1)) : null;
      const edge =
        marketProbability === null
          ? null
          : Number((fallbackBest.probability - marketProbability).toFixed(1));
      const confidence = marketConfidence(
        factors,
        recentSummary,
        h2h,
        market,
        marketFair.overround
      );

      result.push({
        key,
        market: label,
        pick: fallbackBest.label,
        probability: Number(fallbackBest.probability.toFixed(1)),
        odds:
          Number(fallbackBest.selection?.odds) > 1
            ? Number(fallbackBest.selection?.odds)
            : null,
        marketProbability,
        edge,
        confidenceScore: Number(confidence.toFixed(1)),
        confidenceGrade: confidenceGrade(confidence),
        recommendationScore: Number(
          recommendationScore(fallbackBest.probability, edge, confidence).toFixed(1)
        ),
        detail: "SportsAPI Form/H2H 기반",
      });
    }
  }

  return result;
}

function marketLabelStandalone(market: any) {
  const type = String(market?.type ?? "").toLowerCase();
  const line = marketNumber(market);
  const betName = String(market?.betName ?? "").trim();
  const betTypeName = String(market?.betTypeName ?? market?.displayName ?? "").trim();
  const clean = (value: string) => value
    .replace(/^(축구|야구|농구|배구)\s*/i, "")
    .replace(/^일반\s*/, "")
    .trim();

  if (type === "handicap") {
    const prefix = /전반/i.test(betName) ? "전반 H" : "H";
    return `${prefix} ${line === null ? "" : `${line >= 0 ? "+" : ""}${line}`}`.trim();
  }
  if (type === "total") {
    const prefix = /전반/i.test(betName) ? "전반 U/O" : "U/O";
    return `${prefix} ${line ?? ""}`.trim();
  }

  const preferred = clean(betName) || clean(betTypeName);
  if (/sum/i.test(preferred)) return /전반/i.test(preferred) ? "전반 SUM" : "SUM";
  return preferred || "기타";
}

export default function Home() {
  const [sport, setSport] = useState<Sport>("전체");
  const [status, setStatus] = useState("Betman 발매경기 불러오는 중…");
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState<any>(null);
  const [betmanGames, setBetmanGames] = useState<BetmanMatch[]>([]);
  const [betmanDiagnostics, setBetmanDiagnostics] = useState<any>(null);
  const [selectedBetmanKey, setSelectedBetmanKey] = useState<string | null>(null);
  const [betman, setBetman] = useState<{
    loading: boolean;
    matched: BetmanMatch | null;
    score: number | null;
    error: string | null;
  }>({ loading: false, matched: null, score: null, error: null });

  function readableError(value: any, fallback: string) {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    try { return JSON.stringify(value); } catch { return fallback; }
  }

  function gameKey(game: BetmanMatch, index = 0) {
    return String(game?.key ?? `${game?.home ?? ""}|${game?.away ?? ""}|${game?.gameDateMs ?? game?.gameDate ?? ""}|${index}`);
  }

  function gameTimeMs(game: BetmanMatch) {
    const raw = game?.gameDateMs ?? game?.gameDate ?? game?.startTime ?? null;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 10_000_000_000) return n;
    const parsed = new Date(raw as any).getTime();
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function firstMarket(game: BetmanMatch, key: string) {
    const list = Array.isArray((game as any)?.[key]) ? (game as any)[key] : [];
    return list?.[0] ?? null;
  }

  function moneylineText(game: BetmanMatch) {
    const market = firstMarket(game, "moneyline");
    const selections = Array.isArray(market?.selections) ? market.selections : [];
    if (!selections.length) return "승패 -";
    return selections.map((x: any) => `${x?.label ?? "-"} ${Number(x?.odds).toFixed(2)}`).join(" · ");
  }

  function handicapText(game: BetmanMatch) {
    const list = Array.isArray(game?.handicaps) ? game.handicaps : [];
    if (!list.length) return "-";
    return list
      .map((m: any) => marketNumber(m))
      .filter((x): x is number => x !== null)
      .map((x) => `${x >= 0 ? "+" : ""}${x}`)
      .join(" / ");
  }

  function totalText(game: BetmanMatch) {
    const list = Array.isArray(game?.totals) ? game.totals : [];
    if (!list.length) return "-";
    return list
      .map((m: any) => marketNumber(m))
      .filter((x): x is number => x !== null)
      .join(" / ");
  }


  function marketRows(game: BetmanMatch) {
    const markets =
      Array.isArray(
        (game as any)?.markets
      )
        ? (game as any).markets
        : [];

    /*
     * route.ts의 routeFutureMarketRowCount와 같은 기준을 사용합니다.
     * selection 배열이 존재하기만 하는 마켓이 아니라, 실제 배당이 1보다 큰
     * 선택지가 하나 이상 있는 마켓만 UI 행으로 표시합니다.
     */
    return markets.filter(
      (market: any) =>
        Array.isArray(
          market?.selections
        ) &&
        market.selections.some(
          (selection: any) => {
            const odds =
              Number(
                selection?.odds
              );

            return (
              Number.isFinite(odds) &&
              odds > 1
            );
          }
        )
    );
  }

  function marketLabel(
    market: any
  ) {
    const type =
      String(
        market?.type ??
        ""
      ).toLowerCase();

    const line =
      marketNumber(
        market
      );

    const betName =
      String(
        market?.betName ??
        ""
      ).trim();

    const betTypeName =
      String(
        market?.betTypeName ??
        market?.displayName ??
        ""
      ).trim();

    const cleanSportPrefix =
      (value: string) =>
        value
          .replace(
            /^(축구|야구|농구|배구)\s*/i,
            ""
          )
          .replace(
            /^일반\s*/,
            ""
          )
          .trim();

    if (
      type === "handicap"
    ) {
      const prefix =
        /전반/i.test(
          betName
        )
          ? "전반 H"
          : "H";

      return `${prefix} ${
        line === null
          ? ""
          : `${line >= 0 ? "+" : ""}${line}`
      }`.trim();
    }

    if (
      type === "total"
    ) {
      const prefix =
        /전반/i.test(
          betName
        )
          ? "전반 U"
          : "U";

      return `${prefix} ${line ?? "-"}`;
    }

    if (
      /sum|홀짝/i.test(
        `${betName} ${betTypeName}`
      )
    ) {
      return "SUM";
    }

    if (
      type === "moneyline"
    ) {
      /*
       * Betman betName을 최우선 사용:
       * 야구 승패 -> 승패
       * 야구 승1패 -> 승1패
       * 야구 전반 승무패 -> 전반 승무패
       * 축구 승무패 -> 승무패
       */
      const fromBetName =
        cleanSportPrefix(
          betName
        );

      if (
        fromBetName
      ) {
        return fromBetName;
      }

      const fromType =
        cleanSportPrefix(
          betTypeName
        );

      if (
        fromType
      ) {
        return fromType;
      }

      return "승패";
    }

    return (
      cleanSportPrefix(
        betName
      ) ||
      cleanSportPrefix(
        betTypeName
      ) ||
      String(
        market?.type ??
        "-"
      )
    );
  }

  function marketLabelColor(
    market: any
  ) {
    const type =
      String(
        market?.type ??
        ""
      ).toLowerCase();

    if (
      type === "handicap"
    ) {
      return "#ef2b2d";
    }

    if (
      type === "total"
    ) {
      return "#0b8f37";
    }

    if (
      /sum|홀짝/i.test(
        String(
          market?.betName ??
          ""
        )
      )
    ) {
      return "#005bbb";
    }

    return "#202830";
  }

  function selectionOdds(
    market: any,
    side:
      | "win"
      | "draw"
      | "lose"
  ) {
    const selections =
      Array.isArray(
        market?.selections
      )
        ? market.selections
        : [];

    const found =
      selections.find(
        (selection: any) =>
          selection?.side ===
          side
      );

    const odds =
      Number(
        found?.odds
      );

    return Number.isFinite(
      odds
    ) &&
      odds >
        0
      ? odds.toFixed(2)
      : "-";
  }

  function compactGameDate(
    game: BetmanMatch
  ) {
    const time =
      gameTimeMs(
        game
      );

    if (
      !Number.isFinite(
        time
      )
    ) {
      return "-";
    }

    const date =
      new Date(time);

    const parts =
      new Intl.DateTimeFormat(
        "ko-KR",
        {
          timeZone:
            "Asia/Seoul",
          month:
            "2-digit",
          day:
            "2-digit",
          weekday:
            "short",
          hour:
            "2-digit",
          minute:
            "2-digit",
          hour12:
            false,
        }
      ).formatToParts(
        date
      );

    const get =
      (type: string) =>
        parts.find(
          (part) =>
            part.type ===
            type
        )?.value ??
        "";

    return `${get(
      "month"
    )}.${get(
      "day"
    )}(${get(
      "weekday"
    )}) ${get(
      "hour"
    )}:${get(
      "minute"
    )}`;
  }

  function primaryMatchSeq(
    game: BetmanMatch
  ) {
    const markets =
      marketRows(
        game
      );

    const seq =
      Number(
        markets?.[0]
          ?.matchSeq
      );

    return Number.isFinite(
      seq
    )
      ? seq
      : null;
  }

  async function loadBetmanList() {
    setStatus("Betman 발매경기 불러오는 중…");
    try {
      const response = await fetch("/api/betman", { cache: "no-store" });
      const payload = await readApiResponse(response, "Betman 경기목록 API");
      if (!response.ok || !payload?.ok) throw new Error(readableError(payload?.error, "Betman 경기목록 수집 실패"));
      setBetmanDiagnostics(payload?.diagnostics ?? null);
      const now = Date.now();

      const games = getBetmanGames(payload)
        .filter((game) => {
          const start = gameTimeMs(game);

          const markets =
            Array.isArray(
              (game as any)?.markets
            )
              ? (game as any).markets
              : [];

          const hasOdds =
            markets.some(
              (market: any) =>
                Array.isArray(
                  market?.selections
                ) &&
                market.selections.some(
                  (selection: any) =>
                    Number(
                      selection?.odds
                    ) > 1
                )
            );

          return (
            Number.isFinite(start) &&
            start > now &&
            hasOdds
          );
        })
        .sort(
          (a, b) =>
            gameTimeMs(a) -
            gameTimeMs(b)
        );
      setBetmanGames(games);
      setMatched(null);
      if (games.length) {
        setSelectedBetmanKey(gameKey(games[0],0));
        setBetman({ loading:false, matched:games[0], score:1, error:null });
        setStatus(`실전 발매경기 ${games.length}개 · 경기 선택 후 분석`);
      } else {
        setSelectedBetmanKey(null);
        setBetman({ loading:false, matched:null, score:null, error:"현재 Betman에서 배당이 있는 미시작 발매경기가 없습니다." });
        setStatus("현재 Betman에서 배당이 있는 미시작 발매경기가 없습니다.");
      }
    } catch (e:any) {
      const message = readableError(e,"Betman 경기목록 수집 실패");
      setBetmanGames([]);
      setBetmanDiagnostics(null);
      setSelectedBetmanKey(null);
      setBetman({ loading:false, matched:null, score:null, error:message });
      setStatus(message);
    }
  }

  useEffect(() => { loadBetmanList(); }, []);

  const filteredGames = useMemo(() => betmanGames.filter((game) =>
    sport === "전체" || koreanSport(String((game as any)?.sport ?? "")) === sport
  ), [betmanGames, sport]);

  const uiMarketRowCount = useMemo(
    () =>
      betmanGames.reduce(
        (sum, game) =>
          sum +
          marketRows(game).length,
        0
      ),
    [betmanGames]
  );

  const uiSportCounts = useMemo(() => {
    const counts: Record<Exclude<Sport, "전체">, { games: number; markets: number }> = {
      축구: { games: 0, markets: 0 },
      야구: { games: 0, markets: 0 },
      농구: { games: 0, markets: 0 },
      배구: { games: 0, markets: 0 },
    };

    for (const game of betmanGames) {
      const key = koreanSport(
        String((game as any)?.sport ?? "")
      );

      counts[key].games += 1;
      counts[key].markets += marketRows(game).length;
    }

    return counts;
  }, [betmanGames]);

  const selectedBetman = useMemo(() => {
    if (!selectedBetmanKey) return null;
    return betmanGames.find((game,index) => gameKey(game,index) === selectedBetmanKey) ?? null;
  }, [betmanGames, selectedBetmanKey]);

  const selectedFixture = matched?.selectedFixture ?? null;
  const detail = matched?.detail ?? null;
  const h2h = matched?.h2h ?? null;
  const recentSummary: RecentSummary | null = matched?.recentSummary ?? null;
  const venue = detail?.venue ?? matched?.fixture?.venue ?? null;

  const currentSport = selectedFixture
    ? koreanSport(selectedFixture?.sport)
    : selectedBetman ? koreanSport(String((selectedBetman as any)?.sport ?? "")) : "축구";

  const currentMatch: Match = selectedFixture ? {
    id: matched?.fixtureId ?? 0,
    sport: currentSport,
    league: selectedFixture?.league ?? detail?.league?.name ?? "-",
    home: selectedFixture?.home ?? "-",
    away: selectedFixture?.away ?? "-",
    time: formatKST(selectedFixture?.startTime),
    venue: venue?.name ?? "-",
  } : {
    id: 0,
    sport: currentSport,
    league: String((selectedBetman as any)?.league ?? "-"),
    home: String(selectedBetman?.home ?? "-"),
    away: String(selectedBetman?.away ?? "-"),
    time: selectedBetman ? formatKST(new Date(gameTimeMs(selectedBetman)).toISOString()) : "-",
    venue: String((selectedBetman as any)?.stadium ?? "-"),
  };

  const analysis = buildAnalysis(currentSport, h2h, recentSummary, betman.matched);
  const analysisFactors = analysis.factors;
  const betmanHandicap = chooseBetmanHandicap(betman.matched);
  const betmanTotal = chooseBetmanTotal(betman.matched);
  const actualMarketPicks = buildActualMarketPicks(
    betman.matched,
    currentSport,
    analysisFactors,
    recentSummary,
    h2h
  );

  const displayPicks: Pick[] = actualMarketPicks.length
    ? actualMarketPicks.map((pick) => [
        pick.market,
        `${pick.pick} · ${pick.detail}`,
        pick.probability,
      ] as Pick)
    : analysis.picks.map((pick) => {
        if (pick[0].includes("핸디") && !analysisFactors.scoringUsed && betmanHandicap) {
          return [pick[0], `Betman 기준 ${betmanHandicap.line >= 0 ? "+" : ""}${betmanHandicap.line} · 분석 대기`, 50];
        }
        if (pick[0].startsWith("U/O") && !analysisFactors.scoringUsed && betmanTotal) {
          return [`U/O ${betmanTotal.line}`, "Betman 기준값 확보 · 분석 대기", 50];
        }
        return pick;
      });

  const bestActualPick = actualMarketPicks.length
    ? [...actualMarketPicks].sort(
        (a, b) => b.recommendationScore - a.recommendationScore
      )[0]
    : null;

  const best = bestActualPick
    ? bestActualPick.probability
    : displayPicks.length
      ? Math.max(...displayPicks.map((x) => x[2]))
      : 0;

  const bestPick = bestActualPick
    ? [bestActualPick.market, bestActualPick.pick, bestActualPick.probability] as Pick
    : displayPicks.find((x) => x[2] === best);
  const homeForm = recentSummary?.home?.form ?? null;
  const awayForm = recentSummary?.away?.form ?? null;
  const hasH2H = Boolean(h2h && (Number(h2h?.homeWins ?? 0) + Number(h2h?.awayWins ?? 0) + Number(h2h?.draws ?? 0) > 0));
  const hasRecent = Boolean((recentSummary?.home?.fixtures?.length ?? 0) || (recentSummary?.away?.fixtures?.length ?? 0));

  function chooseGame(game: BetmanMatch, index: number) {
    setSelectedBetmanKey(gameKey(game,index));
    setMatched(null);
    setBetman({ loading:false, matched:game, score:1, error:null });
    setStatus(`${game?.home ?? "-"} vs ${game?.away ?? "-"} 선택 · 분석 버튼을 누르세요`);
  }

  async function analyzeSelected() {
    if (loading || !selectedBetman) return;
    setLoading(true);
    setMatched(null);
    setBetman({ loading:false, matched:selectedBetman, score:1, error:null });
    setStatus(`${selectedBetman?.home ?? "-"} vs ${selectedBetman?.away ?? "-"} · SportsAPI 매칭 중…`);
    try {
      const params = new URLSearchParams({
        mode:"selected",
        home:String(selectedBetman?.home ?? ""),
        away:String(selectedBetman?.away ?? ""),
        gameDateMs:String(gameTimeMs(selectedBetman)),
        sport:String((selectedBetman as any)?.sport ?? ""),
      });
      const response = await fetch(`/api/match?${params.toString()}`, { cache:"no-store" });
      const data = await readApiResponse(response,"선택 경기 매칭 API");
      if (!response.ok || !data?.ok) throw new Error(readableError(data?.error,"SportsAPI 동일경기 자동매칭 실패"));
      const fixtureId = Number(data?.fixtureId);
      if (!Number.isFinite(fixtureId)) throw new Error("SportsAPI Fixture ID를 받지 못했습니다.");
      setMatched(data);
      setStatus(`Fixture #${fixtureId} 매칭 완료 · H2H/최근 Form 조회 중…`);
      const detailResponse = await fetch(`/api/match/${fixtureId}`, { cache:"no-store" });
      const detailData = await readApiResponse(detailResponse,"Fixture 상세 API");
      if (detailResponse.ok && detailData?.ok) {
        const combined = {
          ...data,
          fixture: detailData?.fixture ?? data?.fixture,
          detail: detailData?.fixture ?? data?.detail,
          selectedFixture: detailData?.selectedFixture ?? data?.selectedFixture,
          h2h: detailData?.h2h ?? null,
          recentSummary: detailData?.recentSummary ?? null,
          statistics: detailData?.statistics ?? null,
          lineups: detailData?.lineups ?? null,
          detailDebug: detailData?.debug ?? null,
        };
        setMatched(combined);
        setStatus(`분석 완료 · ${combined?.selectedFixture?.home ?? selectedBetman?.home ?? "-"} vs ${combined?.selectedFixture?.away ?? selectedBetman?.away ?? "-"}`);
      } else {
        setStatus(`경기 매칭 완료 · Fixture #${fixtureId} · 상세 분석 데이터 일부 미수신`);
      }
    } catch (e:any) {
      const message = readableError(e,"선택 경기 분석 실패");
      setStatus(message);
      setBetman((prev) => ({ ...prev, error:message }));
    } finally { setLoading(false); }
  }

  return (
    <main className="app">
      <div className="top">
        <div>
          <div className="title">Wisetoto Analyzer · Live</div>
          <div className="sub">Betman 배당 있는 미시작 발매경기 전체 → 직접 선택 → SportsAPI 분석 → 실제 핸디/UO 기준 최적 픽</div>
        </div>
        <div className="bar">
          <button className="btn light" onClick={loadBetmanList} disabled={loading}>🔄 경기목록 새로고침</button>
          <button className="btn primary" onClick={analyzeSelected} disabled={loading || !selectedBetman}>
            {loading ? "⏳ 분석 중" : "📊 선택 경기 분석"}
          </button>
          <span className={betman.error ? "small err" : "small"}>{status}</span>
        </div>
      </div>

      <div className="tabs">
        {(["전체","축구","야구","농구","배구"] as Sport[]).map((s) => (
          <button key={s} className={"tab " + (sport === s ? "active" : "")} onClick={() => setSport(s)}>
            {s !== "전체" && I[s] + " "}{s}
          </button>
        ))}
      </div>

      <div
        className="layout"
        style={{
          gridTemplateColumns:
            "minmax(720px, 1.25fr) minmax(520px, 1fr)",
        }}
      >
        <section
          className="panel"
          style={{
            padding: 0,
            overflow:
              "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding:
                "16px 16px 10px",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 10,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                }}
              >
                실전 발매 경기
              </h3>

              <div
                className="small"
                style={{
                  marginTop: 5,
                }}
              >
                경기번호 · 시간 · 리그 · 게임유형 · Betman 실제 배당 · 전체 목록 스크롤
              </div>

              <div
                className="small"
                style={{
                  marginTop: 4,
                }}
              >
                ⚽ 축구 {uiSportCounts.축구.games}경기/{uiSportCounts.축구.markets}행
                {" · "}⚾ 야구 {uiSportCounts.야구.games}경기/{uiSportCounts.야구.markets}행
                {" · "}🏀 농구 {uiSportCounts.농구.games}경기/{uiSportCounts.농구.markets}행
                {" · "}🏐 배구 {uiSportCounts.배구.games}경기/{uiSportCounts.배구.markets}행
              </div>
            </div>

            <span className="small">
              {filteredGames.length}경기 ·{" "}
              {filteredGames.reduce(
                (sum, game) =>
                  sum +
                  marketRows(
                    game
                  ).length,
                0
              )}배당행
            </span>
          </div>

          {betmanDiagnostics && (
            <div
              style={{
                margin:
                  "0 14px 10px",
                padding:
                  "8px 10px",
                border:
                  "1px solid #d8dee5",
                borderRadius:
                  8,
                background:
                  "#f7f9fb",
                fontSize:
                  11,
                lineHeight:
                  1.55,
                color:
                  "#425466",
              }}
            >
              <strong>발매행 진단</strong>
              {" · "}Betman 원본 {Number(betmanDiagnostics?.rawCompScheduleRows ?? 0)}행
              {" → "}원본 미시작/유효배당 {Number(betmanDiagnostics?.rawCompFutureRowCount ?? 0)}행
              {" → "}route 미시작 {Number(betmanDiagnostics?.routeFutureMarketRowCount ?? 0)}행
              {" → "}UI {uiMarketRowCount}행
              <br />
              <span>
                route 전체: 병합 {Number(betmanDiagnostics?.mergedRowCount ?? 0)}행
                {" → "}중복정리 {Number(betmanDiagnostics?.dedupedRowCount ?? 0)}행
                {" → "}그룹 {Number(betmanDiagnostics?.groupedGameCount ?? 0)}경기/{Number(betmanDiagnostics?.groupedMarketRowCount ?? 0)}행
              </span>
            </div>
          )}

          {!filteredGames.length && (
            <div
              className="notice"
              style={{
                margin: 14,
              }}
            >
              현재 Betman API가 반환한 데이터 중 이 종목의 미시작 배당 경기가 없습니다.
            </div>
          )}

          {!!filteredGames.length && (
            <div
              style={{
                overflowX:
                  "auto",
                overflowY:
                  "auto",
                maxHeight:
                  "calc(100vh - 250px)",
                minHeight:
                  520,
                borderTop:
                  "1px solid #cfd6dc",
              }}
            >
              <div
                style={{
                  minWidth:
                    760,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "58px 96px 92px 70px minmax(190px,1fr) 58px 58px 58px 58px",
                    minHeight:
                      34,
                    alignItems:
                      "center",
                    background:
                      "#263e61",
                    color:
                      "#fff",
                    position:
                      "sticky",
                    top: 0,
                    zIndex: 5,
                    fontWeight:
                      800,
                    textAlign:
                      "center",
                    borderBottom:
                      "1px solid #9aa6b2",
                  }}
                >
                  <div>경기번호</div>
                  <div>일시</div>
                  <div>리그</div>
                  <div>게임유형</div>
                  <div>대상경기</div>
                  <div>승/언더</div>
                  <div>무</div>
                  <div>패/오버</div>
                  <div>선택</div>
                </div>

                {filteredGames.flatMap(
                  (
                    game,
                    gameIndex
                  ) => {
                    const key =
                      gameKey(
                        game,
                        gameIndex
                      );

                    const selected =
                      key ===
                      selectedBetmanKey;

                    const rows =
                      marketRows(
                        game
                      );

                    return rows.map(
                      (
                        market: any,
                        marketIndex: number
                      ) => {
                        const isFirst =
                          marketIndex ===
                          0;

                        const matchSeq =
                          Number(
                            market
                              ?.matchSeq
                          );

                        const rowKey = [
                          key,
                          Number.isFinite(matchSeq)
                            ? matchSeq
                            : "no-seq",
                          market?.betId ?? "",
                          market?.betTypeId ?? "",
                          market?.betName ?? "",
                          market?.betTypeName ?? "",
                          market?.rawHandiCode ?? "",
                          market?.line ?? "",
                          marketIndex,
                        ].join("|");

                        const label =
                          marketLabel(
                            market
                          );

                        return (
                          <div
                            key={
                              rowKey
                            }
                            onClick={() =>
                              chooseGame(
                                game,
                                gameIndex
                              )
                            }
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "58px 96px 92px 70px minmax(190px,1fr) 58px 58px 58px 58px",
                              minHeight:
                                35,
                              alignItems:
                                "center",
                              borderBottom:
                                "1px solid #c7cdd2",
                              background:
                                selected
                                  ? "#eef7ff"
                                  : isFirst
                                    ? "#f7f7f7"
                                    : "#fff",
                              cursor:
                                "pointer",
                            }}
                          >
                            <div
                              style={{
                                padding:
                                  "0 4px",
                                textAlign:
                                  "center",
                                fontWeight:
                                  700,
                              }}
                            >
                              {Number.isFinite(
                                matchSeq
                              )
                                ? matchSeq
                                : "-"}
                            </div>

                            <div
                              style={{
                                padding:
                                  "0 5px",
                                whiteSpace:
                                  "nowrap",
                                fontWeight:
                                  isFirst
                                    ? 700
                                    : 500,
                              }}
                            >
                              {compactGameDate(
                                game
                              )}
                            </div>

                            <div
                              style={{
                                padding:
                                  "0 5px",
                                whiteSpace:
                                  "nowrap",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                              }}
                              title={
                                String(
                                  (game as any)
                                    ?.league ??
                                  "-"
                                )
                              }
                            >
                              {
                                I[
                                  koreanSport(
                                    String(
                                      (game as any)
                                        ?.sport ??
                                      ""
                                    )
                                  )
                                ]
                              }{" "}
                              {(game as any)
                                ?.league ??
                                "-"}
                            </div>

                            <div
                              style={{
                                padding:
                                  "0 4px",
                                textAlign:
                                  "center",
                                fontWeight:
                                  900,
                                color:
                                  marketLabelColor(
                                    market
                                  ),
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {label}
                            </div>

                            <div
                              style={{
                                padding:
                                  "0 7px",
                                textAlign:
                                  "center",
                                fontWeight:
                                  isFirst
                                    ? 800
                                    : 600,
                                textDecoration:
                                  "underline",
                                textUnderlineOffset:
                                  2,
                              }}
                            >
                              {game?.home ??
                                "-"}{" "}
                              :{" "}
                              {game?.away ??
                                "-"}
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "center",
                                fontWeight:
                                  800,
                                textDecoration:
                                  "underline",
                              }}
                            >
                              {selectionOdds(
                                market,
                                "win"
                              )}
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "center",
                                fontWeight:
                                  800,
                                textDecoration:
                                  selectionOdds(
                                    market,
                                    "draw"
                                  ) !==
                                  "-"
                                    ? "underline"
                                    : "none",
                              }}
                            >
                              {selectionOdds(
                                market,
                                "draw"
                              )}
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "center",
                                fontWeight:
                                  800,
                                textDecoration:
                                  "underline",
                              }}
                            >
                              {selectionOdds(
                                market,
                                "lose"
                              )}
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "center",
                              }}
                            >
                              <button
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  chooseGame(
                                    game,
                                    gameIndex
                                  );
                                }}
                                style={{
                                  padding:
                                    "4px 7px",
                                  border:
                                    selected
                                      ? "1px solid #0b6cb8"
                                      : "1px solid #9aa4ad",
                                  background:
                                    selected
                                      ? "#e4f2ff"
                                      : "#fff",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    11,
                                  fontWeight:
                                    700,
                                }}
                              >
                                {selected
                                  ? "선택됨"
                                  : "경기전"}
                              </button>
                            </div>
                          </div>
                        );
                      }
                    );
                  }
                )}
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          {!selectedBetman ? <div className="notice">왼쪽 경기목록에서 분석할 경기를 선택하세요.</div> : <>
            <div className="hero">
              <div>
                <div className="small">{I[currentMatch.sport]} {currentMatch.league}{matched?.fixtureId ? ` · Fixture #${matched.fixtureId}` : ""}</div>
                <h2>{currentMatch.home} vs {currentMatch.away}</h2>
                <div className="big">{currentMatch.time}</div>
                <div className="small">경기장: {currentMatch.venue}</div>
                <div className="ok">
                  ✓ Betman 실제 발매경기 선택
                  {primaryMatchSeq(selectedBetman) !== null
                    ? ` · 대표 경기번호 #${primaryMatchSeq(selectedBetman)}`
                    : ""}
                </div>
                {matched?.fixtureId && <div className="ok">✓ SportsAPI 동일경기 매칭 완료</div>}
              </div>
              <div className="right">
                <div className="small">현재 최고 픽</div>
                <div className="big">{analysisFactors.hasRealData ? bestPick?.[1] : "분석 대기"}</div>
                <div className="pct">{analysisFactors.hasRealData ? `${best.toFixed(1)}%` : "-"}</div>
                {bestActualPick && (
                  <div className="small" style={{ marginTop: 4 }}>
                    추천점수 {bestActualPick.recommendationScore.toFixed(1)}
                    {" · "}엣지 {bestActualPick.edge === null ? "-" : `${bestActualPick.edge >= 0 ? "+" : ""}${bestActualPick.edge.toFixed(1)}%p`}
                    {" · "}신뢰도 {bestActualPick.confidenceGrade}
                  </div>
                )}
              </div>
            </div>

            <div className="cards">
              <div className="card">승패 배당<b>{moneylineText(selectedBetman)}</b></div>
              <div className="card">Betman 핸디<b>{handicapText(selectedBetman)}</b></div>
              <div className="card">Betman U/O<b>{totalText(selectedBetman)}</b></div>
              <div className="card">SportsAPI<b>{matched?.fixtureId ? "매칭 완료" : "분석 전"}</b></div>
              <div className="card">H2H<b>{hasH2H ? "수신" : "없음/대기"}</b></div>
              <div className="card">최근 Form<b>{hasRecent ? "수신" : "없음/대기"}</b></div>
            </div>

            <div className="section">
              <h3>게임유형별 분석 픽 <span className="small">{actualMarketPicks.length ? `※ 모델확률 · 시장확률 · 엣지 · 신뢰도까지 ${actualMarketPicks.length}개 유형 개별 계산` : analysisFactors.scoringUsed ? "※ Betman 실제 기준값 + SportsAPI 최근 득실점 반영" : "※ 분석 전 또는 SportsAPI 데이터 부족"}</span></h3>

              {actualMarketPicks.length ? actualMarketPicks.map((pick) => {
                const isBest = bestActualPick?.key === pick.key;
                return (
                  <div className={"pick " + (isBest ? "best" : "")} key={pick.key}>
                    <div style={{ minWidth: 0 }}>
                      <b>{pick.market}</b>
                      <div className="small">
                        {pick.pick} · {pick.detail}
                      </div>
                      <div className="small" style={{ marginTop: 3 }}>
                        배당 {pick.odds?.toFixed(2) ?? "-"}
                        {" · "}시장 {pick.marketProbability === null ? "-" : `${pick.marketProbability.toFixed(1)}%`}
                        {" · "}엣지 {pick.edge === null ? "-" : `${pick.edge >= 0 ? "+" : ""}${pick.edge.toFixed(1)}%p`}
                        {" · "}신뢰도 {pick.confidenceGrade} ({pick.confidenceScore.toFixed(0)})
                        {" · "}추천점수 {pick.recommendationScore.toFixed(1)}
                      </div>
                    </div>
                    <div className="pct">{pick.probability.toFixed(1)}%</div>
                  </div>
                );
              }) : displayPicks.map((x) => (
                <div className={"pick " + (analysisFactors.hasRealData && x[2] === best ? "best" : "")} key={x[0]}>
                  <div><b>{x[0]}</b><div className="small">{x[1]}</div></div>
                  <div className="pct">{analysisFactors.hasRealData ? `${Number(x[2]).toFixed(1)}%` : "-"}</div>
                </div>
              ))}
            </div>

            {actualMarketPicks.length > 0 && (
              <div className="section">
                <h3>V7 지표 해석</h3>
                <div className="notice" style={{ margin: 0 }}>
                  모델확률은 SportsAPI Form/H2H 및 최근 득실점에서 계산한 값입니다.
                  시장확률은 Betman 배당의 마진(오버라운드)을 제거한 공정 내재확률이고,
                  엣지는 모델확률 - 시장확률입니다.
                  신뢰도는 최근 경기 표본, H2H 표본, 득실점 데이터 사용 여부와 마켓 특성을 따로 평가합니다.
                  추천점수는 모델확률·엣지·신뢰도를 합친 비교용 점수이며 실제 적중률을 보장하는 수치는 아닙니다.
                </div>
              </div>
            )}

            {analysisFactors.scoringUsed && <div className="section">
              <h3>최근 득실점 기반 예상</h3>
              <div className="cards">
                <div className="card">예상 점수<b>{analysisFactors.expectedHomeScore?.toFixed(1) ?? "-"} : {analysisFactors.expectedAwayScore?.toFixed(1) ?? "-"}</b></div>
                <div className="card">예상 총점<b>{analysisFactors.expectedTotal?.toFixed(1) ?? "-"}</b></div>
                <div className="card">예상 점수차<b>{analysisFactors.expectedMargin?.toFixed(1) ?? "-"}</b></div>
              </div>
            </div>}

            {hasH2H && <div className="section"><h3>H2H 상대전적</h3><div className="cards">
              <div className="card">{currentMatch.home}<b>{Number(h2h?.homeWins ?? 0)}승</b></div>
              <div className="card">무승부<b>{Number(h2h?.draws ?? 0)}</b></div>
              <div className="card">{currentMatch.away}<b>{Number(h2h?.awayWins ?? 0)}승</b></div>
            </div></div>}

            {hasRecent && <div className="section"><h3>최근 Form</h3><div className="cards">
              <div className="card">{recentSummary?.home?.teamName ?? currentMatch.home}<b>{homeForm?.wins ?? 0}승 {homeForm?.draws ?? 0}무 {homeForm?.losses ?? 0}패</b><div className="small">득점 {homeForm?.scored ?? 0} / 실점 {homeForm?.conceded ?? 0}</div></div>
              <div className="card">{recentSummary?.away?.teamName ?? currentMatch.away}<b>{awayForm?.wins ?? 0}승 {awayForm?.draws ?? 0}무 {awayForm?.losses ?? 0}패</b><div className="small">득점 {awayForm?.scored ?? 0} / 실점 {awayForm?.conceded ?? 0}</div></div>
            </div></div>}

            {betman.error && <div className="notice">{betman.error}</div>}
            <div className="notice">실전 화면은 Betman에서 현재 배당이 제공되는 모든 미시작 발매경기를 표시합니다. 왼쪽에서 경기를 직접 선택한 뒤 분석 버튼을 누르면 SportsAPI H2H/Form 계산이 시작됩니다.</div>
          </>}
        </section>
      </div>
    </main>
  );
}
