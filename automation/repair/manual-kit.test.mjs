import test from "node:test";
import assert from "node:assert/strict";
import {selectManualCases,koreanGuide,chatPrompt} from "./manual-kit.mjs";
test("ordinary misses never trigger a kit or code modification",()=>{
 const triage={alerts:[],observations:[{id:"g",match:"A vs B",sport:"축구",top1Status:"MISS",warnings:[]}]};
 assert.deepEqual(selectManualCases(triage),[]);
});
test("confirmed settlement discrepancy has actual score and independently reported status",()=>{
 const triage={alerts:[{id:"g",key:"abc",stage:"SETTLEMENT_MISMATCH",match:"A vs B",
  sport:"축구",market:"H -1",pick:"핸디패",reportedStatus:"HIT",independentStatus:"MISS",
  evidence:"Final 2:1"}],observations:[{id:"g",match:"A vs B",sport:"축구",actual:[2,1],warnings:[]}]};
 const cases=selectManualCases(triage);
 assert.equal(cases.length,1);
 assert.deepEqual(cases[0].finalScore,[2,1]);
 assert.equal(cases[0].autoPatchApproved,false);
 assert.equal(cases[0].independentStatus,"MISS");
 assert.ok(koreanGuide(cases,"https://example.test").includes("Frozen PRE"));
 assert.ok(chatPrompt(cases,"https://example.test").includes("승인"));
});
test("data-source warnings create investigation package but no hypothetical code patch",()=>{
 const triage={alerts:[],observations:[{id:"g",sport:"축구",match:"A vs B",
   warnings:["PRE_FORM_MISSING"],actual:[0,0],top1Status:"MISS"}]};
 const cases=selectManualCases(triage);
 assert.equal(cases.length,1);
 assert.equal(cases[0].stage,"PRE_FORM_MISSING");
 assert.equal(cases[0].sourceChecked,false);
 assert.equal(cases[0].autoPatchApproved,false);
 assert.ok(cases[0].suggestedFiles.some(x=>x.endsWith("route.ts")));
});
test("deduplicate identical alert keys and never trust unsupported stages",()=>{
 const one={key:"abc",id:"x",match:"A vs B",stage:"RESULT_SOURCE",evidence:"missing"};
 const cases=selectManualCases({alerts:[one,one,{...one,key:"exploit",stage:"RUN_ARBITRARY_COMMANDS"}]});
 assert.equal(cases.length,1);
});
