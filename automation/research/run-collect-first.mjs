// Light, browser-independent capture + results reconciliation. Never creates PRE picks.
import fs from "node:fs/promises";
import {loadFeed} from "../feed.mjs";
import {getRecords,STATE_FILE} from "../logic.mjs";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection,verifiedNaverFinal} from "./collect-first.mjs";
import {lookupVolleyballFinal} from "./volleyball-result.mjs";
import {lookupNaverScheduleFinal} from "./naver-fast-final.mjs";
import {espnLeague,lookupEspnFinal} from "./espn-fast-final.mjs";
import {collectLineupSnapshots} from "./pregame-lineup.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const dir="automation-state",file=dir+"/collect-first-state.json";
await fs.mkdir(dir,{recursive:true});
let state;
try{state=JSON.parse(await fs.readFile(file,"utf8"))}
catch(e){if(e?.code==="ENOENT")state={schema:SCHEMA,records:[]};else throw e;}
if(state.schema!==SCHEMA)throw Error("ledger schema incompatible: refuse data loss");
const now=Date.now();
let fresh=false;
try{
 const feed=await loadFeed(now);
 if(!feed)throw Error("Betman scan unavailable/stale");
 const wrapper=JSON.parse(await fs.readFile(dir+"/betman-feed.json","utf8"));
 const data=collect(state,feed,now,wrapper.fetchedAt);state=data.state;fresh=true;
 console.log("COLLECT_FIRST "+JSON.stringify(data.summary));
}catch(e){
 // Preserve the prior ledger; expose outage without claiming fresh coverage.
 state={...state,lastFeedOk:false,lastFeedError:String(e).slice(0,160)};
 console.error("COLLECT_FIRST_SOURCE_WAIT "+String(e));
}
let tracker={localStorage:{}};
try{tracker=JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{}
let verified=settlement(state,getRecords(tracker),now);state=verified.state;
console.log("COLLECT_FIRST_TRACKER_VERIFIED "+verified.settled);
const base=(process.env.WISETOTO_URL||"https://wisetoto-analyzer.vercel.app").replace(/\/+$/,"");
// PRE is time-critical: attempt genuine pre-kickoff XI BEFORE slow, overdue
// postmatch providers. A Naver 502/timeout must not waste the XI window.
const lineupScan=await collectLineupSnapshots(state,{base,limit:12});
state=lineupScan.state;
console.log("PREGAME_LINEUP_AUDIT "+JSON.stringify(lineupScan.summary));
let sportsApiLimited=false,naverUpstreamFailures=0,naverOutageSkipped=0;
const supportedNaver=new Set(["축구","농구","야구"]);
// One request per (sport, KST date, Naver category) per scan, not per match.
const scheduleCache=new Map();
const espnCache=new Map();
let finalChecked=0,finalConfirmed=0,finalWaitReasons={};
async function requestFinal(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(16000),cache:"no-store"});
 let payload;
 try{payload=await response.json()}catch{payload={ok:false,error:"MALFORMED_PROVIDER_RESPONSE"}}
 return {status:response.status,payload};
}
for(const r of selectFinalAuditRows(state,now,24)){
 let confirmed=null,reasons=[];
 if(sportsApiLimited&&r.fixtureId!==null)reasons.push("SPORTSAPI_RATE_LIMIT");
 // A provider ID from the Betman row may give an exact match. When that
 // endpoint fails, a separately matched Naver result can still rescue it.
 if(r.fixtureId!==null&&!sportsApiLimited){
   try{
     const p=await requestFinal(base+"/api/fixture/result?id="+r.fixtureId+
       "&sport="+encodeURIComponent(r.sport));
     if(p.status===429)sportsApiLimited=true;
     if(p.payload?.ok===true&&p.payload.finalConfirmed===true&&p.payload.result)
       confirmed={...p.payload,source:"SPORTSAPI"};
     else reasons.push("SPORTSAPI_HTTP_"+p.status+":"+String(p.payload?.waitReason??p.payload?.error??"UNCONFIRMED").slice(0,65));
   }catch(e){reasons.push("SPORTSAPI_NETWORK:"+String(e).slice(0,65))}
 }
 if(!confirmed&&espnLeague(r)){
   // ESPN is independent of Naver and live-tested from Vercel. Only its
   // exact league + two teams + kickoff + unique FINAL can settle a row.
   const candidate=await lookupEspnFinal(r,{base,cache:espnCache,now:Date.now()});
   if(candidate.ok)confirmed=candidate;
   else {
     reasons.push("ESPN_FAST:"+String(candidate.waitReason).slice(0,150));
     if(Array.isArray(candidate.providerErrors))reasons.push(...candidate.providerErrors);
   }
 }
 if(!confirmed&&supportedNaver.has(r.sport)){
   if(naverUpstreamFailures>=2){
     // Multiple independent Naver schedule errors in this scan mean an
     // outage. Do not spend the rest of the scan on the same stalled source.
     naverOutageSkipped++;
     reasons.push("NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN");
   }else{
     const result=await lookupNaverScheduleFinal(r,{cache:scheduleCache,now:Date.now(),base});
     if(result.ok)confirmed=result;
     else {
       const reason=String(result.waitReason);
       reasons.push("NAVER_FAST:"+reason.slice(0,150));
       if(Array.isArray(result.providerErrors))reasons.push(...result.providerErrors);
       if(/HTTP_504|HTTP_502|NETWORK|TIMEOUT|PROVIDER_NETWORK/.test(reason))
         naverUpstreamFailures++;
     }
   }
 }
 if(!confirmed&&r.sport==="배구"){
   // Independent schedule-exact volleyball lookup also works without SportsAPI IDs.
   const final=await lookupVolleyballFinal(r);
   if(final.ok)confirmed=final;
   else reasons.push("NAVER_VOLLEYBALL:"+String(final.waitReason).slice(0,140));
   if(Array.isArray(final.providerErrors))reasons.push(...final.providerErrors);
 }
 finalChecked++;
 if(confirmed)finalConfirmed++;
 else {
   const first=String(reasons[0]??"NO_FINAL_PROVIDER");
   const category=first.split(":")[0];
   finalWaitReasons[category]=(finalWaitReasons[category]??0)+1;
 }
 state=mergeProviderFinal(state,r.key,{
   ...(confirmed??{ok:false,waitReason:reasons.join(" | ").slice(0,180)||"SOURCE_NOT_VERIFIED"}),
   providerErrors:reasons
 },Date.now());
}
console.log("FAST_FINAL_AUDIT "+JSON.stringify({
 checked:finalChecked,confirmed:finalConfirmed,waiting:finalChecked-finalConfirmed,
 sharedScheduleQueries:scheduleCache.size,sharedEspnQueries:espnCache.size,
 naverUpstreamFailures,naverOutageSkipped,waitReasons:finalWaitReasons
}));
await fs.writeFile(file,JSON.stringify(state)+"\n");
await fs.writeFile(dir+"/collect-first-public.json",JSON.stringify(projection(state,Date.now()))+"\n");
console.log("COLLECT_FIRST_STORED "+JSON.stringify({fresh,counts:projection(state).counts}));
