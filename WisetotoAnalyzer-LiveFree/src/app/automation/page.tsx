"use client";
import {useEffect,useMemo,useState} from "react";
import "./dashboard.css";
type Pick={key:string;market:string;pick:string;probability:number|null;odds:number|null;expectedValue:number|null;edge:number|null;grade:string;score:number|null;resultStatus:string;actualLabel:string|null;resultNote:string|null};
type Match={id:string;sport:string;league:string;home:string;away:string;startMs:number;capturedAt:number;status:string;verifiedAt:number|null;decision:string;result:{homeScore:number|null;awayScore:number|null;source:string}|null;pre:{expectedHome:number|null;expectedAway:number|null;homeRecentSample:number|null;awayRecentSample:number|null;homeVenueSample:number|null;awayVenueSample:number|null}|null;courtPre:{expectedHome:number|null;expectedAway:number|null;homeRecentSample:number|null;awayRecentSample:number|null;homeVenueSample:number|null;awayVenueSample:number|null}|null;lineup:{stage:string;capturedAt:number|null}|null;top1:Pick|null;markets:Pick[];warnings:string[];verifyWaitReason?:string|null;verifyLastCheckedAt?:number|null};
type ScanHealth={schema:string;scannedAt:string;expectedIntervalMinutes:number;sourceOk:boolean;sourceError:string|null;feedSports:Record<string,number>;eligibleForPregame:number;awaitingPostmatch:number;feedOrigin:string};
type EvidencePick={side:string;label:string;odds:number;marketProbability:number;openProbability:number;shift:number;marketHold:number;asOf:number};
type EvidenceRow={id:string;sport:string;league:string;home:string;away:string;startMs:number;firstSeenAt:number;lastSeenAt:number;observations:number;stage:string;reason:string;top1:EvidencePick|null;calibration:{samples:number;qualified:boolean;probability?:number;conservativeEV?:number}|null};
type ResearchEvidence={generatedAt:string;counts:{future:number;observed:number;researchTop1:number;insufficient:number};records:EvidenceRow[]};
type CollectedRow={key:string;sport:string;league:string;home:string;away:string;startMs:number;firstSeenAt:number;pregameCapturedAt:number|null;firstOddsAt?:number|null;latestOddsAt?:number|null;seenCount:number;oddsCount:number;resultChecks?:number;resultErrors?:Array<{at:number;reasons:string[]}>;captureIssue?:string|null;verdict:string;final:{homeScore:number;awayScore:number}|null;checkReason:string|null};
type CollectedLedger={generatedAt:string;source?:{lastFeedAt:number|null;ok:boolean;error:string|null;lastCaptureSummary?:{listed:number;window:number;new:number;noOdds:number;missingIdentity:number;missedWindow:number;watchlistMissing?:number;delayedScan?:boolean;sinceLastScanMs?:number|null}|null};counts:{collected:number;verified:number;pending:number;pregameCaptured:number;verifiedWithPregame:number;resultOnly:number;missingFixtureId:number};records:CollectedRow[]};
type History={scanHealth?:ScanHealth|null;schema:string;publishedAt:string;lastRunAt:number|null;source:string;counts:{total:number;pending:number;verified:number;review?:number;void:number;hit:number;miss:number;warnings:number;overdue?:number};records:Match[]};
function date(ms:number|null|undefined){return typeof ms==="number"&&Number.isFinite(ms)?new Date(ms).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"—";}
function num(v:number|null|undefined,d=1){return typeof v==="number"&&Number.isFinite(v)?v.toFixed(d):"—";}
function stateText(r:Match){if(r.status==="VOID")return "취소 / 무효";if(r.status==="REVIEW_REQUIRED")return "검증 오류 · 재검토";if(r.status==="VERIFIED")return "결과 검증 완료";return Date.now()<r.startMs?"경기 전 PRE 잠금":Date.now()-r.startMs>6*60*60_000?"결과 확인 지연":"종료 결과 검증 대기";}
function pickText(p:Pick|null){if(!p)return "PASS";if(p.resultStatus==="HIT")return "적중";if(p.resultStatus==="MISS")return "미적중";if(p.resultStatus==="VOID")return "무효";return "검증 대기";}
function statusClass(t:string){return t==="HIT"||t==="VERIFIED"?"good":t==="MISS"||t==="VOID"||t==="REVIEW_REQUIRED"?"bad":"neutral";}
export default function AutomationDashboard(){
 const [data,setData]=useState<History|null>(null);
 const [loading,setLoading]=useState(true);
 const [evidence,setEvidence]=useState<ResearchEvidence|null>(null);
 const [collection,setCollection]=useState<CollectedLedger|null>(null);
 const [collectionError,setCollectionError]=useState("");
 const [error,setError]=useState("");
 const [filter,setFilter]=useState("all");
 const [sport,setSport]=useState("all");
 const [query,setQuery]=useState("");
 const [open,setOpen]=useState<string|null>(null);
 async function reload(){setLoading(true);setError("");try{const res=await fetch("/api/automation/results",{cache:"no-store"});const json=await res.json();if(!res.ok||!json.ok||!Array.isArray(json.data?.records))throw Error(json.error||"기록이 없습니다.");setData(json.data);}catch(e){setError(e instanceof Error?e.message:"데이터 연결 오류");}finally{setLoading(false);}}
 useEffect(()=>{void reload();},[]);
 useEffect(()=>{let alive=true;void fetch("/api/automation/collection",{cache:"no-store"})
   .then(async r=>{const v=await r.json();if(!r.ok||!v?.ok)throw Error(v?.error||"수집 API 조회 실패");return v;})
   .then(v=>{if(alive){setCollection(v.data as CollectedLedger);setCollectionError("");}})
   .catch(e=>{if(alive)setCollectionError(e instanceof Error?e.message:"수집 API 연결 실패");});
   return ()=>{alive=false;};},[]);
 useEffect(()=>{let alive=true;void fetch("/api/automation/research",{cache:"no-store"})
   .then(async r=>{if(!r.ok)throw Error("research archive not yet published");return r.json();})
   .then(json=>{if(alive&&json?.ok&&Array.isArray(json?.data?.records))setEvidence(json.data as ResearchEvidence);})
   .catch(()=>{});return ()=>{alive=false;};},[]);
 const records=data?.records||[];
 const sports=useMemo(()=>Array.from(new Set(records.map(r=>r.sport))),[data]);
 const visible=useMemo(()=>records.filter(r=>(sport==="all"||r.sport===sport)&&
  (filter==="all"||(filter==="pending"&&r.status==="PENDING")||(filter==="verified"&&r.status==="VERIFIED")||(filter==="miss"&&r.top1?.resultStatus==="MISS")||(filter==="issues"&&(r.warnings?.length>0||r.status==="REVIEW_REQUIRED")))&&
  (r.home+" "+r.away+" "+r.league).toLowerCase().includes(query.toLowerCase())
 ),[data,sport,filter,query]);
 return <main className="auto-page"><div className="auto-background" aria-hidden="true"/><div className="auto-container">
  <nav className="auto-nav"><a className="auto-logo" href="/"><span>W</span> WISETOTO <small>ANALYZER</small></a><a href="/">← 실전 분석으로</a></nav>
  <header className="auto-header"><div className="auto-eyebrow"><i/> AUTOMATED MATCH INTELLIGENCE · V13.12.34</div>
    <div className="auto-heading"><div><h1>자동분석 결과</h1><p>경기 전 최초 예측을 고정하고, 종료 결과·TOP1·오차와 데이터 품질을 추적합니다.</p></div><button onClick={()=>void reload()} disabled={loading}>{loading?"조회 중…":"↻ 새로고침"}</button></div>
    <aside className="auto-explainer">이 화면은 <strong>GitHub Actions 자동 LIVE TRACKER</strong> 기록입니다. 브라우저에서 수동으로 분석한 기록과는 별도로 저장되며, 사후 검증으로 기존 λ·확률·TOP1을 변경하지 않습니다.</aside>
  </header>
  {error&&<div className="auto-error" role="alert">{error} <button onClick={()=>void reload()}>재시도</button></div>}
  {data&&<><div className="auto-meta"><span><i/> 마지막 자동실행 {date(data.lastRunAt)} KST</span><span>공개 이력 갱신 {new Date(data.publishedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</span><a target="_blank" rel="noopener noreferrer" href="https://github.com/qor102-sketch/wisetoto-analyzer/actions/workflows/wisetoto-auto-analysis.yml">실행 로그 ↗</a></div>
   <section className="auto-scan-health" aria-label="최근 자동 경기검색 상태">
    {data.scanHealth?(()=>{
      const h=data.scanHealth;
      const last=Date.parse(h.scannedAt),gap=Date.now()-last;
      const stale=!Number.isFinite(last)||gap>25*60_000;
      return <div className={"scan-health-box "+(!h.sourceOk||stale?"scan-alert":"scan-success")}>
        <div className="scan-head"><strong>{stale?"⚠ 자동 경기검색 지연":h.sourceOk?"✓ 자동 경기검색 정상":"⚠ 경기목록 수집 실패"}</strong><span>마지막 검색 {Number.isFinite(last)?date(last)+" KST":"미확인"}</span></div>
        <div className="scan-metrics"><span>축구 {h.feedSports?.["축구"]??0}</span><span>농구 {h.feedSports?.["농구"]??0}</span><span>야구 {h.feedSports?.["야구"]??0}</span><span>배구 {h.feedSports?.["배구"]??0}</span><span>경기 전 분석 대상 {h.eligibleForPregame??0}</span></div>
        {!h.sourceOk&&<p>Betman 조회 실패. 신규 PRE 저장이 중단될 수 있습니다. <a target="_blank" rel="noopener noreferrer" href="https://github.com/qor102-sketch/wisetoto-analyzer/actions/workflows/wisetoto-auto-analysis.yml">오류 로그 확인 ↗</a></p>}
        {stale&&<p>최근 25분 이상 정상적인 검색 기록이 없습니다. GitHub Actions 예약 실행 상태를 확인하세요.</p>}
      </div>;
    })():<div className="scan-health-box scan-alert">검색 상태 초기화 대기 — 자동 실행 기록을 확인하세요.</div>}
   </section>
   <section className="auto-stats" aria-label="자동분석 요약">{[
    ["고정 PRE",data.counts.total,"최초 경기 전 예측"],["종료 검증",data.counts.verified,"점수 유효성 통과"],["검증 재검토",data.counts.review??0,"종목 규칙과 결과 불일치"],["TOP1 적중",data.counts.hit,"검증된 픽"],["TOP1 미적중",data.counts.miss,"원인 분석 대상"],["결과 확인 지연",data.counts.overdue??records.filter(r=>r.status==="PENDING"&&r.startMs<Date.now()-6*60*60_000).length,"시작 6시간 후에도 결과 미확인"],["검토 신호",data.counts.warnings,"수집 품질 확인"]
   ].map(([title,value,desc])=><div key={String(title)} className="auto-stat"><span>{title}</span><strong>{value}</strong><small>{desc}</small></div>)}</section>
   <section className="auto-results" aria-label="경기 시작 30분 전 수집 및 종료 결과" style={{marginBottom:20}}>
    <div className="auto-section-title"><div><h2>30분 전 경기 수집 → 최종 결과 장부</h2>
      <p>예측과 별도 저장 · 경기 전 관측만 기록 · 공식 최종 결과 확인 전에는 PENDING 유지</p>
    </div><strong>{collection?collection.counts.collected+"경기 수집":"수집 시작 대기"}</strong></div>
    {collection?<><div className="auto-explainer">등록된 경기 {collection.counts.collected} · 30분 전 자료 수집 {collection.counts.pregameCaptured??0} · 종료 검증 {collection.counts.verified} · 사전 수집+종료 검증 표본 {collection.counts.verifiedWithPregame??0}/40 · 검증 대기 {collection.counts.pending} · 사전 수집 누락(결과만) {collection.counts.resultOnly??0} · 외부 경기 ID 부족 {collection.counts.missingFixtureId}</div>
      {collection.source&&<div className="auto-explainer">
        Betman 최신 상태: {collection.source.ok?"정상":"수집 오류 · 이전 장부 유지"} · 마지막 정상 목록 조회 {date(collection.source.lastFeedAt)} KST
        {!collection.source.ok&&<strong> · 오류: {collection.source.error||"원인 확인 필요"}</strong>}
        {collection.source.lastCaptureSummary&&<span> · 직전 정상 스캔 {collection.source.lastCaptureSummary.listed}경기 중 30분 창 {collection.source.lastCaptureSummary.window}건 · 신규 사전 수집 {collection.source.lastCaptureSummary.new}건 · 배당 없음 {collection.source.lastCaptureSummary.noOdds}건 · 식별 불가 {collection.source.lastCaptureSummary.missingIdentity}건 · 창 경과 경기 {collection.source.lastCaptureSummary.missedWindow}건 · 목록에서 사라진 관찰 경기 {collection.source.lastCaptureSummary.watchlistMissing??0}건 · 스캔 지연 {collection.source.lastCaptureSummary.delayedScan?"확인 필요":"없음"}</span>}
      </div>}
      <div className="auto-game-list">{collection.records.slice(0,20).map(r=><article className="auto-game" key={r.key} style={{padding:12}}>
        <div className="auto-game-identity"><span className="auto-game-meta">{r.sport} · {r.league} · {date(r.startMs)} KST · 관측 {r.seenCount}회 · 배당 항목 {r.oddsCount}개 · 최초 배당 {date(r.firstOddsAt)} KST · 최신 배당 {date(r.latestOddsAt)} KST</span>
          <strong>{r.home} <em>vs</em> {r.away}</strong><small>{r.verdict==="VERIFIED"?"결과 확인 "+r.final?.homeScore+" : "+r.final?.awayScore:r.pregameCapturedAt===null?"경기 목록 등록 · 30분 전 수집 대기 또는 시간 경과 · "+(r.checkReason||"결과 조회 예정"):"30분 전 수집 완료 · 검증 대기 · "+(r.checkReason||"최종점수 조회 예정")}</small>
          {r.captureIssue?<small>수집 추적 경고 · {r.captureIssue}</small>:null}
          {r.resultErrors?.length?<small>결과 확인 오류 이력 · 총 조회 {r.resultChecks??0}회 · 최근 {r.resultErrors[r.resultErrors.length-1].reasons.join(" / ")}</small>:null}
        </div>
      </article>)}</div></>:<div className="auto-empty">{collectionError?"수집 API 상태: "+collectionError:"신규 30분 전 수집 기록은 기능 승인 및 첫 GitHub 스캔 후 표시됩니다. 기존 PRE를 소급 생성하지 않습니다."}</div>}
   </section>
   <section className="auto-results" aria-label="경기 전 배당 축적 연구" style={{marginBottom:20}}>
    <div className="auto-section-title"><div>
      <h2>경기 전 축적 자료 · 실험 TOP1 연구</h2>
      <p>공식 LIVE TRACKER TOP1과 완전히 별개입니다. 10분 검색 → 시점별 배당 기록 → 과거 확정 결과로 보정합니다.</p>
    </div><strong>{evidence?evidence.counts.future+"경기 수집":"첫 관측 데이터 대기"}</strong></div>
    <div className="auto-explainer">WATCH는 배당 변화 관찰 후보일 뿐 추천이 아닙니다. '연구 TOP1'은 이전에 검증된 충분한 표본과 보수적 EV를 통과해야만 표시됩니다. 과거 PRE 예측은 바꾸지 않습니다.</div>
    {evidence&&<div className="auto-scan-health"><div className="scan-health-box scan-success">
      <div className="scan-metrics"><span>관찰 대상 {evidence.counts.future}</span><span>시장 변화 후보 {evidence.counts.observed}</span><span>검증 기준 통과 TOP1 {evidence.counts.researchTop1}</span><span>근거 부족·HOLD {evidence.counts.insufficient}</span></div>
    </div></div>}
    <div className="auto-game-list">{(evidence?.records||[]).slice(0,12).map(r=><article className="auto-game" key={r.id} style={{padding:14}}>
      <div className="auto-game-identity">
        <span className="auto-game-meta">{r.sport} · {r.league} · {date(r.startMs)} KST · 경기 전 관측 {r.observations}회</span>
        <strong>{r.home} <em>vs</em> {r.away}</strong>
        <small>{r.stage==="RESEARCH_TOP1"?"연구 TOP1 조건 충족":r.top1?"WATCH · 배당 이동 관찰":"HOLD · 자료 축적 중"} · {r.reason}</small>
        {r.top1&&<small>관찰 방향: {r.top1.label} · 배당 {r.top1.odds.toFixed(2)} · 시장 환산확률 {(100*r.top1.marketProbability).toFixed(1)}% · 최초 대비 {(100*r.top1.shift).toFixed(1)}%p · {date(r.top1.asOf)} KST</small>}
        {r.calibration&&<small>선행 종료 검증표본 {r.calibration.samples}건 · {r.calibration.qualified?"보정 모델 가동":"확률/EV 모델 보정 기준 미충족"}</small>}
      </div>
    </article>)}
      {!evidence&&<div className="auto-empty">독립 연구 기록은 Production 승인 후 첫 경기 전 수집부터 생성됩니다. 기존 PASS에서 픽을 사후 생성하지 않습니다.</div>}
    </div>
   </section>
   <section className="auto-results"><div className="auto-section-title"><div><h2>경기별 추적 기록</h2><p>PRE 원본과 종료 후 검증 결과를 따로 표시</p></div><strong>{visible.length} / {records.length} 경기</strong></div>
    <div className="auto-filters"><div className="auto-tabs">{[["all","전체"],["pending","검증 대기"],["verified","검증 완료"],["miss","미적중"],["issues","수집 점검"]].map(([k,label])=><button key={k} onClick={()=>setFilter(k)} aria-pressed={filter===k} className={filter===k?"active":""}>{label}</button>)}</div><div className="auto-fields"><select aria-label="종목" value={sport} onChange={e=>setSport(e.target.value)}><option value="all">모든 종목</option>{sports.map(x=><option key={x} value={x}>{x}</option>)}</select><input aria-label="팀 검색" value={query} onChange={e=>setQuery(e.target.value)} placeholder="팀명 · 리그 검색"/></div></div>
    <div className="auto-game-list">{visible.length===0?<div className="auto-empty">해당 조건의 자동분석 기록이 없습니다.</div>:visible.map(r=>{
      const expanded=open===r.id,p=r.top1;
      return <article className="auto-game" key={r.id}>
       <button className="auto-game-button" onClick={()=>setOpen(expanded?null:r.id)} aria-expanded={expanded}>
        <div className="auto-game-identity"><span className="auto-game-meta">{r.sport} · {r.league} · {date(r.startMs)} KST</span><strong>{r.home} <em>vs</em> {r.away}</strong><small>PRE 잠금 {date(r.capturedAt)} · {r.decision}</small></div>
        <div className="auto-game-status"><span className={"auto-chip "+statusClass(r.status)}>{stateText(r)}</span><strong>{r.result?.homeScore!=null&&r.result?.awayScore!=null?r.result.homeScore+" : "+r.result.awayScore:"결과 대기"}</strong></div>
        <div className="auto-game-top"><small>TOP1 · {p?.grade||"PASS"}</small><strong>{p?p.market+" · "+p.pick:"선택된 픽 없음"}</strong><span>{p?num(p.probability)+"%":"—"} <b className={"auto-chip "+statusClass(p?.resultStatus||"")}>{pickText(p)}</b></span></div><span className="auto-expand">{expanded?"−":"+"}</span>
       </button>
       {expanded&&<div className="auto-detail"><div className="auto-detail-stats">
        <div><span>{r.sport==="축구"?"축구 PRE 예상득점 λ":r.sport==="농구"?"농구 PRE 예상점수":"경기 전 예상점수"}</span><strong>{r.sport==="축구"?(r.pre?num(r.pre.expectedHome,2)+" : "+num(r.pre.expectedAway,2):"축구 PRE 예상득점 미저장"):r.sport==="농구"?(r.courtPre&&r.courtPre.expectedHome!==null&&r.courtPre.expectedAway!==null?num(r.courtPre.expectedHome,1)+" : "+num(r.courtPre.expectedAway,1):"과거 PRE 예상점수 미저장"):"종목별 PRE 점수 별도 미저장"}</strong></div>
        <div><span>최근 Form 홈 / 원정</span><strong>{r.sport==="축구"&&r.pre?String(r.pre.homeRecentSample??"—")+" / "+String(r.pre.awayRecentSample??"—"):r.sport==="농구"&&r.courtPre?String(r.courtPre.homeRecentSample??"—")+" / "+String(r.courtPre.awayRecentSample??"—"):"해당 PRE 표본 미저장"}</strong></div>
        <div><span>{r.sport==="축구"?"선발 XI 검증":"선발 검증"}</span><strong>{r.sport==="농구"?"NBA 모델 별도 단계":r.lineup?.stage||"미확보"}</strong></div><div><span>결과 검증</span><strong>{stateText(r)}</strong></div>
       </div>{r.warnings?.length>0&&<div className="auto-warning"><b>점검 신호</b>{r.warnings.map((w,i)=><p key={i}>· {w}</p>)}</div>}
       {r.status==="PENDING"&&r.startMs<Date.now()-2*60*60_000&&<p className="auto-audit-footer">결과 검증 상태: ${r.verifyWaitReason||"결과 조회 진행/미확인"} · 마지막 결과 조회 ${date(r.verifyLastCheckedAt)} KST. 공식 최종점수가 확인될 때까지 결과를 임의로 확정하지 않습니다.</p>}
       {p&&<div className="auto-top-metrics"><span>TOP1 확률 <b>{num(p.probability)}%</b></span><span>배당 <b>{num(p.odds,2)}</b></span><span>EV <b>{num(p.expectedValue)}%</b></span><span>TOP1 점수 <b>{num(p.score)}</b></span><span>정산 <b>{pickText(p)}</b></span></div>}
       <h3>시장별 PRE 및 정산</h3><div className="auto-table-scroll"><table><thead><tr><th>시장</th><th>선택</th><th>확률</th><th>EV</th><th>등급</th><th>정산</th></tr></thead><tbody>{(r.markets?.length?r.markets:p?[p]:[]).map((m,i)=><tr key={m.key||i}><td>{m.market}</td><td>{m.pick}</td><td>{num(m.probability)}%</td><td>{num(m.expectedValue)}%</td><td>{m.grade}</td><td>{pickText(m)}</td></tr>)}{!r.markets?.length&&!p&&<tr><td colSpan={6}>저장된 시장 선택이 없습니다. PASS 경기입니다.</td></tr>}</tbody></table></div>
       <p className="auto-audit-footer">검증 시각: {date(r.verifiedAt)} · 결과 출처: {r.result?.source||"대기"} · 추적 ID: {r.id}</p>
       </div>}
      </article>;
    })}</div>
   </section><footer className="auto-footer"><div><strong>데이터 검증 → 원인 파악 → 안전한 코드 수정</strong><p>미적중만으로 모델 오류를 단정하지 않습니다. 확인된 데이터 수집 결함만 별도 PR로 수정하며 frozen PRE는 유지합니다.</p></div><a target="_blank" rel="noopener noreferrer" href="https://github.com/qor102-sketch/wisetoto-analyzer/issues">수정 검토 이슈 ↗</a></footer>
  </>}
  {!data&&!error&&<div className="auto-empty">{loading?"자동분석 기록 불러오는 중…":"자동분석 기록이 아직 없습니다."}</div>}
 </div></main>;
}
