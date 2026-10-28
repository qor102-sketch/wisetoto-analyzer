import test from "node:test";
import assert from "node:assert/strict";
import {buildCollectionFunnel} from "./pilot-collection.mjs";
import {collect,mergeProviderFinal,projection,SCHEMA} from "./collect-first.mjs";
import {lineupEvidence,mergeLineupEvidence} from "./pregame-lineup.mjs";
const S=Date.parse("2026-11-01T00:00:00Z"),M=60000,DAY=86400000;
const row=(id,sport="축구",start=S+10*M)=>({
 key:id,sport,league:"K",home:"H"+id,away:"A"+id,
 firstSeenAt:S,seenCount:2,startMs:start,fixtureId:null,
 pregameCapturedAt:start-20*M,firstOddsAt:start-20*M,
 odds:[{market:"승무패",side:"win",odds:2.1}],latestOdds:[],
 verdict:"VERIFIED",verifiedAt:start+3*60*M,final:{homeScore:2,awayScore:1},
 lineup:{status:"CONFIRMED",capturedAt:start-10*M,homeCount:11,awayCount:11}
});
test("28-day funnel separates true pregames, lineups, final verifications, pending and result-only",()=>{
 const valid=row("1");
 const noOdds={...row("2","야구"),odds:[],firstOddsAt:null,lineup:{status:"UNSUPPORTED"}};
 const pending={...row("3"),verdict:"PENDING",final:null,verifiedAt:null,firstOddsAt:null,pregameCapturedAt:null,lineup:null};
 const outOfCohort=row("4","축구",S+29*DAY);
 const report=buildCollectionFunnel({schema:SCHEMA,records:[valid,noOdds,pending,outOfCohort]},S,S+6*3600000);
 assert.equal(report.counts.registered,3);
 assert.equal(report.counts.pregameWindow,2);
 assert.equal(report.counts.pregameOdds,1);
 assert.equal(report.counts.finalVerified,2);
 assert.equal(report.counts.verifiedWithOdds,1);
 assert.equal(report.counts.verifiedWithLineup,1);
 assert.equal(report.counts.lineupConfirmed,1);
 assert.equal(report.counts.lineupUnsupported,1);
 assert.equal(report.counts.overduePending,1);
 assert.equal(report.counts.resultOnly,1);
 assert.equal(report.weeks[0].registered,3);
 assert.equal(report.bySport["축구"].registered,2);
 assert.equal(report.bySport["야구"].registered,1);
 assert.equal(report.status,"COLLECTING");
 assert.equal(buildCollectionFunnel({schema:SCHEMA,records:[valid]},S,S+28*DAY).status,"FOUR_WEEK_READY");
});
test("never classify future or unconfirmed final as completed, and never promote late lineup",()=>{
 const future=row("1","축구",S+5*DAY);
 const late={...row("2"),lineup:{status:"CONFIRMED",capturedAt:S+12*M}};
 const report=buildCollectionFunnel({schema:SCHEMA,records:[future,late]},S,S+4*3600000);
 assert.equal(report.counts.finalVerified,1);
 assert.equal(report.counts.lineupConfirmed,1);
 assert.equal(report.counts.verifiedWithLineup,0); // future result and postkickoff XI cannot join
 const stale={...row("3"),verifiedAt:S+8*DAY};
 const r2=buildCollectionFunnel({schema:SCHEMA,records:[stale]},S,S+4*3600000);
 assert.equal(r2.counts.finalVerified,0);
});
test("real collection -> prekickoff confirmed XI -> final preserves complete original fixture evidence",()=>{
 const kickoff=S+25*M;
 const game={sport:"soccer",league:"test",home:"Home",away:"Away",gameDateMs:kickoff,
   markets:[{betName:"축구 승무패",selections:[{side:"win",odds:2.2}]}]};
 let ledger=collect({schema:SCHEMA,records:[]},{ok:true,games:[game]},S).state;
 assert.equal(ledger.records.length,1);
 const before=ledger.records[0];
 const p={ok:true,gameId:"game-123",footballIdentity:{valid:true},
   footballPlayers:{startingHome:11,startingAway:11},
   home:Array.from({length:11},(_,i)=>({name:"home"+i})),
   away:Array.from({length:11},(_,i)=>({name:"away"+i}))};
 const lineup=lineupEvidence(before,p,S+2*M);
 ledger=mergeLineupEvidence(ledger,before.key,lineup,S+2*M);
 ledger=mergeProviderFinal(ledger,before.key,{
   ok:true,finalConfirmed:true,source:"NAVER",result:{homeScore:2,awayScore:1}
 },kickoff+3*60*M);
 const stored=ledger.records[0];
 assert.equal(stored.verdict,"VERIFIED");
 assert.equal(stored.final.homeScore,2);
 assert.equal(stored.lineup.status,"CONFIRMED");
 assert.equal(stored.lineup.home.length,11);
 assert.equal(stored.lineup.capturedAt,S+2*M);
 assert.equal(stored.pregameCapturedAt,S);
 assert.equal(stored.firstOddsAt,S);
 const summary=projection(ledger,kickoff+3*60*M);
 assert.equal(summary.counts.lineupConfirmed,1);
 assert.equal(summary.counts.verifiedWithLineup,1);
 assert.equal(summary.counts.verifiedWithPregame,1);
 const funnel=buildCollectionFunnel(ledger,S,kickoff+3*60*M);
 assert.equal(funnel.counts.verifiedWithOdds,1);
 assert.equal(funnel.counts.verifiedWithLineup,1);
});
test("missing or corrupted collection ledger shows unavailability instead of made-up 4-week totals",()=>{
 assert.equal(buildCollectionFunnel(null,S).status,"LEDGER_UNAVAILABLE");
 assert.equal(buildCollectionFunnel({records:[]},S).status,"LEDGER_UNAVAILABLE");
 assert.equal(buildCollectionFunnel({schema:SCHEMA,records:[]},null),null);
});
