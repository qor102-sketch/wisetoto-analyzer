import test from "node:test";import assert from "node:assert/strict";
import {selectFinalAuditRows} from "./final-scan-plan.mjs";
const NOW=Date.parse("2026-10-31T09:00:00Z");
const fixture=(id,league,sport="축구",lastResultCheckAt=0)=>({
 key:String(id),sport,league,home:"Team A",away:"Team B",
 startMs:NOW-5*3600000,verdict:"PENDING",
 lastResultCheckAt
});
test("allocates majority of 24 attempts to independently supported final provider and preserves domestic quota",()=>{
 const soccer=Array.from({length:42},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const domestic=Array.from({length:30},(_,i)=>fixture("dom"+i,"K리그3"));
 const rows=selectFinalAuditRows({records:[...domestic,...soccer]},NOW,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(x=>x.key.startsWith("espn")).length,16);
 assert.equal(rows.filter(x=>x.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(x=>x.key)).size,24);
});
test("fills unused supported quota without losing overdue domestics",()=>{
 const domestic=Array.from({length:12},(_,i)=>fixture("dom"+i,"K리그3"));
 const soccer=Array.from({length:3},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 assert.equal(selectFinalAuditRows({records:[...domestic,...soccer]},NOW,24).length,15);
});
test("past fixture retry cooldown, future, already verified and time window are respected",()=>{
 const current=fixture("old","NBA","농구");
 current.lastResultCheckAt=NOW-30*60000;
 const future={...fixture("future","NBA","농구"),startMs:NOW+2*3600000};
 const verified={...fixture("settled","NBA","농구"),verdict:"VERIFIED"};
 const legit=fixture("legit","NBA","농구");
 const rows=selectFinalAuditRows({records:[current,future,verified,legit]},NOW,24);
 assert.deepEqual(rows.map(x=>x.key),["legit"]);
});

test("reserves four independently verifiable KBL games without starving ESPN or healthy domestic audit",()=>{
 const soccer=Array.from({length:42},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const kbl=Array.from({length:10},(_,i)=>fixture("kbl"+i,"KBL","농구"));
 const others=Array.from({length:25},(_,i)=>fixture("dom"+i,"K리그3"));
 const rows=selectFinalAuditRows({records:[...soccer,...others,...kbl]},NOW,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(x=>x.key.startsWith("kbl")).length,4);
 assert.equal(rows.filter(x=>x.key.startsWith("espn")).length,12);
 assert.equal(rows.filter(x=>x.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(x=>x.key)).size,24);
});

test("limits independent KBL and KOVO domestic priority to four and two provider slots",()=>{
 const espn=Array.from({length:35},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const kbl=Array.from({length:10},(_,i)=>fixture("kbl"+i,"KBL","농구"));
 const kovo=Array.from({length:8},(_,i)=>fixture("kovo"+i,i%2?"KOVO 남자":"KOVO 여자","배구"));
 const other=Array.from({length:25},(_,i)=>fixture("dom"+i,"K리그3"));
 const rows=selectFinalAuditRows({records:[...espn,...kbl,...kovo,...other]},NOW,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(r=>r.key.startsWith("kbl")).length,4);
 assert.equal(rows.filter(r=>r.key.startsWith("kovo")).length,2);
 assert.equal(rows.filter(r=>r.key.startsWith("espn")).length,10);
 assert.equal(rows.filter(r=>r.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(r=>r.key)).size,24);
});

test("two official EASL slots are independent of KBL/KOVO/ESPN and NBA never reappears",async()=>{
 const {easlOfficialEntries}=await import("./easl-official-final.mjs");
 const soccer=Array.from({length:35},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const kbl=Array.from({length:10},(_,i)=>fixture("kbl"+i,"KBL","농구"));
 const kovo=Array.from({length:8},(_,i)=>fixture("kovo"+i,i%2?"KOVO 남자":"KOVO 여자","배구"));
 const easl=easlOfficialEntries.map((e,i)=>({
  ...fixture("easl"+i,"동아시아 슈퍼리그","농구"),
  home:e.home,away:e.away,startMs:Date.parse(e.at),lastResultCheckAt:0}));
 const other=Array.from({length:25},(_,i)=>fixture("dom"+i,"K리그3"));
 const selected=selectFinalAuditRows({records:[...soccer,...kbl,...kovo,...easl,...other]},
  Date.parse("2026-11-12T05:00:00Z"),24);
 assert.equal(selected.length,24);
 assert.equal(selected.filter(x=>x.key.startsWith("kbl")).length,4);
 assert.equal(selected.filter(x=>x.key.startsWith("kovo")).length,2);
 assert.equal(selected.filter(x=>x.key.startsWith("easl")).length,2);
 assert.equal(selected.filter(x=>x.key.startsWith("espn")).length,8);
 assert.equal(selected.filter(x=>x.key.startsWith("dom")).length,8);
 assert.equal(selected.some(x=>x.league==="NBA"),false);
});

test("official Levain Cup gets two dedicated postmatch slots while ESPN retains its own source lane",async()=>{
 const {jleagueCupAuditedFixtures}=await import("./jleague-cup-final.mjs");
 const now=Date.parse("2026-11-13T09:00:00Z");
 const soccer=Array.from({length:32},(_,i)=>({
  ...fixture("espn"+i,"잉글랜드 챔피언십"),startMs:now-7*3600000}));
 const cup=jleagueCupAuditedFixtures.map((e,i)=>({
  ...fixture("cup"+i,"일본 리그컵"),
  startMs:Date.parse(e.date+"T"+e.time+":00+09:00"),
  home:e.home,away:e.away,lastResultCheckAt:0}));
 const others=Array.from({length:25},(_,i)=>({
  ...fixture("dom"+i,"K리그3"),startMs:now-7*3600000}));
 const aet={...fixture("nagoya-aet","일본 리그컵"),
  home:"나고야 그램퍼스",away:"우라와 레드",
  startMs:Date.parse("2026-10-28T19:00:00+09:00"),lastResultCheckAt:0};
 const rows=selectFinalAuditRows({records:[...soccer,...cup,...others,aet]},now,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(r=>r.key.startsWith("cup")).length,2);
 assert.equal(rows.some(r=>r.key==="nagoya-aet"),false,"AET excluded without 90-minute source");
 assert.equal(rows.filter(r=>r.key.startsWith("espn")).length,14);
 assert.equal(rows.filter(r=>r.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(r=>r.key)).size,24);
});

test("two audited WKBL dual-proof retries and two official Cup retries do not exhaust ESPN or domestic lanes",async()=>{
 const {auditedWkblGames}=await import("./wkbl-dual-final.mjs");
 const {jleagueCupAuditedFixtures}=await import("./jleague-cup-final.mjs");
 const now=Date.parse("2026-11-13T13:00:00.000Z");
 const wkb=auditedWkblGames.map((e,i)=>({
  ...fixture("wkbl"+i,"WKBL","농구"),
  home:e.home,away:e.away,startMs:Date.parse(e.date+"T"+e.time+":00+09:00"),
  lastResultCheckAt:0,
  checkReason:"NAVER_FAST:NAVER_DIRECT_NETWORK:TimeoutError"}));
 const cup=jleagueCupAuditedFixtures.map((e,i)=>({
  ...fixture("cup"+i,"일본 리그컵"),
  home:e.home,away:e.away,startMs:Date.parse(e.date+"T"+e.time+":00+09:00"),
  lastResultCheckAt:0}));
 const espn=Array.from({length:30},(_,i)=>fixture("espn"+i,"잉글랜드 챔피언십"));
 const naver=Array.from({length:25},(_,i)=>fixture("dom"+i,"네덜란드 FA컵"));
 const rows=selectFinalAuditRows({records:[...espn,...naver,...cup,...wkb]},now,24);
 assert.equal(rows.length,24);
 assert.equal(rows.filter(x=>x.key.startsWith("wkbl")).length,2);
 assert.equal(rows.filter(x=>x.key.startsWith("cup")).length,2);
 assert.equal(rows.filter(x=>x.key.startsWith("espn")).length,12);
 assert.equal(rows.filter(x=>x.key.startsWith("dom")).length,8);
 assert.equal(new Set(rows.map(x=>x.key)).size,24);
 assert.equal(rows.some(x=>x.league==="NBA"),false);
});
