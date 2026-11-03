// Persisted, read-only measurement of real collect/lineup/FINAL transitions.
// A scheduling heuristic or an HTTP 200 is never evidence of a verified match.
import {espnLineupLeague} from "./espn-pregame-lineup.mjs";
export const EFFECT_SCHEMA="wisetoto-operational-effect-v1";
const fields=["collected","pregameCaptured","pregameOdds","verified",
 "verifiedWithPregame","verifiedWithPregameOdds","lineupConfirmed","nba5v5Confirmed"];
const n=x=>Number.isFinite(x)&&x>=0?x:0;
const addArchive=(state,name,active)=>
 active+n(state?.archiveCounts?.[name]);
const exactPregameLineup=r=>r.lineup?.status==="CONFIRMED"&&
 Number.isFinite(r.lineup.capturedAt)&&r.lineup.capturedAt<r.startMs;
const nba=r=>espnLineupLeague(r)==="nba";
const nbaFive=r=>nba(r)&&exactPregameLineup(r)&&
 r.lineup.homeCount===5&&r.lineup.awayCount===5&&
 Array.isArray(r.lineup.home)&&r.lineup.home.length===5&&
 Array.isArray(r.lineup.away)&&r.lineup.away.length===5;
const exactOdds=r=>Number.isFinite(r.firstOddsAt)&&r.firstOddsAt<r.startMs;
export function effectTotals(state){
 const rows=state?.records??[];
 const active={
  collected:rows.length,
  pregameCaptured:rows.filter(r=>Number.isFinite(r.pregameCapturedAt)&&
   r.pregameCapturedAt<r.startMs).length,
  pregameOdds:rows.filter(exactOdds).length,
  verified:rows.filter(r=>r.verdict==="VERIFIED").length,
  verifiedWithPregame:rows.filter(r=>r.verdict==="VERIFIED"&&
   Number.isFinite(r.pregameCapturedAt)&&r.pregameCapturedAt<r.startMs).length,
  verifiedWithPregameOdds:rows.filter(r=>r.verdict==="VERIFIED"&&exactOdds(r)).length,
  lineupConfirmed:rows.filter(exactPregameLineup).length,
  nba5v5Confirmed:rows.filter(nbaFive).length
 };
 // The first six counters can include existing archiveCounts; newer extra
 // archive counters start at zero unless the archive writer tracked them.
 const totals=Object.fromEntries(fields.map(f=>[f,addArchive(state,f,active[f])]));
 // Existing archive names are immutable compatibility aliases.
 totals.pregameCaptured=addArchive(state,"pregameCaptured",active.pregameCaptured);
 totals.verifiedWithPregame=addArchive(state,"verifiedWithPregame",active.verifiedWithPregame);
 totals.lineupConfirmed=addArchive(state,"lineupConfirmed",active.lineupConfirmed);
 totals.collected=addArchive(state,"collected",active.collected);
 totals.verified=addArchive(state,"verified",active.verified);
 return totals;
}
export function effectDelta(current,previous){
 return Object.fromEntries(fields.map(k=>[k,n(current[k])-n(previous[k])]));
}
const countsByReason=(records,field)=>{
 const counts={};
 for(const r of records){
  const value=String(field(r)??"UNKNOWN").slice(0,80);
  counts[value]=(counts[value]??0)+1;
 }
 return Object.fromEntries(Object.entries(counts).sort((a,b)=>b[1]-a[1]||
  a[0].localeCompare(b[0])).slice(0,8));
};
export function effectCurrentDetail(state,backlog){
 const rows=state?.records??[];
 const nbaRows=rows.filter(nba);
 const verified=rows.filter(r=>r.verdict==="VERIFIED");
 const pending=rows.filter(r=>r.verdict==="PENDING");
 return {
  activeNbaFixtures:nbaRows.length,
  activeNbaAttempted:nbaRows.filter(r=>Number(r.lineup?.attempts)>0).length,
  nbaLineupReasons:countsByReason(nbaRows,r=>
   r.lineup?.lastError??r.lineup?.reason??"NOT_YET_QUERIED"),
  verifiedSources:countsByReason(verified,r=>r.resultSource??"UNKNOWN"),
  pendingReasons:countsByReason(pending,r=>String(r.checkReason??"WAITING_FOR_END").split(":")[0]),
  backlog:backlog??null
 };
}
const smallCounts=o=>Object.fromEntries(Object.entries(o??{})
 .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8));
export function recordOperationalEffect(state,{
 beforeTotals,priorLedgerAt,startedAt,finishedAt,runId,commit,sourceFresh,
 lineupSummary={},finalSummary={},backlog=null
}){
 if(state.operationalEffect&&state.operationalEffect.schema!==EFFECT_SCHEMA)
  throw Error("operational effect schema incompatible — do not discard historic evidence");
 if(!Number.isFinite(finishedAt)||!Number.isFinite(startedAt)||finishedAt<startedAt)
  throw Error("invalid operational measurement timestamps");
 const totals=effectTotals(state);
 const prior=state.operationalEffect??null;
 const baseline=prior?.baseline??{
  at:Number.isFinite(priorLedgerAt)?priorLedgerAt:startedAt,
  origin:"PERSISTED_LEDGER_BEFORE_FIRST_MEASURED_SCAN",
  totals:{...beforeTotals}
 };
 const id=String(runId??"manual-"+finishedAt).slice(0,90);
 const scan={
  id,at:finishedAt,commit:String(commit??"unknown").slice(0,45),
  sourceFresh:sourceFresh===true&&state.lastFeedOk===true,
  capture:{
   listed:n(state.lastCaptureSummary?.listed),
   inThirtyMinuteWindow:n(state.lastCaptureSummary?.window),
   captured:n(sourceFresh?state.lastCaptureSummary?.new:0),
   missingIdentity:n(sourceFresh?state.lastCaptureSummary?.missingIdentity:0),
   watchlistMissing:n(sourceFresh?state.lastCaptureSummary?.watchlistMissing:0),
   delayed:state.lastCaptureSummary?.delayedScan===true
  },
  lineup:{
   attempted:n(lineupSummary.attempted),
   confirmed:n(lineupSummary.confirmed),
   nbaAttempted:n(lineupSummary.nbaAttempted),
   nba5v5Confirmed:n(lineupSummary.nbaConfirmed),
   nbaFocusedRechecks:n(lineupSummary.nbaFocusedRechecks),
   nbaFocusedRecovered:n(lineupSummary.nbaFocusedRecovered),
   reasons:smallCounts(lineupSummary.reasonCounts)
  },
  final:{
   checked:n(finalSummary.checked),
   providerConfirmed:n(finalSummary.confirmed),
   newVerified:effectDelta(totals,beforeTotals).verified,
   selectedBySport:finalSummary.selectedBySport??{},
   confirmedBySource:finalSummary.confirmedBySource??{},
   waitReasons:smallCounts(finalSummary.waitReasons),
   naverUpstreamFailures:n(finalSummary.naverUpstreamFailures),
   naverCircuitSkipped:n(finalSummary.naverOutageSkipped)
  },
  changes:effectDelta(totals,beforeTotals),
  totals
 };
 const history=[...(prior?.history??[]).filter(h=>h.id!==id),scan].slice(-144);
 const delta=effectDelta(totals,baseline.totals);
 // A loss in any individual scan is a warning even if the total remains above the original baseline.
 const regressions=Object.entries(scan.changes).filter(([k,v])=>
  ["collected","pregameCaptured","verified","lineupConfirmed","nba5v5Confirmed"].includes(k)&&v<0)
  .map(([k])=>k);
 return {...state,operationalEffect:{
  schema:EFFECT_SCHEMA,baseline,latest:scan,delta,history,
  regressions,current:effectCurrentDetail(state,backlog)
 }};
}
export function publicOperationalEffect(state){
 const o=state?.operationalEffect;
 if(!o||o.schema!==EFFECT_SCHEMA)return null;
 return {
  schema:o.schema,baseline:o.baseline,latest:o.latest,delta:o.delta,
  regressions:o.regressions??[],current:o.current,
  historySize:o.history?.length??0,
  recentScans:(o.history??[]).slice(-12),
  note:"관측 시작 전 장부와 실제 새 스캔의 차이. 동시 발생한 증가분은 특정 코드 변경의 인과 효과를 증명하지 않습니다. 경기 시각만으로 종료나 PRE 선발을 확정하지 않습니다."
 };
}
