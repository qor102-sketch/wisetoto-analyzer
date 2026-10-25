import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export const revalidate=0;
const source="https://raw.githubusercontent.com/qor102-sketch/wisetoto-analyzer/automation-data/research-public.json";
export async function GET(){
 try{
  const r=await fetch(source+"?refresh="+Date.now(),{cache:"no-store",
    signal:AbortSignal.timeout(12000),headers:{Accept:"application/json"}});
  if(!r.ok) return NextResponse.json({ok:false,error:"경기 전 시장 증거 축적 데이터 생성 대기",sourceStatus:r.status},
    {status:503,headers:{"Cache-Control":"no-store"}});
  const v:unknown=await r.json();
  if(!v||typeof v!=="object"||
    (v as any).schema!=="wisetoto-public-evidence-v1"||
    !Array.isArray((v as any).records)||(v as any).records.length>150)
    return NextResponse.json({ok:false,error:"관찰 기록 데이터 형식 오류"},{status:502});
  // This is only a derived PUBLIC observation projection; NEVER leak raw feed
  // credentials, private tracker or full per-minute betting snapshots.
  return NextResponse.json({ok:true,data:v},{headers:{"Cache-Control":"no-store, max-age=0"}});
 }catch{
  return NextResponse.json({ok:false,error:"관찰 기록 연결 실패"},{status:503,
    headers:{"Cache-Control":"no-store"}});
 }
}
