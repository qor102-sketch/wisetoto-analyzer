// Read-only audit of actual persistent K League 1/2 overdue fixtures.
// Must never settle results or rewrite frozen PRE/experiment data.
import fs from "node:fs/promises";
import {officialKLeagueId,officialKLeagueRequest,parseOfficialKLeagueFinal} from "./kleague-official-final.mjs";
import {finalFailureCategory} from "./data-quality-audit.mjs";
const input=process.argv[2];
if(!input)throw Error("missing original ledger path");
const state=JSON.parse(await fs.readFile(input,"utf8"));
if(!Array.isArray(state?.records))throw Error("persistent ledger not readable");
const now=Date.now(),day=86400000,cache=new Map();
const rows=state.records.filter(r=>r.verdict==="PENDING"&&
 Number.isFinite(r.startMs)&&r.startMs<now-day&&officialKLeagueId(r)&&
 finalFailureCategory(r)==="KLEAGUE_OFFICIAL_IDENTITY_UNCONFIRMED");
async function official(req){
 if(cache.has(req.key))return cache.get(req.key);
 let output={ok:false,reason:"UNAVAILABLE"};
 try{
  const response=await fetch(req.url,{method:"POST",signal:AbortSignal.timeout(10000),
   headers:{"accept":"application/json, text/plain, */*",
    "content-type":"application/json; charset=utf-8",
    "user-agent":"Mozilla/5.0 (Wisetoto read-only K League fixture audit)"},
   body:req.body,cache:"no-store",redirect:"error"});
  const json=response.ok?await response.json():null;
  const data=json?.data??json;
  output=response.ok&&Array.isArray(data?.scheduleList)?
   {ok:true,games:data.scheduleList}:
   {ok:false,reason:"HTTP_"+response.status+"_OR_SCHEMA"};
 }catch(e){output={ok:false,reason:"NETWORK:"+String(e).slice(0,90)}}
 cache.set(req.key,output);
 return output;
}
const audits=[];
for(const r of rows){
 const req=officialKLeagueRequest(r),res=await official(req);
 const proof=res.ok?parseOfficialKLeagueFinal({data:{scheduleList:res.games}},r,{now}):
  {ok:false,waitReason:res.reason};
 const historicKnown=r.startMs>=Date.parse("2026-10-31T00:00:00Z")&&
  r.startMs<Date.parse("2026-11-02T00:00:00Z");
 if(historicKnown&&res.ok&&!proof.ok){
  process.exitCode=1;
  console.error("SOURCE_PROVEN_KLEAGUE_IDENTITY_STILL_UNMATCHED "+
    JSON.stringify({home:r.home,away:r.away,league:r.league,why:proof.waitReason}));
 }
 let candidates=[];
 if(res.ok){
  const dayStr=new Date(r.startMs+9*3600000).toISOString().slice(0,10).replace(/-/g,".");
  const sameDay=res.games.filter(g=>String(g.gameDate)===dayStr);
  candidates=sameDay.map(g=>{
   const at=Date.parse(String(g.gameDate).replaceAll(".","-")+
    "T"+String(g.gameTime)+":00+09:00");
   return {gameId:g.gameId,meetSeq:g.meetSeq,leagueId:g.leagueId,
    home:g.homeTeamName,away:g.awayTeamName,date:g.gameDate,time:g.gameTime,
    offsetMinutes:Number.isFinite(at)?Math.round((at-r.startMs)/60000):null,
    completed:g.gameStatus==="FE"&&g.endYn==="Y",score:g.homeGoal+"/"+g.awayGoal};
  }).filter(g=>g.offsetMinutes!==null&&Math.abs(g.offsetMinutes)<=120)
   .sort((a,b)=>Math.abs(a.offsetMinutes)-Math.abs(b.offsetMinutes));
 }
 audits.push({league:r.league,home:r.home,away:r.away,
  kickoff:new Date(r.startMs).toISOString(),failure:r.checkReason,
  officialQuery:req?.key,response:res.ok?"OK":res.reason,
  matchedOfficialFinal:proof.ok,
  matchedOfficialId:proof.gameId??null,
  matchedOfficialScore:proof.result??null,
  sourceProofFailure:proof.waitReason??null,
  closestOfficialCandidates:candidates.slice(0,15)});
}
console.log("ORIGINAL_KLEAGUE_BACKLOG_AUDIT "+JSON.stringify({
 ledgerRecords:state.records.length,overdueIdentityRows:rows.length,
 sourceRequests:cache.size,audits
}));
