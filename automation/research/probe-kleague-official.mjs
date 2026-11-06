// Read-only evidence probes. Never certify a game from the probe output.
const queries=[{leagueId:1,year:"2026",month:"11"},{leagueId:2,year:"2026",month:"11"}];
for(const params of queries){
 try{
  const res=await fetch("https://www.kleague.com/getScheduleList.do",{
   method:"POST",signal:AbortSignal.timeout(10000),
   headers:{accept:"application/json, text/plain, */*","content-type":"application/json; charset=utf-8",
    "user-agent":"Mozilla/5.0 (Wisetoto Analyzer read-only source verification)"},
   body:JSON.stringify(params),cache:"no-store"});
  const raw=await res.json().catch(()=>null);
  const data=raw?.data??raw;
  const schedules=Array.isArray(data?.scheduleList)?data.scheduleList:[];
  const sample=schedules.filter(x=>/2026.11.0[1-6]/.test(String(x.gameDate??""))).slice(0,8);
  console.log("KLEAGUE_OFFICIAL_PROBE "+JSON.stringify({leagueId:params.leagueId,status:res.status,
   validSchema:Array.isArray(data?.scheduleList),count:schedules.length,fields:sample.length?Object.keys(sample[0]):[],
   sample:sample.map(x=>({gameId:x.gameId,leagueId:x.leagueId,year:x.year,meetSeq:x.meetSeq,
    date:x.gameDate,time:x.gameTime,homeTeam:x.homeTeamName,awayTeam:x.awayTeamName,
    homeScore:x.homeGoal,awayScore:x.awayGoal,status:x.gameStatus,endYn:x.endYn}))}));
 }catch(e){console.log("KLEAGUE_OFFICIAL_PROBE "+JSON.stringify({leagueId:params.leagueId,error:String(e).slice(0,180)}))}
}
