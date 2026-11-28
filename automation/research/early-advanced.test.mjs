import test from "node:test";
import assert from "node:assert/strict";
import {importedHistory,combinedHistory,advancedRatings,decision,lockAdvanced,advancedReport} from "./early-advanced.mjs";
const D=86400000,M=60000,now=Date.parse("2026-11-28T05:00:00Z"),pilot={startedAt:now-30*D},end=pilot.startedAt+56*D;
const f={id:"f",sport:"축구",league:"L",home:"H",away:"A",startMs:now+75*M,firstSeenAt:now-D};
const market={choices:[{side:"win",p:.65,odds:1.4},{side:"draw",p:.2,odds:4.5},{side:"lose",p:.15,odds:6}]};
const hist=Array.from({length:12},(_,i)=>({sport:"축구",league:"L",home:"H",away:"A",startMs:now-(i+1)*D,verifiedAt:now-(i+1)*D+M,verdict:"VERIFIED",resultSource:"TEST",final:{homeScore:3,awayScore:0}}));
test("source date-only rows are unavailable before activation and never merged into ledger",()=>{
 const b={schema:"openfootball-history-v1",source:"https://github.com/openfootball/football.json",commit:"a".repeat(40),sourceCommitAt:"2026-11-01T00:00:00Z",league:"L",aliases:{h:"H",a:"A"},snapshots:[{rows:[{date:"2026-10-01",home:"h",away:"a",score:[2,0]},{date:"2026-11-27",home:"h",away:"a",score:[1,0]}]}]};
 assert.equal(importedHistory(b,now-1,now).length,0);
 assert.equal(importedHistory(b,now,now).length,1);
 const overlap={...hist[0],startMs:Date.parse("2026-10-01T12:00:00Z")};
 assert.equal(combinedHistory([overlap],now,now,b).imported,0);
 assert.equal(combinedHistory([],now,now,b).imported,1);
});
test("advanced home/margin ratings, normalized distributions and hard T60 deadline",()=>{
 const history=combinedHistory(hist,now,now),rows=[...history.groups.values()].find(x=>x[0].league==="L");
 const rating=advancedRatings(rows,"축구",now);
 assert.ok(rating.get("h").rating>rating.get("a").rating);
 const c=decision(f,market,history,rating,now,now,now,end);
 assert.equal(c.home.n,12);assert.ok(c.goals);assert.equal(c.leadMinutes,75);
 for(const p of [c.raw,c.goals,c.mix50,c.mix80elo,c.sportMix,c.rest])assert.ok(Math.abs(Object.values(p).reduce((s,v)=>s+v,0)-1)<1e-8);
 assert.equal(decision({...f,startMs:now+59*M},market,history,rating,now,now,now,end),null);
 assert.equal(decision(f,market,history,rating,now,now-6*M,now-10*M,end),null);
});
test("prospective lock and legacy record unchanged; matched market grading",()=>{
 const x={...f,earlyShadowV1:{old:true}},rows=[x],m=new Map([["f",market]]);
 assert.equal(lockAdvanced(rows,m,hist,pilot,now,now,now),1);
 const saved=JSON.stringify(x.advancedEarlyV2);
 assert.equal(lockAdvanced(rows,m,hist,pilot,now,now+M,now+M),0);
 assert.equal(JSON.stringify(x.advancedEarlyV2),saved);assert.deepEqual(x.earlyShadowV1,{old:true});
 x.truth={winner:"win",verifiedAt:x.startMs+M};
 const r=advancedReport({pilot,advancedStartedAt:now,fixtures:rows},x.startMs+M);
 assert.equal(r.strategies.advancedElo.graded,1);assert.equal(r.strategies.advancedElo.matchedMarket.graded,1);assert.equal(r.autoPromote,false);
});
