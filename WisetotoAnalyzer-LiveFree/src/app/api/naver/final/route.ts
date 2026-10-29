// Lightweight Naver SCORE-ONLY proxy for GitHub's read-only postmatch audit.
// No lineup, players, previews, browser warm-up, paid API or prediction logic.
const NAVER="https://api-gw.sports.naver.com/schedule/games";
const VALID_UPPER=new Set(["wfootball","kfootball","wbasketball","kbasketball","wbaseball","kbaseball"]);
const LIMIT=500;
const DAY=86400000;
const safe=(v:unknown)=>typeof v==="string"?v.slice(0,220):typeof v==="number"&&Number.isFinite(v)?v:
 typeof v==="boolean"?v:null;
function fixtureRows(root:unknown){
 const obj=root as Record<string,any>|null;
 const direct=obj?.result?.games??obj?.games??obj?.data?.games??obj?.result?.schedule?.games;
 if(Array.isArray(direct))return direct.slice(0,LIMIT);
 const out:any[]=[];
 function walk(v:any,depth:number){
  if(!v||typeof v!=="object"||depth>5||out.length>=LIMIT)return;
  if(Array.isArray(v)){for(const g of v.slice(0,LIMIT))walk(g,depth+1);return;}
  if(v.gameId||v.game_id){
   if(v.homeTeamName||v.homeTeamShortName||v.homeName||v.home?.name){
    out.push(v);return;
   }
  }
  for(const [k,a] of Object.entries(v)){
   if(["players","lineup","statistics","debug","odds"].includes(k))continue;
   walk(a,depth+1);
  }
 }
 walk(root,0);return out;
}
function minimalGame(g:any){
 const props=["gameId","game_id","gameDateTime","startTime","gameDate","date",
  "categoryId","category","leagueId","league","upperCategoryId",
  "homeTeamName","awayTeamName","homeTeamShortName","awayTeamShortName",
  "homeTeamFullName","awayTeamFullName","homeName","awayName",
  "homeScore","awayScore","homeTeamScore","awayTeamScore","hScore","aScore",
  "statusCode","statusInfo","gameStatus","status","gameStatusName","statusNum",
  "completed","isFinal","isFinished","cancelled","canceled","postponed","abandoned"] as const;
 const row:Record<string,unknown>={};
 for(const p of props)if(g?.[p]!==undefined){
  const value=g[p];
  if(value!==null&&typeof value==="object"&&!Array.isArray(value)){
   row[p]=Object.fromEntries(["name","code","short","description"].map(k=>[k,safe(value[k])]));
  }else row[p]=safe(value);
 }
 for(const key of ["score","finalScore","result"]){
  if(!g?.[key]||typeof g[key]!=="object")continue;
  row[key]=Object.fromEntries(["home","away","homeScore","awayScore"].map(k=>[k,safe(g[key][k])]));
 }
 return row;
}
function dateKey(v:string){return Date.parse(v+"T00:00:00+09:00");}
export async function GET(request:Request){
 const url=new URL(request.url);
 const upper=url.searchParams.get("upperCategoryId")??"";
 const date=url.searchParams.get("date")??"";
 if(!VALID_UPPER.has(upper)||!/^20\d{2}-\d\d-\d\d$/.test(date)||
    !Number.isFinite(dateKey(date))||new Date(dateKey(date)+9*3600000).toISOString().slice(0,10)!==date)
  return Response.json({ok:false,waitReason:"INVALID_SCHEDULE_PARAMETERS"},{status:400});
 const now=Date.now(),at=dateKey(date);
 if(at<now-43*DAY||at>now+8*DAY)
  return Response.json({ok:false,waitReason:"SCHEDULE_DATE_OUTSIDE_AUDIT_WINDOW"},{status:400});
 const fields=upper.endsWith("football")?"basic,schedule,football":"basic,schedule,categoryName,statusNum";
 const qs=new URLSearchParams({fields,upperCategoryId:upper,fromDate:date,toDate:date,roundCodes:"",size:String(LIMIT)});
 try{
  const result=await fetch(NAVER+"?"+qs,{
   cache:"no-store",signal:AbortSignal.timeout(8500),
   headers:{accept:"application/json, text/plain, */*",
    referer:"https://m.sports.naver.com/","user-agent":"Mozilla/5.0 WisetotoAnalyzer/13.12.34"}});
  if(!result.ok)return Response.json({ok:false,
   waitReason:"NAVER_PROVIDER_HTTP_"+result.status},{status:502});
  const data=await result.json().catch(()=>null);
  if(!data)return Response.json({ok:false,waitReason:"NAVER_PROVIDER_INVALID_JSON"},{status:502});
  const games=fixtureRows(data).map(minimalGame);
  return Response.json({ok:true,source:"NAVER_SCHEDULE_ONLY",result:{games}},
   {headers:{"cache-control":"no-store"}});
 }catch(e){
  return Response.json({ok:false,waitReason:"NAVER_PROVIDER_NETWORK:"+String(e).slice(0,100)},{status:504});
 }
}
