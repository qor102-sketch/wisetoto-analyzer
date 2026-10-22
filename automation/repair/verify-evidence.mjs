// Run after extracting the ZIP: node VERIFY_EVIDENCE.mjs
// Reproduces a recorded full-time settlement contradiction, NOT its coding cause.
import fs from "node:fs";
const input=JSON.parse(fs.readFileSync(new URL("./CASES.json",import.meta.url),"utf8"));
let reproduced=0,unconfirmed=0;
for(const c of input.cases??[]){
 if(c.stage!=="SETTLEMENT_MISMATCH"||!Array.isArray(c.finalScore)){unconfirmed++;continue;}
 const [h,a]=c.finalScore,market=c.market||"";
 let answer=null;
 const handicap=/^H\s*([+-]\d+(?:\.\d+)?)$/i.exec(market);
 const total=/^U\/O\s*(\d+(?:\.\d+)?)$/i.exec(market);
 if(Number.isInteger(h)&&Number.isInteger(a)&&h>=0&&a>=0&&handicap){
  const diff=h-a+Number(handicap[1]);
  answer=diff>0?"핸디승":diff<0?"핸디패":"핸디무";
 }else if(Number.isInteger(h)&&Number.isInteger(a)&&h>=0&&a>=0&&total){
  const line=Number(total[1]);
  if(h+a!==line)answer=h+a>line?"오버":"언더";
 }
 const independent=answer===null?null:answer===c.pick?"HIT":"MISS";
 if(independent&&independent===c.independentStatus&&independent!==c.reportedStatus){
  reproduced++;console.log("SETTLEMENT DISCREPANCY",c.match,market,c.pick,
   "archived",c.reportedStatus,"independent",independent);
 }else{unconfirmed++;console.log("NOT CONFIRMED",c.match,c.stage);}
}
console.log(JSON.stringify({reproduced,unconfirmed,
 disclaimer:"Saved status mismatch independently confirmed; current source-code defect is not automatically established."}));
