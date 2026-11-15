import test from "node:test";
import assert from "node:assert/strict";
import {
  NAVER_LINEUP_CIRCUIT_SCHEMA,
  NAVER_LINEUP_RECOVERY_MS,
  NAVER_LINEUP_URGENT_PROBE_MS,
  naverLineupCircuitGroup,
  restoreNaverLineupCircuit,
  naverLineupProbeGate,
  recordNaverLineupAttempt,
  isNaverLineupTransientFailure,
} from "./naver-lineup-circuit.mjs";
import { collectLineupSnapshots } from "./pregame-lineup.mjs";

const T = Date.parse("2026-11-15T00:00:00Z");
const M = 60_000;
const mkRow = (key, {sport="축구",league="K리그1",startMs=T+170*M} = {}) => ({
  key,sport,league,home:"Home",away:"Away",startMs,verdict:"PENDING",
  pregameCapturedAt:T,fixtureId:null,odds:[],latestOdds:[],
});
const fail502 = async () => ({ ok:false,status:502,json:async()=>({ok:false}) });
const freshFootballXi = () => ({
  ok:true,gameId:"source-verified-170",
  footballIdentity:{valid:true},
  footballPlayers:{startingHome:11,startingAway:11},
  game:{gameDateTime:new Date(T+170*M).toISOString()},
  home:Array.from({length:11},(_,i)=>({name:"H "+i})),
  away:Array.from({length:11},(_,i)=>({name:"A "+i})),
});

test("circuit scopes an outage to stable provider categories, never NBA/ESPN",()=>{
  assert.equal(naverLineupCircuitGroup(mkRow("k")),"football:kfootball");
  assert.equal(naverLineupCircuitGroup(mkRow("j",{league:"J리그2"})),"football:jfootball");
  assert.equal(naverLineupCircuitGroup(mkRow("international",{league:"잉글랜드 프리미어리그"})),"football:wfootball");
  assert.equal(naverLineupCircuitGroup(mkRow("kbo",{sport:"야구",league:"KBO"})),"baseball:kbaseball");
  assert.equal(naverLineupCircuitGroup(mkRow("npb",{sport:"야구",league:"NPB"})),"baseball:npb");
  assert.equal(naverLineupCircuitGroup(mkRow("mlb",{sport:"야구",league:"MLB"})),"baseball:mlb");
  assert.equal(naverLineupCircuitGroup(mkRow("nba",{sport:"농구",league:"NBA"})),null);
  assert.equal(naverLineupCircuitGroup(mkRow("wkbl",{sport:"농구",league:"WKBL"})),null);
});

test("transient failures are precise; a verified-source refusal is not network outage",()=>{
  for(const reason of [
    "LINEUP_NETWORK:TimeoutError", "LINEUP_UPSTREAM_UNAVAILABLE",
    "LINEUP_HTTP_502", "LINEUP_HTTP_503", "LINEUP_HTTP_504", "LINEUP_HTTP_429"
  ])assert.equal(isNaverLineupTransientFailure(reason),true,reason);
  for(const reason of ["LINEUP_HTTP_404","EXACT_PROVIDER_LINEUP_NOT_AVAILABLE",
    "FOOTBALL_FIXTURE_IDENTITY_UNCONFIRMED","VERIFIED_PREGAME_LINEUP",
    "LINEUP_HTTP_400"])assert.equal(isNaverLineupTransientFailure(reason),false,reason);
});

test("two source failures are persisted, six scans skip, one recovery probe reopens",async()=>{
  let calls=0;
  const offline=async()=>{calls++;return fail502();};
  const start={records:["a","b","c"].map(k=>mkRow(k))};
  const first=await collectLineupSnapshots(start,{now:()=>T,fetcher:offline,limit:12});
  assert.equal(calls,2,"no more than two failures in the first scan");
  assert.equal(first.summary.naverFailures,2);
  assert.equal(first.summary.naverSkipped,1);
  assert.equal(first.state.naverLineupCircuit.schema,NAVER_LINEUP_CIRCUIT_SCHEMA);
  assert.equal(first.state.naverLineupCircuit.groups["football:kfootball"].retryAt,T+NAVER_LINEUP_RECOVERY_MS);
  assert.equal(first.state.records[2].lineup,undefined,"skip must not fabricate an attempt");
  const restored=JSON.parse(JSON.stringify(first.state)); // actual GitHub compressed-ledger roundtrip

  calls=0;
  const blocked=await collectLineupSnapshots(restored,{now:()=>T+10*M,fetcher:offline,limit:12});
  assert.equal(calls,0,"new scan must not retry during an outage");
  assert.equal(blocked.summary.naverPersistentSkipped,1);
  assert.equal(blocked.state.records[2].lineup,undefined);
  assert.equal(blocked.state.records[2].pregameCapturedAt,T);
  assert.equal(blocked.state.records[2].verdict,"PENDING");
  assert.equal(blocked.state.records[2].startMs,T+170*M);

  calls=0;
  const due=await collectLineupSnapshots(JSON.parse(JSON.stringify(blocked.state)),
    {now:()=>T+61*M,fetcher:offline,limit:12});
  assert.equal(calls,1,"a half-open category gets exactly one recovery probe");
  assert.equal(due.summary.naverRecoveryProbes,1);
  assert.equal(due.state.naverLineupCircuit.groups["football:kfootball"].failures>=2,true);
  assert.equal(due.state.naverLineupCircuit.groups["football:kfootball"].retryAt,T+121*M,
    "a failed recovery after 60 minutes must re-open the circuit");

  calls=0;
  const healthy=await collectLineupSnapshots(JSON.parse(JSON.stringify(due.state)),{
    now:()=>T+122*M,limit:12,
    fetcher:async()=>{calls++;return {ok:true,status:200,json:async()=>freshFootballXi()};},
  });
  assert.ok(calls>=1,"source recovery must eventually be probed");
  assert.ok(healthy.summary.confirmed>=1,"real verified fixture + 11+11 before kickoff is accepted");
  assert.equal(healthy.state.naverLineupCircuit.groups["football:kfootball"],undefined,
    "recovery must clear the source circuit");
  assert.equal(healthy.state.records[0].verdict,"PENDING","no postmatch result rewrite");
});

test("HTTP 404 from fully disconnected Naver schedule counts as an outage",async()=>{
  let calls=0;
  const disconnected=async()=>{
    calls++;
    return {ok:false,status:404,json:async()=>({
      ok:false,error:"fixture not matched",
      debug:{resolver:{attempts:[{status:null},{status:null}]}}
    })};
  };
  const result=await collectLineupSnapshots(
    {records:["a","b","c"].map(k=>mkRow(k))},
    {now:()=>T,fetcher:disconnected,limit:12},
  );
  assert.equal(calls,2);
  assert.equal(result.summary.naverFailures,2);
  assert.equal(result.state.naverLineupCircuit.groups["football:kfootball"].failures,2);
  assert.equal(result.state.records[0].lineup.lastError,"LINEUP_UPSTREAM_UNAVAILABLE");
});

test("healthy baseball is never silenced by a failing football category",async()=>{
  const circuit=recordNaverLineupAttempt(
    recordNaverLineupAttempt(restoreNaverLineupCircuit(null,T),
      "football:kfootball","LINEUP_NETWORK:blocked",T),
    "football:kfootball","LINEUP_HTTP_502",T+M
  );
  let count=0;
  const row=mkRow("npb",{sport:"야구",league:"NPB"});
  const x=await collectLineupSnapshots({records:[row],naverLineupCircuit:circuit},{
    now:()=>T+10*M,fetcher:async()=>{count++;return {ok:false,status:404,
      json:async()=>({debug:{resolver:{attempts:[{status:200}]}}})};},
  });
  assert.equal(count,1);
  assert.equal(x.summary.naverPersistentSkipped,0);
  assert.equal(x.state.naverLineupCircuit.groups["football:kfootball"].failures,2);
  assert.equal(x.state.records[0].lineup.lastError,"LINEUP_HTTP_404");
});

test("one urgent pregame recovery is allowed after 30m, never every scan",()=>{
  assert.equal(NAVER_LINEUP_URGENT_PROBE_MS,30*M);
  let c=restoreNaverLineupCircuit(null,T);
  c=recordNaverLineupAttempt(c,"football:kfootball","LINEUP_HTTP_502",T);
  c=recordNaverLineupAttempt(c,"football:kfootball","LINEUP_HTTP_504",T+M);
  const group="football:kfootball";
  assert.equal(naverLineupProbeGate(c,group,T+15*M,T+29*M,new Set()).allow,false);
  const urgent=naverLineupProbeGate(c,group,T+32*M,T+45*M,new Set());
  assert.equal(urgent.allow,true);
  assert.equal(urgent.reason,"URGENT_PREGAME");
  assert.equal(naverLineupProbeGate(c,group,T+32*M,T+45*M,new Set([group])).allow,false);
  c=recordNaverLineupAttempt(c,group,"LINEUP_NETWORK:timeout",T+32*M);
  assert.equal(naverLineupProbeGate(c,group,T+40*M,T+48*M,new Set()).allow,false);
});

test("corrupt/future/expired persistent state cannot lock out lineups forever",()=>{
  const valid=recordNaverLineupAttempt(restoreNaverLineupCircuit(null,T),
    "football:kfootball","LINEUP_HTTP_502",T);
  const unknown={...valid,groups:{...valid.groups,
    "football:kfootball":{failures:3,retryAt:T+999*M,
      lastFailureAt:T+100*M,lastAttemptAt:T+100*M},
    "arbitrary:provider":{failures:3,retryAt:T+999*M,lastFailureAt:T,lastAttemptAt:T}}};
  const restored=restoreNaverLineupCircuit(unknown,T);
  assert.deepEqual(restored.groups,{});
  assert.deepEqual(restoreNaverLineupCircuit(valid,T+25*60*M).groups,{});
  assert.equal(naverLineupProbeGate(restored,"football:kfootball",T,T+10*M,new Set()).allow,true);
});


test("ESPN football lookup continues while that Naver provider category is cooling down",async()=>{
  let circuit=restoreNaverLineupCircuit(null,T);
  circuit=recordNaverLineupAttempt(circuit,"football:wfootball","LINEUP_HTTP_502",T);
  circuit=recordNaverLineupAttempt(circuit,"football:wfootball","LINEUP_NETWORK:timeout",T+M);
  const row=mkRow("epl",{league:"잉글랜드 프리미어리그",startMs:T+45*M});
  const urls=[];
  const result=await collectLineupSnapshots({records:[row],naverLineupCircuit:circuit},{
    now:()=>T+10*M,
    fetcher:async url=>{
      urls.push(url);
      return {ok:false,status:503,json:async()=>({ok:false})};
    },
  });
  assert.ok(urls.some(u=>u.includes("/api/espn/scoreboard?")),
    "the independent ESPN path must still be attempted");
  assert.ok(urls.every(u=>!u.includes("/api/naver/lineup?")),
    "an open Naver circuit must suppress only Naver, never ESPN");
  assert.equal(result.summary.naverPersistentSkipped,1);
  assert.match(result.state.records[0].lineup.lastError,/ESPN_/);
  assert.equal(result.state.records[0].verdict,"PENDING");
  assert.equal(result.state.records[0].startMs,T+45*M);
});
