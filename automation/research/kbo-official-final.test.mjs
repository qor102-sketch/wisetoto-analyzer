import test from "node:test";
import assert from "node:assert/strict";
import {isKboFixture,officialKboRequest,parseOfficialKboFinal,
 lookupOfficialKboFinal} from "./kbo-official-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const M=60000,H=3600000;
const cases=[
 {day:"20261106",at:"18:30",start:"2026-11-06T09:30:00.000Z",
  id:"20261106KTSS0",home:5,away:1},
 {day:"20261107",at:"14:00",start:"2026-11-07T05:00:00.000Z",
  id:"20261107KTSS0",home:10,away:5}
];
const row=(t=cases[0],home="삼성 라이온즈",away="KT 위즈")=>({
 key:t.id,sport:"야구",league:"KBO",home,away,startMs:Date.parse(t.start),
 verdict:"PENDING",pregameCapturedAt:Date.parse(t.start)-10*M,
 odds:[],latestOdds:[],final:null,fixtureId:null});
const game=(t=cases[0],extra={})=>({
 G_ID:t.id,G_DT:t.day,G_TM:t.at,SEASON_ID:2026,SR_ID:7,
 HOME_NM:"삼성",AWAY_NM:"KT",B_SCORE_CN:String(t.home),
 T_SCORE_CN:String(t.away),GAME_RESULT_CK:1,CANCEL_SC_ID:"0",
 CANCEL_SC_NM:"정상경기",...extra
});
const feed=(t,more)=>({game:more??[game(t)]});
test("two real Nov 6/7 official KBO postseason FINALS are proven by the source's unique ID, 1 flag, normal game and scores",()=>{
 for(const t of cases){
  const fixture=row(t),at=fixture.startMs+5*H;
  const p=parseOfficialKboFinal(feed(t),fixture,{now:at});
  assert.equal(p.ok,true,JSON.stringify({t,reason:p.waitReason}));
  assert.equal(p.gameId,t.id);
  assert.deepEqual(p.result,{homeScore:t.home,awayScore:t.away});
  const state=mergeProviderFinal({records:[fixture]},fixture.key,p,at);
  assert.equal(state.records[0].verdict,"VERIFIED");
  assert.equal(state.records[0].finalProviderGameId,t.id);
  assert.equal(state.records[0].resultSource,"KBO");
  assert.equal(state.records[0].finalEvidence,"KBO_OFFICIAL_NORMAL_GAME_FINAL");
 }
});
test("KBO official schedule is source-owned and no NPB/MLB/basketball/NBA accidentally qualifies",()=>{
 assert.equal(isKboFixture(row()),true);
 for(const fixture of [
  {...row(),league:"NPB"}, {...row(),league:"MLB"},
  {...row(),league:"NBA",sport:"농구"},
  {...row(),sport:"축구"}, {...row(),league:"KBL",sport:"농구"}
 ])assert.equal(isKboFixture(fixture),false);
 const req=officialKboRequest(row(cases[1]));
 assert.equal(new URL(req.url).hostname,"www.koreabaseball.com");
 const body=new URLSearchParams(req.body);
 assert.equal(body.get("date"),"20261107");
 assert.equal(body.get("leId"),"1");
 assert.ok(body.get("srId").includes("7"));
});
test("KBO wrong team, source date, season, game series, clock, ID, canceled or unfinal scores are quarantined",()=>{
 const t=cases[0],f=row(t),now=f.startMs+5*H;
 const bad=[
  game(t,{HOME_NM:"KT",AWAY_NM:"삼성"}),
  game(t,{HOME_NM:"SSG"}),
  game(t,{AWAY_NM:"KIA"}),
  game(t,{G_ID:"BAD"}),
  game(t,{G_ID:"20261107KTSS0"}),
  game(t,{G_DT:"20261107"}),
  game(t,{G_TM:"21:00"}),
  game(t,{SEASON_ID:2025}),
  game(t,{SR_ID:99}),
  game(t,{GAME_RESULT_CK:0}),
  game(t,{GAME_RESULT_CK:null}),
  game(t,{CANCEL_SC_ID:"1",CANCEL_SC_NM:"우천취소"}),
  game(t,{CANCEL_SC_ID:"0",CANCEL_SC_NM:"우천취소"}),
  game(t,{CANCEL_SC_NM:null}),
  game(t,{T_SCORE_CN:""}),
  game(t,{B_SCORE_CN:null}),
  game(t,{T_SCORE_CN:-1}),
  game(t,{B_SCORE_CN:100})
 ];
 for(const g of bad)
  assert.equal(parseOfficialKboFinal(feed(t,[g]),f,{now}).ok,false,JSON.stringify(g));
 assert.equal(parseOfficialKboFinal(feed(t,[game(t),{...game(t),G_ID:"20261106KTSS1"}]),
  f,{now}).ok,false,"ambiguous source same-team games may never certify");
 assert.equal(parseOfficialKboFinal(feed(t),f,{now:f.startMs+H}).ok,false);
 assert.equal(parseOfficialKboFinal({result:{game:[game(t)]}},f,{now}).ok,false);
});
test("KBO official HTTP outage or invalid schema keeps source-only PENDING",async()=>{
 const f=row(),at=f.startMs+5*H;
 for(const fetchFn of [
  async()=>{throw Error("TimeoutError")},
  async()=>({ok:false,status:504}),
  async()=>({ok:true,json:async()=>({bad:true})}),
  async()=>({ok:true,json:async()=>feed(cases[0],[game(cases[0],{GAME_RESULT_CK:0})])})
 ]){
  const result=await lookupOfficialKboFinal(f,{now:at,fetchFn});
  assert.equal(result.ok,false);
  const s=mergeProviderFinal({records:[f]},f.key,result,at);
  assert.equal(s.records[0].verdict,"PENDING");
 }
});
test("KBO same-date verification caches exactly one read; source is independently quota-protected from Naver 504",async()=>{
 const f=row(),at=f.startMs+5*H,cache=new Map();let calls=0;
 for(const fixture of [f,{...f,key:"alternative",home:"LG 트윈스"}]){
  await lookupOfficialKboFinal(fixture,{now:at,cache,fetchFn:async(url,options)=>{
   calls++;assert.equal(options.method,"POST");
   assert.equal(new URLSearchParams(options.body).get("date"),"20261106");
   return {ok:true,json:async()=>feed(cases[0])};
  }});
 }
 assert.equal(calls,1);assert.equal(cache.size,1);
 const pending=Array.from({length:10},(_,i)=>({...f,
  key:"kbo-"+i,checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN",lastResultCheckAt:0}));
 assert.equal(selectFinalAuditRows({records:pending},at,10).length,10);
});
