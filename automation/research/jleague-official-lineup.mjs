// Independently verified J1/J2 official pre-kickoff XI.
// Discover source match IDs from the J.LEAGUE official daily list. Never
// extrapolate a match URL from a Betman date/team, or backfill post-kickoff PRE.
import {officialJ2ListUrl,officialJ2Matches,jstDate,jleagueOfficialTeamEq} from "./jleague-j2-final.mjs";
import {espnTeamEq} from "./espn-fast-final.mjs";
const M=60_000;
const normal=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣一-龯ぁ-んァ-ヶ]/g,"");
const aliases=[
 ["카시와레이솔","가시와레이솔","kashiwareysol"],
 ["가와사키프론탈레","가와사키프론탈레","kawasakifrontale"],
 ["요코하마f마리노스","요코하마마리노스","yokohamafmarinos"],
 ["제프유나이티드시바","제프유나이티드지바","제프지바","jefunitedchiba"],
 ["rb오미야아르디자","오미야아르디자","rbomiyaardija"],
 ["주빌로이와타","jubilo iwata","jubilo iwata fc"],
 ["쇼난벨마레","shonanbellmare"],
 ["나가사키","vvarennagasaki"],
 ["콘사도레삿포로","홋카이도콘사도레삿포로","hokkaidoconsadolesapporo"],
 ["반포레고후","ventforetkofu"]
].map(g=>g.map(normal));
function teamEq(a,b){
 const x=normal(a),y=normal(b);
 if(!x||!y)return false;
 return x===y||espnTeamEq(a,b)||jleagueOfficialTeamEq(a,b)||
  aliases.some(g=>g.includes(x)&&g.includes(y));
}
export function jleagueLineupDivision(row){
 if(row?.sport!=="축구")return null;
 const league=normal(row.league);
 if(/^(?:일본j1리그|일본j1|j1리그|j1league|meijiyasudaj1league)$/.test(league))return "j1";
 if(/^(?:일본j2리그|일본j2|j2리그|j2league|meijiyasudaj2league)$/.test(league))return "j2";
 return null;
}
export function jleagueLineupScheduleUrl(row){
 const div=jleagueLineupDivision(row);
 if(!div||!Number.isFinite(row.startMs))return null;
 if(div==="j2")return officialJ2ListUrl(row);
 const day=jstDate(row.startMs);
 return "https://www.jleague.jp/en/j1/match/search-list/?"+
  new URLSearchParams({category:"j1",period:"custom",startdate:day,enddate:day});
}
function identityFromOfficialCard(card,row){
 const division=jleagueLineupDivision(row);
 if(!division)return null;
 const date=jstDate(row.startMs);
 if(card.officialDate!==date||
    !teamEq(row.home,card.homeTeam?.fullName??card.homeTeam?.name)||
    !teamEq(row.away,card.awayTeam?.fullName??card.awayTeam?.name))return null;
 const href=String(card.detailHref??"");
 const m=new RegExp("^/(?:en/)?match/"+division+"/(20\\d{2})/(\\d{6})/?$").exec(href);
 if(!m||m[2].slice(0,4)!==date.slice(5,7)+date.slice(8,10))return null;
 // Official league match season uses the previous year during Jan-June.
 const expectedSeason=Number(date.slice(0,4))-(Number(date.slice(5,7))<=6?1:0);
 if(Number(m[1])!==expectedSeason)return null;
 const officialNumeric=String(card.id??"").replace(/^match-/,"");
 if(officialNumeric!==date.replaceAll("-","")+m[2].slice(4))return null;
 if(!/^\d{1,2}:\d\d$/.test(String(card.time??"")))return null;
 const at=Date.parse(date+"T"+String(card.time).padStart(5,"0")+":00+09:00");
 if(!Number.isFinite(at)||Math.abs(at-row.startMs)>20*M)return null;
 return {gameId:division+"/"+m[1]+"/"+m[2],
  url:"https://www.jleague.jp/en/match/"+division+"/"+m[1]+"/"+m[2]+"/lineup/"};
}
export function resolveJleagueOfficialLineup(html,row){
 const parsed=officialJ2Matches(html);
 if(!parsed.ok)return {ok:false,reason:parsed.reason};
 const found=new Map();
 for(const match of parsed.matches){
  const checked=identityFromOfficialCard(match,row);
  if(!checked)continue;
  if(found.has(checked.gameId))return {ok:false,reason:"JLEAGUE_DUPLICATE_EXACT_FIXTURE"};
  found.set(checked.gameId,checked);
 }
 return found.size===1?{ok:true,...found.values().next().value}:
  {ok:false,reason:found.size?"JLEAGUE_AMBIGUOUS_FIXTURE":"JLEAGUE_EXACT_FIXTURE_NOT_FOUND"};
}
const htmlUnescape=s=>String(s??"").replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27);/g,m=>({
 "&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" ",
 "&#39;":"'","&#x27;":"'"
}[m]??m));
// The official match page renders starting players side-by-side before the
// substitutes heading. Only an exact 22-player section with 1 GK on each
// interleaved side is accepted. Unknown/changed markup MUST fail closed.
export function parseJleagueStartingXi(html){
 if(typeof html!=="string"||html.length>2_500_000||html.length<200)
  return {ok:false,reason:"JLEAGUE_LINEUP_HTML_UNAVAILABLE"};
 let plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
 plain=htmlUnescape(plain);
 const headings=[...plain.matchAll(/\bStarting Lineup\b/gi)];
 if(headings.length!==1)return {ok:false,reason:"JLEAGUE_LINEUP_SECTION_UNCONFIRMED"};
 const tail=plain.slice(headings[0].index+headings[0][0].length);
 const end=tail.search(/\b(?:Substitutes|Substitute Players|Bench|Match Officials)\b/i);
 if(end<0||end>4500)return {ok:false,reason:"JLEAGUE_LINEUP_BOUNDARY_UNCONFIRMED"};
 const section=tail.slice(0,end).replace(/\b\d{1,3}(?:\+\d{1,2})?[’']\s*\d{0,3}[’']?/g," ");
 const entries=[...section.matchAll(/\b(GK|DF|MF|FW)\s+(\d{1,3})\s+([\s\S]*?)(?=\b(?:GK|DF|MF|FW)\s+\d{1,3}\b|$)/g)];
 if(entries.length!==22)return {ok:false,reason:"JLEAGUE_XI_NOT_PUBLISHED_OR_FORMAT_CHANGED"};
 const halves=[[],[]],gks=[0,0];
 for(let i=0;i<entries.length;i++){
  const side=i%2,position=entries[i][1],name=entries[i][3].trim().replace(/\s+/g," ");
  if(!name||name.length>80||/[\u0000-\u001f<>]/.test(name)||/^\d+$/.test(name))
   return {ok:false,reason:"JLEAGUE_INVALID_PLAYER_NAME"};
  halves[side].push(name);
  if(position==="GK")gks[side]++;
 }
 const normalizeName=v=>normal(v);
 if(gks[0]!==1||gks[1]!==1||halves.some(a=>a.length!==11||
   new Set(a.map(normalizeName)).size!==11))
  return {ok:false,reason:"JLEAGUE_INVALID_STARTING_XI"};
 return {ok:true,home:halves[0],away:halves[1]};
}
export async function lookupOfficialJleaguePregame(row,{
 fetchFn=fetch,now=Date.now,cache=new Map(),timeoutMs=7500
}={}){
 if(!jleagueLineupDivision(row))return {status:"UNAVAILABLE",reason:"JLEAGUE_DIVISION_UNSUPPORTED"};
 if(now()>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 const listUrl=jleagueLineupScheduleUrl(row);
 const read=async url=>{
  if(cache.has(url))return cache.get(url);
  let result;
  try{
   const res=await fetchFn(url,{cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(timeoutMs),headers:{accept:"text/html",
      "user-agent":"Mozilla/5.0 (Wisetoto Analyzer read-only official pregame audit)"}});
   const html=res.ok?await res.text():"";
   result=res.ok&&html.length<=2_500_000?{ok:true,html}:
    {ok:false,reason:"JLEAGUE_SOURCE_HTTP_"+res.status};
  }catch(e){result={ok:false,reason:"JLEAGUE_SOURCE_NETWORK:"+String(e).slice(0,80)};}
  cache.set(url,result);return result;
 };
 const schedule=await read(listUrl);
 if(!schedule.ok)return {status:"UNAVAILABLE",reason:schedule.reason};
 const source=resolveJleagueOfficialLineup(schedule.html,row);
 if(!source.ok)return {status:"UNAVAILABLE",reason:source.reason};
 // Do not issue a late page request to make a postmatch lineup look like PRE.
 if(now()>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 const lineupPage=await read(source.url);
 if(!lineupPage.ok)return {status:"UNAVAILABLE",reason:lineupPage.reason};
 const at=now();
 if(at>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 const parsed=parseJleagueStartingXi(lineupPage.html);
 if(!parsed.ok)return {status:"UNAVAILABLE",reason:parsed.reason};
 return {status:"CONFIRMED",reason:"JLEAGUE_OFFICIAL_VERIFIED_PREGAME_XI",
  source:"JLEAGUE_OFFICIAL_STARTING_XI",gameId:source.gameId,capturedAt:at,
  home:parsed.home,away:parsed.away,homeCount:11,awayCount:11,
  homeStarter:null,awayStarter:null,providerCapturedAt:null};
}
