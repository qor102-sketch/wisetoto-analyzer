// Independent 28-day fixture-to-final funnel from the real collect-first ledger.
// Unlike market research, includes games without qualifying betting markets.
const DAY=86400000;
const SPORTS=["축구","농구","야구","배구"];
const empty=()=>({registered:0,pregameWindow:0,pregameOdds:0,
 finalVerified:0,verifiedWithOdds:0,verifiedWithLineup:0,
 lineupConfirmed:0,lineupPartial:0,lineupUnsupported:0,
 overduePending:0,resultOnly:0,captureWarnings:0});
const add=(c,row,now)=>{
 c.registered++;
 const window=Number.isFinite(row.pregameCapturedAt)&&
   row.pregameCapturedAt<row.startMs&&row.pregameCapturedAt>=row.startMs-30*60000;
 const odds=window&&Number.isFinite(row.firstOddsAt)&&
   row.firstOddsAt<row.startMs&&Array.isArray(row.odds)&&row.odds.length>0;
 const verified=row.verdict==="VERIFIED"&&row.final&&
   Number.isFinite(row.verifiedAt)&&row.verifiedAt>row.startMs&&row.verifiedAt<=now;
 const lineup=row.lineup?.status==="CONFIRMED"&&
   Number.isFinite(row.lineup.capturedAt)&&row.lineup.capturedAt<row.startMs;
 if(window)c.pregameWindow++;
 if(odds)c.pregameOdds++;
 if(verified)c.finalVerified++;
 if(verified&&odds)c.verifiedWithOdds++;
 if(verified&&odds&&lineup)c.verifiedWithLineup++;
 if(lineup)c.lineupConfirmed++;
 if(row.lineup?.status==="PARTIAL"&&Number.isFinite(row.lineup.capturedAt)&&
   row.lineup.capturedAt<row.startMs)c.lineupPartial++;
 if(row.lineup?.status==="UNSUPPORTED")c.lineupUnsupported++;
 if(row.startMs<=now-2*3600000&&!verified)c.overduePending++;
 if(!window&&row.startMs<=now)c.resultOnly++;
 if(row.captureIssue)c.captureWarnings++;
};
export function buildCollectionFunnel(ledger,startedAt,now=Date.now()){
 if(!Number.isFinite(startedAt)||startedAt<=0)return null;
 if(!ledger||ledger.schema!=="wisetoto-collect-first-v1"||!Array.isArray(ledger.records))
  return {schema:"wisetoto-28day-collection-funnel-v1",status:"LEDGER_UNAVAILABLE",
    reason:"Collection ledger missing or incompatible: no inferred counts"};
 const end=startedAt+28*DAY,asOf=Math.min(now,end);
 const selected=ledger.records.filter(r=>Number.isFinite(r?.startMs)&&
    r.startMs>=startedAt&&r.startMs<end);
 const counts=empty(),bySport=Object.fromEntries(SPORTS.map(s=>[s,empty()]));
 const weeks=Array.from({length:4},(_,i)=>({week:i+1,...empty()}));
 for(const row of selected){
  add(counts,row,now);
  if(bySport[row.sport])add(bySport[row.sport],row,now);
  const idx=Math.floor((row.startMs-startedAt)/(7*DAY));
  if(weeks[idx])add(weeks[idx],row,now);
 }
 return {schema:"wisetoto-28day-collection-funnel-v1",status:now>=end?"FOUR_WEEK_READY":"COLLECTING",
  startedAt,endsAt:end,asOf,counts,bySport,weeks,
  note:"진짜 경기 전 시각·배당·선발 명단과 경기 종료 후 검증된 점수를 별개로 집계. 결과만 발견된 경기는 예측 학습에서 제외."};
}
