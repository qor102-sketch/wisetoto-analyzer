// Optional API-Football v3 free-tier fallback, run on GitHub Actions only.
// No API token is ever persisted, logged, or sent to Vercel. Exact fixture
// proof is mandatory; not-found/partial/after-kickoff evidence stays PENDING.
import {espnLeague,espnTeamEq} from "./espn-fast-final.mjs";
import {jleagueLineupDivision} from "./jleague-official-lineup.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const API="https://v3.football.api-sports.io";
const M=60_000,DAY=86400000,MAX_DAILY=60;
const norm=x=>String(x??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const knownLeagues={
 "eng.1":["premierleague","england"],"eng.2":["championship","england"],
 "esp.1":["laliga","spain"],"esp.2":["segundadivision","spain"],
 "ita.1":["seriea","italy"],"ita.2":["serieb","italy"],
 "ger.1":["bundesliga","germany"],"ger.2":["2bundesliga","germany"],
 "fra.1":["ligue1","france"],"fra.2":["ligue2","france"],
 "ned.1":["eredivisie","netherlands"],"aus.1":["aleague","australia"],
 "usa.1":["majorleaguesoccer","usa"],
 "jpn.1":["j1league","japan"],"jpn.2":["j2league","japan"]
};
export const API_FOOTBALL_SAFE_DAILY_LIMIT=MAX_DAILY;
export function apiFootballCompetition(row){
 if(row?.sport!=="축구")return null;
 const j=jleagueLineupDivision(row);
 const id=j?"jpn."+j.slice(-1):espnLeague(row);
 return knownLeagues[id]?id:null;
}
export function apiFootballQuota(raw,now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10);
 const clean={schema:"wisetoto-api-football-free-v1",day,requests:0,lastAt:{}};
 if(raw?.schema!==clean.schema||raw.day!==day||
   !Number.isSafeInteger(raw.requests)||raw.requests<0||raw.requests>MAX_DAILY)
  return clean;
 clean.requests=raw.requests;
 const old=raw.lastAt;
 if(old&&typeof old==="object"&&!Array.isArray(old)){
  for(const [k,v] of Object.entries(old).slice(-100)){
   if(k.length<=55&&Number.isFinite(v)&&v<=now+M&&v>=now-DAY)
    clean.lastAt[k]=v;
  }
 }
 return clean;
}
const same=(a,b)=>espnTeamEq(a,b)||Boolean(norm(a)&&norm(a)===norm(b));
const matchLeague=(f,key)=>{
 const [league,country]=knownLeagues[key]??[];
 if(!league||norm(f?.league?.name)!==league)return false;
 if(!f.league?.country||norm(f.league.country)!==country)return false;
 return true;
};
export function exactApiFootballFixture(payload,row){
 const league=apiFootballCompetition(row);
 if(!league||!Array.isArray(payload?.response)||
    payload.response.length>1500)return {ok:false,reason:"API_FOOTBALL_FIXTURE_RESPONSE_INVALID"};
 const matches=new Map();
 for(const f of payload.response){
  if(!matchLeague(f,league))continue;
  const id=String(f?.fixture?.id??"");
  if(!/^[1-9]\d+$/.test(id))continue;
  const start=Date.parse(String(f?.fixture?.date??""));
  if(!Number.isFinite(start)||Math.abs(start-row.startMs)>45*M)continue;
  if(!same(row.home,f.teams?.home?.name)||!same(row.away,f.teams?.away?.name))continue;
  if(!Number.isSafeInteger(f?.teams?.home?.id)||!Number.isSafeInteger(f?.teams?.away?.id)||
     f.teams.home.id===f.teams.away.id)continue;
  if(matches.has(id))return {ok:false,reason:"API_FOOTBALL_DUPLICATE_FIXTURE"};
  matches.set(id,f);
 }
 if(matches.size!==1)return {ok:false,reason:matches.size?
  "API_FOOTBALL_AMBIGUOUS_FIXTURE":"API_FOOTBALL_EXACT_FIXTURE_UNAVAILABLE"};
 return {ok:true,gameId:matches.keys().next().value,game:matches.values().next().value};
}
export function parseApiFootballFinal(payload,row){
 const x=exactApiFootballFixture(payload,row);
 if(!x.ok)return {ok:false,waitReason:x.reason};
 const f=x.game;
 // AET and PEN are not 90-minute soccer markets; only explicit FT counts.
 if(String(f.fixture?.status?.short)!=="FT")
  return {ok:false,waitReason:"API_FOOTBALL_NOT_REGULATION_FINAL"};
 const h=f.score?.fulltime?.home,a=f.score?.fulltime?.away;
 if(!Number.isSafeInteger(h)||!Number.isSafeInteger(a)||
    h!==f.goals?.home||a!==f.goals?.away||
    !scorePlausibility("축구",h,a).ok)
  return {ok:false,waitReason:"API_FOOTBALL_FINAL_SCORE_UNCONFIRMED"};
 return {ok:true,finalConfirmed:true,source:"API_FOOTBALL",
  sourceEvidence:"API_FOOTBALL_EXACT_FT",gameId:x.gameId,
  result:{homeScore:h,awayScore:a}};
}
export function parseApiFootballPregameLineup(payload,source,row,at){
 if(at>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
 if(!source?.ok||!Array.isArray(payload?.response)||
    payload.response.length!==2)return {status:"UNAVAILABLE",reason:"API_FOOTBALL_LINEUP_NOT_PUBLISHED"};
 const ids=[source.game.teams.home.id,source.game.teams.away.id];
 const sides=[];
 for(let i=0;i<2;i++){
  const matched=payload.response.filter(x=>x.team?.id===ids[i]);
  if(matched.length!==1||!same(row[i===0?"home":"away"],matched[0].team?.name))
   return {status:"UNAVAILABLE",reason:"API_FOOTBALL_LINEUP_TEAM_MISMATCH"};
  const starters=matched[0].startXI;
  if(!Array.isArray(starters)||starters.length!==11)
   return {status:"UNAVAILABLE",reason:"API_FOOTBALL_STARTXI_NOT_PUBLISHED"};
  const players=starters.map(x=>String(x?.player?.name??"").trim());
  if(players.some(x=>!x||x.length>80)||new Set(players.map(norm)).size!==11||
     starters.some(x=>!Number.isSafeInteger(x?.player?.id)||x.player.id<=0))
   return {status:"UNAVAILABLE",reason:"API_FOOTBALL_INVALID_PLAYER_ID_OR_NAME"};
  sides.push(players);
 }
 return {status:"CONFIRMED",reason:"API_FOOTBALL_VERIFIED_PREGAME_XI",
  source:"API_FOOTBALL_MATCH_STARTERS",gameId:source.gameId,capturedAt:at,
  home:sides[0],away:sides[1],homeCount:11,awayCount:11,
  homeStarter:null,awayStarter:null,providerCapturedAt:null};
}
export function createApiFootballSession({
 apiKey="",rawQuota=null,now=Date.now,fetchFn=fetch,maxPerScan=3
}={}){
 let quota=apiFootballQuota(rawQuota,now());
 let calls=0,failures=0,quotaBlocked=0,quotaRequests=0;
 const cache=new Map();
 const enabled=Boolean(apiKey&&String(apiKey).trim().length>=12);
 async function ask(kind,id,query,interval){
  const at=now(),day=new Date(at).toISOString().slice(0,10);
  if(quota.day!==day)quota=apiFootballQuota(null,at);
  const cacheKey=kind+":"+id;
  if(cache.has(cacheKey))return cache.get(cacheKey);
  if(!enabled)return {ok:false,reason:"API_FOOTBALL_KEY_NOT_CONFIGURED"};
  if(quota.requests>=MAX_DAILY||calls>=maxPerScan){
   quotaBlocked++;return {ok:false,reason:"API_FOOTBALL_LOCAL_QUOTA_BLOCK"};
  }
  if(at-(quota.lastAt[cacheKey]??-Infinity)<interval){
   return {ok:false,reason:"API_FOOTBALL_RETRY_COOLDOWN"};
  }
  // Charge before I/O: aborted and rejected calls may still use a request.
  quota.requests++;
  quota.lastAt[cacheKey]=at;
  calls++;quotaRequests++;
  let result;
  try{
   const url=API+kind+"?"+new URLSearchParams(query);
   const res=await fetchFn(url,{method:"GET",cache:"no-store",
    signal:AbortSignal.timeout(7000),
    headers:{"x-apisports-key":apiKey,accept:"application/json"}});
   const payload=res.ok?await res.json():null;
   result=res.ok&&Array.isArray(payload?.response)&&
      !(payload.errors&&Object.keys(payload.errors).length)?
     {ok:true,payload}:{ok:false,reason:"API_FOOTBALL_HTTP_"+res.status};
   if(!result.ok)failures++;
  }catch(e){
   failures++;
   result={ok:false,reason:"API_FOOTBALL_NETWORK:"+String(e?.name??"ERROR").slice(0,40)};
  }
  cache.set(cacheKey,result);return result;
 }
 async function discover(row){
  if(!apiFootballCompetition(row))
   return {ok:false,reason:"API_FOOTBALL_LEAGUE_UNSUPPORTED"};
  const date=new Date(row.startMs).toISOString().slice(0,10);
  const resp=await ask("/fixtures","day-"+date,{date,timezone:"UTC"},20*M);
  if(!resp.ok)return resp;
  return exactApiFootballFixture(resp.payload,row);
 }
 async function lookupFinal(row){
  const exact=await discover(row);
  if(!exact.ok)return {ok:false,waitReason:exact.reason};
  // The day response is reused once per scan: independent fixture evidence.
  const date=new Date(row.startMs).toISOString().slice(0,10);
  return parseApiFootballFinal(cache.get("/fixtures:day-"+date)?.payload,row);
 }
 async function lookupPregame(row){
  if(now()>=row.startMs)return {status:"REJECTED",reason:"AFTER_KICKOFF_NOT_PREGAME"};
  const exact=await discover(row);
  if(!exact.ok)return {status:"UNAVAILABLE",reason:exact.reason};
  const p=await ask("/fixtures/lineups",exact.gameId,{fixture:exact.gameId},15*M);
  if(!p.ok)return {status:"UNAVAILABLE",reason:p.reason};
  return parseApiFootballPregameLineup(p.payload,exact,row,now());
 }
 return {
  enabled,lookupFinal,lookupPregame,
  quota:()=>JSON.parse(JSON.stringify(quota)),
  summary:()=>({enabled,requests:quotaRequests,failures,quotaBlocked,remaining:MAX_DAILY-quota.requests})
 };
}
