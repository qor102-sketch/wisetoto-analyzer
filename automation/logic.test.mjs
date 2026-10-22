import test from "node:test";
import assert from "node:assert/strict";
import { dueGames, dueVerifications, preserveFrozenRecords, auditChanges, minute, sportName, sportCounts } from "./logic.mjs";
test("window ignores kicked off and far future, preserves locked PRE", () => {
 const now = Date.parse("2026-10-22T00:00:00Z");
 const game = n => ({sport:"soccer",home:"A",away:"B",gameDateMs:now+n*minute,markets:[{selections:[{odds:1.5}]}]});
 assert.equal(dueGames([game(-1),game(5),game(40),game(101)],[],now).length,1);
 assert.equal(dueGames([game(40)],[{sport:"축구",home:"A",away:"B",startMs:now+40*minute,capturedAt:now}],now).length,0);
});
test("result verification is 2h after kickoff only",()=>{
 const now=Date.now();
 assert.equal(dueVerifications([{verificationStatus:"PENDING",startMs:now-60*minute},{verificationStatus:"PENDING",startMs:now-125*minute}],now).length,1);
});
test("frozen probability and timestamp never overwritten by later result",()=>{
 const before={id:"g1",startMs:1111,capturedAt:900,footballPre:{expectedHome:1.2},picks:[{key:"p",probability:60,expectedValue:-4,resultStatus:"PENDING"}],verificationStatus:"PENDING"};
 const later={...before,capturedAt:1200,footballPre:{expectedHome:9},picks:[{key:"p",probability:99,expectedValue:50,resultStatus:"MISS"}],verificationStatus:"VERIFIED",result:{homeScore:0,awayScore:1}};
 const merged=preserveFrozenRecords([before],[later])[0];
 assert.equal(merged.capturedAt,900);assert.equal(merged.picks[0].probability,60);assert.equal(merged.picks[0].resultStatus,"MISS");assert.equal(merged.footballPre.expectedHome,1.2);
 const report=auditChanges([before],[merged]);assert.equal(report.verified.length,1);
});

test("positive-EV grade alert applies only to soccer policy",()=>{
 const records=[
  {id:"basket",sport:"농구",home:"Clippers",away:"Kings",capturedAt:1000,picks:[{grade:"VALUE",expectedValue:-2}]},
  {id:"soccer",sport:"축구",home:"A",away:"B",capturedAt:1000,picks:[{grade:"VALUE",expectedValue:-2}]}
 ];
 const audit=auditChanges([],records);
 assert.equal(audit.suspicious.length,1);
 assert.equal(audit.suspicious[0].stage,"GRADE_GATE");
 assert.equal(audit.suspicious[0].game,"A vs B");
});

test("existing NBA PRE scores cannot be rewritten after result verification",()=>{
 const old={id:"nba",sport:"농구",startMs:5000,capturedAt:2000,verificationStatus:"PENDING",
   courtPre:{stage:"PRE",capturedAt:2000,expectedHome:113.2,expectedAway:109.7,homeRecentSample:5,awayRecentSample:5},
   picks:[{key:"p",probability:71,expectedValue:-3,resultStatus:"PENDING"}]};
 const later={...old,capturedAt:6500,verificationStatus:"VERIFIED",
   courtPre:{stage:"PRE",capturedAt:6500,expectedHome:999,expectedAway:999},
   picks:[{key:"p",probability:99,expectedValue:20,resultStatus:"HIT"}],result:{homeScore:120,awayScore:110}};
 const safe=preserveFrozenRecords([old],[later])[0];
 assert.equal(safe.courtPre.expectedHome,113.2);
 assert.equal(safe.courtPre.expectedAway,109.7);
 assert.equal(safe.courtPre.capturedAt,2000);
 assert.equal(safe.capturedAt,2000);
 assert.equal(safe.picks[0].probability,71);
 assert.equal(safe.picks[0].resultStatus,"HIT");
});
test("legacy NBA PRE without a saved score must not be retroactively invented",()=>{
 const old={id:"legacy",sport:"농구",startMs:5000,capturedAt:2000,verificationStatus:"PENDING",picks:[]};
 const later={...old,courtPre:{expectedHome:117,expectedAway:110},verificationStatus:"VERIFIED"};
 const safe=preserveFrozenRecords([old],[later])[0];
 // Current preservation path must guard undefined old snapshot as well.
 assert.equal(safe.courtPre,null);
});


test("ten-minute scanner includes every supported Betman sport without single-sport filter",()=>{
  const now=Date.parse("2026-10-22T03:00:00Z");
  const sportFixtures=[
    ["soccer","축구"],["basketball","농구"],["baseball","야구"],["volleyball","배구"]
  ].map(([sport,alias],i)=>({sport,home:alias+" 홈",away:alias+" 원정",
    gameDateMs:now+(70-i*12)*minute,
    markets:[{selections:[{odds:1.64}]}]}));
  const due=dueGames(sportFixtures,[],now);
  assert.equal(due.length,4);
  assert.deepEqual(due.map(x=>sportName(x.sport)),["배구","야구","농구","축구"]);
  assert.deepEqual(sportCounts(sportFixtures),{"축구":1,"농구":1,"야구":1,"배구":1});
  const saved={sport:"농구",home:"농구 홈",away:"농구 원정",
    startMs:now+58*minute,capturedAt:now};
  const remaining=dueGames(sportFixtures,[saved],now);
  assert.equal(remaining.length,3);
  assert.equal(remaining.some(g=>g.sport==="basketball"),false);
});
test("reject unknown sports, TBD identities, no odds, kickoffs and malformed dates",()=>{
  const now=Date.parse("2026-10-22T03:00:00Z");
  const good={sport:"soccer",home:"Home",away:"Away",
    gameDateMs:now+50*minute,markets:[{selections:[{odds:1.9}]}]};
  const bad=[
    {...good,sport:"curling"},
    {...good,home:"미정"},
    {...good,away:"TBD"},
    {...good,markets:[{selections:[]}]},
    {...good,gameDateMs:now-5*minute},
    {...good,gameDateMs:now+5*minute},
    {...good,gameDateMs:now+120*minute},
    {...good,gameDateMs:NaN,gameDate:"invalid"},
  ];
  assert.deepEqual(dueGames([good,...bad],[],now),[good]);
});
test("large same-time all-sports list is never silently truncated by discovery",()=>{
 const now=Date.parse("2026-10-22T03:00:00Z");
 const all=Array.from({length:40},(_,i)=>({sport:["soccer","basketball","baseball","volleyball"][i%4],
   home:"home"+i,away:"away"+i,gameDateMs:now+30*minute,
   markets:[{selections:[{odds:2}]}]}));
 assert.equal(dueGames(all,[],now).length,40);
 assert.equal(dueGames(all,all.slice(0,24).map(g=>({...g,startMs:g.gameDateMs,capturedAt:now})),now).length,16);
});
