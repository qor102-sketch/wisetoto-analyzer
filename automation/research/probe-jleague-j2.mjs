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
  const ids=[...html.matchAll(/(?:\\?\/|%2F)(?:en\\?\/|%2F)?match(?:\\?\/|%2F)j2(?:\\?\/|%2F)(2026)(?:\\?\/|%2F)(\\d{6})/gi)]
   .map(m=>m[2]);
  const chunks=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)];
  const decoded=chunks.map(m=>{try{return JSON.parse(m[1])}catch{return ""}}).join("");
  const keyCounts=Object.fromEntries(["homeTeam","awayTeam","playerScoreList","matchStatus","matchState","status","score","date"].map(k=>
   [k,(decoded.match(new RegExp('"'+k+'":','g'))??[]).length]));
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
