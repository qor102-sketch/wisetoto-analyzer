import test from "node:test";
import assert from "node:assert/strict";
import {officialKLeagueId,officialKLeagueRequest,parseOfficialKLeagueFinal,
 lookupOfficialKLeagueFinal} from "./kleague-official-final.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
import {mergeProviderFinal,recordEspnKickoffEvidence} from "./collect-first.mjs";
import {diagnoseDataQuality} from "./data-quality-audit.mjs";
import {inspectEspnKickoffMismatch,parseEspnFinal} from "./espn-fast-final.mjs";

const T=Date.parse("2026-11-01T05:00:00Z"),H=3600000;
const fixture=(home="포항",away="제주",league="K리그1")=>({
 key:"fixture",sport:"축구",league,home,away,startMs:T,verdict:"PENDING",
 fixtureId:null,resultSource:null,final:null,lastResultCheckAt:null,
 odds:[],latestOdds:[],checkReason:"WAITING_FOR_END"});
const game=(extra={})=>({year:2026,leagueId:1,meetSeq:1,gameId:201,
 gameDate:"2026.11.01",gameTime:"14:00",homeTeam:"K03",homeTeamName:"POHANG",
 awayTeam:"K17",awayTeamName:"JEJU",gameStatus:"FE",endYn:"Y",
 homeGoal:1,awayGoal:1,...extra});
const payload=arr=>({data:{scheduleList:arr}});
test("exact official K League 1 FE+Y unique source fixture certifies provider final",()=>{
 const result=parseOfficialKLeagueFinal(payload([game()]),fixture(),{now:T+4*H});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.source,"KLEAGUE");
 assert.equal(result.gameId,"2026/1/1/201");
 assert.deepEqual(result.result,{homeScore:1,awayScore:1});
 const next=mergeProviderFinal({records:[fixture()]},fixture().key,result,T+4*H);
 assert.equal(next.records[0].verdict,"VERIFIED");
 assert.equal(next.records[0].resultSource,"KLEAGUE");
 assert.equal(next.records[0].finalProviderGameId,"2026/1/1/201");
});
test("official K League 2 accepts exact 2026 Nov game with known 1:0 result",()=>{
 const f=fixture("수원FC","안산","K리그2");
 const actual=game({leagueId:2,meetSeq:2,gameId:245,homeTeamName:"SUWON FC",
  awayTeamName:"ANSAN",homeGoal:1,awayGoal:0});
 const p=parseOfficialKLeagueFinal(payload([actual]),f,{now:T+4*H});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.gameId,"2026/2/2/245");
});
test("official K League league, sides, kickoff, game ID and completion cannot be inferred",()=>{
 const cases=[
  game({gameStatus:"NS",endYn:"N"}),
  game({gameStatus:"LIVE",endYn:"Y"}),
  game({gameStatus:"FE",endYn:"N"}),
  game({gameStatus:null,endYn:"Y"}),
  game({homeGoal:null}),
  game({awayGoal:null}),
  game({homeGoal:-1}),
  game({awayGoal:99}),
  game({gameId:null}),
  game({meetSeq:null}),
  game({gameDate:"2026.11.02"}),
  game({gameTime:"16:30"}),
  game({homeTeamName:"JEJU",awayTeamName:"POHANG"}),
  game({homeTeamName:"GWANGJU"}),
  game({leagueId:2}),
  game({year:2025})
 ];
 for(const x of cases){
  const p=parseOfficialKLeagueFinal(payload([x]),fixture(),{now:T+6*H});
  assert.equal(p.ok,false,JSON.stringify(x));
 }
 assert.equal(parseOfficialKLeagueFinal(payload([game()]),fixture(),{now:T+H}).ok,false);
 assert.equal(parseOfficialKLeagueFinal(payload([game()]),
  {...fixture(),league:"AFC 챔피언스리그 엘리트"},{now:T+4*H}).ok,false);
 assert.equal(parseOfficialKLeagueFinal(payload([game(),{...game(),gameId:202}]),
  fixture(),{now:T+5*H}).ok,false);
});
test("official K League is absent in out-of-competition and basketball cases",()=>{
 assert.equal(officialKLeagueId({...fixture(),league:"K리그2"}),2);
 assert.equal(officialKLeagueId({...fixture(),league:"K리그1"}),1);
 assert.equal(officialKLeagueId({...fixture(),league:"K리그1",sport:"농구"}),null);
 assert.equal(officialKLeagueId({...fixture(),league:"AFC 챔피언스리그2"}),null);
 const p=officialKLeagueRequest(fixture());
 assert.equal(JSON.parse(p.body).leagueId,1);
 assert.equal(JSON.parse(p.body).year,"2026");
 assert.equal(JSON.parse(p.body).month,"11");
});
test("multiple K League fixtures use only one source-owned monthly read",async()=>{
 const cache=new Map();let calls=0;
 for(const f of [fixture(),fixture("울산","강원")]){
  await lookupOfficialKLeagueFinal(f,{cache,now:T+4*H,fetchFn:async(url,options)=>{
   calls++;
   assert.equal(options.method,"POST");
   assert.equal(new URL(url).hostname,"www.kleague.com");
   return {ok:true,json:async()=>payload([game()])};
  }});
 }
 assert.equal(cache.size,1);
 assert.equal(calls,1);
});
test("timeouts, untrusted schema and unfinished score always preserve PENDING",async()=>{
 for(const fetchFn of [
  async()=>{throw new Error("TIMEOUT")},
  async()=>({ok:false,status:503}),
  async()=>({ok:true,json:async()=>({untrusted:"test"})}),
  async()=>({ok:true,json:async()=>payload([game({endYn:"N"})])})
 ]){
  const result=await lookupOfficialKLeagueFinal(fixture(),{fetchFn,now:T+6*H});
  assert.equal(result.ok,false);
  const state=mergeProviderFinal({records:[fixture()]},fixture().key,result,T+6*H);
  assert.equal(state.records[0].verdict,"PENDING");
 }
});
test("K League independent source bypasses failing Naver category within quota",()=>{
 const rows=Array.from({length:8},(_,i)=>({...fixture(),
  key:"k"+i,home:"H"+i,checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"}));
 const picked=selectFinalAuditRows({records:rows},T+30*H,8);
 assert.equal(picked.length,8);
});
test("ESPN exact both-team time mismatch only records observation, never confirms false final",()=>{
 const row={...fixture("리버풀","첼시","UEFA 챔피언스리그"),startMs:T};
 const e={id:"401888111",date:new Date(T+9*H).toISOString(),
  completed:true,statusName:"STATUS_FULL_TIME",
  competitors:[{homeAway:"home",name:"Liverpool",score:"2"},
   {homeAway:"away",name:"Chelsea",score:"0"}]};
 const source={ok:true,league:"uefa.champions",events:[e]};
 const evidence=inspectEspnKickoffMismatch(source,row);
 assert.equal(evidence.deltaMinutes,540);
 assert.equal(parseEspnFinal(source,row,{now:T+12*H}).ok,false);
 const state=recordEspnKickoffEvidence({records:[row]},row.key,evidence,T+10*H);
 assert.equal(state.records[0].startMs,T);
 assert.equal(state.records[0].verdict,"PENDING");
 assert.equal(state.records[0].espnKickoffEvidence.eventId,e.id);
 const q=diagnoseDataQuality(state,T+36*H);
 assert.equal(q.espnKickoffOffsets.FOUR_TO_TWELVE_HOURS,1);
 assert.equal(q.espnKickoffSamples[0].deltaMinutes,540);
});
test("ESPN ambiguous or conflicting club pairs do not produce misleading clock evidence",()=>{
 const row={...fixture("리버풀","첼시","UEFA 챔피언스리그"),startMs:T};
 const one={id:"401888111",date:new Date(T+9*H).toISOString(),
  competitors:[{homeAway:"home",name:"Liverpool"},
   {homeAway:"away",name:"Chelsea"}]};
 assert.equal(inspectEspnKickoffMismatch({ok:true,league:"uefa.champions",
  events:[one,{...one,id:"401888112"}]},row),null);
 const source={ok:true,league:"uefa.champions",events:[one]};
 assert.equal(inspectEspnKickoffMismatch(source,{...row,home:"첼시"}),null);
 assert.equal(recordEspnKickoffEvidence({records:[row]},row.key,null).records[0].espnKickoffEvidence,undefined);
});
