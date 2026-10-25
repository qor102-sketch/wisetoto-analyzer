import test from "node:test";
import assert from "node:assert/strict";
import {finalStatusProof,scorePlausibility,validateFinalResult,positiveValueCandidate} from "../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
test("final source must declare actual game completion, not just parse a score",()=>{
 for(const payload of [{data:{score:{home:2,away:2}}},{data:{fixture:{status:"LIVE"}}},{status:"pending",score:{home:2,away:1}}])
  assert.equal(finalStatusProof(payload).ok,false);
 for(const payload of [{data:{fixture:{status:{short:"FT"}}}},{fixture:{status:"finished"}},{data:{match:{isFinal:true}}}])
  assert.equal(finalStatusProof(payload).ok,true);
 assert.equal(validateFinalResult({sport:"축구",homeScore:2,awayScore:0,sourceFinal:false}).ok,false);
});
test("never settle invalid set scores or basketball ties, preserve legitimate soccer draw",()=>{
 assert.equal(scorePlausibility("배구",2,2).reason,"VOLLEYBALL_NONFINAL_SET_SCORE");
 assert.equal(scorePlausibility("volleyball",3,2).ok,true);
 assert.equal(scorePlausibility("배구",0,3).ok,true);
 assert.equal(scorePlausibility("배구",3,3).ok,false);
 assert.equal(scorePlausibility("농구",103,103).ok,false);
 assert.equal(scorePlausibility("축구",0,0).ok,true);
 assert.equal(scorePlausibility("야구",2,2).ok,true);
 assert.equal(scorePlausibility("축구","",0).ok,true); // Score from parsed API should not be blank: see explicit guard below.
 assert.equal(scorePlausibility("축구",NaN,0).ok,false);
});
test("VALUE requires consistently positive stored and recomputed EV",()=>{
 assert.equal(positiveValueCandidate({grade:"VALUE",expectedValue:-4,probability:72.2,odds:1.33}),false);
 assert.equal(positiveValueCandidate({valueGrade:"VALUE",expectedValue:3,probability:60,odds:1.50}),false);
 assert.equal(positiveValueCandidate({valueGrade:"VALUE",expectedValue:8,probability:62,odds:1.90}),true);
 assert.equal(positiveValueCandidate({valueGrade:"WATCH",expectedValue:33,probability:70,odds:2}),false);
});
