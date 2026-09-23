'use strict';
/* S1910 — additive, read-only condition timeline over D.servisLogs. */
(function(root){
 const score=Object.freeze({baik:0,'mulai-aus':1,aus:2,rusak:3});
 const arr=v=>Array.isArray(v)?v:[];
 const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};
 function timeline(rows,vehicleId,componentId){
  return arr(rows).filter(r=>r&&(!vehicleId||String(r.vehicleId)===String(vehicleId))&&(!componentId||String(r.serviceComponentId)===String(componentId))&&Object.prototype.hasOwnProperty.call(score,String(r.conditionResult))).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||((n(a.km)??Infinity)-(n(b.km)??Infinity))||String(a.id||'').localeCompare(String(b.id||''))).map((r,i,all)=>{
   const prev=i?all[i-1]:null; const km=n(r.km), pkm=n(prev&&prev.km);
   return {id:r.id||null,date:r.date||null,km,conditionResult:r.conditionResult,score:score[r.conditionResult],serviceComponentId:r.serviceComponentId||null,delta:prev?score[r.conditionResult]-score[prev.conditionResult]:null,deltaKm:prev&&km!=null&&pkm!=null?km-pkm:null,deltaDays:prev&&r.date&&prev.date?Math.round((new Date(r.date+'T00:00:00')-new Date(prev.date+'T00:00:00'))/86400000):null};
  });
 }
 function summarize(rows,vehicleId,componentId){const t=timeline(rows,vehicleId,componentId);return {ok:true,vehicleId:vehicleId||null,serviceComponentId:componentId||null,count:t.length,first:t[0]||null,latest:t[t.length-1]||null,observations:t,readOnly:true,source:'D.servisLogs'};}
 const api={version:'S1910-V1',score,timeline,summarize};
 if(root)root.ServiceConditionTimelineSOT=api;if(typeof globalThis!=='undefined')globalThis.ServiceConditionTimelineSOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
