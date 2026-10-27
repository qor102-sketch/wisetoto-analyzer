import test from "node:test";import assert from "node:assert/strict";
import {partitionForArchive,rotateArchive,mergeArchive,ARCHIVE_SCHEMA} from "./archive-collection.mjs";
const DAY=86400000,now=Date.parse("2026-10-27T00:00:00Z");
function row(id,daysAgo,overrides={}){
 return {key:id,sport:"축구",home:"A",away:"B",startMs:now-daysAgo*DAY,
   pregameCapturedAt:now-daysAgo*DAY-60000,fixtureId:null,
   verdict:"VERIFIED",final:{homeScore:2,awayScore:1},...overrides};
}
test("120-day rollover moves every old row to deterministic shards without 4000-record truncation",async()=>{
 const records=Array.from({length:4020},(_,i)=>row("id-"+i,i<100?10:160));
 const original={schema:"wisetoto-collect-first-v1",records};
 const {active,groups,moved}=partitionForArchive(original,now);
 assert.equal(active.length,100);assert.equal(moved,3920);
 assert.ok(groups.size>0);
 const remote=new Map();
 const archived=await rotateArchive({state:original,now,
   getRemote:async id=>remote.has(id)?{state:remote.get(id),sha:"existing"}:null,
   putRemote:async(id,gz)=>{const {gunzipSync}=await import("node:zlib");
     remote.set(id,JSON.parse(gunzipSync(gz).toString("utf8")));}});
 assert.equal(archived.state.records.length,100);
 assert.equal(archived.state.archiveCounts.collected,3920);
 assert.equal(archived.state.archiveCounts.verified,3920);
 const ids=[...remote.values()].flatMap(x=>x.records.map(r=>r.key));
 assert.equal(new Set(ids).size,3920);
 assert.ok([...remote.values()].every(x=>x.schema===ARCHIVE_SCHEMA));
 const noop=await rotateArchive({state:archived.state,now,
   getRemote:async()=>{throw Error("unexpected fetch")},
   putRemote:async()=>{throw Error("unexpected put")}});
 assert.equal(noop.moved,0);
});
test("archive remote failure rejects without changing original state",async()=>{
 const state={records:[row("old",180)]};
 const before=JSON.stringify(state);
 await assert.rejects(rotateArchive({state,now,getRemote:async()=>null,
   putRemote:async()=>{throw Error("remote write blocked")}}),/remote write blocked/);
 assert.equal(JSON.stringify(state),before);
});
test("archive rejects conflicts rather than rewriting frozen odds or results",()=>{
 const r=row("old",180,{odds:[{odds:2}]});
 const ex={schema:ARCHIVE_SCHEMA,archiveId:"2026-04-a",records:[r]};
 assert.throws(()=>mergeArchive(ex,[{...r,odds:[{odds:1.3}]}],"2026-04-a"),/ARCHIVE_CONFLICT/);
});
