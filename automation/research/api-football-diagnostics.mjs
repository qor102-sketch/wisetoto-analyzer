// Pure, bounded fixture diagnostics. This NEVER guesses a fixture, modifies
// its original Betman identity, or promotes a non-FT result to VERIFIED.
// No API key, request headers, complete payload or URLs are retained.
const M=60_000,MAX_ROWS=1_500;
export const API_FOOTBALL_DIAGNOSTIC_LIMIT=6;
const validId=id=>/^[1-9]\d+$/.test(String(id??""));
const validMs=date=>Date.parse(String(date??""));
const delta=(a,b)=>Math.round((a-b)/M);
const text=v=>String(v??"").normalize("NFKC")
 .replace(/[^\p{L}\p{N} .&/'()\-]/gu," ").replace(/\s+/g," ").trim().slice(0,52);
const smallNum=v=>Number.isFinite(v)?Math.max(-1440,Math.min(1440,Math.round(v))):null;
export const safeApiFootballDetail=(reason,kind,diagnostic,row)=>{
 const raw=String(reason??"");
 const code=raw.split(":")[0];
 const safeCode=/^API_FOOTBALL_[A-Z0-9_]+$/.test(code)?code.slice(0,80):
  "API_FOOTBALL_UNKNOWN";
 const inferred=/NETWORK|HTTP_/.test(safeCode)?"NETWORK":
  /QUOTA|COOLDOWN/.test(safeCode)?"QUOTA":
  /LINEUP|STARTXI|PLAYER/.test(safeCode)?"LINEUP":"SOURCE";
 return {
 kind:kind==="PRE"?"PRE":"FINAL",
 reason:safeCode,
 stage:/^(SOURCE|LEAGUE|KICKOFF|TEAMS|IDENTITY|STATUS|SCORE|LINEUP|QUOTA|NETWORK|MATCHED)$/.test(
  String(diagnostic?.stage))?diagnostic.stage:inferred,
 expected:{
  league:text(row?.league),home:text(row?.home),away:text(row?.away)
 },
 candidate:diagnostic?.candidate?{
  league:text(diagnostic.candidate.league),
  country:text(diagnostic.candidate.country),
  home:text(diagnostic.candidate.home),
  away:text(diagnostic.candidate.away),
  status:text(diagnostic.candidate.status),
  id:validId(diagnostic.candidate.id)?String(diagnostic.candidate.id).slice(0,20):null
 }:null,
 kickoffDeltaMinutes:smallNum(diagnostic?.kickoffDeltaMinutes),
 leagueCandidates:Math.min(1_500,Math.max(0,Number(diagnostic?.leagueCandidates)||0)),
 timeCandidates:Math.min(1_500,Math.max(0,Number(diagnostic?.timeCandidates)||0))
 };
};
const sample=f=>({
 league:f?.league?.name,country:f?.league?.country,
 home:f?.teams?.home?.name,away:f?.teams?.away?.name,
 status:f?.fixture?.status?.short,id:f?.fixture?.id
});
const proof=(stage,f,row,counts={})=>({
 stage,candidate:f?sample(f):null,
 kickoffDeltaMinutes:f?delta(validMs(f?.fixture?.date),row.startMs):null,
 leagueCandidates:counts.leagueCandidates??0,
 timeCandidates:counts.timeCandidates??0
});
const bad=(reason,stage,f,row,counts={})=>({
 ok:false,reason,diagnostic:proof(stage,f,row,counts)
});
const closest=(list,row)=>list.slice().sort((a,b)=>
 Math.abs(validMs(a?.fixture?.date)-row.startMs)-
 Math.abs(validMs(b?.fixture?.date)-row.startMs)||
 String(a?.fixture?.id??"").localeCompare(String(b?.fixture?.id??"")))[0]??null;

export function diagnoseApiFootballFixture(payload,row,{competitionKey,knownLeagues,teamEq}){
 if(!competitionKey||!Number.isFinite(row?.startMs)||
    !Array.isArray(payload?.response)||payload.response.length>MAX_ROWS)
  return bad("API_FOOTBALL_FIXTURE_RESPONSE_INVALID","SOURCE",null,row);
 const [name,country]=knownLeagues[competitionKey]??[];
 if(!name||!country)return bad("API_FOOTBALL_LEAGUE_UNSUPPORTED","LEAGUE",null,row);
 const normal=x=>String(x??"").normalize("NFKC").toLowerCase()
  .replace(/[^a-z0-9가-힣]/g,"");
 const goodLeague=f=>normal(f?.league?.name)===name&&
  normal(f?.league?.country)===country;
 const valid=payload.response.filter(f=>Number.isFinite(validMs(f?.fixture?.date)));
 const league=valid.filter(goodLeague);
 if(league.length===0){
  // The nearest same-time card is only diagnostic evidence; NEVER auto-switch
  // to its competition or use its score.
  const nearby=valid.filter(f=>Math.abs(validMs(f.fixture.date)-row.startMs)<=120*M);
  const nearest=closest(nearby,row);
  return bad(nearby.length?"API_FOOTBALL_LEAGUE_MISMATCH":"API_FOOTBALL_LEAGUE_NOT_FOUND",
   "LEAGUE",nearest,row,{timeCandidates:nearby.length});
 }
 const timed=league.filter(f=>Math.abs(validMs(f.fixture.date)-row.startMs)<=45*M);
 if(timed.length===0){
  const sameTeams=league.filter(f=>
   teamEq(row.home,f.teams?.home?.name)&&teamEq(row.away,f.teams?.away?.name));
  const nearest=closest(sameTeams.length?sameTeams:league,row);
  return bad("API_FOOTBALL_KICKOFF_MISMATCH","KICKOFF",nearest,row,
   {leagueCandidates:league.length});
 }
 const matched=timed.filter(f=>teamEq(row.home,f.teams?.home?.name)&&
  teamEq(row.away,f.teams?.away?.name));
 if(matched.length===0){
  const partial=timed.map(f=>({
   f,home:teamEq(row.home,f.teams?.home?.name),
   away:teamEq(row.away,f.teams?.away?.name)
  })).sort((a,b)=>Number(b.home)+Number(b.away)-Number(a.home)-Number(a.away)||
   Math.abs(validMs(a.f.fixture.date)-row.startMs)-
   Math.abs(validMs(b.f.fixture.date)-row.startMs));
  const top=partial[0],reason=top?.home?
   "API_FOOTBALL_AWAY_TEAM_MISMATCH":top?.away?
   "API_FOOTBALL_HOME_TEAM_MISMATCH":"API_FOOTBALL_BOTH_TEAMS_MISMATCH";
  return bad(reason,"TEAMS",top?.f,row,{leagueCandidates:league.length,timeCandidates:timed.length});
 }
 if(matched.length!==1){
  const ids=matched.map(f=>String(f?.fixture?.id??""));
  return bad(new Set(ids).size===1?"API_FOOTBALL_DUPLICATE_FIXTURE":
   "API_FOOTBALL_AMBIGUOUS_FIXTURE","IDENTITY",closest(matched,row),row,
   {leagueCandidates:league.length,timeCandidates:timed.length});
 }
 const f=matched[0];
 if(!validId(f?.fixture?.id)||!Number.isSafeInteger(f?.teams?.home?.id)||
    !Number.isSafeInteger(f?.teams?.away?.id)||
    f.teams.home.id<=0||f.teams.away.id<=0||
    f.teams.home.id===f.teams.away.id)
  return bad("API_FOOTBALL_INVALID_SOURCE_IDS","IDENTITY",f,row,
   {leagueCandidates:league.length,timeCandidates:timed.length});
 return {ok:true,gameId:String(f.fixture.id),game:f};
}
