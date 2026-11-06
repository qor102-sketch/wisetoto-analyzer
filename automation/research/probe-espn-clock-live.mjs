// Read-only audit of the actual persistent fixture ledger, not projection 150.
// This CI probe NEVER writes state, FINAL, PRE or official TOP1.
// It checks the source's exact league/home-away IDs and explains kickoff
// mismatch; a timezone discrepancy alone does NOT change settlement rules.
import fs from "node:fs/promises";
import {finalFailureCategory} from "./data-quality-audit.mjs";
import {espnLeague,espnScoreboardDates,inspectEspnKickoffMismatch,
 diagnoseEspnIdentity} from "./espn-fast-final.mjs";
const input=process.argv[2];
if(!input)throw Error("missing read-only ledger input");
const state=JSON.parse(await fs.readFile(input,"utf8"));
if(!Array.isArray(state.records)||state.records.length===0)
 throw Error("actual persistent ledger records absent");
const now=Date.now(),DAY=86400000;
const all=state.records.filter(r=>r.verdict==="PENDING"&&
 Number.isFinite(r.startMs)&&r.startMs<=now-DAY&&espnLeague(r)&&
 ["ESPN_KICKOFF_UNPROVEN","ESPN_NO_SOURCE_FIXTURE_NEAR_KICKOFF"].includes(finalFailureCategory(r)));
const leagueCounts={};
for(const r of all)leagueCounts[r.league]=(leagueCounts[r.league]??0)+1;
// Cap network reads and share the exact same official league-date response
// among fixtures. Never query an alternative competition for a match.
const unique=[...new Set(all.flatMap(r=>espnScoreboardDates(r).map(date=>espnLeague(r)+"|"+date)))];
const maxUrls=48,probeUrls=unique.slice(0,maxUrls),responses=new Map();
let next=0;
await Promise.all(Array.from({length:4},async()=>{
 for(;;){
  const i=next++;
  if(i>=probeUrls.length)return;
  const key=probeUrls[i],[league,date]=key.split("|");
  try{
   const url="https://wisetoto-analyzer.vercel.app/api/espn/scoreboard?"+
    new URLSearchParams({league,date});
   const res=await fetch(url,{signal:AbortSignal.timeout(6500),
    cache:"no-store"});
   const data=await res.json().catch(()=>null);
   responses.set(key,res.ok&&data?.ok===true?{ok:true,payload:data}:
    {ok:false,why:"HTTP_"+res.status});
  }catch(e){responses.set(key,{ok:false,why:"NETWORK:"+String(e).slice(0,60)})}
 }
}));
const audits=[];
for(const r of all){
 const results=[];
 for(const date of espnScoreboardDates(r)){
  const item=responses.get(espnLeague(r)+"|"+date);
  if(!item)continue;
  if(!item.ok){results.push({date,reason:item.why});continue}
  const evidence=inspectEspnKickoffMismatch(item.payload,r);
  const classified=diagnoseEspnIdentity(item.payload,r);
  results.push({date,reason:classified.ok?"EXACT_IDENTITY":classified.waitReason,
   evidence:evidence??null});
 }
 const matched=results.filter(x=>x.evidence);
 const winner=matched.length===1?matched[0].evidence:
  matched.length>1&&matched.every(x=>x.evidence.eventId===matched[0].evidence.eventId)?
   matched[0].evidence:null;
 const label=winner?Math.abs(winner.deltaMinutes)<=120?
  "SAME_PAIR_WITHIN_ACCEPTANCE":"EXACT_PAIR_DIFFERENT_KICKOFF":
  results.length?"NO_UNIQUE_PAIR_PROVEN":"NOT_PROBED_BUDGET";
 audits.push({league:r.league,home:r.home,away:r.away,
  start:new Date(r.startMs).toISOString(),reason:label,
  offsetMinutes:winner?.deltaMinutes??null,eventId:winner?.eventId??null,
  checks:results.map(v=>v.reason).slice(0,3)});
}
const byReason={};
for(const r of audits)byReason[r.reason]=(byReason[r.reason]??0)+1;
console.log("PERSISTED_ESPN_KICKOFF_AUDIT "+JSON.stringify({
 ledgerRows:state.records.length,actualOverdueClockFailures:all.length,
 leagueCounts,sourceUrls:unique.length,probedUrls:responses.size,
 byReason,fixtureDetails:audits
}));
