import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal} from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
// Original persisted overdue ledger: independently source-audited ESPN
// 2026-11-13 read-only CI: unique numeric IDs, exact 0m kickoff,
// both homeAway sides, explicit STATUS_FULL_TIME and real scores.
const cases=[
 ["독일 분데스리가","VfB슈투트가르트","베르더 브레멘",
  "2026-11-07T17:30:00.000Z","VfB Stuttgart","Werder Bremen","401884743",1,0],
 ["독일 분데스리가","베르더 브레멘","TSG1899 호펜하임",
  "2026-10-31T14:30:00.000Z","Werder Bremen","TSG Hoffenheim","401884748",2,0],
 ["독일 분데스리가","TSG1899 호펜하임","샬케04",
  "2026-11-08T18:30:00.000Z","TSG Hoffenheim","Schalke 04","401884742",2,1],
 ["독일 분데스리가","샬케04","RB라이프치히",
  "2026-10-31T14:30:00.000Z","Schalke 04","RB Leipzig","401884747",0,2],
 ["스페인 라리가","RCD에스파뇰","데포르티보 아코루냐",
  "2026-11-07T15:15:00.000Z","Espanyol","Deportivo","401882813",0,0],
 ["독일 분데스리가","RB라이프치히","아우크스부르크",
  "2026-11-07T14:30:00.000Z","RB Leipzig","FC Augsburg","401884744",5,2],
 ["일본 J1리그","아비스파 후쿠오카","V바렌 나가사키",
  "2026-11-07T06:00:00.000Z","Avispa Fukuoka","V-Varen Nagasaki","401877535",1,1],
 ["UEFA 유로파리그","스타드 렌","올림피아코스",
  "2026-11-04T15:30:00.000Z","Stade Rennais","Olympiacos","401915551",0,0]
];
const fixture=x=>({key:"source-"+x[6],sport:"축구",league:x[0],
 home:x[1],away:x[2],startMs:Date.parse(x[3]),verdict:"PENDING",
 odds:[{immutable:true,phase:"PRE"}],pregameCapturedAt:Date.parse(x[3])-300000});
const event=x=>({id:x[6],date:x[3],completed:true,statusName:"STATUS_FULL_TIME",
 competitors:[{homeAway:"home",name:x[4],score:String(x[7])},
  {homeAway:"away",name:x[5],score:String(x[8])}]});
const feed=(x,events=[event(x)])=>({ok:true,league:espnLeague(fixture(x)),events});
test("eight source-audited ESPN finals match original ledger, preserve immutable PRE",()=>{
 assert.equal(cases.length,8);
 assert.equal(new Set(cases.map(x=>x[6])).size,8);
 for(const x of cases){
  const row=fixture(x),now=row.startMs+5*3600000;
  const proof=parseEspnFinal(feed(x),row,{now});
  assert.equal(proof.ok,true,JSON.stringify({id:x[6],reason:proof.waitReason}));
  assert.equal(proof.gameId,x[6]);
  assert.deepEqual(proof.result,{homeScore:x[7],awayScore:x[8]});
  const merged=mergeProviderFinal({records:[row]},row.key,proof,now);
  assert.equal(merged.records[0].verdict,"VERIFIED");
  assert.equal(merged.records[0].resultSource,"ESPN");
  assert.deepEqual(merged.records[0].odds,row.odds);
  assert.equal(merged.records[0].pregameCapturedAt,row.pregameCapturedAt);
 }
});
test("ESPN unknown identity, wrong event, reversed side, extra time or not FINAL stay PENDING",()=>{
 for(const x of cases){
  const row=fixture(x),e=event(x),now=row.startMs+5*3600000;
  const mutations=[
   {...e,id:"non-numeric"}, {...e,completed:false},
   {...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,statusName:"STATUS_FINAL_PEN"},
   {...e,date:new Date(row.startMs+3*3600000).toISOString()},
   {...e,competitors:[{...e.competitors[0],name:"Unrelated Club"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"Unrelated Club"}]},
   {...e,competitors:e.competitors.map((p,i)=>({...p,homeAway:i?"home":"away"}))}
  ];
  for(const bad of mutations)assert.equal(parseEspnFinal(feed(x,[bad]),row,{now}).ok,
   false,JSON.stringify({id:x[6],bad}));
  assert.equal(parseEspnFinal(feed(x,[e,{...e,id:x[6]+"9"}]),row,{now}).ok,false);
  assert.equal(parseEspnFinal({...feed(x),league:"wrong.league"},row,{now}).ok,false);
  assert.equal(parseEspnFinal(feed(x),{...row,league:"NBA"},{now}).ok,false);
 }
});
