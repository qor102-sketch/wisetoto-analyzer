// Advanced T-60 experiment. Imported date-only results are feature history only.
import {readFileSync} from "node:fs";
import {withoutNba,isNbaGame} from "../nba-policy.mjs";
import {indexHistory} from "./coverage-shadow.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
import {confirmedLineup} from "./sport-shadow.mjs";
const M=60000,D=86400000,F=Number.isFinite,V="early-advanced-v2",SPORTS=["축구","농구","배구","야구"];
const norm=v=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g,"");
const lk=r=>JSON.stringify([r.sport,norm(r.league)]);
const identity=r=>JSON.stringify([lk(r),r.startMs,norm(r.home),norm(r.away)]);
const pair=r=>JSON.stringify([lk(r),norm(r.home),norm(r.away)]);
const best=p=>Object.keys(p).sort((a,b)=>p[b]-p[a]||a.localeCompare(b))[0];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),round=x=>F(x)?Number(x.toFixed(6)):null;
const bundle=JSON.parse(readFileSync(new URL("./history/openfootball-epl.json",import.meta.url),"utf8"));
export function importedHistory(b,asOf,activation){
 if(b?.schema!=="openfootball-history-v1"||b.source!=="https://github.com/openfootball/football.json"||
   !/^[a-f0-9]{40}$/.test(b.commit)||!F(activation)||asOf<activation||Date.parse(b.sourceCommitAt)>=activation)return [];
 const out=[],seen=new Set(),duplicates=new Set();
 for(const s of b.snapshots??[])for(const r of s.rows??[]){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date??""))continue;
  const at=Date.parse(r.date+"T00:00:00Z"),h=b.aliases?.[r.home],a=b.aliases?.[r.away];
  if(!h||!a||norm(h)===norm(a)||!F(at)||new Date(at).toISOString().slice(0,10)!==r.date||
   at+2*D>Math.min(asOf,Date.parse(b.sourceCommitAt))||at<asOf-450*D||
   !Array.isArray(r.score)||r.score.length!==2||!r.score.every(Number.isInteger)||
   !scorePlausibility("축구",...r.score).ok)continue;
  const x={sport:"축구",league:b.league,home:h,away:a,startMs:at,final:{homeScore:r.score[0],awayScore:r.score[1]},
   featureDateOnly:true,sourceCommit:b.commit,knownAt:activation};
  const id=identity(x);if(seen.has(id))duplicates.add(id);seen.add(id);out.push(x);
 }
 return out.filter(x=>!duplicates.has(identity(x)));
}
export function combinedHistory(records,asOf,activation,b=bundle){
 const base=indexHistory(records,asOf),groups=new Map(),internalByPair=new Map();
 for(const r of withoutNba(records)){
  if(!F(r.startMs))continue;
  const k=pair(r),a=internalByPair.get(k)??[];a.push(r);internalByPair.set(k,a);
 }
 // Preserve existing ledger and exclude date-only overlaps even with pending rows.
 for(const [k,l] of base.leagues)groups.set(k,[...l.rows]);
 let imported=0;
 for(const r of importedHistory(b,asOf,activation)){
  if((internalByPair.get(pair(r))??[]).some(x=>Math.abs(x.startMs-r.startMs)<2*D))continue;
  const k=lk(r),a=groups.get(k)??[];a.push(r);groups.set(k,a);imported++;
 }
 return {groups,base,imported};
}
const settings={"축구":{home:55,k:24,scale:1.5},"농구":{home:45,k:22,scale:12},"배구":{home:35,k:22,scale:2},"야구":{home:30,k:20,scale:4}};
export function advancedRatings(rows,s,asOf){
 const cfg=settings[s],teams=new Map();
 const get=t=>teams.get(t)??{rating:1500,n:0,home:0,away:0,history:[]};
 if(!cfg)return teams;
 const sorted=[...rows].sort((a,b)=>a.startMs-b.startMs||identity(a).localeCompare(identity(b)));
 // Batch all same UTC calendar day; date-only rows never imply exact kickoff.
 for(let i=0;i<sorted.length;){
  let j=i+1;while(j<sorted.length&&Math.floor(sorted[j].startMs/D)===Math.floor(sorted[i].startMs/D))j++;
  const changes=new Map();
  for(const r of sorted.slice(i,j)){
   const h=norm(r.home),a=norm(r.away),H=get(h),A=get(a),hs=Number(r.final.homeScore),as=Number(r.final.awayScore);
   const p=1/(1+10**((A.rating-H.rating-cfg.home)/400)),y=hs>as?1:hs<as?0:.5;
   const margin=1+Math.min(1,Math.log1p(Math.abs(hs-as)/cfg.scale));
   const recent=Math.pow(.5,Math.max(0,asOf-r.startMs)/(180*D));
   const d=cfg.k*margin*recent*(y-p);
   for(const [t,side,delta,scored,allowed] of [[h,"home",d,hs,as],[a,"away",-d,as,hs]]){
    const z=changes.get(t)??{delta:0,history:[]};z.delta+=delta;z.history.push({side,scored,allowed,at:r.startMs,dateOnly:!!r.featureDateOnly});changes.set(t,z);
   }
  }
  for(const [t,z] of changes){const x=get(t);teams.set(t,{rating:x.rating+z.delta,n:x.n+z.history.length,
   home:x.home+z.history.filter(y=>y.side==="home").length,away:x.away+z.history.filter(y=>y.side==="away").length,
   history:[...z.history,...x.history].slice(0,30)});}
  i=j;
 }
 return teams;
}
function probabilities(s,d,rows){
 const p=1/(1+10**(-d/400));
 if(s!=="축구")return {win:p,lose:1-p};
 const draws=rows.filter(r=>Number(r.final.homeScore)===Number(r.final.awayScore)).length;
 const baseline=(draws+20*.25)/(rows.length+20);
 // Exploratory draw probability declines as rating mismatch grows.
 const draw=clamp(baseline*Math.exp(-Math.abs(d)/800),.08,.42);
 return {win:(1-draw)*p,draw,lose:(1-draw)*(1-p)};
}
function context(t,asOf){
 const x=t?.history??[],recent=x.filter(r=>!r.dateOnly&&r.at<asOf),last=recent[0];
 const stats=n=>{const a=x.slice(0,n);return {n:a.length,margin:a.length?round(a.reduce((s,r)=>s+r.scored-r.allowed,0)/a.length):null};};
 return {n:t?.n??0,home:t?.home??0,away:t?.away??0,recent5:stats(5),recent10:stats(10),recent20:stats(20),
  restDays:last?round((asOf-last.at)/D):null,knownGames7d:recent.filter(r=>r.at>=asOf-7*D).length};
}
function poisson(l){const p=[Math.exp(-l)];for(let i=1;i<=12;i++)p.push(p[i-1]*l/i);const z=p.reduce((a,b)=>a+b,0);return p.map(x=>x/z);}
function goalModel(h,a,rows){
 if(h.n<5||a.n<5)return null;
 const prior=rows.reduce((s,r)=>s+(Number(r.final.homeScore)+Number(r.final.awayScore))/2,0)/rows.length;
 const stat=(t,side,k)=>{const x=t.history.filter(r=>r.side===side).slice(0,10);return (x.reduce((s,r)=>s+r[k],0)+5*prior)/(x.length+5);};
 const x=poisson(clamp((stat(h,"home","scored")+stat(a,"away","allowed"))/2,.15,5)),y=poisson(clamp((stat(a,"away","scored")+stat(h,"home","allowed"))/2,.15,5)),p={win:0,draw:0,lose:0};
 for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)p[i>j?"win":i===j?"draw":"lose"]+=x[i]*y[j];return p;
}
const weights={"축구":.65,"농구":.35,"배구":.35,"야구":.35};
export function decision(f,market,history,ratings,now,asOf,activation,end){
 if(f.advancedEarlyV2||f.truth||isNbaGame(f)||!SPORTS.includes(f.sport)||!norm(f.league)||!norm(f.home)||!norm(f.away)||norm(f.home)===norm(f.away)||
  ![now,asOf,activation,end,f.startMs].every(F)||asOf<activation||asOf>now||now-asOf>5*M||now>=end||f.startMs>=end||f.startMs-now<65*M||f.startMs-now>85*M)return null;
 const sides=f.sport==="축구"?["win","draw","lose"]:["win","lose"],cs=market?.choices;
 if(!Array.isArray(cs)||cs.length!==sides.length||new Set(cs.map(c=>c.side)).size!==sides.length||cs.some(c=>!sides.includes(c.side)||!F(c.p)||c.p<=0||c.p>=1||!F(c.odds)||c.odds<=1)||Math.abs(cs.reduce((a,c)=>a+c.p,0)-1)>1e-5)return null;
 const rows=history.groups.get(lk(f))??[],h=ratings.get(norm(f.home)),a=ratings.get(norm(f.away)),H=context(h,asOf),A=context(a,asOf);
 const marketP=Object.fromEntries(cs.map(c=>[c.side,c.p])),odds=Object.fromEntries(cs.map(c=>[c.side,c.odds]));
 const enough=rows.length>=10&&Math.min(H.n,A.n)>=5;
 const neutral=f.neutral===true,delta=enough?h.rating-a.rating+(neutral?0:settings[f.sport].home):null;
 const raw=enough?probabilities(f.sport,delta,rows):null,goals=raw&&f.sport==="축구"?goalModel(h,a,rows):null;
 const blend=w=>raw?Object.fromEntries(sides.map(s=>[s,(1-w)*marketP[s]+w*raw[s]])):null;
 const mix50=blend(.5),mix80elo=blend(.8),sportMix=blend(weights[f.sport]);
 // Rest adjustment is a fixed exploratory arm, not a fitted player effect.
 const rest=raw&&F(H.restDays)&&F(A.restDays)?probabilities(f.sport,delta+clamp((H.restDays-A.restDays)*5,-25,25),rows):null;
 const match=history.base.current.get(identity(f))??[],lineup=match.length===1?confirmedLineup(match[0],now):null;
 const candidate=sportMix?best(sportMix):null,sorted=Object.values(sportMix??marketP).sort((x,y)=>y-x);
 const qualified=!!sportMix&&sportMix[candidate]>=.60&&sorted[0]-sorted[1]>=.10&&Math.min(H.n,A.n)>=10;
 return {version:V,lockedAt:now,asOf,leadMinutes:round((f.startMs-now)/M),market:marketP,odds,raw,goals,mix50,mix80elo,sportMix,rest,
  home:H,away:A,importedLeague:rows.filter(r=>r.featureDateOnly).length,lineup:{status:lineup?"CONFIRMED":"UNKNOWN",at:lineup?.at??null},
  qualified,top1:false,reason:!raw?"INSUFFICIENT_HISTORY":qualified?"QUALIFIED":"NO_PICK"};
}
export function activateAdvanced(state,pilot,now){
 const end=F(pilot?.startedAt)?pilot.startedAt+56*D:null;
 return F(state.advancedStartedAt)?state.advancedStartedAt:F(end)&&now>=end-28*D&&now<end?now:null;
}
export function lockAdvanced(fixtures,markets,records,pilot,activation,now,asOf){
 const end=F(pilot?.startedAt)?pilot.startedAt+56*D:null;
 if(!F(activation)||!F(end)||now>=end||asOf<activation)return 0;
 const due=withoutNba(fixtures).filter(f=>!f.advancedEarlyV2&&markets.has(f.id)&&f.startMs-now>=65*M&&f.startMs-now<=85*M);
 if(!due.length)return 0;
 const history=combinedHistory(records,asOf,activation),cache=new Map(),locked=[];
 for(const f of due){const k=lk(f);if(!cache.has(k))cache.set(k,advancedRatings(history.groups.get(k)??[],f.sport,asOf));
  const c=decision(f,markets.get(f.id),history,cache.get(k),now,asOf,activation,end);if(c){f.advancedEarlyV2=c;locked.push(f);}}
 // Keep one first qualifying batch per day. No hindsight global maximum.
 const day=f=>new Date(f.startMs+9*3600000).toISOString().slice(0,10),used=new Set(fixtures.filter(f=>f.advancedEarlyV2?.top1).map(day));
 for(const f of locked.filter(f=>f.advancedEarlyV2.qualified).sort((a,b)=>Math.max(...Object.values(b.advancedEarlyV2.sportMix))-Math.max(...Object.values(a.advancedEarlyV2.sportMix))||a.startMs-b.startMs||String(a.id).localeCompare(String(b.id)))){
  const d=day(f);if(!used.has(d)){f.advancedEarlyV2.top1=true;used.add(d);}}
 return locked.length;
}
const arms={market:c=>c.market,advancedElo:c=>c.raw,goalModel:c=>c.goals,mix50:c=>c.mix50,mix80elo:c=>c.mix80elo,sportMix:c=>c.sportMix,rest:c=>c.rest,qualified:c=>c.qualified?c.sportMix:null,shadowTop1:c=>c.top1?c.sportMix:null};
function metrics(rows,prob){
 if(!rows.length)return {graded:0,hits:0,hitRate:null,hitInterval90:null,unitROI:null,brier:null,logLoss:null};
 let hits=0,roi=0,brier=0,loss=0;
 for(const f of rows){const c=f.advancedEarlyV2,p=prob(c),s=best(p),y=f.truth.winner,hit=Number(s===y);hits+=hit;roi+=hit?c.odds[s]-1:-1;brier+=Object.keys(p).reduce((a,k)=>a+(p[k]-Number(k===y))**2,0);loss-=Math.log(Math.max(.000001,p[y]));}
 const n=rows.length,r=hits/n,z=1.6448536269514722,d=1+z*z/n,mid=(r+z*z/(2*n))/d,half=z*Math.sqrt(r*(1-r)/n+z*z/(4*n*n))/d;
 return {graded:n,hits,hitRate:round(r),hitInterval90:[round(Math.max(0,mid-half)),round(Math.min(1,mid+half))],unitROI:round(roi/n),brier:round(brier/n),logLoss:round(loss/n)};
}
function compare(rows,now){
 return Object.fromEntries(Object.entries(arms).map(([k,p])=>{
  const sel=rows.filter(f=>p(f.advancedEarlyV2)),g=sel.filter(f=>F(f.truth?.verifiedAt)&&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<=now&&Object.hasOwn(f.advancedEarlyV2.market,f.truth.winner));
  return [k,{selected:sel.length,coverage:rows.length?round(sel.length/rows.length):null,...metrics(g,p),matchedMarket:metrics(g,c=>c.market)}];
 }));
}
export function advancedReport(state,now){
 const activation=state.advancedStartedAt,end=F(state.pilot?.startedAt)?state.pilot.startedAt+56*D:null;
 if(!F(activation)||!F(end))return {version:V,status:"NOT_STARTED"};
 const all=withoutNba(state.fixtures),rows=all.filter(f=>{const c=f.advancedEarlyV2;return c?.version===V&&F(c.asOf)&&F(c.lockedAt)&&c.asOf>=activation&&c.asOf<=c.lockedAt&&c.lockedAt<=now&&c.lockedAt<=f.startMs-60*M&&f.startMs<end;});
 const ids=new Set(rows.map(f=>f.id)),due=all.filter(f=>SPORTS.includes(f.sport)&&f.startMs<end&&f.startMs-60*M>=activation&&f.startMs-60*M<=now&&F(f.firstSeenAt)&&f.firstSeenAt<=f.startMs-60*M);
 return {version:V,status:now<end?"COLLECTING":"REVIEW_REQUIRED",startedAt:activation,endsAt:end,locked:rows.length,knownDeadlinePassed:due.length,knownDeadlineMissed:due.filter(f=>!ids.has(f.id)).length,
  source:{name:"OpenFootball EPL",commit:bundle.commit,availableFeatureRows:importedHistory(bundle,now,activation).length,fixturesUsed:rows.filter(f=>f.advancedEarlyV2.importedLeague>0).length},
  strategies:compare(rows,now),bySport:Object.fromEntries(SPORTS.map(s=>[s,compare(rows.filter(f=>f.sport===s),now)])),officialChanged:false,autoPromote:false};
}
