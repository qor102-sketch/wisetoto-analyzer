import test from "node:test";
import assert from "node:assert/strict";
import { diagnose,expectedSettlement } from "./triage.mjs";
const fixture=(result={homeScore:2,awayScore:1})=>({
 id:"fixture-X",home:"Nice",away:"Strasbourg",sport:"축구",league:"Ligue 1",
 startMs:1800,capturedAt:1700,verificationStatus:"VERIFIED",result,
 footballPre:{expectedHome:1.55,expectedAway:1.46,homeRecentSample:0,awayRecentSample:3},
 picks:[{key:"h1",market:"H -1",pick:"핸디패",probability:57.5,expectedValue:-9.7,resultStatus:"MISS"}],
 marketResults:[]
});
test("independent full-time home handicap and totals settle correctly",()=>{
 const r=fixture();
 assert.equal(expectedSettlement(r,{market:"H -1",pick:"핸디무"}),"HIT");
 assert.equal(expectedSettlement(r,{market:"H -1",pick:"핸디패"}),"MISS");
 assert.equal(expectedSettlement(r,{market:"H +1",pick:"핸디승"}),"HIT");
 assert.equal(expectedSettlement(r,{market:"U/O 2.5",pick:"오버"}),"HIT");
 assert.equal(expectedSettlement(r,{market:"U/O 2.5",pick:"언더"}),"MISS");
 assert.equal(expectedSettlement(r,{market:"U/O 3",pick:"언더"}),null);
 assert.equal(expectedSettlement(r,{market:"승1패",pick:"패"}),null);
});
test("a valid missed prediction does not produce a code patch",()=>{
 const row=fixture();
 const report=diagnose({verified:[{id:row.id}],suspicious:[]},[row]);
 assert.equal(report.misses,1);
 assert.equal(report.alerts.length,0);
 assert.equal(report.observations[0].warnings[0],"PRE_FORM_MISSING");
 assert.deepEqual(report.observations[0].frozenForecast,[1.55,1.46]);
 assert.equal(report.observations[0].meanAbsoluteScoreError,.455);
});
test("a contradicting market settlement generates a high-confidence repair candidate",()=>{
 const row=fixture();
 row.picks[0].resultStatus="HIT";
 const report=diagnose({verified:[{id:row.id}]},[row]);
 assert.equal(report.alerts.length,1);
 assert.equal(report.alerts[0].stage,"SETTLEMENT_MISMATCH");
 assert.equal(report.alerts[0].autoPatchAllowed,true);
 assert.equal(report.alerts[0].independentStatus,"MISS");
});
test("old data source warnings and negative-EV grades do not authorize changes",()=>{
 const row=fixture();row.picks[0].grade="VALUE";
 const report=diagnose({verified:[{id:row.id}],
   suspicious:[{stage:"DATA_SOURCE",game:"A vs B",at:1700,reason:"Recent missing"}]},[row]);
 assert.equal(report.alerts.length,1);
 assert.equal(report.alerts[0].autoPatchAllowed,false);
 assert.ok(report.observations[0].warnings.includes("NEGATIVE_EV_GRADE_REVIEW"));
});
test("incomplete result and backdated capture are diagnostic only",()=>{
 const row=fixture({homeScore:null,awayScore:1});row.capturedAt=2000;
 const report=diagnose({verified:[{id:row.id}]},[row]);
 assert.equal(report.alerts.filter(a=>a.autoPatchAllowed).length,0);
 assert.deepEqual(new Set(report.alerts.map(x=>x.stage)),new Set(["PRE_TIME_INTEGRITY","RESULT_SOURCE"]));
});
