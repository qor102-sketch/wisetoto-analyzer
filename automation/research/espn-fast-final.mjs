// Independent ESPN verified-score fallback. NEVER grades raw/live results:
// league, two teams, kickoff, unique ESPN event, FINAL and score must all match.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const norm=x=>String(x??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
 .normalize("NFC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const aliases=[
 ["ac밀란","acmilan","milan"],["볼로냐","bologna"],
 ["베네치아","venezia"],["인테르나치오날레밀라노","인테르밀란","인테르","intermilan","internazionale"],
 ["제노아","genoa"],["유벤투스","juventus"],["파르마","parma"],["우디네세","udinese"],
 ["ac몬차","몬차","monza"],["ssc나폴리","나폴리","napoli"],
 ["리버풀","liverpool"],["첼시","chelsea"],["맨체스터시티","맨시티","manchestercity","mancity"],
 ["브라이턴호브앨비언","브라이튼","brightonhovealbion","brighton"],
 ["afc본머스","본머스","bournemouth","afcbournemouth"],
 ["애스턴빌라","아스톤빌라","astonvilla"],["선덜랜드","sunderland"],
 ["브렌트퍼드","브렌트포드","brentford"],["풀럼","fulham"],
 ["크리스털팰리스","크리스탈팰리스","crystalpalace"],
 ["토트넘홋스퍼","토트넘","tottenhamhotspur","tottenham"],
 ["뉴캐슬유나이티드","뉴캐슬","newcastleunited","newcastle"],
 ["아스널","아스날","arsenal"],["맨체스터유나이티드","맨유","manchesterunited"],
 ["아틀레티코마드리드","atleticomadrid"],["레알마드리드","realmadrid"],
 ["바르셀로나","barcelona"],["바이에른뮌헨","바이에른","bayernmunich"],
 ["브리즈번로어","brisbaneroar"],["내슈빌sc","내슈빌","nashvillesc","nashville"],
 // Audited against actual J1/A-League ESPN league-specific scoreboard events,
 // never infer an identity solely from English transliteration or kickoff.
 ["가시마앤틀러스","가시마안틀러스","kashimaantlers"],
 ["세레소오사카","cerezoosaka"],
 ["비셀고베","visselkobe"],
 ["나고야그램퍼스","nagoyagrampus"],
 ["교토상가fc","교토상가","kyotosanga"],
 ["시미즈에스펄스","shimizuspulse"],
 ["미토홀리호크","mitohollyhock"],
 ["산프레체히로시마","sanfreccehiroshima"],
 ["파지아노오카야마","fagianookayama"],
 ["fc도쿄","fctokyo"],
 ["가시와레이솔","kashiwareysol"],
 ["우라와레즈","우라와레드","우라와레드다이아몬즈","urawareds","urawareddiamonds"],
 ["멜버른시티","멜버른시티fc","melbournecityfc","melbournecity"],
 ["웨스턴시드니원더러스","웨스턴시드니원더러스fc","westernsydneywanderersfc","westernsydneywanderers"],
 ["뉴캐슬제츠","뉴캐슬제트","newcastlejets"],
 ["웰링턴피닉스","wellingtonphoenix"],
 ["맥아서fc","macarthurfc"],
 ["노리치시티","norwichcity"],["왓포드","watford"],
 ["링컨시티","lincolncity"],["버밍엄시티","birminghamcity"],
 ["스토크시티","stokecity"],["프레스턴노스엔드","prestonnorthend"],
 ["필라델피아유니언","philadelphiaunion"],["fc댈러스","댈러스","fcdallas"],
 ["콜럼버스크루","columbuscrew"],["포틀랜드팀버스","portlandtimbers"],
 ["la레이커스","레이커스","lalakers","losangeleslakers"],
 ["포틀랜드트레일블레이저스","포틀랜드트레일블레이저즈","portlandtrailblazers","trailblazers"],
 ["la클리퍼스","클리퍼스","laclippers","losangelesclippers"],
 ["새크라멘토킹스","새크라멘토","sacramentokings"],
 ["마이애미히트","miamiheat"],["애틀랜타호크스","atlantahawks"],
 // Verified Korean spelling variants from the overdue 2026-11-03 NBA slate.
 // These are team-identity aliases only; matching still requires exact league,
 // both home/away sides, unique ESPN event, kickoff and authoritative FINAL.
 ["골든스테이트워리어스","골든스테이트","goldenstatewarriors"],
 ["보스턴셀틱스","bostonceltics"],["뉴욕닉스","newyorkknicks"],
 ["시카고불스","chicagobulls"],["클리블랜드캐벌리어스","clevelandcavaliers"],
 ["휴스턴로키츠","휴스턴로케츠","houstonrockets"],["댈러스매버릭스","dallasmavericks"],
 ["덴버너기츠","덴버너게츠","denvernuggets"],["피닉스선스","피닉스선즈","phoenixsuns"],
 ["오클라호마시티썬더","oklahomacitythunder"],
 ["샌안토니오스퍼스","sanantoniospurs"],["밀워키벅스","milwaukeebucks"],
 ["올랜도매직","orlandomagic"],["토론토랩터스","torontoraptors"],
 ["필라델피아세븐티식서스","필라델피아76ers","필라델피아76s","philadelphia76ers","philadelphia76s"],
 ["미네소타팀버울브스","minnesotatimberwolves"],["디트로이트피스턴스","디트로이트피스톤스","detroitpistons"],
 ["인디애나페이서스","indianapacers"],["유타재즈","utahjazz"],
 ["멤피스그리즐리스","memphisgrizzlies"],["브루클린네츠","brooklynnets"],
 ["뉴올리언스펠리컨스","neworleanspelicans"],["샬럿호네츠","charlottehornets"],
 ["워싱턴위저즈","washingtonwizards"],
 // Team labels checked against ESPN's 2026-10-31 league scoreboards:
 // alias only the club's known Korean/English spelling; never match by score.
 ["콜로라도래피즈","coloradorapids"],["시카고파이어fc","chicagofirefc"],
 ["la갤럭시","lagalaxy"],["오스틴fc","austinfc"],
 ["새너제이어스퀘이크스","sanjoseearthquakes"],
 ["레알솔트레이크","realsaltlake"],
 ["세인트루이스시티sc","stlouiscitysc"],
 ["샌디에이고fc","sandiegofc"],
 ["밴쿠버화이트캡스fc","vancouverwhitecaps"],
 ["미네소타유나이티드fc","minnesotaunitedfc"],
 ["애틀랜타유나이티드fc","atlantaunitedfc"],
 ["인터마이애미cf","intermiamicf"],
 ["토론토fc","torontofc"],
 ["스포팅캔자스시티","sportingkansascity"],
 ["fc신시내티","fccincinnati"],
 ["휴스턴다이너모fc","houstondynamofc"],
 ["뉴욕레드불스","redbullnewyork"],
 ["뉴욕시티fc","newyorkcityfc"],
 ["cf몽레알","cfmontreal"],
 ["콜럼버스크루","columbuscrew"],
 ["dc유나이티드","dcunited"],
 ["샬럿fc","charlottefc"],
 ["올랜도시티sc","orlandocitysc"],
 ["afc아약스","ajaxamsterdam"],
 ["az알크마르","azalkmaar"],
 ["sc캄뷔르","sccambuur"],
 ["고어헤드이글스","goaheadeagles"],
 ["psv에인트호번","psveindhoven"],
 ["빌럼ii","willemii"],
 ["sc헤이렌베인","heerenveen"],
 ["nec네이메헌","necnijmegen"],
 ["포르튀나시타르트","fortunasittard"],
 ["페예노르트","feyenoordrotterdam"],
 ["레반테","levante"],
 ["알라베스","alaves"],
 ["라요바예카노","rayovallecano"],
 ["rc셀타데비고","celtavigo"],
 ["레알베티스","realbetis"],
 ["말라가","malaga"],
 ["트루아ac","troyes"],
 ["르망fc","lemans"],
 // Original 2026-11-08 GitHub CI official ESPN full-time source:
 // 13 unique exact league, 0-minute kickoff and one independently matched side.
 // Names below do NOT waive both-team, competition, unique event ID and FINAL.
 ["루아얄위니옹생질루아즈","unionstgilloise"],
 ["바이어04레버쿠젠","bayerleverkusen"],
 ["gnk디나모자그레브","dinamozagreb"],
 ["페렌츠바로시tc","ferencvaros"],
 ["ac오모니아","omonianicosia"],
 ["미트윌란","fcmidtjylland"],
 ["스파르타프라하","spartaprague"],
 ["카디프시티","cardiffcity"],
 ["시애틀사운더스fc","seattlesoundersfc"],
 ["뉴잉글랜드레벌루션","newenglandrevolution"],
 // Additional 2026-11-08 read-only audit: exact competition, source
 // match IDs, 0-minute kickoffs for 16 games and -60m for Perth/Adelaide.
 // Each alias is directly grounded in a unique official ESPN matchup with
 // the other known team. Both sides and FINAL remain strict as before.
 ["코번트리시티","coventrycity"],
 ["툴루즈","toulouse"],
 ["노르셸란","FC Nordsjælland"],
 ["as로마","asroma"],
 ["사우샘프턴","southampton"],
 ["블랙번로버스","blackburnrovers"],
 ["퀸즈파크레인저스","queensparkrangers"],
 ["스완지시티","swanseacity"],
 ["꽁안하노이","conganhanoi"],
 ["대전하나시티즌","daejeonhanacitizenfc"],
 ["랏차부리","ratchaburifc"],
 ["코모1907","como"],
 ["노팅엄포리스트","nottinghamforest"],
 ["포항스틸러스","pohangsteelers"],
 // Cross-checked with ESPN 2026-11-02 AFC Elite event 401912631,
 // Pakhtakor (home) vs Al Nassr (away), 13:45 UTC.
 ["파흐타코르","pakhtakor"],["s알나스르","알나스르","alnassr"],
 // Independent ESPN afc.cup full-time events 401912770/771 (2026-11-03).
 // Team-name mappings alone grant no result without both sides/time/event/FINAL.
 ["이스트벵골","eastbengalfc"],
 ["알시브클럽","alseebclub"],
 ["j알후세인","알후세인","alhusseinsc"],
 ["알쇼르타","alshortasc"],
 // Independently observed ESPN afc.cup 2026-11-04 matches, all eight
 // full-time scores and event IDs independently logged in official probe.
 ["무하라크클럽","almuharraqsc"],["u알자지라","알자지라","aljaziraclub"],
 ["알타아원","altaawoun"],["j알파이살리","알파이살리","alfaisalysc"],
 ["u알와흐다","알와흐다","alwahdafc"],
 ["알칼디야sc","alkhaldiyasc"],
 ["알라이얀","alrayyansc"],["o알나흐다","알나흐다","alnahdaclub"],
 ["쿠웨이트sc","kuwaitsc"],["pfc나사프","나사프","fcnasaf"],
 ["아르카다그","arkadagfk"],["골고하르시르잔","golgoharsirjanfc"],
 ["fc서울","fcseoul"],["테꽁비엣텔","thecongviettelfc"],
 ["페르십반둥","persibbandung"],
 // Exact one-sided Korean/English club labels independently cross-checked
 // on 15 genuine ESPN events in the original >24h pending ledger, 2026-11-06.
 // Other side, league, kickoff and unique FINAL still must independently match.
 ["클뤼프브뤼허","clubbrugge"],
 ["울버햄튼원더러스","wolverhamptonwanderers"],
 ["페네르바흐체sk","fenerbahce"],
 ["부리람유나이티드","buriramunited"],
 ["에버턴","everton"],
 ["웨스트햄유나이티드","westhamunited"],
 ["미들즈브러","middlesbrough"],["찰턴애슬레틱","charltonathletic","charlton"],
 ["밀월","millwall"],["더비카운티","derbycounty"],["번리","burnley"],
 ["포츠머스","portsmouth"],["볼턴원더러스","boltonwanderers"],
 ["브리스틀시티","bristolcity"],["렉섬","wrexham"],["셰필드유나이티드","sheffieldunited"],
 ["리즈유나이티드","leedsunited"],["웨스트브로미치앨비언","westbromwichalbion","westbrom"],
 ["퍼스글로리","perthglory","perthgloryfc"],["애들레이드유나이티드","adelaideunited","adelaideunitedfc"],
 ["멜버른빅토리","melbournevictory"],["센트럴코스트매리너스","centralcoastmariners","centralcoastmarinersfc"],
 ["맥아서fc","macarthurfc"],["웨스턴시드니원더러스","westernsydneywanderers"],
 ["멜버른시티","melbournecity"],["시드니fc","sydneyfc"],
 ["브리즈번로어","brisbaneroarfc","brisbaneroar"],
 ["오클랜드fc","aucklandfc"],
 ["아틀레틱빌바오","athleticclub","athleticbilbao"],
 ["레알소시에다드","realsociedad"],["엘체","elche"],["발렌시아","valencia"],
 ["라싱산탄데르","racingsantander"],["헤타페","getafe"],["세비야","sevilla"],
 ["올랭피크드마르세유","마르세유","marseille"],
 ["올랭피크리옹","리옹","lyon","olympiquelyonnais"],["앙제sco","앙제","angers"],
 ["파리fc","parisfc"],["as모나코","모나코","monaco","asmonaco"],
 ["rc스트라스부르","스트라스부르","strasbourg"],["aj오세르","오세르","auxerre","ajauxerre"],
 ["ss라치오","라치오","lazio"],["칼리아리","cagliari"],
 ["us레체","레체","lecce"],["토리노","torino"],["프로시노네","frosinone"],
 ["프랑크푸르트","eintrachtfrankfurt","frankfurt"],["함부르크","hamburg","hamburgersv","hamburgsv"],
 ["우니온베를린","unionberlin"],["쾰른","cologne","fckoln"],
 ["도르트문트","borussiadortmund","dortmund"],
 ["묀헨글라트바흐","borussiamonchengladbach"],
 ["파더보른07","scpaderborn07","paderborn"],
 ["흐로닝언","groningen"],["스파르타로테르담","spartarotterdam"],
 ["엑셀시오르로테르담","excelsiorrotterdam"],["트벤테","twente"],
 ["텔스타","telstar"],["위트레흐트","utrecht"],
 ["pec즈볼러","peczwolle"],["ado덴하흐","adodenhaag"],
 // Independently audited 2026-11-08 official ESPN FINAL events from
 // read-only CI #2642: 401915305 Lens v Como and 401912614 Pohang v Gamba.
 // These are identity aliases ONLY; unique official event, both sides,
 // league, strict kickoff, regulation FINAL and score remain mandatory.
 ["rc랑스","랑스","lens"],
 ["감바오사카","gambaosaka"],
 // Independently observed source-owned ESPN Chinese Super League scoreboards:
 // read-only CI #2923, all 8 overdue 2026-11-08 07:30 UTC fixtures have
 // unique distinct numeric event IDs, matching home/away and full-time status.
 // Only source-backed Korean↔ESPN club labels; NEVER match on score/time alone.
 ["다롄잉보","dalianyingbo"],["톈진진먼후","tianjinjinmentiger"],
 ["베이징궈안","beijingguoan"],["충칭퉁량룽","chongqingtonglianglong"],
 ["산둥타이산","shandongtaishan"],["청두룽청","chengdurongcheng"],
 ["상하이선화","shanghaishenhuafc","shanghaishenhua"],
 ["칭다오시하이안","qingdaowestcoast"],
 ["상하이하이강","shanghaiportfc","shanghaiport"],["랴오닝톄런","liaoningtieren"],
 ["윈난위쿤","yunnanyukun"],["우한싼전","wuhanthreetowns"],
 ["저장fc","zhejiangprofessionalfc"],["허난fc","henan"],
 ["칭다오하이뉴","qingdaohainiu"],["선전신펑청","shenzhenxinpengcheng"],
 // Official ESPN read-only overdue audit (GitHub Actions #2926):
 // 25 unique one-sided 2026-10-30..11-08 match candidates, exact
 // competition + 0-minute kickoff + unique official completed event ID.
 // Add only source-proven missing CLUB names. Still require exact other
 // team, homeAway, 2h kickoff, numeric event ID and regulation FINAL.
 ["ACF피오렌티나","Fiorentina"],
 ["위트레흐트","FC Utrecht"],
 ["비야레알","Villarreal"],
 ["SC프라이부르크","SC Freiburg"],
 ["스타드 브레스투아29","Brest"],
 ["OGC니스","Nice"],
 ["흐로닝언","FC Groningen"],
 ["아탈란타BC","Atalanta"],
 ["입스위치 타운","Ipswich Town"],
 ["트벤테","FC Twente"],
 ["제프 유나이티드","JEF United Ichihara-Chiba"],
 ["FC마치다 젤비아","Machida Zelvia"],
 ["파리 생제르맹","Paris Saint-Germain"],
 ["엑셀시오르 로테르담","Excelsior"],
 ["US사수올로","Sassuolo"],
 ["오사수나","Osasuna"],
 ["헐 시티","Hull City"],
 ["FSV마인츠05","Mainz"],
 ["엘버스베르크","SV Elversberg"],
 ["가와사키 프론탈레","Kawasaki Frontale"],
 ["요코하마 F마리노스","Yokohama F. Marinos"],
 ["도쿄 베르디","Tokyo Verdy 1969"],
 ["포트FC","Port FC"],
 ["릴OSC","Lille"],
 ["뉴욕양키스","newyorkyankees"],["보스턴레드삭스","bostonredsox"],
 ["la다저스","로스앤젤레스다저스","losangelesdodgers"],["시카고컵스","chicagocubs"]
].map(group=>group.map(norm));
function teamEq(a,b){
 const x=norm(a),y=norm(b);
 if(!x||!y)return false;
 if(x===y)return true;
 return aliases.some(group=>group.includes(x)&&group.includes(y));
}
// Read-only name-equivalence predicate for auditing one-sided source gaps.
export {teamEq as espnTeamEq};
export function espnLeague(fixture){
 const l=norm(fixture.league);
 if(fixture.sport==="농구")return /nba|미프로농구|미국프로농구/.test(l)?"nba":null;
 if(fixture.sport==="야구")return /mlb|미국프로야구|메이저리그/.test(l)?"mlb":null;
 if(fixture.sport!=="축구")return null;
 // Extra independent ESPN scoreboard competitions remain fail-closed:
 // a league slug alone cannot verify a match without unique ID, both teams,
 // kickoff, final-only status and plausible regulation score.
 if(/세리에b|serieb|이탈리아2부리그/.test(l))return "ita.2";
 if(/세리에a|세리에아|seriea/.test(l))return "ita.1";
 if(/잉글랜드fa컵|잉글랜드에프에이컵|facup/.test(l))return "eng.fa";
 if(/잉글랜드리그1|잉글랜드3부|eflleagueone/.test(l))return "eng.3";
 if(/잉글랜드리그컵|카라바오컵|eflcup/.test(l))return "eng.league_cup";
 if(/프리미어리그|epl|englishpremier/.test(l))return "eng.1";
 if(/잉글랜드챔피언십|eflchampionship|engchampionship/.test(l))return "eng.2";
 if(/호주a리그|호주에이리그|aleague/.test(l))return "aus.1";
 if(/일본j1리그|j리그1|j1league/.test(l))return "jpn.1";
 if(/스페인라리가2|라리가2|세군다디비시온|laliga2/.test(l))return "esp.2";
 if(/스페인라리가|laliga|라리가/.test(l))return "esp.1";
 if(/독일분데스리가2|독일2분데스리가|분데스리가2|2bundesliga/.test(l))return "ger.2";
 if(/독일분데스|bundesliga/.test(l))return "ger.1";
 if(/프랑스리그2|ligue2/.test(l))return "fra.2";
 if(/프랑스리그1|ligue1/.test(l))return "fra.1";
 // ESPN independently publishes the Chinese Super League as chn.1.
 // No team alias or score is inferred from the competition label alone.
 if(/중국슈퍼리그|중국프로축구|chinesesuperleague|chinasuperleague/.test(l))return "chn.1";
 if(/미국메이저리그사커|mls|미국프로축구/.test(l))return "usa.1";
 if(/네덜란드2부|에이르스터디비시|eerste divisie|eerstedivisie/.test(l))return "ned.2";
 if(/네덜란드에레디비시|eredivisie/.test(l))return "ned.1";
 if(/afc챔피언스리그2|afc챔피언스리그투|아시아챔피언스리그2|afcchampionsleaguetwo/.test(l))return "afc.cup";
 if(/afc챔피언스리그엘리트|afc챔피언스엘리트|아시아챔피언스리그엘리트/.test(l))return "afc.champions";
 if(/uefa챔피언스|유럽챔피언스리그/.test(l))return "uefa.champions";
 if(/유로파컨퍼런스|uefa컨퍼런스|uefaconference/.test(l))return "uefa.europa.conf";
 if(/유로파리그|uefa유로파/.test(l))return "uefa.europa";
 return null;
}
const dateKey=ms=>new Date(ms).toISOString().slice(0,10).replace(/-/g,"");
const hours=3600000;
// ESPN buckets some leagues by calendar day in a competition-local timezone.
// Alternate dates expand discovery only, never fixture matching proof.
export function espnScoreboardDates(fixture){
 if(!Number.isFinite(fixture?.startMs))return [];
 return [...new Set([fixture.startMs,fixture.startMs-12*hours,fixture.startMs+12*hours]
  .map(dateKey))];
}
const score=x=>{
 if(x===null||x===undefined||String(x).trim()==="")return null;
 const n=Number(x);return Number.isSafeInteger(n)&&n>=0?n:null;
};
// Explain why ESPN failed to identify a game. Never accept partial matches.
export function diagnoseEspnIdentity(payload,fixture,{league=espnLeague(fixture)}={}){
 if(!league||payload?.ok!==true||payload.league!==league||!Array.isArray(payload.events))
  return {ok:false,waitReason:"ESPN_LEAGUE_OR_FEED_UNCONFIRMED"};
 const valid=payload.events.filter(e=>e&&Number.isFinite(Date.parse(String(e.date??""))));
 const inTime=valid.filter(e=>Math.abs(Date.parse(String(e.date))-fixture.startMs)<=2*hours);
 // Both official source displayName and shortDisplayName refer to the
 // SAME homeAway competitor in ONE ESPN event. Neither is a fixture proof
 // alone; the opposite team, league, unique numeric ID and kickoff must match.
 const sourceSides=e=>{
  const c=Array.isArray(e.competitors)?e.competitors:[];
  const home=c.find(x=>x.homeAway==="home");
  const away=c.find(x=>x.homeAway==="away");
  return {home:[home?.name,home?.shortName],
    away:[away?.name,away?.shortName]};
 };
 const sideEq=(betman,source)=>source.some(name=>teamEq(betman,name));
 const matched=inTime.filter(e=>{
  const {home,away}=sourceSides(e);
  return sideEq(fixture.home,home)&&sideEq(fixture.away,away);
 });
 const numeric=matched.filter(e=>/^\d+$/.test(String(e.id??"")));
 const exact=new Map();
 for(const e of numeric){
  const id=String(e.id);
  if(exact.has(id)&&JSON.stringify(exact.get(id))!==JSON.stringify(e))
   return {ok:false,waitReason:"ESPN_CONFLICTING_EVENT_ID"};
  exact.set(id,e);
 }
 if(exact.size>1)return {ok:false,waitReason:"ESPN_AMBIGUOUS_FIXTURE"};
 if(exact.size===1)return {ok:true,gameId:[...exact.keys()][0],
  event:[...exact.values()][0]};
 if(matched.length)return {ok:false,waitReason:"ESPN_MISSING_NUMERIC_EVENT_ID"};
 if(!payload.events.length)return {ok:false,waitReason:"ESPN_SCOREBOARD_EMPTY"};
 if(valid.some(e=>{
  const {home,away}=sourceSides(e);
  return sideEq(fixture.home,home)&&sideEq(fixture.away,away);
 }))return {ok:false,waitReason:"ESPN_KICKOFF_MISMATCH"};
 if(inTime.some(e=>{
  const {home,away}=sourceSides(e);
  return sideEq(fixture.home,away)&&sideEq(fixture.away,home);
 }))return {ok:false,waitReason:"ESPN_HOME_AWAY_REVERSED"};
 if(inTime.some(e=>sideEq(fixture.home,sourceSides(e).home)))
  return {ok:false,waitReason:"ESPN_AWAY_TEAM_NOT_MATCHED"};
 if(inTime.some(e=>sideEq(fixture.away,sourceSides(e).away)))
  return {ok:false,waitReason:"ESPN_HOME_TEAM_NOT_MATCHED"};
 if(!inTime.length)return {ok:false,waitReason:"ESPN_NO_EVENTS_NEAR_KICKOFF"};
 return {ok:false,waitReason:"ESPN_TEAMS_NOT_ON_SCOREBOARD"};
}
// Audit metadata ONLY: never relax kickoff tolerance or accept a FINAL.
export function inspectEspnKickoffMismatch(payload,fixture,{league=espnLeague(fixture)}={}){
 if(!league||payload?.ok!==true||payload.league!==league||
    !Array.isArray(payload.events))return null;
 const byId=new Map();
 for(const e of payload.events){
  if(!/^\d+$/.test(String(e?.id??"")))continue;
  const at=Date.parse(String(e?.date??""));
  if(!Number.isFinite(at)||!Number.isFinite(fixture?.startMs))continue;
  const c=Array.isArray(e.competitors)?e.competitors:[];
  const home=c.find(x=>x.homeAway==="home")?.name;
  const away=c.find(x=>x.homeAway==="away")?.name;
  if(!teamEq(fixture.home,home)||!teamEq(fixture.away,away))continue;
  const deltaMinutes=Math.round((at-fixture.startMs)/60000);
  if(Math.abs(deltaMinutes)>2160)continue;
  const key=String(e.id);
  if(byId.has(key)&&byId.get(key).deltaMinutes!==deltaMinutes)return null;
  byId.set(key,{eventId:key,sourceKickoffAt:at,deltaMinutes});
 }
 const found=[...byId.values()];
 return found.length===1?found[0]:null;
}
export function findEspnFixtureEvent(payload,fixture,{league=espnLeague(fixture)}={}){
 return diagnoseEspnIdentity(payload,fixture,{league});
}
export function parseEspnFinal(payload,fixture,{now=Date.now(),league=espnLeague(fixture)}={}){
 if(!league||payload?.ok!==true||payload.league!==league||!Array.isArray(payload.events))
  return {ok:false,waitReason:"ESPN_LEAGUE_OR_FEED_UNCONFIRMED"};
 const matched=findEspnFixtureEvent(payload,fixture,{league});
 if(!matched.ok)return matched;
 const {gameId,event}=matched;
 const finalText=String(event.statusName??event.statusDescription??"").toUpperCase();
 // ESPN cup results can reflect extra time or penalties. Betman 1X2 typically
 // settles regulation time; without its distinct 90-minute score, quarantine.
 if(fixture.sport==="축구"&&/PEN|EXTRA|(?:^|_)ET(?:_|$)|AET/.test(finalText))
  return {ok:false,waitReason:"ESPN_EXTRA_TIME_OR_PENALTIES_REQUIRE_REGULATION_SCORE"};
 if(now<fixture.startMs+2*hours||event.completed!==true||
   !/FINAL|FULL.?TIME|FINISH|COMPLETE/.test(finalText))
  return {ok:false,waitReason:"ESPN_FINAL_STATUS_UNCONFIRMED"};
 const h=score(event.competitors.find(c=>c.homeAway==="home")?.score);
 const a=score(event.competitors.find(c=>c.homeAway==="away")?.score);
 if(h===null||a===null)return {ok:false,waitReason:"ESPN_FINAL_SCORE_MISSING"};
 const proof=scorePlausibility(fixture.sport,h,a);
 if(!proof.ok)return {ok:false,waitReason:"ESPN_INVALID_SPORT_SCORE"};
 return {ok:true,finalConfirmed:true,source:"ESPN",
   sourceEvidence:"ESPN_SCOREBOARD_FINAL",gameId,
   result:{homeScore:h,awayScore:a}};
}
export async function lookupEspnFinal(fixture,{
 base,fetchFn=fetch,now=Date.now(),cache=new Map(),timeoutMs=10500
}={}){
 const league=espnLeague(fixture);
 if(!league)return {ok:false,waitReason:"ESPN_LEAGUE_UNSUPPORTED"};
 if(!base)return {ok:false,waitReason:"ESPN_PROXY_BASE_REQUIRED"};
 // Primary ESPN competition-day buckets first. Only on failure inspect the
 // third possible UTC/local day; discovery broadens but identity proof never
 // broadens. Shared URL cache prevents duplicate cross-game requests.
 const primary=espnScoreboardDates(fixture);
 const dates=[...new Set([...primary,
  ...[fixture.startMs-24*hours,fixture.startMs+24*hours].map(dateKey)])];
 const reasons=[];
 let kickoffAudit=null;
 for(const date of new Set(dates)){
  const url=base.replace(/\/+$/,"")+"/api/espn/scoreboard?"+
    new URLSearchParams({league,date});
  let response=cache.get(url);
  if(!response){
   try{
    const res=await fetchFn(url,{cache:"no-store",
      signal:AbortSignal.timeout(timeoutMs)});
    const data=typeof res.json==="function"?await res.json().catch(()=>null):null;
    response=res.ok&&data?.ok===true?{ok:true,payload:data}:
      {ok:false,reason:"ESPN_PROXY_HTTP_"+res.status+":"+String(data?.waitReason??"UNAVAILABLE")};
   }catch(e){response={ok:false,reason:"ESPN_PROXY_NETWORK:"+String(e).slice(0,100)}}
   cache.set(url,response);
  }
  if(!response.ok){reasons.push(response.reason);continue;}
  const evidence=inspectEspnKickoffMismatch(response.payload,fixture,{league});
  if(evidence&&(!kickoffAudit||Math.abs(evidence.deltaMinutes)<Math.abs(kickoffAudit.deltaMinutes)))
   kickoffAudit=evidence;
  const result=parseEspnFinal(response.payload,fixture,{now,league});
  if(result.ok)return {...result,providerErrors:reasons};
  reasons.push(result.waitReason);
  if(["ESPN_AMBIGUOUS_FIXTURE","ESPN_INVALID_SPORT_SCORE"].includes(result.waitReason))break;
 }
 return {ok:false,waitReason:reasons.join(" | ").slice(0,180)||"ESPN_NO_CONFIRMED_FINAL",
  providerErrors:reasons,kickoffAudit};
}
