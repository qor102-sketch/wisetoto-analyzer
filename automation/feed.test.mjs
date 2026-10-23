import test from "node:test";import assert from "node:assert/strict";
import {validFeed,cachedFeed,liveFeed,FEED_MAX_AGE_MS} from "./feed.mjs";
const payload={ok:true,games:[{sport:"basketball",home:"A",away:"B",gameDateMs:123,markets:[]}]};
test("only fresh validated Betman payload may be reused",()=>{
 const now=1_700_000_000_000;
 assert.equal(cachedFeed({fetchedAt:now-1000,payload},now),payload);
 assert.equal(cachedFeed({fetchedAt:now-FEED_MAX_AGE_MS-1,payload},now),null);
 assert.equal(cachedFeed({fetchedAt:now+1,payload},now),null);
 assert.equal(validFeed({ok:true,games:[]}),false);
 assert.equal(validFeed({ok:false,games:payload.games}),false);
});
test("transient 502 recovers with bounded retry and no fabricated fixtures",async()=>{
 let tries=0;
 const result=await liveFeed("https://example.test",{fetchFn:async()=>{
  tries++;return tries<3?{ok:false,status:502}:{ok:true,json:async()=>payload};
 },sleep:async()=>{},now:()=>1000});
 assert.equal(result.attempt,3);assert.equal(result.payload,payload);assert.equal(tries,3);
});
test("three upstream failures must fail visibly",async()=>{
 await assert.rejects(liveFeed("https://example.test",{fetchFn:async()=>({ok:false,status:502}),sleep:async()=>{}}),/unavailable after 3 attempts/);
});
