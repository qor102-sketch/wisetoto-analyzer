import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,findEspnFixtureEvent}
 from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
import {isNbaGame} from "../nba-policy.mjs";
// Source-owned read-only CI #2926 evidence: each candidate is a distinct
// completed FULL_TIME ESPN event with league and two official team names.
// Kickoff deltas are exact values from the observed scoreboard (24 at 0m,
// one at -60m). The match still requires the strict <=120m identity window.
const cases=[
 [
  "이탈리아 세리에A",
  "ACF피오렌티나",
  "유벤투스",
  "2026-11-08T19:45:00.000Z",
  "Fiorentina",
  "Juventus",
  "401875003",
  2,
  2,
  "Fiorentina",
  "Juventus",
  0
 ],
 [
  "네덜란드 에레디비시",
  "위트레흐트",
  "NEC네이메헌",
  "2026-11-08T19:00:00.000Z",
  "FC Utrecht",
  "NEC Nijmegen",
  "401875549",
  2,
  3,
  "FC Utrecht",
  "NEC",
  0
 ],
 [
  "스페인 라리가",
  "비야레알",
  "헤타페",
  "2026-11-08T17:30:00.000Z",
  "Villarreal",
  "Getafe",
  "401882807",
  2,
  0,
  "Villarreal",
  "Getafe",
  0
 ],
 [
  "독일 분데스리가",
  "SC프라이부르크",
  "우니온 베를린",
  "2026-11-08T16:30:00.000Z",
  "SC Freiburg",
  "1. FC Union Berlin",
  "401884741",
  2,
  0,
  "Freiburg",
  "Union Berlin",
  0
 ],
 [
  "프랑스 리그1",
  "스타드 브레스투아29",
  "올랭피크 리옹",
  "2026-11-08T16:15:00.000Z",
  "Brest",
  "Lyon",
  "401876410",
  2,
  0,
  "Brest",
  "Lyon",
  0
 ],
 [
  "프랑스 리그1",
  "앙제SCO",
  "OGC니스",
  "2026-11-08T16:15:00.000Z",
  "Angers",
  "Nice",
  "401876412",
  0,
  2,
  "Angers",
  "Nice",
  0
 ],
 [
  "네덜란드 에레디비시",
  "AZ알크마르",
  "흐로닝언",
  "2026-11-08T15:45:00.000Z",
  "AZ Alkmaar",
  "FC Groningen",
  "401875548",
  4,
  3,
  "AZ Alkmaar",
  "FC Groningen",
  0
 ],
 [
  "이탈리아 세리에A",
  "AC몬차",
  "아탈란타BC",
  "2026-11-08T14:00:00.000Z",
  "Monza",
  "Atalanta",
  "401874800",
  0,
  1,
  "Monza",
  "Atalanta",
  0
 ],
 [
  "잉글랜드 프리미어리그",
  "입스위치 타운",
  "AFC본머스",
  "2026-11-08T14:00:00.000Z",
  "Ipswich Town",
  "AFC Bournemouth",
  "401878759",
  1,
  2,
  "Ipswich",
  "Bournemouth",
  0
 ],
 [
  "네덜란드 에레디비시",
  "트벤테",
  "AFC아약스",
  "2026-11-08T13:30:00.000Z",
  "FC Twente",
  "Ajax Amsterdam",
  "401875550",
  2,
  2,
  "FC Twente",
  "Ajax",
  0
 ],
 [
  "일본 J1리그",
  "제프 유나이티드",
  "미토 홀리호크",
  "2026-11-08T08:00:00.000Z",
  "JEF United Ichihara-Chiba",
  "Mito Hollyhock",
  "401877577",
  1,
  0,
  "JEF Utd Chiba",
  "Mito Hollyhock",
  0
 ],
 [
  "일본 J1리그",
  "FC마치다 젤비아",
  "산프레체 히로시마",
  "2026-11-08T05:00:00.000Z",
  "Machida Zelvia",
  "Sanfrecce Hiroshima",
  "401877559",
  0,
  0,
  "Machida Zelvia",
  "Sanfreece",
  0
 ],
 [
  "프랑스 리그1",
  "파리 생제르맹",
  "트루아AC",
  "2026-11-07T20:05:00.000Z",
  "Paris Saint-Germain",
  "Troyes",
  "401876407",
  1,
  0,
  "PSG",
  "Troyes",
  0
 ],
 [
  "네덜란드 에레디비시",
  "엑셀시오르 로테르담",
  "고어헤드 이글스",
  "2026-11-07T20:00:00.000Z",
  "Excelsior",
  "Go Ahead Eagles",
  "401875554",
  0,
  1,
  "Excelsior",
  "Go Ahead Eagles",
  0
 ],
 [
  "이탈리아 세리에A",
  "AS로마",
  "US사수올로",
  "2026-11-07T19:45:00.000Z",
  "AS Roma",
  "Sassuolo",
  "401874803",
  3,
  0,
  "AS Roma",
  "Sassuolo",
  0
 ],
 [
  "스페인 라리가",
  "오사수나",
  "아틀레틱 빌바오",
  "2026-11-07T17:30:00.000Z",
  "Osasuna",
  "Athletic Club",
  "401882811",
  1,
  1,
  "Osasuna",
  "Athletic",
  0
 ],
 [
  "잉글랜드 프리미어리그",
  "아스널",
  "헐 시티",
  "2026-11-07T15:00:00.000Z",
  "Arsenal",
  "Hull City",
  "401878760",
  1,
  0,
  "Arsenal",
  "Hull",
  0
 ],
 [
  "독일 분데스리가",
  "FSV마인츠05",
  "바이에른 뮌헨",
  "2026-11-07T14:30:00.000Z",
  "Mainz",
  "Bayern Munich",
  "401884740",
  1,
  2,
  "Mainz",
  "Bayern",
  0
 ],
 [
  "독일 분데스리가",
  "도르트문트",
  "엘버스베르크",
  "2026-11-07T14:30:00.000Z",
  "Borussia Dortmund",
  "SV Elversberg",
  "401884745",
  2,
  1,
  "Dortmund",
  "Elversberg",
  0
 ],
 [
  "일본 J1리그",
  "가시와 레이솔",
  "가와사키 프론탈레",
  "2026-11-07T07:00:00.000Z",
  "Kashiwa Reysol",
  "Kawasaki Frontale",
  "401877560",
  2,
  1,
  "Kashiwa",
  "Kawasaki",
  0
 ],
 [
  "일본 J1리그",
  "요코하마 F마리노스",
  "파지아노 오카야마",
  "2026-11-07T05:00:00.000Z",
  "Yokohama F. Marinos",
  "Fagiano Okayama",
  "401877558",
  1,
  1,
  "Yokohama FM",
  "Okayama",
  0
 ],
 [
  "일본 J1리그",
  "시미즈 에스펄스",
  "도쿄 베르디",
  "2026-11-07T04:00:00.000Z",
  "Shimizu S-Pulse",
  "Tokyo Verdy 1969",
  "401877557",
  0,
  1,
  "Shimizu",
  "Tokyo Verdy",
  0
 ],
 [
  "AFC 챔피언스리그 엘리트",
  "포트FC",
  "베이징 궈안",
  "2026-11-03T12:15:00.000Z",
  "Port FC",
  "Beijing Guoan",
  "401912616",
  7,
  4,
  "Port FC",
  "Beijing",
  0
 ],
 [
  "일본 J1리그",
  "FC마치다 젤비아",
  "감바 오사카",
  "2026-11-01T07:00:00.000Z",
  "Machida Zelvia",
  "Gamba Osaka",
  "401877581",
  0,
  0,
  "Machida Zelvia",
  "Gamba Osaka",
  -60
 ],
 [
  "프랑스 리그1",
  "릴OSC",
  "RC랑스",
  "2026-10-30T20:05:00.000Z",
  "Lille",
  "Lens",
  "401876420",
  1,
  0,
  "Lille",
  "Lens",
  0
 ]
];
const fixture=c=>({key:"official-"+c[6],sport:"축구",league:c[0],
 home:c[1],away:c[2],startMs:Date.parse(c[3]),verdict:"PENDING",
 pregameCapturedAt:Date.parse(c[3])-30000,
 odds:[{kind:"immutable-original-pre"}]});
const sourceEvent=c=>({id:c[6],
 date:new Date(Date.parse(c[3])+c[11]*60000).toISOString(),completed:true,
 statusName:"STATUS_FULL_TIME",competitors:[
  {homeAway:"home",name:c[4],shortName:c[9],score:String(c[7])},
  {homeAway:"away",name:c[5],shortName:c[10],score:String(c[8])}
 ]});
const payload=(c,events=[sourceEvent(c)])=>({ok:true,league:espnLeague(fixture(c)),events});

test("25 audited overdue cases require exact league, both ESPN sides, numeric event and completed FINAL",()=>{
 assert.equal(cases.length,25);
 assert.equal(new Set(cases.map(c=>c[6])).size,25);
 for(const c of cases){
  const f=fixture(c),now=f.startMs+5*3600000;
  assert.equal(isNbaGame(f),false);
  const m=findEspnFixtureEvent(payload(c),f);
  assert.equal(m.ok,true,JSON.stringify({id:c[6],reason:m.waitReason}));
  assert.equal(m.gameId,c[6]);
  const proof=parseEspnFinal(payload(c),f,{now});
  assert.equal(proof.ok,true,JSON.stringify({id:c[6],reason:proof.waitReason}));
  assert.equal(proof.gameId,c[6]);
  assert.deepEqual(proof.result,{homeScore:c[7],awayScore:c[8]});
  const s=mergeProviderFinal({records:[f]},f.key,proof,now);
  assert.equal(s.records[0].verdict,"VERIFIED");
  assert.equal(s.records[0].resultSource,"ESPN");
  assert.equal(s.records[0].finalProviderGameId,c[6]);
  assert.equal(s.records[0].pregameCapturedAt,f.pregameCapturedAt);
  assert.deepEqual(s.records[0].odds,f.odds);
 }
});

test("25 verified-identity aliases reject side swap, wrong competition, missing ID, extra time or false FINAL",()=>{
 for(const c of cases){
  const f=fixture(c),e=sourceEvent(c),now=f.startMs+5*3600000;
  const bad=[
   {...e,id:"NONNUMERIC_ID"},
   {...e,date:new Date(f.startMs+4*3600000).toISOString()},
   {...e,completed:false},
   {...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,statusName:"STATUS_FINAL_ET"},
   {...e,competitors:[{...e.competitors[0],name:"Other",shortName:"Other"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"Other",shortName:"Other"}]},
   {...e,competitors:e.competitors.map((v,i)=>({...v,homeAway:i?"home":"away"}))}
  ];
  for(const x of bad)
   assert.equal(parseEspnFinal(payload(c,[x]),f,{now}).ok,false,
    JSON.stringify({id:c[6],status:x.statusName,fixture:c[1]}));
  assert.equal(parseEspnFinal(payload(c,[e,{...e,id:c[6]+"1"}]),f,{now}).ok,false);
  const wrongLeague=espnLeague(f)==="eng.1"?"jpn.1":"eng.1";
  assert.equal(parseEspnFinal({...payload(c),league:wrongLeague},f,{now}).ok,false);
 }
});
