import test from "node:test";
import assert from "node:assert/strict";
import {isOfficialKovoFixture,parseOfficialKovoEnded,lookupOfficialKovoFinal}
 from "./kovo-official-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const O=3600000;
const events=[
 {number:17,gender:"MALE",date:"2026-11-10",time:"19:00:00",
  home:"삼성화재",away:"한국전력",homeId:"1002",awayId:"1006",
  homeScore:1,awayScore:3,league:"KOVO 남자",
  betmanHome:"삼성화재 블루팡스",betmanAway:"한국전력 빅스톰"},
 {number:18,gender:"FEMALE",date:"2026-11-10",time:"19:00:00",
  home:"SOOP",away:"IBK기업은행",homeId:"2008",awayId:"2006",
  homeScore:1,awayScore:3,league:"KOVO 여자",
  betmanHome:"SOOP 수퍼스",betmanAway:"IBK기업은행 알토스"},
 {number:16,gender:"FEMALE",date:"2026-11-08",time:"16:00:00",
  home:"한국도로공사",away:"흥국생명",homeId:"2002",awayId:"2004",
  homeScore:3,awayScore:1,league:"KOVO 여자",
  betmanHome:"한국도로공사 하이패스",betmanAway:"흥국생명 핑크스파이더스"}
];
const row=x=>({match:"001",number:x.number,round:1,
 season:{value:"023",name:"HK흥국금융 2026~2027 V-리그"},
 league:{value:"201",name:"정규리그"},gender:x.gender,
 gameDate:x.date,startTime:x.time,endTime:"21:26:00",
 playTime:"PT2H12M",
 homeTeam:{value:x.homeId,name:x.home,score:x.homeScore},
 awayTeam:{value:x.awayId,name:x.away,score:x.awayScore}});
const fixture=x=>({key:"kovo-"+x.number,sport:"배구",league:x.league,
 home:x.betmanHome,away:x.betmanAway,
 startMs:Date.parse(x.date+"T"+x.time.slice(0,5)+":00+09:00"),
 verdict:"PENDING",pregameCapturedAt:Date.parse(x.date+"T16:00:00+09:00"),
 odds:[{frozen:true,source:"original-PRE"}]});
const feed=payload=>({result:"SUCCESS",payload});
test("three genuine overdue KOVO official ended games have distinct source match keys and real final scores",()=>{
 assert.equal(events.length,3);
 for(const x of events){
  const f=fixture(x),now=f.startMs+5*O;
  assert.equal(isOfficialKovoFixture(f),true);
  const p=parseOfficialKovoEnded(feed(events.map(row)),f,{now});
  assert.equal(p.ok,true,JSON.stringify({x,reason:p.waitReason}));
  assert.equal(p.gameId,"023:201:"+x.gender+":"+x.number);
  assert.equal(p.source,"KOVO");
  assert.equal(p.sourceEvidence,"KOVO_OFFICIAL_ENDED_SCHEDULE");
  assert.deepEqual(p.result,{homeScore:x.homeScore,awayScore:x.awayScore});
  const updated=mergeProviderFinal({records:[f]},f.key,p,now);
  assert.equal(updated.records[0].verdict,"VERIFIED");
  assert.equal(updated.records[0].resultSource,"KOVO");
  assert.equal(updated.records[0].finalProviderGameId,p.gameId);
  assert.equal(updated.records[0].pregameCapturedAt,f.pregameCapturedAt);
  assert.deepEqual(updated.records[0].odds,f.odds);
 }
});
test("only verified KOVO male/female V-League fixtures eligible; never NBA/WKBL or other competition",()=>{
 assert.equal(isOfficialKovoFixture({...fixture(events[0]),sport:"농구"}),false);
 assert.equal(isOfficialKovoFixture({...fixture(events[0]),league:"KOVO 컵"}),false);
 assert.equal(isOfficialKovoFixture({...fixture(events[0]),league:"NBA"}),false);
 assert.equal(isOfficialKovoFixture({...fixture(events[0]),league:"WKBL"}),false);
});
test("official ended KOVO stays pending for wrong side, gender, league, season, kickoff, identity or final score",()=>{
 for(const x of events){
  const f=fixture(x),r=row(x),now=f.startMs+5*O;
  const wrong=[
   {...r,gender:x.gender==="MALE"?"FEMALE":"MALE"},
   {...r,gameDate:"2026-11-01"},
   {...r,startTime:"23:59:00"},
   {...r,homeTeam:{...r.homeTeam,name:"Unrelated Team"}},
   {...r,awayTeam:{...r.awayTeam,name:"Unrelated Team"}},
   {...r,homeTeam:{...r.homeTeam,value:null}},
   {...r,awayTeam:{...r.awayTeam,value:null}},
   {...r,awayTeam:{...r.awayTeam,value:r.homeTeam.value}},
   {...r,season:{...r.season,name:"2025~2026 V-리그"}},
   {...r,season:{...r.season,value:null}},
   {...r,league:{value:"203",name:"KOVO 컵"}},
   {...r,number:null},
   {...r,endTime:null},
   {...r,playTime:null},
   {...r,cancelled:true},
   {...r,postponed:true},
   {...r,homeTeam:{...r.homeTeam,score:0},awayTeam:{...r.awayTeam,score:0}},
   {...r,homeTeam:{...r.homeTeam,score:2},awayTeam:{...r.awayTeam,score:2}},
   {...r,homeTeam:{...r.homeTeam,score:null}}
  ];
  for(const bad of wrong)
   assert.equal(parseOfficialKovoEnded(feed([bad]),f,{now}).ok,false,
    JSON.stringify({case:x.number,bad}));
  assert.equal(parseOfficialKovoEnded(feed([r,{...r,number:r.number+99}]),f,{now}).ok,false);
  assert.equal(parseOfficialKovoEnded(feed([r]),f,{now:f.startMs+O}).ok,false);
 }
 assert.equal(parseOfficialKovoEnded(feed([]),fixture(events[0])).ok,false);
 assert.equal(parseOfficialKovoEnded({},fixture(events[0])).ok,false);
});
test("one shared official ended API is reused across men/women and Naver circuit failures",async()=>{
 const cache=new Map(),calls=[];
 const fetchFn=async url=>{
  calls.push(url);
  assert.equal(url,"https://user-api.kovo.co.kr/mains/games/schedules/ended");
  return {ok:true,status:200,json:async()=>feed(events.map(row))};
 };
 for(const x of events){
  const f=fixture(x);
  assert.equal(selectFinalAuditRows({records:[f]},f.startMs+3*86400000,24).length,1);
  const got=await lookupOfficialKovoFinal(f,{fetchFn,cache,now:f.startMs+5*O});
  assert.equal(got.ok,true,got.waitReason);
 }
 assert.equal(calls.length,1);
 const bad=await lookupOfficialKovoFinal(fixture(events[0]),{
  fetchFn:async()=>({ok:false,status:502})});
 assert.equal(bad.ok,false);
 assert.match(bad.waitReason,/KOVO_OFFICIAL_HTTP_502/);
});
