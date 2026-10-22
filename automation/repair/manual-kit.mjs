import fs from "node:fs/promises";
import path from "node:path";
const OUTPUT="automation-state/manual-fix-kit";
const REVIEW_WARNINGS=new Set(["PRE_FORM_MISSING","NEGATIVE_EV_GRADE_REVIEW"]);
const VALID_STAGES=new Set(["SETTLEMENT_MISMATCH","DATA_SOURCE","GRADE_GATE","PRE_TIME_INTEGRITY","RESULT_SOURCE"]);
const safe=x=>String(x??"").replace(/[\r\n\0]/g," ").slice(0,240);
export function affectedFiles(stage) {
 if(stage==="SETTLEMENT_MISMATCH")return ["WisetotoAnalyzer-LiveFree/src/app/page.tsx — settleBetmanHomeHandicap / validateBacktestMarket"];
 if(stage==="DATA_SOURCE"||stage==="PRE_FORM_MISSING")return ["WisetotoAnalyzer-LiveFree/src/app/api/naver/lineup/route.ts","WisetotoAnalyzer-LiveFree/src/app/page.tsx"];
 if(stage==="PRE_TIME_INTEGRITY")return ["WisetotoAnalyzer-LiveFree/src/app/page.tsx","automation/runner.mjs"];
 return ["WisetotoAnalyzer-LiveFree/src/app/page.tsx"];
}
export function selectManualCases(triage){
 const obs=new Map((triage.observations??[]).map(o=>[String(o.id),o])),out=[];
 for(const a of triage.alerts??[]){
  if(!VALID_STAGES.has(a.stage))continue;
  const o=obs.get(String(a.id));
  out.push({key:safe(a.key),id:safe(a.id||o?.id),stage:safe(a.stage),
   match:safe(a.match||o?.match),sport:safe(a.sport||o?.sport),
   evidence:safe(a.evidence),sourceChecked:false,autoPatchApproved:false,
   suggestedFiles:affectedFiles(a.stage),finalScore:Array.isArray(o?.actual)?o.actual:null,
   market:a.market?safe(a.market):null,pick:a.pick?safe(a.pick):null,
   reportedStatus:a.reportedStatus||null,independentStatus:a.independentStatus||null});
 }
 for(const o of triage.observations??[])for(const w of o.warnings??[]){
  if(!REVIEW_WARNINGS.has(w))continue;
  out.push({key:safe(o.id)+"-"+w,id:safe(o.id),stage:w,match:safe(o.match),
   sport:safe(o.sport),evidence:"Frozen PRE diagnostic: "+w,
   sourceChecked:false,autoPatchApproved:false,suggestedFiles:affectedFiles(w),
   finalScore:Array.isArray(o.actual)?o.actual:null,market:null,pick:null,
   reportedStatus:null,independentStatus:null});
 }
 return [...new Map(out.map(x=>[x.key,x])).values()];
}
export function koreanGuide(cases,runUrl){
 const lines=["# Wisetoto 무료 수동 수정 패키지","","## 원칙",
  "- 별도 유료 AI API나 자동 코드 생성이 필요하지 않습니다.",
  "- 이 자료는 수정 검토 증거입니다. 원인 확인 전 임의 코드 수정 금지.",
  "- Frozen PRE, Poisson/λ, TOP1, 예측확률/시각을 사후 변경하지 않습니다.",
  "- 미적중 자체는 버그가 아닙니다.",
  "","## 자동 검증 정보","- 원본 분석: "+runUrl,
  "- 검토 건수: "+cases.length,
  "- VERIFY_EVIDENCE.mjs는 일부 정산 사례를 재계산하지만 코드 원인까지 확인하지는 않습니다.",
  "","## 검토 사례"];
 cases.forEach((c,i)=>lines.push("### "+(i+1)+". "+c.match+" — "+c.stage,
  "- 진단 근거: "+c.evidence,"- 확인할 파일: "+c.suggestedFiles.join(", "),
  "- 팀·리그·날짜·원본 배당·최종 결과를 독립 검증하세요.",""));
 lines.push("## A. ChatGPT와 GitHub를 통해 수동 승인형 수정",
  "1. 이 ZIP을 다운로드하여 현재 ChatGPT 대화에 첨부하세요.",
  "2. COPY_TO_CHATGPT.md 내용을 메시지로 보내세요.",
  "3. 증거를 확인하고 브랜치/PR·테스트·Vercel Preview를 진행해 달라고 요청하세요.",
  "4. 결과를 직접 확인한 뒤에만 main 병합을 승인하세요.",
  "","## B. 직접 파일 수정",
  "1. GitHub에서 fix/manual-oos-review 브랜치를 만듭니다.",
  "2. CASES.json과 관련 소스 코드를 비교해 원인을 재현합니다.",
  "3. 최소 수정 및 회귀 테스트 후 저장소 루트에서 아래 명령을 실행합니다.",
  "   node --test automation/*.test.mjs automation/repair/*.test.mjs",
  "4. WisetotoAnalyzer-LiveFree 디렉터리에서 npm install 후 npm run build 를 실행합니다.",
  "5. 수정 브랜치로 PR → Vercel Preview 검증 → 본인 승인 후 병합합니다.",
  "","기존 PRE를 결과에 맞춰 소급 재계산하거나 추측한 데이터로 채우지 마세요.","");
 return lines.join("\n");
}
export function chatPrompt(cases,runUrl){
 return ["# ChatGPT에 전달할 무료 수정 요청",
  "연결된 GitHub 저장소 qor102-sketch/wisetoto-analyzer의 사후 검증 문제를 분석해줘.",
  "출처: "+runUrl,
  "첨부된 CASES.json, README_KO.md, VERIFY_EVIDENCE.mjs를 먼저 확인해줘.",
  "경기 identity/리그/원본 마켓/최종 스코어를 독립 검증하고 원인이 확정된 경우에만 최소 수정 브랜치 및 PR을 만들어줘.",
  "단위 테스트와 Vercel Preview API까지 검증하고 결과를 보고해줘.",
  "Frozen PRE/λ/Poisson/TOP1/확률/시각은 변경하지 마.",
  "main Production 병합은 반드시 내가 승인한 뒤 실행해줘.",
  "근거 부족 시 추측 수정하지 말고 필요한 검증 자료를 알려줘.",
  "검토 목록:",...cases.map(c=>"- "+c.stage+" · "+c.match+" · "+c.evidence),""].join("\n");
}
if(process.argv[1]?.endsWith("/manual-kit.mjs")){
 const triage=JSON.parse(await fs.readFile("automation-state/repair-triage.json","utf8"));
 const cases=selectManualCases(triage);
 const runId=String(process.env.SOURCE_AUDIT_RUN||process.env.GITHUB_RUN_ID||"0").replace(/[^0-9]/g,"");
 const runUrl="https://github.com/qor102-sketch/wisetoto-analyzer/actions/runs/"+runId;
 await fs.mkdir(OUTPUT,{recursive:true});
 if(cases.length){
  const verifier=await fs.readFile(new URL("./verify-evidence.mjs",import.meta.url),"utf8");
  await fs.writeFile(path.join(OUTPUT,"CASES.json"),JSON.stringify({schema:"wisetoto-free-kit-v1",sourceRun:runUrl,cases},null,2)+"\n");
  await fs.writeFile(path.join(OUTPUT,"README_KO.md"),koreanGuide(cases,runUrl)+"\n");
  await fs.writeFile(path.join(OUTPUT,"COPY_TO_CHATGPT.md"),chatPrompt(cases,runUrl)+"\n");
  await fs.writeFile(path.join(OUTPUT,"VERIFY_EVIDENCE.mjs"),verifier);
 }
 const status={caseCount:cases.length,kitCreated:cases.length>0,paidAiUsed:false,changesApplied:false};
 await fs.writeFile("automation-state/manual-kit-status.json",JSON.stringify(status,null,2)+"\n");
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,
  "has_cases="+String(cases.length>0)+"\ncase_count="+cases.length+"\n");
 console.log("FREE REPAIR KIT",JSON.stringify(status));
}
