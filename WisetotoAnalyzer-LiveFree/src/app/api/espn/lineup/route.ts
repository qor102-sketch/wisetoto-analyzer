// Read-only ESPN match-specific announced XI, not generic season rosters.
// Source sports/soccer/{league}/summary?event={id}. Never claim PRE on its own:
// collector independently proves the fixture and capture-before-kickoff time.
const LEAGUES=new Set(["ita.1","eng.league_cup","eng.1","eng.2","esp.1",
 "ger.1","fra.1","usa.1","ned.1","jpn.1","aus.1","uefa.champions","uefa.europa"]);
const safe=(v:unknown)=>typeof v==="string"?v.trim().slice(0,100):"";
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;
 const league=query.get("league")??"",event=query.get("event")??"";
 if(!LEAGUES.has(league)||!/^\d{6,10}$/.test(event))
  return Response.json({ok:false,waitReason:"INVALID_MATCH_LINEUP_PARAMETERS"},{status:400});
 try{
  const url="https://site.api.espn.com/apis/site/v2/sports/soccer/"+
   league+"/summary?event="+event;
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7000),
   headers:{accept:"application/json","user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12"}});
  if(!response.ok)return Response.json({ok:false,
   waitReason:"ESPN_SUMMARY_HTTP_"+response.status},{status:502});
  const data=await response.json().catch(()=>null);
  const competition=data?.header?.competitions?.[0];
  if(!data||String(data?.header?.id??competition?.id??"")!==event)
   return Response.json({ok:false,waitReason:"ESPN_EVENT_ID_UNCONFIRMED"},{status:409});
  const headerTeams=(Array.isArray(competition?.competitors)?competition.competitors:[])
   .map((c:any)=>({homeAway:c.homeAway==="home"?"home":c.homeAway==="away"?"away":null,
    name:safe(c.team?.displayName??c.team?.name)}));
  // Use only event-specific rosters with an explicit starter===true marker.
  const rosters=(Array.isArray(data.rosters)?data.rosters:[]).map((side:any)=>({
   homeAway:side.homeAway==="home"?"home":side.homeAway==="away"?"away":null,
   name:safe(side.team?.displayName??side.team?.name),
   starters:(Array.isArray(side.roster)?side.roster:[])
    .filter((p:any)=>p?.starter===true)
    .map((p:any)=>safe(p?.athlete?.displayName??p?.athlete?.fullName))
    .filter(Boolean).slice(0,12)
  }));
  return Response.json({ok:true,source:"ESPN_MATCH_SUMMARY",league,eventId:event,
   eventDate:safe(competition?.date),headerTeams,rosters},
   {headers:{"cache-control":"no-store"}});
 }catch(e){return Response.json({ok:false,
   waitReason:"ESPN_SUMMARY_NETWORK:"+String(e).slice(0,90)},{status:504})}
}
