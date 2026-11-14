// Read-only public GitHub Actions projections. Normal path:
// browser -> same-origin /public-data/... -> Vercel CDN external rewrite
// -> GitHub public automation-data JSON. No Node.js function invocation.
// A legacy function is attempted only if that static edge route fails.
// Never use this for secrets, private state, raw odds or mutation routes.
export const PUBLIC_FEEDS=Object.freeze({
 history:Object.freeze({
  path:"/public-data/automation-history.json",
  legacy:"/api/automation/results",
  schema:"wisetoto-public-history-v1",maxRecords:500}),
 health:Object.freeze({
  path:"/public-data/automation-health.json",
  legacy:null,
  schema:"wisetoto-auto-scan-health-v1",maxRecords:null}),
 collection:Object.freeze({
  path:"/public-data/collect-first-public.json",
  legacy:"/api/automation/collection",
  schema:"wisetoto-collect-first-public-v1",maxRecords:null}),
 research:Object.freeze({
  path:"/public-data/research-public.json",
  legacy:"/api/automation/research",
  schema:"wisetoto-public-evidence-v1",maxRecords:150})
});
const validate=(feed,data)=>{
 if(!data||typeof data!=="object"||Array.isArray(data)||
    data.schema!==feed.schema)
  throw new Error("공개 장부 형식이 올바르지 않습니다.");
 if(feed.maxRecords!==null||feed.path.includes("history")||
    feed.path.includes("collection")||feed.path.includes("research")){
  if(!Array.isArray(data.records)||
    (feed.maxRecords!==null&&data.records.length>feed.maxRecords))
   throw new Error("공개 기록 개수 또는 형식 오류");
 }
 return data;
};
async function readJson(path,fetchFn,timeoutMs){
 const response=await fetchFn(path,{cache:"default",
  signal:AbortSignal.timeout(timeoutMs),
  headers:{Accept:"application/json"}});
 if(!response.ok)throw new Error("HTTP "+response.status);
 return response.json();
}
export async function loadPublicProjection(name,{
 fetchFn=fetch,timeoutMs=8500
}={}){
 if(!Object.prototype.hasOwnProperty.call(PUBLIC_FEEDS,name))
  throw new Error("허용되지 않은 공개 자료 요청");
 const feed=PUBLIC_FEEDS[name];
 try{
  const data=validate(feed,await readJson(feed.path,fetchFn,timeoutMs));
  return {data,transport:"cdn"};
 }catch(error){
  if(!feed.legacy)
   throw new Error("공개 자료 CDN 조회 실패: "+String(error).slice(0,120));
  // Compatibility only: older deployments or an upstream CDN outage.
  // Old endpoints verify the same public schemas before returning JSON.
  const legacy=await readJson(feed.legacy,fetchFn,timeoutMs);
  if(!legacy||legacy.ok!==true)
   throw new Error("공개 자료 대체 조회 실패");
  const data=validate(feed,legacy.data);
  return {data,transport:"legacy"};
 }
}
