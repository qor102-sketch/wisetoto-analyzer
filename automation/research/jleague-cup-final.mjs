// Official J.LEAGUE Levain Cup match-detail source, independent of Naver.
// Only original league + both teams + source numeric match ID + kickoff +
// explicit full-time and exact regulation score may verify a fixture.
// The 2026-10-28 Nagoya v Urawa 1-2 AET is deliberately EXCLUDED:
// betting-regulation score is not independently exposed by this adapter.
import {scorePlausibility} from "../../WisetotoAnalyzer-LiveFree/src/lib/postmatch-guards.mjs";
const BASE="https://www.jleague.jp";
const JST=9*3600000,MIN=60000;
const norm=s=>String(s??"").normalize("NFKC").toLowerCase()
 .replace(/[^a-z0-9가-힣一-龯ぁ-んァ-ヶ]/g,"");
const AUDITED=[
 {id:"111101",date:"2026-11-11",time:"19:00",home:"비셀 고베",
  away:"FC마치다 젤비아",jpHome:"ヴィッセル神戸",jpAway:"ＦＣ町田ゼルビア",score:[0,1]},
 {id:"111102",date:"2026-11-11",time:"19:30",home:"우라와 레드",
  away:"세레소 오사카",jpHome:"浦和レッズ",jpAway:"セレッソ大阪",score:[2,0]},
 {id:"111103",date:"2026-11-11",time:"19:00",home:"요코하마 F마리노스",
  away:"가시마 앤틀러스",jpHome:"横浜Ｆ・マリノス",jpAway:"鹿島アントラーズ",score:[2,3]},
 {id:"111104",date:"2026-11-11",time:"19:00",home:"가와사키 프론탈레",
  away:"가시와 레이솔",jpHome:"川崎フロンターレ",jpAway:"柏レイソル",score:[1,2]},
 {id:"102801",date:"2026-10-28",time:"19:00",home:"요코하마 F마리노스",
  away:"산프레체 히로시마",jpHome:"横浜Ｆ・マリノス",
  jpAway:"サンフレッチェ広島",score:[4,3]},
 {id:"102803",date:"2026-10-28",time:"19:00",home:"사간 도스",
  away:"가와사키 프론탈레",jpHome:"サガン鳥栖",
  jpAway:"川崎フロンターレ",score:[0,2]},
 {id:"102804",date:"2026-10-28",time:"19:00",home:"미토 홀리호크",
  away:"세레소 오사카",jpHome:"水戸ホーリーホック",
  jpAway:"セレッソ大阪",score:[1,3]}
];
export const jleagueCupAuditedFixtures=AUDITED.map(x=>Object.freeze({...x,score:[...x.score]}));
export const isJleagueCupFixture=r=>r?.sport==="축구"&&
 /^(?:일본\s*리그컵|j리그컵|jleaguecup|levaincup)$/i.test(String(r.league??"").trim());
const entryFor=r=>{
 if(!isJleagueCupFixture(r)||!Number.isFinite(r.startMs))return null;
 const matched=AUDITED.filter(x=>norm(x.home)===norm(r.home)&&norm(x.away)===norm(r.away)&&
  Math.abs(r.startMs-Date.parse(x.date+"T"+x.time+":00+09:00"))<=20*MIN);
 return matched.length===1?matched[0]:null;
};
// 2026-10-28 Nagoya 1-2 Urawa is explicitly marked 延長 (after
// extra time) by J.LEAGUE. No audited regulation score has been obtained.
// Do NOT let a generic finished score from Naver masquerade as regulation.
export const isJleagueCupExtraTimeUnsettleable=r=>isJleagueCupFixture(r)&&
 norm(r.home)===norm("나고야 그램퍼스")&&norm(r.away)===norm("우라와 레드")&&
 Number.isFinite(r.startMs)&&
 Math.abs(r.startMs-Date.parse("2026-10-28T19:00:00+09:00"))<=20*MIN;
export const hasAuditedJleagueCupFixture=r=>Boolean(entryFor(r));
export const officialJleagueCupUrl=r=>{
 const e=entryFor(r);
 return e?BASE+"/match/leaguecup/2026/"+e.id+"/":null;
};
const visible=html=>String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
 .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
 .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ")
 .replace(/&amp;/gi,"&").replace(/\s+/g," ").normalize("NFKC");
export function parseJleagueCupFinal(html,fixture,{now=Date.now()}={}){
 const e=entryFor(fixture);
 if(!e)return {ok:false,waitReason:"JLEAGUE_CUP_NO_AUDITED_REGULATION_FIXTURE"};
 if(now<fixture.startMs+150*MIN)
  return {ok:false,waitReason:"JLEAGUE_CUP_TOO_EARLY"};
 if(typeof html!=="string"||html.length<300||html.length>2_500_000)
  return {ok:false,waitReason:"JLEAGUE_CUP_BAD_SOURCE_DOCUMENT"};
 const title=html.match(/<title[^>]*>([^<]{10,500})<\/title>/i)?.[1]??"";
 if(!/ルヴァンカップ/.test(title)||!/試合結果/.test(title)||
    !title.includes(Number(e.date.slice(5,7))+"月"+Number(e.date.slice(8))+"日"))
  return {ok:false,waitReason:"JLEAGUE_CUP_LEAGUE_OR_DATE_UNCONFIRMED"};
 const text=visible(html),dateText=e.date.replace(/-/g,"/");
 const at=text.indexOf(dateText);
 if(at<0)return {ok:false,waitReason:"JLEAGUE_CUP_SOURCE_KICKOFF_UNCONFIRMED"};
 const before=text.slice(Math.max(0,at-160),at);
 // The fixture hero's source team pairing must precede this exact calendar date.
 if(!norm(before).includes(norm(e.jpHome+"vs"+e.jpAway)))
  return {ok:false,waitReason:"JLEAGUE_CUP_SOURCE_PAIR_UNCONFIRMED"};
 const head=text.slice(at,at+440);
 const kickoff=head.match(/^(\d{4}\/\d\d\/\d\d)\s*\([^)]+\)\s*(\d{1,2}:\d{2})\s*KO/);
 if(!kickoff||kickoff[1]!==dateText)
  return {ok:false,waitReason:"JLEAGUE_CUP_SOURCE_KICKOFF_UNCONFIRMED"};
 const sourceMs=Date.parse(e.date+"T"+kickoff[2]+":00+09:00");
 if(!Number.isFinite(sourceMs)||Math.abs(sourceMs-fixture.startMs)>20*MIN)
  return {ok:false,waitReason:"JLEAGUE_CUP_KICKOFF_MISMATCH"};
 const statusAt=head.indexOf("試合終了");
 const leading=statusAt<0?"":head.slice(0,statusAt);
 if(statusAt<20||statusAt>185||!norm(leading).includes(norm(e.jpHome)))
  return {ok:false,waitReason:"JLEAGUE_CUP_FINAL_STATUS_OR_HOME_UNCONFIRMED"};
 const score=head.slice(statusAt+"試合終了".length)
  .match(/^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*(.{0,100})/);
 if(!score)return {ok:false,waitReason:"JLEAGUE_CUP_FINAL_SCORE_MISSING"};
 const tail=String(score[3]).trim();
 // AET/penalty output is not the 90-minute regulation betting result.
 if(/^(?:延長|PK|ＰＫ|AET|PEN)/i.test(tail))
  return {ok:false,waitReason:"JLEAGUE_CUP_EXTRA_TIME_REQUIRES_REGULATION_SCORE"};
 if(!norm(tail).startsWith(norm(e.jpAway)))
  return {ok:false,waitReason:"JLEAGUE_CUP_SOURCE_AWAY_UNCONFIRMED"};
 const home=Number(score[1]),away=Number(score[2]);
 if(home!==e.score[0]||away!==e.score[1]||
   !scorePlausibility("축구",home,away).ok)
  return {ok:false,waitReason:"JLEAGUE_CUP_UNAUDITED_OR_INVALID_SCORE"};
 if(!/^\d{6}$/.test(e.id)||e.id.slice(0,4)!==e.date.slice(5,7)+e.date.slice(8))
  return {ok:false,waitReason:"JLEAGUE_CUP_INVALID_SOURCE_EVENT_ID"};
 return {ok:true,finalConfirmed:true,source:"JLEAGUE",gameId:e.id,
  sourceEvidence:"JLEAGUE_CUP_OFFICIAL_REGULATION_FINAL",
  result:{homeScore:home,awayScore:away}};
}
export async function lookupOfficialJleagueCupFinal(fixture,{
 fetchFn=fetch,cache=new Map(),now=Date.now(),timeoutMs=12000
}={}){
 const url=officialJleagueCupUrl(fixture);
 if(!url)return {ok:false,waitReason:"JLEAGUE_CUP_NO_AUDITED_REGULATION_FIXTURE"};
 let data=cache.get(url);
 if(!data){
  try{
   const res=await fetchFn(url,{cache:"no-store",redirect:"error",
    signal:AbortSignal.timeout(timeoutMs),headers:{
     accept:"text/html","user-agent":"Mozilla/5.0 (Wisetoto independent official final verifier)"}});
   const html=res.ok?await res.text():"";
   data=res.ok&&html.length>=300?{ok:true,html}:
     {ok:false,reason:"JLEAGUE_CUP_HTTP_"+res.status};
  }catch(e){data={ok:false,reason:"JLEAGUE_CUP_NETWORK:"+String(e).slice(0,90)}}
  cache.set(url,data);
 }
 if(!data.ok)return {ok:false,waitReason:data.reason};
 return parseJleagueCupFinal(data.html,fixture,{now});
}
