// Read-only source evidence probe. Never modifies collected/official PRE data.
const dates=["20261103","20261104"];
let reachable=0,events=0;
for(const date of dates){
 const url="https://site.api.espn.com/apis/site/v2/sports/soccer/afc.cup/scoreboard?"+
  new URLSearchParams({dates:date,limit:"500"});
 try{
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(9000),
    headers:{"accept":"application/json","user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12.34"}});
  const root=response.ok?await response.json():null;
  const matches=Array.isArray(root?.events)?root.events:[];
  if(response.ok&&Array.isArray(root?.events))reachable++;
  events+=matches.length;
  const rows=matches.slice(0,20).map(e=>{
   const c=e.competitions?.[0]?.competitors??[];
   const home=c.find(x=>x.homeAway==="home"),away=c.find(x=>x.homeAway==="away");
   return {id:String(e.id),date:e.date,home:home?.team?.displayName,
    away:away?.team?.displayName,completed:e.status?.type?.completed===true,
    state:e.status?.type?.name,score:home?.score!=null&&away?.score!=null?
     String(home.score)+":"+String(away.score):null};
  });
  console.log("AFC_CUP_ESPN_SOURCE "+JSON.stringify({date,status:response.status,count:matches.length,rows}));
 }catch(e){console.log("AFC_CUP_ESPN_SOURCE "+JSON.stringify({date,error:String(e).slice(0,130)}))}
}
console.log("AFC_CUP_ESPN_PROBE_SUMMARY "+JSON.stringify({reachable,events}));
