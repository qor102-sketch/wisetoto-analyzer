import test from "node:test";
import assert from "node:assert/strict";
import {pregameLineupCandidates,lineupRetryIntervalMs,mergeLineupEvidence} from "./pregame-lineup.mjs";
import {earliestFinalAuditMs,finalAuditBacklog,dueResults,mergeProviderFinal,projection} from "./collect-first.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";

const T=Date.parse("2026-11-03T00:00:00Z");
const M=60_000,H=60*M,D=24*H;
const nba=(key,startMs=T+8*M)=>({
 key,sport:"농구",league:"NBA",home:"Boston Celtics",away:"Chicago Bulls",
 startMs,verdict:"PENDING",odds:[],latestOdds:[]});
const soccer=(key,startMs=T+7*M)=>({
 key,sport:"축구",league:"잉글랜드 프리미어리그",
 home:"Liverpool",away:"Chelsea",startMs,verdict:"PENDING",odds:[],latestOdds:[]});
const final=(key,sport,league,startMs,lastResultCheckAt=null)=>({
 key,sport,league,home:"Home",away:"Away",startMs,verdict:"PENDING",
 lastResultCheckAt,odds:[],latestOdds:[]});

test("NBA T-minus-15 cooldown shortens without extending the prekickoff limit",()=>{
 const r=nba("nba-urgent");
 assert.equal(lineupRetryIntervalMs(r,T),2*M);
 r.lineup={status:"UNAVAILABLE",lastAttemptAt:T-3*M};
 assert.deepEqual(pregameLineupCandidates({records:[r]},T).map(x=>x.key),["nba-urgent"]);
 r.lineup.lastAttemptAt=T-M;
 assert.equal(pregameLineupCandidates({records:[r]},T).length,0);
 assert.equal(pregameLineupCandidates({records:[r]},r.startMs).length,0);
 const mid=nba("nba-middle",T+35*M);
 assert.equal(lineupRetryIntervalMs(mid,T),5*M);
 mid.lineup={status:"UNAVAILABLE",lastAttemptAt:T-6*M};
 assert.equal(pregameLineupCandidates({records:[mid]},T).length,1);
 mid.lineup.lastAttemptAt=T-4*M;
 assert.equal(pregameLineupCandidates({records:[mid]},T).length,0);
});

test("12 simultaneous NBA games rotate fairly with at least four soccer slots in 12-item scan",()=>{
 const nbaRows=Array.from({length:12},(_,i)=>nba("nba"+i));
 const soccerRows=Array.from({length:7},(_,i)=>soccer("soc"+i));
 const before={records:[...nbaRows,...soccerRows]};
 const first=pregameLineupCandidates(before,T,12);
 assert.equal(first.filter(r=>r.sport==="농구").length,8);
 assert.equal(first.filter(r=>r.sport==="축구").length,4);
 const scanned=new Set(first.filter(r=>r.sport==="농구").map(r=>r.key));
 const after={records:before.records.map(r=>scanned.has(r.key)?
   {...r,lineup:{status:"UNAVAILABLE",lastAttemptAt:T}}:r)};
 const second=pregameLineupCandidates(after,T+3*M,12);
 const next=new Set(second.filter(r=>r.sport==="농구").map(r=>r.key));
 assert.ok(nbaRows.filter(r=>!scanned.has(r.key)).every(r=>next.has(r.key)),
   "NBA fixtures skipped last scan must receive the next reserved slots");
 assert.equal(second.length,12);
});

test("a result arriving after tipoff is never retroactive NBA PRE evidence",()=>{
 const r=nba("late",T+M),state={records:[r]};
 const observation={status:"CONFIRMED",reason:"ESPN_VERIFIED_PREGAME_NBA_STARTERS",
  capturedAt:T,home:["A","B","C","D","E"],away:["F","G","H","I","J"]};
 const later=mergeLineupEvidence(state,r.key,observation,T+2*M);
 assert.notEqual(later.records[0].lineup.status,"CONFIRMED");
 assert.equal(later.records[0].lineup.capturedAt,undefined);
});

test("postmatch audit uses sport-aware maturity but never treats time as FINAL",()=>{
 assert.equal(earliestFinalAuditMs(final("b","농구","NBA",T)),165*M);
 assert.equal(earliestFinalAuditMs(final("base","야구","KBO",T)),240*M);
 const rows=[
  final("soon-soccer","축구","잉글랜드 프리미어리그",T-140*M),
  final("basket","농구","NBA",T-166*M),
  final("baseball","야구","KBO",T-220*M),
  final("volley","배구","KOVO 여자",T-160*M),
  final("future","농구","NBA",T+H)
 ];
 const state={records:rows};
 assert.deepEqual(dueResults(state,T,10).map(r=>r.key),["basket","volley"]);
 assert.equal(finalAuditBacklog(state,T).future,1);
 assert.equal(finalAuditBacklog(state,T).awaitingLikelyFinish,2);
 assert.equal(finalAuditBacklog(state,T).dueNow,2);
 const silent=mergeProviderFinal(state,"basket",{ok:false,waitReason:"SCOREBOARD_STILL_LIVE"},T);
 assert.equal(silent.records[1].verdict,"PENDING");
 assert.equal(dueResults(silent,T+10*M,10).some(r=>r.key==="basket"),false);
 assert.equal(finalAuditBacklog(silent,T+10*M).coolingDown,1);
});

test("older than six hours remains visible while 42-day grace protects retry horizon",()=>{
 const state={records:[
  final("pending-7h","축구","K리그1",T-7*H),
  final("pending-25h","농구","KBL",T-25*H),
  final("expired","축구","K리그2",T-43*D)
 ]};
 const counts=finalAuditBacklog(state,T);
 assert.equal(counts.overdueSixHours,2);
 assert.equal(counts.overdue24Hours,1);
 assert.equal(counts.outsideRetryHorizon,1);
 assert.equal(counts.dueNow,2);
 const publicData=projection(state,T);
 assert.deepEqual(publicData.resultAudit,counts);
 assert.equal(publicData.counts.verified,0);
});

test("freshly likely-finished and long-overdue matches each get ESPN and Naver-only slots",()=>{
 const espn=[
  ...Array.from({length:24},(_,i)=>final("er"+i,"농구","NBA",T-5*H)),
  ...Array.from({length:24},(_,i)=>final("eo"+i,"농구","NBA",T-30*H))
 ];
 const domestic=[
  ...Array.from({length:12},(_,i)=>final("nr"+i,"축구","K리그1",T-5*H)),
  ...Array.from({length:12},(_,i)=>final("no"+i,"축구","K리그1",T-30*H))
 ];
 const selected=selectFinalAuditRows({records:[...espn,...domestic]},T,24);
 assert.equal(selected.length,24);
 assert.equal(new Set(selected.map(x=>x.key)).size,24);
 assert.equal(selected.filter(r=>r.league==="NBA").length,16);
 assert.equal(selected.filter(r=>r.league==="K리그1").length,8);
 assert.equal(selected.filter(r=>r.key.startsWith("er")).length,8);
 assert.equal(selected.filter(r=>r.key.startsWith("eo")).length,8);
 assert.equal(selected.filter(r=>r.key.startsWith("nr")).length,4);
 assert.equal(selected.filter(r=>r.key.startsWith("no")).length,4);
});
