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
 assert.equal(scorePlausibility("축구","",0).ok,false);
 assert.equal(scorePlausibility("축구",NaN,0).ok,false);
});
test("VALUE requires consistently positive stored and recomputed EV",()=>{
 assert.equal(positiveValueCandidate({grade:"VALUE",expectedValue:-4,probability:72.2,odds:1.33}),false);
 assert.equal(positiveValueCandidate({valueGrade:"VALUE",expectedValue:3,probability:60,odds:1.50}),false);
 assert.equal(positiveValueCandidate({valueGrade:"VALUE",expectedValue:8,probability:62,odds:1.90}),true);
 assert.equal(positiveValueCandidate({valueGrade:"WATCH",expectedValue:33,probability:70,odds:2}),false);
});

test("real SportsAPI result handler refuses LIVE scores, volleyball 2:2 and accepts proven FT",async()=>{
 const {GET}=await import("../WisetotoAnalyzer-LiveFree/src/app/api/fixture/result/route.ts");
 const oldKey=process.env.SPORTSAPI_KEY,originalFetch=globalThis.fetch;
 process.env.SPORTSAPI_KEY="ci-fixture-only";
 try{
  const call=async(status,home,away,sport)=>{
   globalThis.fetch=async()=>Response.json({fixture:{status:{short:status},
      score:{homeScore:home,awayScore:away}}});
   const r=await GET(new Request("http://localhost/api/fixture/result?id=645692&sport="+encodeURIComponent(sport)));
   return {status:r.status,body:await r.json()};
  };
  let z=await call("LIVE",2,2,"배구");
  assert.equal(z.status,409);assert.equal(z.body.waitReason,"FINAL_STATUS_UNCONFIRMED");
  z=await call("FT",2,2,"배구");
  assert.equal(z.status,409);assert.equal(z.body.waitReason,"VOLLEYBALL_NONFINAL_SET_SCORE");
  z=await call("FT",3,2,"배구");
  assert.equal(z.status,200);assert.equal(z.body.finalConfirmed,true);
  z=await call("FT",1,1,"축구");
  assert.equal(z.status,200);
 }finally{
  globalThis.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.SPORTSAPI_KEY;else process.env.SPORTSAPI_KEY=oldKey;
 }
});
