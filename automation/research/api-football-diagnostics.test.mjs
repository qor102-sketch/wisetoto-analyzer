import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {exactApiFootballFixture,parseApiFootballFinal,createApiFootballSession}
 from "./api-football-free.mjs";
import {safeApiFootballDetail,API_FOOTBALL_DIAGNOSTIC_LIMIT}
 from "./api-football-diagnostics.mjs";

const T=Date.parse("2026-11-21T14:00:00Z"),MIN=60_000;
const key="DO-NOT-LOG-THIS-SYNTHETIC-KEY-1234";
const row={key:"fixture-001",sport:"축구",league:"잉글랜드 프리미어리그",
 home:"리버풀",away:"첼시",startMs:T,verdict:"PENDING"};
const original=()=>({
 fixture:{id:71234,date:new Date(T).toISOString(),status:{short:"FT"}},
 league:{name:"Premier League",country:"England",id:39},
 teams:{home:{id:1,name:"Liverpool"},away:{id:2,name:"Chelsea"}},
 score:{fulltime:{home:2,away:1}},goals:{home:2,away:1}
});
const fixture=f=>({response:[f],errors:[]});
const classify=(f,r=row)=>exactApiFootballFixture(fixture(f),r);
test("safe diagnostic accepts exact Korean/English mapping but never replaces a fixture id",()=>{
 const x=classify(original());
 assert.equal(x.ok,true,JSON.stringify(x));
 assert.equal(x.gameId,"71234");
 assert.equal(x.game.teams.home.name,"Liverpool");
});
test("API league label and country mismatches have separate failure stage",()=>{
 const x=classify({...original(),league:{id:39,name:"Premier League",country:"Japan"}});
 assert.equal(x.ok,false);
 assert.equal(x.reason,"API_FOOTBALL_LEAGUE_MISMATCH");
 assert.equal(x.diagnostic.stage,"LEAGUE");
 assert.equal(x.diagnostic.candidate.country,"Japan");
 const empty=exactApiFootballFixture({response:[]},row);
 assert.equal(empty.reason,"API_FOOTBALL_LEAGUE_NOT_FOUND");
});
test("match time difference is recorded but never silently adjusted",()=>{
 const x=classify({...original(),fixture:{...original().fixture,
  date:new Date(T+90*MIN).toISOString()}});
 assert.equal(x.reason,"API_FOOTBALL_KICKOFF_MISMATCH");
 assert.equal(x.diagnostic.stage,"KICKOFF");
 assert.equal(x.diagnostic.kickoffDeltaMinutes,90);
 assert.equal(x.ok,false);
 const near=classify({...original(),fixture:{...original().fixture,
  date:new Date(T+40*MIN).toISOString()}});
 assert.equal(near.ok,true);
});
test("Korean expected and English actual team-name gaps are categorized per side",()=>{
 const base=original();
 const home=classify({...base,teams:{home:{id:3,name:"Arsenal"},away:base.teams.away}});
 assert.equal(home.reason,"API_FOOTBALL_HOME_TEAM_MISMATCH");
 assert.equal(home.diagnostic.candidate.home,"Arsenal");
 const away=classify({...base,teams:{home:base.teams.home,away:{id:4,name:"Arsenal"}}});
 assert.equal(away.reason,"API_FOOTBALL_AWAY_TEAM_MISMATCH");
 const both=classify({...base,teams:{home:{id:3,name:"Arsenal"},away:{id:4,name:"Tottenham"}}});
 assert.equal(both.reason,"API_FOOTBALL_BOTH_TEAMS_MISMATCH");
 const safe=safeApiFootballDetail(home.reason,"FINAL",home.diagnostic,row);
 assert.equal(safe.stage,"TEAMS");
 assert.equal(safe.expected.home,"리버풀");
 assert.equal(safe.candidate.home,"Arsenal");
 assert.equal(safe.expected.away,"첼시");
});
test("duplicate/ambiguous match IDs and invalid team IDs reject without guessing",()=>{
 const base=original();
 const ambiguous=exactApiFootballFixture({response:[base,{...base,
  fixture:{...base.fixture,id:71235}}]},row);
 assert.equal(ambiguous.reason,"API_FOOTBALL_AMBIGUOUS_FIXTURE");
 const duplicated=exactApiFootballFixture({response:[base,{...base}]},row);
 assert.equal(duplicated.reason,"API_FOOTBALL_DUPLICATE_FIXTURE");
 const invalid=classify({...base,teams:{home:{id:0,name:"Liverpool"},
  away:{id:2,name:"Chelsea"}}});
 assert.equal(invalid.reason,"API_FOOTBALL_INVALID_SOURCE_IDS");
});
test("no score is accepted from postponed, AET, PEN or missing full-time scores",()=>{
 for(const short of ["NS","1H","HT","PST","AET","PEN"]){
  const b=original();b.fixture.status.short=short;
  const x=parseApiFootballFinal(fixture(b),row);
  assert.equal(x.ok,false,short);
  assert.equal(x.waitReason,"API_FOOTBALL_NOT_REGULATION_FINAL");
  assert.equal(x.diagnostic.stage,"STATUS");
  assert.equal(x.diagnostic.candidate.status,short);
 }
 const b=original();b.score.fulltime.home=999;
 const x=parseApiFootballFinal(fixture(b),row);
 assert.equal(x.waitReason,"API_FOOTBALL_FINAL_SCORE_UNCONFIRMED");
 assert.equal(x.diagnostic.stage,"SCORE");
});
test("mismatch samples strip forged logs, URLs, control characters and fake key material",()=>{
 const name="Arsenal\n\u001b[31m https://example.org/"+key;
 const candidate=safeApiFootballDetail("API_FOOTBALL_HOME_TEAM_MISMATCH",
  "FINAL",{stage:"TEAMS",candidate:{
   league:"Premier League",country:"England",home:name,
   away:"Chelsea",status:"FT",id:71234},
   kickoffDeltaMinutes:89.4,leagueCandidates:3800,timeCandidates:2
  },{league:row.league,home:row.home,away:row.away});
 const str=JSON.stringify(candidate);
 assert.ok(!str.includes(key));
 assert.ok(!str.includes("https:"));
 assert.ok(!str.includes("\u001b"));
 assert.ok(candidate.candidate.home.length<=52);
 assert.equal(candidate.kickoffDeltaMinutes,89);
 assert.equal(candidate.leagueCandidates,1500);
});
test("read-only diagnostics collect bounded samples, detailed reasons and no secrets",async()=>{
 const seen=[];
 const session=createApiFootballSession({
  apiKey:key,now:()=>T+2*MIN,
  fetchFn:async (url,opts)=>{
   seen.push({url,headers:opts.headers});
   return {ok:true,status:200,json:async()=>fixture({...original(),
     teams:{home:{id:3,name:"Arsenal"},away:{id:2,name:"Chelsea"}}})};
  }
 });
 for(let i=0;i<15;i++){
  const r={...row,key:"fixture-"+i};
  const res=await session.lookupFinal(r);
  assert.equal(res.ok,false);
  assert.equal(res.waitReason,"API_FOOTBALL_HOME_TEAM_MISMATCH");
 }
 const summary=session.summary(),diagnostics=session.diagnostics();
 assert.equal(seen.length,1,"shared day fixture lookup is cached");
 assert.equal(summary.requests,1);
 assert.equal(summary.failures,0);
 assert.equal(summary.diagnosed,15);
 assert.equal(summary.diagnosticReasons.API_FOOTBALL_HOME_TEAM_MISMATCH,15);
 assert.equal(diagnostics.samples.length,API_FOOTBALL_DIAGNOSTIC_LIMIT);
 assert.equal(diagnostics.samples[0].expected.home,"리버풀");
 assert.equal(diagnostics.samples[0].candidate.home,"Arsenal");
 const logged=JSON.stringify(diagnostics)+JSON.stringify(summary);
 assert.ok(!logged.includes(key));
 assert.ok(!logged.includes("x-apisports-key"));
 assert.ok(!logged.includes("https://"));
 assert.ok(!logged.includes("response"));
 assert.ok(seen.every(x=>!x.url.includes(key)));
 assert.ok(seen.every(x=>x.headers["x-apisports-key"]===key));
});
test("network and quotas are categorized independently without exposing exception details",async()=>{
 const net=createApiFootballSession({apiKey:key,now:()=>T,
  fetchFn:async()=>{throw new Error("private: "+key)}});
 const x=await net.lookupFinal(row);
 assert.ok(x.waitReason.startsWith("API_FOOTBALL_NETWORK:"));
 assert.equal(net.summary().diagnosticReasons.API_FOOTBALL_NETWORK,1);
 assert.equal(net.diagnostics().samples[0].stage,"NETWORK");
 assert.ok(!JSON.stringify(net.diagnostics()).includes(key));
 const quota=createApiFootballSession({apiKey:key,
  rawQuota:{schema:"wisetoto-api-football-free-v1",
   day:new Date(T).toISOString().slice(0,10),requests:60,lastAt:{}},
  now:()=>T,fetchFn:async()=>{throw Error("must not call fetch")}});
 const denied=await quota.lookupFinal(row);
 assert.equal(denied.waitReason,"API_FOOTBALL_LOCAL_QUOTA_BLOCK");
 assert.equal(quota.summary().requests,0);
 assert.equal(quota.diagnostics().samples[0].stage,"QUOTA");
});
test("collector logs only sanitized diagnostic samples and public JSON only aggregate reasons",async()=>{
 const run=await readFile(new URL("./run-collect-first.mjs",import.meta.url),"utf8");
 const operations=await readFile(new URL("./operational-effect.mjs",import.meta.url),"utf8");
 assert.match(run,/API_FOOTBALL_MATCH_DIAGNOSTICS/);
 assert.match(run,/apiFootball\.diagnostics\(\)/);
 assert.match(operations,/apiFootballReasonCounts:smallCounts\(finalSummary\.apiFootball\?\.diagnosticReasons\)/);
});
