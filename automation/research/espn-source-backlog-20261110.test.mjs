import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,lookupEspnFinal,findEspnFixtureEvent}
 from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";

// Actual official scoreboard evidence reported by the 2026-11-08
// read-only Github CI #2642 backlog probe, not guessed scores/fixtures.
const cases=[
 {league:"UEFA 챔피언스리그",home:"RC랑스",away:"코모1907",
  at:"2026-11-04T20:00:00.000Z",id:"401915305",
  sourceHome:"Lens",sourceAway:"Como",h:1,a:9},
 {league:"AFC 챔피언스리그 엘리트",home:"포항 스틸러스",away:"감바 오사카",
  at:"2026-11-04T10:00:00.000Z",id:"401912614",
  sourceHome:"Pohang Steelers",sourceAway:"Gamba Osaka",h:3,a:3}
];
const fixture=c=>({key:"audited-"+c.id,sport:"축구",league:c.league,
 home:c.home,away:c.away,startMs:Date.parse(c.at),verdict:"PENDING",
 pregameCapturedAt:Date.parse(c.at)-20*60000,
 odds:[{kind:"frozen-pre"}],fixtureId:null});
const event=(c,extra={})=>({id:c.id,date:c.at,completed:true,
 statusName:"STATUS_FULL_TIME",competitors:[
 {homeAway:"home",name:c.sourceHome,shortName:c.sourceHome,score:String(c.h)},
 {homeAway:"away",name:c.sourceAway,shortName:c.sourceAway,score:String(c.a)}
 ],...extra});
const source=(c,events=[event(c)])=>({ok:true,league:espnLeague(fixture(c)),events});

test("two independently audited overdue ESPN fixtures can only settle as unique official FINAL",()=>{
 for(const c of cases){
  const f=fixture(c),p=parseEspnFinal(source(c),f,{now:f.startMs+4*3600000});
  assert.equal(p.ok,true,JSON.stringify({c,reason:p.waitReason}));
  assert.equal(p.gameId,c.id);
  assert.deepEqual(p.result,{homeScore:c.h,awayScore:c.a});
  const state=mergeProviderFinal({records:[f]},f.key,p,f.startMs+4*3600000);
  assert.equal(state.records[0].verdict,"VERIFIED");
  assert.equal(state.records[0].resultSource,"ESPN");
  assert.equal(state.records[0].finalProviderGameId,c.id);
  assert.deepEqual(state.records[0].odds,f.odds,"immutable frozen PRE");
  assert.equal(state.records[0].pregameCapturedAt,f.pregameCapturedAt);
 }
});

test("new team aliases never bypass both teams, homeAway, numeric ID, league, kickoff, FINAL or score",()=>{
 for(const c of cases){
  const f=fixture(c),e=event(c),now=f.startMs+4*3600000;
  const bad=[
   {...e,id:"NOT_AN_ID"},
   {...e,date:new Date(f.startMs+3*3600000).toISOString()},
   {...e,completed:false},
   {...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,statusName:"STATUS_FINAL_PEN"},
   {...e,competitors:[{...e.competitors[0],name:"Other Club",shortName:"Other Club"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"Other Club",shortName:"Other Club"}]},
   {...e,competitors:e.competitors.map((p,i)=>({...p,homeAway:i?"home":"away"}))},
   {...e,competitors:[{...e.competitors[0],score:""},e.competitors[1]]}
  ];
  for(const b of bad)assert.equal(parseEspnFinal(source(c,[b]),f,{now}).ok,false,
   JSON.stringify({id:c.id,bad:b}));
  assert.equal(parseEspnFinal(source(c,[e,{...e,id:String(Number(c.id)+1)}]),f,{now}).ok,false);
  assert.equal(parseEspnFinal({...source(c),league:"eng.1"},f,{now}).ok,false);
 }
});

test("official ESPN shortName is usable only as a same-event, correct-side second label",()=>{
 const c=cases[0],f=fixture(c),now=f.startMs+4*3600000;
 const eventWithShort=event(c,{competitors:[
  {homeAway:"home",name:"unrecognized display",shortName:"Lens",score:"1"},
  {homeAway:"away",name:"Como",shortName:"Como",score:"9"}]});
 assert.equal(parseEspnFinal(source(c,[eventWithShort]),f,{now}).ok,true);
 const wrongShort={...eventWithShort,competitors:[
  eventWithShort.competitors[0],
  {homeAway:"away",name:"Other Club",shortName:"Other Club",score:"9"}]};
 assert.equal(parseEspnFinal(source(c,[wrongShort]),f,{now}).ok,false);
 const reversed={...eventWithShort,competitors:[
  {...eventWithShort.competitors[0],homeAway:"away"},
  {...eventWithShort.competitors[1],homeAway:"home"}]};
 assert.equal(findEspnFixtureEvent(source(c,[reversed]),f).ok,false);
});

test("third ESPN date bucket is queried only after ordinary source-day misses and can only rescue exact final",async()=>{
 const T=Date.parse("2026-11-04T11:30:00Z");
 const fixtureOnBoundary={...fixture(cases[0]),startMs:T};
 const e={...event(cases[0]),date:new Date(T).toISOString()};
 const calls=[],cache=new Map();
 const fetchFn=async url=>{
  calls.push(url);
  const day=new URL(url).searchParams.get("date");
  return {ok:true,status:200,json:async()=>source(cases[0],day==="20261105"?[e]:[])};
 };
 const o=await lookupEspnFinal(fixtureOnBoundary,{base:"https://example.test",
  now:T+5*3600000,cache,fetchFn});
 assert.equal(o.ok,true);
 assert.equal(o.gameId,cases[0].id);
 assert.deepEqual(calls.map(x=>new URL(x).searchParams.get("date")),
  ["20261104","20261103","20261105"]);
 const replay=await lookupEspnFinal(fixtureOnBoundary,{base:"https://example.test",
  now:T+5*3600000,cache,fetchFn});
 assert.equal(replay.ok,true);
 assert.equal(calls.length,3,"cross-fixture source URLs are cached");
 const wrong=await lookupEspnFinal(fixtureOnBoundary,{base:"https://example.test",
  now:T+5*3600000,
  fetchFn:async()=>({ok:true,status:200,json:async()=>source(cases[0],[
   {...e,competitors:[{...e.competitors[0],name:"Wrong",shortName:"Wrong"},e.competitors[1]]}
  ])})});
 assert.equal(wrong.ok,false,"extra discovery date never relaxes identity");
});
