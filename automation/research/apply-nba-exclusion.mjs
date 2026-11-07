// One-time, idempotent user-authorized NBA opt-out, executed AFTER restoring
// persistent state and BEFORE any new feed, PRE, public projection or audit.
// No non-NBA record or old frozen prediction is rewritten.
import fs from "node:fs/promises";
import {purgeNbaCollectionState,purgeNbaResearchState,
 purgeNbaTrackerStorage} from "../nba-policy.mjs";
const root=process.env.WISETOTO_STATE_ROOT??"automation-state/";
const now=Date.now();
async function migrate(name,transform){
 const path=root+name;
 let original;
 try{original=JSON.parse(await fs.readFile(path,"utf8"))}
 catch(e){if(e.code==="ENOENT")return {name,status:"ABSENT"};throw e}
 const {state,removed,changed}=transform(original);
 if(!removed&&!changed)return {name,status:"ALREADY_CLEAN"};
 const temp=path+".nba-policy-next";
 await fs.writeFile(temp,JSON.stringify(state)+"\n","utf8");
 await fs.rename(temp,path);
 return {name,status:"PURGED",removed:removed??0};
}
const result=[];
result.push(await migrate("collect-first-state.json",s=>purgeNbaCollectionState(s,now)));
result.push(await migrate("research-state.json",s=>purgeNbaResearchState(s,now)));
result.push(await migrate("state.json",s=>{
 if(!s||typeof s!=="object"||!s.localStorage||typeof s.localStorage!=="object")
  throw Error("NBA_TRACKER_STATE_INVALID");
 const done=purgeNbaTrackerStorage(s.localStorage);
 return {state:{...s,localStorage:done.storage},
  changed:done.changedKeys.length>0,removed:done.changedKeys.length};
}));
console.log("NBA_USER_OPT_OUT_APPLIED "+JSON.stringify(result));
