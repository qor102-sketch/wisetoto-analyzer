// Official KOVO V-League finished-schedules source, independent of Naver.
// GET /mains/games/schedules/ended is KOVO's explicit finished-only feed.
// No inferred result from schedule date or displayed partial score.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const API="https://user-api.kovo.co.kr/mains/games/schedules/ended";
const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[^0-9a-z가-힣]/g,"");
const aliases=[
 ["우리카드","우리카드우리won"],
 ["대한항공","대한항공점보스"],
 ["삼성화재","삼성화재블루팡스"],
 ["한국전력","한국전력빅스톰"],
 ["soop","soop수퍼스","soop슈퍼스","페퍼저축은행","페퍼저축은행ai페퍼스"],
 ["ibk기업은행","ibk기업은행알토스"],
 ["한국도로공사","한국도로공사하이패스"],
 ["흥국생명","흥국생명핑크스파이더스"],
 ["현대캐피탈","현대캐피탈스카이워커스"],
 ["kb손해보험","kb손해보험스타즈"],
 ["ok저축은행","ok저축은행읏맨"],
 ["정관장","정관장레드스파크스"],
 ["현대건설","현대건설힐스테이트"],
 ["gs칼텍스","gs칼텍스서울kixx"]
].map(a=>a.map(norm));
const same=(fixtureName,officialName)=>{
 const x=norm(fixtureName),y=norm(officialName);
 return Boolean(x&&y&&(x===y||aliases.some(a=>a.includes(x)&&a.includes(y))));
};
const KST=9*3600000,H=3600000;
export const isOfficialKovoFixture=r=>r?.sport==="배구"&&
 /^(?:KOVO 남자|KOVO 여자)$/.test(String(r?.league??"").trim());
const genderFor=r=>String(r.league).includes("여자")?"FEMALE":"MALE";
const seasonFor=r=>{
 const date=new Date(r.startMs+KST);
 const year=date.getUTCFullYear();
 const month=date.getUTCMonth()+1;
 const first=month>=7?year:year-1;
 return String(first)+"~"+String(first+1);
};
const sourceTimeMs=g=>{
 if(!/^20\d{2}-\d\d-\d\d$/.test(String(g?.gameDate??""))||
   !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(g?.startTime??"")))return null;
 const at=Date.parse(g.gameDate+"T"+String(g.startTime).slice(0,5)+":00+09:00");
 return Number.isFinite(at)?at:null;
};
const sourceIdentity=g=>[g?.season?.value,g?.league?.value,g?.gender,g?.number]
 .map(x=>String(x??"").trim()).join(":");
export function parseOfficialKovoEnded(payload,fixture,{now=Date.now()}={}){
 if(!isOfficialKovoFixture(fixture))return {ok:false,waitReason:"KOVO_LEAGUE_UNSUPPORTED"};
 if(!payload||!Array.isArray(payload.payload))return {ok:false,waitReason:"KOVO_INVALID_ENDED_SOURCE"};
 const candidates=payload.payload.filter(g=>g&&g.gender===genderFor(fixture)&&
  String(g.league?.value)==="201"&&
  String(g.season?.name??"").includes(seasonFor(fixture))&&
  same(fixture.home,g.homeTeam?.name)&&same(fixture.away,g.awayTeam?.name)&&
  Number.isFinite(sourceTimeMs(g))&&
  Math.abs(sourceTimeMs(g)-fixture.startMs)<=2*H);
 const ids=new Map();
 for(const g of candidates){
  if(!/^\d+$/.test(String(g.number??""))||!String(g.season?.value??"").trim()||
    !/^\d+$/.test(String(g.league?.value??"")))return {ok:false,waitReason:"KOVO_MATCH_ID_MISSING"};
  const id=sourceIdentity(g);
  if(ids.has(id)&&JSON.stringify(ids.get(id))!==JSON.stringify(g))
   return {ok:false,waitReason:"KOVO_CONFLICTING_MATCH_ID"};
  ids.set(id,g);
 }
 if(ids.size!==1)return {ok:false,waitReason:ids.size?"KOVO_AMBIGUOUS_GAME":"KOVO_EXACT_GAME_NOT_FOUND"};
 const [gameId,g]=[...ids][0];
 if(now<fixture.startMs+150*60000)return {ok:false,waitReason:"KOVO_TOO_EARLY"};
 // Ended-only official API plus provider's actual non-empty final endTime.
 if(!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(g.endTime??"")))
  return {ok:false,waitReason:"KOVO_END_TIME_MISSING"};
 if(!/^PT(?:\d+H)?\d+M$/.test(String(g.playTime??"")))
  return {ok:false,waitReason:"KOVO_PLAYTIME_MISSING"};
 const h=g.homeTeam?.score,a=g.awayTeam?.score;
 if([h,a].some(v=>v==null||String(v).trim()===""||!Number.isSafeInteger(Number(v))||Number(v)<0))
  return {ok:false,waitReason:"KOVO_SCORE_MISSING"};
 const proof=scorePlausibility("배구",h,a);
 if(!proof.ok)return {ok:false,waitReason:"KOVO_FINAL_SETS_INVALID:"+proof.reason};
 return {ok:true,finalConfirmed:true,source:"KOVO",gameId,
  sourceEvidence:"KOVO_OFFICIAL_ENDED_SCHEDULE",
  result:{homeScore:Number(h),awayScore:Number(a)}};
}
export async function lookupOfficialKovoFinal(fixture,{
 fetchFn=fetch,cache=new Map(),timeoutMs=8500,now=Date.now()
}={}){
 if(!isOfficialKovoFixture(fixture))
  return {ok:false,waitReason:"KOVO_LEAGUE_UNSUPPORTED"};
 let data=cache.get(API);
 if(!data){
  try{
   const res=await fetchFn(API,{cache:"no-store",signal:AbortSignal.timeout(timeoutMs),
    headers:{accept:"application/json","X-Service-Name":"user"}});
   const body=res.ok?await res.json().catch(()=>null):null;
   data=res.ok&&Array.isArray(body?.payload)?{ok:true,payload:body}:
    {ok:false,reason:"KOVO_OFFICIAL_HTTP_"+res.status+(res.ok?":BAD_PAYLOAD":"")};
  }catch(e){data={ok:false,reason:"KOVO_OFFICIAL_NETWORK:"+String(e).slice(0,90)}}
  cache.set(API,data);
 }
 if(!data.ok)return {ok:false,waitReason:data.reason};
 return parseOfficialKovoEnded(data.payload,fixture,{now});
}
