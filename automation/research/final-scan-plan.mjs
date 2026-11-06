// Fair postmatch retry selection. A likely-finished fixture is only an audit
// candidate; no clock-based result can become VERIFIED without provider proof.
import {dueResults} from "./collect-first.mjs";
import {espnLeague} from "./espn-fast-final.mjs";
import {isJleagueJ2} from "./jleague-j2-final.mjs";
import {officialKLeagueId} from "./kleague-official-final.mjs";
import {naverOutageGroup} from "./naver-outage-group.mjs";
const H=3600000;

// Network-down source groups are sampled with two distinct fixtures per
// scan, rather than consuming the whole queue with identical Naver timeouts.
// Healthy group throughput is unchanged and ESPN-supported fixtures never
// inherit a Naver-only outage cap.
export function isNaverOnlyOutage(r){
 if(espnLeague(r)||isJleagueJ2(r)||officialKLeagueId(r)||!["축구","농구","야구"].includes(r.sport))return false;
 const reason=String(r.checkReason??"");
 const errors=Array.isArray(r.resultErrors)?r.resultErrors.at(-1)?.reasons??[]:[];
 return /NAVER_CIRCUIT_OPEN|NAVER_(?:FAST|DIRECT|SCHEDULE).*?(?:NETWORK|HTTP_50[24]|TIMEOUT)|NAVER_PROVIDER_NETWORK/.test(
  reason+" | "+errors.join(" | "));
}
export function limitFailingNaverGroups(rows,maxPerGroup=2){
 const selected=[],groups=new Map();
 for(const row of rows){
  if(isNaverOnlyOutage(row)){
   const group=naverOutageGroup(row);
   const seen=groups.get(group)??0;
   if(seen>=maxPerGroup)continue;
   groups.set(group,seen+1);
  }
  selected.push(row);
 }
 return selected;
}
export function interleaveRecentAndBacklog(rows,now){
 // >24h unresolved comes before 12-24h; recently finished fixtures still
 // take alternating turns so fresh verifications never starve.
 const recent=rows.filter(r=>now-r.startMs<=12*H);
 const overdue=rows.filter(r=>now-r.startMs>=24*H);
 const medium=rows.filter(r=>now-r.startMs>12*H&&now-r.startMs<24*H);
 const backlog=[...overdue,...medium];
 const merged=[];
 let i=0,j=0;
 while(i<recent.length||j<backlog.length){
  if(j<backlog.length)merged.push(backlog[j++]);
  if(i<recent.length)merged.push(recent[i++]);
 }
 return merged;
}
export function selectFinalAuditRows(state,now=Date.now(),limit=24){
 if(!Number.isInteger(limit)||limit<=0)return [];
 const pool=dueResults(state,now,Number.MAX_SAFE_INTEGER);
 const supported=interleaveRecentAndBacklog(pool.filter(row=>Boolean(espnLeague(row))||isJleagueJ2(row)||Boolean(officialKLeagueId(row))),now);
 const others=interleaveRecentAndBacklog(
  limitFailingNaverGroups(pool.filter(row=>!espnLeague(row)&&!isJleagueJ2(row)&&!officialKLeagueId(row))),now);
 // Preserve provider-independent ESPN quota and healthy Naver-only access.
 const espnQuota=Math.floor(limit*2/3);
 const otherQuota=limit-espnQuota;
 const selected=[...supported.slice(0,espnQuota),...others.slice(0,otherQuota)];
 if(selected.length<limit){
  const picked=new Set(selected.map(r=>r.key));
  const extra=[...supported.slice(espnQuota),...others.slice(otherQuota)]
   .filter(r=>!picked.has(r.key));
  selected.push(...extra.slice(0,limit-selected.length));
 }
 return selected;
}
