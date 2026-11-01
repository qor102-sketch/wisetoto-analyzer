import test from "node:test";
import assert from "node:assert/strict";
import {naverOutageGroup} from "./naver-outage-group.mjs";
const startMs=Date.parse("2026-11-01T00:00:00Z");
const fx=(sport,league,at=startMs)=>({sport,league,startMs:at});
test("Naver schedule circuit isolates official sport category and local day",()=>{
 const groups=[
  naverOutageGroup(fx("축구","K리그1")),
  naverOutageGroup(fx("축구","잉글랜드 프리미어리그")),
  naverOutageGroup(fx("농구","NBA")),
  naverOutageGroup(fx("농구","KBL")),
  naverOutageGroup(fx("야구","MLB")),
  naverOutageGroup(fx("야구","KBO"))
 ];
 assert.equal(new Set(groups).size,6);
 assert.deepEqual(groups,[
  "kfootball:2026-11-01","wfootball:2026-11-01",
  "wbasketball:2026-11-01","kbasketball:2026-11-01",
  "wbaseball:2026-11-01","kbaseball:2026-11-01"
 ]);
 assert.notEqual(naverOutageGroup(fx("축구","K리그1",startMs+24*3600000)),groups[0]);
});
test("a failed football group does not trip the NBA or KBL group circuit",()=>{
 const failures=new Map();
 const dead=naverOutageGroup(fx("축구","K리그1"));
 failures.set(dead,2);
 const basketball=naverOutageGroup(fx("농구","NBA"));
 const koreanBasketball=naverOutageGroup(fx("농구","KBL"));
 assert.ok((failures.get(dead)??0)>=2);
 assert.ok((failures.get(basketball)??0)<2);
 assert.ok((failures.get(koreanBasketball)??0)<2);
});
