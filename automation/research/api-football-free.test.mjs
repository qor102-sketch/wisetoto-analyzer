import test from "node:test";
import assert from "node:assert/strict";
import {
 apiFootballCompetition,apiFootballQuota,exactApiFootballFixture,
 parseApiFootballFinal,parseApiFootballPregameLineup,createApiFootballSession
} from "./api-football-free.mjs";
const T=Date.parse("2026-11-21T14:00:00.000Z"),M=60_000;
const row={key:"test-epl",sport:"축구",league:"잉글랜드 프리미어리그",
 home:"리버풀",away:"첼시",startMs:T,verdict:"PENDING",pregameCapturedAt:T-20*M};
const original=()=>({fixture:{id:71234,date:new Date(T).toISOString(),status:{short:"FT"}},
 league:{name:"Premier League",country:"England",id:39},
 teams:{home:{id:1,name:"Liverpool"},away:{id:2,name:"Chelsea"}},
 goals:{home:2,away:1},score:{fulltime:{home:2,away:1}}});
const fixtures=(f=original())=>({response:[f],errors:[]});
const lineups=()=>({response:[
 {team:{id:1,name:"Liverpool"},startXI:Array.from({length:11},(_,i)=>({player:{id:10+i,name:"Home "+i}}))},
 {team:{id:2,name:"Chelsea"},startXI:Array.from({length:11},(_,i)=>({player:{id:30+i,name:"Away "+i}}))}
],errors:[]});
const key="test-fake-free-api-key-do-not-log";
test("only explicitly mapped soccer leagues can use API-Football",()=>{
 assert.equal(apiFootballCompetition(row),"eng.1");
 assert.equal(apiFootballCompetition({...row,league:"일본 J1리그"}),"jpn.1");
 assert.equal(apiFootballCompetition({...row,sport:"농구",league:"NBA"}),null);
 assert.equal(apiFootballCompetition({...row,league:"국제친선경기"}),null);
});
test("fixture requires unique exact league, countries, both teams, official kickoff and id",()=>{
 const expected=exactApiFootballFixture(fixtures(),row);
 assert.equal(expected.ok,true,JSON.stringify(expected));
 assert.equal(expected.gameId,"71234");
 for(const bad of [
  {...original(),league:{name:"Premier League",country:"Japan",id:99}},
  {...original(),teams:{home:{id:1,name:"Liverpool"},away:{id:2,name:"Arsenal"}}},
  {...original(),fixture:{id:71234,date:new Date(T+2*3600000).toISOString()}},
  {...original(),fixture:{id:0,date:new Date(T).toISOString()}},
 ]){
  assert.equal(exactApiFootballFixture(fixtures(bad),row).ok,false);
 }
 assert.equal(exactApiFootballFixture({response:[original(),{...original(),fixture:{id:71235,date:new Date(T).toISOString()}}]},row).ok,false);
});
test("only explicit 90-minute FT and corroborating score are accepted",()=>{
 const good=parseApiFootballFinal(fixtures(),row);
 assert.equal(good.ok,true);
 assert.equal(good.source,"API_FOOTBALL");assert.deepEqual(good.result,{homeScore:2,awayScore:1});
 for(const status of ["NS","LIVE","AET","PEN","PST"]){
  const x=parseApiFootballFinal(fixtures({...original(),fixture:{...original().fixture,status:{short:status}}}),row);
  assert.equal(x.ok,false,status);
 }
 const altered={...original(),goals:{home:99,away:1}};
 assert.equal(parseApiFootballFinal(fixtures(altered),row).ok,false);
});
test("lineup requires both exact team IDs/names + valid 11 unique starters and PRE timing",()=>{
 const source=exactApiFootballFixture(fixtures(),row);
 const ok=parseApiFootballPregameLineup(lineups(),source,row,T-M);
 assert.equal(ok.status,"CONFIRMED");
 assert.equal(ok.homeCount,11);assert.equal(ok.awayCount,11);
 assert.equal(parseApiFootballPregameLineup(lineups(),source,row,T).status,"REJECTED");
 const bad=lineups();bad.response[1].startXI.pop();
 assert.equal(parseApiFootballPregameLineup(bad,source,row,T-M).status,"UNAVAILABLE");
 const spoof=lineups();spoof.response[1].team.id=3;
 assert.equal(parseApiFootballPregameLineup(spoof,source,row,T-M).status,"UNAVAILABLE");
 const dup=lineups();dup.response[0].startXI[10].player.name="Home 0";
 assert.equal(parseApiFootballPregameLineup(dup,source,row,T-M).status,"UNAVAILABLE");
});
test("missing API key never sends requests or writes identity evidence",async()=>{
 let sent=0;
 const session=createApiFootballSession({apiKey:"",now:()=>T-M,
  fetchFn:async()=>{sent++;throw Error("unwanted request")}});
 const x=await session.lookupFinal(row);
 assert.equal(x.ok,false);
 assert.equal(x.waitReason,"API_FOOTBALL_KEY_NOT_CONFIGURED");
 assert.equal(sent,0);assert.equal(session.summary().requests,0);
 assert.equal(session.quota().requests,0);
});
test("real API response is reused within scan, key stays in header only",async()=>{
 const urls=[],headers=[];
 const session=createApiFootballSession({apiKey:key,now:()=>T-M,maxPerScan:3,
  fetchFn:async(url,opts)=>{
   urls.push(url);headers.push(opts.headers);
   return {ok:true,status:200,json:async()=>url.includes("/fixtures/lineups?")?lineups():fixtures()};
  }});
 const result=await session.lookupPregame(row);
 assert.equal(result.status,"CONFIRMED",JSON.stringify(result));
 const final=await session.lookupFinal(row);
 assert.equal(final.ok,true,JSON.stringify(final));
 assert.equal(urls.length,2);
 assert.ok(urls.every(url=>!url.includes(key)));
 assert.equal(headers[0]["x-apisports-key"],key);
 assert.equal(session.summary().requests,2);
 assert.equal(session.quota().requests,2);
 assert.ok(!JSON.stringify(session.quota()).includes(key));
});
test("persisted daily quota limits calls to 60, resets on UTC day change",async()=>{
 const from={schema:"wisetoto-api-football-free-v1",
  day:new Date(T).toISOString().slice(0,10),requests:59,lastAt:{}};
 let calls=0;
 const s=createApiFootballSession({apiKey:key,rawQuota:from,now:()=>T-M,maxPerScan:5,
  fetchFn:async()=>{calls++;return {ok:true,status:200,json:async()=>fixtures()};}});
 const first=await s.lookupFinal(row);
 assert.equal(first.ok,true);
 assert.equal(s.quota().requests,60);
 // The fixture day is cached inside the scan; a different call to
 // /fixtures/lineups must be refused once the 60th request was spent.
 const after=await s.lookupPregame(row);
 assert.equal(after.status,"UNAVAILABLE");
 assert.equal(after.reason,"API_FOOTBALL_LOCAL_QUOTA_BLOCK");
 assert.equal(calls,1);
 assert.equal(s.summary().quotaBlocked,1);
 const old=apiFootballQuota(s.quota(),T+24*3600000);
 assert.equal(old.requests,0);
 assert.deepEqual(old.lastAt,{});
});
test("cached retries cannot deplete quota on repeated scans",async()=>{
 const first=createApiFootballSession({apiKey:key,now:()=>T-M,
  fetchFn:async()=>({ok:true,status:200,json:async()=>fixtures()})});
 assert.equal((await first.lookupFinal(row)).ok,true);
 const restored=JSON.parse(JSON.stringify(first.quota()));
 const next=createApiFootballSession({apiKey:key,rawQuota:restored,now:()=>T+M,
  fetchFn:async()=>{throw Error("cooldown must skip")}});
 const x=await next.lookupFinal(row);
 assert.equal(x.ok,false);assert.equal(x.waitReason,"API_FOOTBALL_RETRY_COOLDOWN");
 assert.equal(next.quota().requests,1);
});
