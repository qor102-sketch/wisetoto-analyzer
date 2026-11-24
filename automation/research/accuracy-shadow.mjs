// Prospective experiment only; never modify official PRE/TOP1 or old pilot picks.
import {withoutNba,isNbaGame} from "../nba-policy.mjs";
const DAY=86400000, MIN=60000;
export const VERSION="accuracy-shadow-v2";
const sides=["win","draw","lose"];
const finite=Number.isFinite;
const valid=c=>c&&sides.includes(c.side)&&finite(c.asOf)&&finite(c.odds)&&c.odds>1&&finite(c.marketProbability)&&c.marketProbability>0&&c.marketProbability<1&&finite(c.shift)&&c.shift>=.02;
const graded=(f,at)=>finite(f.startMs)&&sides.includes(f.truth?.winner)&&finite(f.truth?.verifiedAt)&&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<=at;
const bounds=pilot=>finite(pilot?.startedAt)&&pilot.startedAt>0?[pilot.startedAt+28*DAY,pilot.startedAt+56*DAY]:null;
const clamp=p=>Math.min(.999999,Math.max(.000001,p));
const round=p=>finite(p)?Number(p.toFixed(6)):null;
// Only verified outcomes available strictly BEFORE the price timestamp.
// Freeze the training cohort to the original pilot, never tune on holdout.
export function lockAccuracyShadow(f,fixtures,pilot,now,observedAt){
 if(f.accuracyShadowV2||isNbaGame(f)||f.truth)return false;
 const window=bounds(pilot),c=f.lastEvidence?.top1;
 if(!window||!finite(now)||!finite(observedAt)||!finite(f.startMs)||!valid(c))return false;
 const [start,end]=window;
 if(now<start||now>=end||observedAt<start||observedAt>now||now-observedAt>5*MIN||
    c.asOf!==observedAt||f.startMs-now<10*MIN||f.startMs>=end)return false;
 const snapshots=f.snapshots??[],last=snapshots.at(-1),first=snapshots[0];
 if(last?.at!==observedAt||!finite(first?.at)||last.at-first.at<30*MIN)return false;
 const p=c.marketProbability;
 const history=withoutNba(fixtures).filter(h=>h.id!==f.id&&h.sport===f.sport&&
   h.startMs>=pilot.startedAt&&h.startMs<start&&h.startMs<c.asOf&&
   graded(h,c.asOf-1)&&!h.truth.untrained&&valid(h.frozenCandidate)&&
   h.frozenCandidate.asOf<h.startMs&&Math.abs(h.frozenCandidate.marketProbability-p)<=.15);
 // Fixed shrinkage; no small-sample sport exclusion or future leakage.
 const n=history.length, wins=history.filter(h=>h.truth.winner===h.frozenCandidate.side).length;
 const model=n>=20?clamp((wins+20*p)/(n+20)):null;
 const mix80=model===null?null:.8*p+.2*model,mix60=model===null?null:.6*p+.4*model;
 const gate=(margin)=>mix60!==null&&mix60>=.60&&mix60-p>=margin-1e-12;
 f.accuracyShadowV2={version:VERSION,lockedAt:now,asOf:c.asOf,side:c.side,odds:c.odds,
  marketProbability:p,shift:c.shift,trainingSamples:n,modelProbability:round(model),
  mix80:round(mix80),mix60:round(mix60),strongShift:c.shift>=.04,
  select2:gate(.02),select4:gate(.04),
  reason:model===null?"INSUFFICIENT_PRIOR_SAMPLES":gate(.02)?"SELECTED_FOR_SHADOW":"NO_PICK"};
 return true;
}
const arms={
 A_market:{select:()=>true,prob:c=>c.marketProbability},
 B_shift4:{select:c=>c.strongShift===true,prob:c=>c.marketProbability},
 C_model:{select:c=>finite(c.modelProbability),prob:c=>c.modelProbability},
 C_mix80:{select:c=>finite(c.mix80),prob:c=>c.mix80},
 C_mix60:{select:c=>finite(c.mix60),prob:c=>c.mix60},
 D_gate2:{select:c=>c.select2===true,prob:c=>c.mix60},
 D_gate4:{select:c=>c.select4===true,prob:c=>c.mix60}
};
function metric(rows,prob){
 const n=rows.length;
 if(!n)return {graded:0,hits:0,hitRate:null,hitInterval90:null,unitROI:null,brier:null,logLoss:null};
 let hits=0,profit=0,brier=0,loss=0;
 for(const f of rows){
  const c=f.accuracyShadowV2,y=Number(f.truth.winner===c.side),p=clamp(prob(c));
  hits+=y;profit+=y?c.odds-1:-1;brier+=(p-y)**2;
  loss-=y*Math.log(p)+(1-y)*Math.log(1-p);
 }
 const rate=hits/n,z=1.6448536269514722,den=1+z*z/n,
  mid=(rate+z*z/(2*n))/den,half=z*Math.sqrt(rate*(1-rate)/n+z*z/(4*n*n))/den;
 return {graded:n,hits,hitRate:round(rate),hitInterval90:[round(Math.max(0,mid-half)),round(Math.min(1,mid+half))],
  unitROI:round(profit/n),brier:round(brier/n),logLoss:round(loss/n)};
}
function compare(rows,now){
 const settled=rows.filter(f=>graded(f,now));
 return Object.fromEntries(Object.entries(arms).map(([name,arm])=>{
  const selected=rows.filter(f=>arm.select(f.accuracyShadowV2));
  const evaluated=settled.filter(f=>arm.select(f.accuracyShadowV2));
  return [name,{selected:selected.length,noPick:rows.length-selected.length,
   coverage:rows.length?round(selected.length/rows.length):null,
   ...metric(evaluated,arm.prob),matchedMarket:metric(evaluated,c=>c.marketProbability)}];
 }));
}
export function buildAccuracyShadowReport(state,now=Date.now()){
 const window=bounds(state?.pilot);
 if(!window)return {version:VERSION,status:"NOT_STARTED",officialChanged:false};
 const [startedAt,endsAt]=window;
 const rows=withoutNba(state.fixtures).filter(f=>{
  const c=f.accuracyShadowV2;
  return c?.version===VERSION&&valid(c)&&finite(c.lockedAt)&&c.lockedAt>=startedAt&&
   c.asOf>=startedAt&&c.asOf<=c.lockedAt&&c.lockedAt<=now&&c.lockedAt<f.startMs&&f.startMs<endsAt;
 });
 const bySport=Object.fromEntries(["축구","농구","야구","배구"].map(s=>[s,compare(rows.filter(f=>f.sport===s),now)]));
 return {version:VERSION,status:now<startedAt?"SCHEDULED":now<endsAt?"COLLECTING":"REVIEW_REQUIRED",
  startedAt,endsAt,locked:rows.length,graded:rows.filter(f=>graded(f,now)).length,
  strategies:compare(rows,now),bySport,officialChanged:false,autoPromote:false,
  note:"Same-side calibration, not a new multiclass predictor. Coverage is relative to locked 2% shift candidates, not all listed games. No betting recommendation; no automatic promotion."};
}
