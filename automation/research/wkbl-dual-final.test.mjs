import test from "node:test";
import assert from "node:assert/strict";
import {auditedWkblGames,isOfficialWkblFixture,hasAuditedWkblFixture,
 parseWkblDualFinal,lookupWkblDualFinal} from "./wkbl-dual-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
const quarter=[
 [21,18,19,18,19,14,15,19], [12,16,24,10,19,15,13,18],
 [18,16,18,14,16,13,13,11], [14,21,18,21,25,14,16,9],
 [19,16,12,13,14,8,12,14], [8,17,13,8,18,16,15,10]
];
const row=e=>({key:"wkbl-"+e.id,sport:"농구",league:"WKBL",home:e.home,away:e.away,
 startMs:Date.parse(e.date+"T"+e.time+":00+09:00"),
 verdict:"PENDING",odds:[{phase:"PRE",frozen:true},{phase:"TOP1",frozen:true}],
 pregameCapturedAt:Date.parse(e.date+"T"+e.time+":00+09:00")-1800000});
const official=e=>'<html><title>WKBL 데이터랩</title><body>'+
 ' '.repeat(900)+'2026-2027 2026년 11월 경기정보 전력분석 '+
 e.date.slice(0,4)+'년 '+e.date.slice(5,7)+'월 '+e.date.slice(8)+'일 금요일 / '+
 e.time+' / '+e.venue+' '+e.wkHome+' [1승 1패] '+e.homeScore+' '+
 e.wkAway+' [2승 1패] '+e.awayScore+
 ' Play-By-Play Lead Tracker Shotcharts Timeline 팀 기록 PLAY BY PLAY 1쿼터 2쿼터 3쿼터 4쿼터</body></html>';
const wire=(e,i)=>{
 const winner=e.winnerSide==="home"?e.homeScore:e.awayScore;
 const loser=e.winnerSide==="home"?e.awayScore:e.homeScore;
 const q=quarter[i].reduce((s,n,j)=>s+(j&&j%2===0?" ":"")+
  (j%2===1?"-":"")+n,"");
 const t=e.time==="14:00"?"16:00":e.time==="16:00"?"18:09":"21:05";
 return '<html><title>[여자농구 '+e.wireVenue.replace(/ .*/,"")+
 '전적] '+e.wireWinner+' '+winner+'-'+loser+' '+e.wireLoser+
 ' | 연합뉴스</title><body>'+' '.repeat(700)+'여자농구 경기 종료 소식 '+
 '송고 '+e.date+' '+t+' ◇ '+Number(e.date.slice(8))+
 '일 전적('+e.wireVenue+') 청주 '+e.wireWinner+' '+
 winner+'('+q+')'+loser+' 인천 '+e.wireLoser+'</body></html>';
};
test("six real WKBL official+trusted published finals match original teams, clock, quarters and immutable PRE",()=>{
 assert.equal(auditedWkblGames.length,6);
 assert.equal(new Set(auditedWkblGames.map(e=>e.id)).size,6);
 auditedWkblGames.forEach((e,i)=>{
  const f=row(e),now=f.startMs+6*3600000;
  assert.equal(hasAuditedWkblFixture(f),true);
  const p=parseWkblDualFinal(official(e),wire(e,i),f,{now});
  assert.equal(p.ok,true,JSON.stringify({id:e.id,reason:p.waitReason}));
  assert.equal(p.source,"WKBL");
  assert.equal(p.gameId,e.id);
  assert.deepEqual(p.result,{homeScore:e.homeScore,awayScore:e.awayScore});
  const s=mergeProviderFinal({records:[f]},f.key,p,now);
  assert.equal(s.records[0].verdict,"VERIFIED");
  assert.equal(s.records[0].resultSource,"WKBL");
  assert.equal(s.records[0].finalProviderGameId,e.id);
  assert.deepEqual(s.records[0].odds,f.odds);
  assert.equal(s.records[0].pregameCapturedAt,f.pregameCapturedAt);
 });
});
test("WKBL refuses official score without published postmatch final, and false date/score/team/venue/quarters",()=>{
 auditedWkblGames.forEach((e,i)=>{
  const f=row(e),now=f.startMs+6*3600000,o=official(e),w=wire(e,i);
  const negatives=[
   [o,""],["",w],
   [o,w.replace("전적]", "경기예고]")],
   [o,w.replace(e.wireWinner,"다른팀")],
   [o,w.replace(e.wireLoser,"다른팀")],
   [o,w.replace("송고 "+e.date,"송고 2026-10-03")],
   [o,w.replace("전적("+e.wireVenue+")","전적(다른체육관)")],
   [o,w.replace("("+quarter[i].reduce((s,n,j)=>s+(j&&j%2===0?" ":"")+
     (j%2===1?"-":"")+n,"")+")","(1-2 3-4 5-6 7-8)")],
   [o.replace(e.venue,"다른체육관"),w],
   [o.replace(e.time+" / ", "09:01 / "),w],
   [o.replace(e.wkHome+" [", "다른팀 ["),w],
   [o.replace(e.wkAway+" [", "다른팀 ["),w],
   [o.replace(" "+e.homeScore+" "," 0 "),w],
   [o.replace(" "+e.awayScore+" Play"," 0 Play"),w]
  ];
  for(const [mutation,[oh,wh]] of negatives.entries()){
   const p=parseWkblDualFinal(oh,wh,f,{now});
   assert.equal(p.ok,false,JSON.stringify({id:e.id,mutation,reason:p.waitReason}));
  }
  assert.equal(parseWkblDualFinal(o,w,{...f,league:"NBA"},{now}).ok,false);
  assert.equal(parseWkblDualFinal(o,w,{...f,sport:"축구"},{now}).ok,false);
  assert.equal(parseWkblDualFinal(o,w,{...f,away:"unrelated"},{now}).ok,false);
  assert.equal(parseWkblDualFinal(o,w,{...f,startMs:f.startMs+3*3600000},{now}).ok,false);
  assert.equal(parseWkblDualFinal(o,w,f,{now:f.startMs+140*60000}).ok,false);
 });
});
test("WKBL official and trusted press URLs are both required with bounded cached reads",async()=>{
 const docs=new Map(),requests=[];
 auditedWkblGames.forEach((e,i)=>{
  docs.set("https://datalab.wkbl.or.kr/gameinfo?id="+e.id,official(e));
  docs.set("https://www.yna.co.kr/view/"+e.wireId,wire(e,i));
 });
 const fetchFn=async url=>{
  requests.push(url);
  return {ok:docs.has(url),status:docs.has(url)?200:404,
   text:async()=>docs.get(url)??""};
 };
 const cache=new Map();
 for(const e of auditedWkblGames){
  const f=row(e),now=f.startMs+6*3600000;
  const p=await lookupWkblDualFinal(f,{fetchFn,cache,now});
  assert.equal(p.ok,true,JSON.stringify({id:e.id,reason:p.waitReason}));
  const p2=await lookupWkblDualFinal(f,{fetchFn,cache,now});
  assert.equal(p2.ok,true);
 }
 assert.equal(requests.length,12,"six official game URLs and six postmatch final reports");
 const failed=await lookupWkblDualFinal(row(auditedWkblGames[0]),{
  fetchFn:async()=>({ok:false,status:503}),now:Date.now()});
 assert.equal(failed.ok,false);
 assert.match(failed.waitReason,/WKBL_SOURCE_HTTP_503/);
});
