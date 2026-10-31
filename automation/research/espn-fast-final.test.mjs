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

test("actual 2026-10-31 J1 and A-League scoreboard clubs now match both exact teams",()=>{
 const observed=[
  ["일본 J1리그","가시마 앤틀러스","세레소 오사카","Kashima Antlers","Cerezo Osaka","jpn.1"],
  ["일본 J1리그","비셀 고베","나고야 그램퍼스","Vissel Kobe","Nagoya Grampus","jpn.1"],
  ["일본 J1리그","교토 상가FC","시미즈 에스펄스","Kyoto Sanga","Shimizu S-Pulse","jpn.1"],
  ["일본 J1리그","미토 홀리호크","산프레체 히로시마","Mito Hollyhock","Sanfrecce Hiroshima","jpn.1"],
  ["호주 A리그","멜버른 시티","시드니FC","Melbourne City FC","Sydney FC","aus.1"],
  ["호주 A리그","맥아서FC","웨스턴시드니 원더러스","Macarthur FC","Western Sydney Wanderers FC","aus.1"],
  ["호주 A리그","뉴캐슬 제츠","웰링턴 피닉스","Newcastle Jets","Wellington Phoenix","aus.1"],
  ["잉글랜드 챔피언십","노리치 시티","왓포드","Norwich City","Watford","eng.2"],
 ];
 for(const [league,home,away,eh,ea,code] of observed){
  const fixture={sport:"축구",league,home,away,startMs:S};
  const score={ok:true,league:code,events:[{id:"401900001",date:new Date(S).toISOString(),completed:true,
   statusName:"STATUS_FULL_TIME",competitors:[{homeAway:"home",name:eh,score:"2"},
    {homeAway:"away",name:ea,score:"1"}]}]};
  const result=parseEspnFinal(score,fixture,{now:S+4*H});
  assert.equal(result.ok,true,home+" v "+away+": "+result.waitReason);
  assert.equal(result.gameId,"401900001");
  const wrongHome={...score,events:[{...score.events[0],
   competitors:[{homeAway:"home",name:"Different Club",score:"2"},score.events[0].competitors[1]]}]};
  assert.equal(parseEspnFinal(wrongHome,fixture,{now:S+4*H}).ok,false);
 }
});
test("added team aliases never settle an ambiguous or nonfinal J1 fixture",()=>{
 const f={sport:"축구",league:"일본 J1리그",home:"가시마 앤틀러스",away:"세레소 오사카",startMs:S};
 const event={id:"401900001",date:new Date(S).toISOString(),completed:false,
  statusName:"STATUS_SCHEDULED",competitors:[{homeAway:"home",name:"Kashima Antlers",score:"0"},
   {homeAway:"away",name:"Cerezo Osaka",score:"0"}]};
 const p={ok:true,league:"jpn.1",events:[event]};
 assert.equal(parseEspnFinal(p,f,{now:S+4*H}).ok,false);
 assert.equal(parseEspnFinal({...p,events:[{...event,completed:true,statusName:"STATUS_FINAL"},{
  ...event,id:"401900002",completed:true,statusName:"STATUS_FINAL"}]},f,{now:S+4*H}).ok,false);
});
