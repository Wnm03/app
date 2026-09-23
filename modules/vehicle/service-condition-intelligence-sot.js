'use strict';
/** S1909 — read-only condition intelligence over service history.
 * Descriptive only: it observes persisted conditionResult history and never
 * mutates service data, intervals, reminders, or user decisions.
 */
(function(root){
  const SCORE=Object.freeze({baik:0,'mulai-aus':1,aus:2,rusak:3});
  const LABEL=Object.freeze({improving:'membaik',stable:'stabil',worsening:'memburuk',insufficient:'data belum cukup'});
  const arr=v=>Array.isArray(v)?v:[];
  const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const key=v=>v==null?'':String(v);
  const valid=v=>Object.prototype.hasOwnProperty.call(SCORE,key(v));
  function records(input,vehicleId,componentId){
    return arr(input).filter(r=>r&&(!vehicleId||key(r.vehicleId)===key(vehicleId))&&(!componentId||key(r.serviceComponentId)===key(componentId))&&valid(r.conditionResult)).slice().sort((a,b)=>{
      const d=key(a.date).localeCompare(key(b.date)); if(d)return d;
      const ak=finite(a.km),bk=finite(b.km); if(ak!==null&&bk!==null&&ak!==bk)return ak-bk;
      return key(a.id).localeCompare(key(b.id));
    });
  }
  function summarize(input,vehicleId,componentId){
    const rows=records(input,vehicleId,componentId);
    if(!rows.length)return {ok:true,vehicleId:vehicleId||null,serviceComponentId:componentId||null,count:0,trend:'insufficient',trendLabel:LABEL.insufficient,first:null,latest:null,score:null,delta:null,confidence:0,source:'D.servisLogs',readOnly:true};
    const first=rows[0],latest=rows[rows.length-1],firstScore=SCORE[first.conditionResult],latestScore=SCORE[latest.conditionResult],delta=latestScore-firstScore;
    const trend=rows.length<2?'insufficient':(delta>0?'worsening':delta<0?'improving':'stable');
    return {ok:true,vehicleId:vehicleId||null,serviceComponentId:componentId||null,count:rows.length,trend,trendLabel:LABEL[trend],first:{id:first.id,date:first.date,km:finite(first.km),conditionResult:first.conditionResult},latest:{id:latest.id,date:latest.date,km:finite(latest.km),conditionResult:latest.conditionResult},score:latestScore,delta,confidence:Math.min(1,rows.length/3),source:'D.servisLogs',readOnly:true};
  }
  function forVehicle(vehicleId,input){
    const map=new Map(); records(input,vehicleId).forEach(r=>{const id=key(r.serviceComponentId);if(!id)return;if(!map.has(id))map.set(id,[]);map.get(id).push(r);});
    return [...map.keys()].map(id=>summarize(map.get(id),vehicleId,id));
  }
  const api={SCORE,records,summarize,forVehicle};
  if(root)root.ServiceConditionIntelligence=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
