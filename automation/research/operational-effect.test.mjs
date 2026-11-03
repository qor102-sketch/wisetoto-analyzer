import test from "node:test";
import assert from "node:assert/strict";
import {recordOperationalEffect,effectTotals,publicOperationalEffect,EFFECT_SCHEMA} from "./operational-effect.mjs";
import {mergeProviderFinal,projection} from "./collect-first.mjs";
import {rotateArchive} from "./archive-collection.mjs";

const MIN=60_000,DAY=86_400_000;
const T=Date.parse("2026-11-03T11:00:00.000Z");
const nba=(key,start=T-4*3600_000,more={})=>({
 key,sport:"농구",league:"NBA",home:"Boston Celtics",away:"Chicago Bulls",
 startMs:start,firstSeenAt:start-3600_000,pregameCapturedAt:start-20*MIN,
 firstOddsAt:start-20*MIN,odds:[{odds:1.85}],latestOdds:[],
 verdict:"PENDING",resultSource:null,fixtureId:null,lineup:null,
 ...more
});
const xi=start=>({status:"CONFIRMED",capturedAt:start-2*MIN,
 homeCount:5,awayCount:5,home:["B1","B2","B3","B4","B5"],
 away:["C1","C2","C3","C4","C5"],reason:"ESPN_VERIFIED_PREGAME_NBA_STARTERS",
 lastAttemptAt:start-2*MIN,attempts:3});
const context=(before,finish=T)=>({
 beforeTotals:effectTotals(before),priorLedgerAt:T-20*MIN,
 startedAt:finish-2*MIN,finishedAt:finish,runId:"123-"+finish,
 commit:"dee07394a116",sourceFresh:true,
 lineupSummary:{attempted:1,confirmed:1,nbaAttempted:1,nbaConfirmed:1,
  nbaFocusedRechecks:1,nbaFocusedRecovered:1,
  reasonCounts:{ESPN_VERIFIED_PREGAME_NBA_STARTERS:1}},
 finalSummary:{checked:1,confirmed:1,waitReasons:{},
  confirmedBySource:{ESPN:1},selectedBySport:{"농구":1},
  naverUpstreamFailures:0,naverOutageSkipped:0},
 backlog:{future:0,dueNow:0,coolingDown:0,overdueSixHours:0,overdue24Hours:0}
});

test("first measured run uses restored ledger as baseline, not synthetic historical PRE",()=>{
 const r=nba("nba-a"),before={schema:"wisetoto-collect-first-v1",records:[r]};
 const valid=mergeProviderFinal(before,r.key,{ok:true,finalConfirmed:true,source:"ESPN",
  gameId:"401909500",result:{homeScore:107,awayScore:99}},T-1000);
 const after={...valid,lastFeedOk:true,lastCaptureSummary:{listed:50,window:1,new:0},
  records:[{...valid.records[0],lineup:xi(r.startMs)}]};
 const monitored=recordOperationalEffect(after,context(before));
 const o=publicOperationalEffect(monitored),p=projection(monitored,T);
 assert.equal(o.schema,EFFECT_SCHEMA);
 assert.equal(o.baseline.at,T-20*MIN);
 assert.equal(o.baseline.origin,"PERSISTED_LEDGER_BEFORE_FIRST_MEASURED_SCAN");
 assert.equal(o.baseline.totals.verified,0);
 assert.equal(o.baseline.totals.nba5v5Confirmed,0);
 assert.equal(o.latest.totals.verified,1);
 assert.equal(o.latest.totals.pregameOdds,1);
 assert.equal(o.latest.totals.verifiedWithPregameOdds,1);
 assert.equal(o.latest.totals.nba5v5Confirmed,1);
 assert.equal(o.delta.verified,1);
 assert.equal(o.delta.nba5v5Confirmed,1);
 assert.equal(o.latest.lineup.nbaAttempted,1);
 assert.equal(o.latest.final.newVerified,1);
 assert.equal(o.latest.final.confirmedBySource.ESPN,1);
 assert.equal(o.historySize,1);
 assert.equal(p.operationalEffect.latest.totals.nba5v5Confirmed,1);
 assert.equal(p.counts.verified,1);
 assert.equal(before.records[0].lineup,null);
 assert.equal(before.records[0].verdict,"PENDING");
});

test("provider outage preserves PENDING, no fabricated 5+5 or FINAL measured",()=>{
 const r=nba("pending");
 const before={schema:"wisetoto-collect-first-v1",records:[r]};
 const failed=mergeProviderFinal(before,r.key,{ok:false,waitReason:"NAVER_504"},T);
 const state={...failed,lastFeedOk:false,lastFeedError:"source offline",
  lastCaptureSummary:{listed:88,window:5,new:5,missingIdentity:3},
  records:[{...failed.records[0],lineup:{
   status:"UNAVAILABLE",reason:"ESPN_NBA_STARTERS_NOT_PUBLISHED",
   lastAttemptAt:T-4*3600_000,attempts:2}}]};
 const details={...context(before),sourceFresh:false,
  lineupSummary:{attempted:1,confirmed:0,nbaAttempted:1,nbaConfirmed:0,
   reasonCounts:{ESPN_NBA_STARTERS_NOT_PUBLISHED:1}},
  finalSummary:{checked:1,confirmed:0,waitReasons:{NAVER_FAST:1},
   naverUpstreamFailures:1,naverOutageSkipped:0}};
 const monitored=recordOperationalEffect(state,details);
 const report=publicOperationalEffect(monitored);
 assert.equal(report.latest.sourceFresh,false);
 assert.equal(report.latest.capture.captured,0);
 assert.equal(report.latest.capture.listed,0);
 assert.equal(report.latest.capture.inThirtyMinuteWindow,0);
 assert.equal(report.latest.capture.missingIdentity,0);
 assert.equal(report.latest.totals.verified,0);
 assert.equal(report.latest.totals.nba5v5Confirmed,0);
 assert.equal(report.latest.final.newVerified,0);
 assert.equal(report.latest.final.waitReasons.NAVER_FAST,1);
 assert.equal(report.current.nbaLineupReasons.ESPN_NBA_STARTERS_NOT_PUBLISHED,1);
 assert.equal(state.records[0].verdict,"PENDING");
});

test("NBA completion requires explicit 5+5 distinct PRE evidence; late or partial claims excluded",()=>{
 const start=T+MIN;
 const good=nba("valid",start,{lineup:xi(start)});
 const late=nba("late",start,{lineup:{...xi(start),capturedAt:start+MIN}});
 const four=nba("four",start,{lineup:{...xi(start),awayCount:4,away:["C1","C2","C3","C4"]}});
 const unreliable=nba("unreliable",start,{lineup:{...xi(start),status:"UNAVAILABLE"}});
 const state={records:[good,late,four,unreliable]};
 assert.equal(effectTotals(state).nba5v5Confirmed,1);
 assert.equal(effectTotals(state).pregameOdds,4);
});

test("same run ID is deduplicated; baseline survives later code revisions and 144 scans cap",()=>{
 const r=nba("nba-1"),prior={records:[r]},pre=effectTotals(prior);
 let state={...prior,lastFeedOk:true,lastCaptureSummary:{listed:1,window:0,new:0}};
 const firstOpts={...context(prior),beforeTotals:pre,runId:"run-once",commit:"revision-a"};
 state=recordOperationalEffect(state,firstOpts);
 assert.equal(state.operationalEffect.history.length,1);
 state=recordOperationalEffect(state,{...firstOpts,commit:"revision-b",finishedAt:T+1000});
 assert.equal(state.operationalEffect.history.length,1);
 assert.equal(state.operationalEffect.latest.commit,"revision-b");
 for(let i=0;i<160;i++){
  const before=effectTotals(state);
  state=recordOperationalEffect(state,{...firstOpts,runId:"run-"+i,
   startedAt:T+i*MIN,finishedAt:T+i*MIN+1000,beforeTotals:before,commit:"revision-"+i});
 }
 assert.equal(state.operationalEffect.history.length,144);
 assert.equal(state.operationalEffect.baseline.totals.pregameOdds,1);
 assert.equal(state.operationalEffect.latest.commit,"revision-159");
 assert.equal(publicOperationalEffect(state).recentScans.length,12);
 assert.equal(state.operationalEffect.delta.verified,0);
});

test("rollover preserves extra odds and NBA starter counters without rewriting archived games",async()=>{
 const now=T+155*DAY,start=now-150*DAY;
 const r=nba("old",start,{verdict:"VERIFIED",lineup:xi(start)});
 const before={records:[r]};
 const archive=new Map();
 const moved=await rotateArchive({state:before,now,
  getRemote:async id=>archive.has(id)?{state:archive.get(id),sha:"prior"}:null,
  putRemote:async(id,gz)=>{
   const {gunzipSync}=await import("node:zlib");
   archive.set(id,JSON.parse(gunzipSync(gz).toString("utf8")));
  }});
 assert.equal(moved.moved,1);
 assert.equal(moved.state.records.length,0);
 assert.equal(moved.state.archiveCounts.pregameOdds,1);
 assert.equal(moved.state.archiveCounts.verifiedWithPregameOdds,1);
 assert.equal(moved.state.archiveCounts.nba5v5Confirmed,1);
 assert.equal(effectTotals(moved.state).nba5v5Confirmed,1);
 assert.equal(effectTotals(moved.state).verified,1);
});

test("public output is bounded and never leaks raw odds, full lineups or frozen picks",()=>{
 const r=nba("future",T+3600_000);
 const before={records:[r]},state={...before,lastFeedOk:true};
 const result=publicOperationalEffect(recordOperationalEffect(state,context(before)));
 const encoded=JSON.stringify(result);
 assert.equal(result.latest.totals.verified,0);
 assert.equal(result.latest.totals.nba5v5Confirmed,0);
 assert.equal(result.latest.final.newVerified,0);
 assert.ok(!encoded.includes("Boston Celtics"));
 assert.ok(!encoded.includes("Chicago Bulls"));
 assert.ok(!encoded.includes("odds:1.85"));
 assert.ok(!encoded.includes("top1"));
});

test("dashboard shows first measured scan, NBA 5+5 and postmatch source failures",async()=>{
 const {readFile}=await import("node:fs/promises");
 const page=await readFile(new URL("../../WisetotoAnalyzer-LiveFree/src/app/automation/page.tsx",import.meta.url),"utf8");
 assert.match(page,/실측 운영 효과/);
 assert.match(page,/nba5v5Confirmed/);
 assert.match(page,/nbaFocusedRechecks/);
 assert.match(page,/naverUpstreamFailures/);
 assert.match(page,/recentScans/);
});

test("one-scan evidence loss is flagged even if the monitor baseline is still lower",()=>{
 const r=nba("one"),s1={records:[],lastFeedOk:true};
 const stateA={records:[r],lastFeedOk:true};
 const monitored=recordOperationalEffect(stateA,context(s1));
 assert.equal(monitored.operationalEffect.delta.collected,1);
 const stateB={...monitored,records:[]};
 const decreased=recordOperationalEffect(stateB,{...context(monitored,T+MIN),
  beforeTotals:effectTotals(monitored),runId:"declining-1"});
 assert.equal(decreased.operationalEffect.delta.collected,0);
 assert.equal(decreased.operationalEffect.latest.changes.collected,-1);
 assert.ok(decreased.operationalEffect.regressions.includes("collected"));
});

test("late 5+5 source response during focused recheck cannot inflate recovered counters",async()=>{
 const {collectLineupSnapshots}=await import("./pregame-lineup.mjs");
 let clock=T-8*MIN,summaryCalls=0;
 const game=nba("nba-time-sensitive",T);
 const event={id:"401909500",date:new Date(T).toISOString(),
  competitors:[{homeAway:"home",name:"Boston Celtics",teamId:"2"},
   {homeAway:"away",name:"Chicago Bulls",teamId:"4"}]};
 const roster={ok:true,source:"ESPN_MATCH_SUMMARY",league:"nba",eventId:event.id,
  eventDate:new Date(T).toISOString(),
  headerTeams:[{homeAway:"home",name:"Boston Celtics",teamId:"2"},
   {homeAway:"away",name:"Chicago Bulls",teamId:"4"}],
  rosters:[{homeAway:"home",name:"Boston",teamId:"2",starters:["B1","B2","B3","B4","B5"]},
   {homeAway:"away",name:"Chicago",teamId:"4",starters:["C1","C2","C3","C4","C5"]}]};
 const out=await collectLineupSnapshots({records:[game]},{
  now:()=>clock,base:"https://preview.local",
  sleepFn:async()=>{clock=T-20_000;},
  fetcher:async url=>{
   if(url.includes("/scoreboard?"))return {ok:true,status:200,json:async()=>({ok:true,league:"nba",events:[event]})};
   summaryCalls++;
   if(summaryCalls===2)clock=T+MIN;
   return {ok:true,status:200,json:async()=>summaryCalls===1?{...roster,rosters:[]}:roster};
  }
 });
 assert.equal(summaryCalls,2);
 assert.equal(out.summary.nbaFocusedRechecks,1);
 assert.equal(out.summary.nbaFocusedRecovered,0);
 assert.equal(out.summary.nbaConfirmed,0);
 assert.equal(out.state.records[0].lineup.status,"UNAVAILABLE");
 assert.equal(out.state.records[0].lineup.capturedAt,undefined);
});
