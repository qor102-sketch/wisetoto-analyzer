import {espnLineupLeague,lookupEspnPregameXi} from "./espn-pregame-lineup.mjs";
// Read-only independent pre-kickoff Naver lineup audit for the collect-first
// ledger. Never use post-kickoff lineups as PRE, invent names or alter frozen PRE.
// The Naver route already resolves exact fixtures; recheck time and identity.
export const LINEUP_WINDOW_MS=180*60000;
const norm=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const sideList=v=>Array.isArray(v)?v.filter(p=>p&&typeof p==="object"):[];
// Naver occasionally returns timezone-less Korea-local "YYYY-MM-DD HH:mm".
// Never interpret that as UTC on the GitHub runner.
function providerKickoff(v){
 if(v==null)return NaN;
 const s=String(v).trim();
 if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)&&
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(s))
  return Date.parse(s.replace(" ","T")+"+09:00");
 return Date.parse(s);
}

export function pregameLineupCandidates(state,now=Date.now(),limit=4){
 return (state?.records??[]).filter(r=>["축구","야구","농구","배구"].includes(r.sport)
   &&r.startMs>now&&r.startMs-now<=LINEUP_WINDOW_MS
   &&r.lineup?.status!=="CONFIRMED"
   &&r.lineup?.status!=="UNSUPPORTED"
   &&(!Number.isFinite(r.lineup?.lastAttemptAt)
     ||now-r.lineup.lastAttemptAt>=10*60000))
  .sort((a,b)=>{
   // Due-soon fixtures first; only real pregame opportunities get requests.
   return a.startMs-b.startMs||a.key.localeCompare(b.key);
  }).slice(0,limit);
}
export function lineupEvidence(row,payload,at){
 if(!Number.isFinite(at)||at>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 if(row.sport==="농구"||row.sport==="배구")
  return {status:"UNSUPPORTED",reason:"NO_VERIFIED_PREGAME_LINEUP_PROVIDER"};
 if(!payload?.ok||payload.partial||payload.recentOnly||!payload.gameId)
  return {status:"UNAVAILABLE",reason:"EXACT_PROVIDER_LINEUP_NOT_AVAILABLE"};
 if(row.sport==="축구"&&payload.footballIdentity?.valid!==true)
  return {status:"UNAVAILABLE",reason:"FOOTBALL_FIXTURE_IDENTITY_UNCONFIRMED"};
 // For baseball, the upstream strict resolver returns a gameId; retain audit
 // metadata but do not assign claimed coverage without independent team names.
 const game=payload.game??{};
 if(row.sport==="야구"){
  if(!game.homeTeamName||!game.awayTeamName)
    return {status:"UNAVAILABLE",reason:"BASEBALL_TEAM_IDENTITY_MISSING"};
  const match=(from,to)=>{
   const a=norm(from),b=norm(to);
   return a.length>=2&&b.length>=2&&(a===b||a.includes(b)||b.includes(a));
  };
  if(!match(row.home,game.homeTeamName)||!match(row.away,game.awayTeamName))
    return {status:"UNAVAILABLE",reason:"BASEBALL_TEAM_IDENTITY_MISMATCH"};
 }
 // If a schedule start is supplied, reject an unrelated fixture kickoff.
 const reported=game.gameDateTime??game.startDateTime??null;
 const parsed=providerKickoff(reported);
 if(reported&&Number.isFinite(parsed)&&Math.abs(parsed-row.startMs)>2*3600000)
  return {status:"UNAVAILABLE",reason:"KICKOFF_MISMATCH"};
 const home=sideList(payload.home),away=sideList(payload.away);
 const names=arr=>arr.map(p=>String(p.name??p.playerName??"").trim()).filter(Boolean).slice(0,11);
 const homeNames=names(home),awayNames=names(away);
 const starterNames=[payload.homeStarter?.name,payload.awayStarter?.name]
  .map(x=>String(x??"").trim()||null);
 const football=row.sport==="축구";
 const complete=football
  ?homeNames.length===11&&awayNames.length===11&&
    payload.footballPlayers?.startingHome===11&&payload.footballPlayers?.startingAway===11
  :homeNames.length>=9&&awayNames.length>=9;
 const present=homeNames.length+awayNames.length>0||starterNames.some(Boolean);
 if(!present)return {status:"UNAVAILABLE",reason:"LINEUP_NOT_PUBLISHED"};
 return {status:complete?"CONFIRMED":"PARTIAL",
  reason:complete?"VERIFIED_PREGAME_LINEUP":"PARTIAL_PREGAME_LINEUP",
  source:football?"NAVER_FOOTBALL_PLAYERS":"NAVER_BASEBALL_LINEUP",
  gameId:String(payload.gameId),capturedAt:at,
  home:homeNames,away:awayNames,homeCount:homeNames.length,awayCount:awayNames.length,
  homeStarter:starterNames[0],awayStarter:starterNames[1],
  providerCapturedAt:Number.isFinite(payload.capturedAt)&&payload.capturedAt<=at?
    payload.capturedAt:null};
}
export function mergeLineupEvidence(state,key,observation,now){
 const records=state.records.map(old=>{
  if(old.key!==key)return old;
  const prior=old.lineup??null;
  if(now>=old.startMs||observation.status==="REJECTED"){
   return {...old,lineup:{...prior,status:prior?.status??"UNAVAILABLE",
     lastAttemptAt:now,lastError:"AFTER_KICKOFF_NOT_PREGAME"}};
  }
  const keepConfirmed=prior?.status==="CONFIRMED";
  const detail=observation.status==="CONFIRMED"||
    (observation.status==="PARTIAL"&&!["CONFIRMED"].includes(prior?.status));
  // First valid lineup remains unchanged; no later overwrite.
  const captured=keepConfirmed?prior:
    detail?{...observation}:prior??{};
  return {...old,lineup:{...captured,status:keepConfirmed?"CONFIRMED":
    (detail?observation.status:prior?.status??observation.status),
    reason:keepConfirmed?prior.reason:(detail?observation.reason:prior?.reason??observation.reason),
    lastAttemptAt:now,attempts:(prior?.attempts??0)+1,
    lastError:["UNAVAILABLE","REJECTED"].includes(observation.status)?
      observation.reason:null}};
 });
 return {...state,records};
}
export async function collectLineupSnapshots(state,{
 now=()=>Date.now(),base="https://wisetoto-analyzer.vercel.app",fetcher=fetch,limit=8
}={}){
 let next=state,attempted=0,confirmed=0,partial=0,unavailable=0,unsupported=0;
 const espnCache=new Map(),reasons={};
 for(const r of pregameLineupCandidates(state,now(),limit)){
  let observation;
  if(r.sport==="배구"||r.sport==="농구")observation={status:"UNSUPPORTED",reason:"NO_VERIFIED_PREGAME_LINEUP_PROVIDER"};
  else if(r.sport==="축구"&&espnLineupLeague(r)){
   observation=await lookupEspnPregameXi(r,{now:now(),base,fetchFn:fetcher,cache:espnCache});
  }else try{
    const params=new URLSearchParams({sport:r.sport,league:r.league,home:r.home,
      away:r.away,date:new Date(r.startMs).toISOString()});
    const res=await fetcher(base.replace(/\/+$/,"")+"/api/naver/lineup?"+params,{
      cache:"no-store",signal:AbortSignal.timeout(20000)});
    const data=await res.json();
    observation=res.ok?lineupEvidence(r,data,now()):
      {status:"UNAVAILABLE",reason:"LINEUP_HTTP_"+res.status};
  }catch(e){observation={status:"UNAVAILABLE",reason:"LINEUP_NETWORK:"+String(e).slice(0,90)}}
  const at=now();
  next=mergeLineupEvidence(next,r.key,observation,at);
  attempted++;
  reasons[observation.reason??observation.status]=(reasons[observation.reason??observation.status]??0)+1;
  if(observation.status==="CONFIRMED")confirmed++;
  else if(observation.status==="PARTIAL")partial++;
  else if(observation.status==="UNSUPPORTED")unsupported++;
  else unavailable++;
 }
 return {state:next,summary:{attempted,confirmed,partial,unavailable,unsupported,
  sharedEspnScoreboards:espnCache.size,reasonCounts:reasons}};
}
