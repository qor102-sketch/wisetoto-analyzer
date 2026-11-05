import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseEspnIdentity,espnScoreboardDates,parseEspnFinal,lookupEspnFinal}
 from "./espn-fast-final.mjs";
import {diagnoseDataQuality,nbaPregameFailureCategory} from "./data-quality-audit.mjs";
const T=Date.parse("2026-11-04T23:30:00Z"),H=3600000;
const fixture={key:"fixture",sport:"축구",league:"UEFA 챔피언스리그",
 home:"리버풀",away:"첼시",startMs:T,verdict:"PENDING"};
const event=(extra={})=>({id:"401111111",date:new Date(T).toISOString(),
 completed:true,statusName:"STATUS_FINAL",
 competitors:[{homeAway:"home",name:"Liverpool",score:"2"},
  {homeAway:"away",name:"Chelsea",score:"1"}],...extra});
const payload=events=>({ok:true,league:"uefa.champions",events});
const why=events=>diagnoseEspnIdentity(payload(events),fixture).waitReason;
test("ESPN absence, kickoff, side and source name mismatch remain separate PENDING causes",()=>{
 assert.equal(why([]),"ESPN_SCOREBOARD_EMPTY");
 assert.equal(why([event({date:new Date(T+4*H).toISOString()})]),"ESPN_KICKOFF_MISMATCH");
 assert.equal(why([event({competitors:[{homeAway:"home",name:"Chelsea"},{homeAway:"away",name:"Liverpool"}]})]),
  "ESPN_HOME_AWAY_REVERSED");
 assert.equal(why([event({competitors:[{homeAway:"home",name:"Liverpool"},{homeAway:"away",name:"Bologna"}]})]),
  "ESPN_AWAY_TEAM_NOT_MATCHED");
 assert.equal(why([event({competitors:[{homeAway:"home",name:"Bologna"},{homeAway:"away",name:"Chelsea"}]})]),
  "ESPN_HOME_TEAM_NOT_MATCHED");
 assert.equal(why([event({competitors:[{homeAway:"home",name:"Bologna"},{homeAway:"away",name:"Milan"}]})]),
  "ESPN_TEAMS_NOT_ON_SCOREBOARD");
 assert.equal(why([event({id:"missing-id"})]),"ESPN_MISSING_NUMERIC_EVENT_ID");
 assert.equal(why([event(),event({id:"401111112"})]),"ESPN_AMBIGUOUS_FIXTURE");
 assert.equal(why([event(),event({competitors:[{homeAway:"home",name:"Liverpool",score:"0"},
  {homeAway:"away",name:"Chelsea",score:"0"}]})]),"ESPN_CONFLICTING_EVENT_ID");
});
test("the same exact ESPN fixture still requires completed state and score, not status-by-clock",()=>{
 for(const p of [
  payload([event({completed:false})]),
  payload([event({statusName:"STATUS_IN_PROGRESS"})]),
  payload([event({statusName:"STATUS_FINAL_ET"})]),
  payload([event({competitors:[{homeAway:"home",name:"Liverpool",score:""},
   {homeAway:"away",name:"Chelsea",score:"1"}]})]),
  payload([event({id:"NO_ID"})]),
  payload([event(),event({id:"401111112"})]),
  {...payload([event()]),league:"eng.1"}
 ])assert.equal(parseEspnFinal(p,fixture,{now:T+5*H}).ok,false);
 assert.equal(parseEspnFinal(payload([event()]),fixture,{now:T+5*H}).ok,true);
});
test("ESPN scoreboard local adjacent calendar date can rescue only an exact final",async()=>{
 assert.deepEqual(espnScoreboardDates(fixture),["20261104","20261105"]);
 const calls=[],cache=new Map();
 const fetchFn=async url=>{
  calls.push(url);
  const date=new URL(url).searchParams.get("date");
  return {ok:true,status:200,json:async()=>payload(date==="20261105"?[event()]:[])};
 };
 const found=await lookupEspnFinal(fixture,{base:"https://example.test",fetchFn,now:T+5*H,cache});
 assert.equal(found.ok,true);
 assert.equal(found.gameId,"401111111");
 assert.equal(calls.length,2);
 const repeated=await lookupEspnFinal(fixture,{base:"https://example.test",fetchFn,now:T+5*H,cache});
 assert.equal(repeated.ok,true);
 assert.equal(calls.length,2,"both scoreboard dates must be cached for the same scan");
 const fake=await lookupEspnFinal(fixture,{base:"https://example.test",now:T+5*H,
  fetchFn:async()=>({ok:true,status:200,json:async()=>payload([event({
   competitors:[{homeAway:"home",name:"Wrong"},{homeAway:"away",name:"Chelsea"}]
  })])})});
 assert.equal(fake.ok,false);
});
test("quality audit exposes overlapping ESPN absence and Naver outage without double-counting fixtures",()=>{
 const row={...fixture,startMs:T-2*86400000,
  checkReason:"ESPN_FAST:ESPN_SCOREBOARD_EMPTY | NAVER_FAST:NAVER_DIRECT_NETWORK:TimeoutError",
  resultErrors:[{reasons:["ESPN_SCOREBOARD_EMPTY","NAVER_DIRECT_NETWORK:TimeoutError"]}]};
 const audit=diagnoseDataQuality({records:[row]},T);
 assert.equal(audit.overdue24h,1);
 assert.equal(audit.byReason.ESPN_SCHEDULE_EMPTY,1);
 assert.equal(audit.byConcurrentFailure.ESPN_IDENTITY_OR_SCHEDULE,1);
 assert.equal(audit.byConcurrentFailure.NAVER_NETWORK_OR_50X,1);
 assert.equal(audit.bySport["축구"],1);
});

test("NBA genuine PRE diagnostics separate source unlisted from not-published starters",()=>{
 const startMs=T-3*H,base={sport:"농구",league:"NBA",startMs};
 const pending=(reason)=>({...base,lineup:{status:"UNAVAILABLE",attempts:2,lastError:reason}});
 assert.equal(nbaPregameFailureCategory(pending("ESPN_SCOREBOARD_EMPTY")),"ESPN_FIXTURE_NOT_LISTED");
 assert.equal(nbaPregameFailureCategory(pending("ESPN_NO_EVENTS_NEAR_KICKOFF")),"ESPN_FIXTURE_NOT_LISTED");
 assert.equal(nbaPregameFailureCategory(pending("ESPN_HOME_AWAY_REVERSED")),"ESPN_IDENTITY_UNCONFIRMED");
 assert.equal(nbaPregameFailureCategory(pending("ESPN_KICKOFF_MISMATCH")),"ESPN_IDENTITY_UNCONFIRMED");
 assert.equal(nbaPregameFailureCategory(pending("ESPN_NBA_STARTERS_NOT_PUBLISHED")),"NBA_STARTERS_UNPUBLISHED");
 assert.notEqual(nbaPregameFailureCategory(pending("ESPN_NBA_STARTERS_NOT_PUBLISHED")),"CONFIRMED_5V5");
});
