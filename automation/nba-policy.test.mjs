import test from "node:test";
import assert from "node:assert/strict";
import {isNbaGame,purgeNbaCollectionState,purgeNbaResearchState,
 purgeNbaTrackerStorage,withoutNba} from "./nba-policy.mjs";
import {validFeed,cachedFeed,liveFeed,excludeNbaFeed} from "./feed.mjs";
import {getRecords,dueGames,dueVerifications,preserveFrozenRecords,
 sportCounts,TRACKER_KEY,APPEND_KEY} from "./logic.mjs";
import {collect,projection,SCHEMA as COLLECT_SCHEMA} from "./research/collect-first.mjs";
import {publishProjection} from "./publish.mjs";
import {reconcilePublishedHistory} from "./reconcile-public.mjs";
import {ingestEvidence,publicEvidence,SCHEMA as EVIDENCE_SCHEMA} from "./research/evidence.mjs";
import {buildPilotReport} from "./research/pilot-top1.mjs";

const T=Date.parse("2026-11-07T00:00:00Z"),M=60000,D=86400000;
const row=(league,sport="basketball",name="A")=>({
 sport,league,home:name,away:"Team B",gameDateMs:T+25*M,
 markets:[{type:"moneyline",betName:sport==="soccer"?"축구 승무패":"농구 승패",
  selections:(sport==="soccer"?["win","draw","lose"]:["win","lose"])
   .map((side,i)=>({side,odds:1.9+i*.2,label:side}))}]
});
const nba=row("NBA"),nbaCup=row("NBA Cup","basketball","Cup"),
 kbl=row("KBL","basketball","Korean"),wnba=row("WNBA","basketball","Women"),
 womens=row("미국여자프로농구 WNBA","basketball","Women2"),soccer=row("NBA","soccer","Soccer"),
easl=row("동아시아 슈퍼리그","basketball","EASL");
test("NBA-only policy is league-and-sport exact, never deleting KBL/EASL/WNBA",()=>{
 for(const g of [nba,nbaCup,{...nba,sport:"농구",league:"미국 프로농구"}])
  assert.equal(isNbaGame(g),true);
 for(const g of [kbl,wnba,womens,easl,soccer,{...nba,sport:"baseball"}])
  assert.equal(isNbaGame(g),false,JSON.stringify(g));
 const filtered=withoutNba([nba,nbaCup,kbl,easl,wnba,womens,soccer]);
 assert.equal(filtered.length,5);
 assert.equal(filtered.some(isNbaGame),false);
});
test("all Betman cached/live readers enforce policy including legacy pre-filter snapshots",async()=>{
 const payload={ok:true,games:[nba,kbl,wnba,soccer]};
 const clean=excludeNbaFeed(payload);
 assert.equal(clean.games.length,3);
 assert.equal(clean.nbaExcludedCount,1);
 assert.equal(clean.games[0],kbl);
 assert.equal(validFeed(clean),true);
 assert.equal(cachedFeed({fetchedAt:T-500,payload},T).games.length,3);
 const result=await liveFeed("https://example.invalid",{retries:1,now:()=>T,
  fetchFn:async()=>({ok:true,json:async()=>payload})});
 assert.equal(result.payload.games.length,3);
 assert.equal(result.payload.games.some(isNbaGame),false);
 assert.equal(excludeNbaFeed({ok:true,games:[nba]}).games.length,0);
 assert.equal(validFeed(excludeNbaFeed({ok:true,games:[nba]})),true);
 assert.equal(validFeed({ok:true,games:[]}),false,"unproven empty source is not a valid upstream feed");
});
test("NBA never enters live collection, even when a bypass sends raw excluded feed",()=>{
 const games=[nba,kbl,wnba,soccer],feed={ok:true,games};
 const collected=collect({schema:COLLECT_SCHEMA,records:[]},feed,T,T);
 assert.equal(collected.summary.excludedNba,1);
 assert.equal(collected.state.records.length,3);
 assert.ok(collected.state.records.every(x=>!isNbaGame(x)));
 assert.equal(projection(collected.state,T).counts.collected,3);
 assert.equal(dueGames(games,[],T).length,3);
 assert.equal(sportCounts(games)["농구"],2);
 const oldNba={key:"old",sport:"농구",league:"NBA",startMs:T-D,
  verdict:"PENDING",lastResultCheckAt:null};
 assert.equal(dueVerifications([oldNba],T).length,0);
});
test("purge existing NBA operation rows and derived historic metrics without deleting other leagues",()=>{
 const one={key:"nba",sport:"농구",league:"NBA",startMs:T,
  verdict:"VERIFIED",resultSource:"ESPN",final:{homeScore:108,awayScore:97}};
 const two={...one,key:"nba-two",verdict:"PENDING"};
 const keep={...one,key:"kbl",league:"KBL",verdict:"VERIFIED",final:{homeScore:88,awayScore:80}};
 const football={...one,key:"football",sport:"축구",league:"잉글랜드 프리미어리그"};
 const old={schema:COLLECT_SCHEMA,records:[one,two,keep,football],archiveCounts:{collected:0},
  operationalEffect:{schema:"wisetoto-operational-effect-v1",history:[{totals:{collected:4}}]},
  updatedAt:T-1000};
 const removed=purgeNbaCollectionState(old,T);
 assert.equal(removed.removed,2);
 assert.deepEqual(removed.state.records,[keep,football]);
 assert.equal(removed.state.operationalEffect,null);
 assert.equal(removed.state.nbaExclusion.appliedAt,T);
 assert.deepEqual(purgeNbaCollectionState(removed.state,T+D).state,removed.state);
 assert.deepEqual(old.records,[one,two,keep,football]);
 assert.throws(()=>purgeNbaCollectionState({...old,archiveCounts:{collected:1}},T),
  /ARCHIVE_REVIEW_REQUIRED/);
});
test("legacy frozen PRE/public history removes only NBA and preserves verified non-NBA",()=>{
 const oldNBA={id:"nba",sport:"농구",league:"NBA",home:"A",away:"B",startMs:T,
  capturedAt:T-1000,verificationStatus:"VERIFIED",picks:[]};
 const oldKBL={...oldNBA,id:"kbl",league:"KBL",verificationStatus:"PENDING"};
 const storage={localStorage:{[TRACKER_KEY]:JSON.stringify([oldNBA,oldKBL]),
  [APPEND_KEY]:JSON.stringify([oldNBA,oldKBL])}};
 assert.deepEqual(getRecords(storage).map(x=>x.id),["kbl"]);
 const clean=purgeNbaTrackerStorage(storage.localStorage).storage;
 assert.deepEqual(JSON.parse(clean[TRACKER_KEY]).map(x=>x.id),["kbl"]);
 assert.deepEqual(JSON.parse(clean[APPEND_KEY]).map(x=>x.id),["kbl"]);
 assert.deepEqual(preserveFrozenRecords([oldNBA,oldKBL],[]).map(x=>x.id),["kbl"]);
 const pub=publishProjection(storage);
 assert.deepEqual(pub.records.map(x=>x.id),["kbl"]);
 assert.equal(pub.policy.nbaExcluded,true);
});
const hist=(records,policy=null)=>({schema:"wisetoto-public-history-v1",
 records,counts:{total:records.length,verified:records.filter(x=>x.status==="VERIFIED").length},policy});
const finalRow=(id,league)=>({id,sport:"농구",league,startMs:T-2*D,
 status:"VERIFIED",verifiedAt:T-D,result:{homeScore:90,awayScore:83,source:"ESPN"},
 top1:{key:"p",resultStatus:"MISS"},markets:[],warnings:[]});
test("public-history deletion exception is NBA-only; any lost non-NBA frozen result blocks",()=>{
 const old=hist([finalRow("nba","NBA"),finalRow("kbl","KBL")]);
 const next=hist([finalRow("kbl","KBL")],{nbaExcluded:true});
 const out=reconcilePublishedHistory(old,next);
 assert.equal(out.data.records.length,1);
 assert.equal(out.data.records[0].id,"kbl");
 assert.throws(()=>reconcilePublishedHistory(old,hist([finalRow("kbl","KBL")])),
  /PUBLIC_RECORD_REGRESSION/);
 assert.throws(()=>reconcilePublishedHistory(old,hist([],{nbaExcluded:true})),
  /PUBLIC_RECORD_REGRESSION/);
 assert.throws(()=>reconcilePublishedHistory(old,hist([finalRow("nba","NBA")],{nbaExcluded:true})),
  /PUBLIC_NBA_POLICY_VIOLATION/);
});
test("NBA research purge preserves exact non-NBA frozen evidence and 28-day clock without retro TOP1 substitution",()=>{
 const start=T-2*D;
 const candidate=(id,league,day,shift)=>({id,sport:"농구",league,
  home:id,away:"Away",startMs:T+day*D,
  firstSeenAt:T-2*D,snapshots:[],
  frozenCandidate:{side:"win",odds:2.2,marketProbability:.5,
   asOf:T+day*D-30000,shift},truth:null});
 const nbaHigh=candidate("nba","NBA",0,.2);
 const kblLow=candidate("kbl","KBL",0,.05);
 const kblNext=candidate("kbl-next","KBL",D/D,.12);
 const original={schema:EVIDENCE_SCHEMA,pilot:{startedAt:start,lastReportedWeek:0},
  fixtures:[nbaHigh,kblLow,kblNext]};
 const migrated=purgeNbaResearchState(original,T);
 assert.equal(migrated.removed,1);
 assert.equal(migrated.state.fixtures.length,2);
 assert.equal(migrated.state.pilot.startedAt,start);
 assert.equal(migrated.state.pilot.nbaExcludedShadowDates.length,1);
 assert.equal(migrated.state.fixtures[0],kblLow);
 const pilot=buildPilotReport(migrated.state,T+10*D);
 assert.equal(pilot.startedAt,start);
 assert.equal(pilot.shadowHistory.some(x=>x.id==="kbl"),false,
  "a removed NBA winning daily choice must not be replaced after outcomes");
 assert.equal(pilot.shadowHistory.some(x=>x.id==="kbl-next"),true);
 assert.equal(pilot.bySport["농구"].decisions,0);
 assert.equal(pilot.grade,"EXPLORATORY_ONLY");
 assert.equal(purgeNbaResearchState(migrated.state,T+D).removed,0);
});
test("research direct ingest never starts pilot on only-NBA feed but accepts genuine KBL",()=>{
 const initial={schema:EVIDENCE_SCHEMA,fixtures:[]};
 const omitted=ingestEvidence(initial,{ok:true,games:[nba]},T,[],T);
 assert.equal(omitted.state.fixtures.length,0);
 assert.equal(omitted.state.pilot,null);
 const kblOnly=ingestEvidence(initial,{ok:true,games:[kbl]},T,[],T);
 assert.equal(kblOnly.state.fixtures.length,1);
 assert.equal(kblOnly.state.fixtures[0].league,"KBL");
 assert.equal(publicEvidence(kblOnly.state,T).counts.future,1);
});
