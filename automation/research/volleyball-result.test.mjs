import test from "node:test";
import assert from "node:assert/strict";
import {parseVolleyballSchedule,lookupVolleyballFinal} from "./volleyball-result.mjs";
const start=Date.parse("2026-10-27T10:00:00Z");
const fixture={sport:"배구",league:"V리그 남자",home:"대한항공",away:"현대캐피탈",startMs:start,fixtureId:null};
function game(overrides={}){
 return {gameId:"20261027VL001",gameDateTime:"2026-10-27T19:00:00",
  homeTeamName:"대한항공 점보스",awayTeamName:"현대캐피탈 스카이워커스",
  statusCode:"종료",homeScore:3,awayScore:2,...overrides};
}
test("ID-less volleyball final requires an exact fixture and independent completed status",()=>{
 const good=parseVolleyballSchedule({result:{games:[game()]}},fixture);
 assert.equal(good.ok,true);assert.equal(good.source,"NAVER");
 assert.deepEqual(good.result,{homeScore:3,awayScore:2});
 assert.equal(parseVolleyballSchedule({result:{games:[game({statusCode:"경기중"})]}},fixture).ok,false);
 assert.equal(parseVolleyballSchedule({result:{games:[game({homeScore:2,awayScore:2})]}},fixture).ok,false);
 assert.equal(parseVolleyballSchedule({result:{games:[game({awayTeamName:"삼성화재"})]}},fixture).ok,false);
 assert.equal(parseVolleyballSchedule({result:{games:[game(),game({gameId:"different"})]}},fixture).ok,false);
 assert.equal(parseVolleyballSchedule({result:{games:[game({gameDateTime:"2026-10-28T19:00:00"})]}},fixture).ok,false);
 assert.equal(parseVolleyballSchedule({result:{games:[game({gameDateTime:"2026-10-27T23:30:00"})]}},fixture).ok,false);
});
test("volleyball fallback handles HTTP429 first schedule then confirms unique second schedule",async()=>{
 const urls=[];
 const result=await lookupVolleyballFinal(fixture,{fetchFn:async url=>{
   urls.push(url);
   return urls.length===1?{ok:false,status:429}:{ok:true,json:async()=>({result:{games:[game()]}})};
 }});
 assert.equal(urls.length,2);
 assert.equal(result.ok,true);
 assert.deepEqual(result.providerErrors,["HTTP_429"]);
});
test("source outages, league mismatch and ambiguous matches never verify",async()=>{
 const bad=await lookupVolleyballFinal(fixture,{fetchFn:async()=>{throw Error("upstream failed")}});
 assert.equal(bad.ok,false);assert.match(bad.waitReason,/SOURCE_ERROR/);
 const foreign=await lookupVolleyballFinal({...fixture,league:"이탈리아 세리에A"},{fetchFn:async()=>{throw Error("should not fetch")}});
 assert.equal(foreign.ok,false);assert.equal(foreign.waitReason,"VOLLEYBALL_LEAGUE_UNSUPPORTED");
});
