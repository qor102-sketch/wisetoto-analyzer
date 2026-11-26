import test from "node:test";
import assert from "node:assert/strict";
import {indexHistory,decideV4,lockV4,coverageReport,activateV4} from "./coverage-shadow.mjs";
const M=60000,D=86400000,now=Date.parse("2026-11-26T03:00:00Z"),pilot={startedAt:now-29*D};
const f={id:"f",sport:"축구",league:"L",home:"H",away:"A",startMs:now+15*M};
const market={choices:[{side:"win",p:.6,odds:1.5},{side:"draw",p:.25,odds:3.5},{side:"lose",p:.15,odds:6}]};
const players=t=>Array.from({length:11},(_,i)=>t+i);
const lineup=(r,at)=>({status:"CONFIRMED",source:"TEST",gameId:"id",capturedAt:at,home:players(r.home),away:players(r.away)});
function row(home,away,i){const r={sport:"축구",league:"L",home,away,startMs:now-(i+1)*D,verifiedAt:now-(i+1)*D+M,
 verdict:"VERIFIED",resultSource:"TEST",final:{homeScore:2,awayScore:1}};r.lineup=lineup(r,r.startMs-M);return r;}
const history=[...Array.from({length:3},(_,i)=>row("H","X"+i,i)),...Array.from({length:3},(_,i)=>row("A","Y"+i,i)),...Array.from({length:4},(_,i)=>row("P"+i,"Q"+i,i))];
test("three verified games per team with league shrinkage; no future or duplicate history",()=>{
 const c=decideV4(f,market,indexHistory(history,now),now,now,now,pilot);
 assert.equal(c.form.home10,3);assert.equal(c.gates.form,true);
 assert.ok(Math.abs(Object.values(c.mix80).reduce((a,b)=>a+b,0)-1)<1e-8);
 assert.equal(decideV4(f,market,indexHistory([...history,history[0]],now),now,now,now,pilot).raw,null);
 assert.equal(decideV4(f,market,indexHistory(history.map(r=>({...r,verifiedAt:now+1})),now),now,now,now,pilot).raw,null);
});
test("late confirmed lineup accepted only before actual decision; no backfill",()=>{
 const current={...f,lineup:lineup(f,now-1000)},index=indexHistory([...history,current],now-M);
 const c=decideV4(f,market,index,now,now-M,now-M,pilot);
 assert.equal(c.lineup.status,"CONFIRMED");assert.equal(c.gates.continuity,true);
 const late={...current,lineup:lineup(f,now+1)};
 assert.equal(decideV4(f,market,indexHistory([...history,late],now-M),now,now-M,now-M,pilot).lineup.status,"UNKNOWN");
 assert.equal(decideV4({...f,startMs:now+25*M},market,indexHistory(history,now),now,now,now,pilot),null);
 assert.equal(decideV4(f,market,index,now,now-M,now,pilot),null);
 assert.equal(decideV4({...f,startMs:now},market,index,now,now,now,pilot),null);
 assert.equal(activateV4({},pilot,now),now);
 assert.equal(activateV4({coverageV4StartedAt:now},pilot,now+M),now);
});
test("immutable parallel lock and paired market/rejected cohorts",()=>{
 const x={...f,sportShadowV3:{saved:true},accuracyShadowV2:{saved:true}};
 const rows=[x],m=new Map([["f",market]]);
 assert.equal(lockV4(rows,m,history,pilot,now,now,now),1);
 const before=JSON.stringify(x.coverageShadowV4);
 assert.equal(lockV4(rows,m,history,pilot,now,now+M,now+M),0);
 assert.equal(JSON.stringify(x.coverageShadowV4),before);
 assert.deepEqual(x.sportShadowV3,{saved:true});assert.deepEqual(x.accuracyShadowV2,{saved:true});
 x.truth={winner:"win",verifiedAt:x.startMs+M};
 const state={pilot,coverageV4StartedAt:now,fixtures:rows};
 assert.equal(coverageReport(state,now).graded,0);
 const r=coverageReport(state,x.startMs+M);
 assert.equal(r.strategies.mix80.graded,1);assert.equal(r.strategies.mix80.matchedMarket.graded,1);
 assert.equal(r.strategies.continuity.rejectedMarket.graded,1);
 assert.equal(r.audit.lineupUnknown.observed,1);assert.equal(r.autoPromote,false);
});
