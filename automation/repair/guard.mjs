import fs from "node:fs/promises";
export const SETTLEMENT_PATH="WisetotoAnalyzer-LiveFree/src/app/page.tsx";
// Restrict an AI-generated change to the *existing settlement* code, not to model math.
const SAFE_SECTIONS=[
  ["function settleBetmanHomeHandicap(","function betmanHandicapRuleText("],
  ["function validateBacktestMarket(","function "],
  ["function trackerMarketPickSnapshots(","function "]
];
const forbidden=/\b(?:lambda|poisson|soccerContinuousTopTier|frozen|marketPrior|expectedHomeScore|expectedAwayScore|fetch|import|eval|localStorage|process|require|globalThis)\b/i;
export function applySafePatch(original,proposal){
  if(!proposal||proposal.action!=="PATCH")return {ok:false,reason:"NO_PATCH"};
  if(proposal.path!==SETTLEMENT_PATH)return {ok:false,reason:"NOT_ALLOWLISTED"};
  const search=proposal.search,replace=proposal.replace;
  if(typeof search!=="string"||typeof replace!=="string"||
    search.length<35||search.length>1100||replace.length<25||replace.length>1500)
    return {ok:false,reason:"PATCH_SIZE"};
  if(forbidden.test(search)||forbidden.test(replace))
    return {ok:false,reason:"PROTECTED_MODEL_OR_IO"};
  const pos=original.indexOf(search);
  if(pos<0||original.indexOf(search,pos+1)>=0)return {ok:false,reason:"NOT_EXACT_SINGLE_MATCH"};
  const before=original.slice(0,pos);
  const line=before.split("\n").length;
  // Require the proposed hunk to overlap a known *settlement-only* function.
  const area=original.slice(Math.max(0,pos-9000),Math.min(original.length,pos+9000));
  if(!/settleBetmanHomeHandicap|validateBacktestMarket|validateBacktest|settledMarketResults|settleMarket/i.test(area))
    return {ok:false,reason:"NOT_SETTLEMENT_CONTEXT"};
  if(Math.abs(replace.split("\n").length-search.split("\n").length)>12)
    return {ok:false,reason:"TOO_MANY_LINE_CHANGES"};
  if(/(?:<script|https?:\/\/|child_process|execSync|spawn\(|DELETE\s+FROM)/i.test(replace))
    return {ok:false,reason:"UNSAFE_CONTENT"};
  const changed=original.slice(0,pos)+replace+original.slice(pos+search.length);
  if(changed===original)return {ok:false,reason:"NO_CHANGE"};
  return {ok:true,content:changed,line,changedLines:Math.max(search.split("\n").length,replace.split("\n").length)};
}
export function settlementContext(source){
  const lines=source.split("\n");
  const indexes=[];
  for(let i=0;i<lines.length;i++)
    if(/function settleBetmanHomeHandicap\(|function validateBacktestMarket\(/.test(lines[i]))indexes.push(i);
  const sections=indexes.slice(0,3).map(i=>lines.slice(Math.max(0,i-5),i+85).map((s,j)=>String(i+j-4)+": "+s).join("\n"));
  return sections.join("\n\n---\n\n").slice(0,13000);
}
