import test from "node:test";
import assert from "node:assert/strict";
import {decodeOfficialJ2Flight,officialJ2Matches,parseJleagueJ2Final,
 lookupJleagueJ2Final,officialJ2ListUrl,isJleagueJ2} from "./jleague-j2-final.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
const T=Date.parse("2026-11-03T05:00:00Z"),H=3600000,M=60000;
const row=(key,home="카탈레 도야마",away="베갈타 센다이")=>({
 key,sport:"축구",league:"일본 J2리그",home,away,startMs:T,verdict:"PENDING",
 lastResultCheckAt:null,fixtureId:null,odds:[],latestOdds:[]
});
function card(id="2026110307",home="Kataller Toyama",away="Vegalta Sendai"){
 return {id,state:"game-over",detailHref:"/match/j2/2026/110307",
  time:"13:57",homeTeam:{name:home,fullName:home,score:1},
  awayTeam:{name:away,fullName:away,score:0}};
}
function makeHtml(cards=[card()],day="2026-11-03"){
 const source='"matchDate":"$D'+day+'T00:00:00.000Z","seasonText":"Meiji Yasuda","matches":'+
  JSON.stringify(cards);
 // This is a synthetic Next Flight fixture, not official scraped material.
 const split=Math.floor(source.length/2);
 return "<!doctype html><script>self.__next_f.push([1,"+
  JSON.stringify(source.slice(0,split))+
  "])</script><script>self.__next_f.push([1,"+
  JSON.stringify(source.slice(split))+
  "])</script>";
}
test("J2 official SSR parser sees unique match, date, teams and explicit full time only",()=>{
 const h=makeHtml();
 const decoded=decodeOfficialJ2Flight(h);
 assert.ok(decoded.includes('"matchDate"'));
 assert.equal(officialJ2Matches(h).matches.length,1);
 const p=parseJleagueJ2Final(h,row("toy"),{now:T+4*H});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.source,"JLEAGUE");
 assert.equal(p.gameId,"2026/110307");
 assert.deepEqual(p.result,{homeScore:1,awayScore:0});
 assert.equal(p.sourceEvidence,"JLEAGUE_OFFICIAL_J2_FULL_TIME");
});
test("J2 2026/27 season date check and true official URL are mandatory",()=>{
 const fixture=row("toy");
 for(const bad of [
  {...card(),id:"2026110308"},
  {...card(),detailHref:"/en/match/j1/2026/110307/"},
  {...card(),detailHref:"https://unknown.example/en/match/j2/2026/110307/"},
  {...card(),detailHref:"/en/match/j2/2025/110307/"},
  {...card(),detailHref:"/en/match/j2/2026/110407/"},
  {...card(),time:"15:03"},
  {...card(),time:""},
  {...card(),homeTeam:{...card().homeTeam,fullName:"Different FC"}},
  {...card(),awayTeam:{...card().awayTeam,fullName:"Wrong Away"}}
 ]){
  assert.equal(parseJleagueJ2Final(makeHtml([bad]),fixture,{now:T+4*H}).ok,false,JSON.stringify(bad));
 }
});
test("never infer FINAL from plausible score, kickoff, fixture age or a page title",()=>{
 const f=row("toy");
 for(const state of ["SCHEDULED","LIVE","HALF_TIME","EXTRA_TIME","POSTPONED",null,undefined]){
  const verdict=parseJleagueJ2Final(makeHtml([{...card(),state}]),f,{now:T+10*H});
  assert.equal(verdict.ok,false,"unexpected accepted state "+String(state)+" "+JSON.stringify(verdict));
 }
 for(const scores of [[null,0],[1,null],[-1,0],[1.1,0],["",0],[99,0]]){
  const c=card();c.homeTeam.score=scores[0];c.awayTeam.score=scores[1];
  assert.equal(parseJleagueJ2Final(makeHtml([c]),f,{now:T+4*H}).ok,false);
 }
 assert.equal(parseJleagueJ2Final(makeHtml(),f,{now:T+H}).ok,false);
 assert.equal(parseJleagueJ2Final("<html>Full Time 1-0</html>",f,{now:T+5*H}).ok,false);
});
test("duplicate identity, contradictory official cards and wrong competition remain PENDING",()=>{
 const f=row("toy"),g=card();
 assert.equal(parseJleagueJ2Final(makeHtml([g,{...g,id:"2026110308",
  detailHref:"/en/match/j2/2026/110308/"}]),f,{now:T+5*H}).ok,false);
 assert.equal(parseJleagueJ2Final(makeHtml([g,{...g,homeTeam:{...g.homeTeam,score:2}}]),f,{now:T+5*H}).ok,false);
 assert.equal(parseJleagueJ2Final(makeHtml(),{...f,league:"일본 J1리그"},{now:T+5*H}).ok,false);
 assert.equal(parseJleagueJ2Final(makeHtml(),{...f,home:f.away,away:f.home},{now:T+5*H}).ok,false);
});
test("one real official date fetch is shared across multiple J2 candidates; no Naver or ESPN inference",async()=>{
 const fx=[row("toy"),row("other","RB오미야 아르디자","이와키FC")];
 const second={...card("2026110308","RB Omiya Ardija","IWAKI FC"),
  detailHref:"/en/match/j2/2026/110308/",homeTeam:{fullName:"RB Omiya Ardija",score:2},
  awayTeam:{fullName:"IWAKI FC",score:1},time:"14:03"};
 const html=makeHtml([card(),second]),cache=new Map();
 let calls=0;
 for(const x of fx){
  const r=await lookupJleagueJ2Final(x,{now:T+5*H,cache,fetchFn:async (url,opts)=>{
   calls++;
   assert.ok(url.startsWith("https://www.jleague.jp/en/j2/match/search-list/?"));
   assert.equal(opts.redirect,"error");
   return {ok:true,status:200,text:async()=>html};
  }});
  assert.equal(r.ok,true,JSON.stringify(r));
 }
 assert.equal(calls,1);
 assert.equal(cache.size,1);
 assert.ok(isJleagueJ2(fx[0]));
 assert.match(officialJ2ListUrl(fx[0]),/startdate=2026-11-03/);
});
test("HTTP/timeout/invalid official HTML cannot convert pending game to VERIFIED",async()=>{
 const fixture=row("no"),prior={records:[fixture]};
 for(const fetchFn of [
  async()=>({ok:false,status:429}),
  async()=>({ok:true,status:200,text:async()=>"<html>Full Time</html>"}),
  async()=>{throw Error("official J2 network timeout")}
 ]){
  const candidate=await lookupJleagueJ2Final(fixture,{fetchFn,now:T+5*H});
  assert.equal(candidate.ok,false);
  const next=mergeProviderFinal(prior,fixture.key,candidate,T+5*H);
  assert.equal(next.records[0].verdict,"PENDING");
  assert.ok(next.records[0].final==null);
 }
 const confirmed=mergeProviderFinal(prior,fixture.key,
  parseJleagueJ2Final(makeHtml(),fixture,{now:T+5*H}),T+5*H);
 assert.equal(confirmed.records[0].verdict,"VERIFIED");
 assert.equal(confirmed.records[0].resultSource,"JLEAGUE");
 assert.equal(confirmed.records[0].finalProviderGameId,"2026/110307");
 assert.deepEqual(confirmed.records[0].final,{homeScore:1,awayScore:0});
});
test("J2 official source gets independent retry share; Naver-only unsupported league circuit quota remains",()=>{
 const j2=Array.from({length:12},(_,i)=>({...row("j2-"+i),checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"}));
 const domestic=Array.from({length:12},(_,i)=>({...row("k-"+i),league:"K리그3",checkReason:"NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN"}));
 const picked=selectFinalAuditRows({records:[...domestic,...j2]},T+5*H,24);
 assert.equal(picked.filter(r=>r.league==="일본 J2리그").length,12);
 assert.equal(picked.filter(r=>r.league==="K리그3").length,2);
});
