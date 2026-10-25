// Node-only collector; an Actions timeout in Chromium cannot block this lane.
import fs from "node:fs/promises";
import {FEED_PATH,cachedFeed} from "../feed.mjs";
import {STATE_FILE,getRecords} from "../logic.mjs";
import {ingestEvidence,publicEvidence,SCHEMA} from "./evidence.mjs";
const ROOT="automation-state/";
const now=Date.now();
let feed,observedAt;
try{
 const cached=JSON.parse(await fs.readFile(FEED_PATH,"utf8"));
 feed=cachedFeed(cached,now);
 observedAt=cached.fetchedAt;
 if(!feed)throw Error("verified feed missing or stale");
}catch(e){console.error("MARKET_EVIDENCE_SKIPPED: "+String(e));}
if(feed){
 let state;
 try{state=JSON.parse(await fs.readFile(ROOT+"research-state.json","utf8"))}catch{state={schema:SCHEMA,fixtures:[]}}
 if(state.schema!==SCHEMA)throw Error("Research state schema mismatch: refuse to overwrite archive");
 let tracker;
 try{tracker=JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{tracker={localStorage:{}}}
 const result=ingestEvidence(state,feed,now,getRecords(tracker),observedAt);
 if(result.stats.captured>0||result.stats.settled>0){
   await fs.writeFile(ROOT+"research-state.json",JSON.stringify(result.state)+"\n","utf8");
   await fs.writeFile(ROOT+"research-public.json",JSON.stringify(publicEvidence(result.state,now))+"\n","utf8");
   console.log("MARKET_EVIDENCE_SAVED "+JSON.stringify(result.stats));
 }else console.log("MARKET_EVIDENCE_UNCHANGED "+JSON.stringify(result.stats));
}
