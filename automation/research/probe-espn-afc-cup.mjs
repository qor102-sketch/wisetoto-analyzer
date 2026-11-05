// Read-only source evidence probe. Never modifies collected/official PRE data.
import {parseEspnFinal} from "./espn-fast-final.mjs";
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
  if(date==="20261103"&&response.ok&&Array.isArray(root?.events)){
   const normalized=matches.map(e=>({
    id:String(e.id??""),date:e.date,completed:e.status?.type?.completed===true,
    statusName:e.status?.type?.name,
    competitors:(e.competitions?.[0]?.competitors??[]).map(c=>({
     homeAway:c.homeAway,name:c.team?.displayName,score:c.score==null?null:String(c.score)
    }))
   }));
   const cases=[
    ["이스트 벵골","알시브 클럽","2026-11-03T13:45:00Z","401912771",0,2],
    ["J알후세인","알쇼르타","2026-11-03T16:00:00Z","401912770",0,3]
   ];
   const proofs=cases.map(([home,away,date,id,homeScore,awayScore])=>{
    const p=parseEspnFinal({ok:true,league:"afc.cup",events:normalized},{
     sport:"축구",league:"AFC 챔피언스리그2",home,away,startMs:Date.parse(date)
    },{now:Date.parse("2026-11-05T00:00:00Z")});
    return {id,verified:p.ok&&p.gameId===id&&p.result.homeScore===homeScore&&
      p.result.awayScore===awayScore,reason:p.waitReason??null};
   });
   console.log("AFC_CUP_ESPN_REAL_IDENTITY_PROOFS "+JSON.stringify(proofs));
   if(proofs.some(x=>!x.verified))process.exitCode=1;
  }
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
