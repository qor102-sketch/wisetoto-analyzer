// Independent Betman relay failover. Never silently replace a Betman offer
// with a different bookmaker, a stale response or fabricated market odds.
const LEGACY_RELAY="https://champions-wishes-documented-modification.trycloudflare.com/betman";
const errorCode=v=>String(v??"").replace(/[^A-Z0-9_]/g,"").slice(0,64);
export function betmanProxyEndpoints(env={}){
 const entries=[env.BETMAN_PROXY_URL||LEGACY_RELAY,env.BETMAN_PROXY_FALLBACK_URL];
 const out=[];
 for(const value of entries){
  if(!value)continue;
  let url;
  try{url=new URL(String(value).trim())}catch{continue}
  if(url.protocol!=="https:"||url.username||url.password||url.hash)continue;
  url.hash="";
  const endpoint=url.toString();
  if(!out.includes(endpoint))out.push(endpoint);
 }
 return out;
}
const makeError=(code,details=[])=>{
 const err=new Error("BETMAN_PROXY_UNAVAILABLE:"+code+
  (details.length?" ["+details.map((x,i)=>"relay"+(i+1)+":"+x).join(", ")+"]":""));
 err.code=code;
 return err;
};
export async function requestBetmanFromProxies(endpoints,{
 gmTs=null,gmId="G101",fetchFn=fetch,timeoutMs=16000
}={}){
 if(!Array.isArray(endpoints)||!endpoints.length)throw makeError("NO_VALID_PROXY_CONFIG");
 const errors=[];
 for(const [index,endpoint] of endpoints.entries()){
  let url;
  try{url=new URL(endpoint);
   if(url.protocol!=="https:"||url.username||url.password)throw Error("Invalid URL");
  }catch{errors.push("INVALID_PROXY_CONFIG");continue}
  if(Number.isFinite(gmTs)&&gmTs>0){
   url.searchParams.set("gmTs",String(gmTs));
   url.searchParams.set("gmId",String(gmId||"G101"));
  }
  try{
   const res=await fetchFn(url.toString(),{method:"GET",cache:"no-store",
    signal:AbortSignal.timeout(timeoutMs),
    headers:{accept:"application/json, text/plain, */*",
     "user-agent":"WisetotoAnalyzer/1.0 Vercel","cache-control":"no-cache"}});
   if(!res.ok){
    errors.push("HTTP_"+res.status);
    continue;
   }
   let json;
   try{json=await res.json()}catch{errors.push("NON_JSON");continue}
   if(json?.ok!==true||!json.data||typeof json.data!=="object"){
    errors.push("INVALID_BETMAN_PAYLOAD");continue;
   }
   return {data:json.data,relayIndex:index,attempts:errors.length+1};
  }catch(e){
   const cause=String(e?.name??"");
   errors.push(cause==="TimeoutError"||cause==="AbortError"?
    "TIMEOUT":"NETWORK_ERROR");
  }
 }
 const first=errors[0]??"UNKNOWN";
 throw makeError(errorCode(first),errors);
}
