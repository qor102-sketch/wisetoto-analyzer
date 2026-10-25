// Public, read-only projection of the separate Actions tracker.
// Never publish browser localStorage or rewrite original frozen records.
import fs from "node:fs/promises";
import {getRecords,STATE_FILE} from "./logic.mjs";
export const firstNumeric=(...values)=>{
  for(const v of values) if(typeof v==="number"&&Number.isFinite(v))return v;
  return null;
};
export function summarizePick(p){
  if(!p||typeof p!=="object")return null;
  return {
    key:String(p.key??""),market:String(p.market??""),pick:String(p.pick??""),
    probability:firstNumeric(p.probability),odds:firstNumeric(p.odds),
    marketProbability:firstNumeric(p.marketProbability),
    expectedValue:firstNumeric(p.expectedValue),edge:firstNumeric(p.edge),
    grade:String(p.grade??"PASS"),score:firstNumeric(p.recommendationScore),
    resultStatus:String(p.resultStatus??"PENDING"),
    actualLabel:p.actualLabel==null?null:String(p.actualLabel),
    resultNote:p.resultNote==null?null:String(p.resultNote)
  };
}
export function summarizeRecord(r){
 const pre=r.footballPre&&typeof r.footballPre==="object"?r.footballPre:null;
 const court=r.courtPre&&typeof r.courtPre==="object"?r.courtPre:null;
 const result=r.result&&typeof r.result==="object"?r.result:null;
 const picks=(Array.isArray(r.picks)?r.picks:[]).map(summarizePick).filter(Boolean);
 const markets=(Array.isArray(r.marketResults)?r.marketResults:[]).map(summarizePick).filter(Boolean);
 const startMs=firstNumeric(r.startMs);
 const capturedAt=firstNumeric(r.capturedAt);
 const warnings=[];
 if(startMs!==null&&capturedAt!==null&&capturedAt>=startMs)warnings.push("킥오프 이후 캡처 — PRE 유효성 점검");
 if(pre){
   const h=firstNumeric(pre.homeRecentSample),a=firstNumeric(pre.awayRecentSample);
   if(h!==null&&a!==null&&(h<5||a<5))warnings.push("경기 전 최근 Form 부족 ("+h+"/"+a+")");
 }
 const best=picks[0]??null;
 if(String(r.sport)==="축구"&&best&&["VALUE","STRONG VALUE","약추천","실전 추천"].includes(best.grade)&&best.expectedValue!==null&&best.expectedValue<=0){
    warnings.push("축구 추천 등급 대비 EV 비양수");
 }
 return {
   id:String(r.id??""),sport:String(r.sport??""),league:String(r.league??""),
   home:String(r.home??""),away:String(r.away??""),
   startMs,capturedAt,
   decision:String(r.decision??"PASS"),
   status:String(r.verificationStatus??"PENDING"),
   verifiedAt:firstNumeric(r.verifiedAt),
   verifyWaitReason:r.verificationStatus==="PENDING" && r.verifyWaitReason ? String(r.verifyWaitReason).slice(0,64) : null,
   verifyLastCheckedAt:firstNumeric(r.verifyLastCheckedAt),
   result:result?{homeScore:firstNumeric(result.homeScore),awayScore:firstNumeric(result.awayScore),source:String(result.source??"")} :null,
   pre:pre?{
     expectedHome:firstNumeric(pre.expectedHome),expectedAway:firstNumeric(pre.expectedAway),
     homeRecentSample:firstNumeric(pre.homeRecentSample),awayRecentSample:firstNumeric(pre.awayRecentSample),
     homeVenueSample:firstNumeric(pre.homeVenueSample),awayVenueSample:firstNumeric(pre.awayVenueSample)
   }:null,
   // Court PRE is a first-capture snapshot, never a value recomputed after results.
   courtPre:court?{
     expectedHome:firstNumeric(court.expectedHome),expectedAway:firstNumeric(court.expectedAway),
     homeRecentSample:firstNumeric(court.homeRecentSample),awayRecentSample:firstNumeric(court.awayRecentSample),
     homeVenueSample:firstNumeric(court.homeVenueSample),awayVenueSample:firstNumeric(court.awayVenueSample)
   }:null,
   lineup:r.footballLineup?{
     stage:String(r.footballLineup.stage??""),capturedAt:firstNumeric(r.footballLineup.capturedAt)
   }:null,
   top1:best,markets,warnings
 };
}
export function publishProjection(state){
 const records=getRecords(state).map(summarizeRecord)
 .filter(r=>r.id&&r.startMs!==null&&r.capturedAt!==null)
 .sort((a,b)=>b.startMs-a.startMs||a.id.localeCompare(b.id));
 return {
  schema:"wisetoto-public-history-v1",
  publishedAt:new Date().toISOString(),
  lastRunAt:state?.meta?.lastRunAt??null,
  source:"GitHub Actions 자동 LIVE TRACKER (수동 분석 기록과 별개)",
  counts:{
    total:records.length,pending:records.filter(r=>r.status==="PENDING").length,
    verified:records.filter(r=>r.status==="VERIFIED").length,
    void:records.filter(r=>r.status==="VOID").length,
    hit:records.filter(r=>r.top1?.resultStatus==="HIT").length,
    miss:records.filter(r=>r.top1?.resultStatus==="MISS").length,
    warnings:records.filter(r=>r.warnings.length).length,
    overdue:records.filter(r=>r.status==="PENDING" && r.startMs!==null && r.startMs<Date.now()-6*60*60_000).length
  },
  records
 };
}
if(process.argv[1]?.endsWith("/publish.mjs")){
  const state=JSON.parse(await fs.readFile(STATE_FILE,"utf8"));
  const result=publishProjection(state);
  await fs.writeFile("automation-state/public-history.json",JSON.stringify(result,null,2)+"\n","utf8");
  console.log("Public dashboard projection",result.counts);
}
