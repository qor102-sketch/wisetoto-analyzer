// Read-only real 2026-27 WKBL final coverage: original restored ledger,
// WKBL DataLab official per-game identity AND Yonhap independent reported final.
// No data mutation, no NBA, no status inference based on a score alone.
import fs from "node:fs/promises";
import {isNbaGame} from "../nba-policy.mjs";
import {isOfficialWkblFixture,lookupWkblDualFinal} from "./wkbl-dual-final.mjs";
const file=process.argv[2];if(!file)throw Error("WKBL_PERSISTED_LEDGER_REQUIRED");
const data=JSON.parse(await fs.readFile(file,"utf8"));
if(!Array.isArray(data.records))throw Error("WKBL_INVALID_LEDGER");
const now=Date.now(),cache=new Map();
const pending=data.records.filter(r=>!isNbaGame(r)&&r.verdict==="PENDING"&&
 isOfficialWkblFixture(r)&&Number.isFinite(r.startMs)&&
 now-r.startMs>=86400000);
const rows=[];
for(const f of pending){
 const result=await lookupWkblDualFinal(f,{cache,now,timeoutMs:11000});
 rows.push({home:f.home,away:f.away,
  at:new Date(f.startMs).toISOString(),ok:result.ok,
  id:result.ok?result.gameId:null,
  final:result.ok?result.result:null,
  reason:result.ok?null:result.waitReason});
}
const success=rows.filter(x=>x.ok);
console.log("WKBL_TWO_INDEPENDENT_FINAL_SOURCES "+JSON.stringify({readOnly:true,
 excludedNba:true,originalRows:data.records.length,overdue:rows.length,
 sourceQualified:success.length,uniqueOfficialGameIds:new Set(success.map(x=>x.id)).size,
 distinctOfficialAndWireUrls:cache.size,rows,
 policy:"WKBL_OFFICIAL_EXACT_EVENT_PLUS_POSTMATCH_WIRE_FINAL_AND_FOUR_QUARTERS_REQUIRED"}));
