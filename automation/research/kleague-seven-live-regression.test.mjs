import test from "node:test";
import assert from "node:assert/strict";
import {officialKLeagueId,parseOfficialKLeagueFinal} from "./kleague-official-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
// Seven fixtures observed read-only in the original automation-data ledger
// and on www.kleague.com 2026-10-31/11-01 (CI run #2377).
// These are source-derived fixture cards, not a claim of live settlement.
const cases=[
 {league:"K리그2",home:"김해FC 2008",away:"천안 시티FC",date:"2026.11.01",
  time:"16:30",homeSrc:"GIMHAE",awaySrc:"CHEONAN",id:248,meetSeq:2,h:3,a:3},
 {league:"K리그2",home:"충북청주 프로축구단",away:"파주 프런티어",date:"2026.11.01",
  time:"16:30",homeSrc:"CHUNGBUK CHEONGJU",awaySrc:"PAJU",id:247,meetSeq:2,h:1,a:2},
 {league:"K리그1",home:"울산 HDFC",away:"강원FC",date:"2026.11.01",
  time:"14:00",homeSrc:"ULSAN",awaySrc:"GANGWON",id:202,meetSeq:1,h:2,a:1},
 {league:"K리그1",home:"포항 스틸러스",away:"제주 SKFC",date:"2026.11.01",
  time:"14:00",homeSrc:"POHANG",awaySrc:"JEJU",id:201,meetSeq:1,h:1,a:1},
 {league:"K리그1",home:"광주FC",away:"김천상무 프로축구단",date:"2026.10.31",
  time:"16:30",homeSrc:"GWANGJU",awaySrc:"GIMCHEON",id:200,meetSeq:1,h:1,a:1},
 {league:"K리그2",home:"충남아산 프로축구단",away:"김포FC",date:"2026.10.31",
  time:"16:30",homeSrc:"CHUNGNAM ASAN",awaySrc:"GIMPO",id:243,meetSeq:2,h:5,a:1},
 {league:"K리그1",home:"전북 현대모터스",away:"대전 하나시티즌",date:"2026.10.31",
  time:"14:00",homeSrc:"JEONBUK",awaySrc:"DAEJEON HANA",id:199,meetSeq:1,h:0,a:0}
];
function parsedFixture(c){
 return {key:"fixture-"+c.id,sport:"축구",league:c.league,home:c.home,away:c.away,
  startMs:Date.parse(c.date.replaceAll(".","-")+"T"+c.time+":00+09:00"),
  verdict:"PENDING",odds:[],latestOdds:[],fixtureId:null};
}
function officialCard(c,extra={}){
 return {year:2026,leagueId:officialKLeagueId(parsedFixture(c)),
  meetSeq:c.meetSeq,gameId:c.id,gameDate:c.date,gameTime:c.time,
  homeTeamName:c.homeSrc,awayTeamName:c.awaySrc,
  gameStatus:"FE",endYn:"Y",homeGoal:c.h,awayGoal:c.a,...extra};
}
const feed=c=>({data:{scheduleList:[officialCard(c)]}});
test("all seven real source-paired K League fixtures require exact ID, teams, time, FE+Y and score",()=>{
 for(const c of cases){
  const r=parsedFixture(c),later=r.startMs+4*3600000;
  const result=parseOfficialKLeagueFinal(feed(c),r,{now:later});
  assert.equal(result.ok,true,JSON.stringify({fixture:c,reason:result.waitReason}));
  assert.equal(result.gameId,"2026/"+officialKLeagueId(r)+"/"+c.meetSeq+"/"+c.id);
  assert.deepEqual(result.result,{homeScore:c.h,awayScore:c.a});
  const updated=mergeProviderFinal({records:[r]},r.key,result,later);
  assert.equal(updated.records[0].verdict,"VERIFIED");
  assert.equal(updated.records[0].resultSource,"KLEAGUE");
 }
});
test("no source fixture ever settles after swapped sides, wrong kickoff or ambiguous same-team games",()=>{
 for(const c of cases){
  const r=parsedFixture(c),later=r.startMs+4*3600000;
  for(const invalid of [
   [officialCard(c,{homeTeamName:c.awaySrc,awayTeamName:c.homeSrc})],
   [officialCard(c,{gameTime:"23:55"})],
   [officialCard(c,{endYn:"N"})],
   [officialCard(c,{gameStatus:"LIVE"})],
   [officialCard(c,{homeGoal:null})],
   [officialCard(c,{awayGoal:33})],
   [officialCard(c,{gameId:null})],
   [officialCard(c),officialCard(c,{gameId:c.id+100})]
  ]){
   const out=parseOfficialKLeagueFinal({data:{scheduleList:invalid}},r,{now:later});
   assert.equal(out.ok,false,JSON.stringify({c,invalid,reason:out.waitReason}));
  }
 }
});
test("official aliases never authorize wrong league or invented names",()=>{
 const c=cases[0],r=parsedFixture(c);
 assert.equal(parseOfficialKLeagueFinal(feed(c),{...r,league:"K리그1"},
  {now:r.startMs+4*3600000}).ok,false);
 assert.equal(parseOfficialKLeagueFinal(feed(c),{...r,home:"김해시청FC"},
  {now:r.startMs+4*3600000}).ok,false);
 assert.equal(parseOfficialKLeagueFinal(feed(c),{...r,away:"충남아산"},
  {now:r.startMs+4*3600000}).ok,false);
});
