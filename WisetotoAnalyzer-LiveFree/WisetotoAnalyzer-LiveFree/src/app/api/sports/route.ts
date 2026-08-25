export async function GET(req:Request){
 const key=process.env.SPORTSAPI_KEY;
 if(!key)return Response.json({ok:false,error:"SPORTSAPI_KEY가 설정되지 않았습니다."},{status:503});
 const url=new URL(req.url); const sport=url.searchParams.get("sport");
 const endpoint="https://api.sportsapi.app/v2/livescores"+(sport?`?sport=${encodeURIComponent(sport)}`:"");
 const r=await fetch(endpoint,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});
 const text=await r.text(); return new Response(text,{status:r.status,headers:{"content-type":"application/json"}});
}