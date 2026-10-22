import test from "node:test";
import assert from "node:assert/strict";
import { dueGames, dueVerifications, preserveFrozenRecords, auditChanges, minute } from "./logic.mjs";
test("window ignores kicked off and far future, preserves locked PRE", () => {
 const now = Date.parse("2026-10-22T00:00:00Z");
 const game = n => ({home:"A",away:"B",gameDateMs:now+n*minute,markets:[{selections:[{odds:1.5}]}]});
 assert.equal(dueGames([game(-1),game(5),game(40),game(101)],[],now).length,1);
 assert.equal(dueGames([game(40)],[{home:"A",away:"B",startMs:now+40*minute,capturedAt:now}],now).length,0);
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
