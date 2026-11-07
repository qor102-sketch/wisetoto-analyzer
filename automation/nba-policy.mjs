// User-directed 2026-11-07 NBA collection opt-out. KBL, WNBA, other
// basketball, football, baseball and volleyball remain eligible.
// Never infer NBA from a club name; league + basketball are both required.
const normalize=v=>String(v??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣]/g,"");
export function isNbaGame(row){
 const sport=normalize(row?.sport);
 if(!["basketball","농구","bk","bb"].includes(sport))return false;
 const league=normalize(row?.league);
 return Boolean(league&&league!=="wnba"&&(
   league.startsWith("nba")||(league.endsWith("nba")&&!league.endsWith("wnba"))||
   league.includes("미국프로농구")||league.includes("미프로농구")
 ));
}
export const withoutNba=rows=>(Array.isArray(rows)?rows:[]).filter(x=>!isNbaGame(x));
// The live collection ledger is mutable for a user-directed delete. Derived
// historical scan totals cannot be compared across a population change, so
// discard the old operational-effect summary, not anyone's non-NBA fixture.
export function purgeNbaCollectionState(state,now=Date.now()){
 if(!state||!Array.isArray(state.records))throw Error("NBA_PURGE_INVALID_LEDGER");
 const kept=withoutNba(state.records),removed=state.records.length-kept.length;
 if(!removed)return {state,removed:0};
 if(Number(state.archiveCounts?.collected??0)>0)
  throw Error("NBA_PURGE_ARCHIVE_REVIEW_REQUIRED"); // cannot assert remote old shards empty
 return {removed,state:{...state,records:kept,
   operationalEffect:null,
   nbaExclusion:{enabled:true,appliedAt:now,removedActive:removed,
    scope:"NBA_EXCLUDED_FROM_ACTIVE_COLLECTION",
    statisticsReset:"PRE_POLICY_SCAN_TOTALS_NOT_COMPARABLE"}}};
}
const KST=9*3600_000;
const dateKey=ms=>new Date(ms+KST).toISOString().slice(0,10);
// Remove user-directed NBA study rows, BUT block already-selected NBA shadow
// days from being retrospectively replaced with a weaker, known-after-result
// "winner". This also preserves the original 28-day start/end clock.
export function purgeNbaResearchState(state,now=Date.now()){
 if(!state||!Array.isArray(state.fixtures))throw Error("NBA_PURGE_INVALID_RESEARCH");
 const kept=withoutNba(state.fixtures),removed=state.fixtures.length-kept.length;
 if(!removed)return {state,removed:0};
 const frozen=state.fixtures.filter(f=>f.frozenCandidate&&
   Number.isFinite(f.frozenCandidate?.asOf)&&f.frozenCandidate.asOf<f.startMs);
 const byDay=new Map();
 for(const f of frozen){
  if(!Number.isFinite(f.startMs))continue;
  const day=dateKey(f.startMs),prev=byDay.get(day);
  if(!prev||f.frozenCandidate.shift>prev.frozenCandidate.shift||
   (f.frozenCandidate.shift===prev.frozenCandidate.shift&&
    String(f.id??"")<String(prev.id??"")))byDay.set(day,f);
 }
 const blocked=[...byDay.entries()].filter(([,f])=>isNbaGame(f)).map(([day])=>day);
 const prior=Array.isArray(state.pilot?.nbaExcludedShadowDates)?
  state.pilot.nbaExcludedShadowDates:[];
 return {removed,state:{...state,fixtures:kept,
  pilot:state.pilot?{...state.pilot,
   nbaExcludedShadowDates:[...new Set([...prior,...blocked])].sort(),
   excludedNbaAt:state.pilot.excludedNbaAt??now}:null,
  nbaExclusion:{enabled:true,appliedAt:now,removedResearch:removed,
   retrospectiveReselectionForbidden:true}}};
}
export function excludeNbaFromJsonStorage(value){
 // Legacy append-only tracker can be an array or a records envelope.
 if(Array.isArray(value))return withoutNba(value);
 if(value&&typeof value==="object"&&Array.isArray(value.records))
  return {...value,records:withoutNba(value.records)};
 return value;
}
export function purgeNbaTrackerStorage(storage){
 const out={...storage},changes={};
 for(const [key,raw] of Object.entries(out)){
  if(typeof raw!=="string"||!/^wisetoto_v13_8_(1_live_tracker|66_live_tracker_append_only|65_live_tracker_shadow)/.test(key))continue;
  let parsed;
  try{parsed=JSON.parse(raw)}catch{continue}
  const cleaned=excludeNbaFromJsonStorage(parsed);
  if(JSON.stringify(parsed)!==JSON.stringify(cleaned)){
   out[key]=JSON.stringify(cleaned);
   changes[key]=true;
  }
 }
 return {storage:out,changedKeys:Object.keys(changes)};
}
