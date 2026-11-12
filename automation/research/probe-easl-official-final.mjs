// Real source audit: official EASL schedule-event ID + explicit winner
// and final score from its own postmatch recap. Never writes a ledger.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {isOfficialEaslFixture,lookupOfficialEaslFinal} from "./easl-official-final.mjs";
const file=process.argv[2];if(!file)throw Error("EASL_LEDGER_REQUIRED");
const state=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(state.records))throw Error("EASL_INVALID_LEDGER");
const now=Date.now(),cache=new Map();
const pending=state.records.filter(r=>!isNbaGame(r)&&r.verdict==="PENDING"&&
 isOfficialEaslFixture(r)&&r.startMs<now-165*60000);
const rows=[];
for(const f of pending){
 const p=await lookupOfficialEaslFinal(f,{now,cache,timeoutMs:10000});
 rows.push({home:f.home,away:f.away,league:f.league,
  at:new Date(f.startMs).toISOString(),ok:p.ok,
  id:p.ok?p.gameId:null,result:p.ok?p.result:null,
  reason:p.ok?null:p.waitReason,aged24h:f.startMs<now-86400000});
}
const pending24h=rows.filter(x=>x.aged24h).length;
console.log("EASL_OFFICIAL_FINAL_AUDIT "+JSON.stringify({readOnly:true,
 pending:pending.length,pending24h,verified:rows.filter(x=>x.ok).length,
 verified24h:rows.filter(x=>x.ok&&x.aged24h).length,sharedQueries:cache.size,
 rows,excludedNba:true,policy:"EXACT_SCHEDULE_EVENT_AND_EXPLICIT_DECISIVE_RECAP_REQUIRED"}));
