// Collection-first ledger: every Betman fixture in the 30min-to-kickoff window.
// Zero predictions. Results are added ONLY when a provider confirms final.
import {sportName} from "../logic.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const M=60000,D=86400000;
export const SCHEMA="wisetoto-collect-first-v1";
const key=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/[^가-힣a-z0-9]/g,"");
export const fixtureKey=g=>{
 const sport=sportName(g.sport),t=Number(g.gameDateMs??Date.parse(g.gameDate));
 return sport&&Number.isFinite(t)&&g.home&&g.away?[sport,t,key(g.home),key(g.away)].join("|"):null;
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
 const summary={listed:feed.games.length,window:0,new:0,revisited:0,missingIdentity:0,noOdds:0};
 for(const game of feed.games){
   const k=fixtureKey(game),t=Number(game.gameDateMs??Date.parse(game.gameDate));
   if(!k){summary.missingIdentity++;continue;}
   if(t-now<0||t-now>30*M)continue;
   summary.window++;
   const odds=Array.isArray(game.markets)?game.markets.flatMap(m=>
     (m.selections||[]).map(s=>({market:String(m.betName??m.type??""),
       side:String(s.side??s.label??""),odds:Number(s.odds)}))
        .filter(x=>Number.isFinite(x.odds)&&x.odds>1)):[];
   if(!odds.length)summary.noOdds++;
   const prior=by.get(k);
   if(prior){prior.lastSeenAt=observedAt;prior.seenCount++;
     if(prior.fixtureId===null)prior.fixtureId=sourceId(game);
     if(prior.odds.length===0&&odds.length)prior.odds=odds;
     summary.revisited++;continue;}
   by.set(k,{key:k,sport:sportName(game.sport),league:String(game.league??""),
     home:String(game.home),away:String(game.away),startMs:t,
     firstSeenAt:observedAt,lastSeenAt:observedAt,seenCount:1,
     fixtureId:sourceId(game),odds,verdict:"PENDING",final:null,
     resultSource:null,verifiedAt:null,lastResultCheckAt:null,checkReason:"WAITING_FOR_END"});
   summary.new++;
 }
 const records=[...by.values()].filter(r=>r.startMs>now-120*D)
   .sort((a,b)=>b.startMs-a.startMs||a.key.localeCompare(b.key)).slice(0,4000);
 return {state:{schema:SCHEMA,updatedAt:now,records},summary};
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
 if(payload?.ok!==true||payload.finalConfirmed!==true||!payload.result){
   r.checkReason=String(payload?.waitReason??payload?.error??"UNCONFIRMED_FINAL").slice(0,100);
 }else if(!scorePlausibility(r.sport,payload.result.homeScore,payload.result.awayScore).ok){
   r.checkReason="INVALID_SPORT_SCORE";
 }else{
   r.verdict="VERIFIED";r.final={homeScore:Number(payload.result.homeScore),awayScore:Number(payload.result.awayScore)};
   r.resultSource="FINAL_STATUS_CONFIRMED";r.verifiedAt=now;r.checkReason=null;
 }
 return {...state,updatedAt:now,records:rows};
}
export function dueResults(state,now=Date.now(),limit=6){
 return (state.records||[]).filter(r=>r.verdict==="PENDING"&&
   r.startMs<=now-2*60*M&&r.startMs>=now-14*D&&r.fixtureId!==null&&
   (!r.lastResultCheckAt||now-r.lastResultCheckAt>=60*M))
   .sort((a,b)=>Number(a.lastResultCheckAt??0)-Number(b.lastResultCheckAt??0)||
     a.startMs-b.startMs).slice(0,limit);
}
export function projection(state,now=Date.now()){
 const records=(state.records||[]).map(({odds,...r})=>({...r,oddsCount:odds.length}))
   .sort((a,b)=>b.startMs-a.startMs).slice(0,150);
 const all=state.records||[];
 return {schema:"wisetoto-collect-first-public-v1",generatedAt:new Date(now).toISOString(),
   counts:{collected:all.length,verified:all.filter(x=>x.verdict==="VERIFIED").length,
     pending:all.filter(x=>x.verdict==="PENDING").length,
     missingFixtureId:all.filter(x=>x.fixtureId===null).length},
   records};
}
