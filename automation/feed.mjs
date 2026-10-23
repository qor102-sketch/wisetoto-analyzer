// Verified fresh Betman offer snapshot. Never reuse a stale match/odd.
import fs from "node:fs/promises";
export const FEED_PATH="automation-state/betman-feed.json";
export const FEED_MAX_AGE_MS=5*60_000;
export function validFeed(p){
 return !!p&&p.ok===true&&Array.isArray(p.games)&&p.games.length>0 &&
  p.games.every(g=>typeof g==="object"&&g!==null);
}
export function cachedFeed(value,now=Date.now()){
 if(!value||!Number.isFinite(value.fetchedAt)||value.fetchedAt>now||
    now-value.fetchedAt>FEED_MAX_AGE_MS||!validFeed(value.payload))return null;
 return value.payload;
}
export async function liveFeed(base,{fetchFn=fetch,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),retries=3}={}){
 const errors=[];
 for(let attempt=1;attempt<=retries;attempt++){
  try{
   const res=await fetchFn(base+"/api/betman?scope=all&automated=1&attempt="+attempt,{
    cache:"no-store",signal:AbortSignal.timeout(60000)});
   if(!res.ok)throw Error("Betman HTTP "+res.status);
   const payload=await res.json();
   if(!validFeed(payload))throw Error("Betman returned empty or malformed offers");
   return {payload,fetchedAt:now(),attempt,errors};
  }catch(e){
   errors.push(String(e).slice(0,200));
   if(attempt<retries)await sleep(attempt*3000);
  }
 }
 throw Error("Betman unavailable after "+retries+" attempts: "+errors.join(" ; "));
}
export async function loadFeed(now=Date.now()){
 try{return cachedFeed(JSON.parse(await fs.readFile(FEED_PATH,"utf8")),now);}catch{return null;}
}
export async function saveFeed(value){
 if(!validFeed(value?.payload))throw Error("Never cache an invalid feed");
 await fs.writeFile(FEED_PATH,JSON.stringify({fetchedAt:value.fetchedAt,payload:value.payload}));
}
