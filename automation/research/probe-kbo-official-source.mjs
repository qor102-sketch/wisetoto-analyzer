// Read-only check of KBO's own schedule API; does not grade any fixture.
const base="https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList";
for(const date of ["20261106","20261107"]){
 try{
  const res=await fetch(base,{method:"POST",cache:"no-store",
   signal:AbortSignal.timeout(9500),
   headers:{"content-type":"application/x-www-form-urlencoded; charset=UTF-8",
    accept:"application/json", "x-requested-with":"XMLHttpRequest",
    referer:"https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx",
    "user-agent":"Mozilla/5.0 (WisetotoAnalyzer official KBO source audit)"},
   body:new URLSearchParams({leId:"1",srId:"0,1,3,4,5,6,7,8,9",date})});
  const body=res.ok?await res.json().catch(()=>null):null;
  const games=Array.isArray(body?.game)?body.game:[];
  console.log("KBO_OFFICIAL_SOURCE_READONLY "+JSON.stringify({
   date,http:res.status,validSchema:Array.isArray(body?.game),
   count:games.length,sample:games.slice(0,6).map(g=>({
    sourceId:g.G_ID,seriesId:g.SR_ID,seasonId:g.SEASON_ID,
    date:g.G_DT,at:g.G_TM,home:g.HOME_NM,away:g.AWAY_NM,
    homeScore:g.B_SCORE_CN,awayScore:g.T_SCORE_CN,
    finalFlag:g.GAME_RESULT_CK,cancelCode:g.CANCEL_SC_ID,
    cancelName:g.CANCEL_SC_NM,fields:Object.keys(g).filter(k=>/SCORE|GAME|CANCEL|RESULT|G_|NM/.test(k)).slice(0,22)
   }))
  }));
 }catch(e){console.log("KBO_OFFICIAL_SOURCE_READONLY "+JSON.stringify({date,
  error:String(e).slice(0,150)}))}
}
