// EASL's independent OFFICIAL fixture page + postmatch victory recap.
// Limited to six source-audited 2026/27 games. Every result is re-proven
// from the genuine official source; scheduled games or published previews
// are NEVER sufficient to mark any Betman fixture VERIFIED.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const BASE="https://www.easl.basketball";
const HOUR=3600000;
const normalize=s=>String(s??"").normalize("NFKC").toLowerCase()
 .replace(/[^\p{Letter}\p{Number}]+/gu," ").trim().replace(/\s+/g," ");
const key=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
const entries=[
 {at:"2026-11-11T10:10:00.000Z",
  home:"부산KCC 이지스",away:"타이베이 푸본브레이브스",
  officialHome:"Busan KCC Egis",officialAway:"Taipei Fubon Braves",
  schedule:"busankccegisvstaipeifubonbraves-nov112026071000pm",
  recap:"game-recap-busan-kcc-egis-exerts-dominance-topple-taipei-fubon-braves",
  decisive:"defeated the Taipei Fubon Braves, 88-80",
  homeScore:88,awayScore:80},
 {at:"2026-11-05T10:10:00.000Z",
  home:"부산KCC 이지스",away:"마카오 호우촌",
  officialHome:"Busan KCC Egis",officialAway:"Macau Hou Chon",
  schedule:"busankccegisvsmacauhouchon-nov52026071000pm",
  recap:"game-recap-busan-kcc-dominates-with-wire-to-wire-win-over-macau-hou-chon",
  decisive:"downed the visiting Macau Hou Chon, 108-94",
  homeScore:108,awayScore:94},
 {at:"2026-11-04T11:10:00.000Z",
  home:"TSG 고스트호크스",away:"알바르크 도쿄",
  officialHome:"TSG Ghosthawks",officialAway:"Alvark Tokyo",
  schedule:"tsgghosthawksvsalvarktokyo-nov42026071000pm",
  recap:"game-recap-tsg-ghosthawks-defend-homecourt-with-thrilling-win-over-alvark-tokyo",
  decisive:"the TSG GhostHawks did the same against Alvark Tokyo, as they emerged with a 90-85 win",
  homeScore:90,awayScore:85},
 {at:"2026-11-04T10:40:00.000Z",
  home:"류큐 골든킹스",away:"홍콩 이스턴",
  officialHome:"Ryukyu Golden Kings",officialAway:"Hong Kong Eastern",
  schedule:"ryukyugoldenkingsvshongkongeastern-nov42026074000pm",
  recap:"game-recap-hong-kong-eastern-earn-first-easl-victory-over-ryukyu-golden-kings",
  decisive:"Hong Kong Eastern won a decisive victory over Ryukyu Golden Kings, 104-96",
  homeScore:96,awayScore:104},
 {at:"2026-10-28T12:10:00.000Z",
  home:"마카오 호우촌",away:"나가사키 벨카",
  officialHome:"Macau Hou Chon",officialAway:"Nagasaki Velca",
  schedule:"macauhouchonvsnagasakivelca-oct282026081000pm",
  recap:"game-recap-nagasaki-velca-pulls-ahead-of-macau-hou-chon-for-first-easl-win",
  decisive:"they won on the road versus Macau Hou Chon, 97-76",
  homeScore:76,awayScore:97},
 {at:"2026-10-28T11:10:00.000Z",
  home:"타오위안 파우이안 파일러츠",away:"류큐 골든킹스",
  officialHome:"Taoyuan Pauian Pilots",officialAway:"Ryukyu Golden Kings",
  schedule:"taoyuanpauianpilotsvsryukyugoldenkings-oct282026071000pm",
  recap:"Ryukyu Golden Kings emerged victorious on the road, winning in impressive fashion over the Taoyuan Pauian Pilots, 103-97",
  recapSlug:"game-recap-ryukyu-golden-kings-shine-bright-over-taoyuan-pauian-pilots-in-first-win-of-easl-season",
  homeScore:97,awayScore:103}
];
export const easlOfficialEntries=entries.map(x=>Object.freeze({...x}));
export const isOfficialEaslFixture=r=>r?.sport==="농구"&&
 /^(?:동아시아\s*슈퍼리그|EASL)$/i.test(String(r?.league??"").trim());
const exactEntry=fixture=>{
 if(!isOfficialEaslFixture(fixture)||!Number.isFinite(fixture.startMs))return null;
 const found=entries.filter(e=>key(fixture.home)===key(e.home)&&
  key(fixture.away)===key(e.away)&&
  Math.abs(fixture.startMs-Date.parse(e.at))<=5*60000);
 return found.length===1?found[0]:null;
};
const decorate=s=>String(s??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
 .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
 .replace(/<img\b[^>]*>/gi," ");
const proofSchedule=(html,entry)=>{
 if(typeof html!=="string"||html.length<100)return false;
 const doc=decorate(html);
 const path="/schedules/"+entry.schedule;
 const rx=/href=["']([^"']+)["']/gi;
 const blocks=[];
 for(const link of doc.matchAll(rx)){
  const href=String(link[1]).split("?")[0];
  if(href!==path&&href!==BASE+path)continue;
  const around=doc.slice(Math.max(0,link.index-1800),link.index+180);
  if(!around.includes(entry.at.slice(0,19)))continue;
  const plain=normalize(around.replace(/<[^>]*>/g," "));
  if(!plain.includes(normalize(entry.officialHome))||
     !plain.includes(normalize(entry.officialAway)))continue;
  blocks.push(link.index);
 }
 return blocks.length===1;
};
const proofRecap=(html,entry)=>{
 if(typeof html!=="string"||html.length<100)return false;
 if(!/game recap/i.test(html)||!/EASL/i.test(html))return false;
 const text=decorate(html).replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
  .replace(/&amp;/gi,"&").replace(/&ndash;|&#8211;/gi,"-");
 const where=text.toLowerCase().indexOf("what happened");
 if(where<0)return false;
 const intro=normalize(text.slice(where,where+1200));
 // Verify BOTH team names plus the explicit decisive winning score from
 // this exact recap, not a preview, mid-game scoreboard, or other recap.
 return intro.includes(normalize(entry.officialHome))&&
  intro.includes(normalize(entry.officialAway))&&
  intro.includes(normalize(entry.decisive));
};
export function parseOfficialEaslFinal(scheduleHtml,recapHtml,fixture,{
 now=Date.now()
}={}){
 const entry=exactEntry(fixture);
 if(!entry)return {ok:false,waitReason:"EASL_NO_AUDITED_EXACT_FIXTURE"};
 if(now<fixture.startMs+165*60000)
  return {ok:false,waitReason:"EASL_TOO_EARLY"};
 if(!proofSchedule(scheduleHtml,entry))
  return {ok:false,waitReason:"EASL_SCHEDULE_IDENTITY_UNCONFIRMED"};
 if(!proofRecap(recapHtml,entry))
  return {ok:false,waitReason:"EASL_RECAP_FINAL_UNCONFIRMED"};
 const v=scorePlausibility("농구",entry.homeScore,entry.awayScore);
 if(!v.ok||entry.homeScore===entry.awayScore)
  return {ok:false,waitReason:"EASL_INVALID_OFFICIAL_SCORE"};
 return {ok:true,finalConfirmed:true,source:"EASL",
  gameId:"/schedules/"+entry.schedule,
  sourceEvidence:"EASL_OFFICIAL_FIXTURE_AND_DECISIVE_RECAP",
  result:{homeScore:entry.homeScore,awayScore:entry.awayScore}};
}
export async function lookupOfficialEaslFinal(fixture,{
 fetchFn=fetch,cache=new Map(),timeoutMs=11000,now=Date.now()
}={}){
 const e=exactEntry(fixture);
 if(!e)return {ok:false,waitReason:"EASL_NO_AUDITED_EXACT_FIXTURE"};
 const urls=[BASE+"/schedule-results",BASE+"/news/"+(e.recapSlug??e.recap)];
 const documents=[];
 for(const url of urls){
  let current=cache.get(url);
  if(!current){
   try{
    const res=await fetchFn(url,{cache:"no-store",
     signal:AbortSignal.timeout(timeoutMs),
     headers:{accept:"text/html","user-agent":"Mozilla/5.0 SourceAudit/1.0"}});
    const data=res.ok?await res.text().catch(()=>""):"";
    current=res.ok&&data.length>100?{ok:true,data}:
      {ok:false,reason:"EASL_SOURCE_HTTP_"+res.status};
   }catch(err){current={ok:false,reason:"EASL_SOURCE_NETWORK:"+String(err).slice(0,85)}}
   cache.set(url,current);
  }
  if(!current.ok)return {ok:false,waitReason:current.reason};
  documents.push(current.data);
 }
 return parseOfficialEaslFinal(documents[0],documents[1],fixture,{now});
}
