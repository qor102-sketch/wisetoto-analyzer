// Read-only GitHub Actions source-format probe. Historical final pages are
// NEVER converted to PRE observations; inspect page shape only.
import {parseJleagueStartingXi,resolveJleagueOfficialLineup,jleagueLineupScheduleUrl} from "./jleague-official-lineup.mjs";
import {officialJ2Matches} from "./jleague-j2-final.mjs";
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


// Verify J1 day-list discovery independently of the lineup-page markup.
// Historical final page is read-only format evidence, never historical PRE.
const t=Date.parse("2026-11-07T07:00:00Z"); // official 16:00 JST KO
const sample={sport:"축구",league:"일본 J1리그",home:"가시와레이솔",
 away:"가와사키프론탈레",startMs:t};
const scheduleUrl=jleagueLineupScheduleUrl(sample);
try{
 const res=await fetch(scheduleUrl,{cache:"no-store",redirect:"error",
  signal:AbortSignal.timeout(8500),headers:{accept:"text/html","user-agent":"Mozilla/5.0"}});
 const body=res.ok?await res.text():"";
 const listed=officialJ2Matches(body),proof=resolveJleagueOfficialLineup(body,sample);
 console.log("JLEAGUE_OFFICIAL_J1_DAY_LIST "+JSON.stringify({
  http:res.status,bytes:body.length,parsed:listed.ok,
  listedMatches:listed.matches?.length??0,
  exactFixture:proof.ok,gameId:proof.ok?proof.gameId:null,
  reason:proof.ok?null:proof.reason
 }));
}catch(e){
 console.log("JLEAGUE_OFFICIAL_J1_DAY_LIST "+JSON.stringify({
  sourceError:String(e?.name??"NETWORK").slice(0,50)}));
}
