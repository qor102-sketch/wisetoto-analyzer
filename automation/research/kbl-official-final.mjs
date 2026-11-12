// Independent KBL first-division official match/list final score lookup.
// Does not consult Naver or NBA. No clock/score can imply FINAL without
// official isEnded=1 AND unique game key, both teams, competition, kickoff.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const API="https://api.kbl.or.kr/match/list";
const H=3600000;
const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[^0-9a-z가-힣]/g,"");
const KBL_TEAMS=[
 ["50",["창원LG","창원LG세이커스","LG세이커스","창원엘지"]],
 ["70",["안양정관장","안양정관장레드부스터스","정관장레드부스터스","안양KGC"]],
 ["16",["원주DB","원주DB프로미","DB프로미"]],
 ["55",["서울SK","서울SK나이츠","SK나이츠"]],
 ["66",["고양소노","고양소노스카이거너스","소노스카이거너스"]],
 ["60",["부산KCC","부산KCC이지스","KCC이지스"]],
 ["06",["수원KT","수원KT소닉붐","KT소닉붐"]],
 ["10",["울산현대모비스","울산현대모비스피버스","현대모비스피버스"]],
 ["64",["대구한국가스공사","대구한국가스공사페가수스","한국가스공사페가수스"]],
 ["35",["서울삼성","서울삼성썬더스","삼성썬더스"]]
].map(([code,names])=>({code,names:names.map(norm)}));
const knownCode=name=>KBL_TEAMS.find(t=>t.names.includes(norm(name)))?.code??null;
export const isOfficialKblFixture=r=>r?.sport==="농구"&&
  /^(?:KBL|남자프로농구)$/.test(String(r?.league??"").trim().toUpperCase());
export const kblKstDate=ms=>new Date(ms+9*H).toISOString().slice(0,10);
const compact=s=>s.replace(/-/g,"");
export function kblOfficialUrl(fixture){
 if(!isOfficialKblFixture(fixture)||!Number.isFinite(fixture?.startMs))return null;
 const date=compact(kblKstDate(fixture.startMs));
 return API+"?"+new URLSearchParams({fromDate:date,toDate:date,
  tcodeList:"all",seasonGrade:"1"});
}
const nameValid=(sourceName,fixtureName,teamCode)=>{
 const src=norm(sourceName);
 const expected=knownCode(fixtureName);
 if(!src||!expected||String(teamCode)!==expected)return false;
 // Source-provided display label must corroborate the actual official code.
 const names=KBL_TEAMS.find(x=>x.code===expected)?.names??[];
 return names.includes(src);
};
const dateValid=s=>/^\d{8}$/.test(String(s??""));
const sourceTimeMs=r=>{
 const d=String(r.gameDate??""),t=String(r.gameStart??"");
 if(!dateValid(d)||!/^([01]\d|2[0-3])[0-5]\d$/.test(t))return null;
 const at=Date.parse(d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6,8)+
  "T"+t.slice(0,2)+":"+t.slice(2)+":00+09:00");
 return Number.isFinite(at)?at:null;
};
const officialId=r=>String(r.gmkey??"").trim();
export function parseOfficialKblFinal(payload,fixture,{now=Date.now()}={}){
 if(!isOfficialKblFixture(fixture))return {ok:false,waitReason:"KBL_LEAGUE_UNSUPPORTED"};
 if(!Array.isArray(payload))return {ok:false,waitReason:"KBL_INVALID_SOURCE_RESPONSE"};
 const date=compact(kblKstDate(fixture.startMs));
 const pool=payload.filter(r=>r&&String(r.gameDate??"")===date&&
  Number(r.seasonGrade)===1&&
  nameValid(r.tnameH??r.tnameFH,fixture.home,r.tcodeH)&&
  nameValid(r.tnameA??r.tnameFA,fixture.away,r.tcodeA)&&
  Number.isFinite(sourceTimeMs(r))&&
  Math.abs(sourceTimeMs(r)-fixture.startMs)<=2*H);
 const ids=new Map();
 for(const r of pool){
  const id=officialId(r);
  if(!id)return {ok:false,waitReason:"KBL_MISSING_OFFICIAL_GAME_ID"};
  if(ids.has(id)&&JSON.stringify(ids.get(id))!==JSON.stringify(r))
   return {ok:false,waitReason:"KBL_CONFLICTING_EVENT_ID"};
  ids.set(id,r);
 }
 if(ids.size!==1)return {ok:false,waitReason:ids.size?
  "KBL_AMBIGUOUS_FIXTURE":"KBL_EXACT_FIXTURE_NOT_FOUND"};
 const [gameId,g]=[...ids][0];
 if(now<fixture.startMs+165*60000)return {ok:false,waitReason:"KBL_TOO_EARLY"};
 if(Number(g.isEnded)!==1)return {ok:false,waitReason:"KBL_FINAL_STATUS_UNCONFIRMED"};
 if(g.cancelled===true||g.canceled===true||g.postponed===true)
  return {ok:false,waitReason:"KBL_GAME_VOID"};
 const h=g.scoreH,a=g.scoreA;
 if([h,a].some(v=>v==null||String(v).trim()===""||!Number.isSafeInteger(Number(v))||Number(v)<0))
  return {ok:false,waitReason:"KBL_FINAL_SCORE_MISSING"};
 const proof=scorePlausibility("농구",h,a);
 if(!proof.ok)return {ok:false,waitReason:"KBL_FINAL_SCORE_INVALID:"+proof.reason};
 return {ok:true,finalConfirmed:true,source:"KBL",gameId,
  sourceEvidence:"KBL_OFFICIAL_MATCH_LIST_IS_ENDED",
  result:{homeScore:Number(h),awayScore:Number(a)}};
}
export async function lookupOfficialKblFinal(fixture,{
 fetchFn=fetch,cache=new Map(),timeoutMs=8500,now=Date.now()
}={}){
 const url=kblOfficialUrl(fixture);
 if(!url)return {ok:false,waitReason:"KBL_LEAGUE_UNSUPPORTED"};
 let got=cache.get(url);
 if(!got){
  try{
   const r=await fetchFn(url,{cache:"no-store",signal:AbortSignal.timeout(timeoutMs),
    headers:{accept:"application/json, text/plain, */*",
     "accept-language":"ko-KR,ko;q=0.9",
     "x-requested-with":"XMLHttpRequest",channel:"WEB",teamcode:"XX",lang:"ko"}});
   const body=r.ok?await r.json().catch(()=>null):null;
   got=r.ok&&Array.isArray(body)?{ok:true,data:body}:
    {ok:false,error:"KBL_OFFICIAL_HTTP_"+r.status+(r.ok?":INVALID_JSON_ARRAY":"")};
  }catch(e){got={ok:false,error:"KBL_OFFICIAL_NETWORK:"+String(e).slice(0,90)}}
  cache.set(url,got);
 }
 if(!got.ok)return {ok:false,waitReason:got.error};
 return parseOfficialKblFinal(got.data,fixture,{now});
}
