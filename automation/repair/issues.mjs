import fs from "node:fs/promises";
const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;
const sourceRun=String(process.env.SOURCE_AUDIT_RUN||"").replace(/[^0-9]/g,"");
const currentRun=String(process.env.GITHUB_RUN_ID||"").replace(/[^0-9]/g,"");
if(!token||!repo)throw Error("GitHub repository/token unavailable");
const cases=JSON.parse(await fs.readFile("automation-state/manual-fix-kit/CASES.json","utf8")).cases;
const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
 "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"};
async function gh(path,init={}){
 const r=await fetch("https://api.github.com/repos/"+repo+path,{
  ...init,headers,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("GitHub issues HTTP "+r.status);
 return r.json();
}
const existing=await gh("/issues?state=all&per_page=100");
let opened=0,skipped=0;
for(const c of cases.slice(0,15)){
 const marker="<!-- wisetoto-free-repair:"+c.key+" -->";
 if(existing.some(x=>String(x.body??"").includes(marker))){skipped++;continue;}
 const body=[
  marker,"## 무료 자동 사후검증 — 수동 수정 자료 준비됨","",
  "- 경기: "+c.match,"- 단계: "+c.stage,
  "- 근거: "+c.evidence,"- 원본 PRE ID: "+c.id,
  "- 자동분석 원본: https://github.com/"+repo+"/actions/runs/"+sourceRun,
  "",
  "### 수정 패키지 내려받기",
  "1. https://github.com/"+repo+"/actions/runs/"+currentRun+"#artifacts 에서 wisetoto-manual-fix-kit ZIP 다운로드",
  "2. ZIP 안의 README_KO.md, CASES.json, VERIFY_EVIDENCE.mjs 확인",
  "3. COPY_TO_CHATGPT.md를 복사해 ChatGPT 대화에 올리거나 ZIP을 첨부하세요.",
  "4. 제가 GitHub 코드·증거를 검증해 필요한 최소 수정 PR과 Preview 검증을 돕도록 요청하세요.",
  "",
  "### 확인할 코드","- "+(c.suggestedFiles??[]).join("\n- "),
  "",
  "**원인 확인 전 코드 변경 금지.** Frozen PRE·λ·Poisson·TOP1을 결과에 맞춰 수정하지 않습니다.",
  "PR과 Production 병합은 반드시 사용자 승인 후 진행합니다.",
  "OpenAI API 키 또는 별도 유료 AI 구독이 필요하지 않습니다."
 ].join("\n");
 await gh("/issues",{method:"POST",body:JSON.stringify({
  title:"[Wisetoto 무료 수정] "+c.stage+" · "+c.key,body})});
 opened++;
}
console.log(JSON.stringify({manualCases:cases.length,opened,duplicateSkipped:skipped,
 kitRunUrl:"https://github.com/"+repo+"/actions/runs/"+currentRun}));
