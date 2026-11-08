import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal} from "./espn-fast-final.mjs";
// Live original-ledger source coverage CI #2621, 2026-11-08: actual
// ESPN numeric event, league, 0-min kickoff (one match -60m), full time and scores.
// 17 unique one-sided and 3 scoreboard short-name-only cases. All names
// are tied to a unique official match, never broad fuzzy transliteration.
const observed=[
 ["잉글랜드 프리미어리그","에버턴","코번트리 시티","Everton","Coventry City","2026-11-06T20:00:00Z","401879242",3,1],
 ["프랑스 리그1","툴루즈","RC스트라스부르","Toulouse","Strasbourg","2026-11-06T19:45:00Z","401876405",3,1],
 ["독일 분데스리가","함부르크","묀헨글라트바흐","Hamburg SV","Borussia Mönchengladbach","2026-11-06T19:30:00Z","401884739",3,1],
 ["UEFA 컨퍼런스리그","AS모나코","노르셸란","AS Monaco","FC Nordsjælland","2026-11-05T20:00:00Z","401915824",2,0],
 ["UEFA 챔피언스리그","맨체스터 유나이티드","AS로마","Manchester United","AS Roma","2026-11-03T20:00:00Z","401915308",3,2],
 ["잉글랜드 챔피언십","웨스트브로미치 앨비언","사우샘프턴","West Bromwich Albion","Southampton","2026-11-03T20:00:00Z","401880177",1,1],
 ["잉글랜드 챔피언십","블랙번 로버스","스토크 시티","Blackburn Rovers","Stoke City","2026-11-03T19:45:00Z","401880183",1,2],
 ["잉글랜드 챔피언십","퀸즈파크 레인저스","번리","Queens Park Rangers","Burnley","2026-11-03T19:45:00Z","401880179",1,1],
 ["잉글랜드 챔피언십","포츠머스","스완지 시티","Portsmouth","Swansea City","2026-11-03T19:45:00Z","401880181",3,1],
 ["AFC 챔피언스리그 엘리트","꽁안 하노이","교토 상가FC","Cong An Ha Noi","Kyoto Sanga","2026-11-03T12:15:00Z","401912615",0,0],
 ["AFC 챔피언스리그 엘리트","가시와 레이솔","대전 하나시티즌","Kashiwa Reysol","Daejeon Hana Citizen FC","2026-11-03T10:00:00Z","401912604",2,0],
 ["AFC 챔피언스리그 엘리트","비셀 고베","랏차부리","Vissel Kobe","Ratchaburi FC","2026-11-03T10:00:00Z","401912605",3,2],
 ["프랑스 리그1","파리FC","AS모나코","Paris FC","AS Monaco","2026-11-01T16:15:00Z","401876415",3,1],
 ["프랑스 리그1","RC스트라스부르","AJ오세르","Strasbourg","AJ Auxerre","2026-11-01T14:00:00Z","401876414",5,1],
 ["이탈리아 세리에A","코모1907","베네치아","Como","Venezia","2026-11-01T11:30:00Z","401875002",1,0],
 ["호주 A리그","퍼스 글로리","애들레이드 유나이티드","Perth Glory FC","Adelaide United FC","2026-11-01T07:00:00Z","401892145",4,0,"2026-11-01T08:00:00Z"],
 ["이탈리아 세리에A","우디네세","AS로마","Udinese","AS Roma","2026-10-31T17:00:00Z","401874990",2,5],
 ["잉글랜드 프리미어리그","브렌트퍼드","노팅엄 포리스트","Brentford","Nottingham Forest","2026-10-31T15:00:00Z","401879249",2,0],
 ["잉글랜드 프리미어리그","코번트리 시티","선덜랜드","Coventry City","Sunderland","2026-10-31T15:00:00Z","401879247",3,1],
 ["AFC 챔피언스리그 엘리트","가시마 앤틀러스","포항 스틸러스","Kashima Antlers","Pohang Steelers","2026-10-28T10:00:00Z","401912633",3,0]
];
function row(p){return {sport:"축구",league:p[0],home:p[1],away:p[2],
 startMs:Date.parse(p[9]??p[5]),verdict:"PENDING"};}
function result(p,extra={}){return {id:p[6],date:p[5],completed:true,statusName:"STATUS_FULL_TIME",
 competitors:[{homeAway:"home",name:p[3],score:String(p[7])},
  {homeAway:"away",name:p[4],score:String(p[8])}],...extra};}
const source=(p,e=[result(p)])=>({ok:true,league:espnLeague(row(p)),events:e});
test("17 source-backed one-side plus three short-name source fixtures match TWO exact sides and official full-time scores",()=>{
 assert.equal(observed.length,20);
 for(const p of observed){
  const fixture=row(p);
  const proof=parseEspnFinal(source(p),fixture,{now:fixture.startMs+5*3600000});
  assert.equal(proof.ok,true,JSON.stringify({id:p[6],league:p[0],home:p[1],away:p[2],reason:proof.waitReason}));
  assert.equal(proof.gameId,p[6]);
  assert.deepEqual(proof.result,{homeScore:p[7],awayScore:p[8]});
 }
});
test("further club aliases cannot settle wrong side, wrong league, scoreless, incomplete or event conflict",()=>{
 for(const p of observed){
  const fixture=row(p),now=fixture.startMs+5*3600000,e=result(p);
  const swapped={...e,competitors:[
   {...e.competitors[0],name:p[4]},
   {...e.competitors[1],name:p[3]}
  ]};
  for(const events of [
   [swapped],[{...e,completed:false}],[{...e,statusName:"STATUS_IN_PROGRESS"}],
   [{...e,id:"NOT_NUMERIC"}],
   [{...e,date:new Date(fixture.startMs+4*3600000).toISOString()}],
   [{...e,competitors:[{...e.competitors[0],score:""},e.competitors[1]]}],
   [e,{...e,id:String(Number(p[6])+100)}]
  ])assert.equal(parseEspnFinal(source(p,events),fixture,{now}).ok,false,p[6]+": "+JSON.stringify(events));
  assert.equal(parseEspnFinal({...source(p),league:"eng.fa"},fixture,{now}).ok,false);
 }
});
