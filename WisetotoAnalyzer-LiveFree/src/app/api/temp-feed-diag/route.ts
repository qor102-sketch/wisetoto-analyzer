// TEMPORARY READ-ONLY diagnostic. Deleted before merge.
export async function GET(req:Request){
 const u=new URL(req.url);
 const kind=u.searchParams.get("kind")??"oldProxy";
 const allowed:Record<string,string>={
 oldProxy:"https://champions-wishes-documented-modification.trycloudflare.com/betman",
 officialSite:"https://www.betman.co.kr/",
 nbaSummary:"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401909278",
 nbaEnded:"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401909277",
 nbaScore:"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261030",
 mlbSummary:"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401899111"};
 if(!allowed[kind])return Response.json({ok:false},{status:400});
 try{const res=await fetch(allowed[kind],{cache:"no-store",signal:AbortSignal.timeout(6000),
 headers:{accept:"application/json, text/plain, */*","user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12.34","referer":"https://www.espn.com/"}});
 const body=await res.text();
 let json:any=null;try{json=JSON.parse(body)}catch{}
 if(!kind.startsWith("nba"))
 return Response.json({kind,status:res.status,type:res.headers.get("content-type"),
 bytes:body.length,validJson:json!==null,ok:json?.ok??null,
 rootKeys:json?Object.keys(json).slice(0,15):[]});
 const rosters=(Array.isArray(json?.rosters)?json.rosters:[]).map((x:any)=>({
  side:x.homeAway,team:x.team?.displayName,count:x.roster?.length??null,
  starters:(x.roster??[]).filter((p:any)=>p.starter===true).length,
  sample:(x.roster??[]).slice(0,3).map((p:any)=>({
   name:p.athlete?.displayName,starter:p.starter,active:p.active}))}));
 const bx=(Array.isArray(json?.boxscore?.players)?json.boxscore.players:[]).map((x:any)=>({
  team:x.team?.displayName,groups:(x.statistics??[]).map((g:any)=>({
   label:g.name,athletes:g.athletes?.length,starters:(g.athletes??[]).filter((p:any)=>p.starter===true).length,
   sample:(g.athletes??[]).slice(0,2).map((p:any)=>({name:p.athlete?.displayName,starter:p.starter}))}))}));
 return Response.json({kind,status:res.status,keys:Object.keys(json??{}).slice(0,20),rosters,boxscore:bx,
 headerDate:json?.header?.competitions?.[0]?.date});
 }catch(e){return Response.json({kind,error:String(e).slice(0,130)})}
}