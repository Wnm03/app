'use strict';
/* S1912 — deterministic service-event idempotency contract. */
(function(root){
 const arr=v=>Array.isArray(v)?v:[]; const s=v=>String(v==null?'':v).trim();
 function key(input={}){if(input.idempotencyKey)return s(input.idempotencyKey);const v=s(input.vehicleId),ids=arr(input.componentIds).map(s).filter(Boolean).sort();const c=ids.length?`components:${ids.join(',')}`:s(input.serviceComponentId||input.categoryId),d=s(input.date),k=input.km==null?'':s(input.km),a=s(input.actionType||'default'),b=s(input.batchId),f=s(input.fingerprint);return v&&c&&d?`service:${v}:${c}:${d}:${k?(k+':'):''}${a}:${b}${f?':'+f:''}`:null;}
 function find(rows,k,vehicleId){if(!k)return null;return arr(rows).find(r=>r&&s(r.idempotencyKey)===s(k)&&(!vehicleId||s(r.vehicleId)===s(vehicleId)))||null;}
 function audit(rows){const map=new Map(),issues=[];arr(rows).forEach((r,i)=>{const k=s(r&&r.idempotencyKey);if(!k)return;const bucket=map.get(k)||[];bucket.push({index:i,row:r});map.set(k,bucket);});for(const [k,b] of map){const vehicles=new Set(b.map(x=>s(x.row.vehicleId)));if(b.length>1)issues.push({code:'DUPLICATE_IDEMPOTENCY_KEY',key:k,rows:b.map(x=>x.index),crossVehicle:vehicles.size>1});}return{ok:issues.length===0,total:arr(rows).length,issues,readOnly:true};}
 const api={version:'S1912-V1',key,find,audit};if(root)root.ServiceEventIdempotencySOT=api;if(typeof globalThis!=='undefined')globalThis.ServiceEventIdempotencySOT=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
