// Fast, browser-independent Naver SCORE-ONLY postmatch lookup.
// Never calls the heavyweight /api/naver/lineup route. One schedule request
// per sport/KST calendar day is shared across all due fixtures in a scan.
// No output is marked VERIFIED unless source proves unique fixture and FINAL.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const API="https://api-gw.sports.naver.com/schedule/games";
const norm=x=>String(x??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const aliases=[
 ["맨체스터시티","맨시티","mancity","manchestercity"],
 ["맨체스터유나이티드","맨유","manutd","manchesterunited"],
 ["토트넘홋스퍼","토트넘","tottenhamhotspur","tottenham"],
 ["인테르나치오날레밀라노","인테르밀란","인테르","intermilan"],
 ["레알마드리드","레알마드리드cf","realmadrid"],
 ["바이에른뮌헨","바이에른","bayernmunich"],
 ["la레이커스","레이커스","losangeleslakers"],
 ["골든스테이트워리어스","골든스테이트","goldenstatewarriors"],
 ["소프트뱅크호크스","소프트뱅크","fukuokasoftbankhawks"]
].map(a=>a.map(norm));
function sameTeam(a,b){
 const x=norm(a),y=norm(b);
 if(!x||!y)return false;
 if(x===y)return true;
 if(aliases.some(group=>group.includes(x)&&group.includes(y)))return true;
 const strip=v=>v.replace(/^(?:ac|afc|ssc|fc|sc|cf)(?=[가-힣])/,"");
 if(strip(x).length>=2&&strip(x)===strip(y))return true;
 return Math.min(x.length,y.length)>=4&&(x.includes(y)||y.includes(x));
}
const DAY=86400000, TWO_HOURS=2*3600000;
export const kstDate=ms=>new Date(ms+9*3600000).toISOString().slice(0,10);
function naverDateMs(raw){
 if(raw===null||raw===undefined)return null;
 const s=String(raw).trim();
 if(!s)return null;
 if(/^\d{8}$/.test(s))return null; // date only: no kickoff proof
 const normalized=/^\d{8}[ T]\d{2}:\d{2}/.test(s)
   ?s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6):s;
 const local=/^20\d{2}-\d\d-\d\d[ T]\d\d:\d\d/.test(normalized)&&
   !/(?:Z|[+-]\d\d:?\d\d)$/i.test(normalized);
 const ms=Date.parse(local?normalized.replace(" ","T")+"+09:00":normalized);
 return Number.isFinite(ms)?ms:null;
}
function gameDay(g){
 const raw=g.gameDateTime??g.startTime??g.gameDate??g.date;
 if(raw===null||raw===undefined)return null;
 const s=String(raw).trim();
 const compact=/^(20\d{2})(\d\d)(\d\d)/.exec(s);
 if(compact)return compact[1]+"-"+compact[2]+"-"+compact[3];
 const standard=/^(20\d{2}-\d\d-\d\d)/.exec(s);
 if(standard)return standard[1];
 const ms=naverDateMs(raw);
 return ms===null?null:kstDate(ms);
}
const homeOf=g=>String(g.homeTeamName??g.homeTeamShortName??g.homeTeamFullName??g.homeName??g.homeTeam?.name??g.home?.name??"");
const awayOf=g=>String(g.awayTeamName??g.awayTeamShortName??g.awayTeamFullName??g.awayName??g.awayTeam?.name??g.away?.name??"");
function gamesIn(payload){
 const direct=payload?.result?.games??payload?.games??payload?.data?.games??
   payload?.result?.schedule?.games;
 if(Array.isArray(direct))return direct;
 const out=[];
 function walk(v,d){
  if(!v||typeof v!=="object"||d>5||out.length>=600)return;
  if(Array.isArray(v)){for(const item of v.slice(0,600))walk(item,d+1);return;}
  if((v.gameId||v.game_id)&&homeOf(v)&&awayOf(v)){out.push(v);return;}
  for(const [k,val] of Object.entries(v))if(k!=="debug"&&k!=="players"&&
     k!=="statistics"&&k!=="lineup")walk(val,d+1);
 }
 walk(payload,0);
 return out;
}
function finished(g){
 if(g.cancelled===true||g.canceled===true||g.postponed===true||g.abandoned===true)return false;
 const fields=[g.statusCode,g.statusInfo,g.gameStatus,g.status,g.gameStatusName,
   g.statusNum,g.game?.statusCode].flatMap(v=>v&&typeof v==="object"?
    [v.name,v.code,v.short,v.description]:[v]);
 const s=fields.filter(v=>typeof v==="string").join(" ").toUpperCase();
 if(/CANCEL|POSTPON|SUSPEND|ABANDON|VOID|취소|연기|중단|진행|예정|경기전|SCHEDULE|LIVE|PLAYING/.test(s))return false;
 return /FINAL|FINISH|COMPLETE|RESULT|GAME.?END|ENDED|\bEND\b|\bFT\b|종료|경기끝/.test(s)||
   g.isFinal===true||g.completed===true||g.isFinished===true;
}
function scoreOf(g){
 const candidates=[
 [g.homeScore,g.awayScore],[g.homeTeamScore,g.awayTeamScore],
 [g.homeSetScore,g.awaySetScore],[g.finalScore?.home,g.finalScore?.away],
 [g.score?.home,g.score?.away],[g.result?.homeScore,g.result?.awayScore]
 ];
 for(const pair of candidates){
  const ok=pair.every(x=>x!==null&&x!==undefined&&String(x).trim()!==""&&
    Number.isSafeInteger(Number(x))&&Number(x)>=0);
  if(ok)return {homeScore:Number(pair[0]),awayScore:Number(pair[1])};
 }
 return null;
}
function leagueOk(g,fixture){
 const c=norm(g.categoryId??g.category??g.leagueId??"");
 const l=norm(fixture.league);
 if(!c)return true; // ambiguous provider category is not proof of mismatch
 if(fixture.sport==="농구"){
  if(/nba/.test(l))return /nba|wbasketball/.test(c);
  if(/wkbl|여자프로농구/.test(l))return /wkbl|kbasketball/.test(c);
  if(/kbl|남자프로농구/.test(l))return /kbl|kbasketball/.test(c)&&!/wkbl|nba/.test(c);
 }
 if(fixture.sport==="야구"){
  if(/mlb|메이저리그/.test(l))return /mlb|wbaseball/.test(c);
  if(/npb|일본프로야구/.test(l))return /npb|wbaseball/.test(c);
  if(/kbo|한국프로야구/.test(l))return /kbo|kbaseball/.test(c);
 }
 return true;
}
export function parseNaverFinal(payload,fixture,{now=Date.now()}={}){
 const date=kstDate(fixture.startMs);
 const candidates=gamesIn(payload).filter(g=>
   gameDay(g)===date&&sameTeam(homeOf(g),fixture.home)&&
   sameTeam(awayOf(g),fixture.away)&&leagueOk(g,fixture));
 const exact=new Map();
 for(const g of candidates){
  const id=String(g.gameId??g.game_id??"").trim();
  if(!id)continue;
  const at=naverDateMs(g.gameDateTime??g.startTime);
  if(at!==null&&Math.abs(at-fixture.startMs)>TWO_HOURS)continue;
  // A missing kickoff time may be accepted only for unique same-day teams.
  exact.set(id,g);
 }
 if(exact.size===0)return {ok:false,waitReason:"NAVER_EXACT_FIXTURE_NOT_FOUND"};
 if(exact.size!==1)return {ok:false,waitReason:"NAVER_AMBIGUOUS_FIXTURE"};
 const [gameId,g]=[...exact.entries()][0];
 if(now<fixture.startMs+TWO_HOURS)return {ok:false,waitReason:"NAVER_TOO_EARLY"};
 if(!finished(g))return {ok:false,waitReason:"NAVER_FINAL_STATUS_UNCONFIRMED"};
 const result=scoreOf(g);
 if(!result)return {ok:false,waitReason:"NAVER_FINAL_SCORE_MISSING"};
 const proof=scorePlausibility(fixture.sport,result.homeScore,result.awayScore);
 if(!proof.ok)return {ok:false,waitReason:"NAVER_INVALID_FINAL_SCORE:"+proof.reason};
 return {ok:true,finalConfirmed:true,source:"NAVER",gameId,
   result,sourceEvidence:"NAVER_SCHEDULE_FINAL",providerDate:date};
}
const profile=fixture=>{
 const league=norm(fixture.league);
 if(fixture.sport==="축구"){
  if(/k리그|kleague|j리그|jleague/.test(league))return ["kfootball","wfootball"];
  return ["wfootball","kfootball"];
 }
 if(fixture.sport==="농구"){
  if(/nba|동아시아|유럽|중국|일본/.test(league))return ["wbasketball","kbasketball"];
  return ["kbasketball","wbasketball"];
 }
 if(fixture.sport==="야구"){
  if(/mlb|npb|일본|미국/.test(league))return ["wbaseball","kbaseball"];
  return ["kbaseball","wbaseball"];
 }
 return [];
};
export const scheduleUrls=fixture=>profile(fixture).map(upperCategoryId=>{
 const query=new URLSearchParams({fields:"basic,schedule,football",upperCategoryId,
   fromDate:kstDate(fixture.startMs),toDate:kstDate(fixture.startMs),roundCodes:"",size:"500"});
 return API+"?"+query.toString();
});
export async function lookupNaverScheduleFinal(fixture,{
 fetchFn=fetch,timeoutMs=6500,now=Date.now(),cache=new Map()
}={}){
 if(!["축구","농구","야구"].includes(fixture.sport))
   return {ok:false,waitReason:"NAVER_SPORT_UNSUPPORTED"};
 const reasons=[];
 for(const url of scheduleUrls(fixture)){
  let response=cache.get(url);
  if(!response){
   try{
    const res=await fetchFn(url,{cache:"no-store",signal:AbortSignal.timeout(timeoutMs),
      headers:{accept:"application/json, text/plain, */*",
        referer:"https://m.sports.naver.com/", "user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12"}});
    response=res.ok?{ok:true,payload:await res.json()}:
      {ok:false,reason:"NAVER_SCHEDULE_HTTP_"+res.status};
   }catch(e){response={ok:false,reason:"NAVER_SCHEDULE_NETWORK:"+String(e).slice(0,80)};}
   cache.set(url,response);
  }
  if(!response.ok){reasons.push(response.reason);continue;}
  const result=parseNaverFinal(response.payload,fixture,{now});
  if(result.ok)return {...result,providerErrors:reasons};
  reasons.push(result.waitReason);
  // Don't query a second category when a unique match exists but
  // source does not prove its FINAL status: no alternative interpretation.
  if(["NAVER_FINAL_STATUS_UNCONFIRMED","NAVER_FINAL_SCORE_MISSING",
      "NAVER_INVALID_FINAL_SCORE","NAVER_AMBIGUOUS_FIXTURE"].some(x=>result.waitReason.startsWith(x)))
    break;
 }
 return {ok:false,waitReason:reasons.join(" | ").slice(0,180)||"NAVER_SCHEDULE_UNAVAILABLE",
   providerErrors:reasons};
}
