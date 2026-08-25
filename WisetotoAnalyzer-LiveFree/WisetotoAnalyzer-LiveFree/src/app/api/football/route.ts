export async function GET(req:Request){
 const key=process.env.API_FOOTBALL_KEY; const u=new URL(req.url); const path=u.searchParams.get("path")||"fixtures";
 if(!key)return Response.json({ok:false,error:"API_FOOTBALL_KEY가 설정되지 않았습니다."},{status:503});
 const allowed=new Set(["fixtures","injuries","standings","players","teams"]);
 if(!allowed.has(path))return Response.json({ok:false,error:"허용되지 않은 endpoint입니다."},{status:400});
 const params=new URLSearchParams(); u.searchParams.forEach((v,k)=>{if(k!=="path")params.set(k,v)});
 const r=await fetch(`https://v3.football.api-sports.io/${path}?${params}`,{headers:{"x-apisports-key":key},cache:"no-store"});
 return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
}