import test from "node:test";
import assert from "node:assert/strict";
import {fixtureId,normalizeMoneyline,ingestEvidence,publicEvidence,decideEvidence,SCHEMA} from "./evidence.mjs";
const MIN=60_000;
const T=Date.parse("2026-10-25T00:00:00Z");
const betman=(sport="soccer",start=T+120*MIN,odds=[2.15,3,2.85],name="축구 승무패")=>({
 sport,home:"HOME FC",away:"AWAY [club]",league:"test",gameDateMs:start,
 markets:[{type:"moneyline",betName:name,selections:(sport==="soccer"?
  ["win","draw","lose"]:["win","lose"]).map((side,i)=>({side,label:side,odds:odds[i]}))}]
});
const feed=games=>({ok:true,games});
const init={schema:SCHEMA,fixtures:[]};
test("collects real 7-day future moneylines without predicting on the first tick",()=>{
 const sportCases=[betman(),betman("basketball",T+150*MIN,[1.9,1.8],"농구 승패"),
   betman("baseball",T+180*MIN,[1.55,2.1],"야구 승패"),
   betman("volleyball",T+210*MIN,[1.4,2.4],"배구 승패")];
 const got=ingestEvidence(init,feed(sportCases),T);
 assert.equal(got.stats.captured,4);
 assert.equal(got.stats.total,4);
 assert.equal(publicEvidence(got.state,T).counts.researchTop1,0);
 assert.ok(got.state.fixtures.every(x=>x.snapshots.length===1&&x.lastEvidence.stage==="COLLECTING"));
});
test("repeat market observation is immutable and only created at 30min cadence",()=>{
 const first=ingestEvidence(init,feed([betman()]),T).state;
 const same=ingestEvidence(first,feed([betman("soccer",T+120*MIN,[2.1,3,2.9])]),T+10*MIN);
 assert.equal(same.stats.captured,0);
 assert.equal(same.state.fixtures[0].snapshots.length,1);
 const next=ingestEvidence(same.state,feed([betman("soccer",T+120*MIN,[1.73,3.1,4.2])]),T+35*MIN);
 assert.equal(next.stats.captured,1);
 assert.equal(next.state.fixtures[0].snapshots.length,2);
 assert.deepEqual(next.state.fixtures[0].snapshots[0],first.fixtures[0].snapshots[0]);
 assert.equal(next.state.fixtures[0].lastEvidence.stage,"WATCH");
 assert.equal(next.state.fixtures[0].lastEvidence.top1.side,"win");
 assert.equal(next.state.fixtures[0].lastEvidence.calibration.qualified,false);
});
test("markets with 5-point special, 1-point special, invalid odds or phantom choice are rejected",()=>{
 const f=betman("basketball",T+80*MIN,[1.7,2.3],"농구 승5패");
 assert.equal(normalizeMoneyline(f),null);
 assert.equal(normalizeMoneyline({...f,markets:[{...f.markets[0],betName:"농구 승1패"}]}),null);
 assert.equal(normalizeMoneyline(betman("basketball",T+80*MIN,[1,1.8],"농구 승패")),null);
 assert.equal(normalizeMoneyline(betman("soccer",T+80*MIN,[2.65,3,2.85],"축구 승무패")).choices.length,3);
});
test("after kickoff no new evidence, no retroactive TOP1 and no mutation of frozen PRE",()=>{
 const game=betman("basketball",T+40*MIN,[2.1,1.58],"농구 승패");
 const earlier=ingestEvidence(init,feed([game]),T);
 const tooLate=ingestEvidence(earlier.state,feed([game]),T+45*MIN);
 assert.equal(tooLate.stats.captured,0);
 assert.equal(tooLate.state.fixtures[0].snapshots.length,1);
 assert.equal(tooLate.state.fixtures[0].frozenCandidate,null);
});
test("the actual final score is not a market predictor and requires verified prematch mapping",()=>{
 const first=ingestEvidence(init,feed([betman()]),T).state;
 const next=ingestEvidence(first,feed([betman("soccer",T+120*MIN,[1.73,3.1,4.2])]),T+35*MIN).state;
 const f=next.fixtures[0],after=T+130*MIN;
 const verified={sport:"축구",home:f.home,away:f.away,startMs:f.startMs,
  capturedAt:T+45*MIN,verifiedAt:after,verificationStatus:"VERIFIED",
  result:{homeScore:2,awayScore:1}};
 const stored=ingestEvidence(next,feed([]),after,[verified]);
 assert.equal(stored.stats.settled,1);
 assert.equal(stored.state.fixtures[0].truth.winner,"win");
 assert.equal(stored.state.fixtures[0].frozenCandidate.side,"win");
 assert.equal(stored.state.fixtures[0].lastEvidence.top1.side,"win");
 assert.equal(stored.state.fixtures[0].snapshots.length,2);
 assert.equal(publicEvidence(stored.state,after).records.length,0);
 const corrupted={...verified,capturedAt:f.startMs+1};
 assert.equal(ingestEvidence(next,feed([]),after,[corrupted]).stats.settled,0);
});
test("research TOP1 abstains with no previous validated sample",()=>{
 const first=ingestEvidence(init,feed([betman()]),T).state;
 const second=ingestEvidence(first,feed([betman("soccer",T+120*MIN,[1.73,3.1,4.2])]),T+35*MIN).state;
 const result=decideEvidence(second.fixtures[0],second.fixtures,T+35*MIN);
 assert.equal(result.stage,"WATCH");
 assert.equal(result.calibration.samples,0);
 assert.notEqual(result.stage,"RESEARCH_TOP1");
});
test("fixture identity is stable across annotations but never team/time swaps",()=>{
 const game=betman();
 const normalized=fixtureId(game);
 assert.equal(normalized,fixtureId({...game,home:"HOME",away:"AWAY"}));
 assert.notEqual(normalized,fixtureId({...game,away:"OTHER"}));
 assert.notEqual(normalized,fixtureId({...game,gameDateMs:game.gameDateMs+MIN}));
});

test("research TOP1 only after league samples, strictly chronological walk-forward improvement and positive EV",()=>{
 const kickoff=T+300*MIN,now=T+70*MIN;
 const initial=ingestEvidence(init,feed([betman("soccer",kickoff)]),T).state;
 const later=ingestEvidence(initial,feed([betman("soccer",kickoff,[1.73,3.1,4.2])]),T+35*MIN).state;
 const current=later.fixtures[0],observed=decideEvidence(current,[],now);
 assert.equal(observed.stage,"WATCH");
 const winningPrior=Array.from({length:100},(_,i)=>({
   id:"prior-"+i,sport:"축구",league:"test",startMs:T-(1000-i)*MIN,
   truth:{winner:observed.top1.side,verifiedAt:T-(990-i)*MIN},
   frozenCandidate:{...observed.top1,asOf:T-(1050-i)*MIN}
 }));
 const qualified=decideEvidence(current,winningPrior,now);
 assert.equal(qualified.stage,"RESEARCH_TOP1",JSON.stringify(qualified.calibration));
 assert.ok(qualified.calibration.samples>=50&&qualified.calibration.sportSamples>=80);
 assert.ok(qualified.calibration.backtest.samples>=20);
 assert.ok(qualified.calibration.backtest.improved);
 assert.ok(qualified.calibration.conservativeEV>0.03);
 assert.equal(decideEvidence(current,winningPrior.map(f=>({...f,league:"unrelated"})),now).stage,"WATCH");
 assert.equal(decideEvidence(current,winningPrior.slice(0,49),now).stage,"WATCH");
 const futureVerified=winningPrior.map(x=>({...x,truth:{...x.truth,verifiedAt:now+MIN}}));
 assert.equal(decideEvidence(current,futureVerified,now).stage,"WATCH");
});
test("a delayed cached prekickoff feed cannot create research after the wall-clock cutoff",()=>{
 const kickoff=T+40*MIN,g=betman("soccer",kickoff);
 assert.equal(ingestEvidence(init,feed([g]),T+35*MIN,[],T+31*MIN).stats.captured,0);
 assert.throws(()=>ingestEvidence(init,feed([g]),T+50*MIN,[],T+40*MIN),/Never backdate/);
});

test("node-only collector writes a durable state and public summary without Chromium",async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm,stat}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const {spawnSync}=await import("node:child_process");
 const root=await mkdtemp(join(tmpdir(),"wisetoto-research-"));
 try{
  const dir=join(root,"automation-state");await mkdir(dir,{recursive:true});
  const now=Date.now(),g=betman("basketball",now+5*60*MIN,[1.9,1.8],"농구 승패");
  await writeFile(join(dir,"betman-feed.json"),JSON.stringify({fetchedAt:now,payload:feed([g])}));
  const out=spawnSync(process.execPath,[new URL("./run.mjs",import.meta.url).pathname],
    {cwd:root,encoding:"utf8",timeout:15000});
  assert.equal(out.status,0,out.stderr||out.stdout);
  const state=JSON.parse(await readFile(join(dir,"research-state.json"),"utf8"));
  const summary=JSON.parse(await readFile(join(dir,"research-public.json"),"utf8"));
  assert.equal(state.fixtures.length,1);
  assert.equal(summary.counts.future,1);
  assert.equal(summary.counts.researchTop1,0);
  assert.equal(summary.records[0].stage,"COLLECTING");
  await assert.rejects(stat(join(dir,"state.json")),{code:"ENOENT"});
 }finally{await rm(root,{recursive:true,force:true});}
});

test("bounded evidence archive always retains authentic opening odds",()=>{
 const start=T+6*24*60*MIN,g=betman("soccer",start);
 let state=init;
 for(let i=0;i<28;i++){
  const now=T+i*30*MIN;
  state=ingestEvidence(state,feed([betman("soccer",start,[2.15-0.005*i,3,2.85+0.005*i])]),now).state;
 }
 const snap=state.fixtures[0].snapshots;
 assert.equal(snap.length,24);
 assert.equal(snap[0].at,T);
 assert.equal(snap[0].market.choices.find(x=>x.side==="win").odds,2.15);
 assert.equal(snap[snap.length-1].at,T+27*30*MIN);
});

test("public card limit never understates full seven-day fixture coverage",()=>{
 const fixtures=Array.from({length:161},(_,i)=>({
  id:"f-"+i,sport:"농구",league:"NBA",home:"A"+i,away:"B"+i,
  startMs:T+(i+20)*MIN,firstSeenAt:T,lastSeenAt:T,snapshots:[{at:T}],
  lastEvidence:{stage:"COLLECTING",reason:"first scan",top1:null}
 }));
 const output=publicEvidence({schema:SCHEMA,fixtures},T);
 assert.equal(output.records.length,150);
 assert.equal(output.counts.future,161);
 assert.equal(output.counts.insufficient,161);
});
