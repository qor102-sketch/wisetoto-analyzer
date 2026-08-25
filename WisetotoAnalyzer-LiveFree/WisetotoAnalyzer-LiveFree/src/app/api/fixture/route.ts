export async function GET(req:Request){
 const key=process.env.SPORTSAPI_KEY; const id=new URL(req.url).searchParams.get("id");
 if(!key)return Response.json({ok:false,error:"SPORTSAPI_KEY가 설정되지 않았습니다."},{status:503});
 if(!id)return Response.json({ok:false,error:"fixture id가 필요합니다."},{status:400});
 const base=`https://api.sportsapi.app/v2/fixtures/${encodeURIComponent(id)}`;
 const headers={Authorization:`Bearer ${key}`};
 const [a,b,c,d]=await Promise.all([fetch(base,{headers,cache:"no-store"}),fetch(base+"/lineups",{headers,cache:"no-store"}),fetch(base+"/statistics",{headers,cache:"no-store"}),fetch(base+"/h2h",{headers,cache:"no-store"})]);
 const j=async(r:Response)=>r.ok?r.json():null;
 return Response.json({fixture:await j(a),lineups:await j(b),statistics:await j(c),h2h:await j(d)});
}