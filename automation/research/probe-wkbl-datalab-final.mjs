// Read-only WKBL official DataLab markup audit. Require explicit
// source-final before admitting a scoreboard-only settlement. No NBA.
const ids=["04701005","04701007","04701008","04701009"];
const markers=["경기종료","isEnded","gameStatus","gameEnd","endYn",
 "finished","FULL_TIME","GAME_END","종료","qtr","period","score",
 "selectGame(","경기정보","11.08","11.09"];
const samples=[];
for(const id of ids){
 try{
  const url="https://datalab.wkbl.or.kr/gameinfo?id="+id;
  const res=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(9500),
   headers:{accept:"text/html","user-agent":"Mozilla/5.0 (compatible; SourceAudit/1.0)"}});
  const html=await res.text(),hay=html.toLowerCase();
  const fields={};
  for(const token of markers){
   const needle=token.toLowerCase(),hits=[];
   let from=0,count=0;
   for(;;){
    const at=hay.indexOf(needle,from);
    if(at<0)break;
    count++;
    if(hits.length<2)hits.push(html.slice(Math.max(0,at-110),at+220)
     .replace(/<[^>]*>/g," ").replace(/\s+/g," ").slice(0,300));
    from=at+needle.length;
   }
   fields[token]={count,sample:hits};
  }
  samples.push({id,http:res.status,len:html.length,fields});
 }catch(e){samples.push({id,error:String(e).slice(0,120)})}
}
console.log("WKBL_OFFICIAL_HTML_AUDIT "+JSON.stringify({readOnly:true,records:samples,
 policy:"DO_NOT_SETTLE_UNLESS_SOURCE_PROVES_UNIQUE_FINAL"}));
