// PR smoke: exercise client automation bridge without firing a real prediction.
import { chromium } from "playwright";
import {isNbaGame} from "./nba-policy.mjs";
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.route("**/api/betman",route=>route.fulfill({
  status:200,contentType:"application/json",
  body:JSON.stringify({ok:true,source:"Betman",games:[],diagnostics:{rawCompScheduleRows:0}})
 }));
 await page.goto("http://127.0.0.1:3100/?automation=1",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.waitForFunction(()=>Boolean(window.__wisetotoAutomation?.snapshot().feedReady),null,{timeout:120000});
 const result=await page.evaluate(()=>({
  snapshot:window.__wisetotoAutomation.snapshot(),
  start:window.__wisetotoAutomation.analyze(),
 }));
 if(result.start.started || result.start.reason!=="NO_DUE_GAME")throw Error("Automation launched a bogus prediction: "+JSON.stringify(result));
 if(result.snapshot.trackerCount!==0)throw Error("Expected fresh clean localStorage");
  console.log("SMOKE OK: browser bridge registered, empty feed safe, zero fabricated PRE");
 // Research route stays independent of the frozen LIVE TRACKER.
 // Before first approved production data collection, no TOP1 may be fabricated.
 const researchResponse=await page.request.get("http://127.0.0.1:3100/api/automation/research",{timeout:35000});
 const researchBody=await researchResponse.json();
 if(![200,503].includes(researchResponse.status()) ||
    (researchResponse.ok() && (!researchBody.ok || researchBody.data?.schema!=="wisetoto-public-evidence-v1")) ||
    (!researchResponse.ok() && researchBody.ok))
   throw Error("Research API schema/first-scan fallback failed: "+JSON.stringify(researchBody));
 console.log("RESEARCH API OK: sanitized schema or explicit first-collection pending");
 const collectionResponse=await page.request.get("http://127.0.0.1:3100/api/automation/collection",{timeout:35000});
 const collectionBody=await collectionResponse.json();
 if(![200,503].includes(collectionResponse.status())||
   (collectionResponse.ok()&&(!collectionBody.ok||
      collectionBody.data?.schema!=="wisetoto-collect-first-public-v1"))||
   (!collectionResponse.ok()&&collectionBody.ok))
   throw Error("Collect-first read-only API must show real schema or explicit first-scan pending: "+JSON.stringify(collectionBody));
 console.log("COLLECT FIRST API OK: verified data schema or honest first-scan pending");
 // Dashboard is a separate read-only page and uses actual published records.
 await page.goto("http://127.0.0.1:3100/automation",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.getByRole("heading",{name:"자동분석 결과"}).waitFor({timeout:30000});
 // Historical NBA records are deliberately deleted by the user's opt-out.
 // The dashboard smoke must assert non-NBA evidence rather than require a
 // deleted Clippers match or manufacture an NBA UI fixture.
 const response=await page.request.get("http://127.0.0.1:3100/api/automation/results");
 const body=await response.json();
 if(!response.ok()||!body.ok||!Array.isArray(body.data?.records))
  throw Error("Dashboard API missing honest evidence records");
 if(JSON.stringify(body).includes("modelSnapshot")||JSON.stringify(body).includes("localStorage"))
  throw Error("Dashboard leaked raw private tracker");
 const visible=body.data.records;
 // Use the same sport+league exclusion predicate as collection and the ledger.
 // Guard whitespace/full-width league aliases and preserve non-NBA basketball.
 for(const league of ["NBA","NBA Cup","N B A","ＮＢＡ","미국 프로농구","미국 프로 농구","미프로농구"]){
  if(!isNbaGame({sport:"농구",league}))
   throw Error("NBA opt-out regression: missed prohibited league "+league);
 }
 for(const league of ["KBL","WKBL","WNBA","미국여자프로농구 WNBA","EASL"]){
  if(isNbaGame({sport:"basketball",league}))
   throw Error("NBA opt-out regression: excluded permitted league "+league);
 }
 if(visible.some(isNbaGame))
  throw Error("NBA opt-out regression: prohibited basketball league in public results");
 if(visible.length<1)throw Error("No non-NBA published PRE records for dashboard smoke");
 console.log("DASHBOARD OK: non-NBA PRE records shown, NBA excluded, no raw model snapshots");

 // All-sports scan must not silently follow the default UI sport filter.
 // Feed four distinct real-looking offers, but DO NOT execute any prediction.
 const now=Date.now();
 const sportFeed=["soccer","basketball","baseball","volleyball"].map((sport,i)=>({
   key:"mock:"+sport,gameKey:"mock:"+sport,gameDateMs:now+(60+i*2)*60_000,
   gameDate:new Date(now+(60+i*2)*60_000).toISOString(),
   sport,league:"MOCK",home:"HOME "+sport,away:"AWAY "+sport,
   markets:[{type:"moneyline",matchSeq:i+1,selections:[{side:"home",odds:1.71},{side:"away",odds:2.11}]}]
 }));
 await page.unroute("**/api/betman");
 await page.route("**/api/betman",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({
     ok:true,games:sportFeed,diagnostics:{rawCompScheduleRows:4}
   })
 }));
 await page.goto("http://127.0.0.1:3100/?automation=1",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.waitForFunction(()=>window.__wisetotoAutomation?.snapshot().dueCount===4,null,{timeout:50000});
 const multi=await page.evaluate(()=>window.__wisetotoAutomation.snapshot());
 for(const sport of ["축구","농구","야구","배구"]) {
   if(multi.dueBySport?.[sport]!==1)throw Error("Missing "+sport+": "+JSON.stringify(multi));
 }
 if(multi.batchRunning||multi.trackerCount)throw Error("Scan alone must never freeze/mock a PRE");

  console.log("ALL SPORTS SCAN OK: soccer/basketball/baseball/volleyball visible; none auto-executed by smoke");
 // Result-only runs must still mount the bridge if fresh Betman list fails.
 await page.unroute("**/api/betman");
 await page.route("**/api/betman",route=>route.fulfill({
   status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"source unavailable"})
 }));
 await page.goto("http://127.0.0.1:3100/?automation=1",{waitUntil:"domcontentloaded",timeout:90000});
 await page.waitForFunction(()=>Boolean(window.__wisetotoAutomation),null,{timeout:30000});
 const offline=await page.evaluate(()=>window.__wisetotoAutomation.snapshot());
 if(offline.feedReady)throw Error("Unexpected feed ready in source outage");
 console.log("RESULT-ONLY BRIDGE OK: loads without a Betman list, pending tracker can be verified independently");


 // Isolated postmatch regression: an aged frozen PRE must be checked without
 // the NBA auto-hook, and a missing final source must NEVER become VERIFIED.
 const past=Date.now()-8*60*60_000;
 const frozen={id:"ci-verification-pending",fixtureId:null,sport:"축구",
   home:"CI Home",away:"CI Away",league:"CI_TEST",
   startMs:past,capturedAt:past-70*60_000,
   verificationStatus:"PENDING",decision:"PASS",picks:[],marketResults:[],result:null};
 const key="wisetoto_v13_8_1_live_tracker";
 await page.addInitScript(({key,frozen})=>localStorage.setItem(key,JSON.stringify([frozen])),{key,frozen});
 await page.route("**/api/betman?scope=all",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({ok:true,games:[]})
 }));
 await page.route("**/api/naver/lineup?*",route=>route.fulfill({
   status:404,contentType:"application/json",body:JSON.stringify({ok:false,error:"fixture not found"})
 }));
 await page.goto("http://127.0.0.1:3100/?automation=1",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.waitForFunction(()=>window.__wisetotoAutomation?.snapshot().pendingDue===1 &&
   !window.__wisetotoAutomation.snapshot().validationLoading,null,{timeout:45000});
 const verificationStart=await page.evaluate(()=>window.__wisetotoAutomation.verify());
 if(!verificationStart.started)throw Error("Independent result verification did not start: "+JSON.stringify(verificationStart));
 await page.waitForFunction((key)=>{
   try{const row=JSON.parse(localStorage.getItem(key)||"[]")[0];
     return row?.id==="ci-verification-pending" && Number(row?.verifyLastCheckedAt)>0 &&
       !window.__wisetotoAutomation?.snapshot().validationLoading;
   }catch{return false;}
 },key,{timeout:45000});
 const verifiedCheck=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"[]")[0],key);
 if(verifiedCheck.verificationStatus!=="PENDING" || verifiedCheck.result!==null)
   throw Error("Missing final source incorrectly VERIFIED test fixture: "+JSON.stringify(verifiedCheck));
 console.log("INDEPENDENT VERIFY OK: aged pending checked; missing final source remains PENDING");


} finally {await browser.close();}
