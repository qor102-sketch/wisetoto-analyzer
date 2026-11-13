// Read-only strict official J.League Cup FINAL audit of real persisted
// >24h overdue non-NBA source rows. Never edits the ledger.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {isJleagueCupFixture,lookupOfficialJleagueCupFinal}
 from "./jleague-cup-final.mjs";
const file=process.argv[2];if(!file)throw Error("CUP_LEDGER_REQUIRED");
const data=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(data.records))throw Error("CUP_INVALID_LEDGER");
const now=Date.now(),cache=new Map(),rows=[];
const pending=data.records.filter(r=>!isNbaGame(r)&&isJleagueCupFixture(r)&&
 r.verdict==="PENDING"&&Number.isFinite(r.startMs)&&now-r.startMs>=86400000);
for(const f of pending){
 const p=await lookupOfficialJleagueCupFinal(f,{cache,now});
 rows.push({home:f.home,away:f.away,at:new Date(f.startMs).toISOString(),
  verified:p.ok===true,gameId:p.ok?p.gameId:null,
  final:p.ok?p.result:null,waitReason:p.ok?null:p.waitReason});
}
console.log("JLEAGUE_CUP_FINAL_AUDIT "+JSON.stringify({
 readOnly:true,noNba:true,originalRows:data.records.length,
 overdueCup:pending.length,sourceQualified:rows.filter(x=>x.verified).length,
 distinctOfficialQueries:cache.size,
 failures:rows.filter(x=>!x.verified).reduce((a,r)=>{
  a[r.waitReason]=(a[r.waitReason]??0)+1;return a;
 },{}),rows,
 policy:"EXACT_OFFICIAL_NUMERIC_MATCH_ID_TWO_CLUBS_KICKOFF_REGULATION_FINAL_ONLY"
}));
