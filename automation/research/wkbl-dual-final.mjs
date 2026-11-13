// Independently verified WKBL 2026-27 finals: WKBL DataLab's EXACT
// game/teams/kickoff/score plus a trusted Yonhap postgame *final score report*.
// WKBL alone shows scheduled games with 0-0 and no explicit ended flag;
// therefore NEVER settle from the official scoreboard or elapsed time alone.
// Only these six source-audited originals are eligible. No NBA.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const MIN=60000,WKBL="https://datalab.wkbl.or.kr/gameinfo?id=";
const WIRE="https://www.yna.co.kr/view/";
const norm=x=>String(x??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣]/g,"");
const escaped=s=>String(s).replace(/[.*+?^$()|[\]{}\\]/g,"\\$&");
const fixtures=[
 {id:"04701004",date:"2026-11-06",time:"19:00",home:"하나은행",away:"KB 스타즈",
  wkHome:"하나은행",wkAway:"KB스타즈",venue:"부천체육관",wireVenue:"부천체육관",
  wireWinner:"KB",wireLoser:"하나은행",homeScore:69,awayScore:74,
  wireId:"AKR20261106185500007"},
 {id:"04701005",date:"2026-11-07",time:"14:00",home:"BNK 썸",away:"신한은행 에스버드",
  wkHome:"BNK 썸",wkAway:"신한은행",venue:"부산사직실내체육관",wireVenue:"부산 사직체육관",
  wireWinner:"신한은행",wireLoser:"BNK",homeScore:59,awayScore:68,
  wireId:"AKR20261107038200007"},
 {id:"04701006",date:"2026-11-07",time:"16:00",home:"우리은행 우리WON",away:"삼성생명 블루밍스",
  wkHome:"우리은행",wkAway:"삼성생명",venue:"아산이순신체육관",wireVenue:"아산이순신체육관",
  wireWinner:"우리은행",wireLoser:"삼성생명",homeScore:65,awayScore:54,
  wireId:"AKR20261107046500007"},
 {id:"04701007",date:"2026-11-08",time:"16:00",home:"BNK 썸",away:"하나은행",
  wkHome:"BNK 썸",wkAway:"하나은행",venue:"부산사직실내체육관",wireVenue:"부산 사직체육관",
  wireWinner:"BNK",wireLoser:"하나은행",homeScore:73,awayScore:65,
  wireId:"AKR20261108044600007"},
 {id:"04701008",date:"2026-11-09",time:"19:01",home:"KB 스타즈",away:"우리은행 우리WON",
  wkHome:"KB스타즈",wkAway:"우리은행",venue:"청주체육관",wireVenue:"청주체육관",
  wireWinner:"우리은행",wireLoser:"KB",homeScore:51,awayScore:57,
  wireId:"AKR20261109156800007"},
 {id:"04701009",date:"2026-11-11",time:"19:00",home:"신한은행 에스버드",away:"삼성생명 블루밍스",
  wkHome:"신한은행",wkAway:"삼성생명",venue:"인천도원체육관",wireVenue:"인천 도원체육관",
  wireWinner:"삼성생명",wireLoser:"신한은행",homeScore:51,awayScore:54,
  wireId:"AKR20261111178100007"}
];
export const auditedWkblGames=fixtures.map(x=>Object.freeze({...x}));
export const isOfficialWkblFixture=r=>r?.sport==="농구"&&
 /^(wkbl|여자프로농구)$/i.test(String(r?.league??"").trim());
const entryFor=r=>{
 if(!isOfficialWkblFixture(r)||!Number.isFinite(r.startMs))return null;
 const candidates=fixtures.filter(e=>norm(r.home)===norm(e.home)&&
  norm(r.away)===norm(e.away)&&
  Math.abs(r.startMs-Date.parse(e.date+"T"+e.time+":00+09:00"))<=20*MIN);
 return candidates.length===1?candidates[0]:null;
};
export const hasAuditedWkblFixture=r=>Boolean(entryFor(r));
const visible=html=>String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
 .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
 .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
 .replace(/&amp;/gi,"&").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,h,d)=>
 String.fromCodePoint(parseInt(h??d,h?16:10))).replace(/\s+/g," ").trim();
function parseOfficial(html,e,fixture){
 if(typeof html!=="string"||html.length<800||html.length>1_500_000)
  return {ok:false,reason:"WKBL_OFFICIAL_DOCUMENT_MISSING"};
 const text=visible(html);
 if(!text.includes("WKBL 데이터랩")||!text.includes("경기정보")||
  !text.includes("PLAY BY PLAY"))return {ok:false,reason:"WKBL_OFFICIAL_GAME_RECORD_MISSING"};
 const date=e.date.split("-"),day=Number(date[2]),month=Number(date[1]);
 const marker="경기정보 전력분석 "+date[0]+"년 "+String(month).padStart(2,"0")+"월 "+
  String(day).padStart(2,"0")+"일";
 const first=text.indexOf(marker);
 if(first<0||text.indexOf(marker,first+marker.length)>=0)
  return {ok:false,reason:"WKBL_OFFICIAL_GAME_DATE_AMBIGUOUS"};
 const hero=text.slice(first+marker.length,first+marker.length+350);
 const time=hero.match(/^\s*[가-힣]{1,5}\s*\/\s*(\d{2}:\d{2})\s*\/\s*/);
 if(!time)return {ok:false,reason:"WKBL_OFFICIAL_KICKOFF_MISSING"};
 const sourceAt=Date.parse(e.date+"T"+time[1]+":00+09:00");
 if(!Number.isFinite(sourceAt)||
  Math.abs(sourceAt-Date.parse(e.date+"T"+e.time+":00+09:00"))>2*MIN||
  Math.abs(sourceAt-fixture.startMs)>20*MIN)
  return {ok:false,reason:"WKBL_OFFICIAL_KICKOFF_MISMATCH"};
 const relevant=hero.slice(time[0].length);
 if(!relevant.startsWith(e.venue+" "))
  return {ok:false,reason:"WKBL_OFFICIAL_VENUE_MISMATCH"};
 const afterVenue=relevant.slice(e.venue.length).trimStart();
 const teamsRe=new RegExp("^"+escaped(e.wkHome)+"\\s*\\[[^\\]]{2,35}\\]\\s*(\\d{1,3})\\s*"+
  escaped(e.wkAway)+"\\s*\\[[^\\]]{2,35}\\]\\s*(\\d{1,3})\\s+Play-By-Play","i");
 const result=afterVenue.match(teamsRe);
 if(!result)return {ok:false,reason:"WKBL_OFFICIAL_TWO_TEAMS_OR_BOX_SCORE_MISSING"};
 const h=Number(result[1]),a=Number(result[2]);
 if(h!==e.homeScore||a!==e.awayScore||h===a||
  !scorePlausibility("농구",h,a).ok)
  return {ok:false,reason:"WKBL_OFFICIAL_BOX_SCORE_MISMATCH"};
 return {ok:true};
}
function parseWire(html,e,fixture){
 if(typeof html!=="string"||html.length<500||html.length>800_000)
  return {ok:false,reason:"WKBL_WIRE_DOCUMENT_MISSING"};
 const title=(html.match(/<title[^>]*>([^<]{15,300})<\/title>/i)?.[1]??"").trim();
 const h=e.homeScore,a=e.awayScore;
 const winnerScore=norm(e.wireWinner)===norm(e.wkHome)?h:a;
 const loserScore=winnerScore===h?a:h;
 const exactTitle="[여자농구 "+e.wireVenue.replace(/\s.*$/,"").replace("사직체육관","부산")+"전적]";
 // Headline MUST declare a completed game with the exact source-confirmed
 // winner and loser, never a preview or 1st-quarter scoreboard.
 const parts=title.match(/^\[여자농구 [^\]]{1,20}전적\]\s+(.+?)\s+(\d{1,3})-(\d{1,3})\s+(.+?)\s*\|\s*연합뉴스$/);
 if(!parts||norm(parts[1])!==norm(e.wireWinner)||
    norm(parts[4])!==norm(e.wireLoser)||
    Number(parts[2])!==winnerScore||Number(parts[3])!==loserScore)
  return {ok:false,reason:"WKBL_WIRE_NOT_EXPLICIT_EXACT_FINAL"};
 const text=visible(html);
 const published=text.match(/송고\s+(20\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
 if(!published||published[1]!==e.date)
  return {ok:false,reason:"WKBL_WIRE_PUBLICATION_DATE_UNKNOWN"};
 const after=Date.parse(published[1]+"T"+published[2]+":00+09:00");
 if(!Number.isFinite(after)||after-fixture.startMs<85*MIN)
  return {ok:false,reason:"WKBL_WIRE_NOT_AFTER_FINAL"};
 const marker="◇ "+Number(e.date.slice(8))+"일 전적(";
 const at=text.indexOf(marker);
 if(at<0||text.indexOf(marker,at+marker.length)>=0)
  return {ok:false,reason:"WKBL_WIRE_MATCH_RECORD_AMBIGUOUS"};
 const detail=text.slice(at,at+260);
 const venue=detail.match(/^◇\s*\d{1,2}일\s*전적\(([^)]{1,45})\)/);
 if(!venue||norm(venue[1])!==norm(e.wireVenue))
  return {ok:false,reason:"WKBL_WIRE_VENUE_MISMATCH"};
 const result=detail.slice(venue[0].length).trimStart();
 const begin=result.indexOf(e.wireWinner);
 if(begin<0||begin>20)
  return {ok:false,reason:"WKBL_WIRE_WINNER_MISSING"};
 const scan=result.slice(begin),quarter=scan.match(/(\d{1,3})\s*\(\s*(\d{1,3})-(\d{1,3})\s+(\d{1,3})-(\d{1,3})\s+(\d{1,3})-(\d{1,3})\s+(\d{1,3})-(\d{1,3})\s*\)\s*(\d{1,3})/);
 if(!quarter||Number(quarter[1])!==winnerScore||
  Number(quarter[10])!==loserScore)
  return {ok:false,reason:"WKBL_WIRE_QUARTER_TOTAL_MISSING"};
 const q=quarter.slice(2,10).map(Number);
 if(q[0]+q[2]+q[4]+q[6]!==winnerScore||
    q[1]+q[3]+q[5]+q[7]!==loserScore)
  return {ok:false,reason:"WKBL_WIRE_FOUR_QUARTERS_DO_NOT_SUM"};
 const tail=scan.slice(quarter.index+quarter[0].length);
 if(!norm(tail.slice(0,35)).includes(norm(e.wireLoser)))
  return {ok:false,reason:"WKBL_WIRE_OPPONENT_MISMATCH"};
 return {ok:true};
}
export function parseWkblDualFinal(officialHtml,postmatchHtml,fixture,{now=Date.now()}={}){
 const e=entryFor(fixture);
 if(!e)return {ok:false,waitReason:"WKBL_NO_AUDITED_EXACT_MATCH"};
 if(now-fixture.startMs<165*MIN)
  return {ok:false,waitReason:"WKBL_TOO_EARLY"};
 const a=parseOfficial(officialHtml,e,fixture);
 if(!a.ok)return {ok:false,waitReason:a.reason};
 const b=parseWire(postmatchHtml,e,fixture);
 if(!b.ok)return {ok:false,waitReason:b.reason};
 return {ok:true,finalConfirmed:true,source:"WKBL",gameId:e.id,
  sourceEvidence:"WKBL_OFFICIAL_PLUS_YONHAP_EXPLICIT_POSTGAME_FINAL",
  result:{homeScore:e.homeScore,awayScore:e.awayScore}};
}
export async function lookupWkblDualFinal(fixture,{fetchFn=fetch,
 cache=new Map(),timeoutMs=9500,now=Date.now()}={}){
 const e=entryFor(fixture);
 if(!e)return {ok:false,waitReason:"WKBL_NO_AUDITED_EXACT_MATCH"};
 const urls=[WKBL+e.id,WIRE+e.wireId],data=[];
 for(const url of urls){
  let found=cache.get(url);
  if(!found){
   try{
    const response=await fetchFn(url,{cache:"no-store",redirect:"error",
      signal:AbortSignal.timeout(timeoutMs),headers:{accept:"text/html",
       "user-agent":"Mozilla/5.0 (Wisetoto independent postgame audit)"}});
    const html=response.ok?await response.text():"";
    found=response.ok&&html.length>500?{ok:true,html}:
      {ok:false,reason:"WKBL_SOURCE_HTTP_"+response.status};
   }catch(error){found={ok:false,reason:"WKBL_SOURCE_NETWORK:"+String(error).slice(0,85)}}
   cache.set(url,found);
  }
  if(!found.ok)return {ok:false,waitReason:found.reason};
  data.push(found.html);
 }
 return parseWkblDualFinal(data[0],data[1],fixture,{now});
}
