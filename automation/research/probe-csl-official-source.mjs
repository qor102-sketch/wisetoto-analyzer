// Read-only ESPN Chinese Super League (chn.1) provider coverage audit.
// A Chinese-language name, shared kickoff, event ID or score alone NEVER
// settles a Betman fixture. This script reports observed source labels only.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {espnLeague,espnScoreboardDates,findEspnFixtureEvent,parseEspnFinal}
 from "./espn-fast-final.mjs";
const path=process.argv[2];
if(!path)throw Error("PERSISTED_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(path,"utf8"));
if(!Array.isArray(state.records))throw Error("INVALID_LEDGER");
const now=Date.now(),day=86400000;
const fixtures=state.records.filter(r=>!isNbaGame(r)&&r.verdict==="PENDING"&&
 r.sport==="축구"&&espnLeague(r)==="chn.1"&&
 Number.isFinite(r.startMs)&&r.startMs<now-day);
const days=[...new Set(fixtures.flatMap(espnScoreboardDates))];
const responses=new Map(),errors=[];
for(const date of days.slice(0,9)){
 const url="https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard?"+
  new URLSearchParams({dates:date,limit:"500"});
 try{
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(8500),
   headers:{accept:"application/json"}});
  const body=response.ok?await response.json().catch(()=>null):null;
  if(!response.ok||!Array.isArray(body?.events)){
   errors.push({date,http:response.status});continue;
  }
  responses.set(date,{ok:true,league:"chn.1",events:body.events.slice(0,500).map(e=>({
   id:String(e.id??""),date:e.date,completed:e.status?.type?.completed===true,
   statusName:e.status?.type?.name,
   competitors:(e.competitions?.[0]?.competitors??[]).map(c=>({
    homeAway:c.homeAway,name:c.team?.displayName,shortName:c.team?.shortDisplayName,
    teamId:c.team?.id,score:c.score
   }))
  }))});
 }catch(e){errors.push({date,error:String(e).slice(0,100)})}
}
const details=fixtures.slice(0,30).map(f=>{
 const candidates=new Map(),checked=[];
 for(const date of espnScoreboardDates(f)){
  const source=responses.get(date);
  if(!source)continue;
  checked.push(date);
  for(const e of source.events){
   const at=Date.parse(String(e.date??""));
   if(!/^\d+$/.test(String(e.id??""))||!Number.isFinite(at)||
    Math.abs(at-f.startMs)>120*60000)continue;
   const home=e.competitors?.find(x=>x.homeAway==="home");
   const away=e.competitors?.find(x=>x.homeAway==="away");
   if(!home||!away)continue;
   candidates.set(e.id,{id:e.id,deltaMinutes:Math.round((at-f.startMs)/60000),
    home:home.name,away:away.name,homeShort:home.shortName,
    awayShort:away.shortName,homeId:home.teamId,awayId:away.teamId,
    completed:e.completed,status:e.statusName,
    score:String(home.score??"?")+":"+String(away.score??"?")});
  }
 }
 let strictFinal=null;
 for(const date of checked){
  const matched=findEspnFixtureEvent(responses.get(date),f);
  if(!matched.ok)continue;
  const result=parseEspnFinal(responses.get(date),f,{now});
  if(result.ok)strictFinal={eventId:result.gameId,source:result.source};
 }
 return {league:f.league,home:f.home,away:f.away,kickoff:new Date(f.startMs).toISOString(),
  checkedDays:checked,strictFinal,candidates:[...candidates.values()].slice(0,20)};
});
console.log("CSL_ESPN_READONLY "+JSON.stringify({records:state.records.length,
 overdueCSL:fixtures.length,daysQueried:days.length,
 sourceDaysSuccess:responses.size,errors,details,readOnly:true,
 policy:"NO_NBA; STRICT_2_SIDES_LEAGUE_KICKOFF_ID_FINAL"}));
