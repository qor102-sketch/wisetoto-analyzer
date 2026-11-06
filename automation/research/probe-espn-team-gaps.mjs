// Read-only audit of original persistent ESPN 24h+ one-sided team gaps.
// Never infer result from a single matched side or create new aliases.
import fs from "node:fs/promises";
import {finalFailureCategory} from "./data-quality-audit.mjs";
import {espnLeague,espnScoreboardDates,espnTeamEq} from "./espn-fast-final.mjs";
const state=JSON.parse(await fs.readFile(process.argv[2],"utf8"));
if(!Array.isArray(state?.records))throw Error("persistent ledger missing");
const now=Date.now(),DAY=86400000;
const rows=state.records.filter(r=>r.verdict==="PENDING"&&
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
 const seen=new Set(),candidates=[];
 let inspected=0,errors=[];
 for(const date of espnScoreboardDates(r)){
  const p=cached.get(espnLeague(r)+"|"+date);
  if(!p){errors.push("NOT_PROBED_"+date);continue}
  if(!p.ok){errors.push(p.reason);continue}
  inspected++;
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
 const narrow=candidates.filter(c=>Math.abs(c.offsetMinutes)<=20);
 audits.push({league:r.league,home:r.home,away:r.away,
  start:new Date(r.startMs).toISOString(),sourceDaysInspected:inspected,
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
 details:audits
}));
