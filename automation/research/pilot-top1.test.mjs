import test from "node:test";import assert from "node:assert/strict";
import {buildPilotReport,selectPostPilotTop1,evaluateRows,PILOT_DAYS} from "./pilot-top1.mjs";
import {writePilotReview} from "./run-pilot-review.mjs";
import {ingestEvidence,SCHEMA} from "./evidence.mjs";
const S=Date.parse("2026-11-01T00:00:00Z"),DAY=86400000,HOUR=3600000;
function fx(i,{kickoff=S+(i+1)*DAY,sport="축구",shift=.05,odds=2.1,verified=true,truth="win",asOf=kickoff-3*HOUR}={}){
 return {id:"fixture-"+i,sport,league:"pilot-league",home:"Home "+i,away:"Away "+i,
  startMs:kickoff,firstSeenAt:asOf-30*60000,snapshots:[
   {at:asOf-30*60000,market:{choices:[]}},{at:asOf,market:{choices:[]}}],
  frozenCandidate:{side:"win",odds,marketProbability:.55,shift,asOf},
  truth:verified?{winner:truth,verifiedAt:kickoff+2*HOUR,source:"COLLECT_FIRST_NAVER"}:null};
}
test("pilot starts on the first real non-empty valid feed, not at PR creation time",()=>{
 const m={schema:SCHEMA,fixtures:[]};
 const none=ingestEvidence(m,{ok:true,games:[]},S);
 assert.equal(none.state.pilot,null);
 const valid={sport:"soccer",home:"A FC",away:"B FC",league:"K",gameDateMs:S+3*DAY,
  markets:[{type:"moneyline",betName:"축구 승무패",selections:[
   {side:"win",odds:2.2},{side:"draw",odds:3.1},{side:"lose",odds:3.4}]}]};
 const first=ingestEvidence(m,{ok:true,games:[valid]},S);
 assert.equal(first.state.pilot.startedAt,S);
 assert.equal(first.stats.pilotMilestone,true);
 const later=ingestEvidence(first.state,{ok:true,games:[valid]},S+2*HOUR);
 assert.equal(later.state.pilot.startedAt,S);
 assert.equal(later.stats.pilotMilestone,false);
});
test("four weeks produces a transparent report even with zero verified games",()=>{
 const state={pilot:{startedAt:S},fixtures:[fx(1,{verified:false})]};
 const early=buildPilotReport(state,S+7*DAY);
 assert.equal(early.status,"COLLECTING");
 assert.equal(early.completedDays,7);
 const final=buildPilotReport(state,S+28*DAY);
 assert.equal(final.status,"FOUR_WEEK_REVIEW_READY");
 assert.equal(final.all.decisions,0);assert.equal(final.all.hitRate,null);
 assert.equal(final.all.unitROI,null);assert.equal(final.grade,"EXPLORATORY_ONLY");
 assert.equal(final.counts.pendingFinal,1);
 assert.equal(final.weeks.length,4);
 assert.ok(final.proposals.some(x=>x.includes("부족")));
});
test("daily research TOP1 is selected by pregame market shift, never the postmatch result",()=>{
 const a=fx(1,{kickoff:S+DAY,shift:.09,truth:"lose",odds:2.7});
 const b=fx(2,{kickoff:S+DAY+60*60000,shift:.03,truth:"win"});
 const c=fx(3,{kickoff:S+2*DAY,shift:.07,truth:"win"});
 const report=buildPilotReport({pilot:{startedAt:S},fixtures:[a,b,c]},S+29*DAY);
 assert.equal(report.all.decisions,3);
 assert.equal(report.shadowTop1.decisions,2);
 assert.equal(report.shadowTop1.hits,1);
 assert.equal(report.shadowTop1.misses,1);
 assert.equal(report.shadowHistory[0].id,a.id);
 assert.equal(report.shadowHistory[0].result,"MISS");
 assert.equal(report.bySport["축구"].decisions,3);
 const revised=buildPilotReport({pilot:{startedAt:S},fixtures:[
  {...a,truth:{...a.truth,winner:"win"}},b,c]},S+29*DAY);
 assert.equal(revised.shadowHistory[0].id,a.id);
});
test("unverified future outcomes and quotes after kickoff cannot improve pilot estimates",()=>{
 const valid=fx(1),unverified=fx(2,{verified:false}),late=fx(3,{asOf:S+4*DAY+HOUR});
 const future=fx(4,{verified:true,kickoff:S+27*DAY,truth:"win"});
 const report=buildPilotReport({pilot:{startedAt:S},fixtures:[valid,unverified,late,future]},S+2*DAY+3*HOUR);
 assert.equal(report.counts.verified,1);
 assert.equal(report.all.decisions,1);
 assert.equal(report.counts.pendingFinal,0);
 assert.equal(evaluateRows([late]).decisions,0);
});
test("after 28 days pick an actual future shadow TOP1, not a completed winning game",()=>{
 const now=S+28*DAY+HOUR;
 const past=fx(0);
 const next=fx(40,{kickoff:now+6*HOUR,verified:false});
 next.lastEvidence={top1:{side:"win",label:"승",odds:2.0,marketProbability:.52,shift:.04,asOf:now-10*60000}};
 const state={pilot:{startedAt:S},fixtures:[past,next]};
 assert.equal(selectPostPilotTop1(state,S+14*DAY),null);
 const pick=selectPostPilotTop1(state,now);
 assert.equal(pick.id,next.id);
 assert.equal(pick.grade,"EXPLORATORY_TOP1");
 assert.equal(pick.odds,2);
 assert.equal(pick.observedAt,now-10*60000);
 assert.match(pick.note,/공식 TOP1 미변경/);
});
test("time-ordered pilot report excludes results not known at prediction time",()=>{
 const rows=Array.from({length:12},(_,i)=>fx(i,{
  kickoff:S+(i+1)*DAY,asOf:S+(i+1)*DAY-HOUR,odds:2.2}));
 const normal=buildPilotReport({pilot:{startedAt:S},fixtures:rows},S+28*DAY);
 assert.ok(normal.walkForward.decisions>=5);
 const delayed=rows.map((f,i)=>({...f,truth:{...f.truth,verifiedAt:S+27*DAY}}));
 const after=buildPilotReport({pilot:{startedAt:S},fixtures:delayed},S+28*DAY);
 assert.equal(after.walkForward.decisions,0);
});
test("28-day review is written without a fresh upstream feed or synthetic results",async()=>{
 const {mkdtemp,readFile,writeFile,rm}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const root=await mkdtemp(join(tmpdir(),"wisetoto-pilot-"));
 try{
  const state={schema:SCHEMA,pilot:{startedAt:S,lastReportedWeek:3},fixtures:[fx(0)]};
  await writeFile(join(root,"research-state.json"),JSON.stringify(state));
  const r=await writePilotReview({root:root+"/",now:S+28*DAY});
  assert.equal(r.status,"FOUR_WEEK_REVIEW_READY");assert.equal(r.changed,true);
  const md=await readFile(join(root,"pilot-top1-review.md"),"utf8");
  assert.match(md,/28일 연구 TOP1/);assert.match(md,/하루 1건/);
  const publicData=JSON.parse(await readFile(join(root,"research-public.json"),"utf8"));
  assert.equal(publicData.pilot.status,"FOUR_WEEK_REVIEW_READY");
  assert.equal(publicData.pilot.all.decisions,1);
  const rerun=await writePilotReview({root:root+"/",now:S+28*DAY+HOUR});
  assert.equal(rerun.changed,false);
 }finally{await rm(root,{recursive:true,force:true});}
});
