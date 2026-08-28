// DEPLOY_MARKER_V13_6_6_AUTO_BACKTEST_MODE_NO_TOGGLE_20260828
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
  homeOverallScored: number | null;
  homeOverallConceded: number | null;
  awayOverallScored: number | null;
  awayOverallConceded: number | null;
  homeVenueScored: number | null;
  homeVenueConceded: number | null;
  awayVenueScored: number | null;
  awayVenueConceded: number | null;
  homeVenueWeight: number;
  awayVenueWeight: number;
  marketHomeFair: number | null;
  marketAwayFair: number | null;
  scoreGuardApplied: boolean;
  scoreGuardStrength: number;

  homeRobustScored: number | null;
  homeRobustConceded: number | null;
  awayRobustScored: number | null;
  awayRobustConceded: number | null;

  homeMetricShrink: number;
  awayMetricShrink: number;

  preMarketHomeScore: number | null;
  preMarketAwayScore: number | null;
  postShrinkHomeScore: number | null;
  postShrinkAwayScore: number | null;
  postStarterHomeScore: number | null;
  postStarterAwayScore: number | null;
  postLineupHomeScore: number | null;
  postLineupAwayScore: number | null;
  marketAdjustmentHome: number;
  marketAdjustmentAway: number;
  lambdaTraceOk: boolean;
  marketMarginPrior: number | null;
  marketPriorWeight: number;
  venueCoverage: number;

  homeStarterName: string | null;
  awayStarterName: string | null;
  homeStarterEra: number | null;
  awayStarterEra: number | null;
  homeStarterWhip: number | null;
  awayStarterWhip: number | null;
  homeStarterInningsPitched: number | null;
  awayStarterInningsPitched: number | null;
  homeStarterGames: number | null;
  awayStarterGames: number | null;
  homeStarterGamesStarted: number | null;
  awayStarterGamesStarted: number | null;
  homeStarterSampleReliability: number;
  awayStarterSampleReliability: number;
  homeStarterPosteriorEra: number | null;
  awayStarterPosteriorEra: number | null;
  homeStarterPosteriorWhip: number | null;
  awayStarterPosteriorWhip: number | null;
  homeStarterEquivalentInnings: number | null;
  awayStarterEquivalentInnings: number | null;
  pitcherDataUsed: boolean;
  pitcherAdjustmentHome: number;
  pitcherAdjustmentAway: number;

  homeLineupBatterCount: number;
  awayLineupBatterCount: number;
  homeLineupStatsCount: number;
  awayLineupStatsCount: number;
  homeLineupOffenseIndex: number | null;
  awayLineupOffenseIndex: number | null;
  homeLineupReliability: number;
  awayLineupReliability: number;
  lineupAdjustmentHome: number;
  lineupAdjustmentAway: number;
  lineupDataUsed: boolean;
  homeLineupPlayerIdCount: number;
  awayLineupPlayerIdCount: number;
  lineupStatsCoverage: number;
  lineupValueGate: "BLOCK" | "LIMIT" | "OPEN";

  baseballFirstHalfHomeScore: number | null;
  baseballFirstHalfAwayScore: number | null;

  baseballAnalysisStage:
    | "PRE"
    | "STARTER"
    | "LINEUP"
    | "READY";
  baseballAnalysisStageLabel: string;
  baseballLineupPlayerCount: number;
  baseballStarterCount: number;
  baseballDataCompleteness: number;

  baseballPreModelApplied: boolean;
  baseballPreSampleStrength: number;
  baseballPreMarketWeight: number;
  baseballPreMarketMargin: number | null;
  baseballPreRecentSample: number;
  baseballPreVenueSample: number;
};


const BACKTEST_BETMAN_GAMES: BetmanMatch[] = [
  {
    key: "backtest|2026-08-22|19:00|KBO|NC|Samsung",
    gameKey: "backtest-20260822-1900-nc-samsung",
    gameDate: "2026-08-22T19:00:00+09:00",
    gameDateMs: new Date("2026-08-22T19:00:00+09:00").getTime(),
    gameDateStr: "08.22(토) 19:00",
    sport: "야구",
    sportName: "KBO",
    league: "KBO",
    home: "NC",
    away: "삼성",
    stadium: null,
    markets: [
      {
        matchSeq: 5567,
        type: "moneyline",
        betName: "승패",
        betTypeName: "승패",
        displayName: "승패",
        line: 0,
        selections: [
          { side: "win", label: "승", odds: 2.07 },
          { side: "lose", label: "패", odds: 1.53 },
        ],
      },
      {
        matchSeq: 5568,
        type: "other",
        betName: "승1패",
        betTypeName: "승1패",
        displayName: "승1패",
        line: 0,
        selections: [
          { side: "win", label: "승", odds: 3.00 },
          { side: "draw", label: "1", odds: 3.50 },
          { side: "lose", label: "패", odds: 1.89 },
        ],
      },
      {
        matchSeq: 5569,
        type: "handicap",
        betName: "H +2.5",
        betTypeName: "핸디캡",
        displayName: "H +2.5",
        line: 2.5,
        homeBased: true,
        selections: [
          { side: "win", label: "승", odds: 1.40, line: 2.5 },
          { side: "lose", label: "패", odds: 2.37, line: -2.5 },
        ],
      },
      {
        matchSeq: 5570,
        type: "total",
        betName: "U/O 10.5",
        betTypeName: "U/O",
        displayName: "U/O 10.5",
        line: 10.5,
        selections: [
          { side: "under", label: "UNDER", odds: 2.04 },
          { side: "over", label: "OVER", odds: 1.55 },
        ],
      },
      {
        matchSeq: 5571,
        type: "other",
        betName: "SUM",
        betTypeName: "SUM",
        displayName: "SUM",
        line: 0,
        selections: [
          { side: "odd", label: "홀", odds: 1.61 },
          { side: "even", label: "짝", odds: 2.04 },
        ],
      },
      {
        matchSeq: 5572,
        type: "moneyline",
        betName: "전반 승무패",
        betTypeName: "전반 승무패",
        displayName: "전반 승무패",
        line: 0,
        selections: [
          { side: "win", label: "승", odds: 2.30 },
          { side: "draw", label: "무", odds: 6.80 },
          { side: "lose", label: "패", odds: 1.76 },
        ],
      },
      {
        matchSeq: 5573,
        type: "handicap",
        betName: "전반 H +1.5",
        betTypeName: "전반 핸디캡",
        displayName: "전반 H +1.5",
        line: 1.5,
        homeBased: true,
        selections: [
          { side: "win", label: "승", odds: 1.42, line: 1.5 },
          { side: "lose", label: "패", odds: 2.31, line: -1.5 },
        ],
      },
      {
        matchSeq: 5574,
        type: "total",
        betName: "전반 U/O 6.5",
        betTypeName: "전반 U/O",
        displayName: "전반 U/O 6.5",
        line: 6.5,
        selections: [
          { side: "under", label: "UNDER", odds: 1.64 },
          { side: "over", label: "OVER", odds: 1.90 },
        ],
      },
    ],
    backtestManual: true,
    backtestSource: "사용자 제공 경기전 Betman 배당 · 실제 결과 미포함",
  },
].map((game: any) => {
  const markets = Array.isArray(game.markets) ? game.markets : [];
  return {
    ...game,
    moneyline: markets.filter(
      (market: any) =>
        market.type === "moneyline" &&
        !/전반/.test(String(market.betName ?? ""))
    ),
    handicaps: markets.filter(
      (market: any) =>
        market.type === "handicap" &&
        !/전반/.test(String(market.betName ?? ""))
    ),
    totals: markets.filter(
      (market: any) =>
        market.type === "total" &&
        !/전반/.test(String(market.betName ?? ""))
    ),
    otherMarkets: markets.filter(
      (market: any) =>
        market.type === "other" ||
        /전반/.test(String(market.betName ?? ""))
    ),
  };
});



type BacktestValidationResult = {
  homeScore: number;
  awayScore: number;
  firstHalfHomeScore: number | null;
  firstHalfAwayScore: number | null;
  sourceLabel: string;
};

const BACKTEST_VALIDATION_RESULTS: Record<
  string,
  BacktestValidationResult
> = {
  "backtest-20260822-1900-nc-samsung": {
    homeScore: 6,
    awayScore: 8,
    firstHalfHomeScore: null,
    firstHalfAwayScore: null,
    sourceLabel:
      "사용자 제공 최종 경기결과 · 예측 계산 완료 후 검증 전용",
  },
};

function backtestValidationKey(
  game: BetmanMatch | null | undefined
) {
  return String(
    (game as any)?.gameKey ??
    (game as any)?.key ??
    ""
  );
}



function validationGameTimeMs(
  game: BetmanMatch | null | undefined
) {
  if (!game) {
    return NaN;
  }

  const directMs =
    Number(
      (game as any)?.gameDateMs
    );

  if (
    Number.isFinite(directMs) &&
    directMs > 1_000_000_000_000
  ) {
    return directMs;
  }

  const raw =
    (game as any)?.gameDate ??
    (game as any)?.date ??
    (game as any)?.startTime ??
    null;

  if (
    raw === null ||
    raw === undefined
  ) {
    return NaN;
  }

  const numeric =
    Number(raw);

  if (
    Number.isFinite(numeric) &&
    numeric > 10_000_000_000
  ) {
    return numeric;
  }

  if (
    Number.isFinite(numeric) &&
    numeric > 1_000_000_000
  ) {
    return numeric * 1000;
  }

  const parsed =
    new Date(raw).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : NaN;
}

function resolveBacktestValidationResult(
  game: BetmanMatch | null | undefined,
  matched: any
) {
  if (!game) {
    return {
      truth: null as BacktestValidationResult | null,
      matchedBy: "선택 경기 없음",
    };
  }

  const directKey =
    backtestValidationKey(
      game
    );

  if (
    directKey &&
    BACKTEST_VALIDATION_RESULTS[
      directKey
    ]
  ) {
    return {
      truth:
        BACKTEST_VALIDATION_RESULTS[
          directKey
        ],
      matchedBy:
        `gameKey:${directKey}`,
    };
  }

  const fixtureId =
    Number(
      matched?.fixtureId ??
      matched?.selectedFixture?.id ??
      matched?.selectedFixture?.fixtureId ??
      matched?.fixture?.id ??
      matched?.detail?.id
    );

  const matchSeqs =
    Array.isArray(
      (game as any)?.markets
    )
      ? (game as any).markets
          .map(
            (market: any) =>
              Number(
                market?.matchSeq
              )
          )
          .filter(
            (value: number) =>
              Number.isFinite(value)
          )
      : [];

  const homeName =
    normalizeTeamName(
      (game as any)?.home
    );

  const awayName =
    normalizeTeamName(
      (game as any)?.away
    );

  const gameTime =
    validationGameTimeMs(
      game
    );

  /*
   * 현재 등록된 수동 검증 truth의 fallback.
   * 특정 문자열 key 하나에만 의존하지 않고
   * fixture / Betman seq / 팀 / 시간으로도 확인합니다.
   */
  const isNcSamsung =
    (
      (
        Number.isFinite(fixtureId) &&
        fixtureId === 203006
      ) ||
      matchSeqs.includes(
        5567
      )
    ) &&
    (
      (
        homeName.includes("nc") ||
        homeName.includes("ncdinos")
      ) &&
      (
        awayName.includes("삼성") ||
        awayName.includes("samsung")
      )
    ) &&
    (
      !Number.isFinite(gameTime) ||
      Math.abs(
        gameTime -
        new Date(
          "2026-08-22T19:00:00+09:00"
        ).getTime()
      ) <=
        6 * 60 * 60 * 1000
    );

  if (
    isNcSamsung
  ) {
    return {
      truth:
        BACKTEST_VALIDATION_RESULTS[
          "backtest-20260822-1900-nc-samsung"
        ],
      matchedBy:
        Number.isFinite(fixtureId) &&
        fixtureId === 203006
          ? "fixtureId:203006"
          : "Betman matchSeq:5567",
    };
  }

  return {
    truth: null,
    matchedBy:
      "등록된 검증 결과 없음",
  };
}

type BacktestMarketValidation = {
  key: string;
  market: string;
  predictedPick: string;
  actualLabel: string;
  status:
    | "HIT"
    | "MISS"
    | "PENDING";
  note: string;
};


type SimpleBacktestRecord = {
  id: string;
  fixtureKey: string;
  gameLabel: string;
  stage: "PRE" | "STARTER" | "LINEUP" | "READY";
  market: string;
  pick: string;
  probability: number;
  odds: number | null;
  expectedValue: number | null;
  grade: string;
  hit: boolean;
  realizedReturn: number | null;
  brier: number;
  savedAt: number;
};

type BacktestPredictionSnapshot = {
  snapshotId: string;
  fixtureId: number;
  gameKey: string;
  gameLabel: string;
  home: string;
  away: string;
  sport: string;
  league: string;
  gameDateMs: number;
  cutoffMs: number;
  stage: "PRE" | "STARTER" | "LINEUP" | "READY";
  markets: any[];
  picks: Array<{
    key: string;
    market: string;
    pick: string;
    probability: number;
    odds: number | null;
    expectedValue: number | null;
    grade: string;
  }>;
  lockedAt: number;
  locked: true;
  audit: {
    predictionUsesFinalResult: false;
    resultEndpointCalledBeforeLock: false;
  };
};


type BacktestDatasetEntry = {
  id: string;
  schemaVersion: 1;
  game: BetmanMatch;
  fixtureId: number;
  cutoffMs: number;
  combined: any;
  truth: BacktestValidationResult;
  capturedAt: number;
};

const BACKTEST_DATASET_DB_NAME =
  "wisetoto-backtest-dataset-v136";

const BACKTEST_DATASET_STORE =
  "entries";

function openBacktestDatasetDb():
  Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        window.indexedDB.open(
          BACKTEST_DATASET_DB_NAME,
          1
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              BACKTEST_DATASET_STORE
            )
          ) {
            db.createObjectStore(
              BACKTEST_DATASET_STORE,
              {
                keyPath: "id",
              }
            );
          }
        };

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error ??
            new Error(
              "백테스트 데이터셋 DB 열기 실패"
            )
          );
    }
  );
}

function cloneBacktestDatasetValue<T>(
  value: T
): T {
  return JSON.parse(
    JSON.stringify(
      value
    )
  ) as T;
}

async function putBacktestDatasetEntry(
  entry: BacktestDatasetEntry
) {
  const db =
    await openBacktestDatasetDb();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const tx =
          db.transaction(
            BACKTEST_DATASET_STORE,
            "readwrite"
          );

        tx.objectStore(
          BACKTEST_DATASET_STORE
        ).put(
          cloneBacktestDatasetValue(
            entry
          )
        );

        tx.oncomplete =
          () =>
            resolve();

        tx.onerror =
          () =>
            reject(
              tx.error ??
              new Error(
                "백데이터 저장 실패"
              )
            );

        tx.onabort =
          () =>
            reject(
              tx.error ??
              new Error(
                "백데이터 저장 중단"
              )
            );
      }
    );
  } finally {
    db.close();
  }
}

async function getAllBacktestDatasetEntries():
  Promise<BacktestDatasetEntry[]> {
  const db =
    await openBacktestDatasetDb();

  try {
    return await new Promise<
      BacktestDatasetEntry[]
    >(
      (resolve, reject) => {
        const tx =
          db.transaction(
            BACKTEST_DATASET_STORE,
            "readonly"
          );

        const request =
          tx.objectStore(
            BACKTEST_DATASET_STORE
          ).getAll();

        request.onsuccess =
          () =>
            resolve(
              Array.isArray(
                request.result
              )
                ? request.result as BacktestDatasetEntry[]
                : []
            );

        request.onerror =
          () =>
            reject(
              request.error ??
              new Error(
                "백데이터 읽기 실패"
              )
            );
      }
    );
  } finally {
    db.close();
  }
}

async function countBacktestDatasetEntries() {
  const db =
    await openBacktestDatasetDb();

  try {
    return await new Promise<number>(
      (resolve, reject) => {
        const tx =
          db.transaction(
            BACKTEST_DATASET_STORE,
            "readonly"
          );

        const request =
          tx.objectStore(
            BACKTEST_DATASET_STORE
          ).count();

        request.onsuccess =
          () =>
            resolve(
              Number(
                request.result ??
                0
              )
            );

        request.onerror =
          () =>
            reject(
              request.error ??
              new Error(
                "백데이터 개수 확인 실패"
              )
            );
      }
    );
  } finally {
    db.close();
  }
}



const BACKTEST_COLLECTION_CHECKPOINT_KEY =
  "wisetoto-backtest-collection-checkpoint-v1364";

function saveBacktestCollectionCheckpoint(
  value: {
    target: number;
    stored: number;
    remaining: number;
    lastGameId?: string;
    stoppedByQuota?: boolean;
  }
) {
  try {
    window.localStorage.setItem(
      BACKTEST_COLLECTION_CHECKPOINT_KEY,
      JSON.stringify({
        ...value,
        updatedAt: Date.now(),
      })
    );
  } catch {
    // 체크포인트는 보조정보다. IndexedDB 저장 성공 여부와 분리한다.
  }
}

function readBacktestCollectionCheckpoint():
  {
    target: number;
    stored: number;
    remaining: number;
    lastGameId?: string;
    stoppedByQuota?: boolean;
    updatedAt?: number;
  } | null {
  try {
    const raw =
      window.localStorage.getItem(
        BACKTEST_COLLECTION_CHECKPOINT_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

type LegacyRecoveryPreview = {
  recoverable: number;
  snapshots: number;
  truths: number;
  games: number;
  calibrationRows: number;
};

function safeJsonParse(
  value: string | null
) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      value
    );
  } catch {
    return null;
  }
}

function legacyLocalArray(
  key: string
): any[] {
  try {
    const parsed =
      safeJsonParse(
        window.localStorage.getItem(
          key
        )
      );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function legacyLocalObject(
  key: string
): Record<string, any> {
  try {
    const parsed =
      safeJsonParse(
        window.localStorage.getItem(
          key
        )
      );

    return (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    )
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function legacySnapshotList() {
  const raw =
    legacyLocalObject(
      BACKTEST_PRE_SNAPSHOT_STORAGE_KEY
    );

  return Object.values(raw)
    .filter(
      (value: any) =>
        value &&
        typeof value === "object" &&
        Number.isFinite(
          Number(
            value?.fixtureId
          )
        )
    );
}

function legacyGameLibraryList() {
  return legacyLocalArray(
    BACKTEST_GAME_LIBRARY_STORAGE_KEY
  );
}

function legacyCalibrationRows() {
  return legacyLocalArray(
    SIMPLE_BACKTEST_STORAGE_KEY
  );
}

function legacyTruthCandidates() {
  const result:
    Record<string, BacktestValidationResult> =
    {};

  // 코드에 하드코딩된 검증 결과
  for (
    const [
      key,
      value,
    ] of Object.entries(
      BACKTEST_VALIDATION_RESULTS
    )
  ) {
    result[key] =
      value;
  }

  // localStorage에 별도 저장된 truth 후보가 있다면 함께 탐색
  for (
    const key of [
      "wisetoto-backtest-validation-results",
      "wisetoto_v13_validation_results",
      "wisetoto_dynamic_validation_results",
    ]
  ) {
    const obj =
      legacyLocalObject(
        key
      );

    for (
      const [
        k,
        v,
      ] of Object.entries(
        obj
      )
    ) {
      if (
        v &&
        typeof v === "object" &&
        Number.isFinite(
          Number(
            (v as any)?.homeScore
          )
        ) &&
        Number.isFinite(
          Number(
            (v as any)?.awayScore
          )
        )
      ) {
        result[
          k
        ] =
          v as BacktestValidationResult;
      }
    }
  }

  return result;
}

function findLegacyGameForSnapshot(
  snapshot: any,
  games: BetmanMatch[]
) {
  const snapshotHome =
    normalizeTeamName(
      snapshot?.home
    );

  const snapshotAway =
    normalizeTeamName(
      snapshot?.away
    );

  const snapshotTime =
    Number(
      snapshot?.gameDateMs
    );

  let best:
    | BetmanMatch
    | null =
    null;

  let bestScore =
    0;

  for (
    const game of games
  ) {
    const home =
      normalizeTeamName(
        (game as any)?.home
      );

    const away =
      normalizeTeamName(
        (game as any)?.away
      );

    let score =
      0;

    if (
      snapshotHome &&
      home &&
      snapshotHome === home
    ) {
      score += 0.45;
    }

    if (
      snapshotAway &&
      away &&
      snapshotAway === away
    ) {
      score += 0.45;
    }

    const gameTime =
      validationGameTimeMs(
        game
      );

    if (
      Number.isFinite(
        snapshotTime
      ) &&
      Number.isFinite(
        gameTime
      )
    ) {
      const diff =
        Math.abs(
          snapshotTime -
          gameTime
        );

      if (
        diff <=
        6 * 60 * 60 * 1000
      ) {
        score += 0.1;
      }
    }

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;
      best =
        game;
    }
  }

  return bestScore >= 0.8
    ? best
    : null;
}

function findLegacyTruthForSnapshot(
  snapshot: any,
  game: BetmanMatch | null,
  truths:
    Record<
      string,
      BacktestValidationResult
    >
) {
  const candidateKeys =
    [
      String(
        snapshot?.gameKey ??
        ""
      ),
      String(
        (game as any)?.gameKey ??
        ""
      ),
      String(
        (game as any)?.key ??
        ""
      ),
      String(
        snapshot?.fixtureId ??
        ""
      ),
    ].filter(
      Boolean
    );

  for (
    const key
    of candidateKeys
  ) {
    if (
      truths[
        key
      ]
    ) {
      return truths[
        key
      ];
    }
  }

  // 기존 resolver도 활용
  if (game) {
    const resolved =
      resolveBacktestValidationResult(
        game,
        {
          fixtureId:
            Number(
              snapshot?.fixtureId
            ),
        }
      );

    if (
      resolved?.truth
    ) {
      return resolved.truth;
    }
  }

  return null;
}

function legacyRecoveryPreview():
  LegacyRecoveryPreview {
  const snapshots =
    legacySnapshotList();

  const games =
    legacyGameLibraryList();

  const calibrationRows =
    legacyCalibrationRows();

  const truths =
    legacyTruthCandidates();

  let recoverable =
    0;

  for (
    const snapshot
    of snapshots
  ) {
    const game =
      findLegacyGameForSnapshot(
        snapshot,
        games
      );

    const truth =
      findLegacyTruthForSnapshot(
        snapshot,
        game,
        truths
      );

    if (
      game &&
      truth
    ) {
      recoverable +=
        1;
    }
  }

  return {
    recoverable,
    snapshots:
      snapshots.length,
    truths:
      Object.keys(
        truths
      ).length,
    games:
      games.length,
    calibrationRows:
      calibrationRows.length,
  };
}

type SimpleBacktestSummary = {
  games: number;
  records: number;
  hits: number;
  hitRate: number | null;
  roi: number | null;
  avgEv: number | null;
  avgBrier: number | null;
};

// V13.2 Calibration Audit는 V13.0/V13.1 예측값을 수정하지 않고
// 저장된 검증 레코드를 구간별로 재집계하는 읽기 전용 진단 레이어다.
type CalibrationAuditSummary = SimpleBacktestSummary & {
  avgProbability: number | null;
  calibrationGap: number | null;
  absoluteGap: number | null;
};

type CalibrationBucket = {
  key: string;
  label: string;
  summary: CalibrationAuditSummary;
};

const CALIBRATION_MIN_SAMPLE = 20;

function calibrationAuditSummary(
  rows: SimpleBacktestRecord[]
): CalibrationAuditSummary {
  const base = simpleBacktestSummary(rows);

  if (!rows.length) {
    return {
      ...base,
      avgProbability: null,
      calibrationGap: null,
      absoluteGap: null,
    };
  }

  const avgProbability =
    rows.reduce((sum, row) => sum + clamp(row.probability, 0, 100), 0) /
    rows.length;
  const hitRate = base.hitRate;
  const calibrationGap =
    hitRate === null ? null : avgProbability - hitRate;

  return {
    ...base,
    avgProbability,
    calibrationGap,
    absoluteGap:
      calibrationGap === null ? null : Math.abs(calibrationGap),
  };
}

function probabilityCalibrationBuckets(
  rows: SimpleBacktestRecord[]
): CalibrationBucket[] {
  const definitions = [
    { key: "p-0-50", label: "< 50%", min: 0, max: 50 },
    { key: "p-50-55", label: "50~55%", min: 50, max: 55 },
    { key: "p-55-60", label: "55~60%", min: 55, max: 60 },
    { key: "p-60-65", label: "60~65%", min: 60, max: 65 },
    { key: "p-65-70", label: "65~70%", min: 65, max: 70 },
    { key: "p-70-75", label: "70~75%", min: 70, max: 75 },
    { key: "p-75-80", label: "75~80%", min: 75, max: 80 },
    { key: "p-80-101", label: "80%+", min: 80, max: 101 },
  ];

  return definitions.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    summary: calibrationAuditSummary(
      rows.filter((row) =>
        row.probability >= bucket.min && row.probability < bucket.max
      )
    ),
  }));
}

function evCalibrationBuckets(
  rows: SimpleBacktestRecord[]
): CalibrationBucket[] {
  const definitions = [
    { key: "ev-neg10", label: "< -10%", min: -Infinity, max: -10 },
    { key: "ev-neg10-0", label: "-10~0%", min: -10, max: 0 },
    { key: "ev-0-3", label: "0~3%", min: 0, max: 3 },
    { key: "ev-3-5", label: "3~5%", min: 3, max: 5 },
    { key: "ev-5-8", label: "5~8%", min: 5, max: 8 },
    { key: "ev-8-15", label: "8~15%", min: 8, max: 15 },
    { key: "ev-15", label: "15%+", min: 15, max: Infinity },
  ];

  return definitions.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    summary: calibrationAuditSummary(
      rows.filter((row) =>
        row.expectedValue !== null &&
        Number.isFinite(row.expectedValue) &&
        row.expectedValue >= bucket.min &&
        row.expectedValue < bucket.max
      )
    ),
  }));
}

function calibrationGradeBucket(value: string) {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized.includes("STRONG VALUE")) return "STRONG VALUE";
  if (normalized.includes("VALUE")) return "VALUE";
  if (normalized.includes("WATCH")) return "WATCH";
  if (normalized.includes("PASS")) return "PASS";
  return normalized || "-";
}

function calibrationBiasLabel(summary: CalibrationAuditSummary) {
  if (summary.calibrationGap === null) return "-";
  if (summary.records < CALIBRATION_MIN_SAMPLE) return "표본 부족";
  if (summary.calibrationGap >= 5) return "과신";
  if (summary.calibrationGap <= -5) return "과소신";
  return "대체로 보정";
}

const SIMPLE_BACKTEST_STORAGE_KEY =
  "wisetoto-backtest-v12";
const BACKTEST_PRE_SNAPSHOT_STORAGE_KEY = "wisetoto_v13_3_9_pre_prediction_snapshots";

const BACKTEST_GAME_LIBRARY_STORAGE_KEY =
  "wisetoto-backtest-game-library-v1321";

function simpleBacktestSummary(
  rows: SimpleBacktestRecord[]
): SimpleBacktestSummary {
  if (!rows.length) {
    return {
      games: 0,
      records: 0,
      hits: 0,
      hitRate: null,
      roi: null,
      avgEv: null,
      avgBrier: null,
    };
  }

  const gameKeys =
    new Set<string>();

  let hits = 0;
  let returnSum = 0;
  let returnCount = 0;
  let evSum = 0;
  let evCount = 0;
  let brierSum = 0;

  for (const row of rows) {
    gameKeys.add(row.fixtureKey);

    if (row.hit) {
      hits += 1;
    }

    if (
      row.realizedReturn !== null &&
      Number.isFinite(row.realizedReturn)
    ) {
      returnSum += row.realizedReturn;
      returnCount += 1;
    }

    if (
      row.expectedValue !== null &&
      Number.isFinite(row.expectedValue)
    ) {
      evSum += row.expectedValue;
      evCount += 1;
    }

    brierSum += row.brier;
  }

  return {
    games: gameKeys.size,
    records: rows.length,
    hits,
    hitRate:
      rows.length
        ? (hits / rows.length) * 100
        : null,
    roi:
      returnCount
        ? (returnSum / returnCount) * 100
        : null,
    avgEv:
      evCount
        ? evSum / evCount
        : null,
    avgBrier:
      rows.length
        ? brierSum / rows.length
        : null,
  };
}

type BacktestPerformanceRow = {
  key: string;
  label: string;
  records: number;
  hits: number;
  misses: number;
  hitRate: number | null;
};

function backtestPerformanceRow(
  key: string,
  label: string,
  rows: SimpleBacktestRecord[]
): BacktestPerformanceRow {
  const hits =
    rows.filter(
      (row) =>
        row.hit
    ).length;

  const records =
    rows.length;

  return {
    key,
    label,
    records,
    hits,
    misses:
      Math.max(
        0,
        records - hits
      ),
    hitRate:
      records > 0
        ? (
            hits /
            records
          ) *
          100
        : null,
  };
}

function backtestMarketGroup(
  market: string
) {
  const value =
    String(
      market ??
      ""
    );

  if (
    /전반/i.test(
      value
    )
  ) {
    return "전반";
  }

  if (
    /핸디|handicap|\bH\s*[+-]?\d/i.test(
      value
    )
  ) {
    return "핸디캡";
  }

  if (
    /U\/O|언더|오버|OVER|UNDER|total/i.test(
      value
    )
  ) {
    return "U/O";
  }

  if (
    /SUM|홀짝|odd|even/i.test(
      value
    )
  ) {
    return "SUM";
  }

  if (
    /승1패/i.test(
      value
    )
  ) {
    return "승1패";
  }

  return "승패";
}

function isMarketFallbackRecord(
  row: SimpleBacktestRecord
) {
  return /MARKET\s*FALLBACK/i.test(
    String(
      row.grade ??
      ""
    )
  );
}

function normalizedPickToken(
  value: unknown
) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/홈팀/g, "홈")
    .replace(/원정팀/g, "원정");
}

function validateBacktestMarket(
  market: any,
  pick: MarketPick,
  truth: BacktestValidationResult
): BacktestMarketValidation {
  const betName =
    String(
      market?.betName ??
      market?.displayName ??
      market?.betTypeName ??
      pick.market ??
      ""
    );

  const type =
    String(
      market?.type ??
      ""
    ).toLowerCase();

  const line =
    marketNumber(market);

  const isFirstHalf =
    /전반|1st\s*half|first\s*half/i.test(
      betName
    );

  if (
    isFirstHalf &&
    (
      truth.firstHalfHomeScore === null ||
      truth.firstHalfAwayScore === null
    )
  ) {
    return {
      key: pick.key,
      market: pick.market,
      predictedPick: pick.pick,
      actualLabel: "검증 데이터 없음",
      status: "PENDING",
      note: "5이닝 실제 스코어 미입력",
    };
  }

  const homeScore =
    isFirstHalf
      ? truth.firstHalfHomeScore!
      : truth.homeScore;

  const awayScore =
    isFirstHalf
      ? truth.firstHalfAwayScore!
      : truth.awayScore;

  let actualLabel = "";

  const combined =
    `${betName} ${String(
      market?.betTypeName ??
      ""
    )}`;

  if (
    /SUM|홀짝|odd|even/i.test(
      combined
    )
  ) {
    actualLabel =
      (homeScore + awayScore) % 2 === 0
        ? "짝"
        : "홀";
  } else if (
    type === "total" ||
    /U\/O|언더|오버|over|under/i.test(
      combined
    )
  ) {
    if (line === null) {
      return {
        key: pick.key,
        market: pick.market,
        predictedPick: pick.pick,
        actualLabel: "기준값 없음",
        status: "PENDING",
        note: "U/O line 미확인",
      };
    }

    const total = homeScore + awayScore;

    if (total > line) {
      actualLabel = "OVER";
    } else if (total < line) {
      actualLabel = "UNDER";
    } else {
      return {
        key: pick.key,
        market: pick.market,
        predictedPick: pick.pick,
        actualLabel: `PUSH ${line}`,
        status: "PENDING",
        note: "정확히 기준점과 같음",
      };
    }
  } else if (
    /승1패/i.test(
      combined
    )
  ) {
    const margin =
      homeScore -
      awayScore;

    actualLabel =
      margin >= 2
        ? "승"
        : margin <= -2
          ? "패"
          : "1";
  } else if (
    type === "handicap" ||
    /핸디|handicap/i.test(
      combined
    )
  ) {
    if (line === null) {
      return {
        key: pick.key,
        market: pick.market,
        predictedPick: pick.pick,
        actualLabel: "기준값 없음",
        status: "PENDING",
        note: "핸디 line 미확인",
      };
    }

    const outcome =
      settleBetmanHomeHandicap(
        homeScore,
        awayScore,
        line
      );

    actualLabel =
      outcome === "home"
        ? `홈 ${line >= 0 ? "+" : ""}${line}`
        : outcome === "away"
          ? `원정 ${line >= 0 ? "-" : "+"}${Math.abs(line)}`
          : "무";
  } else {
    const outcome =
      settleBetmanMoneyline(
        homeScore,
        awayScore
      );

    actualLabel =
      outcome === "home"
        ? "승"
        : outcome === "away"
          ? "패"
          : "무";
  }

  const predicted =
    normalizedPickToken(
      pick.pick
    );

  const actual =
    normalizedPickToken(
      actualLabel
    );

  const looseHit =
    predicted === actual ||
    (
      actual === "승" &&
      /(^승$|홈승)/.test(predicted)
    ) ||
    (
      actual === "패" &&
      /(^패$|원정승)/.test(predicted)
    ) ||
    (
      actual === "1" &&
      predicted === "1"
    ) ||
    (
      actual === "짝" &&
      predicted.includes("짝")
    ) ||
    (
      actual === "홀" &&
      predicted.includes("홀")
    ) ||
    (
      actual === "under" &&
      predicted.includes("under")
    ) ||
    (
      actual === "over" &&
      predicted.includes("over")
    ) ||
    (
      actual.startsWith("홈") &&
      predicted.startsWith("홈")
    ) ||
    (
      actual.startsWith("원정") &&
      predicted.startsWith("원정")
    );

  return {
    key: pick.key,
    market: pick.market,
    predictedPick: pick.pick,
    actualLabel,
    status:
      looseHit
        ? "HIT"
        : "MISS",
    note:
      isFirstHalf
        ? "5이닝 결과 검증"
        : "최종 경기결과 검증",
  };
}


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

// V11.3.2: SportsAPI 매칭용 팀명 별칭.
// 화면/Betman 원본 팀명은 유지하고, /api/match 요청에만 표준명을 사용합니다.
const SPORTS_API_TEAM_ALIASES: Record<string, string> = {
  // KBO
  "lg": "LG Twins",
  "lgtwins": "LG Twins",
  "두산": "Doosan Bears",
  "doosan": "Doosan Bears",
  "키움": "Kiwoom Heroes",
  "kiwoom": "Kiwoom Heroes",
  "한화": "Hanwha Eagles",
  "hanwha": "Hanwha Eagles",
  "kia": "KIA Tigers",
  "기아": "KIA Tigers",
  "kt": "KT Wiz",
  "ktwiz": "KT Wiz",
  "ssg": "SSG Landers",
  "ssglanders": "SSG Landers",
  "롯데": "Lotte Giants",
  "lotte": "Lotte Giants",
  "nc": "NC Dinos",
  "ncdinos": "NC Dinos",
  "삼성": "Samsung Lions",
  "samsung": "Samsung Lions",
};

function sportsApiTeamName(value: unknown) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeTeamName(raw);
  return SPORTS_API_TEAM_ALIASES[normalized] ?? raw;
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


function actualGameIdentity(game: BetmanMatch) {
  const start = game?.gameDateMs ?? game?.gameDate ?? game?.startTime ?? "";
  const sport = koreanSport(String((game as any)?.sport ?? ""));
  return [normalizeTeamName(betmanTeam(game, "home")), normalizeTeamName(betmanTeam(game, "away")), String(start), sport].join("|");
}

function mergeActualGames(games: BetmanMatch[]) {
  const grouped = new Map<string, BetmanMatch>();
  for (const game of games) {
    const key = actualGameIdentity(game);
    const previous = grouped.get(key);
    if (!previous) {
      grouped.set(key, {...game, key, markets:Array.isArray((game as any)?.markets) ? [...(game as any).markets] : []});
      continue;
    }
    const marketMap = new Map<string, any>();
    for (const market of [...(Array.isArray((previous as any)?.markets)?(previous as any).markets:[]), ...(Array.isArray((game as any)?.markets)?(game as any).markets:[])]) {
      const marketKey = String(market?.matchSeq ?? market?.gameNo ?? market?.id ?? [market?.type ?? market?.marketType ?? market?.name ?? "", market?.line ?? market?.handicap ?? market?.baseValue ?? market?.value ?? "", JSON.stringify(market?.selections ?? [])].join("|"));
      if (marketKey) marketMap.set(marketKey, market);
    }
    const markets = Array.from(marketMap.values());
    grouped.set(key, {...previous, ...game, key, gameKey:(previous as any)?.gameKey ?? (game as any)?.gameKey ?? null, markets,
      moneyline:markets.filter((x:any)=>x?.type==="moneyline"),
      handicaps:markets.filter((x:any)=>x?.type==="handicap"),
      totals:markets.filter((x:any)=>x?.type==="total"),
      otherMarkets:markets.filter((x:any)=>x?.type==="other")});
  }
  return Array.from(grouped.values());
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
  overallScored: number | null;
  overallConceded: number | null;
  venueScored: number | null;
  venueConceded: number | null;
  venueWeight: number;
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
  const visit = (
    value: any,
    depth = 0
  ): number | null => {
    if (
      value === null ||
      value === undefined ||
      depth > 4
    ) {
      return null;
    }

    if (
      typeof value === "number" ||
      typeof value === "string"
    ) {
      const n = Number(value);

      return (
        Number.isFinite(n) &&
        n >= 0
      )
        ? n
        : null;
    }

    if (
      typeof value !== "object"
    ) {
      return null;
    }

    const preferredKeys = [
      "current",
      "display",
      "final",
      "fullTime",
      "fulltime",
      "value",
      "score",
      "runs",
      "points",
      "total",
    ];

    for (const key of preferredKeys) {
      if (key in value) {
        const found =
          visit(
            value[key],
            depth + 1
          );

        if (found !== null) {
          return found;
        }
      }
    }

    return null;
  };

  for (const value of values) {
    const found = visit(value);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function recentTeamId(
  team: RecentTeam | null | undefined
) {
  const id = Number(
    (team as any)?.teamId ??
    (team as any)?.id ??
    (team as any)?.team?.id ??
    (team as any)?.club?.id ??
    (team as any)?.participant?.id
  );
  return Number.isFinite(id) && id > 0 ? id : null;
}

function recentTeamName(
  team: RecentTeam | null | undefined
) {
  const name = String(
    (team as any)?.teamName ??
    (team as any)?.name ??
    (team as any)?.team?.name ??
    (team as any)?.club?.name ??
    (team as any)?.participant?.name ??
    ""
  ).trim();
  return name || null;
}

function fixtureParticipant(
  fixture: any,
  side: "home" | "away"
) {
  const participants = Array.isArray(fixture?.participants)
    ? fixture.participants
    : Array.isArray(fixture?.teams)
      ? fixture.teams
      : [];

  const wanted = side === "home"
    ? ["home", "host", "local", "1"]
    : ["away", "visitor", "guest", "2"];

  return participants.find((item: any) => {
    const marker = String(
      item?.position ?? item?.type ?? item?.side ??
      item?.homeAway ?? item?.location ?? ""
    ).toLowerCase().replace(/[^a-z0-9]/g, "");
    return wanted.includes(marker);
  }) ?? null;
}

function fixtureTeamId(fixture: any, side: "home" | "away") {
  const participant = fixtureParticipant(fixture, side);
  const sideTeam = side === "home" ? fixture?.homeTeam : fixture?.awayTeam;

  const flatId =
    side === "home"
      ? fixture?.homeId
      : fixture?.awayId;

  const id = Number(
    flatId ??
    fixture?.[side]?.id ??
    sideTeam?.id ??
    fixture?.teams?.[side]?.id ??
    fixture?.fixture?.[side]?.id ??
    participant?.id ??
    participant?.team?.id
  );

  return Number.isFinite(id) && id > 0 ? id : NaN;
}

function fixtureTeamName(fixture: any, side: "home" | "away") {
  const participant = fixtureParticipant(fixture, side);
  const sideTeam = side === "home" ? fixture?.homeTeam : fixture?.awayTeam;

  const flatName =
    side === "home"
      ? fixture?.home
      : fixture?.away;

  return String(
    (
      typeof flatName === "string"
        ? flatName
        : null
    ) ??
    fixture?.[side]?.name ??
    sideTeam?.name ??
    fixture?.teams?.[side]?.name ??
    fixture?.fixture?.[side]?.name ??
    participant?.name ??
    participant?.team?.name ??
    ""
  ).trim();
}

function fixtureFinalScore(fixture: any) {
  const home = scoreNumber(
    fixture?.homeScore?.current,
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
    fixture?.awayScore?.current,
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
  const teamId = recentTeamId(team);
  const candidateId = fixtureTeamId(fixture, side);

  if (teamId !== null && Number.isFinite(candidateId) && candidateId > 0) {
    return teamId === candidateId;
  }

  return teamSimilarity(
    recentTeamName(team),
    fixtureTeamName(fixture, side)
  ) >= 0.62;
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

    const venue =
      fixtureTeamSideForBacktest(
        fixture,
        team
      );

    if (!venue) {
      return;
    }

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
      overallScored: overall.scored ?? formScored,
      overallConceded: overall.conceded ?? formConceded,
      venueScored: venue.scored,
      venueConceded: venue.conceded,
      venueWeight: 0,
    };
  }

  if (venue.scored === null || venue.conceded === null || venue.played === 0) {
    return {
      scored: baseScored,
      conceded: baseConceded,
      played: overall.played || formPlayed,
      venuePlayed: 0,
      usedVenueBlend: false,
      overallScored: overall.scored ?? formScored,
      overallConceded: overall.conceded ?? formConceded,
      venueScored: null,
      venueConceded: null,
      venueWeight: 0,
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
    overallScored: overall.scored ?? formScored,
    overallConceded: overall.conceded ?? formConceded,
    venueScored: venue.scored,
    venueConceded: venue.conceded,
    venueWeight,
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


function fairMoneylineForGame(
  game: BetmanMatch | null | undefined
) {
  const markets = Array.isArray(game?.markets) ? game!.markets! : [];
  const moneyline = markets.find((market: any) => {
    const type = String(market?.type ?? "").toLowerCase();
    const name = String(market?.betName ?? market?.displayName ?? "");
    return type !== "handicap" && type !== "total" && !/전반/i.test(name) && /승무패|승패/i.test(name);
  }) ?? null;

  if (!moneyline) return { home: null as number | null, away: null as number | null };

  const fair = fairMarketProbabilities(moneyline).probabilities;
  return {
    home: Number.isFinite(fair.home) ? Number(fair.home) : null,
    away: Number.isFinite(fair.away) ? Number(fair.away) : null,
  };
}

function blendExpectedScoresWithMarketPrior(input: {
  homeScore: number;
  awayScore: number;
  marketHome: number | null;
  marketAway: number | null;
  venueCoverage: number;
}) {
  let {
    homeScore,
    awayScore,
    marketHome,
    marketAway,
    venueCoverage,
  } = input;

  const originalHome =
    homeScore;

  const originalAway =
    awayScore;

  let applied = false;
  let weight = 0;
  let marketMarginPrior:
    | number
    | null = null;

  if (
    marketHome !== null &&
    marketAway !== null
  ) {
    const marketDiff =
      marketHome -
      marketAway;

    const modelMargin =
      homeScore -
      awayScore;

    /*
     * 시장 공정확률의 방향만 약한 score-margin prior로 변환합니다.
     * 확률을 점수로 직접 복사하지 않으며, 축구 기준 ±0.85골로 제한합니다.
     */
    marketMarginPrior =
      clamp(
        (marketDiff / 100) * 1.15,
        -0.85,
        0.85
      );

    const opposite =
      (
        marketDiff >= 18 &&
        modelMargin < -0.05
      ) ||
      (
        marketDiff <= -18 &&
        modelMargin > 0.05
      );

    if (opposite) {
      const severity =
        clamp(
          (
            Math.abs(
              marketDiff
            ) -
            18
          ) /
            35,
          0,
          1
        );

      /*
       * 장소표본이 없을수록 prior 비중을 늘리되 최대 38%.
       * 시장이 매우 강하게 한쪽을 보더라도 독립모델을 완전히 덮지 않습니다.
       */
      weight =
        clamp(
          0.14 +
            (1 -
              venueCoverage) *
              0.16 +
            severity *
              0.08,
          0.14,
          0.38
        );

      const total =
        Math.max(
          0.40,
          homeScore +
            awayScore
        );

      const blendedMargin =
        modelMargin *
          (1 - weight) +
        marketMarginPrior *
          weight;

      homeScore =
        Math.max(
          0.20,
          total / 2 +
            blendedMargin / 2
        );

      awayScore =
        Math.max(
          0.20,
          total / 2 -
            blendedMargin / 2
        );

      applied = true;
    }
  }

  return {
    homeScore,
    awayScore,
    originalHome,
    originalAway,
    applied,
    weight:
      Number(
        weight.toFixed(
          2
        )
      ),
    marketMarginPrior:
      marketMarginPrior === null
        ? null
        : Number(
            marketMarginPrior.toFixed(
              2
            )
          ),
  };
}

function sportMetricPrior(
  sport: Exclude<Sport, "전체">
) {
  if (sport === "축구") return 1.35;
  if (sport === "야구") return 4.5;
  if (sport === "농구") return 108;
  return 1.5;
}

function robustRecentMetric(input: {
  value: number | null;
  played: number;
  venuePlayed: number;
  sport: Exclude<Sport, "전체">;
}) {
  const {
    value,
    played,
    venuePlayed,
    sport,
  } = input;

  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return {
      value: null as number | null,
      shrink: 1,
    };
  }

  const prior =
    sportMetricPrior(
      sport
    );

  let lower = 0;
  let upper = prior * 2;

  if (sport === "축구") {
    lower = 0.30;
    upper = 2.70;
  } else if (sport === "야구") {
    lower = 1.5;
    upper = 7.5;
  } else if (sport === "농구") {
    lower = 75;
    upper = 140;
  } else {
    lower = 0.5;
    upper = 2.8;
  }

  // 1) 최근 극단값 winsorization
  const clipped =
    clamp(
      value,
      lower,
      upper
    );

  // 2) 표본이 5경기여도 최근폼은 변동성이 크므로 pseudo sample 사용.
  // 장소 표본이 없으면 pseudo sample을 더 크게 잡아 보수화.
  const effectivePlayed =
    clamp(
      played,
      0,
      5
    );

  const pseudo =
    venuePlayed > 0
      ? 2.5
      : 4.0;

  const weight =
    effectivePlayed /
    Math.max(
      1,
      effectivePlayed +
      pseudo
    );

  const robust =
    clipped * weight +
    prior * (1 - weight);

  return {
    value:
      robust,
    shrink:
      Number(
        (1 - weight).toFixed(2)
      ),
  };
}


type StarterInfo = {
  name: string | null;
  era: number | null;
  whip: number | null;
  inningsPitched: number | null;
  games: number | null;
  gamesStarted: number | null;
};

function normalizeStatKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function finiteStat(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findNumericStatDeep(
  value: any,
  keys: string[],
  depth = 0
): number | null {
  if (value === null || value === undefined || depth > 6) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumericStatDeep(item, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = normalizeStatKey(rawKey);
    if (
      keys.some(
        (candidate) =>
          key === candidate ||
          key.includes(candidate)
      )
    ) {
      const number = finiteStat(rawValue);
      if (number !== null) return number;
    }
  }

  for (const rawValue of Object.values(value)) {
    const found = findNumericStatDeep(rawValue, keys, depth + 1);
    if (found !== null) return found;
  }

  return null;
}

function objectName(value: any) {
  const candidates = [
    value?.playerName,
    value?.displayName,
    value?.memberName,
    value?.name,
    value?.player?.name,
    value?.athlete?.name,
    value?.person?.name,
    value?.pitcher?.name,
    value?.starter?.name,
    value?.playerInfo?.name,
    value?.playerInfo?.playerName,
    value?.playerInfo?.displayName,
  ];

  for (const candidate of candidates) {
    const name = String(candidate ?? "").trim();
    if (name) return name;
  }

  return null;
}

function looksLikeStartingPitcher(value: any) {
  if (!value || typeof value !== "object") return false;

  const text = [
    value?.position,
    value?.positionName,
    value?.role,
    value?.type,
    value?.status,
    value?.player?.position,
    value?.player?.role,
    value?.pitcher?.role,
    value?.starter,
    value?.starting,
    value?.probable,
  ]
    .map((item) => String(item ?? "").toLowerCase())
    .join(" ");

  const explicitStarter = /starter|starting|probable|선발/.test(text);
  const pitcher = /pitcher|투수|(^|\s)p(\s|$)|sp/.test(text);

  return explicitStarter || (pitcher && !/relief|bullpen|불펜|rp/.test(text));
}

function collectObjectsDeep(
  value: any,
  out: any[] = [],
  depth = 0
) {
  if (value === null || value === undefined || depth > 7) return out;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectsDeep(item, out, depth + 1);
    }
    return out;
  }

  if (typeof value !== "object") return out;

  out.push(value);

  for (const child of Object.values(value)) {
    collectObjectsDeep(child, out, depth + 1);
  }

  return out;
}

function findBranchByKeyDeep(
  value: any,
  wantedKeys: string[],
  depth = 0
): any | null {
  if (!value || typeof value !== "object" || depth > 7) return null;

  const wanted = new Set(
    wantedKeys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );

  for (const [rawKey, child] of Object.entries(value)) {
    const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (wanted.has(key) && child && typeof child === "object") return child;
  }

  for (const child of Object.values(value)) {
    const found = findBranchByKeyDeep(child, wantedKeys, depth + 1);
    if (found) return found;
  }
  return null;
}

function starterInfoFromObject(value: any): StarterInfo {
  if (!value || typeof value !== "object") {
    return { name: null, era: null, whip: null, inningsPitched: null, games: null, gamesStarted: null };
  }

  const era = findNumericStatDeep(
    value,
    ["era", "earnedrunaverage", "평균자책", "평균자책점"]
  );
  const whip = findNumericStatDeep(
    value,
    ["whip", "walkshitsperinningpitched"]
  );
  const inningsPitched = findNumericStatDeep(
    value,
    ["inningspitched", "inningpitched", "innings", "ip", "투구이닝", "이닝"]
  );
  const gamesStarted = findNumericStatDeep(
    value,
    ["gamesstarted", "gamestarted", "starts", "startgames", "gs", "선발경기", "선발"]
  );
  const games = findNumericStatDeep(
    value,
    ["gamesplayed", "games", "gamecount", "appearances", "g", "경기수", "경기"]
  );

  return {
    name: objectName(value),
    era: era !== null ? clamp(era, 0.5, 12) : null,
    whip: whip !== null ? clamp(whip, 0.5, 3) : null,
    inningsPitched: inningsPitched !== null ? clamp(inningsPitched, 0, 300) : null,
    games: games !== null ? clamp(games, 0, 100) : null,
    gamesStarted: gamesStarted !== null ? clamp(gamesStarted, 0, 100) : null,
  };
}

function starterFromLineups(
  lineups: any,
  side: "home" | "away",
  teamName: string
): StarterInfo {
  /*
   * V12.5.4: Preview가 homeStarter/awayStarter를 명시하면 side를 추론하지 않습니다.
   * 이름 중복이나 bullpen/candidate 탐색이 반대편 선발을 덮어쓰는 문제를 차단합니다.
   */
  const directStarter = findBranchByKeyDeep(
    lineups,
    side === "home"
      ? ["homeStarter", "homeStartingPitcher", "homeProbablePitcher"]
      : ["awayStarter", "awayStartingPitcher", "awayProbablePitcher"]
  );

  if (directStarter) {
    const direct = starterInfoFromObject(directStarter);
    if (direct.name) return direct;
  }

  const objects = collectObjectsDeep(lineups);
  const normalizedTeam = normalizeTeamName(teamName);

  const ranked = objects
    .map((value) => {
      const name = objectName(value);
      if (!name) return { value, score: -999 };

      const teamText = normalizeTeamName(
        String(value?.team?.name ?? value?.teamName ?? value?.club?.name ?? "")
      );
      const sideText = String(
        value?.side ?? value?.homeAway ?? value?.location ?? ""
      ).toLowerCase();

      let score = 0;
      if (
        teamText && normalizedTeam &&
        (teamText.includes(normalizedTeam) || normalizedTeam.includes(teamText))
      ) score += 6;

      if (
        sideText === side ||
        (side === "home" && /home|홈/.test(sideText)) ||
        (side === "away" && /away|원정/.test(sideText))
      ) score += 4;

      if (looksLikeStartingPitcher(value)) score += 8;
      const era = findNumericStatDeep(value, ["era", "earnedrunaverage", "평균자책", "평균자책점"]);
      const whip = findNumericStatDeep(value, ["whip", "walkshitsperinningpitched"]);
      if (era !== null) score += 2;
      if (whip !== null) score += 2;
      return { value, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return !best || best.score < 8
    ? { name: null, era: null, whip: null, inningsPitched: null, games: null, gamesStarted: null }
    : starterInfoFromObject(best.value);
}
function starterEquivalentInnings(
  starter: StarterInfo
) {
  if (
    starter.inningsPitched !== null &&
    starter.inningsPitched >= 0
  ) {
    return starter.inningsPitched;
  }

  /*
   * IP가 없는 공급자 응답만 GS/G로 보조 추정한다.
   * 선발 1경기 ≈ 5.2IP, 전체 경기만 있으면 보수적으로 2IP 상당.
   */
  if (
    starter.gamesStarted !== null &&
    starter.gamesStarted > 0
  ) {
    return starter.gamesStarted * 5.2;
  }

  if (
    starter.games !== null &&
    starter.games > 0
  ) {
    return starter.games * 2;
  }

  return null;
}

function starterSampleReliability(
  starter: StarterInfo
) {
  const equivalentInnings =
    starterEquivalentInnings(starter);

  if (
    equivalentInnings !== null
  ) {
    /*
     * Empirical-Bayes prior strength = 30 innings.
     * 1.5IP -> 약 5%, 30IP -> 50%, 60IP -> 67%, 90IP -> 75%.
     */
    return clamp(
      equivalentInnings /
        (equivalentInnings + 30),
      0.03,
      0.90
    );
  }

  /*
   * ERA/WHIP는 있는데 표본량 필드가 없을 때도
   * 완전 신뢰하지 않고 25%만 허용.
   */
  if (
    starter.era !== null ||
    starter.whip !== null
  ) {
    return 0.25;
  }

  return 0;
}

function starterBayesianPosterior(
  starter: StarterInfo
) {
  const reliability =
    starterSampleReliability(
      starter
    );

  const priorEra = 4.50;
  const priorWhip = 1.35;

  const posteriorEra =
    starter.era === null
      ? null
      : priorEra +
        (
          starter.era -
          priorEra
        ) *
          reliability;

  const posteriorWhip =
    starter.whip === null
      ? null
      : priorWhip +
        (
          starter.whip -
          priorWhip
        ) *
          reliability;

  return {
    reliability,
    equivalentInnings:
      starterEquivalentInnings(
        starter
      ),
    era:
      posteriorEra === null
        ? null
        : Number(
            posteriorEra.toFixed(3)
          ),
    whip:
      posteriorWhip === null
        ? null
        : Number(
            posteriorWhip.toFixed(3)
          ),
  };
}

function pitcherRunFactor(
  starter: StarterInfo
) {
  const posterior =
    starterBayesianPosterior(
      starter
    );

  const eraFactor =
    posterior.era === null
      ? null
      : clamp(
          posterior.era / 4.50,
          0.78,
          1.25
        );

  const whipFactor =
    posterior.whip === null
      ? null
      : clamp(
          posterior.whip / 1.35,
          0.82,
          1.20
        );

  if (
    eraFactor === null &&
    whipFactor === null
  ) {
    return {
      factor: 1,
      weight: 0,
      sampleReliability:
        posterior.reliability,
      posterior,
    };
  }

  /*
   * 표본 수축은 posterior 생성 시 이미 한 번만 적용한다.
   * 여기서는 ERA/WHIP 데이터 완성도에 따른 구조적 가중치만 적용한다.
   */
  const factor =
    eraFactor !== null &&
    whipFactor !== null
      ? eraFactor * 0.70 +
        whipFactor * 0.30
      : eraFactor ??
        whipFactor ??
        1;

  return {
    factor,
    weight:
      eraFactor !== null &&
      whipFactor !== null
        ? 0.36
        : 0.24,
    sampleReliability:
      posterior.reliability,
    posterior,
  };
}

function applyPitcherAdjustment(
  baseRuns: number,
  opponentStarter: StarterInfo,
  strengthMultiplier = 1
) {
  const quality = pitcherRunFactor(opponentStarter);

  if (quality.weight <= 0) {
    return {
      runs: baseRuns,
      adjustment: 0,
      used: false,
    };
  }

  const weight = clamp(
    quality.weight * strengthMultiplier,
    0,
    0.52
  );

  const multiplier =
    1 + (quality.factor - 1) * weight;

  const runs = clamp(
    baseRuns * multiplier,
    Math.max(0.20, baseRuns * 0.78),
    baseRuns * 1.22
  );

  return {
    runs,
    adjustment: Number((runs - baseRuns).toFixed(3)),
    used: true,
  };
}


type BatterSeasonInfo = {
  name: string | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  plateAppearances: number | null;
};

type LineupOffenseProfile = {
  batterCount: number;
  statsCount: number;
  offenseIndex: number | null;
  reliability: number;
  rawFactor: number;
};

function normalizeRateStat(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value > 1.5 && value <= 150) return value / 100;
  return value;
}

function batterSeasonInfo(value: any): BatterSeasonInfo {
  const stats =
    value?.currentSeasonStats ??
    value?.seasonStats ??
    value?.stats ??
    value;

  const avg = normalizeRateStat(
    findNumericStatDeep(stats, [
      "avg", "battingaverage", "average", "타율"
    ])
  );

  const obp = normalizeRateStat(
    findNumericStatDeep(stats, [
      "obp", "onbasepercentage", "onbasepct", "출루율"
    ])
  );

  const slg = normalizeRateStat(
    findNumericStatDeep(stats, [
      "slg", "sluggingpercentage", "sluggingpct", "장타율"
    ])
  );

  let ops = normalizeRateStat(
    findNumericStatDeep(stats, [
      "ops", "onbaseplusslugging", "출루율장타율"
    ])
  );

  if (ops === null && obp !== null && slg !== null) {
    ops = obp + slg;
  }

  const plateAppearances = findNumericStatDeep(stats, [
    "plateappearances", "plateappearance", "pa", "타석"
  ]);

  return {
    name: objectName(value),
    avg,
    obp,
    slg,
    ops,
    plateAppearances:
      plateAppearances === null
        ? null
        : clamp(plateAppearances, 0, 800),
  };
}

function declaredTeamLineup(
  lineups: any,
  side: "home" | "away"
) {
  const teamBranch = findBranchByKeyDeep(
    lineups,
    side === "home"
      ? ["homeTeamLineUp", "homeTeamLineup", "homeLineUp", "homeLineup"]
      : ["awayTeamLineUp", "awayTeamLineup", "awayLineUp", "awayLineup"]
  );

  if (!teamBranch || typeof teamBranch !== "object") return [];

  const fullLineup =
    teamBranch?.fullLineUp ??
    teamBranch?.fullLineup ??
    teamBranch?.startingLineUp ??
    teamBranch?.startingLineup ??
    null;

  return Array.isArray(fullLineup) ? fullLineup : [];
}

function lineupBatters(
  lineups: any,
  side: "home" | "away",
  starterName: string | null
) {
  const lineup = declaredTeamLineup(lineups, side);
  const normalizedStarter = normalizeTeamName(starterName ?? "");

  return lineup
    .filter((player: any, index: number) => {
      const name = objectName(player);
      const normalizedName = normalizeTeamName(name ?? "");
      const position = String(
        player?.position ??
        player?.positionName ??
        player?.pos ??
        ""
      ).trim().toLowerCase();

      const pitcher =
        index === 0 ||
        position === "1" ||
        /pitcher|투수/.test(position) ||
        Boolean(
          normalizedStarter &&
          normalizedName === normalizedStarter
        );

      return Boolean(name) && !pitcher;
    })
    .slice(0, 9);
}

/* V12.7: fullLineUp player objects often omit season stats. Resolve a batter's
   pre-game season stats from other NAVER preview branches by stable player id
   first, then exact normalized player name. Result/boxscore/statistics branches
   are never consulted here. */
function playerIdentity(value: any) {
  const candidates = [
    value?.playerId, value?.playerID, value?.id, value?.memberId,
    value?.player?.id, value?.playerInfo?.playerId, value?.playerInfo?.id,
    value?.athlete?.id, value?.person?.id
  ];
  for (const candidate of candidates) {
    const id = String(candidate ?? "").trim();
    if (id) return id;
  }
  return null;
}

function hasPregameBatterSeasonStats(value: any) {
  if (!value || typeof value !== "object") return false;
  const stats = value?.currentSeasonStats ?? value?.seasonStats ?? null;
  if (!stats || typeof stats !== "object") return false;
  const info = batterSeasonInfo(value);
  return info.ops !== null || (info.obp !== null && info.slg !== null) || info.avg !== null;
}

function buildPregameBatterStatsIndex(lineups: any) {
  const byId = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const obj of collectObjectsDeep(lineups)) {
    if (!hasPregameBatterSeasonStats(obj)) continue;
    const id = playerIdentity(obj);
    const name = normalizeTeamName(objectName(obj) ?? "");
    if (id && !byId.has(id)) byId.set(id, obj);
    if (name && !byName.has(name)) byName.set(name, obj);
  }
  return { byId, byName };
}

function resolvePregameBatterStats(player: any, index: ReturnType<typeof buildPregameBatterStatsIndex>) {
  if (hasPregameBatterSeasonStats(player)) return player;
  const id = playerIdentity(player);
  if (id && index.byId.has(id)) return index.byId.get(id);
  const name = normalizeTeamName(objectName(player) ?? "");
  if (name && index.byName.has(name)) return index.byName.get(name);
  return player;
}


function lineupPlayerId(
  value: any
): string | null {
  const raw =
    value?.resolvedPlayerId ??
    value?.pcode ??
    value?.playerCode ??
    value?.playerId ??
    value?.playerID ??
    value?.id ??
    value?.player?.pcode ??
    value?.player?.playerCode ??
    value?.player?.playerId ??
    value?.player?.id ??
    null;

  if (
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  const text =
    String(raw).trim();

  return text || null;
}

function lineupPlayerIdCount(
  lineups: any,
  side: "home" | "away",
  starterName: string | null
) {
  return lineupBatters(
    lineups,
    side,
    starterName
  ).filter(
    (player: any) =>
      Boolean(
        lineupPlayerId(player)
      )
  ).length;
}

function lineupOffenseProfile(
  lineups: any,
  side: "home" | "away",
  starterName: string | null
): LineupOffenseProfile {
  const batters = lineupBatters(lineups, side, starterName);
  const statsIndex = buildPregameBatterStatsIndex(lineups);
  const infos = batters.map((player) => batterSeasonInfo(resolvePregameBatterStats(player, statsIndex)));

  const usable = infos.filter(
    (item) =>
      item.ops !== null ||
      (item.obp !== null && item.slg !== null) ||
      item.avg !== null
  );

  if (!usable.length) {
    return {
      batterCount: batters.length,
      statsCount: 0,
      offenseIndex: null,
      reliability: 0,
      rawFactor: 1,
    };
  }

  const factors = usable.map((item) => {
    if (item.ops !== null) {
      return clamp(item.ops / 0.720, 0.72, 1.30);
    }

    if (item.obp !== null && item.slg !== null) {
      return clamp((item.obp + item.slg) / 0.720, 0.72, 1.30);
    }

    return clamp((item.avg ?? 0.255) / 0.255, 0.78, 1.22);
  });

  const rawFactor =
    factors.reduce((sum, value) => sum + value, 0) /
    factors.length;

  const coverage = clamp(usable.length / 9, 0, 1);

  const paValues = usable
    .map((item) => item.plateAppearances)
    .filter((value): value is number => value !== null);

  const avgPa = paValues.length
    ? paValues.reduce((sum, value) => sum + value, 0) / paValues.length
    : null;

  const sampleReliability =
    avgPa === null
      ? 0.55
      : clamp(avgPa / 180, 0.20, 1);

  const reliability = clamp(
    coverage * sampleReliability,
    0,
    1
  );

  const offenseIndex =
    1 + (rawFactor - 1) * reliability;

  return {
    batterCount: batters.length,
    statsCount: usable.length,
    offenseIndex: Number(offenseIndex.toFixed(4)),
    reliability: Number(reliability.toFixed(4)),
    rawFactor: Number(rawFactor.toFixed(4)),
  };
}

function applyLineupAdjustment(
  baseRuns: number,
  profile: LineupOffenseProfile,
  strengthMultiplier = 1
) {
  if (
    profile.offenseIndex === null ||
    profile.reliability <= 0 ||
    profile.statsCount <= 0
  ) {
    return {
      runs: baseRuns,
      adjustment: 0,
      used: false,
    };
  }

  const effectiveWeight = clamp(
    0.55 * strengthMultiplier,
    0,
    0.75
  );

  const multiplier = clamp(
    1 + (profile.offenseIndex - 1) * effectiveWeight,
    0.92,
    1.08
  );

  const runs = baseRuns * multiplier;

  return {
    runs,
    adjustment: Number((runs - baseRuns).toFixed(3)),
    used: true,
  };
}


type BaseballAnalysisStage =
  | "PRE"
  | "STARTER"
  | "LINEUP"
  | "READY";

function collectDeclaredLineupNames(lineups: any) {
  const names = new Set<string>();
  const visited = new Set<any>();

  const addPlayers = (value: any, depth = 0) => {
    if (value === null || value === undefined || depth > 5) return;
    if (Array.isArray(value)) {
      value.forEach((item) => addPlayers(item, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    const name = objectName(value);
    if (name) names.add(normalizeTeamName(name) || name.toLowerCase());
    Object.values(value).forEach((child) => addPlayers(child, depth + 1));
  };

  const visit = (value: any, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 7 || visited.has(value)) return;
    visited.add(value);
    for (const [rawKey, child] of Object.entries(value)) {
      const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
      /* bullpen/batterCandidate는 발표 라인업 인원으로 세지 않습니다. */
      if (/^(fulllineup|startinglineup|startlineup|lineup|battingorder)$/.test(key)) {
        addPlayers(child);
        continue;
      }
      if (child && typeof child === "object") visit(child, depth + 1);
    }
  };

  visit(lineups);
  return names;
}

function baseballDataAvailability(
  lineups: any,
  homeStarter: StarterInfo,
  awayStarter: StarterInfo
) {
  /* V12.5.4: 전체 발견 선수 수가 아니라 실제 발표 lineup branch만 집계. */
  const lineupPlayerCount = collectDeclaredLineupNames(lineups).size;

  const starterCount =
    Number(Boolean(homeStarter.name)) +
    Number(Boolean(awayStarter.name));

  let stage: BaseballAnalysisStage = "PRE";
  if (lineupPlayerCount >= 16 && starterCount >= 2) stage = "READY";
  else if (lineupPlayerCount >= 14) stage = "LINEUP";
  else if (starterCount > 0) stage = "STARTER";

  const label =
    stage === "READY"
      ? "경기 임박 · 분석 확정 단계"
      : stage === "LINEUP"
        ? "라인업 발표 · 최종 검증 전"
        : stage === "STARTER"
          ? "선발 발표 · 라인업 대기"
          : "사전 분석 · 선발/라인업 미발표";

  const completeness =
    stage === "READY" ? 100 :
    stage === "LINEUP" ? 78 :
    stage === "STARTER" ? 52 : 30;

  return { stage, label, lineupPlayerCount, starterCount, completeness };
}
function applyBaseballStageGate(
  valueGrade: {
    grade:
      | "PASS"
      | "WATCH"
      | "VALUE"
      | "STRONG VALUE";
    score: number;
    reason: string;
  },
  factors: AnalysisFactors
) {
  if (
    factors.baseballAnalysisStage ===
    "READY"
  ) {
    return {
      ...valueGrade,
      stageGradeLabel: null as string | null,
    };
  }

  if (
    valueGrade.grade !== "VALUE" &&
    valueGrade.grade !== "STRONG VALUE"
  ) {
    return {
      ...valueGrade,
      stageGradeLabel: null as string | null,
    };
  }

  const prefix =
    factors.baseballAnalysisStage ===
    "LINEUP"
      ? "LINEUP VALUE"
      : factors.baseballAnalysisStage ===
          "STARTER"
        ? "STARTER VALUE"
        : "PRE VALUE";

  return {
    grade: "WATCH" as const,
    score:
      valueGrade.score,
    reason:
      `${prefix} · ${factors.baseballAnalysisStageLabel} · ${valueGrade.reason}`,
    stageGradeLabel:
      prefix,
  };
}



function baseballPreUncertaintyWeight(
  market: any,
  factors: AnalysisFactors
) {
  if (
    factors.baseballAnalysisStage !==
    "PRE"
  ) {
    return 0;
  }

  const betName =
    String(
      market?.betName ??
      market?.displayName ??
      market?.betTypeName ??
      ""
    );

  const type =
    String(
      market?.type ??
      ""
    ).toLowerCase();

  const combined =
    `${betName} ${String(
      market?.betTypeName ??
      ""
    )}`;

  const isFirstHalf =
    /전반|1st\s*half|first\s*half/i.test(
      combined
    );

  const isSum =
    /SUM|홀짝|odd|even/i.test(
      combined
    );

  const isWin1Lose =
    /승1패|1점차/i.test(
      combined
    );

  const isTotal =
    type === "total" ||
    /U\/O|언더|오버|over|under/i.test(
      combined
    );

  const isHandicap =
    type === "handicap" ||
    /핸디|handicap/i.test(
      combined
    );

  let base =
    0.18;

  if (isHandicap) {
    base = 0.22;
  }

  if (isTotal) {
    base = 0.28;
  }

  if (isWin1Lose) {
    base = 0.30;
  }

  if (isSum) {
    base = 0.32;
  }

  if (isFirstHalf) {
    base =
      Math.max(
        base,
        0.34
      );
  }

  /*
   * 데이터 완성도가 PRE 기본 30%보다 높아지면
   * 같은 PRE 안에서도 페널티가 조금씩 줄어듭니다.
   */
  const incompleteness =
    clamp(
      (
        100 -
        factors.baseballDataCompleteness
      ) /
        70,
      0,
      1
    );

  return Number(
    (
      base *
      (
        0.65 +
        incompleteness *
          0.35
      )
    ).toFixed(2)
  );
}

function applyBaseballPreUncertainty(
  pick: MarketPick,
  market: any,
  factors: AnalysisFactors
): MarketPick {
  if (
    factors.baseballAnalysisStage !==
    "PRE"
  ) {
    return {
      ...pick,
      preUncertaintyApplied:
        false,
      preProbabilityBefore:
        pick.probability,
      preUncertaintyWeight:
        0,
      preUncertaintyTarget:
        null,
    };
  }

  const weight =
    baseballPreUncertaintyWeight(
      market,
      factors
    );

  const target =
    pick.marketProbability !== null &&
    Number.isFinite(
      pick.marketProbability
    )
      ? pick.marketProbability
      : 50;

  const before =
    pick.probability;

  const adjustedProbability =
    Number(
      clamp(
        before *
          (1 - weight) +
        target *
          weight,
        1,
        99
      ).toFixed(1)
    );

  const edge =
    pick.marketProbability === null
      ? null
      : Number(
          (
            adjustedProbability -
            pick.marketProbability
          ).toFixed(1)
        );

  const ev =
    betExpectedValue(
      adjustedProbability,
      pick.odds
    );

  /*
   * PRE는 선발 0/2·라인업 미발표 상태이므로
   * 확률 수축과 별도로 confidence도 감점합니다.
   */
  const confidencePenalty =
    6 +
    weight *
      24;

  const confidence =
    Number(
      clamp(
        pick.confidenceScore -
          confidencePenalty,
        28,
        84
      ).toFixed(1)
    );

  const valueGradeRaw =
    evaluateValueGrade({
      odds:
        pick.odds,
      expectedValue:
        ev.expectedValue,
      edge,
      confidence,
      decisionRiskScore:
        pick.decisionRiskScore,
      decisionRiskReason:
        pick.decisionRiskReason,
    });

  const valueGrade =
    applyBaseballStageGate(
      valueGradeRaw,
      factors
    );

  const recScore =
    recommendationScore(
      adjustedProbability,
      edge,
      confidence
    );

  return {
    ...pick,
    probability:
      adjustedProbability,
    edge,
    breakEvenProbability:
      ev.breakEvenProbability,
    expectedValue:
      ev.expectedValue,

    valueGrade:
      valueGrade.grade,
    valueGradeScore:
      valueGrade.score,
    valueGradeReason:
      `PRE 불확실성 ${(weight * 100).toFixed(0)}% 보정 · ${valueGrade.reason}`,
    stageGradeLabel:
      valueGrade.stageGradeLabel,

    confidenceScore:
      confidence,
    confidenceGrade:
      confidenceGrade(
        confidence
      ),
    recommendationScore:
      Number(
        recScore.toFixed(1)
      ),

    preUncertaintyApplied:
      true,
    preProbabilityBefore:
      before,
    preUncertaintyWeight:
      weight,
    preUncertaintyTarget:
      Number(
        target.toFixed(1)
      ),

    detail:
      `${pick.detail} · PRE 불확실성 ${(weight * 100).toFixed(0)}% → ${target.toFixed(1)}% 기준 수축`,
  };
}


function baseballPreSampleStrength(input: {
  homePlayed: number;
  awayPlayed: number;
  homeVenuePlayed: number;
  awayVenuePlayed: number;
}) {
  const homeSample =
    clamp(
      input.homePlayed,
      0,
      5
    );

  const awaySample =
    clamp(
      input.awayPlayed,
      0,
      5
    );

  const venueSample =
    clamp(
      input.homeVenuePlayed +
      input.awayVenuePlayed,
      0,
      6
    );

  /*
   * PRE 단계는 선발/라인업이 없으므로 표본이 작을수록
   * neutral prior 쪽으로 더 강하게 수축합니다.
   * 3경기씩 있어도 raw 최근값을 50% 안팎만 신뢰하고,
   * 5경기 + 장소표본이 충분해야 최대 58%까지 허용합니다.
   */
  return clamp(
    0.22 +
      (homeSample / 5) * 0.14 +
      (awaySample / 5) * 0.14 +
      (venueSample / 6) * 0.08,
    0.22,
    0.58
  );
}

function baseballPreMarketMarginBlend(input: {
  homeScore: number;
  awayScore: number;
  marketHome: number | null;
  marketAway: number | null;
  sampleStrength: number;
}) {
  const {
    homeScore,
    awayScore,
    marketHome,
    marketAway,
    sampleStrength,
  } = input;

  if (
    marketHome === null ||
    marketAway === null
  ) {
    return {
      homeScore,
      awayScore,
      applied: false,
      weight: 0,
      marketMargin: null as number | null,
    };
  }

  const fairDiff =
    marketHome -
    marketAway;

  /*
   * 시장확률을 점수로 복사하지 않고 방향 prior만 만듭니다.
   * KBO PRE 단계에서 최대 ±1.6점으로 제한합니다.
   */
  const marketMargin =
    clamp(
      (fairDiff / 100) * 2.2,
      -1.6,
      1.6
    );

  const modelMargin =
    homeScore -
    awayScore;

  /*
   * 표본이 약할수록 시장 방향을 조금 더 참고하지만
   * 22%를 넘지 않아 독립모델을 덮지 않습니다.
   */
  const weight =
    clamp(
      0.10 +
      (1 - sampleStrength) * 0.18,
      0.10,
      0.22
    );

  const total =
    Math.max(
      4,
      homeScore +
      awayScore
    );

  const blendedMargin =
    modelMargin *
      (1 - weight) +
    marketMargin *
      weight;

  return {
    homeScore:
      Math.max(
        1.5,
        total / 2 +
        blendedMargin / 2
      ),
    awayScore:
      Math.max(
        1.5,
        total / 2 -
        blendedMargin / 2
      ),
    applied: true,
    weight:
      Number(
        weight.toFixed(2)
      ),
    marketMargin:
      Number(
        marketMargin.toFixed(3)
      ),
  };
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
  betmanMatch: BetmanMatch | null | undefined,
  sportsDetail?: any
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

  const moneylineFair =
    fairMoneylineForGame(
      betmanMatch
    );

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

  const homeRobustScored =
    robustRecentMetric({
      value:
        homeWeighted.scored,
      played:
        homeWeighted.played,
      venuePlayed:
        homeWeighted.venuePlayed,
      sport,
    });

  const homeRobustConceded =
    robustRecentMetric({
      value:
        homeWeighted.conceded,
      played:
        homeWeighted.played,
      venuePlayed:
        homeWeighted.venuePlayed,
      sport,
    });

  const awayRobustScored =
    robustRecentMetric({
      value:
        awayWeighted.scored,
      played:
        awayWeighted.played,
      venuePlayed:
        awayWeighted.venuePlayed,
      sport,
    });

  const awayRobustConceded =
    robustRecentMetric({
      value:
        awayWeighted.conceded,
      played:
        awayWeighted.played,
      venuePlayed:
        awayWeighted.venuePlayed,
      sport,
    });

  const homeAvgScored =
    homeRobustScored.value;

  const homeAvgConceded =
    homeRobustConceded.value;

  const awayAvgScored =
    awayRobustScored.value;

  const awayAvgConceded =
    awayRobustConceded.value;

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

  let scoreGuardApplied = false;
  let scoreGuardStrength = 0;

  let preMarketHomeScore:
    | number
    | null = null;

  let preMarketAwayScore:
    | number
    | null = null;

  let postShrinkHomeScore: number | null = null;
  let postShrinkAwayScore: number | null = null;
  let postStarterHomeScore: number | null = null;
  let postStarterAwayScore: number | null = null;
  let postLineupHomeScore: number | null = null;
  let postLineupAwayScore: number | null = null;
  let marketAdjustmentHome = 0;
  let marketAdjustmentAway = 0;
  let lambdaTraceOk = true;

  let marketMarginPrior:
    | number
    | null = null;

  let marketPriorWeight =
    0;

  let venueCoverage =
    0;

  const homeStarter =
    sport === "야구"
      ? starterFromLineups(
          sportsDetail?.lineups,
          "home",
          String(
            sportsDetail?.selectedFixture?.home ??
            sportsDetail?.fixture?.home?.name ??
            betmanMatch?.home ??
            ""
          )
        )
      : { name: null, era: null, whip: null, inningsPitched: null, games: null, gamesStarted: null };

  const awayStarter =
    sport === "야구"
      ? starterFromLineups(
          sportsDetail?.lineups,
          "away",
          String(
            sportsDetail?.selectedFixture?.away ??
            sportsDetail?.fixture?.away?.name ??
            betmanMatch?.away ??
            ""
          )
        )
      : { name: null, era: null, whip: null, inningsPitched: null, games: null, gamesStarted: null };

  const baseballAvailabilityBase =
    sport === "야구"
      ? baseballDataAvailability(
          sportsDetail?.lineups,
          homeStarter,
          awayStarter
        )
      : null;

  const baseballAvailability =
    baseballAvailabilityBase ?? {
          stage: "READY" as BaseballAnalysisStage,
          label: "해당 없음",
          lineupPlayerCount: 0,
          starterCount: 0,
          completeness: 100,
        };

  const homeLineupOffense =
    sport === "야구"
      ? lineupOffenseProfile(
          sportsDetail?.lineups,
          "home",
          homeStarter.name
        )
      : {
          batterCount: 0,
          statsCount: 0,
          offenseIndex: null,
          reliability: 0,
          rawFactor: 1,
        };

  const awayLineupOffense =
    sport === "야구"
      ? lineupOffenseProfile(
          sportsDetail?.lineups,
          "away",
          awayStarter.name
        )
      : {
          batterCount: 0,
          statsCount: 0,
          offenseIndex: null,
          reliability: 0,
          rawFactor: 1,
        };

  const homeLineupPlayerIds =
    sport === "야구"
      ? lineupPlayerIdCount(
          sportsDetail?.lineups,
          "home",
          homeStarter.name
        )
      : 0;

  const awayLineupPlayerIds =
    sport === "야구"
      ? lineupPlayerIdCount(
          sportsDetail?.lineups,
          "away",
          awayStarter.name
        )
      : 0;

  const lineupStatsCoverage =
    sport === "야구"
      ? clamp(
          (
            homeLineupOffense.statsCount +
            awayLineupOffense.statsCount
          ) / 18,
          0,
          1
        )
      : 1;

  const lineupValueGate:
    "BLOCK" | "LIMIT" | "OPEN" =
      lineupStatsCoverage >= 0.80
        ? "OPEN"
        : lineupStatsCoverage >= 0.50
          ? "LIMIT"
          : "BLOCK";

  /* V12.7 completeness: lineup publication and lineup-stat coverage are separate.
     READY may still mean the declared lineup is complete, but 100% is reserved for
     meaningful season-stat coverage (>=7/9 on both teams). */
  if (sport === "야구" && baseballAvailability.stage === "READY") {
    const minStats = Math.min(homeLineupOffense.statsCount, awayLineupOffense.statsCount);
    const statCoverage = clamp(minStats / 9, 0, 1);
    baseballAvailability.completeness = Math.round(82 + 18 * statCoverage);
    if (minStats < 7) {
      baseballAvailability.label = "경기 임박 · 라인업 확정 · 타격 Stats 보강 대기";
    }
  }

  let pitcherAdjustmentHome = 0;
  let pitcherAdjustmentAway = 0;
  let lineupAdjustmentHome = 0;
  let lineupAdjustmentAway = 0;

  let baseballFirstHalfHomeScore:
    | number
    | null = null;

  let baseballFirstHalfAwayScore:
    | number
    | null = null;

  let baseballPreModelApplied =
    false;

  let baseballPreSampleStrengthValue =
    0;

  let baseballPreMarketWeight =
    0;

  let baseballPreMarketMargin:
    | number
    | null = null;

  let baseballPreRecentSample =
    0;

  let baseballPreVenueSample =
    0;

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

    // 기본 종목용 표본 강도.
    let sampleStrength =
      clamp(
        0.35 +
        (recentSample / 10) * 0.33 +
        (venueSample / 6) * 0.14,
        0.35,
        0.82
      );

    /*
     * 야구 PRE에서는 선발/라인업 미확정 리스크를 별도로 반영.
     * 작은 최근표본이 λ를 과하게 흔들지 않게 더 강하게 prior로 수축.
     */
    if (
      sport === "야구" &&
      baseballAvailability.stage === "PRE"
    ) {
      sampleStrength =
        baseballPreSampleStrength({
          homePlayed:
            homeWeighted.played,
          awayPlayed:
            awayWeighted.played,
          homeVenuePlayed:
            homeWeighted.venuePlayed,
          awayVenuePlayed:
            awayWeighted.venuePlayed,
        });

      baseballPreModelApplied =
        true;

      baseballPreSampleStrengthValue =
        Number(
          sampleStrength.toFixed(
            2
          )
        );

      baseballPreRecentSample =
        homeWeighted.played +
        awayWeighted.played;

      baseballPreVenueSample =
        homeWeighted.venuePlayed +
        awayWeighted.venuePlayed;
    }

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

    postShrinkHomeScore = expectedHomeScore;
    postShrinkAwayScore = expectedAwayScore;

    if (sport === "야구") {
      const baseHome = expectedHomeScore;
      const baseAway = expectedAwayScore;

      const homePitcherAdjusted = applyPitcherAdjustment(
        baseHome,
        awayStarter,
        1
      );

      const awayPitcherAdjusted = applyPitcherAdjustment(
        baseAway,
        homeStarter,
        1
      );

      expectedHomeScore = homePitcherAdjusted.runs;
      expectedAwayScore = awayPitcherAdjusted.runs;

      pitcherAdjustmentHome = homePitcherAdjusted.adjustment;
      pitcherAdjustmentAway = awayPitcherAdjusted.adjustment;

      postStarterHomeScore = expectedHomeScore;
      postStarterAwayScore = expectedAwayScore;

      const homeLineupAdjusted =
        applyLineupAdjustment(
          expectedHomeScore,
          homeLineupOffense,
          1
        );

      const awayLineupAdjusted =
        applyLineupAdjustment(
          expectedAwayScore,
          awayLineupOffense,
          1
        );

      expectedHomeScore = homeLineupAdjusted.runs;
      expectedAwayScore = awayLineupAdjusted.runs;

      lineupAdjustmentHome = homeLineupAdjusted.adjustment;
      lineupAdjustmentAway = awayLineupAdjusted.adjustment;

      postLineupHomeScore = expectedHomeScore;
      postLineupAwayScore = expectedAwayScore;

      // V13.0: 모든 야구 단계에서 시장 prior 직전 λ를 보존.
      preMarketHomeScore = expectedHomeScore;
      preMarketAwayScore = expectedAwayScore;

      const firstHomePitcher = applyPitcherAdjustment(
        Math.max(0.10, baseHome * (5 / 9)),
        awayStarter,
        1.35
      );

      const firstAwayPitcher = applyPitcherAdjustment(
        Math.max(0.10, baseAway * (5 / 9)),
        homeStarter,
        1.35
      );

      const firstHome = applyLineupAdjustment(
        firstHomePitcher.runs,
        homeLineupOffense,
        0.90
      );

      const firstAway = applyLineupAdjustment(
        firstAwayPitcher.runs,
        awayLineupOffense,
        0.90
      );

      baseballFirstHalfHomeScore = firstHome.runs;
      baseballFirstHalfAwayScore = firstAway.runs;
    }

    if (
      sport === "야구" &&
      baseballAvailability.stage === "PRE" &&
      expectedHomeScore !== null &&
      expectedAwayScore !== null
    ) {
      preMarketHomeScore =
        expectedHomeScore;

      preMarketAwayScore =
        expectedAwayScore;

      const preMarketBlend =
        baseballPreMarketMarginBlend({
          homeScore:
            expectedHomeScore,
          awayScore:
            expectedAwayScore,
          marketHome:
            moneylineFair.home,
          marketAway:
            moneylineFair.away,
          sampleStrength:
            baseballPreSampleStrengthValue ||
            scoreShrinkage ||
            0.35,
        });

      expectedHomeScore =
        preMarketBlend.homeScore;

      expectedAwayScore =
        preMarketBlend.awayScore;

      baseballPreMarketWeight =
        preMarketBlend.weight;

      baseballPreMarketMargin =
        preMarketBlend.marketMargin;

      marketPriorWeight =
        preMarketBlend.weight;

      marketMarginPrior =
        preMarketBlend.marketMargin;

      scoreGuardApplied =
        preMarketBlend.applied;

      scoreGuardStrength =
        preMarketBlend.weight;

      /*
       * PRE 5이닝 λ도 안정화된 전체 λ를 기준으로 재생성.
       * 선발 정보가 없는 단계이므로 별도 투수 임의값은 넣지 않음.
       */
      baseballFirstHalfHomeScore =
        expectedHomeScore *
        (5 / 9);

      baseballFirstHalfAwayScore =
        expectedAwayScore *
        (5 / 9);
    }

    if (sport === "축구") {
      venueCoverage =
        clamp(
          (
            Math.min(
              homeWeighted.venuePlayed,
              3
            ) +
            Math.min(
              awayWeighted.venuePlayed,
              3
            )
          ) /
            6,
          0,
          1
        );

      preMarketHomeScore =
        expectedHomeScore;

      preMarketAwayScore =
        expectedAwayScore;

      const blended =
        blendExpectedScoresWithMarketPrior({
          homeScore:
            expectedHomeScore,
          awayScore:
            expectedAwayScore,
          marketHome:
            moneylineFair.home,
          marketAway:
            moneylineFair.away,
          venueCoverage,
        });

      expectedHomeScore =
        blended.homeScore;

      expectedAwayScore =
        blended.awayScore;

      scoreGuardApplied =
        blended.applied;

      scoreGuardStrength =
        blended.weight;

      marketPriorWeight =
        blended.weight;

      marketMarginPrior =
        blended.marketMarginPrior;
    }

    if (
      sport === "야구" &&
      (
        baseballFirstHalfHomeScore === null ||
        baseballFirstHalfAwayScore === null
      )
    ) {
      baseballFirstHalfHomeScore =
        expectedHomeScore * (5 / 9);
      baseballFirstHalfAwayScore =
        expectedAwayScore * (5 / 9);
    }

    marketAdjustmentHome =
      preMarketHomeScore === null ? 0 : expectedHomeScore - preMarketHomeScore;
    marketAdjustmentAway =
      preMarketAwayScore === null ? 0 : expectedAwayScore - preMarketAwayScore;

    const traceEps = 0.005;
    const tracedHome =
      preMarketHomeScore === null ? expectedHomeScore : preMarketHomeScore + marketAdjustmentHome;
    const tracedAway =
      preMarketAwayScore === null ? expectedAwayScore : preMarketAwayScore + marketAdjustmentAway;

    lambdaTraceOk =
      Number.isFinite(expectedHomeScore) &&
      Number.isFinite(expectedAwayScore) &&
      Math.abs(tracedHome - expectedHomeScore) < traceEps &&
      Math.abs(tracedAway - expectedAwayScore) < traceEps;

    if (!lambdaTraceOk) {
      console.error("[V13.0] lambda trace mismatch", {
        rawExpectedHomeScore, rawExpectedAwayScore,
        postShrinkHomeScore, postShrinkAwayScore,
        postStarterHomeScore, postStarterAwayScore,
        postLineupHomeScore, postLineupAwayScore,
        preMarketHomeScore, preMarketAwayScore,
        marketAdjustmentHome, marketAdjustmentAway,
        expectedHomeScore, expectedAwayScore,
      });
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

      homeOverallScored:
        homeWeighted.overallScored === null ? null : Number(homeWeighted.overallScored.toFixed(3)),
      homeOverallConceded:
        homeWeighted.overallConceded === null ? null : Number(homeWeighted.overallConceded.toFixed(3)),
      awayOverallScored:
        awayWeighted.overallScored === null ? null : Number(awayWeighted.overallScored.toFixed(3)),
      awayOverallConceded:
        awayWeighted.overallConceded === null ? null : Number(awayWeighted.overallConceded.toFixed(3)),

      homeVenueScored:
        homeWeighted.venueScored === null ? null : Number(homeWeighted.venueScored.toFixed(3)),
      homeVenueConceded:
        homeWeighted.venueConceded === null ? null : Number(homeWeighted.venueConceded.toFixed(3)),
      awayVenueScored:
        awayWeighted.venueScored === null ? null : Number(awayWeighted.venueScored.toFixed(3)),
      awayVenueConceded:
        awayWeighted.venueConceded === null ? null : Number(awayWeighted.venueConceded.toFixed(3)),

      homeVenueWeight: Number(homeWeighted.venueWeight.toFixed(2)),
      awayVenueWeight: Number(awayWeighted.venueWeight.toFixed(2)),

      marketHomeFair:
        moneylineFair.home === null ? null : Number(moneylineFair.home.toFixed(1)),
      marketAwayFair:
        moneylineFair.away === null ? null : Number(moneylineFair.away.toFixed(1)),

      scoreGuardApplied,
      scoreGuardStrength,

      homeRobustScored:
        homeAvgScored === null
          ? null
          : Number(homeAvgScored.toFixed(3)),
      homeRobustConceded:
        homeAvgConceded === null
          ? null
          : Number(homeAvgConceded.toFixed(3)),
      awayRobustScored:
        awayAvgScored === null
          ? null
          : Number(awayAvgScored.toFixed(3)),
      awayRobustConceded:
        awayAvgConceded === null
          ? null
          : Number(awayAvgConceded.toFixed(3)),

      homeMetricShrink:
        Math.max(
          homeRobustScored.shrink,
          homeRobustConceded.shrink
        ),
      awayMetricShrink:
        Math.max(
          awayRobustScored.shrink,
          awayRobustConceded.shrink
        ),

      preMarketHomeScore:
        preMarketHomeScore === null
          ? null
          : Number(
              preMarketHomeScore.toFixed(
                3
              )
            ),

      preMarketAwayScore:
        preMarketAwayScore === null
          ? null
          : Number(
              preMarketAwayScore.toFixed(
                3
              )
            ),

      postShrinkHomeScore: postShrinkHomeScore === null ? null : Number(postShrinkHomeScore.toFixed(3)),
      postShrinkAwayScore: postShrinkAwayScore === null ? null : Number(postShrinkAwayScore.toFixed(3)),
      postStarterHomeScore: postStarterHomeScore === null ? null : Number(postStarterHomeScore.toFixed(3)),
      postStarterAwayScore: postStarterAwayScore === null ? null : Number(postStarterAwayScore.toFixed(3)),
      postLineupHomeScore: postLineupHomeScore === null ? null : Number(postLineupHomeScore.toFixed(3)),
      postLineupAwayScore: postLineupAwayScore === null ? null : Number(postLineupAwayScore.toFixed(3)),
      marketAdjustmentHome: Number(marketAdjustmentHome.toFixed(3)),
      marketAdjustmentAway: Number(marketAdjustmentAway.toFixed(3)),
      lambdaTraceOk,

      marketMarginPrior,
      marketPriorWeight,
      venueCoverage:
        Number(
          venueCoverage.toFixed(
            2
          )
        ),

      homeStarterName: homeStarter.name,
      awayStarterName: awayStarter.name,
      homeStarterEra: homeStarter.era,
      awayStarterEra: awayStarter.era,
      homeStarterWhip: homeStarter.whip,
      awayStarterWhip: awayStarter.whip,
      homeStarterInningsPitched: homeStarter.inningsPitched,
      awayStarterInningsPitched: awayStarter.inningsPitched,
      homeStarterGames: homeStarter.games,
      awayStarterGames: awayStarter.games,
      homeStarterGamesStarted: homeStarter.gamesStarted,
      awayStarterGamesStarted: awayStarter.gamesStarted,
      homeStarterSampleReliability:
        starterSampleReliability(homeStarter),
      awayStarterSampleReliability:
        starterSampleReliability(awayStarter),
      homeStarterPosteriorEra:
        starterBayesianPosterior(homeStarter).era,
      awayStarterPosteriorEra:
        starterBayesianPosterior(awayStarter).era,
      homeStarterPosteriorWhip:
        starterBayesianPosterior(homeStarter).whip,
      awayStarterPosteriorWhip:
        starterBayesianPosterior(awayStarter).whip,
      homeStarterEquivalentInnings:
        starterBayesianPosterior(homeStarter).equivalentInnings,
      awayStarterEquivalentInnings:
        starterBayesianPosterior(awayStarter).equivalentInnings,
      pitcherDataUsed:
        Boolean(
          homeStarter.era !== null ||
          homeStarter.whip !== null ||
          awayStarter.era !== null ||
          awayStarter.whip !== null
        ),
      pitcherAdjustmentHome,
      pitcherAdjustmentAway,

      homeLineupBatterCount:
        homeLineupOffense.batterCount,
      awayLineupBatterCount:
        awayLineupOffense.batterCount,
      homeLineupStatsCount:
        homeLineupOffense.statsCount,
      awayLineupStatsCount:
        awayLineupOffense.statsCount,
      homeLineupOffenseIndex:
        homeLineupOffense.offenseIndex,
      awayLineupOffenseIndex:
        awayLineupOffense.offenseIndex,
      homeLineupReliability:
        homeLineupOffense.reliability,
      awayLineupReliability:
        awayLineupOffense.reliability,
      lineupAdjustmentHome,
      lineupAdjustmentAway,
      lineupDataUsed:
        Boolean(
          homeLineupOffense.statsCount > 0 ||
          awayLineupOffense.statsCount > 0
        ),
      homeLineupPlayerIdCount:
        homeLineupPlayerIds,
      awayLineupPlayerIdCount:
        awayLineupPlayerIds,
      lineupStatsCoverage:
        lineupStatsCoverage,
      lineupValueGate:
        lineupValueGate,

      baseballFirstHalfHomeScore:
        baseballFirstHalfHomeScore === null
          ? null
          : Number(baseballFirstHalfHomeScore.toFixed(3)),
      baseballFirstHalfAwayScore:
        baseballFirstHalfAwayScore === null
          ? null
          : Number(baseballFirstHalfAwayScore.toFixed(3)),

      baseballAnalysisStage:
        baseballAvailability.stage,
      baseballAnalysisStageLabel:
        baseballAvailability.label,
      baseballLineupPlayerCount:
        baseballAvailability.lineupPlayerCount,
      baseballStarterCount:
        baseballAvailability.starterCount,
      baseballDataCompleteness:
        baseballAvailability.completeness,

      baseballPreModelApplied,
      baseballPreSampleStrength:
        baseballPreSampleStrengthValue,
      baseballPreMarketWeight,
      baseballPreMarketMargin,
      baseballPreRecentSample,
      baseballPreVenueSample,
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
  breakEvenProbability: number | null;
  expectedValue: number | null;

  valueGrade: "PASS" | "WATCH" | "VALUE" | "STRONG VALUE";
  valueGradeScore: number;
  valueGradeReason: string;
  stageGradeLabel?: string | null;
  zeroPickFallback?: boolean;

  calibrationWeight: number | null;
  signalConflictScore: number;
  signalConflictLabel: string;

  decisionRiskScore: number;
  decisionRiskReason: string;

  confidenceScore: number;
  confidenceGrade: string;
  recommendationScore: number;

  preUncertaintyApplied?: boolean;
  preProbabilityBefore?: number | null;
  preUncertaintyWeight?: number;
  preUncertaintyTarget?: number | null;

  detail: string;
};

type BaseballSnapshotMarket = {
  key: string;
  market: string;
  pick: string;
  probability: number;
  marketProbability: number | null;
  edge: number | null;
  expectedValue: number | null;
  odds: number | null;
  grade: MarketPick["valueGrade"];
  displayGrade: string;
};

type BaseballAnalysisSnapshot = {
  fixtureKey: string;
  stage:
    | "PRE"
    | "STARTER"
    | "LINEUP"
    | "READY";
  stageLabel: string;
  capturedAt: number;
  completeness: number;
  expectedHomeScore: number | null;
  expectedAwayScore: number | null;
  starterCount: number;
  lineupPlayerCount: number;
  pitcherDataUsed: boolean;
  markets: BaseballSnapshotMarket[];
};

type MarketConnectionDiagnostic = {
  key: string;
  label: string;
  line: number | null;
  selectionCount: number;
  usableOddsCount: number;
  pickConnected: boolean;
  selectedOdds: number | null;
  status: string;
};

function stageRank(
  stage: BaseballAnalysisSnapshot["stage"]
) {
  return stage === "PRE"
    ? 1
    : stage === "STARTER"
      ? 2
      : stage === "LINEUP"
        ? 3
        : 4;
}

function marketStableKey(
  market: any,
  index: number
) {
  const betName = String(
    market?.betName ?? market?.displayName ?? market?.betTypeName ?? ""
  );
  const line = marketNumber(market);
  const seq = Number(market?.matchSeq ?? market?.gameSeq ?? market?.seq);
  if (Number.isFinite(seq) && seq > 0) return `seq:${seq}`;

  const explicit = market?.betId ?? market?.betTypeId ?? null;
  if (explicit !== null && explicit !== undefined && String(explicit) !== "") {
    return `id:${String(explicit)}`;
  }
  return `${betName}|${line ?? ""}|${index}`;
}


function safeBetmanMarketRuntime(
  game: BetmanMatch | null | undefined
) {
  const markets =
    Array.isArray(game?.markets)
      ? game!.markets!
      : [];

  const first =
    markets[0] ??
    null;

  const selections =
    Array.isArray(first?.selections)
      ? first.selections
      : [];

  return {
    marketKeys:
      first && typeof first === "object"
        ? Object.keys(first).slice(0, 24)
        : [],
    betName:
      first?.betName ??
      first?.displayName ??
      first?.betTypeName ??
      null,
    type:
      first?.type ??
      first?.marketType ??
      null,
    line:
      first?.line ??
      first?.handicap ??
      first?.point ??
      null,
    selections:
      selections.slice(0, 5).map(
        (selection: any) => ({
          keys:
            selection &&
            typeof selection === "object"
              ? Object.keys(selection).slice(0, 16)
              : [],
          side:
            selection?.side ??
            selection?.type ??
            selection?.outcome ??
            null,
          label:
            selection?.label ??
            selection?.name ??
            selection?.title ??
            null,
          odds:
            Number.isFinite(
              Number(selection?.odds)
            )
              ? Number(selection.odds)
              : null,
        })
      ),
  };
}

function buildMarketConnectionDiagnostics(
  game: BetmanMatch | null | undefined,
  picks: MarketPick[]
): MarketConnectionDiagnostic[] {
  const markets =
    Array.isArray(game?.markets)
      ? game!.markets!
      : [];

  const pickMap =
    new Map(
      picks.map(
        (pick) => [
          pick.key,
          pick,
        ]
      )
    );

  return markets.map(
    (market: any, index: number) => {
      const betName =
        String(
          market?.betName ??
          market?.displayName ??
          market?.betTypeName ??
          `마켓 ${index + 1}`
        );

      const line =
        marketNumber(
          market
        );

      const key = marketStableKey(market, index);

      const selections =
        Array.isArray(
          market?.selections
        )
          ? market.selections
          : [];

      const usableOddsCount =
        selections.filter(
          (selection: any) => {
            const odds =
              Number(
                selection?.odds
              );

            return (
              Number.isFinite(
                odds
              ) &&
              odds > 1
            );
          }
        ).length;

      const pick =
        pickMap.get(
          key
        ) ??
        null;

      return {
        key,
        label:
          marketLabelStandalone(
            market
          ),
        line,
        selectionCount:
          selections.length,
        usableOddsCount,
        pickConnected:
          Boolean(
            pick
          ),
        selectedOdds:
          pick?.odds ??
          null,
        status:
          usableOddsCount === 0
            ? "원본 배당 없음"
            : pick
              ? "계산 연결"
              : "배당 있음 · 계산 미연결",
      };
    }
  );
}


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

function baseballScoreGrid(
  homeLambda: number,
  awayLambda: number
) {
  const rows: {
    home: number;
    away: number;
    p: number;
  }[] = [];
  let total = 0;

  for (let h = 0; h <= 20; h++) {
    const hp = poissonPmf(homeLambda, h);
    for (let a = 0; a <= 20; a++) {
      const p = hp * poissonPmf(awayLambda, a);
      rows.push({ home: h, away: a, p });
      total += p;
    }
  }

  if (total > 0) {
    rows.forEach((row) => {
      row.p /= total;
    });
  }

  return rows;
}

function oppositeHandicapLine(line: number) {
  const value = -line;
  return `${value >= 0 ? "+" : ""}${value}`;
}

function homeHandicapLineText(line: number) {
  return `${line >= 0 ? "+" : ""}${line}`;
}

function baseballPickDisplay(
  best: { label: string; identity: string },
  type: string,
  line: number | null,
  betName: string
) {
  if (type === "handicap" && line !== null) {
    if (best.identity === "home") return `홈 ${homeHandicapLineText(line)}`;
    if (best.identity === "away") return `원정 ${oppositeHandicapLine(line)}`;
    return "무";
  }

  if (
    type === "total" ||
    /u\/o|언더|오버|under|over/i.test(betName)
  ) {
    if (best.identity === "over") return "OVER";
    if (best.identity === "under") return "UNDER";
  }

  if (/sum|홀짝|홀\/짝/i.test(betName)) {
    if (best.identity === "odd") return "홀";
    if (best.identity === "even") return "짝";
  }

  return best.label;
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
  if (/^(①|1)$/i.test(label)) return "draw";

  if (side === "over") return "over";
  if (side === "under") return "under";
  if (side === "odd") return "odd";
  if (side === "even") return "even";
  if (side === "home") return "home";
  if (side === "away") return "away";
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

function buildZeroPickMarketFallback(
  game: BetmanMatch | null | undefined
): MarketPick[] {
  if (
    !game ||
    !Array.isArray(
      game?.markets
    )
  ) {
    return [];
  }

  const result:
    MarketPick[] = [];

  for (
    let index = 0;
    index <
    game.markets.length;
    index += 1
  ) {
    const market: any =
      game.markets[
        index
      ];

    const selections =
      Array.isArray(
        market?.selections
      )
        ? market.selections
        : [];

    const usable: Array<{
      selection: any;
      odds: number;
      identity: string;
    }> =
      selections
        .map(
          (
            selection: any
          ) => {
            const odds =
              Number(
                selection?.odds
              );

            return {
              selection,
              odds,
              identity:
                String(
                  selectionIdentity(
                    selection
                  ) ??
                  ""
                ),
            };
          }
        )
        .filter(
          (
            row: {
              selection: any;
              odds: number;
              identity: string;
            }
          ) =>
            Boolean(
              row.identity
            ) &&
            Number.isFinite(
              row.odds
            ) &&
            row.odds > 1
        );

    if (!usable.length) {
      continue;
    }

    /*
     * Betman 배당 자체의 마진을 제거한 fair probability.
     * 결과/최종점수/경기후 데이터는 전혀 사용하지 않는다.
     */
    const fair =
      fairMarketProbabilities(
        market
      );

    let best:
      | {
          selection: any;
          odds: number;
          identity: string;
          probability: number;
        }
      | null = null;

    for (
      const row
      of usable
    ) {
      const probability =
        Number(
          fair
            .probabilities[
            row.identity
          ]
        );

      if (
        !Number.isFinite(
          probability
        )
      ) {
        continue;
      }

      if (
        !best ||
        probability >
          best.probability
      ) {
        best = {
          ...row,
          probability,
        };
      }
    }

    if (!best) {
      continue;
    }

    const probability =
      Number(
        clamp(
          best.probability,
          0,
          100
        ).toFixed(1)
      );

    const ev =
      betExpectedValue(
        probability,
        best.odds
      );

    /*
     * 독립 모델 신호가 없는 fallback이므로
     * edge=0 / PASS / 낮은 confidence로 강제한다.
     * 실전 VALUE 픽으로 승격시키지 않는다.
     */
    result.push({
      key:
        marketStableKey(
          market,
          index
        ),
      market:
        marketLabelStandalone(
          market
        ),
      pick:
        selectionLabel(
          best.selection
        ) ||
        best.identity,
      rawProbability:
        probability,
      probability,
      odds:
        best.odds,
      marketProbability:
        probability,
      edge:
        0,
      breakEvenProbability:
        ev.breakEvenProbability,
      expectedValue:
        ev.expectedValue,

      valueGrade:
        "PASS",
      valueGradeScore:
        0,
      valueGradeReason:
        "ZERO-PICK 시장 컨센서스 fallback · 독립 모델 신호 없음",
      stageGradeLabel:
        "MARKET FALLBACK",
      zeroPickFallback:
        true,

      calibrationWeight:
        0,
      signalConflictScore:
        0,
      signalConflictLabel:
        "시장 컨센서스 fallback",

      decisionRiskScore:
        100,
      decisionRiskReason:
        "PRE 실데이터 부족 · 시장 배당만 사용",

      confidenceScore:
        20,
      confidenceGrade:
        "C",
      recommendationScore:
        0,

      preUncertaintyApplied:
        true,
      preProbabilityBefore:
        probability,
      preUncertaintyWeight:
        0,
      preUncertaintyTarget:
        probability,

      detail:
        "ZERO-PICK FALLBACK · Betman 경기전 배당의 마진 제거 시장확률만 사용 · 실전 VALUE 추천 아님",
    });
  }

  return result;
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
      ? "충돌 위험 매우 높음"
      : score >= 35
        ? "충돌 위험 높음"
        : score >= 15
          ? "충돌 위험 보통"
          : score > 0
            ? "충돌 위험 낮음"
            : "충돌 없음";

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


function marketDecisionRisk(
  market: any,
  factors: AnalysisFactors,
  signalConflict: SignalConflict
) {
  const type =
    String(market?.type ?? "").toLowerCase();

  const betName =
    String(
      market?.betName ??
      market?.displayName ??
      market?.betTypeName ??
      ""
    );

  const isTotal =
    type === "total" ||
    /U\/O|언더|오버|over|under/i.test(
      betName
    );

  const isSum =
    /SUM|홀짝|홀\/짝/i.test(
      betName
    );

  const isDirectional =
    !isTotal &&
    !isSum;

  const reasons: string[] = [];

  // 승무패/핸디는 예상 점수차 방향에 직접 의존하므로
  // 시장/H2H 방향 충돌을 그대로 사용합니다.
  // U/O와 SUM은 승패 방향 충돌로 차단하지 않습니다.
  let score =
    isDirectional
      ? signalConflict.score
      : 0;

  if (
    isDirectional &&
    factors.homeVenueSample === 0 &&
    factors.awayVenueSample === 0
  ) {
    score += 18;
    reasons.push(
      "홈/원정 장소표본 0/0"
    );
  } else if (
    isDirectional &&
    (
      factors.homeVenueSample === 0 ||
      factors.awayVenueSample === 0
    )
  ) {
    score += 9;
    reasons.push(
      "한쪽 장소표본 부족"
    );
  }

  if (
    isDirectional &&
    factors.scoreGuardApplied
  ) {
    score += 8;
    reasons.push(
      "예상득점 방향 안전장치 작동"
    );
  }

  if (
    isDirectional &&
    signalConflict.score >= 35
  ) {
    reasons.push(
      signalConflict.label
    );
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    score:
      Number(score.toFixed(1)),
    reason:
      reasons.length
        ? reasons.join(" · ")
        : isDirectional
          ? "방향 신호 안정"
          : "승패 방향충돌 비적용 마켓",
    isDirectional,
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

function betExpectedValue(
  probabilityPercent: number,
  odds: number | null
) {
  if (
    odds === null ||
    !Number.isFinite(odds) ||
    odds <= 1 ||
    !Number.isFinite(probabilityPercent)
  ) {
    return {
      breakEvenProbability: null,
      expectedValue: null,
    };
  }

  const breakEvenProbability =
    100 / odds;

  // 1단위 베팅 기준 순 기대수익률.
  // EV% = P(win) * odds - 1
  const expectedValue =
    (probabilityPercent / 100) *
      odds *
      100 -
    100;

  return {
    breakEvenProbability:
      Number(
        breakEvenProbability.toFixed(1)
      ),
    expectedValue:
      Number(expectedValue.toFixed(1)),
  };
}


type ValueGrade =
  | "PASS"
  | "WATCH"
  | "VALUE"
  | "STRONG VALUE";

function evaluateValueGrade(input: {
  odds: number | null;
  expectedValue: number | null;
  edge: number | null;
  confidence: number;
  decisionRiskScore: number;
  decisionRiskReason: string;
}) {
  const {
    odds,
    expectedValue,
    edge,
    confidence,
    decisionRiskScore,
    decisionRiskReason,
  } = input;

  const reasons: string[] = [];

  if (
    odds === null ||
    expectedValue === null ||
    edge === null
  ) {
    return {
      grade: "PASS" as ValueGrade,
      score: 0,
      reason: "필수 시장/배당 데이터 부족",
    };
  }

  const oddsQuality =
    odds >= 1.40 && odds <= 3.50
      ? 100
      : odds >= 1.25 && odds <= 5.00
        ? 72
        : 45;

  if (odds < 1.25) reasons.push("초저배당");
  if (odds > 5.00) reasons.push("고배당 변동성");

  const evScore =
    clamp(
      50 + expectedValue * 3.2,
      0,
      100
    );

  const edgeScore =
    clamp(
      50 + edge * 3.0,
      0,
      100
    );

  const conflictQuality =
    clamp(
      100 - decisionRiskScore * 1.35,
      0,
      100
    );

  const score =
    clamp(
      evScore * 0.36 +
      edgeScore * 0.22 +
      confidence * 0.22 +
      conflictQuality * 0.12 +
      oddsQuality * 0.08,
      0,
      100
    );

  if (expectedValue <= 0) {
    reasons.push("EV 음수");
    return {
      grade: "PASS" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: reasons.join(" · "),
    };
  }

  if (decisionRiskScore >= 35) {
    reasons.push(
      `검증 필요 (${decisionRiskReason})`
    );
    return {
      grade: "WATCH" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: reasons.join(" · "),
    };
  }

  // 모델-시장 괴리가 지나치게 크면 EV가 양수여도
  // 곧바로 VALUE로 승격하지 않고 데이터/매칭을 먼저 검증합니다.
  if (
    expectedValue >= 35 ||
    edge >= 20
  ) {
    reasons.push(
      "Extreme Edge 검증 필요"
    );
    return {
      grade: "WATCH" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: reasons.join(" · "),
    };
  }

  if (
    expectedValue < 3 ||
    edge < 3 ||
    confidence < 58
  ) {
    if (expectedValue < 3) reasons.push("EV 안전마진 부족");
    if (edge < 3) reasons.push("엣지 미미");
    if (confidence < 58) reasons.push("신뢰도 부족");

    return {
      grade: "WATCH" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: reasons.join(" · "),
    };
  }

  const strong =
    expectedValue >= 8 &&
    edge >= 8 &&
    confidence >= 68 &&
    decisionRiskScore < 15 &&
    odds >= 1.35 &&
    odds <= 4.00 &&
    score >= 72;

  if (strong) {
    return {
      grade: "STRONG VALUE" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: "EV·엣지·신뢰도 우수 · 신호 충돌 낮음",
    };
  }

  const value =
    expectedValue >= 3 &&
    edge >= 3 &&
    confidence >= 58 &&
    decisionRiskScore < 35 &&
    score >= 58;

  if (value) {
    if (oddsQuality < 70) {
      return {
        grade: "WATCH" as ValueGrade,
        score: Number(score.toFixed(1)),
        reason: reasons.length
          ? reasons.join(" · ")
          : "배당구간 변동성 주의",
      };
    }

    return {
      grade: "VALUE" as ValueGrade,
      score: Number(score.toFixed(1)),
      reason: "양수 EV + 시장 대비 우위",
    };
  }

  return {
    grade: "WATCH" as ValueGrade,
    score: Number(score.toFixed(1)),
    reason: reasons.length
      ? reasons.join(" · ")
      : "조건 일부 미충족",
  };
}

function pickValueStatus(pick: MarketPick) {
  if (pick.valueGrade === "STRONG VALUE") {
    return {
      label: "STRONG VALUE",
      eligible: true,
    };
  }

  if (pick.valueGrade === "VALUE") {
    return {
      label: "VALUE",
      eligible: true,
    };
  }

  if (pick.valueGrade === "WATCH") {
    return {
      label: `WATCH · ${pick.valueGradeReason}`,
      eligible: false,
    };
  }

  return {
    label: `PASS · ${pick.valueGradeReason}`,
    eligible: false,
  };
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



function applyLineupStatsCoverageGate(
  picks: MarketPick[],
  sport: Exclude<Sport, "전체">,
  factors: AnalysisFactors
): MarketPick[] {
  if (
    sport !== "야구" ||
    factors.lineupValueGate === "OPEN"
  ) {
    return picks;
  }

  const coveragePct =
    factors.lineupStatsCoverage *
    100;

  return picks.map(
    (pick) => {
      if (
        pick.valueGrade !== "VALUE" &&
        pick.valueGrade !== "STRONG VALUE"
      ) {
        return pick;
      }

      const gateReason =
        factors.lineupValueGate === "BLOCK"
          ? `타격 Stats coverage ${coveragePct.toFixed(0)}% < 50% · VALUE 차단`
          : `타격 Stats coverage ${coveragePct.toFixed(0)}% < 80% · VALUE 보류`;

      return {
        ...pick,
        valueGrade:
          "WATCH" as const,
        valueGradeScore:
          Math.min(
            pick.valueGradeScore,
            69
          ),
        valueGradeReason:
          `${gateReason} · ${pick.valueGradeReason}`,
        stageGradeLabel:
          "COVERAGE WATCH",
      };
    }
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
    const key = marketStableKey(market, index);
    const marketFair = fairMarketProbabilities(market);

    const decisionRisk =
      marketDecisionRisk(
        market,
        factors,
        signalConflict
      );

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
          {
            ...signalConflict,
            score:
              decisionRisk.score,
            confidencePenalty:
              Number(
                clamp(
                  decisionRisk.score * 0.28,
                  0,
                  24
                ).toFixed(1)
              ),
            label:
              decisionRisk.reason,
          }
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

        const ev = betExpectedValue(
          calibratedProbability,
          safeOdds
        );

        const valueGrade =
          evaluateValueGrade({
            odds: safeOdds,
            expectedValue:
              ev.expectedValue,
            edge,
            confidence,
            decisionRiskScore:
              decisionRisk.score,
            decisionRiskReason:
              decisionRisk.reason,
          });

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
          breakEvenProbability:
            ev.breakEvenProbability,
          expectedValue:
            ev.expectedValue,

          valueGrade:
            valueGrade.grade,
          valueGradeScore:
            valueGrade.score,
          valueGradeReason:
            valueGrade.reason,

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
          decisionRiskScore:
            decisionRisk.score,
          decisionRiskReason:
            decisionRisk.reason,
          confidenceScore: Number(confidence.toFixed(1)),
          confidenceGrade: confidenceGrade(confidence),
          recommendationScore: Number(recScore.toFixed(1)),
          detail: `${periodText}${lineText}${pushText}`,
        });
        continue;
      }
    }


    if (sport === "야구" && canScoreModel) {
      const combinedName =
        `${betName} ${String(market?.betTypeName ?? "")}`;

      const isWin1Lose =
        /승\s*1\s*패|승1패/i.test(combinedName);
      const isSumMarket =
        /sum|홀짝|홀\/짝/i.test(combinedName);
      const isTotalMarket =
        type === "total" ||
        /u\/o|언더|오버|under|over/i.test(combinedName);
      const isHandicapMarket =
        type === "handicap" ||
        /핸디|handicap/i.test(combinedName);

      // 공식 야구 전반 = 5이닝 종료.
      const periodHome =
        isFirstHalf
          ? factors.baseballFirstHalfHomeScore ??
            expectedHome! * (5 / 9)
          : expectedHome!;

      const periodAway =
        isFirstHalf
          ? factors.baseballFirstHalfAwayScore ??
            expectedAway! * (5 / 9)
          : expectedAway!;

      const grid = baseballScoreGrid(
        Math.max(0.10, periodHome),
        Math.max(0.10, periodAway)
      );

      let home = 0, draw = 0, away = 0;
      let homeWide = 0, closeOne = 0, awayWide = 0;
      let over = 0, under = 0, push = 0;
      let odd = 0, even = 0;

      for (const row of grid) {
        const margin = row.home - row.away;
        const outcome = settleBetmanMoneyline(row.home, row.away);

        if (outcome === "home") home += row.p;
        else if (outcome === "away") away += row.p;
        else draw += row.p;

        if (margin >= 2) homeWide += row.p;
        else if (margin <= -2) awayWide += row.p;
        else closeOne += row.p;

        if (isTotalMarket && line !== null) {
          const total = row.home + row.away;
          if (total > line) over += row.p;
          else if (total < line) under += row.p;
          else push += row.p;
        }

        if ((row.home + row.away) % 2 === 0) even += row.p;
        else odd += row.p;
      }

      let probs: Record<string, number> = {};
      let baseballPush = 0;

      if (isHandicapMarket) {
        let handicapHome = 0, handicapDraw = 0, handicapAway = 0;

        if (line !== null) {
          for (const row of grid) {
            const outcome = settleBetmanHomeHandicap(row.home, row.away, line);
            if (outcome === "home") handicapHome += row.p;
            else if (outcome === "away") handicapAway += row.p;
            else handicapDraw += row.p;
          }
        }

        const hasDrawSelection =
          selections.some(
            (selection: any) =>
              selectionIdentity(selection) === "draw"
          );

        if (hasDrawSelection) {
          probs = {
            home: handicapHome * 100,
            draw: handicapDraw * 100,
            away: handicapAway * 100,
          };
        } else {
          const decided = handicapHome + handicapAway;
          probs = {
            home: decided > 0 ? (handicapHome / decided) * 100 : 50,
            away: decided > 0 ? (handicapAway / decided) * 100 : 50,
          };
          baseballPush = handicapDraw;
        }
      } else if (isTotalMarket) {
        const decided = over + under;
        probs = {
          over: decided > 0 ? (over / decided) * 100 : 50,
          under: decided > 0 ? (under / decided) * 100 : 50,
        };
        baseballPush = push;
      } else if (isSumMarket) {
        probs = { odd: odd * 100, even: even * 100 };
      } else if (isWin1Lose) {
        probs = {
          home: homeWide * 100,
          draw: closeOne * 100,
          away: awayWide * 100,
        };
      } else if (isFirstHalf) {
        probs = { home: home * 100, draw: draw * 100, away: away * 100 };
      } else {
        const decided = home + away;
        probs = {
          home: decided > 0 ? (home / decided) * 100 : 50,
          away: decided > 0 ? (away / decided) * 100 : 50,
        };
        baseballPush = draw;
      }

      const best = bestSelection(market, probs);

      if (best) {
        const odds = Number(best.selection?.odds);
        const safeOdds =
          Number.isFinite(odds) && odds > 1 ? odds : null;

        const fair = marketFair.probabilities[best.identity];
        const marketProbability =
          Number.isFinite(fair) ? Number(fair.toFixed(1)) : null;

        const confidence = marketConfidence(
          factors,
          recentSummary,
          h2h,
          market,
          marketFair.overround,
          {
            ...signalConflict,
            score: decisionRisk.score,
            confidencePenalty: Number(
              clamp(decisionRisk.score * 0.28, 0, 24).toFixed(1)
            ),
            label: decisionRisk.reason,
          }
        );

        const calibrated = calibrateModelProbability(
          best.probability,
          marketProbability,
          confidence
        );

        const calibratedProbability =
          Number(calibrated.probability.toFixed(1));

        const edge =
          marketProbability === null
            ? null
            : Number((calibratedProbability - marketProbability).toFixed(1));

        const ev = betExpectedValue(calibratedProbability, safeOdds);

        const baseValueGrade = evaluateValueGrade({
          odds: safeOdds,
          expectedValue: ev.expectedValue,
          edge,
          confidence,
          decisionRiskScore: decisionRisk.score,
          decisionRiskReason: decisionRisk.reason,
        });

        const valueGrade =
          applyBaseballStageGate(
            baseValueGrade,
            factors
          );

        const recScore =
          recommendationScore(calibratedProbability, edge, confidence);

        const periodText =
          isFirstHalf ? "야구 전반 5이닝" : "야구 최종";

        const lineText =
          line !== null
            ? isHandicapMarket
              ? ` · 홈팀 기준 H ${homeHandicapLineText(line)}`
              : isTotalMarket
                ? ` · U/O ${line}`
                : ""
            : "";

        const ruleText =
          isWin1Lose
            ? " · 승1패=2점차+/1점차이내/2점차+패"
            : "";

        const pushText =
          baseballPush > 0.001
            ? ` · 미결정/적중무효 ${(baseballPush * 100).toFixed(1)}% 제외`
            : "";

        result.push({
          key,
          market: label,
          pick: baseballPickDisplay(
            best,
            isHandicapMarket ? "handicap" : isTotalMarket ? "total" : type,
            line,
            combinedName
          ),
          rawProbability: Number(best.probability.toFixed(1)),
          probability: calibratedProbability,
          odds: safeOdds,
          marketProbability,
          edge,
          breakEvenProbability: ev.breakEvenProbability,
          expectedValue: ev.expectedValue,
          valueGrade: valueGrade.grade,
          valueGradeScore: valueGrade.score,
          valueGradeReason: valueGrade.reason,
          stageGradeLabel:
            valueGrade.stageGradeLabel,
          calibrationWeight:
            calibrated.modelWeight === null
              ? null
              : Number(calibrated.modelWeight.toFixed(2)),
          signalConflictScore: signalConflict.score,
          signalConflictLabel: signalConflict.label,
          decisionRiskScore: decisionRisk.score,
          decisionRiskReason: decisionRisk.reason,
          confidenceScore: Number(confidence.toFixed(1)),
          confidenceGrade: confidenceGrade(confidence),
          recommendationScore: Number(recScore.toFixed(1)),
          detail: `${periodText}${lineText}${ruleText}${pushText}`,
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
        marketFair.overround,
      {
        ...signalConflict,
        score:
          decisionRisk.score,
        confidencePenalty:
          Number(
            clamp(
              decisionRisk.score * 0.28,
              0,
              24
            ).toFixed(1)
          ),
        label:
          decisionRisk.reason,
      }
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
        breakEvenProbability: null,
        expectedValue: null,

        valueGrade: "PASS",
        valueGradeScore: 0,
        valueGradeReason:
          "실제 선택 배당 없음",

        calibrationWeight: null,
        signalConflictScore:
          signalConflict.score,
        signalConflictLabel:
          signalConflict.label,
        decisionRiskScore:
          decisionRisk.score,
        decisionRiskReason:
          decisionRisk.reason,
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
        marketFair.overround,
      {
        ...signalConflict,
        score:
          decisionRisk.score,
        confidencePenalty:
          Number(
            clamp(
              decisionRisk.score * 0.28,
              0,
              24
            ).toFixed(1)
          ),
        label:
          decisionRisk.reason,
      }
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

      const fallbackOdds =
        Number(fallbackBest.selection?.odds) > 1
          ? Number(fallbackBest.selection?.odds)
          : null;

      const fallbackEv =
        betExpectedValue(
          calibratedProbability,
          fallbackOdds
        );

      const fallbackGrade =
        evaluateValueGrade({
          odds: fallbackOdds,
          expectedValue:
            fallbackEv.expectedValue,
          edge,
          confidence,
          decisionRiskScore:
            decisionRisk.score,
          decisionRiskReason:
            decisionRisk.reason,
        });

      result.push({
        key,
        market: label,
        pick: fallbackBest.label,
        rawProbability:
          Number(fallbackBest.probability.toFixed(1)),
        probability:
          calibratedProbability,
        odds: fallbackOdds,
        marketProbability,
        edge,
        breakEvenProbability:
          fallbackEv.breakEvenProbability,
        expectedValue:
          fallbackEv.expectedValue,

        valueGrade:
          fallbackGrade.grade,
        valueGradeScore:
          fallbackGrade.score,
        valueGradeReason:
          fallbackGrade.reason,

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
        decisionRiskScore:
          decisionRisk.score,
        decisionRiskReason:
          decisionRisk.reason,
        confidenceScore: Number(confidence.toFixed(1)),
        confidenceGrade: confidenceGrade(confidence),
        recommendationScore: Number(
          recommendationScore(calibratedProbability, edge, confidence).toFixed(1)
        ),
        detail: "SportsAPI Form/H2H 기반",
      });
    }
  }

  if (
    sport === "야구" &&
    factors.baseballAnalysisStage ===
      "PRE"
  ) {
    const marketByKey =
      new Map(
        game.markets.map(
          (market: any, index: number) => [
            marketStableKey(
              market,
              index
            ),
            market,
          ]
        )
      );

    return result.map(
      (pick) =>
        applyBaseballPreUncertainty(
          pick,
          marketByKey.get(
            pick.key
          ) ??
          null,
          factors
        )
    );
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


type RecentFixtureShape = {
  keys: string[];
  topLevelIds: Array<{
    key: string;
    value: number;
  }>;
  topLevelNames: Array<{
    key: string;
    value: string;
  }>;
  nestedObjects: Array<{
    path: string;
    keys: string[];
    id: number | null;
    name: string | null;
    marker: string | null;
  }>;
};

function safeRecentFixtureShape(
  fixture: any
): RecentFixtureShape | null {
  if (
    !fixture ||
    typeof fixture !== "object"
  ) {
    return null;
  }

  const result: RecentFixtureShape = {
    keys:
      Object.keys(fixture).slice(0, 40),
    topLevelIds: [],
    topLevelNames: [],
    nestedObjects: [],
  };

  for (const [key, value] of Object.entries(fixture)) {
    const normalized =
      String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    if (
      /(^id$|teamid$|homeid$|awayid$|participantid$|competitorid$)/.test(
        normalized
      )
    ) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) {
        result.topLevelIds.push({
          key,
          value: number,
        });
      }
    }

    if (
      /(name$|teamname$|shortname$|displayname$)/.test(
        normalized
      ) &&
      typeof value === "string"
    ) {
      result.topLevelNames.push({
        key,
        value: value.slice(0, 80),
      });
    }
  }

  const visit = (
    value: any,
    path: string,
    depth = 0
  ) => {
    if (
      value === null ||
      value === undefined ||
      depth > 4
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value
        .slice(0, 6)
        .forEach(
          (item, index) =>
            visit(
              item,
              `${path}[${index}]`,
              depth + 1
            )
        );
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const keys =
      Object.keys(value).slice(0, 24);

    const idCandidate =
      Number(
        value?.id ??
        value?.teamId ??
        value?.participantId ??
        value?.competitorId
      );

    const nameCandidate =
      String(
        value?.name ??
        value?.teamName ??
        value?.shortName ??
        value?.displayName ??
        ""
      ).trim();

    const markerCandidate =
      String(
        value?.side ??
        value?.position ??
        value?.type ??
        value?.homeAway ??
        value?.location ??
        value?.role ??
        ""
      ).trim();

    const looksTeamRelated =
      /home|away|team|participant|competitor|club|opponent/i.test(
        path
      ) ||
      Number.isFinite(idCandidate) ||
      Boolean(nameCandidate) ||
      Boolean(markerCandidate);

    if (looksTeamRelated) {
      result.nestedObjects.push({
        path,
        keys,
        id:
          Number.isFinite(idCandidate) &&
          idCandidate > 0
            ? idCandidate
            : null,
        name:
          nameCandidate ||
          null,
        marker:
          markerCandidate ||
          null,
      });
    }

    for (const [key, child] of Object.entries(value)) {
      // 결과/점수/승자/통계 경로는 진단에서 제외.
      if (
        /score|result|winner|goal|runs|points|period|stat/i.test(
          key
        )
      ) {
        continue;
      }

      if (
        child &&
        typeof child === "object"
      ) {
        visit(
          child,
          `${path}.${key}`,
          depth + 1
        );
      }
    }
  };

  for (const [key, value] of Object.entries(fixture)) {
    if (
      /score|result|winner|goal|runs|points|period|stat/i.test(
        key
      )
    ) {
      continue;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      visit(
        value,
        key,
        1
      );
    }
  }

  result.nestedObjects =
    result.nestedObjects
      .filter(
        (item, index, array) =>
          array.findIndex(
            (other) =>
              other.path === item.path
          ) === index
      )
      .slice(0, 30);

  return result;
}


type PregameStructureCandidate = {
  path: string;
  keys: string[];
  id: number | null;
  name: string | null;
  role: string | null;
  position: string | null;
  side: string | null;
  order: number | null;
};

type PregameStructureAudit = {
  sourceKeys: string[];
  fixtureKeys: string[];
  directLineupsPresent: boolean;
  directLineupsType: string;
  directLineupsCount: number;
  candidateCount: number;
  candidates: PregameStructureCandidate[];
};

function safePregameStructureDiagnostic(
  payload: any
): PregameStructureAudit {
  const source =
    payload &&
    typeof payload === "object"
      ? payload
      : {};

  const fixture =
    source?.fixture ??
    source?.detail ??
    source?.data ??
    null;

  const directLineups =
    source?.lineups ??
    fixture?.lineups ??
    fixture?.lineup ??
    null;

  const audit: PregameStructureAudit = {
    sourceKeys:
      Object.keys(
        source
      ).slice(0, 50),
    fixtureKeys:
      fixture &&
      typeof fixture === "object"
        ? Object.keys(
            fixture
          ).slice(0, 60)
        : [],
    directLineupsPresent:
      directLineups !== null &&
      directLineups !== undefined,
    directLineupsType:
      Array.isArray(
        directLineups
      )
        ? "array"
        : directLineups &&
            typeof directLineups === "object"
          ? "object"
          : typeof directLineups,
    directLineupsCount:
      Array.isArray(
        directLineups
      )
        ? directLineups.length
        : 0,
    candidateCount: 0,
    candidates: [],
  };

  const candidates:
    PregameStructureCandidate[] =
      [];

  const seen =
    new Set<string>();

  const blockedKey =
    /score|result|winner|stat|statistics|boxscore|final|runsallowed|earnedrun|hitallowed|pitchcount|inningresult/i;

  const visit = (
    value: any,
    path: string,
    depth = 0
  ) => {
    if (
      value === null ||
      value === undefined ||
      depth > 7
    ) {
      return;
    }

    if (
      Array.isArray(value)
    ) {
      value
        .slice(0, 30)
        .forEach(
          (item, index) =>
            visit(
              item,
              `${path}[${index}]`,
              depth + 1
            )
        );
      return;
    }

    if (
      typeof value !== "object"
    ) {
      return;
    }

    const keys =
      Object.keys(
        value
      ).filter(
        (key) =>
          !blockedKey.test(
            key
          )
      );

    const candidateName =
      String(
        value?.name ??
        value?.playerName ??
        value?.athleteName ??
        value?.personName ??
        value?.shortName ??
        value?.displayName ??
        value?.player?.name ??
        value?.athlete?.name ??
        value?.person?.name ??
        ""
      ).trim();

    const idRaw =
      value?.id ??
      value?.playerId ??
      value?.athleteId ??
      value?.personId ??
      value?.teamId ??
      value?.player?.id ??
      value?.athlete?.id ??
      value?.person?.id;

    const id =
      Number(
        idRaw
      );

    const role =
      String(
        value?.role ??
        value?.type ??
        value?.status ??
        value?.designation ??
        ""
      ).trim();

    const position =
      String(
        value?.position ??
        value?.pos ??
        value?.positionName ??
        value?.player?.position ??
        ""
      ).trim();

    const side =
      String(
        value?.side ??
        value?.homeAway ??
        value?.teamSide ??
        value?.location ??
        ""
      ).trim();

    const orderRaw =
      value?.order ??
      value?.battingOrder ??
      value?.lineupOrder ??
      value?.slot ??
      null;

    const order =
      Number(
        orderRaw
      );

    const playerPath =
      /lineup|starter|starting|pitcher|player|roster|batter|athlete|person|position|order|batting/i.test(
        path
      );

    const playerSignal =
      Boolean(
        value?.player ||
        value?.athlete ||
        value?.person ||
        value?.playerId ||
        value?.athleteId ||
        value?.personId ||
        value?.playerName ||
        value?.athleteName ||
        value?.personName ||
        role ||
        position ||
        Number.isFinite(order)
      );

    const teamOnlyPath =
      /(?:^|\.)(home|away|team|league|season|venue|fixture|recentSummary)(?:\.|\[|$)/i.test(
        path
      ) &&
      !playerPath;

    const isCandidate =
      playerPath &&
      playerSignal &&
      !teamOnlyPath;

    if (
      isCandidate &&
      (
        candidateName ||
        Number.isFinite(id) ||
        role ||
        position ||
        Number.isFinite(order)
      )
    ) {
      const signature =
        [
          path,
          candidateName,
          Number.isFinite(id)
            ? String(id)
            : "",
          role,
          position,
          side,
          Number.isFinite(order)
            ? String(order)
            : "",
        ].join("|");

      if (
        !seen.has(
          signature
        )
      ) {
        seen.add(
          signature
        );

        candidates.push({
          path,
          keys:
            keys.slice(
              0,
              24
            ),
          id:
            Number.isFinite(id) &&
            id > 0
              ? id
              : null,
          name:
            candidateName ||
            null,
          role:
            role ||
            null,
          position:
            position ||
            null,
          side:
            side ||
            null,
          order:
            Number.isFinite(order)
              ? order
              : null,
        });
      }
    }

    for (
      const [
        key,
        child,
      ] of Object.entries(
        value
      )
    ) {
      if (
        blockedKey.test(
          key
        )
      ) {
        continue;
      }

      if (
        child &&
        typeof child === "object"
      ) {
        visit(
          child,
          path
            ? `${path}.${key}`
            : key,
          depth + 1
        );
      }
    }
  };

  visit(
    source,
    "detail",
    0
  );

  const prioritized =
    candidates
      .sort(
        (a, b) => {
          const score = (
            item:
              PregameStructureCandidate
          ) =>
            (
              /lineup|starter|starting|pitcher|roster|batting|order/i.test(
                item.path
              )
                ? 10
                : 0
            ) +
            (
              /pitcher|starter|starting/i.test(
                `${item.role ?? ""} ${item.position ?? ""}`
              )
                ? 6
                : 0
            ) +
            (
              item.order !== null
                ? 4
                : 0
            ) +
            (
              item.name
                ? 2
                : 0
            );

          return (
            score(b) -
            score(a)
          );
        }
      )
      .slice(
        0,
        40
      );

  audit.candidateCount =
    candidates.length;

  audit.candidates =
    prioritized;

  return audit;
}


type BacktestAudit = {
  enabled: boolean;
  cutoffMs: number | null;
  removedHomeFixtures: number;
  removedAwayFixtures: number;
  keptHomeFixtures: number;
  keptAwayFixtures: number;
  scoredHomeFixtures: number;
  scoredAwayFixtures: number;
  matchedHomeFixtures: number;
  matchedAwayFixtures: number;
  selectedHomeTeamId: number | null;
  selectedAwayTeamId: number | null;
  selectedHomeTeamName: string | null;
  selectedAwayTeamName: string | null;
  unmatchedHomeFixtures: number;
  unmatchedAwayFixtures: number;
  homeRecentFixtureShape: RecentFixtureShape | null;
  awayRecentFixtureShape: RecentFixtureShape | null;
  h2hPolicy: string;
  resultFieldsStripped: boolean;
  statisticsBlocked: boolean;
};

function backtestFixtureAllowed(
  fixture: any,
  cutoffMs: number
) {
  const time = fixtureTimeMs(fixture);
  return Number.isFinite(time) && time < cutoffMs;
}


function collectIdentityDeep(
  value: any,
  depth = 0,
  ids = new Set<number>(),
  names = new Set<string>()
) {
  if (
    value === null ||
    value === undefined ||
    depth > 5
  ) {
    return {
      ids,
      names,
    };
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectIdentityDeep(
        item,
        depth + 1,
        ids,
        names
      );
    }

    return {
      ids,
      names,
    };
  }

  if (
    typeof value !== "object"
  ) {
    return {
      ids,
      names,
    };
  }

  for (const [
    key,
    rawValue,
  ] of Object.entries(value)) {
    const normalizedKey =
      String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    if (
      [
        "id",
        "teamid",
        "participantid",
        "competitorid",
      ].includes(
        normalizedKey
      )
    ) {
      const id =
        Number(
          rawValue
        );

      if (
        Number.isFinite(id) &&
        id > 0
      ) {
        ids.add(id);
      }
    }

    if (
      [
        "name",
        "teamname",
        "shortname",
        "displayname",
      ].includes(
        normalizedKey
      )
    ) {
      const name =
        String(
          rawValue ??
          ""
        ).trim();

      if (name) {
        names.add(
          name
        );
      }
    }

    if (
      rawValue &&
      typeof rawValue === "object"
    ) {
      collectIdentityDeep(
        rawValue,
        depth + 1,
        ids,
        names
      );
    }
  }

  return {
    ids,
    names,
  };
}

function fixtureSideContainer(
  fixture: any,
  side: "home" | "away"
) {
  const sideTeam =
    side === "home"
      ? fixture?.homeTeam
      : fixture?.awayTeam;

  const participant =
    fixtureParticipant(
      fixture,
      side
    );

  return [
    fixture?.[side],
    sideTeam,
    fixture?.teams?.[side],
    fixture?.fixture?.[side],
    fixture?.competitors?.[side],
    fixture?.participants?.[side],
    participant,
  ].filter(Boolean);
}

function fixtureSideMatchesIdentity(
  fixture: any,
  side: "home" | "away",
  identity: {
    id: number | null;
    name: string | null;
  }
) {
  const containers =
    fixtureSideContainer(
      fixture,
      side
    );

  for (
    const container of containers
  ) {
    const collected =
      collectIdentityDeep(
        container
      );

    if (
      identity.id !== null &&
      collected.ids.has(
        identity.id
      )
    ) {
      return true;
    }

    if (
      identity.name
    ) {
      for (
        const candidateName of
          collected.names
      ) {
        if (
          teamSimilarity(
            identity.name,
            candidateName
          ) >= 0.62
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

function fixtureTeamSideForBacktest(
  fixture: any,
  team:
    | RecentTeam
    | null
    | undefined
): "home" | "away" | null {
  const identity = {
    id:
      recentTeamId(
        team
      ),
    name:
      recentTeamName(
        team
      ),
  };

  const flatHomeId =
    Number(
      fixture?.homeId
    );

  const flatAwayId =
    Number(
      fixture?.awayId
    );

  if (
    identity.id !== null &&
    Number.isFinite(flatHomeId) &&
    flatHomeId > 0 &&
    flatHomeId === identity.id
  ) {
    return "home";
  }

  if (
    identity.id !== null &&
    Number.isFinite(flatAwayId) &&
    flatAwayId > 0 &&
    flatAwayId === identity.id
  ) {
    return "away";
  }

  const flatHomeName =
    typeof fixture?.home === "string"
      ? fixture.home
      : "";

  const flatAwayName =
    typeof fixture?.away === "string"
      ? fixture.away
      : "";

  if (
    identity.name &&
    flatHomeName &&
    teamSimilarity(
      identity.name,
      flatHomeName
    ) >= 0.62
  ) {
    return "home";
  }

  if (
    identity.name &&
    flatAwayName &&
    teamSimilarity(
      identity.name,
      flatAwayName
    ) >= 0.62
  ) {
    return "away";
  }

  const homeMatch =
    fixtureSideMatchesIdentity(
      fixture,
      "home",
      identity
    );

  const awayMatch =
    fixtureSideMatchesIdentity(
      fixture,
      "away",
      identity
    );

  if (
    homeMatch &&
    !awayMatch
  ) {
    return "home";
  }

  if (
    awayMatch &&
    !homeMatch
  ) {
    return "away";
  }

  if (
    sameTeam(
      team,
      fixture,
      "home"
    )
  ) {
    return "home";
  }

  if (
    sameTeam(
      team,
      fixture,
      "away"
    )
  ) {
    return "away";
  }

  return null;
}

function rebuildHistoricalForm(
  team: RecentTeam | null | undefined,
  fixtures: any[]
): FormData {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let scored = 0;
  let conceded = 0;

  for (const fixture of fixtures) {
    const score = fixtureFinalScore(fixture);
    if (!score) continue;

    const side =
      fixtureTeamSideForBacktest(
        fixture,
        team
      );

    if (!side) {
      continue;
    }

    const own =
      side === "home"
        ? score.home
        : score.away;

    const opponent =
      side === "home"
        ? score.away
        : score.home;

    played += 1;
    scored += own;
    conceded += opponent;

    if (own > opponent) wins += 1;
    else if (own < opponent) losses += 1;
    else draws += 1;
  }

  const formPercent =
    played > 0
      ? ((wins * 3 + draws) / (played * 3)) * 100
      : 0;

  return {
    played,
    wins,
    draws,
    losses,
    scored,
    conceded,
    goalDifference: scored - conceded,
    points: wins * 3 + draws,
    formPercent: Number(formPercent.toFixed(1)),
  };
}

function rebuildHistoricalFormFromSafeSummaries(
  team: RecentTeam | null | undefined,
  fixtures: any[]
): FormData {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let scored = 0;
  let conceded = 0;

  const teamId =
    recentTeamId(
      team
    );

  const teamName =
    recentTeamName(
      team
    );

  for (
    const fixture
    of fixtures
  ) {
    const result =
      String(
        fixture?.result ??
        ""
      ).toUpperCase();

    if (
      ![
        "W",
        "D",
        "L",
      ].includes(
        result
      )
    ) {
      continue;
    }

    const homeScore =
      Number(
        fixture?.homeScore
      );

    const awayScore =
      Number(
        fixture?.awayScore
      );

    if (
      !Number.isFinite(
        homeScore
      ) ||
      !Number.isFinite(
        awayScore
      )
    ) {
      continue;
    }

    const homeId =
      Number(
        fixture?.homeId ??
        fixture?.home?.id
      );

    const awayId =
      Number(
        fixture?.awayId ??
        fixture?.away?.id
      );

    let side:
      | "home"
      | "away"
      | null = null;

    if (
      teamId !== null &&
      Number.isFinite(
        teamId
      )
    ) {
      if (
        homeId ===
        teamId
      ) {
        side = "home";
      } else if (
        awayId ===
        teamId
      ) {
        side = "away";
      }
    }

    if (!side) {
      const normalizedTeam =
        normalizeTeamName(
          teamName
        );

      const homeName =
        normalizeTeamName(
          fixture?.home ??
          fixture?.homeName ??
          ""
        );

      const awayName =
        normalizeTeamName(
          fixture?.away ??
          fixture?.awayName ??
          ""
        );

      if (
        normalizedTeam &&
        homeName &&
        (
          normalizedTeam.includes(
            homeName
          ) ||
          homeName.includes(
            normalizedTeam
          )
        )
      ) {
        side = "home";
      } else if (
        normalizedTeam &&
        awayName &&
        (
          normalizedTeam.includes(
            awayName
          ) ||
          awayName.includes(
            normalizedTeam
          )
        )
      ) {
        side = "away";
      }
    }

    if (!side) {
      continue;
    }

    played += 1;

    if (
      result === "W"
    ) {
      wins += 1;
    } else if (
      result === "D"
    ) {
      draws += 1;
    } else {
      losses += 1;
    }

    if (
      side === "home"
    ) {
      scored +=
        homeScore;
      conceded +=
        awayScore;
    } else {
      scored +=
        awayScore;
      conceded +=
        homeScore;
    }
  }

  const points =
    wins * 3 +
    draws;

  const formPercent =
    played > 0
      ? (
          points /
          (played * 3)
        ) *
        100
      : 0;

  return {
    played,
    wins,
    draws,
    losses,
    scored,
    conceded,
    goalDifference:
      scored -
      conceded,
    points,
    formPercent:
      Number(
        formPercent.toFixed(
          1
        )
      ),
  };
}

function sanitizeRecentTeamForBacktest(
  team: RecentTeam | null | undefined,
  cutoffMs: number,
  selectedIdentity?: {
    id: number | null;
    name: string | null;
  }
) {
  if (!team) {
    return {
      team: null,
      removed: 0,
      kept: 0,
      scored: 0,
      unmatched: 0,
    };
  }

  const original =
    Array.isArray(team.fixtures)
      ? team.fixtures
      : [];

  const fixtures =
    original.filter(
      (fixture: any) =>
        backtestFixtureAllowed(
          fixture,
          cutoffMs
        )
    );

  const sourceTeamId =
    recentTeamId(team);

  const sourceTeamName =
    recentTeamName(team);

  const selectedTeamId =
    selectedIdentity?.id !== null &&
    selectedIdentity?.id !== undefined &&
    Number.isFinite(
      selectedIdentity.id
    ) &&
    selectedIdentity.id > 0
      ? selectedIdentity.id
      : null;

  const selectedTeamName =
    String(
      selectedIdentity?.name ??
      ""
    ).trim() ||
    null;

  // 백테스트에서는 선택 Fixture의 실제 SportsAPI team id/name을
  // 최근경기 집계 기준 identity로 우선 사용합니다.
  // 선택 경기의 점수/승패는 사용하지 않고 팀 식별자만 사용합니다.
  const normalizedTeamId =
    selectedTeamId ??
    sourceTeamId;

  const normalizedTeamName =
    selectedTeamName ??
    sourceTeamName;

  const normalizedTeam = {
    ...team,
    teamId:
      normalizedTeamId ??
      (team as any)?.teamId ??
      null,
    teamName:
      normalizedTeamName ??
      (team as any)?.teamName ??
      null,
    id:
      normalizedTeamId ??
      (team as any)?.id ??
      null,
    name:
      normalizedTeamName ??
      (team as any)?.name ??
      null,
    team: {
      ...(
        (team as any)?.team &&
        typeof (team as any).team === "object"
          ? (team as any).team
          : {}
      ),
      id:
        normalizedTeamId ??
        (team as any)?.team?.id ??
        null,
      name:
        normalizedTeamName ??
        (team as any)?.team?.name ??
        null,
    },
    fixtures,
  } as RecentTeam;

  const rebuiltForm =
    rebuildHistoricalForm(
      normalizedTeam,
      fixtures
    );

  /*
   * /api/match/[fixtureId]의 recent.fixtures는 서버에서
   * cutoff 이전 + 실제 결과 판정 가능 경기만 남긴 요약본이다.
   * 요약본에서는 원본 fixture의 nested team 구조가 사라질 수 있으므로,
   * result/homeId/awayId/homeScore/awayScore를 이용해 한 번 더 안전하게 집계한다.
   */
  const summarizedFixtureForm =
    rebuildHistoricalFormFromSafeSummaries(
      normalizedTeam,
      fixtures
    );

  const serverSafeForm =
    Boolean(
      (team as any)
        ?.backtestSafeForm
    ) &&
    Number(
      (team as any)
        ?.backtestCutoffMs
    ) ===
      cutoffMs &&
    Number(
      team?.form?.played ??
      0
    ) > 0
      ? team?.form ??
        null
      : null;

  /*
   * 원칙:
   * 1) 원시 fixture로 재계산 가능하면 rebuiltForm 사용.
   * 2) 원시 fixture 요약 구조 때문에 client에서 team-side 재판정이 0이 되더라도,
   *    서버가 같은 cutoffMs 이전 경기만으로 계산했다고 명시한 aggregate Form은 사용 가능.
   * 3) backtestSafeForm 표식이 없으면 기존처럼 aggregate Form을 절대 신뢰하지 않음.
   */
  const historicalForm =
    Number(
      rebuiltForm?.played ??
      0
    ) > 0
      ? rebuiltForm
      : Number(
          summarizedFixtureForm
            ?.played ??
          0
        ) > 0
        ? summarizedFixtureForm
        : serverSafeForm ??
          rebuiltForm;

  return {
    team: {
      ...normalizedTeam,
      form:
        historicalForm,
      backtestSafeForm:
        Boolean(
          serverSafeForm
        ) ||
        Number(
          summarizedFixtureForm
            ?.played ??
          0
        ) > 0,
      backtestCutoffMs:
        (
          serverSafeForm ||
          Number(
            summarizedFixtureForm
              ?.played ??
            0
          ) > 0
        )
          ? cutoffMs
          : null,
    } as RecentTeam,
    removed:
      original.length -
      fixtures.length,
    kept:
      fixtures.length,
    scored:
      fixtures.filter(
        (fixture: any) => fixtureFinalScore(fixture) !== null
      ).length,
    unmatched:
      fixtures.filter(
        (fixture: any) =>
          fixtureFinalScore(fixture) !== null &&
          fixtureTeamSideForBacktest(
            fixture,
            normalizedTeam
          ) === null
      ).length,
  };
}

function backtestH2HFixtureCandidates(
  homeRecent:
    | RecentTeam
    | null
    | undefined,
  awayRecent:
    | RecentTeam
    | null
    | undefined
) {
  const map =
    new Map<string, any>();

  const add =
    (fixture: any) => {
      const id =
        fixture?.id ??
        fixture?.fixture?.id ??
        null;

      const time =
        fixtureTimeMs(
          fixture
        );

      const key =
        id !== null &&
        id !== undefined
          ? `id:${id}`
          : `time:${time}|${fixtureTeamName(
              fixture,
              "home"
            )}|${fixtureTeamName(
              fixture,
              "away"
            )}`;

      if (!map.has(key)) {
        map.set(
          key,
          fixture
        );
      }
    };

  for (
    const fixture of
      homeRecent?.fixtures ??
      []
  ) {
    add(fixture);
  }

  for (
    const fixture of
      awayRecent?.fixtures ??
      []
  ) {
    add(fixture);
  }

  return [
    ...map.values(),
  ];
}

function sanitizeH2HForBacktest(
  h2h: any,
  cutoffMs: number,
  homeName: string,
  awayName: string
) {
  const fixtures =
    Array.isArray(h2h?.fixtures)
      ? h2h.fixtures
      : Array.isArray(h2h?.matches)
        ? h2h.matches
        : Array.isArray(h2h?.response)
          ? h2h.response
          : [];

  // 집계값만 제공되면 현재 경기/미래 경기 포함 여부를 검증할 수 없으므로 차단.
  if (!fixtures.length) {
    return {
      h2h: null,
      policy:
        "원시 H2H 경기목록 없음 · aggregate H2H 차단",
    };
  }

  const historical =
    fixtures.filter(
      (fixture: any) =>
        backtestFixtureAllowed(
          fixture,
          cutoffMs
        )
    );

  const normalizedHome =
    normalizeTeamName(homeName);

  const normalizedAway =
    normalizeTeamName(awayName);

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  for (const fixture of historical) {
    const score = fixtureFinalScore(fixture);
    if (!score) continue;

    const fixtureHome =
      normalizeTeamName(
        fixtureTeamName(
          fixture,
          "home"
        )
      );

    const fixtureAway =
      normalizeTeamName(
        fixtureTeamName(
          fixture,
          "away"
        )
      );

    const direct =
      Boolean(fixtureHome) &&
      Boolean(fixtureAway) &&
      (
        fixtureHome.includes(normalizedHome) ||
        normalizedHome.includes(fixtureHome)
      ) &&
      (
        fixtureAway.includes(normalizedAway) ||
        normalizedAway.includes(fixtureAway)
      );

    const reverse =
      Boolean(fixtureHome) &&
      Boolean(fixtureAway) &&
      (
        fixtureHome.includes(normalizedAway) ||
        normalizedAway.includes(fixtureHome)
      ) &&
      (
        fixtureAway.includes(normalizedHome) ||
        normalizedHome.includes(fixtureAway)
      );

    if (!direct && !reverse) continue;

    if (score.home === score.away) {
      draws += 1;
      continue;
    }

    const selectedHomeWon =
      direct
        ? score.home > score.away
        : score.away > score.home;

    if (selectedHomeWon) homeWins += 1;
    else awayWins += 1;
  }

  return {
    h2h: {
      homeWins,
      awayWins,
      draws,
      fixtures: historical,
    },
    policy:
      `cutoff 이전 H2H ${historical.length}경기만 재계산`,
  };
}

function stripResultFieldsForBacktest(
  fixture: any
) {
  if (!fixture || typeof fixture !== "object") {
    return fixture;
  }

  const clone: any = { ...fixture };

  for (const key of [
    "homeScore",
    "awayScore",
    "score",
    "scores",
    "goals",
    "result",
    "winner",
    "periods",
  ]) {
    if (key in clone) delete clone[key];
  }

  if (clone.home && typeof clone.home === "object") {
    clone.home = { ...clone.home };
    delete clone.home.score;
    delete clone.home.goals;
  }

  if (clone.away && typeof clone.away === "object") {
    clone.away = { ...clone.away };
    delete clone.away.score;
    delete clone.away.goals;
  }

  return clone;
}

function sanitizeMatchedForBacktest(
  matched: any,
  cutoffMs: number,
  selectedGame:
    | BetmanMatch
    | null
    | undefined
) {
  const selectedFixtureSource =
    matched?.fixture ??
    matched?.detail ??
    null;

  const selectedHomeIdRaw =
    fixtureTeamId(
      selectedFixtureSource,
      "home"
    );

  const selectedAwayIdRaw =
    fixtureTeamId(
      selectedFixtureSource,
      "away"
    );

  const selectedHomeId =
    Number.isFinite(
      selectedHomeIdRaw
    ) &&
    selectedHomeIdRaw > 0
      ? selectedHomeIdRaw
      : (
          Number.isFinite(
            Number(
              matched?.selectedFixture?.homeId
            )
          )
            ? Number(
                matched?.selectedFixture?.homeId
              )
            : null
        );

  const selectedAwayId =
    Number.isFinite(
      selectedAwayIdRaw
    ) &&
    selectedAwayIdRaw > 0
      ? selectedAwayIdRaw
      : (
          Number.isFinite(
            Number(
              matched?.selectedFixture?.awayId
            )
          )
            ? Number(
                matched?.selectedFixture?.awayId
              )
            : null
        );

  const selectedHomeName =
    fixtureTeamName(
      selectedFixtureSource,
      "home"
    ) ||
    String(
      matched?.selectedFixture?.home ??
      selectedGame?.home ??
      ""
    ).trim() ||
    null;

  const selectedAwayName =
    fixtureTeamName(
      selectedFixtureSource,
      "away"
    ) ||
    String(
      matched?.selectedFixture?.away ??
      selectedGame?.away ??
      ""
    ).trim() ||
    null;

  const home =
    sanitizeRecentTeamForBacktest(
      matched?.recentSummary?.home ?? null,
      cutoffMs,
      {
        id:
          selectedHomeId,
        name:
          selectedHomeName,
      }
    );

  const away =
    sanitizeRecentTeamForBacktest(
      matched?.recentSummary?.away ?? null,
      cutoffMs,
      {
        id:
          selectedAwayId,
        name:
          selectedAwayName,
      }
    );

  const h2hSource =
    (
      Array.isArray(
        matched?.h2h?.fixtures
      ) &&
      matched.h2h.fixtures.length
    ) ||
    (
      Array.isArray(
        matched?.h2h?.matches
      ) &&
      matched.h2h.matches.length
    ) ||
    (
      Array.isArray(
        matched?.h2h?.response
      ) &&
      matched.h2h.response.length
    )
      ? matched.h2h
      : {
          fixtures:
            backtestH2HFixtureCandidates(
              home.team,
              away.team
            ),
        };

  const h2h =
    sanitizeH2HForBacktest(
      h2hSource,
      cutoffMs,
      String(
        selectedGame?.home ??
        matched?.selectedFixture?.home ??
        ""
      ),
      String(
        selectedGame?.away ??
        matched?.selectedFixture?.away ??
        ""
      )
    );

  return {
    ...matched,
    fixture:
      stripResultFieldsForBacktest(
        matched?.fixture
      ),
    detail:
      stripResultFieldsForBacktest(
        matched?.detail
      ),
    selectedFixture:
      stripResultFieldsForBacktest(
        matched?.selectedFixture
      ),
    recentSummary: {
      home: home.team,
      away: away.team,
    },
    h2h: h2h.h2h,
    // 경기 후 팀/선수 통계는 leakage 위험이 있으므로 완전 차단.
    statistics: null,

    // 경기전 선발/라인업 구조 진단은 결과값을 제거한 요약만 유지.
    pregameAudit:
      matched?.pregameAudit ??
      null,

    detailDebug: null,
    backtestAudit: {
      enabled: true,
      cutoffMs,
      removedHomeFixtures:
        home.removed,
      removedAwayFixtures:
        away.removed,
      keptHomeFixtures:
        home.kept,
      keptAwayFixtures:
        away.kept,
      scoredHomeFixtures:
        home.scored,
      scoredAwayFixtures:
        away.scored,
      matchedHomeFixtures:
        Number(home.team?.form?.played ?? 0),
      matchedAwayFixtures:
        Number(away.team?.form?.played ?? 0),
      selectedHomeTeamId:
        selectedHomeId,
      selectedAwayTeamId:
        selectedAwayId,
      selectedHomeTeamName:
        selectedHomeName,
      selectedAwayTeamName:
        selectedAwayName,
      unmatchedHomeFixtures:
        home.unmatched,
      unmatchedAwayFixtures:
        away.unmatched,
      homeRecentFixtureShape:
        safeRecentFixtureShape(
          home.team?.fixtures?.[0] ??
          null
        ),
      awayRecentFixtureShape:
        safeRecentFixtureShape(
          away.team?.fixtures?.[0] ??
          null
        ),
      h2hPolicy:
        h2h.policy,
      resultFieldsStripped: true,
      statisticsBlocked: true,
    } satisfies BacktestAudit,
  };
}

function formatBacktestCutoff(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date(value));
}


type BatchBacktestPhase = "IDLE" | "DIRECT" | "SELECT" | "ANALYZE" | "WAIT_ANALYZE" | "REVEAL" | "WAIT_REVEAL";

type BatchBacktestState = {
  running: boolean;
  gameKeys: string[];
  index: number;
  phase: BatchBacktestPhase;
  completed: number;
  failed: number;
  phaseStartedAt: number;
};

type BatchBacktestDiagnostic = {
  index: number;
  gameNo: string;
  gameLabel: string;
  status: "SUCCESS" | "FAIL";
  fixtureId: number | null;
  calibrationRows: number;
  message: string;
  savedAt: number;
};


type BacktestBaselineSnapshot = {
  savedAt: number;
  total: BacktestPerformanceRow;
  byModel: BacktestPerformanceRow[];
  byMarket: BacktestPerformanceRow[];
};

const BACKTEST_BASELINE_STORAGE_KEY =
  "wisetoto-backtest-baseline-v1365";

function readBacktestBaseline():
  BacktestBaselineSnapshot | null {
  try {
    const raw =
      window.localStorage.getItem(
        BACKTEST_BASELINE_STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    return (
      parsed &&
      typeof parsed === "object" &&
      parsed.total &&
      Array.isArray(parsed.byModel) &&
      Array.isArray(parsed.byMarket)
    )
      ? parsed as BacktestBaselineSnapshot
      : null;
  } catch {
    return null;
  }
}

function saveBacktestBaseline(
  value: BacktestBaselineSnapshot
) {
  try {
    window.localStorage.setItem(
      BACKTEST_BASELINE_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch {}
}

function performanceDelta(
  current: BacktestPerformanceRow | null,
  baseline: BacktestPerformanceRow | null
) {
  if (
    !current ||
    !baseline ||
    current.hitRate === null ||
    baseline.hitRate === null
  ) {
    return null;
  }

  return current.hitRate - baseline.hitRate;
}

function formatPerformanceDelta(
  value: number | null
) {
  if (value === null) {
    return "-";
  }

  const prefix =
    value > 0
      ? "+"
      : "";

  return `${prefix}${value.toFixed(1)}%p`;
}

export default function Home() {
  const [sport, setSport] = useState<Sport>("전체");
  const [status, setStatus] = useState("Betman 발매경기 불러오는 중…");
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState<any>(null);

  const [backtestMode, setBacktestMode] =
    useState(false);

  const [backtestResultRevealed, setBacktestResultRevealed] =
    useState(false);

  const [simpleBacktestRecords, setSimpleBacktestRecords] =
    useState<SimpleBacktestRecord[]>([]);
  const [backtestGames, setBacktestGames] =
    useState<BetmanMatch[]>(BACKTEST_BETMAN_GAMES);
  const [backtestLibraryLoading, setBacktestLibraryLoading] =
    useState(false);
  const [dynamicValidationResults, setDynamicValidationResults] =
    useState<Record<string, BacktestValidationResult>>({});
  const [validationLoading, setValidationLoading] =
    useState(false);
  const [batchBacktest, setBatchBacktest] =
    useState<BatchBacktestState>({
      running: false,
      gameKeys: [],
      index: 0,
      phase: "IDLE",
      completed: 0,
      failed: 0,
      phaseStartedAt: Date.now(),
    });
  const [batchBacktestDiagnostics, setBatchBacktestDiagnostics] =
    useState<BatchBacktestDiagnostic[]>([]);


  const [
    backtestBaseline,
    setBacktestBaseline,
  ] =
    useState<BacktestBaselineSnapshot | null>(
      null
    );

  useEffect(() => {
    setBacktestBaseline(
      readBacktestBaseline()
    );
  }, []);

  const [
    offlineDatasetCount,
    setOfflineDatasetCount,
  ] =
    useState(0);


  const [
    collectionCheckpoint,
    setCollectionCheckpoint,
  ] =
    useState<ReturnType<
      typeof readBacktestCollectionCheckpoint
    >>(null);


  const [
    legacyRecovery,
    setLegacyRecovery,
  ] =
    useState<LegacyRecoveryPreview>({
      recoverable: 0,
      snapshots: 0,
      truths: 0,
      games: 0,
      calibrationRows: 0,
    });

  function refreshLegacyRecoveryPreview() {
    try {
      setLegacyRecovery(
        legacyRecoveryPreview()
      );
    } catch {
      setLegacyRecovery({
        recoverable: 0,
        snapshots: 0,
        truths: 0,
        games: 0,
        calibrationRows: 0,
      });
    }
  }

  async function refreshOfflineDatasetCount() {
    try {
      setOfflineDatasetCount(
        await countBacktestDatasetEntries()
      );
    } catch {
      setOfflineDatasetCount(
        0
      );
    }
  }

  const currentBatchPerformance =
    useMemo(
      () => {
        const fixtureKeys =
          new Set(
            batchBacktestDiagnostics
              .filter(
                (row) =>
                  row.status ===
                    "SUCCESS" &&
                  row.fixtureId !==
                    null
              )
              .map(
                (row) =>
                  String(
                    row.fixtureId
                  )
              )
          );

        const rows =
          fixtureKeys.size > 0
            ? simpleBacktestRecords.filter(
                (row) =>
                  fixtureKeys.has(
                    String(
                      row.fixtureKey
                    )
                  )
              )
            : [];

        const normalRows =
          rows.filter(
            (row) =>
              !isMarketFallbackRecord(
                row
              )
          );

        const fallbackRows =
          rows.filter(
            isMarketFallbackRecord
          );

        const byModel = [
          backtestPerformanceRow(
            "NORMAL",
            "NORMAL 모델",
            normalRows
          ),
          backtestPerformanceRow(
            "FALLBACK",
            "MARKET FALLBACK",
            fallbackRows
          ),
        ];

        const marketGroups = [
          "승패",
          "승1패",
          "핸디캡",
          "U/O",
          "SUM",
          "전반",
        ];

        const byMarket =
          marketGroups.map(
            (group) =>
              backtestPerformanceRow(
                group,
                group,
                rows.filter(
                  (row) =>
                    backtestMarketGroup(
                      row.market
                    ) ===
                    group
                )
              )
          );

        return {
          rows,
          total:
            backtestPerformanceRow(
              "TOTAL",
              "전체",
              rows
            ),
          byModel,
          byMarket,
        };
      },
      [
        simpleBacktestRecords,
        batchBacktestDiagnostics,
      ]
    );
  const [betmanGames, setBetmanGames] = useState<BetmanMatch[]>([]);
  const [betmanDiagnostics, setBetmanDiagnostics] = useState<any>(null);
  const [selectedBetmanKey, setSelectedBetmanKey] = useState<string | null>(null);

  const [baseballSnapshots, setBaseballSnapshots] =
    useState<Record<string, BaseballAnalysisSnapshot[]>>({});
  const [betman, setBetman] = useState<{
    loading: boolean;
    matched: BetmanMatch | null;
    score: number | null;
    error: string | null;
  }>({ loading: false, matched: null, score: null, error: null });

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          SIMPLE_BACKTEST_STORAGE_KEY
        );

      if (!raw) {
        return;
      }

      const parsed =
        JSON.parse(raw);

      if (Array.isArray(parsed)) {
        setSimpleBacktestRecords(
          parsed.map((row: any) => ({
            ...row,
            stage: row?.stage ?? String(row?.id ?? "").split("|")[1] ?? "READY",
          })) as SimpleBacktestRecord[]
        );
      }
    } catch {
      // 누적 백테스트 저장 실패는 예측 엔진과 무관.
    }
  }, []);

  useEffect(() => {
    void refreshOfflineDatasetCount();
    refreshLegacyRecoveryPreview();
    setCollectionCheckpoint(
      readBacktestCollectionCheckpoint()
    );
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BACKTEST_GAME_LIBRARY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const merged = new Map<string, BetmanMatch>();
      for (const game of BACKTEST_BETMAN_GAMES) {
        merged.set(String((game as any)?.gameKey ?? (game as any)?.key ?? `${game.home}|${game.away}|${game.gameDate}`), game);
      }
      for (const game of parsed) {
        const key = String(game?.gameKey ?? game?.key ?? `${game?.home}|${game?.away}|${game?.gameDate}`);
        if (key) merged.set(key, game);
      }
      setBacktestGames(Array.from(merged.values()).sort((a,b) => gameTimeMs(b) - gameTimeMs(a)));
    } catch {
      // 백테스트 경기 라이브러리 복원 실패는 분석 엔진과 분리.
    }
  }, []);


  function saveCurrentBacktestAsBaseline() {
    if (
      currentBatchPerformance.total.records <= 0
    ) {
      setStatus(
        "Baseline으로 저장할 백테스트 결과가 없습니다."
      );
      return;
    }

    const snapshot:
      BacktestBaselineSnapshot = {
        savedAt: Date.now(),
        total:
          currentBatchPerformance.total,
        byModel:
          currentBatchPerformance.byModel,
        byMarket:
          currentBatchPerformance.byMarket,
      };

    saveBacktestBaseline(
      snapshot
    );
    setBacktestBaseline(
      snapshot
    );

    setStatus(
      `📌 Baseline 저장 완료 · 전체 ${snapshot.total.hits}/${snapshot.total.records} · 적중률 ${snapshot.total.hitRate?.toFixed(1) ?? "-"}%`
    );
  }

  function clearBacktestBaseline() {
    try {
      window.localStorage.removeItem(
        BACKTEST_BASELINE_STORAGE_KEY
      );
    } catch {}

    setBacktestBaseline(
      null
    );

    setStatus(
      "Baseline 비교 기준을 삭제했습니다."
    );
  }

  function readableError(value: any, fallback: string) {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    try { return JSON.stringify(value); } catch { return fallback; }
  }

  function gameKey(game: BetmanMatch, index = 0) {
    return String(game?.key ?? (game as any)?.gameKey ?? actualGameIdentity(game) ?? `${game?.home ?? ""}|${game?.away ?? ""}|${game?.gameDateMs ?? game?.gameDate ?? ""}|${index}`);
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

    const marketText =
      `${String(
        market?.betName ??
        ""
      )} ${String(
        market?.betTypeName ??
        ""
      )} ${String(
        market?.displayName ??
        ""
      )}`.toLowerCase();

    const isTotal =
      market?.type === "total" ||
      /u\/o|under|over|언더|오버/.test(
        marketText
      );

    const isSum =
      /sum|홀짝|홀\/짝/.test(
        marketText
      );

    const wantedSides =
      side === "draw"
        ? ["draw"]
        : isTotal
          ? side === "win"
            ? ["under", "win"]
            : ["over", "lose"]
          : isSum
            ? side === "win"
              ? ["odd", "win"]
              : ["even", "lose"]
            : side === "win"
              ? ["win", "home"]
              : ["lose", "away"];

    const found =
      selections.find(
        (selection: any) => {
          const selectionSide =
            String(
              selection?.side ??
              ""
            ).toLowerCase();

          if (
            wantedSides.includes(
              selectionSide
            )
          ) {
            return true;
          }

          const label =
            String(
              selection?.label ??
              ""
            )
              .trim()
              .toLowerCase();

          if (side === "draw") {
            return /^(무|draw|1|①)$/.test(
              label
            );
          }

          if (isTotal) {
            return side === "win"
              ? /^(under|언더)$/.test(label)
              : /^(over|오버)$/.test(label);
          }

          if (isSum) {
            return side === "win"
              ? /^(홀|odd)$/.test(label)
              : /^(짝|even)$/.test(label);
          }

          return side === "win"
            ? /^(승|home|홈)$/.test(label)
            : /^(패|away|원정)$/.test(label);
        }
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
    game: BetmanMatch | null | undefined
  ) {
    if (!game) {
      return null;
    }

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

  async function loadBacktestCandidates() {
    if (backtestLibraryLoading) return;
    setBacktestLibraryLoading(true);
    setStatus("Betman 과거 회차에서 KBO 백테스트 후보 탐색 중…");

    const isKboCandidate = (game:any) => {
      const start = gameTimeMs(game);
      const markets = Array.isArray(game?.markets) ? game.markets : [];
      const hasOdds = markets.some(
        (market:any) =>
          Array.isArray(market?.selections) &&
          market.selections.some((selection:any) => Number(selection?.odds) > 1)
      );
      const leagueText = String(
        game?.league ?? game?.leagueName ?? game?.sportName ?? ""
      ).toLowerCase();
      const teamText =
        `${String(game?.home ?? "")} ${String(game?.away ?? "")}`.toLowerCase();
      const kboTeams = [
        "nc","삼성","두산","lg","kt","ssg","롯데","한화","키움","kia",
        "dinos","lions","bears","twins","wiz","landers","giants","eagles","heroes","tigers"
      ];
      const kboLike =
        leagueText.includes("kbo") ||
        kboTeams.some((name) => teamText.includes(name));

      return (
        Number.isFinite(start) &&
        start < Date.now() - 3 * 60 * 60 * 1000 &&
        hasOdds &&
        kboLike
      );
    };

    try {
      const currentResponse = await fetch("/api/betman?scope=all", {
        cache: "no-store",
      });
      const currentPayload = await readApiResponse(
        currentResponse,
        "Betman 현재 회차 API"
      );
      if (!currentResponse.ok || !currentPayload?.ok) {
        throw new Error(
          readableError(currentPayload?.error, "현재 Betman 회차 확인 실패")
        );
      }

      const currentGmTs = Number(
        currentPayload?.round?.gmTs ??
        currentPayload?.data?.round?.gmTs
      );

      if (!Number.isFinite(currentGmTs) || currentGmTs <= 0) {
        throw new Error("현재 Betman gmTs를 확인하지 못했습니다.");
      }

      const yearPrefix = Math.floor(currentGmTs / 10000);
      const currentRound = currentGmTs % 10000;
      const collected: any[] = [];
      const seen = new Set<string>();
      let scannedRounds = 0;
      let successfulRounds = 0;

      for (
        let round = currentRound - 1;
        round >= 1 && scannedRounds < 24 && collected.length < 30;
        round--
      ) {
        const gmTs = yearPrefix * 10000 + round;
        scannedRounds += 1;
        setStatus(
          `Betman 과거 회차 탐색 중 · ${gmTs} · KBO ${collected.length}/30경기`
        );

        try {
          const response = await fetch(
            `/api/betman?gmTs=${gmTs}&gmId=G101&scope=past&sport=baseball`,
            { cache: "no-store" }
          );
          const payload = await readApiResponse(
            response,
            `Betman ${gmTs} 회차 API`
          );
          if (!response.ok || !payload?.ok) continue;

          successfulRounds += 1;
          const games = getBetmanGames(payload)
            .filter(isKboCandidate)
            .map((game:any) => ({
              ...game,
              betmanGmTs: gmTs,
              backtestManual: false,
              backtestSource:
                `Betman G101 ${gmTs} 과거 회차 · 결과정보 미포함`,
            }));

          for (const game of games) {
            const key = String(
              game?.gameKey ??
              game?.key ??
              `${game?.home}|${game?.away}|${game?.gameDateMs ?? game?.gameDate}`
            );
            if (!key || seen.has(key)) continue;
            seen.add(key);
            collected.push(game);
            if (collected.length >= 30) break;
          }
        } catch {
          // 개별 회차 실패는 다음 회차 탐색을 계속한다.
        }
      }

      const candidates = collected
        .sort((a,b) => gameTimeMs(b) - gameTimeMs(a))
        .slice(0, 30);

      setBacktestGames((previous) => {
        const next = mergeActualGames([...BACKTEST_BETMAN_GAMES, ...previous, ...candidates])
          .sort((a,b) => gameTimeMs(b) - gameTimeMs(a));
        try {
          window.localStorage.setItem(BACKTEST_GAME_LIBRARY_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      setBacktestMode(true);
      setStatus(
        candidates.length
          ? `과거 ${scannedRounds}회차 탐색 · 응답 ${successfulRounds}회차 · KBO ${candidates.length}경기 확보 · 백테스트 라이브러리에 저장`
          : `과거 ${scannedRounds}회차를 조회했지만 KBO 발매경기를 찾지 못했습니다.`
      );
    } catch (e:any) {
      setStatus(readableError(e, "과거 Betman 회차 자동수집 실패"));
    } finally {
      setBacktestLibraryLoading(false);
    }
  }

  useEffect(() => { loadBetmanList(); }, []);

  const visibleBetmanGames = useMemo(
    () => mergeActualGames(backtestMode ? backtestGames : betmanGames),
    [backtestMode, backtestGames, betmanGames]
  );

  const filteredGames = useMemo(
    () =>
      visibleBetmanGames.filter(
        (game) =>
          sport === "전체" ||
          koreanSport(String((game as any)?.sport ?? "")) === sport
      ),
    [visibleBetmanGames, sport]
  );

  const uiMarketRowCount = useMemo(
    () =>
      visibleBetmanGames.reduce(
        (sum, game) =>
          sum +
          marketRows(game).length,
        0
      ),
    [visibleBetmanGames]
  );

  const uiSportCounts = useMemo(() => {
    const counts: Record<Exclude<Sport, "전체">, { games: number; markets: number }> = {
      축구: { games: 0, markets: 0 },
      야구: { games: 0, markets: 0 },
      농구: { games: 0, markets: 0 },
      배구: { games: 0, markets: 0 },
    };

    for (const game of visibleBetmanGames) {
      const key = koreanSport(
        String((game as any)?.sport ?? "")
      );

      counts[key].games += 1;
      counts[key].markets += marketRows(game).length;
    }

    return counts;
  }, [visibleBetmanGames]);

  const selectedBetman = useMemo(() => {
    if (!selectedBetmanKey) return null;
    return (
      visibleBetmanGames.find(
        (game,index) => gameKey(game,index) === selectedBetmanKey
      ) ?? null
    );
  }, [visibleBetmanGames, selectedBetmanKey]);

  const selectedFixture = matched?.selectedFixture ?? null;
  const detail = matched?.detail ?? null;
  const h2h = matched?.h2h ?? null;
  const recentSummary: RecentSummary | null = matched?.recentSummary ?? null;

  const backtestAudit:
    BacktestAudit | null =
      matched?.backtestAudit ??
      null;
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

  const analysis = buildAnalysis(
    currentSport,
    h2h,
    recentSummary,
    betman.matched,
    matched
  );
  const analysisFactors = analysis.factors;
  const betmanHandicap = chooseBetmanHandicap(betman.matched);
  const betmanTotal = chooseBetmanTotal(betman.matched);
  const actualMarketPicksRaw = buildActualMarketPicks(
    betman.matched,
    currentSport,
    analysisFactors,
    recentSummary,
    h2h
  );

  const actualMarketPicks =
    applyLineupStatsCoverageGate(
      actualMarketPicksRaw,
      currentSport,
      analysisFactors
    );

  const marketConnectionDiagnostics =
    buildMarketConnectionDiagnostics(
      betman.matched,
      actualMarketPicks
    );

  const dynamicValidationKey = String(
    matched?.fixtureId ??
    matched?.selectedFixture?.id ??
    backtestValidationKey(selectedBetman) ??
    ""
  );

  const backtestValidationResolved =
    backtestMode
      ? dynamicValidationResults[dynamicValidationKey]
        ? { truth: dynamicValidationResults[dynamicValidationKey], matchedBy: `SportsAPI fixture result:${dynamicValidationKey} · 검증 레이어 전용` }
        : resolveBacktestValidationResult(
            selectedBetman,
            matched
          )
      : {
          truth:
            null as BacktestValidationResult | null,
          matchedBy:
            "백테스트 OFF",
        };

  const backtestValidationTruth =
    backtestValidationResolved.truth;

  const selectedValidationMarkets =
    selectedBetman
      ? marketRows(
          selectedBetman
        )
      : [];

  const backtestValidationRows:
    BacktestMarketValidation[] =
      backtestValidationTruth
        ? actualMarketPicks.map(
            (pick) => {
              const marketIndex =
                selectedValidationMarkets.findIndex(
                  (market: any, index: number) =>
                    marketStableKey(
                      market,
                      index
                    ) ===
                    pick.key
                );

              const market =
                marketIndex >= 0
                  ? selectedValidationMarkets[
                      marketIndex
                    ]
                  : null;

              return validateBacktestMarket(
                market,
                pick,
                backtestValidationTruth
              );
            }
          )
        : [];

  const backtestValidatedRows =
    backtestValidationRows.filter(
      (row) =>
        row.status !==
        "PENDING"
    );

  const backtestHitCount =
    backtestValidatedRows.filter(
      (row) =>
        row.status ===
        "HIT"
    ).length;

  const simpleCurrentRecords:
    SimpleBacktestRecord[] =
      [];

  if (
    backtestResultRevealed &&
    backtestValidationTruth
  ) {
    // V13.1: 실제 결과가 공개되는 순간, 같은 Fixture에 보존된
    // PRE/STARTER/LINEUP/READY 스냅샷을 모두 동일 truth로 검증한다.
    const storedValidationSnapshots =
      Object.values(baseballSnapshots)
        .flat()
        .filter((item) =>
          item.fixtureKey === String(
            matched?.fixtureId ??
            primaryMatchSeq(betman.matched) ??
            `${betman.matched?.home ?? ""}|${betman.matched?.away ?? ""}`
          )
        );
    const snapshotsForValidation =
      storedValidationSnapshots.length
        ? storedValidationSnapshots
        : [{
            stage: analysisFactors.baseballAnalysisStage,
            markets: actualMarketPicks,
          } as any];

    for (const snapshot of snapshotsForValidation) {
      for (const validation of backtestValidationRows) {
        if (validation.status !== "HIT" && validation.status !== "MISS") continue;

        const pick = snapshot.markets.find(
          (item: any) => item.key === validation.key
        );
        if (!pick) continue;

        const fixtureKey = String(
          matched?.fixtureId ??
          backtestValidationKey(selectedBetman) ??
          selectedBetmanKey ??
          "unknown"
        );
        const hit = validation.status === "HIT";
        const probability = clamp(pick.probability, 0, 100);
        const p = probability / 100;
        const odds = pick.odds ?? null;
        const expectedValue = pick.expectedValue ?? null;
        const grade = pick.displayGrade ?? pick.stageGradeLabel ?? pick.grade ?? pick.valueGrade ?? "-";
        const realizedReturn =
          odds !== null && Number.isFinite(odds) && odds > 1
            ? hit ? odds - 1 : -1
            : null;

        simpleCurrentRecords.push({
          id: `${fixtureKey}|${snapshot.stage}|${pick.key}`,
          fixtureKey,
          gameLabel: `${selectedBetman?.home ?? "-"} vs ${selectedBetman?.away ?? "-"}`,
          stage: snapshot.stage,
          market: pick.market,
          pick: pick.pick,
          probability,
          odds,
          expectedValue,
          grade,
          hit,
          realizedReturn,
          brier: Number(((p - (hit ? 1 : 0)) ** 2).toFixed(6)),
          savedAt: Date.now(),
        });
      }
    }
  }

  const simpleCurrentSignature =
    JSON.stringify(
      simpleCurrentRecords.map(
        (row) => [
          row.id,
          row.hit,
          row.probability,
          row.odds,
          row.expectedValue,
        ]
      )
    );

  useEffect(() => {
    if (
      !backtestResultRevealed ||
      !simpleCurrentRecords.length
    ) {
      return;
    }

    setSimpleBacktestRecords(
      (previous) => {
        const byId =
          new Map<string, SimpleBacktestRecord>();

        for (const row of previous) {
          byId.set(row.id, row);
        }

        for (const row of simpleCurrentRecords) {
          byId.set(row.id, row);
        }

        const next =
          Array.from(byId.values());

        try {
          window.localStorage.setItem(
            SIMPLE_BACKTEST_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // 저장 실패는 분석과 분리.
        }

        return next;
      }
    );
  }, [
    backtestResultRevealed,
    simpleCurrentSignature,
  ]);


  // V13.3.7: 자동 백테스트는 React 상태 감시형 state-machine을 사용하지 않고
  // 한 경기씩 await 하는 직접 순차 실행 함수에서 처리합니다.

  const simpleSummary =
    simpleBacktestSummary(
      simpleBacktestRecords
    );

  const simpleMarketSummaries =
    Array.from(
      new Set(
        simpleBacktestRecords.map(
          (row) => row.market
        )
      )
    ).map(
      (market) => ({
        market,
        summary:
          simpleBacktestSummary(
            simpleBacktestRecords.filter(
              (row) =>
                row.market === market
            )
          ),
      })
    );

  const simpleStageSummaries =
    (["PRE", "STARTER", "LINEUP", "READY"] as const).map(
      (stage) => ({
        stage,
        summary: simpleBacktestSummary(
          simpleBacktestRecords.filter((row) => row.stage === stage)
        ),
      })
    );

  const simpleGradeSummaries =
    Array.from(new Set(simpleBacktestRecords.map((row) => row.grade)))
      .map((grade) => ({
        grade,
        summary: simpleBacktestSummary(
          simpleBacktestRecords.filter((row) => row.grade === grade)
        ),
      }));


  // V13.2 Calibration Audit: 저장된 V13.1 검증 데이터만 읽어서
  // 확률/EV/등급/시장/단계별 실제 성능과 예측확률의 괴리를 진단한다.
  const calibrationOverall =
    calibrationAuditSummary(simpleBacktestRecords);

  const calibrationProbabilityBuckets =
    probabilityCalibrationBuckets(simpleBacktestRecords);

  const calibrationEvBuckets =
    evCalibrationBuckets(simpleBacktestRecords);

  const calibrationGradeSummaries =
    Array.from(
      new Set(
        simpleBacktestRecords.map((row) => calibrationGradeBucket(row.grade))
      )
    ).map((grade) => ({
      grade,
      summary: calibrationAuditSummary(
        simpleBacktestRecords.filter(
          (row) => calibrationGradeBucket(row.grade) === grade
        )
      ),
    }));

  const calibrationMarketSummaries =
    Array.from(new Set(simpleBacktestRecords.map((row) => row.market)))
      .map((market) => ({
        market,
        summary: calibrationAuditSummary(
          simpleBacktestRecords.filter((row) => row.market === market)
        ),
      }));

  const calibrationStageSummaries =
    (["PRE", "STARTER", "LINEUP", "READY"] as const).map((stage) => ({
      stage,
      summary: calibrationAuditSummary(
        simpleBacktestRecords.filter((row) => row.stage === stage)
      ),
    }));

  const calibrationEce = (() => {
    if (!simpleBacktestRecords.length) return null;
    const weighted = calibrationProbabilityBuckets.reduce((sum, bucket) => {
      if (bucket.summary.absoluteGap === null) return sum;
      return sum + bucket.summary.absoluteGap * bucket.summary.records;
    }, 0);
    return weighted / simpleBacktestRecords.length;
  })();

  function clearSimpleBacktest() {
    setSimpleBacktestRecords([]);

    try {
      window.localStorage.removeItem(
        SIMPLE_BACKTEST_STORAGE_KEY
      );
    } catch {
      // UI 저장소 초기화 실패는 분석과 무관.
    }
  }

  const betmanRuntimeDebug =
    safeBetmanMarketRuntime(
      betman.matched
    );

  const sportsRuntimeDebug =
    matched?.debug?.runtimeShape ??
    matched?.detailDebug?.runtimeShape ??
    null;

  const marketConnectionLinked =
    marketConnectionDiagnostics.filter(
      (item) =>
        item.pickConnected
    ).length;

  const marketConnectionWithOdds =
    marketConnectionDiagnostics.filter(
      (item) =>
        item.usableOddsCount > 0
    ).length;

  const baseballSnapshotKey =
    currentSport === "야구"
      ? String(
          matched?.fixtureId ??
          primaryMatchSeq(
            betman.matched
          ) ??
          `${betman.matched?.home ?? ""}|${betman.matched?.away ?? ""}`
        )
      : "";

  const currentBaseballSnapshots =
    baseballSnapshotKey
      ? baseballSnapshots[
          baseballSnapshotKey
        ] ?? []
      : [];

  const snapshotSignature =
    currentSport === "야구"
      ? JSON.stringify({
          key:
            baseballSnapshotKey,
          stage:
            analysisFactors.baseballAnalysisStage,
          completeness:
            analysisFactors.baseballDataCompleteness,
          home:
            analysisFactors.expectedHomeScore,
          away:
            analysisFactors.expectedAwayScore,
          starter:
            analysisFactors.baseballStarterCount,
          lineup:
            analysisFactors.baseballLineupPlayerCount,
          markets:
            actualMarketPicks.map(
              (pick) => [
                pick.key,
                pick.probability,
                pick.expectedValue,
                pick.stageGradeLabel ??
                  pick.valueGrade,
              ]
            ),
        })
      : "";

  useEffect(() => {
    if (
      currentSport !== "야구" ||
      !baseballSnapshotKey ||
      !analysisFactors.hasRealData ||
      !actualMarketPicks.length
    ) {
      return;
    }

    const snapshot:
      BaseballAnalysisSnapshot = {
      fixtureKey:
        baseballSnapshotKey,
      stage:
        analysisFactors.baseballAnalysisStage,
      stageLabel:
        analysisFactors.baseballAnalysisStageLabel,
      capturedAt:
        Date.now(),
      completeness:
        analysisFactors.baseballDataCompleteness,
      expectedHomeScore:
        analysisFactors.expectedHomeScore,
      expectedAwayScore:
        analysisFactors.expectedAwayScore,
      starterCount:
        analysisFactors.baseballStarterCount,
      lineupPlayerCount:
        analysisFactors.baseballLineupPlayerCount,
      pitcherDataUsed:
        analysisFactors.pitcherDataUsed,
      markets:
        actualMarketPicks.map(
          (pick) => ({
            key:
              pick.key,
            market:
              pick.market,
            pick:
              pick.pick,
            probability:
              pick.probability,
            marketProbability:
              pick.marketProbability,
            edge:
              pick.edge,
            expectedValue:
              pick.expectedValue,
            odds:
              pick.odds,
            grade:
              pick.valueGrade,
            displayGrade:
              pick.stageGradeLabel ??
              pick.valueGrade,
          })
        ),
    };

    setBaseballSnapshots(
      (previous) => {
        const existing =
          previous[
            baseballSnapshotKey
          ] ?? [];

        const sameStage =
          existing.find(
            (item) =>
              item.stage ===
              snapshot.stage
          );

        const sameContent =
          sameStage &&
          JSON.stringify({
            home:
              sameStage.expectedHomeScore,
            away:
              sameStage.expectedAwayScore,
            completeness:
              sameStage.completeness,
            starter:
              sameStage.starterCount,
            lineup:
              sameStage.lineupPlayerCount,
            markets:
              sameStage.markets.map(
                (item) => [
                  item.key,
                  item.probability,
                  item.expectedValue,
                  item.displayGrade,
                ]
              ),
          }) ===
            JSON.stringify({
              home:
                snapshot.expectedHomeScore,
              away:
                snapshot.expectedAwayScore,
              completeness:
                snapshot.completeness,
              starter:
                snapshot.starterCount,
              lineup:
                snapshot.lineupPlayerCount,
              markets:
                snapshot.markets.map(
                  (item) => [
                    item.key,
                    item.probability,
                    item.expectedValue,
                    item.displayGrade,
                  ]
                ),
            });

        if (sameContent) {
          return previous;
        }

        const next =
          existing
            .filter(
              (item) =>
                item.stage !==
                snapshot.stage
            )
            .concat(
              snapshot
            )
            .sort(
              (a, b) =>
                stageRank(
                  a.stage
                ) -
                stageRank(
                  b.stage
                )
            );

        return {
          ...previous,
          [baseballSnapshotKey]:
            next,
        };
      }
    );
  }, [snapshotSignature]);

  const pregameAudit:
    PregameStructureAudit | null =
      backtestMode
        ? matched?.pregameAudit ??
          null
        : null;

  const pregameCandidateSummary =
    pregameAudit?.candidates ??
    [];

  const officialLineupsDebug =
    matched?.detailDebug?.selected?.lineups ??
    matched?.debug?.lineups ??
    null;

  const sportsApiRuntimeDebug =
    matched?.detailDebug?.selected?.sportsApiRuntime ??
    matched?.debug?.sportsApiRuntime ??
    null;

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

  const valueGradeRank = (
    grade: MarketPick["valueGrade"]
  ) =>
    grade === "STRONG VALUE"
      ? 4
      : grade === "VALUE"
        ? 3
        : grade === "WATCH"
          ? 2
          : 1;

  const bestActualPick = eligibleMarketPicks.length
    ? [...eligibleMarketPicks].sort(
        (a, b) =>
          valueGradeRank(b.valueGrade) -
            valueGradeRank(a.valueGrade) ||
          b.valueGradeScore -
            a.valueGradeScore ||
          b.recommendationScore -
            a.recommendationScore
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

  function isKboBacktestGame(game: BetmanMatch) {
    const league = String((game as any)?.league ?? (game as any)?.leagueName ?? "").toLowerCase();
    const teams = `${String(game?.home ?? "")} ${String(game?.away ?? "")}`.toLowerCase();
    const kboTeams = [
      "nc", "삼성", "두산", "lg", "kt", "ssg", "롯데", "한화", "키움", "kia",
      "dinos", "lions", "bears", "twins", "wiz", "landers", "giants", "eagles", "heroes", "tigers",
    ];
    return koreanSport(String((game as any)?.sport ?? "")) === "야구" &&
      (league.includes("kbo") || kboTeams.some((name) => teams.includes(name)));
  }

  function lockBacktestPredictionSnapshot(
    snapshot: BacktestPredictionSnapshot
  ) {
    // PRE snapshot은 최종점수/결과를 절대 포함하지 않는다.
    // VERIFY 호출 직전에 먼저 localStorage에 잠금 저장한다.
    try {
      const raw = window.localStorage.getItem(
        BACKTEST_PRE_SNAPSHOT_STORAGE_KEY
      );
      const previous = raw
        ? JSON.parse(raw)
        : [];
      const rows = Array.isArray(previous)
        ? previous
        : [];
      const byId = new Map<string, any>();
      for (const row of rows) {
        if (row?.snapshotId) {
          byId.set(
            String(row.snapshotId),
            row
          );
        }
      }
      byId.set(
        snapshot.snapshotId,
        snapshot
      );
      window.localStorage.setItem(
        BACKTEST_PRE_SNAPSHOT_STORAGE_KEY,
        JSON.stringify(
          Array.from(
            byId.values()
          )
        )
      );
    } catch {}

    return snapshot;
  }

  async function fetchWithBackoff(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    label: string,
    retries = 3
  ) {
    let lastResponse: Response | null = null;
    let lastPayload: any = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetch(input, init);
      const payload = await readApiResponse(
        response,
        label
      );

      lastResponse = response;
      lastPayload = payload;

      const errorText =
        String(
          payload?.error ??
          payload?.message ??
          ""
        ).toLowerCase();

      const dailyQuotaExceeded =
        errorText.includes("daily quota");

      const rateLimited =
        response.status === 429 ||
        errorText.includes("rate limit") ||
        errorText.includes("too many requests") ||
        dailyQuotaExceeded;

      if (!rateLimited) {
        return {
          response,
          payload,
          attempts: attempt + 1,
        };
      }

      // 일일 quota 소진은 몇 초 기다려도 복구되지 않으므로
      // 같은 요청을 반복해서 quota/시간을 더 쓰지 않는다.
      if (
        dailyQuotaExceeded ||
        attempt >= retries
      ) {
        break;
      }

      const retryAfterHeader =
        Number(
          response.headers.get(
            "retry-after"
          )
        );

      const waitMs =
        Number.isFinite(
          retryAfterHeader
        ) &&
        retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : Math.min(
              16_000,
              2_000 *
                2 ** attempt
            );

      setStatus(
        `${label} · rate limit · ${Math.round(
          waitMs / 1000
        )}초 후 재시도 ${attempt + 2}/${retries + 1}`
      );

      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            waitMs
          )
      );
    }

    return {
      response: lastResponse!,
      payload: lastPayload,
      attempts: retries + 1,
    };
  }

  async function createBacktestPredictionSnapshot(
    game: BetmanMatch
  ): Promise<{
    fixtureId: number;
    combined: any;
    snapshot: BacktestPredictionSnapshot;
  }> {
    const selectedStartMs = gameTimeMs(game);
    const cutoffMs =
      Number.isFinite(selectedStartMs)
        ? selectedStartMs - 60_000
        : null;

    if (cutoffMs === null) {
      throw new Error(
        "PRE · 백테스트 경기 시작시간을 확인하지 못했습니다."
      );
    }

    const matchHome =
      sportsApiTeamName(game?.home);
    const matchAway =
      sportsApiTeamName(game?.away);

    const params = new URLSearchParams({
      mode: "selected",
      home: matchHome,
      away: matchAway,
      originalHome:
        String(game?.home ?? ""),
      originalAway:
        String(game?.away ?? ""),
      gameDateMs:
        String(selectedStartMs),
      sport:
        String(
          (game as any)?.sport ??
          ""
        ),
      league:
        String(
          (game as any)?.league ??
          ""
        ),
      backtest: "1",
    });

    // PRE-1. Fixture 매칭. 여기서는 결과 API를 호출하지 않는다.
    const matchAttempt =
      await fetchWithBackoff(
        `/api/match?${params.toString()}`,
        { cache: "no-store" },
        "PRE Fixture 매칭 API",
        3
      );
    const matchResponse =
      matchAttempt.response;
    const matchData =
      matchAttempt.payload;

    if (
      !matchResponse.ok ||
      !matchData?.ok
    ) {
      const matchDebug =
        matchData?.debug
          ? ` · debug=${JSON.stringify(matchData.debug)}`
          : "";

      throw new Error(
        `PRE_MATCH · ${readableError(
          matchData?.error,
          "SportsAPI 동일경기 자동매칭 실패"
        )}${matchDebug}`
      );
    }

    const fixtureId =
      Number(
        matchData?.fixtureId
      );

    if (
      !Number.isFinite(
        fixtureId
      )
    ) {
      throw new Error(
        "PRE_MATCH · SportsAPI Fixture ID를 받지 못했습니다."
      );
    }

    // PRE-2. 경기 시작 직전 cutoff 이전 H2H/Form만 조회한다.
    const detailParams =
      new URLSearchParams({
        cutoffMs:
          String(cutoffMs),
      });

    const detailAttempt =
      await fetchWithBackoff(
        `/api/match/${fixtureId}?${detailParams.toString()}`,
        { cache: "no-store" },
        "PRE Fixture 상세 API",
        3
      );

    const detailResponse =
      detailAttempt.response;
    const detailData =
      detailAttempt.payload;

    if (
      !detailResponse.ok ||
      !detailData?.ok
    ) {
      throw new Error(
        `PRE_DETAIL · ${readableError(
          detailData?.error,
          `Fixture #${fixtureId} 상세 분석 데이터 수신 실패`
        )}`
      );
    }

    const pregameAudit =
      safePregameStructureDiagnostic({
        ...detailData,
        fixture:
          detailData?.fixture ??
          matchData?.fixture ??
          null,
        lineups:
          detailData?.lineups ??
          matchData?.lineups ??
          null,
        selectedFixture:
          detailData
            ?.selectedFixture ??
          matchData
            ?.selectedFixture ??
          null,
      });

    const combinedRaw = {
      ...matchData,
      pregameAudit,
      fixture:
        detailData?.fixture ??
        matchData?.fixture,
      detail:
        detailData?.fixture ??
        matchData?.detail,
      selectedFixture:
        detailData
          ?.selectedFixture ??
        matchData
          ?.selectedFixture,
      h2h:
        detailData?.h2h ??
        matchData?.h2h ??
        null,
      recentSummary:
        detailData
          ?.recentSummary ??
        matchData
          ?.recentSummary ??
        null,
      statistics: null,
      lineups:
        detailData?.lineups ??
        matchData?.lineups ??
        null,
      detailDebug: null,
    };

    // PRE-3. 혹시 상세 payload에 경기후 정보가 섞여도 예측 전에 제거.
    const combined =
      sanitizeMatchedForBacktest(
        combinedRaw,
        cutoffMs,
        game
      );

    const selectedFixture =
      combined?.selectedFixture ??
      null;

    const currentSport =
      selectedFixture
        ? koreanSport(
            selectedFixture?.sport
          )
        : koreanSport(
            String(
              (game as any)?.sport ??
              ""
            )
          );

    const recent =
      combined?.recentSummary ??
      null;

    const directH2h =
      combined?.h2h ??
      null;

    const analysisDirect =
      buildAnalysis(
        currentSport,
        directH2h,
        recent,
        game,
        combined
      );

    const modelPicksRaw =
      buildActualMarketPicks(
        game,
        currentSport,
        analysisDirect.factors,
        recent,
        directH2h
      );

    const zeroPickFallback =
      modelPicksRaw.length === 0
        ? buildZeroPickMarketFallback(
            game
          )
        : [];

    const picksRaw =
      modelPicksRaw.length > 0
        ? modelPicksRaw
        : zeroPickFallback;

    /*
     * 정상 모델 픽은 기존 gate를 그대로 적용.
     * ZERO-PICK fallback은 이미 PASS/낮은 confidence/edge 0으로
     * 별도 차단되어 있으므로 모델 gate를 재해석하지 않는다.
     */
    const picks =
      modelPicksRaw.length > 0
        ? applyLineupStatsCoverageGate(
            picksRaw,
            currentSport,
            analysisDirect.factors
          )
        : picksRaw;

    if (!picks.length) {
      const marketRowsDebug =
        marketRows(game);

      const factorDebug = {
        hasRealData:
          Boolean(
            analysisDirect.factors
              ?.hasRealData
          ),
        formUsed:
          Boolean(
            analysisDirect.factors
              ?.formUsed
          ),
        h2hUsed:
          Boolean(
            analysisDirect.factors
              ?.h2hUsed
          ),
        scoringUsed:
          Boolean(
            analysisDirect.factors
              ?.scoringUsed
          ),
        expectedHomeScore:
          analysisDirect.factors
            ?.expectedHomeScore ??
          null,
        expectedAwayScore:
          analysisDirect.factors
            ?.expectedAwayScore ??
          null,
        expectedTotal:
          analysisDirect.factors
            ?.expectedTotal ??
          null,
        expectedMargin:
          analysisDirect.factors
            ?.expectedMargin ??
          null,
        homeRecentSample:
          analysisDirect.factors
            ?.homeRecentSample ??
          0,
        awayRecentSample:
          analysisDirect.factors
            ?.awayRecentSample ??
          0,
      };

      const perMarket =
        Array.isArray(
          game?.markets
        )
          ? game.markets
              .map(
                (
                  market: any,
                  index: number
                ) => {
                  const selections =
                    Array.isArray(
                      market?.selections
                    )
                      ? market.selections
                      : [];

                  const type =
                    String(
                      market?.type ??
                      ""
                    ).toLowerCase();

                  const betName =
                    String(
                      market?.betName ??
                      market?.displayName ??
                      market?.betTypeName ??
                      ""
                    );

                  const line =
                    marketNumber(
                      market
                    );

                  return {
                    index,
                    key:
                      marketStableKey(
                        market,
                        index
                      ),
                    type,
                    betName,
                    line,
                    usableOdds:
                      selections.filter(
                        (selection: any) =>
                          Number(
                            selection
                              ?.odds
                          ) > 1
                      ).length,
                    selections:
                      selections
                        .map(
                          (
                            selection: any
                          ) => ({
                            label:
                              selectionLabel(
                                selection
                              ),
                            side:
                              String(
                                selection
                                  ?.side ??
                                ""
                              ),
                            identity:
                              selectionIdentity(
                                selection
                              ),
                            odds:
                              Number.isFinite(
                                Number(
                                  selection
                                    ?.odds
                                )
                              )
                                ? Number(
                                    selection
                                      .odds
                                  )
                                : null,
                          })
                        )
                        .slice(
                          0,
                          5
                        ),
                  };
                }
              )
              .slice(
                0,
                20
              )
          : [];

      const marketDebug = {
        fixtureId,
        sport:
          currentSport,
        marketCount:
          Array.isArray(
            marketRowsDebug
          )
            ? marketRowsDebug.length
            : 0,
        hasRecent:
          Boolean(recent),
        recentKeys:
          recent &&
          typeof recent === "object"
            ? Object.keys(
                recent
              ).slice(
                0,
                30
              )
            : [],
        homeRecentKeys:
          recent?.home &&
          typeof recent.home ===
            "object"
            ? Object.keys(
                recent.home
              ).slice(
                0,
                30
              )
            : [],
        awayRecentKeys:
          recent?.away &&
          typeof recent.away ===
            "object"
            ? Object.keys(
                recent.away
              ).slice(
                0,
                30
              )
            : [],
        hasH2h:
          Boolean(directH2h),
        analysisStage:
          analysisDirect.factors
            ?.baseballAnalysisStage ??
          "PRE",
        factors:
          factorDebug,
        recentPipeline: {
          home:
            recent?.home?.status ??
            recent?.homeStatus ??
            recent?.status?.home ??
            null,
          away:
            recent?.away?.status ??
            recent?.awayStatus ??
            recent?.status?.away ??
            null,
          homeSafeForm:
            Boolean(
              (recent?.home as any)
                ?.backtestSafeForm
            ),
          homeFallbackUsed:
            Boolean(
              (recent?.home as any)
                ?.fallbackUsed
            ),
          awaySafeForm:
            Boolean(
              (recent?.away as any)
                ?.backtestSafeForm
            ),
          awayFallbackUsed:
            Boolean(
              (recent?.away as any)
                ?.fallbackUsed
            ),
          homeFormPlayed:
            Number(
              recent?.home?.form?.played ??
              0
            ),
          awayFormPlayed:
            Number(
              recent?.away?.form?.played ??
              0
            ),
          homeFixtureCount:
            Array.isArray(
              recent?.home?.fixtures
            )
              ? recent.home.fixtures.length
              : 0,
          awayFixtureCount:
            Array.isArray(
              recent?.away?.fixtures
            )
              ? recent.away.fixtures.length
              : 0,
          raw:
            recent?.status ??
            null,
        },
        markets:
          perMarket,
        home:
          String(
            game?.home ?? ""
          ),
        away:
          String(
            game?.away ?? ""
          ),
      };

      throw new Error(
        `PRE_PREDICT · Fixture #${fixtureId} 분석은 완료됐지만 시장 픽이 생성되지 않았습니다. · debug=${JSON.stringify(
          marketDebug
        )}`
      );
    }

    const stage: "PRE" | "STARTER" | "LINEUP" | "READY" =
      (
        analysisDirect.factors
          ?.baseballAnalysisStage ??
        "PRE"
      ) as "PRE" | "STARTER" | "LINEUP" | "READY";

    const markets =
      marketRows(game);

    const snapshotId =
      `${fixtureId}|${stage}|${selectedStartMs}`;

    const snapshot:
      BacktestPredictionSnapshot = {
        snapshotId,
        fixtureId,
        gameKey:
          actualGameIdentity(game),
        gameLabel:
          `${game?.home ?? "-"} vs ${game?.away ?? "-"}`,
        home:
          String(
            game?.home ?? ""
          ),
        away:
          String(
            game?.away ?? ""
          ),
        sport:
          String(
            (game as any)?.sport ??
            ""
          ),
        league:
          String(
            (game as any)?.league ??
            ""
          ),
        gameDateMs:
          selectedStartMs,
        cutoffMs,
        stage:
          stage as BacktestPredictionSnapshot["stage"],
        markets:
          markets.map(
            (market: any) => ({
              ...market,
            })
          ),
        picks:
          picks.map(
            (pick) => ({
              key:
                String(
                  pick.key
                ),
              market:
                String(
                  pick.market
                ),
              pick:
                String(
                  pick.pick
                ),
              probability:
                clamp(
                  Number(
                    pick.probability
                  ),
                  0,
                  100
                ),
              odds:
                pick.odds ??
                null,
              expectedValue:
                pick.expectedValue ??
                null,
              grade:
                pick.stageGradeLabel ??
                pick.valueGrade ??
                "-",
            })
          ),
        lockedAt:
          Date.now(),
        locked: true,
        audit: {
          predictionUsesFinalResult:
            false,
          resultEndpointCalledBeforeLock:
            false,
        },
      };

    // PRE-4. 결과 API 호출 전에 반드시 예측 스냅샷부터 잠금 저장.
    lockBacktestPredictionSnapshot(
      snapshot
    );

    return {
      fixtureId,
      combined,
      snapshot,
    };
  }

  async function verifyLockedBacktestSnapshot(
    snapshot: BacktestPredictionSnapshot
  ): Promise<{
    truth: BacktestValidationResult;
    records: SimpleBacktestRecord[];
  }> {
    if (
      !snapshot?.locked ||
      !snapshot?.lockedAt ||
      snapshot.audit
        ?.predictionUsesFinalResult !==
        false ||
      snapshot.audit
        ?.resultEndpointCalledBeforeLock !==
        false
    ) {
      throw new Error(
        "VERIFY_GUARD · PRE 예측 스냅샷이 잠금되지 않아 결과 조회를 차단했습니다."
      );
    }

    // VERIFY-1. PRE snapshot이 잠긴 뒤에만 최종 결과를 호출한다.
    const resultAttempt =
      await fetchWithBackoff(
        `/api/fixture/result?id=${encodeURIComponent(
          String(
            snapshot.fixtureId
          )
        )}`,
        { cache: "no-store" },
        "VERIFY 결과 검증 API",
        3
      );

    const resultResponse =
      resultAttempt.response;
    const resultPayload =
      resultAttempt.payload;

    if (
      !resultResponse.ok ||
      !resultPayload?.ok ||
      !resultPayload?.result
    ) {
      const debugText =
        resultPayload?.debug
          ? ` · debug=${JSON.stringify(
              resultPayload.debug
            )}`
          : "";

      throw new Error(
        `VERIFY_RESULT · ${readableError(
          resultPayload?.error,
          `Fixture #${snapshot.fixtureId} 실제 결과를 확인하지 못했습니다.`
        )}${debugText}`
      );
    }

    const truth:
      BacktestValidationResult = {
        homeScore:
          Number(
            resultPayload
              .result
              .homeScore
          ),
        awayScore:
          Number(
            resultPayload
              .result
              .awayScore
          ),
        firstHalfHomeScore:
          Number.isFinite(
            Number(
              resultPayload
                .result
                .firstHalfHomeScore
            )
          )
            ? Number(
                resultPayload
                  .result
                  .firstHalfHomeScore
              )
            : null,
        firstHalfAwayScore:
          Number.isFinite(
            Number(
              resultPayload
                .result
                .firstHalfAwayScore
            )
          )
            ? Number(
                resultPayload
                  .result
                  .firstHalfAwayScore
              )
            : null,
        sourceLabel:
          `SportsAPI Fixture #${snapshot.fixtureId} · PRE 잠금 후 VERIFY 전용`,
      };

    const records:
      SimpleBacktestRecord[] =
      [];

    // VERIFY-2. 정답은 잠금된 picks와 비교만 한다.
    // 새로운 예측 계산/buildAnalysis/buildActualMarketPicks는 호출하지 않는다.
    for (
      const pick of snapshot.picks
    ) {
      const marketIndex =
        snapshot.markets.findIndex(
          (
            market: any,
            index: number
          ) =>
            marketStableKey(
              market,
              index
            ) === pick.key
        );

      const market =
        marketIndex >= 0
          ? snapshot.markets[
              marketIndex
            ]
          : null;

      const validation =
        validateBacktestMarket(
          market,
          pick as any,
          truth
        );

      if (
        validation.status !==
          "HIT" &&
        validation.status !==
          "MISS"
      ) {
        continue;
      }

      const hit =
        validation.status ===
        "HIT";

      const probability =
        clamp(
          Number(
            pick.probability
          ),
          0,
          100
        );

      const p =
        probability /
        100;

      const odds =
        pick.odds ??
        null;

      const realizedReturn =
        odds !== null &&
        Number.isFinite(
          odds
        ) &&
        odds > 1
          ? hit
            ? odds - 1
            : -1
          : null;

      records.push({
        id:
          `${snapshot.fixtureId}|${snapshot.stage}|${pick.key}`,
        fixtureKey:
          String(
            snapshot.fixtureId
          ),
        gameLabel:
          snapshot.gameLabel,
        stage:
          snapshot.stage as SimpleBacktestRecord["stage"],
        market:
          pick.market,
        pick:
          pick.pick,
        probability,
        odds,
        expectedValue:
          pick.expectedValue,
        grade:
          pick.grade,
        hit,
        realizedReturn,
        brier:
          Number(
            (
              (
                p -
                (
                  hit
                    ? 1
                    : 0
                )
              ) ** 2
            ).toFixed(6)
          ),
        savedAt:
          Date.now(),
      });
    }

    if (!records.length) {
      throw new Error(
        `VERIFY_SCORE · Fixture #${snapshot.fixtureId} 결과는 확인했지만 검증 가능한 시장 레코드가 생성되지 않았습니다.`
      );
    }

    return {
      truth,
      records,
    };
  }

  async function analyzeBacktestGameDirect(
    game: BetmanMatch
  ): Promise<{
    fixtureId: number;
    combined: any;
    snapshot: BacktestPredictionSnapshot;
    records: SimpleBacktestRecord[];
  }> {
    // 완전 분리:
    // PRE 예측 + snapshot LOCK 완료 후에만 VERIFY를 호출한다.
    const pre =
      await createBacktestPredictionSnapshot(
        game
      );

    const verified =
      await verifyLockedBacktestSnapshot(
        pre.snapshot
      );

    // 온라인 API를 사용한 경기의 PRE 입력 + VERIFY 결과를
    // IndexedDB에 영구 저장한다.
    // 이후 모델 수정 테스트는 이 데이터만 재생하므로 SportsAPI 호출이 0회다.
    try {
      await putBacktestDatasetEntry({
        id:
          actualGameIdentity(
            game
          ),
        schemaVersion: 1,
        game:
          cloneBacktestDatasetValue(
            game
          ),
        fixtureId:
          pre.fixtureId,
        cutoffMs:
          pre.snapshot.cutoffMs,
        combined:
          cloneBacktestDatasetValue(
            pre.combined
          ),
        truth:
          cloneBacktestDatasetValue(
            verified.truth
          ),
        capturedAt:
          Date.now(),
      });

      void refreshOfflineDatasetCount();
    } catch {
      // 데이터셋 저장 실패가 온라인 검증 결과 자체를 실패시키지는 않는다.
    }

    return {
      fixtureId:
        pre.fixtureId,
      combined:
        pre.combined,
      snapshot:
        pre.snapshot,
      records:
        verified.records,
    };
  }
  function scoreLockedSnapshotOffline(
    snapshot: BacktestPredictionSnapshot,
    truth: BacktestValidationResult
  ): SimpleBacktestRecord[] {
    const records:
      SimpleBacktestRecord[] =
      [];

    for (
      const pick of snapshot.picks
    ) {
      const marketIndex =
        snapshot.markets.findIndex(
          (
            market: any,
            index: number
          ) =>
            marketStableKey(
              market,
              index
            ) ===
            pick.key
        );

      const market =
        marketIndex >= 0
          ? snapshot.markets[
              marketIndex
            ]
          : null;

      const validation =
        validateBacktestMarket(
          market,
          pick as any,
          truth
        );

      if (
        validation.status !== "HIT" &&
        validation.status !== "MISS"
      ) {
        continue;
      }

      const hit =
        validation.status ===
        "HIT";

      const probability =
        clamp(
          Number(
            pick.probability
          ),
          0,
          100
        );

      const p =
        probability /
        100;

      const odds =
        pick.odds ??
        null;

      const realizedReturn =
        odds !== null &&
        Number.isFinite(
          odds
        ) &&
        odds > 1
          ? hit
            ? odds - 1
            : -1
          : null;

      records.push({
        id:
          `${snapshot.fixtureId}|${snapshot.stage}|${pick.key}`,
        fixtureKey:
          String(
            snapshot.fixtureId
          ),
        gameLabel:
          snapshot.gameLabel,
        stage:
          snapshot.stage,
        market:
          pick.market,
        pick:
          pick.pick,
        probability,
        odds,
        expectedValue:
          pick.expectedValue,
        grade:
          pick.grade,
        hit,
        realizedReturn,
        brier:
          Number(
            (
              (
                p -
                (
                  hit
                    ? 1
                    : 0
                )
              ) ** 2
            ).toFixed(
              6
            )
          ),
        savedAt:
          Date.now(),
      });
    }

    if (!records.length) {
      throw new Error(
        `OFFLINE_VERIFY · Fixture #${snapshot.fixtureId} 검증 가능한 시장 레코드가 없습니다.`
      );
    }

    return records;
  }

  function createOfflinePredictionSnapshot(
    entry: BacktestDatasetEntry
  ) {
    const game =
      cloneBacktestDatasetValue(
        entry.game
      );

    const combined =
      sanitizeMatchedForBacktest(
        cloneBacktestDatasetValue(
          entry.combined
        ),
        entry.cutoffMs,
        game
      );

    const selectedFixture =
      combined?.selectedFixture ??
      null;

    const currentSport =
      selectedFixture
        ? koreanSport(
            selectedFixture?.sport
          )
        : koreanSport(
            String(
              (game as any)?.sport ??
              ""
            )
          );

    const recent =
      combined?.recentSummary ??
      null;

    const directH2h =
      combined?.h2h ??
      null;

    const analysisDirect =
      buildAnalysis(
        currentSport,
        directH2h,
        recent,
        game,
        combined
      );

    const modelPicksRaw =
      buildActualMarketPicks(
        game,
        currentSport,
        analysisDirect.factors,
        recent,
        directH2h
      );

    const fallback =
      modelPicksRaw.length === 0
        ? buildZeroPickMarketFallback(
            game
          )
        : [];

    const picksRaw =
      modelPicksRaw.length > 0
        ? modelPicksRaw
        : fallback;

    const picks =
      modelPicksRaw.length > 0
        ? applyLineupStatsCoverageGate(
            picksRaw,
            currentSport,
            analysisDirect.factors
          )
        : picksRaw;

    if (!picks.length) {
      throw new Error(
        `OFFLINE_PREDICT · Fixture #${entry.fixtureId} 현재 모델에서 픽이 생성되지 않았습니다.`
      );
    }

    const stage =
      (
        analysisDirect.factors
          ?.baseballAnalysisStage ??
        "PRE"
      ) as BacktestPredictionSnapshot["stage"];

    const snapshot:
      BacktestPredictionSnapshot = {
        snapshotId:
          `offline|${entry.fixtureId}|${stage}|${entry.cutoffMs}|${Date.now()}`,
        fixtureId:
          entry.fixtureId,
        gameKey:
          actualGameIdentity(
            game
          ),
        gameLabel:
          `${game?.home ?? "-"} vs ${game?.away ?? "-"}`,
        home:
          String(
            game?.home ??
            ""
          ),
        away:
          String(
            game?.away ??
            ""
          ),
        sport:
          String(
            (game as any)?.sport ??
            ""
          ),
        league:
          String(
            (game as any)?.league ??
            ""
          ),
        gameDateMs:
          gameTimeMs(
            game
          ),
        cutoffMs:
          entry.cutoffMs,
        stage,
        markets:
          marketRows(
            game
          ).map(
            (market: any) => ({
              ...market,
            })
          ),
        picks:
          picks.map(
            (pick) => ({
              key:
                String(
                  pick.key
                ),
              market:
                String(
                  pick.market
                ),
              pick:
                String(
                  pick.pick
                ),
              probability:
                clamp(
                  Number(
                    pick.probability
                  ),
                  0,
                  100
                ),
              odds:
                pick.odds ??
                null,
              expectedValue:
                pick.expectedValue ??
                null,
              grade:
                pick.stageGradeLabel ??
                pick.valueGrade ??
                "-",
            })
          ),
        lockedAt:
          Date.now(),
        locked:
          true,
        audit: {
          predictionUsesFinalResult:
            false,
          resultEndpointCalledBeforeLock:
            false,
        },
      };

    lockBacktestPredictionSnapshot(
      snapshot
    );

    return {
      game,
      combined,
      snapshot,
    };
  }

  async function recoverLegacyBacktestDataset() {
    if (
      batchBacktest.running ||
      loading ||
      validationLoading
    ) {
      return;
    }

    setStatus(
      "♻ 기존 백테스트 데이터 복구 가능 항목 확인 중…"
    );

    try {
      const snapshots =
        legacySnapshotList();

      const games =
        legacyGameLibraryList();

      const truths =
        legacyTruthCandidates();

      let recovered =
        0;

      let skipped =
        0;

      for (
        const snapshot
        of snapshots
      ) {
        const game =
          findLegacyGameForSnapshot(
            snapshot,
            games
          );

        if (!game) {
          skipped +=
            1;
          continue;
        }

        const truth =
          findLegacyTruthForSnapshot(
            snapshot,
            game,
            truths
          );

        if (!truth) {
          skipped +=
            1;
          continue;
        }

        /*
         * 중요:
         * 예전 snapshot만으로는 PRE 입력 combined 전체를 복원할 수 없는 경우가 있다.
         * snapshot 안에 combined/preData/matched가 포함된 경우에만 오프라인 재분석 데이터로 승격한다.
         */
        const combined =
          snapshot?.combined ??
          snapshot?.preCombined ??
          snapshot?.matched ??
          snapshot?.preData ??
          null;

        if (!combined) {
          skipped +=
            1;
          continue;
        }

        const entry:
          BacktestDatasetEntry = {
            id:
              actualGameIdentity(
                game
              ),
            schemaVersion: 1,
            game:
              cloneBacktestDatasetValue(
                game
              ),
            fixtureId:
              Number(
                snapshot?.fixtureId
              ),
            cutoffMs:
              Number(
                snapshot?.cutoffMs ??
                snapshot?.gameDateMs ??
                validationGameTimeMs(
                  game
                )
              ),
            combined:
              cloneBacktestDatasetValue(
                combined
              ),
            truth:
              cloneBacktestDatasetValue(
                truth
              ),
            capturedAt:
              Number(
                snapshot?.lockedAt ??
                Date.now()
              ),
          };

        if (
          !Number.isFinite(
            entry.fixtureId
          ) ||
          !Number.isFinite(
            entry.cutoffMs
          )
        ) {
          skipped +=
            1;
          continue;
        }

        await putBacktestDatasetEntry(
          entry
        );

        recovered +=
          1;
      }

      await refreshOfflineDatasetCount();
      refreshLegacyRecoveryPreview();

      setStatus(
        recovered > 0
          ? `♻ 기존 데이터 복구 완료 · ${recovered}경기 저장 · ${skipped}건 건너뜀 · API 호출 0회`
          : `♻ 복구 가능한 완전한 PRE 데이터가 없습니다 · snapshot ${snapshots.length}건 확인 · ${skipped}건 불완전 · API 호출 0회`
      );
    } catch (error: any) {
      setStatus(
        `❌ 기존 데이터 복구 실패 · ${readableError(
          error,
          "복구 오류"
        )}`
      );
    }
  }

  async function startOfflineBatchBacktest() {
    if (
      batchBacktest.running ||
      loading ||
      validationLoading
    ) {
      setStatus(
        "오프라인 백테스트를 시작할 수 없습니다. 현재 다른 분석 작업이 진행 중입니다."
      );
      return;
    }

    /*
     * 오프라인 분석은 API 대기 시간이 없어서 30경기를 동기식으로 연속 계산하면
     * 브라우저가 중간 render를 하지 못해 '버튼이 아무 반응 없는 것처럼' 보일 수 있다.
     * 경기마다 event loop에 제어권을 반환해 진행상황을 실제 화면에 표시한다.
     */
    const yieldToUi =
      (delay = 20) =>
        new Promise<void>(
          (resolve) =>
            window.setTimeout(
              resolve,
              delay
            )
        );

    setStatus(
      `💾 오프라인 백테스트 준비 중 · 저장 데이터 ${offlineDatasetCount}경기 · SportsAPI 호출 0회`
    );

    // 첫 상태 변경이 반드시 화면에 그려질 시간을 준다.
    await yieldToUi(
      30
    );

    try {
      let entries:
        BacktestDatasetEntry[] =
        [];

      try {
        entries =
          (
            await getAllBacktestDatasetEntries()
          )
            .filter(
              (entry) =>
                entry?.game &&
                entry?.truth &&
                Number.isFinite(
                  entry?.fixtureId
                )
            )
            .sort(
              (a, b) =>
                gameTimeMs(
                  b.game
                ) -
                gameTimeMs(
                  a.game
                )
            )
            .slice(
              0,
              30
            );
      } catch (error: any) {
        setStatus(
          `❌ 오프라인 백데이터 읽기 실패 · ${readableError(
            error,
            "IndexedDB 오류"
          )}`
        );
        return;
      }

      if (!entries.length) {
        setStatus(
          "저장된 오프라인 백데이터가 없습니다. 먼저 📥 백데이터 수집을 실행하세요."
        );
        return;
      }

      setBacktestMode(
        true
      );
      setBacktestResultRevealed(
        false
      );
      setBatchBacktestDiagnostics(
        []
      );

      let completed = 0;
      let failed = 0;

      const batchRecords:
        SimpleBacktestRecord[] =
        [];

      setBatchBacktest({
        running: true,
        gameKeys:
          entries.map(
            (entry) =>
              entry.id
          ),
        index: 0,
        phase: "DIRECT",
        completed: 0,
        failed: 0,
        phaseStartedAt:
          Date.now(),
      });

      setStatus(
        `💾 오프라인 백테스트 0/${entries.length} 시작 · SportsAPI 호출 0회`
      );

      await yieldToUi(
        30
      );

      for (
        let index = 0;
        index <
        entries.length;
        index += 1
      ) {
        const entry =
          entries[index];

        setBatchBacktest(
          (previous) => ({
            ...previous,
            index,
            completed,
            failed,
            phaseStartedAt:
              Date.now(),
          })
        );

        setStatus(
          `💾 오프라인 ${index + 1}/${entries.length} · 성공 ${completed} · 실패 ${failed} · ${entry.game?.home ?? "-"} vs ${entry.game?.away ?? "-"} · SportsAPI 0회`
        );

        // 화면에 현재 경기 진행 상태를 먼저 표시한 뒤 계산한다.
        await yieldToUi(
          16
        );

        try {
          const offline =
            createOfflinePredictionSnapshot(
              entry
            );

          const records =
            scoreLockedSnapshotOffline(
              offline.snapshot,
              cloneBacktestDatasetValue(
                entry.truth
              )
            );

          batchRecords.push(
            ...records
          );

          const gameNo =
            String(
              (entry.game as any)?.gameNo ??
              marketRows(
                entry.game
              )?.[0]?.gameNo ??
              marketRows(
                entry.game
              )?.[0]?.matchSeq ??
              "-"
            );

          completed += 1;

          setBatchBacktestDiagnostics(
            (previous) => [
              ...previous,
              {
                index:
                  index + 1,
                gameNo,
                gameLabel:
                  `${entry.game?.home ?? "-"} vs ${entry.game?.away ?? "-"}`,
                status:
                  "SUCCESS",
                fixtureId:
                  entry.fixtureId,
                calibrationRows:
                  records.length,
                message:
                  `OFFLINE PRE 재계산 → LOCK → 저장 VERIFY 채점 · ${records.length}행 · SportsAPI 0회${offline.snapshot.picks.some((pick: any) => String(pick.grade).includes("FALLBACK")) ? " · MARKET FALLBACK 사용" : ""}`,
                savedAt:
                  Date.now(),
              },
            ]
          );
        } catch (error: any) {
          failed += 1;

          setBatchBacktestDiagnostics(
            (previous) => [
              ...previous,
              {
                index:
                  index + 1,
                gameNo:
                  String(
                    (entry.game as any)?.gameNo ??
                    marketRows(
                      entry.game
                    )?.[0]?.matchSeq ??
                    "-"
                  ),
                gameLabel:
                  `${entry.game?.home ?? "-"} vs ${entry.game?.away ?? "-"}`,
                status:
                  "FAIL",
                fixtureId:
                  entry.fixtureId,
                calibrationRows:
                  0,
                message:
                  `OFFLINE · ${readableError(
                    error,
                    "오프라인 재생 실패"
                  )}`,
                savedAt:
                  Date.now(),
              },
            ]
          );
        }

        setBatchBacktest(
          (previous) => ({
            ...previous,
            completed,
            failed,
          })
        );

        setStatus(
          `💾 오프라인 ${index + 1}/${entries.length} 완료 · 성공 ${completed} · 실패 ${failed} · Calibration ${batchRecords.length}행 · SportsAPI 0회`
        );

        // 다음 경기 전에 render/사용자 입력을 처리할 시간을 준다.
        await yieldToUi(
          16
        );
      }

      setSimpleBacktestRecords(
        (previous) => {
          const byId =
            new Map<
              string,
              SimpleBacktestRecord
            >();

          for (
            const row
            of previous
          ) {
            byId.set(
              row.id,
              row
            );
          }

          for (
            const row
            of batchRecords
          ) {
            byId.set(
              row.id,
              row
            );
          }

          const next =
            Array.from(
              byId.values()
            );

          try {
            window.localStorage.setItem(
              SIMPLE_BACKTEST_STORAGE_KEY,
              JSON.stringify(
                next
              )
            );
          } catch {}

          return next;
        }
      );

      setBatchBacktest({
        running: false,
        gameKeys:
          entries.map(
            (entry) =>
              entry.id
          ),
        index:
          Math.max(
            0,
            entries.length - 1
          ),
        phase:
          "IDLE",
        completed,
        failed,
        phaseStartedAt:
          Date.now(),
      });

      setStatus(
        `✅ 오프라인 ${entries.length}경기 완료 · 성공 ${completed} · 실패 ${failed} · Calibration ${batchRecords.length}행 · SportsAPI 호출 0회`
      );
    } catch (error: any) {
      setBatchBacktest(
        (previous) => ({
          ...previous,
          running: false,
          phase: "IDLE",
          phaseStartedAt:
            Date.now(),
        })
      );

      setStatus(
        `❌ 오프라인 백테스트 실행 오류 · ${readableError(
          error,
          "알 수 없는 오류"
        )}`
      );
    }
  }

  function isDailyQuotaExceededError(error: any) {
    const message =
      String(
        error?.message ??
        error ??
        ""
      ).toLowerCase();

    return (
      message.includes(
        "daily quota exceeded"
      ) ||
      message.includes(
        "daily quota"
      )
    );
  }

  async function startBatchBacktest() {
    if (
      batchBacktest.running ||
      loading ||
      validationLoading
    ) {
      return;
    }

    const targetGames =
      mergeActualGames(
        backtestGames
      )
        .filter(
          (game) =>
            Number.isFinite(
              gameTimeMs(game)
            ) &&
            gameTimeMs(game) <
              Date.now()
        )
        .filter(
          isKboBacktestGame
        )
        .sort(
          (a, b) =>
            gameTimeMs(b) -
            gameTimeMs(a)
        )
        .slice(
          0,
          30
        );

    let savedIds =
      new Set<string>();

    try {
      savedIds =
        new Set(
          (
            await getAllBacktestDatasetEntries()
          ).map(
            (entry) =>
              entry.id
          )
        );
    } catch {}

    const games =
      targetGames.filter(
        (game) =>
          !savedIds.has(
            actualGameIdentity(
              game
            )
          )
      );


    const initialCheckpoint = {
      target:
        targetGames.length,
      stored:
        targetGames.length -
        games.length,
      remaining:
        games.length,
      stoppedByQuota:
        false,
    };

    saveBacktestCollectionCheckpoint(
      initialCheckpoint
    );
    setCollectionCheckpoint(
      initialCheckpoint
    );

    if (!targetGames.length) {
      setStatus(
        "자동 백테스트 대상 KBO 과거경기가 없습니다. 먼저 과거 후보를 불러오세요."
      );
      return;
    }

    if (!games.length) {
      setStatus(
        `📦 최근 ${targetGames.length}경기 전부 영구 저장 완료 · SportsAPI 호출 0회 · ▶ 오프라인 30경기를 실행하세요.`
      );
      void refreshOfflineDatasetCount();
      return;
    }

    setBacktestMode(true);
    setBacktestResultRevealed(false);
    setBatchBacktestDiagnostics([]);

    let completed = 0;
    let failed = 0;
    let stoppedByDailyQuota = false;
    const batchRecords:
      SimpleBacktestRecord[] =
      [];

    setBatchBacktest({
      running: true,
      gameKeys:
        games.map(
          actualGameIdentity
        ),
      index: 0,
      phase: "DIRECT",
      completed: 0,
      failed: 0,
      phaseStartedAt:
        Date.now(),
    });

    setStatus(
      `📥 백데이터 이어받기 · 목표 ${targetGames.length}경기 · 기존 저장 ${targetGames.length - games.length}경기 · 신규 수집 ${games.length}경기`
    );

    for (
      let index = 0;
      index < games.length;
      index += 1
    ) {
      const game =
        games[index];

      // 화면에는 현재 처리 중인 경기만 보여주되,
      // 분석 계산 자체는 React 선택 state가 아니라 game 인자로 수행한다.
      setSelectedBetmanKey(
        gameKey(
          game,
          mergeActualGames(
            backtestGames
          ).indexOf(game)
        )
      );
      setBetman({
        loading: false,
        matched: game,
        score: 1,
        error: null,
      });
      setMatched(null);
      setBacktestResultRevealed(false);

      setBatchBacktest(
        (previous) => ({
          ...previous,
          index,
          phase: "DIRECT",
          completed,
          failed,
          phaseStartedAt:
            Date.now(),
        })
      );

      setStatus(
        `자동 백테스트 ${index + 1}/${games.length} · 성공 ${completed} · 실패 ${failed} · Calibration ${batchRecords.length}행 · ${game?.home ?? "-"} vs ${game?.away ?? "-"} · 순차 분석 중…`
      );

      try {
        const result =
          await analyzeBacktestGameDirect(
            game
          );


        // analyzeBacktestGameDirect가 VERIFY 완료 직후 IndexedDB에 저장한다.
        // 따라서 브라우저가 다음 경기에서 중단되어도 이 경기까지는 이어받기 가능하다.
        const checkpoint = {
          target:
            targetGames.length,
          stored:
            targetGames.length -
            games.length +
            completed +
            1,
          remaining:
            Math.max(
              0,
              games.length -
              index -
              1
            ),
          lastGameId:
            actualGameIdentity(
              game
            ),
          stoppedByQuota:
            false,
        };

        saveBacktestCollectionCheckpoint(
          checkpoint
        );
        setCollectionCheckpoint(
          checkpoint
        );

        // 이 경기의 전체 분석/결과검증이 끝난 뒤에만 UI와 누적자료를 갱신한다.
        setMatched(
          result.combined
        );
        batchRecords.push(
          ...result.records
        );

        const gameNo = String(
          (game as any)?.gameNo ??
          marketRows(game)?.[0]?.gameNo ??
          marketRows(game)?.[0]?.matchSeq ??
          "-"
        );

        setBatchBacktestDiagnostics((previous) => [
          ...previous,
          {
            index: index + 1,
            gameNo,
            gameLabel: `${game?.home ?? "-"} vs ${game?.away ?? "-"}`,
            status: "SUCCESS",
            fixtureId: result.fixtureId,
            calibrationRows: result.records.length,
            message: `PRE 잠금 완료 → VERIFY Fixture #${result.fixtureId} · 검증 레코드 ${result.records.length}행 생성${result.snapshot.picks.some((pick: any) => String(pick.grade).includes("FALLBACK")) ? " · MARKET FALLBACK 사용" : ""}`,
            savedAt: Date.now(),
          },
        ]);

        completed += 1;

        setBatchBacktest(
          (previous) => ({
            ...previous,
            completed,
            failed,
          })
        );

        setStatus(
          `자동 백테스트 ${index + 1}/${games.length} 완료 · 성공 ${completed} · 실패 ${failed} · 신규 Calibration ${batchRecords.length}행`
        );
      } catch (error: any) {
        const dailyQuotaExceeded =
          isDailyQuotaExceededError(
            error
          );

        failed += 1;

        const errorMessage =
          readableError(error, "분석/검증 실패");

        const gameNo = String(
          (game as any)?.gameNo ??
          marketRows(game)?.[0]?.gameNo ??
          marketRows(game)?.[0]?.matchSeq ??
          "-"
        );

        const fixtureMatch =
          String(errorMessage).match(/Fixture\s*#(\d+)/i);

        const fixtureId =
          fixtureMatch ? Number(fixtureMatch[1]) : null;

        const diagnosticMessage =
          dailyQuotaExceeded
            ? "API 일일 한도 소진 · 현재 백테스트 자동 중단 · quota 리셋 후 다시 실행하세요."
            : errorMessage;

        setBatchBacktestDiagnostics((previous) => [
          ...previous,
          {
            index: index + 1,
            gameNo,
            gameLabel: `${game?.home ?? "-"} vs ${game?.away ?? "-"}`,
            status: "FAIL",
            fixtureId:
              Number.isFinite(fixtureId)
                ? fixtureId
                : null,
            calibrationRows: 0,
            message: diagnosticMessage,
            savedAt: Date.now(),
          },
        ]);

        setBatchBacktest(
          (previous) => ({
            ...previous,
            completed,
            failed,
          })
        );

        if (dailyQuotaExceeded) {
          stoppedByDailyQuota = true;

          setBatchBacktest(
            (previous) => ({
              ...previous,
              running: false,
              phase: "IDLE",
              completed,
              failed,
              phaseStartedAt:
                Date.now(),
            })
          );

          const quotaCheckpoint = {
            target:
              targetGames.length,
            stored:
              targetGames.length -
              games.length +
              completed,
            remaining:
              Math.max(
                0,
                games.length -
                index
              ),
            lastGameId:
              actualGameIdentity(
                game
              ),
            stoppedByQuota:
              true,
          };

          saveBacktestCollectionCheckpoint(
            quotaCheckpoint
          );
          setCollectionCheckpoint(
            quotaCheckpoint
          );

          setStatus(
            `⛔ SportsAPI 일일 한도 소진 · 여기서 안전 중단 · 영구 저장 ${quotaCheckpoint.stored}/${quotaCheckpoint.target}경기 · 다음 실행 시 남은 ${quotaCheckpoint.remaining}경기부터 자동 이어받기`
          );

          break;
        }

        setStatus(
          `자동 백테스트 ${index + 1}/${games.length} 실패 · 성공 ${completed} · 실패 ${failed} · Calibration ${batchRecords.length}행 · ${errorMessage}`
        );
      }

      // SportsAPI 연속 호출 압력을 낮추기 위한 경기 간 간격.
      if (index < games.length - 1) {
        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              1500
            )
        );
      }
    }

    // 같은 ID는 마지막 값으로 덮어쓰고 한 번에 저장한다.
    setSimpleBacktestRecords(
      (previous) => {
        const byId =
          new Map<
            string,
            SimpleBacktestRecord
          >();

        for (const row of previous) {
          byId.set(
            row.id,
            row
          );
        }

        for (const row of batchRecords) {
          byId.set(
            row.id,
            row
          );
        }

        const next =
          Array.from(
            byId.values()
          );

        try {
          window.localStorage.setItem(
            SIMPLE_BACKTEST_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {}

        return next;
      }
    );

    setBatchBacktest(
      (previous) => ({
        ...previous,
        running: false,
        index:
          games.length,
        phase: "IDLE",
        completed,
        failed,
        phaseStartedAt:
          Date.now(),
      })
    );

    if (!stoppedByDailyQuota) {
      const finalCheckpoint = {
        target:
          targetGames.length,
        stored:
          targetGames.length -
          games.length +
          completed,
        remaining:
          Math.max(
            0,
            games.length -
            completed
          ),
        stoppedByQuota:
          false,
      };

      saveBacktestCollectionCheckpoint(
        finalCheckpoint
      );
      setCollectionCheckpoint(
        finalCheckpoint
      );

      setStatus(
        `📦 백데이터 수집 완료 · 영구 저장 ${finalCheckpoint.stored}/${finalCheckpoint.target}경기 · 이번 성공 ${completed} · 실패 ${failed} · 다음 실행 시 저장 경기는 API 호출 없이 건너뜀`
      );
    }
  }

  function advanceBatchBacktest(success: boolean) {
    setBatchBacktest((previous) => {
      if (!previous.running) return previous;
      const completed = previous.completed + (success ? 1 : 0);
      const failed = previous.failed + (success ? 0 : 1);
      const nextIndex = previous.index + 1;
      if (nextIndex >= previous.gameKeys.length) {
        return {
          ...previous,
          running: false,
          index: nextIndex,
          phase: "IDLE",
          completed,
          failed,
          phaseStartedAt: Date.now(),
        };
      }
      return {
        ...previous,
        index: nextIndex,
        phase: "SELECT",
        completed,
        failed,
        phaseStartedAt: Date.now(),
      };
    });
  }

  function chooseGame(game: BetmanMatch, index: number) {
    const selectedTime =
      gameTimeMs(game);

    const historical =
      Number.isFinite(selectedTime) &&
      selectedTime <
        Date.now() -
          3 * 60 * 60 * 1000;

    setBacktestMode(historical);
    setBacktestResultRevealed(false);
    setSelectedBetmanKey(gameKey(game,index));
    setMatched(null);
    setBetman({ loading:false, matched:game, score:1, error:null });
    setStatus(
      historical
        ? `${game?.home ?? "-"} vs ${game?.away ?? "-"} 선택 · 백테스트 모드 자동 활성화`
        : `${game?.home ?? "-"} vs ${game?.away ?? "-"} 선택 · 분석 버튼을 누르세요`
    );
  }

  async function analyzeSelected(): Promise<boolean> {
    if (loading || !selectedBetman) return false;

    const selectedStartMs =
      gameTimeMs(
        selectedBetman
      );

    const backtestCutoffMs =
      backtestMode &&
      Number.isFinite(
        selectedStartMs
      )
        ? selectedStartMs -
          60_000
        : null;

    setLoading(true);
    setMatched(null);
    setBetman({ loading:false, matched:selectedBetman, score:1, error:null });
    setStatus(`${selectedBetman?.home ?? "-"} vs ${selectedBetman?.away ?? "-"} · SportsAPI 매칭 중…`);
    try {
      const matchHome = sportsApiTeamName(selectedBetman?.home);
      const matchAway = sportsApiTeamName(selectedBetman?.away);

      const params = new URLSearchParams({
        mode:"selected",
        // SportsAPI 쪽에서는 영문/정식 팀명으로 검색해 과거 KBO fixture 매칭률을 높입니다.
        home: matchHome,
        away: matchAway,
        // 원본명도 함께 전달합니다. 서버가 아직 사용하지 않아도 무해하며 진단에 활용할 수 있습니다.
        originalHome:String(selectedBetman?.home ?? ""),
        originalAway:String(selectedBetman?.away ?? ""),
        gameDateMs:String(gameTimeMs(selectedBetman)),
        sport:String((selectedBetman as any)?.sport ?? ""),
        league:String((selectedBetman as any)?.league ?? ""),
        backtest:backtestMode ? "1" : "0",
      });
      const response = await fetch(`/api/match?${params.toString()}`, { cache:"no-store" });
      const data = await readApiResponse(response,"선택 경기 매칭 API");
      if (!response.ok || !data?.ok) throw new Error(readableError(data?.error,"SportsAPI 동일경기 자동매칭 실패"));
      const fixtureId = Number(data?.fixtureId);
      if (!Number.isFinite(fixtureId)) throw new Error("SportsAPI Fixture ID를 받지 못했습니다.");
      setMatched(data);
      setStatus(`Fixture #${fixtureId} 매칭 완료 · H2H/최근 Form 조회 중…`);
      const detailParams = new URLSearchParams();
      if (backtestCutoffMs !== null) {
        detailParams.set("cutoffMs", String(backtestCutoffMs));
      }
      const detailResponse = await fetch(
        `/api/match/${fixtureId}${detailParams.toString() ? `?${detailParams.toString()}` : ""}`,
        { cache:"no-store" }
      );
      const detailData = await readApiResponse(detailResponse,"Fixture 상세 API");
      if (detailResponse.ok && detailData?.ok) {
        const pregameAudit =
          backtestMode
            ? safePregameStructureDiagnostic({
                ...detailData,
                fixture:
                  detailData?.fixture ??
                  data?.fixture ??
                  null,
                lineups:
                  detailData?.lineups ??
                  data?.lineups ??
                  null,
                selectedFixture:
                  detailData?.selectedFixture ??
                  data?.selectedFixture ??
                  null,
              })
            : null;

        const combinedRaw = {
          ...data,
          pregameAudit,
          fixture: detailData?.fixture ?? data?.fixture,
          detail: detailData?.fixture ?? data?.detail,
          selectedFixture: detailData?.selectedFixture ?? data?.selectedFixture,
          h2h:
            detailData?.h2h ??
            data?.h2h ??
            null,
          recentSummary:
            detailData?.recentSummary ??
            data?.recentSummary ??
            null,
          statistics:
            detailData?.statistics ??
            data?.statistics ??
            null,
          lineups:
            detailData?.lineups ??
            data?.lineups ??
            null,
          detailDebug: {
            detail:
              detailData?.debug ??
              null,
            selected:
              data?.debug ??
              null,
          },
        };

        const combined =
          backtestCutoffMs !== null
            ? sanitizeMatchedForBacktest(
                combinedRaw,
                backtestCutoffMs,
                selectedBetman
              )
            : combinedRaw;

        setMatched(combined);

        setStatus(
          backtestCutoffMs !== null
            ? `백테스트 분석 완료 · 기준 ${formatBacktestCutoff(backtestCutoffMs)} · 미래정보 차단`
            : `분석 완료 · ${combined?.selectedFixture?.home ?? selectedBetman?.home ?? "-"} vs ${combined?.selectedFixture?.away ?? selectedBetman?.away ?? "-"}`
        );
      } else {
        setStatus(`경기 매칭 완료 · Fixture #${fixtureId} · 상세 분석 데이터 일부 미수신`);
      }
      return true;
    } catch (e:any) {
      const message = readableError(e,"선택 경기 분석 실패");
      setStatus(message);
      setBetman((prev) => ({ ...prev, error:message }));
      return false;
    } finally { setLoading(false); }
  }


  async function revealBacktestResult(): Promise<boolean> {
    if (!backtestMode || validationLoading || !actualMarketPicks.length) return false;

    const fixtureId = Number(matched?.fixtureId ?? matched?.selectedFixture?.id ?? matched?.fixture?.id);
    if (!Number.isFinite(fixtureId)) {
      setStatus("실제 결과를 불러올 SportsAPI Fixture ID가 없습니다.");
      return false;
    }

    setValidationLoading(true);
    setStatus(`Fixture #${fixtureId} 실제 결과를 검증 레이어에서 불러오는 중…`);
    try {
      const response = await fetch(`/api/fixture/result?id=${encodeURIComponent(String(fixtureId))}`, { cache: "no-store" });
      const payload = await readApiResponse(response, "Fixture 결과 검증 API");
      if (!response.ok || !payload?.ok || !payload?.result) {
        throw new Error(readableError(payload?.error, "실제 경기결과를 확인하지 못했습니다."));
      }
      const result: BacktestValidationResult = {
        homeScore: Number(payload.result.homeScore),
        awayScore: Number(payload.result.awayScore),
        firstHalfHomeScore: Number.isFinite(Number(payload.result.firstHalfHomeScore)) ? Number(payload.result.firstHalfHomeScore) : null,
        firstHalfAwayScore: Number.isFinite(Number(payload.result.firstHalfAwayScore)) ? Number(payload.result.firstHalfAwayScore) : null,
        sourceLabel: `SportsAPI Fixture #${fixtureId} · 예측 확정 후 검증 전용`,
      };
      setDynamicValidationResults((previous) => ({ ...previous, [String(fixtureId)]: result }));
      setBacktestResultRevealed(true);
      setStatus(`Fixture #${fixtureId} 실제 결과 연결 완료 · 검증 레이어 공개`);
      return true;
    } catch (e:any) {
      setStatus(readableError(e, "실제 결과 검증 실패"));
      return false;
    } finally {
      setValidationLoading(false);
    }
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
        @media(max-width:1250px){.quickStats{grid-template-columns:repeat(3,1fr)}.compactMarketHead,.compactMarketRow{grid-template-columns:minmax(62px,.8fr) minmax(65px,.8fr) 50px 50px 52px 52px 82px}}
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
          grid-template-columns:minmax(70px,.82fr) minmax(70px,.82fr) 54px 54px 55px 55px 88px!important;
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
          <div className="sub">Betman 미시작 발매경기 전체 종목 → 실제 경기 단위 그룹화 → SportsAPI 분석 → 종목별 실제 시장 최적 픽</div>
        </div>
        <div className="bar">
          <button
            className="btn light"
            onClick={() => {
              setBacktestMode(false);
              setBacktestResultRevealed(false);
              setSelectedBetmanKey(null);
              setMatched(null);
              void loadBetmanList();
            }}
            disabled={loading || batchBacktest.running}
            title="실전 발매 경기 목록으로 돌아가 새로고침합니다."
          >
            🔄 경기목록 새로고침
          </button>

          <button
            className="btn light"
            onClick={() => {
              setBacktestMode(true);
              setBacktestResultRevealed(false);
              void loadBacktestCandidates();
            }}
            disabled={loading || backtestLibraryLoading || batchBacktest.running}
            title="과거 후보를 불러오면 자동으로 과거 분석 모드로 전환됩니다."
          >
            {backtestLibraryLoading ? "⏳ 과거 후보 수집" : "📚 과거 후보 불러오기"}
          </button>

          <button
            className="btn light"
            onClick={() => {
              setBacktestMode(true);
              setBacktestResultRevealed(false);
              void startBatchBacktest();
            }}
            disabled={loading || validationLoading || backtestLibraryLoading || batchBacktest.running}
            title="자동으로 과거 분석 모드로 전환해 IndexedDB에 없는 경기만 수집합니다. 저장된 경기는 API 호출 전에 제외합니다."
          >
            {batchBacktest.running
              ? `⏳ ${Math.min(batchBacktest.index + 1, batchBacktest.gameKeys.length)}/${batchBacktest.gameKeys.length} · ✅${batchBacktest.completed} ❌${batchBacktest.failed}`
              : `📥 백데이터 수집${offlineDatasetCount > 0 ? ` · 저장 ${offlineDatasetCount}` : ""}`}
          </button>

          <button
            className="btn light"
            onClick={() => {
              setBacktestMode(true);
              setBacktestResultRevealed(false);
              void recoverLegacyBacktestDataset();
            }}
            disabled={
              loading ||
              validationLoading ||
              batchBacktest.running
            }
            title="기존 localStorage의 과거 후보/PRE snapshot/검증 결과를 검사해서 API 호출 없이 새 IndexedDB 백데이터셋으로 복구합니다."
          >
            ♻ 기존 데이터 복구
            {legacyRecovery.recoverable > 0
              ? ` (${legacyRecovery.recoverable})`
              : ""}
          </button>

          <span
            className="small"
            style={{
              padding: "8px 10px",
              border: "1px solid #dbe4ef",
              borderRadius: 9,
              background: "#f8fafc",
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}
            title="브라우저 IndexedDB에 저장된 PRE 입력 + VERIFY 결과 데이터셋 개수"
          >
            💾 영구 저장 {offlineDatasetCount}경기
          </span>

          <span
            className="small"
            title="기존 브라우저 저장소에서 확인된 자료"
            style={{
              whiteSpace: "nowrap",
              color: "#64748b",
            }}
          >
            legacy: 후보 {legacyRecovery.games}
            {" · "}snapshot {legacyRecovery.snapshots}
            {" · "}cal {legacyRecovery.calibrationRows}
          </span>

          {collectionCheckpoint &&
            collectionCheckpoint.remaining > 0 && (
              <span
                className="small"
                style={{
                  whiteSpace: "nowrap",
                  color:
                    collectionCheckpoint.stoppedByQuota
                      ? "#b45309"
                      : "#64748b",
                }}
                title="수집은 경기 저장 직후 체크포인트를 남깁니다. 다시 실행하면 IndexedDB에 저장된 경기는 API 호출 전에 제외합니다."
              >
                ↪ 이어받기 {collectionCheckpoint.stored}/{collectionCheckpoint.target}
                {" · "}남음 {collectionCheckpoint.remaining}
              </span>
            )}

          <button
            className="btn light"
            onClick={() => {
              setBacktestMode(true);
              setBacktestResultRevealed(false);
              void startOfflineBatchBacktest();
            }}
            disabled={
              loading ||
              validationLoading ||
              batchBacktest.running ||
              offlineDatasetCount === 0
            }
            title="저장된 IndexedDB 데이터만 사용해 현재 모델을 재계산합니다. SportsAPI 호출 0회."
          >
            {batchBacktest.running
              ? `⏳ 오프라인 ${Math.min(
                  batchBacktest.index + 1,
                  batchBacktest.gameKeys.length
                )}/${batchBacktest.gameKeys.length}`
              : "▶ 오프라인 30경기"}
          </button>

          <button className="btn primary" onClick={analyzeSelected} disabled={loading || batchBacktest.running || !selectedBetman}>
            {loading ? "⏳ 분석 중" : "📊 선택 경기 분석"}
          </button>
          <span
            className="small"
            style={{
              padding: "6px 8px",
              border: "1px solid #dbe4ef",
              borderRadius: 8,
              background: backtestMode ? "#eef6ff" : "#f8fafc",
              whiteSpace: "nowrap",
            }}
            title="작업에 따라 실전/과거 분석 모드가 자동 전환됩니다."
          >
            {backtestMode ? "🧪 과거 분석" : "📡 실전 분석"}
          </span>
          <span className={betman.error ? "small err" : "small"}>{status}</span>
        </div>
      </div>

      {backtestMode && batchBacktestDiagnostics.length > 0 && (
        <div style={{
          margin: "8px 12px 0",
          padding: 10,
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          background: "#fff",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 7,
          }}>
            <b>🧾 자동 백테스트 진단 로그</b>
            <span className="small">
              성공 {batchBacktestDiagnostics.filter((row) => row.status === "SUCCESS").length}
              {" · "}실패 {batchBacktestDiagnostics.filter((row) => row.status === "FAIL").length}
              {" · "}Calibration {batchBacktestDiagnostics.reduce((sum, row) => sum + row.calibrationRows, 0)}행
              {batchBacktestDiagnostics.some((row) => row.message.includes("API 일일 한도 소진"))
                ? " · ⛔ API 일일 한도 소진"
                : ""}
            </span>
          </div>

          {currentBatchPerformance.total.records > 0 && (
            <div
              style={{
                marginBottom: 10,
                border: "1px solid #dbe4ef",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "9px 10px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <b>🎯 백테스트 실제 적중 성적</b>
                <span className="small">
                  검증 {currentBatchPerformance.total.records}픽
                  {" · "}적중 {currentBatchPerformance.total.hits}
                  {" · "}실패 {currentBatchPerformance.total.misses}
                  {" · "}적중률{" "}
                  {currentBatchPerformance.total.hitRate === null
                    ? "-"
                    : `${currentBatchPerformance.total.hitRate.toFixed(1)}%`}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(150px,1fr))",
                  gap: 8,
                  padding: 10,
                }}
              >
                <div style={{padding: 9, border: "1px solid #e2e8f0", borderRadius: 8}}>
                  <div className="small">전체 Calibration</div>
                  <b>{currentBatchPerformance.total.hits}/{currentBatchPerformance.total.records}</b>
                  <div className="small">
                    {currentBatchPerformance.total.hitRate === null
                      ? "-"
                      : `${currentBatchPerformance.total.hitRate.toFixed(1)}%`}
                  </div>
                </div>

                {currentBatchPerformance.byModel.map((row) => (
                  <div
                    key={row.key}
                    style={{
                      padding: 9,
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                  >
                    <div className="small">{row.label}</div>
                    <b>{row.hits}/{row.records}</b>
                    <div className="small">
                      적중률{" "}
                      {row.hitRate === null
                        ? "-"
                        : `${row.hitRate.toFixed(1)}%`}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, minmax(90px,1fr))",
                  gap: 6,
                  padding: "0 10px 10px",
                }}
              >
                {currentBatchPerformance.byMarket.map((row) => (
                  <div
                    key={row.key}
                    style={{
                      padding: 8,
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      textAlign: "center",
                    }}
                  >
                    <b style={{fontSize: 11}}>{row.label}</b>
                    <div style={{fontSize: 12, marginTop: 3}}>
                      {row.hits}/{row.records}
                    </div>
                    <div className="small">
                      {row.hitRate === null
                        ? "-"
                        : `${row.hitRate.toFixed(1)}%`}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  margin: "0 10px 10px",
                  padding: 10,
                  border: "1px solid #dbe4ef",
                  borderRadius: 9,
                  background: "#fbfdff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <b>📌 Baseline 비교</b>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <button
                      className="btn light"
                      onClick={saveCurrentBacktestAsBaseline}
                      disabled={
                        currentBatchPerformance.total.records <= 0
                      }
                    >
                      현재 결과를 Baseline 저장
                    </button>

                    {backtestBaseline && (
                      <button
                        className="btn light"
                        onClick={clearBacktestBaseline}
                      >
                        Baseline 삭제
                      </button>
                    )}
                  </div>
                </div>

                {!backtestBaseline ? (
                  <div className="small">
                    현재 30경기 결과를 Baseline으로 저장한 뒤 모델을 수정하고 다시 오프라인 테스트하면 전/후 차이를 자동 비교합니다.
                  </div>
                ) : (
                  <>
                    <div
                      className="small"
                      style={{
                        marginBottom: 8,
                      }}
                    >
                      저장 기준:{" "}
                      {new Date(
                        backtestBaseline.savedAt
                      ).toLocaleString()}
                      {" · "}전체{" "}
                      {backtestBaseline.total.hits}/
                      {backtestBaseline.total.records}
                      {" · "}
                      {backtestBaseline.total.hitRate === null
                        ? "-"
                        : `${backtestBaseline.total.hitRate.toFixed(1)}%`}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3, minmax(150px,1fr))",
                        gap: 7,
                        marginBottom: 8,
                      }}
                    >
                      {[
                        {
                          key: "TOTAL",
                          label: "전체",
                          current:
                            currentBatchPerformance.total,
                          baseline:
                            backtestBaseline.total,
                        },
                        ...currentBatchPerformance.byModel.map(
                          (current) => ({
                            key: current.key,
                            label: current.label,
                            current,
                            baseline:
                              backtestBaseline.byModel.find(
                                (row) =>
                                  row.key === current.key
                              ) ?? null,
                          })
                        ),
                      ].map(
                        (row) => {
                          const delta =
                            performanceDelta(
                              row.current,
                              row.baseline
                            );

                          return (
                            <div
                              key={row.key}
                              style={{
                                padding: 8,
                                border:
                                  "1px solid #e2e8f0",
                                borderRadius: 8,
                              }}
                            >
                              <div className="small">
                                {row.label}
                              </div>

                              <b>
                                {row.current.hitRate === null
                                  ? "-"
                                  : `${row.current.hitRate.toFixed(1)}%`}
                              </b>

                              <div
                                className="small"
                                style={{
                                  fontWeight: 700,
                                  color:
                                    delta === null
                                      ? "#64748b"
                                      : delta > 0
                                        ? "#07884a"
                                        : delta < 0
                                          ? "#d33d3d"
                                          : "#64748b",
                                }}
                              >
                                Baseline 대비{" "}
                                {formatPerformanceDelta(delta)}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(6, minmax(90px,1fr))",
                        gap: 6,
                      }}
                    >
                      {currentBatchPerformance.byMarket.map(
                        (current) => {
                          const baseline =
                            backtestBaseline.byMarket.find(
                              (row) =>
                                row.key === current.key
                            ) ?? null;

                          const delta =
                            performanceDelta(
                              current,
                              baseline
                            );

                          return (
                            <div
                              key={current.key}
                              style={{
                                padding: 7,
                                border:
                                  "1px solid #e2e8f0",
                                borderRadius: 8,
                                textAlign: "center",
                              }}
                            >
                              <b style={{fontSize: 11}}>
                                {current.label}
                              </b>

                              <div
                                style={{
                                  fontSize: 12,
                                  marginTop: 3,
                                }}
                              >
                                {current.hitRate === null
                                  ? "-"
                                  : `${current.hitRate.toFixed(1)}%`}
                              </div>

                              <div
                                className="small"
                                style={{
                                  fontWeight: 700,
                                  color:
                                    delta === null
                                      ? "#64748b"
                                      : delta > 0
                                        ? "#07884a"
                                        : delta < 0
                                          ? "#d33d3d"
                                          : "#64748b",
                                }}
                              >
                                {formatPerformanceDelta(delta)}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </>
                )}
              </div>

              <div
                className="small"
                style={{
                  padding: "0 10px 9px",
                  color: "#64748b",
                }}
              >
                ※ 적중률은 VERIFY에서 HIT/MISS로 확정되어 Calibration에 저장된 픽만 집계합니다.
                PUSH·전반 점수 미확보 등 검증불가 시장은 기존 정책대로 Calibration 행에 포함되지 않습니다.
              </div>
            </div>
          )}

          <div style={{
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 9,
          }}>
            {batchBacktestDiagnostics.map((row) => (
              <div
                key={`${row.index}|${row.gameNo}|${row.savedAt}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px 64px 72px minmax(180px,1fr) minmax(280px,1.5fr)",
                  gap: 8,
                  alignItems: "center",
                  padding: "7px 9px",
                  borderBottom: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              >
                <b>#{row.index}</b>
                <span>{row.gameNo}</span>
                <b style={{color: row.status === "SUCCESS" ? "#15803d" : "#dc2626"}}>
                  {row.status === "SUCCESS" ? "성공" : "실패"}
                </b>
                <span>
                  {row.gameLabel}
                  {row.fixtureId !== null ? ` · F#${row.fixtureId}` : ""}
                </span>
                <span style={{
                  color: row.status === "SUCCESS" ? "#166534" : "#991b1b",
                  overflowWrap: "anywhere",
                }}>
                  {row.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {backtestMode ? "백테스트 과거경기" : "실전 발매 경기"}
              </h3>

              <div
                className="small"
                style={{
                  marginTop: 5,
                }}
              >
                {backtestMode
                  ? "경기 전 Betman 배당만 저장 · 실제 경기결과는 데이터에 포함하지 않음"
                  : "경기번호 · 시간 · 리그 · 게임유형 · Betman 실제 배당 · 전체 목록 스크롤"}
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

          {!backtestMode && betmanDiagnostics && (
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
              {backtestMode
                ? "현재 저장된 백테스트 과거경기 중 이 종목의 경기가 없습니다."
                : "현재 Betman API가 반환한 데이터 중 이 종목의 미시작 배당 경기가 없습니다."}
            </div>
          )}

          {backtestMode && (
            <div className="notice" style={{ margin: "0 14px 10px" }}>
              <b>V13.6 실제 경기 단위 백테스트 라이브러리</b>
              {" · "}현재 {mergeActualGames(backtestGames).length}실제경기 / {mergeActualGames(backtestGames).reduce((sum, game) => sum + marketRows(game).length, 0)}배당행
              {" · "}💾 저장 데이터 {offlineDatasetCount}경기
              {" · "}기본 검증 샘플 NC vs 삼성 포함
              <br />
              <span>목록은 실제 경기 1줄로 표시하고, 해당 경기의 승패·핸디·U/O·전반 등 모든 Betman 시장은 오른쪽 분석에 함께 전달합니다. 실제 결과는 분석 완료 후 별도 SportsAPI 검증 API를 호출할 때만 읽습니다.</span>
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
                  <div>대표번호</div>
                  <div>일시</div>
                  <div>리그</div>
                  <div>시장수</div>
                  <div>대상경기</div>
                  <div>주요배당</div>
                  <div>핸디</div>
                  <div>U/O</div>
                  <div>선택</div>
                </div>

                {filteredGames.map(
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

                    const firstRow =
                      rows[0];

                    const moneyline =
                      rows.find((row:any) =>
                        String(row?.label ?? row?.marketName ?? row?.type ?? "")
                          .match(/승패|승1패|moneyline/i)
                      );

                    const handicap =
                      rows.find((row:any) =>
                        String(row?.label ?? row?.marketName ?? row?.type ?? "")
                          .match(/(^|\s)H\s|핸디|handicap/i)
                      );

                    const total =
                      rows.find((row:any) =>
                        String(row?.label ?? row?.marketName ?? row?.type ?? "")
                          .match(/U\/O|(^|\s)U\s|언더|오버|total/i)
                      );

                    const oddsText = (row:any) => {
                      if (!row) return "-";
                      const values = [
                        row?.homeOdds ?? row?.oddsHome ?? row?.selections?.[0]?.odds,
                        row?.drawOdds ?? row?.oddsDraw ?? row?.selections?.[1]?.odds,
                        row?.awayOdds ?? row?.oddsAway ?? row?.selections?.[2]?.odds,
                      ].filter((v:any) => Number(v) > 0);
                      return values.length
                        ? values.map((v:any) => Number(v).toFixed(2)).join(" / ")
                        : "-";
                    };

                    return (
                      <div
                        key={key}
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "58px 96px 92px 70px minmax(190px,1fr) 116px 86px 86px 58px",
                          minHeight:
                            42,
                          alignItems:
                            "center",
                          textAlign:
                            "center",
                          borderBottom:
                            "1px solid #cfd6dc",
                          background:
                            selected
                              ? "#e8f2ff"
                              : "#fff",
                        }}
                      >
                        <div>
                          {String(
                            firstRow?.gameNo ??
                            firstRow?.matchSeq ??
                            (game as any)?.gameNo ??
                            "-"
                          )}
                        </div>
                        <div>
                          {(() => {
                            const raw = game?.gameDateMs ?? game?.gameDate ?? game?.startTime;
                            const d = new Date(raw as any);
                            if (!Number.isFinite(d.getTime())) return String(raw ?? "-");
                            return d.toLocaleString("ko-KR", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            });
                          })()}
                        </div>
                        <div>
                          {String(
                            (game as any)?.league ??
                            koreanSport(String((game as any)?.sport ?? "")) ??
                            "-"
                          )}
                        </div>
                        <div style={{fontWeight:800}}>
                          {rows.length}개
                        </div>
                        <div style={{fontWeight:800}}>
                          {betmanTeam(game,"home")} : {betmanTeam(game,"away")}
                        </div>
                        <div>
                          {oddsText(moneyline)}
                        </div>
                        <div>
                          {(() => { const h = chooseBetmanHandicap(game); return h ? `H ${h.line > 0 ? "+" : ""}${h.line}` : "-"; })()}
                        </div>
                        <div>
                          {(() => { const u = chooseBetmanTotal(game); return u ? `U/O ${u.line}` : "-"; })()}
                        </div>
                        <div>
                          <button
                            className="btn light"
                            onClick={() =>
                              setSelectedBetmanKey(
                                gameKey(
                                  game,
                                  gameIndex
                                )
                              )
                            }
                            style={{
                              padding:
                                "5px 7px",
                              minWidth:
                                50,
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
                <div className="label">
                  현재 최고 가치픽
                  {bestActualPick
                    ? ` · ${bestActualPick.valueGrade}`
                    : ""}
                </div>
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
                    {" · "}EV {bestActualPick.expectedValue === null ? "-" : `${bestActualPick.expectedValue >= 0 ? "+" : ""}${bestActualPick.expectedValue.toFixed(1)}%`}
                    <br />
                    배당 {bestActualPick.odds === null ? "-" : bestActualPick.odds.toFixed(2)}
                    {" · "}손익분기 {bestActualPick.breakEvenProbability === null ? "-" : `${bestActualPick.breakEvenProbability.toFixed(1)}%`}
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
                  충돌 위험
                  {" · "}
                  {currentSignalConflict.score.toFixed(0)}
                </div>
              </div>
            </div>

            {currentSport === "야구" &&
              backtestMode &&
              backtestValidationTruth &&
              !backtestResultRevealed && (
              <div
                className="notice"
                style={{
                  margin: "0 0 10px",
                  border:
                    "1px solid #8fb6ff",
                  background:
                    "#f4f8ff",
                }}
              >
                <b>백테스트 검증 준비 완료</b>
                {" · "}아래 `V12.0 백테스트 결과 검증기`에서
                `예측 확정 · 실제 결과 검증 열기` 버튼을 누르면 결과를 공개할 수 있습니다.
              </div>
            )}

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
                    <div>유형</div><div>추천</div><div className="cmNum">최종</div><div className="cmNum">시장</div><div className="cmNum">엣지</div><div className="cmNum">EV</div><div className="cmNum">최종 등급</div>
                  </div>
                  {actualMarketPicks.map((pick) => {
                    const isBest = bestActualPick?.key === pick.key;
                    return (
                      <div className={`compactMarketRow ${isBest ? "bestRow" : ""}`} key={pick.key} title={`${pick.detail} · 홈팀 기준 핸디 · 원모델 ${pick.rawProbability.toFixed(1)}% · 데이터보정 ${pick.preProbabilityBefore === null || pick.preProbabilityBefore === undefined ? pick.probability.toFixed(1) : pick.preProbabilityBefore.toFixed(1)}% · 최종 ${pick.probability.toFixed(1)}% · EV ${pick.expectedValue === null ? "-" : pick.expectedValue.toFixed(1) + "%"} · ${pick.valueGrade} · ${pick.valueGradeReason}`}>
                        <div className="cmName">{pick.market}</div>
                        <div className="cmPick">{pick.pick}</div>
                        <div className="cmNum"><b>{pick.probability.toFixed(1)}%</b></div>
                        <div className="cmNum">{pick.marketProbability === null ? "-" : `${pick.marketProbability.toFixed(1)}%`}</div>
                        <div className={`cmNum ${pick.edge !== null && pick.edge >= 0 ? "cmPos" : "cmNeg"}`}>{pick.edge === null ? "-" : `${pick.edge >= 0 ? "+" : ""}${pick.edge.toFixed(1)}`}</div>
                        <div className={`cmNum ${pick.expectedValue !== null && pick.expectedValue >= 0 ? "cmPos" : "cmNeg"}`}>{pick.expectedValue === null ? "-" : `${pick.expectedValue >= 0 ? "+" : ""}${pick.expectedValue.toFixed(1)}%`}</div>
                        <div
                          className="cmNum"
                          title={`${pick.valueGradeReason} · 단계 ${analysisFactors.baseballAnalysisStageLabel} · 의사결정 위험 ${pick.decisionRiskScore.toFixed(0)} · ${pick.decisionRiskReason} · 신뢰 ${pick.confidenceGrade}(${pick.confidenceScore.toFixed(0)}) · 가치점수 ${pick.valueGradeScore.toFixed(1)}`}
                        >
                          <span
                            className="cmGrade"
                            style={{
                              background:
                                pick.valueGrade === "STRONG VALUE"
                                  ? "#d9f7e6"
                                  : pick.valueGrade === "VALUE"
                                    ? "#e8f6ee"
                                    : pick.valueGrade === "WATCH"
                                      ? "#fff4d8"
                                      : "#f3f4f6",
                              color:
                                pick.valueGrade === "STRONG VALUE" ||
                                pick.valueGrade === "VALUE"
                                  ? "#087a39"
                                  : pick.valueGrade === "WATCH"
                                    ? "#9a6200"
                                    : "#667085",
                            }}
                          >
                            {pick.stageGradeLabel ?? pick.valueGrade}
                          </span>
                        </div>
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
              <summary>V12.0 계산 추적 · PRE 불확실성 · 백테스트 검증 · EV</summary>
              <div className="uiDetailBody">
                <div className="section" style={{ marginTop: 0 }}>
                  <h3>V11.7 계산 추적 · 데이터 가용성 + λ 교정</h3>

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

                  <div className="notice" style={{ margin: "0 0 8px", background: "#fff8e8" }}>
                    <b>V12.0 의사결정 규칙</b><br />
                    승무패·핸디는 시장/H2H 방향 충돌과 홈·원정 장소표본 부족을 위험점수에 반영합니다.
                    U/O·SUM에는 승패 방향충돌을 직접 적용하지 않습니다.
                    위험점수 35 이상 또는 EV 35% 이상 / 엣지 20%p 이상 극단값은 VALUE로 올리지 않고 WATCH로 격리합니다.
                    <br />
                    <b>야구:</b> 승1패는 2점차 이상 승 / 1점차 이내(무승부 포함) / 2점차 이상 패,
                    전반은 5이닝 기준이며 전반 H/UO는 해당 전반 라인을 독립 계산합니다.
                  </div>

                  {currentSport === "야구" && backtestMode && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V12.0 백테스트 안전장치 · 실제 SportsAPI 리소스 진단</h3>

                      <div className="cards">
                        <div className="card">
                          분석 기준시각
                          <b>
                            {formatBacktestCutoff(
                              backtestAudit?.cutoffMs ??
                              (
                                selectedBetman &&
                                Number.isFinite(gameTimeMs(selectedBetman))
                                  ? gameTimeMs(selectedBetman) - 60_000
                                  : null
                              )
                            )}
                          </b>
                          <div className="small">
                            경기 시작 1분 전 고정
                          </div>
                        </div>

                        <div className="card">
                          최근경기 필터
                          <b>
                            홈 {backtestAudit?.keptHomeFixtures ?? "-"}경기
                            {" / "}
                            원정 {backtestAudit?.keptAwayFixtures ?? "-"}경기
                          </b>
                          <div className="small">
                            차단 홈 {backtestAudit?.removedHomeFixtures ?? "-"}
                            {" · "}원정 {backtestAudit?.removedAwayFixtures ?? "-"}
                            <br />
                            점수해석 홈 {backtestAudit?.scoredHomeFixtures ?? "-"}
                            {" · "}원정 {backtestAudit?.scoredAwayFixtures ?? "-"}
                            {" · "}Form집계 홈 {backtestAudit?.matchedHomeFixtures ?? "-"}
                            {" / "}원정 {backtestAudit?.matchedAwayFixtures ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          H2H 정책
                          <b>{backtestAudit ? "미래정보 차단" : "분석 전"}</b>
                          <div className="small">
                            {backtestAudit?.h2hPolicy ?? "cutoff 적용 대기"}
                          </div>
                        </div>

                        <div className="card">
                          사후정보 차단
                          <b>{backtestAudit ? "LOCKED" : "대기"}</b>
                          <div className="small">
                            최종점수 제거 · 경기후 statistics 차단
                          </div>
                        </div>

                        <div className="card">
                          Form 기준 팀 ID
                          <b>
                            {backtestAudit?.selectedHomeTeamId ?? "-"}
                            {" / "}
                            {backtestAudit?.selectedAwayTeamId ?? "-"}
                          </b>
                          <div className="small">
                            {backtestAudit?.selectedHomeTeamName ?? "-"}
                            {" / "}
                            {backtestAudit?.selectedAwayTeamName ?? "-"}
                            {" · 미식별 "}
                            {backtestAudit?.unmatchedHomeFixtures ?? "-"}
                            {"/"}
                            {backtestAudit?.unmatchedAwayFixtures ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          분석 엔진
                          <b>
                            {analysisFactors.hasRealData
                              ? "활성"
                              : "대기"}
                          </b>
                          <div className="small">
                            MarketPick {actualMarketPicks.length}/
                            {marketConnectionDiagnostics.length}
                          </div>
                        </div>
                      </div>

                      <div className="notice" style={{ margin: "8px 0" }}>
                        백테스트에서는 선택 경기의 실제 결과를 예측 입력으로 사용하지 않습니다.
                        현재시점 aggregate Form도 버리고 기준시각 이전 fixture만으로 Form/득실을 다시 계산합니다.
                        H2H가 경기목록 없이 집계값만 제공되면 미래정보 누출 위험 때문에 H2H를 사용하지 않습니다.
                        선발/라인업은 해당 Fixture의 경기 전 정보로 유지하며 실제 결과 비교는 별도 검증 단계까지 잠급니다.
                      </div>
                    </div>
                  )}

                  {currentSport === "야구" &&
                    backtestMode && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V13.0 λ 계산 추적 정합성 · Bayesian Starter · Coverage Gate</h3>

                      <div className="cards">
                        <div className="card">
                          데이터 소스
                          <b>
                            {matched?.lineupsSource === "NAVER_PREVIEW"
                              ? "NAVER PREVIEW"
                              : matched?.lineupsSource === "SPORTSAPI"
                                ? "SPORTSAPI 우선"
                                : "미수신"}
                          </b>
                        </div>

                        <div className="card">
                          Naver gameId
                          <b>{matched?.naverPregame?.gameId ?? "-"}</b>
                        </div>

                        <div className="card">
                          일정 API
                          <b>{matched?.naverPregame?.scheduleStatus ?? "-"}</b>
                        </div>

                        <div className="card">
                          Preview API
                          <b>{matched?.naverPregame?.previewStatus ?? "-"}</b>
                        </div>
                      </div>

                      <div className="notice" style={{ margin: "8px 0 0" }}>
                        네이버스포츠 일정에서 날짜·양팀을 매칭한 뒤 경기별 preview의
                        경기전 선발/라인업만 보조 입력으로 사용합니다.
                        SportsAPI lineups가 있으면 SportsAPI를 우선하고,
                        없을 때만 NAVER PREVIEW를 사용합니다.
                        최종점수·경기후 statistics는 이 경로에서 분석 입력으로 사용하지 않습니다.
                      </div>

                      {matched?.naverPregame?.error && (
                        <div className="notice" style={{ margin: "8px 0 0" }}>
                          네이버 진단: {matched.naverPregame.error}
                        </div>
                      )}

                      {matched?.naverPregame?.previewAudit && (
                        <div style={{ marginTop: 10 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              marginBottom: 6,
                            }}
                          >
                            Preview JSON 구조 진단
                          </div>

                          <div className="cards">
                            <div className="card">
                              rootKeys
                              <b>
                                {matched.naverPregame.previewAudit.rootKeys?.length ?? 0}개
                              </b>
                              <div className="small">
                                {(matched.naverPregame.previewAudit.rootKeys ?? [])
                                  .slice(0, 12)
                                  .join(", ") || "-"}
                              </div>
                            </div>

                            <div className="card">
                              발견 path
                              <b>
                                {matched.naverPregame.previewAudit.rowCount ?? 0}개
                              </b>
                              <div className="small">
                                결과/점수/statistics 제외
                              </div>
                            </div>
                          </div>

                          {Array.isArray(
                            matched.naverPregame.previewAudit.rows
                          ) &&
                            matched.naverPregame.previewAudit.rows.length > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                overflowX: "auto",
                                border:
                                  "1px solid #e3e9f2",
                                borderRadius: 9,
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "220px 60px 60px 130px 90px 90px 50px",
                                  gap: 6,
                                  padding: "6px 8px",
                                  minWidth: 760,
                                  background: "#f5f8fc",
                                  fontSize: 9,
                                  fontWeight: 900,
                                }}
                              >
                                <div>path</div>
                                <div>type</div>
                                <div>length</div>
                                <div>sample name</div>
                                <div>role</div>
                                <div>position</div>
                                <div>order</div>
                              </div>

                              {matched.naverPregame.previewAudit.rows.map(
                                (
                                  row: any,
                                  index: number
                                ) => (
                                  <div
                                    key={`preview-audit-${row.path}-${index}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "220px 60px 60px 130px 90px 90px 50px",
                                      gap: 6,
                                      padding: "6px 8px",
                                      minWidth: 760,
                                      borderTop:
                                        "1px solid #edf1f6",
                                      fontSize: 9,
                                    }}
                                  >
                                    <div
                                      style={{
                                        wordBreak:
                                          "break-all",
                                      }}
                                    >
                                      {row.path}
                                    </div>
                                    <div>{row.type ?? "-"}</div>
                                    <div>{row.length ?? "-"}</div>
                                    <div>{row.sampleName ?? "-"}</div>
                                    <div>{row.sampleRole ?? "-"}</div>
                                    <div>{row.samplePosition ?? "-"}</div>
                                    <div>{row.sampleOrder ?? "-"}</div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          <div className="notice" style={{ margin: "8px 0 0" }}>
                            이 표는 네이버 Preview 응답의 구조만 진단합니다.
                            score/winner/statistics/boxscore/final-score 계열은 탐색에서 제외하며,
                            currentSeasonStats/seasonStats는 경기 전 시즌 누적 지표 후보로 탐색을 허용하며,
                            homeStarter/awayStarter는 명시된 side를 우선 고정하고 ERA/WHIP를 deep parser로 읽습니다.
                            라인업 인원과 공격력은 fullLineUp/startingLineup 계열만 사용하며 pitcher/bullpen/candidate는 공격력 계산에서 제외합니다. 타격 시즌 Stats가 실제 수신된 선수만 공격력 보정에 사용합니다. V12.9는 선발 ERA/WHIP를 리그 중립 ERA 4.50 / WHIP 1.35에 표본량(IP 우선, 없으면 GS/G 등가IP)으로 Bayesian 수축한 뒤 λ에 반영합니다. Naver 시즌 players API는 pcode/playerId를 우선 매칭하고, Stats coverage 80% 미만에서는 VALUE 승격을 WATCH로 제한합니다.
                            경기 결과·boxscore·일반 statistics 계열은 계속 차단합니다.
                          </div>
                        </div>
                      )}

                      {Array.isArray(
                        matched?.naverPregame?.candidates
                      ) &&
                        matched.naverPregame.candidates.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            overflowX: "auto",
                            border:
                              "1px solid #e3e9f2",
                            borderRadius: 9,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "100px 110px 80px 110px 80px 90px 90px",
                              gap: 6,
                              padding: "6px 8px",
                              minWidth: 700,
                              background: "#eef4fb",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                          >
                            <div>gameId</div>
                            <div>홈 원본</div>
                            <div>홈 코드</div>
                            <div>원정 원본</div>
                            <div>원정 코드</div>
                            <div>홈 정규화</div>
                            <div>원정 정규화</div>
                          </div>

                          {matched.naverPregame.candidates.map(
                            (
                              game: any,
                              index: number
                            ) => (
                              <div
                                key={`naver-candidate-${game.gameId}-${index}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "100px 110px 80px 110px 80px 90px 90px",
                                  gap: 6,
                                  padding: "6px 8px",
                                  minWidth: 700,
                                  borderTop:
                                    "1px solid #edf1f6",
                                  fontSize: 9,
                                }}
                              >
                                <div><b>{game.gameId ?? "-"}</b></div>
                                <div>{game.homeName ?? "-"}</div>
                                <div>{game.homeCode ?? "-"}</div>
                                <div>{game.awayName ?? "-"}</div>
                                <div>{game.awayCode ?? "-"}</div>
                                <div>{game.normalizedHome ?? "-"}</div>
                                <div>{game.normalizedAway ?? "-"}</div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {currentSport === "야구" &&
                    backtestMode && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V12.0 SportsAPI 경기전 데이터 리소스 진단</h3>

                      <div className="cards">
                        <div className="card">
                          SportsAPI BASE
                          <b>
                            {sportsApiRuntimeDebug?.baseUrl ?? "-"}
                          </b>
                          <div className="small">
                            현재 서버 실제 base URL
                          </div>
                        </div>

                        <div className="card">
                          Fixture 상세 경로
                          <b>
                            {sportsApiRuntimeDebug?.fixtureDetailPath ?? "-"}
                          </b>
                          <div className="small">
                            {sportsApiRuntimeDebug?.fixtureDetailUrl ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          lineups 경로
                          <b>
                            {officialLineupsDebug?.status ?? "-"}
                          </b>
                          <div className="small">
                            {sportsApiRuntimeDebug?.lineupsPath ??
                              officialLineupsDebug?.path ??
                              "-"}
                          </div>
                        </div>

                        <div className="card">
                          Fixture 실제 key
                          <b>
                            {sportsApiRuntimeDebug?.selectedFixtureTopKeys?.length ?? 0}개
                          </b>
                          <div className="small">
                            {(sportsApiRuntimeDebug?.selectedFixtureTopKeys ?? [])
                              .slice(0, 10)
                              .join(", ") || "-"}
                          </div>
                        </div>

                        <div className="card">
                          Fixture 상세 응답
                          <b>
                            {pregameAudit
                              ? "수신"
                              : "미수신"}
                          </b>
                          <div className="small">
                            결과/최종스탯 제외 진단
                          </div>
                        </div>

                        <div className="card">
                          공식 /fixtures/:id/lineups
                          <b>
                            {officialLineupsDebug?.ok
                              ? "조회 성공"
                              : officialLineupsDebug
                                ? "조회 실패"
                                : "상태 없음"}
                          </b>
                          <div className="small">
                            {officialLineupsDebug?.ok
                              ? `type ${officialLineupsDebug.dataType ?? "-"} · ${officialLineupsDebug.arrayCount ?? "-"}`
                              : officialLineupsDebug?.error ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          직접 lineups 필드
                          <b>
                            {pregameAudit?.directLineupsPresent
                              ? "있음"
                              : "없음"}
                          </b>
                          <div className="small">
                            {pregameAudit
                              ? `${pregameAudit.directLineupsType} · ${pregameAudit.directLineupsCount}개`
                              : "-"}
                          </div>
                        </div>

                        <div className="card">
                          실제 선수 구조 후보
                          <b>
                            {pregameAudit?.candidateCount ?? 0}개
                          </b>
                          <div className="small">
                            팀/리그/fixture 오탐 제거 후 player 구조만
                          </div>
                        </div>

                        <div className="card">
                          현재 분석 반영
                          <b>
                            {analysisFactors.baseballStarterCount}
                            {"/2 · "}
                            {analysisFactors.baseballLineupPlayerCount}
                            {"명"}
                          </b>
                          <div className="small">
                            {analysisFactors.baseballStarterCount >= 2 &&
                            analysisFactors.baseballLineupPlayerCount >= 18
                              ? "자동 복원 완료 · 분석 엔진 반영"
                              : analysisFactors.baseballStarterCount > 0 ||
                                  analysisFactors.baseballLineupPlayerCount > 0
                                ? "부분 복원 · 추가 데이터 대기"
                                : "자동 복원 전"}
                          </div>
                        </div>
                      </div>

                      {pregameCandidateSummary.length > 0 ? (
                        <div
                          style={{
                            marginTop: 8,
                            overflowX: "auto",
                            border:
                              "1px solid #e3e9f2",
                            borderRadius: 9,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(180px,2fr) 72px minmax(110px,1fr) 72px 72px 48px",
                              gap: 6,
                              padding: "6px 8px",
                              minWidth: 620,
                              background:
                                "#eef4fb",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                          >
                            <div>path</div>
                            <div>ID</div>
                            <div>이름</div>
                            <div>role</div>
                            <div>position</div>
                            <div>order</div>
                          </div>

                          {pregameCandidateSummary.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`pregame-${item.path}-${index}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "minmax(180px,2fr) 72px minmax(110px,1fr) 72px 72px 48px",
                                  gap: 6,
                                  padding: "5px 8px",
                                  minWidth: 620,
                                  borderTop:
                                    "1px solid #edf1f6",
                                  fontSize: 9,
                                }}
                              >
                                <div
                                  style={{
                                    wordBreak:
                                      "break-all",
                                  }}
                                >
                                  {item.path}
                                </div>
                                <div>
                                  {item.id ?? "-"}
                                </div>
                                <div>
                                  {item.name ?? "-"}
                                </div>
                                <div>
                                  {item.role ?? item.side ?? "-"}
                                </div>
                                <div>
                                  {item.position ?? "-"}
                                </div>
                                <div>
                                  {item.order ?? "-"}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="notice" style={{ margin: "8px 0 0" }}>
                          현재 수신된 Fixture/상세 데이터에서는 실제 선수 객체로 식별 가능한 path를 찾지 못했습니다.
                          이 상태에서는 선발/라인업을 임의 복원하지 않으며, SportsAPI가 별도 선수/로스터 리소스를 제공하는지 실제 응답 기준으로 추가 확인해야 합니다.
                        </div>
                      )}

                      <div className="notice" style={{ margin: "8px 0 0" }}>
                        V11.8.2는 endpoint를 더 추측하지 않습니다.
                        현재 서버가 실제 호출 중인 SportsAPI base/path와 Fixture의 실제 key 구조만 진단합니다.
                        score/result/winner/statistics/boxscore 등 경기 결과 관련 필드는 탐색 단계에서 제외하며,
                        팀·리그·시즌·fixture 객체를 선수 후보로 오인하지 않도록 필터링했습니다.
                        실제 player/starter/roster/lineup 구조가 확인된 경우에만 다음 단계에서 분석 엔진에 연결합니다.
                      </div>
                    </div>
                  )}

                  {currentSport === "야구" && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V12.0 야구 데이터 가용성 · 선발투수/라인업 복원</h3>

                      <div className="cards">
                        <div className="card">
                          분석 단계
                          <b>{analysisFactors.baseballAnalysisStageLabel}</b>
                        </div>

                        <div className="card">
                          데이터 완성도
                          <b>{analysisFactors.baseballDataCompleteness}%</b>
                          <div className="small">
                            선발 {analysisFactors.baseballStarterCount}/2
                            {" · "}라인업 감지 {analysisFactors.baseballLineupPlayerCount}명
                          </div>
                        </div>

                        <div className="card">
                          추천 승격 규칙
                          <b>
                            {analysisFactors.baseballAnalysisStage === "READY"
                              ? "VALUE 확정 가능"
                              : "VALUE 후보만 표시"}
                          </b>
                          <div className="small">
                            미발표 단계에서는 최고 가치픽 승격 제한
                          </div>
                        </div>
                      </div>

                      {analysisFactors.baseballAnalysisStage === "PRE" && (
                        <div
                          className="cards"
                          style={{ marginTop: 7 }}
                        >
                          <div className="card">
                            V11.7 PRE 안정화
                            <b>
                              {analysisFactors.baseballPreModelApplied
                                ? "적용"
                                : "대기"}
                            </b>
                            <div className="small">
                              최근 표본 {analysisFactors.baseballPreRecentSample}
                              {" · "}장소 표본 {analysisFactors.baseballPreVenueSample}
                            </div>
                          </div>

                          <div className="card">
                            최근값 신뢰비중
                            <b>
                              {(analysisFactors.baseballPreSampleStrength * 100).toFixed(0)}%
                            </b>
                            <div className="small">
                              나머지는 야구 중립 λ로 수축
                            </div>
                          </div>

                          <div className="card">
                            시장 방향 prior
                            <b>
                              {(analysisFactors.baseballPreMarketWeight * 100).toFixed(0)}%
                            </b>
                            <div className="small">
                              점수총합은 유지 · 승패 방향만 약하게 보정
                            </div>
                          </div>

                          <div className="card">
                            V11.7 확률 페널티
                            <b>
                              18~34%
                            </b>
                            <div className="small">
                              승패 18 · 핸디 22 · U/O 28 · 승1패 30 · SUM 32 · 전반 최대 34
                            </div>
                          </div>

                          <div className="card">
                            시장 margin λ
                            <b>
                              {analysisFactors.baseballPreMarketMargin === null
                                ? "-"
                                : `${analysisFactors.baseballPreMarketMargin >= 0 ? "+" : ""}${analysisFactors.baseballPreMarketMargin.toFixed(2)}`}
                            </b>
                            <div className="small">
                              최대 ±1.60점 제한
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="cards" style={{ marginTop: 7 }}>
                        <div className="card">
                          홈 선발
                          <b>{analysisFactors.homeStarterName ?? "데이터 미수신"}</b>
                          <div className="small">
                            ERA {analysisFactors.homeStarterEra?.toFixed(2) ?? "-"}
                            {" · "}WHIP {analysisFactors.homeStarterWhip?.toFixed(2) ?? "-"}
                            {" · "}IP {analysisFactors.homeStarterInningsPitched?.toFixed(1) ?? "-"}
                            {" · "}GS {analysisFactors.homeStarterGamesStarted?.toFixed(0) ?? "-"}
                            {" · "}G {analysisFactors.homeStarterGames?.toFixed(0) ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          원정 선발
                          <b>{analysisFactors.awayStarterName ?? "데이터 미수신"}</b>
                          <div className="small">
                            ERA {analysisFactors.awayStarterEra?.toFixed(2) ?? "-"}
                            {" · "}WHIP {analysisFactors.awayStarterWhip?.toFixed(2) ?? "-"}
                            {" · "}IP {analysisFactors.awayStarterInningsPitched?.toFixed(1) ?? "-"}
                            {" · "}GS {analysisFactors.awayStarterGamesStarted?.toFixed(0) ?? "-"}
                            {" · "}G {analysisFactors.awayStarterGames?.toFixed(0) ?? "-"}
                          </div>
                        </div>

                        <div className="card">
                          선발 보정량
                          <b>
                            홈 {analysisFactors.pitcherAdjustmentHome >= 0 ? "+" : ""}
                            {analysisFactors.pitcherAdjustmentHome.toFixed(2)}
                            {" / "}
                            원정 {analysisFactors.pitcherAdjustmentAway >= 0 ? "+" : ""}
                            {analysisFactors.pitcherAdjustmentAway.toFixed(2)}
                          </b>
                          <div className="small">
                            {analysisFactors.pitcherDataUsed
                              ? `Bayesian 수축 · 표본신뢰 홈 ${(analysisFactors.homeStarterSampleReliability * 100).toFixed(0)}% / 원정 ${(analysisFactors.awayStarterSampleReliability * 100).toFixed(0)}%`
                              : "선발 수치 미수신 · 보정 0"}
                            {analysisFactors.pitcherDataUsed && (
                              <>
                                <br />
                                Posterior ERA{" "}
                                {analysisFactors.homeStarterPosteriorEra?.toFixed(2) ?? "-"}
                                {" / "}
                                {analysisFactors.awayStarterPosteriorEra?.toFixed(2) ?? "-"}
                                {" · "}WHIP{" "}
                                {analysisFactors.homeStarterPosteriorWhip?.toFixed(2) ?? "-"}
                                {" / "}
                                {analysisFactors.awayStarterPosteriorWhip?.toFixed(2) ?? "-"}
                                {" · "}등가IP{" "}
                                {analysisFactors.homeStarterEquivalentInnings?.toFixed(1) ?? "-"}
                                {" / "}
                                {analysisFactors.awayStarterEquivalentInnings?.toFixed(1) ?? "-"}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="card">
                          전반 5이닝 λ
                          <b>
                            {analysisFactors.baseballFirstHalfHomeScore?.toFixed(2) ?? "-"}
                            {" : "}
                            {analysisFactors.baseballFirstHalfAwayScore?.toFixed(2) ?? "-"}
                          </b>
                          <div className="small">
                            전반 승무패/H/UO 전용
                          </div>
                        </div>
                      </div>

                      <div className="cards" style={{ marginTop: 7 }}>
                        <div className="card">
                          홈 선발타선
                          <b>
                            {analysisFactors.homeLineupBatterCount}명
                            {" · "}
                            Stats {analysisFactors.homeLineupStatsCount}명
                          </b>
                          <div className="small">
                            공격지수{" "}
                            {analysisFactors.homeLineupOffenseIndex === null
                              ? "-"
                              : analysisFactors.homeLineupOffenseIndex.toFixed(3)}
                            {" · "}신뢰{" "}
                            {(analysisFactors.homeLineupReliability * 100).toFixed(0)}%
                          </div>
                        </div>

                        <div className="card">
                          원정 선발타선
                          <b>
                            {analysisFactors.awayLineupBatterCount}명
                            {" · "}
                            Stats {analysisFactors.awayLineupStatsCount}명
                          </b>
                          <div className="small">
                            공격지수{" "}
                            {analysisFactors.awayLineupOffenseIndex === null
                              ? "-"
                              : analysisFactors.awayLineupOffenseIndex.toFixed(3)}
                            {" · "}신뢰{" "}
                            {(analysisFactors.awayLineupReliability * 100).toFixed(0)}%
                          </div>
                        </div>

                        <div className="card">
                          타선 λ 보정량
                          <b>
                            홈 {analysisFactors.lineupAdjustmentHome >= 0 ? "+" : ""}
                            {analysisFactors.lineupAdjustmentHome.toFixed(2)}
                            {" / "}
                            원정 {analysisFactors.lineupAdjustmentAway >= 0 ? "+" : ""}
                            {analysisFactors.lineupAdjustmentAway.toFixed(2)}
                          </b>
                          <div className="small">
                            {analysisFactors.lineupDataUsed
                              ? "실제 시즌 타격지표 반영"
                              : "타격 Stats 미수신 · 보정 0"}
                          </div>
                        </div>
                      </div>


                      <div className="cards" style={{ marginTop: 7 }}>
                        <div className="card">
                          Player ID
                          <b>
                            홈 {analysisFactors.homeLineupPlayerIdCount}/9
                            {" · "}
                            원정 {analysisFactors.awayLineupPlayerIdCount}/9
                          </b>
                          <div className="small">
                            pcode/playerId 우선 매칭
                          </div>
                        </div>

                        <div className="card">
                          타격 Stats Coverage
                          <b>
                            {(analysisFactors.lineupStatsCoverage * 100).toFixed(0)}%
                          </b>
                          <div className="small">
                            Stats{" "}
                            {analysisFactors.homeLineupStatsCount +
                              analysisFactors.awayLineupStatsCount}
                            /18
                          </div>
                        </div>

                        <div className="card">
                          VALUE Gate
                          <b>
                            {analysisFactors.lineupValueGate}
                          </b>
                          <div className="small">
                            {analysisFactors.lineupValueGate === "OPEN"
                              ? "80% 이상 · 정상 승격"
                              : analysisFactors.lineupValueGate === "LIMIT"
                                ? "50~79% · VALUE 보류"
                                : "50% 미만 · VALUE 차단"}
                          </div>
                        </div>
                      </div>

                      {matched?.naverPregame?.batterStatsDiagnostic && (
                        <div className="notice" style={{ marginTop: 7 }}>
                          Naver 시즌 타격 Stats · HTTP{" "}
                          {matched.naverPregame.batterStatsDiagnostic.status ?? "-"}
                          {" · "}조회{" "}
                          {matched.naverPregame.batterStatsDiagnostic.fetched ?? 0}명
                          {" · "}라인업 매칭{" "}
                          {matched.naverPregame.batterStatsDiagnostic.matched ?? 0}/
                          {matched.naverPregame.batterStatsDiagnostic.lineupBatters ?? 18}
                          {" · "}ID 매칭{" "}
                          {matched.naverPregame.batterStatsDiagnostic.matchById ?? 0}
                          {" · "}이름+팀{" "}
                          {matched.naverPregame.batterStatsDiagnostic.matchByNameTeam ?? 0}
                          {" · "}endpoint{" "}
                          {matched.naverPregame.batterStatsDiagnostic.path ?? "-"}
                          {matched.naverPregame.batterStatsDiagnostic.error
                            ? ` · 오류 ${matched.naverPregame.batterStatsDiagnostic.error}`
                            : ""}
                        </div>
                      )}

                      {!analysisFactors.pitcherDataUsed && (
                        <div className="notice" style={{ margin: "8px 0" }}>
                          현재는 사전 분석 단계입니다. 선발/라인업이 없으면 임의 투수 수치를 만들지 않습니다.
                          V11.5의 소표본 λ 안정화에 더해 V11.6은 PRE 마켓확률을 시장 공정확률(없으면 50%) 쪽으로 추가 수축합니다.
                          승패보다 승1패·U/O·SUM·전반 마켓에 더 큰 불확실성 페널티를 적용하고 confidence도 함께 낮춥니다.
                          PRE에서는 VALUE 승격을 허용하지 않고 WATCH/PRE VALUE까지만 표시합니다.
                          실제 선발·라인업이 들어오면 이 PRE 확률 페널티는 자동 해제됩니다.
                        </div>
                      )}
                    </div>
                  )}

                  {currentSport === "야구" &&
                    backtestMode && (
                    <div
                      className="section"
                      style={{
                        marginTop: 0,
                        border:
                          "2px solid #8fb6ff",
                        boxShadow:
                          "0 2px 12px rgba(40,95,190,0.08)",
                      }}
                    >
                      <h3>V12.0 백테스트 결과 검증기</h3>

                      <div
                        className="cards"
                        style={{ marginBottom: 8 }}
                      >
                        <div className="card">
                          결과 연결 상태
                          <b>
                            {backtestValidationTruth
                              ? "연결 완료"
                              : "미연결"}
                          </b>
                          <div className="small">
                            {backtestValidationResolved.matchedBy}
                          </div>
                        </div>

                        <div className="card">
                          예측 잠금
                          <b>
                            {actualMarketPicks.length
                              ? "완료"
                              : "대기"}
                          </b>
                          <div className="small">
                            MarketPick {actualMarketPicks.length}/8
                          </div>
                        </div>
                      </div>

                      {!backtestValidationTruth ? (
                        <>
                          <div className="notice" style={{ margin: "0 0 8px" }}>
                            예측 계산은 완료되었습니다. 이 경기의 실제 결과는 아직 읽지 않았습니다.
                            아래 버튼을 누를 때만 SportsAPI Fixture 결과를 별도 검증 레이어에서 조회합니다.
                          </div>
                          <button
                            className="btn primary"
                            style={{ width: "100%", minHeight: 44, fontSize: 13, fontWeight: 900, marginTop: 4 }}
                            onClick={revealBacktestResult}
                            disabled={!actualMarketPicks.length || validationLoading}
                          >
                            {validationLoading ? "⏳ 실제 결과 확인 중" : "🔒 예측 확정 · 실제 결과 불러오기"}
                          </button>
                        </>
                      ) : !backtestResultRevealed ? (
                        <>
                          <div className="notice" style={{ margin: "0 0 8px" }}>
                            예측 계산은 완료되었습니다. 실제 결과는 지금까지 분석 입력에 사용되지 않았습니다.
                            아래 버튼을 누르면 별도 검증 레이어에서만 실제 결과를 공개하고 적중 여부를 비교합니다.
                          </div>

                          <button
                            className="btn primary"
                            style={{
                              width: "100%",
                              minHeight: 44,
                              fontSize: 13,
                              fontWeight: 900,
                              marginTop: 4,
                            }}
                            onClick={() =>
                              setBacktestResultRevealed(
                                true
                              )
                            }
                            disabled={
                              !actualMarketPicks.length
                            }
                          >
                            🔒 예측 확정 · 실제 결과 검증 열기
                          </button>

                          <div
                            className="small"
                            style={{
                              marginTop: 6,
                              textAlign: "center",
                            }}
                          >
                            실제 결과는 이 버튼을 누른 뒤 검증 레이어에서만 공개됩니다.
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="cards">
                            <div className="card">
                              실제 최종점수
                              <b>
                                {backtestValidationTruth.homeScore}
                                {" : "}
                                {backtestValidationTruth.awayScore}
                              </b>
                              <div className="small">
                                검증 레이어 전용
                              </div>
                            </div>

                            <div className="card">
                              검증 가능
                              <b>
                                {backtestValidatedRows.length}개
                              </b>
                              <div className="small">
                                전반은 실제 5이닝 스코어 없으면 제외
                              </div>
                            </div>

                            <div className="card">
                              적중
                              <b>
                                {backtestHitCount}
                                {" / "}
                                {backtestValidatedRows.length}
                              </b>
                              <div className="small">
                                단일경기 성과 · 계수조정 근거로 단독 사용 금지
                              </div>
                            </div>

                            <div className="card">
                              단순 적중률
                              <b>
                                {backtestValidatedRows.length
                                  ? `${(
                                      (
                                        backtestHitCount /
                                        backtestValidatedRows.length
                                      ) *
                                      100
                                    ).toFixed(1)}%`
                                  : "-"}
                              </b>
                              <div className="small">
                                EV 성능은 다경기 누적으로 평가
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            {backtestValidationRows.map(
                              (row) => (
                                <div
                                  key={`validation-${row.key}`}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "100px 1fr 1fr 74px",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: "6px 8px",
                                    borderBottom:
                                      "1px solid #e6edf5",
                                    fontSize: 9,
                                  }}
                                >
                                  <div>
                                    <b>{row.market}</b>
                                  </div>

                                  <div>
                                    예측{" "}
                                    <b>{row.predictedPick}</b>
                                  </div>

                                  <div>
                                    실제{" "}
                                    <b>{row.actualLabel}</b>
                                  </div>

                                  <div
                                    style={{
                                      fontWeight: 900,
                                      color:
                                        row.status === "HIT"
                                          ? "#078b46"
                                          : row.status === "MISS"
                                            ? "#d33d3d"
                                            : "#7b8798",
                                    }}
                                  >
                                    {row.status === "HIT"
                                      ? "적중"
                                      : row.status === "MISS"
                                        ? "실패"
                                        : "검증 보류"}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          <div className="notice" style={{ margin: "8px 0 0" }}>
                            {backtestValidationTruth.sourceLabel}
                            {" · "}실제 결과는 이 검증 컴포넌트에서만 읽으며 buildAnalysis,
                            Form, λ, MarketPick 확률 계산에는 전달하지 않습니다.
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {currentSport === "야구" &&
                    backtestMode && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3 style={{ margin: 0 }}>
                          V13.1 단계별 백테스트 성능
                        </h3>

                        <button
                          className="btn light"
                          onClick={clearSimpleBacktest}
                          disabled={!simpleBacktestRecords.length}
                        >
                          누적 초기화
                        </button>
                      </div>

                      <div className="cards" style={{ marginTop: 8 }}>
                        <div className="card">
                          경기
                          <b>{simpleSummary.games}</b>
                        </div>

                        <div className="card">
                          검증 마켓
                          <b>{simpleSummary.records}</b>
                        </div>

                        <div className="card">
                          적중률
                          <b>
                            {simpleSummary.hitRate === null
                              ? "-"
                              : `${simpleSummary.hitRate.toFixed(1)}%`}
                          </b>
                        </div>

                        <div className="card">
                          ROI
                          <b>
                            {simpleSummary.roi === null
                              ? "-"
                              : `${simpleSummary.roi >= 0 ? "+" : ""}${simpleSummary.roi.toFixed(1)}%`}
                          </b>
                        </div>

                        <div className="card">
                          평균 EV
                          <b>
                            {simpleSummary.avgEv === null
                              ? "-"
                              : `${simpleSummary.avgEv >= 0 ? "+" : ""}${simpleSummary.avgEv.toFixed(1)}%`}
                          </b>
                        </div>

                        <div className="card">
                          Brier
                          <b>
                            {simpleSummary.avgBrier === null
                              ? "-"
                              : simpleSummary.avgBrier.toFixed(3)}
                          </b>
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <b style={{ fontSize: 10 }}>단계별 성능 · PRE → STARTER → LINEUP → READY</b>
                        {simpleStageSummaries.map(({ stage, summary }) => (
                          <div
                            key={`simple-stage-${stage}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "72px 52px 70px 70px 70px 70px",
                              gap: 6,
                              padding: "6px 8px",
                              borderBottom: "1px solid #e6edf5",
                              fontSize: 9,
                            }}
                          >
                            <div><b>{stage}</b></div>
                            <div>N {summary.records}</div>
                            <div>적중 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                            <div>ROI {summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}</div>
                            <div>EV {summary.avgEv === null ? "-" : `${summary.avgEv >= 0 ? "+" : ""}${summary.avgEv.toFixed(1)}%`}</div>
                            <div>Brier {summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}</div>
                          </div>
                        ))}
                      </div>

                      {simpleGradeSummaries.length > 0 && (
                        <div className="notice" style={{ margin: "8px 0 0" }}>
                          등급별 표본: {simpleGradeSummaries.map(({ grade, summary }) => `${grade} N${summary.records} · ROI ${summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`} · Brier ${summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}`).join(" / ")}
                        </div>
                      )}

                      {simpleMarketSummaries.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {simpleMarketSummaries.map(
                            ({ market, summary }) => (
                              <div
                                key={`simple-market-${market}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "120px 52px 70px 70px 70px",
                                  gap: 6,
                                  padding: "6px 8px",
                                  borderBottom:
                                    "1px solid #e6edf5",
                                  fontSize: 9,
                                }}
                              >
                                <div><b>{market}</b></div>
                                <div>N {summary.records}</div>
                                <div>
                                  적중{" "}
                                  {summary.hitRate === null
                                    ? "-"
                                    : `${summary.hitRate.toFixed(1)}%`}
                                </div>
                                <div>
                                  ROI{" "}
                                  {summary.roi === null
                                    ? "-"
                                    : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}
                                </div>
                                <div>
                                  Brier{" "}
                                  {summary.avgBrier === null
                                    ? "-"
                                    : summary.avgBrier.toFixed(3)}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="notice" style={{ margin: "8px 0 0" }}>
                        실제 결과를 연 뒤 검증 가능한 HIT/MISS 마켓을 단계별로 localStorage에 저장합니다.
                        V13.1은 PRE/STARTER/LINEUP/READY의 적중률·ROI·평균 EV·Brier를 분리 측정하며, 이 누적 기록은 예측 엔진 입력에 사용하지 않습니다.
                      </div>

                      <div style={{ marginTop: 14, borderTop: "2px solid #dbe5ef", paddingTop: 12 }}>
                        <h3 style={{ margin: 0 }}>V13.2 Calibration Audit</h3>
                        <div className="notice" style={{ margin: "8px 0" }}>
                          V13.0 계산 엔진은 동결 상태입니다. 아래 값은 V13.1 누적 검증 레코드를 읽기 전용으로 재집계하며 예측확률이나 λ를 수정하지 않습니다.
                          Calibration Gap = 평균 예측확률 - 실제 적중률이며, 양수는 과신 방향·음수는 과소신 방향입니다. N {CALIBRATION_MIN_SAMPLE} 미만은 판단을 보류합니다.
                        </div>

                        <div className="cards" style={{ marginTop: 8 }}>
                          <div className="card">
                            평균 예측
                            <b>{calibrationOverall.avgProbability === null ? "-" : `${calibrationOverall.avgProbability.toFixed(1)}%`}</b>
                          </div>
                          <div className="card">
                            실제 적중
                            <b>{calibrationOverall.hitRate === null ? "-" : `${calibrationOverall.hitRate.toFixed(1)}%`}</b>
                          </div>
                          <div className="card">
                            Calibration Gap
                            <b>{calibrationOverall.calibrationGap === null ? "-" : `${calibrationOverall.calibrationGap >= 0 ? "+" : ""}${calibrationOverall.calibrationGap.toFixed(1)}%p`}</b>
                            <div className="small">{calibrationBiasLabel(calibrationOverall)}</div>
                          </div>
                          <div className="card">
                            ECE
                            <b>{calibrationEce === null ? "-" : `${calibrationEce.toFixed(1)}%p`}</b>
                            <div className="small">확률구간 가중 절대오차</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, overflowX: "auto" }}>
                          <b style={{ fontSize: 10 }}>예측확률 구간별 Calibration</b>
                          <div style={{ minWidth: 650, marginTop: 4 }}>
                            {calibrationProbabilityBuckets.map(({ key, label, summary }) => (
                              <div key={key} style={{ display: "grid", gridTemplateColumns: "78px 52px 86px 86px 82px 70px 70px", gap: 6, padding: "6px 8px", borderBottom: "1px solid #e6edf5", fontSize: 9 }}>
                                <div><b>{label}</b></div>
                                <div>N {summary.records}</div>
                                <div>예측 {summary.avgProbability === null ? "-" : `${summary.avgProbability.toFixed(1)}%`}</div>
                                <div>실제 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                                <div>Gap {summary.calibrationGap === null ? "-" : `${summary.calibrationGap >= 0 ? "+" : ""}${summary.calibrationGap.toFixed(1)}%p`}</div>
                                <div>Brier {summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}</div>
                                <div>{calibrationBiasLabel(summary)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: 10, overflowX: "auto" }}>
                          <b style={{ fontSize: 10 }}>EV 구간별 실제 ROI</b>
                          <div style={{ minWidth: 590, marginTop: 4 }}>
                            {calibrationEvBuckets.map(({ key, label, summary }) => (
                              <div key={key} style={{ display: "grid", gridTemplateColumns: "78px 52px 86px 86px 86px 86px", gap: 6, padding: "6px 8px", borderBottom: "1px solid #e6edf5", fontSize: 9 }}>
                                <div><b>{label}</b></div>
                                <div>N {summary.records}</div>
                                <div>평균 EV {summary.avgEv === null ? "-" : `${summary.avgEv >= 0 ? "+" : ""}${summary.avgEv.toFixed(1)}%`}</div>
                                <div>ROI {summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}</div>
                                <div>적중 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                                <div>Brier {summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {calibrationGradeSummaries.length > 0 && (
                          <div style={{ marginTop: 10, overflowX: "auto" }}>
                            <b style={{ fontSize: 10 }}>VALUE / WATCH / PASS 등급별 Calibration</b>
                            <div style={{ minWidth: 650, marginTop: 4 }}>
                              {calibrationGradeSummaries.map(({ grade, summary }) => (
                                <div key={`cal-grade-${grade}`} style={{ display: "grid", gridTemplateColumns: "100px 52px 82px 82px 82px 72px 72px", gap: 6, padding: "6px 8px", borderBottom: "1px solid #e6edf5", fontSize: 9 }}>
                                  <div><b>{grade}</b></div>
                                  <div>N {summary.records}</div>
                                  <div>적중 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                                  <div>ROI {summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}</div>
                                  <div>Gap {summary.calibrationGap === null ? "-" : `${summary.calibrationGap >= 0 ? "+" : ""}${summary.calibrationGap.toFixed(1)}%p`}</div>
                                  <div>Brier {summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}</div>
                                  <div>{calibrationBiasLabel(summary)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 10, overflowX: "auto" }}>
                          <b style={{ fontSize: 10 }}>PRE / STARTER / LINEUP / READY 단계별 Calibration</b>
                          <div style={{ minWidth: 650, marginTop: 4 }}>
                            {calibrationStageSummaries.map(({ stage, summary }) => (
                              <div key={`cal-stage-${stage}`} style={{ display: "grid", gridTemplateColumns: "82px 52px 82px 82px 82px 72px 72px", gap: 6, padding: "6px 8px", borderBottom: "1px solid #e6edf5", fontSize: 9 }}>
                                <div><b>{stage}</b></div>
                                <div>N {summary.records}</div>
                                <div>예측 {summary.avgProbability === null ? "-" : `${summary.avgProbability.toFixed(1)}%`}</div>
                                <div>실제 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                                <div>Gap {summary.calibrationGap === null ? "-" : `${summary.calibrationGap >= 0 ? "+" : ""}${summary.calibrationGap.toFixed(1)}%p`}</div>
                                <div>ROI {summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}</div>
                                <div>{calibrationBiasLabel(summary)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {calibrationMarketSummaries.length > 0 && (
                          <div style={{ marginTop: 10, overflowX: "auto" }}>
                            <b style={{ fontSize: 10 }}>시장별 Calibration</b>
                            <div style={{ minWidth: 720, marginTop: 4 }}>
                              {calibrationMarketSummaries.map(({ market, summary }) => (
                                <div key={`cal-market-${market}`} style={{ display: "grid", gridTemplateColumns: "130px 52px 82px 82px 82px 72px 72px", gap: 6, padding: "6px 8px", borderBottom: "1px solid #e6edf5", fontSize: 9 }}>
                                  <div><b>{market}</b></div>
                                  <div>N {summary.records}</div>
                                  <div>예측 {summary.avgProbability === null ? "-" : `${summary.avgProbability.toFixed(1)}%`}</div>
                                  <div>실제 {summary.hitRate === null ? "-" : `${summary.hitRate.toFixed(1)}%`}</div>
                                  <div>Gap {summary.calibrationGap === null ? "-" : `${summary.calibrationGap >= 0 ? "+" : ""}${summary.calibrationGap.toFixed(1)}%p`}</div>
                                  <div>ROI {summary.roi === null ? "-" : `${summary.roi >= 0 ? "+" : ""}${summary.roi.toFixed(1)}%`}</div>
                                  <div>Brier {summary.avgBrier === null ? "-" : summary.avgBrier.toFixed(3)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentSport === "야구" && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V11.7 분석 스냅샷 비교</h3>

                      <div className="cards">
                        {(["PRE", "STARTER", "LINEUP", "READY"] as const).map(
                          (stage) => {
                            const snapshot =
                              currentBaseballSnapshots.find(
                                (item) =>
                                  item.stage === stage
                              );

                            return (
                              <div className="card" key={stage}>
                                {stage}
                                <b>
                                  {snapshot
                                    ? `${snapshot.expectedHomeScore?.toFixed(2) ?? "-"} : ${snapshot.expectedAwayScore?.toFixed(2) ?? "-"}`
                                    : "대기"}
                                </b>
                                <div className="small">
                                  {snapshot
                                    ? `완성도 ${snapshot.completeness}% · 선발 ${snapshot.starterCount}/2 · 라인업 ${snapshot.lineupPlayerCount}명`
                                    : "해당 단계 분석 전"}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                      {currentBaseballSnapshots.length > 0 && (
                        <div style={{ overflowX: "auto", marginTop: 8 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "100px 72px 72px 72px 72px",
                              gap: 0,
                              minWidth: 388,
                              fontSize: 9,
                              fontWeight: 800,
                              background: "#eef4fb",
                              padding: "6px 8px",
                              borderRadius: "8px 8px 0 0",
                            }}
                          >
                            <div>마켓</div>
                            <div>PRE</div>
                            <div>STARTER</div>
                            <div>LINEUP</div>
                            <div>READY</div>
                          </div>

                          {actualMarketPicks.map((pick) => (
                            <div
                              key={`snapshot-${pick.key}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "100px 72px 72px 72px 72px",
                                gap: 0,
                                minWidth: 388,
                                fontSize: 9,
                                padding: "6px 8px",
                                borderBottom: "1px solid #e6edf5",
                              }}
                            >
                              <div>
                                <b>{pick.market}</b>
                                <div className="small">{pick.pick}</div>
                              </div>

                              {(["PRE", "STARTER", "LINEUP", "READY"] as const).map(
                                (stage) => {
                                  const market =
                                    currentBaseballSnapshots
                                      .find(
                                        (snapshot) =>
                                          snapshot.stage === stage
                                      )
                                      ?.markets.find(
                                        (item) =>
                                          item.key === pick.key
                                      );

                                  return (
                                    <div key={`${pick.key}-${stage}`}>
                                      {market
                                        ? `${market.probability.toFixed(1)}%`
                                        : "-"}
                                      <div className="small">
                                        {market?.expectedValue === null ||
                                        market?.expectedValue === undefined
                                          ? "-"
                                          : `EV ${market.expectedValue >= 0 ? "+" : ""}${market.expectedValue.toFixed(1)}%`}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="notice" style={{ margin: "8px 0" }}>
                        같은 Fixture의 단계별 최신 분석 1개씩을 보관합니다.
                        선발/라인업 발표 후 다시 분석하면 PRE → STARTER → LINEUP → READY의
                        예상득점·확률·EV 변화가 같은 표에서 비교됩니다.
                      </div>
                    </div>
                  )}

                  {currentSport === "야구" && (
                    <div className="section" style={{ marginTop: 0 }}>
                      <h3>V11.7 Betman 마켓 연결 진단</h3>

                      <div className="cards">
                        <div className="card">
                          원본 마켓
                          <b>{marketConnectionDiagnostics.length}개</b>
                        </div>
                        <div className="card">
                          실제 배당 보유
                          <b>{marketConnectionWithOdds}개</b>
                        </div>
                        <div className="card">
                          계산 연결
                          <b>{marketConnectionLinked}개</b>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        {marketConnectionDiagnostics.map((item) => (
                          <div
                            key={`connection-${item.key}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 70px 100px",
                              gap: 8,
                              alignItems: "center",
                              padding: "6px 8px",
                              borderBottom: "1px solid #e6edf5",
                              fontSize: 9,
                            }}
                          >
                            <div>
                              <b>{item.label}</b>
                              <div className="small">
                                선택 {item.selectionCount} · 유효배당 {item.usableOddsCount}
                                {item.line === null ? "" : ` · 기준 ${item.line}`}
                              </div>
                            </div>
                            <div>
                              {item.selectedOdds === null
                                ? "배당 -"
                                : `배당 ${item.selectedOdds.toFixed(2)}`}
                            </div>
                            <div
                              style={{
                                fontWeight: 800,
                                color:
                                  item.pickConnected
                                    ? "#078b46"
                                    : item.usableOddsCount > 0
                                      ? "#c87900"
                                      : "#7b8798",
                              }}
                            >
                              {item.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="section" style={{ marginTop: 0 }}>
                    <h3>예상득점 계산 진단</h3>
                    <div className="cards">
                      <div className="card">
                        홈 최근 전체 득/실
                        <b>{analysisFactors.homeOverallScored?.toFixed(2) ?? "-"} / {analysisFactors.homeOverallConceded?.toFixed(2) ?? "-"}</b>
                      </div>
                      <div className="card">
                        홈 전용 득/실
                        <b>{analysisFactors.homeVenueScored?.toFixed(2) ?? "-"} / {analysisFactors.homeVenueConceded?.toFixed(2) ?? "-"}</b>
                        <div className="small">장소가중 {Math.round(analysisFactors.homeVenueWeight * 100)}%</div>
                      </div>
                      <div className="card">
                        원정 최근 전체 득/실
                        <b>{analysisFactors.awayOverallScored?.toFixed(2) ?? "-"} / {analysisFactors.awayOverallConceded?.toFixed(2) ?? "-"}</b>
                      </div>
                      <div className="card">
                        원정 전용 득/실
                        <b>{analysisFactors.awayVenueScored?.toFixed(2) ?? "-"} / {analysisFactors.awayVenueConceded?.toFixed(2) ?? "-"}</b>
                        <div className="small">장소가중 {Math.round(analysisFactors.awayVenueWeight * 100)}%</div>
                      </div>
                    </div>

                    <div className="cards" style={{ marginTop: 7 }}>
                      <div className="card">
                        홈 robust 득/실
                        <b>
                          {analysisFactors.homeRobustScored?.toFixed(2) ?? "-"}
                          {" / "}
                          {analysisFactors.homeRobustConceded?.toFixed(2) ?? "-"}
                        </b>
                        <div className="small">
                          최근값 수축 {Math.round(analysisFactors.homeMetricShrink * 100)}%
                        </div>
                      </div>

                      <div className="card">
                        원정 robust 득/실
                        <b>
                          {analysisFactors.awayRobustScored?.toFixed(2) ?? "-"}
                          {" / "}
                          {analysisFactors.awayRobustConceded?.toFixed(2) ?? "-"}
                        </b>
                        <div className="small">
                          최근값 수축 {Math.round(analysisFactors.awayMetricShrink * 100)}%
                        </div>
                      </div>

                      <div className="card">
                        수축 전 예상
                        <b>{analysisFactors.rawExpectedHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.rawExpectedAwayScore?.toFixed(2) ?? "-"}</b>
                      </div>

                      <div className="card">
                        시장 방향 prior
                        <b>{analysisFactors.scoreGuardApplied ? `적용 ${Math.round(analysisFactors.marketPriorWeight * 100)}%` : "미적용"}</b>
                        <div className="small">
                          장소커버 {Math.round(analysisFactors.venueCoverage * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="cards" style={{ marginTop: 7 }}>
                      <div className="card">
                        중립수축 후 λ
                        <b>{analysisFactors.postShrinkHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.postShrinkAwayScore?.toFixed(2) ?? "-"}</b>
                        <div className="small">표본강도 {analysisFactors.scoreShrinkage === null ? "-" : `${Math.round(analysisFactors.scoreShrinkage * 100)}%`}</div>
                      </div>
                      <div className="card">
                        선발 보정 후 λ
                        <b>{analysisFactors.postStarterHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.postStarterAwayScore?.toFixed(2) ?? "-"}</b>
                        <div className="small">Δ {analysisFactors.pitcherAdjustmentHome >= 0 ? "+" : ""}{analysisFactors.pitcherAdjustmentHome.toFixed(2)} / {analysisFactors.pitcherAdjustmentAway >= 0 ? "+" : ""}{analysisFactors.pitcherAdjustmentAway.toFixed(2)}</div>
                      </div>
                      <div className="card">
                        타선 보정 후 λ
                        <b>{analysisFactors.postLineupHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.postLineupAwayScore?.toFixed(2) ?? "-"}</b>
                        <div className="small">Δ {analysisFactors.lineupAdjustmentHome >= 0 ? "+" : ""}{analysisFactors.lineupAdjustmentHome.toFixed(2)} / {analysisFactors.lineupAdjustmentAway >= 0 ? "+" : ""}{analysisFactors.lineupAdjustmentAway.toFixed(2)}</div>
                      </div>
                      <div className="card">
                        시장 prior 직전 λ
                        <b>{analysisFactors.preMarketHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.preMarketAwayScore?.toFixed(2) ?? "-"}</b>
                      </div>
                      <div className="card">
                        시장 prior 변화
                        <b>{analysisFactors.scoreGuardApplied ? `${analysisFactors.marketAdjustmentHome >= 0 ? "+" : ""}${analysisFactors.marketAdjustmentHome.toFixed(2)} / ${analysisFactors.marketAdjustmentAway >= 0 ? "+" : ""}${analysisFactors.marketAdjustmentAway.toFixed(2)}` : "미적용 · λ 변화 0.00"}</b>
                      </div>
                      <div className="card">
                        최종 예상득점
                        <b>{analysisFactors.expectedHomeScore?.toFixed(2) ?? "-"} : {analysisFactors.expectedAwayScore?.toFixed(2) ?? "-"}</b>
                        <div className="small">TRACE {analysisFactors.lambdaTraceOk ? "OK" : "MISMATCH"}</div>
                      </div>
                      <div className="card">
                        중립 사전값
                        <b>{analysisFactors.scorePrior?.toFixed(2) ?? "-"}</b>
                      </div>
                      <div className="card">
                        시장 공정 승률
                        <b>{analysisFactors.marketHomeFair?.toFixed(1) ?? "-"}% / {analysisFactors.marketAwayFair?.toFixed(1) ?? "-"}%</b>
                      </div>
                      <div className="card">
                        시장 방향 prior
                        <b>{analysisFactors.scoreGuardApplied ? `적용 ${Math.round(analysisFactors.marketPriorWeight * 100)}%` : "미적용"}</b>
                        <div className="small">
                          prior 점수차 {analysisFactors.marketMarginPrior?.toFixed(2) ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="notice" style={{ margin: "8px 0" }}>
                      예상득점은 배당을 그대로 점수로 바꾸지 않습니다. 최근 득실을 robust 처리한 뒤 공격×상대수비로 독립 λ를 먼저 만듭니다.
                      장소표본이 부족하고 독립 λ의 방향이 시장 공정확률과 강하게 반대일 때만 시장 방향을 최대 38%의 약한 prior로 사용합니다.
                      총 예상득점은 유지하고 홈-원정 점수차만 보수적으로 조정합니다.
                    </div>
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
                          gridTemplateColumns: "78px 52px 52px 58px 58px 54px 54px 54px 88px",
                          gap: 6,
                          fontSize: 9,
                          fontWeight: 900,
                          color: "#64748b",
                          padding: "5px 6px",
                          background: "#f1f5f9",
                          borderRadius: 8,
                        }}>
                          <div>마켓</div><div>원모델</div><div>시장</div><div>데이터보정</div><div>PRE최종</div><div>손익분기</div><div>엣지</div><div>EV</div><div>등급</div>
                        </div>

                        {actualMarketPicks.map((pick) => (
                          <div
                            key={`trace-${pick.key}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "78px 52px 52px 58px 58px 54px 54px 54px 88px",
                              gap: 6,
                              fontSize: 9,
                              padding: "5px 6px",
                              borderBottom: "1px solid #edf1f6",
                            }}
                          >
                            <div><b>{pick.market}</b></div>
                            <div>{pick.rawProbability.toFixed(1)}%</div>
                            <div>{pick.marketProbability === null ? "-" : `${pick.marketProbability.toFixed(1)}%`}</div>
                            <div>
                              {pick.preProbabilityBefore === null || pick.preProbabilityBefore === undefined
                                ? `${pick.probability.toFixed(1)}%`
                                : `${pick.preProbabilityBefore.toFixed(1)}%`}
                            </div>
                            <div>
                              <b>{pick.probability.toFixed(1)}%</b>
                              {pick.preUncertaintyApplied && (
                                <div style={{ color: "#64748b", fontSize: 8 }}>
                                  수축 {((pick.preUncertaintyWeight ?? 0) * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>
                            <div>{pick.breakEvenProbability === null ? "-" : `${pick.breakEvenProbability.toFixed(1)}%`}</div>
                            <div style={{
                              color: pick.edge !== null && pick.edge >= 0 ? "#07884a" : "#d33d3d",
                              fontWeight: 800
                            }}>
                              {pick.edge === null ? "-" : `${pick.edge >= 0 ? "+" : ""}${pick.edge.toFixed(1)}%p`}
                            </div>
                            <div style={{
                              color: pick.expectedValue !== null && pick.expectedValue >= 0 ? "#07884a" : "#d33d3d",
                              fontWeight: 800
                            }}>
                              {pick.expectedValue === null ? "-" : `${pick.expectedValue >= 0 ? "+" : ""}${pick.expectedValue.toFixed(1)}%`}
                            </div>
                            <div>
                              <b>{pick.valueGrade}</b>
                              <div style={{ color: "#64748b", fontSize: 8 }}>
                                위험 {pick.decisionRiskScore.toFixed(0)}
                              </div>
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
                    <b>신호 충돌 진단: 충돌 위험 {currentSignalConflict.score.toFixed(0)}/100 · {currentSignalConflict.label}</b>
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
                    V11.7은 모든 핸디캡을 홈팀(왼쪽)에 적용하고, EV·엣지·신뢰도·신호충돌·데이터단계를 함께 평가합니다.
                    PASS는 가치 없음, WATCH는 관망, VALUE 이상만 최고 가치픽 후보입니다.
                    STRONG VALUE는 EV 8% 이상, 엣지 8%p 이상, 신뢰도 68 이상, 신호충돌 15 미만 및 정상 배당구간을 동시에 만족해야 합니다.
                  </div>
                </div>
            {analysisFactors.scoringUsed && (
              <div className="section">
                <h3>V11.7 모델 보정 상태</h3>
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
                  V11.7은 최근 경기에 시간가중치를 적용하고 홈팀은 홈경기, 원정팀은 원정경기를 우선 반영합니다.
                  장소 표본이 부족하면 전체 최근 성적과 섞고, 예상득점은 표본수에 따라 중립 사전값 쪽으로 수축해 과신을 줄입니다.
                  H2H는 보조지표로만 제한합니다.
                </div>
              </div>
            )}

            {actualMarketPicks.length > 0 && (
              <div className="section">
                <h3>V11.7 지표 해석</h3>
                <div className="notice" style={{ margin: 0 }}>
                  원모델확률은 SportsAPI Form/H2H 및 최근 득실점에서 계산하고, 화면의 보정확률은 데이터 신뢰도에 따라 시장 사전값을 일부 혼합한 값입니다.
                  시장확률은 Betman 배당의 마진(오버라운드)을 제거한 공정 내재확률이고,
                  엣지는 모델확률 - 시장확률입니다.
                  V11.7은 U/O·SUM 마켓 해석을 유지하면서 최근경기 시간가중치, 홈/원정 분리, 표본수 수축을 추가합니다.
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
