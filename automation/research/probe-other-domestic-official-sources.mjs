// Read-only coverage/format discovery for WKBL and KOVO official
// sources, without outputting website JS, private data or modifying results.
const sites=[
 ["KOVO","https://kovo.co.kr/"],
 ["WKBL_DATALAB","https://datalab.wkbl.or.kr/gameinfo?id=04701009"],
 ["WKBL_SCHEDULE","https://www.wkbl.or.kr/game/sch/schedule1.asp"]
];
const results=[];
for(const [name,url] of sites){
 try{
  const r=await fetch(url,{cache:"no-store",
   signal:AbortSignal.timeout(7500),
   headers:{"user-agent":"Mozilla/5.0 (compatible; SourceCoverageAudit/1.0)",
    accept:"text/html"}});
  const html=await r.text().catch(()=>"");
  const rawScripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
   .map(m=>m[1]).filter(s=>s.startsWith("/")||/^https?:\/\//.test(s));
  const matched=(token)=>{
   const n=html.toLowerCase().indexOf(token.toLowerCase());
   return n<0?null:html.slice(Math.max(0,n-110),n+220)
    .replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,230);
  };
  const j={name,http:r.status,ok:r.ok,length:html.length,
   contentType:r.headers.get("content-type"),
   react:html.includes("__NEXT_DATA__")||html.includes("__next"),
   scripts:rawScripts.length,
   officialAPI:matched("user-api.kovo.co.kr"),
   finalMarker:matched("경기종료")??matched("FULL_TIME")??matched("종료"),
   novEight:matched("11.08")??matched("11/08")??matched("2026-11-08"),
   officialGameId:matched("04701009")};
  if(name==="KOVO"&&r.ok){
   const urls=rawScripts.filter(s=>/next\/static|assets|\.js/.test(s)).slice(0,4);
   const sources=[];
   for(const urlPath of urls){
    const u=new URL(urlPath,url);
    if(u.origin!==new URL(url).origin)continue;
    try{
     const code=await (await fetch(u,{signal:AbortSignal.timeout(4500)})).text();
     const hits=[...code.matchAll(/user-api\.kovo\.co\.kr/gi)].slice(0,3)
      .map(m=>code.slice(Math.max(0,m.index-90),m.index+220).slice(0,310));
     // Expose bounded literal route names only, never JS source bundles,
     // auth headers or cookies. This is discovery, NOT final evidence.
     const paths=[...new Set([...code.matchAll(/["'`]+(\/[a-zA-Z0-9_?=&%:;\/-]{4,150})["'`]+/g)]
       .map(x=>x[1]).filter(x=>/game|match|sched|season|round|volley|league|record|result/i.test(x)))].slice(0,45);
     const context=words=>words.map(word=>{
      const at=code.toLowerCase().indexOf(word);
      return at<0?null:{word,part:code.slice(Math.max(0,at-45),at+170).replace(/\s+/g," ")};
     }).filter(Boolean).slice(0,7);
     if(hits.length||paths.length)sources.push({asset:u.pathname.slice(0,150),
      hits:hits.map(s=>s.replace(/\s+/g," ")),
      routeSamples:paths,context:context(["/games/","/game/","/match/","/schedule/","/game-schedule","/records/"])});
    }catch{}
   }
   j.officialApiScriptEvidence=sources;
  }
  results.push(j);
 }catch(e){results.push({name,error:String(e).slice(0,120),ok:false})}
}
console.log("DOMESTIC_OFFICIAL_SOURCE_SURVEY "+JSON.stringify({
 readOnly:true,scope:"WKBL_AND_KOVO_ONLY_NO_NBA",results,
 note:"SOURCE_FORMAT_HEALTH_ONLY_NOT_FINAL_PROOF"
}));
