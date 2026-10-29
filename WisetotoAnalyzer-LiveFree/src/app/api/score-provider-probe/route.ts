// Temporary read-only diagnostics of candidate independent final-score providers.
// No credentials, no game state, no mutable predictions, no arbitrary URLs.
export async function GET(request:Request){
 const u=new URL(request.url),date=u.searchParams.get("date")??"";
 if(!/^20\d{2}-\d\d-\d\d$/.test(date))return Response.json({ok:false},{status:400});
 const key=date.replace(/-/g,"");
 const targets=[
  ["ESPN_NBA","https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates="+key],
  ["ESPN_EPL","https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates="+key],
  ["ESPN_SERIEA","https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates="+key],
  ["THESPORTSDB","https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d="+date+"&s=Soccer"]
 ];
 const results=await Promise.all(targets.map(async ([name,url])=>{
  try{
   const response=await fetch(url,{cache:"no-store",
    headers:{accept:"application/json","user-agent":"Mozilla/5.0 (compatible; WisetotoResultCheck/1.0)"},
    signal:AbortSignal.timeout(6000)});
   const data=response.ok?await response.json().catch(()=>null):null;
   const events=data?.events??data?.results??data?.data;
   return {source:name,http:response.status,ok:response.ok,
    count:Array.isArray(events)?events.length:null,
    sample:Array.isArray(events)?events.slice(0,1).map((x:any)=>({
      id:!!(x.id??x.idEvent),name:String(x.name??x.strEvent??"").slice(0,100),
      date:x.date??x.dateEvent??null,
      completed:x.status?.type?.completed??x.status?.name??x.strStatus??null,
      competitions:Array.isArray(x.competitions)?x.competitions.length:null
    })):[]};
  }catch(e){return {source:name,error:String(e).slice(0,110)}}
 }));
 return Response.json({readOnly:true,results},{headers:{"cache-control":"no-store"}});
}
