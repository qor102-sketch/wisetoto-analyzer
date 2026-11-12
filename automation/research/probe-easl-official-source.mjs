// Independent EASL official schedule/news source audit. Read-only;
// no result transition without official schedule + recap match evidence.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
const file=process.argv[2];
if(!file)throw Error("EASL_PERSISTED_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(state.records))throw Error("EASL_INVALID_LEDGER");
const fixtureRows=state.records.filter(r=>!isNbaGame(r)&&
  r.sport==="농구"&&/동아시아\s*슈퍼리그|^EASL$/i.test(String(r.league??""))&&
  r.verdict==="PENDING"&&Number.isFinite(r.startMs));
const officialRecaps=[
 "game-recap-busan-kcc-egis-exerts-dominance-topple-taipei-fubon-braves",
 "game-recap-busan-kcc-dominates-with-wire-to-wire-win-over-macau-hou-chon",
 "game-recap-tsg-ghosthawks-defend-homecourt-with-thrilling-win-over-alvark-tokyo",
 "game-recap-hong-kong-eastern-earn-first-easl-victory-over-ryukyu-golden-kings",
 "game-recap-ryukyu-golden-kings-shine-bright-over-taoyuan-pauian-pilots-in-first-win-of-easl-season",
 "game-recap-nagasaki-velca-pulls-ahead-of-macau-hou-chon-for-first-easl-win",
 "game-recap-skygunners-complete-comeback-against-ghosthawks",
 "game-recap-busan-kcc-egis-rides-fourth-quarter-surge-to-win-on-the-road"
];
const recaps=[];
for(const slug of officialRecaps){
 const url="https://www.easl.basketball/news/"+slug;
 try{
  const res=await fetch(url,{signal:AbortSignal.timeout(8500),
   headers:{"accept":"text/html","user-agent":"Mozilla/5.0 (compatible; SourceAudit/1.0)"}});
  const html=res.ok?await res.text():"";
  const h=html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi," ")
   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi," ")
   .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
   .replace(/&amp;/gi,"&").replace(/&ndash;|&#8211;/gi,"-")
   .replace(/\s+/g," ");
  const part=h.indexOf("What Happened");
  const text=part<0?h.slice(0,1700):h.slice(part,part+1700);
  const scoreEvidence=[...text.matchAll(/\b(?:1\d\d|[1-9]\d)-\b(?:1\d\d|[1-9]\d)\b/g)].slice(0,10).map(m=>m[0]);
  recaps.push({slug,ok:res.ok,http:res.status,length:html.length,
   heading:(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]??"").slice(0,120),
   scores:scoreEvidence,opening:text.slice(0,900)});
 }catch(e){recaps.push({slug,ok:false,error:String(e).slice(0,100)})}
}
const scheduleUrl="https://www.easl.basketball/schedule-results";
let schedule={ok:false};
try{
 const r=await fetch(scheduleUrl,{signal:AbortSignal.timeout(12000)});
 const html=await r.text();
 schedule={ok:r.ok,http:r.status,length:html.length,
  fixtureMarkers:fixtureRows.slice(0,25).map(f=>{
   const utc=new Date(f.startMs).toISOString().slice(0,16);
   const pos=html.indexOf(utc);
   const chunk=pos<0?"":html.slice(Math.max(0,pos-1800),pos+3000);
   return {at:utc,occurrences:html.split(utc).length-1,
    nearText:chunk.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi," ")
     .replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,1200),
    nearbyLinks:[...chunk.matchAll(/href=["']([^"']+)["']/g)].slice(-16)
     .map(m=>m[1]).filter(x=>x.includes("/schedules/"))};
  })};
}catch(e){schedule={ok:false,error:String(e).slice(0,120)}}
console.log("EASL_OFFICIAL_SOURCE_AUDIT "+JSON.stringify({readOnly:true,excludedNba:true,
 ledgerRows:state.records.length,pendingEasl:fixtureRows.length,
 fixtures:fixtureRows.map(r=>({key:r.key,league:r.league,home:r.home,
  away:r.away,at:new Date(r.startMs).toISOString()})),
 schedule,recaps,policy:"NO_FINAL_FROM_SCHEDULE_OR_NEWS_PUBLISHED_AT_ALONE"}));
