import test from "node:test";
import assert from "node:assert/strict";
import {publishProjection,summarizeRecord} from "./publish.mjs";
import {TRACKER_KEY} from "./logic.mjs";
test("public projection hides raw model snapshots and credentials",()=>{
 const frozen={id:"g1",sport:"축구",home:"홈",away:"원정",startMs:1000,capturedAt:900,
  footballPre:{expectedHome:1.4,expectedAway:1.2,homeRecentSample:2,awayRecentSample:5},
  picks:[{key:"p",market:"H -1",pick:"패",probability:58.4,expectedValue:-3,grade:"WATCH",resultStatus:"PENDING",modelSnapshot:{secret:"omit"}}],
  marketResults:[],verificationStatus:"PENDING",result:null};
 const src={localStorage:{[TRACKER_KEY]:JSON.stringify([frozen])},meta:{lastRunAt:123}};
 const projection=publishProjection(src);
 assert.equal(projection.counts.total,1);
 assert.equal(projection.records[0].top1.probability,58.4);
 assert.equal(projection.records[0].pre.expectedHome,1.4);
 assert.ok(projection.records[0].warnings[0].includes("최근 Form"));
 assert.equal(JSON.stringify(projection).includes("secret"),false);
 assert.equal(JSON.stringify(projection).includes("modelSnapshot"),false);
 assert.equal(JSON.stringify(src.localStorage[TRACKER_KEY]),JSON.stringify(JSON.stringify([frozen])));
});
test("postmatch statuses preserve original confidence and calculate counts",()=>{
 const record={id:"g2",sport:"농구",home:"A",away:"B",startMs:1000,capturedAt:900,decision:"PICK",picks:[{key:"p",probability:65,grade:"WATCH",resultStatus:"MISS"}],verificationStatus:"VERIFIED",result:{homeScore:70,awayScore:80}};
 const projected=summarizeRecord(record);
 assert.equal(projected.top1.probability,65);
 assert.deepEqual(projected.result,{homeScore:70,awayScore:80,source:""});
 const state={localStorage:{[TRACKER_KEY]:JSON.stringify([record])}};
 assert.equal(publishProjection(state).counts.miss,1);
});

test("projection reveals authentic frozen NBA points but not the model snapshot",()=>{
 const record={id:"court",sport:"농구",home:"A",away:"B",startMs:5000,capturedAt:2000,
  courtPre:{stage:"PRE",capturedAt:2000,expectedHome:117.4,expectedAway:110.6,homeRecentSample:5,awayRecentSample:4},
  picks:[{key:"p",probability:72,expectedValue:-3,resultStatus:"PENDING",modelSnapshot:{internal:"hidden"}}],
  verificationStatus:"PENDING"};
 const projected=summarizeRecord(record);
 assert.deepEqual(projected.courtPre,{expectedHome:117.4,expectedAway:110.6,homeRecentSample:5,awayRecentSample:4,homeVenueSample:null,awayVenueSample:null});
 assert.equal(projected.pre,null);
 assert.equal(JSON.stringify(projected).includes("internal"),false);
 assert.equal(summarizeRecord({...record,courtPre:null}).courtPre,null);
});

test("PASS evidence describes incomplete frozen sample, not an invented rejection gate",()=>{
 const input={id:"p",sport:"농구",decision:"PASS",startMs:2000,capturedAt:1000,
  courtPre:{expectedHome:110,expectedAway:109,homeRecentSample:2,awayRecentSample:0},
  picks:[],marketResults:[{key:"m",market:"U/O",grade:"PASS",probability:55}]};
 const before=JSON.stringify(input),out=summarizeRecord(input);
 assert.deepEqual(out.passEvidence,["NO_SELECTED_TOP1","ZERO_RECENT_FORM_SAMPLE"]);
 assert.equal(out.markets.length,1);
 assert.equal(out.top1,null);
 assert.equal(JSON.stringify(input),before);
});
test("volleyball and baseball PASS report unavailable archived decision reason",()=>{
 for(const sport of ["배구","야구"]){
  assert.deepEqual(summarizeRecord({sport,decision:"PASS",picks:[],marketResults:[]}).passEvidence,
   ["NO_SELECTED_TOP1","NO_MARKET_EVALUATIONS","MODEL_REASON_NOT_ARCHIVED"]);
 }
});
