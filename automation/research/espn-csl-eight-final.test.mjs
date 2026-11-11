import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,findEspnFixtureEvent,lookupEspnFinal}
 from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
import {isNbaGame} from "../nba-policy.mjs";

// Independent real ESPN Chinese Super League source audit in GitHub CI #2923
// (2026-11-10). Eight unique final IDs, exact fixture kickoff in live
// persisted non-NBA collection ledger. No synthesized sources or scores.
const AT="2026-11-08T07:30:00.000Z";
const audited=[
 ["다롄 잉보","톈진 진먼후","Dalian Yingbo","Tianjin Jinmen Tiger","401861489",3,1],
 ["베이징 궈안","충칭 퉁량룽","Beijing Guoan","Chongqing Tonglianglong","401861514",1,0],
 ["산둥 타이산","청두 룽청","Shandong Taishan","Chengdu Rongcheng","401861494",3,2],
 ["상하이 선화","칭다오 시하이안","Shanghai Shenhua FC","Qingdao West Coast","401861492",4,0],
 ["상하이 하이강","랴오닝 톄런","Shanghai Port FC","Liaoning Tieren","401861515",6,1],
 ["윈난 위쿤","우한 싼전","Yunnan Yukun","Wuhan Three Towns","401861493",2,1],
 ["저장FC","허난FC","Zhejiang Professional FC","Henan","401861491",4,0],
 ["칭다오 하이뉴","선전 신펑청","Qingdao Hainiu","Shenzhen Xinpengcheng","401861490",2,2]
];
const fx=(c)=>({key:"csl-"+c[4],sport:"축구",league:"중국 슈퍼리그",
 home:c[0],away:c[1],startMs:Date.parse(AT),verdict:"PENDING",
 pregameCapturedAt:Date.parse(AT)-20*60000,firstOddsAt:Date.parse(AT)-30*60000,
 odds:[{source:"frozen-betman-pre"}],fixtureId:null});
const evt=(c,more={})=>({id:c[4],date:AT,completed:true,
 statusName:"STATUS_FULL_TIME",competitors:[
 {homeAway:"home",name:c[2],shortName:c[2],score:String(c[5])},
 {homeAway:"away",name:c[3],shortName:c[3],score:String(c[6])}
 ],...more});
const feed=(events=audited.map(evt))=>({ok:true,source:"ESPN_SCOREBOARD",
 league:"chn.1",events});

test("eight actual CSL official FINAL events at exactly the same kickoff all match unique two-team IDs",()=>{
 assert.equal(audited.length,8);
 assert.equal(new Set(audited.map(c=>c[4])).size,8);
 for(const c of audited){
  const f=fx(c),now=f.startMs+5*3600000;
  assert.equal(espnLeague(f),"chn.1");
  assert.equal(isNbaGame(f),false);
  const matched=findEspnFixtureEvent(feed(),f);
  assert.equal(matched.ok,true,JSON.stringify({c,wait:matched.waitReason}));
  assert.equal(matched.gameId,c[4]);
  const p=parseEspnFinal(feed(),f,{now});
  assert.equal(p.ok,true,JSON.stringify({c,wait:p.waitReason}));
  assert.equal(p.source,"ESPN");
  assert.equal(p.gameId,c[4]);
  assert.deepEqual(p.result,{homeScore:c[5],awayScore:c[6]});
  const updated=mergeProviderFinal({records:[f]},f.key,p,now);
  assert.equal(updated.records[0].verdict,"VERIFIED");
  assert.equal(updated.records[0].resultSource,"ESPN");
  assert.equal(updated.records[0].finalProviderGameId,c[4]);
  assert.equal(updated.records[0].pregameCapturedAt,f.pregameCapturedAt);
  assert.equal(updated.records[0].firstOddsAt,f.firstOddsAt);
  assert.deepEqual(updated.records[0].odds,f.odds);
 }
});

test("CSL verified identities never accept a different simultaneous event, flipped homeAway, incomplete game or malformed source",()=>{
 for(const c of audited){
  const f=fx(c),e=evt(c),now=f.startMs+5*3600000;
  for(const bad of [
   {...e,id:"NOT_SOURCE_ID"},
   {...e,completed:false},
   {...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,statusName:"STATUS_FINAL_PEN"},
   {...e,date:new Date(f.startMs+3*3600000).toISOString()},
   {...e,competitors:e.competitors.map((v,i)=>({...v,homeAway:i?"home":"away"}))},
   {...e,competitors:[{...e.competitors[0],name:"UNKNOWN",shortName:"UNKNOWN"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"UNKNOWN",shortName:"UNKNOWN"}]},
   {...e,competitors:[{...e.competitors[0],score:""},e.competitors[1]]}
  ])assert.equal(parseEspnFinal(feed([bad]),f,{now}).ok,false,JSON.stringify({fixture:c[4],bad}));
  assert.equal(parseEspnFinal(feed([e,{...e,id:c[4]+"9"}]),f,{now}).ok,false);
  assert.equal(parseEspnFinal({...feed(),league:"usa.1"},f,{now}).ok,false);
  assert.equal(parseEspnFinal(feed(),{...f,sport:"농구",league:"NBA"},{now}).ok,false);
 }
});

test("shared CSL scoreboard is fetched once for eight simultaneous due fixtures",async()=>{
 const cache=new Map(),calls=[];
 const fetchFn=async url=>{
  calls.push(url);
  assert.match(url,/\/api\/espn\/scoreboard\?/);
  assert.match(url,/league=chn\.1/);
  return {ok:true,status:200,json:async()=>feed()};
 };
 for(const c of audited){
  const r=await lookupEspnFinal(fx(c),{base:"https://local.test",cache,fetchFn,
   now:Date.parse(AT)+5*3600000});
  assert.equal(r.ok,true,c[4]+":"+r.waitReason);
 }
 assert.equal(calls.length,1);
});
