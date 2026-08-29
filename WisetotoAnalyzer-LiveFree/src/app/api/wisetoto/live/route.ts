// DEPLOY_MARKER_V13_8_14_WISETOTO_BASEBALL_DETAIL_STAGE1_20260829

const WISETOTO_ORIGIN = "https://www.wisetoto.com";
const WISETOTO_DETAIL = `${WISETOTO_ORIGIN}/util/gameinfo/get_detail_lineup.htm`;

/*
 * 브라우저에서 실제 확인한 focus 링크를 안전한 fallback으로 보관한다.
 * 자동 resolver가 와이즈토토의 서버 렌더링/세션 차이로 focus 링크를 못 볼 때만 사용한다.
 * 새 경기는 아래 하드코딩에 의존하지 않고 자동 resolver를 먼저 시도한다.
 */
const VERIFIED_FOCUS_MAP: Record<string, string> = {
  "7272": "464233",
  "7348": "464232",
};

type AnyObj = Record<string, any>;

type ParsedTable = {
  headers: string[];
  rows: string[][];
};

function htmlEntityDecode(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function textOf(html: string) {
  return htmlEntityDecode(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function sectionBetween(html: string, start: RegExp, end: RegExp) {
  const startMatch = start.exec(html);
  if (!startMatch || startMatch.index < 0) return "";
  const from = startMatch.index;
  const tail = html.slice(from + startMatch[0].length);
  const endMatch = end.exec(tail);
  if (!endMatch || endMatch.index < 0) return html.slice(from);
  return html.slice(from, from + startMatch[0].length + endMatch.index);
}

function tableBlocks(html: string) {
  return Array.from(html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)).map(
    (match) => match[0]
  );
}

function parseTable(tableHtml: string): ParsedTable {
  const headerRow = tableHtml.match(/<thead\b[^>]*>[\s\S]*?<tr\b[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/i);
  const headers = headerRow
    ? Array.from(headerRow[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)).map((m) => textOf(m[1]))
    : [];

  const body = tableHtml.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? tableHtml;
  const rows = Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((row) =>
      Array.from(row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) => textOf(cell[1]))
    )
    .filter((cells) => cells.length > 0);

  return { headers, rows };
}

function rowObjects(table: ParsedTable) {
  return table.rows.map((row) => {
    const out: AnyObj = {};
    row.forEach((value, index) => {
      const key = table.headers[index] || `col${index + 1}`;
      out[key] = value;
    });
    return out;
  });
}

function parseStartingPitchers(html: string) {
  const section = sectionBetween(
    html,
    /<!--\s*예상 선발 투수\s*-->/i,
    /<!--\s*\/\/\s*예상 선발 투수\s*-->/i
  );
  if (!section) return [];

  const bySide = ["left", "right"].map((side) => {
    const sideStart = section.search(new RegExp(`<div\\s+class="player\\s+${side}"`, "i"));
    if (sideStart < 0) return null;
    const nextSide = section.slice(sideStart + 1).search(/<div\s+class="player\s+(?:left|right)"/i);
    const chunk = nextSide >= 0 ? section.slice(sideStart, sideStart + 1 + nextSide) : section.slice(sideStart);
    const name = textOf(chunk.match(/<div\s+class="name"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const season = textOf(chunk.match(/<div\s+class="info"[^>]*>\s*<strong>시즌<\/strong>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const era = textOf(chunk.match(/<div\s+class="info"[^>]*>\s*<strong>ERA<\/strong>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    return name ? { side, name, season, era } : null;
  }).filter(Boolean);

  const chartValues = Array.from(section.matchAll(/<div\s+class="count\s+left"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div\s+class="title"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div\s+class="count\s+right"[^>]*>([\s\S]*?)<\/div>/gi)).map((m) => ({
    label: textOf(m[2]),
    left: textOf(m[1]),
    right: textOf(m[3]),
  }));

  /* 첫 5개는 시즌전적, 다음 5개는 상대전적이다. 같은 label이 있어 덮어쓰지 않도록 분리한다. */
  const seasonMetrics = chartValues.slice(0, 5);
  const opponentMetrics = chartValues.slice(5, 10);

  return bySide.map((player: any) => ({
    ...player,
    metrics: seasonMetrics.reduce((acc: AnyObj, item) => {
      acc[item.label] = player.side === "left" ? item.left : item.right;
      return acc;
    }, {}),
    opponentMetrics: opponentMetrics.reduce((acc: AnyObj, item) => {
      acc[item.label] = player.side === "left" ? item.left : item.right;
      return acc;
    }, {}),
  }));
}

function parseSeasonBatters(html: string) {
  const section = sectionBetween(
    html,
    /<!--\s*시즌 타자 기록\s*-->/i,
    /<!--\s*\/\/\s*시즌 타자 기록\s*-->/i
  );
  const tables = tableBlocks(section).slice(0, 2).map(parseTable);
  return {
    home: tables[0] ? rowObjects(tables[0]) : [],
    away: tables[1] ? rowObjects(tables[1]) : [],
  };
}

function parseRecentGameRefs(html: string, side: "home" | "away") {
  const list = html.match(new RegExp(`<ul\\s+id="time_list_${side}"[\\s\\S]*?<\\/ul>`, "i"))?.[0] ?? "";
  return Array.from(
    list.matchAll(/change_record\('([^']+)',\s*'([^']+)',\s*(\d+),\s*'(home|away)'[\s\S]*?<span\s+class="date"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span\s+class="team[^>]*"><span>([\s\S]*?)<\/span><strong>([\s\S]*?)<\/strong><\/span>[\s\S]*?<span\s+class="team[^>]*"><span>([\s\S]*?)<\/span><strong>([\s\S]*?)<\/strong><\/span>/gi)
  ).map((m) => ({
    scheduleInfoSeq: m[1],
    teamInfoSeq: m[2],
    index: Number(m[3]),
    side: m[4],
    date: textOf(m[5]),
    firstTeam: textOf(m[6]),
    firstScore: textOf(m[7]),
    secondTeam: textOf(m[8]),
    secondScore: textOf(m[9]),
  }));
}


function inferRecentTeamName(refs: AnyObj[]) {
  const counts = new Map<string, number>();
  for (const ref of refs) {
    for (const name of [ref?.firstTeam, ref?.secondTeam]) {
      const key = String(name ?? "").trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function recentSummaryFromWisetoto(refs: AnyObj[], side: "home" | "away") {
  const teamName = inferRecentTeamName(refs);
  let wins = 0, draws = 0, losses = 0, scored = 0, conceded = 0, played = 0;
  const fixtures = refs.map((ref) => {
    const firstScore = Number(ref?.firstScore);
    const secondScore = Number(ref?.secondScore);
    const firstIsTeam = teamName ? String(ref?.firstTeam ?? "") === teamName : false;
    const teamScore = firstIsTeam ? firstScore : secondScore;
    const opponentScore = firstIsTeam ? secondScore : firstScore;
    let result: "W" | "D" | "L" | null = null;
    if (Number.isFinite(teamScore) && Number.isFinite(opponentScore)) {
      played += 1;
      scored += teamScore;
      conceded += opponentScore;
      if (teamScore > opponentScore) { wins += 1; result = "W"; }
      else if (teamScore < opponentScore) { losses += 1; result = "L"; }
      else { draws += 1; result = "D"; }
    }
    return {
      id: Number(ref?.scheduleInfoSeq) || ref?.scheduleInfoSeq || null,
      startTime: null,
      league: "Wisetoto",
      home: ref?.firstTeam ?? null,
      away: ref?.secondTeam ?? null,
      homeScore: Number.isFinite(firstScore) ? firstScore : null,
      awayScore: Number.isFinite(secondScore) ? secondScore : null,
      result,
      source: "WISETOTO",
    };
  });
  const formPercent = played > 0 ? Number((((wins * 3 + draws) / (played * 3)) * 100).toFixed(1)) : null;
  return {
    teamId: null,
    teamName,
    side,
    fixtures,
    form: { played, wins, draws, losses, scored, conceded, formPercent },
    source: "WISETOTO",
  };
}

function h2hFromWisetoto(homeRefs: AnyObj[], awayRefs: AnyObj[]) {
  const homeTeam = inferRecentTeamName(homeRefs);
  const awayTeam = inferRecentTeamName(awayRefs);
  const all = [...homeRefs, ...awayRefs];
  const unique = new Map<string, AnyObj>();
  for (const ref of all) {
    const seq = String(ref?.scheduleInfoSeq ?? "");
    if (!seq || unique.has(seq)) continue;
    const teams = [String(ref?.firstTeam ?? ""), String(ref?.secondTeam ?? "")];
    if (homeTeam && awayTeam && teams.includes(homeTeam) && teams.includes(awayTeam)) unique.set(seq, ref);
  }
  let homeWins = 0, awayWins = 0, draws = 0;
  for (const ref of unique.values()) {
    const a = Number(ref?.firstScore), b = Number(ref?.secondScore);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a === b) { draws += 1; continue; }
    const winner = a > b ? String(ref?.firstTeam ?? "") : String(ref?.secondTeam ?? "");
    if (winner === homeTeam) homeWins += 1;
    else if (winner === awayTeam) awayWins += 1;
  }
  return {
    homeWins, awayWins, draws,
    sample: homeWins + awayWins + draws,
    homeTeam, awayTeam,
    source: "WISETOTO_RECENT_OVERLAP",
    limitation: "홈/원정 최근 5경기 목록의 교집합에서 확인되는 맞대결만 집계",
  };
}

function findHeadingTable(html: string, headingPattern: RegExp) {
  const match = headingPattern.exec(html);
  if (!match || match.index < 0) return null;
  const tail = html.slice(match.index + match[0].length);
  const table = tail.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0];
  return table ? parseTable(table) : null;
}

function parseLatestPreviousRecords(html: string) {
  const homeBat = findHeadingTable(html, /<h5>\s*[^<]*타자기록\s*<\/h5>/i);
  const firstPitchHeading = /<h5>\s*[^<]*투수기록\s*<\/h5>/i;
  const homePitchMatch = firstPitchHeading.exec(html);
  const homePitch = homePitchMatch
    ? parseTable(html.slice(homePitchMatch.index).match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0] ?? "")
    : null;

  const awayWrapIndex = html.search(/<div\s+class="line_up_wrap\s+half\s+right"/i);
  const awayHtml = awayWrapIndex >= 0 ? html.slice(awayWrapIndex) : "";
  const awayBat = findHeadingTable(awayHtml, /<h5>\s*[^<]*타자기록\s*<\/h5>/i);
  const awayPitchMatch = firstPitchHeading.exec(awayHtml);
  const awayPitch = awayPitchMatch
    ? parseTable(awayHtml.slice(awayPitchMatch.index).match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0] ?? "")
    : null;

  return {
    home: {
      batters: homeBat ? rowObjects(homeBat) : [],
      pitchers: homePitch ? rowObjects(homePitch) : [],
    },
    away: {
      batters: awayBat ? rowObjects(awayBat) : [],
      pitchers: awayPitch ? rowObjects(awayPitch) : [],
    },
  };
}


function numericCell(row: AnyObj, patterns: RegExp[]) {
  for (const [key, value] of Object.entries(row ?? {})) {
    if (patterns.some((pattern) => pattern.test(String(key)))) {
      const number = Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(number)) return number;
    }
  }
  return null;
}

function summarizeLatestBatters(rows: AnyObj[]) {
  let atBats = 0, hits = 0, rbi = 0, runs = 0, homeRuns = 0;
  for (const row of rows) {
    atBats += numericCell(row, [/타수/, /^AB$/i]) ?? 0;
    hits += numericCell(row, [/안타/, /^H$/i]) ?? 0;
    rbi += numericCell(row, [/타점/, /^RBI$/i]) ?? 0;
    runs += numericCell(row, [/득점/, /^R$/i]) ?? 0;
    homeRuns += numericCell(row, [/홈런/, /^HR$/i]) ?? 0;
  }
  return {
    players: rows.length, atBats, hits, rbi, runs, homeRuns,
    battingAverage: atBats > 0 ? Number((hits / atBats).toFixed(3)) : null,
  };
}

function summarizeLatestPitchers(rows: AnyObj[]) {
  const parsed = rows.map((row, index) => ({
    index,
    name: String(Object.values(row ?? {})[0] ?? "").trim() || null,
    innings: numericCell(row, [/이닝/, /^IP$/i]),
    pitches: numericCell(row, [/투구수/, /투구/, /^P$/i]),
    strikeouts: numericCell(row, [/삼진/, /^SO$/i, /^K$/i]),
    runs: numericCell(row, [/실점/, /^R$/i]),
    earnedRuns: numericCell(row, [/자책/, /^ER$/i]),
  }));
  const starter = parsed[0] ?? null;
  const bullpen = parsed.slice(1);
  return {
    pitchers: parsed,
    starter,
    bullpen: {
      pitchersUsed: bullpen.length,
      pitches: bullpen.reduce((sum, row) => sum + (row.pitches ?? 0), 0),
      innings: Number(bullpen.reduce((sum, row) => sum + (row.innings ?? 0), 0).toFixed(1)),
    },
  };
}

function parseCurrentLineupIfPresent(html: string) {
  /* '이전 경기 라인업' 이후 영역은 과거 경기이므로 현재 라인업으로 절대 오인하지 않는다. */
  const previousIndex = html.search(/<!--\s*이전 경기 라인업\s*-->/i);
  const currentOnly = previousIndex >= 0 ? html.slice(0, previousIndex) : html;
  const heading = currentOnly.search(/(?:선발\s*라인업|금일\s*라인업|오늘\s*라인업|starting\s*lineup)/i);
  if (heading < 0) return { detected: false, home: [], away: [], reason: "current-lineup-heading-not-found" };
  const area = currentOnly.slice(heading);
  const tables = tableBlocks(area).slice(0, 2).map(parseTable).map(rowObjects);
  const plausible = tables.filter((rows) => rows.length >= 7 && rows.length <= 15);
  return plausible.length >= 2
    ? { detected: true, home: plausible[0], away: plausible[1], reason: "current-lineup-table-detected" }
    : { detected: false, home: [], away: [], reason: "current-lineup-table-not-confirmed" };
}

function normalizeName(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "")
    .replace(/lions|goldeneagles|eagles|buffaloes|fighters|marines|hawks|swallows|giants|tigers|carp|dragons|baystars/g, "");
}

function resolveScheduleInfoSeq(html: string, matchSeq: string, home: string, away: string) {
  const escaped = matchSeq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directPatterns = [
    new RegExp(`focus=(\\d+)_${escaped}(?:[^0-9]|$)`, "i"),
    new RegExp(`focus%3D(\\d+)%5F${escaped}(?:[^0-9]|$)`, "i"),
    new RegExp(`['\"](\\d+)_${escaped}['\"]`, "i"),
  ];

  for (const pattern of directPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return { scheduleInfoSeq: match[1], method: "matchSeq" };
  }

  /* focus가 HTML attribute가 아니라 JS/encoded URL로 내려오는 경우까지 수집 */
  const candidates = [
    ...Array.from(html.matchAll(/focus=(\d+)_(\d+)/gi)),
    ...Array.from(html.matchAll(/focus%3D(\d+)%5F(\d+)/gi)),
    ...Array.from(html.matchAll(/["'](\d+)_(\d+)["']/gi)).filter((m) => m[2] === matchSeq),
  ];
  if (!candidates.length) return { scheduleInfoSeq: null, method: "not-found" };

  const homeKey = normalizeName(home);
  const awayKey = normalizeName(away);
  let best: { seq: string; score: number } | null = null;
  for (const candidate of candidates) {
    const index = candidate.index ?? 0;
    const context = normalizeName(textOf(html.slice(Math.max(0, index - 1200), index + 1200)));
    let score = 0;
    if (homeKey && context.includes(homeKey)) score += 1;
    if (awayKey && context.includes(awayKey)) score += 1;
    if (!best || score > best.score) best = { seq: candidate[1], score };
  }

  return best && best.score >= 2
    ? { scheduleInfoSeq: best.seq, method: "team-context" }
    : { scheduleInfoSeq: null, method: "not-found" };
}

async function wisetotoFetch(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
      Referer: `${WISETOTO_ORIGIN}/`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 WisetotoAnalyzer/13.8.14",
    },
  });
  return { response, text: await response.text() };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const explicitSeq = String(url.searchParams.get("scheduleInfoSeq") ?? "").trim();
  const matchSeq = String(url.searchParams.get("matchSeq") ?? "").trim();
  const home = String(url.searchParams.get("home") ?? "").trim();
  const away = String(url.searchParams.get("away") ?? "").trim();

  if (!explicitSeq && !matchSeq) {
    return Response.json(
      { ok: false, error: "scheduleInfoSeq 또는 Betman matchSeq가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    let scheduleInfoSeq = explicitSeq || null;
    let resolverMethod = explicitSeq ? "explicit" : "not-run";
    let resolverStatus = 200;

    if (!scheduleInfoSeq) {
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      /*
       * Betman에서 선택한 #xxxx는 야구토토(bs1)가 아니라 프로토 승부식(pt1)의 경기번호다.
       * V13.8.11은 bs1 목록만 우선 조회해 다른 경기에서 focus를 못 찾았다.
       * 현재 프로토 페이지를 desktop/mobile 양쪽에서 먼저 조회하고, 최근 회차도 좁게 보조 탐색한다.
       * game_round는 와이즈토토 URL상 표시 회차보다 1 작은 값(예: 101회차 -> 100)이다.
       */
      const estimatedDisplayRound = Math.max(1, Math.floor((Date.UTC(currentYear, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(currentYear, 0, 1)) / 86400000 / 3) + 1);
      const protoRoundCandidates = Array.from(new Set([
        estimatedDisplayRound - 1, estimatedDisplayRound, estimatedDisplayRound - 2,
        100, 101, 99,
      ].filter((value) => value >= 1)));
      const protoBase = [
        `${WISETOTO_ORIGIN}/index.htm?game_category=pt1&game_type=pt&game_year=${currentYear}&pn=p&tab_type=proto`,
        `https://mw.wisetoto.com/index.htm?game_category=pt1&game_type=pt&game_year=${currentYear}&pn=p&tab_type=proto`,
      ];
      const protoRounds = protoRoundCandidates.flatMap((round) => [
        `${WISETOTO_ORIGIN}/index.htm?game_category=pt1&game_round=${round}&game_type=pt&game_year=${currentYear}&pn=p&tab_type=proto`,
        `https://mw.wisetoto.com/index.htm?game_category=pt1&game_round=${round}&game_type=pt&game_year=${currentYear}&pn=p&tab_type=proto`,
      ]);
      const listUrls = [
        ...protoBase,
        ...protoRounds,
        /* 마지막 fallback: 야구토토 페이지와 기본 페이지 */
        `${WISETOTO_ORIGIN}/index.htm?game_category=bs1&game_type=bs&game_year=${currentYear}`,
        `${WISETOTO_ORIGIN}/index.htm`,
      ];

      for (const listUrl of listUrls) {
        const list = await wisetotoFetch(listUrl);
        resolverStatus = list.response.status;
        if (!list.response.ok) continue;
        const resolved = resolveScheduleInfoSeq(list.text, matchSeq, home, away);
        if (resolved.scheduleInfoSeq) {
          scheduleInfoSeq = resolved.scheduleInfoSeq;
          resolverMethod = resolved.method;
          break;
        }
      }
    }

    if (!scheduleInfoSeq && VERIFIED_FOCUS_MAP[matchSeq]) {
      scheduleInfoSeq = VERIFIED_FOCUS_MAP[matchSeq];
      resolverMethod = "verified-focus-fallback";
    }

    if (!scheduleInfoSeq) {
      return Response.json(
        {
          ok: false,
          error: "와이즈토토 schedule_info_seq 자동 매칭에 실패했습니다.",
          debug: { matchSeq, home, away, resolverMethod, resolverStatus, resolverVersion: "V13.8.14_BASEBALL_DETAIL_STAGE1" },
        },
        { status: 404 }
      );
    }

    const detailUrl = new URL(WISETOTO_DETAIL);
    detailUrl.searchParams.set("schedule_info_seq", scheduleInfoSeq);
    detailUrl.searchParams.set("tab_type", "");
    detailUrl.searchParams.set("game_year", "");
    detailUrl.searchParams.set("game_round", "");
    detailUrl.searchParams.set("game_no", "");
    detailUrl.searchParams.set("league_info_seq", "");
    detailUrl.searchParams.set("limit", "");
    detailUrl.searchParams.set("same_home_away", "");

    const detail = await wisetotoFetch(detailUrl.toString());
    if (!detail.response.ok) {
      return Response.json(
        {
          ok: false,
          error: `와이즈토토 라인업 응답 실패 (${detail.response.status})`,
          debug: { scheduleInfoSeq, resolverMethod },
        },
        { status: 502 }
      );
    }

    const expectedStarters = parseStartingPitchers(detail.text);
    const seasonBatters = parseSeasonBatters(detail.text);
    const recentGames = {
      home: parseRecentGameRefs(detail.text, "home"),
      away: parseRecentGameRefs(detail.text, "away"),
    };
    const latestPrevious = parseLatestPreviousRecords(detail.text);
    const currentLineup = parseCurrentLineupIfPresent(detail.text);
    const latestDetailSummary = {
      home: {
        batters: summarizeLatestBatters(latestPrevious.home.batters),
        pitching: summarizeLatestPitchers(latestPrevious.home.pitchers),
      },
      away: {
        batters: summarizeLatestBatters(latestPrevious.away.batters),
        pitching: summarizeLatestPitchers(latestPrevious.away.pitchers),
      },
    };
    const wisetotoRecentSummary = {
      home: recentSummaryFromWisetoto(recentGames.home, "home"),
      away: recentSummaryFromWisetoto(recentGames.away, "away"),
    };
    const wisetotoH2H = h2hFromWisetoto(recentGames.home, recentGames.away);
    const absenteeSection = sectionBetween(
      detail.text,
      /<!--\s*결장자 정보\s*-->/i,
      /<!--\s*이전 경기 라인업\s*-->/i
    );
    const absenteeText = textOf(absenteeSection).replace(/^결장자 정보\s*/i, "").trim();

    const latestBatterRows =
      latestPrevious.home.batters.length + latestPrevious.away.batters.length;
    const latestPitcherRows =
      latestPrevious.home.pitchers.length + latestPrevious.away.pitchers.length;

    return Response.json({
      ok: true,
      source: "wisetoto.com",
      capturedAt: Date.now(),
      scheduleInfoSeq,
      resolver: {
        method: resolverMethod,
        matchSeq: matchSeq || null,
      },
      expectedStarters,
      seasonBatters,
      recentGames,
      recentSummary: wisetotoRecentSummary,
      h2h: wisetotoH2H,
      latestPrevious,
      latestDetailSummary,
      currentLineup,
      absentee: {
        available: Boolean(absenteeText),
        text: absenteeText || null,
      },
      coverage: {
        expectedStarters: expectedStarters.length,
        seasonBatters:
          seasonBatters.home.length + seasonBatters.away.length,
        recentGameRefs:
          recentGames.home.length + recentGames.away.length,
        latestBatterRows,
        latestPitcherRows,
        currentLineupBatters: currentLineup.home.length + currentLineup.away.length,
        absenteeDetected: Boolean(absenteeText),
      },
      limitations: {
        previousGameRefs: "최근 경기 탭의 schedule_info_seq는 확보됨",
        previousGameDetail:
          "직전 경기 타자/투수 세부기록은 집계까지 완료. 최근 3~5경기 전체는 change_record XHR의 실제 URL 확인 후 확장.",
        currentLineup:
          "현재 경기 영역에서 당일 라인업 heading/table이 실제 존재할 때만 감지하며, 이전 경기 라인업은 현재 라인업으로 사용하지 않음.",
        modelApplied: "Wisetoto recent Form/H2H is exposed as the baseball LIVE primary feed; V13.0 formulas are unchanged.",
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "와이즈토토 LIVE DATA 수집 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
