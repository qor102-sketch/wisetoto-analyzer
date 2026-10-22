import assert from "node:assert/strict";
import test from "node:test";
import {applySafePatch,SETTLEMENT_PATH} from "./guard.mjs";
const original=[
  "function settleBetmanHomeHandicap(homeScore, awayScore, line) {",
  "  const sum = homeScore + line;",
  "  if (sum > awayScore) return 'home';",
  "  if (sum < awayScore) return 'away';",
  "  return 'draw';",
  "}",
  "function unrelated() { return 1; }"
].join("\n");
test("only an exact bounded existing settlement hunk may be edited",()=>{
 const search="  const sum = homeScore + line;\n  if (sum > awayScore) return 'home';";
 const patched=applySafePatch(original,{action:"PATCH",path:SETTLEMENT_PATH,
   search,replace:"  const sum = homeScore + line;\n  if (sum >= awayScore) return 'home';"});
 assert.equal(patched.ok,true);
 assert.ok(patched.content.includes("sum >= awayScore"));
 assert.equal(patched.content.includes("function unrelated()"),true);
});
test("decline modifications outside settlement and attempts at model tuning",()=>{
 const valid={action:"PATCH",path:SETTLEMENT_PATH,
   search:"  const sum = homeScore + line;\n  if (sum > awayScore) return 'home';",
   replace:"  const sum = homeScore + line;\n  if (sum >= awayScore) return 'home';"};
 assert.equal(applySafePatch(original,{...valid,path:"WisetotoAnalyzer-LiveFree/src/app/api/naver/lineup/route.ts"}).ok,false);
 assert.equal(applySafePatch(original,{...valid,replace:"  const lambda = 9;\n  if (sum >= awayScore) return 'home';"}).ok,false);
 assert.equal(applySafePatch(original,{...valid,search:"function unrelated() { return 1; }"}).ok,false);
 assert.equal(applySafePatch(original,{action:"NO_PATCH"}).ok,false);
});
test("ambiguous or missing source anchors must never get auto-patched",()=>{
 const proposal={action:"PATCH",path:SETTLEMENT_PATH,
  search:"  const sum = homeScore + line;\n  if (sum > awayScore) return 'home';",
  replace:"  const sum = homeScore + line;\n  if (sum >= awayScore) return 'home';"};
 assert.equal(applySafePatch(original+"\n"+proposal.search,proposal).ok,false);
 assert.equal(applySafePatch("const nothing = 1;",proposal).ok,false);
});
