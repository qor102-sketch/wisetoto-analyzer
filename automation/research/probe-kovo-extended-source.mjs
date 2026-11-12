// Read-only research on KOVO's official ended-match API query shape.
// Never stores or changes any original fixture, PRE or final verdict.
const base="https://user-api.kovo.co.kr/mains/games/schedules/ended";
const params=[
 ["gender","MALE"],["gender","FEMALE"],
 ...["1005","1008","1001","1002","1009","2003","2008","2004","2006","2002"]
  .map(tcode=>["tcode",tcode])
];
const results=[];
for(const [name,value] of params){
 const url=base+"?"+new URLSearchParams({[name]:value});
 try{
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(6000),
   headers:{accept:"application/json","X-Service-Name":"user"}});
  const j=r.ok?await r.json().catch(()=>null):null;
  const rows=Array.isArray(j?.payload)?j.payload:[];
  results.push({query:name+"="+value,http:r.status,
   sourceShape:Array.isArray(j?.payload),events:rows.length,
   first:rows.slice(0,2).map(g=>({date:g.gameDate,gender:g.gender,
    home:g.homeTeam?.name,away:g.awayTeam?.name,
    ended:Boolean(g.endTime),score:g.homeTeam?.score+":"+g.awayTeam?.score})),
   last:rows.slice(-2).map(g=>({date:g.gameDate,gender:g.gender,
    home:g.homeTeam?.name,away:g.awayTeam?.name,
    ended:Boolean(g.endTime),score:g.homeTeam?.score+":"+g.awayTeam?.score}))});
 }catch(e){results.push({query:name+"="+value,error:String(e).slice(0,100)})}
}
console.log("KOVO_EXTENDED_READONLY "+JSON.stringify({official:true,readOnly:true,results}));
