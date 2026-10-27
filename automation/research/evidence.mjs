// Separate pregame market-evidence research. This is NOT the existing PRE engine.
// Never backfill past kickoff, never use final scores as pregame features.
import {sportName} from "../logic.mjs";
export const SCHEMA="wisetoto-market-evidence-v1";
const MINUTE=60_000,HOUR=60*MINUTE,DAY=24*HOUR;
const MAX_FIXTURES=800,MAX_SNAPSHOTS=24;
const clean=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,"").replace(/\b(fc|cf|bc|bk|sc|club)\b/g,"").replace(/[^a-z0-9가-힣]/g,"");
const okayTeams=g=>[g.home,g.away].every(t=>typeof t==="string"&&t.trim()&&!/^(미정|tbd|tba|unknown|-)$/i.test(t.trim()));
export function fixtureId(g){
 const start=Number(g.gameDateMs??new Date(g.gameDate).getTime());
 const sport=sportName(g.sport);
 return sport&&Number.isFinite(start)&&okayTeams(g)
   ? [sport,start,clean(g.home),clean(g.away)].join("|"):null;
}
export function normalizeMoneyline(game) {
 // Reject Betman's 5-point/1-point special result markets, totals, handicaps,
 // nonstandard settlement and unknown selections. Only ordinary full-time W/D/L.
 const sport=sportName(game.sport);
 const allowed=sport==="축구"?["win","draw","lose"]:["win","lose"];
 const markets=(Array.isArray(game.markets)?game.markets:[]).filter(m=>
   m?.type==="moneyline" && /승무패|승패/.test(String(m.betName??"")) &&
   !/승5패|승1패|핸디|전반|후반|세트|연장/.test(String(m.betName??"")));
 for(const m of markets){
   const arr=m.selections;
   if(!Array.isArray(arr)||arr.length!==allowed.length)continue;
   const bySide=new Map();
   for(const choice of arr){
     const side=String(choice?.side??"");
     const odds=Number(choice?.odds);
     if(!allowed.includes(side)||!Number.isFinite(odds)||odds<=1.02||odds>100||bySide.has(side))break;
     bySide.set(side,{side,label:String(choice.label??side),odds});
   }
   if(bySide.size!==allowed.length)continue;
   const overround=allowed.reduce((sum,side)=>sum+1/bySide.get(side).odds,0);
   if(overround<0.99||overround>1.25)continue;
   const choices=allowed.map(side=>({...bySide.get(side),p:(1/bySide.get(side).odds)/overround}));
   return {name:String(m.betName),type:"moneyline",hold:Number((overround-1).toFixed(5)),choices};
 }
 return null;
}
function resultSide(fixture,truth) {
 const home=Number(truth?.result?.homeScore??truth?.homeScore);
 const away=Number(truth?.result?.awayScore??truth?.awayScore);
 if(!Number.isFinite(home)||!Number.isFinite(away))return null;
 return home>away?"win":home<away?"lose":"draw";
}
export function observeCandidate(fixture){
 const snapshots=fixture.snapshots??[];
 if(snapshots.length<2)return {stage:"COLLECTING",reason:"독립된 경기 전 시장 관측 2회 미만",top1:null};
 const open=snapshots[0],latest=snapshots[snapshots.length-1];
 if(latest.at-open.at<30*MINUTE)return {stage:"COLLECTING",reason:"최초/최근 관측 30분 미만",top1:null};
 const first=open.market,last=latest.market;
 if(!first||!last)return {stage:"HOLD",reason:"비교 가능한 일반 승패 시장 없음",top1:null};
 const shifts=last.choices.map(choice=>{
   const old=first.choices.find(s=>s.side===choice.side);
   return old?{...choice,openP:old.p,shift:choice.p-old.p}:null;
 }).filter(Boolean).sort((a,b)=>b.shift-a.shift||b.p-a.p);
 const leader=shifts[0];
 if(!leader||leader.shift<0.02)return {stage:"HOLD",reason:"유의미한 시장 확률 이동(2%p) 없음",top1:null};
 return {stage:"WATCH",reason:"배당 이동 관찰만으로 적중확률 또는 +EV를 확정할 수 없음",
   top1:{side:leader.side,label:leader.label,odds:leader.odds,
     marketProbability:Number(leader.p.toFixed(5)),
     openProbability:Number(leader.openP.toFixed(5)),
     shift:Number(leader.shift.toFixed(5)),
     marketHold:last.hold,asOf:latest.at}};
}
// Time-ordered, league-specific experimental calibration. No current fixture
// result or later provider verification may enter the training/backtest window.
function confidence(candidate,fixtures,sport,league,now){
 const cutoff=Math.min(now,Number(candidate.asOf));
 const sameLeague=x=>String(x??"").normalize("NFKC").toLowerCase().replace(/\s/g,"")===
   String(league??"").normalize("NFKC").toLowerCase().replace(/\s/g,"");
 const eligible=(fixtures??[]).filter(f=>f.sport===sport&&f.truth&&!f.truth.untrained
   &&f.startMs<cutoff&&Number.isFinite(f.truth.verifiedAt)
   &&f.truth.verifiedAt>f.startMs&&f.truth.verifiedAt<cutoff
   &&f.frozenCandidate&&Number.isFinite(f.frozenCandidate.asOf)
   &&f.frozenCandidate.asOf<f.startMs
   &&Number.isFinite(f.frozenCandidate.marketProbability)
   &&Number.isFinite(f.frozenCandidate.odds)
   &&["win","draw","lose"].includes(f.frozenCandidate.side));
 const leagueHistory=eligible.filter(f=>sameLeague(f.league))
   .sort((a,b)=>a.frozenCandidate.asOf-b.frozenCandidate.asOf);
 const history=leagueHistory.filter(f=>Math.abs(f.frozenCandidate.marketProbability-candidate.marketProbability)<=0.15);
 const insufficient=(reason,backtest=null)=>({samples:history.length,sportSamples:eligible.length,
    leagueSamples:leagueHistory.length,qualified:false,reason,backtest});
 if(eligible.length<80||leagueHistory.length<60||history.length<50)
   return insufficient("종목 80·리그 60·유사확률 50 경기 이상 검증표본 필요");
 const test=[];
 // For each archived prediction, only outcomes VERIFIED by THAT prediction timestamp
 // can be used. This avoids leakage from delayed results or hindsight research.
 for(const row of leagueHistory){
   const at=row.frozenCandidate.asOf;
   const prior=leagueHistory.filter(f=>f.startMs<at&&f.truth.verifiedAt<at
     &&f.frozenCandidate.asOf<at
     &&Math.abs(f.frozenCandidate.marketProbability-row.frozenCandidate.marketProbability)<=0.15);
   if(prior.length<20)continue;
   const y=row.truth.winner===row.frozenCandidate.side?1:0;
   const p=row.frozenCandidate.marketProbability;
   const wins=prior.filter(f=>f.truth.winner===f.frozenCandidate.side).length;
   const estimate=(wins+40*p)/(prior.length+40);
   test.push({market:(p-y)**2,model:(estimate-y)**2});
 }
 if(test.length<20)return insufficient("시간순 외부 검증 20건 미만",{samples:test.length});
 const marketBrier=test.reduce((x,y)=>x+y.market,0)/test.length;
 const modelBrier=test.reduce((x,y)=>x+y.model,0)/test.length;
 const backtest={samples:test.length,marketBrier:Number(marketBrier.toFixed(5)),
   modelBrier:Number(modelBrier.toFixed(5)),improved:modelBrier+0.002<marketBrier};
 if(!backtest.improved)return insufficient("시간순 Brier 점수 개선 확인되지 않음",backtest);
 const wins=history.filter(f=>f.truth.winner===f.frozenCandidate.side).length;
 const p=candidate.marketProbability,priorWeight=40;
 const calibrated=(wins+priorWeight*p)/(history.length+priorWeight);
 const sd=Math.sqrt(calibrated*(1-calibrated)/(history.length+priorWeight+1));
 const lower=Math.max(0,calibrated-1.645*sd);
 return {samples:history.length,sportSamples:eligible.length,leagueSamples:leagueHistory.length,
   qualified:true,probability:Number(calibrated.toFixed(5)),
   conservativeProbability:Number(lower.toFixed(5)),
   conservativeEV:Number((lower*candidate.odds-1).toFixed(5)),backtest,
   reason:"동일 리그 선행 종료 결과·시간순 OOS 검증·90% 단측 보수적 EV"};
}
export function decideEvidence(fixture,fixtures,now){
 const observed=observeCandidate(fixture);
 if(!observed.top1)return observed;
 const conf=confidence(observed.top1,fixtures,fixture.sport,fixture.league,now);
 if(!conf.qualified)return {...observed,reason:conf.reason,calibration:conf};
 if(conf.conservativeEV>0.03)
   return {...observed,stage:"RESEARCH_TOP1",reason:"선행 검증표본과 보수적 +EV 기준 충족 (실험)",calibration:conf};
 return {...observed,reason:"보수적 EV 기준 미충족 — 관찰 후보만 표시",calibration:conf};
}
export function ingestEvidence(state,feed,now,verifiedRecords=[],observedAt=now){
 if(!feed?.ok||!Array.isArray(feed.games))throw Error("official feed required");
 if(!Number.isFinite(observedAt)||observedAt>now||now-observedAt>5*MINUTE)
   throw Error("Never backdate a stale research feed");
 const existing=Array.isArray(state?.fixtures)?state.fixtures:[];
 const byId=new Map(existing.filter(f=>f?.id&&Number.isFinite(f.startMs)).map(f=>[f.id,{...f,snapshots:[...(f.snapshots||[])]}]));
 let captured=0,examined=0,settled=0;
 for(const g of feed.games){
   const id=fixtureId(g),start=Number(g.gameDateMs??new Date(g.gameDate).getTime());
   if(!id||start-now<10*MINUTE||start-now>7*DAY)continue;
   examined++;
   const market=normalizeMoneyline(g);
   if(!market)continue;
   const sport=sportName(g.sport);
   let f=byId.get(id);
   if(!f){
     f={id,sport,league:String(g.league??""),home:String(g.home),away:String(g.away),
       startMs:start,firstSeenAt:now,lastSeenAt:now,snapshots:[],truth:null,frozenCandidate:null};
     byId.set(id,f);
   }
   const last=f.snapshots[f.snapshots.length-1];
   // Never overwrite earlier real odds; retain at most a 30-min cadence.
   if(!last||observedAt-last.at>=30*MINUTE){
     f.snapshots.push({at:observedAt,market});
     // Preserve the original opening quote permanently within the bounded
     // per-fixture history; evict intermediate points, never the opener.
     if(f.snapshots.length>MAX_SNAPSHOTS)
       f.snapshots=[f.snapshots[0],...f.snapshots.slice(-(MAX_SNAPSHOTS-1))];
     captured++;
   }
   f.lastSeenAt=observedAt;
 }
 const records=Array.isArray(verifiedRecords)?verifiedRecords:[];
 for(const record of records){
   if(record?.verificationStatus!=="VERIFIED"||!Number.isFinite(Number(record?.verifiedAt))||
     Number(record.verifiedAt)>now||
     !Number.isFinite(Number(record?.capturedAt))||
     Number(record.capturedAt)>=Number(record.startMs))continue;
   const id=fixtureId({sport:record.sport,home:record.home,away:record.away,gameDateMs:record.startMs});
   const f=byId.get(id);
   if(!f||f.truth||Number(record.verifiedAt)<f.startMs)continue;
   const winner=resultSide(f,record);
   if(!winner||(winner==="draw"&&f.sport!=="축구"))continue;
   const frozen=f.frozenCandidate;
   f.truth={winner,verifiedAt:Number(record.verifiedAt),source:"verified-tracker"};
   settled++;
   // Never create or re-select historic TOP1 using known final outcome.
   if(!frozen)f.truth={...f.truth,untrained:true};
 }
 let fixtures=[...byId.values()].filter(f=>f.startMs>now-120*DAY&&f.startMs<now+7*DAY)
   .sort((a,b)=>b.startMs-a.startMs||a.id.localeCompare(b.id)).slice(0,MAX_FIXTURES);
 for(const f of fixtures){
   if(!f.frozenCandidate&&f.startMs<=now){
     // No after-kickoff selection, including after a missed runner scan.
     f.frozenCandidate=f.lastEvidence?.top1??null;
   }
   if(f.startMs>now)f.lastEvidence=decideEvidence(f,fixtures,now);
 }
 const stats={total:fixtures.length,captured,settled,examined,with2Snapshots:fixtures.filter(f=>f.snapshots.length>=2).length,
   observed:fixtures.filter(f=>f.startMs>now&&f.lastEvidence?.top1).length,
   researchTop1:fixtures.filter(f=>f.startMs>now&&f.lastEvidence?.stage==="RESEARCH_TOP1").length,
   verified:fixtures.filter(f=>f.truth&&!f.truth.untrained).length};
 return {state:{schema:SCHEMA,updatedAt:now,fixtures},stats};
}
export function publicEvidence(state,now=Date.now()){
 const upcoming=(state?.fixtures||[]).filter(f=>f.startMs>now&&f.startMs<now+7*DAY)
   .sort((a,b)=>a.startMs-b.startMs);
 const rows=upcoming.slice(0,150).map(f=>({
     id:f.id,sport:f.sport,league:f.league,home:f.home,away:f.away,
     startMs:f.startMs,firstSeenAt:f.firstSeenAt,lastSeenAt:f.lastSeenAt,
     observations:f.snapshots.length,stage:f.lastEvidence?.stage??"COLLECTING",
     reason:f.lastEvidence?.reason??"첫 수집 대기",top1:f.lastEvidence?.top1??null,
     calibration:f.lastEvidence?.calibration??null
   }));
 return {schema:"wisetoto-public-evidence-v1",generatedAt:new Date(now).toISOString(),
   disclaimer:"독립 연구 후보. 기존 frozen PRE 및 공식 TOP1과 별개. 배당 이동만으로 적중/수익을 보장하지 않음.",
   counts:{future:upcoming.length,observed:upcoming.filter(r=>r.lastEvidence?.top1).length,
     researchTop1:upcoming.filter(r=>r.lastEvidence?.stage==="RESEARCH_TOP1").length,
     insufficient:upcoming.filter(r=>r.lastEvidence?.stage!=="RESEARCH_TOP1").length},records:rows};
}
