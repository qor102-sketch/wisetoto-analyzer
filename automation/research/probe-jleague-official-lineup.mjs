// Read-only GitHub Actions source-format probe. Historical final pages are
// NEVER converted to PRE observations; inspect page shape only.
import {parseJleagueStartingXi} from "./jleague-official-lineup.mjs";
const urls=[
 "https://www.jleague.jp/en/match/j1/2026/110711/lineup/",
 "https://www.jleague.jp/en/match/j2/2026/110808/lineup/"
];
for(const url of urls){
 const division=url.includes("/j1/")?"J1":"J2";
 try{
  const resp=await fetch(url,{redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(8500),headers:{"user-agent":"Mozilla/5.0",
    accept:"text/html"}});
  const html=resp.ok?await resp.text():"";
  const parsed=parseJleagueStartingXi(html);
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")
   .replace(/\s+/g," ");
  const heading=visible.search(/Starting Lineup/i);
  const bench=visible.search(/Substitutes/i);
  const starts=(visible.match(/\b(?:GK|DF|MF|FW)\s+\d{1,3}\b/g)??[]).length;
  console.log("JLEAGUE_OFFICIAL_LINEUP_FORMAT "+JSON.stringify({
   division,http:resp.status,bytes:html.length,hasFlight:html.includes("self.__next_f.push"),
   hasStartingHeading:heading>=0,hasSubstitutes:bench>=0,
   positionsOnPage:starts,parsed:parsed.ok,
   reason:parsed.ok?null:parsed.reason,
   homeCount:parsed.ok?parsed.home.length:0,
   awayCount:parsed.ok?parsed.away.length:0
  }));
 }catch(e){console.log("JLEAGUE_OFFICIAL_LINEUP_FORMAT "+JSON.stringify({
   division,network:String(e?.name??"Error").slice(0,60),parsed:false}));
 }
}
