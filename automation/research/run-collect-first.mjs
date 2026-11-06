// Light, browser-independent capture + results reconciliation. Never creates PRE picks.
import fs from "node:fs/promises";
import {loadFeed} from "../feed.mjs";
import {getRecords,STATE_FILE} from "../logic.mjs";
import {SCHEMA,collect,settlement,mergeProviderFinal,deferFinalWithoutProvider,recordEspnKickoffEvidence,projection,finalAuditBacklog} from "./collect-first.mjs";
import {lookupVolleyballFinal} from "./volleyball-result.mjs";
import {lookupNaverScheduleFinal} from "./naver-fast-final.mjs";
import {naverOutageGroup} from "./naver-outage-group.mjs";
import {espnLeague,lookupEspnFinal} from "./espn-fast-final.mjs";
import {isJleagueJ2,lookupJleagueJ2Final} from "./jleague-j2-final.mjs";
import {officialKLeagueId,lookupOfficialKLeagueFinal} from "./kleague-official-final.mjs";
import {collectLineupSnapshots} from "./pregame-lineup.mjs";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
import {effectTotals,recordOperationalEffect} from "./operational-effect.mjs";
const dir="automation-state",file=dir+"/collect-first-state.json";
await fs.mkdir(dir,{recursive:true});
let state;
try{state=JSON.parse(await fs.readFile(file,"utf8"))}
catch(e){if(e?.code==="ENOENT")state={schema:SCHEMA,records:[]};else throw e;}
if(state.schema!==SCHEMA)throw Error("ledger schema incompatible: refuse data loss");
const priorLedgerAt=state.updatedAt??null;
const beforeTotals=effectTotals(state);
const scanStartedAt=Date.now();
const now=scanStartedAt;
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
let sportsApiLimited=false,naverFailedRows=0,naverOutageSkipped=0,finalDeferred=0;
const naverFailureGroups=new Map();
const supportedNaver=new Set(["축구","농구","야구"]);
// One request per (sport, KST date, Naver category) per scan, not per match.
const scheduleCache=new Map();
const espnCache=new Map();
const jleagueCache=new Map();
const kleagueCache=new Map();
let finalChecked=0,finalConfirmed=0,finalWaitReasons={},confirmedBySource={};
const espnFailureReasons={};
async function requestFinal(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(16000),cache:"no-store"});
 let payload;
 try{payload=await response.json()}catch{payload={ok:false,error:"MALFORMED_PROVIDER_RESPONSE"}}
 return {status:response.status,payload};
}
const finalQueue=selectFinalAuditRows(state,Date.now(),24);
console.log("FINAL_BACKLOG_BEFORE "+JSON.stringify({...finalAuditBacklog(state,Date.now()),selected:finalQueue.length,
 selectedBySport:Object.fromEntries(["축구","농구","야구","배구"].map(s=>[s,finalQueue.filter(r=>r.sport===s).length]))}));
for(const r of finalQueue){
 let confirmed=null,reasons=[],providerAttempted=false;
 if(sportsApiLimited&&r.fixtureId!==null)reasons.push("SPORTSAPI_RATE_LIMIT");
 // A provider ID from the Betman row may give an exact match. When that
 // endpoint fails, a separately matched Naver result can still rescue it.
 if(r.fixtureId!==null&&!sportsApiLimited){
   providerAttempted=true;
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
   providerAttempted=true;
   // ESPN is independent of Naver and live-tested from Vercel. Only its
   // exact league + two teams + kickoff + unique FINAL can settle a row.
   const candidate=await lookupEspnFinal(r,{base,cache:espnCache,now:Date.now()});
   if(candidate.ok)confirmed=candidate;
   else {
     if(candidate.kickoffAudit)
      state=recordEspnKickoffEvidence(state,r.key,candidate.kickoffAudit,Date.now());
     reasons.push("ESPN_FAST:"+String(candidate.waitReason).slice(0,150));
     // Per-source response categories (not distinct fixtures): adjacent
     // scoreboard days can each explain why the exact match is unavailable.
     for(const issue of candidate.providerErrors??[candidate.waitReason]){
      const code=String(issue??"UNKNOWN").split(":")[0].trim().slice(0,70);
      espnFailureReasons[code]=(espnFailureReasons[code]??0)+1;
     }
     if(Array.isArray(candidate.providerErrors))reasons.push(...candidate.providerErrors);
   }
 }
 if(!confirmed&&isJleagueJ2(r)){
   // Official J.LEAGUE match list only; one bounded network read per JST
   // day, shared across candidates. A score or elapsed time is never FINAL.
   providerAttempted=true;
   const official=await lookupJleagueJ2Final(r,{cache:jleagueCache,now:Date.now()});
   if(official.ok)confirmed=official;
   else reasons.push("JLEAGUE_J2:"+String(official.waitReason).slice(0,150));
 }
 if(!confirmed&&officialKLeagueId(r)){
   // Read-only official K LEAGUE JSON, cached by league/month.
   // Never grade with kickoff time or an unfinished score alone.
   providerAttempted=true;
   const official=await lookupOfficialKLeagueFinal(r,{cache:kleagueCache,now:Date.now()});
   if(official.ok)confirmed=official;
   else reasons.push("KLEAGUE_OFFICIAL:"+String(official.waitReason).slice(0,145));
 }
 if(!confirmed&&supportedNaver.has(r.sport)){
   // A failed Naver football category must not silence NBA/KBL/baseball,
   // nor a different match day. Failed URLs are already cached per scan.
   const group=naverOutageGroup(r);
   if((naverFailureGroups.get(group)??0)>=2){
     // Multiple independent Naver schedule errors in this scan mean an
     // outage. Do not spend the rest of the scan on the same stalled source.
     naverOutageSkipped++;
     reasons.push("NAVER_CIRCUIT_OPEN_RETRY_NEXT_SCAN");
   }else{
     providerAttempted=true;
     const result=await lookupNaverScheduleFinal(r,{cache:scheduleCache,now:Date.now(),base});
     if(result.ok)confirmed=result;
     else {
       const reason=String(result.waitReason);
       reasons.push("NAVER_FAST:"+reason.slice(0,150));
       if(Array.isArray(result.providerErrors))reasons.push(...result.providerErrors);
       if(/HTTP_504|HTTP_502|NETWORK|TIMEOUT|PROVIDER_NETWORK/.test(reason)){
         naverFailedRows++;
         naverFailureGroups.set(group,(naverFailureGroups.get(group)??0)+1);
       }
     }
   }
 }
 if(!confirmed&&r.sport==="배구"){
   providerAttempted=true;
   // Independent schedule-exact volleyball lookup also works without SportsAPI IDs.
   const final=await lookupVolleyballFinal(r);
   if(final.ok)confirmed=final;
   else reasons.push("NAVER_VOLLEYBALL:"+String(final.waitReason).slice(0,140));
   if(Array.isArray(final.providerErrors))reasons.push(...final.providerErrors);
 }
 if(!providerAttempted){
   // A circuit-open group is not a real provider query. Never manufacture a
   // resultChecks increment or consume its last genuine retry timestamp.
   finalDeferred++;
   finalWaitReasons.PROVIDER_DEFERRED=(finalWaitReasons.PROVIDER_DEFERRED??0)+1;
   state=deferFinalWithoutProvider(state,r.key,reasons.join(" | ")||"SOURCE_CIRCUIT_OPEN",Date.now());
   continue;
 }
 finalChecked++;
 if(confirmed){
   finalConfirmed++;
   const provider=String(confirmed.source??"UNKNOWN").slice(0,30);
   confirmedBySource[provider]=(confirmedBySource[provider]??0)+1;
 }
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
// A cached failed URL was fetched once (or reused), not N independent
// provider failures just because N fixtures shared the same schedule day.
const naverUpstreamFailures=[...scheduleCache.values()].filter(v=>v?.ok===false&&
 /HTTP_50[24]|NETWORK|TIMEOUT|PROVIDER_NETWORK/.test(String(v.reason??""))).length;
console.log("FINAL_BACKLOG_AFTER "+JSON.stringify(finalAuditBacklog(state,Date.now())));
console.log("FAST_FINAL_AUDIT "+JSON.stringify({
 checked:finalChecked,confirmed:finalConfirmed,deferred:finalDeferred,waiting:finalChecked-finalConfirmed,
 sharedScheduleQueries:scheduleCache.size,sharedEspnQueries:espnCache.size,
 sharedOfficialJ2Queries:jleagueCache.size,
 sharedOfficialKLeagueQueries:kleagueCache.size,
 naverUpstreamFailures,naverFailedRows,naverOutageSkipped,
 naverCircuitGroups:Object.fromEntries(naverFailureGroups),waitReasons:finalWaitReasons,
 espnFailureReasons
}));
// A measured transition compares the restored ledger before this scan with
// the saved AFTER state, using only independently accepted observations.
state=recordOperationalEffect(state,{
 beforeTotals,priorLedgerAt,startedAt:scanStartedAt,finishedAt:Date.now(),
 runId:process.env.GITHUB_RUN_ID?
  process.env.GITHUB_RUN_ID+"-"+(process.env.GITHUB_RUN_ATTEMPT||"1"):null,
 commit:process.env.GITHUB_SHA??"local",sourceFresh:fresh,
 lineupSummary:lineupScan.summary,
 backlog:finalAuditBacklog(state,Date.now()),
 finalSummary:{checked:finalChecked,confirmed:finalConfirmed,
  selectedBySport:Object.fromEntries(["축구","농구","야구","배구"].map(s=>[s,
   finalQueue.filter(r=>r.sport===s).length])),
  confirmedBySource,waitReasons:finalWaitReasons,espnFailureReasons,
  naverUpstreamFailures,naverFailedRows,
  naverOutageSkipped,finalDeferred}
});
console.log("OPERATIONAL_EFFECT "+JSON.stringify({
 baseline:state.operationalEffect.baseline,latest:state.operationalEffect.latest,
 delta:state.operationalEffect.delta,regressions:state.operationalEffect.regressions
}));
await fs.writeFile(file,JSON.stringify(state)+"\n");
await fs.writeFile(dir+"/collect-first-public.json",JSON.stringify(projection(state,Date.now()))+"\n");
console.log("COLLECT_FIRST_STORED "+JSON.stringify({fresh,counts:projection(state).counts}));
