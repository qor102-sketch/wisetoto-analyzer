// K League's OWN public competition schedule, not Naver/third-party inference.
// Fail closed on official month/year, club ID, home/away, exact kickoff, unique
// official event, FE + endYn=Y and integer full-time regulation goals.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const URL="https://www.kleague.com/getScheduleList.do";
const KST=9*3600000,M=60000;
const norm=s=>String(s??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣]/g,"");
// K League official public clubList teamId -> audited Betman Korean variants.
// Never infer identity by city substring: Seoul vs Seoul E-Land and Suwon vs
// Suwon FC are different clubs with different immutable IDs.
const approved=new Map(Object.entries({
 K21:["강원FC"],K22:["광주FC"],K35:["김천상무프로축구단","김천상무"],
 K10:["대전하나시티즌"],K26:["부천FC1995","부천FC 1995"],
 K09:["FC서울"],K27:["FC안양"],K01:["울산HDFC","울산HD"],
 K18:["인천유나이티드"],K05:["전북현대모터스","전북현대"],
 K04:["제주SKFC"],K03:["포항스틸러스"],
 K20:["경남FC"],K36:["김포FC"],K41:["김해FC2008"],
 K17:["대구FC"],K06:["부산아이파크"],K31:["서울이랜드","서울이랜드FC"],
 K08:["성남FC"],K02:["수원삼성블루윙즈","수원삼성"],
 K29:["수원FC"],K32:["안산그리너스"],K42:["용인FC"],
 K07:["전남드래곤즈"],K38:["천안시티FC","천안시티"],
 K34:["충남아산프로축구단","충남아산FC"],
 K37:["충북청주프로축구단","충북청주FC"],
 K40:["파주프런티어","파주프런티어FC"],K39:["화성FC"]
}).map(([code,aliases])=>[code,new Set(aliases.map(norm))]));
export function officialKLeagueNumber(fixture){
 if(fixture?.sport!=="축구")return null;
 const league=norm(fixture.league);
 return league==="k리그1"?1:league==="k리그2"?2:null;
}
export function officialKLeagueMonth(fixture){
 const leagueId=officialKLeagueNumber(fixture);
 if(!leagueId||!Number.isFinite(fixture.startMs))return null;
 const day=new Date(fixture.startMs+KST).toISOString().slice(0,10);
 return {year:day.slice(0,4),month:day.slice(5,7),leagueId,day};
}
const validId=v=>Number.isInteger(Number(v))&&Number(v)>0&&
 String(v??"").trim()!=="";
const score=v=>typeof v!=="boolean"&&String(v??"").trim()!==""&&
 Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=20?Number(v):null;
const sameClub=(fixtureName,code,club,sourceName)=>{
 const known=approved.get(String(code??""));
 if(!known||!known.has(norm(fixtureName))||!club)return false;
 // Code must be a real public clubList entry and match this fixture's
 // source-side short label, not just a conveniently guessed code.
 return String(club.teamId??club.code??"")===String(code)&&
   norm(club.teamNameShort??club.teamName??"")===norm(sourceName);
};
const kstDay=ms=>new Date(ms+KST).toISOString().slice(0,10);
export function parseOfficialKLeagueFinal(payload,fixture,{now=Date.now()}={}){
 const month=officialKLeagueMonth(fixture);
 if(!month)return {ok:false,waitReason:"KLEAGUE_LEAGUE_OR_DATE_UNSUPPORTED"};
 if(!Number.isFinite(now)||now<fixture.startMs+150*M)
  return {ok:false,waitReason:"KLEAGUE_TOO_EARLY"};
 const data=payload?.data??payload;
 if(!data||!Array.isArray(data.scheduleList)||!Array.isArray(data.clubList))
  return {ok:false,waitReason:"KLEAGUE_OFFICIAL_FORMAT_UNKNOWN"};
 const clubs=new Map(data.clubList.map(c=>[String(c?.teamId??""),c]));
 const found=[];
 for(const item of data.scheduleList){
  if(Number(item?.leagueId)!==month.leagueId||
    String(item?.gameDate)!==month.day.replace(/-/g,".")||
    Number(item?.year)!==Number(month.year)||Number(item?.meetSeq)!==month.leagueId)
   continue;
  if(!sameClub(fixture.home,item.homeTeam,clubs.get(String(item.homeTeam)),item.homeTeamName)||
    !sameClub(fixture.away,item.awayTeam,clubs.get(String(item.awayTeam)),item.awayTeamName))
   continue;
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(item.gameTime??"")))
   continue;
  const kickoff=Date.parse(month.day+"T"+item.gameTime+":00+09:00");
  if(!Number.isFinite(kickoff)||Math.abs(kickoff-fixture.startMs)>15*M)continue;
  if(!validId(item.gameId))continue;
  found.push(item);
 }
 if(found.length!==1)return {ok:false,waitReason:found.length?
   "KLEAGUE_AMBIGUOUS_OFFICIAL_FIXTURE":"KLEAGUE_EXACT_OFFICIAL_FIXTURE_NOT_FOUND"};
 const item=found[0];
 if(item.gameStatus!=="FE"||item.endYn!=="Y")
  return {ok:false,waitReason:"KLEAGUE_OFFICIAL_FINAL_STATUS_UNCONFIRMED"};
 const home=score(item.homeGoal),away=score(item.awayGoal);
 if(home===null||away===null||!scorePlausibility("축구",home,away).ok)
  return {ok:false,waitReason:"KLEAGUE_OFFICIAL_SCORE_INVALID"};
 return {ok:true,finalConfirmed:true,source:"KLEAGUE",
  gameId:month.year+"/"+month.leagueId+"/"+String(item.gameId),
  sourceEvidence:"KLEAGUE_OFFICIAL_MATCH_FE_AND_END_Y",
  result:{homeScore:home,awayScore:away}};
}
export async function lookupOfficialKLeagueFinal(fixture,{
 fetchFn=fetch,cache=new Map(),now=Date.now(),timeoutMs=10000
}={}){
 const period=officialKLeagueMonth(fixture);
 if(!period)return {ok:false,waitReason:"KLEAGUE_LEAGUE_OR_DATE_UNSUPPORTED"};
 const cacheKey=period.year+"-"+period.month+"/K"+period.leagueId;
 let response=cache.get(cacheKey);
 if(!response){
  try{
   const res=await fetchFn(URL,{method:"POST",cache:"no-store",redirect:"error",
    headers:{"content-type":"application/json; charset=utf-8",
      "accept":"application/json, text/plain, */*",
      "user-agent":"Mozilla/5.0 (Wisetoto official K League results audit)"},
    body:JSON.stringify({year:period.year,month:period.month,leagueId:period.leagueId}),
    signal:AbortSignal.timeout(timeoutMs)});
   const data=res.ok?await res.json().catch(()=>null):null;
   response=res.ok&&data?.data?.scheduleList&&data?.data?.clubList?
    {ok:true,data}:{ok:false,reason:"KLEAGUE_OFFICIAL_HTTP_OR_FORMAT_"+res.status};
  }catch(e){response={ok:false,reason:"KLEAGUE_OFFICIAL_NETWORK:"+String(e).slice(0,90)}}
  cache.set(cacheKey,response);
 }
 if(!response.ok)return {ok:false,waitReason:response.reason};
 return parseOfficialKLeagueFinal(response.data,fixture,{now});
}
