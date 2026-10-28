import test from "node:test";
import assert from "node:assert/strict";
import {pregameLineupCandidates,lineupEvidence,mergeLineupEvidence,collectLineupSnapshots} from "./pregame-lineup.mjs";
const T=Date.parse("2026-10-28T00:00:00Z"),M=60_000;
const row=(sport="축구",start=T+25*M,id="a")=>({
 key:id,sport,league:"test",home:"Home",away:"Away",startMs:start,verdict:"PENDING",
 pregameCapturedAt:T,fixtureId:null,odds:[],latestOdds:[]});
const lineup=()=>({ok:true,gameId:"naver-1",
 footballIdentity:{valid:true},footballPlayers:{startingHome:11,startingAway:11},
 game:{gameDateTime:new Date(T+25*M).toISOString()},
 home:Array.from({length:11},(_,i)=>({name:"H "+i})),
 away:Array.from({length:11},(_,i)=>({name:"A "+i}))});
test("only future games within 3h are queried; 20min retry spacing",()=>{
 const rows=[row("축구",T+30*M),row("축구",T+200*M,"far"),row("축구",T-M,"past")];
 assert.deepEqual(pregameLineupCandidates({records:rows},T).map(r=>r.key),["a"]);
 rows[0].lineup={status:"UNAVAILABLE",lastAttemptAt:T-5*M};
 assert.equal(pregameLineupCandidates({records:rows},T).length,0);
 rows[0].lineup.lastAttemptAt=T-21*M;
 assert.equal(pregameLineupCandidates({records:rows},T).length,1);
});
test("football XI accepts 11 verified starters per side before match only",()=>{
 const r=row(),p=lineup(),x=lineupEvidence(r,p,T+5*M);
 assert.equal(x.status,"CONFIRMED");assert.equal(x.homeCount,11);assert.equal(x.awayCount,11);
 assert.equal(x.source,"NAVER_FOOTBALL_PLAYERS");assert.equal(x.capturedAt,T+5*M);
 assert.equal(lineupEvidence(r,p,r.startMs).status,"REJECTED");
 assert.equal(lineupEvidence(r,{...p,footballIdentity:{valid:false}},T).status,"UNAVAILABLE");
 assert.equal(lineupEvidence(r,{...p,gameId:null,partial:true},T).status,"UNAVAILABLE");
 assert.equal(lineupEvidence(r,{...p,game:{gameDateTime:new Date(T+400*M).toISOString()}},T).reason,"KICKOFF_MISMATCH");
 const incomplete={...p,home:p.home.slice(0,9)};
 assert.equal(lineupEvidence(r,incomplete,T).status,"PARTIAL");
});
test("naive Naver fixture datetime is Korea-local, not runner UTC",()=>{
 const p=lineup();
 // T=2026-10-28 09:00 KST, kickoff at 09:25 KST.
 const koreanLocal=new Date(T+25*M+9*3600000).toISOString().slice(0,16).replace("T"," ");
 p.game.gameDateTime=koreanLocal;
 assert.equal(lineupEvidence(row(),p,T).status,"CONFIRMED");
});
test("baseball lineup records batters and starters, not fabricated XI",()=>{
 const r=row("야구"),p={ok:true,gameId:"KBO-1",game:{homeTeamName:"Home",awayTeamName:"Away"},
 home:Array.from({length:9},(_,i)=>({name:"Batter H"+i})),
 away:Array.from({length:9},(_,i)=>({name:"Batter A"+i})),
 homeStarter:{name:"Pitcher H"},awayStarter:{name:"Pitcher A"}};
 const data=lineupEvidence(r,p,T);
 assert.equal(data.status,"CONFIRMED");assert.equal(data.homeStarter,"Pitcher H");
 assert.equal(data.awayCount,9);
 assert.equal(lineupEvidence(r,{...p,game:{}},T).reason,"BASEBALL_TEAM_IDENTITY_MISSING");
});
test("unsupported sports report missing provider, not false lineup confirmation",()=>{
 for(const sport of ["농구","배구"])assert.equal(
  lineupEvidence(row(sport),lineup(),T).status,"UNSUPPORTED");
});
test("a later failed fetch cannot erase the genuine pregame confirmed XI",()=>{
 const r=row(),state={records:[r]},confirmed=lineupEvidence(r,lineup(),T);
 const one=mergeLineupEvidence(state,"a",confirmed,T);
 const two=mergeLineupEvidence(one,"a",{status:"UNAVAILABLE",reason:"HTTP_429"},T+M);
 assert.equal(two.records[0].lineup.status,"CONFIRMED");
 assert.deepEqual(two.records[0].lineup.home,one.records[0].lineup.home);
 assert.equal(two.records[0].lineup.capturedAt,T);
 assert.equal(state.records[0].lineup,undefined);
});
test("collector performs live provider request only for permitted pregame fixtures",async()=>{
 let calls=0,clock=T,one=row(),state={schema:"wisetoto-collect-first-v1",records:[one]};
 const out=await collectLineupSnapshots(state,{now:()=>clock,
   base:"https://local.test",fetcher:async(url)=>{
    calls++;assert.match(url,/\/api\/naver\/lineup\?/);assert.match(url,/sport=%EC%B6%95%EA%B5%AC/);
    clock+=M;
    return {ok:true,status:200,json:async()=>lineup()};
   }});
 assert.equal(calls,1);assert.equal(out.summary.confirmed,1);
 assert.equal(out.state.records[0].lineup.status,"CONFIRMED");
 assert.equal(out.state.records[0].lineup.capturedAt,T+M);
 const duplicate=await collectLineupSnapshots(out.state,{now:()=>clock,fetcher:async()=>{throw Error("not called")}});
 assert.equal(duplicate.summary.attempted,0);
});
test("late response is explicitly rejected, never backfilled into pregame",async()=>{
 let clock=T+24*M;
 const r=row(),state={records:[r]};
 const out=await collectLineupSnapshots(state,{now:()=>clock,fetcher:async()=>{
  clock=T+26*M;return {ok:true,status:200,json:async()=>lineup()};
 }});
 assert.equal(out.state.records[0].lineup.status,"UNAVAILABLE");
 assert.equal(out.state.records[0].lineup.lastError,"AFTER_KICKOFF_NOT_PREGAME");
 assert.equal(out.state.records[0].lineup.capturedAt,undefined);
});
test("network failure preserves previous partial observation, error and attempts",async()=>{
 const x=row(),p=lineupEvidence(x,{...lineup(),home:lineup().home.slice(0,6)},T-3*M);
 const state=mergeLineupEvidence({records:[x]},"a",p,T-3*M);
 const out=await collectLineupSnapshots(state,{now:()=>T+20*M,fetcher:async()=>{throw Error("provider offline")}});
 assert.equal(out.summary.unavailable,1);
 assert.equal(out.state.records[0].lineup.status,"PARTIAL");
 assert.equal(out.state.records[0].lineup.homeCount,6);
 assert.match(out.state.records[0].lineup.lastError,/LINEUP_NETWORK/);
});
