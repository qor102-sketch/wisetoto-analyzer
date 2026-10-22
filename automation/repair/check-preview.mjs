import fs from "node:fs/promises";
const repo=process.env.GITHUB_REPOSITORY,sha=process.env.REPAIR_SHA;
const token=process.env.GITHUB_TOKEN;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path){
 const r=await fetch("https://api.github.com/repos/"+repo+path,{
   headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
     "X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error("GitHub HTTP "+r.status);
 return r.json();
}
export function isSafePreview(url){
 try{
  const u=new URL(url);
  return u.protocol==="https:" && u.hostname.startsWith("wisetoto-analyzer-") &&
    u.hostname.endsWith(".vercel.app") && !u.username && !u.password;
 }catch{return false;}
}
async function findPreview(){
 const ds=await api("/deployments?sha="+encodeURIComponent(sha)+"&per_page=30");
 for(const deployment of ds){
  if(!/preview/i.test(String(deployment.environment)))continue;
  const statuses=await api("/deployments/"+deployment.id+"/statuses?per_page=10");
  const latest=statuses[0];
  if(latest?.state!=="success")continue;
  const url=latest.environment_url||latest.target_url;
  if(isSafePreview(url))return String(url).replace(/\/+$/,"");
 }
 return null;
}
async function probePreview(url){
 const response=await fetch(url+"/api/automation/results",{redirect:"manual",cache:"no-store",
   signal:AbortSignal.timeout(18000)});
 if(response.status!==200)return false;
 const ct=response.headers.get("content-type")||"";
 if(!ct.includes("json"))return false;
 const json=await response.json();
 if(json?.ok!==true||!Array.isArray(json?.data?.records))return false;
 const page=await fetch(url+"/automation",{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(18000)});
 if(page.status!==200)return false;
 return (await page.text()).includes("자동분석 결과");
}
if(process.argv[1]?.endsWith("/check-preview.mjs")){
 let verified=null,status="PREVIEW_NOT_CONFIRMED";
 if(repo&&sha&&token){
  for(let i=0;i<15;i++){
   try{
    const url=await findPreview();
    if(url && await probePreview(url)){verified=url;status="PREVIEW_READY_AND_API_VERIFIED";break;}
   }catch(e){console.warn("Preview probe",String(e).slice(0,150));}
   if(i<14)await wait(12000);
  }
 }
 const result={status,commit:sha,previewUrl:verified,checkedAt:new Date().toISOString(),
  productionMergeApproved:false};
 await fs.writeFile("automation-state/repair-preview.json",JSON.stringify(result,null,2));
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,
   "preview_verified="+String(!!verified)+"\n"+
   (verified?"preview_url="+verified+"\n":""));
 console.log("Preview verification:",JSON.stringify(result));
}
