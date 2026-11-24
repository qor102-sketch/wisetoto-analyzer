import test from "node:test";
import assert from "node:assert/strict";
import {buildSportDecision,confirmedLineup,lockSportShadows,buildSportShadowReport} from "./sport-shadow.mjs";
const D=86400000,M=60000,now=Date.parse("2026-11-25T01:00:00Z"),pilot={startedAt:now-28*D-M};
const players=(team,n=11)=>Array.from({length:n},(_,i)=>team+i);
const lineup=(start,h,a,n=11)=>({status:"CONFIRMED",source:"OFFICIAL",gameId:"x",capturedAt:start-35*M,home:players(h,n),away:players(a,n)});
const row=(s="축구",id="f")=>({id,sport:s,league:"L",home:"H",away:"A",startMs:now+20*M});
function history(s="축구"){
 const n={"축구":11,"농구":5,"배구":6,"야구":9}[s],score={"축구":[3,0],"농구":[110,80],"배구":[3,0],"야구":[8,1]}[s];
 return Array.from({length:10},(_,i)=>["H","A"].map((team,j)=>{
  const startMs=now-(i+1)*D,away="other"+j+i;
  return {sport:s,league:"L",home:team,away,startMs,verdict:"VERIFIED",resultSource:"OFFICIAL",verifiedAt:startMs+3*60*M,
   final:{homeScore:score[j],awayScore:score[1-j]},lineup:lineup(startMs,team,away,n)};
 })).flat();
}
const market=s=>({choices:s==="축구"?[{side:"win",p:.65,odds:1.4},{side:"draw",p:.2,odds:4.5},{side:"lose",p:.15,odds:6}]:
 [{side:"win",p:.65,odds:1.4},{side:"lose",p:.35,odds:2.5}]});
test("sport-specific model uses only prior verified scores and normalized probabilities",()=>{
 for(const s of ["축구","농구","배구","야구"]){
  const f=row(s),h=history(s),c=buildSportDecision(f,market(s),h,now,now,pilot);
  assert.equal(c.form.home5.n,5);assert.equal(c.form.away10.n,10);
  assert.equal(c.modelSide,"win");assert.ok(Math.abs(Object.values(c.mixed).reduce((a,b)=>a+b,0)-1)<1e-8);
  const late=h.map(r=>({...r,verifiedAt:now+1}));
  assert.equal(buildSportDecision(f,market(s),late,now,now,pilot).mixed,null);
 }
});
test("confirmed lineup time and complete identity, regular starter changes not injuries",()=>{
 const f=row(),r={...f,lineup:lineup(f.startMs,"H","A")};
 r.lineup.home[0]="replacement";
 const c=buildSportDecision(f,market(f.sport),[...history(),r],now,now,pilot);
 assert.equal(c.lineup.home.regularNotStarting,1);assert.equal(c.lineup.away.regularNotStarting,0);
 assert.equal(c.lineup.regularNotStartingIsNotInjury,true);
 assert.equal(confirmedLineup({...r,lineup:{...r.lineup,capturedAt:now+1}},now),null);
 assert.equal(confirmedLineup({...r,lineup:{...r.lineup,home:players("H",10)}},now),null);
 assert.equal(buildSportDecision(f,market(f.sport),[...history(),r,r],now,now,pilot).lineup.status,"UNKNOWN");
});
test("no after kickoff, stale input or NBA and no historical backfill",()=>{
 assert.equal(buildSportDecision({...row(),startMs:now},market("축구"),history(),now,now,pilot),null);
 assert.equal(buildSportDecision(row(),market("축구"),history(),now,now-6*M,pilot),null);
 assert.equal(buildSportDecision({...row("농구"),league:"NBA"},market("농구"),history("농구"),now,now,pilot),null);
 assert.equal(buildSportDecision(row(),market("축구"),history(),now,now,{startedAt:now}),null);
});
test("TOP1 first qualifying scan immutable, report only grades known results",()=>{
 const a=row("축구","a"),b={...row("축구","b"),startMs:now+21*M},r=[...history(),{...a,lineup:lineup(a.startMs,"H","A")}],m=market("축구");
 assert.equal(lockSportShadows([a,b],new Map([["a",m],["b",m]]),r,pilot,now,now),2);
 assert.equal([a,b].filter(f=>f.sportShadowV3.top1).length,1);
 const before=JSON.stringify(a.sportShadowV3);
 assert.equal(lockSportShadows([a,b],new Map([["a",m]]),r,pilot,now+M,now+M),0);
 assert.equal(JSON.stringify(a.sportShadowV3),before);
 const state={pilot,fixtures:[a,b]};
 a.truth={winner:"win",verifiedAt:a.startMs+M};b.truth={winner:"lose",verifiedAt:b.startMs+M};
 assert.equal(buildSportShadowReport(state,now).strategies.market.graded,0);
 const report=buildSportShadowReport(state,b.startMs+M);
 assert.equal(report.strategies.market.hits,1);assert.equal(report.strategies.shadowTop1.graded,1);
 assert.equal(report.missAudit.lineupUnknown.misses,1);
 assert.equal(report.autoPromote,false);
});
