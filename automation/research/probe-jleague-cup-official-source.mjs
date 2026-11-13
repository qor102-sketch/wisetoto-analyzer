// Read-only official Levain Cup match-detail source audit (no ledger writes).
// Never settle based on a page title alone, a kickoff clock or a score
// embedded in an unrelated historical article.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
const file=process.argv[2];
if(!file)throw Error("JLEAGUE_CUP_ORIGINAL_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(state.records))throw Error("JLEAGUE_CUP_INVALID_LEDGER");
const now=Date.now(),rows=state.records.filter(r=>!isNbaGame(r)&&
  r.sport==="축구"&&r.league==="일본 리그컵"&&
  r.verdict==="PENDING"&&r.startMs<=now-86400000);
const pages=["111101","111102","111103","111104"];
const results=[];
for(const id of pages){
 const url="https://www.jleague.jp/match/leaguecup/2026/"+id+"/";
 try{
  const r=await fetch(url,{cache:"no-store",redirect:"error",
   signal:AbortSignal.timeout(11000),headers:{
    accept:"text/html","user-agent":"Mozilla/5.0 (Wisetoto independent source audit)"}});
  const raw=r.ok?await r.text():"";
  const clean=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
   .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
   .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
   .replace(/&amp;/gi,"&").replace(/\s+/g," ");
  const at=clean.indexOf("試合終了");
  const date=clean.indexOf("2026/11/11");
  const title=raw.match(/<title[^>]*>([^<]{2,350})<\/title>/i)?.[1]??"";
  const scripts=[...raw.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
   .slice(0,120).map(x=>{try{return JSON.parse(x[1])}catch{return ""}});
  const decoded=scripts.join("");
  const match=decoded.match(/"id":"(match-\d{8,})"/);
  results.push({id,status:r.status,ok:r.ok,size:raw.length,
   title:title.slice(0,260),cleanSize:clean.length,
   fulltimeAt:at,dateAt:date,hero:at<0?clean.slice(0,600):
    clean.slice(Math.max(0,at-160),at+350),
   dateContext:date<0?null:clean.slice(Math.max(0,date-40),date+250),
   nextFlightChars:decoded.length,flightId:match?.[1]??null,
   hasScoreKeys:decoded.includes('"homeTeam"')&&decoded.includes('"awayTeam"')});
 }catch(e){results.push({id,ok:false,error:String(e).slice(0,150)})}
}
console.log("JLEAGUE_CUP_DETAIL_AUDIT "+JSON.stringify({
 readOnly:true,noNba:true,pendingOverdue:rows.length,originalRows:state.records.length,
 overdueFixtures:rows.slice(0,12).map(r=>({league:r.league,home:r.home,
  away:r.away,at:new Date(r.startMs).toISOString()})),results
}));
