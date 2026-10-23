import fs from "node:fs/promises";
import path from "node:path";
import {TRACKER_KEY,APPEND_KEY,STATE_FILE,getRecords,dueGames,dueVerifications,preserveFrozenRecords,auditChanges,sportCounts} from "./logic.mjs";
import {liveFeed,loadFeed,saveFeed,validFeed} from "./feed.mjs";

const base=(process.env.WISETOTO_URL||"https://wisetoto-analyzer.vercel.app").replace(/\/+$/,"");
await fs.mkdir(path.dirname(STATE_FILE),{recursive:true});
const old=await fs.readFile(STATE_FILE,"utf8").then(JSON.parse).catch(()=>({localStorage:{},meta:{}}));
const previous=getRecords(old);
const now=Date.now();
let due=[],feedCounts={},sourceError=null,feedPayload=null,feedOrigin="none";
try {
  // The preflight and browser MUST share the same verified offers. A second
  // upstream request is both unreliable and can silently lose valid fixtures.
  feedPayload=process.argv.includes("--preflight")?null:await loadFeed(now);
  if(feedPayload){feedOrigin="preflight-fresh-snapshot";}
  else{
    const fetched=await liveFeed(base);
    feedPayload=fetched.payload;
    feedOrigin="fresh-fetch-attempt-"+fetched.attempt;
    await saveFeed(fetched);
  }
  feedCounts=sportCounts(feedPayload.games);
  due=dueGames(feedPayload.games,previous,now);
} catch(e){sourceError=String(e); console.error("SOURCE_ERROR: "+sourceError);}
const pending=dueVerifications(previous,now);
const verifyDue=pending.length>0&&(now-Number(old.meta?.lastVerifyAttempt??0)>90*60_000);
const runBrowser=due.length>0||verifyDue;
if(process.argv.includes("--preflight")){
  console.log(JSON.stringify({date:new Date(now).toISOString(),frequency:"10 minutes (best effort)",feedSports:feedCounts,feedOrigin,upcoming:due.length,dueSports:sportCounts(due),verifyPending:pending.length,runBrowser,sourceError}));
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,"run_browser="+String(runBrowser)+"\n");
  if(sourceError&&!pending.length)process.exitCode=1;
}else{
  const {chromium}=await import("playwright");
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:"ko-KR",timezoneId:"Asia/Seoul"});
  await context.addInitScript((stored)=>{for(const [k,v] of Object.entries(stored||{})){try{if(typeof v==="string")localStorage.setItem(k,v);}catch{}}},old.localStorage);
  const page=await context.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  try{
    if(feedPayload&&validFeed(feedPayload)){
      // Serve the *fresh preflight Betman offer snapshot* to the original
      // frontend model. No synthetic games; no post-kickoff backdating.
      await page.route("**/api/betman*",route=>route.fulfill({
        status:200,contentType:"application/json",
        body:JSON.stringify(feedPayload),
        headers:{"cache-control":"no-store"}
      }));
    }
    await page.goto(base+"/?automation=1",{waitUntil:"domcontentloaded",timeout:90000});
    // A result-only verification must not require the live Betman list UI to load.
    // The archived tracker is the authority for pending results, while fresh
    // Betman offers are required only for *new* prekickoff analysis.
    await page.waitForFunction(()=>Boolean(window.__wisetotoAutomation),null,{timeout:90000});
    await page.waitForFunction(expected => {
      const state=window.__wisetotoAutomation?.snapshot();
      return !!state && state.trackerCount >= expected;
    },previous.length,{timeout:45000});
    if(due.length>0){
      await page.waitForFunction(()=>!!window.__wisetotoAutomation?.snapshot().feedReady,null,{timeout:90000});
    }
    console.log("Ready",JSON.stringify(await page.evaluate(()=>window.__wisetotoAutomation.snapshot())));
    const analysis=await page.evaluate(()=>window.__wisetotoAutomation.analyze());
    console.log("Analysis",JSON.stringify(analysis));
    if(analysis.started && analysis.count < due.length)console.log("Later due games queued for following 10-minute scan:",due.length-analysis.count);
    if(analysis.started){
      await page.waitForTimeout(2000);
      await page.waitForFunction(()=>!window.__wisetotoAutomation.snapshot().batchRunning,null,{timeout:540000});
      await page.waitForTimeout(3000);
    }
    const completeSnapshot=await page.evaluate(()=>window.__wisetotoAutomation.snapshot());
    console.log("Batch result",JSON.stringify(completeSnapshot));
    const verify=await page.evaluate(()=>window.__wisetotoAutomation.verify());
    console.log("Result verification",JSON.stringify(verify));
    if(verify.started){
      old.meta={...old.meta,lastVerifyAttempt:Date.now()};
      await page.waitForTimeout(1500);
      await page.waitForFunction(()=>!window.__wisetotoAutomation.snapshot().validationLoading,null,{timeout:240000});
      await page.waitForTimeout(2000);
    }
    const storage=await page.evaluate(()=>{
      const result={};
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k&&/^wisetoto_v13_8_(1_live_tracker|66_live_tracker_append_only|65_live_tracker_shadow)/.test(k))result[k]=localStorage.getItem(k);
      }
      return result;
    });
    const after=getRecords({localStorage:storage});
    const protectedRows=preserveFrozenRecords(previous,after);
    storage[TRACKER_KEY]=JSON.stringify(protectedRows);
    let oldAppend=[],newAppend=[];
    try{oldAppend=JSON.parse(old.localStorage?.[APPEND_KEY]||"[]");}catch{}
    try{newAppend=JSON.parse(storage[APPEND_KEY]||"[]");}catch{}
    if(Array.isArray(oldAppend)&&Array.isArray(newAppend)&&oldAppend.length>newAppend.length){
      storage[APPEND_KEY]=JSON.stringify(oldAppend);
    }
    const report=auditChanges(previous,protectedRows);
    await fs.writeFile(STATE_FILE,JSON.stringify({schema:"wisetoto-auto-v1",localStorage:storage,meta:{
      ...old.meta,lastRunAt:Date.now(),lastBase:base,browserErrors:errors.slice(0,5)
    }},null,2));
    await fs.writeFile("automation-state/audit.json",JSON.stringify(report,null,2));
    const lines=[
      "## Wisetoto 자동 PRE/사후검증","- 실행: "+report.generatedAt,
      "- 이번 회차 PRE: "+report.created,"- 신규 종료검증: "+report.verified.length,
      "- 신규 TOP1 미적중: "+report.missed,"- 수집/등급 검토대상: "+report.suspicious.length,
      "- 전체 잠금: "+protectedRows.length,"- 브라우저 오류: "+errors.length,
      "- Betman 원본 조회: "+(sourceError?"실패 — "+sourceError:"정상 ("+feedOrigin+")"),
      "- 10분 주기 Betman 검색 종목별 경기 수: "+JSON.stringify(feedCounts),
      "- 금회 분석대상: "+due.length+"건 · 브라우저 배치: "+String(analysis.count??0)+"건",
      "- 배치 성공/실패: "+String(completeSnapshot.batchCompleted)+"/"+String(completeSnapshot.batchFailed),
      ...report.verified.slice(0,15).map(x=>"- "+x.game+" · "+x.actual+" · "+x.picks.map(p=>p.pick+":"+p.outcome).join(",")),
      "","Frozen PRE 불변, 모델 자동 튜닝 및 무승인 main 병합 금지."
    ];
    await fs.writeFile("automation-state/report.md",lines.join("\n")+"\n");
    if(report.suspicious.length){
      const kst=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      await fs.writeFile("automation-state/review-title.txt","[Wisetoto OOS 점검] "+kst);
      await fs.writeFile("automation-state/review.md",[
        "# 자동 검토 후보",...report.suspicious.map(x=>"- "+x.game+": "+x.reason+" ("+x.stage+")"),
        "","데이터 소스·리그·팀 identity를 먼저 조사하세요. 확률을 경기 결과에 맞춰 튜닝하지 마세요.",
        "수정은 테스트/Preview API를 거친 별도 PR에서 수동 승인 후 병합합니다."
      ].join("\n")+"\n");
    }
    console.log("Completed",JSON.stringify({newPredictions:report.created,newVerified:report.verified.length,anomalies:report.suspicious.length,sourceError}));
    if(sourceError)process.exitCode=1; // never call a source-outage scan SUCCESS
    if(due.length>0&&analysis.count===0){console.error("DUE_GAMES_NOT_ANALYZED:",due.length);process.exitCode=1;}
    if(completeSnapshot.batchFailed>0){console.error("BATCH_FAILURES:",completeSnapshot.batchFailed);process.exitCode=1;}
  }finally{await browser.close();}
}
