// CI-only read-only provider audit. Never writes to automation-data or modifies
// predictions, PRE lineups, odds or a FINAL. Uses the full persisted ledger,
// rather than the newest 150 rows exposed in the public UI.
import {gunzipSync} from "node:zlib";
import {espnLeague,espnScoreboardDates,diagnoseEspnIdentity,
 parseEspnFinal,espnKickoffCandidateInfo,espnSideCandidates} from "./espn-fast-final.mjs";
import {finalFailureCategory} from "./data-quality-audit.mjs";
import {officialKLeagueNumber,officialKLeagueMonth,parseOfficialKLeagueFinal} from "./kleague-official-final.mjs";
const BASE="https://wisetoto-analyzer.vercel.app";
const now=Date.now();
async function restoredLedger(){
 const token=process.env.GH_TOKEN;
 if(!token||!process.env.GITHUB_REPOSITORY)throw Error("CI_READ_ONLY_LEDGER_TOKEN_REQUIRED");
 const res=await fetch("https://api.github.com/repos/"+process.env.GITHUB_REPOSITORY+
  "/contents/collect-first-state.json.gz?ref=automation-data",{
  headers:{"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28"},
  signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error("READ_ONLY_LEDGER_FETCH_HTTP_"+res.status);
 const file=await res.json();
 if(file.encoding!=="base64"||!file.content)throw Error("MISSING_COMPRESSED_LEDGER");
 const state=JSON.parse(gunzipSync(Buffer.from(file.content.replace(/\s/g,""),"base64")).toString("utf8"));
 if(state.schema!=="wisetoto-collect-first-v1"||!Array.isArray(state.records))
  throw Error("INVALID_PERSISTED_LEDGER");
 return state;
}
async function fetchPool(urls,fetchFn,concurrency=5){
 const results=new Map(),keys=[...new Set(urls)];
 let pos=0;
 async function worker(){
  for(;;){
   const i=pos++;if(i>=keys.length)return;
   const url=keys[i];let value;
   try{value=await fetchFn(url);}catch(e){value={ok:false,reason:String(e).slice(0,100)};}
   results.set(url,value);
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,keys.length)},worker));
 return results;
}
async function auditKickoff(state){
 const rows=state.records.filter(r=>r.verdict==="PENDING"&&
  Number.isFinite(r.startMs)&&r.startMs<=now-86400000&&
  finalFailureCategory(r)==="ESPN_KICKOFF_UNPROVEN"&&Boolean(espnLeague(r)));
 console.log("ESPN_CLOCK_AUDIT_START "+JSON.stringify({rows:rows.length,
  leagues:rows.reduce((o,r)=>(o[r.league]=(o[r.league]??0)+1,o),{})}));
 const urls=rows.flatMap(r=>espnScoreboardDates(r).map(date=>BASE+
  "/api/espn/scoreboard?"+new URLSearchParams({league:espnLeague(r),date})));
 const responses=await fetchPool(urls,async url=>{
  const resp=await fetch(url,{signal:AbortSignal.timeout(7500),cache:"no-store"});
  const json=resp.ok?await resp.json():null;
  return resp.ok&&json?.ok===true?{ok:true,payload:json}:
   {ok:false,reason:"HTTP_"+resp.status+":"+String(json?.waitReason??"UNAVAILABLE").slice(0,60)};
 },6);
 const outcomes={},offsets={},byLeague={};
 for(const r of rows){
  const sources=espnScoreboardDates(r).map(date=>responses.get(BASE+
   "/api/espn/scoreboard?"+new URLSearchParams({league:espnLeague(r),date})));
  const available=sources.filter(x=>x?.ok).map(x=>x.payload);
  const events=available.flatMap(p=>Array.isArray(p.events)?p.events:[]);
  const payload={ok:true,league:espnLeague(r),events};
  const diagnosed=available.length?diagnoseEspnIdentity(payload,r):
   {ok:false,waitReason:"ESPN_ALL_DATES_NETWORK_UNAVAILABLE"};
  const timing=espnKickoffCandidateInfo(payload,r);
  const independentFinal=diagnosed.ok?parseEspnFinal(payload,r,{now}):null;
  const reason=diagnosed.ok?(independentFinal?.ok?"EXACT_FINAL_NOW":"EXACT_EVENT_NOT_FINAL"):
   diagnosed.waitReason;
  outcomes[reason]=(outcomes[reason]??0)+1;
  byLeague[r.league]??={n:0,exact:0,network:0,clock:0,notListed:0};
  const box=byLeague[r.league];box.n++;
  if(diagnosed.ok)box.exact++;
  else if(reason.includes("NETWORK"))box.network++;
  else if(reason==="ESPN_KICKOFF_MISMATCH")box.clock++;
  else box.notListed++;
  if(timing.unique&&Number.isFinite(timing.deltaMinutes)){
   const k=String(timing.deltaMinutes);
   offsets[k]=(offsets[k]??0)+1;
  }
  console.log("ESPN_CLOCK_MATCH "+JSON.stringify({
   league:r.league,home:r.home,away:r.away,scheduled:new Date(r.startMs).toISOString(),
   reason,nearSourceCount:events.length,sourceDays:available.length,
   exactCandidate:timing.unique?{gameId:timing.gameId,
    kickoffDeltaMin:timing.deltaMinutes,sourceAt:timing.sourceAt}:null,
   partialSideSourceCandidates:reason.includes("TEAM")||reason==="ESPN_HOME_AWAY_REVERSED"?
    espnSideCandidates(payload,r):[]
  }));
 }
 console.log("ESPN_CLOCK_AUDIT_SUMMARY "+JSON.stringify({
  rows:rows.length,uniqueSourceDates:responses.size,outcomes,offsets,byLeague}));
}
async function auditKLeague(state){
 const rows=state.records.filter(r=>r.verdict==="PENDING"&&
  officialKLeagueNumber(r)&&r.startMs<now-86400000);
 const urls=[1,2].flatMap(leagueId=>["10","11"].map(month=>({
  leagueId,month,url:"https://www.kleague.com/getScheduleList.do"
 })));
 let confirmed=0,notMatched=0,missingSource=0;
 for(const {leagueId,month,url} of urls){
  try{
   const response=await fetch(url,{method:"POST",headers:{
    "content-type":"application/json; charset=utf-8",
    "accept":"application/json, text/plain, */*",
    "user-agent":"Mozilla/5.0 (Wisetoto read-only source shape check)"},
    body:JSON.stringify({year:"2026",month,leagueId}),
    signal:AbortSignal.timeout(12500)});
   const raw=await response.text();
   let json=null;try{json=JSON.parse(raw)}catch{}
   const data=json?.data??json??{},matches=Array.isArray(data.scheduleList)?data.scheduleList:[];
   const clubs=Array.isArray(data.clubList)?data.clubList:[];
   const counts={};for(const m of matches){const k=m.gameStatus??m.endYn??"UNKNOWN";counts[k]=(counts[k]??0)+1;}
   const backlog=rows.filter(r=>{
    const period=officialKLeagueMonth(r);
    return period?.year==="2026"&&period.month===month&&period.leagueId===leagueId;
   });
   const proofs=backlog.map(r=>{
    const found=parseOfficialKLeagueFinal(json,r,{now});
    if(found.ok)confirmed++;else notMatched++;
    return {home:r.home,away:r.away,at:new Date(r.startMs).toISOString(),
      ok:found.ok,gameId:found.gameId??null,
      reason:found.waitReason??null,score:found.ok?found.result:null};
   });
   console.log("KLEAGUE_REAL_BACKLOG_PROOF "+JSON.stringify({leagueId,month,rows:proofs.length,proofs}));

   console.log("KLEAGUE_OFFICIAL_SHAPE "+JSON.stringify({leagueId,month,status:response.status,
    isJson:!!json,keys:Object.keys(data).slice(0,15),
    schedule:matches.length,clubs:clubs.length,states:counts,
    clubsSample:clubs.map(c=>({code:c.teamId??c.code,short:c.teamNameShort,name:c.teamName,full:c.teamNameFull})),
    examples:matches.filter(m=>m.gameStatus==="FE"||m.endYn==="Y").slice(0,4)
     .map(m=>({id:m.gameId,year:m.year,leagueId:m.leagueId,meetSeq:m.meetSeq,
      homeTeam:m.homeTeam,awayTeam:m.awayTeam,homeTeamName:m.homeTeamName,
      awayTeamName:m.awayTeamName,gameDate:m.gameDate,gameTime:m.gameTime,
      status:m.gameStatus,endYn:m.endYn,homeGoal:m.homeGoal,awayGoal:m.awayGoal}))}));
  }catch(e){missingSource++;console.log("KLEAGUE_OFFICIAL_SHAPE "+JSON.stringify({leagueId,month,error:String(e).slice(0,140)}))}
 }
 console.log("KLEAGUE_FULL_SOURCE_AUDIT_SUMMARY "+JSON.stringify({rows:rows.length,confirmed,notMatched,missingSource}));
 // Fail the PR verification gate when a real listed backlog cannot be safely
 // identified from the official league site. No ledger updates are made.
 if(rows.length>0&&(confirmed!==rows.length||missingSource>0)){
  console.error("KLEAGUE_SOURCE_PROOF_INCOMPLETE: refuse rollout");
  process.exitCode=1;
 }
}
const state=await restoredLedger();
console.log("KLEAGUE_FULL_LEDGER_OVERDUE "+JSON.stringify(state.records.filter(r=>
 ["K리그1","K리그2"].includes(String(r.league??"").trim())&&
 r.verdict==="PENDING"&&r.startMs<now-86400000).map(r=>({
 league:r.league,home:r.home,away:r.away,start:new Date(r.startMs).toISOString(),
 reason:String(r.checkReason??"").slice(0,115)
}))));

await Promise.all([auditKickoff(state),auditKLeague(state)]);
