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

test("mixed-success Actions batch must publish all already-frozen PRE even when overall scan failed",()=>{
 // Reproduces 2026-10-24 20:25 KST incident: 29 previously published,
 // 31 frozen in the run artifact, but one browser item failed.
 const now=Date.parse("2026-10-24T11:25:00Z");
 const previous=Array.from({length:29},(_,i)=>({
  id:"locked-"+i,sport:"축구",home:"HOME-"+i,away:"AWAY-"+i,
  startMs:now+100000+i*1000,capturedAt:now-100000,
  decision:"PASS",picks:[],marketResults:[{key:"m-"+i,grade:"PASS",probability:55}],
  verificationStatus:"PENDING"
 }));
 const newlyFrozen=[0,1].map(i=>({
  id:"new-"+i,sport:"축구",home:"NewHome-"+i,away:"NewAway-"+i,
  startMs:now+1800000+i*1000,capturedAt:now-60000,
  decision:"PASS",picks:[],marketResults:[{key:"eval-"+i,grade:"WATCH",expectedValue:-2}],
  verificationStatus:"PENDING"
 }));
 const state={schema:"wisetoto-auto-v1",meta:{lastRunAt:now},
  localStorage:{[TRACKER_KEY]:JSON.stringify([...previous,...newlyFrozen])}};
 const result=publishProjection(state);
 assert.equal(result.counts.total,31);
 assert.equal(result.lastRunAt,now);
 assert.equal(result.records.filter(r=>r.id.startsWith("new-")).length,2);
 assert.equal(result.records.filter(r=>r.id.startsWith("new-")&&r.top1===null).length,2);
 assert.equal(JSON.parse(state.localStorage[TRACKER_KEY]).length,31);
 assert.ok(result.records.every(r=>r.capturedAt<r.startMs));
});
test("browser timeout must not block archived tracker publication",async()=>{
 const {readFile}=await import("node:fs/promises");
 const w=await readFile(new URL("../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 const gen=w.slice(w.indexOf("- name: Generate public read-only dashboard projection"),w.indexOf("- name: Publish site-readable history"));
 const pub=w.slice(w.indexOf("- name: Publish site-readable history"),w.indexOf("- name: Summarize OOS report"));
 assert.ok(gen.includes("if: always()"));
 assert.ok(pub.includes("if: always()"));
 assert.ok(pub.includes("PUBLIC_RECORD_REGRESSION"));
 assert.ok(pub.includes("PUBLIC_LEDGER_RECONCILED"));
 assert.ok(!pub.includes("checkpoint-ready"));
});
test("public output distinguishes a delayed result without fabricating final score",()=>{
 const now=Date.now(),r={id:"pending",sport:"축구",home:"A",away:"B",
   startMs:now-8*60*60_000,capturedAt:now-10*60*60_000,decision:"PASS",
   picks:[],marketResults:[],verificationStatus:"PENDING",
   verifyWaitReason:"NAVER_FIXTURE_UNMATCHED",verifyLastCheckedAt:now-60_000};
 const projection=publishProjection({localStorage:{[TRACKER_KEY]:JSON.stringify([r])}});
 assert.equal(projection.counts.overdue,1);
 assert.equal(projection.counts.verified,0);
 assert.equal(projection.records[0].status,"PENDING");
 assert.equal(projection.records[0].result,null);
 assert.equal(projection.records[0].verifyWaitReason,"NAVER_FIXTURE_UNMATCHED");
 assert.ok(projection.records[0].capturedAt<projection.records[0].startMs);
});
test("Actions always reconciles results independently of PRE batch and publishes fresh checkpoint",async()=>{
 const {readFile}=await import("node:fs/promises");
 const workflow=await readFile(new URL("../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 const runner=await readFile(new URL("./runner.mjs",import.meta.url),"utf8");
 const page=await readFile(new URL("../WisetotoAnalyzer-LiveFree/src/app/page.tsx",import.meta.url),"utf8");
 assert.match(workflow,/name: Reconcile ended games independently of PRE batch outcome\s+if: always\(\) && steps\.due\.outputs\.verify_due == 'true'/);
 assert.match(workflow,/node automation\/runner\.mjs --verify-only/);
 assert.match(workflow,/PUBLIC_RECORD_REGRESSION/);
 assert.match(runner,/const verifyOnly=process\.argv\.includes\("--verify-only"\)/);
 assert.match(runner,/verificationTimedOut/);
 assert.match(page,/Fair queue: do not keep retrying the same failed first 10 records/);
 assert.match(page,/session auto-court hook must not consume the bridge's verification lock/);
});

test("no Vercel build is requested for the data-only automation branch",async()=>{
 const {readFile}=await import("node:fs/promises");
 for(const relative of ["../WisetotoAnalyzer-LiveFree/vercel.json",
   "../WisetotoAnalyzer-LiveFree/WisetotoAnalyzer-LiveFree/vercel.json"]){
  const settings=JSON.parse(await readFile(new URL(relative,import.meta.url),"utf8"));
  assert.equal(settings.framework,"nextjs");
  assert.equal(settings.git.deploymentEnabled["automation-data"],false);
  assert.notEqual(settings.git.deploymentEnabled.main,false);
 }
 const workflow=await readFile(new URL("../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 assert.match(workflow,/name: Seed no-deploy config on automation-data branch/);
 assert.match(workflow,/Disable Vercel deploys for data-only branch/);
});

test("quarantine historical false volleyball VERIFIED and flag negative-EV VALUE without rewriting PRE",()=>{
 const rows=[
  {id:"invalid-old-final",sport:"배구",home:"Woori",away:"KEPCO",startMs:10000,
   capturedAt:9000,verificationStatus:"VERIFIED",verifiedAt:12000,
   result:{homeScore:2,awayScore:2},picks:[],marketResults:[]},
  {id:"invalid-old-value",sport:"농구",home:"Clippers",away:"Kings",startMs:11000,
   capturedAt:9500,verificationStatus:"VERIFIED",verifiedAt:16000,
   result:{homeScore:113,awayScore:93},decision:"PICK",
   picks:[{key:"p",grade:"VALUE",market:"승패",probability:72.2,odds:1.33,
    expectedValue:-4,resultStatus:"HIT"}],marketResults:[]}
 ];
 const before=JSON.stringify(rows),state={localStorage:{[TRACKER_KEY]:before}};
 const projection=publishProjection(state),invalid=projection.records.find(x=>x.id==="invalid-old-final");
 assert.equal(projection.counts.total,2);
 assert.equal(projection.counts.verified,1);
 assert.equal(projection.counts.review,1);
 assert.equal(invalid.status,"REVIEW_REQUIRED");
 assert.ok(invalid.warnings.some(w=>w.includes("종목 규칙")));
 assert.ok(projection.records.find(x=>x.id==="invalid-old-value").warnings.some(w=>w.includes("EV")));
 assert.equal(projection.records.find(x=>x.id==="invalid-old-value").top1.resultStatus,"HIT");
 assert.equal(state.localStorage[TRACKER_KEY],before);
});

test("every archived raw tracker row remains visible even when metadata is incomplete",()=>{
 const raw=[
   {id:"valid",sport:"축구",home:"A",away:"B",startMs:3000,capturedAt:1000,verificationStatus:"PENDING"},
   {id:"missing-capture",sport:"배구",home:"C",away:"D",startMs:4000,verificationStatus:"PENDING"},
   {sport:"농구",home:"E",away:"F",startMs:5000,capturedAt:2000,verificationStatus:"PENDING"}
 ];
 const state={localStorage:{[TRACKER_KEY]:JSON.stringify(raw)}};
 const projected=publishProjection(state);
 assert.equal(projected.counts.total,raw.length);
 assert.equal(projected.records.filter(r=>r.status==="REVIEW_REQUIRED").length,2);
 assert.equal(JSON.stringify(JSON.parse(state.localStorage[TRACKER_KEY])),JSON.stringify(raw));
});
