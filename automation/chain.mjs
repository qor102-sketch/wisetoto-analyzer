// Self-dispatch the next automatic scan: GitHub 'schedule' runs can be
// delayed/dropped for hours. workflow_dispatch is supported by GITHUB_TOKEN.
// Still best effort: GitHub itself or the upstream feed may be unavailable.
export const INTERVAL_MS=10*60_000;
export function shouldDispatch(current,runs){
 if(!current||!Number.isInteger(current.run_number))return false;
 return !(Array.isArray(runs)?runs:[]).some(r=>
  Number(r.run_number)>current.run_number&&r.head_branch==="main"&&
  r.event!=="pull_request"&&r.status!=="cancelled"&&r.conclusion!=="cancelled");
}
async function request(url,token,opts={}){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(url,{...opts,headers:{
    Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
    "X-GitHub-Api-Version":"2022-11-28",...(opts.headers||{})
   },signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw Error("GitHub API HTTP "+res.status+" "+url);
   return res.status===204?null:await res.json();
  }catch(e){lastError=e;if(attempt<2)await new Promise(r=>setTimeout(r,2500*(attempt+1)));}
 }
 throw lastError;
}
export async function requeue({repo,runId,token,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!repo||!runId||!token)throw Error("Missing trusted GitHub workflow identity");
 const api="https://api.github.com/repos/"+repo;
 const current=await request(api+"/actions/runs/"+runId,token);
 if(current.head_branch!=="main"||current.event==="pull_request")return {dispatched:false,reason:"NOT_MAIN_RUNTIME"};
 const due=Date.parse(current.created_at)+INTERVAL_MS;
 const delay=Math.max(0,Math.min(INTERVAL_MS,due-now()));
 if(delay>0)await sleep(delay);
 const data=await request(api+"/actions/workflows/wisetoto-auto-analysis.yml/runs?per_page=50",token);
 if(!shouldDispatch(current,data?.workflow_runs))return {dispatched:false,reason:"NEWER_MAIN_RUN_EXISTS"};
 await request(api+"/actions/workflows/wisetoto-auto-analysis.yml/dispatches",token,{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({ref:"main"})
 });
 return {dispatched:true,reason:"NEXT_10_MIN_SCAN_DISPATCHED",createdAt:current.created_at};
}
if(process.argv[1]?.endsWith("/chain.mjs")){
 const result=await requeue({repo:process.env.GITHUB_REPOSITORY,
  runId:process.env.GITHUB_RUN_ID,token:process.env.GH_TOKEN});
 console.log("AUTO SCAN HEARTBEAT",JSON.stringify(result));
}
