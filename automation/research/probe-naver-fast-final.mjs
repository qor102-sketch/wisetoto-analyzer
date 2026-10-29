// Live no-secrets connectivity probe for GitHub PR smoke. Diagnostic only:
// never modifies an evidence ledger and never invents finals or fails a build
// solely because a third-party schedule provider is temporarily unavailable.
import {scheduleUrls,kstDate} from "./naver-fast-final.mjs";
const probeDate=Date.now()-24*3600000;
const sources=[
 {sport:"축구",league:"잉글랜드 프리미어리그",home:"N/A",away:"N/A",startMs:probeDate},
 {sport:"농구",league:"NBA",home:"N/A",away:"N/A",startMs:probeDate},
 {sport:"야구",league:"NPB",home:"N/A",away:"N/A",startMs:probeDate}
];
for(const sport of sources){
 const url=scheduleUrls(sport)[0];
 const query=new URL(url);
 try{
  const response=await fetch(url,{cache:"no-store",
   headers:{accept:"application/json, text/plain, */*",
    referer:"https://m.sports.naver.com/",
    "user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12"},
   signal:AbortSignal.timeout(7000)});
  let v=null;
  if(response.ok)v=await response.json().catch(()=>null);
  const rows=v?.result?.games??v?.games??v?.data?.games;
  const sample=Array.isArray(rows)?rows.slice(0,2).map(g=>({
   id:!!(g.gameId??g.game_id),date:!!(g.gameDateTime??g.gameDate),
   home:!!(g.homeTeamName??g.homeTeamShortName),scoreFields:Object.keys(g).filter(k=>/score|status/i.test(k)).slice(0,9)
  })):[];
  console.log("LIVE_NAVER_SCHEDULE_PROBE",JSON.stringify({
   sport:sport.sport,date:kstDate(probeDate),upperCategoryId:query.searchParams.get("upperCategoryId"),
   http:response.status,apiSuccess:v?.success??null,rows:Array.isArray(rows)?rows.length:null,
   sample,verifiedFinals:0,readOnly:true}));
 }catch(e){console.log("LIVE_NAVER_SCHEDULE_PROBE",JSON.stringify({
  sport:sport.sport,networkError:String(e).slice(0,100),verifiedFinals:0,readOnly:true}));}
}
