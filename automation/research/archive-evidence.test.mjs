import test from "node:test";import assert from "node:assert/strict";
import {gunzipSync} from "node:zlib";
import {rotateResearch} from "./archive-evidence.mjs";
const now=Date.parse("2026-10-27T00:00:00Z"),DAY=86400000;
const fixture=(i,days)=>({id:"r-"+i,sport:"축구",league:"K리그1",
  home:"H"+i,away:"A"+i,startMs:now-days*DAY,
  snapshots:[{at:now-(days+1)*DAY,market:{choices:[{side:"win",odds:2}]}}],
  frozenCandidate:{side:"win",marketProbability:0.52,asOf:now-(days+1)*DAY},
  truth:{winner:"win",verifiedAt:now-(days-1)*DAY}});
test("longitudinal research rollover keeps recent 2000 and archives old source odds losslessly",async()=>{
 const fixtures=Array.from({length:2020},(_,i)=>fixture(i,i<2000?20:400));
 const saved=new Map(),source={schema:"wisetoto-market-evidence-v1",fixtures};
 const done=await rotateResearch(source,{now,
   getRemote:async id=>saved.has(id)?{state:saved.get(id),sha:"previous"}:null,
   putRemote:async(id,gz)=>{saved.set(id,JSON.parse(gunzipSync(gz).toString("utf8")));}});
 assert.equal(done.moved,20);
 assert.equal(done.state.fixtures.length,2000);
 assert.equal(done.state.archivedFixtures,20);
 assert.equal([...saved.values()].flatMap(x=>x.records).length,20);
 assert.deepEqual([...saved.values()][0].records[0].snapshots[0].market.choices[0].odds,2);
 assert.equal(source.fixtures.length,2020);
});
test("failed research shard upload preserves original study state",async()=>{
 const state={schema:"wisetoto-market-evidence-v1",fixtures:[fixture(1,400)]};
 await assert.rejects(rotateResearch(state,{now,getRemote:async()=>null,
   putRemote:async()=>{throw Error("denied")}}),/denied/);
 assert.equal(state.fixtures.length,1);
});
