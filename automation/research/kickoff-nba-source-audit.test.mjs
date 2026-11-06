import test from "node:test";
import assert from "node:assert/strict";
import {espnKickoffCandidateInfo,diagnoseEspnIdentity,parseEspnFinal}
 from "./espn-fast-final.mjs";
import {classifyNbaPregamePublication} from "./pregame-lineup.mjs";
import {finalFailureCategory} from "./data-quality-audit.mjs";
const T=Date.parse("2026-11-06T12:00:00Z"),H=3600000,M=60000;
const fixture={key:"f",sport:"축구",league:"UEFA 챔피언스리그",
 home:"리버풀",away:"첼시",startMs:T,verdict:"PENDING"};
const event={id:"401922001",date:new Date(T+4*H).toISOString(),
 completed:true,statusName:"STATUS_FINAL",competitors:[
  {homeAway:"home",name:"Liverpool",score:"2"},
  {homeAway:"away",name:"Chelsea",score:"1"}]};
const source=events=>({ok:true,league:"uefa.champions",events});
test("a 240-minute source clock candidate remains an audit only, not a VERIFIED fixture",()=>{
 const p=source([event]);
 assert.deepEqual(espnKickoffCandidateInfo(p,fixture),{
  unique:true,candidates:1,gameId:event.id,sourceAt:event.date,deltaMinutes:240
 });
 assert.equal(diagnoseEspnIdentity(p,fixture).waitReason,"ESPN_KICKOFF_MISMATCH");
 assert.equal(parseEspnFinal(p,fixture,{now:T+10*H}).ok,false);
 assert.equal(espnKickoffCandidateInfo(source([{...event,
  competitors:[{homeAway:"home",name:"Chelsea"},{homeAway:"away",name:"Liverpool"}]}]),fixture).unique,false);
});
test("ambiguous official kickoff candidates cannot silently fix a Betman schedule",()=>{
 const p=source([event,{...event,id:"401922002"}]);
 const outcome=espnKickoffCandidateInfo(p,fixture);
 assert.equal(outcome.unique,false);
 assert.equal(outcome.candidates,2);
 assert.equal(parseEspnFinal(p,fixture,{now:T+10*H}).ok,false);
 const conflicting=source([event,{...event,date:new Date(T+5*H).toISOString()}]);
 assert.equal(espnKickoffCandidateInfo(conflicting,fixture).unique,false);
});
test("different ESPN source leagues do not suggest a clock correction",()=>{
 const p={...source([event]),league:"uefa.europa"};
 assert.equal(espnKickoffCandidateInfo(p,fixture).unique,false);
});
test("empty same-day scoreboard is not documented proof of a different kickoff",()=>{
 assert.equal(finalFailureCategory({...fixture,
  checkReason:"ESPN_FAST:ESPN_NO_EVENTS_NEAR_KICKOFF"}),"ESPN_NO_EVENTS_NEAR_KICKOFF");
 assert.equal(finalFailureCategory({...fixture,
  checkReason:"ESPN_FAST:ESPN_KICKOFF_MISMATCH"}),"ESPN_MATCH_TEAMS_DIFFERENT_KICKOFF");
});
test("NBA PRE source audit distinguishes actual T-minus windows and unavailable 5+5",()=>{
 const row={sport:"농구",league:"NBA",startMs:T};
 let p=classifyNbaPregamePublication(row,{
  status:"UNAVAILABLE",reason:"ESPN_NBA_STARTERS_NOT_PUBLISHED"},T-8*M,T-7*M);
 assert.equal(p.inside45,true);assert.equal(p.inside15,true);
 assert.equal(p.unpublished,true);assert.equal(p.confirmedBeforeTipoff,false);
 p=classifyNbaPregamePublication(row,{
  status:"UNAVAILABLE",reason:"ESPN_EXACT_IDENTITY_NOT_PROVEN"},T-40*M,T-39*M);
 assert.equal(p.inside45,true);assert.equal(p.inside15,false);
 assert.equal(p.identityUnproven,true);
 p=classifyNbaPregamePublication(row,{
  status:"UNAVAILABLE",reason:"ESPN_SUMMARY_NETWORK:TimeoutError"},T-10*M,T-9*M);
 assert.equal(p.networkFailure,true);
});
test("NBA 5+5 after tipoff is rejected and forecasts are not counted as published PRE",()=>{
 const row={sport:"농구",league:"NBA",startMs:T};
 const after=classifyNbaPregamePublication(row,{
  status:"CONFIRMED",homeCount:5,awayCount:5,reason:"VERIFIED"
 },T-2*M,T+M);
 assert.equal(after.afterTipoffRejected,true);
 assert.equal(after.confirmedBeforeTipoff,false);
 const before=classifyNbaPregamePublication(row,{
  status:"CONFIRMED",homeCount:5,awayCount:5,reason:"VERIFIED"
 },T-2*M,T-M);
 assert.equal(before.confirmedBeforeTipoff,true);
 assert.equal(classifyNbaPregamePublication({...row,sport:"야구"},{
  status:"CONFIRMED"},T-2*M,T-M),null);
 assert.equal(classifyNbaPregamePublication(row,{status:"CONFIRMED"},T,T+M),null);
});
