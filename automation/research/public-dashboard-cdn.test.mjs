import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PUBLIC_FEEDS,loadPublicProjection} from
 "../../WisetotoAnalyzer-LiveFree/src/app/automation/public-data-client.mjs";
const config=JSON.parse(await fs.readFile(new URL("../../WisetotoAnalyzer-LiveFree/vercel.json",import.meta.url),"utf8"));
const dashboard=await fs.readFile(new URL("../../WisetotoAnalyzer-LiveFree/src/app/automation/page.tsx",import.meta.url),"utf8");
const fake=(payload,status=200)=>({ok:status>=200&&status<300,status,
 json:async()=>payload});
const doc=(name)=>name==="health"?{schema:PUBLIC_FEEDS[name].schema,scannedAt:"2026-11-14T10:00:00Z",sourceOk:true}:
 {schema:PUBLIC_FEEDS[name].schema,records:[]};
test("four explicit public-only edge rewrites never proxy raw/secret or mutable state",()=>{
 const expected=["automation-history.json","automation-health.json",
  "collect-first-public.json","research-public.json"];
 assert.equal(config.framework,"nextjs");
 assert.equal(config.git.deploymentEnabled["automation-data"],false);
 assert.equal(config.rewrites.length,4);
 assert.deepEqual(config.rewrites.map(x=>x.source.split("/").at(-1)).sort(),expected.sort());
 assert.equal(new Set(config.rewrites.map(x=>x.source)).size,4);
 for(const rewrite of config.rewrites){
  assert.match(rewrite.source,/^\/public-data\/[a-z-]+\.json$/);
  assert.match(rewrite.destination,/^https:\/\/raw\.githubusercontent\.com\/qor102-sketch\/wisetoto-analyzer\/automation-data\/[a-z-]+\.json$/);
  assert.ok(!/private|state|credential|secret|odds|api-key/i.test(rewrite.destination));
 }
 const hd=config.headers.find(x=>x.source==="/public-data/:path*");
 assert.ok(hd);
 const map=Object.fromEntries(hd.headers.map(x=>[x.key.toLowerCase(),x.value]));
 assert.equal(map["x-vercel-enable-rewrite-caching"],"1");
 assert.match(map["vercel-cdn-cache-control"],/max-age=90/);
 assert.match(map["cache-control"],/max-age=45/);
});
test("browser reads valid sanitized public data directly from CDN, zero Next function invocations",async()=>{
 for(const name of Object.keys(PUBLIC_FEEDS)){
  const paths=[];
  const payload=doc(name);
  const r=await loadPublicProjection(name,{fetchFn:async(path,opts)=>{
   paths.push(path);
   assert.equal(opts.cache,"default");
   assert.equal(opts.headers.Accept,"application/json");
   return fake(payload);
  }});
  assert.equal(r.transport,"cdn");
  assert.deepEqual(r.data,payload);
  assert.deepEqual(paths,[PUBLIC_FEEDS[name].path]);
 }
});
test("on edge error fallback only to original public read-only endpoint with preserved schema",async()=>{
 for(const name of ["history","collection","research"]){
  const paths=[],payload=doc(name);
  const r=await loadPublicProjection(name,{fetchFn:async path=>{
   paths.push(path);return path.startsWith("/public-data/")?fake({},502):
    fake({ok:true,data:payload});
  }});
  assert.equal(r.transport,"legacy");
  assert.deepEqual(r.data,payload);
  assert.deepEqual(paths,[PUBLIC_FEEDS[name].path,PUBLIC_FEEDS[name].legacy]);
 }
});
test("health source outage never invokes a server function or fabricates healthy status",async()=>{
 const calls=[];
 await assert.rejects(()=>loadPublicProjection("health",{fetchFn:async p=>{
  calls.push(p);return fake({},503);}}),/CDN 조회 실패/);
 assert.deepEqual(calls,[PUBLIC_FEEDS.health.path]);
});
test("invalid payloads, overlong result lists, unknown feed, fallback failure fail closed",async()=>{
 for(const name of ["history","collection","research","health"]){
  const paths=[];
  const invalid=await loadPublicProjection(name,{fetchFn:async p=>{
   paths.push(p);
   return p.startsWith("/api/")?fake({ok:true,data:doc(name)}):
    fake({...doc(name),schema:"untrusted"});
  }}).catch(e=>e);
  if(name==="health"){
   assert.ok(invalid instanceof Error);
   assert.equal(paths.length,1);
  }else{
   assert.equal(invalid.transport,"legacy");
   assert.equal(paths.length,2);
  }
 }
 for(const name of ["history","research"]){
  const many=Array.from({length:PUBLIC_FEEDS[name].maxRecords+1},()=>({}));
  await assert.rejects(()=>loadPublicProjection(name,{fetchFn:async p=>
   p.startsWith("/api/")?fake({ok:true,data:{...doc(name),records:many}}):
    fake({...doc(name),records:many})
  }),/기록 개수 또는 형식 오류/);
 }
 await assert.rejects(()=>loadPublicProjection("raw-state",{
  fetchFn:async()=>{throw Error("should never run");}
 }),/허용되지 않은/);
 await assert.rejects(()=>loadPublicProjection("history",{fetchFn:async p=>
  p.startsWith("/api/")?fake({ok:false,error:"upstream"}):fake({},502)
 }),/대체 조회 실패/);
});
test("automatic dashboard moved off all 3 function routes; immutable PRE/TOP1 untouched",()=>{
 assert.match(dashboard,/loadPublicProjection<History>\("history"\)/);
 assert.match(dashboard,/loadPublicProjection<ScanHealth>\("health"\)/);
 assert.match(dashboard,/loadPublicProjection<CollectedLedger>\("collection"\)/);
 assert.match(dashboard,/loadPublicProjection<ResearchEvidence>\("research"\)/);
 assert.doesNotMatch(dashboard,/fetch\("\/api\/automation\/(results|collection|research)"/);
 assert.match(dashboard,/기존 λ·확률·TOP1을 변경하지 않습니다/);
});
