// Independent, official J.LEAGUE J2 league match list, no third-party score.
// Strictly fail closed. NEVER infer FINAL from elapsed time or a score alone.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const DAY=86400000,MIN=60000,JST=9*3600000;
const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣一-龯ぁ-んァ-ヶ]/g,"");
const teams=[
 ["카탈레도야마","카탈레토야마","katallertoyama"],
 ["베갈타센다이","vegaltasendai"],
 ["몬테디오야마가타","montedioyamagata"],
 ["도쿠시마보르티스","tokushimavortis"],
 ["rb오미야아르디자","오미야아르디자","rbomiyaardija"],
 ["이와키fc","이와키","iwakifc"],
 ["요코하마fc","yokohamafc"],
 ["블라우블리츠아키타","blaublitzakita"],
 ["쇼난벨마레","shonanbellmare"],
 ["사간도스","sagantosu"],
 ["반포레고후","ventforetkofu"],
 ["알비렉스니가타","albirexniigata"],
 ["후지에다myfc","후지에다","fujiedamyfc"],
 ["주빌로이와타","jubilo iwata","jubilo iwata fc","jubilo iwata"],
 ["오이타트리니타","oitatrinita"],
 ["반라우레하치노헤fc","반라우레하치노헤","vanraurehachinohe"],
 ["테게바자로미야자키","tegevajaromiyazaki"],
 ["도치기시티fc","도치기시티","tochigicity"],
 ["fc이마바리","이마바리fc","fcimabari"],
 ["홋카이도콘사도레삿포로","콘사도레삿포로","hokkaidoconsadolesapporo"],
].map(v=>v.map(norm));
export const isJleagueJ2=r=>r?.sport==="축구"&&
 /^(?:일본j2리그|일본j2|j2리그|j2league|meijiyasudaj2league)$/.test(norm(r.league));
const same=(a,b)=>{
 const x=norm(a),y=norm(b);
 return Boolean(x&&y&&(x===y||teams.some(group=>group.includes(x)&&group.includes(y))));
};
export const jstDate=ms=>new Date(ms+JST).toISOString().slice(0,10);
export function officialJ2ListUrl(fixture){
 if(!isJleagueJ2(fixture)||!Number.isFinite(fixture.startMs))return null;
 const day=jstDate(fixture.startMs);
 return "https://www.jleague.jp/en/j2/match/search-list/?"+
  new URLSearchParams({category:"j2",period:"custom",startdate:day,enddate:day});
}
// Next.js Flight server-rendered strings are JSON-escaped script arguments.
// Handle both SSR output and source schema drift by refusing unknown shapes.
export function decodeOfficialJ2Flight(html){
 if(typeof html!=="string"||html.length>1_800_000||html.length<100)return null;
 const parts=[];
 for(const hit of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)){
  try{parts.push(JSON.parse(hit[1]));}catch{return null;}
  if(parts.length>450)return null;
 }
 return parts.length?parts.join(""):null;
}
function parseJsonArrayAt(raw,at){
 if(raw[at]!=="[")return null;
 let inString=false,esc=false,depth=0;
 for(let j=at;j<Math.min(raw.length,at+100000);j++){
  const c=raw[j];
  if(inString){
   if(esc)esc=false;
   else if(c==="\\")esc=true;
   else if(c==='"')inString=false;
   continue;
  }
  if(c==='"'){inString=true;continue;}
  if(c==="["||c==="{")depth++;
  else if(c==="]"||c==="}"){depth--;if(depth===0){
   try{return JSON.parse(raw.slice(at,j+1));}catch{return null}
  }}
 }
 return null;
}
export function officialJ2Matches(html){
 const raw=decodeOfficialJ2Flight(html);
 if(!raw)return {ok:false,reason:"JLEAGUE_OFFICIAL_SSR_UNAVAILABLE",matches:[]};
 const found=[],re=/"matchDate":"(\$D)?(20\d{2}-\d\d-\d\d)[^"]*"/g;
 for(const hit of raw.matchAll(re)){
  const start=hit.index+hit[0].length;
  const section=raw.slice(start,start+600);
  const local=section.indexOf('"matches":[');
  if(local<0)continue;
  const index=start+local+'"matches":'.length;
  const matches=parseJsonArrayAt(raw,index);
  if(!Array.isArray(matches))continue;
  for(const match of matches)found.push({...match,officialDate:hit[2]});
 }
 if(!found.length)return {ok:false,reason:"JLEAGUE_OFFICIAL_LIST_FORMAT_UNKNOWN",matches:[]};
 return {ok:true,matches:found};
}
const finalStates=new Set([
 "GAME-OVER","FULL_TIME","FULLTIME","FINISHED","FINAL","MATCH_FINISHED","MATCH_END","END",
 "試合終了","試合終了済"
].map(norm).filter(Boolean));
function officialId(v,href,day){
 // Every match must carry a unique official href AND an independent schedule
 // ID for its correct calendar day. Never generate/synthesize an ID.
 const m=/^\/(?:en\/)?match\/j2\/(20\d\d)\/(\d{6})\/?$/.exec(String(href??""));
 if(!m)return null;
 const season=Number(day.slice(0,4))-(Number(day.slice(5,7))<=6?1:0);
 if(Number(m[1])!==season)return null;
 const dateDigits=day.slice(5,7)+day.slice(8,10);
 if(m[2].slice(0,4)!==dateDigits)return null;
 const id=String(v??"").replace(/^match-/,"");
 if(id!==day.replaceAll("-","")+m[2].slice(4))return null;
 return m[1]+"/"+m[2];
}
const validScore=x=>Number.isSafeInteger(Number(x))&&
 String(x??"").trim()!==""&&Number(x)>=0;
export function parseJleagueJ2Final(html,fixture,{now=Date.now()}={}){
 if(!isJleagueJ2(fixture))return {ok:false,waitReason:"JLEAGUE_J2_LEAGUE_UNSUPPORTED"};
 if(now<fixture.startMs+150*MIN)return {ok:false,waitReason:"JLEAGUE_J2_TOO_EARLY"};
 const data=officialJ2Matches(html);
 if(!data.ok)return {ok:false,waitReason:data.reason};
 const day=jstDate(fixture.startMs);
 const candidates=new Map();
 for(const r of data.matches){
  if(r.officialDate!==day||!same(fixture.home,r.homeTeam?.fullName??r.homeTeam?.name)||
    !same(fixture.away,r.awayTeam?.fullName??r.awayTeam?.name))continue;
  const id=officialId(r.id,r.detailHref,day);
  if(!id)continue;
  if(!/^\d{1,2}:\d{2}$/.test(String(r.time??"")))continue;
  const clock=Date.parse(day+"T"+String(r.time).padStart(5,"0")+":00+09:00");
  if(!Number.isFinite(clock)||Math.abs(clock-fixture.startMs)>20*MIN)continue;
  // Duplicated or contradictory official cards must never settle a game.
  if(candidates.has(id)&&JSON.stringify(candidates.get(id))!==JSON.stringify(r))
   return {ok:false,waitReason:"JLEAGUE_J2_CONFLICTING_OFFICIAL_RECORDS"};
  candidates.set(id,r);
 }
 if(candidates.size!==1)return {ok:false,waitReason:candidates.size?
   "JLEAGUE_J2_AMBIGUOUS_FIXTURE":"JLEAGUE_J2_EXACT_FIXTURE_NOT_FOUND"};
 const [gameId,match]=[...candidates.entries()][0];
 const state=norm(match.state);
 if(!state||!finalStates.has(state))return {ok:false,waitReason:"JLEAGUE_J2_FINAL_STATUS_UNCONFIRMED"};
 const home=match.homeTeam?.score,away=match.awayTeam?.score;
 if(!validScore(home)||!validScore(away)||Number(home)>20||Number(away)>20||
   !scorePlausibility("축구",Number(home),Number(away)).ok)
  return {ok:false,waitReason:"JLEAGUE_J2_INVALID_REGULATION_SCORE"};
 return {ok:true,finalConfirmed:true,source:"JLEAGUE",gameId,
  sourceEvidence:"JLEAGUE_OFFICIAL_J2_FULL_TIME",result:{homeScore:Number(home),awayScore:Number(away)}};
}
export async function lookupJleagueJ2Final(fixture,{fetchFn=fetch,now=Date.now(),
 cache=new Map(),timeoutMs=11000}={}){
 const url=officialJ2ListUrl(fixture);
 if(!url)return {ok:false,waitReason:"JLEAGUE_J2_LEAGUE_UNSUPPORTED"};
 let result=cache.get(url);
 if(!result){
  try{
   const res=await fetchFn(url,{cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(timeoutMs),headers:{accept:"text/html",
     "user-agent":"Mozilla/5.0 (Wisetoto Analyzer official J2 result verification)"}});
   const html=res.ok?await res.text():"";
   result=res.ok?{ok:true,html}:{ok:false,reason:"JLEAGUE_J2_HTTP_"+res.status};
  }catch(e){result={ok:false,reason:"JLEAGUE_J2_NETWORK:"+String(e).slice(0,90)};}
  cache.set(url,result);
 }
 if(!result.ok)return {ok:false,waitReason:result.reason};
 return parseJleagueJ2Final(result.html,fixture,{now});
}
