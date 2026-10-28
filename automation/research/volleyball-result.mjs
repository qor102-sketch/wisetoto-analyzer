// Read-only domestic volleyball final fallback without a Betman/SportsAPI fixture ID.
// Exact independent schedule identity, explicit final status and 3-set winning score
// are mandatory. An outage or ambiguous match stays PENDING.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const normalize=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const aliases=[
 ["대한항공","대한항공점보스","koreanairjumbos"],["현대캐피탈","현대캐피탈스카이워커스"],
 ["우리카드","우리카드우리won"],["한국전력","한국전력빅스톰"],
 ["삼성화재","삼성화재블루팡스"],["kb손해보험","kb손해보험스타즈"],
 ["ok저축은행","ok금융그룹","ok저축은행읏맨"],["흥국생명","흥국생명핑크스파이더스"],
 ["gs칼텍스","gs칼텍스서울kixx"],["현대건설","현대건설힐스테이트"],
 ["한국도로공사","한국도로공사하이패스"],["ibk기업은행","ibk기업은행알토스"],
 ["페퍼저축은행","페퍼저축은행ai페퍼스"],["soop수퍼스","ai페퍼스"]
].map(arr=>arr.map(normalize));
function sameTeam(a,b){
 const x=normalize(a),y=normalize(b);
 if(!x||!y)return false;
 if(x===y)return true;
 return aliases.some(arr=>arr.includes(x)&&arr.includes(y));
}
const words=["FINAL","FINISHED","COMPLETED","FT","END","ENDED","경기종료","종료","시합종료"];
function isFinal(g){
 if(g?.completed===true||g?.isFinished===true||g?.isFinal===true)return true;
 const s=[g?.statusCode,g?.statusInfo,g?.gameStatus,g?.status,g?.statusNum]
   .flatMap(v=>v&&typeof v==="object"?[v.name,v.code,v.short,v.description]:[v])
   .filter(v=>typeof v==="string").map(v=>v.trim().toUpperCase().replace(/\s+/g,""));
 return s.some(v=>words.includes(v));
}
function score(g,side){
 const pre=side==="home"?"home":"away";
 const vals=[g?.[pre+"Score"],g?.[pre+"TeamScore"],g?.[pre+"SetScore"],
   g?.finalScore?.[pre],g?.score?.[pre],g?.[pre+"Team"]?.score];
 for(const v of vals){
   if(v===null||v===undefined||String(v).trim()==="")continue;
   const x=Number(v);
   if(Number.isSafeInteger(x)&&x>=0)return x;
 }
 return null;
}
function dateKST(ms){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",
   year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ms));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return p.year+"-"+p.month+"-"+p.day;
}
function dateOnly(value){
 const s=String(value??"");
 const m=/(20\d\d)[-.\/]?(\d\d)[-.\/]?(\d\d)/.exec(s);
 return m?[m[1],m[2],m[3]].join("-"):null;
}
function rows(payload){
 const direct=payload?.result?.games??payload?.games??payload?.data?.games;
 if(Array.isArray(direct))return direct;
 const all=[];
 const walk=(v,d)=>{
   if(d>5||all.length>=500||!v||typeof v!=="object")return;
   if(Array.isArray(v)){for(const x of v.slice(0,500))walk(x,d+1);return;}
   if(v.gameId||v.game_id)all.push(v);
   else for(const [k,x] of Object.entries(v))if(k!=="debug")walk(x,d+1);
 };
 walk(payload,0);return all;
}
export function parseVolleyballSchedule(payload,fixture){
 if(!/v.?리그|kovo|프로배구|남자배구|여자배구|컵|v.?league/i.test(String(fixture.league)))
   return {ok:false,waitReason:"VOLLEYBALL_LEAGUE_UNSUPPORTED"};
 const date=dateKST(fixture.startMs);
 const all=rows(payload).filter(g=>{
   const start=g.gameDateTime??g.startTime??g.gameDate??g.date??null;
   if(dateOnly(start)!==date)return false;
   return sameTeam(g.homeTeamName??g.homeTeamShortName??g.home?.name??g.home,
     fixture.home)&&sameTeam(g.awayTeamName??g.awayTeamShortName??g.away?.name??g.away,fixture.away);
 });
 const ids=new Map(all.filter(g=>String(g.gameId??g.game_id??"").trim())
   .map(g=>[String(g.gameId??g.game_id),g]));
 if(ids.size!==1)return {ok:false,waitReason:ids.size?"VOLLEYBALL_AMBIGUOUS_MATCH":"VOLLEYBALL_EXACT_MATCH_NOT_FOUND"};
 const [gameId,g]=[...ids.entries()][0];
 const raw=g.gameDateTime??g.startTime??null;
 // Date/time is often omitted by schedule API; when present require sensible kickoff.
 if(raw&&/\d\d:\d\d/.test(String(raw))){
   const v=String(raw);
   const local=/^20\d{2}-\d\d-\d\d[T ]\d\d:\d\d/.test(v)&&!/[Zz]|[+-]\d\d:\d\d$/.test(v)
     ?Date.parse(v.replace(" ","T")+"+09:00"):Date.parse(v);
   if(Number.isFinite(local)&&Math.abs(local-fixture.startMs)>120*60_000)
     return {ok:false,waitReason:"VOLLEYBALL_KICKOFF_MISMATCH"};
 }
 if(g.cancelled===true||g.canceled===true||g.postponed===true)return {ok:false,waitReason:"VOLLEYBALL_VOID"};
 if(!isFinal(g))return {ok:false,waitReason:"VOLLEYBALL_FINAL_STATUS_UNCONFIRMED"};
 const home=score(g,"home"),away=score(g,"away");
 if(!scorePlausibility("배구",home,away).ok)return {ok:false,waitReason:"VOLLEYBALL_INVALID_FINAL_SET_SCORE"};
 return {ok:true,finalConfirmed:true,source:"NAVER",gameId,result:{homeScore:home,awayScore:away}};
}
export async function lookupVolleyballFinal(fixture,{fetchFn=fetch,timeoutMs=12000}={}){
 if(!/v.?리그|kovo|프로배구|남자배구|여자배구|컵|v.?league/i.test(String(fixture.league)))
   return {ok:false,waitReason:"VOLLEYBALL_LEAGUE_UNSUPPORTED"};
 const d=dateKST(fixture.startMs);
 const queries=["kvolleyball","volleyball"].map(upper=>
  "https://api-gw.sports.naver.com/schedule/games?"+
  new URLSearchParams({fields:"basic",upperCategoryId:upper,fromDate:d,toDate:d,roundCodes:"",size:"500"}));
 const reasons=[];
 for(const endpoint of queries){
  try{
   const response=await fetchFn(endpoint,{headers:{accept:"application/json",
     referer:"https://m.sports.naver.com/volleyball/schedule/index"},
     cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
   if(!response.ok){reasons.push("HTTP_"+response.status);continue;}
   const v=parseVolleyballSchedule(await response.json(),fixture);
   if(v.ok)return {...v,providerErrors:reasons};
   reasons.push(v.waitReason);
  }catch(e){reasons.push("VOLLEYBALL_SOURCE_ERROR:"+String(e).slice(0,65));}
 }
 return {ok:false,waitReason:reasons.join(" | ").slice(0,180)||"VOLLEYBALL_SOURCE_UNAVAILABLE",providerErrors:reasons};
}
