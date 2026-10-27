import test from "node:test";import assert from "node:assert/strict";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection,verifiedNaverFinal} from "./collect-first.mjs";
const T=Date.parse("2026-10-27T00:00:00Z"),M=60000;
const g=(sport="soccer",min=25,odds=true)=>({sport,league:"TEST",home:"Home FC",away:"Away FC",
 gameDateMs:T+min*M,fixtureId:3456,markets:odds?[{betName:"승패",selections:[{side:"win",odds:1.8}]}]:[]});
test("the 30m-to-kickoff window collects all four sports, even without odds",()=>{
 const rows=["soccer","basketball","baseball","volleyball"].map((s,i)=>({...g(s,25-i),fixtureId:100+i}));
 rows[3].markets=[];
 const c=collect({schema:SCHEMA,records:[]},{ok:true,games:[...rows,g("soccer",31),g("soccer",-1)]},T);
 assert.equal(c.summary.window,4);assert.equal(c.summary.new,4);assert.equal(c.summary.noOdds,1);
 assert.equal(c.state.records.length,6);assert.equal(projection(c.state,T).counts.collected,6);
 assert.equal(projection(c.state,T).counts.pregameCaptured,4);
 assert.equal(projection(c.state,T).counts.resultOnly,1);
});
test("repeat scans retain first capture and fixture identity; no kickoff retro capture",()=>{
 const init={schema:SCHEMA,records:[]};
 const first=collect(init,{ok:true,games:[g()]},T).state;
 const next=collect(first,{ok:true,games:[g()]},T+10*M).state;
 assert.equal(next.records.length,1);assert.equal(next.records[0].firstSeenAt,T);
 assert.equal(next.records[0].seenCount,2);
 assert.equal(collect(init,{ok:true,games:[g()]},T+26*M).summary.new,0);
});
test("only verified independent final is attached, never a raw score or volleyball 2:2",()=>{
 const f=collect({schema:SCHEMA,records:[]},{ok:true,games:[g("volleyball")]},T).state;
 const key=f.records[0].key,now=T+4*3600000;
 assert.equal(dueResults(f,now).length,1);
 let check=mergeProviderFinal(f,key,{ok:true,result:{homeScore:3,awayScore:0}},now);
 assert.equal(check.records[0].verdict,"PENDING");
 check=mergeProviderFinal(f,key,{ok:true,finalConfirmed:true,result:{homeScore:2,awayScore:2}},now);
 assert.equal(check.records[0].verdict,"PENDING");
 check=mergeProviderFinal(f,key,{ok:true,finalConfirmed:true,result:{homeScore:3,awayScore:2}},now);
 assert.equal(check.records[0].verdict,"VERIFIED");assert.deepEqual(check.records[0].final,{homeScore:3,awayScore:2});
});
test("correctly matched verified tracker result can settle; invalid cannot",()=>{
 const st=collect({schema:SCHEMA,records:[]},{ok:true,games:[g()]},T).state,now=T+4*3600000;
 let v=settlement(st,[{sport:"축구",home:"Home FC",away:"Away FC",startMs:T+25*M,
  verificationStatus:"VERIFIED",verifiedAt:now, result:{homeScore:2,awayScore:1}}],now);
 assert.equal(v.settled,1);assert.equal(v.state.records[0].verdict,"VERIFIED");
 v=settlement(st,[{sport:"축구",home:"Home FC",away:"Away FC",startMs:T+25*M,
  verificationStatus:"PENDING",verifiedAt:now,result:{homeScore:2,awayScore:1}}],now);
 assert.equal(v.settled,0);
});
test("a provider rate-limit checkpoint respects a 60 minute backoff",()=>{
 const st=collect({schema:SCHEMA,records:[]},{ok:true,games:[g()]},T).state,now=T+4*3600000;
 const checked=mergeProviderFinal(st,st.records[0].key,{error:"HTTP 429"},now);
 assert.equal(dueResults(checked,now+10*M).length,0);
 assert.equal(dueResults(checked,now+61*M).length,1);
});

test("ID-less fixtures are not lost and Naver requires exact completed match",()=>{
 const input={...g("soccer"),fixtureId:null};
 const state=collect({schema:SCHEMA,records:[]},{ok:true,games:[input]},T).state;
 assert.equal(state.records[0].fixtureId,null);
 assert.equal(dueResults(state,T+3*3600000).length,1);
 const invalid=[
  {ok:true,completed:false,gameId:"a",finalScore:{home:2,away:1}},
  {ok:true,completed:true,partial:true,gameId:"a",finalScore:{home:2,away:1}},
  {ok:true,completed:true,gameId:null,finalScore:{home:2,away:1}},
  {ok:true,completed:true,gameId:"a",finalScore:{home:null,away:1}}
 ];
 assert.ok(invalid.every(x=>verifiedNaverFinal(x).ok===false));
 const final=verifiedNaverFinal({ok:true,completed:true,gameId:"20261027FOOTBALL",
   finalScore:{home:2,away:1}});
 const settled=mergeProviderFinal(state,state.records[0].key,final,T+3*3600000);
 assert.equal(settled.records[0].verdict,"VERIFIED");
});
test("workflow persists the ledger before heavy PRE and gates prediction on verified outcomes",async()=>{
 const {readFile}=await import("node:fs/promises");
 const w=await readFile(new URL("../../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 const a=w.indexOf("Capture 30-minute fixtures and reconcile verified results without browser");
 const b=w.indexOf("Run exact production model and verify results");
 assert.ok(a>0&&b>a);
 assert.match(w,/collect-first-state\.json\.gz/);
 assert.match(w,/collect-first-public\.json/);
 assert.match(w,/prediction_ready == 'true'/);
});

test("a fixture listed days ahead becomes an authentic pregame capture only after entering 30 minutes",()=>{
 const distant=g("soccer",90);
 const first=collect({schema:SCHEMA,records:[]},{ok:true,games:[distant]},T);
 assert.equal(first.summary.discovered,1);
 assert.equal(first.summary.window,0);
 assert.equal(first.state.records[0].pregameCapturedAt,null);
 assert.equal(first.state.records[0].odds.length,0);
 const near=collect(first.state,{ok:true,games:[distant]},T+65*M);
 assert.equal(near.summary.new,1);
 assert.equal(near.state.records[0].pregameCapturedAt,T+65*M);
 assert.ok(near.state.records[0].odds.length>0);
 const late=collect(first.state,{ok:true,games:[distant]},T+92*M);
 assert.equal(late.summary.new,0);
 assert.equal(late.state.records[0].pregameCapturedAt,null);
 assert.equal(projection(late.state,T+92*M).counts.resultOnly,1);
});
test("result-only discoveries may settle but do not count as valid pregame training",()=>{
 const game=g("basketball",-60);
 const resultOnly=collect({schema:SCHEMA,records:[]},{ok:true,games:[game]},T).state;
 assert.equal(resultOnly.records[0].pregameCapturedAt,null);
 assert.equal(resultOnly.records[0].odds.length,0);
 const after=mergeProviderFinal(resultOnly,resultOnly.records[0].key,
   {ok:true,finalConfirmed:true,result:{homeScore:102,awayScore:99}},T+120*M);
 assert.equal(after.records[0].verdict,"VERIFIED");
 assert.equal(projection(after,T+120*M).counts.verified,1);
 assert.equal(projection(after,T+120*M).counts.verifiedWithPregame,0);
});
test("repeat reads of the same feed timestamp cannot inflate independent observations",()=>{
 const match=g("soccer",25);
 const initial=collect({schema:SCHEMA,records:[]},{ok:true,games:[match]},T);
 const duplicated=collect(initial.state,{ok:true,games:[match]},T+M,T);
 assert.equal(duplicated.state.records[0].seenCount,1);
 assert.equal(duplicated.state.records[0].firstSeenAt,T);
});
