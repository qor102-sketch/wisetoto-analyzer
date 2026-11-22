// Prospective, immutable RESEARCH-ONLY accuracy/selection shadow.
// This module never updates the official PRE, TOP1, odds or original pilot.
// Pre-register on the NEXT period, starting only after the original 28 days.
import {withoutNba} from "../nba-policy.mjs";

const DAY=86_400_000;
const SCHEMA="wisetoto-selective-accuracy-shadow-v1";
const SPORTS=["축구","농구","야구","배구"];
const STRATEGIES=["BASE_2P","STRONG_4P","SELECTIVE_4P","BLEND_80_20","BLEND_60_40"];
const MODEL_MIN_PRIOR=20,MODEL_PRIOR_WEIGHT=40;
const safeRound=(v,n=4)=>Number.isFinite(v)?Number(v.toFixed(n)):null;
const validNumber=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const isResult=x=>x?.truth&&!x.truth.untrained&&
 ["win","draw","lose"].includes(x.truth.winner)&&
 Number.isFinite(x.truth.verifiedAt)&&x.truth.verifiedAt>x.startMs;
const validChoice=p=>p&&["win","draw","lose"].includes(p.side)&&
 validNumber(p.marketProbability,0.000001,0.999999)&&
 validNumber(p.odds,1.020001,100)&&Number.isFinite(p.shift)&&
 Number.isFinite(p.marketHold)&&p.marketHold>=-0.01&&p.marketHold<=0.25&&
 Number.isFinite(p.asOf);
const finishedFixture=(f,now)=>isResult(f)&&f.truth.verifiedAt<=now;
const noLookahead=(f,at)=>f&&Number.isFinite(f.startMs)&&
 at<f.startMs&&at>=0;
const fixtureKey=f=>String(f.id??"");
const binaryScore=(p,y)=>{
 const prob=Math.min(1-1e-9,Math.max(1e-9,p));
 return {brier:(prob-y)**2,logLoss:-(y*Math.log(prob)+(1-y)*Math.log(1-prob))};
};
const wilson90=(hits,n)=>{
 if(!n)return null;
 const z=1.64485362695147,p=hits/n,denom=1+z*z/n;
 const center=(p+z*z/(2*n))/denom;
 const spread=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
 return [safeRound(Math.max(0,center-spread)),safeRound(Math.min(1,center+spread))];
};
const clonePick=(p,kind,model=null)=>({
 status:"PICK",kind,asOf:p.asOf,side:p.side,
 odds:p.odds,pMarket:p.marketProbability,
 pForecast:model?.probability??p.marketProbability,
 shift:p.shift,marketHold:p.marketHold,
 modelSamples:model?.n??0,
 // Snapshot provenance: copied once; no future data or outcome is included.
 source:"FROZEN_PREKICKOFF_MARKET"
});
const verifiedPrior=(f,fixtures,at)=>{
 const original=f.lastEvidence?.top1;
 if(!original)return null;
 const p=original.marketProbability;
 const history=(fixtures??[]).filter(x=>
  x!==f&&fixtureKey(x)!==fixtureKey(f)&&x.sport===f.sport&&
  Number.isFinite(x.startMs)&&x.startMs<at&&
  isResult(x)&&x.truth.verifiedAt<at&&
  x.frozenCandidate&&noLookahead(x,x.frozenCandidate.asOf)&&
  validNumber(x.frozenCandidate.marketProbability,0.000001,0.999999)&&
  Math.abs(x.frozenCandidate.marketProbability-p)<=0.15);
 if(history.length<MODEL_MIN_PRIOR)return null;
 const wins=history.filter(x=>x.frozenCandidate.side===x.truth.winner).length;
 return {probability:(wins+MODEL_PRIOR_WEIGHT*p)/(history.length+MODEL_PRIOR_WEIGHT),
  n:history.length};
};
const blended=(p,model,marketWeight,kind)=>{
 const probability=marketWeight*p.marketProbability+
  (1-marketWeight)*model.probability;
 // Use gross book odds as the market break-even reference. This is a
 // prospective SHADOW selection, not certified expected-value evidence.
 const margin=probability-1/p.odds;
 const ok=probability>=0.5&&margin>=0.02;
 return {...clonePick(p,kind,{probability,n:model.n}),
  status:ok?"PICK":"NO_PICK",
  reason:ok?"PRESPECIFIED_BLEND_EDGE":"PRESPECIFIED_EDGE_GATE",
  breakEvenMargin:safeRound(margin,5)};
};
export function shadowStartFromPilot(state){
 const at=state?.pilot?.startedAt;
 return Number.isFinite(at)&&at>0?at+28*DAY:null;
}
export function freezeProspectiveAccuracy(fixtures,{startAt,now,observedAt}={}){
 if(!Number.isFinite(startAt)||!Number.isFinite(now)||
    !Number.isFinite(observedAt)||observedAt>now||
    now<startAt||now>=startAt+28*DAY)
  return {changed:0,startedAt:startAt??null};
 let changed=0;
 for(const f of withoutNba(fixtures??[])){
  if(!Number.isFinite(f.startMs)||f.startMs<startAt||
     f.startMs>=startAt+28*DAY||now>=f.startMs||
     f?.accuracyShadowV1?.schema&&f.accuracyShadowV1.schema!==SCHEMA)
   continue;
  const p=f.lastEvidence?.top1;
  if(!validChoice(p)||p.asOf!==observedAt||
     p.asOf<startAt||p.asOf>now||!noLookahead(f,p.asOf))continue;
  const last=f.snapshots?.at(-1);
  const first=f.snapshots?.[0];
  if(!last||last.at!==observedAt||!first||
     last.at-first.at<30*60_000||!last.market||
     !Array.isArray(last.market.choices)||last.market.choices.length<2)
   continue;
  const record=f.accuracyShadowV1?.schema===SCHEMA?
   f.accuracyShadowV1:{schema:SCHEMA,strategies:{}};
  const choices={...record.strategies};
  const before=Object.keys(choices).length;
  if(p.shift>=0.02&&!choices.BASE_2P)choices.BASE_2P=clonePick(p,"BASE_2P");
  if(p.shift>=0.04&&!choices.STRONG_4P)
   choices.STRONG_4P=clonePick(p,"STRONG_4P");
  // Low-overround, market-supported, large-change cohort. No hidden
  // sport exclusion or hindsight optimization using the 28-day pilot.
  if(p.shift>=0.04&&p.marketHold<=0.08&&p.marketProbability>=0.55&&
     !choices.SELECTIVE_4P)
   choices.SELECTIVE_4P=clonePick(p,"SELECTIVE_4P");
  if(!choices.BLEND_80_20||!choices.BLEND_60_40){
   const model=verifiedPrior(f,fixtures,p.asOf);
   if(model){
    if(!choices.BLEND_80_20)
     choices.BLEND_80_20=blended(p,model,0.8,"BLEND_80_20");
    if(!choices.BLEND_60_40)
     choices.BLEND_60_40=blended(p,model,0.6,"BLEND_60_40");
   }
  }
  if(Object.keys(choices).length>before){
   f.accuracyShadowV1={schema:SCHEMA,strategies:choices};
   changed++;
  }
 }
 return {changed,startedAt:startAt};
}
function metrics(rows,strategy,allEligible){
 const picks=rows.filter(x=>x.pick?.status==="PICK");
 const gradedPicks=picks.filter(x=>finishedFixture(x.f,x.now));
 let hits=0,profit=0,loss=0,logLoss=0,marketLoss=0,marketLogLoss=0;
 for(const {f,pick} of gradedPicks){
  const correct=f.truth.winner===pick.side?1:0;
  hits+=correct;
  profit+=correct?pick.odds-1:-1;
  const c=binaryScore(pick.pForecast,correct);
  const b=binaryScore(pick.pMarket,correct);
  loss+=c.brier;logLoss+=c.logLoss;
  marketLoss+=b.brier;marketLogLoss+=b.logLoss;
 }
 const n=gradedPicks.length;
 const forecasts=rows.filter(x=>x.pick?.status==="NO_PICK"&&
  finishedFixture(x.f,x.now));
 const allForecasts=[...gradedPicks,...forecasts];
 let sumForecast=0,sumForecastMarket=0;
 for(const {f,pick} of allForecasts){
  const y=f.truth.winner===pick.side?1:0;
  sumForecast+=binaryScore(pick.pForecast,y).brier;
  sumForecastMarket+=binaryScore(pick.pMarket,y).brier;
 }
 const gradedOpportunities=allEligible.filter(x=>finishedFixture(x.f,x.now));
 const pairedBase=gradedPicks.map(x=>{
  const b=x.f.accuracyShadowV1?.strategies?.BASE_2P;
  return b?.status==="PICK"?{f:x.f,pick:b,now:x.now}:null;
 }).filter(Boolean);
 const pairedHits=pairedBase.filter(x=>x.f.truth.winner===x.pick.side).length;
 const pairedProfit=pairedBase.reduce((a,x)=>a+(x.f.truth.winner===x.pick.side?
  x.pick.odds-1:-1),0);
 return {strategy,picks:picks.length,graded:n,hits,misses:n-hits,
  hitRate:n?safeRound(hits/n):null,hitCI90:wilson90(hits,n),
  unitProfit:n?safeRound(profit):null,unitROI:n?safeRound(profit/n):null,
  binaryBrier:n?safeRound(loss/n):null,binaryLogLoss:n?safeRound(logLoss/n):null,
  marketBinaryBrier:n?safeRound(marketLoss/n):null,
  marketBinaryLogLoss:n?safeRound(marketLogLoss/n):null,
  forecastsGraded:allForecasts.length,
  forecastBinaryBrier:allForecasts.length?
   safeRound(sumForecast/allForecasts.length):null,
  forecastMarketBinaryBrier:allForecasts.length?
   safeRound(sumForecastMarket/allForecasts.length):null,
  eligibleGraded:gradedOpportunities.length,
  selectionCoverage:gradedOpportunities.length?safeRound(n/gradedOpportunities.length):null,
  pairedBaseGraded:pairedBase.length,
  pairedBaseHitRate:pairedBase.length?safeRound(pairedHits/pairedBase.length):null,
  pairedBaseROI:pairedBase.length?safeRound(pairedProfit/pairedBase.length):null
 };
}
export function buildAccuracyShadowReport(state,now=Date.now()){
 const startedAt=shadowStartFromPilot(state);
 if(!Number.isFinite(startedAt))return {schema:SCHEMA,status:"WAITING_FOR_ORIGINAL_PILOT",
  startedAt:null,endsAt:null};
 const endsAt=startedAt+28*DAY;
 const status=now<startedAt?"SCHEDULED":now<endsAt?"COLLECTING":"REVIEW_READY";
 const fixtures=withoutNba(state?.fixtures??[]).filter(f=>
  Number.isFinite(f?.startMs)&&f.startMs>=startedAt&&f.startMs<endsAt);
 const eligible=fixtures.filter(f=>f.accuracyShadowV1?.schema===SCHEMA&&
   f.accuracyShadowV1.strategies?.BASE_2P?.status==="PICK");
 const perStrategy=Object.fromEntries(STRATEGIES.map(id=>[id,
  metrics(eligible.map(f=>({f,now,pick:f.accuracyShadowV1?.strategies?.[id]})),
   id,eligible.map(f=>({f,now})))]));
 const bySport=Object.fromEntries(SPORTS.map(s=>[s,
  Object.fromEntries(STRATEGIES.map(id=>[id,
   metrics(eligible.filter(f=>f.sport===s).map(f=>({f,now,
    pick:f.accuracyShadowV1?.strategies?.[id]})),
    id,eligible.filter(f=>f.sport===s).map(f=>({f,now})))]))
 ]));
 return {schema:SCHEMA,status,startedAt,endsAt,
  note:"Research-only future observations; binary selected-side Brier/log loss. NO_PICK does not count as a graded bet. Every strategy is frozen before kickoff. No prediction improvement is assumed.",
  criteria:{baseShift:0.02,strongShift:0.04,selectiveShift:0.04,
   selectiveMaxHold:0.08,selectiveMinMarketP:0.55,
   modelMinVerifiedPrior:MODEL_MIN_PRIOR,blendedMargin:0.02,
   calibratedWeights:[0.8,0.6],minIndependentGraded:100},
  observedFixtures:fixtures.length,eligibleFrozen:eligible.length,
  eligibleGraded:eligible.filter(f=>finishedFixture(f,now)).length,
  strategies:perStrategy,bySport,
  upcomingSelections:eligible.filter(f=>f.startMs>now&&f.startMs<=now+7*DAY)
   .sort((a,b)=>a.startMs-b.startMs||fixtureKey(a).localeCompare(fixtureKey(b)))
   .slice(0,8).map(f=>({
    id:fixtureKey(f),sport:f.sport,league:String(f.league??"").slice(0,90),
    home:String(f.home??"").slice(0,70),away:String(f.away??"").slice(0,70),
    startMs:f.startMs,
    strategies:Object.fromEntries(STRATEGIES.map(k=>{
     const p=f.accuracyShadowV1.strategies?.[k];
     return [k,p?{status:p.status,side:p.side,asOf:p.asOf,
      odds:p.odds,pForecast:p.pForecast,shift:p.shift}:{
       status:"NO_PICK",reason:"NOT_QUALIFIED_PREKICKOFF"}];
    }))
   })),
  canPromote:false,
  whyNotPromoted:"Require >=100 new same-period graded predictions, time-ordered market comparison and independent review; official TOP1 remains unchanged"
 };
}
