// TEMPORARY read-only connectivity check. Delete before merging.
export async function GET(){
 const known="https://desktop-4u90sd7.tail2ddef1.ts.net/betman";
 const configured=process.env.BETMAN_PROXY_URL??"";
 const targets=[{key:"configured",url:configured},{key:"confirmed",url:known}];
 const answers=[];
 for(const target of targets){
  let hostnameMatch=false,pathMatch=false;
  try{
   const url=new URL(target.url);
   hostnameMatch=url.hostname===new URL(known).hostname;
   pathMatch=url.pathname==="/betman";
   const res=await fetch(target.url,{cache:"no-store",
    headers:{accept:"application/json, text/plain, */*","user-agent":"WisetotoAnalyzer/1.0 Vercel","cache-control":"no-cache"},
    signal:AbortSignal.timeout(11000)});
   const body=await res.text();
   let json:any=null;try{json=JSON.parse(body)}catch{}
   const looksHtml=body.trimStart().startsWith("<");
   const htmlTitle=looksHtml?(/<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1]??"").slice(0,72):"";
   answers.push({key:target.key,hostnameMatch,pathMatch,
    status:res.status,type:res.headers.get("content-type"),
    bodyLength:body.length,isJson:!!json,upstreamOk:json?.ok===true,
    hasBetmanData:!!json?.data,looksHtml,htmlTitle,
    bodyStartCategory:body.trimStart().startsWith("{")?"JSON_SHAPED":looksHtml?"HTML":"OTHER"});
  }catch(e:any){answers.push({key:target.key,hostnameMatch,pathMatch,
    error:String(e?.name??"UNKNOWN").slice(0,35)})}
 }
 return Response.json({answers},{headers:{"cache-control":"no-store"}});
}
