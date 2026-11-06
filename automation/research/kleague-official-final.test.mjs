import test from "node:test";
import assert from "node:assert/strict";
import {officialKLeagueMonth,officialKLeagueNumber,parseOfficialKLeagueFinal,
 lookupOfficialKLeagueFinal} from "./kleague-official-final.mjs";
import {mergeProviderFinal,projection} from "./collect-first.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const T=Date.parse("2026-11-01T05:00:00Z"),H=3600000;
const base=(home="포항 스틸러스",away="제주 SKFC",startMs=T)=>({
 key:"soccer|"+startMs+"|"+home+"|"+away,home,away,sport:"축구",
 league:"K리그1",startMs,verdict:"PENDING",lastResultCheckAt:null});
const club=(id,name)=>({teamId:id,teamNameShort:name,teamName:name,teamNameFull:name});
const item=(id=201,homeTeam="K03",awayTeam="K04",hname="POHANG",aname="JEJU")=>({
 gameId:id,year:2026,meetSeq:1,leagueId:1,
 gameDate:"2026.11.01",gameTime:"14:00",homeTeam,awayTeam,
 homeTeamName:hname,awayTeamName:aname,gameStatus:"FE",endYn:"Y",
 homeGoal:1,awayGoal:1});
const official=rows=>({data:{scheduleList:rows,clubList:[
 club("K03","POHANG"),club("K04","JEJU"),club("K09","SEOUL"),
 club("K18","INCHEON"),club("K01","ULSAN"),club("K21","GANGWON")]}});
test("official K League 1 match requires immutable club codes, exact kickoff and two explicit finished markers",()=>{
 const fixture=base();
 assert.equal(officialKLeagueNumber(fixture),1);
 assert.deepEqual(officialKLeagueMonth(fixture),{year:"2026",month:"11",leagueId:1,day:"2026-11-01"});
 const found=parseOfficialKLeagueFinal(official([item()]),fixture,{now:T+5*H});
 assert.equal(found.ok,true,JSON.stringify(found));
 assert.equal(found.source,"KLEAGUE");
 assert.equal(found.gameId,"2026/1/201");
 assert.equal(found.sourceEvidence,"KLEAGUE_OFFICIAL_MATCH_FE_AND_END_Y");
 assert.deepEqual(found.result,{homeScore:1,awayScore:1});
});
test("missing score, kickoff, status, season, league or ID never become FINAL",()=>{
 const fixture=base();
 for(const bad of [
  {...item(),gameStatus:"NS"},
  {...item(),endYn:"N"},
  {...item(),endYn:null},
  {...item(),homeGoal:null},
  {...item(),awayGoal:""},
  {...item(),homeGoal:-1},
  {...item(),awayGoal:25},
  {...item(),gameTime:"20:00"},
  {...item(),gameTime:null},
  {...item(),gameDate:"2026.11.02"},
  {...item(),year:2025},
  {...item(),meetSeq:2},
  {...item(),leagueId:2},
  {...item(),gameId:null},
  {...item(),homeTeam:"K09"},
  {...item(),homeTeamName:"WRONG"},
  {...item(),awayTeam:"K09"},
 ]){
  assert.equal(parseOfficialKLeagueFinal(official([bad]),fixture,{now:T+5*H}).ok,false,
   "must refuse "+JSON.stringify(bad));
 }
 assert.equal(parseOfficialKLeagueFinal(official([item()]),fixture,{now:T+H}).ok,false);
 assert.equal(parseOfficialKLeagueFinal({},fixture,{now:T+5*H}).ok,false);
 assert.equal(parseOfficialKLeagueFinal(official([item(),{...item(),gameId:202}]),
  fixture,{now:T+5*H}).ok,false);
});
test("one K League 1 schedule read reused for distinct same-month fixtures, K2 separate",async()=>{
 const fixtures=[
  base(),
  {...base("FC서울","인천 유나이티드",Date.parse("2026-11-01T07:30:00Z")),key:"seoul"}
 ];
 const feb={...item(203,"K09","K18","SEOUL","INCHEON"),gameTime:"16:30",
  homeGoal:0,awayGoal:1};
 const source=official([item(),feb]);
 const cache=new Map(),calls=[];
 const fetchFn=async(url,options)=>{
  calls.push({url,method:options.method,body:JSON.parse(options.body)});
  assert.equal(url,"https://www.kleague.com/getScheduleList.do");
  assert.equal(options.method,"POST");
  assert.equal(options.redirect,"error");
  return {ok:true,status:200,json:async()=>source};
 };
 for(const fixture of fixtures){
  const result=await lookupOfficialKLeagueFinal(fixture,{cache,fetchFn,now:T+10*H});
  assert.equal(result.ok,true,JSON.stringify(result));
 }
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].body,{year:"2026",month:"11",leagueId:1});
 assert.equal(cache.size,1);
});
test("no invented aliases: FC Seoul is not Seoul E-Land, and Suwon FC is not Suwon Samsung",()=>{
 const wrong={...base("서울 이랜드","인천 유나이티드"),league:"K리그1"};
 assert.equal(parseOfficialKLeagueFinal(official([item(203,"K09","K18","SEOUL","INCHEON")]),
   wrong,{now:T+5*H}).ok,false);
 assert.equal(officialKLeagueNumber({...wrong,league:"K리그3"}),null);
 assert.equal(officialKLeagueNumber({...wrong,sport:"농구"}),null);
});
test("source failure leaves PENDING; only official result with both markers may merge",async()=>{
 const fixture=base(),state={records:[fixture]};
 const fetchFn=async()=>({ok:false,status:503});
 const unavailable=await lookupOfficialKLeagueFinal(fixture,{fetchFn,now:T+4*H});
 assert.equal(unavailable.ok,false);
 const still=mergeProviderFinal(state,fixture.key,unavailable,T+4*H);
 assert.equal(still.records[0].verdict,"PENDING");
 const officialFinal=parseOfficialKLeagueFinal(official([item()]),fixture,{now:T+4*H});
 const resolved=mergeProviderFinal(state,fixture.key,officialFinal,T+4*H);
 assert.equal(resolved.records[0].verdict,"VERIFIED");
 assert.equal(resolved.records[0].resultSource,"KLEAGUE");
 assert.equal(resolved.records[0].finalProviderGameId,"2026/1/201");
 assert.equal(projection(resolved,T+4*H).counts.verified,1);
});
test("Naver-only circuit cannot suppress a supported official K League final",()=>{
 const rows=[
  ...Array.from({length:15},(_,i)=>({...base("FC서울","인천 유나이티드"),key:"kleague-"+i,
   checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"})),
  ...Array.from({length:15},(_,i)=>({...base("AB","CD"),key:"unknown-"+i,
   league:"K리그3",checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"}))
 ];
 const chosen=selectFinalAuditRows({records:rows},T+5*H,24);
 assert.equal(chosen.filter(r=>r.league==="K리그1").length,15);
 assert.equal(chosen.filter(r=>r.league==="K리그3").length,2);
});
