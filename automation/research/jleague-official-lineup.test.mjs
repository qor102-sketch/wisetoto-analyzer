import test from "node:test";
import assert from "node:assert/strict";
import {
 jleagueLineupDivision,jleagueLineupScheduleUrl,
 resolveJleagueOfficialLineup,parseJleagueStartingXi,lookupOfficialJleaguePregame
} from "./jleague-official-lineup.mjs";
const M=60_000,T=Date.parse("2026-11-21T06:00:00.000Z");
const fixture=(league="일본 J1리그")=>({
 key:"official-j1",sport:"축구",league,home:"Kashiwa Reysol",
 away:"Kawasaki Frontale",startMs:T,pregameCapturedAt:T-30*M,verdict:"PENDING"});
const card=(division="j1")=>({
 id:"match-2026112111",detailHref:"/match/"+division+"/2026/112111/",
 time:"15:00",homeTeam:{fullName:"Kashiwa Reysol"},
 awayTeam:{fullName:"Kawasaki Frontale"}
});
const matchDay=(item=card())=>{
 const inner=JSON.stringify({matchDate:"$D2026-11-21",matches:[item]});
 return '<html><script>self.__next_f.push([1,'+JSON.stringify(inner)+'])</script></html>';
};
const pos=i=>i===0?"GK":i<=4?"DF":i<=7?"MF":"FW";
const xi=()=>"<html><main><h2>Starting Lineup</h2>"+
 Array.from({length:11},(_,i)=>
  pos(i)+" "+(i+1)+" HomePlayer"+i+" "+pos(i)+" "+(i+1)+" AwayPlayer"+i).join(" ")+
 "</main><h2>Substitutes</h2></html>";
test("explicit J1/J2 labels only, never domestic/cup/no-Korean league",()=>{
 assert.equal(jleagueLineupDivision(fixture()),"j1");
 assert.equal(jleagueLineupDivision(fixture("일본 J2리그")),"j2");
 assert.equal(jleagueLineupDivision(fixture("K리그1")),null);
 assert.equal(jleagueLineupDivision(fixture("J리그 컵")),null);
 assert.match(jleagueLineupScheduleUrl(fixture()),/\/en\/j1\/match\/search-list\//);
 assert.match(jleagueLineupScheduleUrl(fixture("일본 J2리그")),/\/en\/j2\/match\/search-list\//);
});
test("official daily list proves match ID, teams, kickoff and source URL",()=>{
 const x=resolveJleagueOfficialLineup(matchDay(),fixture());
 assert.equal(x.ok,true,JSON.stringify(x));
 assert.equal(x.gameId,"j1/2026/112111");
 assert.equal(x.url,"https://www.jleague.jp/en/match/j1/2026/112111/lineup/");
 const j2=resolveJleagueOfficialLineup(matchDay(card("j2")),fixture("일본 J2리그"));
 assert.equal(j2.ok,true,JSON.stringify(j2));
 assert.equal(j2.gameId,"j2/2026/112111");
});
test("mismatched source identity and two plausible matches are refused",()=>{
 for(const change of [
  {awayTeam:{fullName:"Yokohama F･Marinos"}},
  {detailHref:"/match/j1/2026/112212/"},
  {id:"match-2026112112"},
  {time:"10:00"},
  {homeTeam:{fullName:"Another Team"}}
 ]){
  const x=resolveJleagueOfficialLineup(matchDay({...card(),...change}),fixture());
  assert.equal(x.ok,false,JSON.stringify({change,x}));
 }
});
test("official XI parser requires exactly 11 named players on each side",()=>{
 const x=parseJleagueStartingXi(xi());
 assert.equal(x.ok,true,JSON.stringify(x));
 assert.equal(x.home.length,11);assert.equal(x.away.length,11);
 assert.equal(x.home[0],"HomePlayer0");assert.equal(x.away[10],"AwayPlayer10");
 assert.equal(parseJleagueStartingXi(xi().replace("AwayPlayer10","AwayPlayer0")).ok,false);
 assert.equal(parseJleagueStartingXi(xi().replace("FW 11 AwayPlayer10","")).ok,false);
 assert.equal(parseJleagueStartingXi(xi().replace("Substitutes","None")).ok,false);
});
test("live network response captured before kickoff becomes PRE, not a later backfill",async()=>{
 let calls=[];
 const row=fixture();
 const out=await lookupOfficialJleaguePregame(row,{now:()=>T-M,
  fetchFn:async url=>{
   calls.push(url);
   return {ok:true,status:200,text:async()=>url.includes("/lineup/")?xi():matchDay()};
  }});
 assert.equal(out.status,"CONFIRMED",JSON.stringify(out));
 assert.equal(out.homeCount,11);assert.equal(out.awayCount,11);
 assert.equal(out.capturedAt,T-M);assert.equal(out.gameId,"j1/2026/112111");
 assert.equal(calls.length,2);
 const after=await lookupOfficialJleaguePregame(row,{now:()=>T+M,
  fetchFn:async()=>{throw Error("postmatch request must never happen")}});
 assert.equal(after.status,"REJECTED");
});
test("late official lineup response is rejected and official 502 is not invented",async()=>{
 const row=fixture();let clock=T-M;
 const late=await lookupOfficialJleaguePregame(row,{now:()=>clock,fetchFn:async url=>{
  if(url.includes("/lineup/"))clock=T+M;
  return {ok:true,status:200,text:async()=>url.includes("/lineup/")?xi():matchDay()};
 }});
 assert.equal(late.status,"REJECTED");
 const broken=await lookupOfficialJleaguePregame(row,{now:()=>T-M,
  fetchFn:async()=>({ok:false,status:502,text:async()=>""})});
 assert.equal(broken.status,"UNAVAILABLE");
 assert.equal(broken.reason,"JLEAGUE_SOURCE_HTTP_502");
});
