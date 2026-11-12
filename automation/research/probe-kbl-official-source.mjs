// Read-only KBL source coverage on the genuine persisted non-NBA ledger.
// No state mutation, no invented results; official JSON is never written.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {isOfficialKblFixture,lookupOfficialKblFinal,kblOfficialUrl}
 from "./kbl-official-final.mjs";
const filename=process.argv[2];
if(!filename)throw Error("KBL_LEDGER_REQUIRED");
const ledger=JSON.parse(await fs.readFile(filename,"utf8"));
if(!Array.isArray(ledger.records))throw Error("KBL_LEDGER_INVALID");
const now=Date.now();
const unresolved=ledger.records.filter(r=>!isNbaGame(r)&&
 isOfficialKblFixture(r)&&r.verdict==="PENDING"&&
 now-r.startMs>24*3600000);
const cache=new Map();
const rows=[];
for(const f of unresolved.slice(0,30)){
 const out=await lookupOfficialKblFinal(f,{cache,now,timeoutMs:9000});
 rows.push({league:f.league,home:f.home,away:f.away,
  kickoff:new Date(f.startMs).toISOString(),
  confirmed:out.ok===true,officialId:out.ok?out.gameId:null,
  score:out.ok?out.result:null,
  waitReason:out.ok?null:out.waitReason});
}
console.log("KBL_OFFICIAL_SOURCE_AUDIT "+JSON.stringify({
 ledgerRows:ledger.records.length,pendingKbl:unresolved.length,
 readOnly:true,queries:cache.size,verified:rows.filter(r=>r.confirmed).length,
 failures:rows.filter(r=>!r.confirmed).reduce((m,r)=>
  (m[r.waitReason]=(m[r.waitReason]??0)+1,m),{}),
 rows,excludedNBA:true,
 policy:"FINAL_REQUIRES_OFFICIAL_KBL_GAME_ID_EXACT_SIDES_START_AND_ISENDED"
}));
