import test from "node:test";
import assert from "node:assert/strict";
import {reconcilePublishedHistory} from "./reconcile-public.mjs";
const row=(id,status="PENDING")=>({
 id,sport:"축구",home:"Home",away:"Away",startMs:1793022300000,capturedAt:1793021000000,
 status,verifiedAt:status==="VERIFIED"?1793029999000:null,
 result:status==="VERIFIED"?{homeScore:2,awayScore:1,source:"NAVER"}:null,
 top1:{key:"pick-a",odds:2,probability:60,expectedValue:20,
  resultStatus:status==="VERIFIED"?"HIT":"PENDING",actualLabel:status==="VERIFIED"?"승":null},
 markets:[{key:"m1",odds:2.1,probability:52,resultStatus:status==="VERIFIED"?"HIT":"PENDING"}],
 warnings:[]});
const pub=records=>({schema:"wisetoto-public-history-v1",counts:{
 total:records.length,verified:records.filter(r=>r.status==="VERIFIED").length,
 pending:records.filter(r=>r.status==="PENDING").length},records});
test("backfilled 41 projection carries old independently verified outcomes and immutable picks",()=>{
 const old=pub([row("a","VERIFIED"),row("b","PENDING")]);
 const next=pub([row("a"),row("b"),row("c")]);
 const result=reconcilePublishedHistory(old,next);
 assert.equal(result.repaired,1);
 assert.equal(result.data.counts.total,3);
 assert.equal(result.data.counts.verified,1);
 assert.equal(result.data.counts.pending,2);
 const carried=result.data.records[0];
 assert.equal(carried.status,"VERIFIED");
 assert.deepEqual(carried.result,{homeScore:2,awayScore:1,source:"NAVER"});
 assert.equal(carried.top1.resultStatus,"HIT");
 assert.equal(carried.top1.odds,2);
 assert.equal(carried.markets[0].resultStatus,"HIT");
 assert.equal(next.records[0].status,"PENDING");
});
test("conflicting final scores, disappearing rows, malformed settlement fail closed",()=>{
 const old=pub([row("a","VERIFIED")]);
 assert.throws(()=>reconcilePublishedHistory(old,pub([])),/PUBLIC_RECORD_REGRESSION/);
 assert.throws(()=>reconcilePublishedHistory(old,pub([{...row("a","VERIFIED"),
  result:{homeScore:1,awayScore:0,source:"SPORTSAPI"}}])),/PUBLIC_FINAL_SCORE_CONFLICT/);
 assert.throws(()=>reconcilePublishedHistory(old,pub([row("a","VOID")])),/PUBLIC_FINAL_STATUS_CONFLICT/);
 const bad=pub([{...row("a","VERIFIED"),verifiedAt:null}]);
 const review=reconcilePublishedHistory(bad,pub([row("a")]));
 assert.equal(review.data.records[0].status,"REVIEW_REQUIRED");
 assert.equal(review.invalidPrior,1);
});
test("same completed final is preserved without mutating frozen prediction or duplicate count",()=>{
 const old=pub([row("a","VERIFIED")]),next=pub([row("a","VERIFIED"),row("b")]);
 const out=reconcilePublishedHistory(old,next);
 assert.equal(out.repaired,0);
 assert.equal(out.data.counts.verified,1);
 assert.equal(out.data.records[0].top1.odds,2);
});

test("historical volleyball 2-2 erroneously marked VERIFIED becomes REVIEW_REQUIRED, never a verified final",()=>{
 const bad={...row("v","VERIFIED"),sport:"배구",
   result:{homeScore:2,awayScore:2,source:""}};
 const reviewed={...row("v"),sport:"배구",status:"REVIEW_REQUIRED",
  result:{homeScore:2,awayScore:2,source:""},warnings:[]};
 const output=reconcilePublishedHistory(pub([bad]),pub([reviewed,row("extra")]));
 assert.equal(output.data.counts.total,2);
 assert.equal(output.data.counts.verified,0);
 assert.equal(output.data.counts.review,1);
 assert.equal(output.data.records[0].status,"REVIEW_REQUIRED");
 assert.ok(output.data.records[0].warnings.some(x=>x.includes("종목 점수 규칙")));
 assert.equal(output.invalidPrior,1);
});
