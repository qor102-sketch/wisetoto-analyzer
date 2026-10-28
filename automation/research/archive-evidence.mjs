// Separate long-term research snapshots; no frozen PRE mutations, no 800-row eviction.
// Keep up to 365 days / 2000 recent studied fixtures; archive the remainder
// in durable month/hash-bucket gzip files before pruning local state.
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {rotateArchive,remoteApi} from "./archive-collection.mjs";
import {publicEvidence} from "./evidence.mjs";
export async function rotateResearch(state,{now=Date.now(),getRemote,putRemote}){
 if(state?.schema!=="wisetoto-market-evidence-v1"||!Array.isArray(state.fixtures))
   throw Error("RESEARCH_ARCHIVE_INVALID_INPUT");
 const pseudo={records:state.fixtures.map(f=>({...f,key:f.id}))};
 const rotated=await rotateArchive({state:pseudo,now,activeDays:365,maxActive:2000,getRemote,putRemote});
 const remaining=rotated.state.records.map(({key,...f})=>f);
 return {state:{...state,fixtures:remaining,
   archivedFixtures:(state.archivedFixtures??0)+rotated.moved},
   moved:rotated.moved,shards:rotated.shards};
}
export async function main(){
 const file="automation-state/research-state.json";
 let state;
 try{state=JSON.parse(await fs.readFile(file,"utf8"));}
 catch(e){if(e.code==="ENOENT"){console.log("RESEARCH_ARCHIVE_FIRST_RUN");return;}throw e;}
 const remote=remoteApi({repo:process.env.GITHUB_REPOSITORY,branch:"automation-data",
   token:process.env.GH_TOKEN,prefix:"research-archive"});
 const r=await rotateResearch(state,{...remote});
 if(r.moved){
   await fs.writeFile(file+".next",JSON.stringify(r.state)+"\n");
   await fs.rename(file+".next",file);
   await fs.writeFile("automation-state/research-public.json",
     JSON.stringify(publicEvidence(r.state,Date.now()))+"\n");
 }
 console.log("RESEARCH_ARCHIVE",JSON.stringify({moved:r.moved,shards:r.shards,total:r.state.archivedFixtures??0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
