const BASE="https://api.sportsapi.app/v2";
type AnyObj=Record<string,any>;
function arr(x:any):any[]{return Array.isArray(x)?x:Array.isArray(x?.data)?x.data:[]}
async function api(path:string,key:string){
 const r=await fetch(BASE+path,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});
 const text=await r.text(); let j:any; try{j=JSON.parse(text)}catch{j={raw:text}};
 if(!r.ok) throw new Error(j?.error?.message||`SportsAPI ${r.status}`);
 return j?.data??j;
}
async function searchTeam(name:string,key:string){
 const variants=[name, name==="요미우리"?"Yomiuri Giants":name==="히로시마"?"Hiroshima Carp":name];
 for(const q of variants){
  try{
   const hits=arr(await api(`/search?q=${encodeURIComponent(q)}`,key)).filter((x:any)=>x.type==="team");
   if(hits.length)return hits[0];
  }catch{}
 }
 return null;
}
function namesMatch(f:any,h:any,a:any){
 return (f?.home?.id===h.id&&f?.away?.id===a.id)||(f?.home?.id===a.id&&f?.away?.id===h.id);
}
function score(f:any,side:"home"|"away"){
 const s=f?.[side+"Score"]||f?.score?.[side]||{};
 return s?.current ?? s?.display ?? s?.normaltime ?? null;
}
export async function GET(req:Request){
 const key=process.env.SPORTSAPI_KEY;
 if(!key)return Response.json({ok:false,error:"SPORTSAPI_KEY가 설정되지 않았습니다."},{status:503});
 const u=new URL(req.url), home=u.searchParams.get("home")||"", away=u.searchParams.get("away")||"", sport=u.searchParams.get("sport")||"";
 if(!home||!away)return Response.json({ok:false,error:"home/away가 필요합니다."},{status:400});
 try{
  const [ht,at]=await Promise.all([searchTeam(home,key),searchTeam(away,key)]);
  if(!ht||!at)return Response.json({ok:false,error:"SportsAPI에서 두 팀을 찾지 못했습니다.",teams:{home:ht,away:at}});
  const [hf,af]=await Promise.all([
   api(`/teams/${ht.id}/fixtures?type=upcoming&page=0`,key),
   api(`/teams/${at.id}/fixtures?type=upcoming&page=0`,key)
  ]);
  const candidates=[...arr(hf),...arr(af)].filter((f:any)=>namesMatch(f,ht,at));
  candidates.sort((a:any,b:any)=>String(a.startTime||"").localeCompare(String(b.startTime||"")));
  let fixture=candidates[0]||null;
  if(!fixture){
   const live=await api(`/livescores${sport?`?sport=${encodeURIComponent(sport)}`:""}`,key);
   fixture=arr(live).find((f:any)=>namesMatch(f,ht,at))||null;
  }
  if(!fixture)return Response.json({ok:false,error:"두 팀 사이의 예정/진행 경기를 SportsAPI에서 찾지 못했습니다.",teams:{home:ht,away:at},checked:{homeUpcoming:arr(hf).length,awayUpcoming:arr(af).length}});
  const id=fixture.id;
  const [detail,lineups,statistics,h2h,homeRecent,awayRecent]=await Promise.all([
   api(`/fixtures/${id}`,key).catch(()=>null),
   api(`/fixtures/${id}/lineups`,key).catch(()=>null),
   api(`/fixtures/${id}/statistics`,key).catch(()=>null),
   api(`/fixtures/${id}/h2h`,key).catch(()=>null),
   api(`/teams/${ht.id}/fixtures?type=recent&page=0`,key).catch(()=>null),
   api(`/teams/${at.id}/fixtures?type=recent&page=0`,key).catch(()=>null)
  ]);
  const summarize=(f:any)=>({id:f.id,startTime:f.startTime,home:f?.home?.name,away:f?.away?.name,homeScore:score(f,"home"),awayScore:score(f,"away")});
  return Response.json({ok:true,matched:true,fixtureId:id,sport,requested:{home,away},teams:{home:ht,away:at},fixture,detail,lineups,statistics,h2h,recent:{home:arr(homeRecent).slice(0,20),away:arr(awayRecent).slice(0,20)},recentSummary:{home:arr(homeRecent).slice(0,20).map(summarize),away:arr(awayRecent).slice(0,20).map(summarize)}});
 }catch(e:any){return Response.json({ok:false,error:e?.message||"match lookup failed"},{status:502})}
}
