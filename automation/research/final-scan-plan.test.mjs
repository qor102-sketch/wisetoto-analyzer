import test from "node:test";import assert from "node:assert/strict";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const NOW=Date.parse("2026-10-31T09:00:00Z");
const fixture=(id,league,sport="축구",lastResultCheckAt=0)=>({
 key:String(id),sport,league,home:"Team A",away:"Team B",
 startMs:NOW-5*3600000,verdict:"PENDING",
 lastResultCheckAt
});
test("allocates majority of 24 attempts to independently supported final provider and preserves domestic quota",()=>{
 const soccer=Array.from({length:42},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const domestic=Array.from({length:30},(_,i)=>fixture("dom"+i,"K리그2"));
 const rows=selectFinalAuditRows({records:[...domestic,...soccer]},NOW,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(x=>x.key.startsWith("espn")).length,16);
 assert.equal(rows.filter(x=>x.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(x=>x.key)).size,24);
});
test("fills unused supported quota without losing overdue domestics",()=>{
 const domestic=Array.from({length:12},(_,i)=>fixture("dom"+i,"K리그1"));
 const soccer=Array.from({length:3},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 assert.equal(selectFinalAuditRows({records:[...domestic,...soccer]},NOW,24).length,15);
});
test("past fixture retry cooldown, future, already verified and time window are respected",()=>{
 const current=fixture("old","NBA","농구");
 current.lastResultCheckAt=NOW-30*60000;
 const future={...fixture("future","NBA","농구"),startMs:NOW+2*3600000};
 const verified={...fixture("settled","NBA","농구"),verdict:"VERIFIED"};
 const legit=fixture("legit","NBA","농구");
 const rows=selectFinalAuditRows({records:[current,future,verified,legit]},NOW,24);
 assert.deepEqual(rows.map(x=>x.key),["legit"]);
});
