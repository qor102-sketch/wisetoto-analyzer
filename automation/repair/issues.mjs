import fs from "node:fs/promises";
const report=JSON.parse(await fs.readFile("automation-state/repair-triage.json","utf8"));
const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;
const run=process.env.SOURCE_AUDIT_RUN||process.env.GITHUB_RUN_ID;
const url="https://github.com/"+repo+"/actions/runs/"+run;
if(!token||!repo)throw Error("GitHub credentials unavailable for issues");
const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
 "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"};
async function gh(path,init={}){
 const r=await fetch("https://api.github.com/repos/"+repo+path,{
   ...init,headers,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("GitHub issues API "+r.status);
 return r.json();
}
const existing=await gh("/issues?state=all&per_page=100");
let opened=0,skipped=0;
for(const alert of report.alerts.slice(0,10)){
 const marker="<!-- wisetoto-safe-repair:"+alert.key+" -->";
 if(existing.some(x=>String(x.body??"").includes(marker))){skipped++;continue;}
 const body=[
   marker,"## 자동 종료 경기 오류 검토","- 경기: "+alert.match,
   "- 검증 단계: "+alert.stage,"- 심각도: "+alert.severity,
   "- 재현 근거: "+alert.evidence,
   "- 원본 frozen PRE ID: "+(alert.id||"자료 없음"),
   "- 해당 자동 실행: "+url,
   "",
   "### 수정 정책",
   alert.autoPatchAllowed
    ? "독립적인 정산 모순을 재현했습니다. 제한된 코드 영역에서 자동 Draft PR을 시도하며 테스트·Preview 검증 후 사람의 승인을 받아야 합니다."
    : "정보가 불완전하거나 충분한 코드 증거가 없으므로 자동 패치하지 않습니다. 데이터 출처/리그/동일 경기 식별을 먼저 확인합니다.",
   "","경기 미적중 자체는 오류의 증거가 아닙니다. Frozen PRE, lambda/Poisson, TOP1을 소급 변경하지 않습니다."
 ].join("\n");
 await gh("/issues",{method:"POST",body:JSON.stringify({
  title:"[Wisetoto OOS] "+alert.stage+" · "+alert.key,
  body})});
 opened++;
}
console.log(JSON.stringify({alerts:report.alerts.length,issuesOpened:opened,deduplicated:skipped}));
