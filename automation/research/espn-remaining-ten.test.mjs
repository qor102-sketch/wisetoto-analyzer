import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,findEspnFixtureEvent} from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
// Immutable genuine official ESPN scoreboard evidence from CI #3208,
// fixture source dates 2026-10-30..11-08. All completed STATUS_FULL_TIME,
// unique numeric event id and exact 0-minute source kickoff.
const matches=[["프랑스 리그1","스타드 렌","릴OSC","2026-11-08T14:00:00.000Z","Stade Rennais","Lille","401876406",1,2],["UEFA 컨퍼런스리그","트벤테","파포스FC","2026-11-05T20:00:00.000Z","FC Twente","Pafos","401915822",3,1],["UEFA 컨퍼런스리그","아탈란타BC","카이라트 알마티","2026-11-05T17:45:00.000Z","Atalanta","Kairat Almaty","401915830",1,1],["UEFA 챔피언스리그","FK보되 글림트","릴OSC","2026-11-03T20:00:00.000Z","Bodo/Glimt","Lille","401915384",0,0],["스페인 라리가","데포르티보 아코루냐","오사수나","2026-11-02T20:00:00.000Z","Deportivo","Osasuna","401882824",2,1],["프랑스 리그1","로리앙","스타드 브레스투아29","2026-11-02T19:45:00.000Z","Lorient","Brest","401876419",0,2],["일본 J1리그","제프 유나이티드","아비스파 후쿠오카","2026-11-01T05:00:00.000Z","JEF United Ichihara-Chiba","Avispa Fukuoka","401877582",3,0],["독일 분데스리가","아우크스부르크","SC프라이부르크","2026-10-31T14:30:00.000Z","FC Augsburg","SC Freiburg","401884751",1,2],["프랑스 리그1","OGC니스","스타드 렌","2026-10-30T18:00:00.000Z","Nice","Stade Rennais","401876416",5,2],["프랑스 리그1","르아브르AC","파리 생제르맹","2026-10-30T18:00:00.000Z","Le Havre AC","Paris Saint-Germain","401876421",1,5]];
const fixture=x=>({key:"backlog-"+x[6],sport:"축구",league:x[0],
 home:x[1],away:x[2],startMs:Date.parse(x[3]),verdict:"PENDING",
 pregameCapturedAt:Date.parse(x[3])-300000,odds:[{frozen:true}]});
const event=x=>({id:x[6],date:x[3],completed:true,statusName:"STATUS_FULL_TIME",
 competitors:[{homeAway:"home",name:x[4],score:String(x[7])},
  {homeAway:"away",name:x[5],score:String(x[8])}]});
const source=(x,events=[event(x)])=>({ok:true,league:espnLeague(fixture(x)),events});
test("ten remaining source-audited official finals match with both sides, ID, kickoff and immutable PRE",()=>{
 assert.equal(matches.length,10);
 assert.equal(new Set(matches.map(x=>x[6])).size,10);
 for(const x of matches){
  const f=fixture(x),now=f.startMs+5*3600000;
  const result=parseEspnFinal(source(x),f,{now});
  assert.equal(result.ok,true,JSON.stringify({league:x[0],id:x[6],reason:result.waitReason}));
  assert.equal(result.gameId,x[6]);
  assert.deepEqual(result.result,{homeScore:x[7],awayScore:x[8]});
  const persisted=mergeProviderFinal({records:[f]},f.key,result,now);
  assert.equal(persisted.records[0].verdict,"VERIFIED");
  assert.deepEqual(persisted.records[0].odds,f.odds);
  assert.equal(persisted.records[0].pregameCapturedAt,f.pregameCapturedAt);
 }
});
test("strict ESPN proof remains unavailable for false FINAL, swapped, wrong-source or duplicate games",()=>{
 for(const x of matches){
  const f=fixture(x),e=event(x),now=f.startMs+5*3600000;
  for(const changed of [
   {...e,completed:false},{...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,statusName:"STATUS_FINAL_PEN"},
   {...e,date:new Date(f.startMs+3*3600000).toISOString()},
   {...e,id:"NO_ID"},
   {...e,competitors:e.competitors.map((c,i)=>({...c,homeAway:i?"home":"away"}))},
   {...e,competitors:[{...e.competitors[0],name:"Unrelated Club"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"Unrelated Club"}]}
  ])assert.equal(parseEspnFinal(source(x,[changed]),f,{now}).ok,false,JSON.stringify({id:x[6],changed}));
  assert.equal(parseEspnFinal(source(x,[e,{...e,id:x[6]+"9"}]),f,{now}).ok,false);
  assert.equal(parseEspnFinal({...source(x),league:"wrong.league"},f,{now}).ok,false);
 }
});
