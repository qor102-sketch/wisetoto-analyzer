// Read-only exact-source audit of ALL overdue non-NBA ESPN backlog and
// Naver-only outages. Do not import or modify PRE, FINAL or research state.
import fs from "node:fs/promises";
import {finalFailureCategory} from "./data-quality-audit.mjs";
import {espnLeague,espnScoreboardDates,espnTeamEq,parseEspnFinal} from "./espn-fast-final.mjs";
import {isNbaGame} from "../nba-policy.mjs";
const path=process.argv[2];
if(!path)throw Error("SOURCE_AUDIT_LEDGER_REQUIRED");
const s=JSON.parse(await fs.readFile(path,"utf8"));
if(!Array.isArray(s.records)||!s.records.length)throw Error("SOURCE_AUDIT_LEDGER_EMPTY");
const now=Date.now(),D=86400000,H=3600000;
const overdue=s.records.filter(r=>!isNbaGame(r)&&r.verdict==="PENDING"&&Number.isFinite(r.startMs)&&r.startMs<=now-D);
const espn=overdue.filter(r=>Boolean(espnLeague(r)));
const naver=overdue.filter(r=>finalFailureCategory(r)==="NAVER_SOURCE_OUTAGE");
const categoryCounts={},leagueCounts={};
for(const r of espn){
 const cat=finalFailureCategory(r);
 categoryCounts[cat]=(categoryCounts[cat]??0)+1;
 const league=r.league;
 const entry=leagueCounts[league]??={total:0,reasons:{}};
 entry.total++;
 entry.reasons[cat]=(entry.reasons[cat]??0)+1;
}
// For each competition collect all UTC source dates; cross-game reuse each URL.
const keys=[...new Set(espn.flatMap(r=>espnScoreboardDates(r).map(d=>espnLeague(r)+"|"+d)))];
const maxQueries=108,planned=keys.slice(0,maxQueries),cache=new Map();
let cursor=0;
await Promise.all(Array.from({length:5},async()=>{
 for(;;){
  const n=cursor++;
  if(n>=planned.length)return;
  const key=planned[n],[league,date]=key.split("|");
  const url="https://wisetoto-analyzer.vercel.app/api/espn/scoreboard?"+
   new URLSearchParams({league,date});
  try{
   const res=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7500)});
   const payload=await res.json().catch(()=>null);
   cache.set(key,res.ok&&payload?.ok===true&&Array.isArray(payload.events)?
    {ok:true,events:payload.events}:
    {ok:false,error:"HTTP_"+res.status+":"+(payload?.waitReason??"BAD_RESPONSE")});
  }catch(e){cache.set(key,{ok:false,error:"NETWORK:"+String(e).slice(0,70)})}
 }
}));
const bucket={sourceEmpty:0,noEventsInTime:0,sourceFailed:0,
 shortNameBothProven:0,sourceBothAlreadyProven:0,uniqueOneSide:0,
 multipleCandidates:0,unproven:0,notAuditedBudget:0};
const concrete=[];
for(const r of espn){
 const league=espnLeague(r),candidates=new Map(),failures=[];
 let daysScanned=0,eventsSeen=0,nearCount=0;
 for(const d of espnScoreboardDates(r)){
  const entry=cache.get(league+"|"+d);
  if(!entry){failures.push("NOT_PROBED_BUDGET");continue;}
  if(!entry.ok){failures.push(entry.error);continue;}
  daysScanned++;eventsSeen+=entry.events.length;
  for(const e of entry.events){
   const at=Date.parse(String(e.date??"")),id=String(e.id??"");
   if(!Number.isFinite(at)||Math.abs(at-r.startMs)>2*H||!/^\d+$/.test(id))continue;
   nearCount++;
   const home=e.competitors?.find(c=>c.homeAway==="home");
   const away=e.competitors?.find(c=>c.homeAway==="away");
   if(!home||!away)continue;
   const displayHome=espnTeamEq(r.home,home.name),displayAway=espnTeamEq(r.away,away.name);
   const sourceHome=displayHome||espnTeamEq(r.home,home.shortName);
   const sourceAway=displayAway||espnTeamEq(r.away,away.shortName);
   if(!sourceHome&&!sourceAway)continue;
   if(candidates.has(id))continue;
   candidates.set(id,{id,timeDiffMin:Math.round((at-r.startMs)/60000),
    home:r.home,away:r.away,sourceHome:home.name,sourceAway:away.name,
    shortHome:home.shortName,shortAway:away.shortName,
    displayHome,displayAway,sourceHomeOk:sourceHome,sourceAwayOk:sourceAway,
    completed:e.completed===true,status:e.statusName,
    score:(home.score??"?")+":"+(away.score??"?")});
  }
 }
 const pair=[...candidates.values()],strict=pair.filter(x=>x.displayHome&&x.displayAway),
 sourceShort=pair.filter(x=>x.sourceHomeOk&&x.sourceAwayOk&&!x.displayHome!==!x.displayAway);
 const strong=pair.filter(x=>x.sourceHomeOk&&x.sourceAwayOk);
 let reason;
 if(!daysScanned){reason=failures.every(e=>e==="NOT_PROBED_BUDGET")?"notAuditedBudget":"sourceFailed";}
 else if(!eventsSeen)reason="sourceEmpty";
 else if(!nearCount)reason="noEventsInTime";
 else if(strict.length===1)reason="sourceBothAlreadyProven";
 else if(strong.length===1)reason="shortNameBothProven";
 else if(pair.length===1)reason="uniqueOneSide";
 else if(pair.length>1)reason="multipleCandidates";
 else reason="unproven";
 bucket[reason]++;
 if(reason==="shortNameBothProven"||reason==="sourceBothAlreadyProven"||reason==="uniqueOneSide"||
    reason==="sourceFailed"&&concrete.length<15)
  concrete.push({league:r.league,date:new Date(r.startMs).toISOString(),category:finalFailureCategory(r),
   home:r.home,away:r.away,reason,eventsSeen,nearCount,candidates:pair.slice(0,3),failures:failures.slice(0,2)});
}
const naverCounts={};
for(const r of naver){const k=r.sport+"|"+r.league;naverCounts[k]=(naverCounts[k]??0)+1;}
console.log("SOURCE_COVERAGE_AUDIT "+JSON.stringify({
 originalLedger:s.records.length,overdue:s.records.filter(r=>r.verdict==="PENDING"&&r.startMs<=now-D).length,
 espn:espn.length,espnByCategory:categoryCounts,espnByLeague:leagueCounts,
 sourceUniqueLeagueDates:keys.length,sourceDatesProbed:cache.size,classification:bucket,
 sampleCandidatePairs:concrete.slice(0,34),naverOutages:naver.length,
 naverByLeague:naverCounts,nonNba:true,readOnly:true
}));
