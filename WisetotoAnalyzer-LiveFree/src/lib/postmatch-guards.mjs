// Source-agnostic result guard. POSTMATCH ONLY; never used as PRE features.
const FINALS=new Set(["FT","AET","PEN","FINAL","FINISHED","COMPLETED","COMPLETE","ENDED","END","FULL_TIME","FULLTIME","AFTER_EXTRA_TIME","AFTER_PENALTIES","MATCH_FINISHED","MATCH_ENDED"]);
const normal=v=>String(v??"").trim().toUpperCase().replace(/[\s\-]+/g,"_");
const text=v=>v && typeof v==="object" && !Array.isArray(v) ? v : {};
export function scorePlausibility(sport,home,away){
 const h=Number(home),a=Number(away);
 if(!Number.isSafeInteger(h)||!Number.isSafeInteger(a)||h<0||a<0)return {ok:false,reason:"INVALID_SCORE"};
 const type=String(sport??"").toLowerCase();
 if(type==="배구"||type==="volleyball"){
   // Standard best-of-five sets, a final needs exactly three winning sets.
   if(!((h===3&&a>=0&&a<=2)||(a===3&&h>=0&&h<=2)))
     return {ok:false,reason:"VOLLEYBALL_NONFINAL_SET_SCORE"};
 }
 if((type==="농구"||type==="basketball")&&h===a)
   return {ok:false,reason:"BASKETBALL_FINAL_TIE"};
 return {ok:true,reason:null};
}
export function finalStatusProof(root){
 // The external API can carry many nested "status" objects. Require an
 // explicit match-status final marker, never infer FINAL from nonzero score.
 const nodes=[root,root?.data,root?.fixture,root?.data?.fixture,
   root?.match,root?.data?.match,root?.response?.[0],root?.data?.event]
   .map(text);
 for(const node of nodes){
   if(node.isFinished===true||node.isFinal===true||node.completed===true)
     return {ok:true,evidence:"explicit finished boolean"};
   for(const key of ["status","matchStatus","statusCode","statusShort","state","gameStatus"]){
     const candidate=node[key];
     const variants=typeof candidate==="object"&&candidate!==null
       ? [candidate.short,candidate.long,candidate.code,candidate.status,candidate.description]
       : [candidate];
     for(const item of variants){
       if(FINALS.has(normal(item)))return {ok:true,evidence:key+":"+String(item)};
     }
   }
 }
 return {ok:false,evidence:"NO_EXPLICIT_FINAL_STATUS"};
}
export function validateFinalResult({sport,homeScore,awayScore,sourceFinal}){
 const valid=scorePlausibility(sport,homeScore,awayScore);
 if(!valid.ok)return {ok:false,reason:valid.reason};
 if(!sourceFinal)return {ok:false,reason:"UNCONFIRMED_FINAL_STATUS"};
 return {ok:true,reason:null};
}
export function positiveValueCandidate(pick){
 if(!pick||!["VALUE","STRONG VALUE"].includes(String(pick.valueGrade??pick.grade??"")))return false;
 const p=Number(pick.probability),odds=Number(pick.odds),ev=Number(pick.expectedValue);
 return Number.isFinite(p)&&p>0&&p<=100&&Number.isFinite(odds)&&odds>1&&
   Number.isFinite(ev)&&ev>0&&p*odds-100>0;
}
