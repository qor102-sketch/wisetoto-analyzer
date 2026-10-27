// Emit the 28-day review on schedule even if Betman is temporarily offline.
// Never edit outcomes or the frozen research candidate; this is projection only.
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {publicEvidence} from "./evidence.mjs";
import {buildPilotReport} from "./pilot-top1.mjs";
export async function writePilotReview({root="automation-state/",now=Date.now()}={}){
 let state;
 try{state=JSON.parse(await fs.readFile(root+"research-state.json","utf8"));}
 catch(e){if(e?.code==="ENOENT")return {status:"WAITING_FOR_FIRST_VALID_FEED"};throw e;}
 if(state.schema!=="wisetoto-market-evidence-v1"||!Array.isArray(state.fixtures))
   throw Error("PILOT_REVIEW_INVALID_RESEARCH_STATE");
 const report=buildPilotReport(state,now);
 if(report.status==="NOT_STARTED")return {status:"WAITING_FOR_FIRST_VALID_FEED"};
 const week=Math.min(4,Math.floor((now-report.startedAt)/(7*86400000)));
 const changed=week>Number(state.pilot?.lastReportedWeek??-1);
 // Publish the milestone even if feed is unavailable, preserving prior observations.
 if(changed){
   state={...state,pilot:{...state.pilot,lastReportedWeek:week}};
   await fs.writeFile(root+"research-state.json.next",JSON.stringify(state)+"\n");
   await fs.rename(root+"research-state.json.next",root+"research-state.json");
 }
 if(changed){
   await fs.writeFile(root+"research-public.json",
     JSON.stringify(publicEvidence(state,now))+"\n");
 }
 if(report.status==="FOUR_WEEK_REVIEW_READY"){
     const p=report;
     const line=metric=>metric.decisions+"경기 / 적중 "+metric.hits+
      " / 단위 수익 "+(metric.unitProfit??"—")+
      " / 평균 ROI "+(metric.unitROI===null?"미산정":(metric.unitROI*100).toFixed(1)+"%")+
      " / 시장확률 Brier "+(metric.marketBrier??"미산정");
     const out=[
      "# Wisetoto 28일 연구 TOP1 그림자 검증",
      "",
      "- 시작: "+new Date(p.startedAt).toISOString(),
      "- 종료 기준: "+new Date(p.endsAt).toISOString(),
      "- 실제 결과 반영 시점: "+new Date(now).toISOString(),
      "- 분석 등급: "+p.grade+" (공식 TOP1과 별개)",
      "- 관측: "+p.counts.listed+"건; 경기 전 잠금 후보: "+p.counts.pregameCandidates+
         "건; 결과 확인: "+p.counts.verified+"건; 검증 대기: "+p.counts.pendingFinal+"건",
      "- 전체 그림자 후보: "+line(p.all),
      "- 전략 A (이동 2%p 이상): "+line(p.strategies.baseShift2pct),
      "- 전략 B (이동 4%p 이상): "+line(p.strategies.strongShift4pct),
      "- 하루 1건 사전 선정 TOP1: "+line(p.shadowTop1),
      "- 시간순 OOS: "+p.walkForward.decisions+"건; 모델 Brier "+
         (p.walkForward.modelBrier??"미산정")+" vs 시장 "+
         (p.walkForward.marketBrier??"미산정")+"; 개선 입증: "+p.walkForward.improved,
      "",
      "## 종목별 연구 성과",
      ...Object.entries(p.bySport).map(([s,m])=>"- "+s+": "+line(m)),
      "",
      "## 4주 동안의 측정",
      ...p.weeks.map(w=>"- "+w.week+"주: 관측 "+w.observed+" / 사전 후보 "+w.frozen+
       " / 검증된 후보 "+w.metrics.decisions+" / 적중 "+w.metrics.hits),
      "",
      "## 다음 버전 수정 제안 (자동 적용 금지)",
      ...p.proposals.map(x=>"- "+x),
      "",
      "중요: 검증 표본 미달 또는 OOS 개선 실패 시 탐색적 분석이지 실전 적중/EV 보장이 아닙니다.",
      "미확정 경기는 PENDING. 기존 PRE/공식 TOP1 및 과거 시장 스냅샷 불변."
     ].join("\n")+"\n";
     await fs.writeFile(root+"pilot-top1-review.md",out);
     console.log("PILOT_4WEEK_REVIEW",JSON.stringify({
      verified:p.counts.verified,shadow:p.shadowTop1.decisions,grade:p.grade}));
   }
 return {status:report.status,week,changed,verified:report.counts.verified};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log("PILOT_CHECK",JSON.stringify(await writePilotReview()));
