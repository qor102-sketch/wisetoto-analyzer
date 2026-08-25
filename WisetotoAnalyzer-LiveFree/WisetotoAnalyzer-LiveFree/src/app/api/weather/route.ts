export async function GET(req:Request){
 const u=new URL(req.url); const lat=u.searchParams.get("lat"); const lon=u.searchParams.get("lon");
 if(!lat||!lon)return Response.json({ok:false,error:"lat/lon이 필요합니다."},{status:400});
 const api=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
 const r=await fetch(api,{cache:"no-store"}); return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
}