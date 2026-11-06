import test from "node:test";
import assert from "node:assert/strict";
import {espnLeague,findEspnFixtureEvent,parseEspnFinal} from "./espn-fast-final.mjs";
// Source IDs, teams, league and UTC kickoff were independently observed on
// official ESPN scoreboard in CI read-only November 6, 2026. The artificial
// scores below exist ONLY in negative/positive code tests, never in the ledger.
const examples=[
 ["UEFA 챔피언스리그","PSV에인트호번","클뤼프 브뤼허","PSV Eindhoven","Club Brugge","401915303","2026-11-04T20:00Z"],
 ["잉글랜드 챔피언십","브리스틀 시티","울버햄튼 원더러스","Bristol City","Wolverhampton Wanderers","401880176","2026-11-04T20:00Z"],
 ["UEFA 챔피언스리그","슬라비아 프라하","아스널","Slavia Prague","Arsenal","401915381","2026-11-04T20:00Z"],
 ["UEFA 챔피언스리그","포르투","SSC나폴리","FC Porto","Napoli","401915301","2026-11-04T20:00Z"],
 ["UEFA 챔피언스리그","페네르바흐체SK","리버풀","Fenerbahce","Liverpool","401915382","2026-11-04T17:45Z"],
 ["AFC 챔피언스리그 엘리트","부리람 유나이티드","가시마 앤틀러스","Buriram United","Kashima Antlers","401912613","2026-11-04T12:15Z"],
 ["UEFA 챔피언스리그","맨체스터 유나이티드","AS로마","Manchester United","AS Roma","401915308","2026-11-03T20:00Z"],
 ["잉글랜드 챔피언십","웨스트브로미치 앨비언","사우샘프턴","West Bromwich Albion","Southampton","401880177","2026-11-03T20:00Z"],
 ["잉글랜드 챔피언십","블랙번 로버스","스토크 시티","Blackburn Rovers","Stoke City","401880183","2026-11-03T19:45Z"],
 ["잉글랜드 챔피언십","퀸즈파크 레인저스","번리","Queens Park Rangers","Burnley","401880179","2026-11-03T19:45Z"],
 ["잉글랜드 챔피언십","포츠머스","스완지 시티","Portsmouth","Swansea City","401880181","2026-11-03T19:45Z"],
 ["AFC 챔피언스리그 엘리트","꽁안 하노이","교토 상가FC","Cong An Ha Noi","Kyoto Sanga","401912615","2026-11-03T12:15Z"],
 ["AFC 챔피언스리그 엘리트","가시와 레이솔","대전 하나시티즌","Kashiwa Reysol","Daejeon Hana Citizen FC","401912604","2026-11-03T10:00Z"],
 ["AFC 챔피언스리그 엘리트","비셀 고베","랏차부리","Vissel Kobe","Ratchaburi FC","401912605","2026-11-03T10:00Z"],
 ["잉글랜드 프리미어리그","뉴캐슬 유나이티드","에버턴","Newcastle United","Everton","401878762","2026-11-02T20:00Z"],
 ["미국 메이저리그사커","포틀랜드 팀버스","휴스턴 다이너모FC","Portland Timbers","Houston Dynamo FC","761933","2026-11-02T02:45Z"],
 ["미국 메이저리그사커","내슈빌SC","뉴욕 레드불스","Nashville SC","Red Bull New York","761920","2026-11-01T21:30Z"],
 ["프랑스 리그1","파리FC","AS모나코","Paris FC","AS Monaco","401876415","2026-11-01T16:15Z"],
 ["프랑스 리그1","RC스트라스부르","AJ오세르","Strasbourg","AJ Auxerre","401876414","2026-11-01T14:00Z"],
 ["이탈리아 세리에A","코모1907","베네치아","Como","Venezia","401875002","2026-11-01T11:30Z"],
 ["호주 A리그","멜버른 빅토리","센트럴코스트 매리너스","Melbourne Victory","Central Coast Mariners FC","401892146","2026-11-01T04:00Z"],
 ["이탈리아 세리에A","우디네세","AS로마","Udinese","AS Roma","401874990","2026-10-31T17:00Z"],
 ["잉글랜드 프리미어리그","브렌트퍼드","노팅엄 포리스트","Brentford","Nottingham Forest","401879249","2026-10-31T15:00Z"],
 ["잉글랜드 챔피언십","웨스트햄 유나이티드","웨스트브로미치 앨비언","West Ham United","West Bromwich Albion","401880186","2026-10-31T15:00Z"],
 ["잉글랜드 프리미어리그","코번트리 시티","선덜랜드","Coventry City","Sunderland","401879247","2026-10-31T15:00Z"],
 ["일본 J1리그","가시와 레이솔","우라와 레드","Kashiwa Reysol","Urawa Red Diamonds","401877563","2026-10-31T07:00Z"],
 ["잉글랜드 리그컵","에버턴","뉴캐슬 유나이티드","Everton","Newcastle United","401921844","2026-10-29T19:45Z"],
 ["미국 메이저리그사커","밴쿠버 화이트캡스FC","샌디에이고FC","Vancouver Whitecaps","San Diego FC","761918","2026-10-29T02:30Z"],
 ["미국 메이저리그사커","미네소타 유나이티드FC","스포팅 캔자스시티","Minnesota United FC","Sporting Kansas City","761913","2026-10-29T00:30Z"],
 ["미국 메이저리그사커","뉴욕 시티FC","애틀랜타 유나이티드FC","New York City FC","Atlanta United FC","761905","2026-10-28T23:30Z"],
 ["미국 메이저리그사커","인터 마이애미CF","FC신시내티","Inter Miami CF","FC Cincinnati","761908","2026-10-28T23:30Z"],
 ["미국 메이저리그사커","토론토FC","DC유나이티드","Toronto FC","D.C. United","761906","2026-10-28T23:30Z"],
 ["AFC 챔피언스리그 엘리트","가시마 앤틀러스","포항 스틸러스","Kashima Antlers","Pohang Steelers","401912633","2026-10-28T10:00Z"]
];
test("all 33 exact source-backed aliases match distinct audited ESPN event and kickoff without a date shift",()=>{
 assert.equal(examples.length,33);
 for(const [league,home,away,sourceHome,sourceAway,id,at] of examples){
  const startMs=Date.parse(at),f={sport:"축구",league,home,away,startMs};
  assert.ok(espnLeague(f),league);
  const e={id,date:new Date(startMs).toISOString(),completed:true,
   statusName:"STATUS_FULL_TIME",competitors:[
    {homeAway:"home",name:sourceHome,score:"1"},
    {homeAway:"away",name:sourceAway,score:"0"}]};
  const src={ok:true,league:espnLeague(f),events:[e]};
  assert.equal(findEspnFixtureEvent(src,f).gameId,id,home+" vs "+away);
  assert.equal(parseEspnFinal(src,f,{now:startMs+5*3600000}).ok,true);
  const wrongClock={...src,events:[{...e,date:new Date(startMs+4*3600000).toISOString()}]};
  assert.equal(parseEspnFinal(wrongClock,f,{now:startMs+5*3600000}).ok,false);
  const wrongSides={...src,events:[{...e,competitors:[
   {...e.competitors[1],homeAway:"home"}, {...e.competitors[0],homeAway:"away"}
  ]}]};
  assert.equal(parseEspnFinal(wrongSides,f,{now:startMs+5*3600000}).ok,false);
  assert.equal(parseEspnFinal({...src,events:[e,{...e,id:id+"1"}]},f,
   {now:startMs+5*3600000}).ok,false);
 }
});
