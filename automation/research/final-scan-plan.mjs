// Fair postmatch retry selection. A likely-finished fixture is only an audit
// candidate; no clock-based result can become VERIFIED without provider proof.
import {dueResults} from "./collect-first.mjs";
import {espnLeague} from "./espn-fast-final.mjs";
const H=3600000;
export function interleaveRecentAndBacklog(rows,now){
 // New likely-finished games must not wait behind 28 days of failed provider
 // lookups; equally, old unresolved games must continue getting a retry.
 const recent=rows.filter(r=>now-r.startMs<=12*H);
 const backlog=rows.filter(r=>now-r.startMs>12*H);
 const merged=[];
 let i=0,j=0;
 while(i<recent.length||j<backlog.length){
  if(i<recent.length)merged.push(recent[i++]);
  if(j<backlog.length)merged.push(backlog[j++]);
 }
 return merged;
}
export function selectFinalAuditRows(state,now=Date.now(),limit=24){
 if(!Number.isInteger(limit)||limit<=0)return [];
 const pool=dueResults(state,now,Number.MAX_SAFE_INTEGER);
 const supported=interleaveRecentAndBacklog(pool.filter(row=>Boolean(espnLeague(row))),now);
 const others=interleaveRecentAndBacklog(pool.filter(row=>!espnLeague(row)),now);
 // Preserve Naver-only domestic games' quota even when ESPN coverage is large.
 const espnQuota=Math.floor(limit*2/3);
 const nonEspnQuota=limit-espnQuota;
 const selected=[...supported.slice(0,espnQuota),...others.slice(0,nonEspnQuota)];
 if(selected.length<limit){
  const picked=new Set(selected.map(r=>r.key));
  const extra=[...supported.slice(espnQuota),...others.slice(nonEspnQuota)]
   .filter(r=>!picked.has(r.key));
  selected.push(...extra.slice(0,limit-selected.length));
 }
 return selected;
}
