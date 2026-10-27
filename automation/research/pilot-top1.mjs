// Fixed 28-day research pilot. Report the measured cohort even with few/no
// confirmed outcomes; never manufacture verified accuracy or retrofit a pick.
// Current official PRE/TOP1 is entirely separate.
export const PILOT_DAYS=28;
const DAY=86400000;
const SPORTS=["축구","농구","야구","배구"];
const safe=(v)=>Number.isFinite(v)?v:null;
const round=(v,n=4)=>safe(v)===null?null:Number(v.toFixed(n));
const validCandidate=f=>{
 const p=f?.frozenCandidate;
 return f&&Number.isFinite(f.startMs)&&p&&Number.isFinite(p.asOf)&&p.asOf<f.startMs
   &&Number.isFinite(p.marketProbability)&&p.marketProbability>0&&p.marketProbability<1
   &&Number.isFinite(p.odds)&&p.odds>1&&Number.isFinite(p.shift)
   &&["win","draw","lose"].includes(p.side);
};
const verified=f=>validCandidate(f)&&f.truth&&!f.truth.untrained
   &&["win","draw","lose"].includes(f.truth.winner)
   &&Number.isFinite(f.truth.verifiedAt)&&f.truth.verifiedAt>f.startMs;
const recordId=f=>String(f.id??[f.sport,f.startMs,f.home,f.away].join("|"));
export function evaluateRows(rows){
 const bets=rows.filter(verified);
 const n=bets.length;
 const wins=bets.filter(f=>f.truth.winner===f.frozenCandidate.side).length;
 const risk=n?bets.reduce((sum,f)=>sum+(f.truth.winner===f.frozenCandidate.side?f.frozenCandidate.odds-1:-1),0):0;
 const brier=n?bets.reduce((sum,f)=>{
  const y=f.truth.winner===f.frozenCandidate.side?1:0;
  return sum+(f.frozenCandidate.marketProbability-y)**2;
 },0)/n:null;
 // Wilson one-sided 90% lower hit bound; descriptive, NOT an EV proof.
 const z=1.2815515655446004,hit=n?wins/n:0;
 const low=n?(hit+z*z/(2*n)-z*Math.sqrt(hit*(1-hit)/n+z*z/(4*n*n)))/(1+z*z/n):null;
 return {decisions:n,hits:wins,misses:n-wins,hitRate:n?round(wins/n):null,
   unitProfit:round(risk),unitROI:n?round(risk/n):null,marketBrier:round(brier),
   hitLower90:round(low)};
}
function allRows(fixtures,start,end){
 return (fixtures||[]).filter(f=>Number.isFinite(f?.startMs)&&f.startMs>=start&&f.startMs<end);
}
export function buildPilotReport(state,now=Date.now()){
 const startedAt=state?.pilot?.startedAt;
 if(!Number.isFinite(startedAt)||startedAt<=0)return {
  schema:"wisetoto-28day-top1-pilot-v1",status:"NOT_STARTED",durationDays:PILOT_DAYS,
  startedAt:null,endsAt:null,completedDays:0,
  note:"First successful real collection is needed to start the 28-day clock."};
 const endsAt=startedAt+PILOT_DAYS*DAY;
 const complete=now>=endsAt;
 const completedDays=Math.min(PILOT_DAYS,Math.max(0,Math.floor((now-startedAt)/DAY)));
 const rows=allRows(state.fixtures,startedAt,endsAt);
 const confirmed=rows.filter(f=>verified(f)&&f.truth.verifiedAt<=now);
 const frozen=rows.filter(validCandidate);
 const pending=frozen.filter(f=>f.startMs<=now&&
  (!verified(f)||f.truth.verifiedAt>now));
 const allMetric=evaluateRows(confirmed);
 const bySport=Object.fromEntries(SPORTS.map(s=>[s,evaluateRows(confirmed.filter(f=>f.sport===s))]));
 const weeks=Array.from({length:4},(_,week)=>{
  const begin=startedAt+week*7*DAY,end=begin+7*DAY;
  const settled=confirmed.filter(f=>f.startMs>=begin&&f.startMs<end);
  return {week:week+1,complete:now>=end,observed:rows.filter(f=>f.startMs>=begin&&f.startMs<end).length,
    frozen:frozen.filter(f=>f.startMs>=begin&&f.startMs<end).length,metrics:evaluateRows(settled)};
 });
 // One ex-ante research TOP1 shadow pick per KST calendar day: choose the
 // largest genuine, archived pre-kickoff market shift, with deterministic ties.
 // The final result is used ONLY for scoring, never for picking.
 const byDay=new Map();
 const fmt=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"});
 for(const f of frozen){
  const date=fmt.format(new Date(f.startMs)),prior=byDay.get(date);
  const stronger=!prior||f.frozenCandidate.shift>prior.frozenCandidate.shift||
   (f.frozenCandidate.shift===prior.frozenCandidate.shift&&recordId(f)<recordId(prior));
  if(stronger)byDay.set(date,f);
 }
 const shadow=[...byDay.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,f])=>({
  date,id:recordId(f),sport:f.sport,league:f.league,home:f.home,away:f.away,
  kickoff:f.startMs,asOf:f.frozenCandidate.asOf,side:f.frozenCandidate.side,
  odds:f.frozenCandidate.odds,marketProbability:f.frozenCandidate.marketProbability,
  shift:f.frozenCandidate.shift,
  result:f.truth?.verifiedAt<=now&&verified(f)
    ?(f.truth.winner===f.frozenCandidate.side?"HIT":"MISS"):"PENDING"
 }));
 const shadowMetric=evaluateRows([...byDay.values()].filter(f=>verified(f)&&f.truth.verifiedAt<=now));
 // A time-ordered research correction never sees a result VERIFIED after
 // another game's quote. Report it only on genuinely walk-forward decisions.
 const ordered=[...confirmed].sort((a,b)=>a.frozenCandidate.asOf-b.frozenCandidate.asOf);
 const oos=[];
 for(const f of ordered){
  const previous=ordered.filter(p=>p!==f&&p.startMs<f.frozenCandidate.asOf&&
   p.truth.verifiedAt<f.frozenCandidate.asOf&&p.sport===f.sport);
  if(previous.length<5)continue;
  const p=f.frozenCandidate.marketProbability,w=previous.filter(x=>x.truth.winner===x.frozenCandidate.side).length;
  const adjusted=(w+20*p)/(previous.length+20);
  const y=f.truth.winner===f.frozenCandidate.side?1:0;
  oos.push({model:(adjusted-y)**2,market:(p-y)**2});
 }
 const modelBrier=oos.length?oos.reduce((a,r)=>a+r.model,0)/oos.length:null;
 const marketBrier=oos.length?oos.reduce((a,r)=>a+r.market,0)/oos.length:null;
 const walkForward={decisions:oos.length,modelBrier:round(modelBrier),marketBrier:round(marketBrier),
   improved:oos.length>=5&&modelBrier+0.002<marketBrier};
 const proposals=[];
 if(frozen.length===0)proposals.push("실제 사전 시장 스냅샷 2회 이상 확보부터 개선");
 if(pending.length>0&&pending.length>=confirmed.length)
  proposals.push("종료 결과 제공처·ID 매칭 보완을 우선 검토");
 if(allMetric.decisions<10)
  proposals.push("검증 표본 부족: 적중률/EV 확정하지 않고 연구 TOP1은 탐색 등급으로 유지");
 else if(!walkForward.improved)
  proposals.push("시장확률 대비 개선 입증 실패: 확률 보정 강도 변경안을 별도 그림자 테스트");
 else
  proposals.push("시간순 보정 개선 발견: 다른 기간의 그림자 테스트를 거쳐 연구 모델만 별도 버전으로 검토");
 proposals.push("기존 frozen PRE/공식 TOP1 절대 수정 금지; 변경안은 별도 테스트·PR 검토");
 const grade=allMetric.decisions>=10&&walkForward.improved&&shadowMetric.decisions>=5
   ?"PROMISING_RESEARCH":"EXPLORATORY_ONLY";
 return {schema:"wisetoto-28day-top1-pilot-v1",status:complete?"FOUR_WEEK_REVIEW_READY":"COLLECTING",
  startedAt,endsAt,completedDays,durationDays:PILOT_DAYS,
  counts:{listed:rows.length,pregameCandidates:frozen.length,verified:confirmed.length,
    pendingFinal:pending.length,shadowDays:shadow.length},
  bySport,weeks,all:allMetric,shadowTop1:shadowMetric,shadowHistory:shadow.slice(-28),
  walkForward,grade,proposals,reportUpdatedAt:now,
  note:complete?"28일 코호트 연구 분석. 표본이 작으면 결론과 추천이 아닌 탐색 신호로만 해석.":
   "일자별 그림자 TOP1은 경기 시작 전 시점으로만 선정하며 결과를 뒤늦게 선택에 반영하지 않음."};
}
export function selectPostPilotTop1(state,now=Date.now()){
 const report=buildPilotReport(state,now);
 if(report.status!=="FOUR_WEEK_REVIEW_READY")return null;
 const fixture=(state.fixtures??[]).filter(f=>f.startMs>now&&f.startMs<now+7*DAY&&
   f.lastEvidence?.top1&&Number.isFinite(f.lastEvidence.top1.asOf)&&
   f.lastEvidence.top1.asOf<now&&f.lastEvidence.top1.asOf<f.startMs)
   .sort((a,b)=>b.lastEvidence.top1.shift-a.lastEvidence.top1.shift||
     a.startMs-b.startMs||recordId(a).localeCompare(recordId(b)))[0];
 if(!fixture)return null;
 const c=fixture.lastEvidence.top1;
 return {id:recordId(fixture),sport:fixture.sport,league:fixture.league,
  home:fixture.home,away:fixture.away,startMs:fixture.startMs,side:c.side,label:c.label,
  observedAt:c.asOf,odds:c.odds,marketProbability:c.marketProbability,shift:c.shift,
  grade:report.grade==="PROMISING_RESEARCH"?"PILOT_RESEARCH_TOP1":"EXPLORATORY_TOP1",
  note:"4주 연구 결과 기반의 미래 경기 그림자 TOP1. 확정 추천 아님; 공식 TOP1 미변경."};
}
