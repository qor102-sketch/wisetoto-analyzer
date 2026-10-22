import fs from "node:fs/promises";
const triage=JSON.parse(await fs.readFile("automation-state/repair-triage.json","utf8"));
const observations=triage.observations.slice(0,20);
let source="DETERMINISTIC",analysis=[];
for(const r of observations){
 const notes=[];
 if(r.top1Status==="MISS")notes.push("TOP1 mispredicted; this alone is expected model variance, not a bug.");
 if(r.warnings.includes("PRE_FORM_MISSING"))notes.push("Historical recent Form coverage was incomplete in the original PRE; investigate independently verified league-only completed fixtures.");
 if(r.warnings.includes("PRE_TIME_INTEGRITY"))notes.push("PRE capture timestamp violates prekickoff lock requirement.");
 if(typeof r.meanAbsoluteScoreError==="number")notes.push("Frozen expected-versus-actual mean absolute score error "+r.meanAbsoluteScoreError+". This cannot establish causality.");
 if(!notes.length)notes.push("No reproducible source or settlement defect established.");
 analysis.push({id:r.id,game:r.match,classification:r.warnings.includes("PRE_TIME_INTEGRITY")?"DATA_INTEGRITY_REVIEW":
   r.warnings.includes("PRE_FORM_MISSING")?"DATA_COVERAGE_REVIEW":"NO_CONFIRMED_BUG",
   evidence:notes,requiresHumanReview:r.warnings.length>0});
}
if(observations.length&&process.env.OPENAI_API_KEY){
 try{
  const res=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,
     Accept:"application/json","Content-Type":"application/json"},
   body:JSON.stringify({model:"gpt-4.1-mini",temperature:0,max_tokens:1800,
    messages:[{role:"system",content:"Audit postmatch sports forecasts conservatively. You receive frozen prekickoff snapshots and final scores. Do not invent data, team history, causes, statistics, or guaranteed predictions. A missed TOP1 is not a defect. Mark observed data coverage, timestamp and settlement issues, distinguish hypotheses from verified bugs. No parameter tuning based on past outcomes. Answer in Korean concisely in plain text, one paragraph per game."},
      {role:"user",content:JSON.stringify({verifiedFixtures:observations,
        independentlyReproducedAlerts:triage.alerts})}]}),
   signal:AbortSignal.timeout(45000)
  });
  if(!res.ok)throw Error("AI HTTP "+res.status);
  const j=await res.json();
  const text=String(j.choices?.[0]?.message?.content??"").slice(0,12000).trim();
  if(text){
    source="GITHUB_MODELS";
    await fs.writeFile("automation-state/repair-ai-analysis.md",
     "# 종료 경기 사후 원인 분석 (AI 보조 · 미확정 가설 구분)\n\n"+text+
     "\n\n검증 가능한 코드 오류만 PR로 제안합니다. 원본 PRE/λ/TOP1은 유지합니다.\n");
  }
 }catch(e){console.warn("AI postmatch analysis unavailable; deterministic analysis retained",String(e).slice(0,150));}
}
if(source==="DETERMINISTIC"){
 const lines=["# 종료 경기 사후 원인 분석 · 규칙 기반",
  "OpenAI API 키가 미설정이거나 AI 호출을 완료할 수 없어 검증 가능한 규칙 진단만 표시합니다."];
 for(const item of analysis)lines.push("## "+item.game,
   "- 분류: "+item.classification,...item.evidence.map(x=>"- "+x));
 await fs.writeFile("automation-state/repair-ai-analysis.md",lines.join("\n")+"\n");
}
await fs.writeFile("automation-state/repair-analysis.json",JSON.stringify({schema:"oos-safe-review-v1",source,
 analysed:analysis,modelTuned:false,mainMerged:false},null,2));
console.log("Postmatch diagnosis",JSON.stringify({source,analysed:analysis.length}));
