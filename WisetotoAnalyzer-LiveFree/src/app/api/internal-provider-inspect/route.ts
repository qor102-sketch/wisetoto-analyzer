// Temporary PREVIEW provider shape probe. Remove before merging.
const candidates=["eng.2","jpn.1","jpn.2","kor.1","kor.2","aus.1","afc.champions.league",
 "afc.champions.league.elite","usa.1","eng.1","ita.1","nba"];
export async function GET(req:Request){
 const params=new URL(req.url).searchParams;
 const league=params.get("league")??"ita.1",kind=params.get("kind")??"scoreboard";
 if(!candidates.includes(league)||!["summary","scoreboard"].includes(kind))
  return Response.json({ok:false},{status:400});
 const sport=league==="nba"?"basketball":"soccer";
 const event=params.get("event")??"401874993";
 if(!/^\d{6,10}$/.test(event))return Response.json({ok:false},{status:400});
 const addr="https://site.api.espn.com/apis/site/v2/sports/"+sport+"/"+league+"/"+
   (kind==="summary"?"summary?event="+event:"scoreboard?dates=20261030&limit=100");
 try{
  const res=await fetch(addr,{cache:"no-store",signal:AbortSignal.timeout(7500)});
  const data=res.ok?await res.json().catch(()=>null):null;
  if(kind==="scoreboard"){
   return Response.json({kind,league,http:res.status,events:data?.events?.length??null,
    sample:(data?.events??[]).slice(0,3).map((e:any)=>({id:e.id,date:e.date,name:e.name,
     teams:e.competitions?.[0]?.competitors?.map((c:any)=>c.team?.displayName)}))});
  }
  const list=(x:any)=>Array.isArray(x)?x:[];
  const keys=(x:any)=>x&&typeof x==="object"?Object.keys(x):[];
  return Response.json({kind,league,http:res.status,
   rootKeys:keys(data),lineupsType:typeof data?.lineups,lineupsKeys:keys(data?.lineups),
   lineupsSample:list(data?.lineups).slice(0,2).map((x:any)=>({
     keys:keys(x),team:x.team?.displayName??x.team?.name,
     sample:list(x.roster??x.athletes??x.players).slice(0,2).map((z:any)=>({
      keys:keys(z),name:z.athlete?.displayName??z.displayName,starter:z.starter,
      starting:z.starting,active:z.active}))})),
   rostersSample:list(data?.rosters).slice(0,2).map((x:any)=>({
     keys:keys(x),team:x.team?.displayName??x.team?.name,
     count:list(x.roster??x.athletes??x.players).length,
     sample:list(x.roster??x.athletes??x.players).slice(0,3).map((z:any)=>({
      keys:keys(z),name:z.athlete?.displayName??z.displayName,starter:z.starter,
      starting:z.starting,active:z.active}))})),
   boxscoreKeys:keys(data?.boxscore),boxscorePlayers:list(data?.boxscore?.players).slice(0,2).map((x:any)=>({
    keys:keys(x),team:x.team?.displayName,stats:list(x.statistics).slice(0,2).map((y:any)=>({
     keys:keys(y),athletes:list(y.athletes).slice(0,2).map((z:any)=>({
     keys:keys(z),name:z.athlete?.displayName??z.displayName,starter:z.starter}))}))})),
   headerKeys:keys(data?.header),
   headerCompetitions:list(data?.header?.competitions).slice(0,1).map((x:any)=>({
    keys:keys(x),teams:list(x.competitors).map((c:any)=>({id:c.id,name:c.team?.displayName,homeAway:c.homeAway}))}))
  });
 }catch(e){return Response.json({kind,league,networkError:String(e).slice(0,100)},{status:504})}
}
