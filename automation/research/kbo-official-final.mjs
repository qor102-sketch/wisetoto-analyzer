// Independent KBO official game-list FINAL evidence, not Naver.
 // Source: www.koreabaseball.com/ws/Main.asmx/GetKboGameList.
 // Fails closed on identities, scores, kickoff, game ID, cancellation and status.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const M=60000,KST=9*3600000;
const norm=v=>String(v??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣]/g,"");
const groups=[
 ["삼성","삼성라이온즈","samsunglions"],
 ["kt","kt위즈","ktwiz"],
 ["lg","lg트윈스","lgtwins"],
 ["한화","한화이글스","hanwhaeagles"],
 ["ssg","ssg랜더스","ssglanders"],
 ["기아","kia","kia타이거즈","kiatigers"],
 ["nc","nc다이노스","ncdinos"],
 ["롯데","롯데자이언츠","lottegiants"],
 ["두산","두산베어스","doosanbears"],
 ["키움","키움히어로즈","kiwoomheroes"]
].map(g=>g.map(norm));
const same=(a,b)=>{const x=norm(a),y=norm(b);
 return Boolean(x&&y&&(x===y||groups.some(g=>g.includes(x)&&g.includes(y))));
};
const kstDay=ms=>new Date(ms+KST).toISOString().slice(0,10).replace(/-/g,"");
export function isKboFixture(r){
 return r?.sport==="야구"&&
 ["kbo","kbo리그","한국프로야구","한국야구위원회"].includes(norm(r.league));
}
export function officialKboRequest(r){
 if(!isKboFixture(r)||!Number.isFinite(r.startMs))return null;
 const date=kstDay(r.startMs);
 return {key:date,url:"https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList",
  body:new URLSearchParams({leId:"1",srId:"0,3,4,5,6,7,8,9",date}).toString()};
}
const intScore=x=>x!==null&&x!==undefined&&String(x).trim()!==""&&
 Number.isSafeInteger(Number(x))&&Number(x)>=0&&Number(x)<=80;
const validId=v=>/^\d{8}[A-Z0-9]{4,12}$/.test(String(v??""));
function sourceKickoff(g){
 const date=String(g.G_DT??""),time=String(g.G_TM??"");
 if(!/^20\d{6}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 const day=date.slice(0,4)+"-"+date.slice(4,6)+"-"+date.slice(6,8);
 const result=Date.parse(day+"T"+time+":00+09:00");
 return Number.isFinite(result)?result:null;
}
export function parseOfficialKboFinal(payload,fixture,{now=Date.now()}={}){
 if(!isKboFixture(fixture))return {ok:false,waitReason:"KBO_LEAGUE_UNSUPPORTED"};
 if(!Number.isFinite(fixture.startMs)||now<fixture.startMs+240*M)
  return {ok:false,waitReason:"KBO_TOO_EARLY"};
 if(!Array.isArray(payload?.game))return {ok:false,waitReason:"KBO_OFFICIAL_SCHEMA_UNCONFIRMED"};
 const year=Number(kstDay(fixture.startMs).slice(0,4)),matches=[];
 for(const g of payload.game){
  if(Number(g.SEASON_ID)!==year||![0,3,4,5,6,7,8,9].includes(Number(g.SR_ID)))
   continue;
  if(!validId(g.G_ID)||String(g.G_ID).slice(0,8)!==kstDay(fixture.startMs))continue;
  const start=sourceKickoff(g);
  if(start===null||Math.abs(start-fixture.startMs)>20*M)continue;
  if(!same(fixture.home,g.HOME_NM)||!same(fixture.away,g.AWAY_NM))continue;
  matches.push(g);
 }
 if(matches.length!==1)return {ok:false,waitReason:matches.length?
  "KBO_OFFICIAL_AMBIGUOUS_FIXTURE":"KBO_OFFICIAL_EXACT_FIXTURE_NOT_FOUND"};
 const g=matches[0];
 // Source-owned completion + non-cancellation, not elapsed time or displayed score.
 if(Number(g.GAME_RESULT_CK)!==1||String(g.CANCEL_SC_ID)!=="0"||
  String(g.CANCEL_SC_NM)!=="정상경기")
  return {ok:false,waitReason:"KBO_OFFICIAL_FINAL_STATUS_UNCONFIRMED"};
 if(!intScore(g.B_SCORE_CN)||!intScore(g.T_SCORE_CN))
  return {ok:false,waitReason:"KBO_OFFICIAL_INVALID_SCORE"};
 const home=Number(g.B_SCORE_CN),away=Number(g.T_SCORE_CN);
 if(!scorePlausibility("야구",home,away).ok)
  return {ok:false,waitReason:"KBO_OFFICIAL_INVALID_SPORT_SCORE"};
 return {ok:true,finalConfirmed:true,source:"KBO",gameId:String(g.G_ID),
  sourceEvidence:"KBO_OFFICIAL_NORMAL_GAME_FINAL",
  result:{homeScore:home,awayScore:away}};
}
export async function lookupOfficialKboFinal(fixture,{
 fetchFn=fetch,cache=new Map(),now=Date.now(),timeoutMs=9500}={}){
 const req=officialKboRequest(fixture);
 if(!req)return {ok:false,waitReason:"KBO_LEAGUE_UNSUPPORTED"};
 let item=cache.get(req.key);
 if(!item){
  try{
   const res=await fetchFn(req.url,{method:"POST",cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(timeoutMs),
    headers:{"content-type":"application/x-www-form-urlencoded; charset=UTF-8",
     accept:"application/json","x-requested-with":"XMLHttpRequest",
     referer:"https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx",
     "user-agent":"Mozilla/5.0 (WisetotoAnalyzer KBO official score verification)"},
    body:req.body});
   const json=res.ok?await res.json().catch(()=>null):null;
   item=res.ok&&Array.isArray(json?.game)?{ok:true,payload:json}:
    {ok:false,reason:res.ok?"KBO_OFFICIAL_SCHEMA_UNCONFIRMED":
     "KBO_OFFICIAL_SOURCE_HTTP_"+res.status};
  }catch(e){item={ok:false,reason:"KBO_OFFICIAL_SOURCE_NETWORK:"+String(e).slice(0,100)}}
  cache.set(req.key,item);
 }
 return item.ok?parseOfficialKboFinal(item.payload,fixture,{now}):
  {ok:false,waitReason:item.reason};
}
