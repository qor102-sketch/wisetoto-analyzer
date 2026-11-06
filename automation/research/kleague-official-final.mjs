// Fail-closed source-owned K LEAGUE 1/2 postmatch score verification.
// The league's own website provides POST getScheduleList.do (no Naver or key).
// A match is NEVER FINAL based on elapsed time, a schedule, or a score alone.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const KST=9*3600_000,MIN=60000;
const normalize=x=>String(x??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣]/g,"");
const names=[
 ["포항","포항스틸러스","pohang","pohangsteelers"],
 ["제주","제주sk","jeju","jejusk"],
 ["울산","울산hd","ulsan","ulsanhd"],
 ["강원","강원fc","gangwon","gangwonfc"],
 ["서울","fc서울","fcseoul","seoul"],
 ["인천","인천유나이티드","incheon","incheonunited"],
 ["안양","fc안양","anyang","fcanyang"],
 ["부천","부천fc1995","bucheon","bucheonfc"],
 ["광주","광주fc","gwangju","gwangjufc"],
 ["김천","김천상무","gimcheon","gimcheonsangmu"],
 ["대전","대전하나시티즌","daejeon","daejeonhana"],
 ["전북","전북현대","jeonbuk","jeonbukhyundai"],
 ["수원fc","suwonfc"],["안산","안산그리너스","ansan"],
 ["전남","전남드래곤즈","jeonnam"],
 ["성남","성남fc","seongnam"],
 ["충북청주","충북청주fc","chungbukcheongju"],
 ["파주","파주시민축구단","paju"],
 ["김해","김해fc","gimhae"],
 ["천안","천안시티fc","cheonan"],
 ["경남","경남fc","gyeongnam"],
 ["김포","김포fc","gimpo"],
 ["대구","대구fc","daegu"],
 ["부산","부산아이파크","busan"],
 ["서울e","서울이랜드","서울이랜드fc","seouleland"],
 ["수원","수원삼성블루윙즈","suwon","suwonsamsung"],
 ["용인","용인fc","yongin"],
 ["화성","화성fc","hwaseong"],
 ["충남아산","충남아산fc","chungnamasan"]
].map(group=>group.map(normalize));
const sameClub=(a,b)=>{
 const x=normalize(a),y=normalize(b);
 return Boolean(x&&y&&(x===y||names.some(group=>group.includes(x)&&group.includes(y))));
};
export function officialKLeagueId(row){
 if(row?.sport!=="축구")return null;
 const league=normalize(row.league);
 if(["k리그1","kleague1"].includes(league))return 1;
 if(["k리그2","kleague2"].includes(league))return 2;
 return null;
}
const kstDay=ms=>new Date(ms+KST).toISOString().slice(0,10);
export function officialKLeagueRequest(row){
 const leagueId=officialKLeagueId(row);
 if(!leagueId||!Number.isFinite(row.startMs))return null;
 const day=kstDay(row.startMs);
 return {url:"https://www.kleague.com/getScheduleList.do",
  body:JSON.stringify({year:day.slice(0,4),month:day.slice(5,7),leagueId}),
  key:day.slice(0,7)+"|"+leagueId};
}
const isScore=v=>v!==null&&v!==undefined&&
 String(v).trim()!==""&&Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=20;
function sourceKickoff(row){
 const day=String(row.gameDate??"").replaceAll(".","-");
 const time=String(row.gameTime??"");
 if(!/^20\d\d-\d\d-\d\d$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  return null;
 const date=new Date(day+"T"+time+":00+09:00").getTime();
 return Number.isFinite(date)?date:null;
}
export function parseOfficialKLeagueFinal(payload,row,{now=Date.now()}={}){
 const league=officialKLeagueId(row);
 if(!league)return {ok:false,waitReason:"KLEAGUE_LEAGUE_UNSUPPORTED"};
 if(now<row.startMs+150*MIN)return {ok:false,waitReason:"KLEAGUE_TOO_EARLY"};
 const data=payload?.data??payload;
 if(!data||!Array.isArray(data.scheduleList))
  return {ok:false,waitReason:"KLEAGUE_SCHEDULE_SCHEMA_UNCONFIRMED"};
 const matches=[];
 for(const g of data.scheduleList){
  if(Number(g.leagueId)!==league||Number(g.year)!==
   Number(kstDay(row.startMs).slice(0,4)))continue;
  if(!sameClub(row.home,g.homeTeamName)||
    !sameClub(row.away,g.awayTeamName))continue;
  const at=sourceKickoff(g);
  if(at===null||kstDay(at)!==kstDay(row.startMs))continue;
  if(Math.abs(at-row.startMs)>20*MIN)continue;
  if(!Number.isSafeInteger(Number(g.gameId))||Number(g.gameId)<=0||
    !Number.isSafeInteger(Number(g.meetSeq))||Number(g.meetSeq)<=0)continue;
  matches.push(g);
 }
 if(matches.length!==1)return {ok:false,
  waitReason:matches.length?"KLEAGUE_AMBIGUOUS_FIXTURE":"KLEAGUE_EXACT_FIXTURE_NOT_FOUND"};
 const g=matches[0];
 // BOTH official status fields must explicitly agree with completion. A
 // previous score, in-progress match or missing flag can never grade a pick.
 if(g.gameStatus!=="FE"||g.endYn!=="Y")
  return {ok:false,waitReason:"KLEAGUE_FINAL_STATUS_UNCONFIRMED"};
 if(!isScore(g.homeGoal)||!isScore(g.awayGoal)||
   !scorePlausibility("축구",Number(g.homeGoal),Number(g.awayGoal)).ok)
  return {ok:false,waitReason:"KLEAGUE_FINAL_SCORE_INVALID"};
 const id=Number(g.year)+"/"+league+"/"+Number(g.meetSeq)+"/"+Number(g.gameId);
 return {ok:true,finalConfirmed:true,source:"KLEAGUE",
  sourceEvidence:"KLEAGUE_OFFICIAL_FE_Y_MATCH",gameId:id,
  result:{homeScore:Number(g.homeGoal),awayScore:Number(g.awayGoal)}};
}
export async function lookupOfficialKLeagueFinal(row,{
 fetchFn=fetch,cache=new Map(),now=Date.now(),timeoutMs=9000}={}){
 const request=officialKLeagueRequest(row);
 if(!request)return {ok:false,waitReason:"KLEAGUE_LEAGUE_UNSUPPORTED"};
 let response=cache.get(request.key);
 if(!response){
  try{
   const fetched=await fetchFn(request.url,{method:"POST",cache:"no-store",
    redirect:"error",signal:AbortSignal.timeout(timeoutMs),
    headers:{accept:"application/json, text/plain, */*",
     "content-type":"application/json; charset=utf-8",
     "user-agent":"Mozilla/5.0 WisetotoAnalyzer/official-match-audit"},
    body:request.body});
   const payload=fetched.ok?await fetched.json().catch(()=>null):null;
   response=fetched.ok?{ok:true,payload}:
    {ok:false,reason:"KLEAGUE_SOURCE_HTTP_"+fetched.status};
  }catch(e){response={ok:false,reason:"KLEAGUE_SOURCE_NETWORK:"+String(e).slice(0,95)};}
  cache.set(request.key,response);
 }
 if(!response.ok)return {ok:false,waitReason:response.reason};
 return parseOfficialKLeagueFinal(response.payload,row,{now});
}
