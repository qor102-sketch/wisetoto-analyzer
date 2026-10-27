import test from "node:test";import assert from "node:assert/strict";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection} from "./collect-first.mjs";
const T=Date.parse("2026-10-27T00:00:00Z"),M=60000;
const g=(sport="soccer",min=25,odds=true)=>({sport,league:"TEST",home:"Home FC",away:"Away FC",
 gameDateMs:T+min*M,fixtureId:3456,markets:odds?[{betName:"승패",selections:[{side:"win",odds:1.8}]}]:[]});
test("the 30m-to-kickoff window collects all four sports, even without odds",()=>{
 const rows=["soccer","basketball","baseball","volleyball"].map((s,i)=>({...g(s,25-i),fixtureId:100+i}));
 rows[3].markets=[];
 const c=collect({schema:SCHEMA,records:[]},{ok:true,games:[...rows,g("soccer",31),g("soccer",-1)]},T);
 assert.equal(c.summary.window,4);assert.equal(c.summary.new,4);assert.equal(c.summary.noOdds,1);
 assert.equal(c.state.records.length,4);assert.equal(projection(c.state,T).counts.collected,4);
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
