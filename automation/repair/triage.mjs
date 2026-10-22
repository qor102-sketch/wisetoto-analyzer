import fs from "node:fs/promises";
import crypto from "node:crypto";
import { getRecords } from "../logic.mjs";

// OOS misses are NOT bugs. Propose repairs only for reproducible invariants.
const num=x=>typeof x==="number"&&Number.isFinite(x)?x:null;
const clean=x=>String(x??"").slice(0,160).replace(/[\r\n<>]/g," ");
const digest=(...xs)=>crypto.createHash("sha256").update(xs.join("|")).digest("hex").slice(0,12);

export function expectedSettlement(row,pick){
  const h=num(row?.result?.homeScore),a=num(row?.result?.awayScore);
  if(h===null||a===null||h<0||a<0||!Number.isInteger(h)||!Number.isInteger(a))return null;
  const market=String(pick?.market??"").trim(),choice=String(pick?.pick??"").trim();
  let correct=null;
  const line=/^H\s*([+-]\d+(?:\.\d+)?)$/i.exec(market);
  if(line&&/^(핸디승|핸디무|핸디패)$/.test(choice)){
    const diff=h-a+Number(line[1]);
    correct=diff>0?"핸디승":diff<0?"핸디패":"핸디무";
  }
  const total=/^U\/O\s*(\d+(?:\.\d+)?)$/i.exec(market);
  if(total&&/^(오버|언더|OVER|UNDER)$/i.test(choice)){
    const boundary=Number(total[1]);
    if(h+a===boundary)return null;
    correct=h+a>boundary?"오버":"언더";
    if(/^(OVER|UNDER)$/i.test(choice))correct=correct==="오버"?"OVER":"UNDER";
  }
  return correct===null?null:(correct===choice?"HIT":"MISS");
}
export function diagnose(audit,records){
  const fresh=new Set((audit?.verified||[]).map(x=>String(x.id)));
  const rows=records.filter(r=>fresh.has(String(r.id))&&r.verificationStatus==="VERIFIED");
  const alerts=[],observations=[];
  for(const row of rows){
    const match=clean(row.home)+" vs "+clean(row.away),id=clean(row.id),sport=clean(row.sport);
    const home=num(row.result?.homeScore),away=num(row.result?.awayScore);
    const capturedAt=num(row.capturedAt),startMs=num(row.startMs);
    const observation={id,match,sport,league:clean(row.league),startMs,capturedAt,
      actual:home!==null&&away!==null?[home,away]:null,
      top1Status:String(row.picks?.[0]?.resultStatus??"UNSET"),
      top1Probability:num(row.picks?.[0]?.probability),warnings:[]};
    if(startMs!==null&&capturedAt!==null&&capturedAt>=startMs){
      observation.warnings.push("PRE_TIME_INTEGRITY");
      alerts.push({key:digest(id,"PRE_TIME_INTEGRITY"),stage:"PRE_TIME_INTEGRITY",match,id,
        severity:"HIGH",evidence:"Frozen PRE first captured at/after kickoff; never backdate.",autoPatchAllowed:false});
    }
    if(home===null||away===null||home<0||away<0){
      alerts.push({key:digest(id,"RESULT_SOURCE"),stage:"RESULT_SOURCE",match,id,
        severity:"HIGH",evidence:"VERIFIED result lacks a valid nonnegative final score.",autoPatchAllowed:false});
    }
    if(sport==="축구"&&row.footballPre){
      const h=num(row.footballPre.homeRecentSample),a=num(row.footballPre.awayRecentSample);
      if(h===0||a===0)observation.warnings.push("PRE_FORM_MISSING");
    }
    const forecast=sport==="축구"&&row.footballPre
      ?[num(row.footballPre.expectedHome),num(row.footballPre.expectedAway)]
      :sport==="농구"&&row.courtPre
      ?[num(row.courtPre.expectedHome),num(row.courtPre.expectedAway)]:null;
    if(forecast&&forecast.every(v=>v!==null)&&home!==null&&away!==null){
      observation.frozenForecast=forecast;
      observation.meanAbsoluteScoreError=Number(((Math.abs(home-forecast[0])+Math.abs(away-forecast[1]))/2).toFixed(3));
    }
    const picks=[...(Array.isArray(row.picks)?row.picks:[]),
      ...(Array.isArray(row.marketResults)?row.marketResults:[])],seen=new Set();
    for(const pick of picks){
      const key=String(pick.key??"")+"|"+String(pick.market??"")+"|"+String(pick.pick??"");
      if(seen.has(key))continue;seen.add(key);
      const actualStatus=String(pick.resultStatus??"");
      if(actualStatus!=="HIT"&&actualStatus!=="MISS")continue;
      const independently=expectedSettlement(row,pick);
      if(independently!==null&&independently!==actualStatus){
        alerts.push({key:digest(id,key,"SETTLEMENT_MISMATCH"),stage:"SETTLEMENT_MISMATCH",
          severity:"HIGH",match,id,sport,market:clean(pick.market),pick:clean(pick.pick),
          reportedStatus:actualStatus,independentStatus:independently,
          evidence:"Final "+home+":"+away+" and explicit full-time Betman line; independent settlement disagrees.",
          autoPatchAllowed:true});
      }
    }
    if(sport==="축구"&&row.picks?.some(p=>
      ["VALUE","STRONG VALUE","실전 추천","약추천"].includes(p.grade)&&num(p.expectedValue)!==null&&p.expectedValue<=0))
      observation.warnings.push("NEGATIVE_EV_GRADE_REVIEW");
    observations.push(observation);
  }
  for(const s of audit?.suspicious||[]){
    const stage=String(s.stage??"");
    if(!["DATA_SOURCE","GRADE_GATE"].includes(stage))continue;
    alerts.push({key:digest(s.game,stage,s.at),stage,match:clean(s.game),
      severity:"MEDIUM",evidence:clean(s.reason),autoPatchAllowed:false});
  }
  const uniq=[...new Map(alerts.map(x=>[x.key,x])).values()];
  return {schema:"wisetoto-repair-triage-v1",createdAt:new Date().toISOString(),
    verifiedCount:rows.length,misses:observations.filter(x=>x.top1Status==="MISS").length,
    alerts:uniq,observations,
    policy:"A missed pick alone never permits a patch. Never rewrite frozen PRE or model coefficients. Never auto-merge main."};
}
if(process.argv[1]?.endsWith("/triage.mjs")){
  const audit=JSON.parse(await fs.readFile("automation-state/audit.json","utf8"));
  const state=JSON.parse(await fs.readFile("automation-state/state.json","utf8"));
  const report=diagnose(audit,getRecords(state));
  await fs.writeFile("automation-state/repair-triage.json",JSON.stringify(report,null,2)+"\n");
  const lines=["# Wisetoto 종료 경기 자동 원인 진단",
    "- 신규 종료 검증: "+report.verifiedCount,
    "- TOP1 미적중: "+report.misses+" (이 자체는 버그가 아님)",
    "- 재현 가능한 이상 신호: "+report.alerts.length,
    ...report.alerts.map(a=>"- ["+a.stage+"] "+a.match+": "+a.evidence),
    "","결과 맞춤형 모델 튜닝 금지. 검증되지 않은 경우 코드 PR을 만들지 않습니다."];
  await fs.writeFile("automation-state/repair-triage.md",lines.join("\n")+"\n");
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,
    "has_alerts="+String(report.alerts.length>0)+"\n"+
    "has_repairable="+String(report.alerts.some(x=>x.autoPatchAllowed))+"\n");
  console.log(JSON.stringify({verified:report.verifiedCount,misses:report.misses,
    alerts:report.alerts.length,repairable:report.alerts.filter(x=>x.autoPatchAllowed).length}));
}
