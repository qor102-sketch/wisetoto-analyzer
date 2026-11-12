import test from "node:test";
import assert from "node:assert/strict";
import {easlOfficialEntries,isOfficialEaslFixture,parseOfficialEaslFinal,
 lookupOfficialEaslFinal} from "./easl-official-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
const fix=e=>({key:"EASL-"+e.schedule,sport:"농구",league:"동아시아 슈퍼리그",
 home:e.home,away:e.away,startMs:Date.parse(e.at),verdict:"PENDING",
 odds:[{source:"FROZEN_PRE",selection:1}],pregameCapturedAt:Date.parse(e.at)-900000});
const schedule=e=>'<html><title>EASL Schedule & Results</title>'+
 '<div class="official-match"><span>'+e.officialHome+'</span>'+
 '<time>'+e.at.slice(0,19)+'</time><span>'+e.officialAway+'</span>'+
 '<a href="/schedules/'+e.schedule+'">Game Info</a></div></html>';
const recap=e=>'<html><title>GAME RECAP | EASL</title>'+
 '<main><h2>What Happened:</h2><p>'+e.officialHome+' played '+e.officialAway+
 ' and '+e.decisive+'. Official completed-game recap.</p></main></html>';
test("six official EASL recaps prove unique fixture, exact kickoff and final; frozen PRE untouched",()=>{
 assert.equal(easlOfficialEntries.length,6);
 assert.equal(new Set(easlOfficialEntries.map(e=>e.schedule)).size,6);
 for(const e of easlOfficialEntries){
  const f=fix(e),now=f.startMs+4*3600000;
  assert.equal(isOfficialEaslFixture(f),true);
  const p=parseOfficialEaslFinal(schedule(e),recap(e),f,{now});
  assert.equal(p.ok,true,JSON.stringify({schedule:e.schedule,reason:p.waitReason}));
  assert.equal(p.source,"EASL");
  assert.equal(p.gameId,"/schedules/"+e.schedule);
  assert.deepEqual(p.result,{homeScore:e.homeScore,awayScore:e.awayScore});
  const merged=mergeProviderFinal({records:[f]},f.key,p,now);
  assert.equal(merged.records[0].verdict,"VERIFIED");
  assert.equal(merged.records[0].resultSource,"EASL");
  assert.equal(merged.records[0].finalProviderGameId,p.gameId);
  assert.equal(merged.records[0].pregameCapturedAt,f.pregameCapturedAt);
  assert.deepEqual(merged.records[0].odds,f.odds);
 }
});
test("EASL rejects previews, wrong schedule ID, duplicate official event, wrong teams or guessed final",()=>{
 for(const e of easlOfficialEntries){
  const f=fix(e),now=f.startMs+4*3600000;
  const no=[
   [schedule(e).replace(e.officialHome,"Unrelated"),recap(e)],
   [schedule(e).replace(e.officialAway,"Unrelated"),recap(e)],
   [schedule(e).replace(e.at.slice(0,19),"2026-01-01T01:01:01"),recap(e)],
   [schedule(e).replace(e.schedule,"unrelated-event-id"),recap(e)],
   [schedule(e)+schedule(e),recap(e)],
   [schedule(e),recap(e).replace(e.decisive,"won the game but final unconfirmed")],
   [schedule(e),recap(e).replace("GAME RECAP","GAME PREVIEW")],
   [schedule(e),recap(e).replace(new RegExp(e.officialHome,"gi"),"Wrong Club")],
   ["",recap(e)],
   [schedule(e),""]
  ];
  for(const [sc,rc] of no)
   assert.equal(parseOfficialEaslFinal(sc,rc,f,{now}).ok,false,
    JSON.stringify({fixture:e.schedule,bad:sc.slice(0,100),rc:rc.slice(0,100)}));
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),f,
   {now:f.startMs+160*60000}).ok,false);
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),
   {...f,away:"another club"},{now}).ok,false);
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),
   {...f,startMs:f.startMs+3600000},{now}).ok,false);
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),
   {...f,league:"KBL"},{now}).ok,false);
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),
   {...f,league:"NBA"},{now}).ok,false);
  assert.equal(parseOfficialEaslFinal(schedule(e),recap(e),
   {...f,sport:"축구"},{now}).ok,false);
 }
});
test("EASL reuses official source schedule and never calls an NBA provider",async()=>{
 const cache=new Map(),calls=[];
 const pageByUrl=new Map([
  ["https://www.easl.basketball/schedule-results",
   easlOfficialEntries.map(e=>schedule(e)).join("\n")]
 ]);
 for(const e of easlOfficialEntries)pageByUrl.set(
  "https://www.easl.basketball/news/"+(e.recapSlug??e.recap),recap(e));
 const fetchFn=async url=>{
  calls.push(url);return {ok:pageByUrl.has(url),status:pageByUrl.has(url)?200:404,
    text:async()=>pageByUrl.get(url)??""};
 };
 for(const e of easlOfficialEntries){
  const f=fix(e);
  const p=await lookupOfficialEaslFinal(f,{fetchFn,cache,now:f.startMs+4*3600000});
  assert.equal(p.ok,true,JSON.stringify({event:e.schedule,reason:p.waitReason}));
 }
 assert.equal(calls.length,7,"one official schedule plus six distinct EASL recap URLs");
 const failure=await lookupOfficialEaslFinal(fix(easlOfficialEntries[0]),{
  fetchFn:async()=>({ok:false,status:503})});
 assert.equal(failure.ok,false);
 assert.match(failure.waitReason,/EASL_SOURCE_HTTP_503/);
});
