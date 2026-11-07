// Read-only audit of original persistent ESPN 24h+ one-sided team gaps.
// Never infer result from a single matched side or create new aliases.
import fs from "node:fs/promises";
import {finalFailureCategory} from "./data-quality-audit.mjs";
import {espnLeague,espnScoreboardDates,espnTeamEq,parseEspnFinal} from "./espn-fast-final.mjs";
import {isNbaGame} from "../nba-policy.mjs";
const state=JSON.parse(await fs.readFile(process.argv[2],"utf8"));
if(!Array.isArray(state?.records))throw Error("persistent ledger missing");
const now=Date.now(),DAY=86400000;
const rows=state.records.filter(r=>!isNbaGame(r)&&r.verdict==="PENDING"&&
 Number.isFinite(r.startMs)&&r.startMs<now-DAY&&espnLeague(r)&&
 finalFailureCategory(r)==="ESPN_TEAM_IDENTITY_MISMATCH");
const requests=[...new Set(rows.flatMap(r=>espnScoreboardDates(r).map(date=>
 espnLeague(r)+"|"+date)))].slice(0,48);
const cached=new Map();
let next=0;
await Promise.all(Array.from({length:4},async()=>{
 while(next<requests.length){
  const [league,date]=requests[next++].split("|"),key=league+"|"+date;
  try{
   const url="https://wisetoto-analyzer.vercel.app/api/espn/scoreboard?"+
    new URLSearchParams({league,date});
   const res=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(6500)});
   const payload=res.ok?await res.json():null;
   cached.set(key,res.ok&&payload?.ok===true?{ok:true,events:payload.events??[]}:
    {ok:false,reason:"HTTP_"+res.status});
  }catch(e){cached.set(key,{ok:false,reason:"NETWORK:"+String(e).slice(0,50)})}
 }
}));
const audits=[];
for(const r of rows){
 const seen=new Set(),candidates=[],sourceFinalProofs=[];
 let inspected=0,errors=[];
 for(const date of espnScoreboardDates(r)){
  const p=cached.get(espnLeague(r)+"|"+date);
  if(!p){errors.push("NOT_PROBED_"+date);continue}
  if(!p.ok){errors.push(p.reason);continue}
  inspected++;
  const sourceFinal=parseEspnFinal({ok:true,league:espnLeague(r),events:p.events},r,{now});
  if(sourceFinal.ok)sourceFinalProofs.push({
   id:sourceFinal.gameId,score:sourceFinal.result,source:sourceFinal.source});
  for(const e of p.events){
   const id=String(e?.id??""),at=Date.parse(String(e?.date??""));
   if(!/^\d+$/.test(id)||!Number.isFinite(at)||Math.abs(at-r.startMs)>120*60000)
    continue;
   const h=e?.competitors?.find(c=>c.homeAway==="home");
   const a=e?.competitors?.find(c=>c.homeAway==="away");
   const home=espnTeamEq(r.home,h?.name),away=espnTeamEq(r.away,a?.name);
   if(home===away||seen.has(id))continue;
   seen.add(id);
   candidates.push({id,homeSource:h?.name,awaySource:a?.name,
    matchedSide:home?"HOME_ONLY":"AWAY_ONLY",
    offsetMinutes:Math.round((at-r.startMs)/60000),
    status:e.statusName,completed:e.completed===true,
    score:h?.score!=null&&a?.score!=null?String(h.score)+":"+String(a.score):null});
  }
 }
 const distinctFinalIds=new Set(sourceFinalProofs.map(p=>p.id));
 const uniqueProof=distinctFinalIds.size===1?sourceFinalProofs[0]:null;
 const narrow=candidates.filter(c=>Math.abs(c.offsetMinutes)<=20);
 audits.push({league:r.league,home:r.home,away:r.away,
  start:new Date(r.startMs).toISOString(),sourceDaysInspected:inspected,
  officialExactFinal:uniqueProof,sourceProofs:sourceFinalProofs.length,
  candidates:candidates.slice(0,8),oneCandidateWithin20m:narrow.length===1?
  {id:narrow[0].id,missingSide:narrow[0].matchedSide==="HOME_ONLY"?"AWAY":"HOME",
   sourceName:narrow[0].matchedSide==="HOME_ONLY"?narrow[0].awaySource:narrow[0].homeSource}:
  null,fetchErrors:errors});
}
const unique=a=>a.filter((x,i)=>a.findIndex(y=>JSON.stringify(x)===JSON.stringify(y))===i);
console.log("ORIGINAL_ESPN_ONE_SIDE_TEAM_AUDIT "+JSON.stringify({
 ledgerRecords:state.records.length,overdueOneSided:rows.length,
 officialQueries:requests.length,queryCached:cached.size,
 uniqueNarrowCandidates:audits.filter(x=>x.oneCandidateWithin20m!==null).length,
 independentlyVerified:audits.filter(x=>x.officialExactFinal!==null).length,
 details:audits
}));
// Only 15 exact events previously source-audited (CI #2387) are enabled by
// these aliases. New unresolved league/club gaps MUST stay PENDING and should
// not break the known-identity regression gate.
const auditedIds=new Set([
 "401915303","401880176","401915382","401912613","401878762",
 "761933","761920","401880186","401877563","401921844",
 "761918","761913","761905","761908","761906"
]);
const confirmed=new Set(audits.map(x=>x.officialExactFinal?.id).filter(Boolean));
const knownHomeById={
 "401915303":"PSV에인트호번","401880176":"브리스틀 시티",
 "401915382":"페네르바흐체SK","401912613":"부리람 유나이티드",
 "401878762":"뉴캐슬 유나이티드","761933":"포틀랜드 팀버스",
 "761920":"내슈빌SC","401880186":"웨스트햄 유나이티드",
 "401877563":"가시와 레이솔","401921844":"에버턴",
 "761918":"밴쿠버 화이트캡스FC","761913":"미네소타 유나이티드FC",
 "761905":"뉴욕 시티FC","761908":"인터 마이애미CF","761906":"토론토FC"
};
const missing=[...auditedIds].filter(id=>!confirmed.has(id));
const deferred=missing.filter(id=>audits.some(a=>a.home===knownHomeById[id]&&
 a.fetchErrors.some(reason=>/^HTTP_50[24]|^NETWORK/.test(reason))));
const unproven=missing.filter(id=>!deferred.includes(id));
console.log("ESPN_15_OFFICIAL_FINAL_REGRESSION "+JSON.stringify({
 expected:auditedIds.size,verified:auditedIds.size-missing.length,
 deferredUpstreamOutage:deferred.length,unprovenIds:unproven,
 unresolvedOther:audits.filter(x=>!x.officialExactFinal).length
}));
// An HTTP 502 or timeout is NOT a mismatch. Never fabricate a FINAL; only
// defer the read-only audit and rely on the prior 15 source-backed unit cases.
// Genuine source responses that contradict the audited pair still fail CI.
if(unproven.length){
 console.error("ESPN_AUDITED_15_FINAL_IDENTITY_CONTRADICTION: "+unproven.join(","));
 process.exitCode=1;
}
