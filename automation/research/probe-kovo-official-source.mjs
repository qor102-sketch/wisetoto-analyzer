// Read-only official KOVO finished-schedule coverage of ALL old
// pending non-NBA volleyball fixtures in the persisted original ledger.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {isOfficialKovoFixture,lookupOfficialKovoFinal} from "./kovo-official-final.mjs";
const file=process.argv[2];
if(!file)throw Error("KOVO_PERSISTED_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(state.records))throw Error("KOVO_INVALID_LEDGER");
const now=Date.now();
const overdue=state.records.filter(r=>!isNbaGame(r)&&isOfficialKovoFixture(r)&&
  r.verdict==="PENDING"&&Number.isFinite(r.startMs)&&now-r.startMs>86400000);
const cache=new Map(),results=[];
for(const r of overdue){
 const evidence=await lookupOfficialKovoFinal(r,{cache,now});
 results.push({league:r.league,home:r.home,away:r.away,
  at:new Date(r.startMs).toISOString(),verified:evidence.ok,
  providerId:evidence.ok?evidence.gameId:null,
  score:evidence.ok?evidence.result:null,
  reason:evidence.ok?null:evidence.waitReason});
}
const failures=results.filter(x=>!x.verified).reduce((o,x)=>{
 o[x.reason]=(o[x.reason]??0)+1;return o;
},{});
console.log("KOVO_OFFICIAL_SOURCE_AUDIT "+JSON.stringify({
 ledgerRows:state.records.length,pendingKovo:overdue.length,
 uniqueQueries:cache.size,verified:results.filter(x=>x.verified).length,
 failures,results,readOnly:true,excludedNba:true,
 note:"Only source-qualified KOVO ended-only finals are eligible; no score writes"
}));
