// Fair postmatch retry selection: scoreboard-supported fixtures get enough
// independent FINAL attempts without starving domestic/Naver-only matches.
// Never alters settlement evidence or treats an unverified event as final.
import {dueResults} from "./collect-first.mjs";
import {espnLeague} from "./espn-fast-final.mjs";
export function selectFinalAuditRows(state,now=Date.now(),limit=24){
 const pool=dueResults(state,now,Number.MAX_SAFE_INTEGER);
 const supported=pool.filter(row=>Boolean(espnLeague(row)));
 const others=pool.filter(row=>!espnLeague(row));
 const espnQuota=Math.floor(limit*2/3);
 const nonEspnQuota=limit-espnQuota;
 const selected=[...supported.slice(0,espnQuota),
  ...others.slice(0,nonEspnQuota)];
 if(selected.length<limit){
  const picked=new Set(selected.map(r=>r.key));
  const extra=[...supported.slice(espnQuota),...others.slice(nonEspnQuota)]
   .filter(r=>!picked.has(r.key));
  selected.push(...extra.slice(0,limit-selected.length));
 }
 return selected;
}
