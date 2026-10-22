// PR smoke: exercise client automation bridge without firing a real prediction.
import { chromium } from "playwright";
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
 // Dashboard is a separate read-only page and uses actual published records.
 await page.goto("http://127.0.0.1:3100/automation",{waitUntil:"domcontentloaded",timeout:90_000});
 await page.getByRole("heading",{name:"자동분석 결과"}).waitFor({timeout:30000});
 await page.getByText("Los Angeles Clippers",{exact:false}).first().waitFor({timeout:30000});
 const response=await page.request.get("http://127.0.0.1:3100/api/automation/results");
 const body=await response.json();
 if(!response.ok()||!body.ok||body.data?.records?.length<3)throw Error("Dashboard API unavailable or first frozen PRE missing");
 if(JSON.stringify(body).includes("modelSnapshot")||JSON.stringify(body).includes("localStorage"))throw Error("Dashboard leaked raw private tracker");
 console.log("DASHBOARD OK: history API + real published first 3 PRE visible, no raw model snapshots");
} finally {await browser.close();}
