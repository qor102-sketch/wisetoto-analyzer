// Node-only collector; an Actions timeout in Chromium cannot block this lane.
import fs from "node:fs/promises";
import {FEED_PATH,cachedFeed} from "../feed.mjs";
import {STATE_FILE,getRecords} from "../logic.mjs";
import {ingestEvidence,publicEvidence,SCHEMA} from "./evidence.mjs";
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
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
 try{state=JSON.parse(await fs.readFile(ROOT+"research-state.json","utf8"))}
 catch(e){if(e?.code==="ENOENT")state={schema:SCHEMA,fixtures:[]};else throw e;}
 if(state.schema!==SCHEMA)throw Error("Research state schema mismatch: refuse to overwrite archive");
 let tracker;
 try{tracker=JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{tracker={localStorage:{}}}
 let collected=[];
 try{
   const ledger=JSON.parse(await fs.readFile(ROOT+"collect-first-state.json","utf8"));
   if(ledger.schema!=="wisetoto-collect-first-v1"||!Array.isArray(ledger.records))
     throw Error("collection schema incompatible");
   collected=ledger.records.filter(r=>r.verdict==="VERIFIED"&&r.final&&
     Number.isFinite(r.pregameCapturedAt)&&r.pregameCapturedAt<r.startMs&&
     r.verifiedAt>r.startMs&&r.verifiedAt<=now&&
     scorePlausibility(r.sport,r.final.homeScore,r.final.awayScore).ok)
     .map(r=>({sport:r.sport,league:r.league,home:r.home,away:r.away,
       startMs:r.startMs,capturedAt:r.pregameCapturedAt,verifiedAt:r.verifiedAt,
       verificationStatus:"VERIFIED",
       result:{homeScore:r.final.homeScore,awayScore:r.final.awayScore,
         source:"COLLECT_FIRST_"+String(r.resultSource??"UNKNOWN")}}));
 }catch(e){if(e?.code!=="ENOENT")throw e;}
 const verifiedRecords=[...getRecords(tracker),...collected];
 const result=ingestEvidence(state,feed,now,verifiedRecords,observedAt);
 console.log("RESEARCH_CONFIRMED_INPUT",JSON.stringify({tracker:getRecords(tracker).length,
   collectFirst:collected.length,excludedResultOnly:true}));
 if(result.stats.captured>0||result.stats.settled>0||result.stats.pilotMilestone){
   await fs.writeFile(ROOT+"research-state.json",JSON.stringify(result.state)+"\n","utf8");
   await fs.writeFile(ROOT+"research-public.json",JSON.stringify(publicEvidence(result.state,now))+"\n","utf8");
   console.log("MARKET_EVIDENCE_SAVED "+JSON.stringify(result.stats));
 }else console.log("MARKET_EVIDENCE_UNCHANGED "+JSON.stringify(result.stats));
}
