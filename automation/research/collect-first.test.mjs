import test from "node:test";import assert from "node:assert/strict";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection,verifiedNaverFinal} from "./collect-first.mjs";
const T=Date.parse("2026-10-27T00:00:00Z"),M=60000;
const g=(sport="soccer",min=25,odds=true)=>({sport,league:"TEST",home:"Home FC",away:"Away FC",
 gameDateMs:T+min*M,fixtureId:3456,markets:odds?[{betName:"승패",selections:[{side:"win",odds:1.8}]}]:[]});
test("the 30m-to-kickoff window collects all four sports, even without odds",()=>{
 const rows=["soccer","basketball","baseball","volleyball"].map((s,i)=>({...g(s,25-i),fixtureId:100+i}));
 rows[3].markets=[];
 const c=collect({schema:SCHEMA,records:[]},{ok:true,games:[...rows,g("soccer",31),g("soccer",-1)]},T);
 assert.equal(c.summary.window,4);assert.equal(c.summary.new,4);assert.equal(c.summary.noOdds,1);
 assert.equal(c.state.records.length,6);assert.equal(projection(c.state,T).counts.collected,6);
 assert.equal(projection(c.state,T).counts.pregameCaptured,4);
 assert.equal(projection(c.state,T).counts.resultOnly,1);
});
test("repeat scans retain first capture and fixture identity; no kickoff retro capture",()=>{
 const init={schema:SCHEMA,records:[]};
 const first=collect(init,{ok:true,games:[g()]},T).state;
 const next=collect(first,{ok:true,games:[g()]},T+10*M).state;
 assert.equal(next.records.length,1);assert.equal(next.records[0].firstSeenAt,T);
 assert.equal(next.records[0].seenCount,2);
 assert.equal(collect(init,{ok:true,games:[g()]},T+26*M).summary.new,0);
});
test("only verified independent final is attached, never a raw score or volleyball 2:2",()=>{
 const f=collect({schema:SCHEMA,records:[]},{ok:true,games:[g("volleyball")]},T).state;
 const key=f.records[0].key,now=T+4*3600000;
 assert.equal(dueResults(f,now).length,1);
 let check=mergeProviderFinal(f,key,{ok:true,result:{homeScore:3,awayScore:0}},now);
 assert.equal(check.records[0].verdict,"PENDING");
 check=mergeProviderFinal(f,key,{ok:true,finalConfirmed:true,result:{homeScore:2,awayScore:2}},now);
 assert.equal(check.records[0].verdict,"PENDING");
 check=mergeProviderFinal(f,key,{ok:true,finalConfirmed:true,result:{homeScore:3,awayScore:2}},now);
 assert.equal(check.records[0].verdict,"VERIFIED");assert.deepEqual(check.records[0].final,{homeScore:3,awayScore:2});
});
test("correctly matched verified tracker result can settle; invalid cannot",()=>{
 const st=collect({schema:SCHEMA,records:[]},{ok:true,games:[g()]},T).state,now=T+4*3600000;
 let v=settlement(st,[{sport:"축구",home:"Home FC",away:"Away FC",startMs:T+25*M,
  verificationStatus:"VERIFIED",verifiedAt:now, result:{homeScore:2,awayScore:1}}],now);
 assert.equal(v.settled,1);assert.equal(v.state.records[0].verdict,"VERIFIED");
 v=settlement(st,[{sport:"축구",home:"Home FC",away:"Away FC",startMs:T+25*M,
  verificationStatus:"PENDING",verifiedAt:now,result:{homeScore:2,awayScore:1}}],now);
 assert.equal(v.settled,0);
});
test("a provider rate-limit checkpoint respects a 60 minute backoff",()=>{
 const st=collect({schema:SCHEMA,records:[]},{ok:true,games:[g()]},T).state,now=T+4*3600000;
 const checked=mergeProviderFinal(st,st.records[0].key,{error:"HTTP 429"},now);
 assert.equal(dueResults(checked,now+10*M).length,0);
 assert.equal(dueResults(checked,now+61*M).length,1);
});

test("ID-less fixtures are not lost and Naver requires exact completed match",()=>{
 const input={...g("soccer"),fixtureId:null};
 const state=collect({schema:SCHEMA,records:[]},{ok:true,games:[input]},T).state;
 assert.equal(state.records[0].fixtureId,null);
 assert.equal(dueResults(state,T+3*3600000).length,1);
 const invalid=[
  {ok:true,completed:false,gameId:"a",finalScore:{home:2,away:1}},
  {ok:true,completed:true,partial:true,gameId:"a",finalScore:{home:2,away:1}},
  {ok:true,completed:true,gameId:null,finalScore:{home:2,away:1}},
  {ok:true,completed:true,gameId:"a",finalScore:{home:null,away:1}}
 ];
 assert.ok(invalid.every(x=>verifiedNaverFinal(x).ok===false));
 const final=verifiedNaverFinal({ok:true,completed:true,gameId:"20261027FOOTBALL",
   finalScore:{home:2,away:1}});
 const settled=mergeProviderFinal(state,state.records[0].key,final,T+3*3600000);
 assert.equal(settled.records[0].verdict,"VERIFIED");
});
test("workflow persists the ledger before heavy PRE and gates prediction on verified outcomes",async()=>{
 const {readFile}=await import("node:fs/promises");
 const w=await readFile(new URL("../../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 const a=w.indexOf("Capture 30-minute fixtures and reconcile verified results without browser");
 const b=w.indexOf("Run exact production model and verify results");
 assert.ok(a>0&&b>a);
 assert.match(w,/collect-first-state\.json\.gz/);
 assert.match(w,/collect-first-public\.json/);
 assert.match(w,/prediction_ready == 'true'/);
});

test("a fixture listed days ahead becomes an authentic pregame capture only after entering 30 minutes",()=>{
 const distant=g("soccer",90);
 const first=collect({schema:SCHEMA,records:[]},{ok:true,games:[distant]},T);
 assert.equal(first.summary.discovered,1);
 assert.equal(first.summary.window,0);
 assert.equal(first.state.records[0].pregameCapturedAt,null);
 assert.equal(first.state.records[0].odds.length,0);
 const near=collect(first.state,{ok:true,games:[distant]},T+65*M);
 assert.equal(near.summary.new,1);
 assert.equal(near.state.records[0].pregameCapturedAt,T+65*M);
 assert.ok(near.state.records[0].odds.length>0);
 const late=collect(first.state,{ok:true,games:[distant]},T+92*M);
 assert.equal(late.summary.new,0);
 assert.equal(late.state.records[0].pregameCapturedAt,null);
 assert.equal(projection(late.state,T+92*M).counts.resultOnly,1);
});
test("result-only discoveries may settle but do not count as valid pregame training",()=>{
 const game=g("basketball",-60);
 const resultOnly=collect({schema:SCHEMA,records:[]},{ok:true,games:[game]},T).state;
 assert.equal(resultOnly.records[0].pregameCapturedAt,null);
 assert.equal(resultOnly.records[0].odds.length,0);
 const after=mergeProviderFinal(resultOnly,resultOnly.records[0].key,
   {ok:true,finalConfirmed:true,result:{homeScore:102,awayScore:99}},T+120*M);
 assert.equal(after.records[0].verdict,"VERIFIED");
 assert.equal(projection(after,T+120*M).counts.verified,1);
 assert.equal(projection(after,T+120*M).counts.verifiedWithPregame,0);
});
test("repeat reads of the same feed timestamp cannot inflate independent observations",()=>{
 const match=g("soccer",25);
 const initial=collect({schema:SCHEMA,records:[]},{ok:true,games:[match]},T);
 const duplicated=collect(initial.state,{ok:true,games:[match]},T+M,T);
 assert.equal(duplicated.state.records[0].seenCount,1);
 assert.equal(duplicated.state.records[0].firstSeenAt,T);
});

test("real Node collector preserves a past fixture and settles Naver after SportsAPI HTTP429",async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const {spawn}=await import("node:child_process");
 const {createServer}=await import("node:http");
 const root=await mkdtemp(join(tmpdir(),"wisetoto-collectfirst-"));
 const now=Date.now(),game={sport:"soccer",league:"TEST",home:"Home FC",away:"Away FC",
   gameDateMs:now-3*3600000,fixtureId:1357,markets:[]};
 const calls=[];
 const srv=createServer((req,res)=>{
   calls.push(req.url);
   res.setHeader("Content-Type","application/json");
   if(req.url.startsWith("/api/fixture/result")){
     res.statusCode=429;res.end(JSON.stringify({ok:false,error:"HTTP 429"}));
   }else if(req.url.startsWith("/api/naver/final?")){
     const started=new Date(game.gameDateMs+9*3600000).toISOString().slice(0,19);
     res.end(JSON.stringify({result:{games:[{gameId:"unique-fixture",
       gameDateTime:started,homeTeamName:"Home FC",awayTeamName:"Away FC",
       statusCode:"RESULT",homeScore:2,awayScore:1}]}}));
   }else{res.statusCode=404;res.end(JSON.stringify({ok:false}));}
 });
 try{
  await mkdir(join(root,"automation-state"));
  await writeFile(join(root,"automation-state/betman-feed.json"),
    JSON.stringify({fetchedAt:now,payload:{ok:true,games:[game]}}));
  await new Promise(resolve=>srv.listen(0,"127.0.0.1",resolve));
  const port=srv.address().port;
  const result=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[new URL("./run-collect-first.mjs",import.meta.url).pathname],{
     cwd:root,env:{...process.env,NODE_ENV:"test",WISETOTO_URL:"http://127.0.0.1:"+port}});
   let stdout="",stderr="";
   child.stdout.on("data",d=>stdout+=d);child.stderr.on("data",d=>stderr+=d);
   child.on("error",reject);
   child.on("close",code=>resolve({code,stdout,stderr}));
  });
  assert.equal(result.code,0,result.stderr);
  assert.equal(calls.filter(x=>x.startsWith("/api/fixture/result")).length,1);
  assert.equal(calls.filter(x=>x.startsWith("/api/naver/final?")).length,1);
  assert.equal(calls.filter(x=>x.startsWith("/api/naver/lineup")).length,0);
  const state=JSON.parse(await readFile(join(root,"automation-state/collect-first-state.json"),"utf8"));
  const publicData=JSON.parse(await readFile(join(root,"automation-state/collect-first-public.json"),"utf8"));
  assert.equal(state.records[0].verdict,"VERIFIED");
  assert.equal(state.records[0].resultSource,"NAVER");
  assert.equal(state.records[0].finalProviderGameId,"unique-fixture");
  assert.equal(state.records[0].finalEvidence,"NAVER_SCHEDULE_FINAL");
  assert.equal(state.records[0].fixtureId,1357); // do not mix provider-ID namespaces
  assert.match(result.stdout,/FAST_FINAL_AUDIT/);
  assert.equal(state.records[0].resultChecks,1);
  assert.match(state.records[0].resultErrors[0].reasons.join(" "),/429/);
  assert.equal(state.records[0].pregameCapturedAt,null);
  assert.equal(publicData.counts.verifiedWithPregame,0);
  assert.equal(publicData.source.ok,true);
 }finally{await new Promise(resolve=>srv.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});

test("collection ledger restore fails closed on GitHub HTTP 503 or untrusted 404",async()=>{
 const {readFile,mkdtemp,mkdir,writeFile,rm}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const {spawnSync}=await import("node:child_process");
 const workflow=await readFile(new URL("../../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 const block=workflow.split("      - name: Restore 30-minute collection ledger\n")[1]
   ?.split("      - name: Due match and verification preflight")[0];
 assert.ok(block,"restore step must exist");
 const restoreScript=block.split("        run: |\n")[1]
   ?.split("\n").map(x=>x.replace(/^          /,"")).join("\n");
 assert.ok(restoreScript,"shell script must exist");
 assert.match(workflow,/id: ledger_restore/);
 assert.match(workflow,/steps\.ledger_restore\.outcome == 'success'/);
 assert.match(workflow,/steps\.ledger_capture\.outcome == 'success'/);
 const root=await mkdtemp(join(tmpdir(),"ledger-restore-failclosed-"));
 try{
   await mkdir(join(root,"bin"));await mkdir(join(root,"automation-state"));
   for(const code of [503,404]){
     await writeFile(join(root,"bin","curl"),"#!/bin/sh\necho "+code+"\n",{mode:0o755});
     await writeFile(join(root,"bin","gh"),"#!/bin/sh\nexit 1\n",{mode:0o755});
     const run=spawnSync("bash",["-c",restoreScript],{
       cwd:root,encoding:"utf8",env:{...process.env,PATH:join(root,"bin")+":"+process.env.PATH,
         GH_TOKEN:"synthetic-test-token",GITHUB_REPOSITORY:"test/project"}});
     assert.notEqual(run.status,0,"HTTP "+code+" must block restore: "+run.stdout);
     assert.match(run.stderr,code===503?/COLLECT_LEDGER_RESTORE_FAILED/:/./);
   }
 }finally{await rm(root,{recursive:true,force:true})}
});
test("40 samples alone cannot automatically restart heavy PRE",async()=>{
 const {readFile}=await import("node:fs/promises");
 const w=await readFile(new URL("../../.github/workflows/wisetoto-auto-analysis.yml",import.meta.url),"utf8");
 assert.match(w,/WISETOTO_PREDICTION_RESTART_APPROVED/);
 assert.match(w,/const sampleReady=verified>=40/);
 assert.match(w,/const ready=sampleReady&&restartApproved/);
 assert.match(w,/const browserNeeded=process\.env\.VERIFY_DUE==="true"/);
});

test("missing initial odds are not assigned a fake first-odds timestamp",()=>{
 const noMarket=g("soccer",25,false),withOdds=g("soccer",25,true);
 const first=collect({schema:SCHEMA,records:[]},{ok:true,games:[noMarket]},T);
 assert.equal(first.state.records[0].pregameCapturedAt,T);
 assert.equal(first.state.records[0].firstOddsAt,null);
 assert.equal(first.state.records[0].latestOddsAt,null);
 assert.equal(first.state.lastCaptureSummary.noOdds,1);
 const second=collect(first.state,{ok:true,games:[withOdds]},T+10*M);
 assert.equal(second.state.records[0].pregameCapturedAt,T);
 assert.equal(second.state.records[0].firstOddsAt,T+10*M);
 assert.equal(second.state.records[0].latestOddsAt,T+10*M);
 assert.equal(second.state.records[0].odds.length,1);
 assert.equal(projection(second.state,T+10*M).source.lastCaptureSummary.new,0);
});

test("watchlisted fixture disappearing inside capture window remains visible, never synthetic PRE",()=>{
 const first=collect({schema:SCHEMA,records:[]},{ok:true,games:[g("soccer",60)]},T).state;
 const second=collect(first,{ok:true,games:[]},T+35*M);
 assert.equal(second.summary.watchlistMissing,1);
 assert.equal(second.summary.delayedScan,true);
 assert.equal(second.state.records[0].pregameCapturedAt,null);
 assert.equal(second.state.records[0].captureIssue,"BETMAN_WATCHLIST_DISAPPEARED_IN_CAPTURE_WINDOW");
 const third=collect(second.state,{ok:true,games:[]},T+62*M);
 assert.equal(third.state.records[0].verdict,"PENDING");
 assert.equal(third.state.records[0].pregameCapturedAt,null);
 assert.ok(third.state.records[0].missedWindowAt>0);
});
test("collection no longer silently trims more than 4000 records",()=>{
 const start=T+25*M;
 const games=Array.from({length:4020},(_,i)=>({
  ...g("basketball",25),home:"H"+i,away:"A"+i,gameDateMs:start+i
 }));
 const c=collect({schema:SCHEMA,records:[]},{ok:true,games},T);
 assert.equal(c.state.records.length,4020);
 assert.equal(c.summary.new,4020);
});

test("pending results remain independently retryable through the full 28-day pilot and 14-day grace",()=>{
 const pre=collect({schema:SCHEMA,records:[]},{ok:true,games:[g("soccer",25)]},T).state;
 const row=pre.records[0];
 const day=86400000;
 assert.equal(dueResults(pre,row.startMs+30*day).length,1);
 assert.equal(dueResults(pre,row.startMs+41*day).length,1);
 assert.equal(dueResults(pre,row.startMs+43*day).length,0);
});
