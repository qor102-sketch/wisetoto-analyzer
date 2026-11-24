// Prospective only. No official PRE/TOP1 changes, no external requests.
import {isNbaGame,withoutNba} from "../nba-policy.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const M=60000,D=86400000,F=Number.isFinite;
const SPORTS=["축구","농구","배구","야구"];
const norm=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const round=x=>F(x)?Number(x.toFixed(6)):null;
const day=t=>new Date(t+9*3600000).toISOString().slice(0,10);
const window=p=>F(p?.startedAt)&&p.startedAt>0?[p.startedAt+28*D,p.startedAt+56*D]:null;
const sameLeague=(a,b)=>a.sport===b.sport&&!!norm(a.league)&&norm(a.league)===norm(b.league);
const identity=(a,b)=>sameLeague(a,b)&&a.startMs===b.startMs&&norm(a.home)===norm(b.home)&&norm(a.away)===norm(b.away);
const names=a=>Array.isArray(a)?a.map(norm).filter(Boolean):[];
const required={"축구":11,"농구":5,"배구":6,"야구":9};
export function confirmedLineup(r,cutoff){
 const l=r?.lineup,n=required[r?.sport];
 if(!n||l?.status!=="CONFIRMED"||!l.source||!l.gameId||!F(l.capturedAt)||
    l.capturedAt>cutoff||l.capturedAt>=r.startMs)return null;
 const home=names(l.home),away=names(l.away);
 if(home.length!==n||away.length!==n||new Set(home).size!==n||new Set(away).size!==n)return null;
 return {home,away,at:l.capturedAt,source:l.source,homeStarter:norm(l.homeStarter)||null,awayStarter:norm(l.awayStarter)||null};
}
function priorRows(f,records,cutoff){
 const groups=new Map();
 for(const r of withoutNba(records)){
  if(!sameLeague(f,r)||!F(r.startMs)||r.startMs>=cutoff||r.startMs<cutoff-120*D||
    r.verdict!=="VERIFIED"||!F(r.verifiedAt)||r.verifiedAt<=r.startMs||r.verifiedAt>=cutoff||
    !r.resultSource||!scorePlausibility(r.sport,r.final?.homeScore,r.final?.awayScore).ok||
    !norm(r.home)||!norm(r.away)||norm(r.home)===norm(r.away))continue;
  const k=[r.startMs,norm(r.home),norm(r.away)].join("|");
  const list=groups.get(k)??[];list.push(r);groups.set(k,list);
 }
 // Ambiguous duplicate identities fail closed, never inflate training counts.
 return [...groups.values()].filter(x=>x.length===1).map(x=>x[0]).sort((a,b)=>b.startMs-a.startMs);
}
function teamHistory(team,rows){
 const t=norm(team);
 return rows.filter(r=>norm(r.home)===t||norm(r.away)===t).slice(0,10).map(r=>{
  const home=norm(r.home)===t,scored=Number(home?r.final.homeScore:r.final.awayScore),
   allowed=Number(home?r.final.awayScore:r.final.homeScore),l=confirmedLineup(r,r.startMs-1);
  return {scored,allowed,lineup:l?(home?l.home:l.away):null,
    starter:l?(home?l.homeStarter:l.awayStarter):null};
 });
}
function stats(rows,n){
 const x=rows.slice(0,n);
 return {n:x.length,winRate:x.length?round(mean(x.map(y=>Number(y.scored>y.allowed)))):null,
  scored:x.length?round(mean(x.map(y=>y.scored))):null,
  allowed:x.length?round(mean(x.map(y=>y.allowed))):null,
  margin:x.length?round(mean(x.map(y=>y.scored-y.allowed))):null};
}
function rotation(current,history,starter){
 if(!current)return null;
 const past=history.filter(x=>x.lineup).slice(0,5);
 if(past.length<3)return {history:past.length,regularNotStarting:null,regularCount:null,starterChanged:null};
 const counts=new Map();
 for(const r of past)for(const p of r.lineup)counts.set(p,(counts.get(p)??0)+1);
 const regular=[...counts].filter(([,n])=>n>=3&&n/past.length>=.6).map(([p])=>p);
 return {history:past.length,regularCount:regular.length,
  regularNotStarting:regular.filter(p=>!current.includes(p)).length,
  starterChanged:starter&&past[0].starter?starter!==past[0].starter:null};
}
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const logistic=x=>1/(1+Math.exp(-x));
function poisson(lambda){
 const a=[Math.exp(-lambda)];for(let i=1;i<=12;i++)a.push(a[i-1]*lambda/i);
 const sum=a.reduce((s,x)=>s+x,0);return a.map(x=>x/sum);
}
function formModel(s,h,a){
 if(h.length<5||a.length<5)return null;
 const h5=stats(h,5),h10=stats(h,10),a5=stats(a,5),a10=stats(a,10);
 const blend=(p,q,k)=>.6*p[k]+.4*q[k];
 if(s==="축구"){
  const x=poisson(clamp((blend(h5,h10,"scored")+blend(a5,a10,"allowed"))/2,.15,5)),
   y=poisson(clamp((blend(a5,a10,"scored")+blend(h5,h10,"allowed"))/2,.15,5));
  const out={win:0,draw:0,lose:0};
  for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)out[i>j?"win":i===j?"draw":"lose"]+=x[i]*y[j];
  return out;
 }
 // Sport-specific score units. Fixed exploratory scales, not fitted claims.
 const scale={"농구":16,"배구":2.2,"야구":5}[s];
 if(!scale)return null;
 const p=logistic((blend(h5,h10,"margin")-blend(a5,a10,"margin"))/scale);
 return {win:p,lose:1-p};
}
const choice=(p)=>Object.keys(p).sort((a,b)=>p[b]-p[a]||a.localeCompare(b))[0];
export function buildSportDecision(f,market,records,now,asOf,pilot){
 const range=window(pilot);
 if(!range||!SPORTS.includes(f.sport)||isNbaGame(f)||f.truth||f.sportShadowV3||
   !F(now)||!F(asOf)||!F(f.startMs)||now<range[0]||asOf<range[0]||
   now>=range[1]||f.startMs>=range[1]||asOf>now||now-asOf>5*M||
   f.startMs-now<10*M||f.startMs-now>30*M||!norm(f.home)||!norm(f.away)||
   norm(f.home)===norm(f.away))return null;
 const sides=f.sport==="축구"?["win","draw","lose"]:["win","lose"];
 const cs=market?.choices;
 if(!Array.isArray(cs)||cs.length!==sides.length||new Set(cs.map(c=>c.side)).size!==sides.length||
   cs.some(c=>!sides.includes(c.side)||!F(c.p)||c.p<=0||c.p>=1||!F(c.odds)||c.odds<=1)||
   Math.abs(cs.reduce((s,c)=>s+c.p,0)-1)>1e-5)return null;
 const mp=Object.fromEntries(cs.map(c=>[c.side,c.p])),odds=Object.fromEntries(cs.map(c=>[c.side,c.odds]));
 const rows=priorRows(f,records,asOf),h=teamHistory(f.home,rows),a=teamHistory(f.away,rows);
 const match=withoutNba(records).filter(r=>identity(f,r));
 const lineup=match.length===1?confirmedLineup(match[0],asOf):null;
 const rotationHome=rotation(lineup?.home,h,lineup?.homeStarter),rotationAway=rotation(lineup?.away,a,lineup?.awayStarter);
 const raw=formModel(f.sport,h,a);
 const mixed=raw?Object.fromEntries(sides.map(s=>[s,.7*mp[s]+.3*raw[s]])):null;
 const favorite=choice(mp),predicted=mixed?choice(mixed):null;
 const lineupKnown=rotationHome?.regularNotStarting!=null&&rotationAway?.regularNotStarting!=null;
 const lowRotation=lineupKnown&&rotationHome.regularNotStarting<=1&&rotationAway.regularNotStarting<=1&&
   rotationHome.starterChanged!==true&&rotationAway.starterChanged!==true;
 const selected=!!mixed&&predicted===favorite&&mixed[predicted]>=.60&&mixed[predicted]-mp[predicted]>=.01;
 return {version:"sport-shadow-v3",lockedAt:now,asOf,market:mp,odds,raw,mixed,
  marketSide:favorite,modelSide:predicted,form:{home5:stats(h,5),home10:stats(h,10),away5:stats(a,5),away10:stats(a,10)},
  lineup:{status:lineup?"CONFIRMED":"UNKNOWN",at:lineup?.at??null,source:lineup?.source??null,
   home:rotationHome,away:rotationAway,regularNotStartingIsNotInjury:true},
  selected,lineupSelected:selected&&lowRotation,top1:false,
  reason:!raw?"INSUFFICIENT_FORM":!selected?"NO_PICK":!lineupKnown?"FORM_ONLY_LINEUP_UNKNOWN":lowRotation?"LINEUP_GATE_PASSED":"LINEUP_ROTATION_GATE_FAILED"};
}
export function lockSportShadows(fixtures,markets,records,pilot,now,asOf){
 const locked=[];
 for(const f of withoutNba(fixtures)){
  const c=buildSportDecision(f,markets.get(f.id),records,now,asOf,pilot);
  if(c){f.sportShadowV3=c;locked.push(f);}
 }
 // One actual pregame lock per KST kickoff day. First qualifying scan wins;
 // never retrospectively choose a later match after an earlier result.
 const used=new Set(fixtures.filter(f=>f.sportShadowV3?.top1).map(f=>day(f.startMs)));
 const candidates=locked.filter(f=>f.sportShadowV3.lineupSelected)
  .sort((a,b)=>b.sportShadowV3.mixed[b.sportShadowV3.modelSide]-a.sportShadowV3.mixed[a.sportShadowV3.modelSide]||
    a.startMs-b.startMs||String(a.id).localeCompare(String(b.id)));
 for(const f of candidates){const k=day(f.startMs);if(!used.has(k)){f.sportShadowV3.top1=true;used.add(k);}}
 return locked.length;
}
function graded(f,now){
 return F(f.truth?.verifiedAt)&&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<=now&&
   Object.hasOwn(f.sportShadowV3.market,f.truth.winner);
}
function metrics(rows,probs,side){
 if(!rows.length)return {graded:0,hits:0,hitRate:null,hitInterval90:null,unitROI:null,brier:null,logLoss:null};
 let hits=0,roi=0,brier=0,loss=0;
 for(const f of rows){
  const c=f.sportShadowV3,p=probs(c),s=side(c),y=f.truth.winner,hit=Number(s===y);
  hits+=hit;roi+=hit?c.odds[s]-1:-1;
  brier+=Object.keys(p).reduce((sum,k)=>sum+(p[k]-Number(k===y))**2,0);
  loss-=Math.log(Math.max(1e-6,p[y]));
 }
 const n=rows.length,rate=hits/n,z=1.6448536269514722,den=1+z*z/n,
 mid=(rate+z*z/(2*n))/den,half=z*Math.sqrt(rate*(1-rate)/n+z*z/(4*n*n))/den;
 return {graded:n,hits,hitRate:round(rate),hitInterval90:[round(mid-half),round(mid+half)],
  unitROI:round(roi/n),brier:round(brier/n),logLoss:round(loss/n)};
}
const arms={market:[()=>true,c=>c.market,c=>c.marketSide],form:[c=>!!c.raw,c=>c.raw,c=>choice(c.raw)],
 mixed:[c=>!!c.mixed,c=>c.mixed,c=>c.modelSide],selective:[c=>c.selected,c=>c.mixed,c=>c.modelSide],
 lineupGate:[c=>c.lineupSelected,c=>c.mixed,c=>c.modelSide],shadowTop1:[c=>c.top1,c=>c.mixed,c=>c.modelSide]};
function compare(rows,now){
 return Object.fromEntries(Object.entries(arms).map(([k,[filter,p,s]])=>{
  const selected=rows.filter(f=>filter(f.sportShadowV3)),g=selected.filter(f=>graded(f,now));
  return [k,{selected:selected.length,coverage:rows.length?round(selected.length/rows.length):null,
   ...metrics(g,p,s),matchedMarket:metrics(g,c=>c.market,c=>c.marketSide)}];
 }));
}
export function buildSportShadowReport(state,now=Date.now()){
 const range=window(state?.pilot);
 if(!range)return {version:"sport-shadow-v3",status:"NOT_STARTED"};
 const [startedAt,endsAt]=range;
 const rows=withoutNba(state.fixtures).filter(f=>{
  const c=f.sportShadowV3;
  return c?.version==="sport-shadow-v3"&&F(c.lockedAt)&&F(c.asOf)&&c.asOf>=startedAt&&
   c.asOf<=c.lockedAt&&c.lockedAt<=now&&c.lockedAt<f.startMs&&f.startMs<endsAt;
 });
 const evaluated=rows.filter(f=>f.sportShadowV3.mixed&&graded(f,now));
 const cohorts={lineupUnknown:c=>c.lineup.status!=="CONFIRMED",
  rotationUnknown:c=>c.lineup.home?.regularNotStarting==null||c.lineup.away?.regularNotStarting==null,
  regularRotation:c=>(c.lineup.home?.regularNotStarting??0)+(c.lineup.away?.regularNotStarting??0)>=2,
  marketDisagreement:c=>c.marketSide!==c.modelSide,
  lowConfidence:c=>c.mixed[c.modelSide]<.60,
  shortForm:c=>Math.min(c.form.home10.n,c.form.away10.n)<10};
 const missAudit=Object.fromEntries(Object.entries(cohorts).map(([k,fn])=>{
  const g=evaluated.filter(f=>fn(f.sportShadowV3)),m=metrics(g,c=>c.mixed,c=>c.modelSide);
  return [k,{graded:m.graded,hits:m.hits,misses:m.graded-m.hits,hitRate:m.hitRate}];
 }));
 return {version:"sport-shadow-v3",status:now<startedAt?"SCHEDULED":now<endsAt?"COLLECTING":"REVIEW_REQUIRED",
  startedAt,endsAt,locked:rows.length,strategies:compare(rows,now),
  bySport:Object.fromEntries(SPORTS.map(s=>[s,compare(rows.filter(f=>f.sport===s),now)])),
  missAudit,officialChanged:false,autoPromote:false,
  note:"Exploratory frozen forecasts; miss cohorts are associations, not causal diagnosis. Missing starters are not verified injuries. No player impact weights; no auto promotion."};
}
