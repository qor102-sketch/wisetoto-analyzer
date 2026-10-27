// Light, browser-independent capture + results reconciliation. Never creates PRE picks.
import fs from "node:fs/promises";
import {loadFeed} from "../feed.mjs";
import {getRecords,STATE_FILE} from "../logic.mjs";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection} from "./collect-first.mjs";
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
}catch(e){console.error("COLLECT_FIRST_SOURCE_WAIT "+String(e))}
let tracker={localStorage:{}};
try{tracker=JSON.parse(await fs.readFile(STATE_FILE,"utf8"))}catch{}
let verified=settlement(state,getRecords(tracker),now);state=verified.state;
console.log("COLLECT_FIRST_TRACKER_VERIFIED "+verified.settled);
const base=(process.env.WISETOTO_URL||"https://wisetoto-analyzer.vercel.app").replace(/\/+$/,"");
for(const r of dueResults(state,now,6)){
 try{
   const response=await fetch(base+"/api/fixture/result?id="+r.fixtureId+"&sport="+encodeURIComponent(r.sport),
     {signal:AbortSignal.timeout(12000),cache:"no-store"});
   const payload=await response.json();
   state=mergeProviderFinal(state,r.key,payload,Date.now());
   if(response.status===429){console.error("RESULT_SOURCE_LIMIT_429");break;}
 }catch(e){
   state=mergeProviderFinal(state,r.key,{ok:false,error:String(e)},Date.now());
 }
}
await fs.writeFile(file,JSON.stringify(state)+"\n");
await fs.writeFile(dir+"/collect-first-public.json",JSON.stringify(projection(state,Date.now()))+"\n");
console.log("COLLECT_FIRST_STORED "+JSON.stringify({fresh,counts:projection(state).counts}));
