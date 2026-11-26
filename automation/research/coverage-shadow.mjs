// Independent prospective V4; never modify V2/V3 or official picks.
import {withoutNba,isNbaGame} from "../nba-policy.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
import {confirmedLineup} from "./sport-shadow.mjs";
const M=60000,D=86400000,F=Number.isFinite,VERSION="coverage-shadow-v4";
const SPORTS=["축구","농구","야구","배구"];
const norm=x=>String(x??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g,"");
const key=(...v)=>JSON.stringify(v);
const leagueKey=r=>key(r.sport,norm(r.league));
const fixtureKey=r=>key(leagueKey(r),r.startMs,norm(r.home),norm(r.away));
const round=x=>F(x)?Number(x.toFixed(6)):null;
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
const best=p=>Object.keys(p).sort((a,b)=>p[b]-p[a]||a.localeCompare(b))[0];
const clamp=(p,a,b)=>Math.max(a,Math.min(b,p));
const end=p=>F(p?.startedAt)&&p.startedAt>0?p.startedAt+56*D:null;
const start=p=>F(p?.startedAt)&&p.startedAt>0?p.startedAt+28*D:null;
export function indexHistory(records,at){
 const current=new Map(),leagues=new Map();
 for(const r of withoutNba(records)){
  if(!SPORTS.includes(r.sport)||!norm(r.league)||!norm(r.home)||!norm(r.away)||
    norm(r.home)===norm(r.away)||!F(r.startMs))continue;
  const k=fixtureKey(r),arr=current.get(k)??[];arr.push(r);current.set(k,arr);
 }
 for(const g of current.values()){
  if(g.length!==1)continue;
  const r=g[0];
  if(r.startMs>=at||r.startMs<at-120*D||r.verdict!=="VERIFIED"||
    !F(r.verifiedAt)||r.verifiedAt<=r.startMs||r.verifiedAt>=at||!r.resultSource||
    !scorePlausibility(r.sport,r.final?.homeScore,r.final?.awayScore).ok)continue;
  const lk=leagueKey(r),l=leagues.get(lk)??{rows:[],teams:new Map()};
  l.rows.push(r);leagues.set(lk,l);
  const lineup=confirmedLineup(r,r.startMs-1);
  for(const [side,op] of [["home","away"],["away","home"]]){
   const t=norm(r[side]),a=l.teams.get(t)??[];
   a.push({at:r.startMs,scored:Number(r.final[side+"Score"]),allowed:Number(r.final[op+"Score"]),
    lineup:lineup?.[side]??null});l.teams.set(t,a);
  }
 }
 for(const l of leagues.values())for(const a of l.teams.values())a.sort((a,b)=>b.at-a.at);
 return {leagues,current};
}
function summarize(rows){
 const stats=n=>{const a=rows.slice(0,n);return {n:a.length,scored:a.length?mean(a.map(r=>r.scored)):null,
  allowed:a.length?mean(a.map(r=>r.allowed)):null};};
 return {recent5:stats(5),recent10:stats(10)};
}
function shrunk(stats,prior,k){const n=stats.n;return n?(n*stats[k]+5*prior)/(n+5):prior;}
function poisson(l){const p=[Math.exp(-l)];for(let i=1;i<=12;i++)p.push(p[i-1]*l/i);const z=p.reduce((a,b)=>a+b,0);return p.map(x=>x/z);}
function estimate(s,h,a,prior){
 const score=(x,k)=>.6*shrunk(x.recent5,prior,k)+.4*shrunk(x.recent10,prior,k);
 const home=(score(h,"scored")+score(a,"allowed"))/2,away=(score(a,"scored")+score(h,"allowed"))/2;
 if(s==="축구"){
  const x=poisson(clamp(home,.15,5)),y=poisson(clamp(away,.15,5)),p={win:0,draw:0,lose:0};
  for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)p[i>j?"win":i===j?"draw":"lose"]+=x[i]*y[j];return p;
 }
 const scale={"농구":8,"야구":2.5,"배구":1.1}[s],p=1/(1+Math.exp(-(home-away)/scale));
 return {win:p,lose:1-p};
}
function continuity(names,rows){
 const prior=rows.find(r=>r.lineup);
 return names&&prior?{retained:names.filter(n=>prior.lineup.includes(n)).length/names.length,previousAt:prior.at}:null;
}
export function decideV4(f,market,index,now,asOf,activation,pilot){
 if(f.coverageShadowV4||f.truth||isNbaGame(f)||!SPORTS.includes(f.sport)||
  !F(now)||!F(asOf)||!F(activation)||!F(f.startMs)||!F(end(pilot))||
  asOf<activation||asOf>now||now-asOf>5*M||now>=end(pilot)||f.startMs>=end(pilot)||
  f.startMs-now<10*M||f.startMs-now>30*M||!norm(f.league)||!norm(f.home)||!norm(f.away)||norm(f.home)===norm(f.away))return null;
 const sides=f.sport==="축구"?["win","draw","lose"]:["win","lose"],cs=market?.choices;
 if(!Array.isArray(cs)||cs.length!==sides.length||new Set(cs.map(c=>c.side)).size!==sides.length||
  cs.some(c=>!sides.includes(c.side)||!F(c.p)||c.p<=0||c.p>=1||!F(c.odds)||c.odds<=1)||
  Math.abs(cs.reduce((n,c)=>n+c.p,0)-1)>1e-5)return null;
 const exact=index.current.get(fixtureKey(f))??[];
 const l=exact.length===1?confirmedLineup(exact[0],now):null;
 if(!l&&f.startMs-now>20*M)return null;
 const league=index.leagues.get(leagueKey(f)),h=league?.teams.get(norm(f.home))??[],a=league?.teams.get(norm(f.away))??[];
 const hs=summarize(h),as=summarize(a),leagueN=league?.rows.length??0;
 const enough=leagueN>=10&&Math.min(h.length,a.length)>=3;
 const prior=enough?mean(league.rows.map(r=>(Number(r.final.homeScore)+Number(r.final.awayScore))/2)):null;
 const mp=Object.fromEntries(cs.map(c=>[c.side,c.p])),odds=Object.fromEntries(cs.map(c=>[c.side,c.odds]));
 const raw=enough?estimate(f.sport,hs,as,prior):null;
 const blend=w=>raw?Object.fromEntries(sides.map(s=>[s,(1-w)*mp[s]+w*raw[s]])):null;
 const mix90=blend(.1),mix80=blend(.2),home=continuity(l?.home,h),away=continuity(l?.away,a);
 const lineupKnown=!!l&&!!home&&!!away,marketSide=best(mp),modelSide=mix80?best(mix80):null;
 return {version:VERSION,lockedAt:now,asOf,market:mp,odds,raw,mix90,mix80,marketSide,modelSide,
   form:{home5:hs.recent5.n,home10:hs.recent10.n,away5:as.recent5.n,away10:as.recent10.n,leagueN},
   lineup:{status:l?"CONFIRMED":"UNKNOWN",at:l?.at??null,source:l?.source??null,home,away,injuryNotInferred:true},
   gates:{form:enough,lineupKnown,continuity:lineupKnown&&home.retained>=.8&&away.retained>=.8,
    agree:!!mix80&&marketSide===modelSide,confidence55:!!mix80&&mix80[modelSide]>=.55,
    confidence60:!!mix80&&mix80[modelSide]>=.60},
   reason:!enough?(leagueN<10?"LEAGUE_SAMPLE_LT10":"TEAM_SAMPLE_LT3"):!l?"LINEUP_UNKNOWN":!lineupKnown?"PRIOR_LINEUP_UNKNOWN":"READY"};
}
export function lockV4(fixtures,markets,records,pilot,activation,now,asOf){
 if(!F(activation)||!F(end(pilot))||now>=end(pilot))return 0;
 const index=indexHistory(records,asOf);let n=0;
 for(const f of withoutNba(fixtures)){
  const d=decideV4(f,markets.get(f.id),index,now,asOf,activation,pilot);
  if(d){f.coverageShadowV4=d;n++;}
 }
 return n;
}
const grade=(f,now)=>F(f.truth?.verifiedAt)&&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<=now&&
 Object.hasOwn(f.coverageShadowV4.market,f.truth.winner);
function metric(rows,prob){
 if(!rows.length)return {graded:0,hits:0,misses:0,hitRate:null,hitInterval90:null,unitROI:null,brier:null,logLoss:null};
 let hits=0,roi=0,brier=0,loss=0;
 for(const f of rows){const c=f.coverageShadowV4,p=prob(c),s=best(p),y=f.truth.winner,hit=Number(s===y);
  hits+=hit;roi+=hit?c.odds[s]-1:-1;
  brier+=Object.keys(p).reduce((a,k)=>a+(p[k]-Number(k===y))**2,0);
  loss-=Math.log(Math.max(.000001,p[y]));
 }
 const n=rows.length,r=hits/n,z=1.6448536269514722,d=1+z*z/n,mid=(r+z*z/(2*n))/d,half=z*Math.sqrt(r*(1-r)/n+z*z/(4*n*n))/d;
 return {graded:n,hits,misses:n-hits,hitRate:round(r),hitInterval90:[round(Math.max(0,mid-half)),round(Math.min(1,mid+half))],unitROI:round(roi/n),brier:round(brier/n),logLoss:round(loss/n)};
}
const arms={market:[()=>true,c=>c.market],form:[c=>!!c.raw,c=>c.raw],
 mix90:[c=>!!c.mix90,c=>c.mix90],mix80:[c=>!!c.mix80,c=>c.mix80],
 gate55:[c=>c.gates.agree&&c.gates.confidence55,c=>c.mix80],
 gate60:[c=>c.gates.agree&&c.gates.confidence60,c=>c.mix80],
 lineupKnown:[c=>c.gates.agree&&c.gates.confidence55&&c.gates.lineupKnown,c=>c.mix80],
 continuity:[c=>c.gates.agree&&c.gates.confidence55&&c.gates.continuity,c=>c.mix80]};
function report(rows,now){
 const g=rows.filter(f=>grade(f,now));
 return Object.fromEntries(Object.entries(arms).map(([name,[filter,prob]])=>{
  const selected=rows.filter(f=>filter(f.coverageShadowV4)),yes=g.filter(f=>filter(f.coverageShadowV4)),no=g.filter(f=>!filter(f.coverageShadowV4));
  const m=metric(yes,prob),matched=metric(yes,c=>c.market);
  return [name,{selected:selected.length,noPick:rows.length-selected.length,coverage:rows.length?round(selected.length/rows.length):null,
   ...m,matchedMarket:matched,rejectedMarket:metric(no,c=>c.market),
   pairedBrierDelta:m.graded?round(m.brier-matched.brier):null,pairedHitDelta:m.graded?m.hits-matched.hits:null}];
 }));
}
function audit(rows,now){
 const tests={leagueSampleLt10:c=>c.form.leagueN<10,teamSampleLt3:c=>Math.min(c.form.home10,c.form.away10)<3,
 teamSampleLt5:c=>Math.min(c.form.home10,c.form.away10)<5,teamSampleLt10:c=>Math.min(c.form.home10,c.form.away10)<10,
 lineupUnknown:c=>c.lineup.status!=="CONFIRMED",priorLineupUnknown:c=>!c.gates.lineupKnown,
 continuityLow:c=>c.gates.lineupKnown&&!c.gates.continuity,marketDisagreement:c=>!!c.mix80&&!c.gates.agree,
 lowConfidence:c=>!!c.mix80&&!c.gates.confidence55};
 return Object.fromEntries(Object.entries(tests).map(([k,fn])=>{
  const group=rows.filter(f=>fn(f.coverageShadowV4)),g=group.filter(f=>f.coverageShadowV4.mix80&&grade(f,now));
  return [k,{observed:group.length,model:metric(g,c=>c.mix80),market:metric(g,c=>c.market)}];
 }));
}
export function coverageReport(state,now=Date.now()){
 const activation=state?.coverageV4StartedAt,endsAt=end(state?.pilot);
 if(!F(activation)||!F(endsAt))return {version:VERSION,status:"NOT_STARTED",officialChanged:false};
 const rows=withoutNba(state.fixtures).filter(f=>{
  const c=f.coverageShadowV4;
  return c?.version===VERSION&&F(c.asOf)&&F(c.lockedAt)&&c.asOf>=activation&&c.asOf<=c.lockedAt&&
   c.lockedAt<=now&&c.lockedAt<f.startMs&&f.startMs<endsAt;
 });
 return {version:VERSION,status:now<endsAt?"COLLECTING":"REVIEW_REQUIRED",startedAt:activation,endsAt,
  locked:rows.length,graded:rows.filter(f=>grade(f,now)).length,strategies:report(rows,now),
  bySport:Object.fromEntries(SPORTS.map(s=>{const g=rows.filter(f=>f.sport===s);return [s,{strategies:report(g,now),audit:audit(g,now)}]})),
  audit:audit(rows,now),officialChanged:false,autoPromote:false,
  note:"Independent fresh cohort. Fixed experimental thresholds. Missing lineup is unknown, not injury. Audit cohorts overlap and are not causal."};
}
export function activateV4(state,pilot,now){
 return F(state.coverageV4StartedAt)?state.coverageV4StartedAt:F(start(pilot))&&now>=start(pilot)&&now<end(pilot)?now:null;
}
