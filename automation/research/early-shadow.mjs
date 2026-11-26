// T-60 independent research lane. Freeze before deadline; never replace.
import {withoutNba,isNbaGame} from "../nba-policy.mjs";
import {confirmedLineup} from "./sport-shadow.mjs";
import {indexHistory} from "./coverage-shadow.mjs";
const M=60000,D=86400000,F=Number.isFinite,VERSION="early-shadow-v1";
const sports=["축구","농구","배구","야구"];
const norm=x=>String(x??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g,"");
const lk=f=>JSON.stringify([f.sport,norm(f.league)]);
const fk=f=>JSON.stringify([lk(f),f.startMs,norm(f.home),norm(f.away)]);
const best=p=>Object.keys(p).sort((a,b)=>p[b]-p[a]||a.localeCompare(b))[0];
const round=x=>F(x)?Number(x.toFixed(6)):null;
const end=p=>F(p?.startedAt)&&p.startedAt>0?p.startedAt+56*D:null;
export function leagueRatings(rows){
 const ratings=new Map(),n=new Map();
 const ordered=[...rows].sort((a,b)=>a.startMs-b.startMs||fk(a).localeCompare(fk(b)));
 // Simultaneous starts update in one batch so order cannot leak information.
 for(let i=0;i<ordered.length;){
  let j=i;while(j<ordered.length&&ordered[j].startMs===ordered[i].startMs)j++;
  const delta=new Map();
  for(const r of ordered.slice(i,j)){
   const h=norm(r.home),a=norm(r.away),rh=ratings.get(h)??1500,ra=ratings.get(a)??1500;
   const p=1/(1+10**((ra-rh)/400)),y=r.final.homeScore>r.final.awayScore?1:r.final.homeScore<r.final.awayScore?0:.5;
   const d=20*(y-p);delta.set(h,(delta.get(h)??0)+d);delta.set(a,(delta.get(a)??0)-d);
   n.set(h,(n.get(h)??0)+1);n.set(a,(n.get(a)??0)+1);
  }
  for(const [t,d] of delta)ratings.set(t,(ratings.get(t)??1500)+d);
  i=j;
 }
 return {ratings,n};
}
function elo(f,league,rating){
 if(!league||league.rows.length<10||!rating)return null;
 const h=norm(f.home),a=norm(f.away),n=rating.n;
 if(Math.min(n.get(h)??0,n.get(a)??0)<3)return null;
 const d=(rating.ratings.get(h)??1500)-(rating.ratings.get(a)??1500);
 const p=1/(1+10**(-d/400));
 if(f.sport!=="축구")return {win:p,lose:1-p};
 const draws=league.rows.filter(r=>Number(r.final.homeScore)===Number(r.final.awayScore)).length;
 const draw=(draws+10*.25)/(league.rows.length+10);
 return {win:(1-draw)*p,draw,lose:(1-draw)*(1-p)};
}
function teamContext(rows,at){
 const last=rows?.[0],past=rows?.slice(0,5)??[];
 return {matches:rows?.length??0,restDays:last?round((at-last.at)/D):null,
  recentMargin:past.length?round(past.reduce((s,r)=>s+r.scored-r.allowed,0)/past.length):null};
}
export function earlyDecision(f,market,index,rating,now,asOf,activation,pilot){
 if(f.earlyShadowV1||f.truth||isNbaGame(f)||!sports.includes(f.sport)||
  ![now,asOf,activation,f.startMs,end(pilot)].every(F)||now<activation||asOf<activation||
  now>=end(pilot)||f.startMs>=end(pilot)||asOf>now||now-asOf>5*M||
  f.startMs-now<65*M||f.startMs-now>85*M||!norm(f.league)||!norm(f.home)||!norm(f.away)||norm(f.home)===norm(f.away))return null;
 const sides=f.sport==="축구"?["win","draw","lose"]:["win","lose"],cs=market?.choices;
 if(!Array.isArray(cs)||cs.length!==sides.length||new Set(cs.map(c=>c.side)).size!==sides.length||
  cs.some(c=>!sides.includes(c.side)||!F(c.p)||c.p<=0||c.p>=1||!F(c.odds)||c.odds<=1)||
  Math.abs(cs.reduce((s,c)=>s+c.p,0)-1)>1e-5)return null;
 const mp=Object.fromEntries(cs.map(c=>[c.side,c.p])),odds=Object.fromEntries(cs.map(c=>[c.side,c.odds]));
 const favorite=best(mp),league=index.leagues.get(lk(f)),raw=elo(f,league,rating),
  mix=raw?Object.fromEntries(sides.map(s=>[s,.8*mp[s]+.2*raw[s]])):null;
 const modelSide=mix?best(mix):null,sorted=Object.values(mix??mp).sort((a,b)=>b-a);
 const opening=(f.snapshots??[]).find(s=>F(s.at)&&s.at<=asOf-30*M);
 const openingP=opening?.market?.choices?.find(c=>c.side===favorite)?.p;
 const shift=F(openingP)?mp[favorite]-openingP:null;
 const exact=index.current.get(fk(f))??[],l=exact.length===1?confirmedLineup(exact[0],now):null;
 // Missing XI is UNKNOWN, not a fabricated absence or automatic veto.
 const agreement=!!mix&&modelSide===favorite,qualified=agreement&&mix[modelSide]>=.60&&sorted[0]-sorted[1]>=.10&&shift!==null&&shift>=-.02;
 return {version:VERSION,lockedAt:now,asOf,deadlineAt:f.startMs-60*M,leadMinutes:round((f.startMs-now)/M),
  market:mp,odds,marketSide:favorite,raw,mix,modelSide,shift:round(shift),
  home:teamContext(league?.teams.get(norm(f.home)),asOf),away:teamContext(league?.teams.get(norm(f.away)),asOf),
  lineup:{status:l?"CONFIRMED":"UNKNOWN",at:l?.at??null,source:l?.source??null},
  qualified,market60:mp[favorite]>=.60,agreement55:agreement&&mix[modelSide]>=.55,
  reason:!raw?"INSUFFICIENT_HISTORY":qualified?"QUALIFIED":"NO_PICK",top1:false};
}
export function lockEarly(fixtures,markets,records,pilot,activation,now,asOf){
 if(!F(activation)||!F(end(pilot))||now>=end(pilot))return 0;
 const candidates=withoutNba(fixtures).filter(f=>!f.earlyShadowV1&&markets.has(f.id)&&f.startMs-now>=65*M&&f.startMs-now<=85*M);
 if(!candidates.length)return 0;
 const index=indexHistory(records,asOf),cache=new Map(),locked=[];
 for(const f of candidates){
  const k=lk(f);if(!cache.has(k))cache.set(k,leagueRatings(index.leagues.get(k)?.rows??[]));
  const c=earlyDecision(f,markets.get(f.id),index,cache.get(k),now,asOf,activation,pilot);
  if(c){f.earlyShadowV1=c;locked.push(f);}
 }
 const date=f=>new Date(f.startMs+9*3600000).toISOString().slice(0,10);
 const used=new Set(fixtures.filter(f=>f.earlyShadowV1?.top1).map(date));
 // One first qualifying batch per KST day; rank only then-known candidates.
 for(const f of locked.filter(f=>f.earlyShadowV1.qualified).sort((a,b)=>b.earlyShadowV1.mix[b.earlyShadowV1.modelSide]-a.earlyShadowV1.mix[a.earlyShadowV1.modelSide]||a.startMs-b.startMs||String(a.id).localeCompare(String(b.id)))){
  const day=date(f);if(!used.has(day)){f.earlyShadowV1.top1=true;used.add(day);}
 }
 return locked.length;
}
const graded=(f,now)=>F(f.truth?.verifiedAt)&&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<=now&&Object.hasOwn(f.earlyShadowV1.market,f.truth.winner);
function metric(rows,prob){
 if(!rows.length)return {graded:0,hits:0,hitRate:null,unitROI:null,brier:null,logLoss:null};
 let hits=0,roi=0,brier=0,loss=0;
 for(const f of rows){const c=f.earlyShadowV1,p=prob(c),s=best(p),y=f.truth.winner,hit=Number(s===y);
  hits+=hit;roi+=hit?c.odds[s]-1:-1;brier+=Object.keys(p).reduce((a,k)=>a+(p[k]-Number(k===y))**2,0);
  loss-=Math.log(Math.max(.000001,p[y]));
 }
 const n=rows.length;return {graded:n,hits,hitRate:round(hits/n),unitROI:round(roi/n),brier:round(brier/n),logLoss:round(loss/n)};
}
const arms={market:[()=>true,c=>c.market],market60:[c=>c.market60,c=>c.market],elo:[c=>!!c.raw,c=>c.raw],
 mix80:[c=>!!c.mix,c=>c.mix],agreement55:[c=>c.agreement55,c=>c.mix],qualified:[c=>c.qualified,c=>c.mix],shadowTop1:[c=>c.top1,c=>c.mix]};
function compare(rows,now){
 return Object.fromEntries(Object.entries(arms).map(([k,[filter,p]])=>{
  const sel=rows.filter(f=>filter(f.earlyShadowV1)),g=sel.filter(f=>graded(f,now));
  return [k,{selected:sel.length,coverage:rows.length?round(sel.length/rows.length):null,...metric(g,p),matchedMarket:metric(g,c=>c.market)}];
 }));
}
export function earlyReport(state,now=Date.now()){
 const activation=state?.coverageV4StartedAt,endsAt=end(state?.pilot);
 if(!F(activation)||!F(endsAt))return {version:VERSION,status:"NOT_STARTED",officialChanged:false};
 const all=withoutNba(state.fixtures).filter(f=>sports.includes(f.sport)&&F(f.startMs)&&f.startMs<endsAt);
 const rows=all.filter(f=>{const c=f.earlyShadowV1;return c?.version===VERSION&&F(c.asOf)&&F(c.lockedAt)&&c.asOf>=activation&&c.asOf<=c.lockedAt&&c.lockedAt<=now&&c.lockedAt<=f.startMs-60*M;});
 const ids=new Set(rows.map(f=>f.id));
 const due=all.filter(f=>f.startMs-60*M>=activation&&f.startMs-60*M<=now&&F(f.firstSeenAt)&&f.firstSeenAt<=f.startMs-60*M);
 return {version:VERSION,status:now<endsAt?"COLLECTING":"REVIEW_REQUIRED",startedAt:activation,endsAt,locked:rows.length,
  knownDeadlinePassed:due.length,knownDeadlineMissed:due.filter(f=>!ids.has(f.id)).length,
  graded:rows.filter(f=>graded(f,now)).length,strategies:compare(rows,now),
  bySport:Object.fromEntries(sports.map(s=>[s,compare(rows.filter(f=>f.sport===s),now)])),
  upcoming:all.filter(f=>f.startMs>now&&(ids.has(f.id)||f.startMs-60*M<=now)).sort((a,b)=>a.startMs-b.startMs).slice(0,100).map(f=>({id:f.id,sport:f.sport,league:f.league,home:f.home,away:f.away,startMs:f.startMs,deadlineAt:f.startMs-60*M,
   status:ids.has(f.id)?f.earlyShadowV1.reason:"DEADLINE_MISSED_NO_PICK",decision:ids.has(f.id)?f.earlyShadowV1:null})),
  officialChanged:false,autoPromote:false,note:"Early research only. Lock T-85..T-65; 5-minute reserve is not a guaranteed publication SLA. Known deadline misses exclude fixtures never observed. No retrospective replacement or late lineup update."};
}
