import test from "node:test";
import assert from "node:assert/strict";
import {lockAccuracyShadow,buildAccuracyShadowReport} from "./accuracy-shadow.mjs";
const D=86400000,M=60000,start=Date.parse("2026-11-25T00:51:00Z");
const pilot={startedAt:start-28*D},now=start+M;
function fixture(overrides={}){
 const c={side:"win",odds:1.5,marketProbability:.65,shift:.05,asOf:now};
 return {id:"new",sport:"축구",league:"test",startMs:now+60*M,snapshots:[{at:now-40*M},{at:now}],lastEvidence:{top1:c},...overrides};
}
function prior(n=30){return Array.from({length:n},(_,i)=>({id:"old"+i,sport:"축구",startMs:start-(i+2)*D/2,
 frozenCandidate:{side:"win",asOf:start-(i+2)*D/2-M,marketProbability:.65,odds:1.5,shift:.03},
 truth:{winner:"win",verifiedAt:start-(i+2)*D/2+M}}));}
test("next pilot only, first fresh pregame lock is immutable",()=>{
 const f=fixture();assert.equal(lockAccuracyShadow(f,prior(),pilot,start-1,start-1),false);
 assert.equal(lockAccuracyShadow(f,prior(),pilot,now,now),true);
 const saved=JSON.stringify(f.accuracyShadowV2);
 f.lastEvidence.top1.side="lose";assert.equal(lockAccuracyShadow(f,prior(),pilot,now+M,now),false);
 assert.equal(JSON.stringify(f.accuracyShadowV2),saved);
 assert.equal(lockAccuracyShadow(fixture({startMs:now}),prior(),pilot,now,now),false);
 assert.equal(lockAccuracyShadow(fixture(),prior(),pilot,now+6*M,now),false);
 assert.equal(lockAccuracyShadow(fixture({startMs:start+28*D}),prior(),pilot,now,now),false);
 assert.equal(lockAccuracyShadow(fixture({sport:"농구",league:"NBA"}),prior(),pilot,now,now),false);
});
test("future verified outcomes, other sports and insufficient samples cannot train or select",()=>{
 const f=fixture(),h=prior().map(x=>({...x,truth:{...x.truth,verifiedAt:now+1}}));
 assert.equal(lockAccuracyShadow(f,h,pilot,now,now),true);
 assert.equal(f.accuracyShadowV2.trainingSamples,0);assert.equal(f.accuracyShadowV2.mix60,null);
 assert.equal(f.accuracyShadowV2.select2,false);
 const g=fixture({sport:"배구"});lockAccuracyShadow(g,prior(),pilot,now,now);
 assert.equal(g.accuracyShadowV2.trainingSamples,0);
});
test("matched evaluation counts actual results only and reports abstention",()=>{
 const a=fixture(),b=fixture({id:"other",sport:"배구"});
 lockAccuracyShadow(a,prior(),pilot,now,now);lockAccuracyShadow(b,prior(),pilot,now,now);
 a.truth={winner:"win",verifiedAt:a.startMs+M};b.truth={winner:"lose",verifiedAt:b.startMs+M};
 const state={pilot,fixtures:[a,b,...prior()]};
 assert.equal(buildAccuracyShadowReport(state,now).graded,0);
 const r=buildAccuracyShadowReport(state,a.startMs+M);
 assert.equal(r.locked,2);assert.equal(r.graded,2);
 assert.equal(r.strategies.A_market.hitRate,.5);
 assert.equal(r.strategies.D_gate2.selected,1);
 assert.equal(r.strategies.D_gate2.coverage,.5);
 assert.equal(r.strategies.D_gate2.matchedMarket.graded,1);
 assert.ok(r.strategies.C_mix60.brier<r.strategies.C_mix60.matchedMarket.brier);
 assert.equal(r.autoPromote,false);
});
