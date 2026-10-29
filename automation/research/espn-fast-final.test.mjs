import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,lookupEspnFinal} from "./espn-fast-final.mjs";
const S=Date.parse("2026-10-28T17:30:00Z"),H=3600000;
const fixture={key:"test-seriea",sport:"축구",league:"이탈리아 세리에A",
 home:"AC밀란",away:"볼로냐",startMs:S,fixtureId:null};
function event(extra={}){
 return {id:"401998888",date:new Date(S).toISOString(),
   completed:true,statusName:"STATUS_FINAL",competitors:[
    {homeAway:"home",name:"AC Milan",score:"2"},
    {homeAway:"away",name:"Bologna",score:"1"}],...extra};
}
const payload=events=>({ok:true,source:"ESPN_SCOREBOARD",league:"ita.1",events});
test("real Serie A fixture from user ledger matches exact ESPN translated teams, final and score",()=>{
 assert.equal(espnLeague(fixture),"ita.1");
 const result=parseEspnFinal(payload([event()]),fixture,{now:S+5*H});
 assert.equal(result.ok,true);
 assert.equal(result.source,"ESPN");
 assert.equal(result.finalConfirmed,true);
 assert.equal(result.gameId,"401998888");
 assert.equal(result.sourceEvidence,"ESPN_SCOREBOARD_FINAL");
 assert.deepEqual(result.result,{homeScore:2,awayScore:1});
});
test("ESPN must never settle live, scheduled, cancelled, ambiguous or wrong teams",()=>{
 const options=[
  event({completed:false}),event({statusName:"STATUS_IN_PROGRESS"}),
  event({date:new Date(S+4*H).toISOString()}),
  event({competitors:[{homeAway:"home",name:"Bologna",score:"1"},
    {homeAway:"away",name:"AC Milan",score:"2"}]}),
  event({competitors:[{homeAway:"home",name:"Inter Milan",score:"2"},
    {homeAway:"away",name:"Bologna",score:"1"}]}),
  event({competitors:[{homeAway:"home",name:"AC Milan",score:"abc"},
    {homeAway:"away",name:"Bologna",score:"1"}]}),
  event({competitors:[{homeAway:"home",name:"AC Milan",score:"-1"},
    {homeAway:"away",name:"Bologna",score:"1"}]})
 ];
 for(const e of options)assert.equal(parseEspnFinal(payload([e]),fixture,{now:S+5*H}).ok,false);
 assert.equal(parseEspnFinal(payload([event(),event({id:"401999999"})]),fixture,
   {now:S+5*H}).waitReason,"ESPN_AMBIGUOUS_FIXTURE");
 assert.equal(parseEspnFinal(payload([event()]),fixture,{now:S+H}).ok,false);
 assert.equal(parseEspnFinal({...payload([event()]),league:"eng.1"},fixture,{now:S+5*H}).ok,false);
});
test("NBA Korean team aliases require exact ESPN homeAway, final points and source category",()=>{
 const nba={key:"nba",sport:"농구",league:"NBA",home:"LA 레이커스",
  away:"포틀랜드 트레일블레이저스",startMs:S};
 const g=event({competitors:[{homeAway:"home",name:"Los Angeles Lakers",score:"111"},
   {homeAway:"away",name:"Portland Trail Blazers",score:"108"}]});
 const out=parseEspnFinal({ok:true,league:"nba",events:[g]},nba,{now:S+5*H});
 assert.equal(out.ok,true);assert.deepEqual(out.result,{homeScore:111,awayScore:108});
});
test("KBL/NPB/unknown leagues cannot be mislabeled as ESPN NBA/MLB",()=>{
 for(const sport of ["농구","야구","배구"]){
  const unsupported={...fixture,sport,league:"KBL"};
  assert.equal(espnLeague(unsupported),null);
  assert.equal(parseEspnFinal(payload([event()]),unsupported,{now:S+5*H}).ok,false);
 }
});
test("shared ESPN scoreboard fetch caches 6 due fixtures, never requests direct GitHub ESPN",async()=>{
 const calls=[],cache=new Map();
 const fetchFn=async url=>{
  calls.push(url);
  assert.match(url,/^https:\/\/wisetoto-analyzer\.vercel\.app\/api\/espn\/scoreboard\?/);
  assert.match(url,/league=ita\.1/);
  assert.match(url,/date=20261028/);
  return {ok:true,status:200,json:async()=>payload([event()])};
 };
 for(let i=0;i<6;i++){
  const p=await lookupEspnFinal({...fixture,key:"f"+i},{
   base:"https://wisetoto-analyzer.vercel.app",fetchFn,cache,now:S+5*H});
  assert.equal(p.ok,true);
 }
 assert.equal(calls.length,1);
 assert.equal(cache.size,1);
});
test("ESPN 403/504 and missing data preserve PENDING, do not invent results",async()=>{
 for(const http of [403,504]){
  const p=await lookupEspnFinal(fixture,{
   base:"https://local.test",now:S+5*H,fetchFn:async()=>({ok:false,status:http,
    json:async()=>({ok:false,waitReason:"ESPN_PROVIDER_DOWN"})})});
  assert.equal(p.ok,false);assert.match(p.waitReason,new RegExp(String(http)));
 }
 const p=await lookupEspnFinal(fixture,{
  base:"https://local.test",now:S+5*H,fetchFn:async()=>({ok:true,status:200,
   json:async()=>payload([])})});
 assert.equal(p.ok,false);assert.match(p.waitReason,/ESPN_EXACT_IDENTITY_NOT_PROVEN/);
});

test("soccer penalty/extra-time finals are quarantined from Betman regulation settlement",()=>{
 for(const statusName of ["STATUS_FINAL_PEN","STATUS_FINAL_ET","STATUS_EXTRA_TIME","STATUS_FINAL_AET"]){
  const p=parseEspnFinal(payload([event({statusName})]),fixture,{now:S+5*H});
  assert.equal(p.ok,false);
  assert.equal(p.waitReason,"ESPN_EXTRA_TIME_OR_PENALTIES_REQUIRE_REGULATION_SCORE");
 }
 // An ordinary 90-minute or basketball overtime completed result is distinct.
 assert.equal(parseEspnFinal(payload([event({statusName:"STATUS_FULL_TIME"})]),fixture,{now:S+5*H}).ok,true);
});
