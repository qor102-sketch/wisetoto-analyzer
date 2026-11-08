import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,parseEspnFinal,findEspnFixtureEvent} from "./espn-fast-final.mjs";
import {mergeProviderFinal} from "./collect-first.mjs";
// Observed official ESPN events in the original 2026-11-08 09:25 KST
// GitHub Actions read-only backlog probe (#2615). Fixture source name
// mismatches are not conjectured. Actual event IDs, score and clock below.
// A unique scoreboard with the other team independently matching is NOT
// sufficient to settle until BOTH full identity sides match as tested here.
export const audited=[
 ["호주 A리그","시드니FC","센트럴코스트 매리너스","Sydney FC","Central Coast Mariners FC","2026-11-06T08:40:00.000Z","401892144",4,1],
 ["UEFA 유로파리그","RC셀타데비고","루아얄 위니옹 생질루아즈","Celta Vigo","Union St.-Gilloise","2026-11-05T20:00:00.000Z","401915531",1,2],
 ["UEFA 유로파리그","바이어04 레버쿠젠","올랭피크드 마르세유","Bayer Leverkusen","Marseille","2026-11-05T20:00:00.000Z","401915533",0,1],
 ["UEFA 유로파리그","선덜랜드","GNK디나모 자그레브","Sunderland","Dinamo Zagreb","2026-11-05T20:00:00.000Z","401915523",0,2],
 ["UEFA 유로파리그","AC밀란","페렌츠바로시TC","AC Milan","Ferencvaros","2026-11-05T17:45:00.000Z","401915534",0,2],
 ["UEFA 유로파리그","NEC네이메헌","AC오모니아","NEC Nijmegen","Omonia Nicosia","2026-11-05T17:45:00.000Z","401915535",3,1],
 ["UEFA 컨퍼런스리그","미트윌란","AFC아약스","FC Midtjylland","Ajax Amsterdam","2026-11-05T17:45:00.000Z","401915829",1,6],
 ["UEFA 유로파리그","스파르타 프라하","AFC본머스","Sparta Prague","AFC Bournemouth","2026-11-05T17:45:00.000Z","401915528",1,3],
 ["잉글랜드 챔피언십","카디프 시티","웨스트햄 유나이티드","Cardiff City","West Ham United","2026-11-04T19:45:00.000Z","401880175",3,3],
 ["미국 메이저리그사커","밴쿠버 화이트캡스FC","시애틀 사운더스FC","Vancouver Whitecaps","Seattle Sounders FC","2026-11-01T20:30:00.000Z","761927",5,1],
 ["잉글랜드 챔피언십","울버햄튼 원더러스","카디프 시티","Wolverhampton Wanderers","Cardiff City","2026-10-31T15:00:00.000Z","401880185",3,0],
 ["미국 메이저리그사커","시애틀 사운더스FC","휴스턴 다이너모FC","Seattle Sounders FC","Houston Dynamo FC","2026-10-29T02:30:00.000Z","761916",0,1],
 ["미국 메이저리그사커","뉴잉글랜드 레벌루션","뉴욕 레드불스","New England Revolution","Red Bull New York","2026-10-28T23:30:00.000Z","761909",3,2]
];
const fixture=(p)=>({key:"source-"+p[6],sport:"축구",league:p[0],
 home:p[1],away:p[2],startMs:Date.parse(p[5]),verdict:"PENDING",
 pregameCapturedAt:Date.parse(p[5])-60000,odds:[],latestOdds:[]});
const event=p=>({id:p[6],date:p[5],completed:true,statusName:"STATUS_FULL_TIME",
 competitors:[{homeAway:"home",name:p[3],score:String(p[7])},
  {homeAway:"away",name:p[4],score:String(p[8])}]});
const scoreboard=(p,events=[event(p)])=>({ok:true,source:"ESPN_SCOREBOARD",
 league:espnLeague(fixture(p)),events});
test("13 original-ledger independently observed soccer events have exact both-team ESPN identity + immutable FINAL",()=>{
 for(const p of audited){
  const f=fixture(p),feed=scoreboard(p),now=f.startMs+4*3600000;
  const proof=parseEspnFinal(feed,f,{now});
  assert.equal(proof.ok,true,JSON.stringify({p,reason:proof.waitReason}));
  assert.equal(proof.gameId,p[6]);
  assert.deepEqual(proof.result,{homeScore:p[7],awayScore:p[8]});
  const updated=mergeProviderFinal({records:[f]},f.key,proof,now);
  assert.equal(updated.records[0].verdict,"VERIFIED");
  assert.equal(updated.records[0].finalProviderGameId,p[6]);
  assert.equal(updated.records[0].resultSource,"ESPN");
  assert.equal(updated.records[0].finalEvidence,"ESPN_SCOREBOARD_FINAL");
 }
});
test("newly observed aliases never mark a swapped, same-league wrong-side, ambiguous, incomplete, fake-score or wrong-date event FINAL",()=>{
 for(const p of audited){
  const f=fixture(p),now=f.startMs+4*3600000,e=event(p);
  const bad=[
   {...e,competitors:[{...e.competitors[0],name:p[4]},
    {...e.competitors[1],name:p[3]}]},
   {...e,id:"NO_EVENT_ID"},
   {...e,id:p[6]+"8",date:new Date(f.startMs+4*3600000).toISOString()},
   {...e,completed:false},
   {...e,statusName:"STATUS_IN_PROGRESS"},
   {...e,competitors:[{...e.competitors[0],name:"Wrong club"},e.competitors[1]]},
   {...e,competitors:[e.competitors[0],{...e.competitors[1],name:"Wrong club"}]},
   {...e,competitors:[{...e.competitors[0],score:""},e.competitors[1]]}
  ];
  for(const x of bad)assert.equal(parseEspnFinal(scoreboard(p,[x]),f,{now}).ok,false,
   JSON.stringify({p,id:x.id,completed:x.completed,status:x.statusName,teams:x.competitors}));
  assert.equal(parseEspnFinal(scoreboard(p,[e,{...e,id:p[6]+"8"}]),f,{now}).ok,false,
   "two source event IDs may never settle as one match");
  assert.equal(parseEspnFinal({...scoreboard(p),league:"eng.1"},f,{now}).ok,false);
  assert.equal(findEspnFixtureEvent(scoreboard(p,[e]),{...f,home:"다른팀"}).ok,false);
 }
});
