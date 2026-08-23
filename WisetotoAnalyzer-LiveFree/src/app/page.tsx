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

  weightedRecentUsed: boolean;
  homeRecentSample: number;
  awayRecentSample: number;
  homeVenueSample: number;
  awayVenueSample: number;
  scoreShrinkage: number | null;

  rawExpectedHomeScore: number | null;
  rawExpectedAwayScore: number | null;
  scorePrior: number | null;

  homeWeightedScored: number | null;
  homeWeightedConceded: number | null;
  awayWeightedScored: number | null;
  awayWeightedConceded: number | null;

  h2hSample: number;
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

type WeightedProfile = {
  scored: number | null;
  conceded: number | null;
  played: number;
  venuePlayed: number;
  usedVenueBlend: boolean;
};

function fixtureTimeMs(fixture: any) {
  const raw =
    fixture?.startTime ??
    fixture?.date ??
    fixture?.fixture?.date ??
    fixture?.timestamp ??
    fixture?.fixture?.timestamp ??
    null;

  const n = Number(raw);
  if (Number.isFinite(n) && n > 10_000_000_000) return n;
  if (Number.isFinite(n) && n > 1_000_000_000) return n * 1000;

  const parsed = new Date(raw as any).getTime();
  return Number.isFinite(parsed) ? parsed : NaN;
}

function scoreNumber(...values: any[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function fixtureTeamId(fixture: any, side: "home" | "away") {
  return Number(
    fixture?.[side]?.id ??
    fixture?.teams?.[side]?.id ??
    fixture?.participants?.find?.((x: any) =>
      String(x?.position ?? x?.type ?? "").toLowerCase() === side
    )?.id
  );
}

function fixtureTeamName(fixture: any, side: "home" | "away") {
  return String(
    fixture?.[side]?.name ??
    fixture?.teams?.[side]?.name ??
    fixture?.participants?.find?.((x: any) =>
      String(x?.position ?? x?.type ?? "").toLowerCase() === side
    )?.name ??
    ""
  );
}

function fixtureFinalScore(fixture: any) {
  const home = scoreNumber(
    fixture?.homeScore,
    fixture?.score?.home,
    fixture?.scores?.home,
    fixture?.goals?.home,
    fixture?.result?.home,
    fixture?.score?.fullTime?.home,
    fixture?.score?.fulltime?.home,
    fixture?.scores?.current?.home,
    fixture?.home?.score
  );

  const away = scoreNumber(
    fixture?.awayScore,
    fixture?.score?.away,
    fixture?.scores?.away,
    fixture?.goals?.away,
    fixture?.result?.away,
    fixture?.score?.fullTime?.away,
    fixture?.score?.fulltime?.away,
    fixture?.scores?.current?.away,
    fixture?.away?.score
  );

  return home !== null && away !== null ? { home, away } : null;
}

function sameTeam(
  team: RecentTeam | null | undefined,
  fixture: any,
  side: "home" | "away"
) {
  const teamId = Number(team?.teamId);
  const candidateId = fixtureTeamId(fixture, side);

  if (
    Number.isFinite(teamId) &&
    Number.isFinite(candidateId) &&
    teamId > 0 &&
    candidateId > 0
  ) {
    return teamId === candidateId;
  }

  return (
    teamSimilarity(
      team?.teamName,
      fixtureTeamName(fixture, side)
    ) >= 0.72
  );
}

function weightedAverageRows(
  rows: Array<{ scored: number; conceded: number; time: number }>,
  maxGames = 5
) {
  const sorted = [...rows]
    .sort((a, b) => b.time - a.time)
    .slice(0, maxGames);

  if (!sorted.length) {
    return {
      scored: null as number | null,
      conceded: null as number | null,
      played: 0,
    };
  }

  let scored = 0;
  let conceded = 0;
  let weightSum = 0;

  sorted.forEach((row, index) => {
    // 최신 경기일수록 높은 가중치. 1.00 → 0.78 → 0.61 → ...
    const weight = Math.pow(0.78, index);
    scored += row.scored * weight;
    conceded += row.conceded * weight;
    weightSum += weight;
  });

  return {
    scored: weightSum > 0 ? scored / weightSum : null,
    conceded: weightSum > 0 ? conceded / weightSum : null,
    played: sorted.length,
  };
}

function buildWeightedRecentProfile(
  team: RecentTeam | null | undefined,
  wantedVenue: "home" | "away",
  fallbackForm: FormData | null | undefined
): WeightedProfile {
  const fixtures = Array.isArray(team?.fixtures) ? team!.fixtures! : [];
  const overallRows: Array<{ scored: number; conceded: number; time: number }> = [];
  const venueRows: Array<{ scored: number; conceded: number; time: number }> = [];

  fixtures.forEach((fixture: any, index: number) => {
    const score = fixtureFinalScore(fixture);
    if (!score) return;

    let venue: "home" | "away" | null = null;
    if (sameTeam(team, fixture, "home")) venue = "home";
    else if (sameTeam(team, fixture, "away")) venue = "away";
    if (!venue) return;

    const row = {
      scored: venue === "home" ? score.home : score.away,
      conceded: venue === "home" ? score.away : score.home,
      time: Number.isFinite(fixtureTimeMs(fixture))
        ? fixtureTimeMs(fixture)
        : Date.now() - index * 86_400_000,
    };

    overallRows.push(row);
    if (venue === wantedVenue) venueRows.push(row);
  });

  const overall = weightedAverageRows(overallRows, 5);
  const venue = weightedAverageRows(venueRows, 5);

  // fixture 배열의 점수 구조를 읽지 못한 경우 기존 aggregate Form으로 안전하게 fallback.
  const formPlayed = Math.max(0, Number(fallbackForm?.played ?? 0));
  const formScored = safeAverage(fallbackForm?.scored, formPlayed);
  const formConceded = safeAverage(fallbackForm?.conceded, formPlayed);

  const baseScored =
    overall.scored !== null
      ? overall.scored
      : formScored;

  const baseConceded =
    overall.conceded !== null
      ? overall.conceded
      : formConceded;

  if (baseScored === null || baseConceded === null) {
    return {
      scored: null,
      conceded: null,
      played: overall.played || formPlayed,
      venuePlayed: venue.played,
      usedVenueBlend: false,
    };
  }

  if (venue.scored === null || venue.conceded === null || venue.played === 0) {
    return {
      scored: baseScored,
      conceded: baseConceded,
      played: overall.played || formPlayed,
      venuePlayed: 0,
      usedVenueBlend: false,
    };
  }

  // 홈/원정 표본이 3경기 미만이면 전체 최근값과 섞어서 과적합 방지.
  const venueWeight = clamp(venue.played / 3, 0.25, 0.75);

  return {
    scored:
      venue.scored * venueWeight +
      baseScored * (1 - venueWeight),
    conceded:
      venue.conceded * venueWeight +
      baseConceded * (1 - venueWeight),
    played: overall.played || formPlayed,
    venuePlayed: venue.played,
    usedVenueBlend: true,
  };
}

function neutralScorePrior(
  sport: Exclude<Sport, "전체">
) {
  if (sport === "축구") return 1.35;
  if (sport === "야구") return 4.5;
  if (sport === "농구") return 108;
  return 1.5;
}

function shrinkExpectedScore(
  raw: number,
  prior: number,
  sampleStrength: number,
  sport: Exclude<Sport, "전체">
) {
  const strength = clamp(sampleStrength, 0.35, 0.82);
  let value =
    raw * strength +
    prior * (1 - strength);

  if (sport === "축구") value = clamp(value, 0.45, 2.75);
  if (sport === "야구") value = clamp(value, 2.0, 7.5);
  if (sport === "농구") value = clamp(value, 80, 140);
  if (sport === "배구") value = clamp(value, 0.7, 2.4);

  return value;
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

  const h2hSample =
    Math.max(
      0,
      h2hTotal
    );

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

  const homeWeighted =
    buildWeightedRecentProfile(
      recentSummary?.home ?? null,
      "home",
      homeFormData
    );

  const awayWeighted =
    buildWeightedRecentProfile(
      recentSummary?.away ?? null,
      "away",
      awayFormData
    );

  const homeAvgScored =
    homeWeighted.scored;

  const homeAvgConceded =
    homeWeighted.conceded;

  const awayAvgScored =
    awayWeighted.scored;

  const awayAvgConceded =
    awayWeighted.conceded;

  const scoringUsed =
    homeAvgScored !== null &&
    homeAvgConceded !== null &&
    awayAvgScored !== null &&
    awayAvgConceded !== null;

  const weightedRecentUsed =
    homeWeighted.played > 0 ||
    awayWeighted.played > 0;

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

  let scoreShrinkage:
    | number
    | null = null;

  let rawExpectedHomeScore:
    | number
    | null = null;

  let rawExpectedAwayScore:
    | number
    | null = null;

  let scorePrior:
    | number
    | null = null;

  if (scoringUsed) {
    const rawHome =
      (
        homeAvgScored! +
        awayAvgConceded!
      ) /
      2;

    const rawAway =
      (
        awayAvgScored! +
        homeAvgConceded!
      ) /
      2;

    rawExpectedHomeScore =
      rawHome;

    rawExpectedAwayScore =
      rawAway;

    const recentSample =
      Math.min(
        10,
        homeWeighted.played +
        awayWeighted.played
      );

    const venueSample =
      Math.min(
        6,
        homeWeighted.venuePlayed +
        awayWeighted.venuePlayed
      );

    // 최근 전체 표본 70% + 홈/원정 분리 표본 30%.
    const sampleStrength =
      clamp(
        0.35 +
        (recentSample / 10) * 0.33 +
        (venueSample / 6) * 0.14,
        0.35,
        0.82
      );

    scoreShrinkage =
      sampleStrength;

    const prior =
      neutralScorePrior(
        sport
      );

    scorePrior =
      prior;

    expectedHomeScore =
      shrinkExpectedScore(
        rawHome,
        prior,
        sampleStrength,
        sport
      );

    expectedAwayScore =
      shrinkExpectedScore(
        rawAway,
        prior,
        sampleStrength,
        sport
      );

    // 아주 약한 홈 이점만 마지막에 부여.
    if (sport === "축구") expectedHomeScore += 0.08;
    if (sport === "야구") expectedHomeScore += 0.10;
    if (sport === "농구") expectedHomeScore += 1.0;
    if (sport === "배구") expectedHomeScore += 0.03;

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
        0.55;

      awayScore +=
        (awayForm ?? 50) *
        0.55;

      weight += 0.55;
    }

    if (h2hUsed) {
      homeScore +=
        (homeH2H ?? 50) *
        0.15;

      awayScore +=
        (awayH2H ?? 50) *
        0.15;

      weight += 0.15;
    }

    if (
      scoringUsed &&
      expectedMargin !== null
    ) {
      const marginSignal =
        clamp(
          50 +
          expectedMargin *
            (sport === "축구"
              ? 12
              : sport === "야구"
                ? 5
                : sport === "농구"
                  ? 1.2
                  : 8),
          30,
          70
        );

      homeScore +=
        marginSignal *
        0.15;

      awayScore +=
        (100 - marginSignal) *
        0.15;

      weight +=
        0.15;
    }

    homeScore +=
      54 * 0.15;

    awayScore +=
      46 * 0.15;

    weight +=
      0.15;

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

      weightedRecentUsed,

      homeRecentSample:
        homeWeighted.played,

      awayRecentSample:
        awayWeighted.played,

      homeVenueSample:
        homeWeighted.venuePlayed,

      awayVenueSample:
        awayWeighted.venuePlayed,

      scoreShrinkage:
        scoreShrinkage ===
        null
          ? null
          : Number(
              scoreShrinkage.toFixed(
                2
              )
            ),

      rawExpectedHomeScore:
        rawExpectedHomeScore === null
          ? null
          : Number(rawExpectedHomeScore.toFixed(3)),

      rawExpectedAwayScore:
        rawExpectedAwayScore === null
          ? null
          : Number(rawExpectedAwayScore.toFixed(3)),

      scorePrior:
        scorePrior === null
          ? null
          : Number(scorePrior.toFixed(3)),

      homeWeightedScored:
        homeAvgScored === null
          ? null
          : Number(homeAvgScored.toFixed(3)),

      homeWeightedConceded:
        homeAvgConceded === null
          ? null
          : Number(homeAvgConceded.toFixed(3)),

      awayWeightedScored:
        awayAvgScored === null
          ? null
          : Number(awayAvgScored.toFixed(3)),

      awayWeightedConceded:
        awayAvgConceded === null
          ? null
          : Number(awayAvgConceded.toFixed(3)),

      h2hSample,
    } as AnalysisFactors,
  };
}


type MarketPick = {
  key: string;
  market: string;
  pick: string;
  rawProbability: number;
  probability: number;
  odds: number | null;
  marketProbability: number | null;
  edge: number | null;
  calibrationWeight: number | null;
  signalConflictScore: number;
  signalConflictLabel: string;
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

  // Betman의 win/lose 컬럼은 마켓에 따라 의미가 달라집니다.
  // U/O에서는 win/lose가 언더/오버, SUM에서는 홀/짝이므로
  // 실제 선택지 라벨을 generic side보다 반드시 먼저 해석합니다.
  if (/오버|over/i.test(label)) return "over";
  if (/언더|under/i.test(label)) return "under";
  if (/^(홀|odd)$/i.test(label) || label.includes("홀")) return "odd";
  if (/^(짝|even)$/i.test(label) || label.includes("짝")) return "even";
  if (/^(승|홈|home)$/i.test(label) || label.includes("home")) return "home";
  if (/^(무|draw)$/i.test(label) || label.includes("draw")) return "draw";
  if (/^(패|원정|away)$/i.test(label) || label.includes("away")) return "away";

  if (side === "win") return "home";
  if (side === "draw") return "draw";
  if (side === "lose") return "away";
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
  if (score >= 84) return "A";
  if (score >= 76) return "B+";
  if (score >= 68) return "B";
  if (score >= 58) return "C+";
  return "C";
}

type SignalConflict = {
  score: number;
  confidencePenalty: number;
  label: string;
  reasons: string[];
  marketHome: number | null;
  marketAway: number | null;
  modelMargin: number | null;
};

function buildSignalConflict(
  game: BetmanMatch | null | undefined,
  factors: AnalysisFactors,
  recentSummary: RecentSummary | null | undefined,
  h2h: any
): SignalConflict {
  const reasons: string[] = [];
  let score = 0;

  const markets =
    Array.isArray(game?.markets)
      ? game!.markets!
      : [];

  const moneyline =
    markets.find((market: any) => {
      const type =
        String(market?.type ?? "").toLowerCase();
      const name =
        String(market?.betName ?? market?.displayName ?? "");
      return (
        type !== "handicap" &&
        type !== "total" &&
        !/전반/i.test(name) &&
        /승무패|승패/i.test(name)
      );
    }) ?? null;

  let marketHome: number | null = null;
  let marketAway: number | null = null;

  if (moneyline) {
    const fair =
      fairMarketProbabilities(
        moneyline
      ).probabilities;

    marketHome =
      Number.isFinite(fair.home)
        ? fair.home
        : null;

    marketAway =
      Number.isFinite(fair.away)
        ? fair.away
        : null;
  }

  const modelMargin =
    factors.expectedMargin;

  // 1) 가장 강한 안전장치:
  // 오직 일반 승패/승무패 시장 방향과 예상득점 방향을 비교합니다.
  // H -1의 "패"는 원정팀 단순승이 아니므로 여기에서 직접 비교하지 않습니다.
  if (
    marketHome !== null &&
    marketAway !== null &&
    modelMargin !== null
  ) {
    const marketDiff =
      marketHome -
      marketAway;

    if (
      marketDiff >= 12 &&
      modelMargin < -0.05
    ) {
      const severity =
        clamp(
          18 +
          (marketDiff - 12) * 0.45 +
          Math.abs(modelMargin) * 18,
          18,
          48
        );
      score += severity;
      reasons.push(
        `시장 홈우세 ${marketHome.toFixed(1)}% vs 모델 원정우세`
      );
    }

    if (
      marketDiff <= -12 &&
      modelMargin > 0.05
    ) {
      const severity =
        clamp(
          18 +
          (Math.abs(marketDiff) - 12) * 0.45 +
          Math.abs(modelMargin) * 18,
          18,
          48
        );
      score += severity;
      reasons.push(
        `시장 원정우세 ${marketAway.toFixed(1)}% vs 모델 홈우세`
      );
    }
  }

  // 2) H2H가 매우 한쪽인데 득점모델 방향이 반대면 추가 경고.
  const homeWins =
    Number(h2h?.homeWins ?? 0);
  const awayWins =
    Number(h2h?.awayWins ?? 0);
  const h2hDecisions =
    homeWins +
    awayWins;

  if (
    h2hDecisions >= 5 &&
    modelMargin !== null
  ) {
    const homeShare =
      homeWins /
      h2hDecisions;

    if (
      homeShare >= 0.7 &&
      modelMargin < -0.05
    ) {
      score += 16;
      reasons.push(
        `H2H 홈 ${homeWins}-${awayWins} 우세와 득점모델 방향 충돌`
      );
    }

    if (
      homeShare <= 0.3 &&
      modelMargin > 0.05
    ) {
      score += 16;
      reasons.push(
        `H2H 원정 ${awayWins}-${homeWins} 우세와 득점모델 방향 충돌`
      );
    }
  }

  // 3) 최근 Form 방향도 반대면 소폭 추가.
  const homeForm =
    Number(
      recentSummary?.home?.form?.formPercent
    );

  const awayForm =
    Number(
      recentSummary?.away?.form?.formPercent
    );

  if (
    Number.isFinite(homeForm) &&
    Number.isFinite(awayForm) &&
    modelMargin !== null
  ) {
    const formDiff =
      homeForm -
      awayForm;

    if (
      formDiff >= 18 &&
      modelMargin < -0.05
    ) {
      score += 8;
      reasons.push(
        "최근 Form 홈우세와 득점모델 방향 충돌"
      );
    }

    if (
      formDiff <= -18 &&
      modelMargin > 0.05
    ) {
      score += 8;
      reasons.push(
        "최근 Form 원정우세와 득점모델 방향 충돌"
      );
    }
  }

  score =
    clamp(
      score,
      0,
      100
    );

  const confidencePenalty =
    clamp(
      score * 0.28,
      0,
      24
    );

  const label =
    score >= 60
      ? "강한 신호 충돌"
      : score >= 35
        ? "신호 충돌 주의"
        : score >= 15
          ? "경미한 충돌"
          : "신호 일치";

  return {
    score:
      Number(score.toFixed(1)),
    confidencePenalty:
      Number(
        confidencePenalty.toFixed(
          1
        )
      ),
    label,
    reasons,
    marketHome:
      marketHome === null
        ? null
        : Number(marketHome.toFixed(1)),
    marketAway:
      marketAway === null
        ? null
        : Number(marketAway.toFixed(1)),
    modelMargin:
      modelMargin === null
        ? null
        : Number(modelMargin.toFixed(2)),
  };
}


function marketConfidence(
  factors: AnalysisFactors,
  recentSummary: RecentSummary | null | undefined,
  h2h: any,
  market: any,
  overround: number,
  signalConflict: SignalConflict
) {
  const homePlayed = Math.max(0, Number(recentSummary?.home?.form?.played ?? 0));
  const awayPlayed = Math.max(0, Number(recentSummary?.away?.form?.played ?? 0));

  // 최근 경기 표본: 양 팀 각각 5경기를 확보해야 최대점.
  const recentCoverage =
    ((Math.min(homePlayed, 5) + Math.min(awayPlayed, 5)) / 10) * 30;

  // H2H는 과거 상대전적이 현재 전력보다 과대평가되지 않도록 최대 10점만 반영.
  const h2hCount =
    Math.max(0, Number(h2h?.homeWins ?? 0)) +
    Math.max(0, Number(h2h?.awayWins ?? 0)) +
    Math.max(0, Number(h2h?.draws ?? 0));
  const h2hCoverage = (Math.min(h2hCount, 5) / 5) * 10;

  // 실제 최근 득점/실점이 모두 확보됐을 때만 점수모델 가점.
  const scoringCoverage = factors.scoringUsed ? 16 : 0;

  const venueCoverage =
    (
      Math.min(factors.homeVenueSample, 3) +
      Math.min(factors.awayVenueSample, 3)
    ) / 6 * 8;

  // 배당시장이 정상 형성됐는지. 오버라운드가 클수록 감점.
  const marketQuality =
    Number.isFinite(overround) && overround > 0
      ? clamp(100 - Math.max(0, overround - 1) * 250, 35, 100)
      : 35;

  const betName = String(market?.betName ?? market?.displayName ?? "");
  const betTypeName = String(market?.betTypeName ?? "");
  const isFirstHalf = /전반|1st\s*half|first\s*half/i.test(betName);
  const isOddEven = /sum|홀짝|odd|even/i.test(`${betName} ${betTypeName}`);

  let score =
    22 +                 // 기본 데이터 품질
    recentCoverage +
    h2hCoverage +
    scoringCoverage +
    venueCoverage +
    marketQuality * 0.08;

  // 현재 전반 예상은 전체경기 예상득점의 45% 근사치이므로 강하게 감점.
  if (isFirstHalf) score -= 18;

  // SUM=홀짝은 Betman 원본 의미는 확정됐지만 점수 parity에 민감하므로 보수적 감점.
  if (isOddEven) score -= 10;

  // 서로 독립적인 신호(시장/H2H/Form)가 득점모델과 충돌하면
  // 데이터 수신 성공과 예측 신뢰도를 구분하여 강하게 감점.
  score -=
    signalConflict.confidencePenalty;

  // 현재 SportsAPI recentSummary는 홈/원정 분리 표본이 제한적이므로 상한 유지.
  return clamp(score, 28, 84);
}

function calibrateModelProbability(
  rawProbability: number,
  marketProbability: number | null,
  confidence: number
) {
  if (
    marketProbability === null ||
    !Number.isFinite(marketProbability)
  ) {
    return {
      probability: rawProbability,
      modelWeight: null as number | null,
    };
  }

  // 신뢰도에 따라 모델과 시장 공정확률을 보수적으로 혼합.
  const modelWeight =
    clamp(
      0.28 +
      (confidence / 100) * 0.48,
      0.42,
      0.70
    );

  return {
    probability:
      clamp(
        rawProbability * modelWeight +
        marketProbability * (1 - modelWeight),
        1,
        99
      ),
    modelWeight,
  };
}

function recommendationScore(
  modelProbability: number,
  edge: number | null,
  confidence: number
) {
  // V9: 확률이 높아도 시장보다 불리한(음수 엣지) 픽이 최상단으로 올라오지 않게 함.
  const edgeScore =
    edge === null
      ? 35
      : clamp(50 + edge * 2.5, 0, 100);

  let score =
    modelProbability * 0.42 +
    edgeScore * 0.38 +
    confidence * 0.20;

  if (edge !== null && edge < 0) {
    score -= Math.min(20, Math.abs(edge) * 1.5);
  }

  if (edge === null) {
    score -= 8;
  }

  return clamp(score, 0, 100);
}

function pickValueStatus(pick: MarketPick) {
  if (pick.signalConflictScore >= 60) {
    return {
      label: "검증 필요 · 강한 신호 충돌",
      eligible: false,
    };
  }

  if (pick.signalConflictScore >= 35) {
    return {
      label: "주의 · 신호 충돌",
      eligible: false,
    };
  }

  if (pick.marketProbability === null || pick.edge === null) {
    return { label: "시장비교 불가", eligible: false };
  }

  if (pick.edge < 0) {
    return { label: "제외 · 음수 엣지", eligible: false };
  }

  if (pick.confidenceScore < 58) {
    return { label: "관망 · 신뢰도 부족", eligible: false };
  }

  if (pick.edge < 3) {
    return { label: "관망 · 엣지 미미", eligible: false };
  }

  if (pick.edge >= 8 && pick.confidenceScore >= 68) {
    return { label: "가치 우수", eligible: true };
  }

  return { label: "가치 후보", eligible: true };
}

type HandicapOutcome = "home" | "draw" | "away";

/**
 * Betman 절대 규칙:
 * - 왼쪽 팀 = 홈팀
 * - 모든 handicap line은 홈팀에 적용
 * - 결과 승/무/패는 handicap 적용 후 홈팀 기준
 *
 * 예:
 * 홈 2:1, H -1 => (2-1):1 = 1:1 => 무
 * 홈 1:1, H -1 => (1-1):1 = 0:1 => 패
 * 홈 3:1, H -1 => (3-1):1 = 2:1 => 승
 */
function settleBetmanHomeHandicap(
  homeScore: number,
  awayScore: number,
  homeHandicapLine: number
): HandicapOutcome {
  const adjustedHome =
    homeScore +
    homeHandicapLine;

  if (adjustedHome > awayScore) {
    return "home";
  }

  if (adjustedHome < awayScore) {
    return "away";
  }

  return "draw";
}

function settleBetmanMoneyline(
  homeScore: number,
  awayScore: number
): HandicapOutcome {
  if (homeScore > awayScore) {
    return "home";
  }

  if (homeScore < awayScore) {
    return "away";
  }

  return "draw";
}

function betmanHandicapRuleText(
  line: number | null
) {
  if (line === null) {
    return "홈팀 기준 핸디";
  }

  return `홈팀 기준 ${line >= 0 ? "+" : ""}${line}`;
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

  const signalConflict =
    buildSignalConflict(
      game,
      factors,
      recentSummary,
      h2h
    );

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
        const outcome =
          type === "handicap" &&
          line !== null
            ? settleBetmanHomeHandicap(
                row.home,
                row.away,
                line
              )
            : settleBetmanMoneyline(
                row.home,
                row.away
              );

        if (outcome === "home") home += row.p;
        else if (outcome === "away") away += row.p;
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
      } else if (/sum|홀짝|odd|even/i.test(`${betName} ${String(market?.betTypeName ?? "")}`)) {
        // Betman 원본: betName="축구 SUM", betTypeName="일반 홀짝", 선택지=홀/짝.
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
          Number.isFinite(fair)
            ? Number(fair.toFixed(1))
            : null;

        const confidence = marketConfidence(
          factors,
          recentSummary,
          h2h,
          market,
          marketFair.overround,
          signalConflict
        );

        const calibrated =
          calibrateModelProbability(
            best.probability,
            marketProbability,
            confidence
          );

        const calibratedProbability =
          Number(
            calibrated.probability.toFixed(1)
          );

        const edge =
          marketProbability === null
            ? null
            : Number(
                (
                  calibratedProbability -
                  marketProbability
                ).toFixed(1)
              );

        const recScore = recommendationScore(
          calibratedProbability,
          edge,
          confidence
        );

        const periodText = isFirstHalf ? "전반 예상득점 근사" : "전체 예상득점";
        const lineText =
          line !== null
            ? type === "handicap"
              ? ` · ${betmanHandicapRuleText(line)}`
              : ` · 기준 ${line}`
            : "";
        const pushText = push > 0.001 && type === "total" ? ` · 적중무효 ${(push * 100).toFixed(1)}% 제외` : "";

        result.push({
          key,
          market: label,
          pick: best.label,
          rawProbability:
            Number(best.probability.toFixed(1)),
          probability:
            calibratedProbability,
          odds: safeOdds,
          marketProbability,
          edge,
          calibrationWeight:
            calibrated.modelWeight === null
              ? null
              : Number(
                  calibrated.modelWeight.toFixed(2)
                ),
          signalConflictScore:
            signalConflict.score,
          signalConflictLabel:
            signalConflict.label,
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
        rawProbability:
          Number(fallbackProbability.toFixed(1)),
        probability:
          Number(fallbackProbability.toFixed(1)),
        odds: null,
        marketProbability: null,
        edge: null,
        calibrationWeight: null,
        signalConflictScore:
          signalConflict.score,
        signalConflictLabel:
          signalConflict.label,
        confidenceScore: Number(confidence.toFixed(1)),
        confidenceGrade: confidenceGrade(confidence),
        recommendationScore: Number(
          recommendationScore(fallbackProbability, null, confidence).toFixed(1)
        ),
        detail:
          type === "handicap"
            ? betmanHandicapRuleText(line)
            : line !== null
              ? `Betman 기준 ${line}`
              : "Betman 실제 기준",
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
      const confidence = marketConfidence(
        factors,
        recentSummary,
        h2h,
        market,
        marketFair.overround
      );

      const calibrated =
        calibrateModelProbability(
          fallbackBest.probability,
          marketProbability,
          confidence
        );

      const calibratedProbability =
        Number(
          calibrated.probability.toFixed(1)
        );

      const edge =
        marketProbability === null
          ? null
          : Number(
              (
                calibratedProbability -
                marketProbability
              ).toFixed(1)
            );

      result.push({
        key,
        market: label,
        pick: fallbackBest.label,
        rawProbability:
          Number(fallbackBest.probability.toFixed(1)),
        probability:
          calibratedProbability,
        odds:
          Number(fallbackBest.selection?.odds) > 1
            ? Number(fallbackBest.selection?.odds)
            : null,
        marketProbability,
        edge,
        calibrationWeight:
          calibrated.modelWeight === null
            ? null
            : Number(
                calibrated.modelWeight.toFixed(2)
              ),
        signalConflictScore:
          signalConflict.score,
        signalConflictLabel:
          signalConflict.label,
        confidenceScore: Number(confidence.toFixed(1)),
        confidenceGrade: confidenceGrade(confidence),
        recommendationScore: Number(
          recommendationScore(calibratedProbability, edge, confidence).toFixed(1)
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
    // Betman H 라인은 항상 왼쪽 홈팀 기준.
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

  const currentSignalConflict =
    buildSignalConflict(
      betman.matched,
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

  const eligibleMarketPicks = actualMarketPicks.filter(
    (pick) => pickValueStatus(pick).eligible
  );

  const bestActualPick = eligibleMarketPicks.length
    ? [...eligibleMarketPicks].sort(
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
      <style jsx global>{`
        :root{--ui-bg:#f3f6fb;--ui-panel:#fff;--ui-line:#dbe4ef;--ui-text:#172235;--ui-muted:#6c7a90;--ui-blue:#2563eb;--ui-green:#07884a;--ui-red:#d33d3d}
        body{background:var(--ui-bg)!important;color:var(--ui-text)!important}
        .app{max-width:1880px!important;margin:0 auto!important;padding:14px 18px 28px!important}
        .top{background:linear-gradient(135deg,#ffffff,#f5f9ff)!important;border:1px solid var(--ui-line)!important;border-radius:16px!important;padding:14px 16px!important;box-shadow:0 8px 26px rgba(30,50,80,.07)!important}
        .title{font-size:23px!important;letter-spacing:-.5px!important}.sub,.small{color:var(--ui-muted)}
        .tabs{margin:10px 0!important}.tab,.btn{border-radius:10px!important;font-weight:800!important}.tab.active,.btn.primary{background:var(--ui-blue)!important;color:#fff!important}
        .panel{background:#fff!important;border:1px solid var(--ui-line)!important;border-radius:16px!important;box-shadow:0 8px 26px rgba(30,50,80,.07)!important}
        .hero{border-radius:14px!important;background:linear-gradient(135deg,#f8fbff,#eef5ff)!important;border:1px solid #cfe0ff!important;padding:12px 14px!important;margin-bottom:8px!important}
        .hero h2{margin:3px 0!important;font-size:19px!important}.hero .big{font-size:17px!important}.hero .right .pct{color:var(--ui-green)!important;font-size:25px!important}
        .cards{gap:6px!important}.card{border-radius:10px!important;background:#f8fafc!important;border-color:var(--ui-line)!important;padding:7px 8px!important;font-size:10px!important}.card b{font-size:14px!important;margin-top:2px!important}
        .section{border-radius:12px!important;border-color:var(--ui-line)!important;margin-top:8px!important;padding:9px!important}.section h3{font-size:13px!important;margin:0 0 6px!important}
        .compactMarket{border:1px solid var(--ui-line);border-radius:12px;overflow:hidden}
        .compactMarketHead,.compactMarketRow{display:grid;grid-template-columns:minmax(72px,.9fr) minmax(74px,.85fr) 57px 57px 60px 48px 57px;gap:5px;align-items:center;padding:6px 8px}
        .compactMarketHead{background:#edf3fa;color:#617086;font-size:9px;font-weight:900}
        .compactMarketRow{border-top:1px solid #edf1f6;font-size:10px;min-height:31px}
        .compactMarketRow:hover{background:#f7faff}.compactMarketRow.bestRow{background:#eaf8f0;box-shadow:inset 3px 0 0 var(--ui-green)}
        .cmName,.cmPick{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:850}.cmNum{text-align:right;font-variant-numeric:tabular-nums}.cmPos{color:var(--ui-green);font-weight:900}.cmNeg{color:var(--ui-red);font-weight:900}.cmGrade{display:inline-block;background:#edf2f7;border-radius:999px;padding:2px 5px;font-weight:900}
        .quickStats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:7px 0}
        .quickStat{background:#f8fafc;border:1px solid var(--ui-line);border-radius:9px;padding:6px 7px;min-width:0}.quickStat span{display:block;font-size:9px;color:var(--ui-muted);font-weight:800}.quickStat b{display:block;font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        details.uiDetail{margin-top:7px;border:1px solid var(--ui-line);border-radius:10px;overflow:hidden;background:#fff}details.uiDetail>summary{cursor:pointer;padding:7px 9px;background:#f7f9fc;font-size:11px;font-weight:900;list-style:none}details.uiDetail>summary:after{content:"＋";float:right;color:var(--ui-blue)}details.uiDetail[open]>summary:after{content:"－"}.uiDetailBody{padding:8px}
        .notice{border-radius:10px!important;font-size:10px!important;line-height:1.4!important;padding:7px 9px!important}
        @media(max-width:1250px){.quickStats{grid-template-columns:repeat(3,1fr)}.compactMarketHead,.compactMarketRow{grid-template-columns:minmax(65px,.8fr) minmax(68px,.8fr) 52px 52px 55px 44px 52px}}
        @media(max-width:980px){.layout{grid-template-columns:1fr!important}.quickStats{grid-template-columns:repeat(3,1fr)}}
      
        /* V9.2 polished dashboard */
        .top{padding:10px 14px!important;min-height:68px!important}
        .title{font-size:18px!important;line-height:1.15!important}
        .sub{font-size:11px!important;margin-top:4px!important}
        .bar{gap:7px!important}.bar .btn{min-height:34px!important;padding:7px 12px!important;font-size:11px!important}
        .tabs{margin:8px 0!important}.tab{min-height:32px!important;padding:6px 12px!important;font-size:11px!important}
        .panelHeaderTight{padding:11px 13px 8px!important}
        .analysisShell{padding:10px!important}
        .matchSummary{
          display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:10px;
          background:linear-gradient(135deg,#f8fbff,#eef5ff);
          border:1px solid #cfe0ff;border-radius:13px;padding:11px 12px;
        }
        .matchSummary h2{margin:3px 0 4px;font-size:17px;line-height:1.18}
        .matchSummary .matchTime{font-size:17px;font-weight:950;letter-spacing:-.3px}
        .matchSummary .matchMeta{font-size:10px;color:var(--ui-muted);margin-top:2px}
        .matchSummary .matchOk{font-size:10px;color:var(--ui-green);font-weight:800;margin-top:2px}
        .bestBox{
          border:1px solid #bde6ce;background:linear-gradient(135deg,#f2fbf6,#e8f8ef);
          border-radius:11px;padding:9px;display:flex;flex-direction:column;justify-content:center;text-align:right
        }
        .bestBox .label{font-size:9px;color:#507060;font-weight:850}
        .bestBox .pickName{font-size:14px;font-weight:950;color:#116837;margin:3px 0}
        .bestBox .pickPct{font-size:22px;font-weight:950;color:var(--ui-green)}
        .bestBox .pickMeta{font-size:9px;color:#5d6f65;line-height:1.3}
        .betStrip{display:grid;grid-template-columns:1.25fr .9fr .9fr .85fr .7fr .7fr;gap:6px;margin-top:7px}
        .betCell{border:1px solid var(--ui-line);background:#fbfcfe;border-radius:9px;padding:6px 7px;min-width:0}
        .betCell span{display:block;font-size:8px;color:#708096;font-weight:850}
        .betCell b{display:block;margin-top:2px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .kpiGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px}
        .kpiCard{border-radius:11px;padding:9px 10px;border:1px solid var(--ui-line);background:#fff;min-height:72px}
        .kpiCard.green{background:#f2fbf6;border-color:#bde6ce}
        .kpiCard.violet{background:#f7f4ff;border-color:#d9cdfd}
        .kpiCard.orange{background:#fff8f1;border-color:#f5d7b6}
        .kpiCard.blue{background:#f2f7ff;border-color:#cfe0ff}
        .kpiTitle{font-size:9px;font-weight:900;color:#65758a;margin-bottom:5px}
        .kpiValue{font-size:17px;font-weight:950;line-height:1.1}
        .kpiSub{font-size:9px;color:#6c7a90;margin-top:4px}
        .kpiSplit{display:grid;grid-template-columns:1fr 1fr;gap:5px}
        .kpiSplit div{text-align:center}
        .kpiSplit b{display:block;font-size:15px}
        .progressTrack{height:5px;background:#e7e5f4;border-radius:999px;overflow:hidden;margin-top:7px}
        .progressBar{height:100%;background:#6d4aff;border-radius:999px}
        .analysisTitleRow{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:9px;margin-bottom:5px}
        .analysisTitleRow h3{margin:0;font-size:12px}
        .legend{display:flex;gap:8px;font-size:8px;color:#758397;white-space:nowrap}
        .dot{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:3px}
        .dot.good{background:#0a9b53}.dot.neutral{background:#aeb8c6}.dot.bad{background:#df4242}
        .compactMarket{border-radius:11px!important}
        .compactMarketHead,.compactMarketRow{
          grid-template-columns:minmax(74px,.9fr) minmax(76px,.9fr) 56px 56px 59px 49px 58px!important;
          padding:6px 8px!important;min-height:30px
        }
        .compactMarketHead{font-size:8px!important}
        .compactMarketRow{font-size:9px!important}
        .detailFooter{margin-top:8px}
        details.uiDetail>summary{font-size:10px!important;padding:7px 9px!important}
        @media(max-width:1350px){
          .betStrip{grid-template-columns:repeat(3,1fr)}
          .kpiGrid{grid-template-columns:repeat(2,1fr)}
        }
`}</style>
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
            "minmax(720px, 1.32fr) minmax(500px, .88fr)",
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
            className="panelHeaderTight"
            style={{
              padding:
                "11px 13px 8px",
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

        <section className="panel analysisShell" style={{ position: "sticky", top: 8, maxHeight: "calc(100vh - 16px)", overflowY: "auto" }}>
          {!selectedBetman ? <div className="notice">왼쪽 경기목록에서 분석할 경기를 선택하세요.</div> : <>
            <div className="matchSummary">
              <div>
                <div className="small">
                  {I[currentMatch.sport]} {currentMatch.league}
                  {matched?.fixtureId ? ` · Fixture #${matched.fixtureId}` : ""}
                </div>
                <h2>{currentMatch.home} vs {currentMatch.away}</h2>
                <div className="matchTime">{currentMatch.time}</div>
                <div className="matchMeta">경기장: {currentMatch.venue}</div>
                <div className="matchOk">
                  ✓ Betman 실제 발매경기 선택
                  {primaryMatchSeq(selectedBetman) !== null ? ` · #${primaryMatchSeq(selectedBetman)}` : ""}
                </div>
                {matched?.fixtureId && <div className="matchOk">✓ SportsAPI 동일경기 매칭 완료</div>}
              </div>

              <div className="bestBox">
                <div className="label">현재 최고 가치픽</div>
                <div className="pickName">
                  {analysisFactors.hasRealData
                    ? (bestActualPick ? `${bestActualPick.market} ${bestActualPick.pick}` : actualMarketPicks.length ? "가치픽 없음" : bestPick?.[1])
                    : "분석 대기"}
                </div>
                <div className="pickPct">
                  {analysisFactors.hasRealData && bestActualPick ? `${best.toFixed(1)}%` : "-"}
                </div>
                {bestActualPick && (
                  <div className="pickMeta">
                    추천점수 {bestActualPick.recommendationScore.toFixed(1)}
                    <br />
                    엣지 {bestActualPick.edge === null ? "-" : `${bestActualPick.edge >= 0 ? "+" : ""}${bestActualPick.edge.toFixed(1)}%p`}
                    {" · "}신뢰 {bestActualPick.confidenceGrade}
                  </div>
                )}
              </div>
            </div>

            <div className="betStrip">
              <div className="betCell"><span>승패 배당</span><b>{moneylineText(selectedBetman)}</b></div>
              <div className="betCell"><span>핸디</span><b>{handicapText(selectedBetman)}</b></div>
              <div className="betCell"><span>U/O</span><b>{totalText(selectedBetman)}</b></div>
              <div className="betCell"><span>SportsAPI</span><b>{matched?.fixtureId ? "✓ 매칭 완료" : "대기"}</b></div>
              <div className="betCell"><span>H2H</span><b>{hasH2H ? "✓ 수신" : "대기"}</b></div>
              <div className="betCell"><span>Form</span><b>{hasRecent ? "✓ 수신" : "대기"}</b></div>
            </div>

            <div className="kpiGrid">
              <div className="kpiCard green">
                <div className="kpiTitle">예상득점 · 모델</div>
                <div className="kpiSplit">
                  <div><b>{analysisFactors.expectedHomeScore?.toFixed(2) ?? "-"}</b><span className="kpiSub">홈</span></div>
                  <div><b>{analysisFactors.expectedAwayScore?.toFixed(2) ?? "-"}</b><span className="kpiSub">원정</span></div>
                </div>
              </div>

              <div className="kpiCard violet">
                <div className="kpiTitle">모델 강도</div>
                <div className="kpiValue">
                  {analysisFactors.scoreShrinkage === null ? "-" : `${Math.round(analysisFactors.scoreShrinkage * 100)}%`}
                </div>
                <div className="progressTrack">
                  <div
                    className="progressBar"
                    style={{ width: `${analysisFactors.scoreShrinkage === null ? 0 : Math.round(analysisFactors.scoreShrinkage * 100)}%` }}
                  />
                </div>
                <div className="kpiSub">
                  최근 {analysisFactors.homeRecentSample}/{analysisFactors.awayRecentSample} · 장소 {analysisFactors.homeVenueSample}/{analysisFactors.awayVenueSample}
                </div>
              </div>

              <div className="kpiCard orange">
                <div className="kpiTitle">최근 Form</div>
                <div className="kpiSplit">
                  <div><b>{homeForm ? `${homeForm.wins ?? 0}-${homeForm.draws ?? 0}-${homeForm.losses ?? 0}` : "-"}</b><span className="kpiSub">홈</span></div>
                  <div><b>{awayForm ? `${awayForm.wins ?? 0}-${awayForm.draws ?? 0}-${awayForm.losses ?? 0}` : "-"}</b><span className="kpiSub">원정</span></div>
                </div>
              </div>

              <div className="kpiCard blue">
                <div className="kpiTitle">H2H 최근 표본</div>
                <div className="kpiSplit">
                  <div><b>{hasH2H ? Number(h2h?.homeWins ?? 0) : "-"}</b><span className="kpiSub">홈 승</span></div>
                  <div><b>{hasH2H ? Number(h2h?.awayWins ?? 0) : "-"}</b><span className="kpiSub">원정 승</span></div>
                </div>
                <div className="kpiSub" style={{ textAlign: "center" }}>
                  {hasH2H ? `무 ${Number(h2h?.draws ?? 0)}` : "분석 대기"}
                </div>
                <div
                  className="kpiSub"
                  style={{
                    textAlign: "center",
                    marginTop: 3,
                    fontWeight: 900,
                    color:
                      currentSignalConflict.score >= 35
                        ? "#d33d3d"
                        : currentSignalConflict.score >= 15
                          ? "#a46600"
                          : "#07884a",
                  }}
                >
                  {currentSignalConflict.label}
                  {" · "}
                  {currentSignalConflict.score.toFixed(0)}
                </div>
              </div>
            </div>

            <div className="analysisTitleRow">
              <h3>게임유형별 분석 요약</h3>
              <div className="legend">
                <span><i className="dot good" />가치 있음</span>
                <span><i className="dot neutral" />관망</span>
                <span><i className="dot bad" />가치 없음</span>
              </div>
            </div>

            <div className="section" style={{ marginTop: 0 }}>
              {actualMarketPicks.length ? (
                <div className="compactMarket">
                  <div className="compactMarketHead">
                    <div>유형</div><div>추천</div><div className="cmNum">보정</div><div className="cmNum">시장</div><div className="cmNum">엣지</div><div className="cmNum">신뢰</div><div className="cmNum">점수</div>
                  </div>
                  {actualMarketPicks.map((pick) => {
                    const isBest = bestActualPick?.key === pick.key;
                    return (
                      <div className={`compactMarketRow ${isBest ? "bestRow" : ""}`} key={pick.key} title={`${pick.detail} · 핸디는 항상 홈팀(왼쪽) 기준 · 원모델 ${pick.rawProbability.toFixed(1)}% · 보정 ${pick.probability.toFixed(1)}% · ${pickValueStatus(pick).label}`}>
                        <div className="cmName">{pick.market}</div>
                        <div className="cmPick">{pick.pick}</div>
                        <div className="cmNum"><b>{pick.probability.toFixed(1)}%</b></div>
                        <div className="cmNum">{pick.marketProbability === null ? "-" : `${pick.marketProbability.toFixed(1)}%`}</div>
                        <div className={`cmNum ${pick.edge !== null && pick.edge >= 0 ? "cmPos" : "cmNeg"}`}>{pick.edge === null ? "-" : `${pick.edge >= 0 ? "+" : ""}${pick.edge.toFixed(1)}`}</div>
                        <div className="cmNum"><span className="cmGrade">{pick.confidenceGrade}</span></div>
                        <div className="cmNum"><b>{pick.recommendationScore.toFixed(1)}</b></div>
                      </div>
                    );
                  })}
                </div>
              ) : displayPicks.map((x) => (
                <div className={"pick " + (analysisFactors.hasRealData && x[2] === best ? "best" : "")} key={x[0]}>
                  <div><b>{x[0]}</b><div className="small">{x[1]}</div></div>
                  <div className="pct">{analysisFactors.hasRealData ? `${Number(x[2]).toFixed(1)}%` : "-"}</div>
                </div>
              ))}
            </div>

            <details className="uiDetail">
              <summary>V10.2 계산 추적 · 홈팀 핸디 정산 · 신호충돌 · 수축 전/후</summary>
              <div className="uiDetailBody">
                <div className="section" style={{ marginTop: 0 }}>
                  <h3>V10.2 계산 추적 · 홈팀 기준 정산</h3>

                  <div
                    className="notice"
                    style={{
                      margin: "0 0 8px",
                      background: "#f2f7ff",
                      borderColor: "#cfe0ff",
                    }}
                  >
                    <b>Betman 정산 절대 규칙</b>
                    <br />
                    왼쪽 팀 = 홈팀 · 모든 핸디캡은 홈팀에 적용 · 승/무/패는 핸디 적용 후 홈팀 기준 결과입니다.
                    <br />
                    예: 홈 2:1 + H -1 → 1:1 = 무 · 홈 1:1 + H -1 → 0:1 = 패 · 홈 3:1 + H -1 → 2:1 = 승
                  </div>

                  <div className="cards">
                    <div className="card">
                      홈 가중 득/실
                      <b>{analysisFactors.homeWeightedScored?.toFixed(2) ?? "-"} / {analysisFactors.homeWeightedConceded?.toFixed(2) ?? "-"}</b>
                      <div className="small">최신경기 시간가중</div>
                    </div>
                    <div className="card">
                      원정 가중 득/실
                      <b>{analysisFactors.awayWeightedScored?.toFixed(2) ?? "-"} / {analysisFactors.awayWeightedConceded?.toFixed(2) ?? "-"}</b>
                      <div className="small">최신경기 시간가중</div>
                    </div>
                    <div className="card">
                      수축 전 예상
                      <b>{analysisFactors.rawExpectedHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.rawExpectedAwayScore?.toFixed(2) ?? "-"}</b>
                      <div className="small">공격 × 상대수비</div>
                    </div>
                    <div className="card">
                      중립 사전값
                      <b>{analysisFactors.scorePrior?.toFixed(2) ?? "-"}</b>
                      <div className="small">모델 강도 {analysisFactors.scoreShrinkage === null ? "-" : `${Math.round(analysisFactors.scoreShrinkage * 100)}%`}</div>
                    </div>
                    <div className="card">
                      수축 후 예상
                      <b>{analysisFactors.expectedHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.expectedAwayScore?.toFixed(2) ?? "-"}</b>
                      <div className="small">Poisson λ</div>
                    </div>
                    <div className="card">
                      H2H 표본
                      <b>{analysisFactors.h2hSample}</b>
                      <div className="small">승패 모델 최대 15%</div>
                    </div>
                  </div>

                  {actualMarketPicks.length > 0 && (
                    <div style={{ marginTop: 8, overflowX: "auto" }}>
                      <div style={{ minWidth: 620 }}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "90px 70px 70px 70px 70px 70px",
                          gap: 6,
                          fontSize: 9,
                          fontWeight: 900,
                          color: "#64748b",
                          padding: "5px 6px",
                          background: "#f1f5f9",
                          borderRadius: 8,
                        }}>
                          <div>마켓</div><div>원모델</div><div>시장</div><div>모델가중</div><div>보정</div><div>엣지</div>
                        </div>

                        {actualMarketPicks.map((pick) => (
                          <div
                            key={`trace-${pick.key}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "90px 70px 70px 70px 70px 70px",
                              gap: 6,
                              fontSize: 9,
                              padding: "5px 6px",
                              borderBottom: "1px solid #edf1f6",
                            }}
                          >
                            <div><b>{pick.market}</b></div>
                            <div>{pick.rawProbability.toFixed(1)}%</div>
                            <div>{pick.marketProbability === null ? "-" : `${pick.marketProbability.toFixed(1)}%`}</div>
                            <div>{pick.calibrationWeight === null ? "-" : `${Math.round(pick.calibrationWeight * 100)}%`}</div>
                            <div><b>{pick.probability.toFixed(1)}%</b></div>
                            <div style={{
                              color: pick.edge !== null && pick.edge >= 0 ? "#07884a" : "#d33d3d",
                              fontWeight: 800
                            }}>
                              {pick.edge === null ? "-" : `${pick.edge >= 0 ? "+" : ""}${pick.edge.toFixed(1)}%p`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className="notice"
                    style={{
                      margin: "8px 0 0",
                      borderColor:
                        currentSignalConflict.score >= 35
                          ? "#f1b8b8"
                          : "#d8e2ef",
                      background:
                        currentSignalConflict.score >= 35
                          ? "#fff3f3"
                          : "#f8fafc",
                    }}
                  >
                    <b>신호 충돌 진단: {currentSignalConflict.label} · {currentSignalConflict.score.toFixed(0)}/100</b>
                    <br />
                    승패 시장 홈 {currentSignalConflict.marketHome === null ? "-" : `${currentSignalConflict.marketHome.toFixed(1)}%`}
                    {" · "}원정 {currentSignalConflict.marketAway === null ? "-" : `${currentSignalConflict.marketAway.toFixed(1)}%`}
                    {" · "}모델 예상 점수차 {currentSignalConflict.modelMargin === null ? "-" : currentSignalConflict.modelMargin.toFixed(2)}
                    {currentSignalConflict.reasons.length > 0 && (
                      <>
                        <br />
                        {currentSignalConflict.reasons.join(" · ")}
                      </>
                    )}
                  </div>

                  <div className="notice" style={{ margin: "8px 0 0" }}>
                    V10.2는 모든 핸디캡을 홈팀(왼쪽)에 먼저 적용한 뒤 승/무/패를 계산합니다.
                    일반 승패 시장과 핸디캡 시장의 "패" 의미를 분리하고, 신호충돌 진단은 일반 승패 방향에만 사용합니다.
                  </div>
                </div>
            {analysisFactors.scoringUsed && (
              <div className="section">
                <h3>V9 모델 보정 상태</h3>
                <div className="cards">
                  <div className="card">
                    최근 표본
                    <b>{analysisFactors.homeRecentSample} / {analysisFactors.awayRecentSample}</b>
                    <div className="small">홈팀 / 원정팀 최근경기</div>
                  </div>
                  <div className="card">
                    장소 표본
                    <b>{analysisFactors.homeVenueSample} / {analysisFactors.awayVenueSample}</b>
                    <div className="small">홈팀 홈경기 / 원정팀 원정경기</div>
                  </div>
                  <div className="card">
                    모델 강도
                    <b>{analysisFactors.scoreShrinkage === null ? "-" : `${Math.round(analysisFactors.scoreShrinkage * 100)}%`}</b>
                    <div className="small">나머지는 중립값으로 수축</div>
                  </div>
                </div>
                <div className="notice" style={{ margin: "10px 0 0" }}>
                  V9는 최근 경기에 시간가중치를 적용하고 홈팀은 홈경기, 원정팀은 원정경기를 우선 반영합니다.
                  장소 표본이 부족하면 전체 최근 성적과 섞고, 예상득점은 표본수에 따라 중립 사전값 쪽으로 수축해 과신을 줄입니다.
                  H2H는 보조지표로만 제한합니다.
                </div>
              </div>
            )}

            {actualMarketPicks.length > 0 && (
              <div className="section">
                <h3>V9 지표 해석</h3>
                <div className="notice" style={{ margin: 0 }}>
                  원모델확률은 SportsAPI Form/H2H 및 최근 득실점에서 계산하고, 화면의 보정확률은 데이터 신뢰도에 따라 시장 사전값을 일부 혼합한 값입니다.
                  시장확률은 Betman 배당의 마진(오버라운드)을 제거한 공정 내재확률이고,
                  엣지는 모델확률 - 시장확률입니다.
                  V9는 V8의 U/O·SUM 마켓 해석을 유지하면서 최근경기 시간가중치, 홈/원정 분리, 표본수 수축을 추가합니다.
                  전반 마켓은 전체경기 득점의 45% 근사치를 사용하므로 신뢰도를 크게 감점합니다.
                  음수 엣지, 시장비교 불가, 낮은 신뢰도 픽은 최고 추천에서 제외합니다.
                  추천점수는 비교용 지표이며 실제 적중률을 보장하는 수치는 아닙니다.
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
              </div>
            </details>

            {betman.error && <div className="notice">{betman.error}</div>}
            <div className="notice">실전 화면은 Betman에서 현재 배당이 제공되는 모든 미시작 발매경기를 표시합니다. 왼쪽에서 경기를 직접 선택한 뒤 분석 버튼을 누르면 SportsAPI H2H/Form 계산이 시작됩니다.</div>
          </>}
        </section>
      </div>
    </main>
  );
}
