import test from "node:test";
import assert from "node:assert/strict";
import {isOfficialKblFixture,kblOfficialUrl,parseOfficialKblFinal,lookupOfficialKblFinal}
 from "./kbl-official-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
import {selectFinalAuditRows,isNaverOnlyOutage} from "./final-scan-plan.mjs";
const T=Date.parse("2026-11-08T05:00:00.000Z");
const f={key:"kbl-safe",sport:"농구",league:"KBL",home:"서울SK 나이츠",
 away:"원주DB 프로미",startMs:T,verdict:"PENDING",
 checkReason:"NAVER_FAST:NAVER_DIRECT_NETWORK:TimeoutError",
 resultChecks:2,pregameCapturedAt:T-3600000,odds:[{at:"PRE",frozen:true}]};
const row=(x={})=>({gmkey:"20261108-SKDB-001",gameDate:"20261108",
 gameStart:"1400",tcodeH:"55",tnameH:"서울 SK",tnameFH:"서울 SK 나이츠",
 tcodeA:"16",tnameA:"원주 DB",tnameFA:"원주 DB 프로미",
 seasonGrade:1,isEnded:1,scoreH:84,scoreA:78,...x});
test("official KBL accepts unique finished first-division match with strict sides, ID and timestamp",()=>{
 assert.equal(isOfficialKblFixture(f),true);
 assert.equal(isOfficialKblFixture({...f,league:"WKBL"}),false);
 assert.equal(isOfficialKblFixture({...f,league:"NBA"}),false);
 assert.match(kblOfficialUrl(f),/seasonGrade=1/);
 assert.match(kblOfficialUrl(f),/fromDate=20261108/);
 const p=parseOfficialKblFinal([row()],f,{now:T+4*3600000});
 assert.equal(p.ok,true,p.waitReason);
 assert.equal(p.source,"KBL");
 assert.equal(p.gameId,"20261108-SKDB-001");
 assert.deepEqual(p.result,{homeScore:84,awayScore:78});
 const out=mergeProviderFinal({records:[f]},f.key,p,T+4*3600000);
 assert.equal(out.records[0].verdict,"VERIFIED");
 assert.equal(out.records[0].resultSource,"KBL");
 assert.equal(out.records[0].finalProviderGameId,"20261108-SKDB-001");
 assert.equal(out.records[0].pregameCapturedAt,f.pregameCapturedAt);
 assert.deepEqual(out.records[0].odds,f.odds);
});
test("official KBL never accepts fabricated final from a score, wrong game, ambiguous identity or invalid proof",()=>{
 const bad=[
  row({isEnded:0}),row({isEnded:null}),row({gmkey:""}),
  row({gameDate:"20261109"}),row({gameStart:"1700"}),
  row({gameStart:""}),row({gameStart:"2400"}),
  row({tcodeH:"16"}),row({tcodeA:"55"}),
  row({tnameH:"잘못된 구단"}),row({tnameA:"잘못된 구단"}),
  row({seasonGrade:2}),row({scoreH:""}),row({scoreA:null}),
  row({scoreH:78,scoreA:78}),row({scoreH:-1}),
  row({cancelled:true}),row({postponed:true})
 ];
 for(const item of bad)assert.equal(
   parseOfficialKblFinal([item],f,{now:T+4*3600000}).ok,false,
   JSON.stringify(item));
 assert.equal(parseOfficialKblFinal([row(),row({gmkey:"other-id"})],f,{now:T+4*3600000}).ok,false);
 assert.equal(parseOfficialKblFinal([row()],f,{now:T+2*3600000}).ok,false);
 assert.equal(parseOfficialKblFinal([row()],{...f,league:"WKBL"},{now:T+4*3600000}).ok,false);
 assert.equal(parseOfficialKblFinal({},f,{now:T+4*3600000}).ok,false);
});
test("official KBL has own protected retry lane and shares a single day source URL",async()=>{
 assert.equal(isNaverOnlyOutage(f),false);
 const queue=selectFinalAuditRows({records:[f]},T+2*86400000,24);
 assert.equal(queue.length,1);
 assert.equal(queue[0].key,f.key);
 const cache=new Map(),urls=[];
 const fetchFn=async url=>{
  urls.push(url);
  return {ok:true,status:200,json:async()=>[row()]};
 };
 for(const _ of [0,1]){
  const p=await lookupOfficialKblFinal(f,{cache,fetchFn,now:T+4*3600000});
  assert.equal(p.ok,true,p.waitReason);
 }
 assert.equal(urls.length,1);
 const unavailable=await lookupOfficialKblFinal(f,{fetchFn:async()=>({ok:false,status:503})});
 assert.equal(unavailable.ok,false);
 assert.match(unavailable.waitReason,/KBL_OFFICIAL_HTTP_503/);
});
