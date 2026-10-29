// Independent ESPN verified-score fallback. NEVER grades raw/live results:
// league, two teams, kickoff, unique ESPN event, FINAL and score must all match.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const norm=x=>String(x??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
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
 ["필라델피아유니언","philadelphiaunion"],["fc댈러스","댈러스","fcdallas"],
 ["콜럼버스크루","columbuscrew"],["포틀랜드팀버스","portlandtimbers"],
 ["la레이커스","레이커스","lalakers","losangeleslakers"],
 ["포틀랜드트레일블레이저스","포틀랜드트레일블레이저즈","portlandtrailblazers","trailblazers"],
 ["la클리퍼스","클리퍼스","laclippers","losangelesclippers"],
 ["새크라멘토킹스","새크라멘토","sacramentokings"],
 ["마이애미히트","miamiheat"],["애틀랜타호크스","atlantahawks"],
 ["골든스테이트워리어스","골든스테이트","goldenstatewarriors"],
 ["보스턴셀틱스","bostonceltics"],["뉴욕닉스","newyorkknicks"],
 ["시카고불스","chicagobulls"],["클리블랜드캐벌리어스","clevelandcavaliers"],
 ["휴스턴로키츠","houstonrockets"],["댈러스매버릭스","dallasmavericks"],
 ["덴버너기츠","denvernuggets"],["피닉스선스","phoenixsuns"],
 ["오클라호마시티썬더","oklahomacitythunder"],
 ["샌안토니오스퍼스","sanantoniospurs"],["밀워키벅스","milwaukeebucks"],
 ["올랜도매직","orlandomagic"],["토론토랩터스","torontoraptors"],
 ["필라델피아세븐티식서스","필라델피아76ers","philadelphia76ers"],
 ["미네소타팀버울브스","minnesotatimberwolves"],["디트로이트피스턴스","detroitpistons"],
 ["인디애나페이서스","indianapacers"],["유타재즈","utahjazz"],
 ["멤피스그리즐리스","memphisgrizzlies"],["브루클린네츠","brooklynnets"],
 ["뉴올리언스펠리컨스","neworleanspelicans"],["샬럿호네츠","charlottehornets"],
 ["워싱턴위저즈","washingtonwizards"],
 ["뉴욕양키스","newyorkyankees"],["보스턴레드삭스","bostonredsox"],
 ["la다저스","로스앤젤레스다저스","losangelesdodgers"],["시카고컵스","chicagocubs"]
].map(group=>group.map(norm));
function teamEq(a,b){
 const x=norm(a),y=norm(b);
 if(!x||!y)return false;
 if(x===y)return true;
 return aliases.some(group=>group.includes(x)&&group.includes(y));
}
export function espnLeague(fixture){
 const l=norm(fixture.league);
 if(fixture.sport==="농구")return /nba|미프로농구|미국프로농구/.test(l)?"nba":null;
 if(fixture.sport==="야구")return /mlb|미국프로야구|메이저리그/.test(l)?"mlb":null;
 if(fixture.sport!=="축구")return null;
 if(/세리에a|세리에아|seriea/.test(l))return "ita.1";
 if(/잉글랜드리그컵|카라바오컵|eflcup/.test(l))return "eng.league_cup";
 if(/프리미어리그|epl|englishpremier/.test(l))return "eng.1";
 if(/스페인라리가|laliga|라리가/.test(l))return "esp.1";
 if(/독일분데스|bundesliga/.test(l))return "ger.1";
 if(/프랑스리그1|ligue1/.test(l))return "fra.1";
 if(/미국메이저리그사커|mls|미국프로축구/.test(l))return "usa.1";
 if(/네덜란드에레디비시|eredivisie/.test(l))return "ned.1";
 if(/uefa챔피언스|유럽챔피언스리그/.test(l))return "uefa.champions";
 if(/유로파리그|uefa유로파/.test(l))return "uefa.europa";
 return null;
}
const dateKey=ms=>new Date(ms).toISOString().slice(0,10).replace(/-/g,"");
const hours=3600000;
const score=x=>{
 if(x===null||x===undefined||String(x).trim()==="")return null;
 const n=Number(x);return Number.isSafeInteger(n)&&n>=0?n:null;
};
export function parseEspnFinal(payload,fixture,{now=Date.now(),league=espnLeague(fixture)}={}){
 if(!league||payload?.ok!==true||payload.league!==league||!Array.isArray(payload.events))
  return {ok:false,waitReason:"ESPN_LEAGUE_OR_FEED_UNCONFIRMED"};
 const events=payload.events.filter(e=>{
  const ms=Date.parse(String(e?.date??""));
  if(!Number.isFinite(ms)||Math.abs(ms-fixture.startMs)>2*hours)return false;
  const home=e?.competitors?.find(c=>c.homeAway==="home");
  const away=e?.competitors?.find(c=>c.homeAway==="away");
  return home&&away&&
    teamEq(fixture.home,home.name)&&teamEq(fixture.away,away.name);
 });
 const matched=new Map(events.filter(e=>/^\d+$/.test(String(e?.id??""))).map(e=>[String(e.id),e]));
 if(matched.size===0)return {ok:false,waitReason:"ESPN_EXACT_IDENTITY_NOT_PROVEN"};
 if(matched.size!==1)return {ok:false,waitReason:"ESPN_AMBIGUOUS_FIXTURE"};
 const [gameId,event]=[...matched.entries()][0];
 const finalText=String(event.statusName??event.statusDescription??"").toUpperCase();
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
 // North American scoreboards can bucket games by local prior calendar date.
 const dates=[dateKey(fixture.startMs)];
 if(["nba","mlb","usa.1"].includes(league))dates.push(dateKey(fixture.startMs-12*hours));
 const reasons=[];
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
  const result=parseEspnFinal(response.payload,fixture,{now,league});
  if(result.ok)return {...result,providerErrors:reasons};
  reasons.push(result.waitReason);
  if(["ESPN_AMBIGUOUS_FIXTURE","ESPN_INVALID_SPORT_SCORE"].includes(result.waitReason))break;
 }
 return {ok:false,waitReason:reasons.join(" | ").slice(0,180)||"ESPN_NO_CONFIRMED_FINAL",
  providerErrors:reasons};
}
