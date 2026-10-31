import test from "node:test";
import assert from "node:assert/strict";
import {parseNaverFinal,lookupNaverScheduleFinal,scheduleUrls,kstDate} from "./naver-fast-final.mjs";
const S=Date.parse("2026-10-28T10:00:00Z"),H=3600000;
const f=(sport="축구")=>({
 key:"example",sport,league:sport==="축구"?"잉글랜드 리그컵":"NBA",
 home:"맨체스터 시티",away:"브라이턴&호브 앨비언",startMs:S,fixtureId:null
});
const game=props=>({
 gameId:"naver-20261028-1",categoryId:"carlingcup",
 gameDateTime:"2026-10-28T19:00:00",
 homeTeamName:"맨체스터시티",awayTeamName:"브라이턴&호브 앨비언",
 statusCode:"RESULT",homeTeamScore:3,awayTeamScore:1,...props
});
const response=games=>({result:{games}});
test("direct Naver schedule exact 3:1 match is independently VERIFIED",()=>{
 const result=parseNaverFinal(response([game()]),f(),{now:S+3*H});
 assert.equal(result.ok,true);
 assert.equal(result.finalConfirmed,true);
 assert.equal(result.source,"NAVER");
 assert.deepEqual(result.result,{homeScore:3,awayScore:1});
 assert.equal(result.gameId,"naver-20261028-1");
});
test("time is parsed in Asia/Seoul, not GitHub UTC; fixture dates matter",()=>{
 assert.equal(kstDate(S),"2026-10-28");
 assert.equal(parseNaverFinal(response([game({gameDateTime:"2026-10-28T22:00:00"})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({gameDateTime:"2026-10-29T19:00:00"})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({gameDateTime:"2026-10-28T10:00:00Z"})]),f(),{now:S+4*H}).ok,true);
 assert.equal(parseNaverFinal(response([game()]),f(),{now:S+H}).waitReason,"NAVER_TOO_EARLY");
});
test("no score without proof of FINAL (live or scheduled or cancelled cannot verify)",()=>{
 for(const status of ["경기중","SCHEDULED","LIVE","HT"]){
  assert.equal(parseNaverFinal(response([game({statusCode:status})]),f(),{now:S+4*H}).ok,false);
 }
 assert.equal(parseNaverFinal(response([game({cancelled:true})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({postponed:true})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({statusCode:"RESULT",homeTeamScore:null,homeScore:null})]),f(),{now:S+4*H}).ok,false);
});
test("wrong teams, home/away swap, wrong competition and duplicate candidates fail closed",()=>{
 const g=game();
 assert.equal(parseNaverFinal(response([game({awayTeamName:"AFC 본머스"})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({homeTeamName:g.awayTeamName,awayTeamName:g.homeTeamName})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([game({categoryId:"epl"})]),f(),{now:S+4*H}).ok,false);
 assert.equal(parseNaverFinal(response([g,game({gameId:"second"})]),f(),{now:S+4*H}).waitReason,"NAVER_AMBIGUOUS_FIXTURE");
});
test("Naver baseball scores must satisfy sport rules; incomplete and invalid scores never promote",()=>{
 const baseball={...f("야구"),home:"소프트뱅크 호크스",away:"요코하마 DeNA 베이스타스",league:"NPB"};
 const g=game({gameId:"20261028B1",categoryId:"npb",homeTeamName:"소프트뱅크",awayTeamName:"요코하마 DeNA 베이스타스",
  homeScore:5,awayScore:3,homeTeamScore:null,awayTeamScore:null});
 assert.equal(parseNaverFinal(response([g]),baseball,{now:S+4*H}).ok,true);
 assert.equal(parseNaverFinal(response([ {...g,homeScore:-1} ]),baseball,{now:S+4*H}).ok,false);
});
test("day and category scoped schedule calls share one network request across 6 finals",async()=>{
 const requests=[],cache=new Map(),payload=response([game()]);
 const fetchFn=async url=>{requests.push(url);return {ok:true,status:200,json:async()=>payload}};
 for(let i=0;i<6;i++){
  const v=await lookupNaverScheduleFinal({...f(),key:"match"+i},{fetchFn,cache,now:S+4*H});
  assert.equal(v.ok,true);
 }
 assert.equal(requests.length,1);
 assert.equal(cache.size,1);
 assert.match(requests[0],/api-gw\.sports\.naver\.com\/schedule\/games/);
 assert.match(requests[0],/fromDate=2026-10-28/);
 assert.equal(scheduleUrls(f()).length,2);
});
test("429, network failures, empty schedule and non-final statuses remain PENDING with reasons",async()=>{
 const a=await lookupNaverScheduleFinal(f(),{
  fetchFn:async()=>({ok:false,status:429}),now:S+4*H});
 assert.equal(a.ok,false);assert.match(a.waitReason,/429/);
 const b=await lookupNaverScheduleFinal(f(),{
  fetchFn:async()=>{throw new Error("provider offline")},now:S+4*H});
 assert.equal(b.ok,false);assert.match(b.waitReason,/NETWORK/);
 const c=await lookupNaverScheduleFinal(f(),{
  fetchFn:async()=>({ok:true,json:async()=>({result:{games:[]}})}),now:S+4*H});
 assert.equal(c.ok,false);assert.match(c.waitReason,/EXACT_FIXTURE_NOT_FOUND/);
});
test("NBA game requires consistent category, exact away/home and plausible final points",()=>{
 const nba={...f("농구"),home:"LA 레이커스",away:"포틀랜드 트레일블레이저스"};
 const g=game({categoryId:"nba",homeTeamName:"레이커스",
   awayTeamName:"포틀랜드 트레일블레이저스",homeScore:null,awayScore:null,homeTeamScore:109,awayTeamScore:104});
 assert.equal(parseNaverFinal(response([g]),nba,{now:S+4*H}).ok,true);
 assert.equal(parseNaverFinal(response([{...g,categoryId:"kbl"}]),nba,{now:S+4*H}).ok,false);
});

test("production collector requests a fixed lightweight Vercel proxy, not Naver or lineup",async()=>{
 const requested=[],cache=new Map();
 const fetchFn=async url=>{
  requested.push(url);
  assert.match(url,/^https:\/\/wisetoto-analyzer\.vercel\.app\/api\/naver\/final\?/);
  assert.match(url,/upperCategoryId=wfootball/);
  assert.match(url,/date=2026-10-28/);
  assert.doesNotMatch(url,/lineup|players|api-gw/);
  return {ok:true,status:200,json:async()=>({ok:true,result:{games:[game()]}})};
 };
 for(let i=0;i<3;i++){
  const result=await lookupNaverScheduleFinal(f(),{
   base:"https://wisetoto-analyzer.vercel.app",fetchFn,cache,now:S+4*H});
  assert.equal(result.ok,true);
 }
 assert.equal(requested.length,1);
 assert.equal(cache.size,1);
});
test("Vercel proxy errors never certify a final, even if HTTP 200 has ok:false",async()=>{
 const result=await lookupNaverScheduleFinal(f(),{
  base:"https://wisetoto-analyzer.vercel.app",now:S+4*H,
  fetchFn:async()=>({ok:true,status:200,json:async()=>({ok:false,waitReason:"NAVER_PROVIDER_OFFLINE"})})});
 assert.equal(result.ok,false);
 assert.match(result.waitReason,/NAVER_PROVIDER_OFFLINE/);
});

test("Vercel 504 falls back only to official raw Naver schedule and still requires unique confirmed FINAL",async()=>{
 const urls=[],cache=new Map();
 const directGame=game();
 const fetchFn=async url=>{
  urls.push(url);
  if(url.startsWith("https://wisetoto-analyzer.vercel.app/api/naver/final?"))
   return {ok:false,status:504,json:async()=>({ok:false,waitReason:"NAVER_PROVIDER_NETWORK:TimeoutError"})};
  assert.match(url,/^https:\/\/api-gw\.sports\.naver\.com\/schedule\/games\?/);
  return {ok:true,status:200,json:async()=>({result:{games:[directGame]}})};
 };
 const fixture=f();
 const result=await lookupNaverScheduleFinal(fixture,{
  base:"https://wisetoto-analyzer.vercel.app",fetchFn,now:S+4*H,cache});
 assert.equal(result.ok,true);
 assert.equal(result.source,"NAVER");
 assert.equal(result.finalConfirmed,true);
 assert.ok(result.providerErrors.some(x=>/504/.test(x)));
 assert.equal(urls.length,2);
 const same=await lookupNaverScheduleFinal(fixture,{
  base:"https://wisetoto-analyzer.vercel.app",fetchFn,now:S+4*H,cache});
 assert.equal(same.ok,true);assert.equal(urls.length,2,"both transport attempts are shared per scan");
});
test("direct fallback cannot convert unfinished, wrong-identity or invalid provider payload into VERIFIED",async()=>{
 const fixture=f();
 for(const games of [[{...game(),completed:false,statusCode:"LIVE"}],
  [{...game(),homeTeamName:"Wrong Team"}],[]]){
  const out=await lookupNaverScheduleFinal(fixture,{
   base:"https://wisetoto-analyzer.vercel.app",now:S+4*H,
   fetchFn:async url=>url.includes("/api/naver/final?")?
    {ok:false,status:502,json:async()=>({ok:false,waitReason:"UPSTREAM_502"})}:
    {ok:true,status:200,json:async()=>({result:{games}})}
  });
  assert.equal(out.ok,false);
 }
 const corrupt=await lookupNaverScheduleFinal(fixture,{
  base:"https://wisetoto-analyzer.vercel.app",now:S+4*H,
  fetchFn:async url=>url.includes("/api/naver/final?")?
   {ok:false,status:504,json:async()=>({ok:false})}:
   {ok:true,status:200,json:async()=>({message:"not a schedule",ok:true})}
 });
 assert.equal(corrupt.ok,false);
 assert.match(corrupt.waitReason,/INVALID_SCHEDULE/);
});
test("successful primary proxy never makes an unnecessary direct Naver request",async()=>{
 let requests=0;
 const result=await lookupNaverScheduleFinal(f(),{
  base:"https://wisetoto-analyzer.vercel.app",now:S+4*H,
  fetchFn:async url=>{
   requests++;
   assert.match(url,/\/api\/naver\/final\?/);
   return {ok:true,status:200,json:async()=>({ok:true,result:{games:[game()]}})};
  }
 });
 assert.equal(result.ok,true);assert.equal(requests,1);
});
