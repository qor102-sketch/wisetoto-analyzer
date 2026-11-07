import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,espnTeamEq,findEspnFixtureEvent} from "./espn-fast-final.mjs";
// Source-owned ESPN football fixture metadata read-only observed in GitHub CI
// 2026-11-06 run #2387, original overdue ledger/18 real competition/date
// scoreboards. No invented games, IDs, clubs, times or source final scores.
const cases=[
 ["UEFA 챔피언스리그","PSV에인트호번","클뤼프 브뤼허","2026-11-04T20:00:00.000Z","401915303","PSV Eindhoven","Club Brugge",1,2],
 ["잉글랜드 챔피언십","브리스틀 시티","울버햄튼 원더러스","2026-11-04T20:00:00.000Z","401880176","Bristol City","Wolverhampton Wanderers",1,2],
 ["UEFA 챔피언스리그","페네르바흐체SK","리버풀","2026-11-04T17:45:00.000Z","401915382","Fenerbahce","Liverpool",3,2],
 ["AFC 챔피언스리그 엘리트","부리람 유나이티드","가시마 앤틀러스","2026-11-04T12:15:00.000Z","401912613","Buriram United","Kashima Antlers",0,0],
 ["잉글랜드 프리미어리그","뉴캐슬 유나이티드","에버턴","2026-11-02T20:00:00.000Z","401878762","Newcastle United","Everton",0,1],
 ["미국 메이저리그사커","포틀랜드 팀버스","휴스턴 다이너모FC","2026-11-02T02:45:00.000Z","761933","Portland Timbers","Houston Dynamo FC",3,1],
 ["미국 메이저리그사커","내슈빌SC","뉴욕 레드불스","2026-11-01T21:30:00.000Z","761920","Nashville SC","Red Bull New York",3,2],
 ["잉글랜드 챔피언십","웨스트햄 유나이티드","웨스트브로미치 앨비언","2026-10-31T15:00:00.000Z","401880186","West Ham United","West Bromwich Albion",1,3],
 ["일본 J1리그","가시와 레이솔","우라와 레드","2026-10-31T07:00:00.000Z","401877563","Kashiwa Reysol","Urawa Red Diamonds",4,0],
 ["잉글랜드 리그컵","에버턴","뉴캐슬 유나이티드","2026-10-29T19:45:00.000Z","401921844","Everton","Newcastle United",3,1],
 ["미국 메이저리그사커","밴쿠버 화이트캡스FC","샌디에이고FC","2026-10-29T02:30:00.000Z","761918","Vancouver Whitecaps","San Diego FC",4,1],
 ["미국 메이저리그사커","미네소타 유나이티드FC","스포팅 캔자스시티","2026-10-29T00:30:00.000Z","761913","Minnesota United FC","Sporting Kansas City",3,1],
 ["미국 메이저리그사커","뉴욕 시티FC","애틀랜타 유나이티드FC","2026-10-28T23:30:00.000Z","761905","New York City FC","Atlanta United FC",2,1],
 ["미국 메이저리그사커","인터 마이애미CF","FC신시내티","2026-10-28T23:30:00.000Z","761908","Inter Miami CF","FC Cincinnati",2,2],
 ["미국 메이저리그사커","토론토FC","DC유나이티드","2026-10-28T23:30:00.000Z","761906","Toronto FC","D.C. United",2,1]
];
const sample=(item)=>{
 const [league,home,away,when,id,sourceHome,sourceAway,h,a]=item;
 const fixture={key:id,sport:"축구",league,home,away,startMs:Date.parse(when)};
 const event={id,date:when,completed:true,statusName:"STATUS_FULL_TIME",
  competitors:[{homeAway:"home",name:sourceHome,score:String(h)},
   {homeAway:"away",name:sourceAway,score:String(a)}]};
 return {fixture,event,source:{ok:true,league:espnLeague(fixture),events:[event]},
  expected:{homeScore:h,awayScore:a}};
};
test("all 15 previously one-sided ESPN football source matches pass BOTH exact sides and independent FINAL",()=>{
 assert.equal(cases.length,15);
 for(const item of cases){
  const {fixture,event,source,expected}=sample(item);
  assert.equal(espnTeamEq(fixture.home,event.competitors[0].name),true,fixture.home);
  assert.equal(espnTeamEq(fixture.away,event.competitors[1].name),true,fixture.away);
  const p=parseEspnFinal(source,fixture,{now:fixture.startMs+3*3600000});
  assert.equal(p.ok,true,JSON.stringify({fixture,reason:p.waitReason}));
  assert.equal(p.source,"ESPN");
  assert.equal(p.gameId,event.id);
  assert.deepEqual(p.result,expected);
 }
});
test("15 football aliases never settle swapped sides, late kickoff, incomplete game, invalid ID or unverified scores",()=>{
 for(const item of cases){
  const {fixture,event,source}=sample(item),now=fixture.startMs+4*3600000;
  for(const bad of [
   {...event,completed:false},
   {...event,statusName:"STATUS_IN_PROGRESS"},
   {...event,statusName:"STATUS_FINAL_ET"},
   {...event,id:"UNKNOWN"},
   {...event,date:new Date(fixture.startMs+4*3600000).toISOString()},
   {...event,competitors:event.competitors.map((x,i)=>({
    ...x,homeAway:i===0?"away":"home"
   }))},
   {...event,competitors:event.competitors.map(x=>({...x,score:""}))}
  ])assert.equal(parseEspnFinal({...source,events:[bad]},fixture,{now}).ok,false,
    JSON.stringify({fixture,bad}));
  const ambiguous={...event,id:String(Number(event.id)+123)};
  assert.equal(findEspnFixtureEvent({...source,events:[event,ambiguous]},fixture).ok,false);
 }
});
test("known club variants never make unrelated competition or a single matching team FINAL",()=>{
 const {fixture,event,source}=sample(cases[0]),now=fixture.startMs+5*3600000;
 assert.equal(parseEspnFinal({...source,league:"eng.1"},fixture,{now}).ok,false);
 assert.equal(parseEspnFinal(source,{...fixture,home:"리버풀"},{now}).ok,false);
 assert.equal(parseEspnFinal(source,{...fixture,away:"레알마드리드"},{now}).ok,false);
});
