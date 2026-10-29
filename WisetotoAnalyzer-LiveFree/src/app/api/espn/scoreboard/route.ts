// Keyless, score-only ESPN scoreboard proxy for verified postmatch fallback.
// ESPN is independently queried; we never infer a FINAL from a live score.
const CODES:Record<string,[string,string]>={
 nba:["basketball","nba"],mlb:["baseball","mlb"],
 "ita.1":["soccer","ita.1"],"eng.league_cup":["soccer","eng.league_cup"],
 "eng.1":["soccer","eng.1"],"esp.1":["soccer","esp.1"],
 "ger.1":["soccer","ger.1"],"fra.1":["soccer","fra.1"],
 "usa.1":["soccer","usa.1"],"ned.1":["soccer","ned.1"],
 "uefa.champions":["soccer","uefa.champions"],"uefa.europa":["soccer","uefa.europa"]
};
const DAY=86400000;
const safe=(v:unknown)=>typeof v==="string"?v.slice(0,160):null;
export async function GET(request:Request){
 const p=new URL(request.url).searchParams;
 const league=p.get("league")??"",date=p.get("date")??"";
 if(!CODES[league]||!/^20\d{6}$/.test(date)||
  !Number.isFinite(Date.parse(date.slice(0,4)+"-"+date.slice(4,6)+"-"+date.slice(6,8)+"T00:00:00Z")))
  return Response.json({ok:false,waitReason:"INVALID_SCOREBOARD_PARAMETERS"},{status:400});
 const at=Date.parse(date.slice(0,4)+"-"+date.slice(4,6)+"-"+date.slice(6,8)+"T00:00:00Z");
 if(at<Date.now()-43*DAY||at>Date.now()+8*DAY)
  return Response.json({ok:false,waitReason:"SCOREBOARD_DATE_OUTSIDE_AUDIT_WINDOW"},{status:400});
 const [sport,code]=CODES[league];
 const url="https://site.api.espn.com/apis/site/v2/sports/"+sport+"/"+code+
  "/scoreboard?"+new URLSearchParams({dates:date,limit:"500"});
 try{
  const res=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7500),
   headers:{accept:"application/json","user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12.34"}});
  if(!res.ok)return Response.json({ok:false,
   waitReason:"ESPN_PROVIDER_HTTP_"+res.status},{status:502});
  const payload=await res.json().catch(()=>null);
  if(!payload||!Array.isArray(payload.events))
   return Response.json({ok:false,waitReason:"ESPN_SCOREBOARD_INVALID"},{status:502});
  const events=payload.events.slice(0,500).map((e:any)=>({
   id:safe(e.id),date:safe(e.date),name:safe(e.name),
   completed:e.status?.type?.completed===true,
   statusName:safe(e.status?.type?.name),
   statusDescription:safe(e.status?.type?.description),
   competitors:(Array.isArray(e.competitions?.[0]?.competitors)?
     e.competitions[0].competitors:[]).slice(0,2).map((c:any)=>({
    homeAway:c.homeAway==="home"?"home":c.homeAway==="away"?"away":null,
    name:safe(c.team?.displayName),
    shortName:safe(c.team?.shortDisplayName),
    abbreviation:safe(c.team?.abbreviation),
    score:typeof c.score==="number"||typeof c.score==="string"?String(c.score).slice(0,8):null
   }))
  }));
  return Response.json({ok:true,source:"ESPN_SCOREBOARD",league,events},
   {headers:{"cache-control":"no-store"}});
 }catch(e){
  return Response.json({ok:false,waitReason:"ESPN_NETWORK:"+String(e).slice(0,110)},{status:504});
 }
}
