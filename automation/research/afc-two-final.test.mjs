import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,findEspnFixtureEvent,parseEspnFinal,lookupEspnFinal} from "./espn-fast-final.mjs";

const T=Date.parse("2026-11-03T13:45:00Z"),H=3600000;
const fixtures=[
 {key:"eb",sport:"축구",league:"AFC 챔피언스리그2",home:"이스트 벵골",
  away:"알시브 클럽",startMs:T},
 {key:"hussein",sport:"축구",league:"AFC 챔피언스리그2",home:"J알후세인",
  away:"알쇼르타",startMs:Date.parse("2026-11-03T16:00:00Z")}
];
// Names, event IDs, start times, statuses and scores were independently
// observed on 2026-11-05 via official ESPN /afc.cup/scoreboard.
const events=[
 {id:"401912771",date:"2026-11-03T13:45Z",completed:true,
  statusName:"STATUS_FULL_TIME",competitors:[
   {homeAway:"home",name:"East Bengal FC",score:"0"},
   {homeAway:"away",name:"Al-Seeb Club",score:"2"}]},
 {id:"401912770",date:"2026-11-03T16:00Z",completed:true,
  statusName:"STATUS_FULL_TIME",competitors:[
   {homeAway:"home",name:"Al-Hussein SC",score:"0"},
   {homeAway:"away",name:"Al-Shorta SC",score:"3"}]}
];
const source={ok:true,source:"ESPN_SCOREBOARD",league:"afc.cup",events};

test("two independently observed AFC Champions League Two games match exact ESPN event and regulation final",()=>{
 assert.equal(espnLeague(fixtures[0]),"afc.cup");
 assert.equal(espnLeague({...fixtures[0],league:"AFC 챔피언스리그 엘리트"}),"afc.champions");
 for(let i=0;i<fixtures.length;i++){
  const matched=findEspnFixtureEvent(source,fixtures[i]);
  assert.equal(matched.ok,true);
  assert.equal(matched.gameId,events[i].id);
  const result=parseEspnFinal(source,fixtures[i],{now:T+20*H});
  assert.equal(result.ok,true);
  assert.equal(result.gameId,events[i].id);
  assert.equal(result.source,"ESPN");
  assert.deepEqual(result.result,i===0?{homeScore:0,awayScore:2}:{homeScore:0,awayScore:3});
 }
});
test("CL Two source never backfills PRE or verifies wrong identity, state, time or league",()=>{
 const f=fixtures[0],g=events[0],withEvent=e=>({...source,events:[e]});
 for(const p of [
  withEvent({...g,completed:false}),
  withEvent({...g,statusName:"STATUS_IN_PROGRESS"}),
  withEvent({...g,statusName:"STATUS_FINAL_ET"}),
  withEvent({...g,date:new Date(T+3*H).toISOString()}),
  withEvent({...g,competitors:g.competitors.slice().reverse().map((x,i)=>({...x,homeAway:i===0?"home":"away"}))}),
  withEvent({...g,id:"abc"}),
  {...source,league:"afc.champions"},
  {...source,events:[g,{...g,id:"401999999"}]}
 ])assert.equal(parseEspnFinal(p,f,{now:T+10*H}).ok,false);
 assert.equal(parseEspnFinal(source,f,{now:T+H}).ok,false);
});
test("the official same-day CL Two scoreboard is cached while matching two distinct fixtures",async()=>{
 const called=[],cache=new Map();
 const fetchFn=async url=>{
  called.push(url);
  assert.match(url,/\/api\/espn\/scoreboard\?/);
  assert.equal(new URL(url).searchParams.get("league"),"afc.cup");
  return {ok:true,status:200,json:async()=>source};
 };
 for(const f of fixtures){
  const result=await lookupEspnFinal(f,{base:"https://wisetoto-analyzer.vercel.app",
   fetchFn,cache,now:T+20*H});
  assert.equal(result.ok,true,result.waitReason);
 }
 assert.equal(called.length,1);
 assert.equal(cache.size,1);
});
test("production proxy explicitly whitelists independent afc.cup, not all soccer leagues",async()=>{
 const {readFile}=await import("node:fs/promises");
 const route=await readFile(new URL("../../WisetotoAnalyzer-LiveFree/src/app/api/espn/scoreboard/route.ts",import.meta.url),"utf8");
 assert.match(route,/"afc\.cup":\["soccer","afc\.cup"\]/);
 assert.match(route,/INVALID_SCOREBOARD_PARAMETERS/);
});
