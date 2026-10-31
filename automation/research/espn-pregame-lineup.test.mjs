import test from "node:test";
import assert from "node:assert/strict";
import {findEspnFixtureEvent,espnLeague,parseEspnFinal} from "./espn-fast-final.mjs";
import {parseEspnPregameXi,lookupEspnPregameXi} from "./espn-pregame-lineup.mjs";
import {collectLineupSnapshots} from "./pregame-lineup.mjs";
const START=Date.parse("2026-10-31T15:00:00Z");
const MIN=60_000;
const fixture={key:"fixture-1",sport:"축구",league:"잉글랜드 챔피언십",
 home:"미들즈브러",away:"찰턴 애슬레틱",startMs:START,
 verdict:"PENDING",pregameCapturedAt:null,fixtureId:null};
const event=props=>({id:"401880190",date:new Date(START).toISOString(),
 competitors:[{homeAway:"home",name:"Middlesbrough"},
  {homeAway:"away",name:"Charlton Athletic"}],...props});
const scoreboard={ok:true,league:"eng.2",events:[event()]};
const names=(prefix,count=11)=>Array.from({length:count},(_,i)=>prefix+" "+(i+1));
const summary=(h=11,a=11)=>({ok:true,source:"ESPN_MATCH_SUMMARY",league:"eng.2",
 eventId:"401880190",eventDate:new Date(START).toISOString(),
 headerTeams:[{homeAway:"home",name:"Middlesbrough"},{homeAway:"away",name:"Charlton Athletic"}],
 rosters:[{homeAway:"home",name:"Middlesbrough",starters:names("Home",h)},
 {homeAway:"away",name:"Charlton Athletic",starters:names("Away",a)}]});
test("confirmed ESPN scoreboard identity + 11 explicit starters each side before kickoff",()=>{
 assert.equal(espnLeague(fixture),"eng.2");
 const match=findEspnFixtureEvent(scoreboard,fixture);
 assert.equal(match.ok,true);
 const xi=parseEspnPregameXi(summary(),fixture,{...match,league:"eng.2"},START-30*MIN);
 assert.equal(xi.status,"CONFIRMED");
 assert.equal(xi.homeCount,11);assert.equal(xi.awayCount,11);
 assert.equal(xi.source,"ESPN_MATCH_SUMMARY");
 assert.equal(xi.gameId,"401880190");
 assert.equal(xi.capturedAt,START-30*MIN);
});
test("no postkickoff reuse; ESPN empty pregame rosters are not 11 starters",()=>{
 const match=findEspnFixtureEvent(scoreboard,fixture);
 assert.equal(parseEspnPregameXi(summary(),fixture,{...match,league:"eng.2"},START).status,"REJECTED");
 assert.equal(parseEspnPregameXi(summary(0,0),fixture,{...match,league:"eng.2"},START-5*MIN).reason,
  "ESPN_XI_NOT_PUBLISHED");
 assert.equal(parseEspnPregameXi(summary(11,0),fixture,{...match,league:"eng.2"},START-5*MIN).status,"PARTIAL");
});
test("strict event identity, schedule time, header and roster side mismatch reject",()=>{
 const match=findEspnFixtureEvent(scoreboard,fixture);
 const opts={...match,league:"eng.2"};
 const wrongId={...summary(),eventId:"404404404"};
 assert.equal(parseEspnPregameXi(wrongId,fixture,opts,START-MIN).status,"UNAVAILABLE");
 const wrongDate={...summary(),eventDate:new Date(START+3*3600000).toISOString()};
 assert.equal(parseEspnPregameXi(wrongDate,fixture,opts,START-MIN).reason,"ESPN_KICKOFF_IDENTITY_UNCONFIRMED");
 const wrongHeader={...summary(),headerTeams:[{homeAway:"home",name:"Different FC"},
  {homeAway:"away",name:"Charlton Athletic"}]};
 assert.equal(parseEspnPregameXi(wrongHeader,fixture,opts,START-MIN).reason,
  "ESPN_LINEUP_SCOREBOARD_TEAM_MISMATCH");
 const duplicates={...summary(),rosters:[...summary().rosters,summary().rosters[0]]};
 assert.equal(parseEspnPregameXi(duplicates,fixture,opts,START-MIN).reason,
  "ESPN_LINEUP_TEAMS_MISSING_OR_AMBIGUOUS");
 const duplicateNames={...summary(),rosters:[{...summary().rosters[0],
  starters:Array(11).fill("same player")},summary().rosters[1]]};
 assert.equal(parseEspnPregameXi(duplicateNames,fixture,opts,START-MIN).reason,
  "ESPN_INVALID_STARTER_NAMES");
});
test("ambiguous ESPN fixtures and off-time events can never become published XI",()=>{
 assert.equal(findEspnFixtureEvent({...scoreboard,events:[event(),event({id:"401880191"})]},fixture).ok,false);
 assert.equal(findEspnFixtureEvent({...scoreboard,events:[event({date:new Date(START+5*3600000).toISOString()})]},fixture).ok,false);
});
test("real collector performs scoreboard then event-specific XI only; caches scoreboard, saves immutable PRE",async()=>{
 let at=START-25*MIN,calls=[],cache=new Map();
 const fetchFn=async url=>{
  calls.push(url);
  if(url.includes("/scoreboard?"))return {ok:true,status:200,json:async()=>scoreboard};
  if(url.includes("/lineup?"))return {ok:true,status:200,json:async()=>summary()};
  throw Error("generic Naver / lineup route must not be used for ESPN league");
 };
 const r=await lookupEspnPregameXi(fixture,{base:"https://local.test",now:at,fetchFn,cache});
 assert.equal(r.status,"CONFIRMED");
 assert.equal(calls.length,2);
 assert.equal(cache.size,1);
 assert.match(calls[1],/event=401880190/);
 const state={records:[fixture]};
 const response=await collectLineupSnapshots(state,{now:()=>at,base:"https://local.test",fetcher:fetchFn});
 assert.equal(response.summary.confirmed,1);
 assert.equal(response.state.records[0].lineup.status,"CONFIRMED");
 assert.equal(response.state.records[0].lineup.capturedAt,at);
 assert.equal(state.records[0].lineup,undefined);
});
test("provider arriving after kickoff is rejected without ever changing source observation",async()=>{
 let at=START-MIN;
 const response=await collectLineupSnapshots({records:[fixture]},{
  now:()=>at,base:"https://local.test",fetcher:async url=>{
   if(url.includes("/scoreboard?"))return {ok:true,status:200,json:async()=>scoreboard};
   at=START+MIN;
   return {ok:true,status:200,json:async()=>summary()};
  }});
 assert.equal(response.state.records[0].lineup.status,"UNAVAILABLE");
 assert.equal(response.state.records[0].lineup.lastError,"AFTER_KICKOFF_NOT_PREGAME");
 assert.equal(response.state.records[0].lineup.capturedAt,undefined);
});
test("expanded result coverage retains fail-closed score rules for added Championship/A-League/J1",()=>{
 assert.equal(espnLeague({...fixture,league:"호주 A리그"}),"aus.1");
 assert.equal(espnLeague({...fixture,league:"일본 J1리그"}),"jpn.1");
 assert.equal(espnLeague({...fixture,league:"일본 J2리그"}),null);
 const final={...scoreboard,events:[{...event(),
   completed:true,statusName:"STATUS_FULL_TIME",
   competitors:[{homeAway:"home",name:"Middlesbrough",score:"1"},
    {homeAway:"away",name:"Charlton Athletic",score:"0"}]}]};
 assert.equal(parseEspnFinal(final,fixture,{now:START+3*3600000}).ok,true);
});

test("NBA 5+5 explicitly marked starters captured before tipoff qualify, never after tipoff",async()=>{
 const nba={...fixture,key:"nba-1",sport:"농구",league:"NBA",
  home:"보스턴 셀틱스",away:"시카고 불스"};
 const game={id:"401909278",date:new Date(START).toISOString(),completed:false,
  competitors:[{homeAway:"home",name:"Boston Celtics"},
   {homeAway:"away",name:"Chicago Bulls"}]};
 const response={ok:true,league:"nba",events:[game]};
 const roster={ok:true,source:"ESPN_MATCH_SUMMARY",league:"nba",eventId:"401909278",
  eventDate:new Date(START).toISOString(),
  headerTeams:[{homeAway:"home",name:"Boston Celtics"},
   {homeAway:"away",name:"Chicago Bulls"}],
  rosters:[{homeAway:"home",name:"Boston Celtics",starters:names("Celtics",5)},
   {homeAway:"away",name:"Chicago Bulls",starters:names("Bulls",5)}]};
 const matched=findEspnFixtureEvent(response,nba);
 assert.equal(matched.ok,true);
 const before=parseEspnPregameXi(roster,nba,{...matched,league:"nba"},START-MIN);
 assert.equal(before.status,"CONFIRMED");
 assert.equal(before.homeCount,5);
 assert.equal(before.awayCount,5);
 assert.equal(before.source,"ESPN_NBA_MATCH_STARTERS");
 assert.equal(parseEspnPregameXi(roster,nba,{...matched,league:"nba"},START).status,"REJECTED");
 const missing={...roster,rosters:[{...roster.rosters[0],starters:[]},roster.rosters[1]]};
 assert.equal(parseEspnPregameXi(missing,nba,{...matched,league:"nba"},START-MIN).status,"PARTIAL");
 const absent={...roster,rosters:roster.rosters.map(x=>({...x,starters:[]}))};
 assert.equal(parseEspnPregameXi(absent,nba,{...matched,league:"nba"},START-MIN).reason,
  "ESPN_XI_NOT_PUBLISHED");
 let calls=[];
 const done=await collectLineupSnapshots({records:[nba]},{
  now:()=>START-20*MIN,base:"https://preview.example",fetcher:async url=>{
   calls.push(url);return {ok:true,status:200,
    json:async()=>url.includes("scoreboard?")?response:roster};
  }});
 assert.equal(done.summary.confirmed,1);
 assert.equal(done.state.records[0].lineup.homeCount,5);
 assert.equal(calls.length,2);
});

test("unpublished ESPN soccer XI can use independent strict Naver PRE evidence before kickoff only",async()=>{
 const now=START-30*MIN;
 const noXi=summary(0,0),p=summary(11,11);
 let calls=[];
 const result=await collectLineupSnapshots({records:[fixture]},{
  now:()=>now,base:"https://local.test",
  fetcher:async url=>{
   calls.push(url);
   if(url.includes("/scoreboard?"))return {ok:true,status:200,json:async()=>scoreboard};
   if(url.includes("/api/espn/lineup?"))return {ok:true,status:200,json:async()=>noXi};
   if(url.includes("/api/naver/lineup?")){
    return {ok:true,status:200,json:async()=>({
     ok:true,gameId:"naver-game-id",footballIdentity:{valid:true},
     game:{gameDateTime:new Date(START).toISOString()},
     footballPlayers:{startingHome:11,startingAway:11},
     home:names("Verified home",11).map(name=>({name})),
     away:names("Verified away",11).map(name=>({name}))
    })};
   }
   throw Error("unexpected provider request");
  }
 });
 assert.equal(result.summary.confirmed,1);
 assert.equal(result.summary.naverFallbacks,1);
 assert.equal(result.state.records[0].lineup.source,"NAVER_FOOTBALL_PLAYERS");
 assert.equal(result.state.records[0].lineup.capturedAt,now);
 assert.equal(calls.length,3);
 const noNaver=await collectLineupSnapshots({records:[fixture]},{
  now:()=>START-120*MIN,base:"https://local.test",fetcher:async url=>{
   if(url.includes("/scoreboard?"))return {ok:true,status:200,json:async()=>scoreboard};
   if(url.includes("/espn/lineup?"))return {ok:true,status:200,json:async()=>noXi};
   throw Error("too early for costly Naver backup");
  }
 });
 assert.equal(noNaver.summary.naverFallbacks,0);
 assert.equal(noNaver.summary.confirmed,0);
 assert.equal(noNaver.state.records[0].lineup.capturedAt,undefined);
});
