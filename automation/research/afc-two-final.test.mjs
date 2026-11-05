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

test("eight additional November 4 AFC Two real ESPN results have exact Korean Betman identity",()=>{
 const examples=[
  ["멜버른 빅토리","페르십 반둥","Melbourne Victory","Persib Bandung","401912769","07:45",1,2],
  ["FC서울","테꽁 비엣텔","FC Seoul","The Cong-Viettel FC","401912768","10:00",3,0],
  ["아르카다그","골고하르 시르잔","Arkadag FK","Gol Gohar Sirjan FC","401912767","13:45",1,0],
  ["U알와흐다","알칼디야SC","Al Wahda FC","Al-Khaldiya SC","401912766","16:00",1,2],
  ["알라이얀","O알나흐다","Al-Rayyan SC","Al-Nahda Club","401912764","16:00",2,0],
  ["쿠웨이트SC","PFC나사프","Kuwait SC","FC Nasaf","401912765","16:00",2,3],
  ["알타아원","J알파이살리","Al Taawoun","Al-Faisaly SC","401912762","18:15",3,1],
  ["무하라크 클럽","U알자지라","Al-Muharraq SC","Al Jazira Club","401912763","18:15",0,3]
 ];
 const fixtureDate=Date.parse("2026-11-05T02:00:00Z");
 for(const [home,away,sourceHome,sourceAway,id,clock,h,a] of examples){
  const startMs=Date.parse("2026-11-04T"+clock+":00Z");
  const fixture={key:id,sport:"축구",league:"AFC 챔피언스리그2",home,away,startMs};
  const fullTime={id,date:new Date(startMs).toISOString(),completed:true,
   statusName:"STATUS_FULL_TIME",competitors:[
    {homeAway:"home",name:sourceHome,score:String(h)},
    {homeAway:"away",name:sourceAway,score:String(a)}]};
  const p={ok:true,league:"afc.cup",events:[fullTime]};
  const result=parseEspnFinal(p,fixture,{now:fixtureDate});
  assert.equal(result.ok,true,home+"-"+away+":"+result.waitReason);
  assert.equal(result.gameId,id);
  assert.deepEqual(result.result,{homeScore:h,awayScore:a});
  assert.equal(parseEspnFinal({...p,events:[{...fullTime,completed:false}]},fixture,{now:fixtureDate}).ok,false);
  assert.equal(parseEspnFinal({...p,events:[{...fullTime,competitors:[
   {homeAway:"home",name:sourceAway,score:String(a)},
   {homeAway:"away",name:sourceHome,score:String(h)}
  ]}]},fixture,{now:fixtureDate}).ok,false);
 }
});
