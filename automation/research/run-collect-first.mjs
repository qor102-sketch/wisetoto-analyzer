// Light, browser-independent capture + results reconciliation. Never creates PRE picks.
import fs from "node:fs/promises";
import {loadFeed} from "../feed.mjs";
import {getRecords,STATE_FILE} from "../logic.mjs";
import {SCHEMA,collect,settlement,dueResults,mergeProviderFinal,projection,verifiedNaverFinal} from "./collect-first.mjs";
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
for(const r of dueResults(state,now,6)){
 try{
   let url;
   if(r.fixtureId!==null){
     url=base+"/api/fixture/result?id="+r.fixtureId+"&sport="+encodeURIComponent(r.sport);
   }else if(["축구","농구","야구"].includes(r.sport)){
     const q=new URLSearchParams({sport:r.sport,league:r.league,home:r.home,
       away:r.away,date:new Date(r.startMs).toISOString()});
     url=base+"/api/naver/lineup?"+q.toString();
   }else{
     state=mergeProviderFinal(state,r.key,{ok:false,waitReason:"NO_FINAL_PROVIDER_FOR_SPORT"},Date.now());
     continue;
   }
   const response=await fetch(url,{signal:AbortSignal.timeout(16000),cache:"no-store"});
   const json=await response.json();
   const payload=r.fixtureId===null?verifiedNaverFinal(json):json;
   state=mergeProviderFinal(state,r.key,payload,Date.now());
   if(response.status===429){console.error("RESULT_SOURCE_LIMIT_429");break;}
 }catch(e){
   state=mergeProviderFinal(state,r.key,{ok:false,error:String(e)},Date.now());
 }
}
await fs.writeFile(file,JSON.stringify(state)+"\n");
await fs.writeFile(dir+"/collect-first-public.json",JSON.stringify(projection(state,Date.now()))+"\n");
console.log("COLLECT_FIRST_STORED "+JSON.stringify({fresh,counts:projection(state).counts}));
