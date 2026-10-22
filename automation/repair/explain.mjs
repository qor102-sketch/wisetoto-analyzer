import fs from "node:fs/promises";
const triage=JSON.parse(await fs.readFile("automation-state/repair-triage.json","utf8"));
const observations=(triage.observations??[]).slice(0,30);
const lines=["# 종료 경기 무료 자동 원인분석 (규칙 기반)",
  "AI API 호출 없음 · 모델 재학습 없음 · 데이터 확실성 분리",
  "","미적중 단독으로는 버그를 단정하지 않습니다. frozen PRE는 절대 수정하지 않습니다.",""];
const analysis=[];
for(const r of observations){
 const notes=[];
 if(r.top1Status==="MISS")notes.push("TOP1 미적중: 예측 불확실성에 포함되며 단독 수정 근거가 아님");
 if(r.warnings.includes("PRE_FORM_MISSING"))notes.push("당시 실제 최근 Form 표본 부족: 과거 원본 소스/대상 리그/동일팀을 조사해야 함");
 if(r.warnings.includes("PRE_TIME_INTEGRITY"))notes.push("PRE 잠금 시각이 킥오프 이상: 무결성 점검 필요");
 if(r.warnings.includes("NEGATIVE_EV_GRADE_REVIEW"))notes.push("등급/EV 규칙 검토 필요: 마켓/배당/당시 정책 재확인");
 if(typeof r.meanAbsoluteScoreError==="number")
   notes.push("고정 PRE와 실제 점수의 평균 절대오차 "+r.meanAbsoluteScoreError+" (원인 증명 아님)");
 if(!notes.length)notes.push("재현 가능한 오류가 확인되지 않음");
 const code=r.warnings.includes("PRE_TIME_INTEGRITY")?"DATA_INTEGRITY_REVIEW":
  r.warnings.includes("PRE_FORM_MISSING")?"DATA_COVERAGE_REVIEW":
  r.warnings.includes("NEGATIVE_EV_GRADE_REVIEW")?"GRADE_GATE_REVIEW":"NO_CONFIRMED_BUG";
 analysis.push({id:r.id,game:r.match,classification:code,evidence:notes,requiresHumanReview:r.warnings.length>0});
 lines.push("## "+r.match,"- 분류: "+code,...notes.map(x=>"- "+x),"");
}
lines.push("## 독립 검증 이상 신호",
  ...(triage.alerts??[]).map(a=>"- ["+a.stage+"] "+a.match+": "+a.evidence),
  ...(triage.alerts?.length?[]:["- 별도 정산/데이터 무결성 오류 없음"]),
  "","검증이 필요한 경기에는 무료 수동 수정 키트가 별도로 생성됩니다.");
await fs.writeFile("automation-state/repair-ai-analysis.md",lines.join("\n")+"\n");
await fs.writeFile("automation-state/repair-analysis.json",JSON.stringify({
 schema:"wisetoto-no-paid-ai-oos-v1",source:"FREE_DETERMINISTIC",
 analysed:analysis,modelTuned:false,mainMerged:false,paidAiCalls:0
},null,2)+"\n");
console.log("FREE POSTMATCH ANALYSIS",JSON.stringify({observations:analysis.length,alerts:triage.alerts?.length??0}));
