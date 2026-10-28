// Reconcile public projection with already verified public results.
// A timed-out browser may restore an older frozen tracker artifact; it must not
// erase previously independently confirmed public settlement. Never backfill
// picks or probabilities and never replace an existing final with a conflict.
import fs from "node:fs";
import {pathToFileURL} from "node:url";
import {scorePlausibility} from "../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const statuses=["HIT","MISS","VOID"];
const validVerified=r=>r?.status==="VERIFIED"&&r.result&&
 Number.isFinite(r.verifiedAt)&&r.verifiedAt>r.startMs&&
 scorePlausibility(r.sport,r.result.homeScore,r.result.awayScore).ok;
function carryStatus(current,older){
 if(!current||!older||String(current.key)!==String(older.key))return current;
 if(!statuses.includes(older.resultStatus))return current;
 if(statuses.includes(current.resultStatus)&&current.resultStatus!==older.resultStatus)
   throw Error("PUBLIC_PICK_RESULT_CONFLICT_"+current.key);
 return {...current,resultStatus:older.resultStatus,
   actualLabel:older.actualLabel??current.actualLabel,
   resultNote:older.resultNote??current.resultNote};
}
export function reconcilePublishedHistory(old,next){
 if(old?.schema!=="wisetoto-public-history-v1"||next?.schema!==old.schema
   ||!Array.isArray(old.records)||!Array.isArray(next.records))
   throw Error("PUBLIC_SCHEMA_MISMATCH");
 const oldById=new Map(old.records.map(r=>[r.id,r]));
 const nextById=new Set(next.records.map(r=>r.id));
 const lost=old.records.filter(r=>!nextById.has(r.id));
 if(lost.length)throw Error("PUBLIC_RECORD_REGRESSION: "+lost.slice(0,8).map(r=>r.id).join(","));
 if(next.counts?.total!==next.records.length)throw Error("PUBLIC_COUNT_MISMATCH");
 let repaired=0,invalidPrior=0;
 const oldValidVerified=old.records.filter(validVerified).length;
 const records=next.records.map(row=>{
  const prior=oldById.get(row.id);
  if(!prior||prior.status!=="VERIFIED")return row;
  const score=prior.result;
  // A previously public 'VERIFIED' volleyball 2:2 is not a valid final!
  // Keep its original evidence for review, never propagate the bad grade.
  if(!validVerified(prior)){
    if(row.status==="VERIFIED")throw Error("PUBLIC_INVALID_FINAL_STILL_VERIFIED_"+row.id);
    invalidPrior++;
    const warning="과거 종료 검증 표시가 종목 점수 규칙에 위배됨 — 재검토 필요";
    return {...row,status:"REVIEW_REQUIRED",
      warnings:[...new Set([...(row.warnings??[]),warning])]};
  }
  if(row.status==="VERIFIED"){
   if(!row.result||row.result.homeScore!==score.homeScore||
      row.result.awayScore!==score.awayScore)
    throw Error("PUBLIC_FINAL_SCORE_CONFLICT_"+row.id);
   return row;
  }
  if(row.status!=="PENDING")throw Error("PUBLIC_FINAL_STATUS_CONFLICT_"+row.id);
  repaired++;
  const prevMarket=new Map((prior.markets??[]).map(p=>[String(p.key),p]));
  return {...row,status:"VERIFIED",verifiedAt:prior.verifiedAt,result:score,
   top1:carryStatus(row.top1,prior.top1),
   markets:(row.markets??[]).map(p=>carryStatus(p,prevMarket.get(String(p.key))))};
 });
 const result={...next,records,counts:{...next.counts,
  total:records.length,
  pending:records.filter(x=>x.status==="PENDING").length,
  verified:records.filter(x=>x.status==="VERIFIED").length,
  review:records.filter(x=>x.status==="REVIEW_REQUIRED").length,
  void:records.filter(x=>x.status==="VOID").length,
  hit:records.filter(x=>x.top1?.resultStatus==="HIT").length,
  miss:records.filter(x=>x.top1?.resultStatus==="MISS").length,
  warnings:records.filter(x=>(x.warnings??[]).length>0).length}};
 if(result.counts.verified<oldValidVerified)
   throw Error("PUBLIC_VALID_VERIFIED_COUNT_REGRESSION");
 return {data:result,repaired,invalidPrior};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const old=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
 const next=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));
 const output=reconcilePublishedHistory(old,next);
 fs.writeFileSync(process.argv[3],JSON.stringify(output.data)+"\n");
 console.log("PUBLIC_LEDGER_RECONCILED",JSON.stringify({previous:old.records.length,
   current:output.data.records.length,priorVerified:old.counts.verified,
   currentVerified:output.data.counts.verified,carriedPreviouslyVerified:output.repaired,invalidPriorToReview:output.invalidPrior}));
}
