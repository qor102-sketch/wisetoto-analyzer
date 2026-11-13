import test from "node:test";
import assert from "node:assert/strict";
import {jleagueCupAuditedFixtures,isJleagueCupFixture,hasAuditedJleagueCupFixture,
 officialJleagueCupUrl,parseJleagueCupFinal,lookupOfficialJleagueCupFinal}
 from "./jleague-cup-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
const f=e=>({key:"cup-"+e.id,sport:"축구",league:"일본 리그컵",
 home:e.home,away:e.away,startMs:Date.parse(e.date+"T"+e.time+":00+09:00"),
 verdict:"PENDING",odds:[{source:"PRE",frozen:true}],pregameCapturedAt:
 Date.parse(e.date+"T"+e.time+":00+09:00")-3600000});
const markup=(e,{title="試合結果・データ（Ｊリーグ ルヴァンカップ）",
  day=e.date,home=e.jpHome,away=e.jpAway,finish="試合終了",
  score=e.score,after=""}={})=>
 '<!doctype html><html><head><title>'+title+
 ' 2026年'+Number(day.slice(5,7))+'月'+Number(day.slice(8))+
 '日</title></head><body><nav>'+("official-nav ".repeat(24))+
 '</nav><div>'+home+' vs '+away+' '+
 day.replaceAll("-","/")+' (水) '+e.time+' KO 準々決勝 第1戦 '+
 home+' 神戸 '+finish+' '+score[0]+' - '+score[1]+' '+after+away+
 ' 入場者数: 10000人</div></body></html>';
test("seven official Levain Cup 2026 finals are unique, strict and preserve original PRE",()=>{
 assert.equal(jleagueCupAuditedFixtures.length,7);
 assert.equal(new Set(jleagueCupAuditedFixtures.map(x=>x.id)).size,7);
 for(const e of jleagueCupAuditedFixtures){
  const row=f(e),now=row.startMs+5*3600000;
  assert.equal(isJleagueCupFixture(row),true);
  assert.equal(hasAuditedJleagueCupFixture(row),true);
  assert.match(officialJleagueCupUrl(row),new RegExp(e.id));
  const proof=parseJleagueCupFinal(markup(e),row,{now});
  assert.equal(proof.ok,true,JSON.stringify({id:e.id,reason:proof.waitReason}));
  assert.equal(proof.gameId,e.id);
  assert.deepEqual(proof.result,{homeScore:e.score[0],awayScore:e.score[1]});
  const settled=mergeProviderFinal({records:[row]},row.key,proof,now);
  assert.equal(settled.records[0].verdict,"VERIFIED");
  assert.equal(settled.records[0].resultSource,"JLEAGUE");
  assert.equal(settled.records[0].finalProviderGameId,e.id);
  assert.deepEqual(settled.records[0].odds,row.odds);
  assert.equal(settled.records[0].pregameCapturedAt,row.pregameCapturedAt);
 }
});
test("no extra time Nagoya/Urawa 1-2 AET, no NBA, no guessing on a different fixture",()=>{
 const original=jleagueCupAuditedFixtures[0],row=f(original);
 const et={...row,startMs:Date.parse("2026-10-28T10:00:00Z"),
  home:"나고야 그램퍼스",away:"우라와 레드"};
 assert.equal(hasAuditedJleagueCupFixture(et),false);
 assert.equal(officialJleagueCupUrl(et),null);
 assert.equal(parseJleagueCupFinal(markup(original),et).ok,false);
 assert.equal(isJleagueCupFixture({...row,league:"NBA",sport:"농구"}),false);
 assert.equal(hasAuditedJleagueCupFixture({...row,away:"unrelated"}),false);
 assert.equal(parseJleagueCupFinal(markup(original),{...row,
  startMs:row.startMs+60*60000}).ok,false);
});
test("reject preview, false team, wrong clock, wrong result, time-only and extra-time markup",()=>{
 for(const e of jleagueCupAuditedFixtures){
  const row=f(e),now=row.startMs+4*3600000;
  const pages=[
   markup(e,{title:"試合予告（Ｊリーグ ルヴァンカップ）"}),
   markup(e,{home:"別チーム"}),
   markup(e,{away:"別チーム"}),
   markup(e,{finish:"試合前"}),
   markup(e,{finish:"LIVE"}),
   markup(e,{after:"延長 "}),
   markup(e,{after:"PK "}),
   markup(e,{score:[e.score[0]+1,e.score[1]]}),
   markup(e,{day:"2026-11-01"})
  ];
  for(const [i,html] of pages.entries()){
   const p=parseJleagueCupFinal(html,row,{now});
   assert.equal(p.ok,false,JSON.stringify({fixture:e.id,mutation:i,reason:p.waitReason}));
  }
  assert.equal(parseJleagueCupFinal(markup(e),row,{now:row.startMs+60000}).ok,false);
  assert.equal(parseJleagueCupFinal("",row,{now}).ok,false);
 }
});
test("official per-fixture URL shares cache and refuses network/HTTP failure",async()=>{
 const entries=jleagueCupAuditedFixtures.slice(0,2),cache=new Map(),calls=[];
 const fetchFn=async url=>{
  calls.push(url);const e=jleagueCupAuditedFixtures.find(e=>url.includes(e.id));
  return {ok:true,status:200,text:async()=>markup(e)};
 };
 for(const e of entries){
  const row=f(e),now=row.startMs+5*3600000;
  const proof=await lookupOfficialJleagueCupFinal(row,{fetchFn,cache,now});
  assert.equal(proof.ok,true,proof.waitReason);
  const again=await lookupOfficialJleagueCupFinal(row,{fetchFn,cache,now});
  assert.equal(again.ok,true,again.waitReason);
 }
 assert.equal(calls.length,2);
 const fails=await lookupOfficialJleagueCupFinal(f(entries[0]),{
  fetchFn:async()=>({ok:false,status:503}),now:Date.now()});
 assert.equal(fails.ok,false);
 assert.match(fails.waitReason,/HTTP_503/);
});
