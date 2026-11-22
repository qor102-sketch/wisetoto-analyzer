import test from "node:test";
import assert from "node:assert/strict";
import {
 shadowStartFromPilot,freezeProspectiveAccuracy,buildAccuracyShadowReport
} from "./selective-accuracy-shadow.mjs";
import {ingestEvidence,publicEvidence,SCHEMA} from "./evidence.mjs";
import {buildPilotReport} from "./pilot-top1.mjs";
const DAY=86_400_000,H=3_600_000,M=60_000;
const PILOT=Date.parse("2026-10-28T00:51:22.480Z");
const START=PILOT+28*DAY;
const asOf=START+2*H;
function fixture(id,{sport="축구",league="England EPL",shift=.05,
 p=.6,hold=.06,odds=2,startMs=START+5*H,at=asOf}={}){
 return {id,sport,league,home:"Home",away:"Away",startMs,
  snapshots:[{at:at-35*M,market:{choices:[]}},{at,market:{
   choices:[{side:"win",p},{side:"lose",p:1-p}]}}],
  lastEvidence:{top1:{side:"win",label:"승",odds,marketProbability:p,
   marketHold:hold,shift,asOf:at}},frozenCandidate:null,truth:null};
}
const state=fixtures=>({schema:SCHEMA,pilot:{startedAt:PILOT,lastReportedWeek:4},
 fixtures});
const freeze=(items,now=asOf,at=asOf)=>freezeProspectiveAccuracy(items,{
 startAt:START,now,observedAt:at});
test("next 28-day shadow is scheduled, separate and not retroactive before pilot ends",()=>{
 const f=fixture("only-future");
 assert.equal(shadowStartFromPilot(state([f])),START);
 assert.equal(buildAccuracyShadowReport(state([f]),START-M).status,"SCHEDULED");
 assert.equal(freeze([f],START-M,START-M).changed,0);
 assert.equal(f.accuracyShadowV1,undefined);
 assert.equal(buildAccuracyShadowReport({fixtures:[f]},START).status,
  "WAITING_FOR_ORIGINAL_PILOT");
});
test("only new authentic pre-kickoff snapshot after original pilot can freeze",()=>{
 for(const bad of [
  {startMs:START-M},
  {startMs:START+28*DAY},
  {at:START-M},
  {startMs:asOf},
  {at:START+3*H}
 ]){
  const f=fixture("bad",bad);
  assert.equal(freeze([f]).changed,0,JSON.stringify(bad));
  assert.equal(f.accuracyShadowV1,undefined);
 }
 const stale=fixture("stale");
 assert.equal(freeze([stale],asOf+M,asOf+M).changed,0);
 const early=fixture("early");
 early.snapshots[0].at=asOf-10*M;
 assert.equal(freeze([early]).changed,0);
});
test("base/strong/selective choices freeze at their own first valid snapshot, never reselect later",()=>{
 const f=fixture("first",{shift:.027,p:.52,odds:1.9});
 assert.equal(freeze([f]).changed,1);
 assert.equal(f.accuracyShadowV1.strategies.BASE_2P.side,"win");
 assert.equal(f.accuracyShadowV1.strategies.STRONG_4P,undefined);
 const frozenBase=JSON.stringify(f.accuracyShadowV1.strategies.BASE_2P);
 const later=asOf+35*M;
 f.snapshots.push({at:later,market:{choices:[{side:"lose",p:.58},{side:"win",p:.42}]}});
 f.lastEvidence.top1={side:"lose",label:"패",odds:2.15,
  marketProbability:.58,marketHold:.06,shift:.05,asOf:later};
 assert.equal(freeze([f],later,later).changed,1);
 assert.equal(JSON.stringify(f.accuracyShadowV1.strategies.BASE_2P),frozenBase);
 assert.equal(f.accuracyShadowV1.strategies.STRONG_4P.side,"lose");
 assert.equal(f.accuracyShadowV1.strategies.SELECTIVE_4P.side,"lose");
 const snapshot=JSON.stringify(f.accuracyShadowV1);
 assert.equal(freeze([f],later,later).changed,0);
 assert.equal(JSON.stringify(f.accuracyShadowV1),snapshot);
 assert.equal(freeze([f],f.startMs+M,f.startMs+M).changed,0);
});
test("selective rule is pre-registered; low change/high hold/weak favorite abstains",()=>{
 const rows=[
  fixture("low-shift",{shift:.03,p:.6,hold:.05}),
  fixture("high-hold",{shift:.05,p:.60,hold:.11}),
  fixture("low-p",{shift:.05,p:.49,hold:.05}),
  fixture("pass",{shift:.05,p:.58,hold:.05})
 ];
 assert.equal(freeze(rows).changed,4);
 assert.deepEqual(rows.map(r=>Boolean(r.accuracyShadowV1.strategies.SELECTIVE_4P)),
  [false,false,false,true]);
 assert.ok(rows.every(r=>r.accuracyShadowV1.strategies.BASE_2P));
});
test("never freeze unqualified NBA or a result-known/after-kickoff shadow",()=>{
 const nba=fixture("nba",{sport:"농구",league:"NBA"});
 const stopped=fixture("stopped",{startMs:asOf-M});
 assert.equal(freeze([nba,stopped]).changed,0);
 assert.equal(nba.accuracyShadowV1,undefined);
 assert.equal(stopped.accuracyShadowV1,undefined);
});
function history(before=asOf,verified=before-3*M,count=22){
 return Array.from({length:count},(_,i)=>({
  id:"h-"+i,sport:"축구",league:"Any",
  startMs:before-2*DAY-i*H,
  frozenCandidate:{side:"win",marketProbability:.6,odds:2,
   asOf:before-2*DAY-i*H-45*M},
  truth:{winner:"win",verifiedAt:verified-i*H}
 }));
}
test("blend80/60 uses only previously finalized real outcomes, never same-fixture or future truth",()=>{
 const f=fixture("target");
 const previous=history(asOf,asOf-3*M);
 assert.equal(freeze([f,...previous]).changed,1);
 const a=f.accuracyShadowV1.strategies.BLEND_80_20;
 const b=f.accuracyShadowV1.strategies.BLEND_60_40;
 assert.equal(a.status,"PICK");
 assert.equal(b.status,"PICK");
 assert.equal(a.modelSamples,22);
 assert.ok(b.pForecast>a.pForecast&&a.pForecast>.6);
 assert.ok(a.asOf<f.startMs);
 const future=fixture("future");
 const later=history(asOf,asOf+M);
 assert.equal(freeze([future,...later]).changed,1);
 assert.equal(future.accuracyShadowV1.strategies.BLEND_80_20,undefined,
  "results not verified by snapshot time cannot train calibration");
});
test("blend records NO_PICK with valid pregame forecast when conservative margin fails",()=>{
 const f=fixture("blend-hold",{odds:1.4});
 const previous=history(asOf,asOf-3*M,24).map(x=>({
  ...x,truth:{...x.truth,winner:"lose"}}));
 assert.equal(freeze([f,...previous]).changed,1);
 const p=f.accuracyShadowV1.strategies.BLEND_80_20;
 assert.equal(p.status,"NO_PICK");
 assert.equal(p.reason,"PRESPECIFIED_EDGE_GATE");
 assert.ok(p.pForecast<.6);
});
test("settlement uses only independently verified finals; no lookahead, no fake accuracy",()=>{
 const a=fixture("hit",{odds:2,p:.6});
 const b=fixture("miss",{odds:2,p:.6});
 const absent=fixture("pending",{odds:2,p:.6});
 freeze([a,b,absent]);
 a.truth={winner:"win",verifiedAt:a.startMs+H};
 b.truth={winner:"lose",verifiedAt:b.startMs+H};
 const report=buildAccuracyShadowReport(state([a,b,absent]),a.startMs+2*H);
 const base=report.strategies.BASE_2P;
 assert.equal(report.status,"COLLECTING");
 assert.equal(report.eligibleFrozen,3);
 assert.equal(base.picks,3);
 assert.equal(base.graded,2);
 assert.equal(base.hits,1);
 assert.equal(base.misses,1);
 assert.equal(base.hitRate,.5);
 assert.equal(base.unitROI,0);
 assert.equal(base.binaryBrier,.26);
 assert.equal(base.marketBinaryBrier,.26);
 assert.equal(base.selectionCoverage,1);
 assert.equal(base.hitCI90.length,2);
 assert.equal(base.pairedBaseGraded,2);
 assert.equal(report.bySport["축구"].BASE_2P.graded,2);
 assert.equal(report.bySport["농구"].BASE_2P.graded,0);
 assert.equal(report.canPromote,false);
 const early=buildAccuracyShadowReport(state([a,b,absent]),a.startMs);
 assert.equal(early.strategies.BASE_2P.graded,0);
});
test("selective metrics compare an EXACT paired baseline on the same matches",()=>{
 const selected=fixture("selected",{hold:.05,p:.6});
 const noPick=fixture("not-selected",{hold:.15,p:.6});
 freeze([selected,noPick]);
 selected.truth={winner:"lose",verifiedAt:selected.startMs+H};
 noPick.truth={winner:"win",verifiedAt:noPick.startMs+H};
 const rep=buildAccuracyShadowReport(state([selected,noPick]),selected.startMs+2*H);
 const filtered=rep.strategies.SELECTIVE_4P;
 assert.equal(filtered.graded,1);
 assert.equal(filtered.hits,0);
 assert.equal(filtered.selectionCoverage,.5);
 assert.equal(filtered.pairedBaseGraded,1);
 assert.equal(filtered.pairedBaseHitRate,0);
 assert.equal(rep.strategies.BASE_2P.hits,1);
});
test("report never assigns historical first-pilot fixtures to the new period",()=>{
 const f=fixture("in-original",{startMs:PILOT+5*DAY,at:PILOT+5*DAY-2*H});
 f.frozenCandidate={side:"win",asOf:f.lastEvidence.top1.asOf,
  marketProbability:.6,odds:2,shift:.05};
 f.truth={winner:"win",verifiedAt:f.startMs+H};
 const original=buildPilotReport(state([f]),START);
 const shadow=buildAccuracyShadowReport(state([f]),START);
 assert.equal(original.all.decisions,1);
 assert.equal(shadow.eligibleFrozen,0);
 assert.equal(shadow.eligibleGraded,0);
 assert.equal(original.all.decisions,buildPilotReport(state([f]),START).all.decisions);
});
test("real ingestEvidence integrates new shadow only after 28-day boundary and leaves original pilot clock fixed",()=>{
 const game=(odds)=>({sport:"soccer",home:"Test Home",away:"Test Away",
  league:"EPL",gameDateMs:START+4*H,
  markets:[{type:"moneyline",betName:"축구 승무패",selections:
   ["win","draw","lose"].map((side,i)=>({side,label:side,odds:odds[i]}))}]});
 const initial={schema:SCHEMA,pilot:{startedAt:PILOT,lastReportedWeek:4},fixtures:[]};
 const first=ingestEvidence(initial,{ok:true,games:[game([2.05,3.2,3.1])]},
  START+M,[],START+M);
 assert.equal(first.stats.accuracyShadowUpdated,0);
 const second=ingestEvidence(first.state,{ok:true,games:[game([1.8,3.3,3.6])]},
  START+36*M,[],START+36*M);
 assert.equal(second.stats.accuracyShadowUpdated,1);
 const p=second.state.fixtures[0].accuracyShadowV1.strategies;
 assert.equal(p.BASE_2P.status,"PICK");
 assert.equal(p.STRONG_4P.status,"PICK");
 assert.equal(p.SELECTIVE_4P,undefined);
 assert.equal(second.state.pilot.startedAt,PILOT);
 const publicData=publicEvidence(second.state,START+36*M);
 assert.equal(publicData.accuracyShadow.eligibleFrozen,1);
 assert.equal(publicData.accuracyShadow.status,"COLLECTING");
 assert.equal(publicData.pilot.startedAt,PILOT);
 const after=ingestEvidence(second.state,{ok:true,games:[]},START+5*H,[],START+5*H);
 assert.equal(after.stats.accuracyShadowUpdated,0);
 assert.deepEqual(after.state.fixtures[0].accuracyShadowV1,
  second.state.fixtures[0].accuracyShadowV1);
});
