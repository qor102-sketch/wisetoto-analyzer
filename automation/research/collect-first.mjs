// Collection-first ledger: every Betman fixture in the 30min-to-kickoff window.
// Zero predictions. Results are added ONLY when a provider confirms final.
import {sportName} from "../logic.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const M=60000,D=86400000;
export const SCHEMA="wisetoto-collect-first-v1";
const key=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/[^가-힣a-z0-9]/g,"");
export const fixtureKey=g=>{
 const sport=sportName(g.sport),t=Number(g.gameDateMs??Date.parse(g.gameDate));
 const teams=[String(g.home??"").trim(),String(g.away??"").trim()];
 return sport&&Number.isFinite(t)&&teams.every(v=>v&&!/^(미정|tbd|tba|unknown|to be determined|-)$/i.test(v)&&key(v))
   ?[sport,t,key(g.home),key(g.away)].join("|"):null;
};
const sourceId=g=>{
 for(const x of [g.fixtureId,g.sportsFixtureId,g.sportsApiFixtureId,g.selectedFixture?.id]){
  if(x!==null&&x!==undefined&&/^\d+$/.test(String(x))&&Number(x)>0)return Number(x);
 }
 return null;
};
export function collect(state,feed,now=Date.now(),observedAt=now){
 if(!feed?.ok||!Array.isArray(feed.games)||!Number.isFinite(observedAt)||observedAt>now||
   now-observedAt>5*M)throw Error("fresh Betman feed required");
 const by=new Map((state?.records||[]).map(r=>[r.key,{...r}]));
 const sinceLastScan=Number.isFinite(state?.lastFeedAt)?observedAt-state.lastFeedAt:null;
 const summary={listed:feed.games.length,window:0,new:0,revisited:0,
   discovered:0,resultOnlyDiscovered:0,pregameCaptured:0,
   missedWindow:0,missingIdentity:0,noOdds:0,watchlistMissing:0,
   sinceLastScanMs:sinceLastScan,delayedScan:sinceLastScan!==null&&sinceLastScan>20*M};
 const listedKeys=new Set();
 for(const game of feed.games){
   const k=fixtureKey(game),t=Number(game.gameDateMs??Date.parse(game.gameDate));
   if(!k){summary.missingIdentity++;continue;}
   // Schedule metadata is stored as soon as the provider lists a fixture.
   // This is NOT a frozen pregame capture and MUST NOT train the predictor.
   // Also retain recently listed matches found after kickoff, tagged result-only.
   if(t>now+7*D||t<now-14*D)continue;
   listedKeys.add(k);
   const isPregame=now<t&&t-now<=30*M&&observedAt<t&&t-observedAt<=30*M;
   if(isPregame)summary.window++;
   let row=by.get(k);
   if(!row){
     row={key:k,sport:sportName(game.sport),league:String(game.league??""),
       home:String(game.home),away:String(game.away),startMs:t,
       firstSeenAt:observedAt,lastSeenAt:observedAt,seenCount:1,
       pregameCapturedAt:null,fixtureId:sourceId(game),odds:[],latestOdds:[],
       firstOddsAt:null,latestOddsAt:null,verdict:"PENDING",final:null,
       resultSource:null,verifiedAt:null,lastResultCheckAt:null,checkReason:"WAITING_FOR_END"};
     by.set(k,row);summary.discovered++;
     if(t<=now)summary.resultOnlyDiscovered++;
   }else{
     if(observedAt>Number(row.lastSeenAt??0)){
       row.lastSeenAt=observedAt;row.seenCount++;
     }
     if(row.fixtureId===null)row.fixtureId=sourceId(game);
     summary.revisited++;
   }
   if(!isPregame){
     if(t<=now&&row.pregameCapturedAt===null)summary.missedWindow++;
     continue;
   }
   const odds=Array.isArray(game.markets)?game.markets.flatMap(m=>
     (Array.isArray(m?.selections)?m.selections:[]).map(v=>({
       market:String(m?.betName??m?.type??""),side:String(v?.side??v?.label??""),
       odds:Number(v?.odds)})).filter(v=>Number.isFinite(v.odds)&&v.odds>1)):[];
   if(!odds.length)summary.noOdds++;
   if(row.pregameCapturedAt===null){
     row.pregameCapturedAt=observedAt;
     row.odds=odds;row.firstOddsAt=odds.length?observedAt:null;
     row.latestOdds=odds;row.latestOddsAt=odds.length?observedAt:null;
     summary.new++;summary.pregameCaptured++;
   }else if(odds.length&&observedAt>Number(row.latestOddsAt??0)){
     if(!row.odds.length){row.odds=odds;row.firstOddsAt=observedAt;}
     row.latestOdds=odds;row.latestOddsAt=observedAt;
   }
 }
 // Important: older pending results are retained long enough for retries.
 // Previously discovered fixtures can disappear from Betman just when the
 // 30-minute real-odds capture is due. Preserve a visible incident instead of
 // manufacturing odds or silently assuming the match was still offered.
 for(const r of by.values()){
   if(r.startMs>now&&r.startMs-now<=30*M&&!listedKeys.has(r.key)&&
       r.pregameCapturedAt===null){
     summary.watchlistMissing++;
     r.captureIssue="BETMAN_WATCHLIST_DISAPPEARED_IN_CAPTURE_WINDOW";
     if(!r.firstMissingAt)r.firstMissingAt=observedAt;
   }
   if(r.startMs<=now&&r.pregameCapturedAt===null&&!r.missedWindowAt&&
       r.startMs>=now-14*D){
     r.missedWindowAt=now;
     r.captureIssue=r.captureIssue??"NO_VERIFIED_FEED_DURING_CAPTURE_WINDOW";
   }
 }
 // Do not truncate here. Archive export must persist expired rows FIRST.
 // The workflow archives, verifies and then removes old rows from the active ledger.
 const records=[...by.values()]
   .sort((a,b)=>b.startMs-a.startMs||a.key.localeCompare(b.key));
 return {state:{...state,schema:SCHEMA,updatedAt:now,lastFeedAt:observedAt,
   lastFeedOk:true,lastFeedError:null,lastCaptureSummary:summary,records},summary};
}
export function settlement(state,tracker=[],now=Date.now()){
 const rows=(state.records||[]).map(r=>({...r}));
 const index=new Map((tracker||[]).filter(r=>r?.verificationStatus==="VERIFIED"&&
   r?.result&&Number(r.verifiedAt)<=now&&Number(r.verifiedAt)>Number(r.startMs))
   .map(r=>[fixtureKey({sport:r.sport,home:r.home,away:r.away,gameDateMs:r.startMs}),r]));
 let settled=0;
 for(const r of rows){
   if(r.verdict!=="PENDING")continue;
   const found=index.get(r.key);
   if(!found)continue;
   if(!scorePlausibility(r.sport,found.result.homeScore,found.result.awayScore).ok)continue;
   r.verdict="VERIFIED";r.final={homeScore:Number(found.result.homeScore),awayScore:Number(found.result.awayScore)};
   r.verifiedAt=Number(found.verifiedAt);r.resultSource="VERIFIED_TRACKER";r.checkReason=null;settled++;
 }
 return {state:{...state,updatedAt:now,records:rows},settled};
}
export function mergeProviderFinal(state,fixtureKeyValue,payload,now=Date.now()){
 const rows=(state.records||[]).map(r=>({...r}));const r=rows.find(x=>x.key===fixtureKeyValue);
 if(!r||r.verdict!=="PENDING")return state;
 r.lastResultCheckAt=now;
 r.resultChecks=(Number(r.resultChecks)||0)+1;
 // Keep failed source evidence even if another provider later confirms FINAL.
 const issues=Array.isArray(payload?.providerErrors)?payload.providerErrors
   .map(x=>String(x).slice(0,180)).slice(0,6):[];
 if(issues.length)r.resultErrors=[...(Array.isArray(r.resultErrors)?r.resultErrors:[]),
   {at:now,reasons:issues}].slice(-12);
 if(payload?.ok!==true||payload.finalConfirmed!==true||!payload.result){
   r.checkReason=String(payload?.waitReason??payload?.error??"UNCONFIRMED_FINAL").slice(0,180);
 }else if(!scorePlausibility(r.sport,payload.result.homeScore,payload.result.awayScore).ok){
   r.checkReason="INVALID_SPORT_SCORE";
 }else{
   r.verdict="VERIFIED";r.final={homeScore:Number(payload.result.homeScore),awayScore:Number(payload.result.awayScore)};
   r.resultSource=["SPORTSAPI","NAVER"].includes(payload.source)
     ?payload.source:"VERIFIED_FINAL_PROVIDER";r.verifiedAt=now;r.checkReason=null;
 }
 return {...state,updatedAt:now,records:rows};
}
export function verifiedNaverFinal(payload){
 // Naver route returns only schedule-exact matched event rows; recent-only
 // football responses are explicitly incomplete. Reject any ambiguous ones.
 if(payload?.ok!==true||payload.completed!==true||payload.cancelled===true||
    payload.partial===true||payload.recentOnly===true||!payload.gameId||
    !payload.finalScore)return {ok:false,waitReason:"NAVER_FINAL_OR_ID_UNCONFIRMED"};
 const home=payload.finalScore.home,away=payload.finalScore.away;
 if(home===null||away===null||!Number.isFinite(Number(home))||!Number.isFinite(Number(away)))
   return {ok:false,waitReason:"NAVER_SCORE_MISSING"};
 return {ok:true,finalConfirmed:true,result:{homeScore:Number(home),awayScore:Number(away)}};
}
export function dueResults(state,now=Date.now(),limit=6){
 return (state.records||[]).filter(r=>r.verdict==="PENDING"&&
   r.startMs<=now-2*60*M&&r.startMs>=now-14*D&&
   (!r.lastResultCheckAt||now-r.lastResultCheckAt>=60*M))
   .sort((a,b)=>Number(a.lastResultCheckAt??0)-Number(b.lastResultCheckAt??0)||
     a.startMs-b.startMs).slice(0,limit);
}
export function projection(state,now=Date.now()){
 const records=(state.records||[]).map(({odds,latestOdds,...r})=>({...r,oddsCount:odds.length}))
   .sort((a,b)=>b.startMs-a.startMs).slice(0,150);
 const all=state.records||[];
 return {schema:"wisetoto-collect-first-public-v1",generatedAt:new Date(now).toISOString(),
   source:{lastFeedAt:state?.lastFeedAt??null,ok:state?.lastFeedOk===true,error:state?.lastFeedError??null,
     lastCaptureSummary:state?.lastCaptureSummary??null},
   counts:{collected:all.length+(state.archiveCounts?.collected??0),
     active:all.length,archived:state.archiveCounts?.collected??0,
     verified:all.filter(x=>x.verdict==="VERIFIED").length+(state.archiveCounts?.verified??0),
     pending:all.filter(x=>x.verdict==="PENDING").length+(state.archiveCounts?.pending??0),
     pregameCaptured:all.filter(x=>Number.isFinite(x.pregameCapturedAt)).length+(state.archiveCounts?.pregameCaptured??0),
     verifiedWithPregame:all.filter(x=>x.verdict==="VERIFIED"&&
       Number.isFinite(x.pregameCapturedAt)&&x.pregameCapturedAt<x.startMs).length+(state.archiveCounts?.verifiedWithPregame??0),
     resultOnly:all.filter(x=>x.startMs<=now&&!Number.isFinite(x.pregameCapturedAt)).length+(state.archiveCounts?.resultOnly??0),
     missingFixtureId:all.filter(x=>x.fixtureId===null).length+(state.archiveCounts?.missingFixtureId??0)},
   records};
}
