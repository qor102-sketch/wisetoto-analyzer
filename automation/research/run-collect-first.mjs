// Light, browser-independent capture + results reconciliation. Never creates PRE picks.
import fs from "node:fs/promises";
import {loadFeed} from "../feed.mjs";
import {getRecords,STATE_FILE} from "../logic.mjs";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection,verifiedNaverFinal} from "./collect-first.mjs";
import {lookupVolleyballFinal} from "./volleyball-result.mjs";
import {collectLineupSnapshots} from "./pregame-lineup.mjs";
const dir="automation-state",file=dir+"/collect-first-state.json";
await fs.mkdir(dir,{recursive:true});
let state;
try{state=JSON.parse(await fs.readFile(file,"utf8"))}
catch(e){if(e?.code==="ENOENT")state={schema:SCHEMA,records:[]};else throw e;}
if(state.schema!==SCHEMA)throw Error("ledger schema incompatible: refuse data loss");
const now=Date.now();
let fresh=false;
try{
 const feed=await loadFeed(now);
 if(!feed)throw Error("Betman scan unavailable/stale");
 const wrapper=JSON.parse(await fs.readFile(dir+"/betman-feed.json","utf8"));
 const data=collect(state,feed,now,wrapper.fetchedAt);state=data.state;fresh=true;
 console.log("COLLECT_FIRST "+JSON.stringify(data.summary));
}catch(e){
 // Preserve the prior ledger; expose outage without claiming fresh coverage.
 state={...state,lastFeedOk:false,lastFeedError:String(e).slice(0,160)};
 console.error("COLLECT_FIRST_SOURCE_WAIT "+String(e));
}
let tracker={localStorage:{}};
try{tracker=JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{}
let verified=settlement(state,getRecords(tracker),now);state=verified.state;
console.log("COLLECT_FIRST_TRACKER_VERIFIED "+verified.settled);
const base=(process.env.WISETOTO_URL||"https://wisetoto-analyzer.vercel.app").replace(/\/+$/,"");
let sportsApiLimited=false;
const supportedNaver=new Set(["축구","농구","야구"]);
async function requestFinal(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(16000),cache:"no-store"});
 let payload;
 try{payload=await response.json()}catch{payload={ok:false,error:"MALFORMED_PROVIDER_RESPONSE"}}
 return {status:response.status,payload};
}
for(const r of dueResults(state,now,6)){
 let confirmed=null,reasons=[];
 if(sportsApiLimited&&r.fixtureId!==null)reasons.push("SPORTSAPI_RATE_LIMIT");
 // A provider ID from the Betman row may give an exact match. When that
 // endpoint fails, a separately matched Naver result can still rescue it.
 if(r.fixtureId!==null&&!sportsApiLimited){
   try{
     const p=await requestFinal(base+"/api/fixture/result?id="+r.fixtureId+
       "&sport="+encodeURIComponent(r.sport));
     if(p.status===429)sportsApiLimited=true;
     if(p.payload?.ok===true&&p.payload.finalConfirmed===true&&p.payload.result)
       confirmed={...p.payload,source:"SPORTSAPI"};
     else reasons.push("SPORTSAPI_HTTP_"+p.status+":"+String(p.payload?.waitReason??p.payload?.error??"UNCONFIRMED").slice(0,65));
   }catch(e){reasons.push("SPORTSAPI_NETWORK:"+String(e).slice(0,65))}
 }
 if(!confirmed&&supportedNaver.has(r.sport)){
   try{
     const params=new URLSearchParams({sport:r.sport,league:r.league,home:r.home,
       away:r.away,date:new Date(r.startMs).toISOString()});
     const response=await requestFinal(base+"/api/naver/lineup?"+params.toString());
     const candidate=verifiedNaverFinal(response.payload);
     if(candidate.ok)confirmed={...candidate,source:"NAVER"};
     else reasons.push("NAVER_HTTP_"+response.status+":"+String(candidate.waitReason).slice(0,65));
   }catch(e){reasons.push("NAVER_NETWORK:"+String(e).slice(0,65))}
 }
 if(!confirmed&&r.sport==="배구"){
   // Independent schedule-exact volleyball lookup also works without SportsAPI IDs.
   const final=await lookupVolleyballFinal(r);
   if(final.ok)confirmed=final;
   else reasons.push("NAVER_VOLLEYBALL:"+String(final.waitReason).slice(0,140));
   if(Array.isArray(final.providerErrors))reasons.push(...final.providerErrors);
 }
 state=mergeProviderFinal(state,r.key,{
   ...(confirmed??{ok:false,waitReason:reasons.join(" | ").slice(0,180)||"SOURCE_NOT_VERIFIED"}),
   providerErrors:reasons
 },Date.now());
}
// Pre-kickoff lineup checks remain separate from final-result reconciliation.
// A returned late lineup is never stored as historical pregame evidence.
const lineupScan=await collectLineupSnapshots(state,{base});
state=lineupScan.state;
console.log("PREGAME_LINEUP_AUDIT "+JSON.stringify(lineupScan.summary));
await fs.writeFile(file,JSON.stringify(state)+"\n");
await fs.writeFile(dir+"/collect-first-public.json",JSON.stringify(projection(state,Date.now()))+"\n");
console.log("COLLECT_FIRST_STORED "+JSON.stringify({fresh,counts:projection(state).counts}));
