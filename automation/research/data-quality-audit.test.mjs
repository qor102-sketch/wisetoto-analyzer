import test from "node:test";
import assert from "node:assert/strict";
import {parseEspnFinal,findEspnFixtureEvent,espnLeague} from "./espn-fast-final.mjs";
import {parseEspnPregameXi} from "./espn-pregame-lineup.mjs";
import {finalFailureCategory,nbaPregameFailureCategory,diagnoseDataQuality} from "./data-quality-audit.mjs";
import {selectFinalAuditRows,isNaverOnlyOutage} from "./final-scan-plan.mjs";
import {deferFinalWithoutProvider,mergeProviderFinal,projection} from "./collect-first.mjs";

const T=Date.parse("2026-11-04T05:00:00Z"),H=3600000,M=60000;
const row=(key,sport="축구",league="일본 J2리그",at=T-30*H)=>({
 key,sport,league,startMs:at,home:"Home Club",away:"Away Club",
 verdict:"PENDING",fixtureId:null,pregameCapturedAt:null,
 odds:[],latestOdds:[],lastResultCheckAt:null,checkReason:"WAITING_FOR_END"});
const nbaPairs=[
 ["골든스테이트 워리어스","피닉스 선즈","Golden State Warriors","Phoenix Suns",116,113],
 ["덴버 너게츠","포틀랜드 트레일블레이저스","Denver Nuggets","Portland Trail Blazers",110,118],
 ["샬럿 호네츠","디트로이트 피스톤스","Charlotte Hornets","Detroit Pistons",91,124]
];
test("observed 2026-11-03 NBA Korean team spellings map to independent ESPN labels only with full match proof",()=>{
 nbaPairs.forEach(([home,away,englishH,englishA,scoreH,scoreA],i)=>{
  const startMs=Date.parse("2026-11-03T03:00:00Z")+i*M;
  const fixture={...row("nba"+i,"농구","NBA",startMs),home,away};
  // Synthetic event IDs demonstrate matching rules; they are NOT claimed
  // as real source identifiers. Never use a synthetic score in the ledger.
  const game={id:String(401000100+i),date:new Date(startMs).toISOString(),
   completed:true,statusName:"STATUS_FINAL",
   competitors:[{homeAway:"home",name:englishH,teamId:"1",score:String(scoreH)},
    {homeAway:"away",name:englishA,teamId:"2",score:String(scoreA)}]};
  const source={ok:true,league:"nba",events:[game]};
  const match=findEspnFixtureEvent(source,fixture);
  assert.equal(match.ok,true,home+" vs "+away);
  assert.equal(parseEspnFinal(source,fixture,{now:T}).ok,true);
  assert.equal(parseEspnFinal({...source,events:[{...game,completed:false}]},fixture,{now:T}).ok,false);
  assert.equal(parseEspnFinal({...source,events:[{...game,date:new Date(startMs+4*H).toISOString()}]},fixture,{now:T}).ok,false);
  assert.equal(parseEspnFinal({...source,events:[{...game,competitors:[{...game.competitors[1],homeAway:"home"},
    {...game.competitors[0],homeAway:"away"}]}]},fixture,{now:T}).ok,false);
  assert.equal(parseEspnFinal({...source,events:[game,{...game,id:String(401001100+i)}]},fixture,{now:T}).ok,false);
 });
});
test("spelling fix can prove NBA lineup identity but cannot fabricate pretipoff five",()=>{
 const [home,away,englishH,englishA]=nbaPairs[1];
 const startMs=T+30*M,fx={...row("nba-before","농구","NBA",startMs),home,away};
 const e={id:"401000123",date:new Date(startMs).toISOString(),
  competitors:[{homeAway:"home",name:englishH,teamId:"7"},
   {homeAway:"away",name:englishA,teamId:"8"}]};
 const m=findEspnFixtureEvent({ok:true,league:"nba",events:[e]},fx);
 assert.equal(m.ok,true);
 const summary={ok:true,source:"ESPN_MATCH_SUMMARY",league:"nba",eventId:e.id,
  eventDate:e.date,
  headerTeams:[{homeAway:"home",name:englishH,teamId:"7"},
   {homeAway:"away",name:englishA,teamId:"8"}],
  rosters:[{homeAway:"home",name:englishH,teamId:"7",starters:["A","B","C","D","E"]},
   {homeAway:"away",name:englishA,teamId:"8",starters:["F","G","H","I","J"]}]};
 assert.equal(parseEspnPregameXi(summary,fx,{...m,league:"nba"},T).status,"CONFIRMED");
 assert.equal(parseEspnPregameXi(summary,fx,{...m,league:"nba"},startMs).status,"REJECTED");
 assert.equal(parseEspnPregameXi({...summary,rosters:[]},fx,{...m,league:"nba"},T).status,"UNAVAILABLE");
});

test("24h overdue rows explicitly identify unsupported ESPN coverage and upstream outages",()=>{
 const j2=row("j2"),nba=row("nba","농구","NBA",T-30*H);
 j2.checkReason="NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN";
 nba.checkReason="ESPN_FAST:ESPN_EXACT_IDENTITY_NOT_PROVEN | NAVER_FAST:NAVER_DIRECT_NETWORK";
 const future=row("future","축구","일본 J2리그",T+2*H);
 const before=row("still-young","농구","NBA",T-4*H);
 const state={records:[j2,nba,future,before]};
 const q=diagnoseDataQuality(state,T);
 assert.equal(q.overdue24h,2);
 assert.equal(q.byReason.NAVER_SOURCE_OUTAGE,1);
 assert.equal(q.byReason.ESPN_EXACT_IDENTITY_MISSING,1);
 assert.equal(q.byProvider.ESPN_SUPPORTED,1);
 assert.equal(q.byProvider.JLEAGUE_OFFICIAL_J2_SUPPORTED,1);
 assert.equal(q.byLeague["일본 J2리그"],1);
 assert.equal(q.bySport["농구"],1);
 assert.equal(projection(state,T).qualityAudit.overdue24h,2);
 assert.equal(espnLeague(j2),null);
});

test("NBA diagnostics distinguish unpublished, unmatched, unqueried, and real 5+5",()=>{
 const pair=(key,extras={})=>({...row(key,"농구","NBA",T-3*H),...extras});
 const rows=[
  pair("not-yet"),
  pair("missing",{lineup:{status:"UNAVAILABLE",attempts:2,
    lastError:"ESPN_NBA_STARTERS_NOT_PUBLISHED"}}),
  pair("identity",{lineup:{status:"UNAVAILABLE",attempts:1,
    lastError:"ESPN_EXACT_IDENTITY_NOT_PROVEN"}}),
  pair("legacy",{lineup:{status:"UNSUPPORTED",attempts:1,
    reason:"NO_VERIFIED_PREGAME_LINEUP_PROVIDER"}})
 ];
 const r=diagnoseDataQuality({records:rows},T);
 assert.equal(r.nbaPast,4);
 assert.equal(r.nbaPregame.NO_PREGAME_ATTEMPT_RECORDED,1);
 assert.equal(r.nbaPregame.NBA_STARTERS_UNPUBLISHED,1);
 assert.equal(r.nbaPregame.ESPN_IDENTITY_UNCONFIRMED,1);
 assert.equal(r.nbaPregame.LEGACY_NO_PROVIDER,1);
 assert.equal(nbaPregameFailureCategory(rows[2]),"ESPN_IDENTITY_UNCONFIRMED");
});

test("a failing Naver-only K3 date gets two probes, not 24 repeated skipped audits",()=>{
 const failed=Array.from({length:30},(_,i)=>({...row("dom-"+i,"축구","K리그3"),
  home:"H"+i,checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"}));
 const selected=selectFinalAuditRows({records:failed},T,24);
 assert.equal(selected.length,2);
 assert.equal(new Set(selected.map(x=>x.key)).size,2);
 assert.ok(selected.every(isNaverOnlyOutage));
 const healthy=failed.map(r=>({...r,checkReason:"WAITING_FOR_END"}));
 assert.equal(selectFinalAuditRows({records:healthy},T,24).length,24);
});
test("Naver outage cap does not throttle independent ESPN or other healthy groups",()=>{
 const bad=Array.from({length:12},(_,i)=>({...row("bad-"+i,"축구","K리그3"),
  checkReason:"NAVER_FAST:NAVER_DIRECT_NETWORK:TimeoutError"}));
 const healthy=Array.from({length:12},(_,i)=>({...row("healthy-"+i,"축구","일본 J3리그",T-34*H),
  home:"H"+i,checkReason:"WAITING_FOR_END",startMs:T-35*H}));
 const supported=Array.from({length:25},(_,i)=>({...row("espn-"+i,"농구","NBA",T-31*H),
  checkReason:"ESPN_FAST:ESPN_EXACT_IDENTITY_NOT_PROVEN"}));
 const result=selectFinalAuditRows({records:[...bad,...healthy,...supported]},T,24);
 assert.equal(result.length,24);
 assert.equal(result.filter(r=>r.league==="NBA").length,16);
 assert.equal(result.filter(r=>r.key.startsWith("bad-")).length<=2,true);
 assert.equal(result.filter(r=>r.key.startsWith("healthy-")).length>=6,true);
});
test("24h overdue takes turns with genuinely recently ended games ahead of 12h mid backlog",()=>{
 const recent=Array.from({length:6},(_,i)=>row("recent-"+i,"축구","잉글랜드 챔피언십",T-5*H));
 const medium=Array.from({length:6},(_,i)=>row("mid-"+i,"축구","잉글랜드 챔피언십",T-17*H));
 const overdue=Array.from({length:6},(_,i)=>row("old-"+i,"축구","잉글랜드 챔피언십",T-29*H));
 const result=selectFinalAuditRows({records:[...medium,...recent,...overdue]},T,10);
 assert.equal(result.length,10);
 assert.ok(result.slice(0,6).filter(r=>r.key.startsWith("old-")).length>=3);
 assert.ok(result.slice(0,6).filter(r=>r.key.startsWith("recent-")).length>=2);
 assert.equal(result.slice(0,6).filter(r=>r.key.startsWith("mid-")).length,0);
});
test("circuit-only defer never inflates actual FINAL checks or overwrites source evidence",()=>{
 const fixture={...row("j2"),resultChecks:19,lastResultCheckAt:T-2*H,
  checkReason:"NAVER_FAST:NAVER_DIRECT_NETWORK:TimeoutError"};
 const before={records:[fixture]};
 const after=deferFinalWithoutProvider(before,fixture.key,"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN",T);
 assert.equal(after.records[0].resultChecks,19);
 assert.equal(after.records[0].lastResultCheckAt,T-2*H);
 assert.equal(after.records[0].checkReason,fixture.checkReason);
 assert.equal(after.records[0].lastResultDeferredAt,T);
 assert.equal(after.records[0].resultDeferredCount,1);
 assert.equal(before.records[0].lastResultDeferredAt,undefined);
 const settled=mergeProviderFinal(after,fixture.key,{
  ok:false,waitReason:"NAVER_FINAL_STATUS_UNCONFIRMED"},T+M);
 assert.equal(settled.records[0].verdict,"PENDING");
 assert.equal(settled.records[0].resultChecks,20);
});
test("dashboard labels overdue, failed provider query and NBA proof without fabricating final",async()=>{
 const {readFile}=await import("node:fs/promises");
 const page=await readFile(new URL("../../WisetotoAnalyzer-LiveFree/src/app/automation/page.tsx",import.meta.url),"utf8");
 assert.match(page,/데이터 품질 감사/);
 assert.match(page,/nbaPregame/);
 assert.match(page,/naverFailedRows/);
 assert.match(page,/실제 조회 없이 보류/);
});
