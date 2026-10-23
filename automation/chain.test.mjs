import test from "node:test";import assert from "node:assert/strict";
import {shouldDispatch,INTERVAL_MS} from "./chain.mjs";
const current={run_number:20,head_branch:"main",event:"schedule",status:"completed"};
test("last main run can queue next scan",()=>{
 assert.equal(INTERVAL_MS,600000);
 assert.equal(shouldDispatch(current,[current,{run_number:21,head_branch:"main",event:"pull_request",status:"completed"}]),true);
});
test("newer scheduled/manual/push run owns next heartbeat (no fanout)",()=>{
 for(const event of ["schedule","workflow_dispatch","push"]){
  assert.equal(shouldDispatch(current,[{...current,run_number:21,event,status:"queued"}]),false);
 }
});
test("cancelled and branch-only runs do not suppress recovery",()=>{
 assert.equal(shouldDispatch(current,[{...current,run_number:21,event:"schedule",status:"cancelled",conclusion:"cancelled"}]),true);
 assert.equal(shouldDispatch(current,[{...current,run_number:21,event:"push",head_branch:"other",status:"completed"}]),true);
});
