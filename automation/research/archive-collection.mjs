// Durable rollover to GitHub automation-data, one month/hash-bucket gzip shard.
// Never delete rows from the active ledger until every archive PUT succeeded.
import fs from "node:fs/promises";
import {gzipSync,gunzipSync} from "node:zlib";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
const DAY=86_400_000,ACTIVE_DAYS=120;
export const ARCHIVE_SCHEMA="wisetoto-collect-archive-v1";
const fields=["collected","verified","pending","pregameCaptured","verifiedWithPregame","resultOnly","missingFixtureId"];
export function countRows(rows){
 const x=Object.fromEntries(fields.map(k=>[k,0]));
 for(const r of rows){
  x.collected++;
  if(r.verdict==="VERIFIED")x.verified++;else x.pending++;
  if(Number.isFinite(r.pregameCapturedAt))x.pregameCaptured++;
  if(r.verdict==="VERIFIED"&&Number.isFinite(r.pregameCapturedAt)&&r.pregameCapturedAt<r.startMs)x.verifiedWithPregame++;
  if(!Number.isFinite(r.pregameCapturedAt))x.resultOnly++;
  if(r.fixtureId===null)x.missingFixtureId++;
 }
 return x;
}
export function partitionForArchive(state,now=Date.now(),{activeDays=ACTIVE_DAYS,maxActive=Infinity}={}){
 if(!Array.isArray(state?.records))throw Error("ARCHIVE_INVALID_ACTIVE_LEDGER");
 const active=[],groups=new Map();
 const newest=[...state.records].sort((a,b)=>b.startMs-a.startMs);
 const keep=new Set(newest.filter(r=>r.startMs>now-activeDays*DAY)
   .slice(0,maxActive).map(r=>r.key));
 for(const r of state.records){
  if(!r.key||!Number.isFinite(r.startMs))throw Error("ARCHIVE_INVALID_RECORD_IDENTITY");
  if(keep.has(r.key)){active.push(r);continue;}
  const month=new Date(r.startMs).toISOString().slice(0,7);
  const bucket=createHash("sha256").update(r.key).digest("hex")[0];
  const id=month+"-"+bucket;
  if(!groups.has(id))groups.set(id,[]);
  groups.get(id).push(r);
 }
 return {active,groups,moved:state.records.length-active.length};
}
export function mergeArchive(existing,rows,archiveId){
 if(existing&&(existing.schema!==ARCHIVE_SCHEMA||existing.archiveId!==archiveId||!Array.isArray(existing.records)))
  throw Error("ARCHIVE_REMOTE_SCHEMA_MISMATCH");
 const by=new Map((existing?.records??[]).map(r=>[r.key,r]));
 for(const r of rows){
  const previous=by.get(r.key);
  // No re-writing previously archived frozen/market evidence, ever.
  if(previous&&JSON.stringify(previous)!==JSON.stringify(r))
   throw Error("ARCHIVE_CONFLICT_FOR_"+r.key);
  by.set(r.key,previous??r);
 }
 return {schema:ARCHIVE_SCHEMA,archiveId,records:[...by.values()].sort((a,b)=>a.key.localeCompare(b.key))};
}
export async function rotateArchive({state,now=Date.now(),activeDays=ACTIVE_DAYS,maxActive=Infinity,getRemote,putRemote}){
 const {active,groups,moved}=partitionForArchive(state,now,{activeDays,maxActive});
 // Pure no-op when nothing is eligible.
 if(!moved)return {state,moved:0,shards:0};
 for(const [id,rows] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
   const remote=await getRemote(id);
   const merged=mergeArchive(remote?.state??null,rows,id);
   const gz=gzipSync(Buffer.from(JSON.stringify(merged)));
   if(gz.length>900_000)throw Error("ARCHIVE_SHARD_TOO_LARGE_"+id);
   await putRemote(id,gz,remote?.sha??null);
 }
 const old=state.archiveCounts??Object.fromEntries(fields.map(k=>[k,0]));
 const kept=new Set(active.map(r=>r.key));
 const delta=countRows(state.records.filter(r=>!kept.has(r.key)));
 const archiveCounts=Object.fromEntries(fields.map(k=>[k,(old[k]??0)+delta[k]]));
 return {state:{...state,records:active,archiveCounts,archiveUpdatedAt:now},moved,shards:groups.size};
}
export function remoteApi({repo,branch,token,prefix="collect-archive",fetchFn=fetch}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!token)throw Error("ARCHIVE_GITHUB_AUTH_REQUIRED");
 if(!/^[a-z0-9-]+$/.test(prefix))throw Error("ARCHIVE_PREFIX_INVALID");
 const base="https://api.github.com/repos/"+repo+"/contents/"+prefix+"/";
 const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
   "X-GitHub-Api-Version":"2022-11-28"};
 return {
  async getRemote(id){
   const res=await fetchFn(base+id+".json.gz?ref="+encodeURIComponent(branch),{
     headers,signal:AbortSignal.timeout(15000)});
   if(res.status===404)return null;
   if(!res.ok)throw Error("ARCHIVE_RESTORE_HTTP_"+res.status);
   const data=await res.json();
   const gz=Buffer.from(String(data.content??"").replace(/\s/g,""),"base64");
   return {sha:data.sha,state:JSON.parse(gunzipSync(gz).toString("utf8"))};
  },
  async putRemote(id,gz,sha){
   const body={branch,message:"Archive verified collect-first source records "+id,content:gz.toString("base64")};
   if(sha)body.sha=sha;
   const res=await fetchFn(base+id+".json.gz",{method:"PUT",headers:{...headers,"Content-Type":"application/json"},
     body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   if(!res.ok)throw Error("ARCHIVE_PUBLISH_HTTP_"+res.status+" "+id);
  }
 };
}
export async function main(){
 const filename="automation-state/collect-first-state.json";
 const state=JSON.parse(await fs.readFile(filename,"utf8"));
 const remote=remoteApi({repo:process.env.GITHUB_REPOSITORY,branch:"automation-data",token:process.env.GH_TOKEN});
 const done=await rotateArchive({state,...remote});
 if(done.moved){
   // Atomic local save only after all remote shards confirmed.
   await fs.writeFile(filename+".next",JSON.stringify(done.state)+"\n");
   await fs.rename(filename+".next",filename);
   const {projection}=await import("./collect-first.mjs");
   await fs.writeFile("automation-state/collect-first-public.json",
     JSON.stringify(projection(done.state,Date.now()))+"\n");
 }
 console.log("COLLECT_ARCHIVE",JSON.stringify({moved:done.moved,shards:done.shards,
   cumulative:done.state.archiveCounts?.collected??0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 await main();
