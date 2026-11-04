// Strictly read-only J.LEAGUE source probe for CI.
// Logs structural diagnostics only; no team names, scores or raw HTML.
const sample="2026-11-03";
const endpoints=[
 "https://www.jleague.jp/en/j2/match/search-list/?"+
  new URLSearchParams({category:"j2",period:"custom",startdate:sample,enddate:sample}),
 "https://www.jleague.jp/en/match/j2/2026/110307/"
];
for(const url of endpoints){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(11000),
   headers:{accept:"text/html","user-agent":"Mozilla/5.0 (Wisetoto Analyzer read-only fixture audit)"},
   redirect:"error",cache:"no-store"});
  const html=await response.text();
  const ids=[...html.replaceAll("\\/","/").matchAll(/\/(?:en\/)?match\/j2\/(2026)\/(\d{6})/gi)]
   .map(m=>m[2]);
  const chunks=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)];
  const decoded=chunks.map(m=>{try{return JSON.parse(m[1])}catch{return ""}}).join("");
  const keyCounts=Object.fromEntries(["homeTeam","awayTeam","playerScoreList","matchStatus","matchState","status","score","date"].map(k=>
   [k,(decoded.match(new RegExp('"'+k+'":','g'))??[]).length]));
  // Read only match identity/status field values, not article or lineup data.
  function parseValue(text,key){
   let p=text.indexOf('"'+key+'":');if(p<0)return null;
   p+=key.length+3;const open=text[p];
   if(open!=="["&&open!=="{")return null;
   let close,depth=0,quote=false,escaped=false;
   for(let i=p;i<Math.min(text.length,p+85000);i++){
    const ch=text[i];
    if(quote){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')quote=false;continue;}
    if(ch==='"'){quote=true;continue;}
    if(ch==="["||ch==="{")depth++;
    if(ch==="]"||ch==="}"){depth--;if(depth===0){close=i+1;break;}}
   }
   if(close===undefined)return null;
   try{return JSON.parse(text.slice(p,close))}catch{return null}
  }
  const matches=parseValue(decoded,"matches");
  const matchDates=[...decoded.matchAll(/"matchDate":"([^"]+)"/g)].slice(0,5).map(m=>m[1]);
  console.log("JLEAGUE_J2_RECORDS "+JSON.stringify({
   kind:endpoints.indexOf(url)?"detail":"listing",
   parseOk:Array.isArray(matches),matchDates,
   sample:Array.isArray(matches)?matches.slice(0,3).map(e=>({
    id:e.id,state:e.state,detailHref:e.detailHref,time:e.time,
    home:e.homeTeam?{name:e.homeTeam.name,fullName:e.homeTeam.fullName,score:e.homeTeam.score}:null,
    away:e.awayTeam?{name:e.awayTeam.name,fullName:e.awayTeam.fullName,score:e.awayTeam.score}:null
   })):null
  }));
  if(endpoints.indexOf(url)===0){
   const {officialJ2Matches,parseJleagueJ2Final}=await import("./jleague-j2-final.mjs");
   const parsed=officialJ2Matches(html);
   const anchor=decoded.indexOf('"matchDate":"$D2026-11-03');
   const around=anchor>=0?decoded.slice(anchor,anchor+260):"NOT_FOUND";
   const probe=parseJleagueJ2Final(html,{
    key:"probe-only",sport:"축구",league:"일본 J2리그",
    home:"카탈레 도야마",away:"베갈타 센다이",
    startMs:Date.parse("2026-11-03T05:00:00Z")
   },{now:Date.parse("2026-11-04T05:00:00Z")});
   // A successfully retrieved official source must actually parse the exact
   // publicly completed historical fixture before this adapter can roll out.
   if(response.ok&&(!parsed.ok||!probe.ok||probe.gameId!=="2026/110307"||
     probe.result.homeScore!==1||probe.result.awayScore!==0)){
    process.exitCode=1;
    console.error("JLEAGUE_J2_LIVE_PARSER_REJECTED_"+String(probe.waitReason??parsed.reason??"IDENTITY"));
   }
   console.log("JLEAGUE_J2_LIVE_ADAPTER "+JSON.stringify({
    parsed:parsed.ok,reason:parsed.reason,count:parsed.matches?.length,
    first:parsed.matches?.slice(0,2).map(x=>({
     id:x.id,state:x.state,detailHref:x.detailHref,time:x.time,
     matchDate:x.officialDate,home:x.homeTeam?.fullName??x.homeTeam?.name,
     away:x.awayTeam?.fullName??x.awayTeam?.name,
     homeScore:x.homeTeam?.score,awayScore:x.awayTeam?.score
    })),
    officialFixtureProof:probe,segmentAroundMatchDate:around.slice(0,260)
   }));
  }
  const structure=[];
  for(const tag of ['"homeTeam":','"awayTeam":','"matchId":','"matchStatus":','"statusName":','"score":']){
   const at=decoded.indexOf(tag);
   const keys=at>=0?[...decoded.slice(Math.max(0,at-300),at+900).matchAll(/"([a-zA-Z][a-zA-Z0-9_]*)":/g)]
    .map(x=>x[1]).slice(0,35):[];
   structure.push({tag,at,keys});
  }
  const idAt=html.indexOf("110307");
  const idContext=idAt>=0?html.slice(Math.max(0,idAt-105),idAt+65)
   .replace(/[^a-zA-Z0-9\\/=?.:"'_%+-]/g," "):"";
  console.log("JLEAGUE_J2_SHAPE "+JSON.stringify({kind:endpoints.indexOf(url)?"detail":"listing",
   structure,idContext}));
  console.log("JLEAGUE_J2_PROBE "+JSON.stringify({kind:endpoints.indexOf(url)?"detail":"listing",status:response.status,
   length:html.length,contentType:response.headers.get("content-type"),
   uniqueIds:[...new Set(ids)].length,idSample:[...new Set(ids)].slice(0,15),
   nextChunks:chunks.length,nextDecodedLength:decoded.length,keys:keyCounts,
   pageFullTime:/Full Time|試合終了/i.test(html),hasDate:/2026-11-03|2026\\-11\\-03/.test(html)}));
 }catch(e){
  console.log("JLEAGUE_J2_PROBE "+JSON.stringify({kind:endpoints.indexOf(url)?"detail":"listing",
   error:String(e).slice(0,160)}));
 }
}
