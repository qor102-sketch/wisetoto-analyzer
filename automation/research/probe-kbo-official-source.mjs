// Read-only check of KBO's own schedule API; does not grade any fixture.
import {parseOfficialKboFinal} from "./kbo-official-final.mjs";
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
  // Gate on two independently observed finished 2026 Korean Series games.
  // CI alone never upgrades the persisted game to VERIFIED.
  if(res.ok&&Array.isArray(body?.game)){
   const expect=date==="20261106"?
    {start:"2026-11-06T09:30:00Z",id:"20261106KTSS0",home:5,away:1}:
    {start:"2026-11-07T05:00:00Z",id:"20261107KTSS0",home:10,away:5};
   const fixture={sport:"야구",league:"KBO",home:"삼성 라이온즈",away:"KT 위즈",
    startMs:Date.parse(expect.start)};
   const actual=parseOfficialKboFinal(body,fixture,{now:Date.parse("2026-11-08T00:00:00Z")});
   console.log("KBO_OFFICIAL_LIVE_PROOF "+JSON.stringify({
    date,verified:actual.ok,id:actual.gameId??null,
    result:actual.result??null,reason:actual.waitReason??null,readOnly:true
   }));
   if(!actual.ok||actual.gameId!==expect.id||
     actual.result.homeScore!==expect.home||actual.result.awayScore!==expect.away)
    process.exitCode=1;
  }

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
