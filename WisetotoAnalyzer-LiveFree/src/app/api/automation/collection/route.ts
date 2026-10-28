import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const url="https://raw.githubusercontent.com/qor102-sketch/wisetoto-analyzer/automation-data/collect-first-public.json?x="+Date.now();
  const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!r.ok)return NextResponse.json({ok:false,error:"30분 전 경기 수집 장부 초기화 대기"},{status:503});
  const data=await r.json();
  if(data?.schema!=="wisetoto-collect-first-public-v1"||!Array.isArray(data.records))
   return NextResponse.json({ok:false,error:"수집 장부 형식 오류"},{status:502});
  return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"수집 결과 조회 실패"},{status:503});}
}
