// Compact read-only quality audit of active ledger evidence. Never infers a
// FINAL or a pre-tipoff starting five from time elapsed or a network response.
import {espnLeague} from "./espn-fast-final.mjs";
import {isJleagueJ2} from "./jleague-j2-final.mjs";
const H=3600000;
const top=(counts,limit=8)=>Object.fromEntries(Object.entries(counts)
 .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit));
const increment=(o,key)=>{o[key]=(o[key]??0)+1};
export function finalFailureCategory(row){
 const reason=String(row.checkReason??"");
 const history=Array.isArray(row.resultErrors)?
  (row.resultErrors.at(-1)?.reasons??[]).join(" | "):"";
 const joined=reason+" | "+history;
 if(/JLEAGUE_J2:.*?(?:NETWORK|HTTP_50[24])/.test(joined))return "JLEAGUE_OFFICIAL_SOURCE_OUTAGE";
 if(/JLEAGUE_J2:.*?EXACT_FIXTURE_NOT_FOUND/.test(joined))return "JLEAGUE_OFFICIAL_IDENTITY_UNCONFIRMED";
 if(/JLEAGUE_J2:.*?FINAL_STATUS_UNCONFIRMED/.test(joined))return "JLEAGUE_OFFICIAL_FINAL_UNCONFIRMED";
 if(/ESPN_AMBIGUOUS_FIXTURE/.test(joined))return "ESPN_AMBIGUOUS_ID";
 // The new reasons distinguish absent upstream schedule, mismatched kickoff,
 // swapped sides and a known source-side name mismatch. Never infer FINAL.
 if(/ESPN_AMBIGUOUS_FIXTURE|ESPN_MISSING_NUMERIC_EVENT_ID|ESPN_CONFLICTING_EVENT_ID/.test(joined))
  return "ESPN_ID_UNSAFE";
 if(/ESPN_KICKOFF_MISMATCH|ESPN_NO_EVENTS_NEAR_KICKOFF/.test(joined))
  return "ESPN_KICKOFF_UNPROVEN";
 if(/ESPN_HOME_AWAY_REVERSED/.test(joined))return "ESPN_HOME_AWAY_MISMATCH";
 if(/ESPN_HOME_TEAM_NOT_MATCHED|ESPN_AWAY_TEAM_NOT_MATCHED/.test(joined))
  return "ESPN_TEAM_IDENTITY_MISMATCH";
 if(/ESPN_SCOREBOARD_EMPTY/.test(joined))return "ESPN_SCHEDULE_EMPTY";
 if(/ESPN_TEAMS_NOT_ON_SCOREBOARD/.test(joined))return "ESPN_TEAMS_NOT_LISTED";
 if(/ESPN_EXACT_IDENTITY_NOT_PROVEN/.test(joined))return "ESPN_EXACT_IDENTITY_MISSING";
 if(/ESPN_EXTRA_TIME_OR_PENALTIES/.test(joined))return "REGULATION_SCORE_UNCONFIRMED";
 if(/ESPN_INVALID_SPORT_SCORE|NAVER_INVALID_FINAL_SCORE/.test(joined))return "SCORE_INVALID";
 if(/ESPN_FINAL_STATUS_UNCONFIRMED|NAVER_FINAL_STATUS_UNCONFIRMED/.test(joined))
  return "FINAL_STATUS_UNCONFIRMED";
 if(/ESPN_PROXY_NETWORK|ESPN_PROXY_HTTP_50|ESPN_NETWORK/.test(joined))
  return "ESPN_SOURCE_OUTAGE";
 if(/NAVER_CIRCUIT_OPEN|NAVER_(?:FAST|DIRECT|SCHEDULE).*?(?:NETWORK|HTTP_50[24]|TIMEOUT)|NAVER_PROVIDER_NETWORK/.test(joined))
  return "NAVER_SOURCE_OUTAGE";
 if(/ESPN_FINAL_SCORE_MISSING|NAVER_FINAL_SCORE_MISSING/.test(joined))
  return "FINAL_SCORE_MISSING";
 if(!espnLeague(row)&&!isJleagueJ2(row)&&["축구","농구","야구"].includes(row.sport))
  return "NO_INDEPENDENT_ESPN_LEAGUE";
 if(/WAITING_FOR_END/.test(reason))return "NO_FINAL_AUDIT_YET";
 return "OTHER_UNCONFIRMED";
}
export function nbaPregameFailureCategory(row){
 if(row.lineup?.status==="CONFIRMED"&&row.lineup.homeCount===5&&
    row.lineup.awayCount===5&&Number.isFinite(row.lineup.capturedAt)&&
    row.lineup.capturedAt<row.startMs)return "CONFIRMED_5V5";
 if(!Number(row.lineup?.attempts))return "NO_PREGAME_ATTEMPT_RECORDED";
 const reason=String(row.lineup?.lastError??row.lineup?.reason??"");
 if(/AFTER_KICKOFF/.test(reason))return "AFTER_TIPOFF_REJECTED";
 if(/EXACT_IDENTITY|LINEUP_TEAMS_MISSING|TEAM_MISMATCH|EVENT_ID|KICKOFF_MISMATCH|HOME_TEAM_NOT_MATCHED|AWAY_TEAM_NOT_MATCHED|HOME_AWAY_REVERSED/.test(reason))
  return "ESPN_IDENTITY_UNCONFIRMED";
 if(/ESPN_SCOREBOARD_EMPTY|ESPN_NO_EVENTS_NEAR_KICKOFF|ESPN_TEAMS_NOT_ON_SCOREBOARD/.test(reason))
  return "ESPN_FIXTURE_NOT_LISTED";
 if(/NOT_PUBLISHED|XI_NOT_PUBLISHED|PARTIAL/.test(reason))return "NBA_STARTERS_UNPUBLISHED";
 if(/NETWORK|HTTP_50[24]/.test(reason))return "PROVIDER_TIMEOUT";
 if(/NO_VERIFIED_PREGAME_LINEUP_PROVIDER|UNSUPPORTED/.test(reason))return "LEGACY_NO_PROVIDER";
 return "OTHER_UNCONFIRMED";
}
export function diagnoseDataQuality(state,now=Date.now()){
 const rows=state?.records??[],unresolved=rows.filter(r=>r.verdict==="PENDING");
 const overdue=unresolved.filter(r=>Number.isFinite(r.startMs)&&
   r.startMs<=now-24*H);
 const bySport={},byLeague={},byReason={},byProvider={},byConcurrentFailure={};
 for(const r of overdue){
  increment(bySport,String(r.sport??"UNKNOWN"));
  increment(byLeague,String(r.league??"UNKNOWN").slice(0,55));
  increment(byReason,finalFailureCategory(r));
  // Overlap is intentional: ESPN identity failures and Naver 504 can affect
  // the same fixture. The older exclusive byReason chart hides this overlap.
  const evidence=String(r.checkReason??"")+" | "+
   (Array.isArray(r.resultErrors)?(r.resultErrors.at(-1)?.reasons??[]).join(" | "):"");
  if(/ESPN_(?:EXACT_IDENTITY_NOT_PROVEN|SCOREBOARD_EMPTY|TEAMS_NOT_ON_SCOREBOARD|KICKOFF_MISMATCH|HOME_AWAY_REVERSED|HOME_TEAM_NOT_MATCHED|AWAY_TEAM_NOT_MATCHED|NO_EVENTS_NEAR_KICKOFF|MISSING_NUMERIC_EVENT_ID|CONFLICTING_EVENT_ID)/.test(evidence))
   increment(byConcurrentFailure,"ESPN_IDENTITY_OR_SCHEDULE");
  if(/NAVER_CIRCUIT_OPEN|NAVER_(?:FAST|DIRECT|SCHEDULE).*?(?:NETWORK|HTTP_50[24]|TIMEOUT)|NAVER_PROVIDER_NETWORK/.test(evidence))
   increment(byConcurrentFailure,"NAVER_NETWORK_OR_50X");
  if(/ESPN_.*?(?:PROXY_HTTP_50[24]|PROXY_NETWORK)/.test(evidence))
   increment(byConcurrentFailure,"ESPN_UPSTREAM_50X");
  increment(byProvider,espnLeague(r)?"ESPN_SUPPORTED":isJleagueJ2(r)?
   "JLEAGUE_OFFICIAL_J2_SUPPORTED":"NO_INDEPENDENT_LEAGUE_SOURCE");
 }
 const nbaRows=rows.filter(r=>r.sport==="농구"&&espnLeague(r)==="nba");
 const nba={},nbaPast=nbaRows.filter(r=>r.startMs<=now);
 for(const r of nbaPast)increment(nba,nbaPregameFailureCategory(r));
 return {at:now,overdue24h:overdue.length,bySport:top(bySport),
  byLeague:top(byLeague),byReason:top(byReason),
  byConcurrentFailure:top(byConcurrentFailure),
  byProvider:top(byProvider),nbaPast:nbaPast.length,
  nbaPregame:top(nba),nbaFuture:nbaRows.length-nbaPast.length,
  note:"Source coverage/identity categories identify audit bottlenecks; no pending row is upgraded to VERIFIED without an independent FINAL."};
}
