// Strict PRE-only ESPN announced XI. Never use a postmatch box score,
// generic team roster or a later fetch to backfill PRE.
import {espnLeague,findEspnFixtureEvent} from "./espn-fast-final.mjs";
const norm=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const ms=60_000;
const scoreboardDates=fixture=>{
 const utc=new Date(fixture.startMs).toISOString().slice(0,10).replace(/-/g,"");
 const prev=new Date(fixture.startMs-12*3600_000).toISOString().slice(0,10).replace(/-/g,"");
 return [...new Set(["usa.1"].includes(espnLeague(fixture))?[utc,prev]:[utc])];
};
export const espnLineupLeague=fixture=>fixture.sport==="축구"?espnLeague(fixture):null;
export function parseEspnPregameXi(payload,fixture,event,at){
 if(!Number.isFinite(at)||at>=fixture.startMs)
  return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 if(!payload?.ok||payload.source!=="ESPN_MATCH_SUMMARY"||
   payload.league!==event.league||String(payload.eventId)!==String(event.gameId))
  return {status:"UNAVAILABLE",reason:"ESPN_EVENT_ID_UNCONFIRMED"};
 const kickoff=Date.parse(String(payload.eventDate??""));
 if(!Number.isFinite(kickoff)||Math.abs(kickoff-fixture.startMs)>90*ms||
    Math.abs(kickoff-Date.parse(String(event.event.date)))>15*ms)
  return {status:"UNAVAILABLE",reason:"ESPN_KICKOFF_IDENTITY_UNCONFIRMED"};
 const exact=(v,side)=>Array.isArray(v)&&v.length===1&&v[0].homeAway===side;
 const head=payload.headerTeams??[],roster=payload.rosters??[];
 const headerHome=head.filter(v=>v?.homeAway==="home");
 const headerAway=head.filter(v=>v?.homeAway==="away");
 const home=roster.filter(v=>v?.homeAway==="home");
 const away=roster.filter(v=>v?.homeAway==="away");
 if(!exact(headerHome,"home")||!exact(headerAway,"away")||
   !exact(home,"home")||!exact(away,"away"))
  return {status:"UNAVAILABLE",reason:"ESPN_LINEUP_TEAMS_MISSING_OR_AMBIGUOUS"};
 const sourceHome=event.event.competitors.find(v=>v.homeAway==="home")?.name;
 const sourceAway=event.event.competitors.find(v=>v.homeAway==="away")?.name;
 // Header + roster team labels must match exactly the independently
 // matched scoreboard's source labels. No fuzzy match after fixture proof.
 if([headerHome[0].name,home[0].name].some(x=>norm(x)!==norm(sourceHome))||
    [headerAway[0].name,away[0].name].some(x=>norm(x)!==norm(sourceAway)))
  return {status:"UNAVAILABLE",reason:"ESPN_LINEUP_SCOREBOARD_TEAM_MISMATCH"};
 const names=side=>{
  const raw=side.starters;
  if(!Array.isArray(raw)||raw.length>11)return null;
  const list=raw.map(x=>String(x??"").trim()).filter(Boolean);
  return list.length===raw.length&&new Set(list.map(norm)).size===list.length?list:null;
 };
 const h=names(home[0]),a=names(away[0]);
 if(h===null||a===null)return {status:"UNAVAILABLE",reason:"ESPN_INVALID_STARTER_NAMES"};
 if(h.length===0&&a.length===0)return {status:"UNAVAILABLE",reason:"ESPN_XI_NOT_PUBLISHED"};
 return {status:h.length===11&&a.length===11?"CONFIRMED":"PARTIAL",
  reason:h.length===11&&a.length===11?"ESPN_VERIFIED_PREGAME_XI":"ESPN_PARTIAL_PREGAME_XI",
  source:"ESPN_MATCH_SUMMARY",gameId:String(event.gameId),capturedAt:at,
  home:h,away:a,homeCount:h.length,awayCount:a.length,
  homeStarter:null,awayStarter:null,providerCapturedAt:null};
}
export async function lookupEspnPregameXi(fixture,{
 base,fetchFn=fetch,now=Date.now(),cache=new Map(),timeoutMs=8500
}={}){
 const league=espnLineupLeague(fixture);
 if(!league)return {status:"UNAVAILABLE",reason:"ESPN_LEAGUE_UNSUPPORTED"};
 if(!base)return {status:"UNAVAILABLE",reason:"ESPN_PROXY_BASE_REQUIRED"};
 if(now>=fixture.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 let error="ESPN_EXACT_FIXTURE_NOT_FOUND";
 for(const date of scoreboardDates(fixture)){
  const url=base.replace(/\/+$/,"")+"/api/espn/scoreboard?"+
   new URLSearchParams({league,date});
  let response=cache.get(url);
  if(!response){
   try{
    const res=await fetchFn(url,{cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
    const value=typeof res.json==="function"?await res.json().catch(()=>null):null;
    response=res.ok&&value?.ok===true?{ok:true,payload:value}:
     {ok:false,reason:"ESPN_SCOREBOARD_HTTP_"+res.status+":"+
       String(value?.waitReason??"UNAVAILABLE").slice(0,70)};
   }catch(e){response={ok:false,reason:"ESPN_SCOREBOARD_NETWORK:"+String(e).slice(0,100)};}
   cache.set(url,response);
  }
  if(!response.ok){error=response.reason;continue;}
  const match=findEspnFixtureEvent(response.payload,fixture,{league});
  if(!match.ok){error=match.waitReason;continue;}
  const summaryUrl=base.replace(/\/+$/,"")+"/api/espn/lineup?"+
   new URLSearchParams({league,event:match.gameId});
  // Do not share a stale lineup snapshot across scheduled scans.
  let lineup;
  try{
   const res=await fetchFn(summaryUrl,{cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
   const value=typeof res.json==="function"?await res.json().catch(()=>null):null;
   if(!res.ok||value?.ok!==true)return {status:"UNAVAILABLE",
    reason:"ESPN_LINEUP_HTTP_"+res.status+":"+String(value?.waitReason??"UNAVAILABLE").slice(0,70)};
   lineup=value;
  }catch(e){return {status:"UNAVAILABLE",reason:"ESPN_LINEUP_NETWORK:"+String(e).slice(0,100)}}
  return parseEspnPregameXi(lineup,fixture,{...match,league},now);
 }
 return {status:"UNAVAILABLE",reason:error};
}
