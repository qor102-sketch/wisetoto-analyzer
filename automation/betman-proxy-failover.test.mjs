import test from "node:test";import assert from "node:assert/strict";
import {betmanProxyEndpoints,requestBetmanFromProxies} from "../WisetotoAnalyzer-LiveFree/src/lib/betman-proxy-failover.mjs";
const payload={ok:true,data:{compSchedules:{keys:["matchSeq"],datas:[[1]]}}};
test("exact configured primary and fallback, rejects HTTP and embedded credentials",()=>{
 assert.deepEqual(betmanProxyEndpoints({
 BETMAN_PROXY_URL:"https://relay1.example/betman",
 BETMAN_PROXY_FALLBACK_URL:"https://relay2.example/betman"
 }),["https://relay1.example/betman","https://relay2.example/betman"]);
 assert.equal(betmanProxyEndpoints({BETMAN_PROXY_URL:"http://relay.example/betman",BETMAN_PROXY_FALLBACK_URL:"https://u:p@relay.example/x"}).length,0);
});
test("HTTP 502 empty body immediately falls back to a distinct honest Betman relay",async()=>{
 const seen=[];
 const out=await requestBetmanFromProxies(["https://down.example/betman","https://up.example/betman"],{
 fetchFn:async url=>{
  seen.push(url);
  return url.includes("down")?{ok:false,status:502}:{
   ok:true,status:200,json:async()=>payload};
 },gmTs:127,gmId:"G101"});
 assert.equal(out.data,payload.data);
 assert.equal(out.relayIndex,1);
 assert.equal(seen.length,2);
 assert.ok(seen[1].includes("gmTs=127"));
});
test("single 502 is a truthful failed relay and never a reusable Betman snapshot",async()=>{
 await assert.rejects(requestBetmanFromProxies(["https://unavailable.example/betman"],{
  fetchFn:async()=>({ok:false,status:502})
 }),err=>err.code==="HTTP_502" && /relay1:HTTP_502/.test(err.message));
});
test("malformed JSON, empty offers and 200 fake data cannot succeed",async()=>{
 await assert.rejects(requestBetmanFromProxies(["https://up.example/betman"],{
  fetchFn:async()=>({ok:true,status:200,json:async()=>({ok:true})})
 }),err=>err.code==="INVALID_BETMAN_PAYLOAD");
 await assert.rejects(requestBetmanFromProxies(["https://up.example/betman"],{
  fetchFn:async()=>({ok:true,status:200,json:async()=>{throw Error("bad")}})
 }),err=>err.code==="NON_JSON");
});
test("no backup cannot magically recover dead upstream; no secrets/URL exposure in errors",async()=>{
 await assert.rejects(requestBetmanFromProxies(["https://relay.example/betman?token=secret"],{
  fetchFn:async()=>{throw Error("SENSITIVE_TOKEN");}
 }),err=>err.code==="NETWORK_ERROR"&&!err.message.includes("secret")&&!err.message.includes("SENSITIVE_TOKEN"));
});
