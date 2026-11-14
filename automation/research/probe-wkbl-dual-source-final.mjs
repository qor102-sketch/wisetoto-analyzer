// Real, read-only original-ledger WKBL coverage probe. Two independent
// sources are needed: official league scoreboard AND postmatch published
// trusted wire result. Never settle from a bare posted score or clock.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
const path=process.argv[2];
if(!path)throw Error("WKBL_SOURCE_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(path,"utf8"));
if(!Array.isArray(state.records))throw Error("WKBL_SOURCE_LEDGER_INVALID");
const now=Date.now();
const pending=state.records.filter(r=>!isNbaGame(r)&&r.sport==="농구"&&
 /^(WKBL|여자프로농구)$/i.test(String(r.league))&&r.verdict==="PENDING"&&
 now-r.startMs>=86400000);
const entries=[
 ["04701004","AKR20261106185500007"],
 ["04701005","AKR20261107038200007"],
 ["04701006","AKR20261107046500007"],
 ["04701007","AKR20261108044600007"],
 ["04701008","AKR20261109156800007"],
 ["04701009","AKR20261111178100007"]
];
const audit=[];
for(const [gameId,wireId] of entries){
 const urls=["https://datalab.wkbl.or.kr/gameinfo?id="+gameId,
  "https://www.yna.co.kr/view/"+wireId];
 const sources=[];
 for(const [index,url] of urls.entries()){
  try{
   const r=await fetch(url,{cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(10000),headers:{accept:"text/html",
      "user-agent":"Mozilla/5.0 (Wisetoto read-only postmatch audit)"}});
   const html=r.ok?await r.text():"",clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&").replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_,hex,num)=>
      String.fromCodePoint(parseInt(hex??num,hex?16:10))).replace(/\s+/g," ");
   const dateHits=[...clean.matchAll(/2026년\s*11월\s*\d{1,2}일/g)].slice(0,3).map(m=>m[0]);
   const keywords=["경기정보","PLAY BY PLAY","신한은행","삼성생명",
    "BNK 썸","우리은행","하나은행","KB스타즈","송고","전적","경기종료"];
   const found={};
   for(const k of keywords){
    const at=clean.indexOf(k);
    if(at>=0)found[k]=clean.slice(Math.max(0,at-45),at+140).slice(0,170);
   }
   const title=html.match(/<title[^>]*>([^<]{1,260})<\/title>/i)?.[1]??"";
   // Bounded source excerpts for proof-shape only; no copied article.
   let pivot=index===0?clean.indexOf(" / "):clean.indexOf("전적");
   if(pivot<0)pivot=clean.indexOf("2026년 11월");
   sources.push({kind:index?"WIRE_POSTMATCH":"WKBL_OFFICIAL",http:r.status,ok:r.ok,
    bytes:html.length,title:title.slice(0,180),dates:dateHits,
    opening:clean.slice(0,index?440:260),found,
    lastStatusTerm:html.includes("gameStatus")?"gameStatus":"none"});
  }catch(e){sources.push({kind:index?"WIRE_POSTMATCH":"WKBL_OFFICIAL",
    ok:false,error:String(e).slice(0,120)})}
 }
 audit.push({gameId,wireId,sources});
}
console.log("WKBL_DUAL_SOURCE_REAL_AUDIT "+JSON.stringify({readOnly:true,excludedNba:true,
 originalRecords:state.records.length,overdueWKBL:pending.length,
 pendingFixtures:pending.map(r=>({home:r.home,away:r.away,
 at:new Date(r.startMs).toISOString()})),audit,
 policy:"NO_FINAL_FROM_WKBL_SCORE_ALONE_OR_PUBLISHED_PREVIEW"}));
